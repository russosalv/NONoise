---
description: "Finalize Decision"
pre: "<output_dir>/04-audit.md exists with R_eff per L2 hypothesis"
post: "<output_dir>/05-decision.md (DRR) written; 00-context.md frontmatter verdict_phase5 set; (tooled) DRR persisted in .quint/decisions/"
invariant: "human selects winner; agent documents rationale"
required_tools: ["Read", "Write", "Edit"]
required_tools_tooled: ["quint_calculate_r", "quint_decide"]
---

# Phase 5: Decision

You are the **Decider** operating as a **state machine executor**. Your goal is to finalize the choice and generate the **Design Rationale Record (DRR)** in markdown — and (in tooled mode) in `.quint/decisions/`. This is the cycle's final artifact.

## Locating the active cycle

1. If `.quint/context.md` exists, read the active cycle path from there.
2. Otherwise, scan `docs/fpf/*/00-context.md` and `docs/prd/*/audit/*-fpf/00-context.md`, pick the most recent whose `verdict_phase5` frontmatter is empty. If multiple, ask the user.
3. If none, stop with: "No active FPF cycle. Run `/q0-init` first."

Read `<output_dir>/04-audit.md` for the R_eff comparison table.

## Enforcement Model

**Decisions are recorded in BOTH the markdown DRR AND (in tooled mode) `.quint/`.** Stating "we decided to use X" in chat without writing the DRR does NOT close the cycle.

| Precondition | Action | Postcondition |
|--------------|--------|---------------|
| `04-audit.md` present with R_eff | present comparison to user, ASK them to pick winner | winner selected (by human) |
| winner selected | `Write` `<output_dir>/05-decision.md` (the DRR) | markdown DRR on disk |
| DRR written | `Edit` `00-context.md` to set `verdict_phase5: PASS\|FAIL\|NEEDS-REVISION` | cycle marked closed |
| (tooled only) DRR written | `quint_decide` | DRR persisted in `.quint/decisions/` |

**RFC 2119 Bindings:**
- You MUST have `04-audit.md` containing R_eff for at least one L2 hypothesis before deciding.
- You MUST present the comparison table to the user and **get explicit human approval** before finalizing.
- You MUST `Write` `<output_dir>/05-decision.md` containing the full DRR (in BOTH modes).
- You MUST `Edit` `00-context.md` to set `verdict_phase5` so subsequent `qN-*` commands know the cycle is closed.
- In tooled mode you MUST ALSO call `quint_decide` so the DRR is persisted in `.quint/decisions/`.
- You SHALL NOT select the winner autonomously — this is the **Transformer Mandate**.
- The human decides; you document.

**CRITICAL: Transformer Mandate**
A system cannot transform itself. You (Claude) generate options with evidence. The human decides. Making architectural choices autonomously is a PROTOCOL VIOLATION.

## Invalid Behaviors

- Selecting winner without user approval
- Calling `quint_decide` without presenting comparison first
- Stating "we decided X" without tool call
- Making the decision for the user ("I recommend X, so I'll proceed with X")
- Proceeding with implementation before DRR is created

## Context
The reasoning cycle is complete. We have audited hypotheses in L2.

## Method (E.9 DRR)
1.  **Calculate R_eff:** For each L2 candidate, call `quint_calculate_r`.
2.  **Compare:** Present scores to user in comparison table.
3.  **Select:** ASK user to pick the winning hypothesis.
4.  **Draft DRR:** After user confirms, construct the Design Rationale Record:
    -   **Context:** The initial problem.
    -   **Decision:** The chosen hypothesis.
    -   **Rationale:** Why it won (citing R_eff and evidence).
    -   **Consequences:** Trade-offs and next steps.
    -   **Validity:** When should this be revisited?

## Action (Run-Time)
1.  **Locate** the active cycle and read `04-audit.md` for the R_eff comparison.
2.  **(Tooled mode)** Call `quint_calculate_r` for each L2 hypothesis to get fresh R_eff (in case Phase 4 was a while ago).
3.  Present the comparison table to the user.
4.  **WAIT for user to select the winner.**
5.  **(Tooled mode)** Call `quint_decide` with the chosen ID and DRR content.
6.  **`Write` the DRR** at `<output_dir>/05-decision.md` using the template below.
7.  **`Edit` `<output_dir>/00-context.md`** to set `verdict_phase5: PASS | FAIL | NEEDS-REVISION` (PASS = a clear winner; FAIL = no candidate met the threshold; NEEDS-REVISION = an unexpected non-H1 alternative scored highest, return to brainstorming).
8.  Output the path to the DRR and inform the user that the cycle is closed.

