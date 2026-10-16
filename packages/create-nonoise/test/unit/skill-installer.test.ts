import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkills, nonoiseSkillDirs, removeRetiredSkills } from '../../src/skill-installer.js';

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

it('installs a unified vendor skill directly at its namespace with references', async () => {
  const { installVendor } = await import('../../src/skill-installer.js');
  const dir = await mkdtemp(join(tmpdir(), 'nonoise-unified-'));
  try {
    const source = join(dir, 'vendor'); const project = join(dir, 'project');
    await mkdir(join(source, 'impeccable/reference'), { recursive: true });
    await writeFile(join(source, 'impeccable/SKILL.md'), 'unified upstream skill');
    await writeFile(join(source, 'impeccable/reference/audit.md'), 'audit reference');
    await installVendor({ vendorSourcePath: source, projectPath: project, namespace: 'impeccable', installClaudeSpecific: false });
    expect(await readFile(join(project, '.claude/skills/impeccable/SKILL.md'), 'utf8')).toBe('unified upstream skill');
    expect(await readFile(join(project, '.claude/skills/impeccable/reference/audit.md'), 'utf8')).toBe('audit reference');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

describe('NONoise skill directories per harness', () => {
  const none = { claudeCode: false, copilot: false, codex: false, cursor: false, geminiCli: false };
  it('always targets .claude/skills and adds .agents/skills for Codex or Copilot CLI', () => {
    expect(nonoiseSkillDirs({ ...none, claudeCode: true })).toEqual(['.claude/skills']);
    expect(nonoiseSkillDirs({ ...none, codex: true })).toEqual(['.claude/skills', '.agents/skills']);
    expect(nonoiseSkillDirs({ ...none, copilot: true })).toEqual(['.claude/skills', '.agents/skills']);
  });
  it('installs into a custom targetDir', async () => {
    const skills = await mkdtemp(join(tmpdir(), 'nonoise-skills-'));
    const project = await mkdtemp(join(tmpdir(), 'nonoise-proj-'));
    await mkdir(join(skills, 'polly')); await writeFile(join(skills, 'polly', 'SKILL.md'), 'Polly');
    await installSkills({ skillsRoot: skills, projectPath: project, skillNames: ['polly'], targetDir: '.agents/skills' });
    expect(await readFile(join(project, '.agents/skills/polly/SKILL.md'), 'utf8')).toBe('Polly');
    await rm(skills, { recursive: true, force: true }); await rm(project, { recursive: true, force: true });
  });
});

describe('removeRetiredSkills (codex-delegate → codex@openai-codex plugin)', () => {
  const shipped = fileURLToPath(new URL('../fixtures/retired-skills/codex-delegate/SKILL.md', import.meta.url));
  let project: string;
  beforeEach(async () => { project = await mkdtemp(join(tmpdir(), 'nonoise-retired-')); });
  afterEach(async () => { await rm(project, { recursive: true, force: true }); });

  it('removes a pristine shipped copy and a link left dangling by that removal', async () => {
    await mkdir(join(project, '.claude/skills/codex-delegate'), { recursive: true });
    await writeFile(join(project, '.claude/skills/codex-delegate/SKILL.md'), await readFile(shipped));
    await mkdir(join(project, '.agents/skills'), { recursive: true });
    await symlink('../../.claude/skills/codex-delegate', join(project, '.agents/skills/codex-delegate'));
    const result = await removeRetiredSkills(project);
    expect(result).toEqual({ removed: ['.claude/skills/codex-delegate', '.agents/skills/codex-delegate'], preserved: [] });
    expect(existsSync(join(project, '.claude/skills/codex-delegate'))).toBe(false);
  });
  it('preserves a modified copy or one with extra files', async () => {
    await mkdir(join(project, '.claude/skills/codex-delegate'), { recursive: true });
    await writeFile(join(project, '.claude/skills/codex-delegate/SKILL.md'), 'my edits');
    await mkdir(join(project, '.agents/skills/codex-delegate'), { recursive: true });
    await writeFile(join(project, '.agents/skills/codex-delegate/SKILL.md'), await readFile(shipped));
    await writeFile(join(project, '.agents/skills/codex-delegate/notes.md'), 'mine');
    const result = await removeRetiredSkills(project);
    expect(result.removed).toEqual([]);
    expect(result.preserved).toEqual(['.claude/skills/codex-delegate', '.agents/skills/codex-delegate']);
  });
  it('is a no-op when nothing retired is present', async () => {
    expect(await removeRetiredSkills(project)).toEqual({ removed: [], preserved: [] });
  });
});
