# SDLC — the full lifecycle NONoise supports

NONoise covers the entire software development lifecycle, from raw stakeholder input to merged pull request. Skills are the primary engagement path; **Polly** is the opt-in advisor that reads where you are in the flow and points at the next skill when intent is ambiguous (see [`polly.md`](polly.md) for details). This document describes the *flow itself* — every phase, every skill, every handoff, skip rules, and the brownfield prefix.

Every scaffolded project ships with `.nonoise/sdlc-flow.md`, an editable version of this flow that Polly reads at runtime.

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

## Development modes

The flow is sized to the work. Every task runs in one of three modes, chosen with `/polly quick|medium|long <goal>` or inferred by Polly from the goal:

| Mode | Fits | Runs |
|---|---|---|
| **quick** | a fix, a tweak, one or two files | implement → verify. No documents, no subagents, never FPF |
| **medium** (default) | a feature or refactor inside an already-decided architecture | short spec → plan → implement → verify. FPF only if the gate fires |
| **long** | a new product, an epic, anything that changes the architecture | every phase below, in order. FPF whenever the gate fires |

The phases described in this document are the **long** flow. Medium uses Phase 2 (a short spec) and Phase 5; quick uses Phase 5 only, without a plan document. Each phase in `.nonoise/sdlc-flow.md` lists its `modes`, and `default_mode` applies when nothing else decides. Full description, including how Codex and Copilot apply the same modes: [`development-modes.md`](development-modes.md).

In Claude Code the mode also sets how the session works: NONoise installs the [Regia](regia.md) mod, whose `/regia quick|medium|long` are the same three modes. In medium the main session delegates the independent pieces; in long it orchestrates. In both, Regia picks model and effort for each delegated task and can run swarms of Claude, Codex, Qwen/Qoder and Copilot agents. The other tools get the table above in their context file and use their own subagent features.

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

