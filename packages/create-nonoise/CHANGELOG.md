# create-nonoise

## 1.2.1

### Patch Changes

- Fix `scripts/bundle-assets.mjs` to handle vendor exclusions deterministically on CI runners.

  **Bug**: the previous implementation copied the whole `packages/skills/vendor/` directory with one recursive `cp` and then pruned the excluded packs (`graphify`) afterwards. On CI runners, the recursive copy could occasionally finish in a state where `graphify` was bundled and other vendor packs (e.g. `skill-creator`) were missing — likely a timing/permission interaction with Node's `fs.cp` recursive mode. Local builds always passed, so the regression only surfaced on the release workflow's test step.

  **Fix**: enumerate vendor sub-folders explicitly and skip excluded packs upfront (no post-copy prune). Add a `verify()` step at the end of the script that asserts excluded packs are absent and required packs (`superpowers`, `impeccable`, `skill-creator`) are present, exiting non-zero with a clear message if not — so any future regression fails the build immediately rather than surfacing as a flaky test.

## 1.2.0

> **Note:** 1.2.0 was tagged but never published to npm because the release workflow's bundle-assets test was flaky on CI. Use 1.2.1 — same feature set, plus the bundle-assets CI fix.

### Minor Changes

- Add `--upgrade` mode for existing projects, auto-detect NONoise projects on positional path, and harden the `reverse-engineering` skill against the bare `graphify` CLI trap.

  **Quick reference — new commands**

  ```bash
  # Refresh an existing project (skills + graphify), interactive
  npx create-nonoise@latest path/to/existing-project

  # Same, non-interactive
  npx create-nonoise@latest --upgrade path/to/existing-project

  # Narrow path: only the graphify integration, not skills
  npx create-nonoise@latest --graphify-only path/to/existing-project

  # In Claude Code, build the project's knowledge graph (no API key needed)
  /index .
  ```

  **Migration note for projects scaffolded with 1.0.x or 1.1.x**

  Bundled skills (e.g. `reverse-engineering`) were copied at scaffold time and stay frozen at the version that shipped with `create-nonoise@<your-version>`. To pick up the hardened `reverse-engineering` skill (anti-CLI guard rails) and the new `/index` slash command, run `npx create-nonoise@latest --upgrade <your-project>`. Your `CLAUDE.md`, `AGENTS.md`, `nonoise.config.json` and any local customisation are preserved.

  **New: `--upgrade` mode**

  - `create-nonoise --upgrade [path]` refreshes an existing NONoise project to the current shipped version: re-copies all bundled skills (`overwrite: true`, so updated `SKILL.md` files reach existing projects) and re-runs the graphify install. Templates (`CLAUDE.md`, `AGENTS.md`, etc.) are NOT touched — they may have local customisation.
  - The interactive entry-mode prompt now offers three options: New project / Upgrade existing project / Force-install graphify only.
  - New `installSkills`/`installVendor` `overwrite?: boolean` option (default `false` for scaffold; `true` for upgrade).

  **New: auto-detect on positional path**

  - `create-nonoise <path-to-existing-nonoise-project>` now detects the existing `nonoise.config.json` and prompts: Upgrade / Graphify-only / Cancel — instead of trying to scaffold over the existing project.
  - In `--yes` mode it aborts with an actionable error message pointing to `--upgrade` and `--graphify-only`, so non-interactive scripts cannot silently clobber existing projects.

  **Hardened `reverse-engineering` skill**

  The skill's Step 0.1 now runs two checks: (A) graphify binary is on PATH, and (B) the `/graphify` slash skill is registered in the active IDE (`~/.claude/skills/graphify/`, `~/.copilot/skills/graphify/`, or `~/.cursor/rules/graphify.mdc`). If A passes but B fails, the skill aborts and tells the user to run `npx create-nonoise@latest --graphify-only` — preventing fallback to the bare `graphify extract` CLI which requires an external API key. The pin in the install hint is bumped from `>=0.4.23` to `>=0.7.0`. New Hard rule #11 forbids invoking the bare CLI for indexing.

  **New: `/index` slash command for Claude Code**

  - New project-level slash command `.claude/commands/index.md` (added to both single-project and multi-repo templates) wraps `/graphify <path>` with explicit "anti-pattern" guidance redirecting away from `graphify extract`.
  - The canonical graphify rules block (`graphify-rules-block.md` + all 10 `.hbs` template files) gains a 5th bullet making the rule explicit: always slash skill, never bare CLI for full rebuilds.

## 1.1.0

### Minor Changes

