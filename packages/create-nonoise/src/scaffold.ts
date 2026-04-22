import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { execFileSync, execSync } from 'node:child_process';
import type { ProjectContext, HandlebarsRenderContext, RepoEntry } from './types.js';
import { resolveTemplateFiles } from './template-resolver.js';
import { installSkills, installVendor } from './skill-installer.js';
import { toPascalCase, toSnakeCase } from './handlebars-helpers.js';
import { installGraphify, formatReport } from './graphify-install.js';

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
  'arch-sync',
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
    // For multi-repo, normalize the marker so the config template always has a bool.
    multiRepoConfigured:
      ctx.template === 'multi-repo'
        ? ctx.multiRepoConfigured === true
        : ctx.multiRepoConfigured,
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
      await cp(file.sourcePath, destAbs, { force: true });
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
    await installVendor({
      vendorSourcePath: join(paths.skillsRoot, 'vendor', 'impeccable'),
      projectPath: ctx.projectPath,
      namespace: 'impeccable',
      installClaudeSpecific: ctx.aiTools.claudeCode,
    });
  }

  await rewriteNonoiseConfig(ctx, paths, renderCtx);

  if (ctx.template === 'multi-repo' && ctx.repos && ctx.repos.length > 0) {
    await writeRepositoriesJson(ctx.projectPath, ctx.repos);
    cloneRequestedRepos(ctx.projectPath, ctx.repos);
  }

  if (paths.runGraphifyInstall && hasAnyAiTool(ctx.aiTools)) {
    const report = installGraphify({ copilot: ctx.aiTools.copilot });
    console.log('\n[graphify] install summary:\n' + formatReport(report) + '\n');
  }

  if (ctx.gitInit) {
    runGitInit(ctx.projectPath);
  }
}

async function writeRepositoriesJson(projectPath: string, repos: RepoEntry[]): Promise<void> {
  const payload = {
    $schema: 'https://nonoise.dev/schemas/repositories.v1.json',
    description:
      'Sub-repository configuration for this NONoise multi-repo workspace. Update entries and run ./scripts/clone-all.(sh|ps1)',
    version: '1.0.0',
    repositories: repos.map((r) => ({
      name: r.name,
      url: r.url,
      path: r.path,
      branch: r.branch ?? 'main',
      description: '',
      category: 'any',
      language: 'any',
      status: 'active',
    })),
    notes: [
      "'path' is relative to repos/ — scripts prepend repos/ automatically",
      "'status' can be: active, inactive, deprecated, archived — scripts process active only",
    ],
  };
  await writeFile(
    join(projectPath, 'repositories.json'),
    JSON.stringify(payload, null, 2) + '\n',
    'utf8',
  );
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


function cloneRequestedRepos(workspaceRoot: string, repos: RepoEntry[]): void {
  for (const r of repos) {
    if (!r.cloneNow) continue;
    const dest = join(workspaceRoot, 'repos', nativePath(r.path));
    cloneRepo(r.url, r.branch, dest);
  }
}

function cloneRepo(url: string, branch: string | undefined, dest: string): void {
  const args = ['clone'];
  if (branch) args.push('-b', branch);
  args.push(url, dest);
  try {
    execFileSync('git', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    const err = e as { stderr?: Buffer | string; code?: string; message?: string };
    const stderr = err.stderr
      ? (typeof err.stderr === 'string' ? err.stderr : err.stderr.toString())
      : '';
    const hint =
      err.code === 'ENOENT'
        ? '\nHint: "git" was not found on PATH. Install Git and retry.'
        : '';
    const detail = stderr.trim() || err.message || '(no output captured)';
    throw new Error(
      `git clone failed for ${url} → ${dest}\n--- git stderr ---\n${detail}\n------------------${hint}`,
    );
  }
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
