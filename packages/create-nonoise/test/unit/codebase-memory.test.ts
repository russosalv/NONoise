import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CBM_MIN_VERSION, CBM_SERVER, codebaseMemoryMissing, configureCodebaseMemory, doctorCodebaseMemory,
  ensureBinary, formatReport, installCodebaseMemory, parseVersion, retireGraphify, type Runner,
} from '../../src/codebase-memory.js';
import { LEGACY_VENDOR_HASHES } from '../../src/legacy-vendor-hashes.js';
import type { AiTools } from '../../src/types.js';

const none: AiTools = { claudeCode: false, copilot: false, codex: false, cursor: false, geminiCli: false };
const all: AiTools = { claudeCode: true, copilot: true, codex: true, cursor: true, geminiCli: true };
let dir: string;
const put = (path: string, text: string) => { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text); };
const get = (path: string) => readFileSync(join(dir, path), 'utf8');
const json = (path: string) => JSON.parse(get(path));
/** A runner whose `--version` answer changes once npm has been called. */
function runner(before: string | undefined, after: string | undefined, npmOk = true): Runner & { calls: string[] } {
  const calls: string[] = [];
  let installed = false;
  const fn = ((bin, args) => {
    calls.push([bin, ...args].join(' '));
    if (bin === 'npm') { installed = npmOk; return { ok: npmOk, output: npmOk ? '' : 'EACCES: permission denied' }; }
    const answer = installed ? after : before;
    return answer === undefined ? { ok: false, output: 'ENOENT' } : { ok: true, output: answer };
  }) as Runner & { calls: string[] };
  fn.calls = calls;
  return fn;
}
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'nonoise-cbm-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const LATEST = 'npm install -g codebase-memory-mcp@latest';
describe('ensureBinary (not pinned)', () => {
  it('reads the version the binary prints', () => {
    expect(parseVersion('codebase-memory-mcp 0.12.1')).toBe('0.12.1');
    expect(parseVersion('v1.4.0\n')).toBe('1.4.0');
    expect(parseVersion('command not found')).toBeUndefined();
  });
  it('a scaffold leaves any installed binary alone, whatever its version', () => {
    for (const version of ['0.12.1', '3.0.0']) {
      const r = runner(`codebase-memory-mcp ${version}`, undefined);
      expect(ensureBinary(dir, r)).toEqual({ binary: 'already-present', version, hints: [] });
      expect(r.calls).toEqual([`${CBM_SERVER} --version`]);
    }
  });
  it('a scaffold installs the latest release when no binary answers', () => {
    const r = runner(undefined, 'codebase-memory-mcp 0.13.0');
    expect(ensureBinary(dir, r)).toMatchObject({ binary: 'installed', version: '0.13.0' });
    expect(r.calls).toContain(LATEST);
    expect(r.calls.some(c => /@\d/.test(c))).toBe(false);
  });
  it('update mode moves to the latest release and says whether anything changed', () => {
    expect(ensureBinary(dir, runner('0.12.1', '0.13.0'), 'update')).toMatchObject({ binary: 'updated', version: '0.13.0' });
    const same = runner('0.13.0', '0.13.0');
    expect(ensureBinary(dir, same, 'update')).toMatchObject({ binary: 'already-present', version: '0.13.0' });
    expect(same.calls).toContain(LATEST);
  });
  it('a failed update keeps the working binary and reports why', () => {
    const offline = ensureBinary(dir, runner('0.12.1', undefined, false), 'update');
    expect(offline).toMatchObject({ binary: 'already-present', version: '0.12.1' });
    expect(offline.hints.join('\n')).toContain('EACCES');
  });
  it('suggests updating a binary older than the release the skill was written against', () => {
    const old = ensureBinary(dir, runner('codebase-memory-mcp 0.9.0', undefined));
    expect(old.binary).toBe('already-present');
    expect(old.hints.join('\n')).toContain(`older than ${CBM_MIN_VERSION}`);
  });
  it('reports a failed install with the command to retry and never throws', () => {
    const failed = ensureBinary(dir, runner(undefined, undefined, false));
    expect(failed.binary).toBe('install-failed');
    expect(failed.hints.join('\n')).toContain(LATEST);
    expect(failed.hints.join('\n')).toContain('EACCES');
    // npm succeeded but the binary still does not answer (bin dir not on PATH).
    expect(ensureBinary(dir, runner(undefined, undefined, true)).binary).toBe('install-failed');
  });
});

