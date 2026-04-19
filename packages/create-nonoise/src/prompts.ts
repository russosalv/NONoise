import { intro, outro, text, select, multiselect, confirm, isCancel, cancel, spinner, note } from '@clack/prompts';
import { resolve } from 'node:path';
import type {
  AiToolKey,
  AiTools,
  ProjectContext,
  RepoEntry,
  TemplateName,
  WorkspaceKind,
} from './types.js';
import { templateForWorkspace } from './types.js';

export type CliFlags = {
  positionalDir?: string;
  template?: TemplateName;
  workspaceKind?: WorkspaceKind;
  ai?: string;              // csv
  noGit?: boolean;
  yes?: boolean;
};

const DEFAULT_AI_TOOLS: AiTools = {
  claudeCode: true,
  copilot: true,
  codex: false,
  cursor: false,
  geminiCli: false,
};

export async function runPrompts(flags: CliFlags, frameworkVersion: string): Promise<ProjectContext> {
  intro('create-nonoise • SDLC bootstrapper');

  const name = await askProjectName(flags);
  const workspaceKind = await askWorkspaceKind(flags);
  const template = templateForWorkspace(workspaceKind);
  const aiTools = await askAiTools(flags);

  let repos: RepoEntry[] | undefined;
  let multiRepoConfigured: boolean | undefined;
  if (workspaceKind === 'existing-multi') {
    const collected = await askRepos(flags);
    repos = collected.repos;
    multiRepoConfigured = collected.configured;
  } else if (workspaceKind === 'existing-single') {
    const single = await askSingleRepo(flags);
    repos = single.repo ? [single.repo] : undefined;
    multiRepoConfigured = single.configured;
  }

  const gitInit = await askGitInit(flags, workspaceKind, repos);

  return {
    projectName: name,
    projectPath: resolve(process.cwd(), name),
    template,
    workspaceKind,
    aiTools,
    gitInit,
    frameworkVersion,
    repos,
    multiRepoConfigured,
  };
}

async function askProjectName(flags: CliFlags): Promise<string> {
  if (flags.positionalDir) {
    validateProjectName(flags.positionalDir);
    return flags.positionalDir;
  }
  const answer = await text({
    message: 'Project name',
    placeholder: 'my-app',
    validate(value) {
      try {
        validateProjectName(value);
      } catch (e) {
        return (e as Error).message;
      }
    },
  });
  abortIfCancel(answer);
  return answer as string;
}

function validateProjectName(name: string): void {
  if (!name || name.trim().length === 0) throw new Error('Project name cannot be empty.');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
    throw new Error('Use kebab-case: lowercase letters, digits, and single hyphens.');
  }
  if (name.length > 214) throw new Error('Project name is too long (max 214 chars).');
}

async function askWorkspaceKind(flags: CliFlags): Promise<WorkspaceKind> {
  if (flags.workspaceKind) return flags.workspaceKind;
  // Back-compat: if --template was passed explicitly, infer kind
  if (flags.template === 'multi-repo') return 'existing-multi';
  if (flags.template === 'single-project') return 'new';
  if (flags.yes) return 'new';

  const answer = await select({
    message: 'What are you setting up?',
    options: [
      {
        value: 'new' as WorkspaceKind,
        label: 'New project (single repo)',
        hint: 'Scaffold a fresh project from scratch',
      },
      {
        value: 'existing-single' as WorkspaceKind,
        label: 'Existing single repo (mono-repo, app, library…)',
        hint: 'Layer NONoise on top of an existing repo',
      },
      {
        value: 'existing-multi' as WorkspaceKind,
        label: 'Existing multi-repo workspace',
        hint: 'Orchestrate multiple existing repos under one workspace',
      },
    ],
    initialValue: 'new' as WorkspaceKind,
  });
  abortIfCancel(answer);
  return answer as WorkspaceKind;
}

async function askAiTools(flags: CliFlags): Promise<AiTools> {
  if (flags.ai !== undefined) return parseAiCsv(flags.ai);
  if (flags.yes) return DEFAULT_AI_TOOLS;

  const selected = await multiselect({
    message: 'Which AI tools do you use? (space to toggle, enter to confirm)',
    options: [
      { value: 'claudeCode' as AiToolKey, label: 'Claude Code' },
      { value: 'copilot' as AiToolKey, label: 'GitHub Copilot' },
      { value: 'codex' as AiToolKey, label: 'OpenAI Codex' },
      { value: 'cursor' as AiToolKey, label: 'Cursor' },
      { value: 'geminiCli' as AiToolKey, label: 'Gemini CLI' },
    ],
    initialValues: ['claudeCode', 'copilot'] as AiToolKey[],
    required: false,
  });
  abortIfCancel(selected);

  const keys = selected as AiToolKey[];
  return {
    claudeCode: keys.includes('claudeCode'),
    copilot: keys.includes('copilot'),
    codex: keys.includes('codex'),
    cursor: keys.includes('cursor'),
    geminiCli: keys.includes('geminiCli'),
  };
}

function parseAiCsv(csv: string): AiTools {
  const set = new Set(csv.split(',').map((s) => s.trim()).filter(Boolean));
  return {
    claudeCode: set.has('claude-code'),
    copilot: set.has('copilot'),
    codex: set.has('codex'),
    cursor: set.has('cursor'),
    geminiCli: set.has('gemini-cli'),
  };
}

