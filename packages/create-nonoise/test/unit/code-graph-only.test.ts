import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCodeGraphOnly } from '../../src/code-graph-only.js';
import { CBM_SERVER, CBM_VERSION, type Runner } from '../../src/codebase-memory.js';

let dir: string;
const ok: Runner = (bin) => ({ ok: true, output: bin === 'npm' ? '' : CBM_VERSION });
const config = (aiTools: Record<string, boolean>) => writeFileSync(join(dir, 'nonoise.config.json'), JSON.stringify({ aiTools }));
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'nonoise-cg-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('runCodeGraphOnly', () => {
  it('reads the AI tools from nonoise.config.json and force-installs the pin', () => {
    config({ claudeCode: true, codex: true });
    const calls: string[] = [];
    const result = runCodeGraphOnly({ targetPath: dir, runner: (bin, args) => { calls.push([bin, ...args].join(' ')); return ok(bin, args, dir); } });
    expect(result).toMatchObject({ source: 'config', exitCode: 0 });
    expect(calls).toContain(`npm install -g codebase-memory-mcp@${CBM_VERSION}`);
    expect(JSON.parse(readFileSync(join(dir, '.mcp.json'), 'utf8')).mcpServers[CBM_SERVER]).toBeDefined();
    expect(readFileSync(join(dir, '.codex/config.toml'), 'utf8')).toContain(`[mcp_servers.${CBM_SERVER}]`);
    expect(existsSync(join(dir, '.cursor/mcp.json'))).toBe(false);
  });
  it('merges --ai with the config and accepts --ai alone', () => {
    config({ claudeCode: true });
    expect(runCodeGraphOnly({ targetPath: dir, aiCsv: 'cursor', runner: ok })).toMatchObject({ source: 'merged', aiTools: { claudeCode: true, cursor: true } });
    rmSync(join(dir, 'nonoise.config.json'));
    expect(runCodeGraphOnly({ targetPath: dir, aiCsv: 'gemini-cli', runner: ok })).toMatchObject({ source: 'flag', aiTools: { geminiCli: true, claudeCode: false } });
  });
  it('exits 0 when only the binary is missing, 1 when a config file had to be left alone', () => {
    config({ claudeCode: true });
    expect(runCodeGraphOnly({ targetPath: dir, runner: () => ({ ok: false, output: 'ENOENT' }) }).exitCode).toBe(0);
    writeFileSync(join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { [CBM_SERVER]: { command: 'something-else' } } }));
    expect(runCodeGraphOnly({ targetPath: dir, runner: ok }).exitCode).toBe(1);
  });
  it('fails clearly without a config, with unknown tools, or with no tool enabled', () => {
    expect(() => runCodeGraphOnly({ targetPath: dir, runner: ok })).toThrow(/--code-graph-only/);
    expect(() => runCodeGraphOnly({ targetPath: dir, aiCsv: 'emacs', runner: ok })).toThrow(/Unknown AI tool/);
    config({ claudeCode: false });
    expect(() => runCodeGraphOnly({ targetPath: dir, runner: ok })).toThrow(/No AI tools enabled/);
  });
});
