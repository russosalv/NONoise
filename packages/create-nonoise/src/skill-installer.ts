import { installManagedAssets } from './managed-assets.js';
import { LEGACY_SKILL_HASHES } from './legacy-skill-hashes.js';
import { access, cp, stat, mkdir, readdir, lstat, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { join } from 'node:path';
import type { AiTools } from './types.js';

export type InstallSkillsOptions = {
  skillsRoot: string;
  projectPath: string;
  skillNames: string[];
  /**
   * If true, overwrite existing skill files in the destination. Used by the
   * `--upgrade` flow to refresh bundled skills on an existing project. Default
   * is false (scaffold behaviour: never clobber pre-existing files).
   */
  overwrite?: boolean;
  /** Project-relative skills directory. Default `.claude/skills`. */
  targetDir?: string;
  /** Protect edits using installed or historical hashes (scaffold and upgrades). */
  managed?: boolean;
};

/**
 * Skill directories that must receive the NONoise bundle. `.claude/skills` is
 * the canonical copy; Codex and Copilot CLI read repo skills from `.agents/skills`.
 */
export function nonoiseSkillDirs(ai: AiTools): string[] {
  return ['.claude/skills', ...(ai.codex || ai.copilot ? ['.agents/skills'] : [])];
}

export async function installSkills(opts: InstallSkillsOptions): Promise<void> {
  const destBase = join(opts.projectPath, opts.targetDir ?? join('.claude', 'skills'));
  const force = opts.overwrite === true;

  for (const name of opts.skillNames) {
    const src = join(opts.skillsRoot, name);
    try {
      const s = await stat(src);
      if (!s.isDirectory()) {
        throw new Error(`Skill "${name}" exists but is not a directory.`);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Skill not found: "${name}" (looked in ${src}).`);
      }
      throw err;
    }
    const dest = join(destBase, name);
    if (opts.managed) {
      const files: Record<string, Buffer> = {};
      async function collect(dir: string, rel: string): Promise<void> {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          if (entry.isDirectory()) await collect(join(dir, entry.name), `${rel}/${entry.name}`);
          else if (entry.isFile()) files[`${rel}/${entry.name}`] = await readFile(join(dir, entry.name));
        }
      }
      await collect(src, `${opts.targetDir ?? '.claude/skills'}/${name}`);
      const result = installManagedAssets(opts.projectPath, files, LEGACY_SKILL_HASHES);
      for (const file of result.preserved) console.log(`[skills] preserved user file: ${file}`);
    } else await cp(src, dest, { recursive: true, force, errorOnExist: false });
  }
}

export type InstallVendorOptions = {
  vendorSourcePath: string;
  projectPath: string;
  namespace: string;
  installClaudeSpecific: boolean;
  /** See InstallSkillsOptions.overwrite. */
  overwrite?: boolean;
};

export async function installVendor(opts: InstallVendorOptions): Promise<void> {
  const { vendorSourcePath, projectPath, namespace, installClaudeSpecific } = opts;
  const force = opts.overwrite === true;

  const nestedSkillsSrc = join(vendorSourcePath, 'skills');
  const skillsSrc = (await dirExists(nestedSkillsSrc)) ? nestedSkillsSrc : vendorSourcePath;
  const skillsDest = join(projectPath, '.claude', 'skills', namespace);
  await mkdir(skillsDest, { recursive: true });
  const unified = join(skillsSrc, namespace);
  if (await isSkillDir(unified)) {
    await cp(unified, skillsDest, { recursive: true, force, errorOnExist: false });
  } else for (const name of await readdir(skillsSrc)) {
    const candidate = join(skillsSrc, name);
    if (!(await isSkillDir(candidate))) continue;
    await cp(candidate, join(skillsDest, name), {
      recursive: true,
      force,
      errorOnExist: false,
    });
  }

  if (!installClaudeSpecific) return;

  for (const sub of ['agents', 'commands', 'hooks'] as const) {
    const src = join(vendorSourcePath, sub);
    if (!(await dirExists(src))) continue;
    const dest = join(projectPath, '.claude', sub, namespace);
    await mkdir(dest, { recursive: true });
    for (const name of await readdir(src)) {
      await cp(join(src, name), join(dest, name), {
        recursive: true,
        force,
        errorOnExist: false,
      });
    }
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw err;
  }
}

async function isSkillDir(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    if (!s.isDirectory()) return false;
    await access(join(path, 'SKILL.md'), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Skills NONoise no longer ships, with the SHA-256 of every SKILL.md it ever shipped. */
const RETIRED_SKILLS: Record<string, string[]> = {
  // Replaced by OpenAI's official Claude Code plugin `codex@openai-codex`.
  'codex-delegate': ['06711719de4393b9d4e7b4959ddf58a04bdd996ef02f5b601223c3ba9e6d4345'],
};

/**
 * Removes retired NONoise skills only when they are pristine (a single
 * SKILL.md matching a shipped hash, no symlinks). Anything else is preserved.
 */
export async function removeRetiredSkills(projectPath: string): Promise<{ removed: string[]; preserved: string[] }> {
  const removed: string[] = [], preserved: string[] = [];
  for (const dir of ['.claude/skills', '.agents/skills']) {
    for (const [name, hashes] of Object.entries(RETIRED_SKILLS)) {
      const rel = `${dir}/${name}`;
      const path = join(projectPath, rel);
      let info;
      try { info = await lstat(path); } catch { continue; }
      // A link to a copy removed above is now dangling: drop the link, never its target.
      if (info.isSymbolicLink() && !(await stat(path).then(() => true, () => false))) {
        await rm(path); removed.push(rel); continue;
      }
      const entries = info.isDirectory() && !info.isSymbolicLink() ? await readdir(path) : [];
      const pristine = entries.length === 1 && entries[0] === 'SKILL.md'
        && (await lstat(join(path, 'SKILL.md'))).isFile()
        && hashes.includes(createHash('sha256').update(await readFile(join(path, 'SKILL.md'))).digest('hex'));
      if (pristine) { await rm(path, { recursive: true }); removed.push(rel); } else preserved.push(rel);
    }
  }
  return { removed, preserved };
}
