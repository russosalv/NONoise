# OpenKnowledge integration — R1 implementation plan

> Status: **proposed** · Scope: **Release R1 (Foundation)** · Source proposal: "Proposta tecnica di evoluzione di NONoise per integrazione con OpenKnowledge"

This plan turns the OpenKnowledge proposal into concrete, file-level work mapped onto the **actual** `create-nonoise` pipeline. It is intentionally scoped to **R1** (the only release the proposal marks as the first deliverable). R2 (knowledge automation) and R3 (capability packs) are out of scope here but the R1 design leaves room for them.

OpenKnowledge stays an **optional capability**: a project that doesn't enable it must scaffold exactly as it does today.

## 1. How the feature fits the current pipeline

The real pipeline is `src/index.ts → src/prompts.ts → src/scaffold.ts`, with templates resolved by `src/template-resolver.ts` (the `_always/` + `_if-<tool>/` convention) and skills copied from `MVP_SKILL_BUNDLE` (`src/skill-bundle.ts`). Three properties of the existing code shape the design:

1. **The template resolver only knows AI tools.** `template-resolver.ts` maps `_if-<flag>` → `FLAG_TO_AI_TOOL` (only `claude-code`, `copilot`, `codex`, `cursor`, `gemini-cli`). A `_if-openknowledge/` folder would **not** be resolved without extending the resolver to non-tool capabilities. This is the main enabling work.
2. **`create-nonoise` is a one-shot bootstrapper, not a persistent `nonoise` binary.** The proposed `nonoise knowledge:init|doctor|sync-links` commands have no executable to live in today. Their home must be chosen (see Decision B).
3. **Everything is snapshot-driven.** Any file added to a scaffold shifts the snapshots in `packages/create-nonoise/test/snapshot/`. Expected and intended — but it is an explicit step, not an accident.

## 2. Decisions to take before coding

### Decision A — documentation layout

The proposal introduces `docs/delivery/`, `docs/operations/`, `docs/knowledge/`, while NONoise today generates `docs/{requirements,architecture,prd,sprints,calls,support}`.

**Recommendation: extend, don't rename.** Add `docs/knowledge/` (`glossary.md`, `domain-model.md`, `capability-map.md`) and `docs/operations/runbook.md`, but keep the existing folder names intact. Renaming would break the `fingerprint` globs in `.nonoise/sdlc-flow.md` that Polly walks to detect the current phase.

### Decision B — where the `knowledge:*` commands live

- **B1 (recommended):** do **not** expand the published CLI. `knowledge:doctor` and `knowledge:sync-links` ship as a tool bundled into the scaffold (mirroring the existing `tools/md-extractor/` and `tools/devops-push/`) plus a `knowledge-authoring` skill that orchestrates it. Keeps coupling loose ("OpenKnowledge as an optional external dependency") and does not bloat the npm package surface.
- **B2:** add subcommands to the `create-nonoise` binary. More "official", but distorts a tool designed to scaffold once.

This plan assumes **A = extend** and **B = B1**. Changing either only affects steps 3, 4 and 6 below.

## 3. R1 workstreams (file-level)

### WS1 — Flag and context (`--with-openknowledge`)
- `src/index.ts`: parse `--with-openknowledge` in `parseArgv`; add a line to `printHelp`.
- `src/prompts.ts`: add `CliFlags.withOpenknowledge?: boolean`; new `askOpenKnowledge(flags)` (default `false`, skipped under `--yes`), called from `runPrompts`.
- `src/types.ts`: add `openKnowledge: boolean` to `ProjectContext` (flows into `HandlebarsRenderContext`).
- `src/scaffold.ts`: the flag reaches `renderCtx` via the existing `...ctx` spread.

### WS2 — Capability-aware resolver (enables `_if-openknowledge/`)
- `src/template-resolver.ts`: generalize `resolveTemplateFiles(templateDir, aiTools, capabilities)` so `_if-openknowledge/` activates when `capabilities.openKnowledge` is true. Leave `_if-<aitool>` behaviour unchanged for back-compat.
- Add dedicated unit tests in `test/unit/`.

