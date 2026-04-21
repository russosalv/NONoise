import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const monoRoot = resolve(pkgRoot, '..', '..');

// Reference-only vendor packs: synced by scripts/sync-vendor.mjs for diffing,
// must NOT ship in the published tarball.
const VENDOR_EXCLUDES = new Set(['graphify']);

const targets = [
  {
    from: resolve(monoRoot, 'packages/templates'),
    to: resolve(pkgRoot, 'templates'),
  },
  {
    from: resolve(monoRoot, 'packages/skills'),
    to: resolve(pkgRoot, 'skills'),
    // After copying, prune reference-only vendor packs.
    prune: async (dest) => {
      for (const name of VENDOR_EXCLUDES) {
        await rm(join(dest, 'vendor', name), { recursive: true, force: true });
      }
    },
  },
];

async function listChildDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => e.name);
}

for (const t of targets) {
  await rm(t.to, { recursive: true, force: true });
  await mkdir(t.to, { recursive: true });
  const childDirs = await listChildDirs(t.from);
  for (const sub of childDirs) {
    await cp(resolve(t.from, sub), resolve(t.to, sub), { recursive: true });
  }
  if (t.prune) await t.prune(t.to);
}

console.log('Assets bundled.');
