export type AiToolKey =
  | 'claudeCode'
  | 'copilot'
  | 'codex'
  | 'cursor'
  | 'geminiCli';

export type AiTools = Record<AiToolKey, boolean>;

export type TemplateName = 'single-project' | 'multi-repo';

export type WorkspaceKind = 'new' | 'existing-single' | 'existing-multi';

export type RepoEntry = {
  name: string;
  url: string;
  path: string;
  branch?: string;
  cloneNow?: boolean;
};

export type UserConfig = {
  name?: string;
  locale?: string;       // ISO 639-1 code (en, it, es, …)
  localeLabel?: string;  // Human label (English, Italian, …) — optional, used for prose
};

export type ProjectContext = {
  projectName: string;
  projectPath: string;
  template: TemplateName;
  workspaceKind: WorkspaceKind;
  aiTools: AiTools;
  gitInit: boolean;
  frameworkVersion: string;
  repos?: RepoEntry[];
  multiRepoConfigured?: boolean;
  user?: UserConfig;
  reverseEngineering?: boolean;
};

export type HandlebarsRenderContext = ProjectContext & {
  projectNamePascal: string;
  projectNameSnake: string;
  year: string;
  createdAt: string;
};

export function templateForWorkspace(kind: WorkspaceKind): TemplateName {
  // Both existing-* workspaces wrap one-or-more repos under repos/ and need
  // the same gitignore + scripts, so they share the multi-repo template.
  return kind === 'new' ? 'single-project' : 'multi-repo';
}

export const AI_TOOL_TO_FLAG: Record<AiToolKey, string> = {
  claudeCode: 'claude-code',
  copilot: 'copilot',
  codex: 'codex',
  cursor: 'cursor',
  geminiCli: 'gemini-cli',
};

export const FLAG_TO_AI_TOOL: Record<string, AiToolKey> = Object.fromEntries(
  Object.entries(AI_TOOL_TO_FLAG).map(([k, v]) => [v, k as AiToolKey])
) as Record<string, AiToolKey>;
