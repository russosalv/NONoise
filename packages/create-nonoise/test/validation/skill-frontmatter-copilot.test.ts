import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILLS_ROOT = resolve(__dirname, '..', '..', '..', '..', 'packages', 'skills');

// Vendored skills are upstream-owned and out of scope for this check.
const EXCLUDED_DIRS = new Set(['vendor', '_shared']);

const COPILOT_DESCRIPTION_LIMIT = 1024;

async function listNativeSkills(): Promise<string[]> {
  const entries = await readdir(SKILLS_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !EXCLUDED_DIRS.has(e.name))
    .map((e) => e.name)
    .sort();
}

function extractFrontmatter(raw: string): string | null {
  const content = raw.replace(/\r\n/g, '\n');
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

describe('SKILL.md frontmatter — Copilot compatibility', () => {
  it('every native skill has strict-YAML-parseable frontmatter', async () => {
    const skills = await listNativeSkills();
    expect(skills.length, 'expected SKILLS_ROOT to resolve to a non-empty directory').toBeGreaterThan(0);
    const failures: string[] = [];

    for (const name of skills) {
      const skillPath = join(SKILLS_ROOT, name, 'SKILL.md');
      const raw = await readFile(skillPath, 'utf8');
      const fm = extractFrontmatter(raw);
      if (fm === null) {
        failures.push(`${name}: no frontmatter block found`);
        continue;
      }
      try {
        const parsed = yaml.load(fm, { schema: yaml.DEFAULT_SCHEMA });
        if (parsed === null || typeof parsed !== 'object') {
          failures.push(`${name}: frontmatter did not parse as an object`);
        }
      } catch (err) {
        const msg = (err as Error).message.split('\n')[0];
        failures.push(`${name}: YAML parse error — ${msg}`);
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });

  it(`every native skill has a description ≤ ${COPILOT_DESCRIPTION_LIMIT} chars`, async () => {
    const skills = await listNativeSkills();
    expect(skills.length, 'expected SKILLS_ROOT to resolve to a non-empty directory').toBeGreaterThan(0);
    const failures: string[] = [];

    for (const name of skills) {
      const skillPath = join(SKILLS_ROOT, name, 'SKILL.md');
      const raw = await readFile(skillPath, 'utf8');
      const fm = extractFrontmatter(raw);
      if (fm === null) continue;
      let parsed: unknown;
      try {
        parsed = yaml.load(fm, { schema: yaml.DEFAULT_SCHEMA });
      } catch {
        continue;
      }
      const desc = (parsed as Record<string, unknown>)?.description;
      if (typeof desc !== 'string') {
        failures.push(`${name}: description missing or not a string`);
        continue;
      }
      if (desc.length > COPILOT_DESCRIPTION_LIMIT) {
        failures.push(`${name}: description is ${desc.length} chars (limit ${COPILOT_DESCRIPTION_LIMIT})`);
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});
