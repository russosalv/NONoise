import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { execSync } from 'node:child_process';
import type { ProjectContext, HandlebarsRenderContext } from './types.js';
import { resolveTemplateFiles } from './template-resolver.js';
import { installSkills, installVendor } from './skill-installer.js';
import { toPascalCase, toSnakeCase } from './handlebars-helpers.js';

function hasAnyAiTool(aiTools: ProjectContext['aiTools']): boolean {
  return (
    aiTools.claudeCode ||
    aiTools.copilot ||
    aiTools.cursor ||
    aiTools.geminiCli ||
    aiTools.codex
  );
}

function supportsPolly(aiTools: ProjectContext['aiTools']): boolean {
  return aiTools.claudeCode || aiTools.copilot;
}

const MVP_SKILL_BUNDLE = [
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
  'c4-doc-writer',
] as const;

export type ScaffoldPaths = {
  templatesRoot: string;
  skillsRoot: string;
  runGraphifyInstall?: boolean;
};

export async function scaffold(ctx: ProjectContext, paths: ScaffoldPaths): Promise<void> {
  const templateDir = join(paths.templatesRoot, ctx.template);

  const resolved = await resolveTemplateFiles(templateDir, ctx.aiTools);
  const now = new Date();
  const renderCtx: HandlebarsRenderContext = {
    ...ctx,
    projectNamePascal: toPascalCase(ctx.projectName),
    projectNameSnake: toSnakeCase(ctx.projectName),
    year: now.getFullYear().toString(),
    createdAt: now.toISOString(),
  };

  for (const file of resolved) {
    const destAbs = join(ctx.projectPath, nativePath(file.destPath));
    await mkdir(dirname(destAbs), { recursive: true });

    if (file.isTemplate) {
      const src = await readFile(file.sourcePath, 'utf8');
      const tpl = Handlebars.compile(src, { noEscape: true });
      const rendered = tpl(renderCtx);
      await writeFile(destAbs, rendered, 'utf8');
    } else {
      await cp(file.sourcePath, destAbs);
    }
  }

  if (hasAnyAiTool(ctx.aiTools)) {
    await installSkills({
      skillsRoot: paths.skillsRoot,
      projectPath: ctx.projectPath,
      skillNames: Array.from(MVP_SKILL_BUNDLE),
    });
    await installVendor({
      vendorSourcePath: join(paths.skillsRoot, 'vendor', 'superpowers'),
      projectPath: ctx.projectPath,
      namespace: 'superpowers',
      installClaudeSpecific: ctx.aiTools.claudeCode,
    });
  }

  await rewriteNonoiseConfig(ctx, paths, renderCtx);

  if (supportsPolly(ctx.aiTools)) {
    await writePollyStartMarker(ctx.projectPath);
  }

  if (paths.runGraphifyInstall && hasAnyAiTool(ctx.aiTools)) {
    runGraphifyInstall();
  }

  if (ctx.gitInit) {
    runGitInit(ctx.projectPath);
  }
}

async function writePollyStartMarker(projectPath: string): Promise<void> {
  const dir = join(projectPath, '.nonoise');
  await mkdir(dir, { recursive: true });
  const body =
    '# Polly auto-trigger marker\n' +
    '\n' +
    'This file is a one-shot marker written by `create-nonoise`. On the next AI\n' +
    'session, the tool will read its context file (`CLAUDE.md` or\n' +
    '`.github/copilot-instructions.md`), see the `## polly` block, invoke the\n' +
    '`polly` skill, and delete this file.\n' +
    '\n' +
    'Delete this file manually if you do NOT want Polly to auto-trigger.\n';
  await writeFile(join(dir, 'POLLY_START.md'), body, 'utf8');
}

async function rewriteNonoiseConfig(
  ctx: ProjectContext,
  paths: ScaffoldPaths,
  renderCtx: HandlebarsRenderContext,
): Promise<void> {
  const templatePath = join(
    paths.templatesRoot,
    ctx.template,
    '_always',
    'nonoise.config.json.hbs',
  );
  const src = await readFile(templatePath, 'utf8');
  const tpl = Handlebars.compile(src, { noEscape: true });
  const rendered = tpl(renderCtx);
  const destPath = join(ctx.projectPath, 'nonoise.config.json');
  await writeFile(destPath, rendered, 'utf8');
}

function nativePath(p: string): string {
  return p.split(posix.sep).join(sep);
}

function runGraphifyInstall(): void {
  const pythonCmd = detectPython();
  if (!pythonCmd) {
    console.log(
      '\n[graphify] Python >= 3.10 not found — skipping install. Run manually:\n  pip install graphifyy && graphify install\n',
    );
    return;
  }

  const pipInstall = `${pythonCmd} -m pip install --upgrade graphifyy`;
  try {
    execSync(pipInstall, { stdio: 'ignore' });
  } catch {
    console.log(
      `\n[graphify] "${pipInstall}" failed — skipping. Run manually when ready.\n`,
    );
    return;
  }

  try {
    execSync('graphify install', { stdio: 'ignore' });
  } catch {
    console.log(
      '\n[graphify] "graphify install" failed — skipping. Run manually when ready.\n',
    );
  }
}

function detectPython(): string | null {
  for (const cmd of ['python3', 'python']) {
    try {
      const out = execSync(`${cmd} --version`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      const m = out.match(/Python\s+(\d+)\.(\d+)/);
      if (m && (Number(m[1]) > 3 || (Number(m[1]) === 3 && Number(m[2]) >= 10))) {
        return cmd;
      }
    } catch {
      // try next
    }
  }
  return null;
}

function runGitInit(cwd: string): void {
  try {
    execSync('git init -b main', { cwd, stdio: 'ignore' });
    execSync('git add .', { cwd, stdio: 'ignore' });
    execSync('git commit -m "chore: initial scaffold via create-nonoise"', {
      cwd,
      stdio: 'ignore',
    });
  } catch {
    // Best-effort: if git isn't configured, skip silently.
  }
}

export function defaultScaffoldPaths(): ScaffoldPaths {
  const here = dirname(fileURLToPath(import.meta.url));
  return {
    templatesRoot: join(here, '..', 'templates'),
    skillsRoot: join(here, '..', 'skills'),
    runGraphifyInstall: true,
  };
}
