import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock execSync to avoid launching a real subprocess in unit tests.
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { runBmadInstall } from '../../src/bmad-runner.js';

describe('runBmadInstall', () => {
  beforeEach(() => {
    vi.mocked(execSync).mockReset();
  });

  it('returns ok=true when execSync succeeds', async () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(''));
    const result = await runBmadInstall('/tmp/proj');
    expect(result).toEqual({ ok: true });
    expect(execSync).toHaveBeenCalledWith(
      'npx bmad-method install',
      expect.objectContaining({ cwd: '/tmp/proj', stdio: 'inherit' }),
    );
  });

  it('returns ok=false with error message when execSync throws', async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('ENOENT: npx not found');
    });
    const result = await runBmadInstall('/tmp/proj');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('npx not found');
  });

  it('applies a timeout to the subprocess', async () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(''));
    await runBmadInstall('/tmp/proj');
    const callArgs = vi.mocked(execSync).mock.calls[0]![1] as { timeout?: number };
    expect(callArgs.timeout).toBeGreaterThan(0);
  });
});
