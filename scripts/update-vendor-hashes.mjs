#!/usr/bin/env node
// Append known embed bytes; never replace historical ownership hashes.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'packages/create-nonoise/src/legacy-vendor-hashes.ts');
const previous = readFileSync(target, 'utf8');
const hashes = JSON.parse(previous.slice(previous.indexOf('=') + 1).trim().replace(/;$/, ''));
const vendor = join(root, 'packages/skills/vendor');
function addTree(source, dest) {
  if (!existsSync(source)) return;
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const src = join(source, entry.name), dst = `${dest}/${entry.name}`;
    if (entry.isDirectory()) addTree(src, dst);
    else if (entry.isFile()) addFile(src, dst);
  }
}
function addFile(src, dst) {
  const digest = createHash('sha256').update(readFileSync(src)).digest('hex');
  hashes[dst] ??= [];
  if (!hashes[dst].includes(digest)) hashes[dst].push(digest);
}
addTree(join(vendor, 'superpowers/skills'), '.claude/skills/superpowers');
for (const dir of ['hooks', 'commands', 'agents']) addTree(join(vendor, 'superpowers', dir), `.claude/${dir}/superpowers`);
addTree(join(vendor, 'impeccable/impeccable'), '.claude/skills/impeccable');
for (const name of ['pptx', 'skill-creator']) addTree(join(vendor, name), `.claude/skills/${name}`);
for (const [harness, file] of [['.claude', 'skill.md'], ['.copilot', 'skill-copilot.md'], ['.agents', 'skill-codex.md']]) {
  addFile(join(root, 'packages/skills/graphify-platform-skills', file), `${harness}/skills/graphify/SKILL.md`);
}
writeFileSync(target, previous.slice(0, previous.indexOf('=') + 1) + ' ' + JSON.stringify(hashes, null, 2) + ';\n');
console.log(`Preserved historical hashes and recorded current embed files: ${Object.keys(hashes).length} paths`);
