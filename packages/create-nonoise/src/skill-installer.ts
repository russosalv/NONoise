import { cp, stat } from 'node:fs/promises';
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
