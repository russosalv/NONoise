# Docs hierarchy — the six folders every project gets

Every project scaffolded by `create-nonoise` receives a top-level `docs/` tree with six purpose-built folders. This tree is the **source of truth** for the project's requirements, architecture decisions, sprint state, and operational knowledge. Every NONoise skill reads from and writes to this tree.

The principle (see [`philosophy.md`](philosophy.md) §4): if an AI can't read a piece of information, it can't help with it. Anything load-bearing must live in `docs/`. Chat history, Slack DMs, Confluence pages, Notion boards are *mirrors at best* — the authoritative copy is in the repo.

## The six folders

| Folder | Maintained by | Primary content | Referenced from |
|---|---|---|---|
| [`docs/architecture/`](#docsarchitecture) | Architect, manually | Target architecture, class hierarchies, conventions, ADRs, C4 DSL | `arch-brainstorm`, `arch-decision`, `c4-doc-writer`, every implementer's plan |
| [`docs/requirements/`](#docsrequirements) | `requirements-ingest`, analyst | Structured requirements per domain / feature | `bmad-agent-analyst`, `bmad-req-validator`, `arch-brainstorm` |
| [`docs/calls/`](#docscalls) | `requirements-ingest` (parking) | Raw meeting / call transcripts, cross-referenced | `requirements-ingest` |
| [`docs/support/`](#docssupport) | `reverse-engineering`, ad-hoc | Reverse-engineering dossiers, third-party refs, incident reports | `reverse-engineering`, `observability-debug` |
| [`docs/fpf/<slug>/`](#docsfpfslug) | `quint-fpf` (standalone) | Per-phase markdown trail of a standalone FPF cycle (`00-context.md` … `05-decision.md`) | `quint-fpf` slash commands |
| [`docs/prd/<area>/`](#docsprdarea) | `arch-brainstorm` → `arch-decision` | Architectural PRDs, `draft` / `validated` / `rejected` | `sprint-manifest` |
| [`docs/sprints/Sprint-N/`](#docssprintssprint-n) | `sprint-manifest`, `atr` | Per-sprint manifest, macro tasks, acceptance reports | every implementer, `atr`, `spec-to-workitem` |

Nothing here is invented by NONoise alone — these are the folders real teams end up building on their own the third or fourth time they scaffold an AI-assisted project. The framework just gets you there on day one.

---

## `docs/architecture/`

**Owner.** The architect (or the senior dev wearing the architect hat). Manually maintained. No skill writes to the root of this folder unsolicited.

**Purpose.** The target architecture. What an implementer must match.

**Structure (recommended):**

```
docs/architecture/
├── README.md                  # Architecture index — what lives where
├── absolute-constraints.md    # Non-negotiable rules (no circular deps,
│                              # no magic config, etc.)
├── class-hierarchies.md       # Core type relationships
├── conventions.md             # Naming, folder structure, idioms
├── decisions/                 # ADRs, one per decision
│   ├── 001-use-cqrs.md
│   ├── 002-adopt-dapr.md
│   └── …
└── c4/                        # Living diagrams via Structurizr DSL
    ├── workspace.dsl          # The single source model
    └── views/                 # Rendered outputs (Mermaid, PlantUML)
```

**Who reads it.** Every implementer's plan (`superpowers:writing-plans`) reads `docs/architecture/` before producing the plan. The `arch-brainstorm` and `arch-decision` skills treat it as the authoritative prior state. `c4-doc-writer` edits `c4/workspace.dsl`.

**Editorial rule.** Changes are PR-reviewed. Architectural constraints that appear here override any contradictory decision upstream — if a PRD contradicts an absolute constraint, the PRD is rejected.

## `docs/requirements/`

**Owner.** `requirements-ingest` creates; `bmad-agent-analyst` extends; `bmad-req-validator` annotates; humans edit freely.

**Purpose.** Structured requirements per domain or feature. Derived from raw stakeholder input (PDFs, DOCX, emails, call transcripts). Tagged with signal taxonomy.

**Structure:**

```
docs/requirements/
├── README.md                  # Index + signal taxonomy legend
├── <domain-or-feature-1>.md
├── <domain-or-feature-2>.md
└── …
```

Each requirement file has frontmatter:

```yaml
---
title: <feature name>
status: draft | validated
signal-taxonomy:
  functional: [...]
  business-rule: [...]
  ui: [...]
  out-of-scope: [...]
  open-question: [...]
sources:
  - docs/calls/2026-04-12-stakeholder-alpha.md
  - docs/calls/2026-04-15-legal-review.md
validation:
  moscow: [...]
  ieee830: [...]
  invest: [...]
  smart: [...]
---
```

**Who reads it.** `arch-brainstorm` consumes validated requirements to produce draft PRDs. `sprint-manifest` reads this directly for simple features that skip Phase 3 (no new ADR).

## `docs/calls/`

**Owner.** `requirements-ingest` (parking). Humans can deposit transcripts directly too.

**Purpose.** Raw call / meeting transcripts, voice-recording outputs, email threads. Cross-referenced from structured requirement files. This is the "source material" layer; the requirement files are the "processed" layer.

**Structure:**

```
docs/calls/
├── README.md                  # Index by date
├── 2026-04-12-stakeholder-alpha.md
├── 2026-04-15-legal-review.md
├── transcripts/               # Full voice-recording outputs
└── emails/                    # Email thread dumps
```

**Editorial rule.** Never rewrite a transcript after deposit — call transcripts are a historical record. Corrections go in a companion `.corrections.md` file or as a note inside the transcript with a `[correction: …]` marker.

## `docs/support/`

**Owner.** Multiple. `reverse-engineering` writes under `support/reverse/`; `observability-debug` writes under `support/incidents/`; ad-hoc reference material goes directly under `support/`.

**Purpose.** Anything that supports the project but isn't a requirement, a PRD, a sprint, or authoritative architecture. Third-party API reference dumps. Reverse-engineering dossiers on legacy systems. Incident post-mortems. Protocol specs vendored for offline reading.

**Structure:**

```
docs/support/
├── reverse/                   # reverse-engineering skill writes here
│   └── <subject>/
│       ├── README.md
│       ├── chapters/
│       └── changelog.md
├── incidents/                 # observability-debug writes here
│   └── <date>-<id>.md
└── <ad-hoc-reference>/        # Hand-deposited
```

**Editorial rule.** Additive. Nothing in `docs/support/` is deleted except by explicit decision — these are the project's long-term memory.

> **Where did `support/quint/` go?** Quint FPF cycles now produce a per-phase markdown folder. Standalone cycles write to [`docs/fpf/<slug>/`](#docsfpfslug); cycles invoked by `arch-decision` co-locate with the PRD under [`docs/prd/<area>/audit/NN-<study>-fpf/`](#docsprdarea). Both layouts are deletable as a unit.

## `docs/fpf/<slug>/`

**Owner.** `quint-fpf` when invoked standalone (i.e. `/q0-init` without a caller-supplied `--target`). When `arch-decision` runs quint-fpf it passes `--target docs/prd/<area>/audit/NN-<study>-fpf/` instead, so the audit lives next to the PRD (see [`docs/prd/<area>/`](#docsprdarea)).

**Purpose.** One folder per reasoning cycle. The six markdown files are the canonical human-readable trail of the cycle — reviewable in git, removable with a single `rm -rf`.

**Structure:**

```
docs/fpf/
└── <slug>/                          # auto-derived kebab-case from the problem statement
    ├── 00-context.md                # Phase 0 — Bounded Context (vocabulary, invariants, constraints)
    ├── 01-hypotheses.md             # Phase 1 — L0 hypotheses (abduction)
    ├── 02-verification.md           # Phase 2 — L0 → L1 verdicts (deduction)
    ├── 03-validation.md             # Phase 3 — L1 → L2 with evidence (induction)
    ├── 04-audit.md                  # Phase 4 — R_eff via WLNK (Trust Calculus)
    └── 05-decision.md               # Phase 5 — final DRR
```

Each file carries phase-specific frontmatter. The cycle is closed when `05-decision.md` exists and `00-context.md` frontmatter `verdict_phase5` is set to `PASS | FAIL | NEEDS-REVISION`. On re-runs of a phase, new entries are appended under a `## Revisions` section with a UTC timestamp; initial entries are immutable.

**Tooled vs conversational.** If the Quint MCP server is installed, `.quint/` mirrors the markdown in queryable holon state (verdicts enforced by tools, R_eff computed by WLNK). The markdown trail is produced in both modes — skipping it is a protocol violation.

**Editorial rule.** Do not hand-edit the per-phase files mid-cycle — re-run the corresponding `/qN-*` command so the append-only trail stays truthful. Delete a whole cycle by removing its folder.

## `docs/prd/<area>/`

**Owner.** `arch-brainstorm` creates (status=draft); `arch-decision` updates (status=validated or rejected). Manual edits allowed; keep the frontmatter valid.

**Purpose.** Architectural Product Requirement Documents. One per work area, per feature, per decision-requiring change.

**Structure:**

```
docs/prd/
├── README.md                  # Index + area legend
├── <area-1>/
│   ├── <feature-a>.md
│   ├── <feature-b>.md
│   └── …
├── <area-2>/
└── …
```

Each PRD has frontmatter:

```yaml
---
title: <feature>
area: <area-slug>
status: draft | validated | rejected
authors: [Alex, Marco]
requirements: [docs/requirements/<feature>.md]
adr: [docs/architecture/decisions/<ADR-N>.md]             # only after validation
quint_cycle: audit/NN-<study>-fpf/                        # per-phase FPF trail (sibling of this PRD)
decided_at: 2026-04-18
---
```

**Audit folder (`docs/prd/<area>/audit/NN-<study>-fpf/`).** When `arch-decision` validates a PRD, quint-fpf writes one markdown file per FPF phase directly next to the PRD: `00-context.md`, `01-hypotheses.md`, `02-verification.md`, `03-validation.md`, `04-audit.md`, `05-decision.md`. The final `05-decision.md` is the Design Rationale Record — its frontmatter (`verdict`, `r_eff_min`) is what `sprint-manifest` and downstream skills consume. Delete the whole pre-validation trail in one `rm -rf`.

**Editorial rule.** The PRD captures *why* the architectural choice was made, not just *what*. Future implementers read this to understand the constraint landscape that led to the decision. `arch-decision` refuses to validate PRDs lacking rationale.

## `docs/sprints/Sprint-N/`

**Owner.** `sprint-manifest` creates; `atr` writes acceptance reports; implementers append per-task breakdowns.

**Purpose.** Per-sprint state. Every sprint is a folder. Inside: the manifest (aggregated macro tasks from validated PRDs), per-task specs if the sprint is large, acceptance reports.

**Structure:**

```
docs/sprints/
├── Sprint-1/
│   ├── manifest.md            # The aggregated sprint plan
│   ├── tasks/                 # Per-task specs (if manifest is large)
│   │   ├── T-001-<slug>.md
│   │   └── …
│   ├── acceptance/            # ATR reports
│   │   ├── T-001-report.md
│   │   ├── T-001-screenshots/
│   │   └── …
│   └── retro.md               # Post-sprint retrospective (optional)
├── Sprint-2/
└── …
```

**Editorial rule.** Sprint folders are immutable after close. If a carried-over task moves to Sprint-N+1, the manifest of N+1 includes it; the manifest of N keeps its historical record.

---

## How skills interact with the tree

A cross-reference of which skill reads / writes which folder (condensed from [`skills-catalog.md`](skills-catalog.md)):

| Skill | Reads | Writes |
|---|---|---|
| `polly` | entire tree state | — (delegates) |
| `requirements-ingest` | raw files; `tools/md-extractor/` output | `docs/requirements/`, `docs/calls/` |
| `bmad-agent-analyst` | `docs/requirements/`, `docs/calls/` | `docs/requirements/` |
| `bmad-advanced-elicitation` | `docs/requirements/` | `docs/requirements/` (annotations) |
| `bmad-req-validator` | `docs/requirements/` | `docs/requirements/` (frontmatter) |
| `arch-brainstorm` | `docs/requirements/`, `docs/architecture/`, `docs/prd/` | `docs/prd/<area>/<feature>.md` (draft) |
| `arch-decision` | draft PRD | PRD (status update), `docs/prd/<area>/audit/NN-<study>-fpf/` (per-phase FPF trail), `docs/architecture/decisions/` |
| `quint-fpf` | the hypothesis target + the active cycle's `00-context.md` | `docs/fpf/<slug>/` (standalone) or `<caller-supplied --target>` (e.g. `docs/prd/<area>/audit/NN-<study>-fpf/` when invoked by `arch-decision`) — six markdown files, one per phase |
| `c4-doc-writer` | ADRs, `docs/architecture/c4/` | `docs/architecture/c4/workspace.dsl`, `c4/views/` |
| `sprint-manifest` | validated PRDs | `docs/sprints/Sprint-N/manifest.md` |
| `atr` | sprint manifest, acceptance criteria | `docs/sprints/Sprint-N/acceptance/` |
| `spec-to-workitem` | sprint manifest | external tracker, `workitem-map.json` in sprint folder |
| `reverse-engineering` | target codebase | `docs/support/reverse/<subject>/` |
| `ops-skill-builder` | target ops system, existing skills | `.claude/skills/ops-<name>/` |
| `observability-debug` | backend via CLI | `docs/support/incidents/` |
| `superpowers:writing-plans` | `docs/architecture/`, `docs/requirements/`, sprint manifest | `docs/superpowers/specs/<plan>.md` |
| `superpowers:executing-plans` | plan | project source |
| `superpowers:*` (others) | project state | PRs, branches, review outputs |

The implementer skills (`superpowers:*`) live under `docs/superpowers/specs/` for the plans and inline in the code / PR for everything else — they deliberately do not pollute the six project-domain folders.

## Multi-repo workspace

When the scaffold generates a multi-repo workspace (`repositories.json` + `scripts/clone-all.*` + `scripts/switch-branch.*` + `scripts/pull-all.*`), the `docs/` tree lives at the **workspace root**, not per sub-repo. Sub-repos clone under `repos/<path>` and carry their own `docs/` only if they had one upstream.

Polly handles this automatically:

- Skills live at workspace root (open the workspace in your AI tool to have them all).
- Per-sub-repo skill propagation is on demand: "if you need skills inside a specific sub-repo, I can copy `.claude/` there — just ask".
- `switch-branch` aligns every sub-repo on the same branch — compatible with Paseo treating the workspace as one unit.

## Single-project fallback

The single-project scaffold (the default) places `docs/` at the project root alongside `src/`. This is the baseline; the multi-repo variant is opt-in via the scaffold CLI prompt.

## When the tree doesn't fit your project

Rare. The tree is deliberately minimal and mostly covers what any real SDLC generates anyway. If you find yourself with a category that doesn't fit:

- First ask: is this really a new category, or is it a special case of `support/`?
- If truly new, add a top-level folder with a README explaining the convention. Don't rename the existing six.
- Consider opening an issue — if your category is common, it probably belongs in the scaffold.

Non-standard top-level folders are supported; they just won't be read by the NONoise skills. Your own skills can read them freely.