describe('configureCodebaseMemory', () => {
  it('registers the server for every selected tool in its own project-local file', () => {
    const r = configureCodebaseMemory(dir, all);
    expect(r.configured.sort()).toEqual(['.codex/config.toml', '.cursor/mcp.json', '.gemini/settings.json', '.mcp.json', '.vscode/mcp.json']);
    expect(json('.mcp.json').mcpServers[CBM_SERVER]).toEqual({ command: CBM_SERVER, args: [] });
    expect(json('.vscode/mcp.json').servers[CBM_SERVER]).toEqual({ type: 'stdio', command: CBM_SERVER, args: [] });
    expect(json('.cursor/mcp.json').mcpServers[CBM_SERVER].command).toBe(CBM_SERVER);
    expect(json('.gemini/settings.json').mcpServers[CBM_SERVER].command).toBe(CBM_SERVER);
    expect(get('.codex/config.toml')).toContain(`[mcp_servers.${CBM_SERVER}]\ncommand = "${CBM_SERVER}"\nargs = []\n`);
    expect(codebaseMemoryMissing(dir, all)).toEqual([]);
  });
  it('writes only what the selected tools read', () => {
    expect(configureCodebaseMemory(dir, { ...none, codex: true }).configured).toEqual(['.codex/config.toml']);
    expect(existsSync(join(dir, '.mcp.json'))).toBe(false);
    expect(configureCodebaseMemory(dir, { ...none, claudeCode: true }).configured).toEqual(['.mcp.json']);
    expect(existsSync(join(dir, '.vscode/mcp.json'))).toBe(false);
  });
  it('merges with other servers and other settings, and is idempotent', () => {
    put('.mcp.json', JSON.stringify({ mcpServers: { haft: { command: 'haft', args: ['serve'] } }, other: 1 }));
    put('.gemini/settings.json', JSON.stringify({ theme: 'dark' }));
    put('.codex/config.toml', 'model = "gpt-5"\n\n[mcp_servers.haft]\ncommand = "haft"\nargs = ["serve"]');
    configureCodebaseMemory(dir, all);
    expect(json('.mcp.json')).toMatchObject({ other: 1, mcpServers: { haft: { command: 'haft' }, [CBM_SERVER]: { command: CBM_SERVER } } });
    expect(json('.gemini/settings.json').theme).toBe('dark');
    expect(get('.codex/config.toml')).toMatch(/^model = "gpt-5"\n\n\[mcp_servers\.haft\]\ncommand = "haft"\nargs = \["serve"\]\n\n\[mcp_servers\.codebase-memory-mcp\]\n/);
    const bytes = ['.mcp.json', '.vscode/mcp.json', '.cursor/mcp.json', '.gemini/settings.json', '.codex/config.toml'].map(get);
    const again = configureCodebaseMemory(dir, all);
    expect(again.configured).toEqual([]);
    expect(again.unchanged).toHaveLength(5);
    expect(['.mcp.json', '.vscode/mcp.json', '.cursor/mcp.json', '.gemini/settings.json', '.codex/config.toml'].map(get)).toEqual(bytes);
  });
  it('keeps a user entry that points elsewhere, an absolute path, and an unreadable file', () => {
    put('.mcp.json', JSON.stringify({ mcpServers: { [CBM_SERVER]: { command: 'docker', args: ['run', 'cbm'] } } }));
    put('.cursor/mcp.json', JSON.stringify({ mcpServers: { [CBM_SERVER]: { command: '/opt/bin/codebase-memory-mcp', args: [] } } }));
    put('.gemini/settings.json', '{ not json');
    put('.codex/config.toml', `[mcp_servers.${CBM_SERVER}]\ncommand = "codebase-memory-mcp"\nenabled = false\n`);
    const before = ['.mcp.json', '.gemini/settings.json', '.codex/config.toml'].map(get);
    const r = configureCodebaseMemory(dir, { ...all, copilot: false });
    expect(r.preserved.sort()).toEqual(['.codex/config.toml', '.gemini/settings.json', '.mcp.json']);
    expect(r.unchanged).toEqual(['.cursor/mcp.json']);
    expect(['.mcp.json', '.gemini/settings.json', '.codex/config.toml'].map(get)).toEqual(before);
    expect(codebaseMemoryMissing(dir, { ...all, copilot: false })).toHaveLength(3);
  });
});

