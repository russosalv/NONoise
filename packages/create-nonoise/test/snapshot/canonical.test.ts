import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffold } from '../../src/scaffold.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const TEMPLATES_ROOT = join(REPO_ROOT, 'packages', 'templates');
const SKILLS_ROOT = join(REPO_ROOT, 'packages', 'skills');

describe('canonical scaffold snapshot', () => {
  let parent: string;
  let projectPath: string;

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-snap-'));
    projectPath = join(parent, 'snap-proj');
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  it('produces the canonical file tree + content when all AI tools are selected', async () => {
    await scaffold(
      {
        projectName: 'snap-proj',
        projectPath,
        template: 'single-project',
        aiTools: {
          claudeCode: true,
          copilot: true,
          codex: true,
          cursor: true,
          geminiCli: true,
        },
        gitInit: false,
        frameworkVersion: '0.0.0-snapshot',
      },
      { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT },
    );

    const tree = await collectTree(projectPath);
    expect(tree.relPaths).toMatchSnapshot('file-tree');
    expect(tree.textContent).toMatchSnapshot('file-content');
  });
});

async function collectTree(root: string): Promise<{ relPaths: string[]; textContent: Record<string, string> }> {
  const relPaths: string[] = [];
  const textContent: Record<string, string> = {};

  async function walk(dir: string, rel: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      const childAbs = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(childAbs, childRel);
      } else if (entry.isFile()) {
        relPaths.push(childRel);
        if (isTextFile(entry.name)) {
          textContent[childRel] = normalize(await readFile(childAbs, 'utf8'));
        }
      }
    }
  }

  await walk(root, '');
  relPaths.sort();
  return { relPaths, textContent };
}

function isTextFile(name: string): boolean {
  return /\.(md|json|txt|hbs)$/.test(name) || name === '.gitignore' || name === '.gitkeep';
}

function normalize(s: string): string {
  return s
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '<ISO_TIMESTAMP>')
    .replace(/\r\n/g, '\n');
}
