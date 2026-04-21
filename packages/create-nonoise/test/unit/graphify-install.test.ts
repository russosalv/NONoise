import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock child_process BEFORE importing the module under test.
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { installGraphify } from '../../src/graphify-install.js';

const mockedExec = vi.mocked(execSync);

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

  it('happy path (binary already present): reports already-present, both hooks run', () => {
    const calls: string[] = [];
    mockedExec.mockImplementation((cmd) => {
      calls.push(String(cmd));
      if (/python3? --version/.test(String(cmd))) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(String(cmd))) return Buffer.from('uv 0.4.20');
      if (/uv tool install/.test(String(cmd))) return Buffer.from('');
      if (/^graphify install$/.test(String(cmd))) return Buffer.from('');
      if (/^graphify copilot install$/.test(String(cmd))) return Buffer.from('');
      if (/graphify --version/.test(String(cmd))) return Buffer.from('graphify 0.4.23');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.python.found).toBe(true);
    expect(report.uv.found).toBe(true);
    expect(report.graphifyy).toBe('already-present');
    expect(report.claudeHook).toBe('ok');
    expect(report.copilotHook).toBe('ok');
    expect(report.hints).toEqual([]);
    expect(calls.some((c) => /uv tool install "graphifyy>=0\.4\.23"/.test(c))).toBe(true);
    expect(calls.some((c) => /^graphify install$/.test(c))).toBe(true);
    expect(calls.some((c) => /^graphify copilot install$/.test(c))).toBe(true);
  });

  it('fresh install (binary not present before): reports installed', () => {
    let graphifyVersionCalls = 0;
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/graphify --version/.test(s)) {
        graphifyVersionCalls += 1;
        // First call (pre-probe) → not found. Second call (post-probe) → found.
        if (graphifyVersionCalls === 1) throw new Error('command not found');
        return Buffer.from('graphify 0.4.23');
      }
      if (/uv tool install/.test(s)) return Buffer.from('');
      if (/^graphify install$/.test(s)) return Buffer.from('');
      if (/^graphify copilot install$/.test(s)) return Buffer.from('');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.graphifyy).toBe('installed');
    expect(report.hints).toEqual([]);
  });

  it('skips Copilot hook when copilot=false', () => {
    mockedExec.mockImplementation(scriptedExec([
      { match: /python3? --version/, result: 'Python 3.12.0' },
      { match: /uv --version/, result: 'uv 0.4.20' },
      { match: /uv tool install/, result: '' },
      { match: /^graphify install$/, result: '' },
      { match: /graphify --version/, result: 'graphify 0.4.23' },
    ]));

    const report = installGraphify({ copilot: false });

    expect(report.copilotHook).toBe('skipped');
    expect(report.graphifyy).toBe('already-present');
    expect(report.hints).toEqual([]);
  });

  it('skips everything when Python is missing', () => {
    mockedExec.mockImplementation((cmd) => {
      if (/python3? --version/.test(String(cmd))) throw new Error('not found');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.python.found).toBe(false);
    expect(report.uv.found).toBe(false);
    expect(report.graphifyy).toBe('skipped');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
    expect(report.hints.some((h) => /Python >= 3\.10 not found/.test(h))).toBe(true);
  });

  it('skips install when uv is missing but Python is present', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/uv --version/.test(s)) throw new Error('not found');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.python.found).toBe(true);
    expect(report.uv.found).toBe(false);
    expect(report.graphifyy).toBe('skipped');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
    expect(report.hints.some((h) => /`uv` not found/.test(h))).toBe(true);
  });

  it('marks graphifyy as install-failed if uv tool install throws', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/graphify --version/.test(s)) throw new Error('not found');
      if (/uv tool install/.test(s)) throw new Error('boom');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.graphifyy).toBe('install-failed');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
    expect(report.hints.some((h) => /uv tool install.*failed/.test(h))).toBe(true);
  });

  it('reports claudeHook=failed when graphify install throws, still attempts copilot hook', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/graphify --version/.test(s)) return Buffer.from('graphify 0.4.23');
      if (/uv tool install/.test(s)) return Buffer.from('');
      if (/^graphify install$/.test(s)) throw new Error('hook write failed');
      if (/^graphify copilot install$/.test(s)) return Buffer.from('');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.claudeHook).toBe('failed');
    expect(report.copilotHook).toBe('ok');
    expect(report.hints).toEqual([]);
  });
});
