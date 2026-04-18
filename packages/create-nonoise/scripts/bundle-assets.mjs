import { cp, rm, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const monoRoot = resolve(pkgRoot, '..', '..');

const targets = [
  {
    from: resolve(monoRoot, 'packages/templates'),
    to: resolve(pkgRoot, 'templates'),
    filterDirs: ['single-project'],
  },
  {
    from: resolve(monoRoot, 'packages/skills'),
    to: resolve(pkgRoot, 'skills'),
    filterDirs: ['graphify-gitignore', 'vscode-config-generator', 'docs-md-generator'],
  },
];

for (const t of targets) {
  await rm(t.to, { recursive: true, force: true });
  await mkdir(t.to, { recursive: true });
  for (const sub of t.filterDirs) {
    await cp(resolve(t.from, sub), resolve(t.to, sub), { recursive: true });
  }
}

console.log('Assets bundled.');
