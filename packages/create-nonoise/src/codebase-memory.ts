import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LEGACY_VENDOR_HASHES } from './legacy-vendor-hashes.js';
import type { AiTools } from './types.js';

/**
 * codebase-memory-mcp (https://github.com/DeusData/codebase-memory-mcp) is the
 * code knowledge graph NONoise wires into every scaffold. It replaced graphify
 * in 1.9.0: one native binary, no Python/uv, no LLM key, and the same MCP
 * server for Claude Code, Codex, Copilot, Cursor and Gemini CLI.
 *
 * The binary is not pinned. A scaffold installs the latest release when none is
 * on PATH and leaves an existing one alone; `--upgrade` and `--code-graph-only`
 * move it to the latest release. In between it lives its own life: the user (or
 * `npm`) updates it whenever they like, and NONoise never downgrades it.
 *
 * NONoise registers the server in the project's own MCP config files. It never
 * runs upstream `install`, which edits user-global agent configuration and hooks.
 */
/** Oldest release the bundled skill and docs were written against. Older
 * binaries still run; doctor and the install summary suggest updating them. */
export const CBM_MIN_VERSION = '0.12.0';
export const CBM_PACKAGE = 'codebase-memory-mcp';
export const CBM_SERVER = 'codebase-memory-mcp';
export const CBM_SKILL = 'codebase-memory';

export type Result = { ok: boolean; output: string };
export type Runner = (bin: string, args: string[], cwd: string) => Result;
export type InstallMode = 'if-missing' | 'update';
export type CbmContext = {
  projectPath: string;
  aiTools: AiTools;
  /** `if-missing` (scaffold): install the latest release only when no binary
   * answers. `update` (upgrade, code-graph-only): move to the latest release. */
  mode?: InstallMode;
  /** Injected in tests; defaults to a real process runner. */
  runner?: Runner;
};
export type CbmReport = {
  binary: 'installed' | 'updated' | 'already-present' | 'install-failed' | 'skipped';
  version?: string;
  /** MCP config files written or extended in this run. */
  configured: string[];
  /** MCP config files that already carried a valid server entry. */
  unchanged: string[];
  /** MCP config files left alone because they hold a conflicting or unreadable
   * entry. The graph is not reachable from that tool until the user resolves it. */
  preserved: string[];
  /** Modified graphify files left in place. Harmless: reported, never a failure. */
  legacyKept: string[];
  /** Legacy graphify files removed from the project. */
  retired: string[];
  hints: string[];
};

const run: Runner = (bin, args, cwd) => {
  try {
    // npm and its global shims are .cmd files on Windows and need a shell there.
    return { ok: true, output: execFileSync(bin, args, { cwd, encoding: 'utf8', timeout: 300_000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }).trim() };
  } catch (error) {
    const e = error as { stderr?: Buffer | string; message?: string };
    return { ok: false, output: e.stderr?.toString().trim() || e.message || String(error) };
  }
};

/** `codebase-memory-mcp 0.12.1` → `0.12.1`. */
export function parseVersion(output: string): string | undefined {
  return /\bv?(\d+\.\d+\.\d+)\b/.exec(output)?.[1];
}
function olderThan(version: string, target: string): boolean {
  const a = version.split('.').map(Number), b = target.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return (a[i] ?? 0) < (b[i] ?? 0);
  return false;
}
export function installCommand(): string { return `npm install -g ${CBM_PACKAGE}@latest`; }
function recovery(cwd: string): string { return `create-nonoise --code-graph-only ${JSON.stringify(cwd)}`; }
function probe(cwd: string, runner: Runner): string | undefined {
  const result = runner(CBM_SERVER, ['--version'], cwd);
  return result.ok ? parseVersion(result.output) : undefined;
}

/** Make sure a binary answers on PATH. Never pins and never downgrades. */
export function ensureBinary(cwd: string, runner: Runner = run, mode: InstallMode = 'if-missing'): Pick<CbmReport, 'binary' | 'version' | 'hints'> {
  const before = probe(cwd, runner);
  const outdated = (version: string) => olderThan(version, CBM_MIN_VERSION)
    ? [`${CBM_SERVER} ${version} is older than ${CBM_MIN_VERSION}, the release NONoise's skill was written against. Update it: ${installCommand()}`] : [];
  if (before && mode === 'if-missing') return { binary: 'already-present', version: before, hints: outdated(before) };
  const install = runner('npm', ['install', '-g', `${CBM_PACKAGE}@latest`], cwd);
  const after = probe(cwd, runner);
  if (after) {
    const hints = outdated(after);
    // An update that failed (offline, permissions) leaves the working binary in place.
    if (!install.ok) hints.push(`${installCommand()} failed, ${CBM_SERVER} ${after} stays in use:\n${install.output}`);
    return { binary: !before ? 'installed' : after !== before ? 'updated' : 'already-present', version: after, hints };
  }
  return {
    binary: 'install-failed',
    hints: [
      `${installCommand()} did not put ${CBM_SERVER} on PATH:\n${install.output || 'the command ran, but the binary does not answer'}`,
      `Run it yourself (the npm global bin directory must be on PATH), then ${recovery(cwd)}`,
    ],
  };
}

