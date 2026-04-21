# graphify v4 Framework Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring NONoise's graphify integration to parity with upstream `graphifyy >= 0.4.23` — switch installer from `pip` to `uv tool install`, replace the deprecated `python3 -c "_rebuild_code(...)"` hook with `graphify update .`, add the missing `query/path/explain` rule line, wire `graphify copilot install` when Copilot is selected, and vendor upstream as a reference-only pin.

**Architecture:** Mechanical refresh of asset content (skill markdown + 10 Handlebars templates + 1 self-host file + 1 sibling skill) plus three small structural additions: a single-source-of-truth `references/rules-block.md`, a `vendor/graphify` reference pin, and a `bundle-assets.mjs` exclusion + test. The CLI runtime code does not change.

**Tech Stack:** Node 20 + pnpm 9.12.0 workspace, TypeScript, Vitest, Handlebars, `scripts/sync-vendor.mjs` for vendoring, Changesets for release.

**Spec:** [`docs/superpowers/specs/2026-04-22-graphify-v4-update-design.md`](../specs/2026-04-22-graphify-v4-update-design.md)

---

## Pre-flight verification

- [ ] **Step P.1: Verify clean working tree**

```powershell
cd D:\DEV\NONoise-frmw\NONoise-frmw
git status --short
```
Expected: only the `graphify-out/` and `packages/skills/arch-sync/SKILL.md` untracked/modified entries from prior session work — no template/skill/script edits pending. If anything else is dirty, stash before continuing.

- [ ] **Step P.2: Baseline tests are green**

```powershell
pnpm install
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run
```
Expected: build succeeds, all vitest suites PASS. Save the suite count for after-comparison.

- [ ] **Step P.3: Confirm upstream clone is present at the pinned commit**

```powershell
cd D:\DEV\NONoise-frmw\graphify-upstream
git log -1 --pretty=format:"%H %s"
```
Expected: commit `215b5d40e78e498100cbf8855224331c40f757d9` (or newer on `v4`). If the directory is missing, re-clone:
```powershell
cd D:\DEV\NONoise-frmw
git clone --branch v4 https://github.com/safishamsi/graphify graphify-upstream
```

---

## Task 1: Create the canonical rules-block reference file

**Why first:** every later task quotes from this file. Lock the canonical text once, reference it everywhere.

**Files:**
- Create: `packages/skills/graphify-setup/references/rules-block.md`

- [ ] **Step 1.1: Verify upstream canonical block**

```powershell
Select-String -Path D:\DEV\NONoise-frmw\graphify-upstream\graphify\__main__.py -Pattern "_CLAUDE_MD_SECTION = " -Context 0,11
```
Expected: exact 4-bullet block, in this order: read GRAPH_REPORT, navigate wiki, prefer query/path/explain, run `graphify update .`. Note: **upstream uses plain `graphify-out/` (no backticks) but inline-codes the CLI commands.** Reproduce verbatim in step 1.2.

- [ ] **Step 1.2: Create the reference file**

Create `packages/skills/graphify-setup/references/rules-block.md` with this exact content (no surrounding markers — those are added by the consumers):

````markdown
## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
````

The file MUST end with exactly one trailing newline (no trailing whitespace, no double-blank ending).

- [ ] **Step 1.3: Commit**

