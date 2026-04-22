import { access, cp, stat, mkdir, readdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join } from 'node:path';

export type InstallSkillsOptions = {
  skillsRoot: string;
  projectPath: string;
  skillNames: string[];
};

export async function installSkills(opts: InstallSkillsOptions): Promise<void> {
  const destBase = join(opts.projectPath, '.claude', 'skills');

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
    await cp(src, dest, { recursive: true, force: false, errorOnExist: false });
  }
}

export type InstallVendorOptions = {
  vendorSourcePath: string;
  projectPath: string;
  namespace: string;
  installClaudeSpecific: boolean;
};

export async function installVendor(opts: InstallVendorOptions): Promise<void> {
  const { vendorSourcePath, projectPath, namespace, installClaudeSpecific } = opts;

  const nestedSkillsSrc = join(vendorSourcePath, 'skills');
  const skillsSrc = (await dirExists(nestedSkillsSrc)) ? nestedSkillsSrc : vendorSourcePath;
  const skillsDest = join(projectPath, '.claude', 'skills', namespace);
  await mkdir(skillsDest, { recursive: true });
  for (const name of await readdir(skillsSrc)) {
    const candidate = join(skillsSrc, name);
    if (!(await isSkillDir(candidate))) continue;
    await cp(candidate, join(skillsDest, name), {
      recursive: true,
      force: false,
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
        force: false,
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
