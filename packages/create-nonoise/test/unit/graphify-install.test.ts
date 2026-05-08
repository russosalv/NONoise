import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock child_process BEFORE importing the module under test.
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { installGraphify, writeProjectLocalSkills } from '../../src/graphify-install.js';

const mockedExec = vi.mocked(execSync);

const UV_TOOL_LIST_077 = 'graphifyy v0.7.7\n- graphify\n';
const UV_TOOL_LIST_080 = 'graphifyy v0.8.0\n- graphify\n';
const UV_TOOL_LIST_EMPTY = '';

const BUNDLED_SOURCE_VERSION = '0.7.10';

const SKILL_FILES = [
  'skill.md',
  'skill-copilot.md',
  'skill-codex.md',
  'skill-windows.md',
] as const;

let projectPath: string;
let bundledSkillsRoot: string;

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Populate <bundledSkillsRoot>/graphify-platform-skills/ with dummy skill files + MANIFEST. */
function populateBundle(opts: { version?: string; files?: readonly string[] } = {}): string {
  const version = opts.version ?? BUNDLED_SOURCE_VERSION;
  const files = opts.files ?? SKILL_FILES;
  const dir = join(bundledSkillsRoot, 'graphify-platform-skills');
  mkdirSync(dir, { recursive: true });
  for (const f of files) writeFileSync(join(dir, f), `dummy ${f} content\n`);
  writeFileSync(
    join(dir, 'MANIFEST.json'),
    JSON.stringify({
      sourceRepo: 'https://github.com/safishamsi/graphify',
      sourceRef: 'v7',
      sourceCommit: 'deadbeef'.repeat(5),
      graphifyVersion: version,
      skills: files,
      syncedAt: '2026-05-08T00:00:00.000Z',
    }) + '\n',
  );
  return dir;
}

function baseCtx(overrides: Partial<Parameters<typeof installGraphify>[0]> = {}) {
  return {
    projectPath,
    bundledSkillsRoot,
    claudeCode: false,
    copilot: false,
    codex: false,
    cursor: false,
    geminiCli: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockedExec.mockReset();
  projectPath = makeTempDir('nonoise-proj-');
  bundledSkillsRoot = makeTempDir('nonoise-skills-');
});

afterEach(() => {
  rmSync(projectPath, { recursive: true, force: true });
  rmSync(bundledSkillsRoot, { recursive: true, force: true });
});

// Default exec mock that handles all commands the code may issue. Tests can
// override individual handlers by reassigning mockedExec.mockImplementation.
function happyExec(opts: { listVersion?: string; listAfter?: string; failOn?: RegExp[] } = {}) {
  const failOn = opts.failOn ?? [];
  const listFirst = opts.listVersion ?? UV_TOOL_LIST_077;
  const listAfter = opts.listAfter ?? listFirst;
  let listCalls = 0;
  return (cmd: string | unknown): Buffer => {
    const s = String(cmd);
    for (const re of failOn) if (re.test(s)) throw new Error(`scripted-fail: ${s}`);
    if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
    if (/^uv --version/.test(s)) return Buffer.from('uv 0.4.20');
    if (/^uv tool dir graphifyy$/.test(s)) {
      // No installed package by default — locateInstalledGraphifyPackage returns null.
      throw new Error('not installed');
    }
    if (/^uv tool list$/.test(s)) {
      listCalls += 1;
      return Buffer.from(listCalls === 1 ? listFirst : listAfter);
    }
    if (/uv tool install/.test(s)) return Buffer.from('');
    if (/^graphify (claude|copilot|codex) install$/.test(s)) return Buffer.from('');
    if (/^graphify install --platform (cursor|gemini)$/.test(s)) return Buffer.from('');
    throw new Error(`Unexpected command in test: ${s}`);
  };
}

