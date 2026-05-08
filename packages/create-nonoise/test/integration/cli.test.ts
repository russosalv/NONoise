import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile, stat, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, '..', '..');
const BIN = resolve(PKG_ROOT, 'bin', 'create-nonoise.mjs');
const DIST_ENTRY = resolve(PKG_ROOT, 'dist', 'index.js');
const BUNDLED_SKILL_MARKER = resolve(PKG_ROOT, 'skills', 'polly', 'SKILL.md');

describe('CLI via bin shim', () => {
  let parent: string;

  // We deliberately do NOT run `pnpm build` here. Triggering a build during
  // tests rewrote `<pkg>/skills/` concurrently with bundle-assets.test.ts'
  // existsSync checks, producing a race that surfaced as flaky failures on
  // Ubuntu + Node 20 in CI. The build step is the caller's responsibility:
  // CI runs `pnpm -r run build` before `pnpm -r run test`; locally `pnpm
  // test` users should run `pnpm build` first. We assert prerequisites
  // here with a clear error so the failure mode is "rebuild" instead of
  // "mysterious test failure".
  beforeAll(async () => {
    const missing: string[] = [];
    for (const path of [DIST_ENTRY, BUNDLED_SKILL_MARKER]) {
      try {
        await access(path);
      } catch {
        missing.push(path);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `cli.test.ts prerequisites missing — run \`pnpm --filter create-nonoise run build\` first.\n` +
        `Missing:\n  - ${missing.join('\n  - ')}`,
      );
    }
  });

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-cli-'));
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  it('--yes --ai claude-code produces a project with CLAUDE.md', async () => {
    await exec('node', [BIN, 'demo', '--yes', '--ai', 'claude-code', '--no-git'], { cwd: parent });
    const claude = await readFile(join(parent, 'demo', 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('demo');
  }, 60_000);

  it('--ai copilot skips CLAUDE.md and produces copilot-instructions.md', async () => {
    await exec('node', [BIN, 'demo', '--yes', '--ai', 'copilot', '--no-git'], { cwd: parent });
    await expect(stat(join(parent, 'demo', 'CLAUDE.md'))).rejects.toThrow();
    const cop = await readFile(join(parent, 'demo', '.github', 'copilot-instructions.md'), 'utf8');
    expect(cop).toContain('demo');
  }, 60_000);

  it('--version prints a semver', async () => {
    const { stdout } = await exec('node', [BIN, '--version'], { cwd: parent });
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--help prints usage', async () => {
    const { stdout } = await exec('node', [BIN, '--help'], { cwd: parent });
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('--ai');
    expect(stdout).toContain('--graphify-only');
  });

  it('--graphify-only without config and without --ai exits non-zero with helpful error', async () => {
    await expect(
      exec('node', [BIN, '--graphify-only'], { cwd: parent }),
    ).rejects.toMatchObject({
      stderr: expect.stringMatching(/No nonoise\.config\.json found/),
    });
  });

  it('--yes <existing-nonoise-project> exits non-zero pointing to --upgrade / --graphify-only', async () => {
    // Build a fake existing NONoise project (just nonoise.config.json is enough).
    const { mkdir, writeFile } = await import('node:fs/promises');
    const target = join(parent, 'existing-project');
    await mkdir(target, { recursive: true });
    const cfg = {
      $schema: 'https://nonoise.dev/schemas/project-config.v1.json',
      frameworkVersion: '1.0.0',
      template: 'single-project',
      createdAt: new Date().toISOString(),
      aiTools: {
        claudeCode: true,
        copilot: true,
        codex: false,
        cursor: false,
        geminiCli: false,
      },
      skills: [],
    };
    await writeFile(join(target, 'nonoise.config.json'), JSON.stringify(cfg, null, 2), 'utf8');

    await expect(
      exec('node', [BIN, 'existing-project', '--yes', '--ai', 'claude-code', '--no-git'], {
        cwd: parent,
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringMatching(
        /already a NONoise project[\s\S]*--upgrade[\s\S]*--graphify-only/,
      ),
    });
  }, 30_000);
});
