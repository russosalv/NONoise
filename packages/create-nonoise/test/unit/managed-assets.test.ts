import { it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installManagedAssets, digest } from '../../src/managed-assets.js';
const dirs: string[] = [];
const temp = () => { const p = mkdtempSync(join(tmpdir(), 'assets-')); dirs.push(p); return p; };
afterEach(() => dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
it('updates owned and historical bytes but preserves local edits across repeated upgrades', () => {
  const p = temp();
  installManagedAssets(p, { 'a.md': 'v1', 'b.md': 'v1' });
  writeFileSync(join(p, 'b.md'), 'custom');
  writeFileSync(join(p, 'old.md'), 'old release');
  const files = { 'a.md': 'v2', 'b.md': 'v2', 'old.md': 'v2' };
  expect(installManagedAssets(p, files, { 'old.md': [digest('old release')] })).toEqual({ written: ['a.md', 'old.md'], preserved: ['b.md'] });
  expect(installManagedAssets(p, files)).toEqual({ written: [], preserved: ['b.md'] });
  expect(readFileSync(join(p, 'b.md'), 'utf8')).toBe('custom');
});
it('fails closed on a linked ownership directory', () => {
  const p = temp(), outside = temp();
  symlinkSync(outside, join(p, '.nonoise'));
  expect(() => installManagedAssets(p, { 'a.md': 'new' })).toThrow('Unsafe ownership');
});
it('rejects corrupted ownership data before writing files', () => {
  const p = temp(); mkdirSync(join(p, '.nonoise'));
  writeFileSync(join(p, '.nonoise/file-hashes.json'), '{"file":"invalid"}');
  expect(() => installManagedAssets(p, { 'a.md': 'new' })).toThrow('Invalid NONoise');
});
