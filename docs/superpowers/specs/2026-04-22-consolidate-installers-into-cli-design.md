# Consolidate installers into the CLI

**Date:** 2026-04-22
**Status:** Approved (brainstorm), awaiting implementation plan
**Scope:** `packages/create-nonoise`, `packages/skills/graphify-setup` (delete), `packages/skills/reverse-engineering`, `packages/skills/polly`, `packages/templates`, a handful of peripheral skills.

## Goal

Make `create-nonoise` the sole owner of **runtime-binary installation** for NONoise-provided tooling. Today this means exactly one tool: **graphify**. The installer skill (`graphify-setup`) is deleted; its install logic is moved into the CLI, its rules-block wiring is absorbed by the already-existing Handlebars templates, and its brownfield/reverse-engineering orchestration (Step 5) is absorbed by the `reverse-engineering` skill which already does full semantic indexing.

## Motivation

- **Duplication + drift**: the CLI already runs a minimal install via `runGraphifyInstall()` in `scaffold.ts:495` using `pip install graphifyy`. The `graphify-setup` skill does the same thing better (pinned version `graphifyy>=0.4.23`, `uv tool install` instead of `pip`, preflights, Copilot wiring). Two code paths, diverging.
- **Too many installer skills to maintain**: only one skill (`graphify-setup`) actually installs a binary today, but its scope has grown to 200+ lines covering install, rules-block wiring, gitignore, and first-graph-build orchestration. All four concerns have better owners elsewhere.
- **Simpler mental model**: skills = "how to use a tool"; CLI = "how to get a tool on disk". No ambiguity, no overlap with the context-file templates that already write rules.

## Non-goals

- **No new `create-nonoise install <tool>` sub-command** for post-scaffold re-install. If users need to re-install, they rerun the scaffold or invoke `uv tool install "graphifyy>=0.4.23"` themselves (printed in the failure message).
- **No auto-bootstrap of `uv`** without user consent. Same policy as today's `graphify-setup`: print the one-liner, do not execute it silently.
- **No silent pip fallback** when uv is unavailable. The `pip install --user graphifyy>=0.4.23` command is printed as a documented escape hatch and run only if the user explicitly invokes it.

## Scope decisions (answered during brainstorm)

| # | Decision | Choice |
|---|---|---|
| 1 | When does the CLI install graphify? | **Always at scaffold time** (preserve current `runGraphifyInstall=true` default, gated by `hasAnyAiTool(aiTools)`). |
| 2 | What becomes of `graphify-setup`? | **Delete the skill entirely.** Its 4 concerns move to: install → CLI; rules-block → templates (already there); `.gitignore` → templates (already there); first-graph-build → `reverse-engineering`. |
| 3 | Where does the first-graph-build prompt (old Step 5) live? | **Inline in `reverse-engineering`** (already handles full AST + semantic + clustering pipeline in Step 2.2 — no logic change required beyond removing the `graphify-setup` references). |
| 4 | What does Polly do at brownfield? | **Hand off directly to `reverse-engineering`.** Brownfield and reverse-engineering collapse into a single flow. |

## Design

### 1. CLI install logic — `packages/create-nonoise/src/scaffold.ts`

Replace `runGraphifyInstall()` with the full install routine (currently in `graphify-setup/SKILL.md` § "Package install" + § "Global wiring"):

1. **Preflight A — Python ≥ 3.10.** Probe `python3 --version` then `python --version`. If missing, print OS-specific install hint and skip the remaining graphify steps. Non-fatal.
2. **Preflight B — `uv`.** Probe `uv --version`. If missing, print the bootstrap one-liner (`astral.sh/uv/install.sh` on Unix, `astral.sh/uv/install.ps1` on Windows). Skip the remaining graphify steps. Non-fatal. Do not execute the bootstrap.
3. **Install.** Run `uv tool install "graphifyy>=0.4.23"`. Idempotent.
4. **Upgrade path.** If the graphify binary is on `PATH` but older than 0.4.23 (probe `graphify --version`, parse version), run `uv tool upgrade graphifyy`; if that reports nothing to do, fall back to `uv tool install --reinstall "graphifyy>=0.4.23"`.
5. **Global wiring — Claude Code.** Always run `graphify install`. Writes `~/.claude/skills/graphify/SKILL.md` and updates `~/.claude/CLAUDE.md`. Required even for non-Claude scaffolds.
6. **Global wiring — Copilot.** If `ctx.aiTools.copilot`, run `graphify copilot install`. Writes `~/.copilot/skills/graphify/SKILL.md`. Warn + continue on failure.
7. **Reporting.** On scaffold completion, print:
   - `Python <version>` or `Python missing — graphify install skipped`
   - `uv <version>` or `uv missing — graphify install skipped`
   - `graphifyy <version>` (installed or already present) or the fallback hint
   - `graphify install` result (OK / failed)
   - `graphify copilot install` result (OK / failed / skipped because Copilot not selected)

All errors are non-fatal. The scaffold completes regardless of install outcome. The reporting block makes the failure mode visible to the user so they can retry manually.

