import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffold, defaultScaffoldPaths } from './scaffold.js';
import {
  runPrompts,
  outro,
  spinner,
  note,
  askEntryMode,
  askExistingProjectPath,
  askAiCsvForExistingProject,
  askExistingProjectAction,
} from './prompts.js';
import { printBanner } from './banner.js';
import { runGraphifyOnly } from './graphify-only.js';
import { runUpgrade } from './upgrade.js';
import type { CliFlags } from './prompts.js';
import type { TemplateName, WorkspaceKind } from './types.js';

export async function main(): Promise<void> {
  const flags = parseArgv(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    return;
  }
  if (flags.version) {
    console.log(readVersion());
    return;
  }

  // Direct CLI flag wins — no prompts, no banner.
  if (flags.upgrade) {
    await runUpgradeAndExit({ targetPath: flags.positionalDir, aiCsv: flags.ai });
    return;
  }
  if (flags.graphifyOnly) {
    runGraphifyOnlyAndExit({ targetPath: flags.positionalDir, aiCsv: flags.ai });
    return;
  }

  // Auto-detect: if a positional path is given AND it already contains a
  // NONoise project (nonoise.config.json), default to maintenance mode
  // (upgrade / graphify-only) instead of trying to scaffold over it.
  if (flags.positionalDir) {
    const candidatePath = resolve(process.cwd(), flags.positionalDir);
    if (existsSync(join(candidatePath, 'nonoise.config.json'))) {
      if (flags.yes) {
        console.error(
          `\nError: ${candidatePath} is already a NONoise project (found nonoise.config.json).\n` +
          `In non-interactive mode (--yes) we don't auto-pick a maintenance action. Either:\n` +
          `  • create-nonoise --upgrade ${flags.positionalDir}        # refresh skills + graphify\n` +
          `  • create-nonoise --graphify-only ${flags.positionalDir}  # narrow: only graphify\n` +
          `  • pick a different (non-NONoise) directory for the new scaffold`,
        );
        process.exit(1);
      }
      printBanner();
      const action = await askExistingProjectAction(candidatePath);
      if (action === 'cancel') {
        outro('Cancelled — no changes made.');
        return;
      }
      if (action === 'upgrade') {
        await runUpgradeAndExit({ targetPath: candidatePath, aiCsv: flags.ai });
      } else {
        runGraphifyOnlyAndExit({ targetPath: candidatePath, aiCsv: flags.ai });
      }
      return;
    }
  }

  printBanner();

  // Interactive top-level mode pick (skipped on --yes or with a positional dir).
  const mode = await askEntryMode(flags);
  if (mode === 'graphify-only') {
    const targetPath = await askExistingProjectPath();
    let aiCsv = flags.ai;
    if (!aiCsv && !existsSync(resolve(targetPath, 'nonoise.config.json'))) {
      aiCsv = await askAiCsvForExistingProject();
    }
    runGraphifyOnlyAndExit({ targetPath, aiCsv });
    return;
  }
  if (mode === 'upgrade') {
    const targetPath = await askExistingProjectPath();
    let aiCsv = flags.ai;
    if (!aiCsv && !existsSync(resolve(targetPath, 'nonoise.config.json'))) {
      aiCsv = await askAiCsvForExistingProject();
    }
    await runUpgradeAndExit({ targetPath, aiCsv });
    return;
  }

  try {
    const ctx = await runPrompts(flags, readVersion());
    const s = spinner();
    s.start('Creating project');
    await scaffold(ctx, defaultScaffoldPaths());
    s.stop('Project created');

    note(
      `cd ${ctx.projectName}\n# open with your AI tool of choice`,
      'Next steps',
    );
    outro('Happy coding 🚀');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${msg}`);
    process.exit(1);
  }
}

function runGraphifyOnlyAndExit(opts: { targetPath?: string; aiCsv?: string }): void {
  try {
    const result = runGraphifyOnly(opts);
    if (result.exitCode !== 0) process.exit(result.exitCode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${msg}`);
    process.exit(1);
  }
}

async function runUpgradeAndExit(opts: { targetPath?: string; aiCsv?: string }): Promise<void> {
  try {
    const result = await runUpgrade(opts);
    if (result.exitCode !== 0) process.exit(result.exitCode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${msg}`);
    process.exit(1);
  }
}

type ParsedFlags = CliFlags & {
  help?: boolean;
  version?: boolean;
  graphifyOnly?: boolean;
  upgrade?: boolean;
};

function parseArgv(args: string[]): ParsedFlags {
  const out: ParsedFlags = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i]!;
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--version' || a === '-v') out.version = true;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--no-git') out.noGit = true;
    else if (a === '--graphify-only') out.graphifyOnly = true;
    else if (a === '--upgrade') out.upgrade = true;
    else if (a === '--template') {
      const raw = args[++i];
      if (raw !== 'single-project' && raw !== 'multi-repo') {
        throw new Error(`Unknown template "${raw}". Valid: single-project | multi-repo.`);
      }
      out.template = raw as TemplateName;
    }
    else if (a === '--workspace') {
      const raw = args[++i];
      if (raw !== 'new' && raw !== 'existing-single' && raw !== 'existing-multi') {
        throw new Error(`Unknown workspace "${raw}". Valid: new | existing-single | existing-multi.`);
      }
      out.workspaceKind = raw as WorkspaceKind;
    }
    else if (a === '--ai') out.ai = args[++i];
    else if (a === '--reverse') out.reverseEngineering = true;
    else if (a === '--no-reverse') out.reverseEngineering = false;
    else if (a === '--user-name') out.userName = args[++i];
    else if (a === '--user-locale') out.userLocale = args[++i];
    else if (!a.startsWith('-') && !out.positionalDir) out.positionalDir = a;
    i++;
  }
  return out;
}

function readVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(here, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
  return pkg.version;
}

function printHelp(): void {
  console.log(`create-nonoise — SDLC bootstrapper

Usage:
  create-nonoise [directory] [options]
  create-nonoise --upgrade [path] [--ai <csv>]
  create-nonoise --graphify-only [path] [--ai <csv>]

When run with no arguments, asks interactively whether you want to:
  1. Create a new NONoise project (full scaffold)
  2. Upgrade an existing NONoise project (refresh skills + graphify)
  3. Force-install graphify only (narrow, idempotent fix)

Options:
  --workspace <kind>  Workspace: new | existing-single | existing-multi (asked interactively if omitted)
  --template <name>   Template: single-project | multi-repo (back-compat; inferred from --workspace if present)
  --ai <csv>          AI tools: claude-code,copilot,codex,cursor,gemini-cli
  --user-name <name>  Developer name (used by AI to address you; default: git user.name)
  --user-locale <iso> Language for the AI to reply in (ISO 639-1; default: OS locale)
  --reverse / --no-reverse  Enable/disable reverse-engineering config block (asked interactively if omitted; default: true for existing repos, false for new)
  --no-git            Skip git init
  --yes, -y           Use defaults, non-interactive
  --version, -v       Print version
  --help, -h          Print help

Maintenance:
  --upgrade [path]
                      Refresh an existing NONoise project to the current version:
                      re-copies all bundled skills (overwriting old SKILL.md
                      files) and re-runs the graphify install. Reads aiTools
                      from nonoise.config.json. Templates (CLAUDE.md,
                      AGENTS.md, etc.) are NOT touched — they may have local
                      customisation. Pass --ai to override AI tool selection.

  --graphify-only [path]
                      Narrow path: only re-runs the graphify install step on
                      an existing NONoise project. Use this if you only need
                      to fix the graphify CLI integration without touching
                      bundled skills.
`);
}
