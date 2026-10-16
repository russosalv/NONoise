import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { scaffold } from '../../src/scaffold.js';
import { runPrompts } from '../../src/prompts.js';
import { PROFILES, resolveProfile, type Profile } from '../../src/profiles.js';
const dirs: string[] = [];
const ai = { claudeCode: true, codex: true, copilot: true, cursor: false, geminiCli: false };
const paths = { templatesRoot: resolve('../templates'), skillsRoot: resolve('../skills') };
afterEach(() => dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
describe('profile scaffolds', () => {
  it.each(Object.keys(PROFILES) as Profile[])('%s installs exactly the selected native/ECC capabilities on all three hosts', async profile => {
    const projectPath = mkdtempSync(join(tmpdir(), 'profile-')); dirs.push(projectPath);
    await scaffold({ projectName: 'demo', projectPath, template: 'single-project', workspaceKind: 'new', aiTools: ai, gitInit: false, frameworkVersion: '1.8.0', profile, stack: ['dotnet', 'angular'], vendorMode: 'native' }, paths);
    const selected = resolveProfile(paths.skillsRoot, profile, ['dotnet', 'angular']);
    const cfg = JSON.parse(readFileSync(join(projectPath, 'nonoise.config.json'), 'utf8'));
    expect(cfg.profile).toBe(profile);
    expect(cfg.withRea).toBe(selected.rea);
    for (const dir of ['.claude/skills', '.agents/skills']) for (const name of [...selected.nativeSkills, ...selected.ecc.skills]) expect(existsSync(join(projectPath, dir, name, 'SKILL.md')), `${profile}: ${dir}/${name}`).toBe(true);
    for (const name of ['spec-miner', 'security-reviewer', 'csharp-reviewer']) {
      expect(existsSync(join(projectPath, '.claude/agents', name + '.md'))).toBe(selected.ecc.agents.includes(name));
      expect(existsSync(join(projectPath, '.codex/agents', name + '.toml'))).toBe(selected.ecc.agents.includes(name));
      expect(existsSync(join(projectPath, '.github/agents', name + '.agent.md'))).toBe(selected.ecc.agents.includes(name));
    }
    expect(existsSync(join(projectPath, '.mcp.json'))).toBe(selected.rea);
    if (profile === 'minimal') {
      expect(existsSync(join(projectPath, '.claude/settings.json'))).toBe(false);
      expect(existsSync(join(projectPath, '.nonoise/hooks'))).toBe(false);
    }
  });
  it('merges optional hooks without replacing existing Claude settings', async () => {
    const projectPath = mkdtempSync(join(tmpdir(), 'merge-settings-')); dirs.push(projectPath);
    mkdirSync(join(projectPath, '.claude'));
    writeFileSync(join(projectPath, '.claude/settings.json'), JSON.stringify({ permissions: { allow: ['Read'] }, hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo USER_HOOK' }] }] } }));
    await scaffold({ projectName: 'demo', projectPath, template: 'single-project', workspaceKind: 'new', aiTools: ai, gitInit: false, frameworkVersion: '1.8.0', profile: 'security' }, paths);
    const settings = JSON.parse(readFileSync(join(projectPath, '.claude/settings.json'), 'utf8'));
    expect(settings.permissions.allow).toEqual(['Read']);
    expect(settings.hooks.SessionStart[0].hooks[0].command).toBe('echo USER_HOOK');
    expect(settings.hooks.PreToolUse.length).toBeGreaterThan(0);
  });
  it('rejects REA without a supported host before creating files', async () => {
    const projectPath = mkdtempSync(join(tmpdir(), 'unsupported-rea-')); dirs.push(projectPath);
    await expect(scaffold({ projectName: 'demo', projectPath, template: 'single-project', workspaceKind: 'new', aiTools: { ...ai, claudeCode: false, codex: false, copilot: false, cursor: true }, gitInit: false, frameworkVersion: '1.8.0', profile: 'brownfield' }, paths)).rejects.toThrow(/REA.*Claude.*Codex.*Copilot/);
    expect(existsSync(join(projectPath, 'nonoise.config.json'))).toBe(false);
  });
  it('noninteractive prompts default core and accept explicit profile and REA', async () => {
    const flags = { positionalDir: 'profile-demo', yes: true, noGit: true, ai: 'codex' };
    expect((await runPrompts(flags, '1.8.0')).profile).toBe('core');
    const ctx = await runPrompts({ ...flags, profile: 'minimal', withRea: true }, '1.8.0');
    expect(ctx.profile).toBe('minimal');
    expect(ctx.withRea).toBe(true);
  });
});
