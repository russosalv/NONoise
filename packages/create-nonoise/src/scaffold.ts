import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { execSync } from 'node:child_process';
import type { ProjectContext, HandlebarsRenderContext } from './types.js';
import { resolveTemplateFiles } from './template-resolver.js';
import { installSkills } from './skill-installer.js';
import { toPascalCase, toSnakeCase } from './handlebars-helpers.js';
import { runBmadInstall } from './bmad-runner.js';
import { filterBmadSkills } from './bmad-filter.js';

function hasAnyAiTool(aiTools: ProjectContext['aiTools']): boolean {
  return (
    aiTools.claudeCode ||
    aiTools.copilot ||
    aiTools.cursor ||
    aiTools.geminiCli ||
    aiTools.codex
  );
}

const MVP_SKILL_BUNDLE = [
  'graphify-gitignore',
  'vscode-config-generator',
  'docs-md-generator',
  'playwright-cli',
  'frontend-design',
] as const;

export type ScaffoldPaths = {
  templatesRoot: string;
  skillsRoot: string;
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
    bmadInstalled: false,
    bmadInstallError: null,
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
  }

  let bmadInstalled = false;
  let bmadInstallError: string | null = null;
  if (ctx.installBmad) {
    const result = await runBmadInstall(ctx.projectPath);
    if (result.ok) {
      await filterBmadSkills(ctx.projectPath);
      bmadInstalled = true;
    } else {
      bmadInstallError = result.error;
    }
  }

  await rewriteNonoiseConfig(ctx, paths, {
    ...renderCtx,
    bmadInstalled,
    bmadInstallError,
  });

  if (ctx.gitInit) {
    runGitInit(ctx.projectPath);
  }
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
  };
}
