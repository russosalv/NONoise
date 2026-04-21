# Skill catalog — what ships in `.claude/skills/`

NONoise bundles **40+ skills** in total: 25 NONoise-native skills under `packages/skills/`, plus 14 vendored from [obra/superpowers](https://github.com/obra/superpowers), plus the Impeccable design pack (Anthropic-origin), plus `skill-creator` (Anthropic-origin), plus PPTX tooling. All live under `.claude/skills/` in every scaffolded project. All are plain Markdown and work cross-tool (see [`cross-tool.md`](cross-tool.md)).

This document is organised by **domain**. Each skill entry has:

- **Name** and link to SKILL.md.
- **Provenance** — see the legend below.
- **Purpose** — what it does, one paragraph.
- **Trigger** — how to invoke it (slash command, phrase, auto-trigger condition).
- **Inputs / outputs** — where it reads and writes.
- **Phase** — which SDLC step engages it (see [`sdlc.md`](sdlc.md)).

---

## Provenance legend

Every skill under `packages/skills/` falls into one of three provenance tiers. The tier is explicit on each skill's entry below so nothing reads like an indistinct mash-up of borrowed pieces.

| Tier | Meaning | Count |
|---|---|---:|
| **custom NONoise** | Written for NONoise. Includes skills whose `bmad-*` prefix is a naming convention reference to the BMAD methodology family (persona / handoff / elicitation patterns) — the implementation is NONoise-native. Some bmad-* started from a BMAD draft and were substantially rewritten for the NONoise flow (handoffs, convention mapping, integration with other skills); `bmad-req-validator` is fully NONoise-native and only the name echoes the family. | 23 |
| **imported — used as-is** | Taken from the community / Anthropic registry and dropped into the bundle without customization. The skills that fit this tier are `frontend-design`, `playwright-cli`, and the `graphify` tool (wrapped by the custom `graphify-setup`). | 2 |
| **vendored** | Installed under a namespace, pinned by commit, refreshed via `scripts/sync-vendor.mjs`. Kept as a trackable upstream dependency. Covers the `superpowers:*` pack (14), the Impeccable design pack (~19), `skill-creator` (Anthropic), and the PPTX tooling. | 35+ |

The `graphify` tool itself is external (not a skill bundled under `packages/skills/`); the bundled `graphify-setup` wires it into the project and is custom NONoise.

---

## At-a-glance

| Domain | Skills | Primary purpose |
|---|---:|---|
| [Orchestration](#orchestration) | 1 | Conduct the SDLC |
| [Requirements & discovery](#requirements--discovery) | 4 | Raw input → structured requirements |
| [Architecture & validation](#architecture--validation) | 5 | Draft and formally validate architecture |
| [Sprint & implementation](#sprint--implementation) | 2 | Break work down, run acceptance |
| [Brownfield & knowledge](#brownfield--knowledge) | 2 | Index and document existing code |
| [Ops & observability](#ops--observability) | 2 | Operate systems and triage incidents |
| [Integrations](#integrations) | 5 | Trackers, browsers, UI/UX, personas |
| [Generators](#generators) | 3 | VSCode config, docs MDs, design MD |
| [Utility](#utility) | 1 | Discover and install more skills |
| [Vendored superpowers](#vendored-superpowers) | 14 | Planning / execution / review / worktrees |
| [Vendored design pack](#vendored-impeccable-design-pack) | ~19 | UI/UX polish, audit, critique |
| [Vendored skill-creator + tooling](#vendored-skill-creator--tooling) | 2+ | Meta-skill authoring and office tooling |

> **Roadmap: core + optional packs.** The current scaffold installs every skill. Feedback from review suggested splitting into a minimal core (Polly + requirements + architecture + sprint + dev trio) plus optional packs (frontend pack, docs/analysis pack, ops pack, PM/architecture pack) chosen at scaffold time. That split is planned — see `todo.txt` at the repo root and `nonoise.config.json`'s future `packs` field.

---

## Orchestration

### `polly`
- **SKILL.md:** [`packages/skills/polly/SKILL.md`](../packages/skills/polly/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** the NONoise orchestrator. Walks the full SDLC; picks the next skill; announces `[pair]` / `[solo]` mode per step. Auto-triggers post-scaffold via `.nonoise/POLLY_START.md`. Full dedicated doc: [`polly.md`](polly.md).
- **Triggers:** `/polly` in Claude Code, *"start polly"* / *"avvia polly"* / *"run polly"* in Copilot and others, confusion-trigger (*"where do I start?"*), auto-trigger from scaffold marker.
- **Reads:** `.nonoise/POLLY_START.md`, `nonoise.config.json`, `repositories.json`, the `docs/` tree state.
- **Writes:** nothing directly; delegates to specialist skills.
- **Phase:** all.

---

## Requirements & discovery

### `requirements-ingest`
- **SKILL.md:** [`packages/skills/requirements-ingest/SKILL.md`](../packages/skills/requirements-ingest/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** turns raw PDFs / DOCX / emails / call transcripts / slide decks into structured requirement files under `docs/requirements/<domain>/<feature>.md`. Applies an explicit signal taxonomy: *functional* / *business-rule* / *UI* / *out-of-scope* / *open-question*. Parks the raw transcripts under `docs/calls/` and cross-references them from the structured files.
- **Triggers:** Polly's Step 3 (greenfield) or B4 (brownfield); manual invocation when a new batch of raw material arrives.
- **Reads:** files in any format; uses `tools/md-extractor/` for PDF / DOCX / images.
- **Writes:** `docs/requirements/`, `docs/calls/`.
- **Phase:** Requirements.

### `bmad-agent-analyst`
- **SKILL.md:** [`packages/skills/bmad-agent-analyst/SKILL.md`](../packages/skills/bmad-agent-analyst/SKILL.md)
- **Provenance:** custom NONoise — derived from the BMAD suite, customized for the NONoise flow (handoff with `arch-brainstorm`, RV capability toward `bmad-req-validator`, own `docs/requirements/` conventions).
- **Purpose:** *Isa* persona — strategic business analyst. Requirements elicitation, market / domain / tech research, PRFAQ drafting.
- **Triggers:** Polly's Step 4; manual "engage Isa" / "start the analyst".
- **Reads:** `docs/requirements/`, `docs/calls/`.
- **Writes:** `docs/requirements/`.
- **Phase:** Requirements.

### `bmad-advanced-elicitation`
- **SKILL.md:** [`packages/skills/bmad-advanced-elicitation/SKILL.md`](../packages/skills/bmad-advanced-elicitation/SKILL.md)
- **Provenance:** custom NONoise — derived from the BMAD suite, customized to hook into the NONoise personas and their method selector.
- **Purpose:** stress-tests requirement drafts through 25+ structured methods — Socratic, pre-mortem, red-team, SCAMPER, inversion, Five Whys, MoSCoW, ATAM-lite, six thinking hats, etc. Use when first-pass requirements feel too smooth.
- **Triggers:** Polly's Step 4 (optional branch); manual "stress-test these requirements".
- **Reads:** `docs/requirements/`.
- **Writes:** annotations back into the same files.
- **Phase:** Requirements.

### `bmad-req-validator`
- **SKILL.md:** [`packages/skills/bmad-req-validator/SKILL.md`](../packages/skills/bmad-req-validator/SKILL.md)
- **Provenance:** custom NONoise — fully native. The `bmad-` prefix reflects the family of conventions (persona, handoff, naming), not the origin.
- **Purpose:** scores requirement files against MoSCoW, IEEE 830, INVEST, SMART, and BABOK categories. Flags ambiguity, incompleteness, non-testability. Composed of sub-validators under `skills/` — MoSCoW validator, IEEE 830 validator, INVEST / SMART validators, ATAM-lite.
- **Triggers:** Polly's Step 4 (gate before moving to Step 5); manual "validate these requirements".
- **Reads:** `docs/requirements/`.
- **Writes:** validation reports inline in each file's frontmatter.
- **Phase:** Requirements.

---

## Architecture & validation

### `arch-brainstorm`
- **SKILL.md:** [`packages/skills/arch-brainstorm/SKILL.md`](../packages/skills/arch-brainstorm/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** Step 1 of the architecture workflow — dialogic brainstorm of architectural options. Surfaces canonical patterns first (DDD, Clean Arch, CQRS, Repository, hexagonal, event-sourcing, saga, BFF). Lists exotic options only when constraints eliminate the canonical set. Produces a draft PRD under `docs/prd/<area>/<feature>.md` with frontmatter `status: draft`.
- **Triggers:** Polly's Step 6; manual "brainstorm architecture for X".
- **Reads:** `docs/requirements/`, `docs/architecture/`, `docs/prd/`.
- **Writes:** `docs/prd/<area>/<feature>.md` (new file, status=draft).
- **Phase:** Architecture.

### `arch-decision`
- **SKILL.md:** [`packages/skills/arch-decision/SKILL.md`](../packages/skills/arch-decision/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** Step 2 of the architecture workflow — formal Quint FPF validation of a draft PRD. Runs the six-phase structured-reasoning cycle to audit the decision; updates the PRD frontmatter to `status: validated` (ship it) or `status: rejected` (back to brainstorm). Produces a per-phase audit folder at `docs/prd/<area>/audit/NN-<study>-fpf/` (co-located with the PRD, deletable in one `rm -rf`), whose `05-decision.md` is the Design Rationale Record. Produces an ADR at `docs/architecture/decisions/<ADR-N>.md`.
- **Triggers:** Polly's Step 7; manual "validate this PRD".
- **Reads:** `docs/prd/<area>/<feature>.md` (draft); `docs/architecture/01-constraints.md`; sibling `audit/NN-<study>-fpf/00-context.md` when resuming a partial cycle.
- **Writes:** same PRD (status update), `docs/prd/<area>/audit/NN-<study>-fpf/` (six per-phase markdown files), `docs/architecture/decisions/`.
- **Phase:** Architecture.

### `quint-fpf`
- **SKILL.md:** [`packages/skills/quint-fpf/SKILL.md`](../packages/skills/quint-fpf/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** First Principles Framework. A six-phase structured reasoning cycle with an audit trail and bias checks. Six main commands (`q0-init`, `q1-hypothesize`, `q1-add`, `q2-verify`, `q3-validate`, `q4-audit`, `q5-decide`) plus support commands (`q-actualize`, `q-decay`, `q-query`, `q-reset`, `q-status`). Every phase writes a dedicated markdown file (`00-context.md` … `05-decision.md`) under a single per-cycle folder, in both tooled (quint MCP present) and conversational modes. Invoked by `arch-decision` but also usable standalone for any "I need to think from first principles about X" situation.
- **Triggers:** `arch-decision` invokes it (passing `--target docs/prd/<area>/audit/NN-<study>-fpf/`); manual `/q0-init` to start a fresh cycle (auto-derives a slug → `docs/fpf/<slug>/`).
- **Reads:** whatever the cycle hypothesises about (a PRD, a requirement, a decision); the active cycle's `00-context.md` to locate the output folder across phases.
- **Writes:** per-phase markdown trail under `docs/fpf/<slug>/` (standalone) or the caller-supplied `--target` folder (e.g. `docs/prd/<area>/audit/NN-<study>-fpf/`). In tooled mode, also `.quint/knowledge/`, `.quint/decisions/` via MCP.
- **Phase:** Architecture (primary) / ad-hoc reasoning (secondary).

### `bmad-agent-architect`
- **SKILL.md:** [`packages/skills/bmad-agent-architect/SKILL.md`](../packages/skills/bmad-agent-architect/SKILL.md)
- **Provenance:** custom NONoise — derived from the BMAD suite, customized for the NONoise flow (direct integration with `arch-brainstorm` / `arch-decision`, Quint FPF as default validator, bias toward canonical patterns).
- **Purpose:** *Alex* persona — system architect. Drives the `arch-brainstorm` → `arch-decision` → source-of-truth loop. Opinionated about canonical patterns, parametric memory, symmetry, local deducibility. Refuses opaque binary dependencies.
- **Triggers:** Polly's Steps 6-7 (persona layer on top of the skills); manual "engage Alex" / "start the architect".
- **Reads / writes:** same surface as `arch-brainstorm` and `arch-decision`.
- **Phase:** Architecture.

### `c4-doc-writer`
- **SKILL.md:** [`packages/skills/c4-doc-writer/SKILL.md`](../packages/skills/c4-doc-writer/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** maintains living C4 diagrams (Context / Container / Component / Code) via a single Structurizr DSL workspace at `docs/architecture/c4/workspace.dsl`. Regenerates Mermaid / PlantUML / Structurizr / DOT views on demand. Stack-neutral.
- **Triggers:** after `arch-decision` returns PASS (the "Impact on docs/architecture/" checklist calls this skill); `/c4 update`, "update c4", "generate C4 diagrams", "rebuild the container view after this ADR", "structurizr", "sync the C4 with the new PRD".
- **Reads:** `docs/architecture/c4/workspace.dsl`, recent ADRs.
- **Writes:** same DSL file + rendered views under `docs/architecture/c4/views/`.
- **Phase:** Architecture (post-validation).
- **References:** `references/structurizr-dsl-cheatsheet.md`, `references/c4-levels-primer.md`, `references/install-structurizr.md`.

---

## Sprint & implementation

### `sprint-manifest`
- **SKILL.md:** [`packages/skills/sprint-manifest/SKILL.md`](../packages/skills/sprint-manifest/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** Step 3 of the architectural workflow — promotes validated PRDs to a sprint. Breaks work into macro functional tasks (vertical slices where possible), assigns confidence levels (CL1 = trivial / well-specified, CL2 = normal, CL3 = spike / unknown).
- **Triggers:** Polly's Step 8.
- **Reads:** validated PRDs under `docs/prd/`.
- **Writes:** `docs/sprints/Sprint-N/manifest.md`, plus per-task files if the sprint is large.
- **Phase:** Sprint.

### `atr`
- **SKILL.md:** [`packages/skills/atr/SKILL.md`](../packages/skills/atr/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** Acceptance Test Runner. Reads acceptance criteria from the sprint manifest, generates a testbook, executes via Playwright, produces Markdown reports with screenshots. Mentions VibeKanban as a push target for failures (info-only — see [`external-tools.md`](external-tools.md)).
- **Triggers:** dev trio Step 3; manual "run ATR" after implementation.
- **Reads:** `docs/sprints/Sprint-N/manifest.md`, acceptance-criteria references.
- **Writes:** `docs/sprints/Sprint-N/acceptance/<report>.md`, screenshot assets.
- **Phase:** Implementation (acceptance sub-phase).
- **References:** `references/output-templates.md`, `references/vibekanban-integration.md`.

---

## Brownfield & knowledge

### `graphify-setup`
- **SKILL.md:** [`packages/skills/graphify-setup/SKILL.md`](../packages/skills/graphify-setup/SKILL.md)
- **Provenance:** custom NONoise. Wraps the external `graphify` tool (used as-is) and wires it into the project.
- **Purpose:** installs the `graphify` knowledge-graph tool and wires its usage rules into the project. After this skill runs, `graphify .` produces `graphify-out/GRAPH_REPORT.md` + a JSON/HTML graph. Usage rules include a hook that reminds the AI to read `GRAPH_REPORT.md` before searching raw files.
- **Triggers:** Polly's Step B2; manual "setup graphify".
- **Reads:** project state (for rule wiring).
- **Writes:** `.claude/settings.json` (hook), `.gitignore` (adds `graphify-out/cache/`), context-file stanza.
- **Phase:** Brownfield.

### `reverse-engineering`
- **SKILL.md:** [`packages/skills/reverse-engineering/SKILL.md`](../packages/skills/reverse-engineering/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** versioned reverse-engineering dossier for any subject — legacy codebase, third-party API, data pipeline. Interactive Q&A with the user; explicit save trigger. Dossiers accumulate under `docs/support/reverse/<subject>/`.
- **Triggers:** Polly's Step B3; manual "reverse-engineer X", "document how Y works".
- **Reads:** the target codebase / API / pipeline; graphify output if available.
- **Writes:** `docs/support/reverse/<subject>/chapters/*.md`, `docs/support/reverse/<subject>/changelog.md`.
- **Phase:** Brownfield.

---

## Ops & observability

### `ops-skill-builder`
- **SKILL.md:** [`packages/skills/ops-skill-builder/SKILL.md`](../packages/skills/ops-skill-builder/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** meta-skill — coaches any ops task (deploy, pipeline, provision, migrate, restore, rotate secrets) through a five-phase *access-first coach-then-crystallise* flow: (1) elicit goal, (2) access menu **CLI > API > Web**, (3) context gather, (4) paired execution with dry-run default, (5) crystallise the workflow into a project-local skill via `skill-creator`. The idea: every ops task your team does twice should become a skill the third time.
- **Triggers:** Polly's Step 10 (ongoing); manual "help me deploy", "build an ops skill for X".
- **Reads:** the target ops system; the team's existing ops skills.
- **Writes:** a new project-local skill under `.claude/skills/ops-<name>/`.
- **Phase:** Operations / ongoing.
- **References:** `references/access-patterns.md`, `references/dry-run-default.md`, `references/ops-crystallisation.md`.

### `observability-debug`
- **SKILL.md:** [`packages/skills/observability-debug/SKILL.md`](../packages/skills/observability-debug/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** backend-agnostic trace / log triage. Adapter pattern for App Insights, Datadog, Grafana+Loki, CloudWatch, OpenTelemetry Collector, generic log files. Canonical event shape across adapters. Root-causes incidents with file:line precision.
- **Triggers:** on incident; manual "debug the error at X", "triage this trace ID".
- **Reads:** the observability backend via its CLI (CLI > API > Web from the access-first principle).
- **Writes:** incident reports under `docs/support/incidents/<date>-<id>.md`.
- **Phase:** Operations / ongoing.
- **References:** one adapter file per backend — `references/adapter-app-insights.md`, `references/adapter-datadog.md`, `references/adapter-grafana-loki.md`, `references/adapter-cloudwatch.md`, `references/adapter-otel-collector.md`, `references/adapter-generic-log-file.md`.

---

## Integrations

### `spec-to-workitem`
- **SKILL.md:** [`packages/skills/spec-to-workitem/SKILL.md`](../packages/skills/spec-to-workitem/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** translates sprint manifest tasks into work items on an external tracker via the adapter pattern. Adapters: GitHub Issues, Azure DevOps, Jira, Linear, plus a `dryrun` adapter for verification without hitting a real tracker.
- **Triggers:** after `sprint-manifest`; manual "push the sprint to Azure DevOps".
- **Reads:** `docs/sprints/Sprint-N/manifest.md`.
- **Writes:** work items in the tracker; a mapping file under `docs/sprints/Sprint-N/workitem-map.json`.
- **Phase:** Sprint.

### `playwright-cli`
- **SKILL.md:** [`packages/skills/playwright-cli/SKILL.md`](../packages/skills/playwright-cli/SKILL.md)
- **Provenance:** **imported — used as-is** from the community skill registry. Not customized. `atr` calls it through its standard interface.
- **Purpose:** browser automation — navigation, form filling, screenshots, data extraction, request mocking, session management, storage state, trace / webm recording, test-code generation. Used by `atr` under the hood; also usable standalone.
- **Triggers:** invoked by `atr`; manual "drive the browser to X", "record a Playwright test for Y".
- **Reads:** the target web app.
- **Writes:** `tests/playwright/` under the project (if generating tests), screenshots / webms under `atr` output.
- **Phase:** Implementation / acceptance.
- **References:** `references/request-mocking.md`, `references/running-code.md`, `references/session-management.md`, `references/storage-state.md`.

### `frontend-design`
- **SKILL.md:** [`packages/skills/frontend-design/SKILL.md`](../packages/skills/frontend-design/SKILL.md)
- **Provenance:** **imported — used as-is** from the community skill registry. Not customized. Polly calls it through its standard interface; the NONoise-side hook sits inside `bmad-agent-ux-designer` (Giulia), which hands off to it.
- **Purpose:** production-grade frontend interfaces with high design quality. Explicitly avoids the generic-AI aesthetic. Creates distinctive, polished code for web components, pages, artefacts, posters, applications.
- **Triggers:** Polly's Step 5 (when feature has UI); manual "design this UI", "build this component".
- **Reads:** `DESIGN.md` if present, the feature requirements.
- **Writes:** frontend code under `src/` following the project's stack.
- **Phase:** Feature design + implementation.

### `bmad-agent-ux-designer`
- **SKILL.md:** [`packages/skills/bmad-agent-ux-designer/SKILL.md`](../packages/skills/bmad-agent-ux-designer/SKILL.md)
- **Provenance:** custom NONoise — derived from the BMAD suite, customized for the NONoise flow (DESIGN.md as source of truth, direct handoff to `frontend-design`, integration with the final polish pass).
- **Purpose:** *Giulia* persona — UX designer. Interaction design, `DESIGN.md` authoring, UI critique.
- **Triggers:** Polly's Step 5; manual "engage Giulia".
- **Reads / writes:** `DESIGN.md`, feature requirements.
- **Phase:** Feature design.

### `bmad-agent-tech-writer`
- **SKILL.md:** [`packages/skills/bmad-agent-tech-writer/SKILL.md`](../packages/skills/bmad-agent-tech-writer/SKILL.md)
- **Provenance:** custom NONoise — derived from the BMAD suite, customized for the NONoise flow (output under the NONoise `docs/` tree, collaboration with `reverse-engineering` for brownfield, own template conventions).
- **Purpose:** *Daniel* persona — tech writer. READMEs, user guides, API docs, Mermaid diagrams.
- **Triggers:** manual "engage Daniel", "write the docs for X".
- **Reads:** the feature / module to document.
- **Writes:** READMEs, user guides, API docs anywhere appropriate.
- **Phase:** Ongoing (any phase with a doc deliverable).

---

## Generators

### `vscode-config-generator`
- **SKILL.md:** [`packages/skills/vscode-config-generator/SKILL.md`](../packages/skills/vscode-config-generator/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** generates `.vscode/tasks.json` + `.vscode/launch.json` based on detected stack (Node, .NET, Python). Saves setup time on new projects.
- **Triggers:** manual "generate VS Code config"; optionally on scaffold.
- **Reads:** the project's package.json / .csproj / pyproject.toml.
- **Writes:** `.vscode/`.
- **Phase:** Scaffolding / environment setup.

### `docs-md-generator`
- **SKILL.md:** [`packages/skills/docs-md-generator/SKILL.md`](../packages/skills/docs-md-generator/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** keeps `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` coherent from a single source-of-truth. Prevents drift between tool-specific context files.
- **Triggers:** manual "regenerate context files"; optionally on scaffold and on context-file edits.
- **Reads:** the master source file.
- **Writes:** the three context files.
- **Phase:** Scaffolding / ongoing.

### `design-md-generator`
- **SKILL.md:** [`packages/skills/design-md-generator/SKILL.md`](../packages/skills/design-md-generator/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** generates a `DESIGN.md` design-system document in the Stitch format popularised by `getdesign.md`.
- **Triggers:** manual "generate DESIGN.md", "create the design system doc".
- **Reads:** the frontend code / feature description.
- **Writes:** `DESIGN.md`.
- **Phase:** Feature design.

---

## Utility

### `skill-finder`
- **SKILL.md:** [`packages/skills/skill-finder/SKILL.md`](../packages/skills/skill-finder/SKILL.md)
- **Provenance:** custom NONoise.
- **Purpose:** discovers AI skills from a curated registry (Anthropic official, plugin marketplaces, community, awesome-lists) and installs them into the project. Keeps the skill library growing without manual hunt.
- **Triggers:** manual "find a skill for X", "install a skill", "search for skills about Y".
- **Reads:** registry sources configured in `packages/skills/skill-finder/scripts/`.
- **Writes:** new skills under `.claude/skills/<name>/`.
- **Phase:** Ongoing.

---

## Vendored — `superpowers:*` (14 skills)

All 14 come from [obra/superpowers](https://github.com/obra/superpowers), pinned via `packages/skills/vendor/superpowers/VENDOR.json` and refreshed via `node scripts/sync-vendor.mjs`. Namespaced as `superpowers:<name>` in Claude Code; referenced by file path in other tools.

**Planning & execution:**

- **`superpowers:brainstorming`** — explores user intent, requirements, design before implementation. Invoked by Polly's Step 5 (feature design) and before any creative implementation work.
- **`superpowers:writing-plans`** — produces an implementation plan (`plan.md`) for a multi-step task. Step 1 of the dev trio.
- **`superpowers:executing-plans`** — executes a written plan in a separate session with review checkpoints. Step 2 of the dev trio.
- **`superpowers:subagent-driven-development`** — executes a plan with independent tasks dispatched to sub-agents; two-stage review (spec compliance + code quality).
- **`superpowers:dispatching-parallel-agents`** — for 2+ truly independent tasks; parallelises without shared state.

**Quality & review:**

- **`superpowers:test-driven-development`** — red → green → refactor per unit. Mandatory inside `executing-plans`.
- **`superpowers:verification-before-completion`** — never claim done without running the check. Mandatory before committing or creating a PR.
- **`superpowers:systematic-debugging`** — evidence-based debugging, root-cause tracing, defense-in-depth, condition-based waiting. Use on any unexpected test failure.
- **`superpowers:requesting-code-review`** — verifies work meets requirements before merge.
- **`superpowers:receiving-code-review`** — implement review feedback with technical rigor, not performative agreement.

**Workflow:**

- **`superpowers:using-git-worktrees`** — isolates feature work from the current workspace.
- **`superpowers:finishing-a-development-branch`** — structured options for merge / PR / cleanup when implementation is complete.
- **`superpowers:writing-skills`** — meta-skill for authoring new skills; verifies they work before deployment.
- **`superpowers:using-superpowers`** — the entry-point skill that makes the superpowers ecosystem discoverable from any tool.

## Vendored — Impeccable design pack

The [Impeccable design skills](https://github.com/impeccable-skills) ship as a vendor pack under `packages/skills/vendor/impeccable/`. ~19 skills covering UI/UX design polish across the design lifecycle: `adapt`, `animate`, `audit`, `bolder`, `clarify`, `colorize`, `critique`, `delight`, `extract`, `harden`, `normalize`, `onboard`, `optimize`, `polish`, `quieter`, `simplify`, `teach-impeccable`, and the orchestrator `frontend-design`. Each is invoked by the namespaced `impeccable:<name>` trigger in Claude Code.

Use these after `frontend-design` produces the initial implementation to progressively raise quality: `polish` for spacing / alignment, `audit` for accessibility and responsive design, `harden` for i18n and error states, `animate` for micro-interactions.

## Vendored — skill-creator + tooling

- **`skill-creator`** — Anthropic's meta-skill for authoring new skills from scratch, editing existing ones, running evals, benchmarking. Used by `ops-skill-builder` in the crystallise phase.
- **PPTX tooling** (`packages/skills/vendor/pptx/`) — office-file-unpacking utilities (unpack, clean, duplicate-slide, redline-simplifier, slide-operations, merge-runs, schema-validation for DOCX / PPTX / XLSX). Useful when a team needs to manipulate Office artefacts programmatically (common for requirements-ingest on slide-deck source material).

---

## Authoring a new skill

See [`installation.md`](installation.md) §Dev loop for skill authors. The short version:

1. Create `packages/skills/<your-skill>/SKILL.md` with `name` and `description` frontmatter.
2. Add `references/`, `assets/`, `scripts/` subfolders as needed.
3. `pnpm --filter create-nonoise run build` to rebundle assets.
4. `pnpm --filter create-nonoise exec vitest run` to verify snapshot tests still pass (add a new snapshot if the skill is new).
5. Use `superpowers:writing-skills` from inside this repo to lint and red-green-refactor the skill description and body.

---

## Roadmap — core + optional packs

Per `todo.txt` feedback, the future scaffold will install only a **core** pack by default and let the user opt into additional packs:

| Pack | Contents |
|---|---|
| **Core** (always) | `polly`, `requirements-ingest`, `bmad-agent-analyst`, `arch-brainstorm`, `arch-decision`, `quint-fpf`, `sprint-manifest`, `atr`, dev trio (superpowers:*). Context files. 3-5 generator skills. |
| **Frontend pack** | `frontend-design`, `playwright-cli`, Impeccable skills, `bmad-agent-ux-designer`, `design-md-generator`. |
| **Docs/Analysis pack** | `docs-md-generator`, `requirements-ingest` extras, `reverse-engineering`, `graphify-setup`, `bmad-advanced-elicitation`, `bmad-req-validator`. |
| **Ops/Observability pack** | `observability-debug`, `ops-skill-builder`, `skill-creator`. |
| **PM/Architecture pack** | `bmad-agent-architect`, `spec-to-workitem`, `c4-doc-writer`, `bmad-agent-tech-writer`. |

Plus an **update** story: `nonoise update --check` (compares local manifest with registry, prints "3 updates available"), `nonoise update` / `nonoise add <pack>` (apply manually). Auto-check yes; auto-apply no — the principle is *the user decides when to apply*, because auto-update breaks reproducibility and trust.

Not implemented yet. When implemented, the relevant bits of `nonoise.config.json` will carry a `packs` array with `name` + `version` + `source_commit` per installed pack.
