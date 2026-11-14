import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Point to the package SOURCE skills (always present in repo), not the
// build artifact at packages/create-nonoise/skills/ which is gitignored
// and only populated after `pnpm build`.
const BUNDLED_SKILLS_ROOT = resolve(__dirname, '..', '..', '..', 'skills');

// Mock child_process so the external installers (called transitively) never
// touch the host system: `execFileSync` is what codebase-memory.ts runs.
vi.mock('../../src/haft.js', () => ({ installHaft: vi.fn(async () => ({ ok: true, output: 'fixture' })) }));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

import { execSync, execFileSync } from 'node:child_process';
import { runUpgrade } from '../../src/upgrade.js';

const mockedExec = vi.mocked(execSync);

const mockedExecFile = vi.mocked(execFileSync);

/** The code-graph binary answers and npm updates it; nothing else may be executed. */
function happyPathExec(): void {
  mockedExec.mockImplementation((cmd) => { throw new Error(`Unexpected: ${cmd}`); });
  mockedExecFile.mockImplementation((bin, args) => {
    if (bin === 'codebase-memory-mcp' && args?.[0] === '--version') return 'codebase-memory-mcp 0.12.1';
    if (bin === 'npm' && args?.join(' ') === 'install -g codebase-memory-mcp@latest') return '';
    throw new Error(`Unexpected: ${bin} ${args?.join(' ')}`);
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
      await expect(runUpgrade({ vendorMode: 'embed', targetPath: dir })).rejects.toThrow(
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
      await expect(runUpgrade({ vendorMode: 'embed', targetPath: dir })).rejects.toThrow(
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
      await expect(runUpgrade({ vendorMode: 'embed', targetPath: dir })).rejects.toThrow(/No AI tools enabled/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws on unknown AI tool flag', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-upgrade-bad-ai-'));
    try {
      await expect(
        runUpgrade({ vendorMode: 'embed', targetPath: dir, aiCsv: 'claude-code,bogus-tool' }),
      ).rejects.toThrow(/Unknown AI tool flag/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('preserves an unknown pre-existing SKILL.md during upgrade', async () => {
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
      const result = await runUpgrade({ vendorMode: 'embed',
        targetPath: dir,
        skillsRoot: realRoot,
      });
      expect(result.source).toBe('config');
      expect(result.exitCode).toBe(0);
      expect(result.skillsRefreshed).toBeGreaterThan(0);

      // Unknown old bytes are user-owned, even if they look like an old version.
      const upgradedSkillPath = join(dir, '.claude', 'skills', 'reverse-engineering', 'SKILL.md');
      expect(existsSync(upgradedSkillPath)).toBe(true);
      const content = readFileSync(upgradedSkillPath, 'utf8');
      expect(content).toBe('# reverse-engineering v1 (old)\n');

    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns exitCode=0 and still configures the project when the code-graph binary cannot be installed', async () => {
    // A failed `npm install -g` is recoverable by hand: the MCP config is
    // written anyway and the summary carries the command to retry.
    const dir = makeProject({ withConfig: true });
    mockedExecFile.mockImplementation(() => { throw new Error('install boom'); });
    try {
      const result = await runUpgrade({ vendorMode: 'embed', targetPath: dir, skillsRoot: BUNDLED_SKILLS_ROOT });
      expect(result.exitCode).toBe(0);
      expect(result.codeGraphReport.binary).toBe('install-failed');
      expect(result.codeGraphReport.hints.join('\n')).toContain('npm install -g codebase-memory-mcp@latest');
      expect(result.codeGraphReport.configured).toEqual(['.mcp.json', '.vscode/mcp.json']);
      expect(JSON.parse(readFileSync(join(dir, '.mcp.json'), 'utf8')).mcpServers['codebase-memory-mcp'].command).toBe('codebase-memory-mcp');
      expect(result.skillsRefreshed).toBeGreaterThan(0);
      expect(existsSync(join(dir, '.claude/skills/codebase-memory/SKILL.md'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('retires an unmodified graphify install and replaces its instruction block', async () => {
    const dir = makeProject({ withConfig: true });
    const skill = 'upstream graphify skill';
    mkdirSync(join(dir, '.claude/skills/graphify'), { recursive: true });
    writeFileSync(join(dir, '.claude/skills/graphify/SKILL.md'), skill);
    mkdirSync(join(dir, '.nonoise'), { recursive: true });
    writeFileSync(join(dir, '.nonoise/native-graphify.json'), JSON.stringify({ version: '0.9.91', platforms: { claudeCode: createHash('sha256').update(skill).digest('hex') } }));
    mkdirSync(join(dir, 'graphify-out'));
    writeFileSync(join(dir, 'CLAUDE.md'), '# Mine\n<!-- nonoise:begin v1.8.0 -->\n## graphify\nold rules\n<!-- nonoise:end -->\nPERSONAL TEXT\n');
    happyPathExec();
    try {
      const result = await runUpgrade({ targetPath: dir, skillsRoot: BUNDLED_SKILLS_ROOT });
      expect(result.exitCode).toBe(0);
      expect(result.codeGraphReport.binary).toBe('already-present');
      expect(result.removed).toEqual(expect.arrayContaining(['.claude/skills/graphify', '.nonoise/native-graphify.json']));
      expect(existsSync(join(dir, '.claude/skills/graphify'))).toBe(false);
      expect(existsSync(join(dir, 'graphify-out'))).toBe(true);
      const instructions = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
      expect(instructions).not.toContain('## graphify');
      expect(instructions).toContain('<!-- >>> codebase-memory (managed by create-nonoise) -->');
      expect(instructions).toContain('<!-- >>> development-modes (managed by create-nonoise) -->');
      expect(instructions).toContain('PERSONAL TEXT');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns exitCode=1 when an existing MCP entry had to be left alone', async () => {
    const dir = makeProject({ withConfig: true });
    const mine = JSON.stringify({ mcpServers: { 'codebase-memory-mcp': { command: 'docker', args: ['run', 'cbm'] } } });
    writeFileSync(join(dir, '.mcp.json'), mine);
    happyPathExec();
    try {
      const result = await runUpgrade({ vendorMode: 'embed', targetPath: dir, skillsRoot: BUNDLED_SKILLS_ROOT });
      expect(result.exitCode).toBe(1);
      expect(result.codeGraphReport.preserved).toEqual(['.mcp.json']);
      expect(readFileSync(join(dir, '.mcp.json'), 'utf8')).toBe(mine);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('uses --ai flag when no nonoise.config.json is present', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nonoise-upgrade-noconfig-'));
    const realRoot = BUNDLED_SKILLS_ROOT;
    happyPathExec();
    try {
      const result = await runUpgrade({ vendorMode: 'embed',
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
      const result = await runUpgrade({ vendorMode: 'embed',
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
