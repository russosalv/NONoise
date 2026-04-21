---
name: quint-fpf
description: Quint First Principles Framework — structured reasoning methodology with 6 phases (Initialize → Abduct → Deduce → Induce → Audit → Decide), R_eff via WLNK, and Congruence Level tracking. Use when you need to formally validate an architectural decision, a PRD, or any non-trivial claim. Invokable standalone or delegated from other skills (e.g. `arch-decision`). Every phase emits a dedicated markdown file under a single per-cycle folder so the entire reasoning trail is human-readable, git-diffable, and removable in one `rm -rf`. Has two execution modes — tooled (quint MCP server enforces holon state in `.quint/`) and conversational (markdown-only) — but the document trail is produced in both.
source: Quint FPF (First Principles Framework) — methodology developed in NONoise reference-project
variant: nonoise-bmad 2 adjacent; standalone reusable skill
customization: extracted from arch-decision; bundled with q-* slash commands; dual-mode execution; per-phase markdown emission
---

# quint-fpf

A formal reasoning methodology that turns opaque decisions into auditable chains of reasoning. Extract claims, verify logic, validate empirically, audit evidence, decide. Each phase has clear pre/post conditions and produces a recorded artifact.

## When to use

- **Architectural decisions** — invoked by `arch-decision` after a PRD is drafted
- **Formal validation** — any time the user says "let's stress-test this", "is this actually correct?", "what could go wrong"
- **Evidence-based claims** — when writing an ADR, a compliance assessment, a post-mortem
- **Stand-alone** — via slash commands `/q0-init` through `/q5-decide` when the user wants a full FPF cycle

## Universal output contract

Every phase emits a dedicated markdown file under a single per-cycle folder. This trail is the canonical human-readable record — what gets reviewed, diffed in git, and removed in one operation when a cycle is abandoned. The folder layout is identical regardless of mode; only the auxiliary state in `.quint/` differs.

### Output folder resolution

`/q0-init` resolves the output directory in this order:

1. **Caller-supplied path** — if invoked from a parent skill that passes `--target <path>` (e.g. `arch-decision` passes `docs/prd/<area>/audit/NN-<study>-fpf/`), use that path verbatim.
2. **Manual override** — if the user passes `--slug <slug>`, use `docs/fpf/<slug>/`.
3. **Auto-derived** — otherwise, derive a kebab-case slug from the user's problem statement (2–3 keywords), use `docs/fpf/<slug>/`. If the problem statement is too vague to derive a slug, ask the user once.

The resolved path is recorded in `00-context.md` frontmatter as `output_dir:` so subsequent phases locate it without re-deriving. Subsequent `qN-*` commands find the active cycle by:

1. If `.quint/context.md` exists (tooled mode), read the active cycle path from there.
2. Otherwise, scan `**/00-context.md` files matching `docs/fpf/*/` and `docs/prd/*/audit/*-fpf/`, pick the most recent whose `verdict_phase5` frontmatter is empty (cycle not closed). If multiple candidates remain, ask the user which to continue.
3. If none is found, return: "No active FPF cycle. Run `/q0-init` first."

### File-per-phase layout

```
<output_dir>/
├── 00-context.md       ← /q0-init
├── 01-hypotheses.md    ← /q1-hypothesize, /q1-add (append)
├── 02-verification.md  ← /q2-verify
├── 03-validation.md    ← /q3-validate
├── 04-audit.md         ← /q4-audit
└── 05-decision.md      ← /q5-decide  (DRR — final verdict)
```

Each file uses a rigid template defined in its corresponding command file under `commands/`. On re-runs, new entries are appended under a `## Revisions` section with a UTC ISO-8601 timestamp; **initial entries are never overwritten** — the audit trail preserves history.

## Two execution modes

The two modes differ only in **auxiliary state**, not in document output:

### 🟢 Tooled mode (preferred)

If the **quint MCP server** is installed and exposes `quint_*` tools, delegate to the bundled slash commands. The tools persist holon state in `.quint/` (queryable, with R_eff computed via WLNK). The markdown trail in `<output_dir>/` is written **in parallel** with the tool calls.

| Phase | Command | MCP tool (tooled) | Markdown file |
|---|---|---|---|
| 0. Initialize | `/q0-init` | `quint_init`, `quint_record_context` | `00-context.md` |
| 1. Abduct | `/q1-hypothesize` | `quint_propose` | `01-hypotheses.md` |
| 1. Add single | `/q1-add` | `quint_propose` | `01-hypotheses.md` (append) |
| 2. Deduce | `/q2-verify` | `quint_verify` | `02-verification.md` |
| 3. Induce | `/q3-validate` | `quint_test` | `03-validation.md` |
| 4. Audit | `/q4-audit` | `quint_calculate_r`, `quint_audit_tree`, `quint_audit` | `04-audit.md` |
| 5. Decide | `/q5-decide` | `quint_decide` | `05-decision.md` |
| Support: query | `/q-query` | `quint_query` | — |
| Support: status | `/q-status` | — | — |
| Support: decay | `/q-decay` | `quint_decay` | — |
| Support: actualize | `/q-actualize` | `quint_actualize` | — |
| Support: reset | `/q-reset` | `quint_reset` | — |

