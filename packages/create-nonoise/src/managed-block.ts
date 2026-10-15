import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import Handlebars from 'handlebars';
import type { ProjectContext } from './types.js';

const BLOCK = /<!-- nonoise:begin v[^\r\n]+ -->[\s\S]*?<!-- nonoise:end -->/;
export function replaceManagedBlock(existing: string, generated: string): string {
  const block = generated.match(BLOCK)?.[0];
  if (!block) throw new Error('Template has no NONoise managed block');
  if (BLOCK.test(existing)) return existing.replace(BLOCK, () => block);
  if (existing.includes('<!-- nonoise:begin') || existing.includes('<!-- nonoise:end')) {
    throw new Error('Incomplete NONoise markers: refusing to overwrite user content');
  }
  const title = /^# [^\r\n]*(?:\r?\n|$)/m.exec(existing);
  const offset = title ? title.index + title[0].length : 0;
  return existing.slice(0, offset) + (offset && !existing.slice(0, offset).endsWith('\n') ? '\n' : '') + '\n' + block + '\n' + existing.slice(offset);
}

export async function updateManagedFiles(ctx: ProjectContext, templatesRoot: string): Promise<void> {
  const files = [['_always', 'AGENTS.md']];
  if (ctx.aiTools.claudeCode) files.push(['_if-claude-code', 'CLAUDE.md']);
  if (ctx.aiTools.copilot) files.push(['_if-copilot', '.github/copilot-instructions.md']);
  for (const [folder, file] of files) {
    const template = await readFile(join(templatesRoot, ctx.template, folder!, file! + '.hbs'), 'utf8');
    const generated = Handlebars.compile(template, { noEscape: true })(ctx);
    const dest = join(ctx.projectPath, file!);
    let existing: string;
    try { existing = await readFile(dest, 'utf8'); } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
      existing = generated;
    }
    const content = replaceManagedBlock(existing, generated);
    await mkdir(dirname(dest), { recursive: true });
    if (content !== existing || existing === generated) await writeFile(dest, content);
  }
}

/** Preserve instruction files across upstream installers that replace Markdown sections. */
export function preserveInstructionFiles<T>(cwd: string, install: () => T): T {
  const instructions = ['CLAUDE.md', 'AGENTS.md', '.github/copilot-instructions.md', '.cursor/rules.md', 'GEMINI.md'];
  const before = instructions.map(p => join(cwd, p)).filter(existsSync).map(p => ({ path: p, content: readFileSync(p) }));
  try { return install(); }
  finally {
    for (const file of before) {
      if (!existsSync(file.path) || !readFileSync(file.path).equals(file.content)) writeFileSync(file.path, file.content);
    }
  }
}
