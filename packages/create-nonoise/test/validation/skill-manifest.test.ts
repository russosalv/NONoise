import { describe, it, expect } from 'vitest';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILLS_ROOT = resolve(__dirname, '..', '..', '..', '..', 'packages', 'skills');

describe('skill manifest validation', () => {
  it('every skill has a SKILL.md with valid frontmatter', async () => {
    const entries = await readdir(SKILLS_ROOT, { withFileTypes: true });
    const skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    expect(skillDirs.length).toBeGreaterThan(0);

    for (const name of skillDirs) {
      const skillPath = join(SKILLS_ROOT, name, 'SKILL.md');
      const s = await stat(skillPath).catch(() => null);
      expect(s, `${name}: SKILL.md must exist`).not.toBeNull();

      const raw = await readFile(skillPath, 'utf8');
      const content = raw.replace(/\r\n/g, '\n');
      const m = content.match(/^---\n([\s\S]*?)\n---/);
      expect(m, `${name}: missing frontmatter`).not.toBeNull();
      const fm = m![1];
      expect(fm, `${name}: missing "name:"`).toMatch(/^name:\s*\S/m);
      expect(fm, `${name}: missing "description:"`).toMatch(/^description:\s*\S/m);

      const nameMatch = fm.match(/^name:\s*(\S+)/m);
      expect(nameMatch![1], `${name}: frontmatter name must equal folder name`).toBe(name);
    }
  });
});
