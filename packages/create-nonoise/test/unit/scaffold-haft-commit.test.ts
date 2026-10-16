import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const haftResult = { ok: true };
vi.mock('../../src/haft.js', () => ({
  installHaft: vi.fn(async (cwd: string) => {
    mkdirSync(join(cwd, '.haft'), { recursive: true });
    writeFileSync(join(cwd, '.haft/project.yaml'), 'id: test\n');
    return { ok: haftResult.ok, output: 'test' };
  }),
}));
vi.mock('../../src/graphify-install.js', () => ({ installGraphify: vi.fn(() => ({})), formatReport: vi.fn(() => '') }));
vi.mock('../../src/native-vendor.js', () => ({ configureNativeVendors: vi.fn(), installNativeVendors: vi.fn(async () => []) }));

import { scaffold } from '../../src/scaffold.js';
import type { AiTools } from '../../src/types.js';

const ai: AiTools = { claudeCode: true, copilot: false, codex: false, cursor: false, geminiCli: false };
const paths = { templatesRoot: resolve('../templates'), skillsRoot: resolve('../skills'), runGraphifyInstall: true };
const git = (cwd: string, cmd: string) => execSync(`git ${cmd}`, { cwd }).toString().trim();
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'nonoise-haft-commit-'));
  process.env.GIT_AUTHOR_NAME = process.env.GIT_COMMITTER_NAME = 'Test';
  process.env.GIT_AUTHOR_EMAIL = process.env.GIT_COMMITTER_EMAIL = 'test@example.invalid';
});
afterEach(() => { rmSync(dir, { force: true, recursive: true }); haftResult.ok = true; });

describe('scaffold with git and Haft', () => {
  const ctx = () => ({ projectName: 'demo', projectPath: dir, template: 'single-project' as const, workspaceKind: 'new' as const, aiTools: ai, gitInit: true, frameworkVersion: '1.7.0' });
  it('commits the files written by haft init after the initial scaffold commit', async () => {
    await scaffold(ctx(), paths);
    expect(git(dir, 'log --format=%s')).toBe('chore: initialize Haft via create-nonoise\nchore: initial scaffold via create-nonoise');
    expect(git(dir, 'status --porcelain')).toBe('');
  });
  it('leaves the tree untouched when Haft is pending', async () => {
    haftResult.ok = false;
    await scaffold(ctx(), paths);
    expect(git(dir, 'log --format=%s')).toBe('chore: initial scaffold via create-nonoise');
    expect(git(dir, 'status --porcelain')).toContain('.haft/');
  });
});
