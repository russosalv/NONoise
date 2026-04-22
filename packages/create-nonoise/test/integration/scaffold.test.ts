import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffold } from '../../src/scaffold.js';
import type { ProjectContext } from '../../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const TEMPLATES_ROOT = join(REPO_ROOT, 'packages', 'templates');
const SKILLS_ROOT = join(REPO_ROOT, 'packages', 'skills');

describe('scaffold() integration', () => {
  let parent: string;
  let projectPath: string;

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-int-'));
    projectPath = join(parent, 'my-app');
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  function buildCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
    return {
      projectName: 'my-app',
      projectPath,
      template: 'single-project',
      workspaceKind: 'new',
      aiTools: {
        claudeCode: true,
        copilot: true,
        codex: false,
        cursor: false,
        geminiCli: false,
      },
      gitInit: false,
      frameworkVersion: '0.1.0',
      ...overrides,
    };
  }

  it('generates AGENTS.md for any combination of AI tools', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const agents = await readFile(join(projectPath, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('my-app');
  });

  it('generates CLAUDE.md when claudeCode is true', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const claude = await readFile(join(projectPath, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('Claude Code context');
  });

  it('does NOT generate CLAUDE.md when claudeCode is false', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(stat(join(projectPath, 'CLAUDE.md'))).rejects.toThrow();
  });

  it('installs the MVP skill bundle when claudeCode is true', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const expected = [
      'vscode-config-generator',
      'docs-md-generator',
      'playwright-cli',
      'frontend-design',
      'skill-finder',
      'design-md-generator',
      'bmad-advanced-elicitation',
      'bmad-agent-analyst',
      'bmad-agent-architect',
      'bmad-agent-tech-writer',
      'bmad-agent-ux-designer',
      'quint-fpf',
      'arch-brainstorm',
      'arch-decision',
      'sprint-manifest',
      'atr',
      'reverse-engineering',
      'requirements-ingest',
      'spec-to-workitem',
      'ops-skill-builder',
      'observability-debug',
      'polly',
      'c4-doc-writer',
    ];
    for (const name of expected) {
      const content = await readFile(
        join(projectPath, '.claude', 'skills', name, 'SKILL.md'),
        'utf8',
      );
      expect(content).toContain(name);
    }
  });

  it('installs skills when Copilot-only (no claudeCode) — cross-tool install', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const g = await readFile(
      join(projectPath, '.claude', 'skills', 'vscode-config-generator', 'SKILL.md'),
      'utf8',
    );
    expect(g).toContain('vscode-config-generator');
  });

  it('does NOT install skills when zero AI tools are selected', async () => {
    await scaffold(buildCtx({ aiTools: buildAi() }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(
      stat(join(projectPath, '.claude', 'skills', 'vscode-config-generator')),
    ).rejects.toThrow();
  });

  it('records the full skill bundle in nonoise.config.json', async () => {
    await scaffold(buildCtx(), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const raw = await readFile(join(projectPath, 'nonoise.config.json'), 'utf8');
    const cfg = JSON.parse(raw) as { skills: string[] };
    expect(cfg.skills).toContain('bmad-agent-analyst');
    expect(cfg.skills).toContain('skill-finder');
    expect(cfg.skills).toContain('design-md-generator');
  });

  it('produces valid nonoise.config.json with accurate aiTools booleans', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true, cursor: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const raw = await readFile(join(projectPath, 'nonoise.config.json'), 'utf8');
    const cfg = JSON.parse(raw) as { aiTools: Record<string, boolean> };
    expect(cfg.aiTools.claudeCode).toBe(true);
    expect(cfg.aiTools.cursor).toBe(true);
    expect(cfg.aiTools.copilot).toBe(false);
  });

  it('renders no leftover handlebars placeholders', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const files = ['AGENTS.md', 'README.md', 'CLAUDE.md', 'nonoise.config.json'];
    for (const f of files) {
      const content = await readFile(join(projectPath, f), 'utf8');
      expect(content, `${f} contains unrendered {{...}}`).not.toMatch(/\{\{[^}]+\}\}/);
    }
  });
});

function buildAi(overrides: Partial<ProjectContext['aiTools']> = {}): ProjectContext['aiTools'] {
  return {
    claudeCode: false,
    copilot: false,
    codex: false,
    cursor: false,
    geminiCli: false,
    ...overrides,
  };
}

