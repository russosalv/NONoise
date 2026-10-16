import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lstatSync, mkdtempSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
vi.mock('node:child_process', () => ({ execFileSync: vi.fn(() => '[]') }));
import { doctor } from '../../src/native-vendor.js';
import type { AiToolKey } from '../../src/types.js';

let dir: string;
const roots: [AiToolKey, string][] = [
  ['claudeCode', '.claude'], ['codex', '.agents'], ['codex', '.codex'],
  ['copilot', '.github'], ['copilot', '.copilot'], ['cursor', '.cursor'], ['geminiCli', '.gemini'],
];
function configure(tool: AiToolKey, vendorMode = 'native') {
  writeFileSync(join(dir, 'nonoise.config.json'), JSON.stringify({ vendorMode,
    aiTools: { claudeCode: false, codex: false, copilot: false, cursor: false, geminiCli: false, [tool]: true },
  }));
}
function link(path: string, target: string) {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  symlinkSync(target, join(dir, path));
}
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'nonoise-doctor-links-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('doctor skill symlinks', () => {
  it.each(roots)('reports broken links for %s in %s with a repair hint and no writes', (tool, root) => {
    configure(tool);
    const path = `${root}/skills/xlsx`;
    link(path, '../../missing/xlsx');
    const config = readFileSync(join(dir, 'nonoise.config.json'));
    const before = lstatSync(join(dir, path));
    const lines = doctor(dir);
    expect(lines).toContainEqual(expect.stringMatching(new RegExp(`Broken skill symlink: .*${path}.*restore.*target.*recreate`, 'i')));
    expect(readlinkSync(join(dir, path))).toBe('../../missing/xlsx');
    expect(lstatSync(join(dir, path)).mtimeMs).toBe(before.mtimeMs);
    expect(readFileSync(join(dir, 'nonoise.config.json'))).toEqual(config);
  });
  it('checks nested links and a broken skills root in embed mode', () => {
    configure('codex', 'embed');
    link('.agents/skills/custom/references/data', '../../../../missing');
    link('.codex/skills', '../missing');
    const lines = doctor(dir).filter(line => line.startsWith('Broken skill symlink:'));
    expect(lines).toHaveLength(2);
    expect(lines.join('\n')).toContain('.agents/skills/custom/references/data');
    expect(lines.join('\n')).toContain('.codex/skills');
  });
  it('ignores unselected tools and healthy links without traversing linked directories', () => {
    configure('claudeCode');
    link('.codex/skills/broken', '../missing');
    link('external/broken', 'missing');
    link('.claude/skills/healthy', '../../external');
    link('.claude/skills/ancestor', '..');
    expect(doctor(dir).filter(line => line.startsWith('Broken skill symlink:'))).toEqual([]);
  });
  it('reports cyclic links without recursing indefinitely', () => {
    configure('claudeCode');
    link('.claude/skills/cycle-a', 'cycle-b');
    link('.claude/skills/cycle-b', 'cycle-a');
    expect(doctor(dir).filter(line => line.startsWith('Broken skill symlink:'))).toHaveLength(2);
  });
  it('accepts absent optional skill directories', () => {
    configure('cursor');
    expect(doctor(dir).filter(line => line.startsWith('Broken skill symlink:'))).toEqual([]);
  });
});
