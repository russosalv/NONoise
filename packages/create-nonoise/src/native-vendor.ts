import { safeAssetPath } from './managed-assets.js';
import { doctorEcc } from './ecc.js';
import { fileURLToPath } from 'node:url';
import { doctorHaft } from './haft.js';
import { preserveInstructionFiles } from './managed-block.js';
import { createHash } from 'node:crypto';
import { parseProfile, resolveProfile } from './profiles.js';
import { doctorHooks } from './hooks.js';
import { doctorRea } from './rea.js';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, lstatSync, statSync, readdirSync, readlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { AiTools, AiToolKey } from './types.js';
import type { GraphifyInstallContext, InstallReport } from './graphify-install.js';

export const MARKETPLACE = 'russosalv/NONoise';
/**
 * Git ref of the NONoise marketplace this CLI reads: the release tag of its own
 * version, so a CLI never installs plugins from a newer or older manifest.
 * NONOISE_MARKETPLACE_REF overrides it (maintainers validating a branch).
 */
export const MARKETPLACE_REF = process.env.NONOISE_MARKETPLACE_REF
  ?? `v${JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version}`;
/** CLI source string: Claude uses `repo#ref`, Codex `repo@ref`; Copilot has no ref syntax. */
export function marketplaceSource(bin: string, repo: string, ref?: string): string {
  if (!ref || bin === 'copilot') return repo;
  return bin === 'codex' ? `${repo}@${ref}` : `${repo}#${ref}`;
}
export const SUPERPOWERS_SHA = 'b55764852ac78870e65c6565fb585b6cd8b3c5c9';
export type Command = { bin: string; args: string[] };
export type Outcome = Command & { ok: boolean; output: string };
export function commandText(c: Command): string {
  return [c.bin, ...c.args].map(s => /^[a-zA-Z0-9_@./:=,-]+$/.test(s) ? s : JSON.stringify(s)).join(' ');
}
/** Retry only installers and only recognizable transient transport failures. */
export function run(c: Command, cwd: string): Outcome {
  const installer = (c.bin === 'npx' && c.args.includes('impeccable') && c.args.includes('install'))
    || (c.bin === 'uv' && c.args[0] === 'tool' && c.args[1] === 'install')
    || (['claude', 'codex', 'copilot'].includes(c.bin) && c.args[0] === 'plugin'
      && (['add', 'install'].includes(c.args[1] ?? '') || c.args.slice(1, 3).join(' ') === 'marketplace add'));
  for (let attempt = 0; ; attempt++) {
    try {
      const output = execFileSync(c.bin, c.args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 });
      return { ...c, ok: true, output: output.trim() };
    } catch (error) {
      const e = error as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string; code?: string };
      const output = [e.stdout?.toString().trim(), e.stderr?.toString().trim(), e.message, e.code].filter(Boolean).join('\n') || String(error);
      const network = /\b(?:EAI_AGAIN|ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH)\b|dns (?:failed|failure)|(?:could not|couldn't|failed to) resolve (?:host(?:name)?|dns(?: name)?|address|name)\b|resolve dns name|timed?\s*out|timeout|temporary failure in name resolution|(?:HTTP(?:\/\d(?:\.\d)?)?(?: error)?|status(?: code)?|(?:server|URL) returned(?: status| error)?)[:\s]+5\d\d\b|\b5\d\d (?:Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time)/i.test(output);
      if (!installer || !network || attempt >= 2) return { ...c, ok: false, output };
      const delay = 1000 * (attempt + 1);
      console.log(`[native] RETRY ${attempt + 2}/3 in ${delay}ms: ${commandText(c)}\n  ${output}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}
/** OpenAI's official Codex plugin for Claude Code; replaces the former codex-delegate skill. */
export const CODEX_PLUGIN: { id: string; marketplace: string; repo: string; ref?: string } = { id: 'codex@openai-codex', marketplace: 'openai-codex', repo: 'openai/codex-plugin-cc' };
const claudePlugins: Array<{ id: string; marketplace: string; repo: string; ref?: string }> = [
  { id: 'superpowers@nonoise', marketplace: 'nonoise', repo: MARKETPLACE, ref: MARKETPLACE_REF },
  { id: 'document-skills@anthropic-agent-skills', marketplace: 'anthropic-agent-skills', repo: 'anthropics/skills' },
  { id: 'skill-creator@claude-plugins-official', marketplace: 'claude-plugins-official', repo: 'anthropics/claude-plugins-official' },
  CODEX_PLUGIN,
];
const obsoletePlugin = 'example-skills@anthropic-agent-skills';
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
  if (!safeAssetPath(projectPath, '.claude/settings.json')) throw new Error('Unsafe Claude settings path; existing files preserved.');
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

  settings.extraKnownMarketplaces ??= {};
  settings.enabledPlugins ??= {};
  delete settings.enabledPlugins[obsoletePlugin];
  for (const plugin of claudePlugins) {
    settings.extraKnownMarketplaces[plugin.marketplace] = { source: { source: 'github', repo: plugin.repo, ...(plugin.ref ? { ref: plugin.ref } : {}) } };
    settings.enabledPlugins[plugin.id] = true;
  }
  save(path, settings);
}
/** Embed mode stays offline: declare the Codex plugin so Claude Code offers it on first trust. */
export function configureEmbedPlugins(projectPath: string, ai: AiTools): void {
  if (!ai.claudeCode) return;
  if (!safeAssetPath(projectPath, '.claude/settings.json')) throw new Error('Unsafe Claude settings path; existing files preserved.');
  const path = join(projectPath, '.claude/settings.json');
  const settings = json(path);
  settings.extraKnownMarketplaces ??= {};
  settings.enabledPlugins ??= {};
  settings.extraKnownMarketplaces[CODEX_PLUGIN.marketplace] = { source: { source: 'github', repo: CODEX_PLUGIN.repo } };
  settings.enabledPlugins[CODEX_PLUGIN.id] = true;
  save(path, settings);
}
const providers: Record<AiToolKey, string> = { claudeCode: 'claude', copilot: 'github', codex: 'codex', cursor: 'cursor', geminiCli: 'gemini' };
const skillRoots: Record<AiToolKey, string> = { claudeCode: '.claude', copilot: '.github', codex: '.agents', cursor: '.cursor', geminiCli: '.gemini' };
const graphRoots: Record<AiToolKey, string> = { ...skillRoots, copilot: '.copilot', codex: '.codex' };
export function nativePlan(ai: AiTools): Command[] {
  const plan: Command[] = [];
  if (ai.claudeCode) {
    for (const plugin of claudePlugins) plan.push(
      { bin: 'claude', args: ['plugin', 'marketplace', 'add', marketplaceSource('claude', plugin.repo, plugin.ref)] },
      { bin: 'claude', args: ['plugin', 'install', plugin.id, '--scope', 'project'] },
    );
  }
  for (const bin of ['codex', 'copilot'] as const) {
    if (!ai[bin]) continue;
    plan.push({ bin, args: ['plugin', 'marketplace', 'add', marketplaceSource(bin, MARKETPLACE, MARKETPLACE_REF)] },
      { bin, args: ['plugin', bin === 'codex' ? 'add' : 'install', 'superpowers@nonoise'] });
  }
  const selected = (Object.keys(providers) as AiToolKey[]).filter(k => ai[k]).map(k => providers[k]);
  if (selected.length) plan.push({ bin: 'npx', args: ['--yes', 'impeccable', 'install', '--yes', `--providers=${selected.join(',')}`, '--scope=project'] });
  return plan;
}
export function installNativeVendors(projectPath: string, ai: AiTools, protectedPaths: string[] = []): Outcome[] {
  const outcomes: Outcome[] = [];
  if (ai.claudeCode) {
    const listed = run({ bin: 'claude', args: ['plugin', 'list', '--json'] }, projectPath);
    // Remove only this project's old installation, never a user's global plugin.
    if (pluginEntries(listed.output).some(p => pluginId(p) === obsoletePlugin && inProject(p, projectPath))) {
      const c = { bin: 'claude', args: ['plugin', 'uninstall', obsoletePlugin, '--scope', 'project'] };
      let result = run(c, projectPath);
      if (result.ok) {
        const after = run({ bin: 'claude', args: ['plugin', 'list', '--json'] }, projectPath);
        if (!after.ok || pluginEntries(after.output).some(p => pluginId(p) === obsoletePlugin && inProject(p, projectPath))) {
          result = { ...c, ok: false, output: `Plugin removal not confirmed. ${after.output}` };
        }
      }
      outcomes.push(result);
      console.log(`[native] ${result.ok ? 'OK' : 'PENDING'} ${commandText(c)}${result.ok ? '' : '\n  ' + result.output}`);
    }
  }
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
        found = (Array.isArray(data) ? data : data.marketplaces ?? []).some((m: { name: string }) => m.name === (claudePlugins.find(p => p.repo === c.args[3]!.replace(/[#@].*$/, ''))?.marketplace ?? 'nonoise'));
      } catch { /* add below */ }
      result = found ? { ...c, ok: true, output: 'Marketplace already registered' } : run(c, projectPath);
    } else if (c.args[0] === 'plugin' && ['add', 'install'].includes(c.args[1] ?? '')) {
      const listed = run({ bin: c.bin, args: ['plugin', 'list', '--json'] }, projectPath);
      result = listed.ok && hasInstalledPlugin(listed.output, c.args[2]!, c.bin === 'claude' ? projectPath : undefined)
        ? { ...c, ok: true, output: 'Plugin already installed' } : run(c, projectPath);
    } else result = run(c, projectPath);
    if (c.args[0] === 'plugin' && ['add', 'install'].includes(c.args[1] ?? '')) {
      const listed = run({ bin: c.bin, args: ['plugin', 'list', '--json'] }, projectPath);
      if (listed.ok && hasInstalledPlugin(listed.output, c.args[2]!, c.bin === 'claude' ? projectPath : undefined)) {
        result = { ...c, ok: true, output: listed.output };
      } else if (result.ok) {
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

function pluginEntries(output: string): any[] {
  try {
    const data = JSON.parse(output);
    const entries = Array.isArray(data) ? data : data.installed ?? data.plugins ?? [];
    return Array.isArray(entries) ? entries : [];
  } catch { return []; }
}
function pluginId(p: any): string { return p.id ?? p.pluginId ?? `${p.name}@${p.marketplaceName ?? p.marketplace}`; }
function inProject(p: any, projectPath: string): boolean {
  return p.scope === 'project' && typeof p.projectPath === 'string' && resolve(p.projectPath) === resolve(projectPath);
}
export function hasInstalledPlugin(output: string, plugin: string, projectPath?: string): boolean {
  return pluginEntries(output).some(p => pluginId(p) === plugin
    && (!projectPath || (inProject(p, projectPath) && p.projectEnabled !== false))
    && p.enabled !== false && p.installed !== false
    && Boolean(p.installPath || p.installedPath || p.installed || p.status === 'installed' || p.source === 'live' || p.source === 'installed'));
}

/** Only filesystem reads and CLI list operations. Never installs or refreshes. */
export function doctor(projectPath: string): string[] {
  const path = join(projectPath, 'nonoise.config.json');
  if (!existsSync(path)) throw new Error(`Not a NONoise project: ${path}`);
  const config = json(path);
  const lines = [`NONoise doctor: ${projectPath} (vendor-mode ${config.vendorMode ?? 'embed/legacy'})`];
  const ai: AiTools = config.aiTools;
  const skillsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../skills');
  const selected = resolveProfile(skillsRoot, parseProfile(config.profile), config.stack ?? [], { withRea: config.withRea, legacy: config.legacyProfileCompatibility === true || config.profile === undefined });
  lines.push(`Profile: ${selected.profile}${config.legacyProfileCompatibility || config.profile === undefined ? ' (legacy compatibility)' : ''}; stack: ${(config.stack ?? []).join(',') || 'none'}; hooks: ${selected.hooks.join(', ') || 'none'}`);
  // Inspect links themselves; never recurse through linked directories (including
  // valid links back to an ancestor or to skills outside this project).
  function checkSkillLinks(relativePath: string): void {
    const absolutePath = join(projectPath, relativePath);
    let entry;
    try { entry = lstatSync(absolutePath); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        lines.push(`Cannot inspect skill path: ${relativePath} — ${(error as Error).message}`);
      }
      return;
    }
    if (entry.isSymbolicLink()) {
      try { statSync(absolutePath); }
      catch (error) {
        if (['ENOENT', 'ENOTDIR', 'ELOOP'].includes((error as NodeJS.ErrnoException).code ?? '')) {
          lines.push(`Broken skill symlink: ${relativePath} -> ${readlinkSync(absolutePath)} — restore the missing target or recreate this symlink with the correct target path.`);
        } else {
          lines.push(`Cannot inspect skill symlink: ${relativePath} — ${(error as Error).message}`);
        }
      }
      return;
    }
    if (!entry.isDirectory()) return;
    let children: string[];
    try { children = readdirSync(absolutePath); }
    catch (error) {
      lines.push(`Cannot inspect skill directory: ${relativePath} — ${(error as Error).message}`);
      return;
    }
    for (const child of children.sort()) checkSkillLinks(`${relativePath}/${child}`);
  }
  for (const key of Object.keys(providers) as AiToolKey[]) {
    if (!ai[key]) continue;
    lines.push(`[${key}]`);
    for (const root of new Set([skillRoots[key], graphRoots[key]])) checkSkillLinks(`${root}/skills`);
    const skillDir = key === 'codex' || key === 'copilot' ? '.agents/skills' : '.claude/skills';
    const missing = selected.nativeSkills.filter(name => !existsSync(join(projectPath, skillDir, name, 'SKILL.md')));
    lines.push(`NONoise skills (${skillDir}): ${selected.nativeSkills.length - missing.length}/${selected.nativeSkills.length} installed${missing.length ? ' — missing: ' + missing.join(', ') + '; create-nonoise --upgrade ' + projectPath : ''}`);
    if (!selected.vendors) continue;
    if (config.vendorMode !== 'native') {
      for (const name of ['superpowers', 'impeccable', 'pptx', 'skill-creator']) lines.push(`${name}: ${existsSync(join(projectPath, '.claude/skills', name)) ? 'embedded' : 'missing'} — create-nonoise --upgrade --vendor-mode embed ${projectPath}`);
      const graphify = existsSync(join(projectPath, key === 'codex' ? '.agents' : graphRoots[key], 'skills/graphify/SKILL.md'));
      lines.push(`graphify: ${graphify ? 'embedded' : 'missing'} — create-nonoise --graphify-only --vendor-mode embed ${projectPath}`);
      continue;
    }
    if (key === 'claudeCode' || key === 'codex' || key === 'copilot') {
      const bin = key === 'claudeCode' ? 'claude' : key;
      const listed = run({ bin, args: ['plugin', 'list', '--json'] }, projectPath);
      const plugins = key === 'claudeCode' ? claudePlugins.map(p => p.id) : ['superpowers@nonoise'];
      for (const plugin of plugins) {
        const installed = listed.ok && hasInstalledPlugin(listed.output, plugin, bin === 'claude' ? projectPath : undefined);
        lines.push(`${plugin}: ${installed ? 'installed' : 'missing/unverified'} — ${bin} plugin marketplace add ${(p => marketplaceSource(bin, p?.repo ?? MARKETPLACE, p ? p.ref : MARKETPLACE_REF))(claudePlugins.find(p => p.id === plugin))}; ${bin} plugin ${bin === 'codex' ? 'add' : 'install'} ${plugin}${bin === 'claude' ? ' --scope project' : ''}`);
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
  lines.push(...doctorEcc(skillsRoot, projectPath, ai, config.stack ?? [], selected.ecc));
  lines.push(...doctorHooks(skillsRoot, projectPath, ai, selected.hooks));
  lines.push(...doctorRea(projectPath, ai, selected.rea));
  if (selected.vendors) lines.push(...doctorHaft(projectPath, ai));
  console.log(lines.join('\n')); return lines;
}
