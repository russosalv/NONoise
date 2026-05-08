#!/usr/bin/env node
// Maintainer-only: refresh the lean per-platform skill files NONoise bundles
// for project-local install, sourced from the full vendored graphify snapshot.
//
// Source:  packages/skills/vendor/graphify/graphify/skill*.md
// Target:  packages/skills/graphify-platform-skills/
//
// The "lean" directory ships in the published create-nonoise tarball (the full
// vendor is excluded by bundle-assets.mjs). Run this whenever the vendored
// upstream commit moves: `node scripts/sync-vendor.mjs graphify` first, then
// this script.

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const monoRoot = resolve(here, '..');

const VENDOR_DIR = join(monoRoot, 'packages', 'skills', 'vendor', 'graphify');
const VENDOR_SKILLS_DIR = join(VENDOR_DIR, 'graphify');
const TARGET_DIR = join(monoRoot, 'packages', 'skills', 'graphify-platform-skills');

// Files we actually carve out. Keep this list in lockstep with the destination
// table in graphify-install.ts: writeProjectLocalSkills().
const PLATFORM_FILES = [
  'skill.md',          // Claude Code
  'skill-copilot.md',  // Copilot CLI
  'skill-codex.md',    // Codex
  'skill-windows.md',  // Claude Code on Windows
];

async function readVendorMetadata() {
  const vendorJson = JSON.parse(await readFile(join(VENDOR_DIR, 'VENDOR.json'), 'utf8'));
  const pyproject = await readFile(join(VENDOR_DIR, 'pyproject.toml'), 'utf8');
  const versionMatch = pyproject.match(/^version\s*=\s*"([^"]+)"/m);
  if (!versionMatch) {
    throw new Error('Could not parse `version = "x.y.z"` from vendor pyproject.toml');
  }
  return {
    sourceCommit: vendorJson.commit,
    sourceRef: vendorJson.ref,
    graphifyVersion: versionMatch[1],
  };
}

async function main() {
  const meta = await readVendorMetadata();
  await mkdir(TARGET_DIR, { recursive: true });

  for (const file of PLATFORM_FILES) {
    const src = join(VENDOR_SKILLS_DIR, file);
    const dst = join(TARGET_DIR, file);
    await copyFile(src, dst);
    console.log(`  copied ${file}`);
  }

  const manifest = {
    sourceRepo: 'https://github.com/safishamsi/graphify',
    sourceRef: meta.sourceRef,
    sourceCommit: meta.sourceCommit,
    graphifyVersion: meta.graphifyVersion,
    skills: PLATFORM_FILES,
    syncedAt: new Date().toISOString(),
    notes:
      'Lean per-platform graphify skill snapshot. Bundled with create-nonoise ' +
      'and copied into project-local .claude/skills/, .copilot/skills/, .agents/skills/ at install time. ' +
      'Refresh via scripts/sync-graphify-platform-skills.mjs after bumping the vendor pin.',
  };
  await writeFile(
    join(TARGET_DIR, 'MANIFEST.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
  console.log(`  wrote MANIFEST.json (graphifyy ${meta.graphifyVersion} @ ${meta.sourceCommit.slice(0, 12)})`);
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
