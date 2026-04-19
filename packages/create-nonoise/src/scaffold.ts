import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { execFileSync, execSync } from 'node:child_process';
import type { ProjectContext, HandlebarsRenderContext, RepoEntry } from './types.js';
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
  }

  await rewriteNonoiseConfig(ctx, paths, renderCtx);

  if (ctx.template === 'multi-repo' && ctx.repos && ctx.repos.length > 0) {
    await writeRepositoriesJson(ctx.projectPath, ctx.repos);
    cloneRequestedRepos(ctx.projectPath, ctx.repos);
  }

  if (supportsPolly(ctx.aiTools)) {
    await writePollyStartMarker(ctx.projectPath);
    await writePollyInitialState(ctx.projectPath);
    await writePollyStateCli(ctx.projectPath);
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

async function writePollyInitialState(projectPath: string): Promise<void> {
  const dir = join(projectPath, '.nonoise');
  await mkdir(dir, { recursive: true });
  const now = new Date().toISOString();
  const state = {
    $schema: 'https://nonoise.dev/schemas/polly-state.v1.json',
    version: 1,
    createdAt: now,
    updatedAt: now,
    voiceHintShown: false,
    session: {
      kind: 'unknown',
      scope: null,
      currentStep: 'intro',
      mode: 'unknown',
      stack: null,
      activeArea: null,
      activeSprint: null,
      studyCounter: {},
      brownfieldCodePath: null,
    },
    handoff: null,
    phases: {
      scan:           { done: false },
      reverse:        { done: false },
      requirements:   { done: false },
      featureDesign:  { done: false },
      archBrainstorm: { done: false },
      archDecision:   { done: false },
      fpfAudit:       { done: false },
      sprint:         { done: false },
      implementation: { done: false },
      acceptance:     { done: false },
      c4:             { done: false },
      workitemExport: { done: false },
    },
    events: [
      { at: now, action: 'bootstrap', note: 'created by create-nonoise scaffold' },
    ],
  };
  await writeFile(
    join(dir, 'polly-state.json'),
    JSON.stringify(state, null, 2) + '\n',
    'utf8',
  );
}

async function writePollyStateCli(projectPath: string): Promise<void> {
  const dir = join(projectPath, '.nonoise');
  await mkdir(dir, { recursive: true });
  const body = `#!/usr/bin/env node
// Polly state inspector / resetter.
//
// Usage:
//   node .nonoise/polly-state.mjs              # print current state summary
//   node .nonoise/polly-state.mjs --json       # print raw JSON
//   node .nonoise/polly-state.mjs --reset      # archive current state, write a fresh one
//
// See .claude/skills/polly/references/state-schema.md for the schema.
import { readFile, writeFile, rename, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(HERE, 'polly-state.json');

function initialState() {
  const now = new Date().toISOString();
  return {
    $schema: 'https://nonoise.dev/schemas/polly-state.v1.json',
    version: 1,
    createdAt: now,
    updatedAt: now,
    voiceHintShown: false,
    session: {
      kind: 'unknown', scope: null, currentStep: 'intro', mode: 'unknown',
      stack: null, activeArea: null, activeSprint: null,
      studyCounter: {}, brownfieldCodePath: null,
    },
    handoff: null,
    phases: {
      scan: { done: false }, reverse: { done: false },
      requirements: { done: false }, featureDesign: { done: false },
      archBrainstorm: { done: false }, archDecision: { done: false },
      fpfAudit: { done: false }, sprint: { done: false },
      implementation: { done: false }, acceptance: { done: false },
      c4: { done: false }, workitemExport: { done: false },
    },
    events: [{ at: now, action: 'bootstrap', note: 'reset via polly-state.mjs --reset' }],
  };
}

async function load() {
  try {
    const raw = await readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function summarize(s) {
  const done = Object.entries(s.phases)
    .filter(([, v]) => v && v.done)
    .map(([k]) => k);
  const pending = Object.entries(s.phases)
    .filter(([, v]) => !v || !v.done)
    .map(([k]) => k);
  const lines = [
    \`Polly state v\${s.version} — updated \${s.updatedAt}\`,
    '',
    \`  kind:         \${s.session.kind}\`,
    \`  scope:        \${s.session.scope ?? '(n/a)'}\`,
    \`  currentStep:  \${s.session.currentStep}\`,
    \`  mode:         \${s.session.mode}\`,
    \`  stack:        \${s.session.stack ?? '(n/a)'}\`,
    \`  activeArea:   \${s.session.activeArea ?? '(n/a)'}\`,
    \`  activeSprint: \${s.session.activeSprint ?? '(n/a)'}\`,
    '',
    \`  handoff:      \${s.handoff ? s.handoff.skill + ' → ' + s.handoff.returnTo : '(none)'}\`,
    '',
    \`  phases done:    \${done.join(', ') || '(none)'}\`,
    \`  phases pending: \${pending.join(', ')}\`,
    '',
    \`  voiceHintShown: \${s.voiceHintShown}\`,
    \`  events:         \${s.events?.length ?? 0} entries (last: \${s.events?.at(-1)?.action ?? 'none'})\`,
  ];
  return lines.join('\\n');
}

async function main() {
  const args = new Set(process.argv.slice(2));

  if (args.has('--reset')) {
    const exists = await stat(STATE_PATH).then(() => true).catch(() => false);
    if (exists) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const archived = resolve(HERE, \`polly-state.archived-\${ts}.json\`);
      await rename(STATE_PATH, archived);
      console.log(\`Archived previous state → \${archived}\`);
    }
    await writeFile(STATE_PATH, JSON.stringify(initialState(), null, 2) + '\\n', 'utf8');
    console.log('Wrote fresh polly-state.json. Next /polly starts from intro.');
    return;
  }

  const state = await load();
  if (!state) {
    console.log('No polly-state.json found. Run create-nonoise or /polly to bootstrap.');
    process.exit(1);
  }
  if (args.has('--json')) {
    console.log(JSON.stringify(state, null, 2));
    return;
  }
  console.log(summarize(state));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
`;
  await writeFile(join(dir, 'polly-state.mjs'), body, 'utf8');
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
