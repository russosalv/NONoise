import { preserveInstructionFiles } from './managed-block.js';
import { createHash } from 'node:crypto';
import { MVP_SKILL_BUNDLE } from './skill-bundle.js';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AiTools, AiToolKey } from './types.js';
import type { GraphifyInstallContext, InstallReport } from './graphify-install.js';

export const MARKETPLACE = 'russosalv/NONoise';
export const SUPERPOWERS_SHA = 'b55764852ac78870e65c6565fb585b6cd8b3c5c9';
export type Command = { bin: string; args: string[] };
export type Outcome = Command & { ok: boolean; output: string };
export function commandText(c: Command): string {
  return [c.bin, ...c.args].map(s => /^[a-zA-Z0-9_@./:=,-]+$/.test(s) ? s : JSON.stringify(s)).join(' ');
}
export function run(c: Command, cwd: string): Outcome {
  try {
    const output = execFileSync(c.bin, c.args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 });
    return { ...c, ok: true, output: output.trim() };
  } catch (error) {
    const e = error as { stderr?: Buffer | string; message?: string };
    return { ...c, ok: false, output: e.stderr?.toString().trim() || e.message || String(error) };
  }
}
function json(path: string): any { return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}; }
function save(path: string, value: unknown): void {
  const content = JSON.stringify(value, null, 2) + '\n';
  if (existsSync(path)) {
    const previous = readFileSync(path, 'utf8');
    if (previous === content || JSON.stringify(JSON.parse(previous)) === JSON.stringify(value)) return;
  }
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content);
}
export function configureNativeVendors(projectPath: string, ai: AiTools): void {
  if (!ai.claudeCode) return;
  const path = join(projectPath, '.claude/settings.json');
  const settings = json(path);
  // Remove only the exact obsolete hook emitted by NONoise 1.6.0.
  const legacyCommand = 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/superpowers/run-hook.cmd" session-start';
  if (Array.isArray(settings.hooks?.SessionStart)) {
    settings.hooks.SessionStart = settings.hooks.SessionStart.map((entry: any) => ({
      ...entry, hooks: Array.isArray(entry.hooks) ? entry.hooks.filter((hook: any) =>
        !(hook.type === 'command' && hook.command === legacyCommand && hook.async === false)) : entry.hooks,
    })).filter((entry: any) => !Array.isArray(entry.hooks) || entry.hooks.length > 0);
    if (!settings.hooks.SessionStart.length) delete settings.hooks.SessionStart;
  }

  settings.extraKnownMarketplaces = { ...settings.extraKnownMarketplaces,
    nonoise: { source: { source: 'github', repo: MARKETPLACE } },
    'anthropic-agent-skills': { source: { source: 'github', repo: 'anthropics/skills' } },
  };
  settings.enabledPlugins = { ...settings.enabledPlugins,
    'superpowers@nonoise': true,
    'document-skills@anthropic-agent-skills': true,
    'example-skills@anthropic-agent-skills': true,
  };
  save(path, settings);
}
const providers: Record<AiToolKey, string> = { claudeCode: 'claude', copilot: 'github', codex: 'codex', cursor: 'cursor', geminiCli: 'gemini' };
const skillRoots: Record<AiToolKey, string> = { claudeCode: '.claude', copilot: '.github', codex: '.agents', cursor: '.cursor', geminiCli: '.gemini' };
const graphRoots: Record<AiToolKey, string> = { ...skillRoots, copilot: '.copilot', codex: '.codex' };
export function nativePlan(ai: AiTools): Command[] {
  const plan: Command[] = [];
  for (const bin of ['codex', 'copilot'] as const) {
    if (!ai[bin]) continue;
    plan.push({ bin, args: ['plugin', 'marketplace', 'add', MARKETPLACE] },
      { bin, args: ['plugin', bin === 'codex' ? 'add' : 'install', 'superpowers@nonoise'] });
  }
  const selected = (Object.keys(providers) as AiToolKey[]).filter(k => ai[k]).map(k => providers[k]);
  if (selected.length) plan.push({ bin: 'npx', args: ['--yes', 'impeccable', 'install', '--yes', `--providers=${selected.join(',')}`, '--scope=project'] });
  return plan;
}
export function installNativeVendors(projectPath: string, ai: AiTools, protectedPaths: string[] = []): Outcome[] {
  const outcomes: Outcome[] = [];
  for (const c of nativePlan(ai)) {
    if (c.bin === 'npx' && protectedPaths.some(p => (p === '.claude/skills/impeccable' || p.startsWith('.claude/skills/impeccable/')) && existsSync(join(projectPath, p)))) {
      const result = { ...c, ok: false, output: 'Preserved modified legacy impeccable files; resolve these before installing.' };
      outcomes.push(result); console.log(`[native] PENDING ${commandText(c)}\n${result.output}`); continue;
    }
    let result: Outcome;
    if (c.args.slice(0, 3).join(' ') === 'plugin marketplace add') {
      const registered = run({ bin: c.bin, args: ['plugin', 'marketplace', 'list', '--json'] }, projectPath);
      let found = false;
      try {
        const data = JSON.parse(registered.output);
        found = (Array.isArray(data) ? data : data.marketplaces ?? []).some((m: { name: string }) => m.name === 'nonoise');
      } catch { /* add below */ }
      result = found ? { ...c, ok: true, output: 'Marketplace already registered' } : run(c, projectPath);
    } else result = run(c, projectPath);
    if (result.ok && c.args[0] === 'plugin' && ['add', 'install'].includes(c.args[1] ?? '')) {
      const listed = run({ bin: c.bin, args: ['plugin', 'list', '--json'] }, projectPath);
      if (!listed.ok || !hasInstalledPlugin(listed.output, c.args[2]!)) {
        result = { ...c, ok: false, output: `Installer completed but plugin list did not confirm ${c.args[2]}. ${listed.output}` };
      }
    }
    outcomes.push(result);
    console.log(`[native] ${result.ok ? 'OK' : 'PENDING'} ${commandText(c)}${result.ok ? '' : '\n  ' + result.output}`);
  }
  console.log('[native] Pending commands:\n' + (outcomes.filter(r => !r.ok).map(commandText).join('\n') || 'none'));
  return outcomes;
}
/** Upstream graphify replaces whole legacy Markdown sections, including trailing
 * user prose. NONoise owns only its managed block, so preserve these files while
 * letting upstream install its skills, references and hook configuration. */
