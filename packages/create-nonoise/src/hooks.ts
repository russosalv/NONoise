import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { installManagedAssets, safeAssetPath, digest, readAssetHashes } from './managed-assets.js';
import type { AiTools } from './types.js';

export const HOOK_NAMES = ['block-no-verify', 'config-protection', 'pre-bash-git-push-reminder', 'mcp-health-check', 'post-edit-format', 'stop-format-typecheck', 'safety-guard'] as const;
export type HookName = typeof HOOK_NAMES[number];
type Host = 'claude' | 'codex' | 'copilot';
type JsonObject = Record<string, any>;
const SUPPORT = ['LICENSE.txt', 'runtime.cjs', 'no-verify-policy.cjs', 'config-policy.cjs', 'shell-scan.cjs'];
const HOSTS: { host: Host; key: keyof AiTools; file: string }[] = [
  { host: 'claude', key: 'claudeCode', file: '.claude/settings.json' },
  { host: 'codex', key: 'codex', file: '.codex/hooks.json' },
  { host: 'copilot', key: 'copilot', file: '.github/hooks/nonoise.json' },
];
const EVENTS: Record<HookName, [string, string][]> = {
  'block-no-verify': [['PreToolUse', 'Bash|PowerShell']],
  'config-protection': [['PreToolUse', 'Edit|Write|MultiEdit|apply_patch']],
  'pre-bash-git-push-reminder': [['PreToolUse', 'Bash|PowerShell']],
  'mcp-health-check': [['PreToolUse', '^mcp__'], ['PostToolUse', '^mcp__']],
  'post-edit-format': [['PostToolUse', 'Edit|Write|MultiEdit|apply_patch']],
  'stop-format-typecheck': [['Stop', '']],
  'safety-guard': [['PreToolUse', 'Bash|PowerShell']],
};
function selected(names: readonly string[]): HookName[] {
  for (const name of names) if (!(HOOK_NAMES as readonly string[]).includes(name)) throw new Error(`Unknown NONoise hook: ${name}`);
  return HOOK_NAMES.filter(name => names.includes(name));
}
/** Only constant, allowlisted tokens enter the shell. Resolve the project from cwd,
 * so spaces/metacharacters in project names and starting in subdirectories are safe.
 * Node handles paths on every OS; no shell expansion, bash script, or global config. */
function hookCommand(name: HookName, host: Host, event: string): string {
  return `node -e "const f=require('node:fs'),p=require('node:path');let d=process.cwd();while(!f.existsSync(p.join(d,'.nonoise/hooks/${name}.cjs'))){const n=p.dirname(d);if(n===d){process.stderr.write('NONoise hook missing');process.exit(2)}d=n}try{require(p.join(d,'.nonoise/hooks/${name}.cjs'))}catch(e){process.stderr.write('NONoise hook failed to load');process.exit(2)}" -- --host=${host} --event=${event}`;
}
function registrations(host: Host, names: readonly HookName[]): Record<string, JsonObject[]> {
  const result: Record<string, JsonObject[]> = {};
  for (const name of names) for (const [event, matcher] of EVENTS[name]) {
    const key = host === 'copilot' ? ({ PreToolUse: 'preToolUse', PostToolUse: 'postToolUse', Stop: 'agentStop' }[event]!) : event;
    const command = hookCommand(name, host, event);
    const timeout = name === 'stop-format-typecheck' ? 60 : name === 'post-edit-format' ? 30 : 10;
    const entry = host === 'copilot'
      ? { type: 'command', bash: command, powershell: command, timeoutSec: timeout }
      : { ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command, timeout }] };
    (result[key] ||= []).push(entry);
  }
  return result;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function object(value: unknown): value is JsonObject { return !!value && typeof value === 'object' && !Array.isArray(value); }
