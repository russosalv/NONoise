import { cp, rm, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const monoRoot = resolve(pkgRoot, '..', '..');

// Reference-only vendor packs: synced by scripts/sync-vendor.mjs for diffing,
// must NOT ship in the published tarball.
const VENDOR_EXCLUDES = new Set(['graphify']);

const SKILLS_FROM = resolve(monoRoot, 'packages/skills');
const SKILLS_TO = resolve(pkgRoot, 'skills');
const TEMPLATES_FROM = resolve(monoRoot, 'packages/templates');
const TEMPLATES_TO = resolve(pkgRoot, 'templates');

async function listChildDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => e.name)
    .sort();
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

// Copy `from` → `to` with explicit per-child iteration. Vendor exclusions are
// applied UPFRONT (filtered out of the copy list) instead of pruned afterward,
// so we never depend on a post-copy rm step that could fail to fire on CI.
async function copyTree(from, to, { vendorAware = false } = {}) {
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });

  for (const sub of await listChildDirs(from)) {
    const subFrom = resolve(from, sub);
    const subTo = resolve(to, sub);

    if (vendorAware && sub === 'vendor') {
      await mkdir(subTo, { recursive: true });
      for (const vendor of await listChildDirs(subFrom)) {
        if (VENDOR_EXCLUDES.has(vendor)) {
          console.log(`  skip vendor/${vendor} (reference-only, never bundled)`);
          continue;
        }
        await cp(resolve(subFrom, vendor), resolve(subTo, vendor), {
          recursive: true,
          force: true,
        });
      }
      continue;
    }

    await cp(subFrom, subTo, { recursive: true, force: true });
  }
}

// Sanity checks: catch silent partial copies that would only surface in tests.
async function verify() {
  const errors = [];
  for (const exclude of VENDOR_EXCLUDES) {
    const path = resolve(SKILLS_TO, 'vendor', exclude);
    if (await exists(path)) {
      errors.push(`vendor/${exclude} should have been excluded but exists at ${path}`);
    }
  }
  for (const required of ['superpowers', 'impeccable', 'skill-creator']) {
    const path = resolve(SKILLS_TO, 'vendor', required);
    if (!(await exists(path))) {
      errors.push(`vendor/${required} is required but is missing at ${path}`);
    }
  }
  if (errors.length > 0) {
    console.error('Bundle verification failed:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}

await copyTree(TEMPLATES_FROM, TEMPLATES_TO);
await copyTree(SKILLS_FROM, SKILLS_TO, { vendorAware: true });
await verify();

console.log('Assets bundled.');
