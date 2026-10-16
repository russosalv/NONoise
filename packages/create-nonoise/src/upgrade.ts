import { installEcc, parseStack } from './ecc.js';
import { migrateQuint } from './quint-migration.js';
import { installHaft } from './haft.js';
import { configureEmbedPlugins, configureNativeVendors, installNativeVendors } from './native-vendor.js';
import { migrateLegacyVendors } from './vendor-migration.js';
import { updateManagedFiles } from './managed-block.js';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSkills, installVendor, nonoiseSkillDirs, removeRetiredSkills } from './skill-installer.js';
import { installGraphify, formatReport, type InstallReport } from './graphify-install.js';
import type { AiTools, AiToolKey } from './types.js';
import { FLAG_TO_AI_TOOL } from './types.js';
import { parseProfile, resolveProfile } from './profiles.js';
import { installHooks } from './hooks.js';
import { configureRea, installRea } from './rea.js';

export type UpgradeOptions = {
  profile?: string;
  withRea?: boolean;
  stack?: string;
  vendorMode?: 'native' | 'embed';
  templatesRoot?: string;
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
  removed: string[];
  preserved: string[];
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
 * Instruction files refresh only their managed block; custom prose is preserved.
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
    `claude=${aiTools.claudeCode} copilot=${aiTools.copilot} ` +
    `codex=${aiTools.codex} cursor=${aiTools.cursor} gemini=${aiTools.geminiCli}`);
  console.log(`[upgrade] mode:      refresh owned skills + ECC assets + re-install graphify`);

  const skillsRoot = opts.skillsRoot ?? defaultSkillsRoot();

  const configPath = join(targetPath, 'nonoise.config.json');
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
  const vendorMode = opts.vendorMode ?? config.vendorMode ?? 'native';
  const profile = parseProfile(opts.profile ?? config.profile);
  const legacyProfileCompatibility = opts.profile === undefined && (config.legacyProfileCompatibility === true || config.profile === undefined);
  const stack = parseStack(opts.stack ?? (config.stack ?? []).join(','));
  const selected = resolveProfile(skillsRoot, profile, stack, { withRea: opts.withRea ?? config.withRea, legacy: legacyProfileCompatibility });
  if (selected.rea && !(aiTools.claudeCode || aiTools.codex || aiTools.copilot)) throw new Error('REA requires Claude Code, Codex or Copilot as a selected host.');
  const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  // Profile-less 1.6/1.7 projects are an additive migration: even retired files remain.
  const preserveLegacyFiles = legacyProfileCompatibility && (config.legacyProfileCompatibility === true || /^1\.[67]\./.test(String(config.frameworkVersion)));
  const migration = !preserveLegacyFiles && config.vendorMigrationVersion !== 1 && config.vendorMode !== 'native' && Boolean(config.frameworkVersion)
    ? await migrateLegacyVendors(targetPath) : { removed: [], preserved: [] };
  const quintMigration = preserveLegacyFiles ? { removed: [], preserved: [] } : await migrateQuint(targetPath);
  migration.removed.push(...quintMigration.removed);
  migration.preserved.push(...quintMigration.preserved);
  const protectedPaths = [...new Set<string>([...(config.preservedVendorFiles ?? []), ...migration.preserved])];
  for (const file of migration.removed) console.log(`[upgrade] removed: ${file}`);
  for (const file of migration.preserved) console.log(`[upgrade] preserved user file: ${file}`);

  // Step 1 — refresh MVP skill bundle (overwrite=true so updated SKILL.md
  // files reach existing projects).
  for (const targetDir of nonoiseSkillDirs(aiTools)) {
    await installSkills({
      skillsRoot,
      projectPath: targetPath,
      skillNames: [...selected.nativeSkills],
      overwrite: true,
      targetDir,
      managed: true,
    });
  }
  const retired = preserveLegacyFiles ? { removed: [], preserved: [] } : await removeRetiredSkills(targetPath);
  migration.removed.push(...retired.removed);
  migration.preserved.push(...retired.preserved);
  for (const file of retired.removed) console.log(`[upgrade] removed retired skill: ${file}`);
  for (const file of retired.preserved) console.log(`[upgrade] preserved modified retired skill: ${file} (codex-delegate is replaced by the codex@openai-codex plugin)`);

  // Step 2 — refresh vendor packs (superpowers, impeccable). Same flag.
  const vendorPacksRefreshed: string[] = [];
  for (const namespace of (selected.vendors && vendorMode === 'embed' ? ['superpowers', 'impeccable'] : [])) {
    const vendorSourcePath = join(skillsRoot, 'vendor', namespace);
    if (!existsSync(vendorSourcePath)) continue;
    await installVendor({
      vendorSourcePath,
      projectPath: targetPath,
      namespace,
      managed: true,
      installClaudeSpecific: aiTools.claudeCode,
      overwrite: true,
    });
    vendorPacksRefreshed.push(namespace);
  }

  if (selected.vendors && vendorMode === 'embed') {
    await installSkills({ skillsRoot: join(skillsRoot, 'vendor'), projectPath: targetPath, skillNames: ['pptx', 'skill-creator'], overwrite: true, managed: true });
    configureEmbedPlugins(targetPath, aiTools);
  } else if (selected.vendors) {
    configureNativeVendors(targetPath, aiTools);
    installNativeVendors(targetPath, aiTools, protectedPaths);
  }
  const ecc = installEcc(skillsRoot, targetPath, aiTools, stack, selected.ecc, opts.stack === undefined && opts.profile === undefined);
  const hooks = installHooks(skillsRoot, targetPath, aiTools, selected.hooks);
  migration.preserved.push(...hooks.preserved);
  if (selected.rea) {
    const configured = configureRea(targetPath, aiTools);
    const installed = installRea(skillsRoot, targetPath, aiTools);
    migration.preserved.push(...configured.preserved, ...installed.preserved);
    for (const file of [...configured.preserved, ...installed.preserved]) console.log(`[rea] preserved conflicting user file: ${file}`);
  }
  migration.preserved.push(...ecc.preserved);
  for (const file of ecc.preserved) console.log(`[upgrade] preserved user file: ${file}`);
  await updateManagedFiles({ ...config, stack, profile, withRea: selected.rea, projectName: config.projectName ?? targetPath.split(/[\\/]/).pop(), projectPath: targetPath, template: config.template ?? 'single-project', aiTools, frameworkVersion: version }, opts.templatesRoot ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', 'templates'));
  writeFileSync(configPath, JSON.stringify({ ...config, frameworkVersion: version, vendorMode, aiTools, stack, profile, withRea: selected.rea, legacyProfileCompatibility, vendorMigrationVersion: 1, preservedVendorFiles: protectedPaths, skills: [...new Set([...(legacyProfileCompatibility ? config.skills ?? [] : []), ...selected.nativeSkills, ...selected.ecc.skills, ...(selected.rea ? ['reverse-engineer-anything'] : [])])] }, null, 2) + '\n');

  console.log(
    `[upgrade] skills:    ${selected.nativeSkills.length} bundled skill(s) refreshed, ` +
    `${vendorPacksRefreshed.length} vendor pack(s) refreshed (${vendorPacksRefreshed.join(', ') || 'none'})`,
  );

  // Step 3 — re-install graphify integration with the latest CLI version.
  const graphifyReport: InstallReport = selected.vendors ? installGraphify({
    projectPath: targetPath,
    bundledSkillsRoot: skillsRoot,
    vendorMode,
    protectedPaths,
    claudeCode: aiTools.claudeCode,
    copilot: aiTools.copilot,
    codex: aiTools.codex,
    cursor: aiTools.cursor,
    geminiCli: aiTools.geminiCli,
  }) : { python: { found: false }, uv: { found: false }, graphifyy: 'skipped', projectLocal: { source: 'bundled', written: [], skipped: [], errors: [] }, claudeHook: 'skipped', copilotHook: 'skipped', codexHook: 'skipped', cursorHook: 'skipped', geminiHook: 'skipped', hints: ['External runtimes are not selected by the minimal profile.'] };
  console.log('\n[upgrade] graphify install summary:\n' + formatReport(graphifyReport) + '\n');
  console.log(`[upgrade] migration summary: ${migration.removed.length} known file(s) removed; ${migration.preserved.length} modified/user file(s) preserved (listed above).`);

  if (selected.vendors) await installHaft(targetPath, aiTools);

  // Native installer failures are recoverable; embed requires bundled skill sources.
  const projectLocalFailed =
    graphifyReport.projectLocal.source === 'unavailable' ||
    graphifyReport.projectLocal.errors.length > 0;
  const failed = projectLocalFailed;

  return {
    targetPath,
    aiTools,
    source,
    removed: migration.removed,
    preserved: migration.preserved,
    skillsRefreshed: selected.nativeSkills.length,
    vendorPacksRefreshed,
    graphifyReport,
    exitCode: failed ? 1 : 0,
  };
}
