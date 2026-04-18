export type AiToolKey =
  | 'claudeCode'
  | 'copilot'
  | 'codex'
  | 'cursor'
  | 'geminiCli';

export type AiTools = Record<AiToolKey, boolean>;

export type TemplateName = 'single-project';

export type ProjectContext = {
  projectName: string;
  projectPath: string;
  template: TemplateName;
  aiTools: AiTools;
  gitInit: boolean;
  frameworkVersion: string;
  installBmad: boolean;
};

export type HandlebarsRenderContext = ProjectContext & {
  projectNamePascal: string;
  projectNameSnake: string;
  year: string;
  createdAt: string;
  bmadInstalled: boolean;
  bmadInstallError: string | null;
};

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