```powershell
git add packages/skills/graphify-setup/references/rules-block.md
git commit -m "feat(graphify-setup): add canonical rules-block reference file`n`nSingle source of truth for the graphify rules block injected into every`nAI-tool context file. Mirrors upstream graphifyy v4 _CLAUDE_MD_SECTION verbatim.`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Vendor upstream graphify as reference-only

**Why:** future bumps need a known-good pinned copy to diff against. Reference only — must NOT ship in the published CLI tarball.

**Files:**
- Create: `packages/skills/vendor/graphify/VENDOR.json` (and synced upstream content)

- [ ] **Step 2.1: Run sync-vendor in init mode**

```powershell
cd D:\DEV\NONoise-frmw\NONoise-frmw
node scripts/sync-vendor.mjs --init graphify --source https://github.com/safishamsi/graphify --ref v4 --scope .
```
Expected stdout: `[graphify] initialized stub at .../VENDOR.json` then a sync log ending with the upstream HEAD SHA (currently `215b5d4...`).

- [ ] **Step 2.2: Verify VENDOR.json**

```powershell
Get-Content packages/skills/vendor/graphify/VENDOR.json
```
Expected: `source`, `ref: "v4"`, `subpath: null`, `scope: ["."]`, `commit: "215b5d40..."`, `fetchedAt` set to today.

- [ ] **Step 2.3: Verify bundled directory shape**

```powershell
Get-ChildItem packages/skills/vendor/graphify -Name
```
Expected: directory contains `VENDOR.json`, `graphify/` (Python sources), `README.md`, `CHANGELOG.md`, `LICENSE`, etc. Confirm no `.git` directory was copied.

- [ ] **Step 2.4: Commit**

```powershell
git add packages/skills/vendor/graphify
git commit -m "feat(vendor): pin graphify v4 (215b5d4) as reference-only`n`nReference-only vendoring: synced via sync-vendor.mjs but excluded from`nthe published create-nonoise tarball (see bundle-assets.mjs change).`nUsed for diffing during future upgrade tasks.`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Exclude `vendor/graphify` from the published bundle (TDD)

**Why:** `bundle-assets.mjs` currently copies every direct child of `packages/skills/`. Without an exclusion, the entire upstream Python package would ship in every scaffolded project AND in the npm tarball.

**Files:**
- Modify: `packages/create-nonoise/scripts/bundle-assets.mjs`
- Test: `packages/create-nonoise/test/unit/bundle-assets.test.ts` (new)

- [ ] **Step 3.1: Write the failing test**

Create `packages/create-nonoise/test/unit/bundle-assets.test.ts`:

```typescript
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..', '..');

describe('bundle-assets', () => {
  it('does NOT bundle the reference-only vendor/graphify directory', () => {
    const bundled = resolve(pkgRoot, 'skills', 'vendor', 'graphify');
    expect(existsSync(bundled)).toBe(false);
  });

  it('still bundles the other vendor packs', () => {
    for (const name of ['superpowers', 'impeccable', 'skill-creator']) {
      const bundled = resolve(pkgRoot, 'skills', 'vendor', name);
      expect(existsSync(bundled), `expected ${name} to be bundled`).toBe(true);
    }
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```powershell
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run test/unit/bundle-assets.test.ts
```
Expected: `does NOT bundle...vendor/graphify` FAILS (the post-Task-2 build will have copied it across).

- [ ] **Step 3.3: Add the exclusion to bundle-assets.mjs**

Edit `packages/create-nonoise/scripts/bundle-assets.mjs`:

Replace the entire file with:

```javascript
import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const monoRoot = resolve(pkgRoot, '..', '..');

// Reference-only vendor packs: synced by scripts/sync-vendor.mjs for diffing,
// must NOT ship in the published tarball.
const VENDOR_EXCLUDES = new Set(['graphify']);

const targets = [
  {
    from: resolve(monoRoot, 'packages/templates'),
    to: resolve(pkgRoot, 'templates'),
  },
  {
    from: resolve(monoRoot, 'packages/skills'),
    to: resolve(pkgRoot, 'skills'),
    // After copying, prune reference-only vendor packs.
    prune: async (dest) => {
      for (const name of VENDOR_EXCLUDES) {
        await rm(join(dest, 'vendor', name), { recursive: true, force: true });
      }
    },
  },
];

async function listChildDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => e.name);
}

for (const t of targets) {
  await rm(t.to, { recursive: true, force: true });
  await mkdir(t.to, { recursive: true });
  const childDirs = await listChildDirs(t.from);
  for (const sub of childDirs) {
    await cp(resolve(t.from, sub), resolve(t.to, sub), { recursive: true });
  }
  if (t.prune) await t.prune(t.to);
}

