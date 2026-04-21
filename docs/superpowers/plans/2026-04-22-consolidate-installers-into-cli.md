# Consolidate Installers Into CLI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the `graphify-setup` skill, move its install logic into `create-nonoise` as a dedicated module, collapse Polly's brownfield flow into `reverse-engineering`, and update every cross-reference.

**Architecture:** Extract install logic from `scaffold.ts` into a new focused module `packages/create-nonoise/src/graphify-install.ts` with an isolated unit test. Templates already write the `## graphify` rules block — only the marker text changes and the `graphify-setup` bullets get removed. Canonical drift source moves from `graphify-setup/references/rules-block.md` to `packages/create-nonoise/src/assets/graphify-rules-block.md`.

**Tech Stack:** TypeScript, Node `>=20`, pnpm `9.12.0`, vitest, Handlebars templates.

**Reference spec:** `docs/superpowers/specs/2026-04-22-consolidate-installers-into-cli-design.md`

---

## File Structure

**Create:**
- `packages/create-nonoise/src/assets/graphify-rules-block.md` — new home for the canonical rules block that templates are checked against.
- `packages/create-nonoise/src/graphify-install.ts` — extracted install module (uv-based, preflights, upgrade path, Claude/Copilot hook wiring, structured `InstallReport`).
- `packages/create-nonoise/test/unit/graphify-install.test.ts` — unit test with `child_process` mocks.

**Modify:**
- `packages/create-nonoise/src/scaffold.ts` — delete in-file `runGraphifyInstall` + `detectPython`, call new module, remove `'graphify-setup'` from `MVP_SKILL_BUNDLE`.
- `packages/create-nonoise/test/unit/graphify-rules-block.test.ts` — point to new canonical path, drop the SKILL.md-drift assertion.
- 12 Handlebars template files under `packages/templates/{single-project,multi-repo}/`.
- `packages/skills/reverse-engineering/SKILL.md`.
- `packages/skills/polly/SKILL.md` and every file under `packages/skills/polly/references/` that mentions `graphify-setup`.
- `packages/skills/bmad-agent-analyst/SKILL.md`.
- `packages/skills/observability-debug/SKILL.md`.
- `packages/skills/atr/SKILL.md`.
- `packages/skills/ops-skill-builder/SKILL.md`.
- `packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap` — regenerated.

**Delete:**
- `packages/skills/graphify-setup/` (entire directory, after all references are removed).

---

## Task 1 — Move canonical rules-block to CLI assets

**Files:**
- Create: `packages/create-nonoise/src/assets/graphify-rules-block.md`
- Modify: `packages/create-nonoise/test/unit/graphify-rules-block.test.ts`

- [ ] **Step 1: Create the new canonical file**

Copy the current content of `packages/skills/graphify-setup/references/rules-block.md` byte-for-byte. The body is:

```markdown
## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
```

Ensure the file ends with a single trailing newline (matches the source).

- [ ] **Step 2: Rewrite the drift test**

Replace the full content of `packages/create-nonoise/test/unit/graphify-rules-block.test.ts` with:

