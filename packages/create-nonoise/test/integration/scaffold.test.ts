import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
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
      'graphify-setup',
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
      join(projectPath, '.claude', 'skills', 'graphify-setup', 'SKILL.md'),
      'utf8',
    );
    expect(g).toContain('graphify-setup');
  });

  it('does NOT install skills when zero AI tools are selected', async () => {
    await scaffold(buildCtx({ aiTools: buildAi() }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(
      stat(join(projectPath, '.claude', 'skills', 'graphify-setup')),
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
