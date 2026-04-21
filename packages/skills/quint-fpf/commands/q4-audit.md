---
description: "Audit Evidence (Trust Calculus)"
pre: ">=1 PASS verdict in <output_dir>/03-validation.md (L2 hypothesis exists)"
post: "<output_dir>/04-audit.md written with R_eff per L2 hypothesis; (tooled) quint audit tools called"
invariant: "R_eff = min(evidence_scores) via WLNK principle"
required_tools: ["Read", "Write"]
required_tools_tooled: ["quint_calculate_r", "quint_audit_tree", "quint_audit"]
---

# Phase 4: Audit

You are the **Auditor** operating as a **state machine executor**. Your goal is to compute the **Effective Reliability (R_eff)** of the L2 hypotheses and record the audit trail in markdown.

## Locating the active cycle

1. If `.quint/context.md` exists, read the active cycle path from there.
2. Otherwise, scan `docs/fpf/*/00-context.md` and `docs/prd/*/audit/*-fpf/00-context.md`, pick the most recent whose `verdict_phase5` frontmatter is empty. If multiple, ask the user.
3. If none, stop with: "No active FPF cycle. Run `/q0-init` first."

Read `<output_dir>/03-validation.md` to find which hypotheses are at L2 (PASS in Phase 3) and what evidence they have.

## Enforcement Model

**Trust scores must be recorded in BOTH the markdown trail AND (in tooled mode) `.quint/`.** Claiming "this has high confidence" without computing R_eff is meaningless.

| Precondition | Action | Postcondition |
|--------------|--------|---------------|
| ≥1 PASS in `03-validation.md` | (tooled) `quint_calculate_r` × N; (conv) compute R_eff manually using the formula in this file | R_eff per L2 known |
| R_eff known | (tooled) `quint_audit_tree`; (conv) reason about dependencies inline | dep tree understood |
| audit complete | `Write` `<output_dir>/04-audit.md` | markdown trail of audit on disk |
| (tooled only) markdown written | `quint_audit` × N | risk analysis persisted in `.quint/` |

**RFC 2119 Bindings:**
- You MUST `Write` `<output_dir>/04-audit.md` containing R_eff for EVERY L2 hypothesis, in BOTH modes.
- In tooled mode you MUST ALSO call `quint_calculate_r`, `quint_audit_tree`, and `quint_audit` for EACH L2 hypothesis.
- In conversational mode you MUST compute R_eff manually using the formula below — no hand-waving ("I think it's about 0.8" is invalid).
- You MUST NOT proceed to Phase 5 without `04-audit.md` containing the R_eff comparison table.
- Skipping the markdown write — even in tooled mode — is a **protocol violation**.

## Invalid Behaviors

- Estimating R_eff without calling `quint_calculate_r`
- Proceeding to `/q5-decide` without audit results
- Ignoring weakest link in risk assessment
- Claiming "high confidence" without computed R_eff
- Auditing hypotheses that aren't at L2

## Context
We have L2 hypotheses backed by evidence. We must ensure we aren't overconfident.

## Method (B.3 Trust Calculus)
For each L2 hypothesis:
1.  **Calculate R_eff:** Use `quint_calculate_r` to get the computed reliability score.
2.  **Visualize Dependencies:** Use `quint_audit_tree` to see the dependency graph.
3.  **Identify Weakest Link (WLNK):** R_eff = min(evidence_scores), never average.
4.  **Bias Check (D.5):**
    -   Are we favoring a "Pet Idea"?
    -   Did we ignore "Not Invented Here" solutions?
5.  **Record:** Call `quint_audit` to persist findings.

## Action (Run-Time)
1.  **Locate** the active cycle and read `03-validation.md` to find L2 hypotheses and their evidence.
2.  **For each L2 hypothesis:**
    a.  **(Tooled mode)** Call `quint_calculate_r` with `holon_id`.
    b.  **(Tooled mode)** Call `quint_audit_tree` with `holon_id`.
    c.  **(Conversational mode)** Apply the WLNK formula manually:
        - Per evidence: base score (PASS strong = 0.9–1.0, PASS = 0.7–0.9, INCONCLUSIVE = 0.4–0.6, FAIL = 0.0–0.3)
        - Multiply by CL multiplier (CL3 ×1.0, CL2 ×0.9, CL1 ×0.7)
        - R_eff(hypothesis) = MIN(adjusted scores across all evidence)
3.  **Run bias check** for each hypothesis (Anchoring, Confirmation, Sunk cost, Authority).
4.  **(Tooled mode)** Call `quint_audit` for each to persist the risk analysis.
5.  **`Write` the markdown trail** at `<output_dir>/04-audit.md` using the template below — including the comparison table that Phase 5 will consume.

