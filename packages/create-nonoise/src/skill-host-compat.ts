import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { load, JSON_SCHEMA } from 'js-yaml';

/** The common discovery contract of Claude, Codex and Copilot skills.
 * Host extensions are permitted: this checks discoverability, not execution or
 * whether a host implements every optional field in a third-party skill. */
function frontmatter(text: string): Record<string, unknown> {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error('Missing or unterminated YAML frontmatter');
  // JSON_SCHEMA avoids implicit timestamps and rejects custom executable tags.
  // js-yaml rejects duplicate mapping keys unless its json option is enabled.
  const data: unknown = load(match[1]!, { schema: JSON_SCHEMA });
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Frontmatter must be a YAML mapping');
  return data as Record<string, unknown>;
}

function identity(meta: Record<string, unknown>, expectedName: string): string[] {
  const errors: string[] = [];
  if (typeof meta.name !== 'string' || meta.name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name)) errors.push('name must be a lowercase slug of 1–64 characters');
  if (meta.name !== expectedName) errors.push(`name must match ${expectedName}`);
  if (typeof meta.description !== 'string' || !meta.description.trim() || meta.description.length > 1024) errors.push('description must be a nonempty string of at most 1024 characters');
  return errors;
}

export function validateSkill(text: string, name: string): string[] {
  try {
    const meta = frontmatter(text), errors = identity(meta, name);
    const tools = meta['allowed-tools'];
    if (tools !== undefined && !(typeof tools === 'string' && tools.trim())
      && !(Array.isArray(tools) && tools.every(t => typeof t === 'string' && t.trim()))) errors.push('allowed-tools must be a string or list of tool strings');
    for (const key of ['user-invocable', 'disable-model-invocation']) {
      if (meta[key] !== undefined && typeof meta[key] !== 'boolean') errors.push(`${key} must be a boolean`);
    }
    return errors;
  } catch (error) { return [(error as Error).message]; }
}

/** Validate NONoise's emitted Codex TOML subset, not arbitrary user TOML.
 * The emitter writes one JSON-escaped basic string per assignment. Reject
 * constructs outside that contract instead of accepting partially parsed TOML. */
function codexAgent(text: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = /^([a-z_]+) = (".*")$/.exec(line);
    if (!m || !['name', 'description', 'developer_instructions'].includes(m[1]!) || Object.hasOwn(meta, m[1]!)) throw new Error('Invalid or duplicate emitted Codex TOML field');
    meta[m[1]!] = JSON.parse(m[2]!);
  }
  return meta;
}

export function validateAgent(text: string, host: 'claude' | 'copilot' | 'codex', name: string): string[] {
  try {
    const meta = host === 'codex' ? codexAgent(text) : frontmatter(text);
    const errors = identity(meta, name);
    if (host === 'codex') {
      if (typeof meta.developer_instructions !== 'string' || !meta.developer_instructions.trim()) errors.push('Codex agent requires developer_instructions');
    } else {
      // Deliberately bound to capabilities emitted by NONoise's ECC mapper.
      const allowed = host === 'claude' ? ['Read', 'Grep', 'Glob', 'Bash', 'Write', 'Edit'] : ['read', 'search', 'execute', 'edit'];
      if (!Array.isArray(meta.tools) || !meta.tools.length || meta.tools.some(t => typeof t !== 'string' || !allowed.includes(t))) errors.push(`Invalid ${host} agent tools`);
      for (const key of Object.keys(meta)) if (!['name', 'description', 'tools'].includes(key)) errors.push(`Unexpected emitted ${host} agent field: ${key}`);
    }
    return errors;
  } catch (error) { return [(error as Error).message]; }
}

/** Mirror installer entrypoints, not arbitrary upstream examples/references.
 * vendor/graphify is reference-only and excluded by bundle-assets.mjs. Native
 * plugins fetched at install time are outside the pinned shipped asset surface. */
export function listShippedSkills(root: string): Array<{ path: string; name: string }> {
  const result: Array<{ path: string; name: string }> = [];
  const dirs = (path: string) => readdirSync(path, { withFileTypes: true }).filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name).sort();
  const add = (dir: string) => { const path = join(dir, 'SKILL.md'); if (existsSync(path)) result.push({ path, name: basename(dir) }); };
  for (const name of dirs(root)) if (!['vendor', '_shared', 'graphify-platform-skills'].includes(name)) {
    // Native directories are skill entrypoints; a missing SKILL.md must fail.
    result.push({ path: join(root, name, 'SKILL.md'), name });
  }
  for (const vendor of dirs(join(root, 'vendor')).filter(name => name !== 'graphify')) {
    const dir = join(root, 'vendor', vendor);
    if (existsSync(join(dir, 'SKILL.md'))) add(dir);
    else {
      const skills = existsSync(join(dir, 'skills')) ? join(dir, 'skills') : dir;
      for (const name of dirs(skills)) add(join(skills, name));
    }
  }
  for (const file of ['skill.md', 'skill-codex.md', 'skill-copilot.md']) result.push({ path: join(root, 'graphify-platform-skills', file), name: 'graphify' });
  return result;
}
