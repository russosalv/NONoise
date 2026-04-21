---
description: "Validate (Induction)"
pre: ">=1 PASS verdict in <output_dir>/02-verification.md (L1 hypothesis exists)"
post: "<output_dir>/03-validation.md written; (tooled) L1 → L2 (PASS) / invalid (FAIL) / L1 with feedback (REFINE)"
invariant: "test_type ∈ {internal, external}; verdict ∈ {PASS, FAIL, REFINE}"
required_tools: ["Read", "Write"]
required_tools_tooled: ["quint_test"]
---

# Phase 3: Induction (Validation)

You are the **Inductor** operating as a **state machine executor**. Your goal is to gather **Empirical Validation (EV)** for L1 hypotheses to promote them to L2, and to record the evidence trail in markdown.

**Also serves as the REFRESH action** in the Evidence Freshness governance loop (see `/q-decay`).

## Locating the active cycle

1. If `.quint/context.md` exists, read the active cycle path from there.
2. Otherwise, scan `docs/fpf/*/00-context.md` and `docs/prd/*/audit/*-fpf/00-context.md`, pick the most recent whose `verdict_phase5` frontmatter is empty. If multiple, ask the user.
3. If none, stop with: "No active FPF cycle. Run `/q0-init` first."

Read `<output_dir>/02-verification.md` to find which hypotheses are at L1 (PASS in Phase 2).

## Enforcement Model

**Validation must be recorded in BOTH the markdown trail AND (in tooled mode) `.quint/`.** Research findings or empirical observations stated in chat without writing them down do NOT count as evidence.

| Precondition | Action | Postcondition |
|--------------|--------|---------------|
| ≥1 PASS in `02-verification.md` | gather evidence per L1 hypothesis | evidence ready |
| evidence ready | `Write` `<output_dir>/03-validation.md` | markdown trail of validation on disk |
| (tooled only) markdown written | `quint_test` × N | L1 → L2 / invalid / L1+feedback in `.quint/` |

**RFC 2119 Bindings:**
- You MUST `Write` `<output_dir>/03-validation.md` containing evidence for EVERY L1 hypothesis examined.
- In tooled mode you MUST ALSO call `quint_test` for EACH L1 hypothesis.
- You MUST NOT call `quint_test` on L0 hypotheses — they must pass Phase 2 first.
- You SHALL specify `test_type` as "internal" (code test) or "external" (research/docs).
- Verdict MUST be exactly "PASS", "FAIL", or "REFINE".
- Skipping the markdown write — even in tooled mode — is a **protocol violation**.

**If `quint_test` returns BLOCKED ("hypothesis not found in L1 or L2"):** you skipped Phase 2 for that hypothesis. Go back to `/q2-verify` first.

## Invalid Behaviors

- Calling `quint_test` on L0 hypothesis (WILL BE BLOCKED)
- Calling `quint_test` on hypothesis that doesn't exist
- Stating "validated via testing" without tool call
- Proceeding to `/q4-audit` with zero L2 hypotheses

**Note:** Calling `quint_test` on L2 hypotheses is now VALID — it refreshes their evidence for the freshness governance loop.

## Context
We have substantiated hypotheses (L1) that passed logical verification. We need evidence that they work in reality.

## Method (Agentic Validation Strategy)
For each L1 hypothesis, choose the best validation strategy:

1.  **Strategy A: Internal Test (Preferred - Highest R)**
    *   *Action:* Write and run a reproduction script, benchmark, or prototype.
    *   *Why:* Direct evidence in the target context has Congruence Level (CL) = 3 (Max).
    *   *Use when:* Code is executable, environment is available.

2.  **Strategy B: External Research (Fallback)**
    *   *Action:* Use available MCP tools (search, docs, knowledge bases).
    *   *Why:* Evidence from other contexts has lower CL (1 or 2). Applies penalty to R.
    *   *Use when:* Running code is impossible or too costly.

## Action (Run-Time)
1.  **Locate** the active cycle and read `<output_dir>/02-verification.md` to find L1 hypotheses (those with PASS verdict in Phase 2).
2.  **Decide:** Pick Strategy A or B for each L1 hypothesis.
3.  **Execute:** Run tests or gather research. Capture concrete evidence (numbers, file paths, URLs, citations).
4.  **(Tooled mode)** Call `quint_test` for EACH L1 hypothesis with the gathered evidence.
5.  **`Write` the markdown trail** at `<output_dir>/03-validation.md` using the template below.