describe('scaffold() — Polly & superpowers wiring', () => {
  let parent: string;
  let projectPath: string;

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-polly-'));
    projectPath = join(parent, 'my-app');
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  function buildCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
    return {
      projectName: 'my-app',
      projectPath,
      template: 'single-project',
      workspaceKind: 'new',
      aiTools: {
        claudeCode: true,
        copilot: true,
        codex: false,
        cursor: false,
        geminiCli: false,
      },
      gitInit: false,
      frameworkVersion: '0.1.0',
      ...overrides,
    };
  }

  it('does NOT write .nonoise/polly-state.json (Polly v2 is stateless)', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(stat(join(projectPath, '.nonoise', 'polly-state.json'))).rejects.toThrow();
  });

  it('does NOT write .nonoise/polly-state.mjs (Polly v2 is stateless)', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(stat(join(projectPath, '.nonoise', 'polly-state.mjs'))).rejects.toThrow();
  });

  it('does NOT write polly-state.json or polly-state.mjs for any AI tool selection', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ cursor: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(stat(join(projectPath, '.nonoise', 'polly-state.json'))).rejects.toThrow();
    await expect(stat(join(projectPath, '.nonoise', 'polly-state.mjs'))).rejects.toThrow();
  });

  it('does NOT write .nonoise/POLLY_START.md when Claude is selected (Polly v2 has no auto-trigger)', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(
      stat(join(projectPath, '.nonoise', 'POLLY_START.md')),
    ).rejects.toThrow();
  });

  it('does NOT write .nonoise/POLLY_START.md when only Copilot is selected (Polly v2 has no auto-trigger)', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(
      stat(join(projectPath, '.nonoise', 'POLLY_START.md')),
    ).rejects.toThrow();
  });

  it('does NOT write POLLY_START.md when zero AI tools are selected', async () => {
    await scaffold(buildCtx({ aiTools: buildAi() }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(
      stat(join(projectPath, '.nonoise', 'POLLY_START.md')),
    ).rejects.toThrow();
  });

  it('does NOT write POLLY_START.md when only non-Polly tools are selected (cursor only)', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ cursor: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(
      stat(join(projectPath, '.nonoise', 'POLLY_START.md')),
    ).rejects.toThrow();
  });

  it('injects the polly block into CLAUDE.md when Claude is selected', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const claude = await readFile(join(projectPath, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('<!-- >>> polly (managed by polly skill) -->');
    // NOTE: scaffold.ts no longer writes .nonoise/POLLY_START.md (Task 1 in the
    // Polly advisor redesign), but the context-file templates still reference it.
    // The template cleanup lands in Task 3 of that plan; these assertions track
    // current behaviour until then.
    expect(claude).toContain('.nonoise/POLLY_START.md');
  });

  it('injects the polly block into .github/copilot-instructions.md when Copilot is selected', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const copilot = await readFile(
      join(projectPath, '.github', 'copilot-instructions.md'),
      'utf8',
    );
    expect(copilot).toContain('<!-- >>> polly (managed by polly skill) -->');
    expect(copilot).toContain('.nonoise/POLLY_START.md');
  });

  it('creates .claude/commands/polly.md when Claude is selected', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const cmd = await readFile(
      join(projectPath, '.claude', 'commands', 'polly.md'),
      'utf8',
    );
    expect(cmd).toContain('polly');
  });

  it('does NOT create .claude/commands/polly.md when only Copilot is selected', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(
      stat(join(projectPath, '.claude', 'commands', 'polly.md')),
    ).rejects.toThrow();
  });

  it('does not write Polly state-machinery files (POLLY_START.md, polly-state.json, polly-state.mjs, or schemas/)', async () => {
    const ctx = buildCtx({ aiTools: buildAi({ claudeCode: true, copilot: true }) });
    await scaffold(ctx, { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    for (const f of ['POLLY_START.md', 'polly-state.json', 'polly-state.mjs']) {
      const p = join(projectPath, '.nonoise', f);
      expect(existsSync(p), `${f} should not exist after scaffold`).toBe(false);
    }
    const schemasDir = join(projectPath, '.nonoise', 'schemas');
    expect(existsSync(schemasDir), 'schemas/ dir should not exist after scaffold').toBe(false);
  });

  it('installs polly SKILL when only Copilot is selected (cross-tool)', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const skill = await readFile(
      join(projectPath, '.claude', 'skills', 'polly', 'SKILL.md'),
      'utf8',
    );
    expect(skill).toContain('polly');
  });

  it('installs vendored superpowers skill for Copilot-only but NOT the Claude-only commands', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const spSkill = await readFile(
      join(projectPath, '.claude', 'skills', 'superpowers', 'brainstorming', 'SKILL.md'),
      'utf8',
    );
    expect(spSkill.length).toBeGreaterThan(0);
    await expect(
      stat(join(projectPath, '.claude', 'commands', 'superpowers', 'brainstorm.md')),
    ).rejects.toThrow();
  });

  it('installs vendored superpowers skills+commands+agents+hooks when Claude is selected', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const subtrees = ['skills', 'commands', 'agents', 'hooks'];
    for (const sub of subtrees) {
      const s = await stat(join(projectPath, '.claude', sub, 'superpowers'));
      expect(s.isDirectory(), `.claude/${sub}/superpowers should be a directory`).toBe(true);
    }
  });
});

