import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { installCodebaseMemory, formatReport, type CbmReport, type Runner } from './codebase-memory.js';
import type { AiTools, AiToolKey } from './types.js';
import { FLAG_TO_AI_TOOL } from './types.js';

export type CodeGraphOnlyOptions = {
  /** Target project directory. Defaults to process.cwd(). */
  targetPath?: string;
  /** CSV of AI tool flags (claude-code,copilot,…) — overrides values from nonoise.config.json. */
  aiCsv?: string;
  /** Injected in tests; defaults to a real process runner. */
  runner?: Runner;
};

export type CodeGraphOnlyResult = {
  targetPath: string;
  aiTools: AiTools;
  source: 'config' | 'flag' | 'merged';
  report: CbmReport;
  exitCode: number;
};

const EMPTY_AI_TOOLS: AiTools = {
  claudeCode: false,
  copilot: false,
  codex: false,
  cursor: false,
  geminiCli: false,
};

function readAiToolsFromConfig(targetPath: string): AiTools | undefined {
  const configPath = resolve(targetPath, 'nonoise.config.json');
  if (!existsSync(configPath)) return undefined;
  try {
    const raw = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { aiTools?: Partial<AiTools> };
    if (!parsed.aiTools) return undefined;
    return {
      claudeCode: Boolean(parsed.aiTools.claudeCode),
      copilot: Boolean(parsed.aiTools.copilot),
      codex: Boolean(parsed.aiTools.codex),
      cursor: Boolean(parsed.aiTools.cursor),
      geminiCli: Boolean(parsed.aiTools.geminiCli),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not parse nonoise.config.json at ${configPath}: ${msg}\n` +
      `Pass --ai <csv> to override (e.g. --ai claude-code,copilot).`,
    );
  }
}

function parseAiCsv(csv: string): AiTools {
  const out: AiTools = { ...EMPTY_AI_TOOLS };
  const tokens = csv.split(',').map((s) => s.trim()).filter(Boolean);
  const unknown: string[] = [];
  for (const tok of tokens) {
    const key = FLAG_TO_AI_TOOL[tok];
    if (key) out[key as AiToolKey] = true;
    else unknown.push(tok);
  }
  if (unknown.length > 0) {
    const valid = Object.keys(FLAG_TO_AI_TOOL).join(', ');
    throw new Error(
      `Unknown AI tool flag(s): ${unknown.join(', ')}. Valid: ${valid}.`,
    );
  }
  return out;
}

function anyToolEnabled(t: AiTools): boolean {
  return t.claudeCode || t.copilot || t.codex || t.cursor || t.geminiCli;
}

/**
 * Runs only the code-graph step on an existing NONoise project: installs or
 * updates the codebase-memory-mcp binary to its latest release, registers its MCP server for the selected
 * AI tools and retires the graphify integration earlier versions installed.
 * Reads aiTools from nonoise.config.json (or accepts --ai override).
 */
export function runCodeGraphOnly(opts: CodeGraphOnlyOptions): CodeGraphOnlyResult {
  const targetPath = resolve(opts.targetPath ?? process.cwd());
  const fromConfig = readAiToolsFromConfig(targetPath);
  const fromFlag = opts.aiCsv !== undefined ? parseAiCsv(opts.aiCsv) : undefined;

  let aiTools: AiTools;
  let source: CodeGraphOnlyResult['source'];
  if (fromFlag && fromConfig) {
    // Flag wins on every key it asserts; but keep config tools the user already had.
    aiTools = {
      claudeCode: fromFlag.claudeCode || fromConfig.claudeCode,
      copilot: fromFlag.copilot || fromConfig.copilot,
      codex: fromFlag.codex || fromConfig.codex,
      cursor: fromFlag.cursor || fromConfig.cursor,
      geminiCli: fromFlag.geminiCli || fromConfig.geminiCli,
    };
    source = 'merged';
  } else if (fromFlag) {
    aiTools = fromFlag;
    source = 'flag';
  } else if (fromConfig) {
    aiTools = fromConfig;
    source = 'config';
  } else {
    throw new Error(
      `No nonoise.config.json found at ${targetPath} and no --ai flag provided.\n` +
      `Either:\n` +
      `  • cd into a NONoise project and re-run, or\n` +
      `  • pass the target path: create-nonoise --code-graph-only <path>, or\n` +
      `  • specify AI tools manually: create-nonoise --code-graph-only --ai claude-code,copilot`,
    );
  }

  if (!anyToolEnabled(aiTools)) {
    throw new Error(
      `No AI tools enabled — the code graph would have nothing to wire up.\n` +
      `Pass --ai claude-code (and/or copilot) to opt in.`,
    );
  }

  console.log(`[code-graph] target:    ${targetPath}`);
  console.log(`[code-graph] aiTools:   from ${source} → ` +
    `claude=${aiTools.claudeCode} copilot=${aiTools.copilot} ` +
    `codex=${aiTools.codex} cursor=${aiTools.cursor} gemini=${aiTools.geminiCli}`);

  const report = installCodebaseMemory({ projectPath: targetPath, aiTools, mode: 'update', runner: opts.runner });
  console.log('\n[code-graph] codebase-memory-mcp summary:\n' + formatReport(report) + '\n');

  // The binary is recoverable by hand (the summary prints the command); a
  // config file NONoise could not write is the only hard failure.
  return { targetPath, aiTools, source, report, exitCode: report.preserved.length ? 1 : 0 };
}
