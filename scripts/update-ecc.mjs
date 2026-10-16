#!/usr/bin/env node
// Manual snapshot refresh. Reads git objects only; never changes the source checkout.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { adaptEcc } from './ecc-adapt.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'packages/skills/vendor/ecc');
const manifest = JSON.parse(readFileSync(join(dest, 'manifest.json'), 'utf8'));
const [repo, revision, ...flags] = process.argv.slice(2);
if (!repo || !revision || flags.some(x => !['--check', '--dry-run'].includes(x))) {
  console.error('Usage: node scripts/update-ecc.mjs <local ECC clone> <commit> [--dry-run|--check]'); process.exit(2);
}
const git = (...args) => execFileSync('git', ['-C', resolve(repo), ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const commit = git('rev-parse', '--verify', `${revision}^{commit}`).trim();
const files = git('ls-tree', '-r', '--name-only', commit).trim().split('\n').filter(p =>
  (p.startsWith('agents/') && p.endsWith('.md') && Object.hasOwn(manifest.agents, p.slice(7, -3))) ||
  (p.startsWith('rules/') && Object.hasOwn(manifest.rules, p.split('/')[1]) && !p.endsWith('/hooks.md')) ||
  (p.startsWith('skills/') && Object.hasOwn(manifest.skills, p.split('/')[1]))
).sort();
for (const name of Object.keys(manifest.agents)) if (!files.includes(`agents/${name}.md`)) throw new Error(`Missing agent: ${name}`);
for (const name of Object.keys(manifest.skills)) if (!files.includes(`skills/${name}/SKILL.md`)) throw new Error(`Missing skill: ${name}`);
for (const group of Object.keys(manifest.rules)) if (!files.some(p => p.startsWith(`rules/${group}/`))) throw new Error(`Missing rules: ${group}`);
const temp = mkdtempSync(join(tmpdir(), 'nonoise-ecc-'));
const next = join(temp, 'ecc'); mkdirSync(next);
try {
  // Hooks are separately maintained NONoise adaptations, with per-file source
  // attribution. This snapshot command neither regenerates nor deletes them.
  if (existsSync(join(dest, 'hooks'))) cpSync(join(dest, 'hooks'), join(next, 'hooks'), { recursive: true });
  for (const path of files) {
    let text = adaptEcc(path, git('show', `${commit}:${path}`));
    const source = `Source: ${manifest.repository}/blob/${commit}/${path} | Commit: ${commit} | MIT | Adapted for NONoise; see UPSTREAM.md.`;
    if (text.startsWith('---\n')) text = text.replace('---\n', `---\n# ${source}\n`);
    else text = `<!-- ${source} -->\n\n${text}`;
    mkdirSync(dirname(join(next, path)), { recursive: true }); writeFileSync(join(next, path), text);
  }
  writeFileSync(join(next, 'LICENSE'), `Source: ${manifest.repository}/blob/${commit}/LICENSE\nCommit: ${commit}\n\n` + git('show', `${commit}:LICENSE`));
  writeFileSync(join(next, 'manifest.json'), JSON.stringify({ ...manifest, commit }, null, 2) + '\n');
  writeFileSync(join(next, 'UPSTREAM.md'), `# ECC snapshot\n\nRepository: ${manifest.repository}\nCommit: ${commit}\nLicense: MIT (see LICENSE). Manual snapshot; no plugin, installer or automatic updates.\n\nRefresh: \`node scripts/update-ecc.mjs /path/to/ECC <commit>\`; preview with \`--dry-run\`, verify reproducibility with \`--check\`. The source clone is read-only. Review both the complete diff and scripts/ecc-adapt.mjs before committing.\n\n## Adaptations\n\n- Every copied file records its upstream path and commit.\n- Standalone hooks in hooks/ are separately maintained NONoise adaptations with per-file attribution; refresh preserves them, and --check only verifies the generated agents/rules/skills snapshot.\n- Hook rule files are excluded; legacy-style uses instruction references, verification-loop complements Superpowers.\n- ECC planning/TDD/review/onboarding/ADR/test references route to NONoise/Superpowers or included agents and skills. No ECC orchestration, learning, dashboard or duplicate lifecycle system is installed. Optional NONoise hook adapters are selected separately by the install profile.\n- common/agents.md describes only this selection. Non-imported reviewer and related-skill dependencies are removed.\n- spec-miner writes docs/architecture/specs/<capability>/spec.md and retains read-only shell guardrails; no OpenSpec dependency.\n- TypeScript reviewer uses its included React checklist; security/database reviewers use included guidance.\n- Harness emitters convert metadata, rule paths and relative links; Claude model is inherited, Copilot/Codex do not inherit Anthropic model names. Codex permissions inherit from the parent.\n- mcp-dependency-review stays static and project-scoped; adds Claude/Codex/Copilot config paths, TOML handling and NONoise capability fallbacks without executing servers.\n- Stack mapping is recorded in manifest.json: empty eligibility means always; Angular includes TypeScript and web rules; cross-stack API/database/contract skills require any stack, E2E requires a JS/web stack.\n\n## Files copied\n\n- LICENSE\n${files.map(f => '- ' + f).join('\n')}\n`);
  const diff = spawnSync('git', ['diff', '--no-index', '--', dest, next], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
  if (![0, 1].includes(diff.status)) throw new Error(diff.stderr || 'Cannot show snapshot diff');
  process.stdout.write(diff.stdout);
  if (flags.includes('--check')) process.exitCode = diff.status;
  else if (!flags.includes('--dry-run')) {
    rmSync(dest, { recursive: true }); cpSync(next, dest, { recursive: true });
    console.log(`ECC snapshot: ${files.length} source files at ${commit}`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
