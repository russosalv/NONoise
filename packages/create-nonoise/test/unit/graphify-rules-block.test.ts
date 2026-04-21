import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const monoRoot = resolve(here, '..', '..', '..', '..');
const canonicalPath = resolve(
  monoRoot,
  'packages/create-nonoise/src/assets/graphify-rules-block.md',
);

describe('graphify rules block', () => {
  it('all Handlebars templates contain the canonical rules body', async () => {
    const canonical = (await readFile(canonicalPath, 'utf8')).replace(/\r\n/g, '\n').trim();
    const canonicalBullets = canonical
      .split('\n')
      .filter((l) => l.startsWith('- '));
    expect(canonicalBullets.length).toBeGreaterThan(0);

    const fg = await import('fast-glob');
    const files = await fg.default('packages/templates/**/*.hbs', {
      cwd: monoRoot,
      absolute: true,
    });

    const offenders: string[] = [];
    for (const f of files) {
      const txt = (await readFile(f, 'utf8')).replace(/\r\n/g, '\n');
      if (!txt.includes('## graphify')) continue;
      for (const bullet of canonicalBullets) {
        if (!txt.includes(bullet)) {
          offenders.push(`${f} missing: ${bullet.slice(0, 60)}…`);
        }
      }
      if (txt.includes('_rebuild_code')) {
        offenders.push(`${f} (still references deprecated _rebuild_code)`);
      }
    }
    expect(offenders, `Templates out of sync:\n${offenders.join('\n')}`).toEqual([]);
  });
});
