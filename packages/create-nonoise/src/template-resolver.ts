import { readdir } from 'node:fs/promises';
import { join, posix, sep } from 'node:path';
import type { AiTools, AiToolKey } from './types.js';
import { FLAG_TO_AI_TOOL } from './types.js';

export type ResolvedFile = {
  sourcePath: string;
  destPath: string;
  isTemplate: boolean;
};

export async function resolveTemplateFiles(
  templateDir: string,
  aiTools: AiTools,
): Promise<ResolvedFile[]> {
  const topEntries = await readdir(templateDir, { withFileTypes: true });
  const collected: ResolvedFile[] = [];

  for (const entry of topEntries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name === '_always') {
      await walkInto(join(templateDir, name), '', collected);
    } else if (name.startsWith('_if-')) {
      const flag = name.slice('_if-'.length);
      const key: AiToolKey | undefined = FLAG_TO_AI_TOOL[flag];
      if (key && aiTools[key]) {
        await walkInto(join(templateDir, name), '', collected);
      }
    }
  }

  // Collision detection
  const seen = new Map<string, string>();
  for (const file of collected) {
    const existing = seen.get(file.destPath);
    if (existing && existing !== file.sourcePath) {
      throw new Error(
        `Template collision for destination "${file.destPath}": both "${existing}" and "${file.sourcePath}" produce it.`,
      );
    }
    seen.set(file.destPath, file.sourcePath);
  }

  return collected;
}

async function walkInto(
  rootDir: string,
  relative: string,
  acc: ResolvedFile[],
): Promise<void> {
  const fullDir = relative ? join(rootDir, relative) : rootDir;
  const entries = await readdir(fullDir, { withFileTypes: true });

  for (const entry of entries) {
    const childRel = relative ? join(relative, entry.name) : entry.name;
    const childAbs = join(rootDir, childRel);
    if (entry.isDirectory()) {
      await walkInto(rootDir, childRel, acc);
    } else if (entry.isFile()) {
      const isTemplate = entry.name.endsWith('.hbs');
      const destRelPosix = toPosix(childRel);
      const destPath = isTemplate ? destRelPosix.slice(0, -'.hbs'.length) : destRelPosix;
      acc.push({ sourcePath: childAbs, destPath, isTemplate });
    }
  }
}

function toPosix(p: string): string {
  return p.split(sep).join(posix.sep);
}