- Fix the graphify install step during scaffolding and add `--graphify-only` for upgrading existing projects.

  **Fixes (graphify install during `npx create-nonoise`)**

  - Bumped pin to `graphifyy>=0.7.0`. The previous `0.4.23` pin predated the `graphify claude install` / `graphify copilot install` subcommands and would silently land on a CLI that no longer ships those commands.
  - Replaced the broken `graphify --version` probe (the CLI never had a `--version` flag in 0.7.x) with parsing of `uv tool list`, so the report now shows the real installed version.
  - The Claude integration step now runs `graphify claude install` (project-local CLAUDE.md + PreToolUse hook) instead of the bare `graphify install`, which copies the user-level skill into `~/.claude/`.
  - Hook commands now run with `cwd = projectPath`, so `CLAUDE.md` and `.claude/settings.json` land inside the freshly scaffolded project rather than in the directory where `npx create-nonoise` was invoked.
  - The Claude install step is now gated on the `claudeCode` AI-tools flag (was always running, regardless of selection).
  - Failure hints now include concrete recovery commands (uv, pipx, pip) and reference the project path so the user can copy-paste them into a new shell.

  **New: `--graphify-only` mode**

  - `create-nonoise --graphify-only [path]` re-runs only the graphify install step on an existing NONoise project. It reads `aiTools` from `nonoise.config.json` and accepts a `--ai` override.
  - The interactive flow now opens with a top-level prompt: _Create a new project_ vs. _Update / force-install graphify on an existing project_. The second branch asks for the project path (and for AI tools if no `nonoise.config.json` is found) and delegates to the same `--graphify-only` logic.
  - Use this to upgrade older NONoise projects to the new graphify CLI integration without touching templates or rerunning the full scaffold.

## 1.0.1

### Patch Changes

