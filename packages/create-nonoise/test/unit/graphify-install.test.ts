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

  it('happy path: Python + uv present, Copilot selected, runs full install + both hooks', () => {
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
    expect(report.graphifyy).toMatch(/installed|already-present|upgraded/);
    expect(report.claudeHook).toBe('ok');
    expect(report.copilotHook).toBe('ok');
    expect(calls.some((c) => /uv tool install "graphifyy>=0\.4\.23"/.test(c))).toBe(true);
    expect(calls.some((c) => /^graphify install$/.test(c))).toBe(true);
    expect(calls.some((c) => /^graphify copilot install$/.test(c))).toBe(true);
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
  });

  it('marks graphifyy as install-failed if uv tool install throws', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/uv tool install/.test(s)) throw new Error('boom');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.graphifyy).toBe('install-failed');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
  });
});
