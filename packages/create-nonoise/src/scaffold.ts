import { installHaft } from './haft.js';
import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { execFileSync, execSync } from 'node:child_process';
import type { ProjectContext, HandlebarsRenderContext, RepoEntry } from './types.js';
import { resolveTemplateFiles } from './template-resolver.js';
import { installSkills, installVendor, nonoiseSkillDirs } from './skill-installer.js';
import { toPascalCase, toSnakeCase } from './handlebars-helpers.js';
import { installGraphify, formatReport } from './graphify-install.js';
import { configureEmbedPlugins, configureNativeVendors, installNativeVendors } from './native-vendor.js';
import { updateManagedFiles } from './managed-block.js';
import { MVP_SKILL_BUNDLE } from './skill-bundle.js';

function hasAnyAiTool(aiTools: ProjectContext['aiTools']): boolean {
  return (
    aiTools.claudeCode ||
    aiTools.copilot ||
    aiTools.cursor ||
    aiTools.geminiCli ||
    aiTools.codex
  );
}


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
    for (const targetDir of nonoiseSkillDirs(ctx.aiTools)) {
      await installSkills({
        skillsRoot: paths.skillsRoot,
        projectPath: ctx.projectPath,
        skillNames: Array.from(MVP_SKILL_BUNDLE),
        targetDir,
      });
    }
    if (ctx.vendorMode === 'embed') {
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
      for (const name of ['pptx', 'skill-creator']) {
        await installSkills({ skillsRoot: join(paths.skillsRoot, 'vendor'), projectPath: ctx.projectPath, skillNames: [name] });
      }
      configureEmbedPlugins(ctx.projectPath, ctx.aiTools);
    } else {
      configureNativeVendors(ctx.projectPath, ctx.aiTools);
      if (paths.runGraphifyInstall) installNativeVendors(ctx.projectPath, ctx.aiTools);
    }
  }

  await rewriteNonoiseConfig(ctx, paths, renderCtx);
  await updateManagedFiles(ctx, paths.templatesRoot);

  if (ctx.template === 'multi-repo' && ctx.repos && ctx.repos.length > 0) {
    await writeRepositoriesJson(ctx.projectPath, ctx.repos);
    cloneRequestedRepos(ctx.projectPath, ctx.repos);
  }

  if (paths.runGraphifyInstall && hasAnyAiTool(ctx.aiTools)) {
    const report = installGraphify({
      projectPath: ctx.projectPath,
      bundledSkillsRoot: paths.skillsRoot,
      vendorMode: ctx.vendorMode ?? 'native',
      claudeCode: ctx.aiTools.claudeCode,
      copilot: ctx.aiTools.copilot,
      codex: ctx.aiTools.codex,
      cursor: ctx.aiTools.cursor,
      geminiCli: ctx.aiTools.geminiCli,
    });
    console.log('\n[graphify] install summary:\n' + formatReport(report) + '\n');
  }

  if (ctx.gitInit) {
    runGitInit(ctx.projectPath);
  }
  if (paths.runGraphifyInstall && hasAnyAiTool(ctx.aiTools)) {
    const haft = await installHaft(ctx.projectPath, ctx.aiTools);
    // Haft needs a commit before `haft init`; record its files in a second commit of the repo we created.
    if (ctx.gitInit && haft.ok) runGitCommit(ctx.projectPath, 'chore: initialize Haft via create-nonoise');
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
  const config = JSON.parse(rendered);
  config.vendorMode = ctx.vendorMode ?? 'native';
  config.skills = [...MVP_SKILL_BUNDLE];
  await writeFile(destPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
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

function runGitCommit(cwd: string, message: string): void {
  try {
    execSync('git add -A', { cwd, stdio: 'ignore' });
    if (execSync('git status --porcelain', { cwd }).toString().trim() === '') return;
    execSync(`git commit -m ${JSON.stringify(message)}`, { cwd, stdio: 'ignore' });
  } catch {
    // Best-effort, like runGitInit.
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
