import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveTemplateFiles } from '../../src/template-resolver.js';
import type { AiTools } from '../../src/types.js';

describe('resolveTemplateFiles', () => {
  let templateDir: string;

  beforeEach(async () => {
    templateDir = await mkdtemp(join(tmpdir(), 'nonoise-tpl-'));
    await mkdir(join(templateDir, '_always'), { recursive: true });
    await writeFile(join(templateDir, '_always', 'AGENTS.md.hbs'), 'agents');
    await writeFile(join(templateDir, '_always', 'README.md.hbs'), 'readme');

    await mkdir(join(templateDir, '_if-claude-code', '.claude'), { recursive: true });
    await writeFile(join(templateDir, '_if-claude-code', 'CLAUDE.md.hbs'), 'claude');
    await writeFile(join(templateDir, '_if-claude-code', '.claude', '.gitkeep'), '');

    await mkdir(join(templateDir, '_if-copilot', '.github'), { recursive: true });
    await writeFile(join(templateDir, '_if-copilot', '.github', 'copilot-instructions.md.hbs'), 'copilot');
  });

  afterEach(async () => {
    await rm(templateDir, { recursive: true, force: true });
  });

  function buildAiTools(overrides: Partial<AiTools> = {}): AiTools {
    return {
      claudeCode: false,
      copilot: false,
      codex: false,
      cursor: false,
      geminiCli: false,
      ...overrides,
    };
  }

  it('always includes _always files regardless of flags', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools());
    const destPaths = result.map((f) => f.destPath).sort();
    expect(destPaths).toEqual(['AGENTS.md', 'README.md']);
  });

  it('includes _if-claude-code when claudeCode is true', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true }));
    const destPaths = result.map((f) => f.destPath).sort();
    expect(destPaths).toEqual(['.claude/.gitkeep', 'AGENTS.md', 'CLAUDE.md', 'README.md']);
  });

  it('includes _if-copilot when copilot is true', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ copilot: true }));
    const destPaths = result.map((f) => f.destPath).sort();
    expect(destPaths).toContain('.github/copilot-instructions.md');
  });

  it('includes multiple conditional folders', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true, copilot: true }));
    const destPaths = result.map((f) => f.destPath).sort();
    expect(destPaths).toContain('CLAUDE.md');
    expect(destPaths).toContain('.github/copilot-instructions.md');
    expect(destPaths).toContain('AGENTS.md');
  });

  it('strips .hbs extension from destination path', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true }));
    for (const file of result) {
      expect(file.destPath).not.toMatch(/\.hbs$/);
    }
  });

  it('preserves .hbs in sourcePath when source is a template', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true }));
    const claudeMd = result.find((f) => f.destPath === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    expect(claudeMd!.sourcePath).toMatch(/CLAUDE\.md\.hbs$/);
    expect(claudeMd!.isTemplate).toBe(true);
  });

  it('detects non-template files (no .hbs)', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true }));
    const gitkeep = result.find((f) => f.destPath === '.claude/.gitkeep');
    expect(gitkeep).toBeDefined();
    expect(gitkeep!.isTemplate).toBe(false);
  });
});

describe('resolveTemplateFiles — collision detection', () => {
  let templateDir: string;

  beforeEach(async () => {
    templateDir = await mkdtemp(join(tmpdir(), 'nonoise-tpl-collide-'));
    await mkdir(join(templateDir, '_always'), { recursive: true });
    await mkdir(join(templateDir, '_if-claude-code'), { recursive: true });
    await writeFile(join(templateDir, '_always', 'FOO.md'), 'always');
    await writeFile(join(templateDir, '_if-claude-code', 'FOO.md'), 'conditional');
  });

  afterEach(async () => {
    await rm(templateDir, { recursive: true, force: true });
  });

  it('throws when _always and _if-* produce the same destination path', async () => {
    const aiTools: AiTools = {
      claudeCode: true, copilot: false, codex: false, cursor: false, geminiCli: false,
    };
    await expect(resolveTemplateFiles(templateDir, aiTools)).rejects.toThrow(/collision.*FOO\.md/i);
  });
});
