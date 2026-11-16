import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { PROFILES, parseProfile, resolveProfile } from '../../src/profiles.js';
import { MVP_SKILL_BUNDLE } from '../../src/skill-bundle.js';
const root = resolve('../skills');
describe('installation profiles', () => {
  it('declares exactly six validated profiles and defaults to core', () => {
    expect(Object.keys(PROFILES)).toEqual(['minimal', 'core', 'developer', 'security', 'brownfield', 'full']);
    expect(parseProfile()).toBe('core');
    expect(() => parseProfile('unknown')).toThrow(/profile/i);
  });
  it('minimal includes Polly without agents, rules, hooks or external runtimes', () => {
    const s = resolveProfile(root, 'minimal', ['dotnet', 'angular']);
    expect(s.nativeSkills).toContain('polly');
    expect(s.ecc).toEqual({ agents: [], rules: [], skills: [], nonoiseAgents: [] });
    expect(s.hooks).toEqual([]);
    expect(s.rea).toBe(false);
    expect(s.vendors).toBe(false);
  });
  it('core keeps the native bundle and combines with an explicit stack', () => {
    const s = resolveProfile(root, 'core', ['dotnet']);
    expect(s.nativeSkills).toEqual(expect.arrayContaining([...MVP_SKILL_BUNDLE]));
    expect(s.ecc.skills).toContain('verification-loop');
    expect(s.ecc.rules).toContain('csharp');
    expect(s.ecc.agents).toContain('csharp-reviewer');
    expect(s.ecc.agents).not.toContain('security-reviewer');
    expect(s.hooks).toEqual([]);
  });
  it('developer selects only formatting hooks; security selects review and safeguards', () => {
    expect(resolveProfile(root, 'developer', []).hooks).toEqual(['post-edit-format', 'stop-format-typecheck']);
    const s = resolveProfile(root, 'security', []);
    expect(s.ecc.agents).toEqual(expect.arrayContaining(['security-reviewer', 'silent-failure-hunter']));
    expect(s.ecc.skills).toContain('mcp-dependency-review');
    expect(s.hooks).toContain('safety-guard');
    expect(s.hooks).not.toContain('post-edit-format');
  });
  it('brownfield enables REA and legacy workflows; full has all seven hooks', () => {
    const s = resolveProfile(root, 'brownfield', []);
    expect(s.rea).toBe(true);
    expect(s.ecc.agents).toContain('spec-miner');
    expect(s.ecc.skills).toEqual(expect.arrayContaining(['module-regression', 'inherit-legacy-style', 'brownfield-retrospective']));
    expect(resolveProfile(root, 'full', ['dotnet', 'angular']).hooks).toHaveLength(7);
    expect(resolveProfile(root, 'full', []).rea).toBe(true);
  });
  it('explicit REA and legacy compatibility are resolved from the same catalog', () => {
    expect(resolveProfile(root, 'minimal', [], { withRea: true }).rea).toBe(true);
    const legacy = resolveProfile(root, 'core', [], { legacy: true });
    expect(legacy.ecc.agents).toHaveLength(8);
    expect(legacy.ecc.skills).toHaveLength(8);
    expect(legacy.hooks).toEqual([]);
    expect(legacy.rea).toBe(false);
  });
  it('adds the language reviewers, build resolvers and rule groups of --stack python,go to core only', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'vendor/ecc/manifest.json'), 'utf8')) as { agents: Record<string, string[]>; rules: Record<string, string[]>; skills: Record<string, string[]> };
    const specific = (kind: 'agents' | 'rules' | 'skills', names: readonly string[]) => names.filter(n => manifest[kind][n]!.length > 0);
    const s = resolveProfile(root, 'core', ['python', 'go']);
    expect(specific('agents', s.ecc.agents)).toEqual(['python-reviewer', 'go-reviewer', 'go-build-resolver']);
    expect(specific('rules', s.ecc.rules)).toEqual(['python', 'golang']);
    expect(s.ecc.rules).toEqual(['common', 'python', 'golang']);
    expect(specific('skills', s.ecc.skills)).toEqual([]);
    for (const [profile, stack] of [['minimal', ['python', 'go']], ['core', []], ['full', []]] as const) {
      const none = resolveProfile(root, profile, stack);
      for (const kind of ['agents', 'rules', 'skills'] as const) expect(specific(kind, none.ecc[kind]), `${profile} ${kind}`).toEqual([]);
    }
    expect(resolveProfile(root, 'minimal', ['python', 'go']).ecc).toEqual({ agents: [], rules: [], skills: [], nonoiseAgents: [] });
    for (const profile of ['developer', 'security', 'brownfield', 'full'] as const) {
      expect(resolveProfile(root, profile, ['python', 'go']).ecc.agents, profile).toEqual(expect.arrayContaining(['python-reviewer', 'go-reviewer', 'go-build-resolver']));
    }
  });
});
