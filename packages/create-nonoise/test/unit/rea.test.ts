import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, symlinkSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { REA_VERSION, configureRea, installRea, doctorRea } from '../../src/rea.js';
const root = resolve('../skills');
const ai = { claudeCode: true, copilot: true, codex: true, cursor: false, geminiCli: false };
const dirs: string[] = [];
const temp = () => { const p = mkdtempSync(join(tmpdir(), 'rea-test-')); dirs.push(p); return p; };
afterEach(() => dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
describe('project-only REA', () => {
  it('pins compact launchers for all selected hosts and preserves unrelated entries', () => {
    const p = temp();
    writeFileSync(join(p, '.mcp.json'), JSON.stringify({ unrelated: true, mcpServers: { other: { command: 'other' } } }));
    mkdirSync(join(p, '.codex'));
    const before = '# User settings\nmodel = "some-model"\n[mcp_servers.other]\ncommand = "other"\n';
    writeFileSync(join(p, '.codex/config.toml'), before);
    configureRea(p, ai);
    const json = JSON.parse(readFileSync(join(p, '.mcp.json'), 'utf8'));
    expect(REA_VERSION).toBe('6.5.0');
    expect(json.mcpServers.rea).toEqual({ command: 'npx', args: ['-y', 'rea-agents@6.5.0', 'mcp'], env: { REA_MCP_INPUT_SCHEMA_PROFILE: 'compact' } });
    expect(json.unrelated).toBe(true); expect(json.mcpServers.other.command).toBe('other');
    const toml = readFileSync(join(p, '.codex/config.toml'), 'utf8');
    expect(toml.startsWith(before)).toBe(true);
    expect(toml).toContain('[mcp_servers.rea]'); expect(toml).toContain('startup_timeout_sec = 120');
    expect(toml).toContain('REA_MCP_INPUT_SCHEMA_PROFILE = "compact"');
    const time = statSync(join(p, '.mcp.json')).mtimeMs;
    expect(configureRea(p, ai).written).toEqual([]);
    expect(statSync(join(p, '.mcp.json')).mtimeMs).toBe(time);
    expect(readFileSync(join(p, '.codex/config.toml'), 'utf8')).toBe(toml);
  });
  it('does not touch unsupported/unselected clients', () => {
    const p = temp(); configureRea(p, { ...ai, claudeCode: false, copilot: false, codex: false });
    expect(existsSync(join(p, '.mcp.json'))).toBe(false);
    expect(existsSync(join(p, '.codex'))).toBe(false);
  });
  it('preserves conflicting user servers and malformed configuration', () => {
    for (const existing of ['{broken', '{"mcpServers":[]}', '{"mcpServers":{"rea":{"command":"custom"}}}']) {
      const p = temp(); writeFileSync(join(p, '.mcp.json'), existing);
      expect(configureRea(p, ai).preserved).toContain('.mcp.json');
      expect(readFileSync(join(p, '.mcp.json'), 'utf8')).toBe(existing);
    }
    for (const existing of ['[mcp_servers."rea"]\ncommand = "mine"\n', '[mcp_servers]\nrea = { command = "mine" }\n', 'mcp_servers.rea.command = "mine"\n']) {
      const p = temp(); mkdirSync(join(p, '.codex')); writeFileSync(join(p, '.codex/config.toml'), existing);
      expect(configureRea(p, ai).preserved).toContain('.codex/config.toml');
      expect(readFileSync(join(p, '.codex/config.toml'), 'utf8')).toBe(existing);
    }
  });
  it('rejects symlink files, dangling symlinks, parents, and root aliases', () => {
    const p = temp(), outside = temp(); writeFileSync(join(outside, 'config'), '{}');
    symlinkSync(join(outside, 'config'), join(p, '.mcp.json')); symlinkSync(outside, join(p, '.codex'));
    expect(configureRea(p, ai).preserved).toEqual(['.mcp.json', '.codex/config.toml']);
    expect(readFileSync(join(outside, 'config'), 'utf8')).toBe('{}');
    expect(existsSync(join(outside, 'config.toml'))).toBe(false);
    const alias = join(temp(), 'alias'); symlinkSync(outside, alias);
    expect(configureRea(alias, ai).written).toEqual([]);
    expect(doctorRea(p, ai, true).join('\n')).toContain('unsafe');
  });
  it('installs the full vendor skill via managed hashes and keeps edits', () => {
    const p = temp(); installRea(root, p, ai);
    for (const d of ['.claude/skills', '.agents/skills']) {
      const file = join(p, d, 'reverse-engineer-anything/references/android-applications.md');
      expect(readFileSync(file, 'utf8')).toContain('Android');
    }
    expect(readFileSync(join(p, '.nonoise/rea/UPSTREAM.md'), 'utf8')).toContain('f9ccacca');
    const edited = '.agents/skills/reverse-engineer-anything/SKILL.md';
    writeFileSync(join(p, edited), 'My REA workflow');
    expect(installRea(root, p, ai).preserved).toContain(edited);
    expect(readFileSync(join(p, edited), 'utf8')).toBe('My REA workflow');
  });
  it('reports missing/disabled/stale registration, runtime floor and tool context', () => {
    const p = temp(); expect(doctorRea(p, ai, true).join('\n')).toContain('missing');
    configureRea(p, ai);
    const result = doctorRea(p, ai, true).join('\n');
    expect(result).toContain('configured'); expect(result).toContain('6.5.0'); expect(result).toContain('>=22.19'); expect(result).toContain('172'); expect(result).toContain('compact');
    writeFileSync(join(p, '.mcp.json'), '{"mcpServers":{"rea":{"command":"npx","args":["-y","rea-agents@6.4.0","mcp"],"disabled":true}}}');
    expect(doctorRea(p, ai, true).join('\n')).toMatch(/stale|conflict/);
  });
});
it('doctor reports actual stale versions, missing vendor skill and precise supported Node lines', () => {
  const p = temp(); configureRea(p, ai);
  writeFileSync(join(p, '.mcp.json'), '{"mcpServers":{"rea":{"command":"npx","args":["-y","rea-agents@6.4.0","mcp"]}}}');
  const findings = doctorRea(p, ai, true).join('\n');
  expect(findings).toContain('found 6.4.0');
  expect(findings).toContain('missing: .agents/skills/reverse-engineer-anything/SKILL.md');
  expect(findings).toContain('^22.19.0 || ^24.11.0 || >=26.0.0');
  installRea(root, p, ai);
  expect(doctorRea(p, ai, true).join('\n')).not.toContain('missing: .agents/skills/reverse-engineer-anything/SKILL.md');
});
it('preserves malformed TOML and accepts equivalent quoted user registration without rewriting', () => {
  const p = temp(); mkdirSync(join(p, '.codex'));
  const malformed = 'model = "unterminated\n';
  writeFileSync(join(p, '.codex/config.toml'), malformed);
  expect(configureRea(p, ai).preserved).toContain('.codex/config.toml');
  expect(readFileSync(join(p, '.codex/config.toml'), 'utf8')).toBe(malformed);
  const equivalent = `[mcp_servers.'rea']\ncommand = 'npx'\nargs = ['-y', 'rea-agents@6.5.0', 'mcp']\nstartup_timeout_sec = 180\nenv = { REA_MCP_INPUT_SCHEMA_PROFILE = 'compact', CUSTOM = 'keep' }\n`;
  writeFileSync(join(p, '.codex/config.toml'), equivalent);
  expect(configureRea(p, ai).preserved).toEqual([]);
  expect(readFileSync(join(p, '.codex/config.toml'), 'utf8')).toBe(equivalent);
  expect(doctorRea(p, ai, true).join('\n')).toContain('configured: .codex/config.toml');
});
it('does not mistake commented REA examples or strings for a registered server', () => {
  const p = temp(); mkdirSync(join(p, '.codex'));
  const content = '# [mcp_servers.rea]\nmodel = "mcp_servers.rea"\n';
  writeFileSync(join(p, '.codex/config.toml'), content);
  expect(configureRea(p, ai).written).toContain('.codex/config.toml');
  expect(doctorRea(p, ai, true).join('\n')).toContain('configured: .codex/config.toml');
});
it('doctor flags active REA with no supported selected host', () => {
  const p = temp();
  const unsupported = { claudeCode: false, copilot: false, codex: false, cursor: true, geminiCli: true };
  expect(doctorRea(p, unsupported, true).join('\n')).toContain('REA unsupported selected hosts');
  expect(doctorRea(p, unsupported, false)).toEqual(['REA: not configured (optional)']);
});
