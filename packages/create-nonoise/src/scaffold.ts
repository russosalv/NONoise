import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { execSync } from 'node:child_process';
import type { ProjectContext, HandlebarsRenderContext } from './types.js';
import { resolveTemplateFiles } from './template-resolver.js';
import { installSkills } from './skill-installer.js';
import { toPascalCase, toSnakeCase } from './handlebars-helpers.js';

const MVP_SKILL_BUNDLE = [
  'graphify-gitignore',
  'vscode-config-generator',
  'docs-md-generator',
] as const;

export type ScaffoldPaths = {
  templatesRoot: string;
  skillsRoot: string;
};

export async function scaffold(ctx: ProjectContext, paths: ScaffoldPaths): Promise<void> {
  const templateDir = join(paths.templatesRoot, ctx.template);

  const resolved = await resolveTemplateFiles(templateDir, ctx.aiTools);
  const renderCtx: HandlebarsRenderContext = {
    ...ctx,
    projectNamePascal: toPascalCase(ctx.projectName),
    projectNameSnake: toSnakeCase(ctx.projectName),
    year: new Date().getFullYear().toString(),
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

  if (ctx.aiTools.claudeCode) {
    await installSkills({
      skillsRoot: paths.skillsRoot,
      projectPath: ctx.projectPath,
      skillNames: Array.from(MVP_SKILL_BUNDLE),
    });
  }

  if (ctx.gitInit) {
    runGitInit(ctx.projectPath);
  }
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
