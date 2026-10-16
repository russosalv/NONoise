import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { load } from 'js-yaml';
import { parseStack, selectEcc, renderEccFiles, installEcc, doctorEcc } from '../../src/ecc.js';
const root = resolve('../skills');
const ai = { claudeCode: true, copilot: true, codex: true, cursor: false, geminiCli: false };
const dirs: string[] = [];
const temp = () => { const p = mkdtempSync(join(tmpdir(), 'ecc-test-')); dirs.push(p); return p; };
afterEach(() => dirs.splice(0).forEach(p => rmSync(p, { recursive: true, force: true })));
const fm = (s: string) => load(s.match(/^---\n([\s\S]*?)\n---/)![1]!) as Record<string, unknown>;
describe('ECC selection and conversion', () => {
  it('validates and canonicalizes stack flags', () => {
    expect(parseStack('angular,dotnet,angular')).toEqual(['dotnet', 'angular']);
    expect(parseStack('none')).toEqual([]);
    expect(parseStack('nessuno')).toEqual([]);
    expect(() => parseStack('none,web')).toThrow();
    expect(() => parseStack('react')).toThrow();
  });
  it('keeps common agents and process skills with no language stack', () => {
    const s = selectEcc(root, []);
    expect(s.agents).toHaveLength(8);
    expect(s.agents).not.toContain('csharp-reviewer');
    expect(s.skills).toHaveLength(8);
    expect(s.rules).toEqual(['common']);
  });
  it('selects dotnet and angular dependencies without duplicate skills', () => {
    const s = selectEcc(root, ['dotnet', 'angular']);
    expect(s.agents).toHaveLength(10);
    expect(s.rules).toEqual(['common', 'csharp', 'typescript', 'angular', 'web']);
    expect(s.skills).toHaveLength(15);
    expect(selectEcc(root, ['typescript']).skills).not.toContain('dotnet-patterns');
  });
  it('emits native metadata, quoted TOML and rewritten rule links', () => {
    const files = renderEccFiles(root, ai, ['dotnet', 'angular']);
    const claude = fm(files['.claude/agents/security-reviewer.md']!);
    expect(claude.name).toBe('security-reviewer');
    expect(claude.model).toBeUndefined();
    expect(claude.tools).toContain('Read');
    const copilot = fm(files['.github/agents/security-reviewer.agent.md']!);
    expect(copilot.tools).toEqual(['read', 'search', 'execute']);
    const toml = files['.codex/agents/spec-miner.toml']!;
    expect(toml).toContain('name = "spec-miner"');
    const body = JSON.parse(toml.split('developer_instructions = ')[1]!.trim());
    expect(body).toContain('docs/architecture/specs/');
    expect(body).toContain('Bash');
    expect(toml).not.toContain('model =');
    expect(fm(files['.claude/rules/ecc/csharp/testing.md']!).paths).toContain('**/*.cs');
    expect(fm(files['.github/instructions/ecc-csharp-testing.instructions.md']!).applyTo).toContain('**/*.cs');
    expect(files['.github/instructions/ecc-csharp-testing.instructions.md']).toContain('(ecc-common-testing.instructions.md)');
    expect(files['.agents/skills/angular-developer/references/components.md']).toContain('Commit: b92f');
    expect(Object.keys(files).some(p => p.endsWith('/hooks.md'))).toBe(false);
  });
  it('emits only requested harness agents and a usable Codex rule index', () => {
    const files = renderEccFiles(root, { ...ai, claudeCode: false, codex: false }, ['typescript']);
    expect(Object.keys(files).some(p => p.startsWith('.codex/'))).toBe(false);
    expect(Object.keys(files).some(p => p.startsWith('.claude/agents/'))).toBe(false);
    expect(files['.nonoise/ecc/index.md']).toContain('rules/common/');
    expect(files['.nonoise/ecc/index.md']).not.toContain('csharp-reviewer');
  });
  it('adds new files, preserves edits and unknown collisions, reports missing and modified files', () => {
    const project = temp();
    const rel = '.github/agents/security-reviewer.agent.md';
    mkdirSync(dirname(join(project, rel)), { recursive: true });
    writeFileSync(join(project, rel), 'User agent');
    installEcc(root, project, ai, []);
    expect(readFileSync(join(project, rel), 'utf8')).toBe('User agent');
    const rule = '.claude/rules/ecc/common/testing.md';
    writeFileSync(join(project, rule), 'User rule');
    rmSync(join(project, '.codex/agents/security-reviewer.toml'));
    const findings = doctorEcc(root, project, ai, []);
    expect(findings.join('\n')).toContain(`modified: ${rule}`);
    expect(findings.join('\n')).toContain('missing: .codex/agents/security-reviewer.toml');
    const before = readFileSync(join(project, '.nonoise/file-hashes.json'), 'utf8');
    installEcc(root, project, ai, []);
    expect(readFileSync(join(project, rule), 'utf8')).toBe('User rule');
    expect(readFileSync(join(project, '.nonoise/file-hashes.json'), 'utf8')).toBe(before);
    const time = statSync(join(project, '.codex/agents/security-reviewer.toml')).mtimeMs;
    installEcc(root, project, ai, []);
    expect(statSync(join(project, '.codex/agents/security-reviewer.toml')).mtimeMs).toBe(time);
  });
  it('never follows a user symlink ancestor', () => {
    const project = temp(), outside = temp();
    symlinkSync(outside, join(project, '.github'));
    const result = installEcc(root, project, ai, []);
    expect(result.preserved).toContain('.github/agents/security-reviewer.agent.md');
    expect(doctorEcc(root, project, ai, []).join('\n')).toContain('unsafe: .github/agents/');
  });
});
it('removes only pristine ECC files when changing to no stack', () => {
  const project = temp();
  installEcc(root, project, ai, ['dotnet', 'angular']);
  const edited = '.claude/agents/csharp-reviewer.md';
  writeFileSync(join(project, edited), 'My reviewer');
  const result = installEcc(root, project, ai, []);
  expect(result.preserved).toContain(edited);
  expect(doctorEcc(root, project, ai, []).join('\n')).not.toContain('missing:');
  expect(() => readFileSync(join(project, '.codex/agents/csharp-reviewer.toml'))).toThrow();
  expect(readFileSync(join(project, edited), 'utf8')).toBe('My reviewer');
});
it('routes imported workflows only to included capabilities and canonical Haft records', () => {
  const vendor = join(root, 'vendor/ecc');
  for (const file of ['agents/build-error-resolver.md', 'agents/spec-miner.md', 'skills/brownfield-retrospective/SKILL.md', 'skills/production-audit/SKILL.md']) {
    const text = readFileSync(join(vendor, file), 'utf8');
    expect(text, file).not.toMatch(/(?<![\w:-])(?:planner|architect|code-architect|tdd-guide|code-reviewer|code-explorer|doc-updater|unified-memory|deployment-patterns)(?![\w-])/);
  }
  const retro = readFileSync(join(vendor, 'skills/brownfield-retrospective/SKILL.md'), 'utf8');
  expect(retro).not.toContain('docs/adr/');
  expect(retro).not.toContain('Backfill retro-ADRs');
  expect(retro).toContain('canonical `.haft/`');
  expect(retro).toContain('arch-decision');
  expect(readFileSync(join(vendor, 'rules/csharp/security.md'), 'utf8')).not.toContain('skill: `security-reviewer`');
});