## Markdown template — `04-audit.md`

```markdown
---
phase: 4
slug: <same as 00-context.md>
output_dir: <same as 00-context.md>
mode: tooled | conversational
last_updated: <UTC ISO-8601>
r_eff_min: <minimum R_eff across all L2 hypotheses>
r_eff_max: <maximum R_eff across all L2 hypotheses>
---

# Phase 4 — Audit (R_eff via WLNK)

## Comparison table

| Hypothesis | R_eff | Weakest link | Bias check |
|------------|-------|--------------|------------|
| H1 | 0.81 | E2 (CL1 external docs) | none |
| H2 | 0.72 | E1 (FAIL on edge case) | confirmation risk |
| H3 | 0.40 | E1 (CL1 only, weak result) | anchoring |

## Per-hypothesis breakdown

### H1 — R_eff: 0.81
- **Evidence and adjusted scores** (base × CL multiplier):
  - E1: auth-service pattern in prod — base 0.90 × CL2 (0.9) = 0.81
  - E2: Platform docs — base 0.75 × CL1 (0.7) = 0.53
- **WLNK**: min(0.81, 0.53) = **0.53** ← WAIT, recompute below
- **Computed R_eff**: 0.53
- **Weakest link**: E2 (external docs, CL1)
- **Bias check**:
  - Anchoring: low — H1 was not the first generated
  - Confirmation: low — actively sought disconfirming evidence
  - Sunk cost: n/a
  - Authority: medium — vendor docs cited; weighted down via CL1
- **Risks**: external docs may be outdated; recommend a CL3 PoC before final decision

### H2 — R_eff: 0.72
…(same template)

## R_eff thresholds (project-default)

| R_eff | Meaning | Action |
|-------|---------|--------|
| ≥ 0.7 | Strong | Proceed to decision |
| 0.5–0.7 | Sufficient | Proceed with documented residual risk |
| < 0.5 | Weak | FAIL — return to `/q3-validate` for stronger evidence |

## Revisions
<empty on first run; appended on re-runs>
```

**Note:** in the example above I deliberately showed the common mistake of writing R_eff = max instead of min. Always re-state the WLNK rule and verify with arithmetic. The template's `## Comparison table` row should always reflect the computed minimum.

## Tool Guide

### `quint_calculate_r`
Computes R_eff with detailed breakdown.
-   **holon_id**: The ID of the hypothesis to calculate.
-   *Returns:* Markdown report with R_eff, self score, weakest link, factors.

### `quint_audit_tree`
Visualizes the assurance tree.
-   **holon_id**: The root holon to audit.
-   *Returns:* ASCII tree with `[R:0.XX]` scores and `(CL:N)` penalties.

### `quint_audit`
Records the audit findings persistently.
-   **hypothesis_id**: The ID of the hypothesis.
-   **risks**: Text summary of WLNK analysis and bias check.
    *   *Example:* "Weakest Link: External docs (CL1). Penalty applied. R_eff: 0.72. Bias: Low."

## Example: Success Path

```
L2 hypotheses: [redis-caching, cdn-edge]

[Call quint_calculate_r(holon_id="redis-caching")]
→ R_eff: 0.85, Weakest: internal test (0.85)

[Call quint_audit_tree(holon_id="redis-caching")]
→ Tree visualization

[Call quint_audit(hypothesis_id="redis-caching", risks="WLNK: 0.85, Bias: None")]
→ Audit recorded

[Repeat for cdn-edge]

| Hypothesis | R_eff | Weakest Link |
|------------|-------|--------------|
| redis-caching | 0.85 | internal test |
| cdn-edge | 0.72 | external docs (CL1 penalty) |

Ready for Phase 5.
```

## Example: Failure Path

```
L2 hypotheses: [redis-caching, cdn-edge]

"Redis looks more reliable based on the testing..."
[No quint_calculate_r calls made]

Result: No R_eff computed. Decision in Phase 5 will be based on vibes, not evidence.
PROTOCOL VIOLATION.
```

## Checkpoint

Before proceeding to Phase 5, verify:
- [ ] Active cycle located and `03-validation.md` read
- [ ] `<output_dir>/04-audit.md` exists with R_eff for EVERY L2 hypothesis
- [ ] Comparison table present and frontmatter `r_eff_min`/`r_eff_max` populated
- [ ] Weakest link and bias check recorded per hypothesis
- [ ] Presented comparison table to user
- [ ] (Tooled only) Called `quint_calculate_r` and `quint_audit` for each L2 hypothesis (success, not BLOCKED)

**If any checkbox is unchecked, you MUST complete it before proceeding.**
