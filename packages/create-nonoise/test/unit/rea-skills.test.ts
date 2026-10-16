import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { load } from 'js-yaml';
const root = resolve('../skills');
const read = (name: string) => readFileSync(join(root, name), 'utf8');
describe('REA skill activation contracts', () => {
  it('offers one combined installation/target authorization confirmation, then project-only upgrade', () => {
    const text = read('rea-setup/SKILL.md');
    expect(text).toContain('one confirmation');
    expect(text).toContain('own this software');
    expect(text).toContain('client');
    expect(text).toContain('create-nonoise --upgrade . --with-rea');
    expect(text).toContain('Without confirmation');
    expect(text).toContain('already configured');
    expect(text).toContain('restart');
    expect(text).toMatch(/Never run\s+`rea setup`/);
    for (const trigger of ['.dll', '.exe', '.csproj', 'app.asar', '.har', '.saz', 'SQLite', 'APK', 'firmware']) expect(text).toContain(trigger);
    const meta = load(text.match(/^---\n([\s\S]*?)\n---/)![1]!) as { name: string; description: string };
    expect(meta.name).toBe('rea-setup'); expect(meta.description.length).toBeLessThanOrEqual(1024);
  });
  it('routes artifact discovery before Graphify and preserves dossier save boundaries', () => {
    const text = read('reverse-engineering/SKILL.md');
    expect(text.indexOf('## REA artifact routing')).toBeGreaterThan(0);
    expect(text.indexOf('## REA artifact routing')).toBeLessThan(text.indexOf('### Step 0'));
    expect(text).toContain('rea-setup'); expect(text).toContain('reverse-engineer-anything');
    expect(text).toContain('REA Evidence'); expect(text).toContain('explicit save');
  });
  it('lets Polly suggest REA without installing during advice', () => {
    const text = read('polly/SKILL.md');
    expect(text).toContain('rea-setup'); expect(text).toContain('reverse-engineer-anything');
    expect(text).toContain('advisor-only'); expect(text).toContain('SQLite');
  });
  it('pins vendor commands and replaces upstream global setup recipes', () => {
    const dir = 'vendor/rea/reverse-engineer-anything';
    const files = ['SKILL.md', ...readdirSync(join(root, dir, 'references')).map(p => `references/${p}`)];
    expect(files).toHaveLength(7);
    for (const file of files) {
      const text = read(`${dir}/${file}`);
      expect(text).not.toContain('rea-agents@latest');
      expect(text).not.toMatch(/rea(?:-agents@[^\s]+)? setup --client/);
    }
  });
});
