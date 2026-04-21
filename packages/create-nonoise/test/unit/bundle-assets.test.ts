import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..', '..');

describe('bundle-assets', () => {
  it('does NOT bundle the reference-only vendor/graphify directory', () => {
    const bundled = resolve(pkgRoot, 'skills', 'vendor', 'graphify');
    expect(existsSync(bundled)).toBe(false);
  });

  it('still bundles the other vendor packs', () => {
    for (const name of ['superpowers', 'impeccable', 'skill-creator']) {
      const bundled = resolve(pkgRoot, 'skills', 'vendor', name);
      expect(existsSync(bundled), `expected ${name} to be bundled`).toBe(true);
    }
  });
});
