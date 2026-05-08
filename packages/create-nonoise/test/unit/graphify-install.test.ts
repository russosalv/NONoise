import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock child_process BEFORE importing the module under test.
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { installGraphify } from '../../src/graphify-install.js';

const mockedExec = vi.mocked(execSync);

const PROJECT = '/tmp/fake-project';

const UV_TOOL_LIST_077 = 'graphifyy v0.7.7\n- graphify\n';
const UV_TOOL_LIST_080 = 'graphifyy v0.8.0\n- graphify\n';
const UV_TOOL_LIST_EMPTY = '';

// Helper — build a scripted exec mock that returns/throws based on the command substring.
function scriptedExec(script: Array<{ match: RegExp; result: string | Error }>) {
  return (cmd: string, _opts?: unknown): Buffer | string => {
    for (const entry of script) {
      if (entry.match.test(cmd)) {
        if (entry.result instanceof Error) throw entry.result;
        return entry.result;
      }
    }
    throw new Error(`Unexpected command in test: ${cmd}`);
  };
}

describe('installGraphify', () => {
  beforeEach(() => {
    mockedExec.mockReset();
  });

  it('happy path (binary already present): reports already-present, both hooks run when both flags set', () => {
    const calls: Array<{ cmd: string; cwd?: string }> = [];
    mockedExec.mockImplementation((cmd, opts: { cwd?: string } | undefined) => {
      const s = String(cmd);
      calls.push({ cmd: s, cwd: opts?.cwd });
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/uv tool install/.test(s)) return Buffer.from('');
      if (/^uv tool list$/.test(s)) return Buffer.from(UV_TOOL_LIST_077);
      if (/^graphify claude install$/.test(s)) return Buffer.from('');
      if (/^graphify copilot install$/.test(s)) return Buffer.from('');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: true,
    });

    expect(report.python.found).toBe(true);
    expect(report.uv.found).toBe(true);
    expect(report.graphifyy).toBe('already-present');
    expect(report.graphifyyVersion).toBe('0.7.7');
    expect(report.claudeHook).toBe('ok');
    expect(report.copilotHook).toBe('ok');
    expect(report.hints).toEqual([]);
    expect(calls.some((c) => /uv tool install "graphifyy>=0\.7\.0"/.test(c.cmd))).toBe(true);
    // Hooks must be invoked with cwd = projectPath so they target the new project.
    const claudeCall = calls.find((c) => c.cmd === 'graphify claude install');
    const copilotCall = calls.find((c) => c.cmd === 'graphify copilot install');
    expect(claudeCall?.cwd).toBe(PROJECT);
    expect(copilotCall?.cwd).toBe(PROJECT);
  });

  it('fresh install (binary not present before): reports installed', () => {
    let listCalls = 0;
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool list$/.test(s)) {
        listCalls += 1;
        // First call (pre-probe) → empty (not installed). Second call (post-probe) → installed.
        return Buffer.from(listCalls === 1 ? UV_TOOL_LIST_EMPTY : UV_TOOL_LIST_077);
      }
      if (/uv tool install/.test(s)) return Buffer.from('');
      if (/^graphify claude install$/.test(s)) return Buffer.from('');
      if (/^graphify copilot install$/.test(s)) return Buffer.from('');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: true,
    });

    expect(report.graphifyy).toBe('installed');
    expect(report.graphifyyVersion).toBe('0.7.7');
    expect(report.hints).toEqual([]);
  });

  it('upgrade path: pre-existing version differs from post-install version', () => {
    let listCalls = 0;
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool list$/.test(s)) {
        listCalls += 1;
        return Buffer.from(listCalls === 1 ? UV_TOOL_LIST_077 : UV_TOOL_LIST_080);
      }
      if (/uv tool install/.test(s)) return Buffer.from('');
      if (/^graphify claude install$/.test(s)) return Buffer.from('');
      if (/^graphify copilot install$/.test(s)) return Buffer.from('');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: true,
    });

    expect(report.graphifyy).toBe('upgraded');
    expect(report.graphifyyVersion).toBe('0.8.0');
  });

  it('skips Claude hook when claudeCode=false', () => {
    mockedExec.mockImplementation(scriptedExec([
      { match: /python3? --version/, result: 'Python 3.12.0' },
      { match: /uv --version/, result: 'uv 0.4.20' },
      { match: /uv tool install/, result: '' },
      { match: /^uv tool list$/, result: UV_TOOL_LIST_077 },
      { match: /^graphify copilot install$/, result: '' },
    ]));

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: false,
      copilot: true,
    });

    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('ok');
    expect(report.graphifyy).toBe('already-present');
    expect(report.hints).toEqual([]);
  });

  it('skips Copilot hook when copilot=false', () => {
    mockedExec.mockImplementation(scriptedExec([
      { match: /python3? --version/, result: 'Python 3.12.0' },
      { match: /uv --version/, result: 'uv 0.4.20' },
      { match: /uv tool install/, result: '' },
      { match: /^uv tool list$/, result: UV_TOOL_LIST_077 },
      { match: /^graphify claude install$/, result: '' },
    ]));

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: false,
    });

    expect(report.copilotHook).toBe('skipped');
    expect(report.claudeHook).toBe('ok');
    expect(report.graphifyy).toBe('already-present');
    expect(report.hints).toEqual([]);
  });

  it('skips everything when Python is missing and emits actionable hint', () => {
    mockedExec.mockImplementation((cmd) => {
      if (/python3? --version/.test(String(cmd))) throw new Error('not found');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: true,
    });

    expect(report.python.found).toBe(false);
    expect(report.uv.found).toBe(false);
    expect(report.graphifyy).toBe('skipped');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
    expect(report.hints.some((h) => /Python >= 3\.10 not found/.test(h))).toBe(true);
    // Hint should mention the project path so the user knows where to cd.
    expect(report.hints.some((h) => h.includes(PROJECT))).toBe(true);
  });

  it('skips install when uv is missing but Python is present, and hint includes uv bootstrap', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/uv --version/.test(s)) throw new Error('not found');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: true,
    });

    expect(report.python.found).toBe(true);
    expect(report.uv.found).toBe(false);
    expect(report.graphifyy).toBe('skipped');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
    expect(report.hints.some((h) => /`uv` not found/.test(h))).toBe(true);
    expect(report.hints.some((h) => /astral\.sh\/uv\/install/.test(h))).toBe(true);
  });

  it('marks graphifyy as install-failed if uv tool install throws, with pipx/pip recovery hint', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool list$/.test(s)) return Buffer.from(UV_TOOL_LIST_EMPTY);
      if (/uv tool install/.test(s)) throw new Error('boom');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: true,
    });

    expect(report.graphifyy).toBe('install-failed');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
    expect(report.hints.some((h) => /uv tool install.*failed/.test(h))).toBe(true);
    expect(report.hints.some((h) => /pipx install/.test(h))).toBe(true);
    expect(report.hints.some((h) => /pip install --user/.test(h))).toBe(true);
  });

  it('reports claudeHook=failed when graphify claude install throws, still attempts copilot hook, and emits recovery hint', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool list$/.test(s)) return Buffer.from(UV_TOOL_LIST_077);
      if (/uv tool install/.test(s)) return Buffer.from('');
      if (/^graphify claude install$/.test(s)) throw new Error('hook write failed');
      if (/^graphify copilot install$/.test(s)) return Buffer.from('');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: true,
    });

    expect(report.claudeHook).toBe('failed');
    expect(report.copilotHook).toBe('ok');
    expect(report.hints.some((h) => /graphify claude install` failed/.test(h))).toBe(true);
    expect(report.hints.some((h) => h.includes(PROJECT))).toBe(true);
  });

  it('reports copilotHook=failed when graphify copilot install throws, still keeps claude as ok', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool list$/.test(s)) return Buffer.from(UV_TOOL_LIST_077);
      if (/uv tool install/.test(s)) return Buffer.from('');
      if (/^graphify claude install$/.test(s)) return Buffer.from('');
      if (/^graphify copilot install$/.test(s)) throw new Error('copilot hook failed');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({
      projectPath: PROJECT,
      claudeCode: true,
      copilot: true,
    });

    expect(report.claudeHook).toBe('ok');
    expect(report.copilotHook).toBe('failed');
    expect(report.hints.some((h) => /graphify copilot install` failed/.test(h))).toBe(true);
  });
});