async function askRepos(
  flags: CliFlags,
): Promise<{ repos: RepoEntry[] | undefined; configured: boolean }> {
  // Non-interactive: skip. Polly (or manual edit of repositories.json) finishes the job.
  if (flags.yes) return { repos: undefined, configured: false };

  type ReposChoice = 'add' | 'skip';
  const start = await select({
    message: 'Configure sub-repos now?',
    options: [
      { value: 'add' as ReposChoice, label: 'Yes — add entries interactively' },
      { value: 'skip' as ReposChoice, label: 'Skip — I\'ll do it later (or let Polly help)' },
    ],
    initialValue: 'add' as ReposChoice,
  });
  abortIfCancel(start);
  if (start === 'skip') return { repos: undefined, configured: false };

  const repos: RepoEntry[] = [];
  // Loop until user says "done"
  while (true) {
    const name = await text({
      message: `Repo #${repos.length + 1} — short name (kebab-case)`,
      placeholder: 'api-service',
      validate(value) {
        if (!value) return 'Name is required.';
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)) {
          return 'Use kebab-case: lowercase letters, digits, single hyphens.';
        }
      },
    });
    abortIfCancel(name);

    const url = await text({
      message: 'Git URL',
      placeholder: 'https://github.com/your-org/api-service.git',
      validate(value) {
        if (!value) return 'URL is required.';
        if (!/^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/.test(value)) {
          return 'Expected https://, git@, ssh:// or git:// URL.';
        }
      },
    });
    abortIfCancel(url);

    const path = await text({
      message: 'Target path under repos/',
      placeholder: `backend/${name as string}`,
      initialValue: `${name as string}`,
      validate(value) {
        if (!value) return 'Path is required.';
        if (value.startsWith('/') || value.includes('..')) {
          return 'Path must be relative and must not contain "..".';
        }
      },
    });
    abortIfCancel(path);

    const branch = await text({
      message: 'Branch',
      placeholder: 'main',
      initialValue: 'main',
    });
    abortIfCancel(branch);

    repos.push({
      name: name as string,
      url: url as string,
      path: path as string,
      branch: (branch as string) || 'main',
    });

    const more = await confirm({ message: 'Add another repo?', initialValue: false });
    abortIfCancel(more);
    if (!more) break;
  }

  return { repos, configured: repos.length > 0 };
}

async function askSingleRepo(
  flags: CliFlags,
): Promise<{ repo: RepoEntry | undefined; configured: boolean }> {
  if (flags.yes) return { repo: undefined, configured: false };

  type Choice = 'clone' | 'skip';
  const start = await select({
    message: 'Existing repo: point to it now?',
    options: [
      { value: 'clone' as Choice, label: 'Yes — point to it (and optionally clone now)' },
      { value: 'skip' as Choice, label: 'Skip — I\'ll set it up later (or let Polly help)' },
    ],
    initialValue: 'clone' as Choice,
  });
  abortIfCancel(start);
  if (start === 'skip') return { repo: undefined, configured: false };

  const url = await text({
    message: 'Git URL',
    placeholder: 'https://github.com/your-org/your-repo.git',
    validate(value) {
      if (!value) return 'URL is required (or choose Skip above).';
      if (!/^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/.test(value)) {
        return 'Expected https://, git@, ssh:// or git:// URL.';
      }
    },
  });
  abortIfCancel(url);

  const defaultName = deriveRepoNameFromUrl(url as string);
  const name = await text({
    message: 'Short name (kebab-case, used as folder under repos/)',
    placeholder: defaultName,
    initialValue: defaultName,
    validate(value) {
      if (!value) return 'Name is required.';
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(value)) {
        return 'Use kebab-case: lowercase letters, digits, single hyphens.';
      }
    },
  });
  abortIfCancel(name);

  const branch = await text({
    message: 'Branch',
    placeholder: 'main',
    initialValue: 'main',
  });
  abortIfCancel(branch);

  const cloneNow = await confirm({
    message: `Clone it now into repos/${name as string}/?`,
    initialValue: true,
  });
  abortIfCancel(cloneNow);

  return {
    repo: {
      name: name as string,
      url: url as string,
      path: name as string,
      branch: (branch as string) || 'main',
      cloneNow: cloneNow as boolean,
    },
    configured: true,
  };
}

function deriveRepoNameFromUrl(url: string): string {
  const last = url.split('/').pop() ?? '';
  const stripped = last.replace(/\.git$/i, '');
  // Normalize to kebab-case best-effort; fall back to 'repo' if empty.
  const kebab = stripped
    .replace(/[A-Z]+/g, (m, i: number) => (i === 0 ? m.toLowerCase() : '-' + m.toLowerCase()))
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return kebab || 'repo';
}

async function askGitInit(
  flags: CliFlags,
  workspaceKind: WorkspaceKind,
  repos: RepoEntry[] | undefined,
): Promise<boolean> {
  if (flags.noGit === true) return false;
  if (flags.yes === true) return workspaceKind === 'new';

  const existing = workspaceKind !== 'new';
  const hasClones = repos?.some((r) => r.cloneNow) === true;
  const answer = await confirm({
    message: existing
      ? `Initialize a git repository at the workspace root?${hasClones ? ' (cloned sub-repos already have their own .git)' : ''}`
      : 'Initialize a git repository?',
    initialValue: !existing,
  });
  abortIfCancel(answer);
  return answer as boolean;
}

function abortIfCancel(value: unknown): void {
  if (isCancel(value)) {
    cancel('Aborted.');
    process.exit(130);
  }
}

export { outro, spinner, note };
