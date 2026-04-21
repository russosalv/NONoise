# SDLC — the full lifecycle NONoise walks you through

NONoise covers the entire software development lifecycle, from raw stakeholder input to merged pull request. The lifecycle is **orchestrated by Polly** (see [`polly.md`](polly.md) for the decision tree); this document describes the *flow itself* — every phase, every skill, every handoff, skip rules, and the brownfield prefix.

## Overview

```
                              ┌─ greenfield start
                              │
   raw input ─▶ REQUIREMENTS ─┼─▶ ARCHITECTURE ─▶ SPRINT ─▶ DEV LOOP ─▶ ACCEPTANCE
                              │                                            │
                              │                                            └─▶ MERGE
     existing code ─▶ INDEX ─▶│
                              │
                              └─ brownfield start
```

Every arrow is annotated `[pair]` or `[solo]`. The phases run in that order; skip rules (§Skip rules) let you elide phases that don't apply to the current task.

## Phases

### Phase 1 — Requirements & Discovery

**Goal:** turn raw stakeholder input (PDFs, DOCX, emails, call transcripts, slide decks, voice recordings) into structured, AI-readable requirement files under `docs/requirements/`.

**Skills invoked (in order):**

- `requirements-ingest` — `[pair]` — raw source material → `docs/requirements/<domain>/<feature>.md` with explicit signal taxonomy: functional / business-rule / UI / out-of-scope / open-question. Parks raw transcripts under `docs/calls/` with cross-references.
- `bmad-agent-analyst` (Isa persona) — `[pair]` — requirements elicitation conversation; produces or extends the requirement files. Strategic business analyst role: market / domain / technical research, PRFAQ drafting, stakeholder-facing language.
- `bmad-advanced-elicitation` — `[pair]` — stress-tests draft requirements through 25+ structured methods (Socratic, pre-mortem, red-team, SCAMPER, inversion, Five Whys, MoSCoW, ATAM-lite, six thinking hats). Use when the first-pass requirements feel too smooth to be true.
- `bmad-req-validator` — `[pair]` — scores requirement files against MoSCoW, IEEE 830, INVEST, SMART, BABOK categories. Flags ambiguity, incompleteness, non-testability.

**Phase output:** a populated `docs/requirements/` tree with every known requirement tagged, cross-referenced to source material, and validated.

**Skip rules:** pure refactors (no new feature) skip this phase if `docs/requirements/` is already current. Brownfield projects may enter at the `reverse-engineering` prefix and pick up here once legacy is documented.

### Phase 2 — Feature Design

**Goal:** turn validated requirements into a concrete feature / product design — still at the *what*, not the *how*.

**Skills invoked:**