console.log('Assets bundled.');
```

- [ ] **Step 3.4: Re-build and re-run the test to verify it passes**

```powershell
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run test/unit/bundle-assets.test.ts
```
Expected: both assertions PASS.

- [ ] **Step 3.5: Commit**

```powershell
git add packages/create-nonoise/scripts/bundle-assets.mjs packages/create-nonoise/test/unit/bundle-assets.test.ts
git commit -m "feat(bundle-assets): exclude reference-only vendor/graphify`n`nVendor packs in VENDOR_EXCLUDES are pruned after the bulk copy so they`nare available for diffing in the workspace but never reach the npm tarball.`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Refresh `graphify-setup/SKILL.md` (uv installer + Copilot wiring + rules block)

**Files:**
- Modify: `packages/skills/graphify-setup/SKILL.md`

- [ ] **Step 4.1: Replace Step 1 (Package install) — switch to uv**

In `packages/skills/graphify-setup/SKILL.md`, find the block:

```markdown
1. **Package install** (idempotent)
   - Checks that Python ≥ 3.10 is available (`python --version` or `python3 --version`).
   - If missing: prints the install command and stops gracefully (does not fail the scaffold).
   - Else: runs `pip install graphifyy` (or `pipx install graphifyy` if pipx is available and preferred).
   - The PyPI package is `graphifyy` (double‑y). `graphify` tout court is a different, unaffiliated package — do not install it.
```

Replace with:

````markdown
1. **Package install** (idempotent, uv‑based)
   - **Preflight A — Python**: checks that Python ≥ 3.10 is available (`python --version` or `python3 --version`). If missing, prints the install command and stops gracefully (does not fail the scaffold).
   - **Preflight B — uv**: probes `uv --version`. If missing, prints the one‑line bootstrap and stops gracefully (non‑fatal):
     - macOS / Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
     - Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
   - **Install**: runs `uv tool install "graphifyy>=0.4.23"`. Idempotent — a no‑op if the tool is already present at the requested version.
   - **Upgrade path** (when the binary is on `PATH` but older than 0.4.23): runs `uv tool upgrade graphifyy`; if that reports nothing to do, falls back to `uv tool install --reinstall "graphifyy>=0.4.23"`.
   - **Documented escape hatch** (printed only if uv cannot be installed and the user opts out of bootstrapping it): `pip install --user "graphifyy>=0.4.23"`. The skill does NOT silently fall back to pip — uv is the new contract.
   - The PyPI package is `graphifyy` (double‑y). `graphify` tout court is a different, unaffiliated package — do not install it.
````

- [ ] **Step 4.2: Replace Step 2 (Global wiring) — add Copilot installer**

Find:

```markdown
2. **Global wiring** (idempotent)
   - Runs `graphify install`, which writes the per‑user skill in `~/.claude/skills/graphify/SKILL.md` and updates `~/.claude/CLAUDE.md`.
```

Replace with:

```markdown
2. **Global wiring** (idempotent, per AI tool selected at scaffold time)
   - Always: runs `graphify install`, which writes the per‑user skill in `~/.claude/skills/graphify/SKILL.md` and updates `~/.claude/CLAUDE.md`. (This is required even for non‑Claude scaffolds — other tools' installers below also rely on it being present.)
   - **If Copilot was selected**: runs `graphify copilot install`, which writes `~/.copilot/skills/graphify/SKILL.md` (idempotent — re‑runs are safe). Failure is non‑fatal: warn and continue.
   - The active AI‑tool set is read the same way Step 3 selects which context files to write. In Claude Code: from the skill's `args` channel (parsed per `polly/references/handoff-protocol.md`). In other hosts: from `key=value` tokens in the triggering message, falling back to inspecting which context files exist in the project.
   - Other tools (Gemini, Cursor, Codex, Kiro, VSCode) are intentionally NOT wired here — Step 3 covers their needs via the project‑level rules block.
```

- [ ] **Step 4.3: Replace the rules block in Step 3**

Find the block delimited by:
```markdown
   Block content (identical across tools, only the surrounding context changes):

   ```markdown
   ## graphify
   ...
   - After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current.
   ```
```