- `reuse-first` — first step of the phase, skipped in quick mode — before anything new is designed, checks what already solves the problem (this codebase, the project's dependencies, the platform, then maintained packages) and records an adopt / extend / build decision in a "Reuse check" section of the spec.
- `superpowers:brainstorming` — `[pair]` — structured brainstorm of design options. Explicitly not architecture (that's phase 3). This is "what should the feature look like from the user's perspective; what shape of interaction / UI / API makes sense".
- `bmad-agent-ux-designer` (Giulia persona) — `[pair]` — if the feature has UI surface, interaction design + `DESIGN.md` authoring + UI critique.
- `frontend-design` — `[pair]` — production-grade frontend interfaces with high design quality. Avoids the generic-AI look. Use when the feature has visible surface and you want the design to stand on its own.
- `design-md-generator` — `[solo]` — optional; generates a `DESIGN.md` design-system document in the Stitch format, for teams that want a formal design system.

**Agents invoked, when the feature lands in existing code** (see [`agents.md`](agents.md)):

- `graph-explorer` — maps how the area works today (entry points, call path, layers, conventions, reusable pieces) by querying the code graph first. Its output becomes the "Existing behaviour" section of the spec.
- `blueprint-architect` — then derives a file-level blueprint from the approved spec: files to create and change, interfaces, data flow, a build sequence. It works inside the decided architecture and hands a costly-to-reverse choice back to Phase 3. The blueprint is in place before the spec is closed.

**Phase output:** a design document the architect can take to phase 3. Often this is prose + wireframe descriptions + API sketch.

**Skip rules:** architectural-only studies (no concrete feature) skip this phase; pure refactors skip too.

### Phase 3 — Architecture

**Goal:** turn the feature design into an architectural plan — the *how*, the patterns, the containers, the components, the trade-offs. The output is a PRD under `docs/prd/<area>/` with frontmatter `status: draft` → `validated` / `rejected`.

This is the phase where NONoise's opinion is loudest (see [`philosophy.md`](philosophy.md) §7 *Canonical over exotic*).

**Skills invoked (in order):**

- `reuse-first` — first step of `arch-brainstorm`, so the options build on what already exists; in existing code `graph-explorer` maps the area before the options are drawn.
- `arch-brainstorm` — `[pair]` — dialogic brainstorm of architecture options. Surfaces canonical patterns first, lists exotic options only when constraints eliminate the canonical set. Produces a draft PRD under `docs/prd/<area>/<feature>.md`.
- `bmad-agent-architect` (Alex persona) — `[pair]` — system architect persona. Drives the arch-brainstorm → arch-decision loop. Pushes hard on parametric-memory considerations, symmetry, local deducibility. No opaque binary dependencies.
- `arch-decision` — `[pair]` — decides the draft PRD. Its Step 0 evaluates the **FPF gate**: formal Haft FPF validation runs only when the operator asks for it, when the decision is costly to reverse and the PRD has at least two materially different viable options, or when the PRD supersedes a Haft-bound decision. Otherwise the skill records a **lightweight decision** in the PRD frontmatter (`decision.mode: lightweight`) with no Haft run. Either path updates the frontmatter to `validated` (ship it); a formal review can also end in `rejected` (back to brainstorm).
- `quint-fpf` — `[pair]` — Haft adapter, loaded only when the FPF gate fires. Routes the current question to `h-frame`, `h-explore`, `h-compare`, `h-decide`, `h-verify`, `h-status` or `h-reason`. Durable records live in `.haft/`; no conversational fallback or duplicate per-phase register.
- `c4-doc-writer` — `[solo]` — after `arch-decision` returns PASS, updates `docs/architecture/c4/workspace.dsl` (Structurizr DSL) and regenerates Context / Container / Component views. Keeps living C4 diagrams in sync with validated decisions.
- `arch-sync` — `[solo]` — optional projection of the validated PRD into `docs/architecture/`. Suggested by Polly right after `arch-decision` PASS (never automatic). Parses the strict `[file: NN.md]` checklist from the validated PRD, recovering its exact Haft decision refs (or its lightweight decision), shows a unified diff per file, applies only the diffs the architect approves, writes a sync report.
- `docs-steward` — after `arch-sync` — audits the docs hierarchy for duplicated facts, drift, an incomplete decision index, broken links and orphans, on the rule of one owner document per kind of fact. It reports first and fixes only on request.

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
  ├─ evidence-reviewer ───────▶ review of the change (+ the installed language reviewer)
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
- `evidence-reviewer` (agent) — closes each task in medium and long mode (quick runs no subagents), before acceptance and before a pull request, together with the language reviewer installed for the stack (`csharp-reviewer`, `typescript-reviewer`, `python-reviewer`, …). It reviews the diff against the task or spec and reports only findings it can prove; "no findings" is a valid result. `atr` requests it again before acceptance or a sprint is marked complete.
- `atr` — acceptance test runner. Reads acceptance criteria from the sprint manifest, generates a testbook, executes via Playwright, produces Markdown reports with screenshots. Mentions Paseo as a push target for failures (info-only — see [`external-tools.md`](external-tools.md)).
- `superpowers:requesting-code-review` / `superpowers:receiving-code-review` — code review with technical rigor, not performative agreement.
- `superpowers:using-git-worktrees` — when a task needs isolation from the current workspace.
- `superpowers:finishing-a-development-branch` — merge, PR, cleanup with structured options.
- `docs-steward` — at sprint closure, audits the documentation and attaches its report to the acceptance result.

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
 1    Greenfield or brownfield?        [pair]   — (ask Polly if unsure)
 2    Stack question                   [pair]   —
 3    Existing source material?        [pair]   requirements-ingest
 4    Requirements elicitation         [pair]   bmad-agent-analyst (+ bmad-advanced-elicitation, + bmad-req-validator)
 5    Feature / product design         [pair]   reuse-first → superpowers:brainstorming (+ bmad-agent-ux-designer, + frontend-design)
                                                  existing code: + graph-explorer → blueprint-architect (agents)
 6    Architecture options             [pair]   reuse-first → arch-brainstorm (if non-trivial)
 7    Architecture decision            [pair]   arch-decision (FPF gate fires: + quint-fpf, + Phase 5.5 human gate;
                                                  otherwise: lightweight decision in the PRD)
 7b   Living C4 diagrams               [solo]   c4-doc-writer (after arch-decision PASS)
 7c   Arch source-of-truth sync        [solo]   arch-sync (after arch-decision PASS, optional) → docs-steward
 8    Sprint breakdown                 [pair]   sprint-manifest (+ spec-to-workitem)
 9    Implementation — per task        [solo]   superpowers:writing-plans
                                                  → executing-plans
                                                    → test-driven-development
                                                    → dispatching-parallel-agents (where applicable)
                                                → evidence-reviewer + installed language reviewer (agents)
                                                → atr (acceptance)
                                                → superpowers:finishing-a-development-branch
                                                → docs-steward (at sprint closure)
```

## Brownfield prefix

Applied when starting on an existing codebase. Inserted before the greenfield flow:

```
Step  Phase                            Mode     Skill(s)
────  ─────                            ────     ────────
B1    Path of the existing code        [pair]   —
B2    Index the codebase               [pair]   codebase-memory (/index, once)
B3    Understand what's there          [pair]   reverse-engineering (interactive Q&A, versioned dossier)
B4    Existing source material         [pair]   requirements-ingest
B5    Re-enter greenfield at step 5    —        (new feature) or step 6 (architectural change)
```

**Code graph.** The `create-nonoise` CLI installs `codebase-memory-mcp` at scaffold time and registers it as a project MCP server; `/index <path>` (or "index this repository") builds the graph once, and it then stays in sync while a session is open. The graph holds functions, classes, call chains, HTTP routes, infrastructure files and documentation sections. `get_architecture` returns languages, packages, routes, hotspots and clusters; `search_graph` finds symbols; `trace_path` follows call chains; `detect_changes` maps a diff to the symbols it affects. **Call `get_architecture` and `search_graph` before diving into raw files** — the `codebase-memory` block in every context file says so. There is no output folder in the repository: the index lives in `~/.cache/codebase-memory-mcp/`.

**Reverse engineering.** The `reverse-engineering` skill maintains a versioned dossier per subject (legacy codebase, third-party API, data pipeline) under `docs/support/reverse/<subject>/`. Interactive Q&A, explicit save trigger. Dossiers accumulate — re-entry into a brownfield project reads the dossier first.

## Skip rules

Not every task walks every phase. These skip rules describe when phases can be elided. Run `/polly` if you want Polly to read `.nonoise/sdlc-flow.md` and tell you which rule applies to your current situation:

| Task shape | Skip | Enter at |
|---|---|---|
| **Pure refactor**, no new feature, no architectural change | Phases 1 (if reqs current), 2, 3 | Phase 4 with a refactor-task |
| **Simple feature**, well-known existing architecture | Phase 3 (no new ADR needed) | Phase 4 with the feature-task; `sprint-manifest` consumes the existing design doc directly |
| **Architectural study** with no concrete feature yet | Phase 2 | Phase 3 with an area-slug; phase 4 waits until a feature materialises |
| **Bug fix** with clear reproduction | Phases 1, 2, 3, 4 | Phase 5 directly; use `superpowers:systematic-debugging` |
| **Brownfield (first entry)** | — | Brownfield prefix B1–B5, then re-enter |
| **Brownfield (subsequent entry)**, previous dossier current | B1, B2, B3 | B4 (or phase 1, depending on what changed) |

When you run `/polly`, she reads `.nonoise/sdlc-flow.md`, tells you where you are and which rule applies, and suggests the next skill — so the team can push back if the rule misjudged.

## Engaging Polly

Polly is an opt-in advisor, not an auto-trigger. To engage her:

- **Claude Code:** `/polly`
- **GitHub Copilot:** type "start polly" or "avvia polly"
- **Cursor / Gemini CLI / Codex:** use the equivalent phrased trigger in their respective entry files

Polly reads `.nonoise/sdlc-flow.md` at runtime to determine where the project is in the flow, then tells you where you are and what to run next. There is no state file and no auto-start on first session — you invoke her when you want navigation help.

See [`polly.md`](polly.md) for the full advisor spec and trigger surface.

## Multi-repo workspace mode

NONoise has a multi-repo template variant (roadmap item — `repositories.json` + `./scripts/clone-all.sh` + `./scripts/switch-branch.sh` + `./scripts/pull-all.sh`). In a multi-repo workspace, Polly will note when relevant:

- Skills live at workspace root (not inside sub-repos).
- Sub-repos clone under `repos/<path>` via `clone-all`.
- `switch-branch` aligns every sub-repo to the same branch — compatible with Paseo treating the workspace as one unit.
- Per-repo skill propagation is on demand: "if you need skills inside a specific sub-repo, I can copy `.claude/` there — just ask."

Details in [`docs-hierarchy.md`](docs-hierarchy.md) §Multi-repo.

## Further reading

- [`polly.md`](polly.md) — the full decision tree, phrasing per step, pair/solo rationale, three-way resume routing for brownfield.
- [`development-modes.md`](development-modes.md) — quick / medium / long, the FPF gate.
- [`regia.md`](regia.md) — the orchestration layer for Claude Code: modes, swarms, limits.
- [`skills-catalog.md`](skills-catalog.md) — what each skill actually does, trigger surface, references.
- [`agents.md`](agents.md) — the agents the flow calls: `graph-explorer`, `blueprint-architect`, `evidence-reviewer` and the ECC reviewers per profile and `--stack`.
- [`docs-hierarchy.md`](docs-hierarchy.md) — where phase outputs land and who owns each folder.
- [`packages/skills/polly/SKILL.md`](../packages/skills/polly/SKILL.md) — the authoritative Polly specification (this document summarises; the SKILL.md runs).
- [`.nonoise/sdlc-flow.md`](../.nonoise/sdlc-flow.md) in any scaffolded project — the editable flow Polly reads at runtime. The source template lives at `packages/templates/single-project/_always/.nonoise/sdlc-flow.md`.
