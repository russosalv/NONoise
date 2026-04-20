# create-nonoise

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