Replace the inner markdown code block with the canonical text from `references/rules-block.md` (Task 1.2). Keep the surrounding sentence "Block content (identical across tools, only the surrounding context changes):" and the trailing idempotence-marker explanation.

The replacement inner block:

```markdown
   ```markdown
   ## graphify

   This project has a graphify knowledge graph at graphify-out/.

   Rules:
   - Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
   - If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
   - For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
   - After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
   ```
```

Add a sentence right after this block (before the "Idempotence:" paragraph): "The canonical text lives in `references/rules-block.md` and is verified by a unit test (Task 8) — keep both in sync when upstream changes."

- [ ] **Step 4.4: Update the Reporting section to mention uv and Copilot installer**

Find the bullet list under `## Reporting`:

```markdown
After each run, report to the user:
- Whether Python was found (version).
- Whether `graphifyy` was installed (or already present).
- Whether `graphify install` succeeded.
```

Replace those three bullets with:

```markdown
After each run, report to the user:
- Whether Python was found (version).
- Whether `uv` was found (version), or skipped because it could not be installed.
- Whether `graphifyy` was installed (or already present), and via which path: `uv tool install` (default) or the printed pip escape hatch.
- Whether `graphify install` succeeded (Claude Code).
- Whether `graphify copilot install` succeeded (only when Copilot was selected).
```

- [ ] **Step 4.5: Update the Failure modes section**

Find:

```markdown
- Python missing → print `pip install graphifyy && graphify install` and continue (non‑fatal).
- `pip install graphifyy` fails → print the error and the manual command, continue.
```

Replace with:

```markdown
- Python missing → print the OS install command for Python ≥ 3.10 and continue (non‑fatal). Do NOT attempt anything else — uv would also fail.
- `uv` missing → print the one‑liner bootstrap (`astral.sh/uv/install.{sh,ps1}`) and continue (non‑fatal). Do NOT auto‑run it without user consent.
- `uv tool install "graphifyy>=0.4.23"` fails → print the error, the equivalent retry, and the documented `pip install --user "graphifyy>=0.4.23"` escape hatch. Continue.
- `graphify copilot install` fails (e.g. `graphifyy` somehow at a version older than 0.4.15 that lacks the subcommand) → warn and continue. The project‑level rules block (Step 3) already covers Copilot's needs.
```

- [ ] **Step 4.6: Refresh §5.2.1 narrative**

In `### 5.2.1 — How to invoke the pipeline (tool-dependent)`, add a sentence after the Copilot bullet ("**GitHub Copilot / Cursor / Gemini / Codex / any tool without slash commands**: ...") that reads:

> For Copilot specifically, Step 2 of this skill installs the per‑user `graphify` skill at `~/.copilot/skills/graphify/SKILL.md` via `graphify copilot install` — open that file (not the Claude one) and follow it.

- [ ] **Step 4.7: Build and run the integration test to verify nothing structural broke**

```powershell
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run test/integration/scaffold.test.ts
```
Expected: integration tests still PASS (they only assert presence of `graphify-setup` in the bundle, not its content).

- [ ] **Step 4.8: Commit**

```powershell
git add packages/skills/graphify-setup/SKILL.md
git commit -m "feat(graphify-setup): graphify v4 — uv installer, Copilot wiring, refreshed rules block`n`n- Step 1: switch from pip/pipx to uv tool install with graphifyy>=0.4.23 floor pin`n- Step 2: conditionally run graphify copilot install when Copilot is selected`n- Step 3: replace deprecated python3 -c hook with graphify update . and add the`n  cross-module query/path/explain rule line (canonical text in references/)`n- Reporting + failure modes updated to match the new flow`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Update `reverse-engineering/SKILL.md` install hint

**Files:**
- Modify: `packages/skills/reverse-engineering/SKILL.md` (line 111)

- [ ] **Step 5.1: Replace the pip install hint**

Find:

```markdown
> To install: `pip install graphifyy` (note: the package name ends in double‑y — `graphifyy`, not `graphify`).
```

Replace with:

```markdown
> To install: `uv tool install "graphifyy>=0.4.23"` (note: the package name ends in double‑y — `graphifyy`, not `graphify`). If `uv` is not available, see the `graphify-setup` skill for bootstrap instructions and the documented pip escape hatch.
```