function runGraphify(c: Command, cwd: string): Outcome {
  return preserveInstructionFiles(cwd, () => run(c, cwd));
}

export function installNativeGraphify(ctx: GraphifyInstallContext): InstallReport {
  const pin = 'graphifyy==0.9.91';
  const receiptPath = join(ctx.projectPath, '.nonoise/native-graphify.json');
  const receipt = json(receiptPath);
  const digest = (file: string) => existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex') : undefined;
  const version = run({ bin: 'uv', args: ['tool', 'list'] }, ctx.projectPath);
  const already = version.ok && /graphifyy v0\.9\.91\b/.test(version.output);
  const install = already ? version : run({ bin: 'uv', args: ['tool', 'install', '--force', pin] }, ctx.projectPath);
  const report: InstallReport = {
    python: { found: install.ok }, uv: { found: version.ok },
    graphifyy: install.ok ? (already ? 'already-present' : 'installed') : 'install-failed',
    graphifyyVersion: install.ok ? '0.9.91' : undefined,
    projectLocal: { source: 'native', written: [], skipped: [], errors: [] },
    claudeHook: 'skipped', copilotHook: 'skipped', codexHook: 'skipped', cursorHook: 'skipped', geminiHook: 'skipped', hints: [],
  };
  if (!install.ok) report.hints.push(`${commandText(install)}\n${install.output}`);
  const hooks = { claudeCode: 'claudeHook', copilot: 'copilotHook', codex: 'codexHook', cursor: 'cursorHook', geminiCli: 'geminiHook' } as const;
  for (const key of Object.keys(providers) as AiToolKey[]) {
    if (!ctx[key]) continue;
    const platform = key === 'copilot' ? 'copilot' : providers[key];
    const c = { bin: 'graphify', args: ['install', '--project', '--platform', platform] };
    const skillPath = `${graphRoots[key]}/skills/graphify/SKILL.md`;
    const hash = digest(join(ctx.projectPath, skillPath));
    if (!ctx.force && already && hash && receipt.version === '0.9.91' && receipt.platforms?.[key] === hash) {
      report[hooks[key]] = 'ok'; report.projectLocal.skipped.push(skillPath); continue;
    }
    const protectedFile = ctx.protectedPaths?.some(p => (p === `${graphRoots[key]}/skills/graphify` || p.startsWith(`${graphRoots[key]}/skills/graphify/`) || (key === 'codex' && p.startsWith('.agents/skills/graphify'))) && existsSync(join(ctx.projectPath, p)));
    const result = protectedFile ? { ...c, ok: false, output: 'Preserved modified legacy graphify file; resolve before installing.' } : install.ok ? runGraphify(c, ctx.projectPath) : { ...c, ok: false, output: 'graphifyy installation unavailable' };
    report[hooks[key]] = result.ok ? 'ok' : 'failed';
    if (result.ok) {
      report.projectLocal.written.push(skillPath);
      const installedHash = digest(join(ctx.projectPath, skillPath));
      if (installedHash) {
        receipt.version = '0.9.91'; receipt.platforms = { ...receipt.platforms, [key]: installedHash };
        save(receiptPath, receipt);
      }
    }
    else report.hints.push(`${commandText(c)}\n${result.output}`);
  }
  return report;
}

