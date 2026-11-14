import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, symlinkSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { load } from 'js-yaml';
import { parseStack, selectEcc, renderEccFiles, installEcc, doctorEcc, STACKS, NONOISE_AGENT_PROVENANCE } from '../../src/ecc.js';
import { PROFILES, resolveProfile, type Profile } from '../../src/profiles.js';
import { validateAgent } from '../../src/skill-host-compat.js';
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
    expect(() => parseStack('cobol')).toThrow();
  });
  it('accepts every stack value and rejects unknown ones with a message listing all stacks', () => {
    expect([...STACKS]).toEqual(['dotnet', 'typescript', 'angular', 'web', 'python', 'go', 'rust', 'java', 'kotlin', 'cpp', 'swift', 'php', 'ruby', 'react', 'vue', 'flutter', 'fsharp']);
    for (const stack of STACKS) expect(parseStack(stack)).toEqual([stack]);
    expect(parseStack([...STACKS].reverse().join(', '))).toEqual([...STACKS]);
    expect(parseStack('go,python')).toEqual(['python', 'go']);
    for (const bad of ['cobol', 'golang', 'dart', 'python,cobol', 'none,python']) {
      expect(() => parseStack(bad), bad).toThrow(`Use ${STACKS.join(',')} or none (alone).`);
    }
    expect(() => parseStack('python,cobol')).toThrow('Invalid stack: cobol.');
  });
  it('keeps common agents and process skills with no language stack', () => {
    const s = selectEcc(root, []);
    expect(s.agents).toHaveLength(8);
    expect(s.agents).not.toContain('csharp-reviewer');
    expect(s.skills).toHaveLength(9);
    expect(s.rules).toEqual(['common']);
  });
  it('selects dotnet and angular dependencies without duplicate skills', () => {
    const s = selectEcc(root, ['dotnet', 'angular']);
    expect(s.agents).toHaveLength(10);
    expect(s.rules).toEqual(['common', 'csharp', 'typescript', 'angular', 'web']);
    expect(s.skills).toHaveLength(16);
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

describe('language stacks', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'vendor/ecc/manifest.json'), 'utf8')) as { agents: Record<string, string[]>; rules: Record<string, string[]>; skills: Record<string, string[]> };
  const original = ['dotnet', 'typescript', 'angular', 'web'];
  const added = (map: Record<string, string[]>) => Object.entries(map).filter(([, tags]) => tags.length && !tags.some(t => original.includes(t))).map(([name]) => name);
  it('maps each new stack to its reviewer, build resolver and rule group', () => {
    const expected: Record<string, [string[], string]> = {
      python: [['python-reviewer'], 'python'], go: [['go-reviewer', 'go-build-resolver'], 'golang'], rust: [['rust-reviewer', 'rust-build-resolver'], 'rust'],
      java: [['java-reviewer', 'java-build-resolver'], 'java'], kotlin: [['kotlin-reviewer', 'kotlin-build-resolver'], 'kotlin'], cpp: [['cpp-reviewer', 'cpp-build-resolver'], 'cpp'],
      swift: [['swift-reviewer', 'swift-build-resolver'], 'swift'], php: [['php-reviewer'], 'php'], ruby: [['ruby-reviewer'], 'ruby'],
      react: [['typescript-reviewer', 'react-reviewer', 'react-build-resolver'], 'react'], vue: [['typescript-reviewer', 'vue-reviewer'], 'vue'],
      flutter: [['flutter-reviewer', 'dart-build-resolver'], 'dart'], fsharp: [['fsharp-reviewer'], 'fsharp'],
    };
    expect(Object.keys(expected)).toEqual(STACKS.slice(4));
    const common = selectEcc(root, []);
    for (const [stack, [agents, group]] of Object.entries(expected)) {
      const s = selectEcc(root, [stack]);
      expect(s.agents.filter(a => !common.agents.includes(a)), stack).toEqual(agents);
      // React and Vue files defer to the TypeScript reviewer and rules, as Angular does.
      expect(s.rules, stack).toEqual(['common', ...(['react', 'vue'].includes(stack) ? ['typescript'] : []), group]);
      expect(s.skills, stack).toEqual(common.skills);
    }
  });
  it('keeps every relative rule link resolvable for each stack on its own', () => {
    for (const stack of STACKS) {
      const files = renderEccFiles(root, ai, [stack], resolveProfile(root, 'core', [stack]).ecc);
      for (const [path, content] of Object.entries(files)) {
        if (!/^(?:\.nonoise\/ecc\/rules|\.claude\/rules\/ecc|\.github\/instructions)\//.test(path)) continue;
        for (const [, link] of content.matchAll(/\]\(([^)#]+\.md)\)/g)) {
          if (/^(?:https?:|\/)/.test(link!)) continue;
          expect(Object.hasOwn(files, join(dirname(path), link!)), `${stack}: ${path} -> ${link}`).toBe(true);
        }
      }
    }
  });
  it('keeps the React hooks rule but no harness hook rule file', () => {
    const files = Object.keys(renderEccFiles(root, ai, STACKS));
    expect(files.filter(p => p.endsWith('/hooks.md'))).toEqual(['.claude/rules/ecc/react/hooks.md', '.nonoise/ecc/rules/react/hooks.md']);
  });
  it('points the new language agents and rules only at shipped capabilities', () => {
    const vendor = join(root, 'vendor/ecc');
    const shipped = new Set([...Object.keys(manifest.skills), 'superpowers:test-driven-development']);
    const paths = [...added(manifest.agents).map(a => `agents/${a}.md`), ...added(manifest.rules).flatMap(g => readdirSync(join(vendor, 'rules', g)).map(f => `rules/${g}/${f}`))];
    expect(paths.length).toBe(21 + 13 * 4 + 2);
    for (const path of paths) {
      const text = readFileSync(join(vendor, path), 'utf8');
      expect(text, path).not.toMatch(/`skill: |`skills\/|\]\([^)]*skills\/|^- Commands:|`\/[a-z][a-z-]+`|typescript-build-resolver|rules\/vue\/hooks\.md/m);
      for (const [, name] of text.matchAll(/skills?: `([^`]+)`/g)) expect(shipped.has(name!), `${path}: ${name}`).toBe(true);
      for (const [, name] of text.matchAll(/`([a-z0-9-]+-(?:reviewer|resolver))`/g)) expect(Object.hasOwn(manifest.agents, name!), `${path}: ${name}`).toBe(true);
      if (path.startsWith('agents/')) expect(text, path).not.toMatch(/`rules\/[a-z]/);
    }
  });
});