### WS3 — Knowledge-ready templates (`_if-openknowledge/`)
In **both** templates (`single-project/` and `multi-repo/`), add `_if-openknowledge/` with:
- `docs/knowledge/{glossary,domain-model,capability-map}.md.hbs` with the standard frontmatter (`id, title, category, status, owner, updated_at, links, tags`); `updated_at` from `{{createdAt}}`.
- `docs/operations/runbook.md.hbs` (and `docs/delivery/roadmap.md.hbs` if the extended layout is adopted).
- `.nonoise/knowledge-config.json.hbs` (version, canonical folders, minimum metadata level).
- `docs/architecture/adr/ADR-001-*.md`, `ADR-002-*.md` seed templates.

### WS4 — CLI wrapper as a bundled tool (Decision B1)
- `_if-openknowledge/tools/knowledge/` with `doctor.mjs` (validates naming, frontmatter, internal links, missing docs — non-zero exit for CI) and `sync-links.mjs` (regenerates index / overview pages). Model after `tools/md-extractor/`.
- A `package.json` for the tool exposing `knowledge:doctor` / `knowledge:sync-links` scripts.
- `ok init` stays **guided, not invoked** by the core (the proposal itself treats OpenKnowledge as an optional external dependency); the adoption guide documents that step.

### WS5 — Agent authoring skill
- New skill `packages/skills/knowledge-authoring/SKILL.md` (rules: declare docs created/modified, write to canonical folders, update the `links` section, avoid duplication).
- Add it to `MVP_SKILL_BUNDLE` (`src/skill-bundle.ts`) and to the `skills` array in `nonoise.config.json.hbs`.
- Consider gating it behind `openKnowledge` (today the bundle is static; this needs a small filter in `scaffold.ts`).

### WS6 — Polly + sdlc-flow
- `packages/skills/polly/SKILL.md`: make Polly aware of the knowledge flow (create/update core docs, flag gaps). This repo is self-hosting, so this edits the live skill source.
- `_always/.nonoise/sdlc-flow.md` (both templates): optionally add a `knowledge` phase with `fingerprint: "docs/knowledge/**/*.md"`. Validate drift with the `sdlc-flow-maintainer` dev skill.

### WS7 — Context files
- Add a conditional `{{#if openKnowledge}}` block to `CLAUDE.md.hbs`, `AGENTS.md.hbs`, `.github/copilot-instructions.md.hbs`, `GEMINI.md.hbs`, `.cursor/rules.md.hbs` with the authoring rules — one source of truth feeding every tool.

### WS8 — Build, tests, docs
- `pnpm --filter create-nonoise run build` (bundle-assets re-copies skills + templates).
- New snapshot combinations in `test/snapshot/` with `openKnowledge` on/off; review diffs, then `vitest -u`. Add an integration test asserting `docs/knowledge/` appears **only** with the flag.
- `docs/openknowledge.md` (twin of `docs/polly.md`) as the adoption guide; re-propagate to the site.
- Update `README.md` and `CLAUDE.md` (architecture section).

## 4. Out of scope for R1 (per the proposal)

- **R2 — Knowledge automation:** automatic index updates, requirement → architecture → ADR → runbook traceability, documentation-gap checks in CI.
- **R3 — Reuse & capability packs:** reusable capability packs, bid/tender templates, vertical-domain knowledge bundles.

The `knowledge-config.json` and the `doctor` tool should be designed to be extensible toward R2/R3.

## 5. Recommended sequence

WS2 (resolver) → WS1 (flag) → WS3 (templates) → WS8 (baseline tests) to get a green skeleton, then WS4–WS7 in layers. Each layer closes with a build + snapshot update.

## 6. Open issues to close in design review

Carried over from the proposal, plus repo-specific ones:

- Canonical folder name: `docs/knowledge/` vs root `knowledge/` (this plan assumes `docs/knowledge/`).
- Minimum mandatory metadata level in documents.
- Which skills get write access vs read-only.
- Whether `knowledge:doctor` blocks or only warns in CI.
- Distribution strategy of the OpenKnowledge option in the CLI (resolved here as Decision B1 — bundled tool + skill).
- Whether `knowledge-authoring` is always bundled or gated behind the `openKnowledge` flag.