function validServer(server: any): boolean {
  return typeof server?.command === 'string' && /(?:^|[/\\])?codebase-memory-mcp(?:\.exe|\.cmd)?$/.test(server.command) && server.disabled !== true;
}
type JsonTarget = { path: string; key: 'mcpServers' | 'servers'; entry: Record<string, unknown> };
function jsonTargets(ai: AiTools): JsonTarget[] {
  const stdio = { command: CBM_SERVER, args: [] };
  return [
    // Claude Code and Copilot CLI both read the workspace .mcp.json.
    (ai.claudeCode || ai.copilot) && { path: '.mcp.json', key: 'mcpServers', entry: stdio },
    // Copilot in VS Code reads .vscode/mcp.json, whose root key is `servers`.
    ai.copilot && { path: '.vscode/mcp.json', key: 'servers', entry: { type: 'stdio', ...stdio } },
    ai.cursor && { path: '.cursor/mcp.json', key: 'mcpServers', entry: stdio },
    ai.geminiCli && { path: '.gemini/settings.json', key: 'mcpServers', entry: stdio },
  ].filter(Boolean) as JsonTarget[];
}
const CODEX_CONFIG = '.codex/config.toml';
function codexSection(text: string): string | undefined {
  return text.match(/^\[mcp_servers\.codebase-memory-mcp\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1];
}
function validCodexSection(section: string | undefined): boolean {
  return section !== undefined && /^command\s*=\s*["'](?:[^"']*[/\\])?codebase-memory-mcp(?:\.exe|\.cmd)?["']\s*$/m.test(section) && !/^enabled\s*=\s*false/m.test(section);
}
function read(path: string): string | undefined { try { return readFileSync(path, 'utf8'); } catch { return undefined; } }
function write(path: string, text: string): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }

/** Register the MCP server in the project-local config of every selected tool.
 * Existing entries are never rewritten: a valid one is kept, a differing one is
 * reported as preserved so the user resolves it. */
