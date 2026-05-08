import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export type GraphifyInstallContext = {
  /** Project root where graphify integration lands. */
  projectPath: string;
  /**
   * Directory containing bundled skills (the same `skills/` shipped with
   * create-nonoise). Used to read `graphify-platform-skills/` for project-local
   * skill copies. When missing/empty, the project-local writer falls back to
   * any installed graphifyy package or, last resort, skips with a hint.
   */
  bundledSkillsRoot: string;
  /** Run `graphify claude install` for project-local CLAUDE.md + PreToolUse hook. */
  claudeCode: boolean;
  /** Run `graphify copilot install` for Copilot integration. */
  copilot: boolean;
  /** Run `graphify codex install` for Codex integration. */
  codex: boolean;
  /** Run `graphify install --platform cursor` for project-local `.cursor/rules.md`. */
  cursor: boolean;
  /** Run `graphify install --platform gemini` for project-local `GEMINI.md`. */
  geminiCli: boolean;
};

export type ProjectLocalReport = {
  /** Where the skill content was sourced from. */
  source: 'bundled' | 'installed-fresher' | 'unavailable';
  /** Source version used (graphifyy x.y.z) when known. */
  sourceVersion?: string;
  /** Destination paths actually written/refreshed. */
  written: string[];
  /** Destination paths skipped because the existing stamp is newer than source. */
  skipped: string[];
  /** Per-tool error messages (paired with hints). */
  errors: string[];
};

export type InstallReport = {
  python: { found: boolean; version?: string };
  uv: { found: boolean; version?: string };
  graphifyy: 'installed' | 'already-present' | 'upgraded' | 'install-failed' | 'skipped';
  graphifyyVersion?: string;
  /** Project-local skill files (the safety net — works even with no Python/uv). */
  projectLocal: ProjectLocalReport;
  claudeHook: 'ok' | 'failed' | 'skipped';
  copilotHook: 'ok' | 'failed' | 'skipped';
  codexHook: 'ok' | 'failed' | 'skipped';
  cursorHook: 'ok' | 'failed' | 'skipped';
  geminiHook: 'ok' | 'failed' | 'skipped';
  hints: string[];
};

const GRAPHIFYY_PIN = 'graphifyy>=0.7.0';
const GRAPHIFYY_MIN = '0.7.0';

