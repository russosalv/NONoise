import { lstat, readFile, unlink, rmdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { LEGACY_QUINT_HASHES } from './legacy-quint-hashes.js';

/** No .quint file shipped in 1.6.0 or 8b500d0. Generated ledgers are user data. */
export async function migrateQuint(root: string): Promise<{ removed: string[]; preserved: string[] }> {
  const removed: string[] = [], preserved: string[] = [];
  for (const [path, hashes] of Object.entries(LEGACY_QUINT_HASHES)) {
    try {
      let current = root, safe = true;
      for (const part of path.split('/')) { current = join(current, part); if ((await lstat(current)).isSymbolicLink()) { safe = false; break; } }
      if (!safe || !(await lstat(current)).isFile() || !hashes.includes(createHash('sha256').update(await readFile(current)).digest('hex'))) { preserved.push(path); continue; }
      await unlink(current); removed.push(path);
      if (dirname(current).endsWith('quint-fpf/commands')) { try { await rmdir(dirname(current)); } catch { /* user files remain */ } }
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  // No scaffold-owned .quint bytes are known: even an empty user directory stays.
  try { await lstat(join(root, '.quint')); preserved.push('.quint/ (user ledger; no known scaffold hashes)'); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  console.log(`[upgrade] Quint migration: ${removed.length} known files/empty directories removed; ${preserved.length} user entries preserved. Existing docs/prd/*/audit/*-fpf/ records are preserved as user data.`);
  return { removed, preserved };
}
