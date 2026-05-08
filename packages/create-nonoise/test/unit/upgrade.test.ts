import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Point to the package SOURCE skills (always present in repo), not the
// build artifact at packages/create-nonoise/skills/ which is gitignored
// and only populated after `pnpm build`.
const BUNDLED_SKILLS_ROOT = resolve(__dirname, '..', '..', '..', 'skills');

// Mock child_process so installGraphify (called transitively) doesn't actually
// touch the host system.
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { runUpgrade } from '../../src/upgrade.js';

const mockedExec = vi.mocked(execSync);

const UV_TOOL_LIST_077 = 'graphifyy v0.7.7\n- graphify\n';

function happyPathExec(): void {
  mockedExec.mockImplementation((cmd) => {
    const s = String(cmd);
    if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
    if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
    if (/^uv tool list$/.test(s)) return Buffer.from(UV_TOOL_LIST_077);
    if (/uv tool install/.test(s)) return Buffer.from('');
    if (/^graphify claude install$/.test(s)) return Buffer.from('');
    if (/^graphify copilot install$/.test(s)) return Buffer.from('');
    throw new Error(`Unexpected: ${cmd}`);
  });
}

function makeProject(opts: {
  withConfig?: boolean;
  aiTools?: Record<string, boolean>;
  preExistingSkillFile?: { skill: string; content: string };
}): string {
  const dir = mkdtempSync(join(tmpdir(), 'nonoise-upgrade-'));
  if (opts.withConfig) {
    const cfg = {
      $schema: 'https://nonoise.dev/schemas/project-config.v1.json',
      frameworkVersion: '1.0.0',
      template: 'single-project',
      createdAt: new Date().toISOString(),
      aiTools: opts.aiTools ?? {
        claudeCode: true,
        copilot: true,
        codex: false,
        cursor: false,
        geminiCli: false,
      },
      skills: [],
    };
    writeFileSync(join(dir, 'nonoise.config.json'), JSON.stringify(cfg, null, 2), 'utf8');
  }
  if (opts.preExistingSkillFile) {
    const skillDir = join(dir, '.claude', 'skills', opts.preExistingSkillFile.skill);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), opts.preExistingSkillFile.content, 'utf8');
  }
  return dir;
}

/**
 * Build a minimal fake skills root that contains just one skill, so we don't
 * try to read 24+ real bundled skills from the package source.
 */
function makeFakeSkillsRoot(opts: { skills?: Array<{ name: string; content: string }> } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'nonoise-skills-root-'));
  const skills = opts.skills ?? [
    { name: 'reverse-engineering', content: '# reverse-engineering v2 (upgraded)\n' },
  ];
  for (const skill of skills) {
    const dir = join(root, skill.name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), skill.content, 'utf8');
  }
  return root;
}

// Override the MVP_SKILL_BUNDLE for tests by passing only an existing skill name —
// the upgrade module reads from disk, so a missing skill throws. We use a
// `skillsRoot` override that contains only the one skill we want to test on,
// and we know runUpgrade iterates the *hardcoded* MVP_SKILL_BUNDLE list — so
// for tests we substitute the fake root only when paired with a project that
// expects only that skill. For full-bundle tests we would need a more complex
// fixture. Most of the upgrade-specific behaviour can be exercised via the
// happy path with the real bundled skills in test/integration/.

