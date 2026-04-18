# SP-1 — create-nonoise CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working `npx create-nonoise` CLI that scaffolds a stack-agnostic `single-project` template with multi-AI opt-in and 3 bundled skills.

**Architecture:** pnpm monorepo with three workspace packages (`create-nonoise` CLI, `templates` assets, `skills` assets). CLI reads an inline template tree using `_always/` + `_if-<flag>/` folder conventions, renders `*.hbs` files via handlebars, then copies selected skills into `.claude/skills/`. Single publishable npm package, bundled tarball.

**Tech Stack:** TypeScript (ESM, Node ≥ 20), pnpm workspaces, `@clack/prompts`, `handlebars`, `vitest`, `changesets`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-04-18-sp1-cli-installer-single-project-design.md`

**Working directory:** `D:\DEV\NONoise-frmw\NONoise-frmw\` (inner folder, the framework repo; git remote: https://github.com/russosalv/NONoise.git)

---

## File Structure

```
NONoise-frmw/
├── .changeset/
│   └── config.json
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── packages/
│   ├── create-nonoise/
│   │   ├── bin/create-nonoise.mjs
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── prompts.ts
│   │   │   ├── scaffold.ts
│   │   │   ├── template-resolver.ts
│   │   │   ├── skill-installer.ts
│   │   │   ├── handlebars-helpers.ts
│   │   │   └── types.ts
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   │   ├── handlebars-helpers.test.ts
│   │   │   │   ├── template-resolver.test.ts
│   │   │   │   └── skill-installer.test.ts
│   │   │   ├── integration/
│   │   │   │   └── cli.test.ts
│   │   │   ├── snapshot/
│   │   │   │   ├── canonical.test.ts
│   │   │   │   └── __snapshots__/...
│   │   │   └── validation/
│   │   │       └── skill-manifest.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── templates/
│   │   ├── single-project/
│   │   │   ├── _always/ ...
│   │   │   ├── _if-claude-code/ ...
│   │   │   ├── _if-copilot/ ...
│   │   │   ├── _if-codex/ ...
│   │   │   ├── _if-cursor/ ...
│   │   │   └── _if-gemini-cli/ ...
│   │   └── package.json
│   └── skills/
│       ├── graphify-gitignore/SKILL.md
│       ├── vscode-config-generator/
│       │   ├── SKILL.md
│       │   └── assets/*.json.hbs
│       ├── docs-md-generator/SKILL.md
│       └── package.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

Responsibility per file:
- **`types.ts`** — public types: `ProjectContext`, `AiTools`, `TemplateName`.
- **`handlebars-helpers.ts`** — pure functions transforming strings for handlebars.
- **`template-resolver.ts`** — walks a template dir, returns list of `{source, dest}` filtered by `aiTools`.
- **`skill-installer.ts`** — copies skills from `packages/skills/` into project's `.claude/skills/`.
- **`scaffold.ts`** — orchestrator: takes `ProjectContext`, runs resolver + installer + git init.
- **`prompts.ts`** — `@clack/prompts` UI; returns `ProjectContext` from user input + flags.
- **`index.ts`** — parse argv, run prompts, run scaffold, handle errors.
- **`bin/create-nonoise.mjs`** — Node shim, enforces Node ≥ 20, imports compiled `dist/index.js`.

---

## Pre-flight

- [ ] **Step 0.1: Verify repo state**

Run:
```bash
cd /d/DEV/NONoise-frmw/NONoise-frmw
git status
git log --oneline
```

Expected:
```
On branch main
nothing to commit, working tree clean
4d7e6f6 docs: SP-1 design spec for create-nonoise CLI + single-project template
```

- [ ] **Step 0.2: Verify Node and pnpm versions**

Run:
```bash
node --version
pnpm --version
```

Expected: Node `v20.x` or higher, pnpm `8.x` or higher. If pnpm missing, install: `npm i -g pnpm`.

---

## Task 1: pnpm monorepo foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.npmrc`

- [ ] **Step 1.1: Create root `package.json`**

Create `package.json`:
```json
{
  "name": "nonoise-monorepo",
  "version": "0.1.0",
  "private": true,
  "description": "NONoise Framework monorepo — create-nonoise CLI + templates + skills",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "pnpm -r --filter create-nonoise run build",
    "test": "pnpm -r run test",
    "typecheck": "pnpm -r run typecheck",
    "lint": "echo 'no lint configured yet'",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.9",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

- [ ] **Step 1.2: Create `pnpm-workspace.yaml`**

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 1.3: Create `tsconfig.base.json`**

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 1.4: Create `.npmrc`**

Create `.npmrc`:
```
shamefully-hoist=false
strict-peer-dependencies=true
auto-install-peers=true
```

- [ ] **Step 1.5: Install root dependencies**

Run:
```bash
pnpm install
```

Expected: creates `pnpm-lock.yaml`, no errors. Warnings about missing workspace packages are OK (we create them next).

- [ ] **Step 1.6: Commit**

Run:
```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .npmrc pnpm-lock.yaml
git commit -m "chore: pnpm monorepo foundation"
```

---

## Task 2: Scaffold `packages/create-nonoise` package shell

**Files:**
- Create: `packages/create-nonoise/package.json`
- Create: `packages/create-nonoise/tsconfig.json`
- Create: `packages/create-nonoise/vitest.config.ts`
- Create: `packages/create-nonoise/src/index.ts`
- Create: `packages/create-nonoise/bin/create-nonoise.mjs`

- [ ] **Step 2.1: Create package.json**

Create `packages/create-nonoise/package.json`:
```json
{
  "name": "create-nonoise",
  "version": "0.1.0",
  "description": "SDLC bootstrapper — scaffolds projects with skills, agents, and tools",
  "type": "module",
  "bin": {
    "create-nonoise": "./bin/create-nonoise.mjs"
  },
  "files": [
    "bin",
    "dist",
    "templates",
    "skills"
  ],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsc --project tsconfig.json && node scripts/bundle-assets.mjs",
    "typecheck": "tsc --noEmit --project tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@clack/prompts": "^0.7.0",
    "handlebars": "^4.7.8"
  },
  "devDependencies": {
    "@types/node": "^22.7.5"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "keywords": ["scaffold", "cli", "sdlc", "claude-code", "copilot", "nonoise"],
  "license": "MIT"
}
```

- [ ] **Step 2.2: Create tsconfig.json**

Create `packages/create-nonoise/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "test"]
}
```

- [ ] **Step 2.3: Create vitest.config.ts**

Create `packages/create-nonoise/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    pool: 'forks',
    testTimeout: 30_000,
  },
});
```

- [ ] **Step 2.4: Create placeholder src/index.ts**

Create `packages/create-nonoise/src/index.ts`:
```ts
export async function main(): Promise<void> {
  console.log('create-nonoise: not implemented yet');
}
```

- [ ] **Step 2.5: Create bin shim**

Create `packages/create-nonoise/bin/create-nonoise.mjs`:
```js
#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const [major] = process.versions.node.split('.').map(Number);
if (major < 20) {
  console.error(`create-nonoise requires Node.js 20 or higher. You are running ${process.versions.node}.`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const { main } = await import(resolve(here, '..', 'dist', 'index.js'));
await main();
```

- [ ] **Step 2.6: Install package deps**

Run:
```bash
pnpm install
```

Expected: resolves workspace, installs `@clack/prompts`, `handlebars`, `@types/node`.

- [ ] **Step 2.7: Smoke-check build**

Run:
```bash
pnpm --filter create-nonoise run typecheck
```

Expected: no errors. (Build will fail because we haven't written `scripts/bundle-assets.mjs` yet — that's Task 18.)

- [ ] **Step 2.8: Commit**

Run:
```bash
git add packages/create-nonoise/ pnpm-lock.yaml
git commit -m "feat(create-nonoise): package shell with bin shim and tsconfig"
```

---

## Task 3: Types

**Files:**
- Create: `packages/create-nonoise/src/types.ts`

- [ ] **Step 3.1: Write types.ts**

Create `packages/create-nonoise/src/types.ts`:
```ts
export type AiToolKey =
  | 'claudeCode'
  | 'copilot'
  | 'codex'
  | 'cursor'
  | 'geminiCli';

export type AiTools = Record<AiToolKey, boolean>;

export type TemplateName = 'single-project';

export type ProjectContext = {
  projectName: string;
  projectPath: string;
  template: TemplateName;
  aiTools: AiTools;
  gitInit: boolean;
  frameworkVersion: string;
};

export type HandlebarsRenderContext = ProjectContext & {
  projectNamePascal: string;
  projectNameSnake: string;
  year: string;
};

export const AI_TOOL_TO_FLAG: Record<AiToolKey, string> = {
  claudeCode: 'claude-code',
  copilot: 'copilot',
  codex: 'codex',
  cursor: 'cursor',
  geminiCli: 'gemini-cli',
};

export const FLAG_TO_AI_TOOL: Record<string, AiToolKey> = Object.fromEntries(
  Object.entries(AI_TOOL_TO_FLAG).map(([k, v]) => [v, k as AiToolKey])
) as Record<string, AiToolKey>;
```

- [ ] **Step 3.2: Typecheck**

Run:
```bash
pnpm --filter create-nonoise run typecheck
```

Expected: no errors.

- [ ] **Step 3.3: Commit**

Run:
```bash
git add packages/create-nonoise/src/types.ts
git commit -m "feat(create-nonoise): define ProjectContext and AiTools types"
```

---

## Task 4: Handlebars helpers (TDD)

**Files:**
- Create: `packages/create-nonoise/test/unit/handlebars-helpers.test.ts`
- Create: `packages/create-nonoise/src/handlebars-helpers.ts`

- [ ] **Step 4.1: Write failing tests**

Create `packages/create-nonoise/test/unit/handlebars-helpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toPascalCase, toSnakeCase } from '../../src/handlebars-helpers.js';

describe('toPascalCase', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('my-app')).toBe('MyApp');
  });

  it('handles single word', () => {
    expect(toPascalCase('app')).toBe('App');
  });

  it('handles multiple segments', () => {
    expect(toPascalCase('my-awesome-app')).toBe('MyAwesomeApp');
  });

  it('strips leading/trailing hyphens', () => {
    expect(toPascalCase('-my-app-')).toBe('MyApp');
  });

  it('handles digits', () => {
    expect(toPascalCase('app-v2')).toBe('AppV2');
  });
});

describe('toSnakeCase', () => {
  it('converts kebab-case to snake_case', () => {
    expect(toSnakeCase('my-app')).toBe('my_app');
  });

  it('handles single word', () => {
    expect(toSnakeCase('app')).toBe('app');
  });

  it('handles multiple segments', () => {
    expect(toSnakeCase('my-awesome-app')).toBe('my_awesome_app');
  });

  it('strips leading/trailing hyphens', () => {
    expect(toSnakeCase('-my-app-')).toBe('my_app');
  });
});
```

- [ ] **Step 4.2: Run tests — verify they fail**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/unit/handlebars-helpers.test.ts
```

Expected: FAIL — module `../../src/handlebars-helpers.js` not found.

- [ ] **Step 4.3: Implement helpers**

Create `packages/create-nonoise/src/handlebars-helpers.ts`:
```ts
export function toPascalCase(input: string): string {
  return input
    .split('-')
    .filter((s) => s.length > 0)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

export function toSnakeCase(input: string): string {
  return input
    .split('-')
    .filter((s) => s.length > 0)
    .join('_');
}
```

- [ ] **Step 4.4: Run tests — verify they pass**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/unit/handlebars-helpers.test.ts
```

Expected: PASS — all 9 tests pass.

- [ ] **Step 4.5: Commit**

Run:
```bash
git add packages/create-nonoise/src/handlebars-helpers.ts packages/create-nonoise/test/unit/handlebars-helpers.test.ts
git commit -m "feat(create-nonoise): handlebars helpers toPascalCase and toSnakeCase"
```

---

## Task 5: Template resolver (TDD)

**Files:**
- Create: `packages/create-nonoise/test/unit/template-resolver.test.ts`
- Create: `packages/create-nonoise/src/template-resolver.ts`

- [ ] **Step 5.1: Write failing test — resolveIncludedFiles**

Create `packages/create-nonoise/test/unit/template-resolver.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveTemplateFiles } from '../../src/template-resolver.js';
import type { AiTools } from '../../src/types.js';

describe('resolveTemplateFiles', () => {
  let templateDir: string;

  beforeEach(async () => {
    templateDir = await mkdtemp(join(tmpdir(), 'nonoise-tpl-'));
    await mkdir(join(templateDir, '_always'), { recursive: true });
    await writeFile(join(templateDir, '_always', 'AGENTS.md.hbs'), 'agents');
    await writeFile(join(templateDir, '_always', 'README.md.hbs'), 'readme');

    await mkdir(join(templateDir, '_if-claude-code', '.claude'), { recursive: true });
    await writeFile(join(templateDir, '_if-claude-code', 'CLAUDE.md.hbs'), 'claude');
    await writeFile(join(templateDir, '_if-claude-code', '.claude', '.gitkeep'), '');

    await mkdir(join(templateDir, '_if-copilot', '.github'), { recursive: true });
    await writeFile(join(templateDir, '_if-copilot', '.github', 'copilot-instructions.md.hbs'), 'copilot');
  });

  afterEach(async () => {
    await rm(templateDir, { recursive: true, force: true });
  });

  function buildAiTools(overrides: Partial<AiTools> = {}): AiTools {
    return {
      claudeCode: false,
      copilot: false,
      codex: false,
      cursor: false,
      geminiCli: false,
      ...overrides,
    };
  }

  it('always includes _always files regardless of flags', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools());
    const destPaths = result.map((f) => f.destPath).sort();
    expect(destPaths).toEqual(['AGENTS.md', 'README.md']);
  });

  it('includes _if-claude-code when claudeCode is true', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true }));
    const destPaths = result.map((f) => f.destPath).sort();
    expect(destPaths).toEqual(['.claude/.gitkeep', 'AGENTS.md', 'CLAUDE.md', 'README.md']);
  });

  it('includes _if-copilot when copilot is true', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ copilot: true }));
    const destPaths = result.map((f) => f.destPath).sort();
    expect(destPaths).toContain('.github/copilot-instructions.md');
  });

  it('includes multiple conditional folders', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true, copilot: true }));
    const destPaths = result.map((f) => f.destPath).sort();
    expect(destPaths).toContain('CLAUDE.md');
    expect(destPaths).toContain('.github/copilot-instructions.md');
    expect(destPaths).toContain('AGENTS.md');
  });

  it('strips .hbs extension from destination path', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true }));
    for (const file of result) {
      expect(file.destPath).not.toMatch(/\.hbs$/);
    }
  });

  it('preserves .hbs in sourcePath when source is a template', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true }));
    const claudeMd = result.find((f) => f.destPath === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    expect(claudeMd!.sourcePath).toMatch(/CLAUDE\.md\.hbs$/);
    expect(claudeMd!.isTemplate).toBe(true);
  });

  it('detects non-template files (no .hbs)', async () => {
    const result = await resolveTemplateFiles(templateDir, buildAiTools({ claudeCode: true }));
    const gitkeep = result.find((f) => f.destPath === '.claude/.gitkeep');
    expect(gitkeep).toBeDefined();
    expect(gitkeep!.isTemplate).toBe(false);
  });
});

describe('resolveTemplateFiles — collision detection', () => {
  let templateDir: string;

  beforeEach(async () => {
    templateDir = await mkdtemp(join(tmpdir(), 'nonoise-tpl-collide-'));
    await mkdir(join(templateDir, '_always'), { recursive: true });
    await mkdir(join(templateDir, '_if-claude-code'), { recursive: true });
    await writeFile(join(templateDir, '_always', 'FOO.md'), 'always');
    await writeFile(join(templateDir, '_if-claude-code', 'FOO.md'), 'conditional');
  });

  afterEach(async () => {
    await rm(templateDir, { recursive: true, force: true });
  });

  it('throws when _always and _if-* produce the same destination path', async () => {
    const aiTools: AiTools = {
      claudeCode: true, copilot: false, codex: false, cursor: false, geminiCli: false,
    };
    await expect(resolveTemplateFiles(templateDir, aiTools)).rejects.toThrow(/collision.*FOO\.md/i);
  });
});
```

- [ ] **Step 5.2: Run tests — verify they fail**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/unit/template-resolver.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 5.3: Implement resolver**

Create `packages/create-nonoise/src/template-resolver.ts`:
```ts
import { readdir, stat } from 'node:fs/promises';
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
```

- [ ] **Step 5.4: Run tests — verify they pass**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/unit/template-resolver.test.ts
```

Expected: PASS — all 8 tests pass.

- [ ] **Step 5.5: Commit**

Run:
```bash
git add packages/create-nonoise/src/template-resolver.ts packages/create-nonoise/test/unit/template-resolver.test.ts
git commit -m "feat(create-nonoise): template resolver with _always + _if-<flag> support"
```

---

## Task 6: Skill installer (TDD)

**Files:**
- Create: `packages/create-nonoise/test/unit/skill-installer.test.ts`
- Create: `packages/create-nonoise/src/skill-installer.ts`

- [ ] **Step 6.1: Write failing tests**

Create `packages/create-nonoise/test/unit/skill-installer.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkills } from '../../src/skill-installer.js';

describe('installSkills', () => {
  let skillsDir: string;
  let projectDir: string;

  beforeEach(async () => {
    skillsDir = await mkdtemp(join(tmpdir(), 'nonoise-skills-'));
    projectDir = await mkdtemp(join(tmpdir(), 'nonoise-proj-'));

    // Create 2 fake skills
    await mkdir(join(skillsDir, 'skill-alpha'), { recursive: true });
    await writeFile(join(skillsDir, 'skill-alpha', 'SKILL.md'), '---\nname: skill-alpha\n---\nAlpha');

    await mkdir(join(skillsDir, 'skill-beta', 'assets'), { recursive: true });
    await writeFile(join(skillsDir, 'skill-beta', 'SKILL.md'), '---\nname: skill-beta\n---\nBeta');
    await writeFile(join(skillsDir, 'skill-beta', 'assets', 'template.txt'), 'asset-content');
  });

  afterEach(async () => {
    await rm(skillsDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  });

  it('copies requested skills into project .claude/skills/', async () => {
    await installSkills({
      skillsRoot: skillsDir,
      projectPath: projectDir,
      skillNames: ['skill-alpha'],
    });

    const content = await readFile(join(projectDir, '.claude', 'skills', 'skill-alpha', 'SKILL.md'), 'utf8');
    expect(content).toContain('Alpha');
  });

  it('copies nested asset files', async () => {
    await installSkills({
      skillsRoot: skillsDir,
      projectPath: projectDir,
      skillNames: ['skill-beta'],
    });

    const asset = await readFile(join(projectDir, '.claude', 'skills', 'skill-beta', 'assets', 'template.txt'), 'utf8');
    expect(asset).toBe('asset-content');
  });

  it('installs multiple skills in one call', async () => {
    await installSkills({
      skillsRoot: skillsDir,
      projectPath: projectDir,
      skillNames: ['skill-alpha', 'skill-beta'],
    });

    const alpha = await readFile(join(projectDir, '.claude', 'skills', 'skill-alpha', 'SKILL.md'), 'utf8');
    const beta = await readFile(join(projectDir, '.claude', 'skills', 'skill-beta', 'SKILL.md'), 'utf8');
    expect(alpha).toContain('Alpha');
    expect(beta).toContain('Beta');
  });

  it('throws when a skill is not found', async () => {
    await expect(
      installSkills({
        skillsRoot: skillsDir,
        projectPath: projectDir,
        skillNames: ['skill-missing'],
      }),
    ).rejects.toThrow(/skill-missing/);
  });
});
```

- [ ] **Step 6.2: Run tests — verify they fail**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/unit/skill-installer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement installer**

Create `packages/create-nonoise/src/skill-installer.ts`:
```ts
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
```

- [ ] **Step 6.4: Run tests — verify they pass**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/unit/skill-installer.test.ts
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 6.5: Commit**

Run:
```bash
git add packages/create-nonoise/src/skill-installer.ts packages/create-nonoise/test/unit/skill-installer.test.ts
git commit -m "feat(create-nonoise): skill installer copies skills into .claude/skills"
```

---

## Task 7: Scaffold orchestrator

**Files:**
- Create: `packages/create-nonoise/src/scaffold.ts`

No TDD here directly — this is thin orchestration tested end-to-end in integration (Task 16).

- [ ] **Step 7.1: Implement scaffold.ts**

Create `packages/create-nonoise/src/scaffold.ts`:
```ts
import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { execSync } from 'node:child_process';
import type { ProjectContext, HandlebarsRenderContext } from './types.js';
import { resolveTemplateFiles } from './template-resolver.js';
import { installSkills } from './skill-installer.js';
import { toPascalCase, toSnakeCase } from './handlebars-helpers.js';

const MVP_SKILL_BUNDLE = [
  'graphify-gitignore',
  'vscode-config-generator',
  'docs-md-generator',
] as const;

export type ScaffoldPaths = {
  templatesRoot: string;
  skillsRoot: string;
};

export async function scaffold(ctx: ProjectContext, paths: ScaffoldPaths): Promise<void> {
  const templateDir = join(paths.templatesRoot, ctx.template);

  const resolved = await resolveTemplateFiles(templateDir, ctx.aiTools);
  const renderCtx: HandlebarsRenderContext = {
    ...ctx,
    projectNamePascal: toPascalCase(ctx.projectName),
    projectNameSnake: toSnakeCase(ctx.projectName),
    year: new Date().getFullYear().toString(),
  };

  for (const file of resolved) {
    const destAbs = join(ctx.projectPath, nativePath(file.destPath));
    await mkdir(dirname(destAbs), { recursive: true });

    if (file.isTemplate) {
      const src = await readFile(file.sourcePath, 'utf8');
      const tpl = Handlebars.compile(src, { noEscape: true });
      const rendered = tpl(renderCtx);
      await writeFile(destAbs, rendered, 'utf8');
    } else {
      await cp(file.sourcePath, destAbs);
    }
  }

  if (ctx.aiTools.claudeCode) {
    await installSkills({
      skillsRoot: paths.skillsRoot,
      projectPath: ctx.projectPath,
      skillNames: Array.from(MVP_SKILL_BUNDLE),
    });
  }

  if (ctx.gitInit) {
    await runGitInit(ctx.projectPath);
  }
}

function nativePath(p: string): string {
  return p.split(posix.sep).join(require('node:path').sep);
}

function runGitInit(cwd: string): void {
  try {
    execSync('git init -b main', { cwd, stdio: 'ignore' });
    execSync('git add .', { cwd, stdio: 'ignore' });
    execSync('git commit -m "chore: initial scaffold via create-nonoise"', {
      cwd,
      stdio: 'ignore',
    });
  } catch {
    // Best-effort: if git isn't configured, skip silently.
  }
}

export function defaultScaffoldPaths(): ScaffoldPaths {
  const here = dirname(fileURLToPath(import.meta.url));
  return {
    templatesRoot: join(here, '..', 'templates'),
    skillsRoot: join(here, '..', 'skills'),
  };
}
```

Wait — `require` is used inside ESM. Fix by importing `sep` at top.

Replace the file with this corrected version:
```ts
import { mkdir, writeFile, readFile, cp } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { execSync } from 'node:child_process';
import type { ProjectContext, HandlebarsRenderContext } from './types.js';
import { resolveTemplateFiles } from './template-resolver.js';
import { installSkills } from './skill-installer.js';
import { toPascalCase, toSnakeCase } from './handlebars-helpers.js';

const MVP_SKILL_BUNDLE = [
  'graphify-gitignore',
  'vscode-config-generator',
  'docs-md-generator',
] as const;

export type ScaffoldPaths = {
  templatesRoot: string;
  skillsRoot: string;
};

export async function scaffold(ctx: ProjectContext, paths: ScaffoldPaths): Promise<void> {
  const templateDir = join(paths.templatesRoot, ctx.template);

  const resolved = await resolveTemplateFiles(templateDir, ctx.aiTools);
  const renderCtx: HandlebarsRenderContext = {
    ...ctx,
    projectNamePascal: toPascalCase(ctx.projectName),
    projectNameSnake: toSnakeCase(ctx.projectName),
    year: new Date().getFullYear().toString(),
  };

  for (const file of resolved) {
    const destAbs = join(ctx.projectPath, nativePath(file.destPath));
    await mkdir(dirname(destAbs), { recursive: true });

    if (file.isTemplate) {
      const src = await readFile(file.sourcePath, 'utf8');
      const tpl = Handlebars.compile(src, { noEscape: true });
      const rendered = tpl(renderCtx);
      await writeFile(destAbs, rendered, 'utf8');
    } else {
      await cp(file.sourcePath, destAbs);
    }
  }

  if (ctx.aiTools.claudeCode) {
    await installSkills({
      skillsRoot: paths.skillsRoot,
      projectPath: ctx.projectPath,
      skillNames: Array.from(MVP_SKILL_BUNDLE),
    });
  }

  if (ctx.gitInit) {
    runGitInit(ctx.projectPath);
  }
}

function nativePath(p: string): string {
  return p.split(posix.sep).join(sep);
}

function runGitInit(cwd: string): void {
  try {
    execSync('git init -b main', { cwd, stdio: 'ignore' });
    execSync('git add .', { cwd, stdio: 'ignore' });
    execSync('git commit -m "chore: initial scaffold via create-nonoise"', {
      cwd,
      stdio: 'ignore',
    });
  } catch {
    // Best-effort: if git isn't configured, skip silently.
  }
}

export function defaultScaffoldPaths(): ScaffoldPaths {
  const here = dirname(fileURLToPath(import.meta.url));
  return {
    templatesRoot: join(here, '..', 'templates'),
    skillsRoot: join(here, '..', 'skills'),
  };
}
```

- [ ] **Step 7.2: Typecheck**

Run:
```bash
pnpm --filter create-nonoise run typecheck
```

Expected: no errors.

- [ ] **Step 7.3: Commit**

Run:
```bash
git add packages/create-nonoise/src/scaffold.ts
git commit -m "feat(create-nonoise): scaffold orchestrator (resolve + render + install + git)"
```

---

## Task 8: Prompts UX (`@clack/prompts`)

**Files:**
- Create: `packages/create-nonoise/src/prompts.ts`

- [ ] **Step 8.1: Implement prompts.ts**

Create `packages/create-nonoise/src/prompts.ts`:
```ts
import { intro, outro, text, multiselect, confirm, isCancel, cancel, spinner, note } from '@clack/prompts';
import { resolve } from 'node:path';
import type { AiToolKey, AiTools, ProjectContext, TemplateName } from './types.js';

export type CliFlags = {
  positionalDir?: string;
  template?: TemplateName;
  ai?: string;              // csv
  noGit?: boolean;
  yes?: boolean;
};

const DEFAULT_AI_TOOLS: AiTools = {
  claudeCode: true,
  copilot: true,
  codex: false,
  cursor: false,
  geminiCli: false,
};

export async function runPrompts(flags: CliFlags, frameworkVersion: string): Promise<ProjectContext> {
  intro('create-nonoise • SDLC bootstrapper');

  const name = await askProjectName(flags);
  const template = flags.template ?? 'single-project';
  const aiTools = await askAiTools(flags);
  const gitInit = flags.noGit === true ? false : flags.yes === true ? true : await askGitInit();

  return {
    projectName: name,
    projectPath: resolve(process.cwd(), name),
    template,
    aiTools,
    gitInit,
    frameworkVersion,
  };
}

async function askProjectName(flags: CliFlags): Promise<string> {
  if (flags.positionalDir) {
    validateProjectName(flags.positionalDir);
    return flags.positionalDir;
  }
  const answer = await text({
    message: 'Project name',
    placeholder: 'my-app',
    validate(value) {
      try {
        validateProjectName(value);
      } catch (e) {
        return (e as Error).message;
      }
    },
  });
  abortIfCancel(answer);
  return answer as string;
}

function validateProjectName(name: string): void {
  if (!name || name.trim().length === 0) throw new Error('Project name cannot be empty.');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
    throw new Error('Use kebab-case: lowercase letters, digits, and single hyphens.');
  }
  if (name.length > 214) throw new Error('Project name is too long (max 214 chars).');
}

async function askAiTools(flags: CliFlags): Promise<AiTools> {
  if (flags.ai !== undefined) return parseAiCsv(flags.ai);
  if (flags.yes) return DEFAULT_AI_TOOLS;

  const selected = await multiselect<AiToolKey>({
    message: 'Which AI tools do you use? (space to toggle, enter to confirm)',
    options: [
      { value: 'claudeCode', label: 'Claude Code' },
      { value: 'copilot', label: 'GitHub Copilot' },
      { value: 'codex', label: 'OpenAI Codex' },
      { value: 'cursor', label: 'Cursor' },
      { value: 'geminiCli', label: 'Gemini CLI' },
    ],
    initialValues: ['claudeCode', 'copilot'],
    required: false,
  });
  abortIfCancel(selected);

  const keys = selected as AiToolKey[];
  return {
    claudeCode: keys.includes('claudeCode'),
    copilot: keys.includes('copilot'),
    codex: keys.includes('codex'),
    cursor: keys.includes('cursor'),
    geminiCli: keys.includes('geminiCli'),
  };
}

function parseAiCsv(csv: string): AiTools {
  const set = new Set(csv.split(',').map((s) => s.trim()).filter(Boolean));
  return {
    claudeCode: set.has('claude-code'),
    copilot: set.has('copilot'),
    codex: set.has('codex'),
    cursor: set.has('cursor'),
    geminiCli: set.has('gemini-cli'),
  };
}

async function askGitInit(): Promise<boolean> {
  const answer = await confirm({ message: 'Initialize a git repository?', initialValue: true });
  abortIfCancel(answer);
  return answer as boolean;
}

function abortIfCancel(value: unknown): void {
  if (isCancel(value)) {
    cancel('Aborted.');
    process.exit(130);
  }
}

export { outro, spinner, note };
```

- [ ] **Step 8.2: Typecheck**

Run:
```bash
pnpm --filter create-nonoise run typecheck
```

Expected: no errors.

- [ ] **Step 8.3: Commit**

Run:
```bash
git add packages/create-nonoise/src/prompts.ts
git commit -m "feat(create-nonoise): @clack/prompts interactive flow"
```

---

## Task 9: CLI entry point (index.ts)

**Files:**
- Modify: `packages/create-nonoise/src/index.ts`

- [ ] **Step 9.1: Replace index.ts with full entry point**

Overwrite `packages/create-nonoise/src/index.ts`:
```ts
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scaffold, defaultScaffoldPaths } from './scaffold.js';
import { runPrompts, outro, spinner, note } from './prompts.js';
import type { CliFlags } from './prompts.js';
import type { TemplateName } from './types.js';

export async function main(): Promise<void> {
  const flags = parseArgv(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    return;
  }
  if (flags.version) {
    console.log(readVersion());
    return;
  }

  try {
    const ctx = await runPrompts(flags, readVersion());
    const s = spinner();
    s.start('Creating project');
    await scaffold(ctx, defaultScaffoldPaths());
    s.stop('Project created');

    note(
      `cd ${ctx.projectName}\n# open with your AI tool of choice`,
      'Next steps',
    );
    outro('Happy coding 🚀');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nError: ${msg}`);
    process.exit(1);
  }
}

type ParsedFlags = CliFlags & { help?: boolean; version?: boolean };

function parseArgv(args: string[]): ParsedFlags {
  const out: ParsedFlags = {};
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--version' || a === '-v') out.version = true;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--no-git') out.noGit = true;
    else if (a === '--template') out.template = args[++i] as TemplateName;
    else if (a === '--ai') out.ai = args[++i];
    else if (!a.startsWith('-') && !out.positionalDir) out.positionalDir = a;
    i++;
  }
  return out;
}

function readVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(here, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
  return pkg.version;
}

function printHelp(): void {
  console.log(`create-nonoise — SDLC bootstrapper

Usage:
  create-nonoise [directory] [options]

Options:
  --template <name>   Template name (default: single-project)
  --ai <csv>          AI tools: claude-code,copilot,codex,cursor,gemini-cli
  --no-git            Skip git init
  --yes, -y           Use defaults, non-interactive
  --version, -v       Print version
  --help, -h          Print help
`);
}
```

- [ ] **Step 9.2: Typecheck**

Run:
```bash
pnpm --filter create-nonoise run typecheck
```

Expected: no errors.

- [ ] **Step 9.3: Commit**

Run:
```bash
git add packages/create-nonoise/src/index.ts
git commit -m "feat(create-nonoise): CLI entry point with argv parsing"
```

---

## Task 10: Templates package shell

**Files:**
- Create: `packages/templates/package.json`

- [ ] **Step 10.1: Create package.json**

Create `packages/templates/package.json`:
```json
{
  "name": "@nonoise/templates-internal",
  "version": "0.1.0",
  "private": true,
  "description": "Template assets consumed by create-nonoise (internal, not published).",
  "files": ["single-project"]
}
```

- [ ] **Step 10.2: Install**

Run:
```bash
pnpm install
```

- [ ] **Step 10.3: Commit**

Run:
```bash
git add packages/templates/package.json pnpm-lock.yaml
git commit -m "chore(templates): package shell"
```

---

## Task 11: Template — `_always/` base files

**Files:**
- Create: `packages/templates/single-project/_always/AGENTS.md.hbs`
- Create: `packages/templates/single-project/_always/README.md.hbs`
- Create: `packages/templates/single-project/_always/.gitignore.hbs`
- Create: `packages/templates/single-project/_always/nonoise.config.json.hbs`
- Create: `packages/templates/single-project/_always/docs/adr/.gitkeep`
- Create: `packages/templates/single-project/_always/docs/specs/.gitkeep`
- Create: `packages/templates/single-project/_always/docs/guides/.gitkeep`
- Create: `packages/templates/single-project/_always/tools/.gitkeep`
- Create: `packages/templates/single-project/_always/src/.gitkeep`
- Create: `packages/templates/single-project/_always/.vscode/settings.json.hbs`
- Create: `packages/templates/single-project/_always/.vscode/extensions.json.hbs`

- [ ] **Step 11.1: AGENTS.md.hbs**

Create the file with:
```handlebars
# {{projectName}}

AI-agents context for this project.

{{#if aiTools.claudeCode}}See `CLAUDE.md` for Claude Code-specific conventions.
{{/if}}{{#if aiTools.copilot}}See `.github/copilot-instructions.md` for GitHub Copilot rules.
{{/if}}{{#if aiTools.geminiCli}}See `GEMINI.md` for Gemini CLI rules.
{{/if}}

## Project structure

- `src/` — application code
- `docs/` — architecture docs, ADRs, specs
- `tools/` — utility scripts

## Build & test

(fill this in once the project has code)

---

Generated by create-nonoise v{{frameworkVersion}}.
```

- [ ] **Step 11.2: README.md.hbs**

Create:
```handlebars
# {{projectName}}

Scaffolded with [create-nonoise](https://github.com/russosalv/NONoise) v{{frameworkVersion}}.

## Getting started

```
cd {{projectName}}
# add your code under src/
```

## AI tools enabled

{{#if aiTools.claudeCode}}- Claude Code
{{/if}}{{#if aiTools.copilot}}- GitHub Copilot
{{/if}}{{#if aiTools.codex}}- OpenAI Codex
{{/if}}{{#if aiTools.cursor}}- Cursor
{{/if}}{{#if aiTools.geminiCli}}- Gemini CLI
{{/if}}

## License

TBD
```

- [ ] **Step 11.3: .gitignore.hbs**

Create:
```handlebars
# Dependencies
node_modules/

# Build
dist/
build/
*.tsbuildinfo

# Logs
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
*.swp

# Env
.env
.env.local

# >>> graphify (managed by graphify-gitignore skill)
graphify-out/
.graphify_*
.obj/
# <<< graphify
```

- [ ] **Step 11.4: nonoise.config.json.hbs**

Create:
```handlebars
{
  "$schema": "https://nonoise.dev/schemas/project-config.v1.json",
  "frameworkVersion": "{{frameworkVersion}}",
  "template": "{{template}}",
  "createdAt": "{{year}}-01-01T00:00:00.000Z",
  "aiTools": {
    "claudeCode": {{aiTools.claudeCode}},
    "copilot": {{aiTools.copilot}},
    "codex": {{aiTools.codex}},
    "cursor": {{aiTools.cursor}},
    "geminiCli": {{aiTools.geminiCli}}
  },
  "skills": [
    "graphify-gitignore",
    "vscode-config-generator",
    "docs-md-generator"
  ]
}
```

Note: the exact `createdAt` is set at runtime. In Task 12 we'll refactor to let `scaffold.ts` inject the current ISO timestamp via a handlebars helper. For now this placeholder compiles.

- [ ] **Step 11.5: Create .gitkeep files**

Create empty files:
- `packages/templates/single-project/_always/docs/adr/.gitkeep`
- `packages/templates/single-project/_always/docs/specs/.gitkeep`
- `packages/templates/single-project/_always/docs/guides/.gitkeep`
- `packages/templates/single-project/_always/tools/.gitkeep`
- `packages/templates/single-project/_always/src/.gitkeep`

- [ ] **Step 11.6: .vscode/settings.json.hbs**

Create:
```handlebars
{
  "editor.formatOnSave": true,
  "editor.rulers": [100],
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

- [ ] **Step 11.7: .vscode/extensions.json.hbs**

Create:
```handlebars
{
  "recommendations": [
    "editorconfig.editorconfig"{{#if aiTools.claudeCode}},
    "anthropic.claude-code"{{/if}}{{#if aiTools.copilot}},
    "github.copilot",
    "github.copilot-chat"{{/if}}
  ]
}
```

- [ ] **Step 11.8: Commit**

Run:
```bash
git add packages/templates/single-project/_always/
git commit -m "feat(templates): _always base files for single-project"
```

---

## Task 12: Refactor scaffold to inject ISO timestamp

**Files:**
- Modify: `packages/create-nonoise/src/types.ts`
- Modify: `packages/create-nonoise/src/scaffold.ts`
- Modify: `packages/templates/single-project/_always/nonoise.config.json.hbs`

- [ ] **Step 12.1: Add `createdAt` to HandlebarsRenderContext**

Modify `packages/create-nonoise/src/types.ts` — replace the `HandlebarsRenderContext` type with:
```ts
export type HandlebarsRenderContext = ProjectContext & {
  projectNamePascal: string;
  projectNameSnake: string;
  year: string;
  createdAt: string;
};
```

- [ ] **Step 12.2: Populate `createdAt` in scaffold.ts**

Modify `packages/create-nonoise/src/scaffold.ts` — replace the `renderCtx` construction block with:
```ts
const now = new Date();
const renderCtx: HandlebarsRenderContext = {
  ...ctx,
  projectNamePascal: toPascalCase(ctx.projectName),
  projectNameSnake: toSnakeCase(ctx.projectName),
  year: now.getFullYear().toString(),
  createdAt: now.toISOString(),
};
```

- [ ] **Step 12.3: Update nonoise.config.json.hbs**

Modify `packages/templates/single-project/_always/nonoise.config.json.hbs` — replace `"createdAt": "{{year}}-01-01T00:00:00.000Z"` with `"createdAt": "{{createdAt}}"`.

- [ ] **Step 12.4: Typecheck**

Run:
```bash
pnpm --filter create-nonoise run typecheck
```

Expected: no errors.

- [ ] **Step 12.5: Commit**

Run:
```bash
git add packages/create-nonoise/src/types.ts packages/create-nonoise/src/scaffold.ts packages/templates/single-project/_always/nonoise.config.json.hbs
git commit -m "feat(create-nonoise): inject ISO createdAt into render context"
```

---

## Task 13: Template — `_if-claude-code/`

**Files:**
- Create: `packages/templates/single-project/_if-claude-code/CLAUDE.md.hbs`
- Create: `packages/templates/single-project/_if-claude-code/.claude/skills/.gitkeep`
- Create: `packages/templates/single-project/_if-claude-code/.claude/agents/.gitkeep`
- Create: `packages/templates/single-project/_if-claude-code/.claude/commands/.gitkeep`
- Create: `packages/templates/single-project/_if-claude-code/.claude/settings.json.hbs`

- [ ] **Step 13.1: CLAUDE.md.hbs**

Create:
```handlebars
# {{projectName}} — Claude Code context

Claude Code-specific conventions for this project. For cross-tool context see `AGENTS.md`.

## Installed skills

- `graphify-gitignore` — keeps `.gitignore` aligned with graphify outputs.
- `vscode-config-generator` — generates `.vscode/tasks.json` and `launch.json` for the detected stack.
- `docs-md-generator` — (stub) will generate coherent `CLAUDE.md`/`AGENTS.md`/`copilot-instructions.md`.

## Working in this project

- Prefer editing existing files over creating new ones.
- Run tests before committing.
- Follow the project's code style.

---

Generated by create-nonoise v{{frameworkVersion}}.
```

- [ ] **Step 13.2: .claude/settings.json.hbs**

Create:
```handlebars
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json"
}
```

- [ ] **Step 13.3: Create .gitkeep placeholders**

Create empty files:
- `packages/templates/single-project/_if-claude-code/.claude/skills/.gitkeep`
- `packages/templates/single-project/_if-claude-code/.claude/agents/.gitkeep`
- `packages/templates/single-project/_if-claude-code/.claude/commands/.gitkeep`

- [ ] **Step 13.4: Commit**

Run:
```bash
git add packages/templates/single-project/_if-claude-code/
git commit -m "feat(templates): _if-claude-code files"
```

---

## Task 14: Template — `_if-copilot/`, `_if-codex/`, `_if-cursor/`, `_if-gemini-cli/`

**Files:**
- Create: `packages/templates/single-project/_if-copilot/.github/copilot-instructions.md.hbs`
- Create: `packages/templates/single-project/_if-copilot/.github/instructions/.gitkeep`
- Create: `packages/templates/single-project/_if-codex/.codex/.gitkeep`
- Create: `packages/templates/single-project/_if-cursor/.cursor/rules.md.hbs`
- Create: `packages/templates/single-project/_if-gemini-cli/GEMINI.md.hbs`

- [ ] **Step 14.1: copilot-instructions.md.hbs**

Create:
```handlebars
# {{projectName}} — GitHub Copilot instructions

Project-scoped rules for Copilot. For cross-tool context see `AGENTS.md`.

## Conventions

- Follow the existing code style in the file you're editing.
- Write tests alongside implementations.
- Use clear, descriptive names.

---

Generated by create-nonoise v{{frameworkVersion}}.
```

- [ ] **Step 14.2: .codex/.gitkeep**

Create empty file `packages/templates/single-project/_if-codex/.codex/.gitkeep`.

(Codex config format not yet stabilized; placeholder folder preserved in git.)

- [ ] **Step 14.3: .cursor/rules.md.hbs**

Create:
```handlebars
# {{projectName}} — Cursor rules

Project rules for Cursor. For cross-tool context see `AGENTS.md`.

- Follow existing code style.
- Run tests before committing.

---

Generated by create-nonoise v{{frameworkVersion}}.
```

- [ ] **Step 14.4: GEMINI.md.hbs**

Create:
```handlebars
# {{projectName}} — Gemini CLI context

Project context for Gemini CLI. For cross-tool context see `AGENTS.md`.

---

Generated by create-nonoise v{{frameworkVersion}}.
```

- [ ] **Step 14.5: .github/instructions/.gitkeep**

Create empty file `packages/templates/single-project/_if-copilot/.github/instructions/.gitkeep`.

- [ ] **Step 14.6: Commit**

Run:
```bash
git add packages/templates/single-project/_if-copilot/ packages/templates/single-project/_if-codex/ packages/templates/single-project/_if-cursor/ packages/templates/single-project/_if-gemini-cli/
git commit -m "feat(templates): _if-copilot/_if-codex/_if-cursor/_if-gemini-cli files"
```

---

## Task 15: Skills package shell + MVP skills

**Files:**
- Create: `packages/skills/package.json`
- Create: `packages/skills/graphify-gitignore/SKILL.md`
- Create: `packages/skills/vscode-config-generator/SKILL.md`
- Create: `packages/skills/vscode-config-generator/assets/tasks.node.json.hbs`
- Create: `packages/skills/vscode-config-generator/assets/tasks.dotnet.json.hbs`
- Create: `packages/skills/vscode-config-generator/assets/tasks.python.json.hbs`
- Create: `packages/skills/vscode-config-generator/assets/launch.node.json.hbs`
- Create: `packages/skills/vscode-config-generator/assets/launch.dotnet.json.hbs`
- Create: `packages/skills/vscode-config-generator/assets/launch.python.json.hbs`
- Create: `packages/skills/docs-md-generator/SKILL.md`

- [ ] **Step 15.1: packages/skills/package.json**

Create:
```json
{
  "name": "@nonoise/skills-internal",
  "version": "0.1.0",
  "private": true,
  "description": "Skill assets consumed by create-nonoise (internal, not published separately in SP-1).",
  "files": ["graphify-gitignore", "vscode-config-generator", "docs-md-generator"]
}
```

- [ ] **Step 15.2: graphify-gitignore/SKILL.md**

Create:
```markdown
---
name: graphify-gitignore
description: Ensures .gitignore contains the correct entries for graphify output/cache. Use when the user asks to "add graphify to gitignore", "check if gitignore has graphify", or when you notice graphify-out/ is not ignored.
---

# graphify-gitignore

Keeps the project's `.gitignore` aligned with graphify's expected ignore entries.

## Managed section

This skill writes (or confirms) the following block, delimited by markers for idempotent re-runs:

```gitignore
# >>> graphify (managed by graphify-gitignore skill)
graphify-out/
.graphify_*
.obj/
# <<< graphify
```

## Workflow

1. Read the current `.gitignore`.
2. If a block bounded by `# >>> graphify` and `# <<< graphify` already exists, leave it untouched and confirm to the user.
3. If no such block exists, append the block at the end of the file (preserving any trailing newline policy).
4. If `.gitignore` does not exist at all, create it containing only the managed block.
5. Report the diff to the user (`+` lines for added entries, `=` for confirmed).

## Non-goals

- Do not reorder or deduplicate entries outside the managed block.
- Do not modify per-directory `.gitignore` files (only the root one).
- Do not remove the managed block even if the user asks — tell them to remove the block manually and explain why (preserves an audit-friendly idempotent contract).
```

- [ ] **Step 15.3: vscode-config-generator/SKILL.md**

Create:
```markdown
---
name: vscode-config-generator
description: Creates or updates .vscode/tasks.json and .vscode/launch.json based on the stack detected in the project (Node, .NET, Python). Use when the user asks to "create vscode tasks", "generate launch.json", "configure vscode for debug", or similar.
---

# vscode-config-generator

Generates VS Code `tasks.json` and `launch.json` tailored to the detected stack.

## Supported stacks

- **Node / TypeScript** — detected by `package.json` with `scripts`.
- **.NET** — detected by `*.csproj` or `*.sln`.
- **Python** — detected by `pyproject.toml` or `requirements.txt`.

Multiple stacks can coexist (monorepo Node + .NET, etc.).

## Workflow

1. Scan the project root for stack markers.
2. For each detected stack, build the tasks/launch entries from the matching template in `assets/`:
   - `tasks.node.json.hbs`, `launch.node.json.hbs`
   - `tasks.dotnet.json.hbs`, `launch.dotnet.json.hbs`
   - `tasks.python.json.hbs`, `launch.python.json.hbs`
3. If `.vscode/tasks.json` already exists, read it and merge:
   - Preserve hand-written entries.
   - Update or add entries with `"detail": "generated by vscode-config-generator"`.
4. Same merge logic for `launch.json`.
5. Show a diff to the user and ask confirmation before writing.

## Output format

- 2-space indent.
- Arrays ordered stably (tasks by `label`, launches by `name`).
- Newline at end of file.

## Assets

See the `assets/` directory for the handlebars source templates.
```

- [ ] **Step 15.4: vscode asset templates — node tasks/launch**

Create `packages/skills/vscode-config-generator/assets/tasks.node.json.hbs`:
```handlebars
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "npm: install",
      "type": "shell",
      "command": "npm install",
      "detail": "generated by vscode-config-generator",
      "group": "build"
    },
    {
      "label": "npm: build",
      "type": "shell",
      "command": "npm run build",
      "detail": "generated by vscode-config-generator",
      "group": "build"
    },
    {
      "label": "npm: test",
      "type": "shell",
      "command": "npm test",
      "detail": "generated by vscode-config-generator",
      "group": { "kind": "test", "isDefault": true }
    }
  ]
}
```

Create `packages/skills/vscode-config-generator/assets/launch.node.json.hbs`:
```handlebars
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Node",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "preLaunchTask": "npm: build",
      "detail": "generated by vscode-config-generator"
    }
  ]
}
```

- [ ] **Step 15.5: vscode asset templates — dotnet tasks/launch**

Create `packages/skills/vscode-config-generator/assets/tasks.dotnet.json.hbs`:
```handlebars
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dotnet: build",
      "type": "shell",
      "command": "dotnet build",
      "detail": "generated by vscode-config-generator",
      "group": "build"
    },
    {
      "label": "dotnet: test",
      "type": "shell",
      "command": "dotnet test",
      "detail": "generated by vscode-config-generator",
      "group": { "kind": "test", "isDefault": true }
    }
  ]
}
```

Create `packages/skills/vscode-config-generator/assets/launch.dotnet.json.hbs`:
```handlebars
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch .NET",
      "type": "coreclr",
      "request": "launch",
      "program": "${workspaceFolder}/bin/Debug/net8.0/{{projectName}}.dll",
      "cwd": "${workspaceFolder}",
      "preLaunchTask": "dotnet: build",
      "detail": "generated by vscode-config-generator"
    }
  ]
}
```

- [ ] **Step 15.6: vscode asset templates — python tasks/launch**

Create `packages/skills/vscode-config-generator/assets/tasks.python.json.hbs`:
```handlebars
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "python: install deps",
      "type": "shell",
      "command": "pip install -r requirements.txt",
      "detail": "generated by vscode-config-generator",
      "group": "build"
    },
    {
      "label": "python: test",
      "type": "shell",
      "command": "pytest",
      "detail": "generated by vscode-config-generator",
      "group": { "kind": "test", "isDefault": true }
    }
  ]
}
```

Create `packages/skills/vscode-config-generator/assets/launch.python.json.hbs`:
```handlebars
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Python",
      "type": "debugpy",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal",
      "detail": "generated by vscode-config-generator"
    }
  ]
}
```

- [ ] **Step 15.7: docs-md-generator/SKILL.md (stub)**

Create:
```markdown
---
name: docs-md-generator
description: (Stub — implementation lands in SP-7.b.) Generates and keeps coherent CLAUDE.md, AGENTS.md, and .github/copilot-instructions.md from a single AGENTS.md source-of-truth. When invoked today, this skill tells the user the skill is not yet operational and asks them to edit those files manually.
---

# docs-md-generator (STUB — SP-1)

> **Status**: stub. Real implementation will ship in SP-7.b.

## Intended behavior (SP-7.b)

Maintain three AI-context files in sync by treating `AGENTS.md` as source-of-truth and rendering per-tool adapters:

```
      AGENTS.md  (source of truth)
      ├──► CLAUDE.md                     (Claude Code adapter)
      ├──► .github/copilot-instructions.md (Copilot adapter)
      └──► GEMINI.md                     (Gemini CLI adapter)
```

## Today (SP-1)

When invoked today, respond to the user exactly:

> `docs-md-generator` is a stub in this version of the NONoise Framework. The real implementation lands in SP-7.b.
>
> For now, please edit `CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md` manually.

Then stop. Do not attempt any file write.
```

- [ ] **Step 15.8: Install**

Run:
```bash
pnpm install
```

- [ ] **Step 15.9: Commit**

Run:
```bash
git add packages/skills/
git commit -m "feat(skills): MVP bundle — graphify-gitignore, vscode-config-generator, docs-md-generator(stub)"
```

---

## Task 16: Integration test — CLI end-to-end via scaffold()

**Files:**
- Create: `packages/create-nonoise/test/integration/scaffold.test.ts`

We test the `scaffold()` function directly, passing a context and pointing to the repo's actual `packages/templates/` and `packages/skills/`. This avoids needing a built bin, and still covers the full pipeline.

- [ ] **Step 16.1: Write integration test**

Create `packages/create-nonoise/test/integration/scaffold.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { scaffold } from '../../src/scaffold.js';
import type { ProjectContext } from '../../src/types.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const TEMPLATES_ROOT = join(REPO_ROOT, 'packages', 'templates');
const SKILLS_ROOT = join(REPO_ROOT, 'packages', 'skills');

describe('scaffold() integration', () => {
  let parent: string;
  let projectPath: string;

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-int-'));
    projectPath = join(parent, 'my-app');
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  function buildCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
    return {
      projectName: 'my-app',
      projectPath,
      template: 'single-project',
      aiTools: {
        claudeCode: true,
        copilot: true,
        codex: false,
        cursor: false,
        geminiCli: false,
      },
      gitInit: false,
      frameworkVersion: '0.1.0',
      ...overrides,
    };
  }

  it('generates AGENTS.md for any combination of AI tools', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const agents = await readFile(join(projectPath, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('my-app');
  });

  it('generates CLAUDE.md when claudeCode is true', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const claude = await readFile(join(projectPath, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('Claude Code context');
  });

  it('does NOT generate CLAUDE.md when claudeCode is false', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(stat(join(projectPath, 'CLAUDE.md'))).rejects.toThrow();
  });

  it('installs the 3 MVP skills when claudeCode is true', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const g = await readFile(join(projectPath, '.claude', 'skills', 'graphify-gitignore', 'SKILL.md'), 'utf8');
    const v = await readFile(join(projectPath, '.claude', 'skills', 'vscode-config-generator', 'SKILL.md'), 'utf8');
    const d = await readFile(join(projectPath, '.claude', 'skills', 'docs-md-generator', 'SKILL.md'), 'utf8');
    expect(g).toContain('graphify-gitignore');
    expect(v).toContain('vscode-config-generator');
    expect(d).toContain('docs-md-generator');
  });

  it('does NOT install skills when claudeCode is false', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ copilot: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    await expect(stat(join(projectPath, '.claude', 'skills', 'graphify-gitignore'))).rejects.toThrow();
  });

  it('produces valid nonoise.config.json with accurate aiTools booleans', async () => {
    await scaffold(buildCtx({ aiTools: buildAi({ claudeCode: true, cursor: true }) }), {
      templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT,
    });
    const raw = await readFile(join(projectPath, 'nonoise.config.json'), 'utf8');
    const cfg = JSON.parse(raw) as { aiTools: Record<string, boolean> };
    expect(cfg.aiTools.claudeCode).toBe(true);
    expect(cfg.aiTools.cursor).toBe(true);
    expect(cfg.aiTools.copilot).toBe(false);
  });

  it('renders no leftover handlebars placeholders', async () => {
    await scaffold(buildCtx(), { templatesRoot: TEMPLATES_ROOT, skillsRoot: SKILLS_ROOT });
    const files = ['AGENTS.md', 'README.md', 'CLAUDE.md', 'nonoise.config.json'];
    for (const f of files) {
      const content = await readFile(join(projectPath, f), 'utf8');
      expect(content, `${f} contains unrendered {{...}}`).not.toMatch(/\{\{[^}]+\}\}/);
    }
  });
});

function buildAi(overrides: Partial<ProjectContext['aiTools']> = {}): ProjectContext['aiTools'] {
  return {
    claudeCode: false,
    copilot: false,
    codex: false,
    cursor: false,
    geminiCli: false,
    ...overrides,
  };
}
```

- [ ] **Step 16.2: Run tests — verify they pass**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/integration/scaffold.test.ts
```

Expected: PASS — all 7 tests pass.

If any fail: inspect the templates/ to find the template bug; the test framework will print diffs.

- [ ] **Step 16.3: Commit**

Run:
```bash
git add packages/create-nonoise/test/integration/scaffold.test.ts
git commit -m "test(create-nonoise): integration test covering scaffold pipeline"
```

---

## Task 17: L4 skill manifest validation test

**Files:**
- Create: `packages/create-nonoise/test/validation/skill-manifest.test.ts`

- [ ] **Step 17.1: Write validation test**

Create `packages/create-nonoise/test/validation/skill-manifest.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const SKILLS_ROOT = resolve(__dirname, '..', '..', '..', '..', 'packages', 'skills');

describe('skill manifest validation', () => {
  it('every skill has a SKILL.md with valid frontmatter', async () => {
    const entries = await readdir(SKILLS_ROOT, { withFileTypes: true });
    const skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    expect(skillDirs.length).toBeGreaterThan(0);

    for (const name of skillDirs) {
      const skillPath = join(SKILLS_ROOT, name, 'SKILL.md');
      const s = await stat(skillPath).catch(() => null);
      expect(s, `${name}: SKILL.md must exist`).not.toBeNull();

      const content = await readFile(skillPath, 'utf8');
      const m = content.match(/^---\n([\s\S]*?)\n---/);
      expect(m, `${name}: missing frontmatter`).not.toBeNull();
      const fm = m![1];
      expect(fm, `${name}: missing "name:"`).toMatch(/^name:\s*\S/m);
      expect(fm, `${name}: missing "description:"`).toMatch(/^description:\s*\S/m);

      const nameMatch = fm.match(/^name:\s*(\S+)/m);
      expect(nameMatch![1], `${name}: frontmatter name must equal folder name`).toBe(name);
    }
  });
});
```

- [ ] **Step 17.2: Run**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/validation/skill-manifest.test.ts
```

Expected: PASS — all 3 skills validate.

- [ ] **Step 17.3: Commit**

Run:
```bash
git add packages/create-nonoise/test/validation/skill-manifest.test.ts
git commit -m "test(create-nonoise): L4 skill manifest validation"
```

---

## Task 18: Asset bundling script + prepack hook

**Files:**
- Create: `packages/create-nonoise/scripts/bundle-assets.mjs`

The CLI ships `templates/` and `skills/` folders at the root of its package tarball. Workspace symlinks at dev time → real copies at pack time.

- [ ] **Step 18.1: Write bundle script**

Create `packages/create-nonoise/scripts/bundle-assets.mjs`:
```js
import { cp, rm, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const monoRoot = resolve(pkgRoot, '..', '..');

const targets = [
  { from: resolve(monoRoot, 'packages/templates'), to: resolve(pkgRoot, 'templates'), filterDirs: ['single-project'] },
  { from: resolve(monoRoot, 'packages/skills'), to: resolve(pkgRoot, 'skills'), filterDirs: ['graphify-gitignore', 'vscode-config-generator', 'docs-md-generator'] },
];

for (const t of targets) {
  await rm(t.to, { recursive: true, force: true });
  await mkdir(t.to, { recursive: true });
  for (const sub of t.filterDirs) {
    await cp(resolve(t.from, sub), resolve(t.to, sub), { recursive: true });
  }
}

console.log('Assets bundled.');
```

- [ ] **Step 18.2: Add prepack script**

Modify `packages/create-nonoise/package.json` scripts block — replace `"build"` value with:
```
"build": "tsc --project tsconfig.json && node scripts/bundle-assets.mjs",
```
(already correct from Task 2) — and add a new script below it:
```
"prepack": "pnpm run build"
```

Resulting scripts object:
```json
"scripts": {
  "build": "tsc --project tsconfig.json && node scripts/bundle-assets.mjs",
  "prepack": "pnpm run build",
  "typecheck": "tsc --noEmit --project tsconfig.json",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 18.3: Run build and verify bundled assets**

Run:
```bash
pnpm --filter create-nonoise run build
ls -la packages/create-nonoise/templates/single-project/_always | head
ls -la packages/create-nonoise/skills/graphify-gitignore
ls -la packages/create-nonoise/dist
```

Expected:
- `packages/create-nonoise/dist/index.js` exists
- `packages/create-nonoise/templates/single-project/_always/` contains `AGENTS.md.hbs`
- `packages/create-nonoise/skills/graphify-gitignore/SKILL.md` exists

- [ ] **Step 18.4: Add bundled assets to .gitignore**

Modify the repo root `.gitignore` — append:
```
# Bundled assets (produced by prepack)
packages/create-nonoise/templates/
packages/create-nonoise/skills/
packages/create-nonoise/dist/
```

- [ ] **Step 18.5: Commit**

Run:
```bash
git add packages/create-nonoise/scripts/bundle-assets.mjs packages/create-nonoise/package.json .gitignore
git commit -m "build(create-nonoise): asset bundling + prepack hook"
```

---

## Task 19: End-to-end CLI test through the bin shim

**Files:**
- Create: `packages/create-nonoise/test/integration/cli.test.ts`

Runs the built CLI in a subprocess with `--yes` + flags, asserts the filesystem output.

- [ ] **Step 19.1: Write CLI test**

Create `packages/create-nonoise/test/integration/cli.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const exec = promisify(execFile);
const BIN = resolve(__dirname, '..', '..', 'bin', 'create-nonoise.mjs');

describe('CLI via bin shim', () => {
  let parent: string;

  beforeAll(async () => {
    // Ensure build has run
    await exec('pnpm', ['--filter', 'create-nonoise', 'run', 'build'], {
      cwd: resolve(__dirname, '..', '..', '..', '..'),
    });
  }, 120_000);

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), 'nonoise-cli-'));
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  it('--yes --ai claude-code produces a project with CLAUDE.md', async () => {
    await exec('node', [BIN, 'demo', '--yes', '--ai', 'claude-code', '--no-git'], { cwd: parent });
    const claude = await readFile(join(parent, 'demo', 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('demo');
  }, 60_000);

  it('--ai copilot skips CLAUDE.md and produces copilot-instructions.md', async () => {
    await exec('node', [BIN, 'demo', '--yes', '--ai', 'copilot', '--no-git'], { cwd: parent });
    await expect(stat(join(parent, 'demo', 'CLAUDE.md'))).rejects.toThrow();
    const cop = await readFile(join(parent, 'demo', '.github', 'copilot-instructions.md'), 'utf8');
    expect(cop).toContain('demo');
  }, 60_000);

  it('--version prints a semver', async () => {
    const { stdout } = await exec('node', [BIN, '--version'], { cwd: parent });
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--help prints usage', async () => {
    const { stdout } = await exec('node', [BIN, '--help'], { cwd: parent });
    expect(stdout).toContain('Usage:');
    expect(stdout).toContain('--ai');
  });
});
```

- [ ] **Step 19.2: Run**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/integration/cli.test.ts
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 19.3: Commit**

Run:
```bash
git add packages/create-nonoise/test/integration/cli.test.ts
git commit -m "test(create-nonoise): E2E CLI tests through bin shim"
```

---

## Task 20: Snapshot test (L3)

**Files:**
- Create: `packages/create-nonoise/test/snapshot/canonical.test.ts`

- [ ] **Step 20.1: Write snapshot test**

Create `packages/create-nonoise/test/snapshot/canonical.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { scaffold } from '../../src/scaffold.js';

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
          textContent[childRel] = normalizeTimestamps(await readFile(childAbs, 'utf8'));
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

function normalizeTimestamps(s: string): string {
  return s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '<ISO_TIMESTAMP>');
}
```

- [ ] **Step 20.2: Run — this creates initial snapshots**

Run:
```bash
pnpm --filter create-nonoise exec vitest run test/snapshot/canonical.test.ts
```

Expected: PASS, and snapshots written to `packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap`.

- [ ] **Step 20.3: Inspect snapshot**

Read `packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap`. Verify:
- File tree lists `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules.md`, `GEMINI.md`, `.codex/.gitkeep`, and skill files.
- No `.hbs` extensions in file paths.
- Content contains expected strings (`snap-proj`, `0.0.0-snapshot`).

If wrong, fix templates and re-run with `-u` to update.

- [ ] **Step 20.4: Commit**

Run:
```bash
git add packages/create-nonoise/test/snapshot/
git commit -m "test(create-nonoise): L3 canonical snapshot"
```

---

## Task 21: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 21.1: Create ci.yml**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [20, 22]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm -r run typecheck
      - run: pnpm -r run build
      - run: pnpm -r run test
```

- [ ] **Step 21.2: Commit**

Run:
```bash
git add .github/workflows/ci.yml
git commit -m "ci: GitHub Actions matrix test (win/mac/linux × node 20/22)"
```

---

## Task 22: Changesets setup

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`
- Create: `.github/workflows/release.yml`

- [ ] **Step 22.1: Initialize changesets**

Run:
```bash
pnpm exec changeset init
```

Expected: creates `.changeset/config.json` and `.changeset/README.md`.

- [ ] **Step 22.2: Configure changeset config**

Modify `.changeset/config.json`:
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@nonoise/templates-internal", "@nonoise/skills-internal"]
}
```

- [ ] **Step 22.3: Create release workflow**

Create `.github/workflows/release.yml`:
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile
      - run: pnpm -r run typecheck
      - run: pnpm -r run build
      - run: pnpm -r run test

      - name: Publish to npm with provenance
        run: pnpm --filter create-nonoise publish --access public --provenance --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 22.4: Commit**

Run:
```bash
git add .changeset/ .github/workflows/release.yml
git commit -m "chore: changesets + release workflow"
```

---

## Task 23: README for the repo

**Files:**
- Create: `README.md`

- [ ] **Step 23.1: Write README**

Create `README.md`:
```markdown
# NONoise Framework

SDLC bootstrapper that scaffolds projects with skills, agents, and tools for Claude Code, GitHub Copilot, Codex, Cursor, and Gemini CLI.

## Quick start

```bash
npx create-nonoise my-app
```

The CLI asks which AI tools you use, then generates a ready-to-code project with:

- `src/` for your code (stack-agnostic)
- `AGENTS.md` cross-tool context
- `CLAUDE.md` + `.claude/skills/` (if Claude Code selected)
- `.github/copilot-instructions.md` (if Copilot selected)
- `.cursor/rules.md`, `GEMINI.md`, etc. per your selection
- 3 bundled skills: `graphify-gitignore`, `vscode-config-generator`, `docs-md-generator` (stub)

## Repo structure

- `packages/create-nonoise/` — the CLI
- `packages/templates/` — template assets (single-project)
- `packages/skills/` — bundled skill assets

See `docs/superpowers/specs/2026-04-18-sp1-cli-installer-single-project-design.md` for the design and `docs/superpowers/plans/2026-04-18-sp1-cli-installer-single-project.md` for the implementation plan.

## Development

```bash
pnpm install
pnpm -r run typecheck
pnpm -r run build
pnpm -r run test
```

## License

MIT
```

- [ ] **Step 23.2: Commit**

Run:
```bash
git add README.md
git commit -m "docs: repo README"
```

---

## Task 24: Final full-suite verification

- [ ] **Step 24.1: Clean install + test**

Run from repo root:
```bash
rm -rf node_modules packages/*/node_modules
pnpm install --frozen-lockfile
pnpm -r run typecheck
pnpm -r run build
pnpm -r run test
```

Expected: all typechecks pass, build succeeds, all tests pass (unit + integration + snapshot + validation + CLI E2E).

- [ ] **Step 24.2: Manual interactive smoke test**

Run:
```bash
cd /tmp/
node /d/DEV/NONoise-frmw/NONoise-frmw/packages/create-nonoise/bin/create-nonoise.mjs
```

Go through the full interactive flow (name, multiselect AI tools, confirm git init). Verify the scaffold is created under `/tmp/<name>/`.

Expected: clack prompts render correctly, no crashes, project created.

Delete `/tmp/<name>/` after verification.

- [ ] **Step 24.3: Update ROADMAP**

Update `D:\DEV\NONoise-frmw\ROADMAP.md` — change SP-1 status from `🟡 in-progress` to `✅ done`.

- [ ] **Step 24.4: Final commit**

Run:
```bash
cd /d/DEV/NONoise-frmw
git -C /d/DEV/NONoise-frmw/NONoise-frmw log --oneline | head -30
```

(No commit of ROADMAP — it lives in the outer workspace, not in the framework repo.)

---

## Self-review checklist

Before considering SP-1 done:

- [ ] `npx create-nonoise demo --yes --ai claude-code` creates a valid scaffold with the 3 skills.
- [ ] `npx create-nonoise demo --yes --ai copilot` creates a scaffold WITHOUT `.claude/` and WITHOUT skills.
- [ ] `npx create-nonoise --help` and `--version` work.
- [ ] CI green on ubuntu + windows + macos × node 20 + 22.
- [ ] No `{{placeholder}}` leaks into generated files.
- [ ] `nonoise.config.json` is valid JSON (parses) with accurate `aiTools`.

---

## Deferred from SP-1 (explicit non-goals)

These are **intentionally deferred** to keep SP-1 shippable. They come in an SP-1.b hardening sprint or the next sub-project:

- **ASCII banner** — prompts currently use `@clack/prompts` default `intro()` text. Banner conversion from the user's logo is blocked on the user providing the source (SVG/PNG) and on the tool choice (ASCII-art lib vs hand-drawn). Tracked in `ROADMAP.md` → "Decisioni aperte".
- **Directory-exists / non-empty check** — if the user passes a `projectName` whose target directory exists and is non-empty, `scaffold()` will currently overwrite files in place. MVP ships this way; next sprint adds a re-prompt "Cancel / Overwrite / Pick different name".
- **Rollback on partial failure** — if `scaffold()` fails mid-write, the partially-created project directory is left on disk. MVP accepts this (the error message tells the user what went wrong). Next sprint wraps `scaffold()` in a try/catch that removes the partial project.

## What's next

After SP-1 is green and ready for publish:
- First tag: `git tag v0.1.0 && git push --tags` → release workflow publishes to npm.
- Move to SP-7.b (`docs-md-generator` real implementation) or SP-2 (skill library from reference-project), per priority in `ROADMAP.md`.
