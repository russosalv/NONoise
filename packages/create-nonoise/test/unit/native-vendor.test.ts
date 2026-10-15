import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, cpSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
vi.mock('node:child_process', () => ({ execFileSync: vi.fn(), execSync: vi.fn() }));
import { execFileSync } from 'node:child_process';
import { configureNativeVendors, nativePlan, doctor, installNativeGraphify, installNativeVendors, run, hasInstalledPlugin } from '../../src/native-vendor.js';
import { replaceManagedBlock } from '../../src/managed-block.js';
import { migrateLegacyVendors } from '../../src/vendor-migration.js';
import { scaffold } from '../../src/scaffold.js';
import { runUpgrade } from '../../src/upgrade.js';
import type { AiTools } from '../../src/types.js';
const ai: AiTools = { claudeCode: true, copilot: false, codex: false, cursor: false, geminiCli: false };
const paths = { templatesRoot: resolve('../templates'), skillsRoot: resolve('../skills') };
const mocked = vi.mocked(execFileSync);
let dir: string;
function put(relative: string, content: string) { const p = join(dir, relative); mkdirSync(resolve(p, '..'), { recursive: true }); writeFileSync(p, content); }
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'nonoise-native-')); mocked.mockReset(); mocked.mockImplementation(() => { throw new Error('ENOENT test tool missing'); }); });
afterEach(() => rmSync(dir, { force: true, recursive: true }));

describe('managed blocks', () => {
  const generated = '# Title\n<!-- nonoise:begin v1.7.0 -->\nnew\n<!-- nonoise:end -->\n';
  it('replaces only the block, preserving exact prefix and suffix', () => {
    expect(replaceManagedBlock('mine\r\n<!-- nonoise:begin v1.6.0 -->old<!-- nonoise:end -->\r\nfooter', generated))
      .toBe('mine\r\n<!-- nonoise:begin v1.7.0 -->\nnew\n<!-- nonoise:end -->\r\nfooter');
  });
  it('inserts after the title without removing any existing content and is idempotent', () => {
    const old = '# Mine\n\nmy instructions\n'; const updated = replaceManagedBlock(old, generated);
    expect(updated).toContain('# Mine\n\n<!-- nonoise:begin');
    expect(updated).toContain('\n\nmy instructions\n');
    expect(replaceManagedBlock(updated, generated)).toBe(updated);
  });
  it('rejects incomplete markers without changing content', () => expect(() => replaceManagedBlock('<!-- nonoise:begin v1.6.0 -->mine', generated)).toThrow('Incomplete'));
});

