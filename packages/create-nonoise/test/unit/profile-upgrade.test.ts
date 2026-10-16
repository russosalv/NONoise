import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
vi.mock('../../src/haft.js', () => ({ installHaft: vi.fn(async () => ({ ok: true })) }));
vi.mock('../../src/native-vendor.js', () => ({ configureNativeVendors: vi.fn(), configureEmbedPlugins: vi.fn(), installNativeVendors: vi.fn() }));
vi.mock('../../src/graphify-install.js', () => ({ installGraphify: vi.fn(() => ({ projectLocal: { source: 'bundled', errors: [] } })), formatReport: () => '' }));
import { runUpgrade } from '../../src/upgrade.js';
import { installEcc } from '../../src/ecc.js';
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
});
