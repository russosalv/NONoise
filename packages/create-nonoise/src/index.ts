import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffold, defaultScaffoldPaths } from './scaffold.js';
import { runPrompts, outro, spinner, note } from './prompts.js';
import { printBanner } from './banner.js';
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

  printBanner();

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

type ParsedFlags = CliFlags & { help?: boolean; version?: boolean };

function parseArgv(args: string[]): ParsedFlags {
  const out: ParsedFlags = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i]!;
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--version' || a === '-v') out.version = true;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--no-git') out.noGit = true;
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

Options:
  --workspace <kind>  Workspace: new | existing-single | existing-multi (asked interactively if omitted)
  --template <name>   Template: single-project | multi-repo (back-compat; inferred from --workspace if present)
  --ai <csv>          AI tools: claude-code,copilot,codex,cursor,gemini-cli
  --user-name <name>  Developer name (used by AI to address you; default: git user.name)
  --user-locale <iso> Language for the AI to reply in (ISO 639-1; default: OS locale)
  --no-git            Skip git init
  --yes, -y           Use defaults, non-interactive
  --version, -v       Print version
  --help, -h          Print help
`);
}
