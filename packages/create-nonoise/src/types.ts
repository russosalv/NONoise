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
};

export type ExistingRepoConfig = {
  url?: string;
  branch?: string;
  cloneNow?: boolean;
  configured: boolean;
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
  existingRepo?: ExistingRepoConfig;
};

export type HandlebarsRenderContext = ProjectContext & {
  projectNamePascal: string;
  projectNameSnake: string;
  year: string;
  createdAt: string;
};

export function templateForWorkspace(kind: WorkspaceKind): TemplateName {
  return kind === 'existing-multi' ? 'multi-repo' : 'single-project';
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