describe('scaffold() — multi-repo template', () => {
  let parent: string;
  let projectPath: string;

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-multirepo-'));
    projectPath = join(parent, 'my-workspace');
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  function buildCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
    return {
      projectName: 'my-workspace',
      projectPath,
      template: 'multi-repo',
      workspaceKind: 'existing-multi',
      aiTools: {
        claudeCode: true,
        copilot: true,
        codex: false,
        cursor: false,
        geminiCli: false,
      },
      gitInit: false,
      frameworkVersion: '0.1.0',
      ...overrides,
    };
  }

  it('produces repositories.json at workspace root', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const raw = await readFile(join(projectPath, 'repositories.json'), 'utf8');
    const cfg = JSON.parse(raw) as { repositories: unknown[]; version: string };
    expect(Array.isArray(cfg.repositories)).toBe(true);
    expect(cfg.version).toBeDefined();
  });

  it('creates repos/ folder with .gitkeep', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const s = await stat(join(projectPath, 'repos', '.gitkeep'));
    expect(s.isFile()).toBe(true);
  });

  it('ships all 6 scripts (ps1 + sh for clone-all, switch-branch, pull-all)', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const scripts = [
      'clone-all.ps1', 'clone-all.sh',
      'switch-branch.ps1', 'switch-branch.sh',
      'pull-all.ps1', 'pull-all.sh',
    ];
    for (const name of scripts) {
      const s = await stat(join(projectPath, 'scripts', name));
      expect(s.isFile(), `scripts/${name} should exist`).toBe(true);
    }
  });

  it('AGENTS.md flags the project as a multi-repo workspace', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const agents = await readFile(join(projectPath, 'AGENTS.md'), 'utf8');
    expect(agents.toLowerCase()).toContain('multi-repo');
  });

  it('nonoise.config.json carries the "workspace": "multi-repo" marker', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const raw = await readFile(join(projectPath, 'nonoise.config.json'), 'utf8');
    const cfg = JSON.parse(raw) as { workspace?: string };
    expect(cfg.workspace).toBe('multi-repo');
  });

  it('.gitignore ignores repos/*/ but keeps .gitkeep', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const gi = await readFile(join(projectPath, '.gitignore'), 'utf8');
    expect(gi).toMatch(/repos\/\*\//);
    expect(gi).toMatch(/!repos\/\.gitkeep/);
  });

  it('still installs the full MVP skill bundle at workspace root', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const polly = await readFile(join(projectPath, '.claude', 'skills', 'polly', 'SKILL.md'), 'utf8');
    expect(polly).toContain('polly');
  });

  it('single-project template does NOT produce repositories.json', async () => {
    await scaffold(buildCtx({ template: 'single-project', workspaceKind: 'new' }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(stat(join(projectPath, 'repositories.json'))).rejects.toThrow();
  });

  it('multi-repo template does NOT create a workspace-level src/ folder', async () => {
    // Multi-repo workspaces host code inside repos/<name>/; a root src/ is noise.
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    await expect(stat(join(projectPath, 'src'))).rejects.toThrow();
  });

  it('single-project template does NOT create a repos/ folder', async () => {
    // Symmetric regression: new/single-project must not inherit multi-repo infra.
    await scaffold(buildCtx({ template: 'single-project', workspaceKind: 'new' }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(stat(join(projectPath, 'repos'))).rejects.toThrow();
  });
});

describe('scaffold() — workspace kinds (new / existing-single / existing-multi)', () => {
  let parent: string;
  let projectPath: string;

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-workspace-'));
    projectPath = join(parent, 'ws');
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  function buildCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
    return {
      projectName: 'ws',
      projectPath,
      template: 'single-project',
      workspaceKind: 'new',
      aiTools: buildAi({ claudeCode: true }),
      gitInit: false,
      frameworkVersion: '0.1.0',
      ...overrides,
    };
  }

  it('existing-multi with user-provided repos writes them into repositories.json', async () => {
    await scaffold(
      buildCtx({
        template: 'multi-repo',
        workspaceKind: 'existing-multi',
        multiRepoConfigured: true,
        repos: [
          { name: 'api', url: 'https://github.com/acme/api.git', path: 'backend/api', branch: 'main' },
          { name: 'web', url: 'https://github.com/acme/web.git', path: 'frontend/web' },
        ],
      }),
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );
    const raw = await readFile(join(projectPath, 'repositories.json'), 'utf8');
    const cfg = JSON.parse(raw) as { repositories: Array<{ name: string; url: string; path: string; branch?: string; status?: string }> };
    expect(cfg.repositories.map((r) => r.name)).toEqual(['api', 'web']);
    expect(cfg.repositories[0]!.url).toBe('https://github.com/acme/api.git');
    expect(cfg.repositories[0]!.branch).toBe('main');
    expect(cfg.repositories[1]!.path).toBe('frontend/web');
    expect(cfg.repositories[0]!.status).toBe('active');
  });

  it('existing-multi with multiRepoConfigured=true writes that marker to nonoise.config.json', async () => {
    await scaffold(
      buildCtx({
        template: 'multi-repo',
        workspaceKind: 'existing-multi',
        multiRepoConfigured: true,
        repos: [{ name: 'api', url: 'https://github.com/acme/api.git', path: 'api' }],
      }),
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );
    const cfg = JSON.parse(
      await readFile(join(projectPath, 'nonoise.config.json'), 'utf8'),
    ) as { multiRepo?: { configured?: boolean } };
    expect(cfg.multiRepo?.configured).toBe(true);
  });

  it('existing-multi when user skips leaves multiRepo.configured=false and placeholder repositories.json', async () => {
    await scaffold(
      buildCtx({
        template: 'multi-repo',
        workspaceKind: 'existing-multi',
        multiRepoConfigured: false,
      }),
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );
    const cfg = JSON.parse(
      await readFile(join(projectPath, 'nonoise.config.json'), 'utf8'),
    ) as { multiRepo?: { configured?: boolean } };
    expect(cfg.multiRepo?.configured).toBe(false);

    // When skipped, repositories.json still ships as the placeholder template
    const repos = JSON.parse(
      await readFile(join(projectPath, 'repositories.json'), 'utf8'),
    ) as { repositories: unknown[] };
    expect(Array.isArray(repos.repositories)).toBe(true);
  });

  it('existing-single scaffolds single-project layout into a pre-existing non-empty dir without throwing', async () => {
    // Pre-create the target dir with some files
    await (await import('node:fs/promises')).mkdir(projectPath, { recursive: true });
    await (await import('node:fs/promises')).writeFile(
      join(projectPath, 'existing-src.ts'),
      '// pre-existing user code\n',
      'utf8',
    );

    await scaffold(
      buildCtx({ template: 'single-project', workspaceKind: 'existing-single' }),
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );

    // Pre-existing file is preserved
    const preserved = await readFile(join(projectPath, 'existing-src.ts'), 'utf8');
    expect(preserved).toContain('pre-existing user code');

    // Template layer landed on top
    const agents = await readFile(join(projectPath, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('ws');
  });

  it('new kind with the same non-empty dir is allowed (scaffold does not guard) — prompts.ts is the guard', async () => {
    // Document current behavior: scaffold() itself doesn't reject non-empty dirs.
    // The interactive layer (prompts.ts) is responsible for that UX check.
    await (await import('node:fs/promises')).mkdir(projectPath, { recursive: true });
    await (await import('node:fs/promises')).writeFile(
      join(projectPath, 'x.txt'),
      'hi',
      'utf8',
    );
    await expect(
      scaffold(buildCtx({ workspaceKind: 'new' }), {
        templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
      }),
    ).resolves.not.toThrow();
  });

  it('existing-single uses the multi-repo template (repos/, .gitignore, scripts)', async () => {
    await scaffold(
      buildCtx({
        template: 'multi-repo',
        workspaceKind: 'existing-single',
        multiRepoConfigured: true,
        repos: [{ name: 'app', url: 'https://example.com/o/app.git', path: 'app', branch: 'main' }],
      }),
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );
    // gitignore from multi-repo template must ignore repos/*/
    const gi = await readFile(join(projectPath, '.gitignore'), 'utf8');
    expect(gi).toMatch(/repos\/\*\//);
    expect(gi).toMatch(/!repos\/\.gitkeep/);
    // repositories.json has the single entry
    const cfg = JSON.parse(await readFile(join(projectPath, 'repositories.json'), 'utf8')) as {
      repositories: Array<{ name: string }>;
    };
    expect(cfg.repositories.map((r) => r.name)).toEqual(['app']);
  });

  it('user block is injected into CLAUDE.md and copilot-instructions.md when user is set', async () => {
    await scaffold(
      buildCtx({
        aiTools: buildAi({ claudeCode: true, copilot: true }),
        user: { name: 'Alessandro', locale: 'it', localeLabel: 'Italian (Italiano)' },
      }),
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );
    const claude = await readFile(join(projectPath, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('<!-- >>> user (managed by create-nonoise) -->');
    expect(claude).toContain('The developer\'s name is **Alessandro**');
    expect(claude).toContain('Italian (Italiano)');
    expect(claude).toContain('`it`');

    const copilot = await readFile(join(projectPath, '.github', 'copilot-instructions.md'), 'utf8');
    expect(copilot).toContain('<!-- >>> user (managed by create-nonoise) -->');
    expect(copilot).toContain('Alessandro');

    const agents = await readFile(join(projectPath, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('<!-- >>> user (managed by create-nonoise) -->');
  });

  it('user block is absent when user is not set', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const claude = await readFile(join(projectPath, 'CLAUDE.md'), 'utf8');
    expect(claude).not.toContain('<!-- >>> user');
    const agents = await readFile(join(projectPath, 'AGENTS.md'), 'utf8');
    expect(agents).not.toContain('<!-- >>> user');
  });

  it('nonoise.config.json contains user.name and user.locale when user is set', async () => {
    await scaffold(
      buildCtx({
        user: { name: 'Alessandro', locale: 'it', localeLabel: 'Italian (Italiano)' },
      }),
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );
    const cfg = JSON.parse(await readFile(join(projectPath, 'nonoise.config.json'), 'utf8')) as {
      user?: { name?: string; locale?: string };
    };
    expect(cfg.user?.name).toBe('Alessandro');
    expect(cfg.user?.locale).toBe('it');
  });

  it('nonoise.config.json omits "user" block when user is not set', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const cfg = JSON.parse(await readFile(join(projectPath, 'nonoise.config.json'), 'utf8')) as {
      user?: unknown;
    };
    expect(cfg.user).toBeUndefined();
  });

  it('cloneNow=true on a repo entry clones into <projectPath>/repos/<path>/', async () => {
    // Build a local bare repo to clone from (avoids network in tests)
    const fs = await import('node:fs/promises');
    const { execFileSync } = await import('node:child_process');
    const bare = join(parent, 'upstream.git');
    const seedSrc = join(parent, 'seed');
    await fs.mkdir(seedSrc, { recursive: true });
    await fs.writeFile(join(seedSrc, 'UPSTREAM.md'), '# upstream seed\n', 'utf8');
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: seedSrc });
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '.'], { cwd: seedSrc });
    execFileSync(
      'git',
      ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'seed'],
      { cwd: seedSrc },
    );
    execFileSync('git', ['clone', '-q', '--bare', seedSrc, bare]);

    await scaffold(
      buildCtx({
        template: 'multi-repo',
        workspaceKind: 'existing-single',
        multiRepoConfigured: true,
        repos: [{ name: 'app', url: bare, path: 'app', branch: 'main', cloneNow: true }],
      }),
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );

    // Upstream content landed under repos/app/
    const upstream = await readFile(join(projectPath, 'repos', 'app', 'UPSTREAM.md'), 'utf8');
    expect(upstream).toContain('upstream seed');
    // Sub-repo .git is there (it's its own repo)
    await expect(stat(join(projectPath, 'repos', 'app', '.git'))).resolves.toBeTruthy();
    // Workspace root is NOT the sub-repo — NONoise files live here unchanged
    const agents = await readFile(join(projectPath, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('ws');
  }, 30_000);
});
