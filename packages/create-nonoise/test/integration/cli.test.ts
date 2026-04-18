import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BIN = resolve(__dirname, '..', '..', 'bin', 'create-nonoise.mjs');
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

describe('CLI via bin shim', () => {
  let parent: string;

  beforeAll(async () => {
    // Ensure build has run (produces dist/ + bundles templates/skills into the package root)
    await exec('pnpm', ['--filter', 'create-nonoise', 'run', 'build'], {
      cwd: REPO_ROOT,
      shell: true,
    });
  }, 120_000);

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
  });
});
