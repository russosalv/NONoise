import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkills } from '../../src/skill-installer.js';

describe('installSkills', () => {
  let skillsDir: string;
  let projectDir: string;

  beforeEach(async () => {
    skillsDir = await mkdtemp(join(tmpdir(), 'nonoise-skills-'));
    projectDir = await mkdtemp(join(tmpdir(), 'nonoise-proj-'));

    // Create 2 fake skills
    await mkdir(join(skillsDir, 'skill-alpha'), { recursive: true });
    await writeFile(join(skillsDir, 'skill-alpha', 'SKILL.md'), '---\nname: skill-alpha\n---\nAlpha');

    await mkdir(join(skillsDir, 'skill-beta', 'assets'), { recursive: true });
    await writeFile(join(skillsDir, 'skill-beta', 'SKILL.md'), '---\nname: skill-beta\n---\nBeta');
    await writeFile(join(skillsDir, 'skill-beta', 'assets', 'template.txt'), 'asset-content');
  });

  afterEach(async () => {
    await rm(skillsDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  });

  it('copies requested skills into project .claude/skills/', async () => {
    await installSkills({
      skillsRoot: skillsDir,
      projectPath: projectDir,
      skillNames: ['skill-alpha'],
    });

    const content = await readFile(join(projectDir, '.claude', 'skills', 'skill-alpha', 'SKILL.md'), 'utf8');
    expect(content).toContain('Alpha');
  });

  it('copies nested asset files', async () => {
    await installSkills({
      skillsRoot: skillsDir,
      projectPath: projectDir,
      skillNames: ['skill-beta'],
    });

    const asset = await readFile(join(projectDir, '.claude', 'skills', 'skill-beta', 'assets', 'template.txt'), 'utf8');
    expect(asset).toBe('asset-content');
  });

  it('installs multiple skills in one call', async () => {
    await installSkills({
      skillsRoot: skillsDir,
      projectPath: projectDir,
      skillNames: ['skill-alpha', 'skill-beta'],
    });

    const alpha = await readFile(join(projectDir, '.claude', 'skills', 'skill-alpha', 'SKILL.md'), 'utf8');
    const beta = await readFile(join(projectDir, '.claude', 'skills', 'skill-beta', 'SKILL.md'), 'utf8');
    expect(alpha).toContain('Alpha');
    expect(beta).toContain('Beta');
  });

  it('throws when a skill is not found', async () => {
    await expect(
      installSkills({
        skillsRoot: skillsDir,
        projectPath: projectDir,
        skillNames: ['skill-missing'],
      }),
    ).rejects.toThrow(/skill-missing/);
  });
});
