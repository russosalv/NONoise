import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffold } from '../../src/scaffold.js';
import type { ProjectContext } from '../../src/types.js';
import { BMAD_ALLOWLIST } from '../../src/bmad-filter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const TEMPLATES_ROOT = join(REPO_ROOT, 'packages', 'templates');
const SKILLS_ROOT = join(REPO_ROOT, 'packages', 'skills');

const RUN_E2E = process.env.RUN_E2E_NETWORK === '1';

describe.skipIf(!RUN_E2E)('L5 — real BMAD install', () => {
  let parent: string;
  let projectPath: string;

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-e2e-'));
    projectPath = join(parent, 'e2e-proj');
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  it('installs BMAD and filters to the 5 allowlisted agent skills', async () => {
    const ctx: ProjectContext = {
      projectName: 'e2e-proj',
      projectPath,
      template: 'single-project',
      aiTools: {
        claudeCode: true,
        copilot: false,
        codex: false,
        cursor: false,
        geminiCli: false,
      },
      gitInit: false,
      frameworkVersion: '0.2.0',
      installBmad: true,
    };

    await scaffold(ctx, { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });

    const skillsDir = join(projectPath, '.claude', 'skills');
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const bmadFolders = entries
      .filter((e) => e.isDirectory() && e.name.startsWith('bmad-'))
      .map((e) => e.name)
      .sort();

    expect(bmadFolders.sort()).toEqual([...BMAD_ALLOWLIST].sort());

    // _bmad/ folder should still exist (dependency of the agent skills)
    const bmadConfig = await stat(join(projectPath, '_bmad')).catch(() => null);
    expect(bmadConfig, '_bmad/ folder must exist').not.toBeNull();
  }, 600_000);
});