- [ ] **Step 5.2: Commit**

```powershell
git add packages/skills/reverse-engineering/SKILL.md
git commit -m "docs(reverse-engineering): align graphify install hint with uv-based flow`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Refresh the rules block in all 10 Handlebars templates

**Why:** the rules block is duplicated in five files per scaffold variant (`single-project` and `multi-repo`). The change is mechanical but must be applied to every file or scaffolds will be inconsistent.

The exact replacement is **the same in every file**:

**Find** (the line between the HTML markers may have surrounding whitespace — match the body line only):

```
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current.
```

**Replace with two lines** (insert the new query/path/explain bullet ABOVE the rebuild bullet, then change the rebuild bullet itself):

```
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files.
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost).
```

Templates also use `` `graphify-out/...` `` (with backticks) where the upstream uses plain text. Keep the templates' backtick style — they're correct markdown for inline paths and the snapshot test expects them. Do not unify.

**Files** (apply the same edit to each, one commit at the end):
- `packages/templates/single-project/_if-claude-code/CLAUDE.md.hbs`
- `packages/templates/single-project/_if-copilot/.github/copilot-instructions.md.hbs`
- `packages/templates/single-project/_if-gemini-cli/GEMINI.md.hbs`
- `packages/templates/single-project/_if-cursor/.cursor/rules.md.hbs`
- `packages/templates/single-project/_always/AGENTS.md.hbs`
- `packages/templates/multi-repo/_if-claude-code/CLAUDE.md.hbs`
- `packages/templates/multi-repo/_if-copilot/.github/copilot-instructions.md.hbs`
- `packages/templates/multi-repo/_if-gemini-cli/GEMINI.md.hbs`
- `packages/templates/multi-repo/_if-cursor/.cursor/rules.md.hbs`
- `packages/templates/multi-repo/_always/AGENTS.md.hbs`

- [ ] **Step 6.1: Apply the edit to all 10 files**

For each file in the list above, find the existing single bullet:
``- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current.``

and replace it with the two-bullet block:
``- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files.``  
``- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost).``

- [ ] **Step 6.2: Verify zero remaining references to the old hook command**

```powershell
cd D:\DEV\NONoise-frmw\NONoise-frmw
Select-String -Path packages/templates -Pattern "_rebuild_code" -Recurse
```
Expected: NO matches (empty output).

- [ ] **Step 6.3: Verify every template now has the new line**

```powershell
$count = (Select-String -Path packages/templates -Pattern 'For cross-module "how does X relate to Y"' -Recurse).Count
Write-Host "Found in $count files"
```
Expected: `Found in 10 files`.

- [ ] **Step 6.4: Commit**

```powershell
git add packages/templates
git commit -m "refactor(templates): refresh graphify rules block to v4 (10 files)`n`nReplace deprecated python3 -c hook with graphify update . and add the new`ncross-module query/path/explain bullet. Single mechanical edit applied to all`nfive context files in both single-project and multi-repo templates.`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Update the repo's self-hosted root `CLAUDE.md`

**Why:** `CLAUDE.md` (root) already has `graphify update .` from a prior partial update, but it's missing the new `query/path/explain` rule line. Add only that one line.

**Files:**
- Modify: `CLAUDE.md` (root, around line 86–88)

- [ ] **Step 7.1: Insert the missing rule line**

Find:

```markdown
Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
```

Replace with:

```markdown
Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
```

(Note: no `.github/copilot-instructions.md` exists at repo root — confirmed in pre-flight; nothing to edit there.)

- [ ] **Step 7.2: Commit**

```powershell
git add CLAUDE.md
git commit -m "docs(self-host): add missing graphify query/path/explain rule to root CLAUDE.md`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Drift-prevention test — SKILL.md block matches the canonical reference

**Why:** keeps `SKILL.md` and `references/rules-block.md` in lockstep. If a future contributor edits one without the other, CI fails loudly.

**Files:**
- Test: `packages/create-nonoise/test/unit/graphify-rules-block.test.ts` (new)

