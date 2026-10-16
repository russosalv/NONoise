import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

it('refreshes the pinned skill snapshot without deleting separately maintained hook adaptations', () => {
  const temp = mkdtempSync(join(tmpdir(), 'ecc-refresh-'));
  const write = (path: string, text: string) => writeFileSync(join(temp, path), text);
  const git = (...args: string[]) => execFileSync('git', ['-C', join(temp, 'upstream'), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    for (const path of ['scripts', 'upstream/skills/example', 'packages/skills/vendor/ecc/hooks']) mkdirSync(join(temp, path), { recursive: true });
    for (const script of ['update-ecc.mjs', 'ecc-adapt.mjs']) copyFileSync(fileURLToPath(new URL(`../../../../scripts/${script}`, import.meta.url)), join(temp, 'scripts', script));
    write('upstream/LICENSE', 'MIT\n');
    write('upstream/skills/example/SKILL.md', '---\nname: example\ndescription: Review safely\n---\n');
    git('init', '-q'); git('add', '.'); git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture');
    const commit = git('rev-parse', 'HEAD').trim();
    write('packages/skills/vendor/ecc/manifest.json', JSON.stringify({ repository: 'https://example.invalid/ecc', commit, agents: {}, rules: {}, skills: { example: [] } }));
    write('packages/skills/vendor/ecc/hooks/local.cjs', '// Standalone NONoise adaptation; maintained separately.\n');
    const update = (flags: string[] = []) => execFileSync(process.execPath, [join(temp, 'scripts/update-ecc.mjs'), join(temp, 'upstream'), commit, ...flags], { encoding: 'utf8' });
    update();
    expect(readFileSync(join(temp, 'packages/skills/vendor/ecc/hooks/local.cjs'), 'utf8')).toBe('// Standalone NONoise adaptation; maintained separately.\n');
    expect(readFileSync(join(temp, 'packages/skills/vendor/ecc/skills/example/SKILL.md'), 'utf8')).toContain(`Commit: ${commit}`);
    expect(update(['--check'])).toBe('');
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
