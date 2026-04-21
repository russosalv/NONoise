# create-nonoise

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