describe('installGraphify (existing scenarios, with project-local skills enabled)', () => {
  it('happy path: both hooks run, project-local writes for claude+copilot', () => {
    populateBundle();
    mockedExec.mockImplementation(happyExec());

    const report = installGraphify(baseCtx({ claudeCode: true, copilot: true }));

    expect(report.python.found).toBe(true);
    expect(report.uv.found).toBe(true);
    expect(report.graphifyy).toBe('already-present');
    expect(report.graphifyyVersion).toBe('0.7.7');
    expect(report.claudeHook).toBe('ok');
    expect(report.copilotHook).toBe('ok');
    expect(report.codexHook).toBe('skipped');
    expect(report.cursorHook).toBe('skipped');
    expect(report.geminiHook).toBe('skipped');

    expect(report.projectLocal.source).toBe('bundled');
    expect(report.projectLocal.sourceVersion).toBe(BUNDLED_SOURCE_VERSION);
    expect(report.projectLocal.errors).toEqual([]);
    expect(report.projectLocal.written).toEqual([
      '.claude/skills/graphify/SKILL.md',
      '.copilot/skills/graphify/SKILL.md',
    ]);
    expect(existsSync(join(projectPath, '.claude/skills/graphify/SKILL.md'))).toBe(true);
    expect(existsSync(join(projectPath, '.copilot/skills/graphify/SKILL.md'))).toBe(true);
    expect(readFileSync(join(projectPath, '.claude/skills/graphify/.graphify_skill_version'), 'utf8').trim())
      .toBe(BUNDLED_SOURCE_VERSION);
  });

  it('fresh install (binary not present before): reports installed', () => {
    populateBundle();
    mockedExec.mockImplementation(
      happyExec({ listVersion: UV_TOOL_LIST_EMPTY, listAfter: UV_TOOL_LIST_077 }),
    );

    const report = installGraphify(baseCtx({ claudeCode: true, copilot: true }));

    expect(report.graphifyy).toBe('installed');
    expect(report.graphifyyVersion).toBe('0.7.7');
  });

  it('upgrade path: pre-existing version differs from post-install version', () => {
    populateBundle();
    mockedExec.mockImplementation(
      happyExec({ listVersion: UV_TOOL_LIST_077, listAfter: UV_TOOL_LIST_080 }),
    );

    const report = installGraphify(baseCtx({ claudeCode: true, copilot: true }));

    expect(report.graphifyy).toBe('upgraded');
    expect(report.graphifyyVersion).toBe('0.8.0');
  });

  it('skips Claude hook when claudeCode=false', () => {
    populateBundle();
    mockedExec.mockImplementation(happyExec());

    const report = installGraphify(baseCtx({ claudeCode: false, copilot: true }));

    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('ok');
    expect(report.projectLocal.written).toEqual(['.copilot/skills/graphify/SKILL.md']);
    expect(existsSync(join(projectPath, '.claude/skills/graphify/SKILL.md'))).toBe(false);
  });

  it('skips Copilot hook when copilot=false', () => {
    populateBundle();
    mockedExec.mockImplementation(happyExec());

    const report = installGraphify(baseCtx({ claudeCode: true, copilot: false }));

    expect(report.copilotHook).toBe('skipped');
    expect(report.claudeHook).toBe('ok');
    expect(report.projectLocal.written).toEqual(['.claude/skills/graphify/SKILL.md']);
  });

  it('still writes project-local even when Python is missing (the safety net)', () => {
    populateBundle();
    mockedExec.mockImplementation(() => {
      throw new Error('not found');
    });

    const report = installGraphify(baseCtx({ claudeCode: true, copilot: true }));

    expect(report.python.found).toBe(false);
    expect(report.uv.found).toBe(false);
    expect(report.graphifyy).toBe('skipped');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
    // The whole point: project-local files are still on disk.
    expect(report.projectLocal.source).toBe('bundled');
    expect(report.projectLocal.written).toEqual([
      '.claude/skills/graphify/SKILL.md',
      '.copilot/skills/graphify/SKILL.md',
    ]);
    expect(existsSync(join(projectPath, '.claude/skills/graphify/SKILL.md'))).toBe(true);
    expect(report.hints.some((h) => /Python >= 3\.10 not found/.test(h))).toBe(true);
  });

  it('still writes project-local when uv is missing', () => {
    populateBundle();
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/^uv --version/.test(s)) throw new Error('not found');
      throw new Error(`Unexpected: ${s}`);
    });

    const report = installGraphify(baseCtx({ claudeCode: true, copilot: true }));

    expect(report.uv.found).toBe(false);
    expect(report.projectLocal.written).toEqual([
      '.claude/skills/graphify/SKILL.md',
      '.copilot/skills/graphify/SKILL.md',
    ]);
    expect(report.hints.some((h) => /`uv` not found/.test(h))).toBe(true);
  });

  it('still writes project-local when uv tool install fails', () => {
    populateBundle();
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/^uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool dir graphifyy$/.test(s)) throw new Error('not installed');
      if (/^uv tool list$/.test(s)) return Buffer.from(UV_TOOL_LIST_EMPTY);
      if (/uv tool install/.test(s)) throw new Error('boom');
      throw new Error(`Unexpected: ${s}`);
    });

    const report = installGraphify(baseCtx({ claudeCode: true, copilot: true }));

    expect(report.graphifyy).toBe('install-failed');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
    expect(report.projectLocal.written.length).toBeGreaterThan(0);
    expect(report.hints.some((h) => /uv tool install.*failed/.test(h))).toBe(true);
  });

  it('reports claudeHook=failed when graphify claude install throws but project-local write still succeeded', () => {
    populateBundle();
    mockedExec.mockImplementation(happyExec({ failOn: [/^graphify claude install$/] }));

    const report = installGraphify(baseCtx({ claudeCode: true, copilot: true }));

    expect(report.claudeHook).toBe('failed');
    expect(report.copilotHook).toBe('ok');
    expect(report.projectLocal.written).toContain('.claude/skills/graphify/SKILL.md');
    expect(report.hints.some((h) => /graphify claude install` failed/.test(h))).toBe(true);
  });
});

describe('installGraphify (codex / cursor / gemini coverage)', () => {
  it('codex flag wires graphify codex install + writes project-local skill-codex content', () => {
    populateBundle();
    mockedExec.mockImplementation(happyExec());

    const report = installGraphify(baseCtx({ codex: true }));

    expect(report.codexHook).toBe('ok');
    expect(report.projectLocal.written).toEqual(['.agents/skills/graphify/SKILL.md']);
    expect(readFileSync(join(projectPath, '.agents/skills/graphify/SKILL.md'), 'utf8'))
      .toContain('skill-codex.md');
  });

  it('cursor flag invokes graphify install --platform cursor (no skill-file copy)', () => {
    populateBundle();
    const calls: string[] = [];
    mockedExec.mockImplementation((cmd) => {
      calls.push(String(cmd));
      return happyExec()(cmd);
    });

    const report = installGraphify(baseCtx({ cursor: true }));

    expect(report.cursorHook).toBe('ok');
    expect(calls).toContain('graphify install --platform cursor');
    expect(report.projectLocal.written).toEqual([]);
  });

  it('gemini flag invokes graphify install --platform gemini', () => {
    populateBundle();
    const calls: string[] = [];
    mockedExec.mockImplementation((cmd) => {
      calls.push(String(cmd));
      return happyExec()(cmd);
    });

    const report = installGraphify(baseCtx({ geminiCli: true }));

    expect(report.geminiHook).toBe('ok');
    expect(calls).toContain('graphify install --platform gemini');
    expect(report.projectLocal.written).toEqual([]);
  });

  it('codex hook failure surfaces in hints but project-local copy is intact', () => {
    populateBundle();
    mockedExec.mockImplementation(happyExec({ failOn: [/^graphify codex install$/] }));

    const report = installGraphify(baseCtx({ codex: true }));

    expect(report.codexHook).toBe('failed');
    expect(report.projectLocal.written).toContain('.agents/skills/graphify/SKILL.md');
    expect(report.hints.some((h) => /graphify codex install` failed/.test(h))).toBe(true);
  });

  it('all five flags enabled: every wire runs, project-local covers claude+copilot+codex', () => {
    populateBundle();
    mockedExec.mockImplementation(happyExec());

    const report = installGraphify(baseCtx({
      claudeCode: true,
      copilot: true,
      codex: true,
      cursor: true,
      geminiCli: true,
    }));

    expect(report.claudeHook).toBe('ok');
    expect(report.copilotHook).toBe('ok');
    expect(report.codexHook).toBe('ok');
    expect(report.cursorHook).toBe('ok');
    expect(report.geminiHook).toBe('ok');
    expect(report.projectLocal.written).toEqual([
      '.claude/skills/graphify/SKILL.md',
      '.copilot/skills/graphify/SKILL.md',
      '.agents/skills/graphify/SKILL.md',
    ]);
  });
});

