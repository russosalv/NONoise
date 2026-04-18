---
name: quint-fpf
description: Quint First Principles Framework — structured reasoning methodology with 6 phases (Initialize → Abduct → Deduce → Induce → Audit → Decide), R_eff via WLNK, and Congruence Level tracking. Use when you need to formally validate an architectural decision, a PRD, or any non-trivial claim. Invokable standalone or delegated from other skills (e.g. `arch-decision`). Has two modes — tooled (quint MCP server for state persistence + audit tree) and conversational (markdown-only fallback when MCP is absent).
source: Quint FPF (First Principles Framework) — methodology developed in NONoise reference-project
variant: nonoise-bmad 2 adjacent; standalone reusable skill
customization: extracted from arch-decision; bundled with q-* slash commands; dual-mode execution
---

# quint-fpf

A formal reasoning methodology that turns opaque decisions into auditable chains of reasoning. Extract claims, verify logic, validate empirically, audit evidence, decide. Each phase has clear pre/post conditions and produces a recorded artifact.

## When to use

- **Architectural decisions** — invoked by `arch-decision` after a PRD is drafted
- **Formal validation** — any time the user says "let's stress-test this", "is this actually correct?", "what could go wrong"
- **Evidence-based claims** — when writing an ADR, a compliance assessment, a post-mortem
- **Stand-alone** — via slash commands `/q0-init` through `/q5-decide` when the user wants a full FPF cycle

## Two modes of execution

### 🟢 Tooled mode (preferred)
If the **quint MCP server** is installed and exposes `quint_*` tools (`quint_init`, `quint_propose`, `quint_verify`, `quint_validate`, `quint_audit`, `quint_decide`, `quint_record_context`, `quint_query`, …), delegate to the 12 bundled slash commands in `.claude/commands/`:

| Phase | Command | MCP tool | Output |
|---|---|---|---|
| 0. Initialize | `/q0-init` | `quint_init`, `quint_record_context` | `.quint/context.md` with Bounded Context |
| 1. Abduct (hypothesize) | `/q1-hypothesize` | `quint_propose` | L0 holons in `.quint/knowledge/L0/` |
| 1. Add single | `/q1-add` | `quint_propose` | append a single L0 holon |
| 2. Deduce (verify) | `/q2-verify` | `quint_verify` | L0 → L1 (PASS) or invalid (FAIL) / REFINE |
| 3. Induce (validate) | `/q3-validate` | `quint_validate` | L1 → L2 with empirical evidence |
| 4. Audit | `/q4-audit` | `quint_audit` | R_eff computed via WLNK over the dependency tree |
| 5. Decide | `/q5-decide` | `quint_decide` | Final decision holon with rationale |
| Support: query | `/q-query` | `quint_query` | search `.quint/` knowledge base |
| Support: status | `/q-status` | — | show current FPF cycle state |
| Support: decay | `/q-decay` | `quint_decay` | evidence freshness management |
| Support: actualize | `/q-actualize` | `quint_actualize` | reconcile FPF state with repo changes |
| Support: reset | `/q-reset` | `quint_reset` | clear cycle state |

In tooled mode, the methodology is **enforced by the tools**: hypotheses that are only discussed in prose are not promotable, verdicts must be exactly `PASS|FAIL|REFINE`, dependencies are traced in the audit tree.

### 🟡 Conversational mode (fallback)
When the quint MCP server is **not** installed, apply the methodology conversationally and produce a markdown artifact in `docs/fpf/<slug>.md` with the same 6 phases. You lose:
- Persistent state (must re-derive on each session)
- Automatic R_eff computation (you must reason about reliability manually)
- Audit tree across dependencies (must note dependencies in prose)

But you keep:
- Same discipline: abduction → deduction → induction → audit → decide
- Same output structure (can be upgraded to tooled mode later by running `quint_init` + replaying the markdown)

Detect mode with a quick probe: if `/q-status` works or a `.quint/` directory exists, you're in tooled mode.

## Core concepts (both modes)

### Bounded Context (Phase 0)
Scope of the reasoning session: vocabulary, invariants, constraints. *Example: "User = registered customer. Invariant: latency < 100ms. Stack: Postgres."*

### Holon (unit of reasoning)
A holon is a single claim (hypothesis, fact, decision). Each has:
- `title` — short name
- `content` — the Method (how it works)
- `scope` — claim scope (where it applies)
- `kind` — `system` (code/architecture) or `episteme` (process/doc)
- `rationale` — structured JSON: `{anomaly, approach, alternatives_rejected}`
- `level` — `L0` (abduction / candidate) → `L1` (substantiated) → `L2` (validated)
- `depends_on` — array of holon IDs this one requires
- `decision_context` — parent decision holon, groups alternatives

