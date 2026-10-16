import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';

export const digest = (content: string | Buffer): string => createHash('sha256').update(content).digest('hex');
const MANIFEST = '.nonoise/file-hashes.json';
/** Refuse symlinks at every component, including dangling links and non-directory parents. */
export function safeAssetPath(project: string, file: string): boolean {
  const root = resolve(project), target = resolve(project, file);
  if (!file || relative(root, target).startsWith('..') || target === root) return false;
  let current = root;
  for (const part of relative(root, target).split(/[\\/]/)) {
    current = join(current, part);
    try {
      const info = lstatSync(current);
      if (info.isSymbolicLink() || (current !== target && !info.isDirectory()) || (current === target && !info.isFile())) return false;
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  return true;
}

export function readAssetHashes(project: string): Record<string, string> {
  if (!safeAssetPath(project, MANIFEST)) throw new Error(`Unsafe ownership manifest: ${MANIFEST}`);
  const path = join(project, MANIFEST);
  if (!existsSync(path)) return {};
  const hashes: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!hashes || typeof hashes !== 'object' || Array.isArray(hashes) || Object.values(hashes).some(v => typeof v !== 'string' || !/^[a-f0-9]{64}$/.test(v))) throw new Error('Invalid NONoise file hash manifest');
  return hashes as Record<string, string>;
}

/** Same SHA-256 ownership policy as legacy vendor migration: unknown bytes belong to the user. */
export function installManagedAssets(project: string, files: Record<string, string | Buffer>, historical: Record<string, string[]> = {}): { written: string[]; preserved: string[] } {
  const hashes = readAssetHashes(project);
  const written: string[] = [], preserved: string[] = [];
  for (const [file, content] of Object.entries(files)) {
    if (!safeAssetPath(project, file)) { preserved.push(file); continue; }
    const path = join(project, file), desired = digest(content);
    const current = existsSync(path) ? digest(readFileSync(path)) : undefined;
    if (current === desired) { hashes[file] = desired; continue; }
    if (current && current !== hashes[file] && !historical[file]?.includes(current)) { preserved.push(file); continue; }
    mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content);
    hashes[file] = desired; written.push(file);
  }
  const serialized = JSON.stringify(Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n';
  const path = join(project, MANIFEST);
  if (!existsSync(path) || readFileSync(path, 'utf8') !== serialized) {
    mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, serialized);
  }
  return { written, preserved };
}
