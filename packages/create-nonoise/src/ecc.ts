import { readFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, posix } from 'node:path';
import { load, dump } from 'js-yaml';
import type { AiTools } from './types.js';
import { nonoiseSkillDirs } from './skill-installer.js';
import { digest, installManagedAssets, safeAssetPath, readAssetHashes } from './managed-assets.js';

export const STACKS = ['dotnet', 'typescript', 'angular', 'web'] as const;
export type Stack = typeof STACKS[number];
type Manifest = { repository: string; commit: string; agents: Record<string, Stack[]>; rules: Record<string, Stack[]>; skills: Record<string, Stack[]> };
export function parseStack(csv: string): Stack[] {
  const values = csv.split(',').map(s => s.trim()).filter(Boolean);
  if (values.length === 1 && ['none', 'nessuno'].includes(values[0]!)) return [];
  const unknown = values.filter(v => !STACKS.includes(v as Stack));
  if (unknown.length) throw new Error(`Invalid stack: ${unknown.join(', ')}. Use dotnet,typescript,angular,web or none (alone).`);
  return STACKS.filter(s => values.includes(s));
}
function manifest(root: string): Manifest { return JSON.parse(readFileSync(join(root, 'vendor/ecc/manifest.json'), 'utf8')); }
export function selectEcc(root: string, stack: readonly string[]): { agents: string[]; rules: string[]; skills: string[] } {
  const selected = parseStack(stack.join(',')), data = manifest(root);
  const eligible = (map: Record<string, Stack[]>) => Object.entries(map).filter(([, choices]) => !choices.length || choices.some(s => selected.includes(s))).map(([name]) => name);
  return { agents: eligible(data.agents), rules: eligible(data.rules), skills: eligible(data.skills) };
}
function markdown(text: string): { meta: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  return { meta: m ? load(m[1]!) as Record<string, unknown> : {}, body: m ? text.slice(m[0].length).trimStart() : text };
}
const yaml = (meta: Record<string, unknown>, body: string) => `---\n${dump(meta, { lineWidth: -1, noRefs: true })}---\n\n${body}`;
function walk(root: string, prefix = ''): string[] {
  return readdirSync(join(root, prefix), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e => e.isDirectory() ? walk(root, posix.join(prefix, e.name)) : e.isFile() ? [posix.join(prefix, e.name)] : []);
}