describe('runUpgrade', () => {
  beforeEach(() => {
    mockedExec.mockReset();
  });

  it('throws when no nonoise.config.json and no --ai flag', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-upgrade-bare-'));
    try {
      await expect(runUpgrade({ targetPath: dir })).rejects.toThrow(
        /No nonoise\.config\.json found/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when nonoise.config.json is malformed', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-upgrade-bad-json-'));
    writeFileSync(join(dir, 'nonoise.config.json'), '{ not valid json', 'utf8');
    try {
      await expect(runUpgrade({ targetPath: dir })).rejects.toThrow(
        /Could not parse nonoise\.config\.json/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when config has all aiTools disabled and no --ai flag', async () => {
    const dir = makeProject({
      withConfig: true,
      aiTools: { claudeCode: false, copilot: false, codex: false, cursor: false, geminiCli: false },
    });
    try {
      await expect(runUpgrade({ targetPath: dir })).rejects.toThrow(/No AI tools enabled/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws on unknown AI tool flag', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-upgrade-bad-ai-'));
    try {
      await expect(
        runUpgrade({ targetPath: dir, aiCsv: 'claude-code,bogus-tool' }),
      ).rejects.toThrow(/Unknown AI tool flag/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('overwrites pre-existing SKILL.md (the whole point of upgrade)', async () => {
    const dir = makeProject({
      withConfig: true,
      preExistingSkillFile: {
        skill: 'reverse-engineering',
        content: '# reverse-engineering v1 (old)\n',
      },
    });

    // Substitute the bundled skills root with a fake that contains only one
    // skill. runUpgrade will fail when it can't find the other 23 skills in
    // MVP_SKILL_BUNDLE — but it tries them in order, so it'll try to copy
    // 'vscode-config-generator' first (alphabetical-ish in the bundle list).
    // To get past that, we need ALL skills present in the fake root.
    const realRoot = BUNDLED_SKILLS_ROOT;
    happyPathExec();
    try {
      const result = await runUpgrade({
        targetPath: dir,
        skillsRoot: realRoot,
      });
      expect(result.source).toBe('config');
      expect(result.exitCode).toBe(0);
      expect(result.skillsRefreshed).toBeGreaterThan(0);

      // The upgraded SKILL.md content should match what's in the real bundle,
      // not the v1 stub we wrote in the test fixture.
      const upgradedSkillPath = join(dir, '.claude', 'skills', 'reverse-engineering', 'SKILL.md');
      expect(existsSync(upgradedSkillPath)).toBe(true);
      const content = readFileSync(upgradedSkillPath, 'utf8');
      expect(content).not.toBe('# reverse-engineering v1 (old)\n');
      // Sanity check: bundled skill should mention "reverse-engineering" in frontmatter.
      expect(content).toMatch(/name:\s*reverse-engineering/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns exitCode=1 when graphify install fails', async () => {
    const dir = makeProject({ withConfig: true });
    const realRoot = BUNDLED_SKILLS_ROOT;

    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/^uv tool list$/.test(s)) return Buffer.from('');
      if (/uv tool install/.test(s)) throw new Error('install boom');
      throw new Error(`Unexpected: ${cmd}`);
    });
    try {
      const result = await runUpgrade({
        targetPath: dir,
        skillsRoot: realRoot,
      });
      expect(result.exitCode).toBe(1);
      // Skills should still have been refreshed even though graphify failed.
      expect(result.skillsRefreshed).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('uses --ai flag when no nonoise.config.json is present', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-upgrade-noconfig-'));
    const realRoot = BUNDLED_SKILLS_ROOT;
    happyPathExec();
    try {
      const result = await runUpgrade({
        targetPath: dir,
        aiCsv: 'claude-code',
        skillsRoot: realRoot,
      });
      expect(result.source).toBe('flag');
      expect(result.aiTools.claudeCode).toBe(true);
      expect(result.aiTools.copilot).toBe(false);
      expect(result.exitCode).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('merges flag with config when both are provided', async () => {
    const dir = makeProject({
      withConfig: true,
      aiTools: { claudeCode: true, copilot: false, codex: false, cursor: false, geminiCli: false },
    });
    const realRoot = BUNDLED_SKILLS_ROOT;
    happyPathExec();
    try {
      const result = await runUpgrade({
        targetPath: dir,
        aiCsv: 'copilot',
        skillsRoot: realRoot,
      });
      expect(result.source).toBe('merged');
      expect(result.aiTools.claudeCode).toBe(true);
      expect(result.aiTools.copilot).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
