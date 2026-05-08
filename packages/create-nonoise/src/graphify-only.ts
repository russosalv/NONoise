import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { installGraphify, formatReport } from './graphify-install.js';
import type { AiTools, AiToolKey } from './types.js';
import { FLAG_TO_AI_TOOL } from './types.js';

export type GraphifyOnlyOptions = {
  /** Target project directory. Defaults to process.cwd(). */
  targetPath?: string;
  /** CSV of AI tool flags (claude-code,copilot,…) — overrides values from nonoise.config.json. */
  aiCsv?: string;
};

export type GraphifyOnlyResult = {
  targetPath: string;
  aiTools: AiTools;
  source: 'config' | 'flag' | 'merged';
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
 * Runs only the graphify install step on an existing NONoise project.
 * Reads aiTools from nonoise.config.json (or accepts --ai override) and
 * delegates to installGraphify so the CLAUDE / Copilot integrations get
 * (re)installed against the new graphify CLI.
 */
export function runGraphifyOnly(opts: GraphifyOnlyOptions): GraphifyOnlyResult {
  const targetPath = resolve(opts.targetPath ?? process.cwd());
  const fromConfig = readAiToolsFromConfig(targetPath);
  const fromFlag = opts.aiCsv !== undefined ? parseAiCsv(opts.aiCsv) : undefined;

  let aiTools: AiTools;
  let source: GraphifyOnlyResult['source'];
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
      `  • pass the target path: create-nonoise --graphify-only <path>, or\n` +
      `  • specify AI tools manually: create-nonoise --graphify-only --ai claude-code,copilot`,
    );
  }

  if (!anyToolEnabled(aiTools)) {
    throw new Error(
      `No AI tools enabled — graphify install would have nothing to wire up.\n` +
      `Pass --ai claude-code (and/or copilot) to opt in.`,
    );
  }

  console.log(`[graphify] target:    ${targetPath}`);
  console.log(`[graphify] aiTools:   from ${source} → ` +
    `claude=${aiTools.claudeCode} copilot=${aiTools.copilot}`);

  const report = installGraphify({
    projectPath: targetPath,
    claudeCode: aiTools.claudeCode,
    copilot: aiTools.copilot,
  });

  console.log('\n[graphify] install summary:\n' + formatReport(report) + '\n');

  const failed =
    report.graphifyy === 'install-failed' ||
    report.claudeHook === 'failed' ||
    report.copilotHook === 'failed';

  return {
    targetPath,
    aiTools,
    source,
    exitCode: failed ? 1 : 0,
  };
}
