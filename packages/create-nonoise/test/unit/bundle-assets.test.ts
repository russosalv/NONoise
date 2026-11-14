import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..', '..');

describe('bundle-assets', () => {
  it('no longer ships graphify in any form, and ships the codebase-memory skill', () => {
    expect(existsSync(resolve(pkgRoot, 'skills', 'vendor', 'graphify'))).toBe(false);
    expect(existsSync(resolve(pkgRoot, 'skills', 'graphify-platform-skills'))).toBe(false);
    expect(existsSync(resolve(pkgRoot, 'skills', 'codebase-memory', 'SKILL.md'))).toBe(true);
  });

  it('still bundles the other vendor packs', () => {
    for (const name of ['superpowers', 'impeccable', 'skill-creator']) {
      const bundled = resolve(pkgRoot, 'skills', 'vendor', name);
      expect(existsSync(bundled), `expected ${name} to be bundled`).toBe(true);
    }
  });
});