### Relations
- **ComponentOf** (for `system`) — "X is a component of Y; X failure degrades Y"
- **ConstituentOf** (for `episteme`) — "X is a constituent of Y; X error invalidates Y"
- **MemberOf** — groups alternatives under a `decision_context`

### Congruence Level (CL, 1–3)
When declaring a dependency, specify how similar the contexts are:
- **CL3** — same context (0% penalty on propagated R_eff)
- **CL2** — similar context (10% penalty)
- **CL1** — different context (30% penalty)

### R_eff (effective reliability)
Computed at Phase 4 via **WLNK** (Weighted Log-Normalized Knowledge). Properties:
- Parent R_eff ≤ min(dependency R_eff) after CL discount
- A single weak dependency caps the whole decision
- Revealed as a numeric score; thresholds are project-dependent (commonly R_eff ≥ 0.7 for validated)

## Phase-by-phase contract

### Phase 0 — Initialize
- **Pre**: none
- **Post**: `.quint/` exists AND context recorded
- **Invariant**: initialization is idempotent
- **Goal**: establish the Bounded Context

### Phase 1 — Abduct (Hypothesize)
- **Pre**: Phase 0 complete
- **Post**: ≥1 L0 hypothesis exists
- **Invariant**: hypotheses have `kind ∈ {system, episteme}`
- **Goal**: generate 3–5 plausible competing hypotheses (NQD — Diversity: at least one Conservative + one Radical)

### Phase 2 — Deduce (Verify)
- **Pre**: ≥1 L0 hypothesis
- **Post**: each L0 processed → L1 (PASS) OR invalid (FAIL) OR L0 with feedback (REFINE)
- **Invariant**: verdict ∈ {PASS, FAIL, REFINE}
- **Goal**: logical verification — type check, constraint check, consistency. No empirical evidence yet, pure reasoning.

### Phase 3 — Induce (Validate)
- **Pre**: ≥1 L1 hypothesis
- **Post**: each L1 processed → L2 with evidence OR stays L1 pending OR invalid
- **Goal**: empirical validation — look for evidence in the codebase, external research, benchmarks, prior art. Attach `evidence_json` to each validation.

### Phase 4 — Audit
- **Pre**: ≥1 L2 hypothesis
- **Post**: R_eff computed for every holon; audit tree produced
- **Goal**: propagate WLNK through the dependency graph. Identify weak links that cap the decision.

### Phase 5 — Decide
- **Pre**: audit tree complete
- **Post**: decision holon written with rationale referencing audited evidence
- **Goal**: choose among the validated candidates; record rejected alternatives with reason.

## How other skills invoke quint-fpf

An invoking skill (e.g. `arch-decision`) passes:

- **Input PRD path** — the document to validate (produced by `arch-brainstorm` or equivalent)
- **Scope** — subset of the PRD to validate (optional; default: whole PRD)
- **Mode** — `tooled` | `conversational` | `auto` (default: `auto`)

quint-fpf then:
1. Runs Phase 0 seeded from PRD intro + any `_bmad/_config` / `nonoise.config.json`
2. Extracts claims from the PRD as Phase 1 L0 hypotheses
3. Runs Phase 2–4
4. Returns a decision artifact (path to `.quint/decisions/<slug>.md` or `docs/fpf/<slug>.md`)

Invoking skill is responsible for reading the returned decision and acting on it (e.g. `arch-decision` sets the PRD frontmatter to `validated` or `rejected` based on the decision).

## Slash commands (bundled)

The 12 command files in `commands/` are copied to the project's `.claude/commands/` during scaffold. They exist to make FPF usable directly via `/qN-phase` by a human user, not only as a sub-skill invocation.

## Rules

- **Tool calls are mandatory in tooled mode**. Mental notes or prose do NOT change holon state. Claiming "I verified the hypothesis" without calling `quint_verify` is a **protocol violation**.
- **Verdicts are exact strings** — `PASS`, `FAIL`, `REFINE`. No paraphrasing.
- **Levels don't skip** — you cannot promote a holon from L0 to L2 directly. Always go through L1.
- **WLNK respects CL** — if you link dependencies, specify CL honestly; inflating CL masks real risk.
- **Conversational mode must still produce the artifact** — a markdown file with the 6 phase sections and an explicit note "mode: conversational (no quint MCP available)".

## MCP server installation note

The quint MCP server is not part of NONoise v1. Users who want tooled mode install it separately following the upstream Quint project documentation. Reference: the q-* command files in `commands/` document the exact tool signatures expected.

In v1 of NONoise, `arch-decision` and `quint-fpf` operate in conversational mode by default and upgrade automatically if the MCP is detected.

## Out of scope (v1)

- Packaging the quint MCP server itself (separate project).
- Migrating conversational-mode markdown artifacts into tooled state when MCP gets installed later (manual replay).
- Custom WLNK weighting per project (uses upstream defaults).