describe('writeProjectLocalSkills (direct unit tests)', () => {
  it('returns source=unavailable when bundled dir is missing and no installed package', () => {
    // No populateBundle() call; bundledSkillsRoot exists but empty.
    mockedExec.mockImplementation((cmd) => {
      if (/^uv tool dir graphifyy$/.test(String(cmd))) throw new Error('not installed');
      if (/^uv tool list$/.test(String(cmd))) return Buffer.from(UV_TOOL_LIST_EMPTY);
      throw new Error(`Unexpected: ${cmd}`);
    });

    const r = writeProjectLocalSkills(baseCtx({ claudeCode: true }));

    expect(r.source).toBe('unavailable');
    expect(r.written).toEqual([]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('no-clobber: skips destination when existing stamp is newer than source', () => {
    populateBundle({ version: '0.7.10' });
    mockedExec.mockImplementation((cmd) => {
      if (/^uv tool dir graphifyy$/.test(String(cmd))) throw new Error('not installed');
      if (/^uv tool list$/.test(String(cmd))) return Buffer.from(UV_TOOL_LIST_EMPTY);
      throw new Error(`Unexpected: ${cmd}`);
    });

    // Pre-stamp the destination with a newer version.
    const stampDir = join(projectPath, '.claude/skills/graphify');
    mkdirSync(stampDir, { recursive: true });
    writeFileSync(join(stampDir, 'SKILL.md'), 'pre-existing manual content');
    writeFileSync(join(stampDir, '.graphify_skill_version'), '0.99.0\n');

    const r = writeProjectLocalSkills(baseCtx({ claudeCode: true }));

    expect(r.source).toBe('bundled');
    expect(r.written).toEqual([]);
    expect(r.skipped).toEqual(['.claude/skills/graphify/SKILL.md']);
    // Existing content untouched.
    expect(readFileSync(join(stampDir, 'SKILL.md'), 'utf8')).toBe('pre-existing manual content');
  });

  it('overwrites destination when existing stamp is older than source', () => {
    populateBundle({ version: '0.7.10' });
    mockedExec.mockImplementation((cmd) => {
      if (/^uv tool dir graphifyy$/.test(String(cmd))) throw new Error('not installed');
      if (/^uv tool list$/.test(String(cmd))) return Buffer.from(UV_TOOL_LIST_EMPTY);
      throw new Error(`Unexpected: ${cmd}`);
    });

    const stampDir = join(projectPath, '.copilot/skills/graphify');
    mkdirSync(stampDir, { recursive: true });
    writeFileSync(join(stampDir, 'SKILL.md'), 'old');
    writeFileSync(join(stampDir, '.graphify_skill_version'), '0.5.0\n');

    const r = writeProjectLocalSkills(baseCtx({ copilot: true }));

    expect(r.written).toEqual(['.copilot/skills/graphify/SKILL.md']);
    expect(r.skipped).toEqual([]);
    expect(readFileSync(join(stampDir, 'SKILL.md'), 'utf8')).toContain('skill-copilot.md');
    expect(readFileSync(join(stampDir, '.graphify_skill_version'), 'utf8').trim()).toBe('0.7.10');
  });

  it('writes nothing when no AI tool flags are enabled', () => {
    populateBundle();
    mockedExec.mockImplementation((cmd) => {
      if (/^uv tool dir graphifyy$/.test(String(cmd))) throw new Error('not installed');
      if (/^uv tool list$/.test(String(cmd))) return Buffer.from(UV_TOOL_LIST_EMPTY);
      throw new Error(`Unexpected: ${cmd}`);
    });

    const r = writeProjectLocalSkills(baseCtx());

    expect(r.source).toBe('bundled');
    expect(r.written).toEqual([]);
    expect(r.errors).toEqual([]);
  });

  it('records an error when a source file is missing in the bundled dir', () => {
    // Bundle missing skill-codex.md.
    populateBundle({ files: ['skill.md', 'skill-copilot.md', 'skill-windows.md'] });
    mockedExec.mockImplementation((cmd) => {
      if (/^uv tool dir graphifyy$/.test(String(cmd))) throw new Error('not installed');
      if (/^uv tool list$/.test(String(cmd))) return Buffer.from(UV_TOOL_LIST_EMPTY);
      throw new Error(`Unexpected: ${cmd}`);
    });

    const r = writeProjectLocalSkills(baseCtx({ codex: true }));

    expect(r.source).toBe('bundled');
    expect(r.written).toEqual([]);
    expect(r.errors.some((e) => /codex.*source file missing/i.test(e))).toBe(true);
  });
});
