import { execSync } from 'node:child_process';

export type GraphifyInstallContext = {
  copilot: boolean;
};

export type InstallReport = {
  python: { found: boolean; version?: string };
  uv: { found: boolean; version?: string };
  graphifyy: 'installed' | 'already-present' | 'upgraded' | 'install-failed' | 'skipped';
  claudeHook: 'ok' | 'failed' | 'skipped';
  copilotHook: 'ok' | 'failed' | 'skipped';
  hints: string[];
};

const GRAPHIFYY_PIN = 'graphifyy>=0.4.23';

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

function probeGraphifyBinary(): { found: boolean; version?: string } {
  try {
    const out = execSync('graphify --version', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    const m = out.match(/(\d+)\.(\d+)\.(\d+)/);
    return { found: true, version: m ? `${m[1]}.${m[2]}.${m[3]}` : out };
  } catch {
    return { found: false };
  }
}

function runQuiet(cmd: string): void {
  execSync(cmd, { stdio: 'ignore' });
}

function installOrUpgradeGraphifyy(): InstallReport['graphifyy'] {
  const before = probeGraphifyBinary();
  try {
    runQuiet(`uv tool install "${GRAPHIFYY_PIN}"`);
  } catch {
    return 'install-failed';
  }
  const after = probeGraphifyBinary();

  // Upgrade path: binary was present but older than pin, or still older after install.
  if (after.found && after.version && olderThan(after.version, '0.4.23')) {
    try {
      runQuiet('uv tool upgrade graphifyy');
    } catch {
      try {
        runQuiet(`uv tool install --reinstall "${GRAPHIFYY_PIN}"`);
      } catch {
        return 'install-failed';
      }
    }
    return 'upgraded';
  }

  if (!after.found) {
    // install reported success but binary not detectable — treat as failed
    return 'install-failed';
  }

  return before.found ? 'already-present' : 'installed';
}

function olderThan(version: string, target: string): boolean {
  const parts = version.split('.').map(Number);
  const tparts = target.split('.').map(Number);
  const [a = 0, b = 0, c = 0] = parts;
  const [x = 0, y = 0, z = 0] = tparts;
  if (a !== x) return a < x;
  if (b !== y) return b < y;
  return c < z;
}

function wireClaudeHook(): InstallReport['claudeHook'] {
  try {
    runQuiet('graphify install');
    return 'ok';
  } catch {
    return 'failed';
  }
}

function wireCopilotHook(): InstallReport['copilotHook'] {
  try {
    runQuiet('graphify copilot install');
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
      '[graphify] Python >= 3.10 not found — skipping install. ' +
      'Install Python 3.10+ and re-run. See https://python.org/downloads.',
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
      '  macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh\n' +
      '  Windows:     powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"\n' +
      `Then run: uv tool install "${GRAPHIFYY_PIN}" && graphify install`,
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

  const graphifyy = installOrUpgradeGraphifyy();
  if (graphifyy === 'install-failed') {
    hints.push(
      `[graphify] "uv tool install ${GRAPHIFYY_PIN}" failed. ` +
      `Escape hatch (opt-in): pip install --user "${GRAPHIFYY_PIN}".`,
    );
    return {
      python,
      uv,
      graphifyy,
      claudeHook: 'skipped',
      copilotHook: 'skipped',
      hints,
    };
  }

  const claudeHook = wireClaudeHook();
  const copilotHook = ctx.copilot ? wireCopilotHook() : 'skipped';

  return { python, uv, graphifyy, claudeHook, copilotHook, hints };
}

export function formatReport(r: InstallReport): string {
  const lines = [
    `  Python:           ${r.python.found ? r.python.version ?? 'found' : 'missing'}`,
    `  uv:               ${r.uv.found ? r.uv.version ?? 'found' : 'missing'}`,
    `  graphifyy:        ${r.graphifyy}`,
    `  graphify install: ${r.claudeHook}`,
    `  graphify copilot: ${r.copilotHook}`,
  ];
  if (r.hints.length > 0) {
    lines.push('', ...r.hints);
  }
  return lines.join('\n');
}