function probePython(): { found: boolean; version?: string } {
  for (const cmd of ['python3', 'python']) {
    try {
      const out = execSync(`${cmd} --version`, {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim();
      const m = out.match(/Python\s+(\d+)\.(\d+)/);
      if (m && (Number(m[1]) > 3 || (Number(m[1]) === 3 && Number(m[2]) >= 10))) {
        return { found: true, version: out.replace(/^Python\s+/, '') };
      }
    } catch {
      // try next
    }
  }
  return { found: false };
}

function probeUv(): { found: boolean; version?: string } {
  try {
    const out = execSync('uv --version', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    return { found: true, version: out.replace(/^uv\s+/, '') };
  } catch {
    return { found: false };
  }
}

/**
 * Probe installed graphifyy version via `uv tool list`. Graphify CLI itself
 * has no `--version` command, so we read it from uv's tool registry.
 */
function probeGraphifyyVersion(): { found: boolean; version?: string } {
  try {
    const out = execSync('uv tool list', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    const m = out.match(/graphifyy\s+v(\d+)\.(\d+)\.(\d+)/);
    if (m) return { found: true, version: `${m[1]}.${m[2]}.${m[3]}` };
    return { found: false };
  } catch {
    return { found: false };
  }
}

function runQuiet(cmd: string, cwd?: string): void {
  execSync(cmd, { stdio: 'ignore', cwd });
}

function olderThan(version: string, target: string): boolean {
  const [a = 0, b = 0, c = 0] = version.split('.').map(Number);
  const [x = 0, y = 0, z = 0] = target.split('.').map(Number);
  if (a !== x) return a < x;
  if (b !== y) return b < y;
  return c < z;
}

function installOrUpgradeGraphifyy(): {
  status: InstallReport['graphifyy'];
  version?: string;
} {
  const before = probeGraphifyyVersion();
  try {
    runQuiet(`uv tool install "${GRAPHIFYY_PIN}"`);
  } catch {
    return { status: 'install-failed' };
  }
  let after = probeGraphifyyVersion();

  // If pin is satisfied but version is still below our minimum (rare — pin
  // resolution edge case or stale lock), force an upgrade.
  if (after.found && after.version && olderThan(after.version, GRAPHIFYY_MIN)) {
    try {
      runQuiet('uv tool upgrade graphifyy');
    } catch {
      try {
        runQuiet(`uv tool install --reinstall "${GRAPHIFYY_PIN}"`);
      } catch {
        return { status: 'install-failed', version: after.version };
      }
    }
    after = probeGraphifyyVersion();
    return { status: 'upgraded', version: after.version };
  }

  if (!after.found) {
    return { status: 'install-failed' };
  }

  if (before.found && before.version && after.version && before.version !== after.version) {
    return { status: 'upgraded', version: after.version };
  }

  return {
    status: before.found ? 'already-present' : 'installed',
    version: after.version,
  };
}

// ---------- Project-local skills (the safety net) ----------

const PLATFORM_SKILLS_DIR = 'graphify-platform-skills';
const STAMP_FILE = '.graphify_skill_version';
const MANIFEST_FILE = 'MANIFEST.json';

type PlatformSlot = {
  /** AI-tool flag in `GraphifyInstallContext`. */
  flag: 'claudeCode' | 'copilot' | 'codex';
  /** Source filename in the lean platform-skills dir. */
  sourceFile: string;
  /** Project-relative destination path. */
  destRel: string;
};

/**
 * Per-platform destination table. Mirrors graphify upstream's `_PLATFORM_CONFIG`
 * (graphify/__main__.py) but anchored at projectPath instead of $HOME.
 *
 * Cursor and Gemini intentionally omitted: graphify's own installers produce
 * project-local output for those (see wireCursor / wireGemini below), so we
 * don't carve a vendored skill file for them.
 */
function platformSlots(isWindows: boolean): PlatformSlot[] {
  return [
    {
      flag: 'claudeCode',
      sourceFile: isWindows ? 'skill-windows.md' : 'skill.md',
      destRel: '.claude/skills/graphify/SKILL.md',
    },
    {
      flag: 'copilot',
      sourceFile: 'skill-copilot.md',
      destRel: '.copilot/skills/graphify/SKILL.md',
    },
    {
      flag: 'codex',
      sourceFile: 'skill-codex.md',
      destRel: '.agents/skills/graphify/SKILL.md',
    },
  ];
}

type SkillSource =
  | { kind: 'bundled'; dir: string; version: string }
  | { kind: 'installed-fresher'; dir: string; version: string }
  | { kind: 'unavailable' };

/** Resolve where to read skill files from. Prefer freshest. */
function resolveSkillSource(bundledSkillsRoot: string): SkillSource {
  const bundledDir = join(bundledSkillsRoot, PLATFORM_SKILLS_DIR);
  let bundledVersion: string | undefined;
  if (existsSync(join(bundledDir, MANIFEST_FILE))) {
    try {
      const manifest = JSON.parse(readFileSync(join(bundledDir, MANIFEST_FILE), 'utf8')) as {
        graphifyVersion?: string;
      };
      bundledVersion = manifest.graphifyVersion;
    } catch {
      // tolerate malformed manifest — treat as no bundled
    }
  }

  const installed = locateInstalledGraphifyPackage();
  if (installed && bundledVersion && olderThan(bundledVersion, installed.version)) {
    return { kind: 'installed-fresher', dir: installed.dir, version: installed.version };
  }
  if (bundledVersion && existsSync(bundledDir)) {
    return { kind: 'bundled', dir: bundledDir, version: bundledVersion };
  }
  if (installed) {
    // No bundled (dev env without bundle-assets ran) — fall back to installed.
    return { kind: 'installed-fresher', dir: installed.dir, version: installed.version };
  }
  return { kind: 'unavailable' };
}

/**
 * Find the `graphify` Python package directory inside an installed graphifyy
 * uv tool, e.g. `~/.local/share/uv/tools/graphifyy/lib/python3.12/site-packages/graphify`.
 * Returns the dir + version, or null if anything is missing.
 */
function locateInstalledGraphifyPackage(): { dir: string; version: string } | null {
  let toolDir: string;
  try {
    toolDir = execSync('uv tool dir graphifyy', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return null;
  }
  if (!toolDir || !existsSync(toolDir)) return null;
  const libDir = join(toolDir, 'lib');
  if (!existsSync(libDir)) return null;

  let pyDir: string | undefined;
  try {
    for (const entry of readdirSync(libDir)) {
      if (entry.startsWith('python')) {
        pyDir = join(libDir, entry, 'site-packages', 'graphify');
        if (existsSync(pyDir)) break;
        pyDir = undefined;
      }
    }
  } catch {
    return null;
  }
  if (!pyDir || !existsSync(pyDir)) return null;

  const version = probeGraphifyyVersion();
  if (!version.found || !version.version) return null;

  return { dir: pyDir, version: version.version };
}

/**
 * Write project-local copies of graphify's per-platform skill files. This is
 * the "siamo sicuri" path: even with no Python, no uv, and no graphifyy on
 * the machine, the project still has the skills committed so any LLM agent
 * loading the repo can dispatch its own subagents instead of falling back to
 * graphify's API path (which would prompt for ANTHROPIC_API_KEY).
 */
export function writeProjectLocalSkills(ctx: GraphifyInstallContext): ProjectLocalReport {
  const report: ProjectLocalReport = {
    source: 'unavailable',
    written: [],
    skipped: [],
    errors: [],
  };

  const source = resolveSkillSource(ctx.bundledSkillsRoot);
  if (source.kind === 'unavailable') {
    report.errors.push(
      'No bundled graphify-platform-skills directory and no installed graphifyy ' +
      'found — project-local skill files were not written.',
    );
    return report;
  }
  report.source = source.kind;
  report.sourceVersion = source.version;

  const isWindows = process.platform === 'win32';
  const slots = platformSlots(isWindows);

  for (const slot of slots) {
    if (!ctx[slot.flag]) continue;

    const srcPath = join(source.dir, slot.sourceFile);
    if (!existsSync(srcPath)) {
      report.errors.push(
        `${slot.flag}: source file missing at ${srcPath} — skipped`,
      );
      continue;
    }

    const destAbs = resolve(ctx.projectPath, slot.destRel);
    const stampPath = join(dirname(destAbs), STAMP_FILE);

    if (existsSync(stampPath)) {
      try {
        const existing = readFileSync(stampPath, 'utf8').trim();
        if (existing && olderThan(source.version, existing)) {
          report.skipped.push(slot.destRel);
          continue;
        }
      } catch {
        // unreadable stamp — proceed and overwrite
      }
    }

    try {
      mkdirSync(dirname(destAbs), { recursive: true });
      copyFileSync(srcPath, destAbs);
      writeFileSync(stampPath, source.version + '\n', 'utf8');
      report.written.push(slot.destRel);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      report.errors.push(`${slot.flag}: write failed (${msg})`);
    }
  }

  return report;
}

// ---------- Per-platform best-effort `graphify <X> install` wires ----------

function wireClaudeHook(cwd: string): InstallReport['claudeHook'] {
  try {
    runQuiet('graphify claude install', cwd);
    return 'ok';
  } catch {
    return 'failed';
  }
}

function wireCopilotHook(cwd: string): InstallReport['copilotHook'] {
  try {
    runQuiet('graphify copilot install', cwd);
    return 'ok';
  } catch {
    return 'failed';
  }
}

function wireCodexHook(cwd: string): InstallReport['codexHook'] {
  try {
    runQuiet('graphify codex install', cwd);
    return 'ok';
  } catch {
    return 'failed';
  }
}

function wireCursorHook(cwd: string): InstallReport['cursorHook'] {
  try {
    runQuiet('graphify install --platform cursor', cwd);
    return 'ok';
  } catch {
    return 'failed';
  }
}

function wireGeminiHook(cwd: string): InstallReport['geminiHook'] {
  try {
    runQuiet('graphify install --platform gemini', cwd);
    return 'ok';
  } catch {
    return 'failed';
  }
}

// ---------- Orchestrator ----------

export function installGraphify(ctx: GraphifyInstallContext): InstallReport {
  const hints: string[] = [];

  // Step 1 — write project-local skill files FIRST. This is independent of
  // Python/uv/graphifyy presence and provides the "no API key" guarantee even
  // when the environment has nothing installed.
  const projectLocal = writeProjectLocalSkills(ctx);
  for (const err of projectLocal.errors) {
    hints.push(`[graphify] project-local skill write: ${err}`);
  }

  // Step 2 — global install (best-effort, belt-and-suspenders).
  const python = probePython();
  if (!python.found) {
    hints.push(
      '[graphify] Python >= 3.10 not found — global install skipped (project-local skills already written).\n' +
      '  Installing globally is optional. To enable graphify CLI later:\n' +
      '  • Install Python 3.10+ from https://python.org/downloads (or via your package manager).\n' +
      `  • Then bootstrap with:\n` +
      `      uv tool install "${GRAPHIFYY_PIN}"\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify claude install   # for Claude Code',
    );
    return {
      python,
      uv: { found: false },
      graphifyy: 'skipped',
      projectLocal,
      claudeHook: 'skipped',
      copilotHook: 'skipped',
      codexHook: 'skipped',
      cursorHook: 'skipped',
      geminiHook: 'skipped',
      hints,
    };
  }

  const uv = probeUv();
  if (!uv.found) {
    hints.push(
      '[graphify] `uv` not found — global install skipped (project-local skills already written).\n' +
      '  Installing globally is optional. Bootstrap with:\n' +
      '  • macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh\n' +
      '  • Windows:     powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"\n' +
      '  Then re-run inside the project folder:\n' +
      `      uv tool install "${GRAPHIFYY_PIN}"\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      `      graphify claude install   # for Claude Code`,
    );
    return {
      python,
      uv,
      graphifyy: 'skipped',
      projectLocal,
      claudeHook: 'skipped',
      copilotHook: 'skipped',
      codexHook: 'skipped',
      cursorHook: 'skipped',
      geminiHook: 'skipped',
      hints,
    };
  }

  const installResult = installOrUpgradeGraphifyy();
  if (installResult.status === 'install-failed') {
    hints.push(
      `[graphify] "uv tool install ${GRAPHIFYY_PIN}" failed — global install skipped (project-local skills already written).\n` +
      '  Recovery (optional):\n' +
      `  • Retry manually:           uv tool install "${GRAPHIFYY_PIN}"\n` +
      `  • Or via pipx:              pipx install "${GRAPHIFYY_PIN}"\n` +
      `  • Or via pip (last resort): pip install --user "${GRAPHIFYY_PIN}"\n` +
      `  Then, inside ${quoteCwd(ctx.projectPath)}:\n` +
      '      graphify claude install   # for Claude Code',
    );
    return {
      python,
      uv,
      graphifyy: installResult.status,
      graphifyyVersion: installResult.version,
      projectLocal,
      claudeHook: 'skipped',
      copilotHook: 'skipped',
      codexHook: 'skipped',
      cursorHook: 'skipped',
      geminiHook: 'skipped',
      hints,
    };
  }

  const claudeHook = ctx.claudeCode ? wireClaudeHook(ctx.projectPath) : 'skipped';
  if (claudeHook === 'failed') {
    hints.push(
      '[graphify] `graphify claude install` failed (project-local skill is still in place).\n' +
      `  Optional recover with:\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify claude install',
    );
  }

  const copilotHook = ctx.copilot ? wireCopilotHook(ctx.projectPath) : 'skipped';
  if (copilotHook === 'failed') {
    hints.push(
      '[graphify] `graphify copilot install` failed (project-local skill is still in place).\n' +
      `  Optional recover with:\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify copilot install',
    );
  }

  const codexHook = ctx.codex ? wireCodexHook(ctx.projectPath) : 'skipped';
  if (codexHook === 'failed') {
    hints.push(
      '[graphify] `graphify codex install` failed (project-local skill is still in place).\n' +
      `  Optional recover with:\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify codex install',
    );
  }

  const cursorHook = ctx.cursor ? wireCursorHook(ctx.projectPath) : 'skipped';
  if (cursorHook === 'failed') {
    hints.push(
      '[graphify] `graphify install --platform cursor` failed.\n' +
      `  Optional recover with:\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify install --platform cursor',
    );
  }

  const geminiHook = ctx.geminiCli ? wireGeminiHook(ctx.projectPath) : 'skipped';
  if (geminiHook === 'failed') {
    hints.push(
      '[graphify] `graphify install --platform gemini` failed.\n' +
      `  Optional recover with:\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify install --platform gemini',
    );
  }

  return {
    python,
    uv,
    graphifyy: installResult.status,
    graphifyyVersion: installResult.version,
    projectLocal,
    claudeHook,
    copilotHook,
    codexHook,
    cursorHook,
    geminiHook,
    hints,
  };
}

function quoteCwd(p: string): string {
  return /\s/.test(p) ? `"${p}"` : p;
}

export function formatReport(r: InstallReport): string {
  const graphifyyLine = r.graphifyyVersion
    ? `${r.graphifyy} (v${r.graphifyyVersion})`
    : r.graphifyy;

  const pl = r.projectLocal;
  const plLabel =
    pl.source === 'unavailable'
      ? 'unavailable'
      : `${pl.written.length} file(s) written from ${pl.source}` +
        (pl.sourceVersion ? ` (v${pl.sourceVersion})` : '') +
        (pl.skipped.length > 0 ? `, ${pl.skipped.length} skipped (newer stamp)` : '') +
        (pl.errors.length > 0 ? `, ${pl.errors.length} error(s)` : '');

  const lines = [
    `  Python:           ${r.python.found ? r.python.version ?? 'found' : 'missing'}`,
    `  uv:               ${r.uv.found ? r.uv.version ?? 'found' : 'missing'}`,
    `  graphifyy:        ${graphifyyLine}`,
    `  project-local:    ${plLabel}`,
    `  graphify claude:  ${r.claudeHook}`,
    `  graphify copilot: ${r.copilotHook}`,
    `  graphify codex:   ${r.codexHook}`,
    `  graphify cursor:  ${r.cursorHook}`,
    `  graphify gemini:  ${r.geminiHook}`,
  ];
  if (r.hints.length > 0) {
    lines.push('', ...r.hints);
  }
  return lines.join('\n');
}
