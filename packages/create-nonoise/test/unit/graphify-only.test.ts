import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock child_process so installGraphify (called transitively) doesn't actually
// touch the host system.
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { runGraphifyOnly } from '../../src/graphify-only.js';

const mockedExec = vi.mocked(execSync);

const UV_TOOL_LIST_077 = 'graphifyy v0.7.7\n- graphify\n';

function happyPathExec(): void {
  mockedExec.mockImplementation((cmd) => {
    const s = String(cmd);
    if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
    if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
    if (/^uv tool list$/.test(s)) return Buffer.from(UV_TOOL_LIST_077);
    if (/uv tool install/.test(s)) return Buffer.from('');
    if (/^graphify claude install$/.test(s)) return Buffer.from('');
    if (/^graphify copilot install$/.test(s)) return Buffer.from('');
    throw new Error(`Unexpected: ${cmd}`);
  });
}

function makeProject(opts: { withConfig?: boolean; aiTools?: Record<string, boolean> }): string {
  const dir = mkdtempSync(join(tmpdir(), 'nonoise-graphify-only-'));
  if (opts.withConfig) {
    const cfg = {
      $schema: 'https://nonoise.dev/schemas/project-config.v1.json',
      frameworkVersion: '1.0.0',
      template: 'single-project',
      createdAt: new Date().toISOString(),
      aiTools: opts.aiTools ?? {
        claudeCode: true,
        copilot: true,
        codex: false,
        cursor: false,
        geminiCli: false,
      },
      skills: [],
    };
    writeFileSync(join(dir, 'nonoise.config.json'), JSON.stringify(cfg, null, 2), 'utf8');
  }
  return dir;
}

describe('runGraphifyOnly', () => {
  beforeEach(() => {
    mockedExec.mockReset();
  });

  it('reads aiTools from nonoise.config.json and runs install with project cwd', () => {
    const dir = makeProject({ withConfig: true });
    happyPathExec();

    const calls: Array<{ cmd: string; cwd?: string }> = [];
    mockedExec.mockImplementation((cmd, opts: { cwd?: string } | undefined) => {
      const s = String(cmd);
      calls.push({ cmd: s, cwd: opts?.cwd });
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool list$/.test(s)) return Buffer.from(UV_TOOL_LIST_077);
      if (/uv tool install/.test(s)) return Buffer.from('');
      if (/^graphify claude install$/.test(s)) return Buffer.from('');
      if (/^graphify copilot install$/.test(s)) return Buffer.from('');
      throw new Error(`Unexpected: ${cmd}`);
    });

    try {
      const result = runGraphifyOnly({ targetPath: dir });
      expect(result.source).toBe('config');
      expect(result.aiTools.claudeCode).toBe(true);
      expect(result.aiTools.copilot).toBe(true);
      expect(result.exitCode).toBe(0);
      const claudeCall = calls.find((c) => c.cmd === 'graphify claude install');
      const copilotCall = calls.find((c) => c.cmd === 'graphify copilot install');
      expect(claudeCall?.cwd).toBe(dir);
      expect(copilotCall?.cwd).toBe(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('uses --ai flag when no nonoise.config.json is present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-graphify-only-noconfig-'));
    happyPathExec();
    try {
      const result = runGraphifyOnly({ targetPath: dir, aiCsv: 'claude-code' });
      expect(result.source).toBe('flag');
      expect(result.aiTools.claudeCode).toBe(true);
      expect(result.aiTools.copilot).toBe(false);
      expect(result.exitCode).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('merges flag with config when both are provided (flag adds tools, never removes)', () => {
    const dir = makeProject({
      withConfig: true,
      aiTools: { claudeCode: true, copilot: false, codex: false, cursor: false, geminiCli: false },
    });
    happyPathExec();
    try {
      const result = runGraphifyOnly({ targetPath: dir, aiCsv: 'copilot' });
      expect(result.source).toBe('merged');
      expect(result.aiTools.claudeCode).toBe(true);
      expect(result.aiTools.copilot).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when no config and no --ai flag', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-graphify-only-bare-'));
    try {
      expect(() => runGraphifyOnly({ targetPath: dir })).toThrow(
        /No nonoise\.config\.json found/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when config has all aiTools disabled and no --ai flag', () => {
    const dir = makeProject({
      withConfig: true,
      aiTools: { claudeCode: false, copilot: false, codex: false, cursor: false, geminiCli: false },
    });
    try {
      expect(() => runGraphifyOnly({ targetPath: dir })).toThrow(
        /No AI tools enabled/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws on unknown AI tool flag', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-graphify-only-bad-'));
    try {
      expect(() => runGraphifyOnly({ targetPath: dir, aiCsv: 'claude-code,bogus-tool' }))
        .toThrow(/Unknown AI tool flag/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws with descriptive error when nonoise.config.json is malformed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-graphify-only-bad-json-'));
    writeFileSync(join(dir, 'nonoise.config.json'), '{ not valid json', 'utf8');
    try {
      expect(() => runGraphifyOnly({ targetPath: dir })).toThrow(
        /Could not parse nonoise\.config\.json/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns exitCode=1 when graphify install fails', () => {
    const dir = makeProject({ withConfig: true });
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool list$/.test(s)) return Buffer.from('');
      if (/uv tool install/.test(s)) throw new Error('install boom');
      throw new Error(`Unexpected: ${cmd}`);
    });
    try {
      const result = runGraphifyOnly({ targetPath: dir });
      expect(result.exitCode).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
