import { execSync } from 'node:child_process';

export type BmadInstallResult =
  | { ok: true }
  | { ok: false; error: string };

export const BMAD_INSTALL_TIMEOUT_MS = 300_000;

export async function runBmadInstall(projectPath: string): Promise<BmadInstallResult> {
  try {
    execSync('npx bmad-method install', {
      cwd: projectPath,
      stdio: 'inherit',
      timeout: BMAD_INSTALL_TIMEOUT_MS,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
