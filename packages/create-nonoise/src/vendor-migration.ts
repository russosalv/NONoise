import { lstat, readFile, unlink, rmdir, readdir } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { LEGACY_VENDOR_HASHES } from './legacy-vendor-hashes.js';

export async function migrateLegacyVendors(projectPath: string): Promise<{ removed: string[]; preserved: string[] }> {
  projectPath = resolve(projectPath);
  const removed: string[] = [], preserved: string[] = [];
  // Also retain unknown user files inside a vendor tree. This protects them
  // from a later upstream installer replacing the directory wholesale.
  const roots = new Set(Object.keys(LEGACY_VENDOR_HASHES).map(p => p.split('/').slice(0, 3).join('/')));
  async function inspect(path: string): Promise<void> {
    try {
      const info = await lstat(path);
      if (info.isSymbolicLink()) { preserved.push(relative(projectPath, path)); return; }
      if (info.isDirectory()) { for (const entry of await readdir(path)) await inspect(join(path, entry)); }
      else if (!LEGACY_VENDOR_HASHES[relative(projectPath, path).replaceAll('\\', '/')]) preserved.push(relative(projectPath, path));
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  for (const root of roots) {
    const [harness, parent] = root.split('/');
    // inspect() must never start beneath a symlink either.
    let safe = true;
    for (const prefix of [harness!, `${harness}/${parent}`]) {
      try { if ((await lstat(join(projectPath, prefix))).isSymbolicLink()) safe = false; }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    }
    if (safe) await inspect(join(projectPath, root));
  }
  for (const [relative, hashes] of Object.entries(LEGACY_VENDOR_HASHES)) {
    const file = join(projectPath, relative);
    try {
      // Check every ancestor as well: never traverse a user symlink.
      let parent = file, safe = true;
      while (parent !== projectPath) {
        if ((await lstat(parent)).isSymbolicLink()) { safe = false; break; }
        parent = dirname(parent);
      }
      if (!safe || !(await lstat(file)).isFile()) { preserved.push(relative); continue; }
      const hash = createHash('sha256').update(await readFile(file)).digest('hex');
      if (!hashes.includes(hash)) { preserved.push(relative); continue; }
      await unlink(file); removed.push(relative);
      parent = dirname(file);
      // Remove only empty vendor directories, never a harness or skills root.
      while (parent !== projectPath && !['skills', 'commands', 'agents', 'hooks'].includes(parent.split(/[\\/]/).pop()!)) {
        try { await rmdir(parent); } catch { break; }
        parent = dirname(parent);
      }
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  return { removed, preserved: [...new Set(preserved)] };
}