- `superpowers:brainstorming` — `[pair]` — structured brainstorm of design options. Explicitly not architecture (that's phase 3). This is "what should the feature look like from the user's perspective; what shape of interaction / UI / API makes sense".
- `bmad-agent-ux-designer` (Giulia persona) — `[pair]` — if the feature has UI surface, interaction design + `DESIGN.md` authoring + UI critique.
- `frontend-design` — `[pair]` — production-grade frontend interfaces with high design quality. Avoids the generic-AI look. Use when the feature has visible surface and you want the design to stand on its own.
- `design-md-generator` — `[solo]` — optional; generates a `DESIGN.md` design-system document in the Stitch format, for teams that want a formal design system.

**Phase output:** a design document the architect can take to phase 3. Often this is prose + wireframe descriptions + API sketch.

**Skip rules:** architectural-only studies (no concrete feature) skip this phase; pure refactors skip too.

### Phase 3 — Architecture

**Goal:** turn the feature design into an architectural plan — the *how*, the patterns, the containers, the components, the trade-offs. The output is a PRD under `docs/prd/<area>/` with frontmatter `status: draft` → `validated` / `rejected`.

This is the phase where NONoise's opinion is loudest (see [`philosophy.md`](philosophy.md) §7 *Canonical over exotic*).

**Skills invoked (in order):**

- `arch-brainstorm` — `[pair]` — dialogic brainstorm of architecture options. Surfaces canonical patterns first, lists exotic options only when constraints eliminate the canonical set. Produces a draft PRD under `docs/prd/<area>/<feature>.md`.
- `bmad-agent-architect` (Alex persona) — `[pair]` — system architect persona. Drives the arch-brainstorm → arch-decision loop. Pushes hard on parametric-memory considerations, symmetry, local deducibility. No opaque binary dependencies.
- `arch-decision` — `[pair]` — formal Quint FPF validation of the draft PRD. Updates the frontmatter to `validated` (ship it) or `rejected` (back to brainstorm). This is where exotic deviations are audited.
- `quint-fpf` — `[pair]` — First Principles Framework. Six phases: `q0-init` → `q1-hypothesize` / `q1-add` → `q2-verify` → `q3-validate` → `q4-audit` → `q5-decide`. Structured reasoning with audit trail and bias checks. Each phase emits a dedicated markdown file (`00-context.md` … `05-decision.md`) under a single per-cycle folder — `docs/fpf/<slug>/` for standalone runs, `docs/prd/<area>/audit/NN-<study>-fpf/` when invoked by `arch-decision` — so the whole reasoning trail is reviewable in git and removable with `rm -rf`. Support commands: `q-actualize` (reconcile with repo state), `q-decay` (evidence freshness), `q-query` (search KB), `q-reset` (reset cycle), `q-status` (show status).
- `c4-doc-writer` — `[solo]` — after `arch-decision` returns PASS, updates `docs/architecture/c4/workspace.dsl` (Structurizr DSL) and regenerates Context / Container / Component views. Keeps living C4 diagrams in sync with validated decisions.
- `arch-sync` — `[solo]` — optional projection of the validated PRD into `docs/architecture/`. Suggested by Polly right after `arch-decision` PASS (never automatic). Parses the strict `[file: NN.md]` checklist from `05-decision.md`, shows a unified diff per file, applies only the diffs the architect approves, writes a sync report.

**Phase output:** a `validated` PRD under `docs/prd/<area>/` plus updated `docs/architecture/` (including C4 views). The sprint phase takes this as input.

**Skip rules:** simple features on a well-known existing architecture skip phase 3 entirely — the `arch-decision` skill's rule-of-thumb test ("would a reasonable senior want a new ADR for this change?") decides. See §Skip rules for the full set.

### Phase 4 — Sprint Breakdown

**Goal:** promote validated PRDs into a sprint. Decompose work into macro functional tasks, assign confidence levels, and produce an executable sprint manifest.

**Skills invoked:**

- `sprint-manifest` — `[pair]` — promotes one or more validated PRDs to a sprint under `docs/sprints/Sprint-N/`. Breaks each PRD into macro functional tasks (vertical slices where possible). Assigns CL1 / CL2 / CL3 confidence levels (CL1 = trivial, well-specified; CL2 = normal; CL3 = spike, unknown).
- `spec-to-workitem` — `[solo]` — translates the manifest into work items on GitHub Issues, Azure DevOps, Jira, or Linear via adapters. Optional — teams that don't use an external tracker can skip.

**Phase output:** `docs/sprints/Sprint-N/manifest.md` + optionally, work items created in the external tracker.

### Phase 5 — Implementation (dev trio + ATR)

**Goal:** execute each sprint task under test-driven development, with a plan-then-implement cycle and a final acceptance pass.

This is where the phase is explicitly **`[solo]`** — one developer per task, smaller models fine, parallelisable. The *dev trio* is the backbone:

```
  ┌─ writing-plans ───────────▶ plan.md (reviewed before execution)
  │
  ├─ executing-plans ─────────▶ implementation
  │   ├─ test-driven-development  (red → green → refactor per unit)
  │   └─ dispatching-parallel-agents  (when sub-tasks are independent)
  │
  ├─ atr ─────────────────────▶ acceptance report (Playwright + testbook)
  │
  └─ finishing-a-development-branch ▶ merge or PR
```

**Skills invoked:**

- `superpowers:writing-plans` — draft a plan before writing code. Explicit, reviewable, bite-sized.
- `superpowers:executing-plans` — follow the plan step by step.
- `superpowers:test-driven-development` — inside each plan step, red → green → refactor.
- `superpowers:dispatching-parallel-agents` — when sub-tasks are genuinely independent, parallelise.
- `superpowers:subagent-driven-development` — optional; for large tasks that benefit from sub-agent delegation under a spec reviewer + code quality reviewer two-stage review.
- `superpowers:systematic-debugging` — when a test fails unexpectedly, use this instead of shotgun-patching.
- `superpowers:verification-before-completion` — never claim "done" without running the actual check.
- `atr` — acceptance test runner. Reads acceptance criteria from the sprint manifest, generates a testbook, executes via Playwright, produces Markdown reports with screenshots. Mentions VibeKanban as a push target for failures (info-only — see [`external-tools.md`](external-tools.md)).
- `superpowers:requesting-code-review` / `superpowers:receiving-code-review` — code review with technical rigor, not performative agreement.
- `superpowers:using-git-worktrees` — when a task needs isolation from the current workspace.
- `superpowers:finishing-a-development-branch` — merge, PR, cleanup with structured options.

**Phase output:** merged code + acceptance report under `docs/sprints/Sprint-N/acceptance/`.

### Phase 6 — Observability & Operations (ongoing, post-merge)

Not a phase in the sprint sense, but a continuous capability NONoise wires up:

- `observability-debug` — backend-agnostic trace / log triage. Adapters for App Insights, Datadog, Grafana+Loki, CloudWatch, OpenTelemetry Collector, generic log files. Root-causes incidents with file:line precision.
- `ops-skill-builder` — meta-skill. Coaches any ops task (deploy, pipeline, provision, migrate) through a five-phase access-first flow (elicit goal → access menu CLI > API > Web → context gather → paired execution → crystallise into a project-local skill via `skill-creator`). The idea is that every ops task your team does twice should become a skill the third time.

**When to invoke:** on incident (observability-debug), on repeated manual work (ops-skill-builder).

## Greenfield path

This is the baseline path, applied when `docs/` is empty:

```
Step  Phase                            Mode     Skill(s)
────  ─────                            ────     ────────
 1    Voice-input hint (once)          —        — (Polly Step 0)
 2    Greenfield or brownfield?        [pair]   — (Polly Step 1)
 3    Stack question                   [pair]   —
 4    Existing source material?        [pair]   requirements-ingest
 5    Requirements elicitation         [pair]   bmad-agent-analyst (+ bmad-advanced-elicitation, + bmad-req-validator)
 6    Feature / product design         [pair]   superpowers:brainstorming (+ bmad-agent-ux-designer, + frontend-design)
 7    Architecture options             [pair]   arch-brainstorm (if non-trivial)
 8    Architecture decision            [pair]   arch-decision (+ quint-fpf, + Phase 5.5 human gate)
 8b   Living C4 diagrams               [solo]   c4-doc-writer (after arch-decision PASS)
 8c   Arch source-of-truth sync        [solo]   arch-sync (after arch-decision PASS, optional)
 9    Sprint breakdown                 [pair]   sprint-manifest (+ spec-to-workitem)
10    Implementation — per task        [solo]   superpowers:writing-plans
                                                  → executing-plans
                                                    → test-driven-development
                                                    → dispatching-parallel-agents (where applicable)
                                                → atr (acceptance)
                                                → superpowers:finishing-a-development-branch
```

## Brownfield prefix

Applied when starting on an existing codebase. Inserted before the greenfield flow:

```
Step  Phase                            Mode     Skill(s)
────  ─────                            ────     ────────
B1    Path of the existing code        [pair]   —
B2    Index the codebase               [pair]   graphify-setup  →  graphify .
B3    Understand what's there          [pair]   reverse-engineering (interactive Q&A, versioned dossier)
B4    Existing source material         [pair]   requirements-ingest
B5    Re-enter greenfield at step 6    —        (new feature) or step 7 (architectural change)
```

**Graphify.** `graphify-setup` installs the knowledge-graph tool; `graphify .` produces `graphify-out/GRAPH_REPORT.md` + a JSON/HTML graph. The report lists god-nodes (most connected — the system's core abstractions), community hubs (semantic clusters), surprising connections, and knowledge gaps (isolated nodes = possible doc gaps). **Read `GRAPH_REPORT.md` before diving into raw files** — a pre-tool hook reminds you to do so.

**Reverse engineering.** The `reverse-engineering` skill maintains a versioned dossier per subject (legacy codebase, third-party API, data pipeline) under `docs/support/reverse/<subject>/`. Interactive Q&A, explicit save trigger. Dossiers accumulate — re-entry into a brownfield project reads the dossier first.

## Skip rules

Not every task walks every phase. Polly applies these skip rules:

| Task shape | Skip | Enter at |
|---|---|---|
| **Pure refactor**, no new feature, no architectural change | Phases 1 (if reqs current), 2, 3 | Phase 4 with a refactor-task |
| **Simple feature**, well-known existing architecture | Phase 3 (no new ADR needed) | Phase 4 with the feature-task; `sprint-manifest` consumes the existing design doc directly |
| **Architectural study** with no concrete feature yet | Phase 2 | Phase 3 with an area-slug; phase 4 waits until a feature materialises |
| **Bug fix** with clear reproduction | Phases 1, 2, 3, 4 | Phase 5 directly; use `superpowers:systematic-debugging` |
| **Brownfield (first entry)** | — | Brownfield prefix B1–B5, then re-enter |
| **Brownfield (subsequent entry)**, previous dossier current | B1, B2, B3 | B4 (or phase 1, depending on what changed) |

Polly announces which rule applies and why, so the team can disagree if the rule misjudged.

## Auto-trigger mechanics

The SDLC starts before you ask for it, on the very first session of a freshly-scaffolded project:

1. `create-nonoise` writes `.nonoise/POLLY_START.md` to the project root.
2. The scaffold-generated `CLAUDE.md` includes an instruction block: *"if `.nonoise/POLLY_START.md` exists, your first action this session is to invoke Polly, then delete the file."*
3. `.github/copilot-instructions.md` has the equivalent block for Copilot.
4. Cursor / Gemini CLI / Codex receive the block in their respective entry files (`.cursor/rules.md`, `GEMINI.md`, `AGENTS.md`) but with a phrased trigger rather than a slash command.
5. Polly deletes the marker after the first run. Subsequent sessions require manual `/polly` or "start polly" to re-engage.

See [`polly.md`](polly.md) §Triggers for details.

## Multi-repo workspace mode

NONoise has a multi-repo template variant (roadmap item — `repositories.json` + `./scripts/clone-all.sh` + `./scripts/switch-branch.sh` + `./scripts/pull-all.sh`). When Polly detects a multi-repo workspace, she announces:

- Skills live at workspace root (not inside sub-repos).
- Sub-repos clone under `repos/<path>` via `clone-all`.
- `switch-branch` aligns every sub-repo to the same branch — compatible with VibeKanban treating the workspace as one unit.
- Per-repo skill propagation is on demand: "if you need skills inside a specific sub-repo, I can copy `.claude/` there — just ask."

Details in [`docs-hierarchy.md`](docs-hierarchy.md) §Multi-repo.

## Further reading

- [`polly.md`](polly.md) — the full decision tree, phrasing per step, pair/solo rationale, three-way resume routing for brownfield.
- [`skills-catalog.md`](skills-catalog.md) — what each skill actually does, trigger surface, references.
- [`docs-hierarchy.md`](docs-hierarchy.md) — where phase outputs land and who owns each folder.
- [`packages/skills/polly/SKILL.md`](../packages/skills/polly/SKILL.md) — the authoritative Polly specification (this document summarises; the SKILL.md runs).
- [`packages/skills/polly/references/decision-tree.md`](../packages/skills/polly/references/decision-tree.md) — full decision-tree text with mode tags and routing table.
