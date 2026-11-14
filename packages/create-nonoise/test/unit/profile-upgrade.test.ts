import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
vi.mock('../../src/haft.js', () => ({ installHaft: vi.fn(async () => ({ ok: true })) }));
vi.mock('../../src/native-vendor.js', () => ({ configureNativeVendors: vi.fn(), configureEmbedPlugins: vi.fn(), installNativeVendors: vi.fn() }));
vi.mock('../../src/codebase-memory.js', () => ({ installCodebaseMemory: vi.fn(() => ({ binary: 'already-present', configured: [], unchanged: [], preserved: [], legacyKept: [], retired: [], hints: [] })), formatReport: vi.fn(() => '') }));
import { runUpgrade } from '../../src/upgrade.js';
import { createHash } from 'node:crypto';
import { installEcc, doctorEcc } from '../../src/ecc.js';
import { resolveProfile } from '../../src/profiles.js';
const root = resolve('../skills'), templatesRoot = resolve('../templates');
const ai = { claudeCode: true, copilot: true, codex: true, cursor: false, geminiCli: false };
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
function project(profile?: string) {
  const dir = mkdtempSync(join(tmpdir(), 'profile-upgrade-')); dirs.push(dir);
  writeFileSync(join(dir, 'nonoise.config.json'), JSON.stringify({ frameworkVersion: '1.7.0', vendorMode: 'native', aiTools: ai, profile, stack: ['dotnet'] }));
  return dir;
}
function contents(dir: string): Record<string, string> {
  return Object.fromEntries(readdirSync(dir, { recursive: true, withFileTypes: true }).filter(e => e.isFile()).map(e => { const path = join(e.parentPath, e.name); return [path.slice(dir.length), readFileSync(path).toString('base64')]; }));
}
describe('profile-aware upgrades', () => {
  it('migrates 1.7 without profile to core, preserves ECC capabilities and is byte-idempotent', async () => {
    const targetPath = project();
    installEcc(root, targetPath, ai, ['dotnet']);
    mkdirSync(join(targetPath, '.claude/skills/codex-delegate'), { recursive: true });
    cpSync(resolve('test/fixtures/retired-skills/codex-delegate/SKILL.md'), join(targetPath, '.claude/skills/codex-delegate/SKILL.md'));
    const oldAgent = join(targetPath, '.claude/agents/spec-miner.md');
    const before = readFileSync(oldAgent, 'utf8');
    await runUpgrade({ targetPath, skillsRoot: root, templatesRoot });
    const cfg = JSON.parse(readFileSync(join(targetPath, 'nonoise.config.json'), 'utf8'));
    expect(cfg.profile).toBe('core');
    expect(existsSync(join(targetPath, '.claude/skills/codex-delegate/SKILL.md'))).toBe(true);
    expect(cfg.legacyProfileCompatibility).toBe(true);
    expect(readFileSync(oldAgent, 'utf8')).toBe(before);
    expect(cfg.skills).toContain('brownfield-retrospective');
    const after = contents(targetPath);
    await runUpgrade({ targetPath, skillsRoot: root, templatesRoot });
    expect(contents(targetPath)).toEqual(after);
  });
  it('respects saved minimal profile and permits explicit security switch with REA', async () => {
    const targetPath = project('minimal');
    await runUpgrade({ targetPath, skillsRoot: root, templatesRoot });
    expect(existsSync(join(targetPath, '.claude/agents/security-reviewer.md'))).toBe(false);
    expect(existsSync(join(targetPath, '.claude/skills/polly/SKILL.md'))).toBe(true);
    await runUpgrade({ targetPath, skillsRoot: root, templatesRoot, profile: 'security', withRea: true });
    expect(existsSync(join(targetPath, '.claude/agents/security-reviewer.md'))).toBe(true);
    expect(existsSync(join(targetPath, '.mcp.json'))).toBe(true);
    let cfg = JSON.parse(readFileSync(join(targetPath, 'nonoise.config.json'), 'utf8'));
    expect(cfg.profile).toBe('security'); expect(cfg.withRea).toBe(true);
    await runUpgrade({ targetPath, skillsRoot: root, templatesRoot });
    cfg = JSON.parse(readFileSync(join(targetPath, 'nonoise.config.json'), 'utf8'));
    expect(cfg.profile).toBe('security'); expect(cfg.withRea).toBe(true);
  });
  it('installs NONoise agents on upgrade, refreshes pristine copies and preserves an edited one', async () => {
    const targetPath = project('core');
    await runUpgrade({ targetPath, skillsRoot: root, templatesRoot });
    const edited = '.claude/agents/evidence-reviewer.md', pristine = '.codex/agents/evidence-reviewer.toml';
    for (const path of [edited, pristine, '.github/agents/graph-explorer.agent.md', '.claude/agents/blueprint-architect.md']) expect(existsSync(join(targetPath, path)), path).toBe(true);
    expect(JSON.parse(readFileSync(join(targetPath, '.nonoise/ecc/files.json'), 'utf8'))).toEqual(expect.arrayContaining([edited, pristine]));
    const current = readFileSync(join(targetPath, pristine), 'utf8');
    // An older copy that NONoise still owns (its hash is the recorded one) is refreshed...
    const older = current.replace('Evidence reviewer', 'Evidence reviewer (older release)');
    expect(older).not.toBe(current);
    writeFileSync(join(targetPath, pristine), older);
    const hashFile = join(targetPath, '.nonoise/file-hashes.json');
    const hashes = JSON.parse(readFileSync(hashFile, 'utf8'));
    writeFileSync(hashFile, JSON.stringify({ ...hashes, [pristine]: createHash('sha256').update(older).digest('hex') }, null, 2) + '\n');
    // ...while a copy the user edited is left alone.
    writeFileSync(join(targetPath, edited), 'My reviewer\n');
    await runUpgrade({ targetPath, skillsRoot: root, templatesRoot });
    expect(readFileSync(join(targetPath, pristine), 'utf8')).toBe(current);
    expect(readFileSync(join(targetPath, edited), 'utf8')).toBe('My reviewer\n');
    expect(doctorEcc(root, targetPath, ai, ['dotnet'], resolveProfile(root, 'core', ['dotnet']).ecc).join('\n')).toContain(`ECC modified: ${edited}`);
  });
  it('does not install NONoise agents for a saved minimal profile', async () => {
    const targetPath = project('minimal');
    await runUpgrade({ targetPath, skillsRoot: root, templatesRoot });
    for (const name of ['graph-explorer', 'blueprint-architect', 'evidence-reviewer']) {
      for (const path of [`.claude/agents/${name}.md`, `.codex/agents/${name}.toml`, `.github/agents/${name}.agent.md`]) expect(existsSync(join(targetPath, path)), path).toBe(false);
    }
  });
});