- [ ] **Step 8.1: Write the test**

Create `packages/create-nonoise/test/unit/graphify-rules-block.test.ts`:

```typescript
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const monoRoot = resolve(here, '..', '..', '..', '..');

describe('graphify rules block', () => {
  it('SKILL.md inlines the canonical block from references/rules-block.md', async () => {
    const reference = await readFile(
      resolve(monoRoot, 'packages/skills/graphify-setup/references/rules-block.md'),
      'utf8',
    );
    const skill = await readFile(
      resolve(monoRoot, 'packages/skills/graphify-setup/SKILL.md'),
      'utf8',
    );

    // Strip trailing newline + extract just the body of the block (drop the
    // leading "## graphify" heading line so we match against the indented
    // markdown code-fence body inside SKILL.md).
    const referenceBody = reference.trim();
    const normalizedSkill = skill.replace(/\r\n/g, '\n');

    // The block appears inside an indented code fence in SKILL.md. Normalize
    // by stripping the 3-space indent prefix from each candidate region.
    const dedented = normalizedSkill
      .split('\n')
      .map((line) => (line.startsWith('   ') ? line.slice(3) : line))
      .join('\n');

    expect(dedented).toContain(referenceBody);
  });

  it('all 10 Handlebars templates contain the new query/path/explain rule', async () => {
    const fg = await import('fast-glob');
    const files = await fg.default('packages/templates/**/*.hbs', { cwd: monoRoot, absolute: true });
    const offenders: string[] = [];
    for (const f of files) {
      const txt = await readFile(f, 'utf8');
      if (!txt.includes('## graphify')) continue;
      if (!txt.includes('For cross-module "how does X relate to Y"')) {
        offenders.push(f);
      }
      if (txt.includes('_rebuild_code')) {
        offenders.push(`${f} (still references deprecated _rebuild_code)`);
      }
    }
    expect(offenders, `Templates out of sync: ${offenders.join(', ')}`).toEqual([]);
  });
});
```

If `fast-glob` is not already a dev dep of `create-nonoise`, check first:

```powershell
Select-String -Path packages/create-nonoise/package.json -Pattern '"fast-glob"'
```
If no match, install it:

```powershell
pnpm --filter create-nonoise add -D fast-glob
```

- [ ] **Step 8.2: Run the test to verify it passes**

```powershell
pnpm --filter create-nonoise exec vitest run test/unit/graphify-rules-block.test.ts
```
Expected: both assertions PASS. If the first fails with a diff, the dedent normalization may need adjustment — read the actual SKILL.md text and compute the indent precisely.

- [ ] **Step 8.3: Commit**

```powershell
git add packages/create-nonoise/test/unit/graphify-rules-block.test.ts packages/create-nonoise/package.json packages/create-nonoise/pnpm-lock.yaml
# (lockfile path may be the workspace root pnpm-lock.yaml — git status will show)
git commit -m "test(graphify-setup): drift-prevention for the rules block`n`nFails CI if SKILL.md and the canonical references/rules-block.md fall out`nof sync, or if any Handlebars template still emits the deprecated`n_rebuild_code hook.`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Rebuild, regenerate snapshots, and review the diff manually

**Why:** the snapshot test (`canonical.test.ts`) embeds the full scaffolded tree per tool combination. Every change in Task 6 will surface as a snapshot diff. Per `CLAUDE.md`, snapshot diffs are EXPECTED here — but every line of diff must be reviewed deliberately.

- [ ] **Step 9.1: Re-bundle assets**

```powershell
pnpm --filter create-nonoise run build
```
Expected: build succeeds, `Assets bundled.` printed.

- [ ] **Step 9.2: Run the full suite to see what fails**

```powershell
pnpm --filter create-nonoise exec vitest run
```
Expected: snapshot test FAILS with diffs in the rules block. Other suites should PASS (they were validated incrementally above).

- [ ] **Step 9.3: Regenerate snapshots**

```powershell
pnpm --filter create-nonoise exec vitest run -u
```

- [ ] **Step 9.4: Manually review the snapshot diff**

