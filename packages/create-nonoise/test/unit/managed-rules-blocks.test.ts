import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import fg from 'fast-glob';

const monoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const blocks = [
  { name: 'codebase-memory', asset: 'codebase-memory-rules-block.md' },
  { name: 'development-modes', asset: 'development-modes-block.md' },
];
const contextTemplates = ['_always/AGENTS.md.hbs', '_if-claude-code/CLAUDE.md.hbs', '_if-copilot/.github/copilot-instructions.md.hbs', '_if-cursor/.cursor/rules.md.hbs', '_if-gemini-cli/GEMINI.md.hbs'];

describe('managed rules blocks', () => {
  it('the Regia rule presents Qwen and Qoder as one stable qwen executor', async () => {
    const text = await readFile(resolve(monoRoot, 'packages/create-nonoise/src/assets/development-modes-block.md'), 'utf8');
    expect(text).toContain('Qwen/Qoder');
    expect(text).toContain('executor `qwen` uses either a compatible `qwen` or `qoder` command');
  });
  it.each(blocks)('every context template carries the canonical $name block verbatim', async ({ name, asset }) => {
    const canonical = (await readFile(resolve(monoRoot, 'packages/create-nonoise/src/assets', asset), 'utf8')).replace(/\r\n/g, '\n');
    const expected = `<!-- >>> ${name} (managed by create-nonoise) -->\n${canonical}<!-- <<< ${name} -->`;
    for (const template of ['single-project', 'multi-repo']) for (const file of contextTemplates) {
      const text = (await readFile(resolve(monoRoot, 'packages/templates', template, file), 'utf8')).replace(/\r\n/g, '\n');
      expect(text.includes(expected), `${template}/${file} is out of sync with ${asset}`).toBe(true);
    }
  });
  it('no template or shipped skill still tells the agent to use graphify', async () => {
    const files = await fg(['packages/templates/**/*', 'packages/skills/*/**/*.md'], { cwd: monoRoot, absolute: true, dot: true, ignore: ['**/node_modules/**', 'packages/skills/vendor/**'] });
    const offenders: string[] = [];
    for (const file of files) {
      const hits = (await readFile(file, 'utf8')).split('\n').filter(line => /graphify/i.test(line) && !/replac|retir|migrat|1\.9/i.test(line));
      if (hits.length) offenders.push(`${file}: ${hits[0]!.slice(0, 100)}`);
    }
    expect(offenders).toEqual([]);
  });
  it('the three copies of the SDLC flow agree on phases, modes and the FPF gate', async () => {
    const read = (p: string) => readFile(resolve(monoRoot, p), 'utf8');
    const single = await read('packages/templates/single-project/_always/.nonoise/sdlc-flow.md');
    const fallback = await read('packages/skills/polly/references/sdlc-flow.default.md');
    const multi = await read('packages/templates/multi-repo/_always/.nonoise/sdlc-flow.md');
    expect(fallback.slice(fallback.indexOf('---\nversion'))).toBe(single);
    const phases = (text: string) => [...text.matchAll(/^  - id: (\S+)\n    modes: (\[[^\]]+\])/gm)].map(m => `${m[1]} ${m[2]}`);
    expect(phases(single).length).toBe([...single.matchAll(/^  - id: /gm)].length);
    expect(phases(multi).filter(p => !p.startsWith('multi-repo-setup'))).toEqual(phases(single));
    expect(phases(single)).toContain('implementation [quick, medium, long]');
    expect(phases(single)).toContain('feature-design [medium, long]');
    for (const text of [single, multi]) {
      expect(text).toContain('default_mode: medium');
      expect(text).toMatch(/- id: arch-decision\n(?:    .*\n)*?    gate: fpf/);
      for (const mode of ['### quick', '### medium', '### long']) expect(text).toContain(mode);
    }
  });
});