- Rename every VibeKanban mention across bundled skills, templates, and docs to Paseo (https://paseo.sh). Polly's `external-tools.md` §2 is rewritten to describe Paseo's actual purpose — running native agent harnesses (Claude Code, Codex, OpenCode) from phone, desktop, web, and CLI — instead of the previous bug-triage workflow. The ATR `references/vibekanban.md` reference file is renamed to `paseo.md` and all internal cross-links are updated accordingly.

## 1.0.0

### Major Changes

- 103629d: Polly advisor redesign: Polly is now a one-shot, stateless, opt-in advisor. Scaffolded projects no longer receive `.nonoise/POLLY_START.md`, `.nonoise/polly-state.json`, `.nonoise/polly-state.schema.json`, or `.nonoise/polly-state.mjs`. They get `.nonoise/sdlc-flow.md` instead — an editable YAML-headed Markdown doc driving what Polly suggests.

  Context files (CLAUDE.md / .github/copilot-instructions.md / .cursor/rules.md / GEMINI.md / AGENTS.md) now tell the AI to engage skills directly from user intent and to ask for the full scope in one message when engaging SDLC skills. Polly is the fallback, not the default.

  Six native `[pair]` SDLC skills (`requirements-ingest`, `bmad-agent-analyst`, `bmad-advanced-elicitation`, `arch-brainstorm`, `arch-decision`, `sprint-manifest`) carry a one-line preamble reinforcing the same behaviour at the skill level.

  **Migration for existing scaffolded projects:** the stale `.nonoise/POLLY_START.md` and `.nonoise/polly-state.*` files become harmless — delete them at your leisure (`rm .nonoise/POLLY_START.md .nonoise/polly-state.*`). Copy the new `sdlc-flow.md` template from `node_modules/create-nonoise/templates/single-project/_always/.nonoise/sdlc-flow.md` (or re-scaffold into a scratch directory and copy the file). Add the "Working with skills" block from the new templates into your existing `CLAUDE.md` / `copilot-instructions.md` / etc.

## 0.24.7

### Patch Changes

- Update graphify integration to v4 (graphifyy >= 0.4.23): switch installer from pip to `uv tool install`, adopt upstream's richer rules block (`graphify update .` + cross-module `query`/`path`/`explain` guidance), wire `graphify copilot install` when Copilot is selected, vendor upstream as reference-only for future bumps.
- 6564c20: `quint-fpf` now emits a per-phase markdown trail in a single per-cycle folder, in both tooled and conversational modes. Each of the six FPF commands (`/q0-init`, `/q1-hypothesize`, `/q1-add`, `/q2-verify`, `/q3-validate`, `/q4-audit`, `/q5-decide`) writes its dedicated file (`00-context.md` … `05-decision.md`) so the entire reasoning trail is reviewable in git and removable with a single `rm -rf`. The folder is resolved at Phase 0: standalone runs go to `docs/fpf/<slug>/` (slug auto-derived from the problem statement); `arch-decision` passes `--target docs/prd/<area>/audit/NN-<study>-fpf/` so the FPF artifacts co-locate with the PRD they validate. Re-runs of a phase append under `## Revisions` with a UTC timestamp — initial entries are immutable. `arch-decision`'s audit location changes from a single file `audit/NN-<study>-fpf.md` to the folder `audit/NN-<study>-fpf/`; `sprint-manifest` now moves the whole folder on promotion. Fingerprints in `polly/references/fingerprints.md` updated for the new layout. Canonical scaffold snapshot regenerated. Docs updated: `docs-hierarchy.md` adds `docs/fpf/<slug>/`, removes `docs/support/quint/`, and documents the PRD-co-located audit folder; `sdlc.md` and `skills-catalog.md` entries for `arch-decision` and `quint-fpf` describe the new per-phase emission contract.

## 0.24.6

### Patch Changes

- `graphify-setup` and `reverse-engineering` bundled skills now invoke indexing through the `/graphify <path>` slash command (which runs the skill's full AST + LLM semantic extraction + community detection pipeline) instead of a bare `graphify <path>` CLI call — that subcommand does not exist in graphify v0.4.23. Step 5.2/5.3/5.5 of `graphify-setup` uses `/graphify <path>` for MISSING and `/graphify <path> --update` for EXISTS (incremental with semantic cache reuse), with a tool-dependent invocation note covering slash-command vs prose-following and a post-run validation that GRAPH_REPORT.md Token cost is non-zero on initial builds. `reverse-engineering` Step 2.1/2.2 gets the same routing + 0-token warning. Canonical scaffold snapshot regenerated. Docs: root README + package README now document the GitHub Release tarball as an npm-registry fallback; CLAUDE.md release checklist requires the fallback URL to be bumped in the same commit as the version.

## 0.24.5

### Patch Changes

- Reverse-engineering flow: new `/polly` routing through `graphify-setup` in `mode=reverse-engineering`, with graph-freshness signal and a Step 5 indexing proposal. Reverse-engineering skill hardens Q3/Q4 with a `source_less_run` tracker, a sub-agent `source_less` flag, and an overview banner + CHANGELOG step. Scaffold gains a `--reverse` flag (and matching prompt) that adds an optional `reverse.{source_path, graph_freshness_days}` block to `nonoise.config.json`. Polly invocation matrix documents the args convention for brownfield skill handoffs. Skill prose readability improved for Copilot and the reverse-engineering fingerprint signal tightened. Canonical scaffold snapshots regenerated.

## 0.24.4

### Patch Changes

- cfd91d4: Make 9 bundled skills loadable in GitHub Copilot. Copilot enforces a 1024-character limit on `description` in `SKILL.md` frontmatter (Claude Code does not) and uses a stricter YAML parser. Compressed the descriptions of `polly`, `arch-decision`, `c4-doc-writer`, `docs-md-generator`, `observability-debug`, `ops-skill-builder`, `reverse-engineering`, `spec-to-workitem`, and `sprint-manifest` to ≤1024 characters while preserving the trigger phrases. Fixed a YAML parse error in `polly` (`Polly does NOT write code:` → em-dash). Added `packages/create-nonoise/test/validation/skill-frontmatter-copilot.test.ts` to catch any future regression and a Copilot-compat rules section to `ops-skill-builder` so newly-authored skills are born compliant.

## 0.24.3

### Patch Changes

- Polly state file now ships with a local JSON Schema. `create-nonoise` writes
  `.nonoise/schemas/polly-state.v1.json` alongside `polly-state.json`, and the
  state file's `$schema` points to it via a relative path
  (`./schemas/polly-state.v1.json`) instead of a remote URL. Editors (VS Code,
  Cursor, JetBrains) now resolve validation and autocomplete from the local
  file — no network, no published schema URL required.

## 0.24.2

### Patch Changes

- Polly: new `/polly-menu` command giving a read-only overview of current state, phases, possible next steps, and engageable skills (with EN/IT trigger phrases and structured output). Added `references/project-tools.md` documenting `md-extractor`, `devops-push`, and the multi-repo management scripts.

## 0.24.1

### Patch Changes

- Refresh canonical scaffold snapshot to include the new COBOL/legacy block in the bundled `reverse-engineering` skill (test-only fix; user-facing content unchanged from 0.24.0). Republishes 0.24.0 as 0.24.1 because the 0.24.0 release workflow failed at the test step before reaching `npm publish`.

## 0.24.0

### Minor Changes

- 752d02e: Added `playwright-cli` and `frontend-design` skills to the MVP bundle (now 5 skills). Fixed skill installation gating: skills are now installed whenever any AI tool is selected (not only Claude Code), keeping `.claude/skills/` as the single canonical location. Added opt-in BMAD integration: new prompt "Install BMAD agent skills?" (always asked, default yes) that runs `npx bmad-method install` in the generated project and filters to 5 agent skills. New `--bmad` / `--no-bmad` CLI flags. `nonoise.config.json` now records `installBmad`, `bmadInstalled`, and `bmadInstallError`.

### Patch Changes

- `reverse-engineering` skill: document a new rule in Step 2.0 — legacy code with no AST parser (COBOL, RPG, FORTRAN, JCL, PL/I, ABAP, Assembler, …) must be reclassified from the `code` to the `document` bucket before invoking graphify. Graphify's structural extraction only covers modern languages with available AST parsers; legacy dialects fall through that step and lose all signal. Treating them as text lets graphify's semantic LLM pass read them as prose and extract programs, paragraphs, `PERFORM`/`CALL` targets, copybook references, file/dataset names, and `DATA DIVISION` items. Includes a Python snippet to apply the reclassification after `detect()`. Especially relevant when reverse-engineering legacy mainframe applications.