```powershell
git --no-pager diff packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap
```

**Acceptance criteria for the diff:**
- ONLY changes inside `## graphify` blocks.
- For each block: removal of the `python3 -c "from graphify.watch import _rebuild_code; ..."` line, addition of the new `For cross-module "how does X relate to Y"` line and the `graphify update .` line.
- No changes to any other section, no whitespace-only churn elsewhere, no spurious file additions/removals.
- The block changes appear in every scaffold variant (single + multi, every tool combination).

If anything else changed, STOP and investigate before committing the snapshot.

- [ ] **Step 9.5: Run the full suite again to confirm everything is green**

```powershell
pnpm --filter create-nonoise exec vitest run
pnpm -r run typecheck
```
Expected: ALL tests PASS, typecheck clean.

- [ ] **Step 9.6: Commit the regenerated snapshot**

```powershell
git add packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap
git commit -m "test(snapshot): regenerate after graphify v4 rules-block refresh`n`nDiff verified: only the graphify rules blocks changed. The deprecated`n_rebuild_code hook is gone, the cross-module query/path/explain rule and`nthe graphify update . hook are added. No other content changed.`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Refresh top-level docs

**Files:**
- Modify (if they reference the old install/hook): `docs/external-tools.md`, `docs/skills-catalog.md`
- Skip: `docs/polly.md` (per spec, only if it quotes the rebuild command)