```ts
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const monoRoot = resolve(here, '..', '..', '..', '..');
const canonicalPath = resolve(
  monoRoot,
  'packages/create-nonoise/src/assets/graphify-rules-block.md',
);

describe('graphify rules block', () => {
  it('all Handlebars templates contain the canonical rules body', async () => {
    const canonical = (await readFile(canonicalPath, 'utf8')).replace(/\r\n/g, '\n').trim();
    // Every bullet from the canonical body must appear verbatim in every
    // template that renders a `## graphify` section.
    const canonicalBullets = canonical
      .split('\n')
      .filter((l) => l.startsWith('- '));
    expect(canonicalBullets.length).toBeGreaterThan(0);

    const fg = await import('fast-glob');
    const files = await fg.default('packages/templates/**/*.hbs', {
      cwd: monoRoot,
      absolute: true,
    });

    const offenders: string[] = [];
    for (const f of files) {
      const txt = (await readFile(f, 'utf8')).replace(/\r\n/g, '\n');
      if (!txt.includes('## graphify')) continue;
      for (const bullet of canonicalBullets) {
        if (!txt.includes(bullet)) {
          offenders.push(`${f} missing: ${bullet.slice(0, 60)}…`);
        }
      }
      if (txt.includes('_rebuild_code')) {
        offenders.push(`${f} (still references deprecated _rebuild_code)`);
      }
    }
    expect(offenders, `Templates out of sync:\n${offenders.join('\n')}`).toEqual([]);
  });
});
```

This drops the SKILL.md-vs-reference assertion (no longer applicable — the skill is going away) and strengthens the template check from a single substring to every bullet.

- [ ] **Step 3: Run the drift test — expect green**

```
pnpm --filter create-nonoise exec vitest run test/unit/graphify-rules-block.test.ts
```

Expected: 1 passed. Templates and new canonical file still match (no content change yet; we only renamed the source of truth).

- [ ] **Step 4: Commit**

```
git add packages/create-nonoise/src/assets/graphify-rules-block.md packages/create-nonoise/test/unit/graphify-rules-block.test.ts
git commit -m "refactor(cli): move canonical graphify rules-block into CLI assets"
```

---

## Task 2 — Update Handlebars templates

**Files (12 total):**
- Modify: `packages/templates/single-project/_always/.gitignore.hbs`
- Modify: `packages/templates/single-project/_always/AGENTS.md.hbs`
- Modify: `packages/templates/single-project/_if-claude-code/CLAUDE.md.hbs`
- Modify: `packages/templates/single-project/_if-copilot/.github/copilot-instructions.md.hbs`
- Modify: `packages/templates/single-project/_if-cursor/.cursor/rules.md.hbs`
- Modify: `packages/templates/single-project/_if-gemini-cli/GEMINI.md.hbs`
- Modify: `packages/templates/multi-repo/_always/.gitignore.hbs`
- Modify: `packages/templates/multi-repo/_always/AGENTS.md.hbs`
- Modify: `packages/templates/multi-repo/_if-claude-code/CLAUDE.md.hbs`
- Modify: `packages/templates/multi-repo/_if-copilot/.github/copilot-instructions.md.hbs`
- Modify: `packages/templates/multi-repo/_if-cursor/.cursor/rules.md.hbs`
- Modify: `packages/templates/multi-repo/_if-gemini-cli/GEMINI.md.hbs`

- [ ] **Step 1: Rename markers across all 12 templates**

Use an exact string replace. In every file that contains it, replace:

- `<!-- >>> graphify (managed by graphify-setup skill) -->` → `<!-- >>> graphify (managed by create-nonoise) -->`
- `# >>> graphify (managed by graphify-setup skill)` → `# >>> graphify (managed by create-nonoise)`

The closing markers (`<!-- <<< graphify -->` / `# <<< graphify`) do not mention the skill — leave unchanged.

- [ ] **Step 2: Remove `graphify-setup` from Gemini + Cursor skill bullet lists**

In `packages/templates/single-project/_if-gemini-cli/GEMINI.md.hbs` and `packages/templates/multi-repo/_if-gemini-cli/GEMINI.md.hbs`, delete the entire line:

```
- `graphify-setup`
```

Do the same in `packages/templates/single-project/_if-cursor/.cursor/rules.md.hbs` and `packages/templates/multi-repo/_if-cursor/.cursor/rules.md.hbs`. If removing the bullet leaves two consecutive blank lines, collapse them to one so the Markdown stays clean.

- [ ] **Step 3: Rewrite the Brownfield row in Claude + Copilot templates**

In `packages/templates/single-project/_if-claude-code/CLAUDE.md.hbs`, `packages/templates/multi-repo/_if-claude-code/CLAUDE.md.hbs`, `packages/templates/single-project/_if-copilot/.github/copilot-instructions.md.hbs`, and `packages/templates/multi-repo/_if-copilot/.github/copilot-instructions.md.hbs`, replace:

```
**Brownfield** — `graphify-setup`, `reverse-engineering`
```

with:

```
**Brownfield** — `reverse-engineering`
```

- [ ] **Step 4: Run the drift test — expect green**

```
pnpm --filter create-nonoise exec vitest run test/unit/graphify-rules-block.test.ts
```

Expected: 1 passed. The rules body is unchanged; only markers and adjacent list items moved.

- [ ] **Step 5: Commit**

```
git add packages/templates/
git commit -m "refactor(templates): rename graphify marker to \`managed by create-nonoise\`"
```

---

## Task 3 — Extract install logic into a dedicated module (TDD)

**Files:**
- Create: `packages/create-nonoise/src/graphify-install.ts`
- Create: `packages/create-nonoise/test/unit/graphify-install.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/create-nonoise/test/unit/graphify-install.test.ts` with:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock child_process BEFORE importing the module under test.
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { installGraphify } from '../../src/graphify-install.js';

const mockedExec = vi.mocked(execSync);

// Helper — build a scripted exec mock that returns/throws based on the command substring.
function scriptedExec(script: Array<{ match: RegExp; result: string | Error }>) {
  return (cmd: string, _opts?: unknown): Buffer | string => {
    for (const entry of script) {
      if (entry.match.test(cmd)) {
        if (entry.result instanceof Error) throw entry.result;
        return entry.result;
      }
    }
    throw new Error(`Unexpected command in test: ${cmd}`);
  };
}

