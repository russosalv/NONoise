---
description: "Verify Logic (Deduction)"
pre: ">=1 L0 hypothesis exists in <output_dir>/01-hypotheses.md"
post: "<output_dir>/02-verification.md written; (tooled) each L0 processed → L1 (PASS) / invalid (FAIL) / L0 with feedback (REFINE)"
invariant: "verdict ∈ {PASS, FAIL, REFINE}"
required_tools: ["Read", "Write"]
required_tools_tooled: ["quint_verify"]
---

# Phase 2: Deduction (Verification)

You are the **Deductor** operating as a **state machine executor**. Your goal is to **logically verify** the L0 hypotheses, promote them to L1 (Substantiated), and record the verification trail in markdown.

## Locating the active cycle

1. If `.quint/context.md` exists, read the active cycle path from there.
2. Otherwise, scan `docs/fpf/*/00-context.md` and `docs/prd/*/audit/*-fpf/00-context.md`, pick the most recent whose `verdict_phase5` frontmatter is empty. If multiple, ask the user.
3. If none, stop with: "No active FPF cycle. Run `/q0-init` first."

Read both `<output_dir>/00-context.md` (for invariants/constraints to check against) and `<output_dir>/01-hypotheses.md` (for the L0 set).

## Enforcement Model

**Verification must be recorded in BOTH the markdown trail AND (in tooled mode) `.quint/`.** Stating "this hypothesis is logically sound" in chat without writing it down does NOT change anything.

| Precondition | Action | Postcondition |
|--------------|--------|---------------|
| L0 hypotheses present in `01-hypotheses.md` | run logical checks per hypothesis | verdicts ready |
| verdicts ready | `Write` `<output_dir>/02-verification.md` | markdown trail of verification on disk |
| (tooled only) markdown written | `quint_verify` × N | L0 → L1 / invalid / L0+feedback in `.quint/` |

**RFC 2119 Bindings:**
- You MUST `Write` `<output_dir>/02-verification.md` containing a verdict for EVERY L0 hypothesis (PASS / FAIL / REFINE), in BOTH modes.
- In tooled mode you MUST ALSO call `quint_verify` for EACH L0 hypothesis.
- You MUST NOT proceed to Phase 3 without `02-verification.md` containing at least one PASS verdict.
- Verdict MUST be exactly "PASS", "FAIL", or "REFINE" — no other values accepted.
- Skipping the markdown write — even in tooled mode — is a **protocol violation**.

**If you skip the markdown write:** Phase 3 (`/q3-validate`) cannot find which hypotheses passed verification and will block.

## Invalid Behaviors

- Stating "hypothesis verified" without calling `quint_verify`
- Proceeding to `/q3-validate` with zero L1 hypotheses
- Using verdict values other than PASS/FAIL/REFINE
- Skipping hypotheses without explicit FAIL verdict

## Context
We have a set of L0 hypotheses stored in the database. We need to check if they are logically sound before we invest in testing them.

## Method (Verification Assurance - VA)
For each L0 hypothesis:
1.  **Type Check (C.3 Kind-CAL):**
    -   Does the hypothesis respect the project's Types?
    -   Are inputs/outputs compatible?
2.  **Constraint Check:**
    -   Does it violate any invariants defined in the `U.BoundedContext`?
3.  **Logical Consistency:**
    -   Does the proposed Method actually lead to the Expected Outcome?
4.  **Record via `quint_verify`** with appropriate verdict.

## Action (Run-Time)
1.  **Locate** the active cycle and read `<output_dir>/00-context.md` + `<output_dir>/01-hypotheses.md`.
2.  **Verification:** For each L0 hypothesis, perform the logical checks above against the recorded vocabulary, invariants, and constraints.
3.  **(Tooled mode)** Call `quint_verify` for EACH hypothesis.
    -   PASS: Promotes to L1
    -   FAIL: Moves to invalid
    -   REFINE: Stays L0 with feedback
4.  **`Write` the markdown trail** at `<output_dir>/02-verification.md` using the template below. Include a verdict for every hypothesis examined.
5.  Output summary of which hypotheses survived.

## Markdown template — `02-verification.md`

On first run, write the full structure. On re-runs, leave `## Initial entries` untouched and append to `## Revisions`.

```markdown
---
phase: 2
slug: <same as 00-context.md>
output_dir: <same as 00-context.md>
mode: tooled | conversational
last_updated: <UTC ISO-8601>
summary:
  pass: <N>
  fail: <N>
  refine: <N>
---

# Phase 2 — Verification (L0 → L1)

## Initial entries

### H1 — verdict: PASS
- **Type check**: passed — <notes>
- **Constraint check**: passed — <notes>
- **Logic check**: passed — <notes>
- **Notes**: <any cross-check details, edge cases considered>

### H2 — verdict: FAIL
- **Type check**: passed
- **Constraint check**: **FAILED** — violates "<invariant from 00-context.md>"
- **Logic check**: n/a
- **Notes**: hypothesis is incoherent with the bounded context

### H3 — verdict: REFINE
- **Type check**: passed
- **Constraint check**: ambiguous — needs <X> clarified
- **Logic check**: passed
- **Feedback**: <what the abductor needs to refine before re-verification>

## Revisions
<empty on first run; appended on re-runs>
```

## Tool Guide: `quint_verify`
-   **hypothesis_id**: The ID of the hypothesis being checked.
-   **checks_json**: A JSON string detailing the logic checks performed.
    *   *Format:* `{"type_check": "passed", "constraint_check": "passed", "logic_check": "passed", "notes": "Consistent with Postgres requirements."}`
-   **verdict**: "PASS", "FAIL", or "REFINE".

## Example: Success Path

```
L0 hypotheses: [redis-caching, cdn-edge, lru-cache]

[Call quint_verify(hypothesis_id="redis-caching", verdict="PASS", ...)]  → L0 → L1
[Call quint_verify(hypothesis_id="cdn-edge", verdict="PASS", ...)]  → L0 → L1
[Call quint_verify(hypothesis_id="lru-cache", verdict="FAIL", ...)]  → L0 → invalid

Result: 2 L1 hypotheses, ready for Phase 3.
```

## Example: Failure Path

```
L0 hypotheses: [redis-caching, cdn-edge, lru-cache]

"After reviewing, redis-caching and cdn-edge look logically sound..."
[No quint_verify calls made]

Result: All hypotheses remain L0. Phase 3 will be BLOCKED. PROTOCOL VIOLATION.
```

## Checkpoint

Before proceeding to Phase 3, verify:
- [ ] Active cycle located and `00-context.md` + `01-hypotheses.md` read
- [ ] `<output_dir>/02-verification.md` exists with a verdict for EVERY L0 hypothesis
- [ ] Used only valid verdict values (PASS / FAIL / REFINE)
- [ ] At least one verdict is PASS (otherwise Phase 3 is empty — go back to `/q1-add` to inject more hypotheses)
- [ ] (Tooled only) Called `quint_verify` for each L0 hypothesis (success, not BLOCKED)

**If any checkbox is unchecked, you MUST complete it before proceeding.**