function readSettings(project: string, file: string, host: Host): JsonObject {
  if (!safeAssetPath(project, file)) throw new Error('unsafe settings path');
  if (!existsSync(join(project, file))) return host === 'copilot' ? { version: 1, hooks: {} } : { hooks: {} };
  const parsed: unknown = JSON.parse(readFileSync(join(project, file), 'utf8'));
  if (!object(parsed) || (parsed.hooks !== undefined && !object(parsed.hooks))) throw new Error('invalid hook settings');
  if (host === 'copilot' && parsed.version !== 1) throw new Error('unsupported Copilot hooks version');
  for (const entries of Object.values(parsed.hooks || {})) if (!Array.isArray(entries) || entries.some(e => !object(e))) throw new Error('invalid hook entries');
  if (host !== 'copilot') for (const entries of Object.values(parsed.hooks || {}) as JsonObject[][]) {
    if (entries.some(entry => !Array.isArray(entry.hooks) || entry.hooks.some((hook: unknown) => !object(hook) || typeof hook.type !== 'string' || (hook.type === 'command' && typeof hook.command !== 'string')))) throw new Error('invalid nested hook entries');
  }
  return parsed;
}
function reconcile(settings: JsonObject, host: Host, names: readonly HookName[]): JsonObject {
  const all = registrations(host, HOOK_NAMES), wanted = registrations(host, names);
  const hooks = { ...settings.hooks };
  for (const key of new Set([...Object.keys(all), ...Object.keys(wanted)])) {
    // Exact registrations are owned; edited registrations and unrelated siblings are user-owned.
    const kept: JsonObject[] = [];
    for (const item of hooks[key] || []) {
      if ((all[key] || []).some(owned => same(item, owned))) continue;
      if (host !== 'copilot' && Array.isArray(item.hooks)) {
        const children = item.hooks.filter((child: JsonObject) => !(all[key] || []).some(owned => item.matcher === owned.matcher && same(child, owned.hooks[0])));
        if (children.length !== item.hooks.length) { if (children.length) kept.push({ ...item, hooks: children }); continue; }
      }
      kept.push(item);
    }
    const entries = [...kept, ...(wanted[key] || [])];
    if (entries.length) hooks[key] = entries;
    else delete hooks[key];
  }
  if (settings.hooks === undefined && !Object.keys(hooks).length) return settings;
  return { ...settings, hooks };
}

/** Reconcile optional hook assets and only their project-local registrations. */
export function installHooks(skillsRoot: string, projectPath: string, aiTools: AiTools, names: readonly string[]): { written: string[]; preserved: string[] } {
  const chosen = selected(names), written: string[] = [], preserved: string[] = [];
  if (chosen.length) {
    const files = Object.fromEntries([...chosen.map(name => name + '.cjs'), ...SUPPORT].map(file => [`.nonoise/hooks/${file}`, readFileSync(join(skillsRoot, 'vendor/ecc/hooks', file))]));
    const installed = installManagedAssets(projectPath, files);
    written.push(...installed.written); preserved.push(...installed.preserved);
  }
  const hashes = chosen.length ? readAssetHashes(projectPath) : {};
  const available = chosen.filter(name => [...SUPPORT, name + '.cjs'].every(file => {
    const target = `.nonoise/hooks/${file}`;
    return safeAssetPath(projectPath, target) && existsSync(join(projectPath, target)) && !!hashes[target];
  }));
  for (const { host, key, file } of HOSTS) {
    const wanted = aiTools[key] ? available : [];
    if (!wanted.length && !existsSync(join(projectPath, file))) continue;
    try {
      const current = readSettings(projectPath, file, host);
      const next = reconcile(current, host, wanted);
      if (same(current, next) && existsSync(join(projectPath, file))) continue;
      const content = JSON.stringify(next, null, 2) + '\n';
      mkdirSync(dirname(join(projectPath, file)), { recursive: true });
      writeFileSync(join(projectPath, file), content); written.push(file);
    } catch { preserved.push(file); }
  }
  return { written, preserved };
}

export function doctorHooks(skillsRoot: string, projectPath: string, aiTools: AiTools, names: readonly string[]): string[] {
  const chosen = selected(names), lines: string[] = [];
  if (!chosen.length) return ['Hooks: disabled by profile'];
  for (const file of [...chosen.map(name => name + '.cjs'), ...SUPPORT]) {
    const target = `.nonoise/hooks/${file}`;
    if (!safeAssetPath(projectPath, target)) lines.push(`  hooks: unsafe path ${target}`);
    else if (!existsSync(join(projectPath, target))) lines.push(`  hooks: missing ${target}`);
    else if (digest(readFileSync(join(projectPath, target))) !== digest(readFileSync(join(skillsRoot, 'vendor/ecc/hooks', file)))) lines.push(`  hooks: modified ${target} (preserved)`);
  }
  for (const { host, key, file } of HOSTS) if (aiTools[key]) {
    try {
      const settings = readSettings(projectPath, file, host), expected = registrations(host, chosen);
      const missing = Object.entries(expected).some(([event, entries]) => entries.some(entry => !(settings.hooks?.[event] || []).some((actual: JsonObject) => same(actual, entry))));
      lines.push(`  ${host} hooks: ${missing ? 'missing registrations in' : 'configured in'} ${file}`);
    } catch { lines.push(`  ${host} hooks: invalid or unsafe ${file}`); }
  }
  if (aiTools.copilot) lines.push('  Copilot: trust the repository before relying on project hooks; tool auto-approval flags alone do not establish trust.');
  if (aiTools.codex) lines.push('  Codex: trust the project and review/enable project hooks with /hooks before relying on enforcement.');
  if (aiTools.codex && chosen.includes('safety-guard')) lines.push('  Codex 0.162: careful operations are denied; after confirmation the user runs the command manually (hook ask is unsupported).');
  lines.push('  Hooks use local Node tools only; formatter/typecheck coverage depends on installed project dependencies.');
  return lines;
}