describe('installGraphify', () => {
  beforeEach(() => {
    mockedExec.mockReset();
  });

  it('happy path: Python + uv present, Copilot selected, runs full install + both hooks', () => {
    const calls: string[] = [];
    mockedExec.mockImplementation((cmd) => {
      calls.push(String(cmd));
      if (/python3? --version/.test(String(cmd))) return Buffer.from('Python 3.11.7');
      if (/uv --version/.test(String(cmd))) return Buffer.from('uv 0.4.20');
      if (/uv tool install/.test(String(cmd))) return Buffer.from('');
      if (/^graphify install$/.test(String(cmd))) return Buffer.from('');
      if (/^graphify copilot install$/.test(String(cmd))) return Buffer.from('');
      if (/graphify --version/.test(String(cmd))) return Buffer.from('graphify 0.4.23');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.python.found).toBe(true);
    expect(report.uv.found).toBe(true);
    expect(report.graphifyy).toMatch(/installed|already-present|upgraded/);
    expect(report.claudeHook).toBe('ok');
    expect(report.copilotHook).toBe('ok');
    expect(calls.some((c) => /uv tool install "graphifyy>=0\.4\.23"/.test(c))).toBe(true);
    expect(calls.some((c) => /^graphify install$/.test(c))).toBe(true);
    expect(calls.some((c) => /^graphify copilot install$/.test(c))).toBe(true);
  });

  it('skips Copilot hook when copilot=false', () => {
    mockedExec.mockImplementation(scriptedExec([
      { match: /python3? --version/, result: 'Python 3.12.0' },
      { match: /uv --version/, result: 'uv 0.4.20' },
      { match: /uv tool install/, result: '' },
      { match: /^graphify install$/, result: '' },
      { match: /graphify --version/, result: 'graphify 0.4.23' },
    ]));

    const report = installGraphify({ copilot: false });

    expect(report.copilotHook).toBe('skipped');
  });

  it('skips everything when Python is missing', () => {
    mockedExec.mockImplementation((cmd) => {
      if (/python3? --version/.test(String(cmd))) throw new Error('not found');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.python.found).toBe(false);
    expect(report.uv.found).toBe(false);
    expect(report.graphifyy).toBe('skipped');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
  });

  it('skips install when uv is missing but Python is present', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/uv --version/.test(s)) throw new Error('not found');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.python.found).toBe(true);
    expect(report.uv.found).toBe(false);
    expect(report.graphifyy).toBe('skipped');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
  });

  it('marks graphifyy as install-failed if uv tool install throws', () => {
    mockedExec.mockImplementation((cmd) => {
      const s = String(cmd);
      if (/python3? --version/.test(s)) return Buffer.from('Python 3.11.0');
      if (/uv --version/.test(s)) return Buffer.from('uv 0.4.20');
      if (/uv tool install/.test(s)) throw new Error('boom');
      throw new Error(`Unexpected: ${cmd}`);
    });

    const report = installGraphify({ copilot: true });

    expect(report.graphifyy).toBe('install-failed');
    expect(report.claudeHook).toBe('skipped');
    expect(report.copilotHook).toBe('skipped');
  });
});
```

- [ ] **Step 2: Run the test — expect failure (module not present)**

```
pnpm --filter create-nonoise exec vitest run test/unit/graphify-install.test.ts
```

Expected: FAIL with `Cannot find module '../../src/graphify-install.js'`.

- [ ] **Step 3: Create the install module**

Create `packages/create-nonoise/src/graphify-install.ts`:

```ts
import { execSync } from 'node:child_process';

export type GraphifyInstallContext = {
  copilot: boolean;
};

export type InstallReport = {
  python: { found: boolean; version?: string };
  uv: { found: boolean; version?: string };
  graphifyy: 'installed' | 'already-present' | 'upgraded' | 'install-failed' | 'skipped';
  claudeHook: 'ok' | 'failed' | 'skipped';
  copilotHook: 'ok' | 'failed' | 'skipped';
};

const GRAPHIFYY_PIN = 'graphifyy>=0.4.23';