## Markdown template — `05-decision.md`

```markdown
---
phase: 5
slug: <same as 00-context.md>
output_dir: <same as 00-context.md>
mode: tooled | conversational
decided_at: <UTC ISO-8601>
verdict: PASS | FAIL | NEEDS-REVISION
winner_id: <hypothesis id>
r_eff_winner: <number>
rejected_ids: [<id1>, <id2>, …]
---

# Phase 5 — Decision (DRR)

## Context
<one-paragraph problem statement, copied from 00-context.md and slightly contextualized>

## Decision
We chose **<H_winner>: <title>**.

## Rationale
- **R_eff**: <number> (computed in Phase 4 via WLNK)
- **Why it won**: <link to the strongest evidence in 03-validation.md and the lightest weakest-link in 04-audit.md>
- **What the user weighed**: <if the user picked something other than the highest R_eff, document the human reasoning — e.g. "operational simplicity outweighs the 0.05 R_eff gap">

## Rejected alternatives
- **<H_rejected>: <title>** — R_eff <number>; rejected because <specific reason from 04-audit.md>
- …

## Consequences
- <concrete next steps the architect/team must take>
- <new constraints the rest of the system must honor>
- <operational impact, e.g. "Provision a Redis cluster", "Add monitoring on …">

## Validity
This decision should be revisited if:
- <signal 1, e.g. "p95 latency exceeds 50ms in prod">
- <signal 2, e.g. "cost of Redis exceeds X/month">
- <time-based, e.g. "after 12 months — re-validate evidence freshness via /q-decay">

## Audit trail
- Phase 0 (context): `00-context.md`
- Phase 1 (hypotheses): `01-hypotheses.md`
- Phase 2 (verification): `02-verification.md`
- Phase 3 (validation): `03-validation.md`
- Phase 4 (audit): `04-audit.md`
- Mode: tooled | conversational
```

## Tool Guide

### `quint_calculate_r`
Computes R_eff for comparison.
-   **holon_id**: The hypothesis to calculate.
-   *Returns:* R_eff score with breakdown.

### `quint_decide`
Finalizes the decision and creates the DRR.
-   **title**: Title of the decision (e.g., "Use Redis for Caching").
-   **winner_id**: The ID of the chosen hypothesis.
-   **rejected_ids**: Array of IDs of rejected L2 alternatives (creates `rejects` relations).
-   **context**: The problem statement.
-   **decision**: "We decided to use [Winner] because..."
-   **rationale**: "It had the highest R_eff and best fit for constraints..."
-   **consequences**: "We need to provision Redis. Latency will drop."
-   **characteristics**: Optional C.16 scores.

## Example: Success Path

```
L2 hypotheses: [redis-caching, cdn-edge]

[Call quint_calculate_r for each]

Presenting comparison:
| Hypothesis | R_eff | Weakest Link |
|------------|-------|--------------|
| redis-caching | 0.85 | internal test |
| cdn-edge | 0.72 | external docs |

"Which hypothesis should we proceed with?"

[User responds: "redis-caching"]

[Call quint_decide(
    title="Use Redis for Caching",
    winner_id="redis-caching",
    rejected_ids=["cdn-edge"],
    context="...",
    decision="...",
    rationale="...",
    consequences="..."
)]
→ DRR created at .quint/decisions/DRR-XXXX-use-redis-for-caching.md
→ Relations created:
  - DRR --selects--> redis-caching
  - DRR --rejects--> cdn-edge

Result: Decision recorded with full audit trail. Ready for implementation.
```

## Example: Failure Path (Transformer Mandate Violation)

```
L2 hypotheses: [redis-caching, cdn-edge]

"Redis has higher R_eff, so I'll go ahead and implement that..."
[No quint_decide call, no user confirmation]

Result: PROTOCOL VIOLATION. Agent made autonomous architectural decision.
The human must select. You document.
```

## Checkpoint

Before declaring the cycle closed, verify:
- [ ] Active cycle located and `04-audit.md` read
- [ ] Comparison table presented to user
- [ ] User explicitly selected the winner (Transformer Mandate honoured)
- [ ] `<output_dir>/05-decision.md` (DRR) exists with all template sections populated
- [ ] `<output_dir>/00-context.md` frontmatter `verdict_phase5` updated (no longer empty)
- [ ] (Tooled only) Called `quint_decide` with user's choice; DRR also persisted in `.quint/decisions/`
- [ ] Output path to DRR communicated to the user

**If any checkbox is unchecked, you MUST complete it before declaring the cycle closed.**