describe('NONoise-authored agents', () => {
  const own = ['graph-explorer', 'blueprint-architect', 'evidence-reviewer'];
  const core = () => resolveProfile(root, 'core', []).ecc;
  it('render for Claude, Copilot and Codex through the shared conversion with their own provenance', () => {
    const files = renderEccFiles(root, ai, [], core());
    for (const name of own) {
      const hosts = { claude: `.claude/agents/${name}.md`, copilot: `.github/agents/${name}.agent.md`, codex: `.codex/agents/${name}.toml` } as const;
      for (const [host, path] of Object.entries(hosts) as Array<[keyof typeof hosts, string]>) {
        expect(validateAgent(files[path]!, host, name), path).toEqual([]);
        expect(files[path], path).toContain(NONOISE_AGENT_PROVENANCE);
        expect(files[path], path).not.toMatch(/Commit: [0-9a-f]{40}/);
      }
      expect(fm(files[hosts.claude]!)).toEqual({ name, description: expect.stringMatching(/\S/), tools: ['Read', 'Grep', 'Glob', 'Bash'] });
      expect(fm(files[hosts.copilot]!).tools).toEqual(['read', 'search', 'execute']);
      expect(files[hosts.codex]!.startsWith(`# ${NONOISE_AGENT_PROVENANCE}\nname = "${name}"\n`)).toBe(true);
      expect(JSON.parse(files[hosts.codex]!.split('developer_instructions = ')[1]!.trim())).toContain('This agent was written for NONoise.');
    }
    expect(NONOISE_AGENT_PROVENANCE).toBe('NONoise agent | MIT | Inspired by ECC (https://github.com/affaan-m/ECC); see the note in the agent body.');
    // Vendored agents keep the ECC source line.
    expect(files['.claude/agents/database-reviewer.md']).toMatch(/<!-- Source: .* \| Commit: b92f/);
    const index = files['.nonoise/ecc/index.md']!;
    const [agents, nonoise, rules] = ['## Agents', '### NONoise agents', '## Rules'].map(h => index.indexOf(`\n${h}\n`));
    expect(agents).toBeGreaterThan(-1);
    expect(nonoise).toBeGreaterThan(agents);
    expect(rules).toBeGreaterThan(nonoise);
    expect(index.slice(nonoise, rules).match(/^- .+$/gm)).toEqual(own.map(n => `- ${n}`));
    expect(index.slice(agents, nonoise)).not.toContain('evidence-reviewer');
  });
  it('are selected by every profile except minimal, whatever the stack', () => {
    for (const profile of Object.keys(PROFILES) as Profile[]) for (const stack of [[], ['python', 'go'], [...STACKS]]) {
      expect(resolveProfile(root, profile, stack).ecc.nonoiseAgents, `${profile} ${stack}`).toEqual(profile === 'minimal' ? [] : own);
    }
    const minimal = renderEccFiles(root, ai, ['python'], resolveProfile(root, 'minimal', ['python']).ecc);
    expect(Object.keys(minimal).filter(p => p.includes('/agents/'))).toEqual([]);
    expect(minimal['.nonoise/ecc/index.md']).not.toContain('NONoise agents');
    const files = renderEccFiles(root, ai, [], core());
    for (const name of own) for (const path of [`.claude/agents/${name}.md`, `.github/agents/${name}.agent.md`, `.codex/agents/${name}.toml`]) expect(Object.hasOwn(files, path), path).toBe(true);
  });
  it('are inventoried, reported by doctor, preserved when edited and removed only while pristine', () => {
    const project = temp();
    installEcc(root, project, ai, [], core());
    const inventory = JSON.parse(readFileSync(join(project, '.nonoise/ecc/files.json'), 'utf8')) as string[];
    const hashes = JSON.parse(readFileSync(join(project, '.nonoise/file-hashes.json'), 'utf8')) as Record<string, string>;
    for (const name of own) for (const path of [`.claude/agents/${name}.md`, `.github/agents/${name}.agent.md`, `.codex/agents/${name}.toml`]) {
      expect(inventory, path).toContain(path);
      expect(hashes[path], path).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(doctorEcc(root, project, ai, [], core())[0]).toMatch(/^ECC: (\d+)\/\1 current files$/);
    const edited = '.claude/agents/evidence-reviewer.md';
    writeFileSync(join(project, edited), 'My reviewer');
    rmSync(join(project, '.codex/agents/graph-explorer.toml'));
    const findings = doctorEcc(root, project, ai, [], core()).join('\n');
    expect(findings).toContain(`modified: ${edited}`);
    expect(findings).toContain('missing: .codex/agents/graph-explorer.toml');
    expect(installEcc(root, project, ai, [], core()).preserved).toContain(edited);
    expect(readFileSync(join(project, edited), 'utf8')).toBe('My reviewer');
    expect(readFileSync(join(project, '.codex/agents/graph-explorer.toml'), 'utf8')).toContain(NONOISE_AGENT_PROVENANCE);
    // Leaving for minimal removes the pristine copies and keeps the edited one.
    const result = installEcc(root, project, ai, [], resolveProfile(root, 'minimal', []).ecc);
    expect(result.preserved).toContain(edited);
    expect(readFileSync(join(project, edited), 'utf8')).toBe('My reviewer');
    expect(() => readFileSync(join(project, '.github/agents/evidence-reviewer.agent.md'))).toThrow();
    expect(() => readFileSync(join(project, '.claude/agents/graph-explorer.md'))).toThrow();
  });
});
