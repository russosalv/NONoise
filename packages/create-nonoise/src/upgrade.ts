import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSkills, installVendor } from './skill-installer.js';
import { installGraphify, formatReport, type InstallReport } from './graphify-install.js';
import type { AiTools, AiToolKey } from './types.js';
import { FLAG_TO_AI_TOOL } from './types.js';

const MVP_SKILL_BUNDLE = [
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
  'arch-sync',
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

export type UpgradeOptions = {
  /** Target project directory. Defaults to process.cwd(). */
  targetPath?: string;
  /** CSV of AI tool flags — overrides values from nonoise.config.json. */
  aiCsv?: string;
  /**
   * Override the path where bundled skills are read from. Defaults to the
   * `skills/` directory shipped alongside the create-nonoise CLI (resolved
   * from this module's `__dirname`).
   */
  skillsRoot?: string;
};

export type UpgradeResult = {
  targetPath: string;
  aiTools: AiTools;
  source: 'config' | 'flag' | 'merged';
  skillsRefreshed: number;
  vendorPacksRefreshed: string[];
  graphifyReport: InstallReport;
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

function defaultSkillsRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..', 'skills');
}

/**
 * Re-runs the post-scaffold parts that need to stay in sync with the
 * shipped create-nonoise version: bundled skills + graphify integration.
 * Templates (CLAUDE.md, AGENTS.md, etc.) are left alone — they are
 * project-customised after scaffold and would clobber user edits.
 */
export async function runUpgrade(opts: UpgradeOptions): Promise<UpgradeResult> {
  const targetPath = resolve(opts.targetPath ?? process.cwd());
  const fromConfig = readAiToolsFromConfig(targetPath);
  const fromFlag = opts.aiCsv !== undefined ? parseAiCsv(opts.aiCsv) : undefined;

  let aiTools: AiTools;
  let source: UpgradeResult['source'];
  if (fromFlag && fromConfig) {
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
      `  • pass the target path: create-nonoise --upgrade <path>, or\n` +
      `  • specify AI tools manually: create-nonoise --upgrade --ai claude-code,copilot`,
    );
  }

  if (!anyToolEnabled(aiTools)) {
    throw new Error(
      `No AI tools enabled — upgrade would have nothing to install.\n` +
      `Pass --ai claude-code (and/or copilot) to opt in.`,
    );
  }

  console.log(`[upgrade] target:    ${targetPath}`);
  console.log(`[upgrade] aiTools:   from ${source} → ` +
    `claude=${aiTools.claudeCode} copilot=${aiTools.copilot}`);
  console.log(`[upgrade] mode:      refresh bundled skills (overwrite) + re-install graphify`);

  const skillsRoot = opts.skillsRoot ?? defaultSkillsRoot();

  // Step 1 — refresh MVP skill bundle (overwrite=true so updated SKILL.md
  // files reach existing projects).
  await installSkills({
    skillsRoot,
    projectPath: targetPath,
    skillNames: Array.from(MVP_SKILL_BUNDLE),
    overwrite: true,
  });

  // Step 2 — refresh vendor packs (superpowers, impeccable). Same flag.
  const vendorPacksRefreshed: string[] = [];
  for (const namespace of ['superpowers', 'impeccable'] as const) {
    const vendorSourcePath = join(skillsRoot, 'vendor', namespace);
    if (!existsSync(vendorSourcePath)) continue;
    await installVendor({
      vendorSourcePath,
      projectPath: targetPath,
      namespace,
      installClaudeSpecific: aiTools.claudeCode,
      overwrite: true,
    });
    vendorPacksRefreshed.push(namespace);
  }

  console.log(
    `[upgrade] skills:    ${MVP_SKILL_BUNDLE.length} bundled skill(s) refreshed, ` +
    `${vendorPacksRefreshed.length} vendor pack(s) refreshed (${vendorPacksRefreshed.join(', ') || 'none'})`,
  );

  // Step 3 — re-install graphify integration with the latest CLI version.
  const graphifyReport = installGraphify({
    projectPath: targetPath,
    claudeCode: aiTools.claudeCode,
    copilot: aiTools.copilot,
  });
  console.log('\n[upgrade] graphify install summary:\n' + formatReport(graphifyReport) + '\n');

  const failed =
    graphifyReport.graphifyy === 'install-failed' ||
    graphifyReport.claudeHook === 'failed' ||
    graphifyReport.copilotHook === 'failed';

  return {
    targetPath,
    aiTools,
    source,
    skillsRefreshed: MVP_SKILL_BUNDLE.length,
    vendorPacksRefreshed,
    graphifyReport,
    exitCode: failed ? 1 : 0,
  };
}