describe('native vendors', () => {
  it('merges supported Claude settings without removing user settings', () => {
    put('.claude/settings.json', JSON.stringify({ permissions: { allow: ['Read'] }, enabledPlugins: { 'mine@local': false } }));
    configureNativeVendors(dir, ai);
    const value = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
    expect(value.permissions.allow).toEqual(['Read']); expect(value.enabledPlugins['mine@local']).toBe(false);
    expect(value.enabledPlugins['superpowers@nonoise']).toBe(true);
    expect(value.extraKnownMarketplaces.nonoise.source.repo).toBe('russosalv/NONoise');
    const before = readFileSync(join(dir, '.claude/settings.json'), 'utf8'); configureNativeVendors(dir, ai);
    expect(readFileSync(join(dir, '.claude/settings.json'), 'utf8')).toBe(before);
  });
  it('selects only requested harnesses and the unified impeccable provider', () => {
    const plan = nativePlan({ ...ai, claudeCode: false, codex: true });
    expect(plan.some(c => c.bin === 'copilot')).toBe(false);
    expect(plan.some(c => c.bin === 'codex' && c.args.includes('superpowers@nonoise'))).toBe(true);
    expect(plan.at(-1)?.args).toContain('--providers=codex');
  });
  it('missing commands report exact recovery commands without throwing', () => {
    const results = installNativeVendors(dir, { ...ai, copilot: true });
    expect(results.every(r => !r.ok)).toBe(true); expect(results[0]?.output).toContain('ENOENT test tool missing');
    expect(results.some(r => r.args.join(' ') === 'plugin install superpowers@nonoise')).toBe(true);
  });
  it('pins graphify and wires project installations without bundled files', () => {
    mocked.mockImplementation((bin, args) => bin === 'uv' && args?.join(' ') === 'tool list' ? 'graphifyy v0.9.91\n' : 'ok');
    const r = installNativeGraphify({ ...ai, codex: true, projectPath: dir, bundledSkillsRoot: '/missing' });
    expect(r.projectLocal.source).toBe('native'); expect(r.codexHook).toBe('ok');
    expect(mocked.mock.calls.some(([b, a]) => b === 'graphify' && a?.join(' ') === 'install --project --platform codex')).toBe(true);
    expect(mocked.mock.calls.some(([, , o]) => (o as any).cwd !== dir)).toBe(false);
    expect(existsSync(join(dir, '.claude/skills/graphify'))).toBe(false);
  });
  it('installs the exact graphify pin when another version is present', () => {
    mocked.mockImplementation((bin, args) => bin === 'uv' && args?.join(' ') === 'tool list' ? 'graphifyy v0.8.0\n' : 'ok');
    installNativeGraphify({ ...ai, projectPath: dir, bundledSkillsRoot: '/missing' });
    expect(mocked.mock.calls.some(([b, a]) => b === 'uv' && a?.join(' ') === 'tool install --force graphifyy==0.9.91')).toBe(true);
  });
  it('retains retry commands when graphify installation fails', () => {
    const r = installNativeGraphify({ ...ai, copilot: true, projectPath: dir, bundledSkillsRoot: '/missing' });
    expect(r.graphifyy).toBe('install-failed'); expect(r.hints.join('\n')).toContain('graphify install --project --platform copilot');
  });
  it('does not invoke graphify over a modified migrated user skill', () => {
    put('.claude/skills/graphify/SKILL.md', 'mine'); mocked.mockReturnValue('graphifyy v0.9.91\n');
    const r = installNativeGraphify({ ...ai, projectPath: dir, bundledSkillsRoot: '/missing', protectedPaths: ['.claude/skills/graphify/SKILL.md'] });
    expect(r.claudeHook).toBe('failed'); expect(mocked.mock.calls.some(([b]) => b === 'graphify')).toBe(false);
    expect(readFileSync(join(dir, '.claude/skills/graphify/SKILL.md'), 'utf8')).toBe('mine');
  });
  it('native scaffold excludes all embedded packs and records its mode', async () => {
    await scaffold({ projectName: 'demo', projectPath: dir, template: 'single-project', workspaceKind: 'new', aiTools: ai, gitInit: false, frameworkVersion: '1.7.0' }, paths);
    for (const name of ['superpowers', 'impeccable', 'pptx', 'skill-creator', 'graphify']) expect(existsSync(join(dir, '.claude/skills', name))).toBe(false);
    expect(JSON.parse(readFileSync(join(dir, 'nonoise.config.json'), 'utf8')).vendorMode).toBe('native');
    expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toContain('<!-- nonoise:begin v1.7.0 -->');
  });
  it('native upgrade preserves personal instructions and is byte-idempotent without tools', async () => {
    put('nonoise.config.json', JSON.stringify({ frameworkVersion: '1.6.0', aiTools: ai, template: 'single-project' }));
    put('CLAUDE.md', '# My title\nPersonal line\n'); put('.claude/skills/user/SKILL.md', 'my skill');
    const opts = { targetPath: dir, ...paths }; const first = await runUpgrade(opts);
    expect(first.exitCode).toBe(0); expect(first.graphifyReport.projectLocal.source).toBe('native');
    const config = readFileSync(join(dir, 'nonoise.config.json'), 'utf8'); const instructions = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
    await runUpgrade(opts); expect(readFileSync(join(dir, 'CLAUDE.md'), 'utf8')).toBe(instructions); expect(readFileSync(join(dir, 'nonoise.config.json'), 'utf8')).toBe(config);
    expect(instructions).toContain('Personal line'); expect(readFileSync(join(dir, '.claude/skills/user/SKILL.md'), 'utf8')).toBe('my skill');
  });
});

describe('safe legacy migration', () => {
  it('removes known copies while retaining new and modified user files', async () => {
    const dest = join(dir, '.claude/skills/superpowers/brainstorming'); mkdirSync(dest, { recursive: true });
    cpSync(join(paths.skillsRoot, 'vendor/superpowers/skills/brainstorming'), dest, { recursive: true });
    put('.claude/skills/superpowers/brainstorming/my.txt', 'mine');
    put('.claude/skills/impeccable/audit/SKILL.md', 'customized');
    const result = await migrateLegacyVendors(dir);
    expect(result.removed).toContain('.claude/skills/superpowers/brainstorming/SKILL.md');
    expect(result.preserved).toContain('.claude/skills/impeccable/audit/SKILL.md');
    expect(readFileSync(join(dest, 'my.txt'), 'utf8')).toBe('mine'); expect((await migrateLegacyVendors(dir)).removed).toEqual([]);
  });
  it('does not follow symlink ancestors', async () => {
    const external = mkdtempSync(join(tmpdir(), 'nonoise-external-'));
    try {
      cpSync(join(paths.skillsRoot, 'vendor/superpowers'), external, { recursive: true });
      mkdirSync(join(dir, '.claude'), { recursive: true }); symlinkSync(external, join(dir, '.claude/skills'));
      const before = readFileSync(join(external, 'skills/brainstorming/SKILL.md'), 'utf8');
      await migrateLegacyVendors(dir); expect(readFileSync(join(external, 'skills/brainstorming/SKILL.md'), 'utf8')).toBe(before);
    } finally { rmSync(external, { force: true, recursive: true }); }
  });
});