/** Pure conversion from the one pinned source tree; no per-harness copies are maintained. */
export function renderEccFiles(root: string, ai: AiTools, stack: readonly string[]): Record<string, string> {
  if (!Object.values(ai).some(Boolean)) return {};
  const data = manifest(root), selection = selectEcc(root, stack), vendor = join(root, 'vendor/ecc');
  const files: Record<string, string> = {};
  const provenance = `Source: ${data.repository} | Commit: ${data.commit} | MIT | Adapted for NONoise.`;
  for (const name of selection.agents) {
    const { meta, body } = markdown(readFileSync(join(vendor, 'agents', name + '.md'), 'utf8'));
    if (meta.name !== name || typeof meta.description !== 'string' || !meta.description.trim()) throw new Error(`Invalid ECC agent metadata: ${name}`);
    const tools = String(meta.tools).split(',').map(t => t.trim());
    const instructions = `<!-- ${provenance} -->\n\n${body}`;
    if (ai.claudeCode) files[`.claude/agents/${name}.md`] = yaml({ name, description: meta.description, tools }, instructions);
    if (ai.copilot) {
      const aliases: Record<string, string> = { Read: 'read', Grep: 'search', Glob: 'search', Bash: 'execute', Write: 'edit', Edit: 'edit' };
      const mapped = tools.map(t => { if (!aliases[t]) throw new Error(`Unsupported ECC agent tool: ${t}`); return aliases[t]!; });
      files[`.github/agents/${name}.agent.md`] = yaml({ name, description: meta.description, tools: [...new Set(mapped)] }, instructions);
    }
    if (ai.codex) files[`.codex/agents/${name}.toml`] = `# ${provenance}\nname = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(meta.description)}\ndeveloper_instructions = ${JSON.stringify(instructions)}\n`;
  }
  const index = [`# NONoise ECC selection`, '', provenance, '', `Stacks: ${stack.join(', ') || 'none'}.`, '', '## Agents', '', ...selection.agents.map(n => `- ${n}`), '', '## Rules', '', 'Read every common rule before work; read each stack rule when its paths match the files being changed. Resolve conflicts in favor of project-specific conventions and user instructions.', ''];
  for (const group of selection.rules) {
    for (const path of walk(join(vendor, 'rules', group))) {
      const rel = `${group}/${path}`;
      const { meta, body } = markdown(readFileSync(join(vendor, 'rules', rel), 'utf8'));
      const paths = Array.isArray(meta.paths) ? meta.paths as string[] : ['**/*'];
      const content = `<!-- ${provenance} -->\n\n${body}`;
      if (ai.claudeCode) files[`.claude/rules/ecc/${rel}`] = group === 'common' ? content : yaml({ paths }, content);
      if (ai.copilot) {
        const linked = content.replace(/\]\(([^)]+\.md)\)/g, (match, link: string) => {
          if (/^(https?:|#|\/)/.test(link)) return match;
          const target = posix.normalize(posix.join(group, posix.dirname(path), link));
          return `](ecc-${target.replaceAll('/', '-').replace(/\.md$/, '.instructions.md')})`;
        });
        files[`.github/instructions/ecc-${rel.replaceAll('/', '-').replace(/\.md$/, '.instructions.md')}`] = yaml({ applyTo: paths.join(',') }, linked);
      }
      files[`.nonoise/ecc/rules/${rel}`] = content;
      index.push(`- [${rel}](rules/${rel}) — ${group === 'common' ? 'always' : paths.join(', ')}`);
    }
  }
  index.push('', '## Skills', '', ...selection.skills.map(n => `- ${n}`), '', 'Use verification-loop alongside superpowers:verification-before-completion. Only invoke stack skills listed here; absent stack capabilities require changing --stack explicitly.', '');
  files['.nonoise/ecc/index.md'] = index.join('\n');
  for (const dir of nonoiseSkillDirs(ai)) for (const name of selection.skills) {
    for (const path of walk(join(vendor, 'skills', name))) files[`${dir}/${name}/${path}`] = readFileSync(join(vendor, 'skills', name, path), 'utf8');
  }
  for (const name of ['LICENSE', 'UPSTREAM.md']) files[`.nonoise/ecc/${name}`] = readFileSync(join(vendor, name), 'utf8');
  return files;
}
export function installEcc(root: string, project: string, ai: AiTools, stack: readonly string[]): { written: string[]; preserved: string[] } {
  const files = renderEccFiles(root, ai, stack);
  const inventory = '.nonoise/ecc/files.json';
  if (!safeAssetPath(project, inventory)) throw new Error('Unsafe ECC inventory');
  const path = join(project, inventory), hashes = readAssetHashes(project);
  // The previous inventory is trusted only while its bytes match our ownership hash.
  const previous: string[] = existsSync(path) && digest(readFileSync(path)) === hashes[inventory]
    ? JSON.parse(readFileSync(path, 'utf8')) : [];
  const preserved: string[] = [];
  for (const file of previous.filter(p => !Object.hasOwn(files, p))) {
    if (!safeAssetPath(project, file)) { preserved.push(file); continue; }
    if (!existsSync(join(project, file))) continue;
    if (digest(readFileSync(join(project, file))) === hashes[file]) unlinkSync(join(project, file));
    else preserved.push(file);
  }
  files[inventory] = JSON.stringify([...new Set([...Object.keys(files), ...preserved])].sort(), null, 2) + '\n';
  const result = installManagedAssets(project, files);
  return { written: result.written, preserved: [...preserved, ...result.preserved] };
}
export function doctorEcc(root: string, project: string, ai: AiTools, stack: readonly string[]): string[] {
  const files = renderEccFiles(root, ai, stack), issues: string[] = [];
  for (const [file, content] of Object.entries(files)) {
    if (!safeAssetPath(project, file)) issues.push(`ECC unsafe: ${file}`);
    else if (!existsSync(join(project, file))) issues.push(`ECC missing: ${file}`);
    else if (digest(readFileSync(join(project, file))) !== digest(content)) issues.push(`ECC modified: ${file}`);
  }
  return [`ECC: ${Object.keys(files).length - issues.length}/${Object.keys(files).length} current files`, ...issues];
}
