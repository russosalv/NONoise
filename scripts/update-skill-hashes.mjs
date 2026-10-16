#!/usr/bin/env node
// Record a release's NONoise skill hashes before changing the sources.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const source = resolve(process.argv[2] ?? 'packages/skills');
const target = 'packages/create-nonoise/src/legacy-skill-hashes.ts';
const previous = existsSync(target) ? readFileSync(target, 'utf8') : '';
const hashes = previous ? JSON.parse(previous.slice(previous.indexOf('=') + 1).trim().replace(/;$/, '')) : {};
function walk(dir, relative) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name), `${relative}/${e.name}`);
    else if (e.isFile()) for (const dest of ['.claude/skills', '.agents/skills']) {
      const file = `${dest}/${relative}/${e.name}`;
      const hash = createHash('sha256').update(readFileSync(join(dir, e.name))).digest('hex');
      hashes[file] ??= [];
      if (!hashes[file].includes(hash)) hashes[file].push(hash);
    }
  }
}
for (const e of readdirSync(source, { withFileTypes: true })) if (e.isDirectory() && existsSync(join(source, e.name, 'SKILL.md'))) walk(join(source, e.name), e.name);
writeFileSync(target, '// Historical NONoise skill ownership (append-only SHA-256).\nexport const LEGACY_SKILL_HASHES: Record<string, string[]> = ' + JSON.stringify(hashes, null, 2) + ';\n');
