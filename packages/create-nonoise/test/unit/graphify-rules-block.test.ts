import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const monoRoot = resolve(here, '..', '..', '..', '..');

describe('graphify rules block', () => {
  it('SKILL.md inlines the canonical block from references/rules-block.md', async () => {
    const reference = await readFile(
      resolve(monoRoot, 'packages/skills/graphify-setup/references/rules-block.md'),
      'utf8',
    );
    const skill = await readFile(
      resolve(monoRoot, 'packages/skills/graphify-setup/SKILL.md'),
      'utf8',
    );

    const referenceBody = reference.replace(/\r\n/g, '\n').trim();
    const normalizedSkill = skill.replace(/\r\n/g, '\n');

    // The block appears inside an indented code fence in SKILL.md. Normalize
    // by stripping the 3-space indent prefix from each candidate region.
    const dedented = normalizedSkill
      .split('\n')
      .map((line) => (line.startsWith('   ') ? line.slice(3) : line))
      .join('\n');

    expect(dedented).toContain(referenceBody);
  });

  it('all 10 Handlebars templates contain the new query/path/explain rule', async () => {
    const fg = await import('fast-glob');
    const files = await fg.default('packages/templates/**/*.hbs', { cwd: monoRoot, absolute: true });
    const offenders: string[] = [];
    for (const f of files) {
      const txt = await readFile(f, 'utf8');
      if (!txt.includes('## graphify')) continue;
      if (!txt.includes('For cross-module "how does X relate to Y"')) {
        offenders.push(f);
      }
      if (txt.includes('_rebuild_code')) {
        offenders.push(`${f} (still references deprecated _rebuild_code)`);
      }
    }
    expect(offenders, `Templates out of sync: ${offenders.join(', ')}`).toEqual([]);
  });
});
