import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve, parse } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import type { AiTools } from './types.js';
import { installManagedAssets, safeAssetPath } from './managed-assets.js';
import { nonoiseSkillDirs } from './skill-installer.js';

export const REA_VERSION = '6.5.0';
export const REA_STARTUP_TIMEOUT = 120;
export const REA_TOOL_COUNT = 172;
type Result = { written: string[]; preserved: string[] };
const launcher = () => ({ command: 'npx', args: ['-y', `rea-agents@${REA_VERSION}`, 'mcp'], env: { REA_MCP_INPUT_SCHEMA_PROFILE: 'compact' } });
const tomlBlock = () => `[mcp_servers.rea]\ncommand = "npx"\nargs = ["-y", "rea-agents@${REA_VERSION}", "mcp"]\nstartup_timeout_sec = ${REA_STARTUP_TIMEOUT}\n\n[mcp_servers.rea.env]\nREA_MCP_INPUT_SCHEMA_PROFILE = "compact"\n`;
const record = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
function safe(project: string, path: string): boolean {
  // Also reject symlinked project roots and ancestors: a project alias could point at HOME.
  let current = resolve(project);
  for (;;) {
    try { if (lstatSync(current).isSymbolicLink()) return false; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return false; }
    if (current === parse(current).root) break;
    current = dirname(current);
  }
  return safeAssetPath(project, path);
}
function validServer(value: unknown): boolean {
  return record(value) && value.command === 'npx' && JSON.stringify(value.args) === JSON.stringify(launcher().args)
    && record(value.env) && value.env.REA_MCP_INPUT_SCHEMA_PROFILE === 'compact' && value.disabled !== true && value.enabled !== false;
}
function configFiles(ai: AiTools): string[] {
  return [...(ai.claudeCode || ai.copilot ? ['.mcp.json'] : []), ...(ai.codex ? ['.codex/config.toml'] : [])];
}
function validTomlServer(value: unknown): boolean {
  return validServer(value) && record(value) && typeof value.startup_timeout_sec === 'number'
    && value.startup_timeout_sec >= REA_STARTUP_TIMEOUT;
}
/** Merge project-local registrations. Conflicting, malformed and symlinked files are preserved. */
export function configureRea(project: string, ai: AiTools): Result {
  const result: Result = { written: [], preserved: [] };
  for (const file of configFiles(ai)) {
    if (!safe(project, file)) { result.preserved.push(file); continue; }
    const path = join(project, file), previous = existsSync(path) ? readFileSync(path, 'utf8') : '';
    let next: string;
    if (file.endsWith('.json')) {
      let data: unknown;
      try { data = previous ? JSON.parse(previous) : {}; } catch { result.preserved.push(file); continue; }
      if (!record(data) || (data.mcpServers !== undefined && !record(data.mcpServers))) { result.preserved.push(file); continue; }
      const servers = data.mcpServers ?? {};
      if (Object.hasOwn(servers, 'rea')) {
        if (!validServer(servers.rea)) result.preserved.push(file);
        continue;
      }
      data.mcpServers = { ...servers, rea: launcher() };
      next = JSON.stringify(data, null, 2) + '\n';
    } else {
      let data: Record<string, unknown>;
      try { data = parseToml(previous); } catch { result.preserved.push(file); continue; }
      if (record(data.mcp_servers) && Object.hasOwn(data.mcp_servers, 'rea')) {
        if (!validTomlServer(data.mcp_servers.rea)) result.preserved.push(file);
        continue;
      }
      next = previous + (previous && !previous.endsWith('\n') ? '\n' : '') + (previous ? '\n' : '') + tomlBlock();
      // A valid document may still use a sealed inline mcp_servers table or a scalar.
      // Verify the appended result before writing, without reserializing the user's text.
      try { parseToml(next); } catch { result.preserved.push(file); continue; }
    }
    if (next !== previous) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, next); result.written.push(file); }
  }
  return result;
}
function walk(root: string, prefix = ''): string[] {
  return readdirSync(join(root, prefix), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => entry.isDirectory() ? walk(root, posix.join(prefix, entry.name)) : entry.isFile() ? [posix.join(prefix, entry.name)] : []);
}
/** Called only when REA is active. The ordinary rea-setup skill is installed by the native bundle. */
export function installRea(skillsRoot: string, project: string, ai: AiTools): Result {
  const vendor = join(skillsRoot, 'vendor/rea'), files: Record<string, string> = {};
  for (const dir of nonoiseSkillDirs(ai)) for (const file of walk(join(vendor, 'reverse-engineer-anything'))) {
    files[`${dir}/reverse-engineer-anything/${file}`] = readFileSync(join(vendor, 'reverse-engineer-anything', file), 'utf8');
  }
  for (const file of ['LICENSE', 'UPSTREAM.md', 'DISCLAIMER.md']) files[`.nonoise/rea/${file}`] = readFileSync(join(vendor, file), 'utf8');
  const unsafe = Object.keys(files).filter(file => !safe(project, file));
  if (!safe(project, '.nonoise/file-hashes.json')) return { written: [], preserved: Object.keys(files) };
  for (const file of unsafe) delete files[file];
  const result = installManagedAssets(project, files);
  return { written: result.written, preserved: [...unsafe, ...result.preserved] };
}
export function doctorRea(project: string, ai: AiTools, expectedActive = false): string[] {
  const findings: string[] = []; let present = false;
  if (expectedActive && !configFiles(ai).length) findings.push('REA unsupported selected hosts: select Claude Code, Codex, or Copilot for project MCP registration.');
  for (const file of configFiles(ai)) {
    if (!safe(project, file)) { findings.push(`REA unsafe: ${file}`); continue; }
    const path = join(project, file);
    if (!existsSync(path)) { if (expectedActive) findings.push(`REA missing: ${file}`); continue; }
    const text = readFileSync(path, 'utf8');
    let configured = false, found = false, actualVersion = 'unknown';
    try {
      if (file.endsWith('.json')) { const data = JSON.parse(text); found = record(data?.mcpServers) && Object.hasOwn(data.mcpServers, 'rea'); configured = found && validServer(data.mcpServers.rea); actualVersion = JSON.stringify(data?.mcpServers?.rea?.args ?? []).match(/rea-agents@([^\s\"']+)/)?.[1] ?? 'unknown'; }
      else { const data: Record<string, unknown> = parseToml(text); found = record(data.mcp_servers) && Object.hasOwn(data.mcp_servers, 'rea'); const server = record(data.mcp_servers) ? data.mcp_servers.rea : undefined; configured = found && validTomlServer(server); actualVersion = JSON.stringify(record(server) ? server.args : []).match(/rea-agents@([^\s\"']+)/)?.[1] ?? 'unknown'; }
    } catch { findings.push(`REA invalid configuration: ${file}`); continue; }
    present ||= found;
    if (configured) findings.push(`REA configured: ${file}; rea-agents@${REA_VERSION}`);
    else if (found) findings.push(`REA stale/conflicting registration: ${file}; found ${actualVersion}; expected rea-agents@${REA_VERSION}, enabled, compact`);
    else if (expectedActive) findings.push(`REA missing: ${file}`);
  }
  if (!present && !expectedActive && !findings.length) return ['REA: not configured (optional)'];
  if (expectedActive || present) for (const dir of nonoiseSkillDirs(ai)) {
    const file = `${dir}/reverse-engineer-anything/SKILL.md`;
    if (!safe(project, file)) findings.push(`REA unsafe: ${file}`);
    else if (!existsSync(join(project, file))) findings.push(`REA missing: ${file}`);
  }
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
  const supported = (major === 22 && minor >= 19) || (major === 24 && minor >= 11) || major >= 26;
  findings.push(`REA Node >=22.19 required; upstream supports ^22.19.0 || ^24.11.0 || >=26.0.0; current ${process.versions.node}${supported ? '' : ' — unsupported'}`);
  findings.push(`REA context: ${REA_TOOL_COUNT} tools; compact input schemas reduce context cost. Registration does not prove a live MCP connection.`);
  return findings;
}