describe('doctor', () => {
  it('uses only list calls, distinguishes catalog from installed, and does not modify project files', () => {
    const config = JSON.stringify({ vendorMode: 'native', aiTools: { ...ai, claudeCode: false, codex: true } }); put('nonoise.config.json', config);
    mocked.mockImplementation(bin => bin === 'codex' ? JSON.stringify({ installed: [], marketplaces: [{ plugins: [{ pluginId: 'superpowers@nonoise' }] }] }) : '');
    const lines = doctor(dir).join('\n'); expect(lines).toContain('superpowers@nonoise: missing/unverified');
    expect(lines).toContain('codex plugin add superpowers@nonoise'); expect(lines).not.toContain('[claudeCode]');
    expect(mocked.mock.calls.every(([, args]) => args?.includes('list'))).toBe(true);
    expect(readFileSync(join(dir, 'nonoise.config.json'), 'utf8')).toBe(config);
  });
  it('recognizes Codex installed records and disabled plugins', () => {
    put('nonoise.config.json', JSON.stringify({ vendorMode: 'native', aiTools: { ...ai, claudeCode: false, codex: true } }));
    mocked.mockReturnValue(JSON.stringify({ installed: [{ pluginId: 'superpowers@nonoise', installed: true, enabled: true }] }));
    expect(doctor(dir).join('\n')).toContain('superpowers@nonoise: installed');
    mocked.mockReturnValue(JSON.stringify({ installed: [{ pluginId: 'superpowers@nonoise', installed: true, enabled: false }] }));
    expect(doctor(dir).join('\n')).toContain('superpowers@nonoise: missing/unverified');
  });
});