export function hasInstalledPlugin(output: string, plugin: string): boolean {
  try {
    const data = JSON.parse(output);
    const entries = Array.isArray(data) ? data : data.installed ?? data.plugins ?? [];
    return entries.some((p: any) =>
      (p.id === plugin || p.pluginId === plugin || `${p.name}@${p.marketplaceName ?? p.marketplace}` === plugin)
      && p.enabled !== false && p.installed !== false
      && Boolean(p.installPath || p.installedPath || p.installed || p.status === 'installed' || p.source === 'live' || p.source === 'installed'));
  } catch { return false; }
}

/** Only filesystem reads and CLI list operations. Never installs or refreshes. */
export function doctor(projectPath: string): string[] {
  const path = join(projectPath, 'nonoise.config.json');
  if (!existsSync(path)) throw new Error(`Not a NONoise project: ${path}`);
  const config = json(path);
  const lines = [`NONoise doctor: ${projectPath} (vendor-mode ${config.vendorMode ?? 'embed/legacy'})`];
  const ai: AiTools = config.aiTools;
  for (const key of Object.keys(providers) as AiToolKey[]) {
    if (!ai[key]) continue;
    lines.push(`[${key}]`);
    const missing = MVP_SKILL_BUNDLE.filter(name => !existsSync(join(projectPath, '.claude/skills', name, 'SKILL.md')));
    lines.push(`NONoise skills: ${MVP_SKILL_BUNDLE.length - missing.length}/${MVP_SKILL_BUNDLE.length} installed${missing.length ? ' — missing: ' + missing.join(', ') + '; create-nonoise --upgrade ' + projectPath : ''}`);
    if (config.vendorMode !== 'native') {
      for (const name of ['superpowers', 'impeccable', 'pptx', 'skill-creator']) lines.push(`${name}: ${existsSync(join(projectPath, '.claude/skills', name)) ? 'embedded' : 'missing'} — create-nonoise --upgrade --vendor-mode embed ${projectPath}`);
      const graphify = existsSync(join(projectPath, key === 'codex' ? '.agents' : graphRoots[key], 'skills/graphify/SKILL.md'));
      lines.push(`graphify: ${graphify ? 'embedded' : 'missing'} — create-nonoise --graphify-only --vendor-mode embed ${projectPath}`);
      continue;
    }
    if (key === 'claudeCode' || key === 'codex' || key === 'copilot') {
      const bin = key === 'claudeCode' ? 'claude' : key;
      const listed = run({ bin, args: ['plugin', 'list', '--json'] }, projectPath);
      const plugins = key === 'claudeCode' ? ['superpowers@nonoise', 'document-skills@anthropic-agent-skills', 'example-skills@anthropic-agent-skills'] : ['superpowers@nonoise'];
      for (const plugin of plugins) {
        const installed = listed.ok && hasInstalledPlugin(listed.output, plugin);
        lines.push(`${plugin}: ${installed ? 'installed' : 'missing/unverified'} — ${bin} plugin marketplace add ${plugin.includes('anthropic') ? 'anthropics/skills' : MARKETPLACE}; ${bin} plugin ${bin === 'codex' ? 'add' : 'install'} ${plugin}`);
      }
      if (!listed.ok) lines.push(`list error: ${listed.output}`);
    } else lines.push(`superpowers: no native plugin channel for ${key}; use --vendor-mode embed`);
    const impeccable = existsSync(join(projectPath, skillRoots[key], 'skills/impeccable/SKILL.md'));
    lines.push(`impeccable: ${impeccable ? 'installed' : 'missing'} — npx --yes impeccable install --yes --providers=${providers[key]} --scope=project`);
    const graphify = existsSync(join(projectPath, graphRoots[key], 'skills/graphify/SKILL.md'));
    const version = run({ bin: 'uv', args: ['tool', 'list'] }, projectPath);
    lines.push(`graphify: ${graphify && /graphifyy v0\.9\.91\b/.test(version.output) ? 'installed 0.9.91' : 'missing/wrong version'} — uv tool install --force graphifyy==0.9.91; graphify install --project --platform ${key === 'copilot' ? 'copilot' : providers[key]}`);
    if (key !== 'claudeCode') lines.push('pptx, skill-creator: no native channel for this harness (available through Claude plugins or --vendor-mode embed)');
  }
  console.log(lines.join('\n')); return lines;
}