**Gate:** the whole block runs only when `paths.runGraphifyInstall === true` (preserving the `--no-graphify-install` CLI flag) AND `hasAnyAiTool(ctx.aiTools) === true`.

**Remove** `'graphify-setup'` from the `MVP_SKILL_BUNDLE` array.

### 2. Handlebars templates

The templates already write the `## graphify` rules block (via `AGENTS.md.hbs` always, plus `CLAUDE.md.hbs`, `copilot-instructions.md.hbs`, `GEMINI.md.hbs`, `.cursor/rules.md.hbs` conditionally) and `graphify-out/` in `.gitignore.hbs`. Changes required:

- **Marker rename** (both `single-project/` and `multi-repo/`):
  - `<!-- >>> graphify (managed by graphify-setup skill) -->` → `<!-- >>> graphify (managed by create-nonoise) -->`
  - `# >>> graphify (managed by graphify-setup skill)` → `# >>> graphify (managed by create-nonoise)`
- **Remove `graphify-setup` bullets** from the skill lists in:
  - `_if-gemini-cli/GEMINI.md.hbs` (line 11 in both templates)
  - `_if-cursor/.cursor/rules.md.hbs` (line 14 in both templates)
- **Brownfield line** in `_if-claude-code/CLAUDE.md.hbs` and `_if-copilot/.github/copilot-instructions.md.hbs` (both templates):
  - `**Brownfield** — \`graphify-setup\`, \`reverse-engineering\`` → `**Brownfield** — \`reverse-engineering\``

### 3. Canonical rules-block source

The drift-prevention unit test `packages/create-nonoise/test/unit/graphify-rules-block.test.ts` reads the canonical rules-block text from `packages/skills/graphify-setup/references/rules-block.md` and asserts it matches the one in each template. After deletion, this file has no home.

**Move** the file to `packages/create-nonoise/src/assets/graphify-rules-block.md`. Update the test to read from the new path (two paths in the test: the rules-block source and the old `graphify-setup/SKILL.md` — drop the SKILL.md check, keep the rules-block drift check across the five templates).

### 4. Skill deletions and edits

