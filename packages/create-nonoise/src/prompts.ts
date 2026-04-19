import { intro, outro, text, select, multiselect, confirm, isCancel, cancel, spinner, note } from '@clack/prompts';
import { resolve } from 'node:path';
import type { AiToolKey, AiTools, ProjectContext, TemplateName } from './types.js';

export type CliFlags = {
  positionalDir?: string;
  template?: TemplateName;
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
  const template = await askTemplate(flags);
  const aiTools = await askAiTools(flags);
  const gitInit = flags.noGit === true ? false : flags.yes === true ? true : await askGitInit();

  return {
    projectName: name,
    projectPath: resolve(process.cwd(), name),
    template,
    aiTools,
    gitInit,
    frameworkVersion,
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

async function askTemplate(flags: CliFlags): Promise<TemplateName> {
  if (flags.template) return flags.template;
  if (flags.yes) return 'single-project';

  const answer = await select({
    message: 'What are you setting up?',
    options: [
      {
        value: 'single-project' as TemplateName,
        label: 'New project (single repo)',
        hint: 'Scaffold a fresh project from scratch',
      },
      {
        value: 'multi-repo' as TemplateName,
        label: 'Existing multi-repo workspace',
        hint: 'Wrap one or more existing repos with NONoise',
      },
    ],
    initialValue: 'single-project' as TemplateName,
  });
  abortIfCancel(answer);
  return answer as TemplateName;
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

async function askGitInit(): Promise<boolean> {
  const answer = await confirm({ message: 'Initialize a git repository?', initialValue: true });
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
