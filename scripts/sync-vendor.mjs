#!/usr/bin/env node
// Sync vendored skills from upstream repos.
//
// Each vendor lives under packages/skills/vendor/<name>/ with a VENDOR.json
// manifest describing source, ref, subpath, scope, commit, fetchedAt.
//
// Usage:
//   node scripts/sync-vendor.mjs --init <name> --source <url> [--ref main] [--subpath path] [--scope a,b,c]
//   node scripts/sync-vendor.mjs <name>            # sync existing vendor
//   node scripts/sync-vendor.mjs --all             # sync every vendor
//   node scripts/sync-vendor.mjs <name> --dry-run  # no writes
//
// VENDOR.json shape:
// {
//   "source": "https://github.com/owner/repo",
//   "ref": "main",
//   "subpath": null | "skills/foo",   // clone root or a single folder
//   "scope": ["."] | ["skills","agents","commands","hooks"],
//   "commit": "<40-char SHA>",
//   "fetchedAt": "<ISO timestamp>",
//   "license": "see upstream LICENSE",
//   "notes": "free text"
// }

import { execSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const monoRoot = resolve(here, '..');
const vendorRoot = join(monoRoot, 'packages', 'skills', 'vendor');

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--init') args.flags.init = true;
    else if (a === '--all') args.flags.all = true;
    else if (a === '--dry-run') args.flags.dryRun = true;
    else if (a === '--source') args.flags.source = argv[++i];
    else if (a === '--ref') args.flags.ref = argv[++i];
    else if (a === '--subpath') args.flags.subpath = argv[++i];
    else if (a === '--scope') args.flags.scope = argv[++i].split(',');
    else if (a === '--help' || a === '-h') args.flags.help = true;
    else args._.push(a);
    i++;
  }
  return args;
}

function printHelp() {
  console.log(`sync-vendor — sync skill vendors from upstream repos

Usage:
  node scripts/sync-vendor.mjs --init <name> --source <url> [--ref main]
                                [--subpath <path>] [--scope a,b,c]
  node scripts/sync-vendor.mjs <name> [--dry-run]
  node scripts/sync-vendor.mjs --all [--dry-run]

Examples:
  node scripts/sync-vendor.mjs --init superpowers \\
       --source https://github.com/obra/superpowers \\
       --scope skills,agents,commands,hooks

  node scripts/sync-vendor.mjs --init skill-creator \\
       --source https://github.com/anthropics/skills \\
       --subpath skills/skill-creator --scope .

  node scripts/sync-vendor.mjs superpowers
  node scripts/sync-vendor.mjs --all
`);
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts }).trim();
}

