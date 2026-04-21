# Design: Update graphify integration to v4

**Date**: 2026-04-22
**Status**: Draft — awaiting user approval
**Owner**: NONoise framework maintainers
**Upstream**: https://github.com/safishamsi/graphify (branch `v4`, pinned commit `215b5d40e78e498100cbf8855224331c40f757d9`, package `graphifyy 0.4.23`)

## Problem

The framework's `graphify-setup` skill and the rules block it injects into every scaffolded project are stale:

1. The hook command `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` was deprecated upstream in **graphifyy 0.4.13** (#324, #287) and replaced with the official `graphify update .` CLI command. Our skill and **all 10 Handlebars templates** plus the repo's own self-hosted context files still emit the old form.
2. The rules block we inject is a subset of what upstream now ships — we lack the `graphify query`/`path`/`explain` guidance for cross-module questions.
3. We do not pin a minimum `graphifyy` version, so a fresh install can pick up an old release that still has the bugs fixed in 0.4.16–0.4.23 (Windows path nesting, `.mjs`/`.html`/`.mdx` detection, hook on Husky, etc.).
4. Upstream now ships per-platform installers (`graphify copilot install`, `graphify gemini install`, `graphify cursor install`, `graphify kiro install`, `graphify vscode install`). Our Step 2 only runs the default `graphify install` (Claude Code only), leaving Copilot users without a native graphify skill in `~/.copilot/skills/`.
5. We have no pinned reference of upstream's API surface, making it hard to detect breaking changes during future bumps.

## Goals

- Bring the graphify integration to parity with upstream `v4` (`graphifyy >= 0.4.23`).
- Use the same rules text upstream ships, so the framework and a manual `graphify install` produce semantically identical output.
- Pin upstream as a vendored reference (read-only, NOT bundled into the scaffold) so future bumps can be diffed mechanically.
- Extend Step 2 to also run `graphify copilot install` when Copilot is among the selected AI tools, but **only for Claude and Copilot** (per user decision). Gemini, Cursor, Kiro, VSCode keep the current generic flow.
- Keep the change behind a `create-nonoise` patch (or minor) bump and update the GitHub Release tarball URL fallback per the existing release checklist.

## Non-goals

- Bundling upstream's `skill.md` / `skill-copilot.md` into the scaffold's `.claude/skills/` or `.copilot/skills/` (upstream's installers already place them in the user's home — duplicating into the project would diverge on every upstream patch).
- Adding installer wiring for Gemini/Cursor/Kiro/VSCode (out of scope per user decision; can come in a follow-up bump).
- Changing `graphify-setup`'s public input contract (`mode=`, `source_path=`) or its Step 5 indexing proposal flow.
- Touching `graphify hook install` (still opt-in, owned by the orchestrator).

## Approach

### 1. Vendor upstream as reference-only

Add `packages/skills/vendor/graphify/` with `VENDOR.json` pointing at `safishamsi/graphify@v4`, `subpath: null`, `scope: ["."]`, commit `215b5d40e78e498100cbf8855224331c40f757d9`. This is consumed only by maintainers via `node scripts/sync-vendor.mjs graphify` to diff future upstream changes — it must NOT be bundled into the published CLI tarball.

`scripts/bundle-assets.mjs` currently copies all of `packages/skills/` into `packages/create-nonoise/skills/` for inclusion in the npm tarball. Either:
- (a) Add an explicit exclusion for `vendor/graphify` in `bundle-assets.mjs`, OR
- (b) Add `vendor/graphify` to a generalized exclusion list (since superpowers/impeccable/skill-creator/pptx ARE bundled, this would be an explicit exception)

**Decision**: option (a) — minimal, explicit, easy to grep. Keeps the existing vendoring contract intact for the other four packs which we DO bundle.

### 2. Refresh `graphify-setup/SKILL.md`

Edits to `packages/skills/graphify-setup/SKILL.md`:

1. **Step 1 (package install)**: switch the installer from `pip` to **`uv`**, since `graphifyy` is a CLI tool and `uv tool install` is the modern, isolated-env idiomatic equivalent of `pipx`. New flow:
   - **Preflight**: probe `uv --version`. If missing, print the one‑line bootstrap (`curl -LsSf https://astral.sh/uv/install.sh | sh` on macOS/Linux, `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"` on Windows) and stop gracefully (non‑fatal, same policy as the current Python‑missing branch).
   - **Install command** (idempotent; `uv tool install` is a no‑op if the tool is already present at the requested version): `uv tool install "graphifyy>=0.4.23"`.
   - **Upgrade path** for existing installs (when the binary is already on `PATH` but older than 0.4.23): `uv tool upgrade graphifyy` (or `uv tool install --reinstall "graphifyy>=0.4.23"` if `upgrade` reports nothing to do because the env was created without a floor pin).
   - **Fallback** when `uv` cannot be installed (locked-down corp boxes, offline CI): print the manual `pip install --user "graphifyy>=0.4.23"` command and continue (non‑fatal). We do NOT silently fall back to `pip` ourselves — uv is the new contract; pip is only a documented escape hatch.
   - The Python ≥ 3.10 check stays in place (uv still needs a Python interpreter to materialize the tool env, although it can also auto‑download one with `uv python install` — out of scope for this iteration).
   - Floor pin only (`>=0.4.23`) — patch updates are still desired.
2. **Step 2 (global wiring)**: after `graphify install`, conditionally run `graphify copilot install` if the scaffold selected Copilot. The skill receives the active AI-tool set via the existing template/Polly handoff context — read it the same way Steps 3 selects which context files to write. Failure of `graphify copilot install` is non-fatal (warn and continue), same policy as Step 1.
3. **Step 3 (rules block)**: replace our shorter block with the upstream `_CLAUDE_MD_SECTION` text verbatim. Specifically:
   - Replace the line `After modifying code files in this session, run python3 -c "..."` with `After modifying code files in this session, run \`graphify update .\` to keep the graph current (AST-only, no API cost)`.
   - Add the new line: `For cross-module "how does X relate to Y" questions, prefer \`graphify query "<question>"\`, \`graphify path "<A>" "<B>"\`, or \`graphify explain "<concept>"\` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files`.
   - Keep the existing HTML-comment idempotence markers (`<!-- >>> graphify ... -->` / `<!-- <<< graphify -->`) so the upgrade in existing scaffolds is a clean replace.
4. **Narrative refresh**: in the skill's intro and §5.2.1, mention v4 multimodal support (PDFs, images, video, audio via Whisper), the 25 tree-sitter languages, and that Copilot CLI now has a first-class installer.

### 3. Refresh all Handlebars templates

The same rules block is duplicated in 10 template files (5 per scaffold variant × `single-project` and `multi-repo`). Apply the same text replacement to each:

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

### 4. Refresh the repo's own self-hosted context files

Per `CLAUDE.md` ("This repo is **self-hosting**"), the framework's own root context files contain the same block:

- `CLAUDE.md` (root)
- `.github/copilot-instructions.md` (root)

Apply the same edit so the repo eats its own dog food.

### 5. Refresh docs

- `docs/external-tools.md`: bump version mention if any, and the rebuild command if quoted.
- `docs/skills-catalog.md`: re-state graphify-setup capabilities (multimodal, Copilot install).
- `docs/polly.md`: only if it quotes the rebuild command.

### 6. Update tests and snapshots

- `packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap` will diff because every scaffold variant emits the new block. Run `pnpm --filter create-nonoise exec vitest run -u` and **review the diff manually** — it must contain ONLY the rules-block text change, nothing else.
- `packages/create-nonoise/test/integration/scaffold.test.ts` already verifies the block is present via marker comments; ensure assertions still pass.
- Add one targeted unit test that asserts the new block content matches upstream's `_CLAUDE_MD_SECTION` exactly (so future upstream drift is caught at CI time). Source the canonical text from a single constant in `packages/skills/graphify-setup/lib/rules-block.ts` (new file) re-exported by both the skill and the test, to avoid drift between SKILL.md and tests.

  Actually — the skill is a markdown file with no executable code. Alternative: store the canonical block as a `.txt` file under `packages/skills/graphify-setup/references/rules-block.md` and have the test read it. The skill text is documentation only; the runtime behavior is whatever the LLM does with the markdown. Single source of truth via the references file.

### 7. Bump and release

- Add a Changeset entry (`pnpm changeset`, `patch` is sufficient — no behavior change in the CLI itself, only refreshed asset content).
- Run `pnpm version`.
- Update both READMEs' GitHub Release fallback URL (per release checklist in `CLAUDE.md`).
- Use the `publish-nonoise` skill to drive the rest.

## Architecture: file-level change summary

```
packages/skills/graphify-setup/
  SKILL.md                                  [edit: §1, §2, §3 narrative + rules block]
  references/rules-block.md                 [new: canonical block, single source of truth]

packages/skills/vendor/graphify/
  VENDOR.json                               [new: source/ref/commit pinning to v4@215b5d4]
  ...                                       [new: synced from upstream by sync-vendor.mjs]

packages/create-nonoise/
  src/scaffold.ts                           [no change unless Step 2 Copilot wiring needs it]
  test/integration/scaffold.test.ts         [verify still passes]
  test/snapshot/__snapshots__/*.snap        [regen + manual diff review]
  test/unit/<new>.test.ts                   [new: assert SKILL.md block matches references/rules-block.md]
  CHANGELOG.md                              [Changeset output]
  package.json                              [version bump]
  README.md                                 [release tarball URL]

packages/templates/single-project/
  _if-claude-code/CLAUDE.md.hbs             [edit: rules block]
  _if-copilot/.github/copilot-instructions.md.hbs [edit]
  _if-gemini-cli/GEMINI.md.hbs              [edit]
  _if-cursor/.cursor/rules.md.hbs           [edit]
  _always/AGENTS.md.hbs                     [edit]

packages/templates/multi-repo/                same five files, same edit

scripts/bundle-assets.mjs                   [edit: exclude vendor/graphify from bundle]

CLAUDE.md                                   [edit: rules block, self-host]
.github/copilot-instructions.md             [edit]
README.md                                   [release tarball URL]

docs/external-tools.md                      [edit if needed]
docs/skills-catalog.md                      [edit if needed]
docs/polly.md                               [edit if needed]
```

## Edge cases & failure modes

- **Existing scaffolded projects re-running `graphify-setup`**: the HTML-comment markers ensure the old block is replaced cleanly. No duplication risk.
- **`graphify copilot install` fails** (e.g. older `graphifyy < 0.4.15` somehow installed): warn and continue, same policy as the rest of Step 2. Step 1's floor pin should prevent this in practice.
- **User selected Copilot but pinned an older `graphifyy`**: Step 1's `>=0.4.23` will upgrade them. If the user pins a lower version externally, Step 2 detects the missing `copilot install` subcommand by exit code and warns.
- **`bundle-assets.mjs` regression**: a new test should assert the published `dist`/`skills` tree does NOT contain `vendor/graphify` (one-line glob assertion).
- **Snapshot diff noise**: if the snapshot diff contains anything beyond the expected block change, fail the review — likely an unintended Handlebars side-effect.
- **Self-host loop**: editing the root `CLAUDE.md` / `.github/copilot-instructions.md` means the next time we run graphify on this very repo, the new rules apply to the framework's own AI sessions. Intentional.

## Testing strategy

1. `pnpm -r run typecheck` — no type changes expected; baseline.
2. `pnpm --filter create-nonoise exec vitest run` — confirm baseline green, then re-run after edits.
3. `pnpm --filter create-nonoise exec vitest run -u` — regenerate snapshots, manually review.
4. New unit test: `SKILL.md` rules block matches `references/rules-block.md` byte-for-byte.
5. New unit test: bundled `skills/` in CLI tarball does NOT contain `vendor/graphify`.
6. Manual smoke: `node packages/create-nonoise/bin/create-nonoise.js /tmp/smoke-test --template single-project --tools claude-code,copilot` — inspect emitted `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, `.gitignore` for the new block.
7. Self-host check: open the framework's own `CLAUDE.md` and confirm the block matches the canonical reference.

## Rollout

- Single PR.
- Patch bump (no semantic CLI change, only asset refresh + new floor pin which is conservative).
- Changeset note: "Update graphify integration to v4 (graphifyy >= 0.4.23): switch installer from pip to `uv tool install`, adopt upstream's richer rules block (`graphify update .` + `query/path/explain` guidance), add Copilot per-user installer wiring in Step 2, vendor upstream as reference for future bumps."

## Open points

- Confirm the floor pin choice: `>=0.4.23` (current latest) vs `>=0.4.13` (the version that introduced `graphify update .`). Recommendation: `>=0.4.23` to ship with all known fixes.
- Confirm Changeset bump level: `patch` (recommended) vs `minor` (if we want to signal the new Copilot installer wiring as a new capability). Recommendation: `patch`.
- Confirm `uv` adoption strategy: hard‑require uv (current proposal — print bootstrap one‑liner if missing, do NOT auto‑install) vs auto‑bootstrap uv inline (run the `astral.sh/uv/install.*` script ourselves with user consent) vs allow `pip` as a first‑class equal path. Recommendation: hard‑require with documented `pip` escape hatch — keeps the install one command, avoids surprise network execution, and aligns with where the Python ecosystem is converging.
