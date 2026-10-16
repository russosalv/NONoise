import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

vi.mock('../../src/haft.js', () => ({ installHaft: vi.fn(() => ({ ok: false })) }));
vi.mock('../../src/native-vendor.js', () => ({ configureNativeVendors: vi.fn(), configureEmbedPlugins: vi.fn(), installNativeVendors: vi.fn(() => []) }));
vi.mock('../../src/graphify-install.js', () => ({
  installGraphify: vi.fn(({ projectPath }: { projectPath: string }) => {
    for (const path of ['.claude/settings.json', '.codex/hooks.json', '.gemini/settings.json']) {
      mkdirSync(dirname(join(projectPath, path)), { recursive: true });
      writeFileSync(join(projectPath, path), '{"hooks": {}}');
      writeFileSync(join(projectPath, path + '.graphify-bak'), '{"original": true}');
    }
    return {};
  }),
  formatReport: vi.fn(() => ''),
}));
import { scaffold } from '../../src/scaffold.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'nonoise-hygiene-'));
  vi.stubEnv('GIT_AUTHOR_NAME', 'Test');
  vi.stubEnv('GIT_COMMITTER_NAME', 'Test');
  vi.stubEnv('GIT_AUTHOR_EMAIL', 'test@example.invalid');
  vi.stubEnv('GIT_COMMITTER_EMAIL', 'test@example.invalid');
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); vi.unstubAllEnvs(); });

describe('graphify backup hygiene', () => {
  it.each(['single-project', 'multi-repo'] as const)('%s excludes installer backups from the initial commit', async template => {
    await scaffold({
      projectPath: dir, projectName: 'demo', template, workspaceKind: 'new', gitInit: true,
      frameworkVersion: '1.7.0', aiTools: { claudeCode: true, codex: true, geminiCli: true, copilot: false, cursor: false },
    }, { templatesRoot: resolve('../templates'), skillsRoot: resolve('../skills'), runGraphifyInstall: true });
    const tracked = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { cwd: dir, encoding: 'utf8' });
    expect(tracked).toContain('.claude/settings.json\n');
    expect(tracked).toContain('.codex/hooks.json\n');
    expect(tracked).not.toContain('.graphify-bak');
    expect(readFileSync(join(dir, '.claude/settings.json.graphify-bak'), 'utf8')).toBe('{"original": true}');
    writeFileSync(join(dir, '.claude/later.json.graphify-bak'), 'later backup');
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' })).toBe('');
  });
});
