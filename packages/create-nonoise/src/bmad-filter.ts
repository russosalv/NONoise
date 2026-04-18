import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

export const BMAD_ALLOWLIST: ReadonlySet<string> = new Set([
  'bmad-advanced-elicitation',
  'bmad-agent-analyst',
  'bmad-agent-architect',
  'bmad-agent-tech-writer',
  'bmad-agent-ux-designer',
]);

export async function filterBmadSkills(projectPath: string): Promise<string[]> {
  const skillsDir = join(projectPath, '.claude', 'skills');
  const exists = await stat(skillsDir).catch(() => null);
  if (!exists || !exists.isDirectory()) return [];

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const removed: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('bmad-')) continue;
    if (BMAD_ALLOWLIST.has(entry.name)) continue;
    await rm(join(skillsDir, entry.name), { recursive: true, force: true });
    removed.push(entry.name);
  }
  return removed;
}
