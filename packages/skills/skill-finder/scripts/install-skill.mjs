#!/usr/bin/env node
// Install a skill from a registered source into a project's .claude/skills/.
//
// Usage:
//   node install-skill.mjs --source <id> --skill <name> --dest <project-path> [--as <new-name>] [--dry-run]
//
// Behavior:
//   - Loads registry.json (sibling of grandparent dir) to resolve source metadata.
//   - Computes the raw-content URL for the skill folder on GitHub.
//   - Clones the source repo shallow to a temp dir (uses git clone --depth 1 --branch <ref>).
//   - Copies the skill subfolder into <dest>/.claude/skills/<skill-name>/.
//   - Enriches SKILL.md frontmatter with `sourcedBy: skill-finder/<source-id>` and
//     `sourceCommit: <sha>` (non-destructive: keeps existing keys, skips if already present).
//   - For marketplace-json sources prints install syntax instead of copying (plugin install is user-gated).
//   - For web-scrape sources: errors (not installable automatically in v1).
//
// The script does not touch network except for git clone. No GitHub API used here.

import { execSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(here, '..');
const registryPath = resolve(skillRoot, 'registry.json');

function parseArgs(argv) {
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--source') flags.source = argv[++i];
    else if (a === '--skill') flags.skill = argv[++i];
    else if (a === '--dest') flags.dest = argv[++i];
    else if (a === '--as') flags.as = argv[++i];
    else if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--custom-sources') flags.customSourcesPath = argv[++i];
    else if (a === '--help' || a === '-h') flags.help = true;
    i++;
  }
  return flags;
}

function printHelp() {
  console.log(`install-skill — install a skill from a registered source into a project

Usage:
  node install-skill.mjs --source <id> --skill <name> --dest <project-path>
                         [--as <new-name>] [--dry-run] [--custom-sources <path>]

Options:
  --source <id>              Source id from registry.json
  --skill <name>             Skill folder name (for github-repo-tree sources) or plugin name (for marketplaces)
  --dest <project-path>      Target project root (creates .claude/skills/<skill-name>/)
  --as <new-name>            Rename skill on install (default: keep original name)
  --custom-sources <path>    Additional registry file
  --dry-run                  Print actions without writing
`);
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts }).trim();
}

function parseGitHubUrl(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function loadRegistry() {
  const raw = await readFile(registryPath, 'utf8');
  return JSON.parse(raw);
}

async function loadCustom(path) {
  if (!path || !existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.sources) ? parsed.sources : [];
  } catch {
    return [];
  }
}

async function enrichFrontmatter(skillMdPath, meta) {
  if (!existsSync(skillMdPath)) return false;
  const text = await readFile(skillMdPath, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return false;
  const [, fm, rest] = m;
  if (fm.includes('sourcedBy:')) return false; // already enriched
  const addLines = [`sourcedBy: skill-finder/${meta.sourceId}`, `sourceCommit: ${meta.commit}`, `sourceFetchedAt: ${new Date().toISOString()}`];
  const newFm = fm.replace(/\s*$/, '') + '\n' + addLines.join('\n');
  const out = `---\n${newFm}\n---\n${rest}`;
  await writeFile(skillMdPath, out, 'utf8');
  return true;
}

async function installFromGitHubRepoTree({ source, skillName, dest, asName, dryRun }) {
  const gh = parseGitHubUrl(source.url);
  if (!gh) throw new Error(`Not a GitHub URL: ${source.url}`);
  const branch = source.branch || 'main';
  const subPath = source.skillsPath && source.skillsPath !== '.' ? `${source.skillsPath}/${skillName}` : skillName;
  const finalName = asName || skillName;

  const tmp = join(tmpdir(), `skill-finder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  try {
    sh(`git clone --depth 1 --branch ${branch} ${source.url} "${tmp}"`);
  } catch {
    sh(`git clone --depth 1 ${source.url} "${tmp}"`);
  }
  const commit = sh('git rev-parse HEAD', { cwd: tmp });
  const srcDir = join(tmp, subPath.split('/').join(sep));
  if (!existsSync(srcDir)) {
    await rm(tmp, { recursive: true, force: true });
    throw new Error(`Skill folder not found upstream: ${subPath}`);
  }
  const destDir = join(dest, '.claude', 'skills', finalName);

  if (dryRun) {
    console.log(`[dry-run] would copy ${srcDir} → ${destDir}`);
    await rm(tmp, { recursive: true, force: true });
    return { ok: true, dest: destDir, commit, dryRun: true };
  }

  if (existsSync(destDir)) {
    await rm(tmp, { recursive: true, force: true });
    throw new Error(`Destination already exists: ${destDir}. Use --as to rename or remove the existing skill first.`);
  }

  await mkdir(dirname(destDir), { recursive: true });
  await cp(srcDir, destDir, { recursive: true });
  const enriched = await enrichFrontmatter(join(destDir, 'SKILL.md'), { sourceId: source.id, commit });
  await rm(tmp, { recursive: true, force: true });
  return { ok: true, dest: destDir, commit, enriched };
}

function printMarketplaceInstructions({ source, pluginName }) {
  const installCmd = source.installSyntax ? source.installSyntax.replace('{name}', pluginName) : `/plugin install ${pluginName}@${source.id}`;
  console.log(`\nThis source is a plugin marketplace. Install is user-gated.\n`);
  console.log(`Run this command in Claude Code:`);
  console.log(`  ${installCmd}\n`);
  console.log(`(If the marketplace needs to be registered first:`);
  console.log(`  /plugin marketplace add ${source.url.replace('https://github.com/', '')}`);
  console.log(`)\n`);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) return printHelp();
  for (const req of ['source', 'skill', 'dest']) {
    if (!flags[req]) {
      printHelp();
      console.error(`\nMissing required flag: --${req}`);
      process.exit(1);
    }
  }

  const registry = await loadRegistry();
  const customs = await loadCustom(flags.customSourcesPath);
  const all = [...registry.sources, ...customs];
  const source = all.find((s) => s.id === flags.source);
  if (!source) {
    console.error(`Source not found: ${flags.source}`);
    process.exit(1);
  }

  if (source.indexType === 'web-scrape') {
    console.error(`Cannot install from web-scrape source in v1: ${source.id}`);
    process.exit(1);
  }

  if (source.indexType === 'marketplace-json') {
    printMarketplaceInstructions({ source, pluginName: flags.skill });
    return;
  }

  if (source.indexType === 'awesome-list') {
    console.error(`awesome-list sources list external items; inspect the entry URL and register it as a custom source, then install.`);
    process.exit(1);
  }

  if (source.indexType === 'github-repo-tree') {
    const result = await installFromGitHubRepoTree({
      source,
      skillName: flags.skill,
      dest: resolve(flags.dest),
      asName: flags.as,
      dryRun: flags.dryRun,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error(`Unknown indexType: ${source.indexType}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
