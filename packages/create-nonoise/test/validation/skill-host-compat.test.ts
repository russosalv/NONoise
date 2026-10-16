import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderEccFiles, STACKS } from '../../src/ecc.js';
import { listShippedSkills, validateSkill, validateAgent } from '../../src/skill-host-compat.js';

const root = fileURLToPath(new URL('../../../skills/', import.meta.url));
const doc = (fields: string) => `---\n${fields}\n---\n\nInstructions.\n`;

describe('skill-host-compat parser and metadata contracts', () => {
  it('accepts strict YAML strings, block scalars, BOM and CRLF', () => {
    expect(validateSkill('\uFEFF' + doc('name: example\ndescription: >-\n  Review files: safely.').replaceAll('\n', '\r\n'), 'example')).toEqual([]);
  });
  it.each([
    ['missing frontmatter', 'name: example'],
    ['unterminated frontmatter', '---\nname: example\ndescription: valid'],
    ['non-mapping frontmatter', doc('[name, description]')],
    ['invalid YAML', doc('name: example\ndescription: Inspect: files')],
    ['duplicate fields', doc('name: example\nname: example\ndescription: valid')],
    ['non-string name', doc('name: 123\ndescription: valid')],
    ['missing description', doc('name: example')],
    ['blank description', doc('name: example\ndescription: " "')],
    ['non-string description', doc('name: example\ndescription: [inspect]')],
    ['wrong directory name', doc('name: other\ndescription: valid')],
    ['invalid slug', doc('name: Example_Name\ndescription: valid')],
    ['long name', doc(`name: ${'a'.repeat(65)}\ndescription: valid`)],
    ['long description', doc(`name: example\ndescription: ${'x'.repeat(1025)}`)],
    ['invalid tools', doc('name: example\ndescription: valid\nallowed-tools: {Read: true}')],
  ])('rejects %s', (_label, content) => {
    expect(validateSkill(content, 'example').length).toBeGreaterThan(0);
  });
  it.each(['Example_Name', 'a'.repeat(65), '-leading', 'double--dash'])('rejects invalid name even when its directory matches: %s', name => {
    expect(validateSkill(doc(`name: ${name}\ndescription: valid`), name)).not.toEqual([]);
  });
  it('accepts the boundary lengths and scoped tool permissions', () => {
    expect(validateSkill(doc(`name: ${'a'.repeat(64)}\ndescription: ${'x'.repeat(1024)}\nallowed-tools: Read, Bash(git diff:*)`), 'a'.repeat(64))).toEqual([]);
  });
  it('rejects Claude tool names in a Copilot projection and vice versa', () => {
    expect(validateAgent(doc('name: reviewer\ndescription: Review changes\ntools: [Read, Grep]'), 'claude', 'reviewer')).toEqual([]);
    expect(validateAgent(doc('name: reviewer\ndescription: Review changes\ntools: [read, search]'), 'copilot', 'reviewer')).toEqual([]);
    expect(validateAgent(doc('name: reviewer\ndescription: Review changes\ntools: [Read]'), 'copilot', 'reviewer')).not.toEqual([]);
    expect(validateAgent(doc('name: reviewer\ndescription: Review changes\ntools: [execute]'), 'claude', 'reviewer')).not.toEqual([]);
  });
  it('validates the native Codex TOML projection and refuses malformed or Claude-specific fields', () => {
    const valid = 'name = "reviewer"\ndescription = "Review changes"\ndeveloper_instructions = "Review safely.\\nReport evidence."\n';
    expect(validateAgent(valid, 'codex', 'reviewer')).toEqual([]);
    for (const content of [valid.replace('"reviewer"', 'reviewer'), valid + 'name = "reviewer"\n', valid + 'tools = ["Read"]\n', valid.replace('developer_instructions =', 'instructions =')]) {
      expect(validateAgent(content, 'codex', 'reviewer')).not.toEqual([]);
    }
  });
});

describe('skill-host-compat shipped assets', () => {
  it('validates every native/vendor skill and shipped Graphify host snapshot', () => {
    const skills = listShippedSkills(root);
    expect(skills.length).toBeGreaterThan(60);
    expect(skills.some(s => s.path.includes('/vendor/ecc/'))).toBe(true);
    expect(skills.some(s => s.path.includes('/vendor/superpowers/'))).toBe(true);
    expect(skills.some(s => s.path.includes('/vendor/graphify/'))).toBe(false);
    const errors = skills.flatMap(({ path, name }) => validateSkill(readFileSync(path, 'utf8'), name).map(e => `${path}: ${e}`));
    expect(errors, errors.join('\n')).toEqual([]);
  });
  it('validates the Claude, Copilot and Codex agent projections for every stack', () => {
    const errors: string[] = [];
    let checked = 0;
    const files = renderEccFiles(root, { claudeCode: true, codex: true, copilot: true, cursor: false, geminiCli: false }, STACKS);
    for (const [path, content] of Object.entries(files)) {
      const m = /^(\.claude|\.github|\.codex)\/agents\/(.+?)(?:\.agent)?\.(md|toml)$/.exec(path);
      if (!m) continue;
      const host = m[1] === '.claude' ? 'claude' : m[1] === '.github' ? 'copilot' : 'codex';
      errors.push(...validateAgent(content, host, m[2]!).map(e => `${path}: ${e}`));
      checked++;
    }
    expect(checked).toBe(30);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