describe('retireGraphify', () => {
  const known = LEGACY_VENDOR_HASHES['.claude/skills/graphify/SKILL.md']!;
  it('ships at least one known graphify hash to recognise old installs', () => expect(known.length).toBeGreaterThan(0));
  it('removes a skill recorded in the native receipt, the receipt and graphify-only hooks', () => {
    put('.claude/skills/graphify/SKILL.md', 'upstream skill');
    put('.claude/skills/graphify/references/x.md', 'ref');
    put('.nonoise/native-graphify.json', JSON.stringify({ version: '0.9.91', platforms: { claudeCode: createHash('sha256').update('upstream skill').digest('hex') } }));
    put('.claude/settings.json', JSON.stringify({ permissions: { allow: ['Bash(ls)'] }, hooks: {
      PreToolUse: [{ matcher: 'Glob|Grep', hooks: [{ type: 'command', command: '[ -f graphify-out/graph.json ] && echo hi || true' }] }],
      SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'bash run-hook.cmd session-start' }, { type: 'command', command: 'graphify update .' }] }],
    } }));
    put('graphify-out/graph.json', '{}');
    const r = retireGraphify(dir);
    expect(r.retired).toEqual(['.claude/skills/graphify', '.nonoise/native-graphify.json', '.claude/settings.json (graphify hooks)']);
    expect(existsSync(join(dir, '.claude/skills/graphify'))).toBe(false);
    expect(json('.claude/settings.json')).toEqual({ permissions: { allow: ['Bash(ls)'] }, hooks: { SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'bash run-hook.cmd session-start' }] }] } });
    // The old graph is user data: kept, with a hint.
    expect(existsSync(join(dir, 'graphify-out/graph.json'))).toBe(true);
    expect(r.hints.join('\n')).toContain('graphify-out/');
  });
  it('keeps a skill the user modified and says so', () => {
    put('.agents/skills/graphify/SKILL.md', 'my own notes');
    const r = retireGraphify(dir);
    expect(r.retired).toEqual([]);
    expect(r.legacyKept).toEqual(['.agents/skills/graphify/SKILL.md']);
    expect(get('.agents/skills/graphify/SKILL.md')).toBe('my own notes');
  });
  it('does nothing in a project that never had graphify, and leaves other hooks untouched', () => {
    const settings = JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'npm test' }] }] } });
    put('.claude/settings.json', settings);
    expect(retireGraphify(dir)).toEqual({ retired: [], legacyKept: [], hints: [] });
    expect(get('.claude/settings.json')).toBe(settings);
  });
});

describe('installCodebaseMemory and doctor', () => {
  it('configures the project even when the binary cannot be installed', () => {
    const report = installCodebaseMemory({ projectPath: dir, aiTools: { ...none, claudeCode: true }, runner: runner(undefined, undefined, false) });
    expect(report.binary).toBe('install-failed');
    expect(report.configured).toEqual(['.mcp.json']);
    expect(formatReport(report)).toContain('install-failed');
    expect(formatReport(report)).toContain('create-nonoise --code-graph-only');
  });
  it('a modified graphify skill is reported but is not a config conflict', () => {
    put('.claude/skills/graphify/SKILL.md', 'my own notes');
    const report = installCodebaseMemory({ projectPath: dir, aiTools: { ...none, claudeCode: true }, runner: runner('0.12.1', '0.12.1') });
    expect(report.preserved).toEqual([]);
    expect(report.legacyKept).toEqual(['.claude/skills/graphify/SKILL.md']);
  });
  it('tells the user to build the graph once after a successful install', () => {
    const report = installCodebaseMemory({ projectPath: dir, aiTools: all, runner: runner('0.12.1', '0.12.1') });
    expect(report.binary).toBe('already-present');
    expect(formatReport(report)).toContain('index_repository');
  });
  it('doctor reports version, missing configs and graphify leftovers without installing', () => {
    put('.claude/skills/graphify/SKILL.md', 'x');
    const r = runner(undefined, undefined);
    const lines = doctorCodebaseMemory(dir, { ...none, claudeCode: true, codex: true }, r).join('\n');
    expect(lines).toContain('missing from PATH');
    expect(lines).toContain('.mcp.json: codebase-memory-mcp server missing/invalid');
    expect(lines).toContain('.codex/config.toml: codebase-memory-mcp server missing/invalid');
    expect(lines).toContain('graphify leftovers: .claude/skills/graphify');
    expect(r.calls.some(c => c.startsWith('npm'))).toBe(false);
    configureCodebaseMemory(dir, { ...none, claudeCode: true, codex: true });
    const healthy = doctorCodebaseMemory(dir, { ...none, claudeCode: true, codex: true }, runner('0.12.1', '0.12.1')).join('\n');
    expect(healthy).toContain('MCP configs: present');
    expect(healthy).toContain('0.12.1: installed (not pinned');
    expect(doctorCodebaseMemory(dir, none, runner('0.9.0', '0.9.0')).join('\n')).toContain(`older than ${CBM_MIN_VERSION}`);
  });
});