- **DELETE** `packages/skills/graphify-setup/` (entire directory).
- **EDIT** `packages/skills/reverse-engineering/SKILL.md`:
  - **Step 0.1 rewrite.** When both `python -c "import graphify"` and `graphify --help` fail, print:
    > Graphify not installed. It is normally installed at scaffold time by `create-nonoise`. Re-run the scaffold, or install manually: `uv tool install "graphifyy>=0.4.23"`. If `uv` is unavailable, see `astral.sh/uv/install.{sh,ps1}` for the bootstrap.
    …then abort. Remove the "Want me to run the install now?" prompt (install is no longer this skill's job).
  - **Remove references** to `graphify-setup`:
    - line 38: `[graphify](../graphify-setup/SKILL.md)` → `graphify`
    - lines 111–113: install note + "For the full setup (hooks, always-on, per-tool rules) see the `graphify-setup` skill" — replace with a one-line pointer to scaffold-time install.
    - line 738 ("Related skills"): drop the `graphify-setup` bullet.
- **EDIT** `packages/skills/polly/` (SKILL.md + references under `references/`):
  - Remove `graphify-setup` from the skill inventory, the decision tree, and the handoff tables.
  - **Brownfield flow**: the Polly decision tree for brownfield / reverse-engineering intent hands off directly to `reverse-engineering`. No more `Skill(skill: "graphify-setup", args: "mode=reverse-engineering source_path=...")`.
  - Remove the arg-passing tables that list `mode=reverse-engineering|brownfield` and `source_path` under graphify-setup.
  - Remove the troubleshooting section `### graphify-setup (if ever absent)`.
  - Update the phase fingerprint table: `scan` owner becomes `reverse-engineering` (its first-indexing step now produces `graphify-out/GRAPH_REPORT.md`).
  - Update dialogue text in `references/decision-tree.md` (and any other reference file) that mentions "I'll engage graphify-setup".
- **EDIT** peripheral skills that reference `graphify-setup`:
  - `bmad-agent-analyst/SKILL.md:46` — replace `graphify-setup output` with `reverse-engineering output` (the analyst's actual fallback is the dossier).
  - `observability-debug/SKILL.md` — the "correlates with code" step references `graphify-setup` for code search; replace with `graphify` (the core skill providing `graphify query`/`path`/`explain`).
  - `atr/SKILL.md` — "optional — use `graphify-setup` if the repo has a prepared graph"; replace with "optional — use `graphify query` / `graphify path` / `graphify explain` if `graphify-out/` exists". Drop the "Related skills" entry.
  - `ops-skill-builder/SKILL.md` — multiple mentions ("may call graphify-setup", "Optionally invoke `graphify-setup`"). Replace with: if the operation needs code-level awareness and `graphify-out/` is missing, propose `/graphify <path>` directly (the core skill), not a wrapper.

### 5. Tests

- **`graphify-rules-block.test.ts`**: update the canonical-source path (see §3). Drop the SKILL.md-vs-rules drift check (the SKILL.md no longer exists).
- **Snapshot regeneration**: run `pnpm --filter create-nonoise exec vitest -u`. Expect a large diff in `canonical.test.ts.snap`:
  - removal of the `.claude/skills/graphify-setup/` subtree
  - rename of markers in every generated CLAUDE.md / AGENTS.md / .github/copilot-instructions.md / GEMINI.md / .cursor/rules.md / .gitignore
  - removal of `graphify-setup` bullets in skill lists
  - updated Polly references
  - updated peripheral-skill wording
- **New test — `scaffold.install.test.ts`** (unit, in `packages/create-nonoise/test/unit/`): mock `execSync` and `execFileSync`; run `scaffold()` against a minimal context with Claude + Copilot selected and `runGraphifyInstall=true`; assert the expected command sequence fires in order:
  1. `python3 --version` / `python --version` (one succeeds)
  2. `uv --version`
  3. `uv tool install "graphifyy>=0.4.23"`
  4. `graphify install`
  5. `graphify copilot install`
  Then repeat with Copilot unselected and assert `graphify copilot install` does **not** fire. Repeat with Python missing and assert nothing past step 1 fires and the scaffold still completes.

## File-by-file change manifest

**Deletions:**
- `packages/skills/graphify-setup/` (directory)

**New files:**
- `packages/create-nonoise/src/assets/graphify-rules-block.md` (moved from `graphify-setup/references/`)
- `packages/create-nonoise/test/unit/scaffold.install.test.ts`

**Modified — CLI:**
- `packages/create-nonoise/src/scaffold.ts` — replace `runGraphifyInstall()`, remove `graphify-setup` from `MVP_SKILL_BUNDLE`
- `packages/create-nonoise/test/unit/graphify-rules-block.test.ts` — point to new canonical path

**Modified — templates (10 files):**
- `packages/templates/single-project/_always/.gitignore.hbs`
- `packages/templates/single-project/_always/AGENTS.md.hbs`
- `packages/templates/single-project/_if-claude-code/CLAUDE.md.hbs`
- `packages/templates/single-project/_if-copilot/.github/copilot-instructions.md.hbs`
- `packages/templates/single-project/_if-cursor/.cursor/rules.md.hbs`
- `packages/templates/single-project/_if-gemini-cli/GEMINI.md.hbs`
- (same 6 files under `multi-repo/`)

**Modified — skills:**
- `packages/skills/reverse-engineering/SKILL.md`
- `packages/skills/polly/SKILL.md` and every file under `packages/skills/polly/references/` that mentions `graphify-setup`
- `packages/skills/bmad-agent-analyst/SKILL.md`
- `packages/skills/observability-debug/SKILL.md`
- `packages/skills/atr/SKILL.md`
- `packages/skills/ops-skill-builder/SKILL.md`

**Snapshot regeneration:**
- `packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap` (and any sibling snap files) — regenerated, reviewed for correctness.

## Trade-offs

- **(+) Single owner for install**: CLI. Skills no longer fork on install logic. Drift between pip/uv goes away.
- **(+) Simpler Polly**: one decision (`brownfield → reverse-engineering`) instead of two (`brownfield → graphify-setup → reverse-engineering`).
- **(+) Rules block already lives in templates**: removing the skill doesn't lose the rules; it only removes a redundant second writer.
- **(−) Scaffold-time cost even for non-graphify users**: users who picked an AI tool but never intend to use graphify still pay Python + uv + graphifyy install. Mitigation: all errors non-fatal, clear reporting, `--no-graphify-install` flag preserved as the explicit opt-out.
- **(−) Large snapshot diff**: one-time churn in `canonical.test.ts.snap`. Reviewable but tedious.
- **(−) Polly rewrite is non-trivial**: graphify-setup is woven into inventory, decision tree, handoff tables, troubleshooting, and multiple dialogue snippets. Estimated the largest single edit in the plan.

## Acceptance criteria

1. `packages/skills/graphify-setup/` no longer exists.
2. Fresh scaffold into a temp dir with Claude + Copilot selected produces `graphify-out/` rules in CLAUDE.md/AGENTS.md/.github/copilot-instructions.md, marker says `managed by create-nonoise`, and installs `graphifyy>=0.4.23` via `uv tool install` (observable in scaffold output).
3. `pnpm --filter create-nonoise run test` passes with the regenerated snapshot.
4. `grep -R "graphify-setup" packages/` (excluding `CHANGELOG.md` and snapshot files that have been regenerated) returns zero hits.
5. `/polly` on a brownfield project hands off to `reverse-engineering` without mentioning `graphify-setup`.
6. `reverse-engineering` Step 2.2 still runs the full semantic pipeline (no regression) — verified by the existing token-cost non-zero check in the skill.

## Out of scope / follow-ups

- A `create-nonoise install graphify` sub-command for re-install on existing projects (candidate for a later iteration if users ask).
- Consolidating other scaffold-time installs (`playwright-cli`, `pptx`) into the same install pass — none of them currently run an install at scaffold time; bundle them in a future pass if they grow one.
- Replacing the `--no-graphify-install` flag with a more general `--skip-installs` umbrella if further tools get added.