describe('native integration regressions', () => {
  it('removes only the legacy superpowers hook and preserves user hooks', () => {
    const legacy = { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/superpowers/run-hook.cmd" session-start', async: false };
    const user = { type: 'command', command: 'echo my hook' };
    put('.claude/settings.json', JSON.stringify({ hooks: { SessionStart: [{ matcher: 'startup|clear|compact', hooks: [legacy, user] }] } }));
    configureNativeVendors(dir, ai);
    expect(JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8')).hooks.SessionStart[0].hooks).toEqual([user]);
  });
  it('does not rewrite an equivalent settings file just to change formatting', () => {
    configureNativeVendors(dir, ai);
    const compact = JSON.stringify(JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8')));
    put('.claude/settings.json', compact); configureNativeVendors(dir, ai);
    expect(readFileSync(join(dir, '.claude/settings.json'), 'utf8')).toBe(compact);
  });
  it('skips a verified graphify install on repeat, but force repair still invokes upstream', () => {
    mocked.mockImplementation((bin) => {
      if (bin === 'uv') return 'graphifyy v0.9.91\n';
      if (bin === 'graphify') put('.claude/skills/graphify/SKILL.md', 'upstream native skill');
      return 'ok';
    });
    const ctx = { ...ai, projectPath: dir, bundledSkillsRoot: '/absent' };
    installNativeGraphify(ctx); const receipt = readFileSync(join(dir, '.nonoise/native-graphify.json'), 'utf8');
    expect(installNativeGraphify(ctx).projectLocal.skipped).toEqual(['.claude/skills/graphify/SKILL.md']);
    expect(mocked.mock.calls.filter(([bin]) => bin === 'graphify')).toHaveLength(1);
    expect(readFileSync(join(dir, '.nonoise/native-graphify.json'), 'utf8')).toBe(receipt);
    installNativeGraphify({ ...ctx, force: true });
    expect(mocked.mock.calls.filter(([bin]) => bin === 'graphify')).toHaveLength(2);
  });
  it('records unknown user files inside impeccable and defers the upstream installer', async () => {
    put('.claude/skills/impeccable/notes.txt', 'user data');
    const migration = await migrateLegacyVendors(dir);
    expect(migration.preserved).toContain('.claude/skills/impeccable/notes.txt');
    const results = installNativeVendors(dir, ai, migration.preserved);
    expect(results.at(-1)?.ok).toBe(false);
    expect(mocked.mock.calls.some(([bin]) => bin === 'npx')).toBe(false);
    expect(readFileSync(join(dir, '.claude/skills/impeccable/notes.txt'), 'utf8')).toBe('user data');
  });
  it('uses an identical immutable Git URL pin in both marketplaces and publishes only native skills', () => {
    const claude = JSON.parse(readFileSync(resolve('../../.claude-plugin/marketplace.json'), 'utf8'));
    const copilot = JSON.parse(readFileSync(resolve('../../.github/plugin/marketplace.json'), 'utf8'));
    expect(claude).toEqual(copilot);
    expect(claude.plugins.find((p: any) => p.name === 'superpowers').source).toEqual({ source: 'url', url: 'https://github.com/obra/superpowers.git', sha: 'b55764852ac78870e65c6565fb585b6cd8b3c5c9' });
    const plugin = JSON.parse(readFileSync(resolve('../skills/.claude-plugin/plugin.json'), 'utf8'));
    expect(plugin.skills).toHaveLength(28);
    expect(plugin.skills.every((p: string) => !p.includes('vendor') && !p.includes('graphify'))).toBe(true);
  });
});

it('preserves instruction bytes even when upstream graphify replaces a legacy section and trailing user prose', () => {
  const original = '# Mine\r\n<!-- nonoise:begin v1.7.0 -->\r\n## graphify\r\nrules\r\n<!-- nonoise:end -->\r\nPERSONAL TEXT\r\n';
  for (const file of ['CLAUDE.md', 'AGENTS.md', '.github/copilot-instructions.md']) put(file, original);
  mocked.mockImplementation(bin => {
    if (bin === 'uv') return 'graphifyy v0.9.91\n';
    if (bin === 'graphify') {
      for (const file of ['CLAUDE.md', 'AGENTS.md', '.github/copilot-instructions.md']) put(file, '# upstream replacement');
      put('.claude/skills/graphify/SKILL.md', 'native graphify');
    }
    return 'ok';
  });
  expect(installNativeGraphify({ ...ai, projectPath: dir, bundledSkillsRoot: '/missing' }).claudeHook).toBe('ok');
  for (const file of ['CLAUDE.md', 'AGENTS.md', '.github/copilot-instructions.md']) expect(readFileSync(join(dir, file), 'utf8')).toBe(original);
  expect(readFileSync(join(dir, '.claude/skills/graphify/SKILL.md'), 'utf8')).toBe('native graphify');
});


describe('Claude project installation corrections', () => {
  it('installs and verifies all three plugins in the current project', () => {
    const installed: any[] = [];
    mocked.mockImplementation((bin, args) => {
      const a = args as string[];
      if (a.join(' ') === 'plugin marketplace list --json') return '[]';
      if (a.join(' ') === 'plugin list --json') return JSON.stringify(installed);
      if (a[1] === 'install') {
        expect(a.slice(3)).toEqual(['--scope', 'project']);
        installed.push({ id: a[2], scope: 'project', projectPath: dir, enabled: true, projectEnabled: true, installPath: '/cache/plugin' });
      }
      return 'ok';
    });
    const results = installNativeVendors(dir, ai);
    expect(results.every(r => r.ok)).toBe(true);
    expect(installed.map(p => p.id)).toEqual(['superpowers@nonoise', 'document-skills@anthropic-agent-skills', 'skill-creator@claude-plugins-official']);
    expect(mocked.mock.calls.filter(([, a]) => a?.slice(0, 3).join(' ') === 'plugin marketplace add').map(([, a]) => a?.[3]))
      .toEqual(['russosalv/NONoise', 'anthropics/skills', 'anthropics/claude-plugins-official']);
  });
  it('does not confuse a registered NONoise marketplace with the other two', () => {
    mocked.mockImplementation((bin, args) => args?.join(' ') === 'plugin marketplace list --json' ? '[{"name":"nonoise"}]' : '[]');
    installNativeVendors(dir, ai);
    expect(mocked.mock.calls.filter(([, a]) => a?.slice(0, 3).join(' ') === 'plugin marketplace add').map(([, a]) => a?.[3]))
      .toEqual(['anthropics/skills', 'anthropics/claude-plugins-official']);
  });
  it('requires registry confirmation after an apparently successful installer', () => {
    mocked.mockReturnValue('[]');
    const results = installNativeVendors(dir, ai);
    expect(results.filter(r => r.bin === 'claude' && r.args[1] === 'install')).toHaveLength(3);
    expect(results.filter(r => r.args[1] === 'install').every(r => !r.ok && r.output.includes('did not confirm'))).toBe(true);
  });
  it('ignores plugins installed for another project', () => {
    expect(hasInstalledPlugin(JSON.stringify([{ id: 'superpowers@nonoise', enabled: true, installPath: '/cache', scope: 'project', projectPath: '/elsewhere' }]), 'superpowers@nonoise', dir)).toBe(false);
  });
  it('replaces example-skills declarations preserving unrelated settings', () => {
    put('.claude/settings.json', JSON.stringify({ enabledPlugins: { 'example-skills@anthropic-agent-skills': true, 'mine@local': true } }));
    configureNativeVendors(dir, ai);
    const settings = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
    expect(settings.enabledPlugins).toEqual({ 'mine@local': true, 'superpowers@nonoise': true, 'document-skills@anthropic-agent-skills': true, 'skill-creator@claude-plugins-official': true });
    expect(settings.extraKnownMarketplaces['claude-plugins-official'].source.repo).toBe('anthropics/claude-plugins-official');
  });
  it('uninstalls obsolete project records, even when their declaration is gone', () => {
    let obsolete = true;
    mocked.mockImplementation((bin, args) => {
      if (args?.[1] === 'uninstall') { expect(args).toEqual(['plugin', 'uninstall', 'example-skills@anthropic-agent-skills', '--scope', 'project']); obsolete = false; return 'ok'; }
      if (args?.join(' ') === 'plugin list --json') return JSON.stringify(obsolete ? [{ id: 'example-skills@anthropic-agent-skills', scope: 'project', projectPath: dir, enabled: false, installPath: '/cache' }] : []);
      return '[]';
    });
    installNativeVendors(dir, ai); expect(obsolete).toBe(false);
  });
  it('doctor recommends the dedicated channel and project scope', () => {
    put('nonoise.config.json', JSON.stringify({ vendorMode: 'native', aiTools: ai }));
    const lines = doctor(dir).join('\n');
    expect(lines).toContain('skill-creator@claude-plugins-official: missing/unverified');
    expect(lines).toContain('claude plugin marketplace add anthropics/claude-plugins-official');
    expect(lines).toContain('claude plugin install skill-creator@claude-plugins-official --scope project');
    expect(lines).not.toContain('example-skills');
  });
});

describe('bounded external network retries', () => {
  afterEach(() => vi.restoreAllMocks());
  const commands = [
    { bin: 'npx', args: ['--yes', 'impeccable', 'install'] },
    { bin: 'claude', args: ['plugin', 'marketplace', 'add', 'russosalv/NONoise'] },
    { bin: 'copilot', args: ['plugin', 'install', 'superpowers@nonoise'] },
    { bin: 'codex', args: ['plugin', 'add', 'superpowers@nonoise'] },
    { bin: 'uv', args: ['tool', 'install', 'graphifyy==0.9.91'] },
  ];
  it.each(commands)('retries $bin DNS errors twice with increasing backoff', c => {
    const wait = vi.spyOn(Atomics, 'wait').mockReturnValue('timed-out');
    mocked.mockImplementationOnce(() => { throw { stdout: "Download failed: Could not verify skill bundle: Dns Failed: resolve dns name 'impeccable.style:443' Try again" }; })
      .mockImplementationOnce(() => { throw { stderr: 'HTTP 503 Service Unavailable' }; }).mockReturnValue('installed');
    expect(run(c, dir).ok).toBe(true);
    expect(mocked).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls.map(a => a[3])).toEqual([1000, 2000]);
  });
  it('exhausts timeouts after exactly three attempts preserving the error', () => {
    vi.spyOn(Atomics, 'wait').mockReturnValue('timed-out');
    mocked.mockImplementation(() => { throw { code: 'ETIMEDOUT', message: 'spawnSync npx ETIMEDOUT' }; });
    expect(run(commands[0]!, dir)).toMatchObject({ ok: false, output: expect.stringContaining('ETIMEDOUT') });
    expect(mocked).toHaveBeenCalledTimes(3);
  });
  it.each(['ENOENT', 'Invalid plugin manifest', 'HTTP 401 Unauthorized', 'HTTP 404 Not Found'])('does not retry permanent error %s', message => {
    mocked.mockImplementation(() => { throw new Error(message); });
    expect(run(commands[0]!, dir).ok).toBe(false); expect(mocked).toHaveBeenCalledTimes(1);
  });
  it('does not retry read-only list commands', () => {
    mocked.mockImplementation(() => { throw new Error('HTTP 503'); });
    expect(run({ bin: 'claude', args: ['plugin', 'list', '--json'] }, dir).ok).toBe(false);
    expect(mocked).toHaveBeenCalledTimes(1);
  });
});