In tooled mode, methodology discipline is **enforced by the tools**: hypotheses only discussed in prose are not promotable in `.quint/`; verdicts must be exactly `PASS|FAIL|REFINE`. The markdown documents what the tools recorded — it does not replace tool calls.

### 🟡 Conversational mode

When the quint MCP server is **not** installed, the slash commands apply the same methodology purely against the markdown files. You lose:
- Programmatic R_eff via WLNK (you reason about reliability manually following the same rules)
- Queryable holon state (you re-read `01-hypotheses.md` etc.)
- Cross-dependency audit tree (you note dependencies inline in prose)

You keep:
- **Identical document trail and rigid file templates** — the markdown is the same in both modes
- Same 6-phase discipline and same checkpoints
- Migratability — the markdown can be replayed into tooled mode later by running `quint_init` + the corresponding tool calls

Detect mode with a quick probe: if `/q-status` works or `.quint/` exists in the repo root, you're in tooled mode.

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
- **Target output folder** via `--target <path>` — where the per-phase markdown trail lives (e.g. `arch-decision` passes `docs/prd/<area>/audit/NN-<study>-fpf/`)
- **Scope** — subset of the PRD to validate (optional; default: whole PRD)
- **Mode** — `tooled` | `conversational` | `auto` (default: `auto`)

quint-fpf then:
1. Runs Phase 0 (`/q0-init --target <path>`) seeded from PRD intro + any `_bmad/_config` / `nonoise.config.json`
2. Extracts claims from the PRD as Phase 1 L0 hypotheses (`/q1-hypothesize` writes `01-hypotheses.md`)
3. Runs Phases 2–4 (each writes its `0N-*.md` file in `<target>/`)
4. Returns a decision artifact at `<target>/05-decision.md` (the DRR). In tooled mode, also persisted in `.quint/decisions/`.

The invoking skill is responsible for reading `05-decision.md` and acting on it (e.g. `arch-decision` sets the PRD frontmatter to `validated` or `rejected` based on the `verdict` field of the DRR frontmatter).

> **Note on opinionated wrappers**: when invoked by `arch-decision`, the generic Phase 5 (DECIDE) is followed by `arch-decision`'s own Phase 5.5 (REVIEW & APPROVE) — a human gate with override capability that writes a `human_verdict` field into `05-decision.md`. `quint-fpf` itself stays generic and does not enforce the gate; the opinionated UX is owned by the wrapper.

## Slash commands (bundled)

The 12 command files in `commands/` are copied to the project's `.claude/commands/` during scaffold. They exist to make FPF usable directly via `/qN-phase` by a human user, not only as a sub-skill invocation.

## Rules

- **Document trail is mandatory in BOTH modes**. After every phase, the corresponding markdown file under `<output_dir>/` MUST exist (or be appended to). This trail is the canonical human-readable record of the cycle. Skipping it — even when running in tooled mode and recording state in `.quint/` — is a **protocol violation**.
- **Tool calls are mandatory in tooled mode**. Mental notes or prose do NOT change holon state. Claiming "I verified the hypothesis" without calling `quint_verify` is a **protocol violation**. The markdown trail records what the tools recorded; it never substitutes for them in tooled mode.
- **Verdicts are exact strings** — `PASS`, `FAIL`, `REFINE`. No paraphrasing.
- **Levels don't skip** — you cannot promote a holon from L0 to L2 directly. Always go through L1.
- **WLNK respects CL** — if you link dependencies, specify CL honestly; inflating CL masks real risk.
- **Initial entries are immutable** — re-runs append under `## Revisions ### <UTC timestamp>`; never overwrite the original entries.

## MCP server installation note

The quint MCP server is not part of NONoise v1. Users who want tooled mode install it separately following the upstream Quint project documentation. Reference: the q-* command files in `commands/` document the exact tool signatures expected.

In v1 of NONoise, `arch-decision` and `quint-fpf` operate in conversational mode by default and upgrade automatically if the MCP is detected.

## Out of scope (v1)

- Packaging the quint MCP server itself (separate project).
- Migrating conversational-mode markdown artifacts into tooled state when MCP gets installed later (manual replay).
- Custom WLNK weighting per project (uses upstream defaults).
