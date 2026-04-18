---
name: arch-decision
description: Formal validation of an existing PRD (produced by `arch-brainstorm`) using the Quint FPF methodology via the `quint-fpf` sub-skill. Reads a PRD in `draft` status, extracts architectural hypotheses from the decision story, verifies them through abduction → deduction → induction, computes R_eff via WLNK, produces an audit report, and updates the frontmatter to `validated`/`rejected`. On PASS it reminds the architect to update `docs/architecture/` (the source of truth) manually — NONoise does not prescribe an auto-sync skill. USE AS STEP 2 of the NONoise architectural workflow — `arch-brainstorm` → **`arch-decision`** → `sprint-manifest`. Input is a path to a `draft` PRD; output is validation or revision requests. Does not create PRDs from scratch (that is `arch-brainstorm`'s job). Triggers — "validate this PRD", "apply Quint FPF to <file>", "arch-decision <path>", "formally assess the architectural decision in <file>", "verify PRD X with FPF". Also triggers without explicit mention when the user refers to a just-written PRD and wants to validate it.
source: Risko reference-project (reworked whitelabel for NONoise)
variant: nonoise generic; stack-neutral; delegates methodology to quint-fpf
---

# arch-decision — Formal Quint FPF validation of an existing PRD

This skill is **step 2** of the NONoise architectural workflow. It applies the **First Principles Framework (Quint FPF)** — fully documented in the sibling skill `quint-fpf` — to a narrative PRD already written by `arch-brainstorm`, producing a reliability audit and updating the PRD lifecycle state.

## Position in the workflow

```
┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
│ arch-       │──▶│ arch-        │──▶│ sprint-manifest  │
│ brainstorm  │   │ decision     │   │                  │
│             │   │ (THIS SKILL) │   │                  │
│ explore +   │   │ validate via │   │ promote to       │
│ dialog +    │   │ quint-fpf    │   │ sprint manifest  │
│ write PRD   │   │              │   │                  │
└─────────────┘   └──────────────┘   └──────────────────┘
     STEP 1            STEP 2              STEP 3
```

After a PRD reaches `validated` state, **the architect updates `docs/architecture/` manually** to reflect the new decision. NONoise does not ship an auto-sync skill — the source of truth is governed by the human, not the framework. Projects with a strong architecture governance model can install a project-specific sync skill via `skill-finder`.

## Relationship with other skills

- **Input**: a PRD in `draft` state created by `arch-brainstorm` at `docs/prd/<area>/NN-<study>.md`
- **Delegates methodology to**: `quint-fpf` — the generic First Principles Framework sub-skill. `arch-decision` is the opinionated wrapper that adapts the 6-phase FPF cycle to a PRD validation use-case.
- **Output**:
  - Audit report at `docs/prd/<area>/audit/NN-<study>-fpf.md`
  - PRD frontmatter updated with `status: validated | rejected`, `validated_at`, `validated_by`
  - Reminder message to the architect to update `docs/architecture/` manually on PASS
- **Does NOT**:
  - Create drafts from scratch → that is `arch-brainstorm`'s job
  - Publish into `docs/architecture/` → the architect does that manually after reading the validated PRD
  - Explore the codebase to produce a design → the design is already in the PRD

## Methodology: Quint FPF in brief

The First Principles Framework forces an explicit reasoning cycle based on three inference modes:

| Phase | Inference | What it does | Why it matters |
|---|---|---|---|
| Abduction | "What could it be?" | Extract/generate competing hypotheses | Avoids confirmation bias |
| Deduction | "Does it hold logically?" | Verify constraints and consistency | Eliminates incoherent hypotheses |
| Induction | "Does it work in practice?" | Gather empirical evidence | Grounds the decision in facts |

Decisions taken "by feel" create invisible technical debt. This process forces every architectural decision to have an audit trail: which alternatives were evaluated, why they were rejected, what evidence was used to decide.

**Relationship with `quint-fpf`**: this skill does not re-implement FPF. It:
1. Invokes `quint-fpf` as a sub-skill (in tooled mode if the Quint MCP server is installed, conversational fallback otherwise)
2. Seeds `quint-fpf`'s Phase 0 (Bounded Context) from the PRD's own context
3. Seeds `quint-fpf`'s Phase 1 (Abduction) with hypotheses **extracted from the PRD's decision story** (§2 of the PRD template) — no ex-novo creative work
4. Runs the FPF cycle through Phase 5 (Decide)
5. Reads the final decision holon / audit and projects it back onto the PRD lifecycle (`status: validated | rejected`)

---

## Mandatory inputs

To proceed, the skill must receive:

1. **Path to the PRD to validate** (e.g. `docs/prd/user-signup/01-email-otp.md`)
2. The PRD must be in `draft` state in the frontmatter (otherwise ask the architect to confirm — they may want to re-validate an already-validated PRD)
3. The PRD must contain a "Decision story" section with listed key decisions (§2 of the `arch-brainstorm` template)

If any of these is missing, **stop** and ask the architect to produce a valid PRD via `arch-brainstorm` first.

---

## Flow — 6 phases

Each phase is a checkpoint: **ask for user confirmation before moving on**. The user can re-enter at any phase (resume from where they left off if a partial audit report already exists).

| # | Phase | Output | quint-fpf correspondence |
|---|---|---|---|
| 1 | HYPOTHESIZE (Abduction) | List of hypotheses extracted from the PRD + diversity check | `quint_propose` (Phase 1) |
| 2 | VERIFY (Deduction) | PASS/FAIL/REFINE verdicts per hypothesis | `quint_verify` (Phase 2) |
| 3 | VALIDATE (Induction) | Evidence with Congruence Level (CL1–CL3) | `quint_validate` (Phase 3) |
| 4 | AUDIT (Trust Calculus) | R_eff per hypothesis, bias check, audit tree | `quint_audit` (Phase 4) |
| 5 | DECIDE | Global PRD verdict (PASS/FAIL) | `quint_decide` (Phase 5) |
| 6 | FINALIZE | Frontmatter updated + audit report + sync trigger | post-FPF projection |

In **tooled mode** (Quint MCP server available), phases 1–5 are backed by `quint_*` tool calls — see `quint-fpf/SKILL.md` for exact signatures. In **conversational mode**, the same discipline is applied producing the audit report purely in markdown.

---

## Phase 1: HYPOTHESIZE — extract hypotheses from the PRD (Abduction)

**Goal**: identify the key architectural hypotheses from the PRD's story, verify they are structurally diverse (NQD principle), and add missing alternatives if the PRD lacks relevant ones.

### Actions

1. **Read the PRD completely**. In particular:
   - §2.2 "Key decisions" — primary source
   - §2.5 "What we will NOT do" — contains implicit rejected alternatives
   - §1 summary table of key choices

2. **Extract hypotheses**. For each key decision in the story, the typical pattern is:
   - **Winning hypothesis** (the one chosen in the PRD) — `H1`
   - **Considered alternatives** (discussed and rejected) — `H2`, `H3`, …

   Example: a PRD on "notifications" has in its story the decision "Messaging style: pub/sub self-subscription" with alternatives A (Outbox), B (event-driven cross-component), C (hybrid). The FPF hypotheses are:
   - H1 = pub/sub self-sub (chosen in the PRD)
   - H2 = Outbox table + worker
   - H3 = Event-driven cross-component

   Create distinct hypothesis groups for **every relevant architectural decision**, not just the first. If a PRD has 10 decisions, you might have 10 groups; in practice 3–5 groups of the most impactful decisions (the ones that, if different, would change the whole design) are enough.

3. **Verify the Diversity Principle (NQD)**: hypotheses within each group must be **structurally different**, not cosmetic variants of the same idea. If the PRD only proposes cosmetic variants, **flag it**: the story is too guided and should be enriched.

4. **If obvious alternatives are missing**: add them yourself as an auditor would. Document that they were added at audit time (they were not in the original PRD). Example: a PRD choosing "short-lived tokens" without considering "encrypted long-lived tokens in DB" — add that alternative.

5. **Write the partial audit file** at `docs/prd/<area>/audit/NN-<study>-fpf.md`:

```markdown
---
title: "FPF audit — <study title>"
area: <area-slug>
study: <study-slug>
kind: audit
related_prd: ../NN-<study>.md
quint_fpf_run: <timestamp>
verdict: IN_PROGRESS
r_eff: null
audited_at: <today>
---

# FPF audit — <study title>

> Validated PRD: [`../NN-<study>.md`](../NN-<study>.md)
> Audit date: YYYY-MM-DD

## Phase 1 — HYPOTHESIZE (extraction)

### Decision group 1: <key decision title>

| ID | Hypothesis | Origin | Classification |
|----|------------|--------|----------------|
| H1 | <choice in the PRD> | PRD § 2.2 | Chosen |
| H2 | <alternative 1> | PRD § 2.2 (rejected) | Rejected in story |
| H3 | <alternative 2> | Added at audit | Not present in PRD |

### Decision group 2: ...
```

6. **Add a cumulative hypotheses table** to the audit report:

```markdown
## Hypotheses table (current state)

| ID | Hypothesis | Phase | Verdict | CL | Notes |
|----|------------|-------|---------|-----|-------|
| H1 | <short text> | HYPOTHESIZE | — | — | Chosen by the PRD |
| H2 | <short text> | HYPOTHESIZE | — | — | |
```

### Phase 1 checkpoint

- [ ] PRD fully read (frontmatter + §1–§2 at least)
- [ ] Hypotheses extracted from each key decision (groups)
- [ ] NQD diversity verified
- [ ] Initial audit report created
- [ ] Hypotheses table populated
- [ ] User confirmed to proceed to verification

**Ask**: "I extracted {N} hypotheses from the PRD ({M} added by me during audit). Do you want to confirm the list or add/change anything before verification?"

---

## Phase 2: VERIFY — logical verification (Deduction)

**Goal**: verify each hypothesis against logical and architectural constraints. Rule out those incoherent with the target architecture.

### Checks per hypothesis

| Check | Description |
|-------|-------------|
| **Type check** | Types, DTOs, interfaces compatible with the system? |
| **Constraint check** | Does it violate absolute constraints from `docs/architecture/01-constraints.md` or `CLAUDE.md`/`AGENTS.md` of the project? |
| **Consistency check** | Does the internal logic hold? Race condition, deadlock, circularity? |
| **Compatibility check** | Does it coexist with the existing architecture? API contracts, bounded context? |

### Verdicts

- **PASS** → proceeds to validation
- **FAIL** → rejected (document why)
- **REFINE** → must be modified (document what to change)

### Actions

1. **Read project constraints**:
   - `docs/architecture/01-constraints.md` — absolute constraints (project-maintained source of truth)
   - Other numbered files in `docs/architecture/` (patterns, stack, conventions) relevant to the area
   - `CLAUDE.md`, `AGENTS.md`, `nonoise.config.json` at repo root
   - Any project-specific arch skill installed via `skill-finder` (rare)

2. **For each hypothesis**, run the 4 checks and document them in the report:

```markdown
## Phase 2 — VERIFY

### H1 — <text>

| Check | Result | Notes |
|-------|--------|-------|
| Type check | PASS | DTOs compatible with shared contracts |
| Constraint check | PASS | No violated constraints |
| Consistency check | PASS | No race conditions |
| Compatibility check | PASS | Coherent with bounded context |

**Verdict**: PASS

### H2 — <text>
...
```

3. **Update the Hypotheses table** with verdicts:

```markdown
| H1 | ... | VERIFY | PASS | — | |
| H2 | ... | VERIFY | FAIL | — | Network overhead unacceptable |
```

### Phase 2 checkpoint

- [ ] Every hypothesis checked against the 4 checks
- [ ] At least one PASS per decision group
- [ ] FAILs documented with motivation
- [ ] Hypotheses table updated

**Ask**: "Verification done: {N} PASS, {M} FAIL, {K} REFINE. Detail: {summary}. Proceed to gather evidence?"

---

## Phase 3: VALIDATE — gather evidence (Induction)

**Goal**: empirical proof for PASS hypotheses. Facts only, no opinions.

### Congruence Level (CL) — evidence strength

| CL | Type | Example | Weight |
|----|------|---------|--------|
| **CL3** | Internal test (PoC, benchmark, spike) | "I wrote a benchmark, latency 5ms" | Max |
| **CL2** | Codebase analysis (existing pattern) | "`auth-service` already uses this pattern, works" | Medium |
| **CL1** | External research (docs, articles) | "The platform documentation recommends X" | Min |

Always prefer CL3 > CL2 > CL1. CL1 alone is not enough for critical decisions.

### Where to find evidence

For a PRD produced by `arch-brainstorm`, the evidence is often **already partially cited** in the story (§2) or in the appendices (code references). Your job is to **verify** and **strengthen**, not to start over.

1. Cite evidence **already in the PRD** at the highest possible level (e.g. "the pattern exists in `auth-service`" → verify with Grep)
2. For hypotheses with weak evidence in the PRD, run a codebase analysis with Grep/Glob/Explore agent
3. If a critical decision only has CL1 evidence (external research), **propose** doing a CL3 PoC first (or document the risk)

### Actions

For each PASS hypothesis (not FAIL):

1. **Pick the best available strategy**
2. **Gather evidence** with Grep/Glob/Bash/Explore agent if codebase checks are needed
3. **Document** in the audit report:

```markdown
## Phase 3 — VALIDATE

### H1 — <text>

**E1**: Pub/sub self-sub pattern already exists in `auth-service`
- **CL**: 2 (Codebase analysis)
- **Source**: `src/auth/events-controller.ts:35`
- **Result**: Identical pattern to the proposed one, in production for N months, 0 known incidents
- **Verdict**: PASS

**E2**: Platform pub/sub with retry/DLQ
- **CL**: 1 (External research)
- **Source**: Platform docs
- **Result**: Recommended pattern, built-in retry
- **Verdict**: PASS

### H2 — Outbox table + worker

**E1**: ...
```

4. Update the Hypotheses table with the max CL reached:

```markdown
| H1 | ... | VALIDATE | PASS | CL2 | Pattern in auth-service in prod |
| H3 | ... | VALIDATE | PASS | CL1 | Only external research |
```

### Phase 3 checkpoint

- [ ] Every PASS hypothesis has at least one piece of evidence
- [ ] Evidence documented with CL and source
- [ ] Hypotheses table updated

**Ask**: "Evidence gathered. {H1} has CL{X}, {H3} has CL{Y}. Deepen any with a CL3 PoC or proceed to audit?"

---

## Phase 4: AUDIT — Trust Calculus (R_eff)

**Goal**: compute an objective reliability score for each validated hypothesis, detect biases, and produce an audit tree that makes the reasoning transparent.

### The WLNK principle (Weakest Link)

A hypothesis's reliability is NOT the mean of its evidence — it is the **minimum**. Three pieces of evidence at 0.9, 0.9, 0.2 give R_eff = **0.2**, not 0.67.

Why: a chain is only as strong as its weakest link. If one piece of evidence is weak, the whole decision rests on that weakness.

### R_eff calculation per hypothesis

**Step 1 — base score per piece of evidence** (0.0–1.0):

| Evidence verdict | Base score |
|------------------|------------|
| Strong PASS (clear numeric result) | 0.9–1.0 |
| PASS (positive qualitative result) | 0.7–0.9 |
| INCONCLUSIVE | 0.4–0.6 |
| FAIL | 0.0–0.3 |

**Step 2 — apply Congruence Level penalty**:

| CL | Multiplier |
|----|-----------|
| CL3 (internal test) | × 1.0 |
| CL2 (codebase pattern) | × 0.9 |
| CL1 (external research) | × 0.7 |

`Score_adj = Score_base × CL_multiplier`

**Step 3 — apply WLNK**:

`R_eff(hypothesis) = MIN(Score_adj across all evidence)`

### Bias check

Verify these common biases before proceeding:

| Bias | Signal | Action |
|------|--------|--------|
| **Anchoring** | The first-generated hypothesis always wins | Reassess: did the others get enough evidence? |
| **Confirmation** | Only supporting evidence is sought | Actively look for evidence AGAINST the favorite |
| **Sunk cost** | "We already wrote the PRD on H1" | Time spent drafting is not a reason to pick it |
| **Authority** | "The vendor says do it this way" | CL1 — external research has reduced weight |

### Actions

1. **Compute R_eff** per hypothesis using the formula above
2. **Run the bias check** — answer every row honestly
3. **Build the audit tree** in the report:

```markdown
## Phase 4 — AUDIT

### Audit tree

| Hypothesis | Evidence | Base score | CL | Adj score | WLNK |
|------------|----------|------------|-----|-----------|------|
| H1 | E1: auth-service pattern | 0.90 | CL2 (×0.9) | 0.81 | |
| H1 | E2: Platform docs | 0.75 | CL1 (×0.7) | 0.53 | |
| **H1** | | | | **R_eff** | **0.53** |
| H2 | E1: ... | ... | ... | ... | |

### Bias check

- Anchoring: <analysis>
- Confirmation: <analysis>
- Sunk cost: N/A
- Authority: <analysis>

### Pre-decision recommendation

<If R_eff is low across all hypotheses, suggest gathering more CL3 evidence
before deciding. If there is a clear winner, indicate it.>
```

### R_eff thresholds

| R_eff | Meaning | Action |
|-------|---------|--------|
| ≥ 0.7 | **Strong** — solid evidence | Proceed to decision (PASS) |
| 0.5–0.7 | **Sufficient** — acceptable evidence | Proceed but document the risks (PASS with warning) |
| < 0.5 | **Weak** — insufficient evidence | FAIL — the PRD must be revised (return to `arch-brainstorm` with the gaps) |

### Phase 4 checkpoint

- [ ] R_eff computed per hypothesis
- [ ] Bias check completed
- [ ] Audit tree documented

**Ask**: "Audit complete. H1 R_eff={R1}, … {recommendation}. Proceed to global decision?"

---

## Phase 5: DECIDE — global PRD verdict

**Goal**: give a verdict to the PRD **as a whole**, based on the aggregated R_eff of the key decisions.

### Aggregation rule

The PRD passes (`validated`) if:
- **Every** H1 hypothesis (the ones chosen in the PRD) across all decision groups has R_eff ≥ 0.5 (minimum "Sufficient" threshold)
- **No** H1 has a FAIL verdict in Phase 2
- The bias check has not found critical problems

The PRD fails (`rejected`) if:
- At least one H1 has R_eff < 0.5 (Weak)
- At least one H1 is FAIL in Phase 2
- Critical bias check (e.g. evident Anchoring)

The PRD needs revision (`needs-revision`, returns to `draft`) if:
- An alternative rejected by the PRD has R_eff > R_eff of H1 (signal that the PRD picked the worst option)
- The story omits important alternatives that the audit has identified as better

### Actions

1. **Compute the global verdict**

2. **Write the verdict in the report**:

```markdown
## Phase 5 — DECIDE

### Global verdict

**Status**: PASS | FAIL | NEEDS-REVISION
**Average R_eff**: <number>
**Minimum R_eff**: <number>
**Date**: YYYY-MM-DD

### Rationale

<Specific: why this verdict, with references to the decision groups.>

### Residual risks (if PASS)

- <R_eff pulled down by X — medium risk, mitigation suggested>
- <Other risk>: <mitigation>

### Proposed revisions (if FAIL or NEEDS-REVISION)

- <What to revise in the PRD>
- <Hypothesis to reconsider>
- <CL3 evidence to produce>
```

3. **Ask user confirmation** before finalizing (Phase 6). The user can:
   - Accept the verdict → proceed to finalization
   - Contest the verdict → discuss, possibly revise the audit
   - Request going back to a previous phase → execute

### Phase 5 checkpoint

- [ ] Global verdict computed
- [ ] Rationale documented
- [ ] Residual risks identified
- [ ] User approved the verdict

---

## Phase 6: FINALIZE — update frontmatter and trigger sync

**Goal**: finalize the process by updating the PRD state and triggering the next skill.

### Actions for PASS verdict

1. **Update the PRD frontmatter** (`docs/prd/<area>/NN-<study>.md`):

```yaml
---
status: validated
validated_at: YYYY-MM-DD          # today
validated_by: "arch-decision (Quint FPF run <timestamp>)"
# other fields unchanged
---
```

2. **Finalize the audit report** (`docs/prd/<area>/audit/NN-<study>-fpf.md`):

```yaml
---
verdict: PASS
r_eff: <minimum of H1 values>
audited_at: YYYY-MM-DD
---
```

Make sure the report contains all 5 phases filled in.

3. **Inform the architect** of the result, the impact on the source of truth, and next steps:

```
✅ PRD successfully validated.

**R_eff**: <number>
**Verdict**: PASS
**Audit report**: <path>

**Impact on docs/architecture/** (update manually):
- <list concrete changes the architect should write: new constraint / new pattern / new component in 04-components.md / etc.>

**Next step**:
- Review and apply the impacts above to `docs/architecture/` (manual — NONoise does not auto-sync)
- When ready to promote the PRD to a sprint, invoke: `sprint-manifest area <area> sprint <N>`
- If you have more studies to add to the area, invoke `arch-brainstorm` again.
```

Populate the "Impact on docs/architecture/" section with actual concrete changes extracted from the validated PRD — e.g. "Add to `04-components.md` a new `draft` entry for `notifications-worker`", "Add constraint to `01-constraints.md`: always acknowledge events within 5s", "Append new pattern to `03-patterns.md`: outbox-table for cross-component writes". Be specific — this list is the architect's work checklist.

### Actions for FAIL or NEEDS-REVISION verdict

1. **Update the frontmatter**:

```yaml
---
# for FAIL:
status: rejected
validated_at: YYYY-MM-DD
validated_by: "arch-decision (Quint FPF run <timestamp>) — FAIL"

# for NEEDS-REVISION:
status: draft            # stays draft
# add custom fields:
last_audit_at: YYYY-MM-DD
last_audit_verdict: NEEDS-REVISION
---
```

2. **Finalize the audit report** with `verdict: FAIL | NEEDS-REVISION` and the detailed list of proposed revisions.

3. **DO NOT suggest updates to `docs/architecture/`** — the source of truth must not be updated with rejected decisions.

4. **Inform the architect**:

```
⚠️ PRD not validated.

**Minimum R_eff**: <number>
**Verdict**: FAIL / NEEDS-REVISION
**Audit report**: <path>

**Proposed revisions**:
- <list>

**Next step**:
- Revise the PRD addressing the points above
- If a deep brainstorm on a specific decision is needed, invoke `arch-brainstorm`
- When done with revisions, invoke `arch-decision` again on the same file
```

### Phase 6 checkpoint

- [ ] PRD frontmatter updated (validated | rejected | draft)
- [ ] Audit report finalized with all 5 phases
- [ ] On PASS: concrete "Impact on docs/architecture/" checklist produced for the architect
- [ ] Architect informed of next steps

---

## Resuming mid-flow

If a partial audit report already exists at `audit/NN-<study>-fpf.md`:

1. Read the existing report
2. Identify the last completed phase (frontmatter `verdict: IN_PROGRESS` + content)
3. Summarize state to the user and ask:
   - Continue from the next phase
   - Restart from scratch (if the PRD's foundations have changed)

---

## Anti-patterns

1. **Validating something that is not a PRD** — if the file lacks correct frontmatter or the "Decision story" section, stop and ask for it to be generated via `arch-brainstorm`
2. **Fake hypotheses** — N variants of the same idea are not diversity
3. **Weak evidence treated as strong proof** — CL1 does not beat CL3
4. **Validating by inertia** — if evidence is insufficient, it is OK to say "FAIL, more analysis needed"
5. **Over-engineering the audit** — small decisions do not need 6 phases. If the PRD covers a local choice, tell the architect "Quint FPF is overkill for this" and skip
6. **Writing directly to `docs/architecture/`** — not this skill's job. The architect applies the "Impact on docs/architecture/" checklist produced at Phase 6 manually, in a separate commit. Keep audit and source-of-truth changes decoupled.
7. **Creating drafts from scratch** — not this skill's job; delegate to `arch-brainstorm`

## When NOT to use

- The PRD does not exist yet → use `arch-brainstorm` first
- Decisions already in the absolute constraints at `docs/architecture/01-constraints.md` → the PRD should already honor them; no FPF validation needed
- Local choices that do not affect architecture (naming, formatting)
- Bug fix → use `superpowers:systematic-debugging`

---

## References

- Sibling skill [`quint-fpf`](../quint-fpf/SKILL.md) — the underlying methodology, 6 phases, tooled/conversational modes
- Sibling skill [`arch-brainstorm`](../arch-brainstorm/SKILL.md) — step 1 (produces the PRD this skill validates)
- Sibling skill `sprint-manifest` — step 3 (promotion to sprint)
- Project source of truth: `docs/architecture/` (maintained manually by the architect)
