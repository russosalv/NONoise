import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { filterBmadSkills, BMAD_ALLOWLIST } from '../../src/bmad-filter.js';

describe('filterBmadSkills', () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'nonoise-bmad-filter-'));
  });

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  it('returns empty array when .claude/skills does not exist', async () => {
    const removed = await filterBmadSkills(projectPath);
    expect(removed).toEqual([]);
  });

  it('keeps all allowlisted bmad-* folders', async () => {
    const skillsDir = join(projectPath, '.claude', 'skills');
    await mkdir(skillsDir, { recursive: true });
    for (const name of BMAD_ALLOWLIST) {
      await mkdir(join(skillsDir, name), { recursive: true });
      await writeFile(join(skillsDir, name, 'SKILL.md'), `# ${name}`);
    }
    const removed = await filterBmadSkills(projectPath);
    expect(removed).toEqual([]);
    const remaining = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name).sort();
    expect(remaining).toEqual([...BMAD_ALLOWLIST].sort());
  });

  it('removes non-allowlisted bmad-* folders', async () => {
    const skillsDir = join(projectPath, '.claude', 'skills');
    await mkdir(skillsDir, { recursive: true });
    for (const name of ['bmad-agent-analyst', 'bmad-create-prd', 'bmad-index-docs']) {
      await mkdir(join(skillsDir, name), { recursive: true });
      await writeFile(join(skillsDir, name, 'SKILL.md'), '');
    }
    const removed = await filterBmadSkills(projectPath);
    expect(removed.sort()).toEqual(['bmad-create-prd', 'bmad-index-docs']);
    const remaining = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name);
    expect(remaining).toEqual(['bmad-agent-analyst']);
  });

  it('leaves non-bmad folders untouched', async () => {
    const skillsDir = join(projectPath, '.claude', 'skills');
    await mkdir(skillsDir, { recursive: true });
    await mkdir(join(skillsDir, 'playwright-cli'), { recursive: true });
    await writeFile(join(skillsDir, 'playwright-cli', 'SKILL.md'), '');
    await mkdir(join(skillsDir, 'bmad-create-prd'), { recursive: true });
    await writeFile(join(skillsDir, 'bmad-create-prd', 'SKILL.md'), '');
    const removed = await filterBmadSkills(projectPath);
    expect(removed).toEqual(['bmad-create-prd']);
    const remaining = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name);
    expect(remaining).toEqual(['playwright-cli']);
  });
});