- [ ] **Step 10.1: Find any remaining references in docs/**

```powershell
Select-String -Path docs -Pattern "pip install graphifyy|_rebuild_code" -Recurse
```

- [ ] **Step 10.2: For each match, update**

- Replace `pip install graphifyy` with `uv tool install "graphifyy>=0.4.23"` (mention the pip escape hatch in a parenthetical only on `external-tools.md`).
- Replace `python3 -c "from graphify.watch import _rebuild_code..."` with `graphify update .`.
- In `skills-catalog.md`, update the `graphify-setup` capability summary to mention the new Copilot installer wiring (one bullet: "Wires `graphify copilot install` when Copilot is selected").

If no matches in step 10.1, skip 10.2.

- [ ] **Step 10.3: Commit (only if any docs were edited)**

```powershell
git status --short docs
# if any files listed:
git add docs
git commit -m "docs: align external-tools and skills-catalog with graphify v4`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 11: Changeset, version bump, README tarball URLs

**Why:** the release flow is documented in `CLAUDE.md` and enforced by `auto-tag.yml` → `release.yml`. The tarball URL in BOTH READMEs MUST be updated in the same commit as the version bump or the GitHub Release fallback link is broken until the next docs change.

- [ ] **Step 11.1: Add a Changeset entry**

```powershell
pnpm changeset
```
Pick: `create-nonoise` only (no other package is published). Bump level: **`patch`**. Summary text:

> Update graphify integration to v4 (graphifyy >= 0.4.23): switch installer from pip to `uv tool install`, adopt upstream's richer rules block (`graphify update .` + cross-module `query`/`path`/`explain` guidance), wire `graphify copilot install` when Copilot is selected, vendor upstream as reference-only for future bumps.

- [ ] **Step 11.2: Verify the changeset file was written**

```powershell
Get-ChildItem .changeset/*.md | Where-Object { $_.Name -ne 'README.md' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content
```
Expected: the new changeset's body matches Step 11.1.

- [ ] **Step 11.3: Bump the version**

```powershell
pnpm version
```
This runs the workspace `version` script which delegates to `changeset version`. It updates `packages/create-nonoise/package.json` version + `CHANGELOG.md`.

Capture the new version from the updated `package.json`:

```powershell
$NEW = (Get-Content packages/create-nonoise/package.json | ConvertFrom-Json).version
Write-Host "New version: $NEW"
```

- [ ] **Step 11.4: Update both READMEs' GitHub Release fallback URL**

In each of `README.md` (root) and `packages/create-nonoise/README.md`, find the "GitHub Release fallback" Quickstart block. The URL appears TWICE per file in the form:

```
https://github.com/russosalv/NONoise/releases/download/v<OLD>/create-nonoise-<OLD>.tgz
```

Replace `<OLD>` with `<NEW>` (from Step 11.3) in BOTH occurrences in BOTH files.

Verify:

```powershell
Select-String -Path README.md, packages/create-nonoise/README.md -Pattern "create-nonoise-(\d+\.\d+\.\d+)\.tgz"
```
Expected: every match shows the NEW version, no stragglers on the old version.

- [ ] **Step 11.5: Run the suite one last time**

```powershell
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run
pnpm -r run typecheck
```
Expected: ALL green.

- [ ] **Step 11.6: Commit the bump + tarball URL updates together**

```powershell
git add .changeset packages/create-nonoise/package.json packages/create-nonoise/CHANGELOG.md README.md packages/create-nonoise/README.md
git commit -m "chore(create-nonoise): release v$NEW (graphify v4 upgrade)`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

(`$NEW` should be substituted with the literal version, e.g. `v0.4.5`. PowerShell variable expansion in double-quoted strings handles this.)

---

## Task 12: Final verification and release handoff

- [ ] **Step 12.1: Manual smoke scaffold**

```powershell
$smokeDir = Join-Path $env:TEMP "nonoise-smoke-$(Get-Random)"
node packages/create-nonoise/bin/create-nonoise.mjs $smokeDir --template single-project --tools claude-code,copilot --yes
```
(Adjust flag syntax if the CLI uses a different one — check `bin/create-nonoise.mjs --help` first if uncertain.)

Inspect the emitted files:

```powershell
Get-Content (Join-Path $smokeDir "CLAUDE.md") | Select-String -Context 0,6 "## graphify"
Get-Content (Join-Path $smokeDir ".github\copilot-instructions.md") | Select-String -Context 0,6 "## graphify"
Get-Content (Join-Path $smokeDir "AGENTS.md") | Select-String -Context 0,6 "## graphify"
Get-Content (Join-Path $smokeDir ".gitignore") | Select-String "graphify"
```
Expected in each `## graphify` block: NO `_rebuild_code`, presence of both new bullet lines (cross-module + `graphify update .`).

Clean up:
```powershell
Remove-Item -Recurse -Force $smokeDir
```

- [ ] **Step 12.2: Confirm vendor exclusion in the would-be tarball**

```powershell
Test-Path packages/create-nonoise/skills/vendor/graphify
Test-Path packages/create-nonoise/skills/vendor/superpowers
```
Expected: first → `False`, second → `True`.

- [ ] **Step 12.3: Push and trigger release**

```powershell
git push origin main
```

The push to `main` triggers `auto-tag.yml` → `release.yml` → npm publish. From here the `publish-nonoise` skill (per the project's release flow) handles the GitHub Release tarball + workflow polling. Hand off to it explicitly:

> "Implementation complete. Use the `publish-nonoise` skill to drive the rest of the release (GitHub Release with attached tarball + workflow monitoring). The version bump and tarball URLs are already committed."

- [ ] **Step 12.4: Final visual check**

```powershell
git --no-pager log --oneline -15
```
Expected commit sequence (newest first):
1. `chore(create-nonoise): release v<NEW> (graphify v4 upgrade)`
2. (optional) `docs: align external-tools and skills-catalog with graphify v4`
3. `test(snapshot): regenerate after graphify v4 rules-block refresh`
4. `test(graphify-setup): drift-prevention for the rules block`
5. `docs(self-host): add missing graphify query/path/explain rule to root CLAUDE.md`
6. `refactor(templates): refresh graphify rules block to v4 (10 files)`
7. `docs(reverse-engineering): align graphify install hint with uv-based flow`
8. `feat(graphify-setup): graphify v4 — uv installer, Copilot wiring, refreshed rules block`
9. `feat(bundle-assets): exclude reference-only vendor/graphify`
10. `feat(vendor): pin graphify v4 (215b5d4) as reference-only`
11. `feat(graphify-setup): add canonical rules-block reference file`
12. `docs(specs): graphify v4 framework upgrade design (uv-based install)` (already committed pre-plan)