async function readManifest(vendorDir) {
  const path = join(vendorDir, 'VENDOR.json');
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

async function writeManifest(vendorDir, manifest) {
  const path = join(vendorDir, 'VENDOR.json');
  const ordered = {
    source: manifest.source,
    ref: manifest.ref,
    subpath: manifest.subpath ?? null,
    scope: manifest.scope,
    commit: manifest.commit,
    fetchedAt: manifest.fetchedAt,
    license: manifest.license ?? 'see upstream LICENSE',
    notes: manifest.notes ?? '',
  };
  await writeFile(path, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
}

async function listVendors() {
  if (!existsSync(vendorRoot)) return [];
  const entries = await readdir(vendorRoot, { withFileTypes: true });
  const names = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const m = join(vendorRoot, e.name, 'VENDOR.json');
    if (existsSync(m)) names.push(e.name);
  }
  return names;
}

function cloneShallow(source, ref) {
  const tmp = join(tmpdir(), `nonoise-vendor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const branch = ref || 'main';
  try {
    sh(`git clone --depth 1 --branch ${branch} ${source} "${tmp}"`);
  } catch (e) {
    // fallback without --branch (ref may be a tag or default branch is not "main")
    sh(`git clone --depth 1 ${source} "${tmp}"`);
  }
  const commit = sh('git rev-parse HEAD', { cwd: tmp });
  return { tmp, commit };
}

async function syncOne(name, { dryRun = false } = {}) {
  const vendorDir = join(vendorRoot, name);
  if (!existsSync(vendorDir)) throw new Error(`Vendor not found: ${name} (${vendorDir})`);
  const manifest = await readManifest(vendorDir);
  console.log(`\n[${name}] source=${manifest.source} ref=${manifest.ref}`);

  const { tmp, commit } = cloneShallow(manifest.source, manifest.ref);
  console.log(`[${name}] upstream HEAD=${commit}`);

  if (manifest.commit === commit) {
    console.log(`[${name}] already at latest commit, no changes.`);
    await rm(tmp, { recursive: true, force: true });
    return { name, changed: false, commit };
  }

  const cloneSubRoot = manifest.subpath ? join(tmp, manifest.subpath.split('/').join(sep)) : tmp;
  if (!existsSync(cloneSubRoot)) {
    await rm(tmp, { recursive: true, force: true });
    throw new Error(`[${name}] subpath "${manifest.subpath}" not found in upstream.`);
  }

  const scope = manifest.scope && manifest.scope.length ? manifest.scope : ['.'];

  if (!dryRun) {
    // Remove existing scope items in vendorDir (preserve VENDOR.json and LICENSE copy)
    for (const item of scope) {
      const target = item === '.' ? vendorDir : join(vendorDir, item);
      if (item === '.') {
        // wipe everything except VENDOR.json
        const entries = await readdir(vendorDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name === 'VENDOR.json') continue;
          await rm(join(vendorDir, e.name), { recursive: true, force: true });
        }
      } else {
        await rm(target, { recursive: true, force: true });
      }
    }

    // Copy
    for (const item of scope) {
      const src = item === '.' ? cloneSubRoot : join(cloneSubRoot, item);
      const dst = item === '.' ? vendorDir : join(vendorDir, item);
      if (!existsSync(src)) {
        console.warn(`[${name}] scope item "${item}" missing in upstream — skipped.`);
        continue;
      }
      if (item === '.') {
        // copy contents of cloneSubRoot into vendorDir (excluding .git)
        const entries = await readdir(src, { withFileTypes: true });
        for (const e of entries) {
          if (e.name === '.git') continue;
          await cp(join(src, e.name), join(dst, e.name), { recursive: true });
        }
      } else {
        await mkdir(dirname(dst), { recursive: true });
        await cp(src, dst, { recursive: true });
      }
    }

    const updated = {
      ...manifest,
      commit,
      fetchedAt: new Date().toISOString(),
    };
    await writeManifest(vendorDir, updated);
  } else {
    console.log(`[${name}] DRY RUN — would sync ${scope.join(', ')} from ${cloneSubRoot}`);
  }

  await rm(tmp, { recursive: true, force: true });
  return { name, changed: true, commit };
}

async function init(name, { source, ref = 'main', subpath = null, scope = ['.'] }) {
  if (!source) throw new Error('--source is required with --init');
  const vendorDir = join(vendorRoot, name);
  if (existsSync(join(vendorDir, 'VENDOR.json'))) {
    throw new Error(`Vendor already initialized: ${name}. Run without --init to re-sync.`);
  }
  await mkdir(vendorDir, { recursive: true });

  // Write a stub manifest first so syncOne can read it
  const stub = {
    source,
    ref,
    subpath,
    scope,
    commit: '0000000000000000000000000000000000000000',
    fetchedAt: '1970-01-01T00:00:00.000Z',
    license: 'see upstream LICENSE',
    notes: '',
  };
  await writeManifest(vendorDir, stub);
  console.log(`[${name}] initialized stub at ${vendorDir}/VENDOR.json`);

  return syncOne(name);
}

async function main() {
  const { _: positional, flags } = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }

  if (flags.init) {
    const name = positional[0] || flags.source?.split('/').pop();
    if (!name) throw new Error('--init requires a name (positional) or inferable from --source.');
    const scope = flags.scope || ['.'];
    await init(name, { source: flags.source, ref: flags.ref, subpath: flags.subpath, scope });
    return;
  }

  if (flags.all) {
    const names = await listVendors();
    if (names.length === 0) {
      console.log('No vendors found.');
      return;
    }
    console.log(`Syncing ${names.length} vendor(s)…`);
    const results = [];
    for (const n of names) {
      try {
        results.push(await syncOne(n, { dryRun: flags.dryRun }));
      } catch (e) {
        console.error(`[${n}] FAILED: ${e.message}`);
        results.push({ name: n, changed: false, error: e.message });
      }
    }
    console.log('\n--- Summary ---');
    for (const r of results) {
      const status = r.error ? 'ERROR' : r.changed ? 'SYNCED' : 'UNCHANGED';
      console.log(`${status.padEnd(10)} ${r.name}`);
    }
    return;
  }

  const name = positional[0];
  if (!name) {
    printHelp();
    process.exitCode = 1;
    return;
  }
  await syncOne(name, { dryRun: flags.dryRun });
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