function probePython(): { found: boolean; version?: string } {
  for (const cmd of ['python3', 'python']) {
    try {
      const out = execSync(`${cmd} --version`, {
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim();
      const m = out.match(/Python\s+(\d+)\.(\d+)/);
      if (m && (Number(m[1]) > 3 || (Number(m[1]) === 3 && Number(m[2]) >= 10))) {
        return { found: true, version: out.replace(/^Python\s+/, '') };
      }
    } catch {
      // try next
    }
  }
  return { found: false };
}

function probeUv(): { found: boolean; version?: string } {
  try {
    const out = execSync('uv --version', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    return { found: true, version: out.replace(/^uv\s+/, '') };
  } catch {
    return { found: false };
  }
}

function probeGraphifyBinary(): { found: boolean; version?: string } {
  try {
    const out = execSync('graphify --version', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    const m = out.match(/(\d+)\.(\d+)\.(\d+)/);
    return { found: true, version: m ? `${m[1]}.${m[2]}.${m[3]}` : out };
  } catch {
    return { found: false };
  }
}

function runQuiet(cmd: string): void {
  execSync(cmd, { stdio: 'ignore' });
}

function installOrUpgradeGraphifyy(): InstallReport['graphifyy'] {
  try {
    runQuiet(`uv tool install "${GRAPHIFYY_PIN}"`);
    // After install, check whether an older binary was shadowed.
    const after = probeGraphifyBinary();
    if (after.found && after.version && olderThan(after.version, '0.4.23')) {
      try {
        runQuiet('uv tool upgrade graphifyy');
      } catch {
        runQuiet(`uv tool install --reinstall "${GRAPHIFYY_PIN}"`);
      }
      return 'upgraded';
    }
    return after.found ? 'already-present' : 'installed';
  } catch {
    return 'install-failed';
  }
}

function olderThan(version: string, target: string): boolean {
  const [a, b, c] = version.split('.').map(Number);
  const [x, y, z] = target.split('.').map(Number);
  if (a !== x) return a < x;
  if (b !== y) return b < y;
  return c < z;
}

function wireClaudeHook(): InstallReport['claudeHook'] {
  try {
    runQuiet('graphify install');
    return 'ok';
  } catch {
    return 'failed';
  }
}

function wireCopilotHook(): InstallReport['copilotHook'] {
  try {
    runQuiet('graphify copilot install');
    return 'ok';
  } catch {
    return 'failed';
  }
}

export function installGraphify(ctx: GraphifyInstallContext): InstallReport {
  const python = probePython();
  if (!python.found) {
    console.log(
      '\n[graphify] Python >= 3.10 not found — skipping install. ' +
      'Install Python 3.10+ and re-run. See https://python.org/downloads.\n',
    );
    return {
      python,
      uv: { found: false },
      graphifyy: 'skipped',
      claudeHook: 'skipped',
      copilotHook: 'skipped',
    };
  }

  const uv = probeUv();
  if (!uv.found) {
    console.log(
      '\n[graphify] `uv` not found — skipping install. Bootstrap with:\n' +
      '  macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh\n' +
      '  Windows:     powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"\n' +
      `Then run: uv tool install "${GRAPHIFYY_PIN}" && graphify install\n`,
    );
    return {
      python,
      uv,
      graphifyy: 'skipped',
      claudeHook: 'skipped',
      copilotHook: 'skipped',
    };
  }

  const graphifyy = installOrUpgradeGraphifyy();
  if (graphifyy === 'install-failed') {
    console.log(
      `\n[graphify] "uv tool install ${GRAPHIFYY_PIN}" failed. ` +
      `Escape hatch (opt-in): pip install --user "${GRAPHIFYY_PIN}".\n`,
    );
    return {
      python,
      uv,
      graphifyy,
      claudeHook: 'skipped',
      copilotHook: 'skipped',
    };
  }

  const claudeHook = wireClaudeHook();
  const copilotHook = ctx.copilot ? wireCopilotHook() : 'skipped';

  return { python, uv, graphifyy, claudeHook, copilotHook };
}

export function formatReport(r: InstallReport): string {
  const lines = [
    `  Python:           ${r.python.found ? r.python.version ?? 'found' : 'missing'}`,
    `  uv:               ${r.uv.found ? r.uv.version ?? 'found' : 'missing'}`,
    `  graphifyy:        ${r.graphifyy}`,
    `  graphify install: ${r.claudeHook}`,
    `  graphify copilot: ${r.copilotHook}`,
  ];
  return lines.join('\n');
}
```

- [ ] **Step 4: Run the test — expect green**

```
pnpm --filter create-nonoise exec vitest run test/unit/graphify-install.test.ts
```

Expected: 5 passed. All scenarios covered (happy path, copilot-off, Python-missing, uv-missing, install-failed).

- [ ] **Step 5: Commit**

```
git add packages/create-nonoise/src/graphify-install.ts packages/create-nonoise/test/unit/graphify-install.test.ts
git commit -m "feat(cli): extract graphify install into uv-based module"
```

---

## Task 4 — Wire the new install module into scaffold.ts

**Files:**
- Modify: `packages/create-nonoise/src/scaffold.ts`

- [ ] **Step 1: Add the import**

Add to the import block at the top of `scaffold.ts` (after the existing local imports, around line 8):

```ts
import { installGraphify, formatReport } from './graphify-install.js';
```

- [ ] **Step 2: Replace the call site in `scaffold()`**

Find the block around `scaffold.ts:119–121`:

```ts
if (paths.runGraphifyInstall && hasAnyAiTool(ctx.aiTools)) {
  runGraphifyInstall();
}
```

Replace with:

```ts
if (paths.runGraphifyInstall && hasAnyAiTool(ctx.aiTools)) {
  const report = installGraphify({ copilot: ctx.aiTools.copilot });
  console.log('\n[graphify] install summary:\n' + formatReport(report) + '\n');
}
```

- [ ] **Step 3: Delete the now-unused in-file helpers**

Delete the entire `runGraphifyInstall()` function (currently `scaffold.ts:495–521`) and the entire `detectPython()` function (currently `scaffold.ts:523–538`). Watch for any accidental imports of `execSync` that are only used by these helpers — if `execSync` is no longer referenced elsewhere in the file, drop it from the `node:child_process` import too.

After the edit, confirm there are no remaining references:

```
pnpm --filter create-nonoise exec tsc --noEmit
```

Expected: clean compile.

- [ ] **Step 4: Run the full CLI test suite — expect all existing tests still green**

```
pnpm --filter create-nonoise exec vitest run --exclude 'test/snapshot/**'
```

Expected: all pass. (Snapshot tests are excluded for now — they will be regenerated in Task 9 after the `graphify-setup` files are removed from bundled output.)

- [ ] **Step 5: Commit**

```
git add packages/create-nonoise/src/scaffold.ts
git commit -m "refactor(cli): scaffold.ts delegates graphify install to new module"
```

---

## Task 5 — Update `reverse-engineering` skill

**Files:**
- Modify: `packages/skills/reverse-engineering/SKILL.md`

- [ ] **Step 1: Rewrite Step 0.1 install check**

Find the block starting around line 99 (`**0.1 — graphify installed**`) and ending before `**0.2 — Local developer config**`. Replace the whole block with:

````markdown
**0.1 — graphify installed**

```bash
python -c "import graphify" 2>&1 || graphify --help 2>&1
```

If both checks fail, tell the user:

> Graphify is not installed. It is normally installed at scaffold time by `create-nonoise`. Re-run the scaffold in this project, or install manually:
>
> ```
> uv tool install "graphifyy>=0.4.23"
> ```
>
> If `uv` is not available, bootstrap it first:
>
> - macOS / Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
> - Windows:       `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
>
> Can't proceed without graphify — re-run me once it's installed.

Then stop.
````

- [ ] **Step 2: Remove the "Graphify is context" link**

At line 38 of the same file (inside "Guiding principles"), find:

```
The knowledge graph produced by [graphify](../graphify-setup/SKILL.md) is consumed to answer questions during the loop
```

Replace with:

```
The knowledge graph produced by graphify is consumed to answer questions during the loop
```

- [ ] **Step 3: Remove the "Related skills" entry**

Find the "Related skills" section near the end of the file. Delete the line:

```
- [`graphify-setup`](../graphify-setup/SKILL.md) — installs graphify and wires its rules; run this before the first reverse session on a project
```

Leave the other two `Related skills` entries (`arch-brainstorm`, `sprint-manifest`) intact.

- [ ] **Step 4: Verify no `graphify-setup` references remain in this file**

```
grep -n "graphify-setup" packages/skills/reverse-engineering/SKILL.md
```

Expected: no output.

- [ ] **Step 5: Commit**

```
git add packages/skills/reverse-engineering/SKILL.md
git commit -m "refactor(skills): reverse-engineering drops graphify-setup references"
```

---

## Task 6 — Update peripheral skills

**Files:**
- Modify: `packages/skills/bmad-agent-analyst/SKILL.md`
- Modify: `packages/skills/observability-debug/SKILL.md`
- Modify: `packages/skills/atr/SKILL.md`
- Modify: `packages/skills/ops-skill-builder/SKILL.md`

- [ ] **Step 1: `bmad-agent-analyst/SKILL.md`**

Find line 46:

```
| DP | Analyze an existing project to produce documentation for human and LLM consumption | Handoff to `reverse-engineering` skill (graphify-based); fallback: inline with graphify-setup output |
```

Replace with:

```
| DP | Analyze an existing project to produce documentation for human and LLM consumption | Handoff to `reverse-engineering` skill (graphify-based) |
```

- [ ] **Step 2: `observability-debug/SKILL.md`**

Run:

```
grep -n "graphify-setup" packages/skills/observability-debug/SKILL.md
```

For each match, rewrite the sentence to mention `graphify` (the core skill) instead. Concrete replacement patterns:
- `via \`Grep\` / \`Read\` / (optionally) \`graphify-setup\`` → `via \`Grep\` / \`Read\` / (optionally) \`graphify\` queries`.
- If there is a "Related skills" bullet for `graphify-setup`, delete it or replace with `graphify` (the skill from the vendored pack that's already wired by create-nonoise).

- [ ] **Step 3: `atr/SKILL.md`**

Run:

```
grep -n "graphify-setup" packages/skills/atr/SKILL.md
```

Replace both occurrences:
- The "Optional — use `graphify-setup`..." sentence (around the `DP` table row / phase 4 companion note) → replace with:

  > Optional — query the existing graph via `graphify query "<question>"`, `graphify path "A" "B"`, or `graphify explain "<concept>"` if `graphify-out/` is present. A graph query can disambiguate when the stack trace is ambiguous or optimized away.

- The "Related skills" `graphify-setup` bullet → delete it (replace is not needed — atr doesn't need to link to anyone for setup; install is scaffold-time).

- [ ] **Step 4: `ops-skill-builder/SKILL.md`**

Run:

```
grep -n "graphify-setup" packages/skills/ops-skill-builder/SKILL.md
```

This file has several references (invocation, Phase 2/3 notes, ascii diagram, Related skills). Rewrite each as follows:

- Any "invokes `graphify-setup`" / "calls `graphify-setup`" → replace with "invokes `/graphify <path>`" (direct skill call, no wrapper).
- The conditional prompt "This op needs code-level context. Would you like me to invoke `graphify-setup` to index the codebase? (~1–5 min)" → "This op needs code-level context. Would you like me to invoke `/graphify .` to index the codebase? (~1–5 min)".
- The ascii box `│ (may call graphify-setup) │` → `│ (may call /graphify) │`.
- Any "Related skills" entry for `graphify-setup` → delete.

- [ ] **Step 5: Verify no `graphify-setup` references remain in these four files**

```
grep -n "graphify-setup" packages/skills/bmad-agent-analyst/SKILL.md packages/skills/observability-debug/SKILL.md packages/skills/atr/SKILL.md packages/skills/ops-skill-builder/SKILL.md
```

Expected: no output.

- [ ] **Step 6: Commit**

```
git add packages/skills/bmad-agent-analyst/ packages/skills/observability-debug/ packages/skills/atr/ packages/skills/ops-skill-builder/
git commit -m "refactor(skills): peripheral skills drop graphify-setup references"
```

---

## Task 7 — Update Polly (largest edit)

**Files:**
- Modify: `packages/skills/polly/SKILL.md`
- Modify: every file under `packages/skills/polly/references/` that mentions `graphify-setup`

- [ ] **Step 1: Enumerate every Polly file that mentions graphify-setup**

```
grep -rln "graphify-setup" packages/skills/polly/
```

Expect ~5–10 files: `SKILL.md`, `references/decision-tree.md`, `references/handoff-protocol.md`, `references/skill-inventory.md`, `references/troubleshooting.md`, potentially others. List them all — every file in that list needs edits.

- [ ] **Step 2: Decision-tree — brownfield branch hands off to reverse-engineering**

In `packages/skills/polly/references/decision-tree.md` (and anywhere in `SKILL.md` that reproduces the same tree), find the brownfield branch. Typical shape today:

```
→ engage graphify-setup with args="mode=reverse-engineering [source_path=<path>]"
```

or similar. Replace with a direct handoff to `reverse-engineering`:

```
→ engage `reverse-engineering` (its Step 0.1 verifies graphify is installed and Step 2.2 runs the full AST + semantic + clustering pipeline on <path>)
```

Any parallel "option `a) Run indexing now (engage graphify-setup again)`" prompts become "option `a) Run indexing now (engage `reverse-engineering`)`".

- [ ] **Step 3: Skill inventory — remove graphify-setup row**

In `packages/skills/polly/references/skill-inventory.md` (if present) and the corresponding section of `SKILL.md`, delete the row/entry for `graphify-setup`. Example row to delete:

```
| `graphify-setup` | Installed | `mode=reverse-engineering [source_path=<path>]` when triggered from an RE flow; empty otherwise | "I'll engage graphify-setup — it installs graphify, wires the usage rules, and (in RE flow) proposes indexing your code right away." |
```

- [ ] **Step 4: Handoff protocol — drop graphify-setup args rows**

In `packages/skills/polly/references/handoff-protocol.md` (if present), remove the args rows:

```
| `mode`        | `graphify-setup` | `reverse-engineering`, `brownfield` | Enables Step 5 indexing proposal |
| `source_path` | `graphify-setup` | any path                            | Default target for Step 5 indexing |
```

- [ ] **Step 5: Phase fingerprints — reassign `scan` owner**

Find the table that maps phases to their owning skill and fingerprint file. Replace:

```
| `scan` | `graphify-setup` | `graphify-out/GRAPH_REPORT.md` |
```

with:

```
| `scan` | `reverse-engineering` | `graphify-out/GRAPH_REPORT.md` |
```

If there is an "owner-of-artifact" reverse table (e.g. `| graphify-setup | graphify-out/GRAPH_REPORT.md | scan |`), rewrite its skill column the same way.

If there is a "prerequisite trigger" table entry of the form:

```
| `graphify_unavailable_or_no_graph_RE_intent` | ... | `decision-tree.md` § "Reverse-engineering intent gate" → invoke `graphify-setup` with `args="mode=reverse-engineering source_path=<path>"` |
```

rewrite the RHS to `→ invoke \`reverse-engineering\` (Step 2.2 builds the initial full graph)`.

- [ ] **Step 6: Troubleshooting — remove the graphify-setup section**

Delete the entire sub-section headed `### graphify-setup (if ever absent)` and its body. Graphify-setup being absent is now the expected state — scaffold-time install is the mechanism.

- [ ] **Step 7: Dialogue lines — rephrase user-facing text**

Find any Polly dialogue fragment like:

```
> I'll engage `graphify-setup` first — it verifies Python is installed, ...
```

and rewrite to the reverse-engineering-first flow, e.g.:

```
> I'll engage `reverse-engineering` — it verifies graphify is installed (scaffold-time default), indexes your subject source with the full AST + semantic + clustering pipeline, and opens an interactive analysis loop.
```

Also replace any Italian equivalents (e.g. `graphify-setup / graphify — indicizzazione del codice`) → `reverse-engineering / graphify — indicizzazione del codice`.

- [ ] **Step 8: md-extractor prerequisites row**

If the prerequisites table (often in `references/prerequisites.md` or similar) has a row like:

```
| `md-extractor` | `requirements-ingest`, `reverse-engineering`, `graphify-setup` |
```

remove `graphify-setup` from the consumers list, leaving:

```
| `md-extractor` | `requirements-ingest`, `reverse-engineering` |
```

- [ ] **Step 9: Verify no `graphify-setup` references remain under Polly**

```
grep -rln "graphify-setup" packages/skills/polly/
```

Expected: no output.

- [ ] **Step 10: Commit**

```
git add packages/skills/polly/
git commit -m "refactor(polly): brownfield hands off directly to reverse-engineering"
```

---

## Task 8 — Remove `graphify-setup` from the skill bundle and delete the directory

**Files:**
- Modify: `packages/create-nonoise/src/scaffold.ts`
- Delete: `packages/skills/graphify-setup/`

- [ ] **Step 1: Remove from MVP_SKILL_BUNDLE**

In `packages/create-nonoise/src/scaffold.ts`, find the `MVP_SKILL_BUNDLE` array (around lines 25–51) and delete the line:

```ts
'graphify-setup',
```

Verify the array remains syntactically valid (trailing comma policy unchanged).

- [ ] **Step 2: Delete the graphify-setup directory**

Use Git so the deletion is recorded cleanly:

```
git rm -r packages/skills/graphify-setup
```

- [ ] **Step 3: Verify no graphify-setup references remain anywhere in `packages/`**

```
grep -rln "graphify-setup" packages/ | grep -v CHANGELOG | grep -v __snapshots__
```

Expected: no output. (Snapshots still reference it — they will be regenerated in Task 9.)

If any non-snapshot file appears, go back to the task that owns it, edit, and re-run the grep.

- [ ] **Step 4: Type-check**

```
pnpm --filter create-nonoise exec tsc --noEmit
```

Expected: clean compile. `MVP_SKILL_BUNDLE` is still a valid `readonly string[]` literal.

- [ ] **Step 5: Commit**

```
git add packages/create-nonoise/src/scaffold.ts
git commit -m "chore(skills): delete graphify-setup — install moved to create-nonoise CLI"
```

The `git rm` already staged the directory deletion; the scaffold.ts edit is the only thing `git add` needs to pick up.

---

## Task 9 — Regenerate snapshots and run the full test suite

**Files:**
- Modify: `packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap` (regenerated)
- Possibly: sibling `.snap` files under the same directory

- [ ] **Step 1: Rebuild bundled assets**

Snapshots reflect the bundled output, which is produced by `bundle-assets.mjs` from the workspace packages into `packages/create-nonoise/{skills,templates}/`. Rebuild those first:

```
pnpm --filter create-nonoise run build
```

Expected: completes without error. The bundled `skills/` dir should no longer contain `graphify-setup/`.

- [ ] **Step 2: Regenerate snapshots**

```
pnpm --filter create-nonoise exec vitest run test/snapshot -u
```

Expected: all snapshot tests pass after regeneration. If any *non-snapshot* test fails here, stop and fix the underlying code — do not update its expectations with `-u`.

- [ ] **Step 3: Review the snapshot diff**

```
git diff -- packages/create-nonoise/test/snapshot/__snapshots__/
```

Skim for surprises. Expected deltas:
- Removal of every `.claude/skills/graphify-setup/` entry.
- Marker rename `managed by graphify-setup skill` → `managed by create-nonoise` in every generated CLAUDE.md / AGENTS.md / copilot-instructions.md / GEMINI.md / .cursor/rules.md / .gitignore.
- Removal of `graphify-setup` bullets in skill lists.
- Brownfield lines: `graphify-setup, reverse-engineering` → `reverse-engineering`.
- Polly content (inventory, decision tree, handoff, dialogues) — no more `graphify-setup`.
- Peripheral skills updates (observability-debug, atr, ops-skill-builder, bmad-agent-analyst).

Any diff NOT in that list is a red flag — investigate before proceeding.

- [ ] **Step 4: Run the whole workspace test suite**

```
pnpm -r run test
```

Expected: all packages green.

- [ ] **Step 5: Commit**

```
git add packages/create-nonoise/test/snapshot/__snapshots__/
git commit -m "test(snapshot): regenerate after graphify-setup removal"
```

---

## Task 10 — Final verification

**Files:**
- None (read-only checks).

- [ ] **Step 1: Full grep sweep**

```
grep -rln "graphify-setup" packages/ docs/ --exclude-dir=__snapshots__ --exclude-dir=node_modules
```

Expected: ONLY these matches allowed (all in CHANGELOG or historical context):
- `packages/create-nonoise/CHANGELOG.md` (historical release notes — leave alone)
- This plan file itself (`docs/superpowers/plans/2026-04-22-consolidate-installers-into-cli.md`)
- The spec file (`docs/superpowers/specs/2026-04-22-consolidate-installers-into-cli-design.md`)

Any other hit → investigate.

- [ ] **Step 2: Smoke test — scaffold into a temp dir**

From the repo root:

```
TMPDIR=$(mktemp -d)
node packages/create-nonoise/dist/index.js "$TMPDIR/smoke-proj" --template single-project --ai-tools claude-code,copilot --no-git-init --non-interactive
```

(If the CLI does not support `--non-interactive`, run interactively and pick Claude + Copilot.)

Check:

```
grep "managed by create-nonoise" "$TMPDIR/smoke-proj/CLAUDE.md" "$TMPDIR/smoke-proj/AGENTS.md" "$TMPDIR/smoke-proj/.github/copilot-instructions.md" "$TMPDIR/smoke-proj/.gitignore"
test ! -d "$TMPDIR/smoke-proj/.claude/skills/graphify-setup"
grep -c "reverse-engineering" "$TMPDIR/smoke-proj/CLAUDE.md"
```

Expected:
- All four files contain the `managed by create-nonoise` marker.
- `.claude/skills/graphify-setup/` does not exist.
- `CLAUDE.md` mentions `reverse-engineering` (in the Brownfield row).

The scaffold output should also have printed the install summary block:

```
[graphify] install summary:
  Python:           3.x.y
  uv:               0.x.y
  graphifyy:        installed | already-present | upgraded
  graphify install: ok
  graphify copilot: ok
```

- [ ] **Step 3: Clean up the smoke test**

```
rm -rf "$TMPDIR/smoke-proj"
```

- [ ] **Step 4: No commit needed**

This task is verification-only. Nothing changes on disk.

---

## Rollback

If something goes seriously wrong, the change is spread across multiple commits (one per task). `git revert <commit>` per task cleanly undoes that task's edits. The two most destructive commits are:

1. Task 8 commit — deletes `packages/skills/graphify-setup/`. Reverting re-adds the directory.
2. Task 9 commit — regenerates snapshots. Reverting restores the old snapshots.

Revert in reverse order (9 → 8 → 7 → …) if a full rollback is needed.