export function configureCodebaseMemory(cwd: string, ai: AiTools): Pick<CbmReport, 'configured' | 'unchanged' | 'preserved'> {
  const configured: string[] = [], unchanged: string[] = [], preserved: string[] = [];
  for (const target of jsonTargets(ai)) {
    const file = join(cwd, target.path), text = read(file);
    let config: any = {};
    if (text !== undefined && text.trim()) {
      try { config = JSON.parse(text); } catch { preserved.push(target.path); continue; }
      if (typeof config !== 'object' || config === null || Array.isArray(config)) { preserved.push(target.path); continue; }
    }
    const existing = config[target.key]?.[CBM_SERVER];
    if (existing !== undefined) { (validServer(existing) ? unchanged : preserved).push(target.path); continue; }
    config[target.key] = { ...config[target.key], [CBM_SERVER]: target.entry };
    write(file, JSON.stringify(config, null, 2) + '\n');
    configured.push(target.path);
  }
  if (ai.codex) {
    const file = join(cwd, CODEX_CONFIG), text = read(file) ?? '', section = codexSection(text);
    if (section !== undefined) (validCodexSection(section) ? unchanged : preserved).push(CODEX_CONFIG);
    else {
      write(file, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${text.trim() ? '\n' : ''}[mcp_servers.${CBM_SERVER}]\ncommand = "${CBM_SERVER}"\nargs = []\n`);
      configured.push(CODEX_CONFIG);
    }
  }
  return { configured, unchanged, preserved };
}

/** Paths a selected tool needs before the graph is reachable. */
export function codebaseMemoryMissing(cwd: string, ai: AiTools): string[] {
  const missing: string[] = [];
  for (const target of jsonTargets(ai)) {
    let ok = false;
    try { ok = validServer(JSON.parse(readFileSync(join(cwd, target.path), 'utf8'))[target.key]?.[CBM_SERVER]); } catch { /* missing or invalid */ }
    if (!ok) missing.push(`${target.path}: ${CBM_SERVER} server missing/invalid`);
  }
  if (ai.codex && !validCodexSection(codexSection(read(join(cwd, CODEX_CONFIG)) ?? ''))) missing.push(`${CODEX_CONFIG}: ${CBM_SERVER} server missing/invalid`);
  return missing;
}

const GRAPHIFY_SKILLS = ['.claude/skills/graphify', '.copilot/skills/graphify', '.agents/skills/graphify', '.cursor/skills/graphify', '.gemini/skills/graphify'];
const GRAPHIFY_RECEIPT = '.nonoise/native-graphify.json';
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** Remove the graphify integration earlier NONoise versions installed. Only
 * files NONoise can prove it wrote are deleted: a skill whose SKILL.md matches
 * a shipped hash or the native install receipt, and hook entries that only run
 * graphify. `graphify-out/` and the graphify tool itself are user data. */
export function retireGraphify(cwd: string): Pick<CbmReport, 'retired' | 'legacyKept' | 'hints'> {
  const retired: string[] = [], legacyKept: string[] = [], hints: string[] = [];
  let receipt: { platforms?: Record<string, string> } = {};
  try { receipt = JSON.parse(readFileSync(join(cwd, GRAPHIFY_RECEIPT), 'utf8')); } catch { /* no native receipt */ }
  const receiptHashes = Object.values(receipt.platforms ?? {});
  for (const dir of GRAPHIFY_SKILLS) {
    const skill = join(cwd, dir, 'SKILL.md');
    if (!existsSync(skill)) continue;
    const hash = sha256(readFileSync(skill));
    if (receiptHashes.includes(hash) || LEGACY_VENDOR_HASHES[`${dir}/SKILL.md`]?.includes(hash)) {
      rmSync(join(cwd, dir), { recursive: true, force: true });
      retired.push(dir);
    } else legacyKept.push(`${dir}/SKILL.md`);
  }
  if (existsSync(join(cwd, GRAPHIFY_RECEIPT))) { rmSync(join(cwd, GRAPHIFY_RECEIPT)); retired.push(GRAPHIFY_RECEIPT); }
  const settings = join(cwd, '.claude/settings.json');
  try {
    const config = JSON.parse(readFileSync(settings, 'utf8'));
    let changed = false;
    for (const [event, groups] of Object.entries<any>(config.hooks ?? {})) {
      if (!Array.isArray(groups)) continue;
      const kept = groups.map(group => {
        if (!Array.isArray(group?.hooks)) return group;
        const hooks = group.hooks.filter((hook: any) => !/\bgraphify\b/.test(String(hook?.command ?? '')));
        if (hooks.length !== group.hooks.length) changed = true;
        return hooks.length ? { ...group, hooks } : undefined;
      }).filter(Boolean);
      if (kept.length) config.hooks[event] = kept; else delete config.hooks[event];
    }
    if (changed) {
      if (config.hooks && !Object.keys(config.hooks).length) delete config.hooks;
      writeFileSync(settings, JSON.stringify(config, null, 2) + '\n');
      retired.push('.claude/settings.json (graphify hooks)');
    }
  } catch { /* no settings, or not JSON: nothing NONoise can safely edit */ }
  if (legacyKept.length) hints.push(`Modified graphify skill kept: ${legacyKept.join(', ')}. Delete it once you no longer need it.`);
  if (existsSync(join(cwd, 'graphify-out'))) hints.push('graphify-out/ is left in place (your data). Delete it when you no longer need the old graph; `uv tool uninstall graphifyy` removes the old CLI.');
  return { retired, legacyKept, hints };
}

export function installCodebaseMemory(ctx: CbmContext): CbmReport {
  const binary = ensureBinary(ctx.projectPath, ctx.runner, ctx.mode);
  const config = configureCodebaseMemory(ctx.projectPath, ctx.aiTools);
  const legacy = retireGraphify(ctx.projectPath);
  const hints = [...binary.hints, ...legacy.hints];
  if (config.preserved.length) hints.push(`Existing ${CBM_SERVER} entry or unreadable file kept: ${config.preserved.join(', ')}. Point it at \`${CBM_SERVER}\` (no args), then ${recovery(ctx.projectPath)}`);
  if (binary.binary !== 'install-failed') hints.push(`Build the graph once: \`${CBM_SERVER} cli index_repository --repo-path .\` (or ask your AI tool to "index this repository"); it then stays in sync while a session is open.`);
  return { binary: binary.binary, version: binary.version, configured: config.configured, unchanged: config.unchanged, preserved: config.preserved, legacyKept: legacy.legacyKept, retired: legacy.retired, hints };
}

export function formatReport(r: CbmReport): string {
  const lines = [`  ${CBM_SERVER}: ${r.binary}${r.version ? ` (${r.version})` : ''}`];
  lines.push(`  MCP configs written: ${r.configured.join(', ') || 'none'}${r.unchanged.length ? `; already present: ${r.unchanged.join(', ')}` : ''}`);
  if (r.retired.length) lines.push(`  graphify retired: ${r.retired.join(', ')}`);
  for (const hint of r.hints) lines.push(`  → ${hint}`);
  return lines.join('\n');
}

/** Only filesystem reads and a version probe. Never installs. */
export function doctorCodebaseMemory(cwd: string, ai: AiTools, runner: Runner = run): string[] {
  const fix = recovery(cwd);
  const version = probe(cwd, runner);
  const lines = [!version ? `${CBM_SERVER}: missing from PATH — ${installCommand()}; ${fix}`
    : olderThan(version, CBM_MIN_VERSION) ? `${CBM_SERVER} ${version}: older than ${CBM_MIN_VERSION} — ${installCommand()}`
    : `${CBM_SERVER} ${version}: installed (not pinned; update any time with ${installCommand()})`];
  const missing = codebaseMemoryMissing(cwd, ai);
  lines.push(...(missing.length ? missing.map(p => `${CBM_SERVER} missing: ${p} — ${fix}`) : [`${CBM_SERVER} MCP configs: present for selected harnesses`]));
  const stale = GRAPHIFY_SKILLS.filter(dir => existsSync(join(cwd, dir)));
  if (stale.length) lines.push(`graphify leftovers: ${stale.join(', ')} — ${fix} retires unmodified copies`);
  return lines;
}