## Markdown template — `03-validation.md`

On first run, write the full structure. On re-runs (including evidence refresh for L2 hypotheses, see end of file), append to `## Revisions`.

```markdown
---
phase: 3
slug: <same as 00-context.md>
output_dir: <same as 00-context.md>
mode: tooled | conversational
last_updated: <UTC ISO-8601>
summary:
  pass: <N>
  fail: <N>
  refine: <N>
---

# Phase 3 — Validation (L1 → L2)

## Initial entries

### H1 — verdict: PASS
- **Test type**: internal (CL3) | external (CL1 or CL2)
- **Strategy applied**: <e.g., "Wrote benchmark script `bench/redis.ts`, measured p95 latency">
- **Evidence**:
  - Result: <numeric or qualitative result, e.g. "p95 = 5.2ms, n=10k">
  - Source: <file path / URL / repository reference>
  - Reproducibility: <how to re-run, if internal>
- **Notes**: <caveats, sample size, environment differences>

### H2 — verdict: FAIL
- **Test type**: external (CL1)
- **Strategy applied**: <docs review only, since no test environment>
- **Evidence**:
  - Result: documented incompatibility — vendor recommends against this pattern at our scale
  - Source: <URL>
- **Notes**: insufficient evidence to promote; demoted

## Revisions
<empty on first run; appended on re-runs and on L2 refreshes>
```

## Tool Guide: `quint_test`
-   **hypothesis_id**: The ID of the L1 hypothesis.
-   **test_type**: "internal" (code/test) or "external" (docs/search).
-   **result**: Summary of evidence (e.g., "Script passed, latency 5ms").
-   **verdict**: "PASS" (promote to L2), "FAIL" (demote), "REFINE".

## Example: Success Path

```
L1 hypotheses: [redis-caching, cdn-edge]

[Run benchmark script for redis-caching]
[Call quint_test(hypothesis_id="redis-caching", test_type="internal", verdict="PASS", ...)]  → L1 → L2

[Search docs for CDN configuration]
[Call quint_test(hypothesis_id="cdn-edge", test_type="external", verdict="PASS", ...)]  → L1 → L2

Result: 2 L2 hypotheses, ready for Phase 4.
```

## Example: Failure Path (What caught me earlier)

```
User asks to validate a hypothesis about "prompt engineering"

[Call quint_test(hypothesis_id="command-prompts-as-contracts", ...)]
→ BLOCKED: "hypothesis not found in L1"

Why: Hypothesis was already L2, or never existed as L1.
Fix: Check hypothesis layer first. If L0, run Phase 2. If L2, skip to Phase 4.
```

## Example: Protocol Violation

```
L1 hypotheses: [redis-caching]

"I researched Redis best practices and it looks good..."
[No quint_test call made]

Result: Hypothesis remains L1. Phase 4 will find no L2 to audit. PROTOCOL VIOLATION.
```

## Checkpoint

Before proceeding to Phase 4, verify:
- [ ] Active cycle located and `02-verification.md` read
- [ ] Worked only on L1 hypotheses (PASS in Phase 2), not L0
- [ ] `<output_dir>/03-validation.md` exists with evidence for EVERY L1 hypothesis examined
- [ ] Used valid `test_type` values (internal/external) and valid verdicts (PASS/FAIL/REFINE)
- [ ] At least one verdict is PASS (otherwise Phase 4 has nothing to audit)
- [ ] (Tooled only) Called `quint_test` for each L1 hypothesis (success, not BLOCKED)

**If any checkbox is unchecked, you MUST complete it before proceeding.**

---

## Evidence Refresh (L2 → L2)

When called with an L2 hypothesis, `quint_test` adds fresh evidence without changing the layer. The markdown reflects this by appending the refresh entry under `## Revisions` (with the same template as an initial entry, plus a `refresh_of: <hypothesis_id>` field).

**Use case:** `/q-decay` shows stale evidence on an L2 holon. Run `/q3-validate <hypothesis_id>` to refresh.

| Current Layer | Verdict | Outcome |
|---------------|---------|---------|
| L1 | PASS | Promotes to L2; entry under `## Initial entries` |
| L1 | FAIL | Stays L1; entry under `## Initial entries` (or `## Revisions` if not first run) |
| L2 | PASS | Stays L2, fresh evidence appended under `## Revisions` |
| L2 | FAIL | Stays L2, failure appended under `## Revisions`; consider `/q-decay --deprecate` |
