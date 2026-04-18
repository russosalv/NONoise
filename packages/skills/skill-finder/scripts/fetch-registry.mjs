#!/usr/bin/env node
// Fetch available skills from each registered source.
//
// Usage:
//   node fetch-registry.mjs [--source <id>] [--stack <csv>] [--json] [--custom-sources <path>]
//
// Behavior:
//   - Loads registry.json (sibling of this script's grandparent) + optional custom sources file.
//   - For each source (or the one specified), fetches its index according to indexType.
//   - Prints a unified JSON summary on stdout: { sources: [ { id, skills: [ ... ], error? } ] }.
//   - --stack filters skills whose tags or name heuristically match the declared stack(s).
//
// indexType support:
//   - github-repo-tree    → GitHub API /repos/:owner/:repo/contents/:path (lists dirs = skills)
//   - marketplace-json    → fetch raw JSON from raw.githubusercontent.com, parse plugins[]
//   - awesome-list        → fetch README.md, parse markdown headings + bullet links
//   - web-scrape          → not implemented in v1; emits { implemented: false }
//
// No authentication: uses public GitHub endpoints. Subject to 60 req/hour anon rate limit.
// Pass GITHUB_TOKEN env var to bump to 5000/hour.

import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
    else if (a === '--stack') flags.stack = (argv[++i] || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    else if (a === '--json') flags.json = true;
    else if (a === '--custom-sources') flags.customSourcesPath = argv[++i];
    else if (a === '--help' || a === '-h') flags.help = true;
    i++;
  }
  return flags;
}

function printHelp() {
  console.log(`fetch-registry — enumerate available skills from registry sources

Usage:
  node fetch-registry.mjs [--source <id>] [--stack js,csharp,...] [--json] [--custom-sources <path>]

Options:
  --source <id>              Only fetch a specific source (default: all).
  --stack <csv>              Filter results heuristically by stack tags/names.
  --custom-sources <path>    Additional sources JSON file (merged into registry).
  --json                     Compact JSON output (default: pretty).
  --help, -h                 Show help.

Environment:
  GITHUB_TOKEN    Raises anonymous GitHub API rate limit (60/h → 5000/h).
`);
}

async function loadRegistry() {
  const raw = await readFile(registryPath, 'utf8');
  return JSON.parse(raw);
}

async function loadCustomSources(path) {
  if (!path) return [];
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.sources) ? parsed.sources : [];
  } catch {
    return [];
  }
}

function ghHeaders() {
  const headers = { 'User-Agent': 'nonoise-skill-finder' };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `token ${token}`;
  return headers;
}

function parseGitHubUrl(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.text();
}

async function fetchGithubRepoTree(source) {
  const gh = parseGitHubUrl(source.url);
  if (!gh) throw new Error(`Not a GitHub URL: ${source.url}`);
  const path = source.skillsPath && source.skillsPath !== '.' ? source.skillsPath : '';
  const branch = source.branch || 'main';
  const apiUrl = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${path}?ref=${branch}`;
  const body = await fetchJson(apiUrl);
  if (!Array.isArray(body)) throw new Error(`Unexpected shape from ${apiUrl}`);
  const skills = body
    .filter((entry) => entry.type === 'dir')
    .map((entry) => ({
      name: entry.name,
      path: entry.path,
      installFrom: `${source.url}/tree/${branch}/${entry.path}`,
      rawBase: `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${branch}/${entry.path}`,
    }));
  return skills;
}

async function fetchMarketplaceJson(source) {
  const gh = parseGitHubUrl(source.url);
  if (!gh) throw new Error(`Not a GitHub URL: ${source.url}`);
  const branch = source.branch || 'main';
  const rawUrl = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${branch}/${source.marketplacePath}`;
  const body = await fetchJson(rawUrl);
  const plugins = Array.isArray(body.plugins) ? body.plugins : Array.isArray(body) ? body : [];
  return plugins.map((p) => ({
    name: p.name,
    description: p.description || '',
    install: source.installSyntax ? source.installSyntax.replace('{name}', p.name) : null,
    raw: p,
  }));
}

async function fetchAwesomeList(source) {
  const gh = parseGitHubUrl(source.url);
  if (!gh) throw new Error(`Not a GitHub URL: ${source.url}`);
  const branch = source.branch || 'main';
  const rawUrl = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${branch}/${source.readmePath || 'README.md'}`;
  const md = await fetchText(rawUrl);
  const items = [];
  const lineRe = /^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*(?:[-—:]\s*(.*))?$/;
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(lineRe);
    if (m) {
      items.push({ name: m[1], url: m[2], description: (m[3] || '').trim() });
    }
  }
  return items;
}

function stackMatch(candidate, stacks) {
  if (!stacks || stacks.length === 0) return true;
  const hay = `${candidate.name || ''} ${candidate.description || ''} ${(candidate.raw && (candidate.raw.description || '')) || ''}`.toLowerCase();
  return stacks.some((s) => hay.includes(s));
}

async function fetchSource(source, stacks) {
  const common = { id: source.id, url: source.url, indexType: source.indexType, tags: source.tags || [] };
  try {
    let items = [];
    if (source.indexType === 'github-repo-tree') items = await fetchGithubRepoTree(source);
    else if (source.indexType === 'marketplace-json') items = await fetchMarketplaceJson(source);
    else if (source.indexType === 'awesome-list') items = await fetchAwesomeList(source);
    else if (source.indexType === 'web-scrape') {
      return { ...common, implemented: false, warning: 'web-scrape indexer not yet implemented in v1 — skipped.', skills: [] };
    } else {
      return { ...common, error: `Unknown indexType: ${source.indexType}`, skills: [] };
    }
    const filtered = items.filter((it) => stackMatch(it, stacks));
    return { ...common, count: filtered.length, skills: filtered };
  } catch (err) {
    return { ...common, error: err.message, skills: [] };
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) return printHelp();

  const registry = await loadRegistry();
  const customs = await loadCustomSources(flags.customSourcesPath);
  const allSources = [...registry.sources, ...customs];
  const selected = flags.source ? allSources.filter((s) => s.id === flags.source) : allSources;
  if (selected.length === 0) {
    console.error(`No source matched id="${flags.source}"`);
    process.exit(1);
  }

  const results = [];
  for (const src of selected) {
    results.push(await fetchSource(src, flags.stack));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    registryVersion: registry.version,
    stackFilter: flags.stack || null,
    sources: results,
  };

  if (flags.json) {
    process.stdout.write(JSON.stringify(output) + '\n');
  } else {
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  }
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
