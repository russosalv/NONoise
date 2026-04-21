# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

NONoise is an AI SDLC bootstrapper. The only thing it ships to users is the **`create-nonoise`** CLI (`npx create-nonoise <dir>`), which scaffolds a project pre-wired with AI skills, a docs hierarchy, context files per AI tool, and the **Polly** orchestrator. Everything else in this repo exists to produce that CLI's payload.

This repo is **self-hosting**: `.claude/skills/` at the root contains the live skill sources (not copies); `/polly` works on this repo too.

## Commands

Prerequisites: Node `>=20`, pnpm `9.12.0` (pinned via `packageManager` — use `corepack enable && corepack prepare pnpm@9.12.0 --activate` if needed).

```bash
pnpm install                                              # workspace deps
pnpm --filter create-nonoise run build                    # tsc + bundle skills/templates into dist
pnpm --filter create-nonoise exec vitest run             # all CLI tests (snapshot + integration + unit)
pnpm --filter create-nonoise exec vitest run <pattern>   # single test file or name pattern
pnpm --filter create-nonoise exec vitest                 # watch mode
pnpm -r run test                                         # every package
pnpm -r run typecheck
node scripts/sync-vendor.mjs                             # refresh vendored superpowers/impeccable/skill-creator/pptx
pnpm changeset && pnpm version && pnpm release           # release flow (Changesets)
```

There is no lint step (`pnpm lint` is a stub). There is no top-level test script that runs everything — use `pnpm -r run test` or filter to `create-nonoise`.

### Release checklist (when bumping `create-nonoise`)

Every version bump must also update the **GitHub Release tarball URL** embedded in `README.md` and `packages/create-nonoise/README.md` (the "GitHub Release fallback" block under Quickstart). The version appears twice in each URL:

```
https://github.com/russosalv/NONoise/releases/download/v<NEW>/create-nonoise-<NEW>.tgz
```

Do it in the same commit as the `package.json` / `CHANGELOG.md` bump produced by `pnpm version`. Otherwise the fallback link points at a non-existent release until the next doc change.

## Architecture — the big picture

### Monorepo shape

`pnpm-workspace.yaml` includes only `packages/*`. Three packages:

- **`packages/create-nonoise/`** — the published CLI. The only package users install.
- **`packages/skills/`** — 25 native NONoise skills + `vendor/` (superpowers, impeccable, skill-creator, pptx). Not published; bundled into the CLI at build time.
- **`packages/templates/`** — `single-project/` and `multi-repo/` scaffold payloads. Not published; bundled.

### How a scaffold is produced (the CLI pipeline)

`packages/create-nonoise/src/index.ts` → `scaffold.ts`. The flow:

1. **Prompt** (`prompts.ts`) — collect project name, template (`single-project` | `multi-repo`), AI tools (Claude Code, Copilot, Cursor, Gemini CLI, Codex), language hint, preferences.
2. **Resolve templates** (`template-resolver.ts`) — templates use a conditional-folder convention. `_always/` ships unconditionally; `_if-<tool>/` only if that tool was selected. Files with `.hbs` are rendered via Handlebars against the project context.
3. **Install skills** (`skill-installer.ts`) — copies `MVP_SKILL_BUNDLE` (hardcoded list in `scaffold.ts`) from `packages/skills/` plus vendored packs from `packages/skills/vendor/` into the scaffolded project's `.claude/skills/`.
4. **Write context files** — `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, `.cursor/rules.md`, `GEMINI.md` are all generated from Handlebars templates so the same source of truth feeds every tool.
5. **Drop `.nonoise/POLLY_START.md`** — one-shot auto-trigger marker Polly deletes on first invocation.

### Build — asset bundling

`pnpm --filter create-nonoise run build` runs `tsc` then `scripts/bundle-assets.mjs`, which wipes and repopulates `packages/create-nonoise/skills/` and `packages/create-nonoise/templates/` from the workspace packages. These bundled dirs are **gitignored** (see `.gitignore` lines 39–40) and produced on demand before `prepack`. The published npm tarball carries `bin/`, `dist/`, `templates/`, `skills/` — so the CLI is fully self-contained and has no runtime dependency on the workspace.

**Consequence:** editing a skill in `packages/skills/` or a template in `packages/templates/` does **not** affect what `create-nonoise` emits until you rebuild. Snapshot tests will fail first; that is the signal.

### Tests — snapshot-driven

`packages/create-nonoise/test/` has `unit/`, `validation/`, `integration/`, `snapshot/`. The snapshot suite scaffolds projects against pinned tool combinations and asserts the output tree matches. **Any change to a bundled skill or template is expected to shift snapshots** — review diffs deliberately, then update with `vitest -u`.

### Vendored packs

`packages/skills/vendor/<pack>/VENDOR.json` pins an upstream commit. `scripts/sync-vendor.mjs` fetches those pinned revisions. To bump a pack: edit the pin, re-run the sync, re-run tests, commit. Diffs are large — use `git diff --stat packages/skills/vendor/` to scope.

### Polly

Polly (`packages/skills/polly/SKILL.md`) is the SDLC orchestrator — the conductor that picks which skill to run next. She is a skill, not code. Three entry points: `/polly` slash command, phrase triggers in Copilot (`"start polly"`, `"avvia polly"`), and the `.nonoise/POLLY_START.md` first-session auto-trigger. Polly decision tree lives in `docs/polly.md`.

### Docs as source material

`docs/` is both local documentation and source material for the public site [NONoise-frmw-site](https://github.com/russosalv/NONoise-frmw-site). Author content in English; the site derives Italian translations. Don't edit the site's `src/content.js` directly — update `docs/` and re-propagate.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
