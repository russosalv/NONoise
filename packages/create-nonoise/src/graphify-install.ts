import { execSync } from 'node:child_process';

export type GraphifyInstallContext = {
  /** Project root where `graphify <platform> install` should write CLAUDE.md / settings.json. */
  projectPath: string;
  /** Run `graphify claude install` for project-local CLAUDE.md + PreToolUse hook. */
  claudeCode: boolean;
  /** Run `graphify copilot install` for Copilot integration. */
  copilot: boolean;
};

export type InstallReport = {
  python: { found: boolean; version?: string };
  uv: { found: boolean; version?: string };
  graphifyy: 'installed' | 'already-present' | 'upgraded' | 'install-failed' | 'skipped';
  graphifyyVersion?: string;
  claudeHook: 'ok' | 'failed' | 'skipped';
  copilotHook: 'ok' | 'failed' | 'skipped';
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

export function installGraphify(ctx: GraphifyInstallContext): InstallReport {
  const hints: string[] = [];

  const python = probePython();
  if (!python.found) {
    hints.push(
      '[graphify] Python >= 3.10 not found — skipping install. Next steps:\n' +
      '  • Install Python 3.10+ from https://python.org/downloads (or via your package manager).\n' +
      '  • Then bootstrap graphify with:\n' +
      `      uv tool install "${GRAPHIFYY_PIN}"\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify claude install   # for Claude Code\n' +
      '      graphify copilot install  # for GitHub Copilot',
    );
    return {
      python,
      uv: { found: false },
      graphifyy: 'skipped',
      claudeHook: 'skipped',
      copilotHook: 'skipped',
      hints,
    };
  }

  const uv = probeUv();
  if (!uv.found) {
    hints.push(
      '[graphify] `uv` not found — skipping install. Bootstrap with:\n' +
      '  • macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh\n' +
      '  • Windows:     powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"\n' +
      '  Then re-run inside the project folder:\n' +
      `      uv tool install "${GRAPHIFYY_PIN}"\n` +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      `      graphify claude install   # for Claude Code\n` +
      `      graphify copilot install  # for GitHub Copilot`,
    );
    return {
      python,
      uv,
      graphifyy: 'skipped',
      claudeHook: 'skipped',
      copilotHook: 'skipped',
      hints,
    };
  }

  const installResult = installOrUpgradeGraphifyy();
  if (installResult.status === 'install-failed') {
    hints.push(
      `[graphify] "uv tool install ${GRAPHIFYY_PIN}" failed. Recovery:\n` +
      `  • Retry manually:           uv tool install "${GRAPHIFYY_PIN}"\n` +
      `  • Or via pipx:              pipx install "${GRAPHIFYY_PIN}"\n` +
      `  • Or via pip (last resort): pip install --user "${GRAPHIFYY_PIN}"\n` +
      `  Then, inside ${quoteCwd(ctx.projectPath)}:\n` +
      '      graphify claude install   # for Claude Code\n' +
      '      graphify copilot install  # for GitHub Copilot',
    );
    return {
      python,
      uv,
      graphifyy: installResult.status,
      graphifyyVersion: installResult.version,
      claudeHook: 'skipped',
      copilotHook: 'skipped',
      hints,
    };
  }

  const claudeHook = ctx.claudeCode ? wireClaudeHook(ctx.projectPath) : 'skipped';
  if (claudeHook === 'failed') {
    hints.push(
      '[graphify] `graphify claude install` failed inside the new project. Recover with:\n' +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify claude install',
    );
  }

  const copilotHook = ctx.copilot ? wireCopilotHook(ctx.projectPath) : 'skipped';
  if (copilotHook === 'failed') {
    hints.push(
      '[graphify] `graphify copilot install` failed inside the new project. Recover with:\n' +
      `      cd ${quoteCwd(ctx.projectPath)}\n` +
      '      graphify copilot install',
    );
  }

  return {
    python,
    uv,
    graphifyy: installResult.status,
    graphifyyVersion: installResult.version,
    claudeHook,
    copilotHook,
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
  const lines = [
    `  Python:           ${r.python.found ? r.python.version ?? 'found' : 'missing'}`,
    `  uv:               ${r.uv.found ? r.uv.version ?? 'found' : 'missing'}`,
    `  graphifyy:        ${graphifyyLine}`,
    `  graphify claude:  ${r.claudeHook}`,
    `  graphify copilot: ${r.copilotHook}`,
  ];
  if (r.hints.length > 0) {
    lines.push('', ...r.hints);
  }
  return lines.join('\n');
}
