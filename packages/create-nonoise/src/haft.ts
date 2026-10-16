import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, chmodSync, renameSync, rmSync, lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, delimiter, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { AiTools } from './types.js';

// Change these two constants to return to upstream after its date fix ships.
export const HAFT_VERSION = 'v9.1.1-nonoise.1';
export const HAFT_REPO = 'russosalv/haft';
export const HAFT_SKILLS = ['h-commission', 'h-compare', 'h-decide', 'h-diagnose', 'h-explore', 'h-frame', 'h-note', 'h-onboard', 'h-reason', 'h-spec', 'h-status', 'h-verify'];
type Result = { ok: boolean; output: string };
export type HaftOptions = { platform?: NodeJS.Platform; arch?: string; home?: string; baseUrl?: string; retryDelay?: number };
function run(bin: string, args: string[], cwd: string): Result {
  try { return { ok: true, output: execFileSync(bin, args, { cwd, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim() }; }
  catch (error) { const e = error as { stderr?: Buffer; message?: string }; return { ok: false, output: e.stderr?.toString().trim() || e.message || String(error) }; }
}
export function haftAsset(platform = process.platform, arch: string = process.arch): string | undefined {
  const cpu = arch === 'x64' ? 'amd64' : arch === 'arm64' ? 'arm64' : undefined;
  return cpu && (platform === 'linux' || (platform === 'darwin' && cpu === 'arm64')) ? `haft-${platform}-${cpu}.tar.gz` : undefined;
}
function pinned(output: string): boolean {
  return output.split(/\s+/).some(word => word.replace(/^v/, '') === HAFT_VERSION.replace(/^v/, ''));
}
export function haftInitArgs(ai: AiTools): string[] {
  const flags = [ai.claudeCode && '--claude', ai.codex && '--codex', ai.copilot && !ai.codex && '--agents', ai.cursor && '--cursor', ai.geminiCli && '--gemini'].filter(Boolean) as string[];
  return ['init', '--local', ...(flags.length ? flags : ['--core-only'])];
}
function recovery(cwd: string): string { return `create-nonoise --upgrade ${JSON.stringify(cwd)}`; }
function save(path: string, value: unknown): void {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return;
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text);
}
async function download(url: string, retryDelay: number): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}: ${url}`); }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      const e = error as Error & { cause?: { code?: string } };
      const transient = /HTTP 5\d\d|timeout|timed out|fetch failed|EAI_AGAIN|ENOTFOUND|ECONN|ENETUNREACH|EHOSTUNREACH/i.test(`${e.message} ${e.cause?.code}`);
      if (!transient || attempt >= 2) throw error;
      console.log(`[haft] RETRY ${attempt + 2}/3: ${e.message}`);
      await delay(retryDelay * (attempt + 1));
    }
  }
}
export function verifyHaftChecksum(bytes: Buffer, checksums: string, asset: string): void {
  const matches = checksums.split(/\r?\n/).map(line => /^([a-fA-F0-9]{64})\s+\*?(.+)$/.exec(line.trim())).filter(m => m?.[2] === asset);
  if (matches.length !== 1 || matches[0]![1]!.toLowerCase() !== createHash('sha256').update(bytes).digest('hex')) throw new Error(`SHA256 mismatch or missing/duplicate checksum for ${asset}; installation refused`);
}
export async function ensureHaft(cwd: string, opts: HaftOptions = {}): Promise<string> {
  const asset = haftAsset(opts.platform, opts.arch);
  if (!asset) throw new Error((opts.platform ?? process.platform) === 'win32' ? 'Windows native is unsupported: use WSL and run ' + recovery(cwd) : `Unsupported Haft platform: ${opts.platform ?? process.platform}/${opts.arch ?? process.arch}`);
  const installed = run('haft', ['--version'], cwd);
  if (installed.ok && pinned(installed.output)) return 'haft';
  const binDir = join(opts.home ?? homedir(), '.local/bin');
  const bin = join(binDir, 'haft');
  const local = run(bin, ['--version'], cwd);
  if (!local.ok || !pinned(local.output)) {
    const base = (opts.baseUrl ?? process.env.NONOISE_HAFT_BASE_URL ?? `https://github.com/${HAFT_REPO}/releases/download/${HAFT_VERSION}`).replace(/\/$/, '');
    const checksums = await download(`${base}/checksums.txt`, opts.retryDelay ?? 1000);
    const bytes = await download(`${base}/${asset}`, opts.retryDelay ?? 1000);
    verifyHaftChecksum(bytes, checksums.toString('utf8'), asset);
    mkdirSync(binDir, { recursive: true });
    const staging = mkdtempSync(join(binDir, '.haft-install-'));
    try {
      const archive = join(staging, 'release.tar.gz'); writeFileSync(archive, bytes);
      // Extract only the release's root binary, never arbitrary archive paths.
      execFileSync('tar', ['-xzf', archive, '-C', staging, '--', 'haft'], { stdio: 'pipe' });
      const candidate = join(staging, 'haft'); chmodSync(candidate, 0o755);
      const version = run(candidate, ['--version'], cwd);
      if (!version.ok || !pinned(version.output)) throw new Error(`Unexpected Haft release version: ${version.output}`);
      renameSync(candidate, bin);
      console.log(`[haft] installed ${HAFT_VERSION}; SHA256 verified (${asset})`);
    } finally { rmSync(staging, { recursive: true, force: true }); }
  }
  if (!(process.env.PATH ?? '').split(delimiter).includes(binDir)) console.log(`[haft] Add to your shell PATH: export PATH="$HOME/.local/bin:$PATH"`);
  process.env.PATH = binDir + delimiter + (process.env.PATH ?? '');
  return bin;
}
function json(path: string): any { return JSON.parse(readFileSync(path, 'utf8')); }
export function configureCopilotHaft(cwd: string): void {
  // Copilot CLI reads workspace .mcp.json and .agents/skills (copilot mcp/skill --help).
  const path = join(cwd, '.mcp.json');
  const config = existsSync(path) ? json(path) : {};
  config.mcpServers ??= {};
  if (config.mcpServers.haft && !validServer(config.mcpServers.haft)) throw new Error('Existing .mcp.json haft entry differs; preserved. Resolve it, then ' + recovery(cwd));
  config.mcpServers.haft ??= { command: 'haft', args: ['serve'] };
  save(path, config);
}
function validServer(server: any): boolean {
  return typeof server?.command === 'string' && /(?:^|[/\\])haft$/.test(server.command) && Array.isArray(server.args) && server.args[0] === 'serve' && server.disabled !== true;
}
function file(cwd: string, path: string): string { try { return readFileSync(join(cwd, path), 'utf8'); } catch { return ''; } }
export function haftMissing(cwd: string, ai: AiTools): string[] {
  const missing: string[] = [];
  const checkJson = (path: string, key = 'mcpServers') => {
    try { if (!validServer(json(join(cwd, path))[key]?.haft)) missing.push(`${path}: haft server missing/invalid`); }
    catch { missing.push(`${path}: missing/invalid JSON`); }
  };
  if (ai.claudeCode || ai.copilot) checkJson('.mcp.json');
  if (ai.codex) {
    const section = file(cwd, '.codex/config.toml').match(/^\[mcp_servers\.haft\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1] ?? '';
    if (!/^command\s*=\s*["'](?:[^"']*[/\\])?haft["']\s*$/m.test(section) || !/^args\s*=\s*\[\s*["']serve["']/m.test(section) || /^enabled\s*=\s*false/m.test(section)) missing.push('.codex/config.toml: haft server missing/invalid');
  }
  if (ai.cursor) checkJson('.cursor/mcp.json');
  if (ai.geminiCli) checkJson('.gemini/settings.json');
  for (const root of [ai.claudeCode && '.claude', (ai.codex || ai.copilot) && '.agents', ai.cursor && '.cursor', ai.geminiCli && '.gemini'].filter(Boolean) as string[]) {
    for (const skill of HAFT_SKILLS) if (!existsSync(join(cwd, root, 'skills', skill, 'SKILL.md'))) missing.push(`${root}/skills/${skill}/SKILL.md`);
  }
  for (const path of [ai.claudeCode && 'CLAUDE.md', ai.codex && 'AGENTS.md'].filter(Boolean) as string[]) {
    if (!/<!-- haft:start -->[\s\S]*?<!-- haft:end -->/.test(file(cwd, path))) missing.push(`${path}: Haft block`);
  }
  if (!existsSync(join(cwd, '.haft/project.yaml'))) missing.push('.haft/project.yaml');
  return missing;
}
/** Haft itself renames .quint to .haft. NONoise cannot authorize that for user
 * ledgers: hide the entire entry (including symlinks) only for the init call. */
function preserveQuint<T>(cwd: string, action: () => T): T {
  const original = join(cwd, '.quint');
  try { lstatSync(original); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return action(); throw e; }
  const temporary = mkdtempSync(join(cwd, '.nonoise-quint-preserved-'));
  const backup = join(temporary, 'original');
  renameSync(original, backup);
  try { return action(); }
  finally {
    // Never replace a new entry made by another process while init was running.
    let occupied = false; try { lstatSync(original); occupied = true; } catch { /* absent */ }
    if (occupied) throw new Error(`Cannot restore .quint: a new entry appeared. Original data preserved at ${backup}`);
    renameSync(backup, original);
    rmSync(temporary, { recursive: true });
  }
}

export async function installHaft(cwd: string, ai: AiTools, opts: HaftOptions = {}): Promise<Result> {
  try {
    const bin = await ensureHaft(cwd, opts);
    const root = run('git', ['rev-parse', '--show-toplevel'], cwd);
    if (!root.ok || resolve(root.output) !== resolve(cwd) || !run('git', ['rev-parse', '--verify', 'HEAD'], cwd).ok) {
      throw new Error(`Haft needs a project Git repository with a commit. Run in ${JSON.stringify(cwd)}: git init; git add .; git commit -m "Initial project"; ${recovery(cwd)} (NONoise did not commit on your behalf).`);
    }
    const args = haftInitArgs(ai), receipt = join(cwd, '.nonoise/haft.json');
    let previous: any; try { previous = json(receipt); } catch { /* first install */ }
    const status = previous?.version === HAFT_VERSION ? run(bin, ['spec', 'status', '--json'], cwd) : undefined;
    if (!status?.ok || previous?.version !== HAFT_VERSION || JSON.stringify(previous?.args) !== JSON.stringify(args) || haftMissing(cwd, ai).length) {
      const result = preserveQuint(cwd, () => run(bin, args, cwd));
      if (!result.ok) throw new Error(result.output);
      if (!existsSync(join(cwd, '.haft/project.yaml'))) throw new Error(`Haft init did not publish project state: ${result.output}`);
      if (ai.copilot) configureCopilotHaft(cwd);
      const missing = haftMissing(cwd, ai);
      if (missing.length) throw new Error(`Incomplete Haft init: ${missing.join(', ')}\n${result.output}`);
      save(receipt, { version: HAFT_VERSION, args });
    }
    const output = `${HAFT_VERSION}: initialized (${args.join(' ')})`;
    console.log(`[haft] OK ${output}`); return { ok: true, output };
  } catch (error) {
    const output = `${(error as Error).message}\nRecovery: ${recovery(cwd)}\nDiagnostics: create-nonoise doctor ${JSON.stringify(cwd)}`;
    console.log(`[haft] PENDING ${output}`); return { ok: false, output };
  }
}
export function doctorHaft(cwd: string, ai: AiTools, opts: HaftOptions = {}): string[] {
  const supported = Boolean(haftAsset(opts.platform, opts.arch));
  const fix = recovery(cwd);
  const lines = [`Haft platform: ${supported ? 'supported' : 'unsupported (Windows: use WSL)'} (${opts.platform ?? process.platform}/${opts.arch ?? process.arch}) — ${fix}`];
  if (!supported) return lines;
  const gitRoot = run('git', ['rev-parse', '--show-toplevel'], cwd);
  if (!gitRoot.ok || resolve(gitRoot.output) !== resolve(cwd) || !run('git', ['rev-parse', '--verify', 'HEAD'], cwd).ok) {
    lines.push(`Haft Git prerequisite missing — cd ${JSON.stringify(cwd)}; git init; git add .; git commit -m "Initial project"; ${fix}`);
  }
  const version = run('haft', ['--version'], cwd);
  lines.push(`Haft expected ${HAFT_VERSION}; found ${version.ok ? version.output : 'missing from PATH'}${version.ok && pinned(version.output) ? '' : ` — ${fix}; export PATH="$HOME/.local/bin:$PATH"`}`);
  const missing = haftMissing(cwd, ai);
  lines.push(...(missing.length ? missing.map(p => `Haft missing: ${p} — ${fix}`) : ['Haft MCP configs, instruction blocks and h-* skills: present for selected harnesses']));
  if (ai.copilot) {
    const discovered = run('copilot', ['mcp', 'get', 'haft', '--json'], cwd);
    let visible = false;
    try { const data = JSON.parse(discovered.output); visible = discovered.ok && validServer(data.haft); } catch { /* CLI unavailable or untrusted project */ }
    lines.push(`Copilot haft discovery: ${visible ? 'visible' : `unverified — cd ${JSON.stringify(cwd)}; copilot (review folder trust); copilot mcp get haft --json`}`);
    if (!visible) lines.push(discovered.output);
  }
  if (version.ok) {
    const status = run('haft', ['spec', 'status', '--json'], cwd);
    let valid = false; try { JSON.parse(status.output); valid = true; } catch { /* invalid status */ }
    lines.push(`haft spec status --json: ${status.ok && valid ? 'OK' : 'FAILED'}\n${status.output}${status.ok && valid ? '' : '\nRecovery: ' + fix}`);
  } else lines.push(`haft spec status --json: unavailable — ${fix}`);
  return lines;
}
