---
name: bmad-req-validator
description: Formal validation of IT functional requirements via a curated suite of 10 methodologies (INVEST, SMART, EARS, MoSCoW, 5W1H, WOTIF, IEEE 830/29148, FMEA-Lite, SWOT, ATAM-Lite). Called by Isa (bmad-agent-analyst) as capability RV — NOT self-activating. Classifies the requirement, recommends a 2–5 methodology subset, waits for analyst confirmation, runs only the selected ones, deduplicates gaps, and generates business-friendly challenge questions. Skippable in quick flows.
source: analista_improve research (internal, 2026-04-18)
variant: nonoise-bmad 2
customization: renamed from functional-requirement-validator → bmad-req-validator; integrated as Isa capability RV (handoff-only, never self-activating); output paths aligned to docs/requirements/ convention
---

# bmad-req-validator

## Purpose

Validate the completeness and quality of an IT functional requirement by applying a
curated set of analysis methodologies. For each gap detected, generate a **challenge
question** to pose to a human analyst to collect the missing information.

The skill does **not** run all 10 methodologies blindly. It first classifies the
requirement and proposes the subset that best fits the requirement's nature, then
asks the analyst to confirm, drop, or add methodologies before executing.

## When to use this skill

- Invoked by Isa (`bmad-agent-analyst`) as capability **RV** — formal requirement
  validation pass on a draft PRD user story or NFR.
- Optional step in Polly's greenfield flow, between CB (brief) and the handoff to
  Alex for architecture. Always **skippable** for quick flows — never forced.
- Suitable before a tender/RFP response (IEEE 830 + MoSCoW + SWOT) or before
  locking a safety-critical requirement (IEEE 830 + FMEA-Lite + WOTIF).

## Execution Workflow

```
INPUT: functional requirement text (+ optional context)
  │
  ▼
[PHASE 1] Classification
  │  → Detect requirement type, domain, project context
  │  → Output: classification summary
  │
  ▼
[PHASE 2] Methodology Recommendation
  │  → Propose 3–5 methodologies with rationale
  │  → Ask analyst: "Confirm, drop, or add?"
  │  → Wait for analyst decision
  │
  ▼
[PHASE 3] Validation (only selected methodologies)
  │  → Apply each chosen methodology → [PASS|WARN|FAIL] flags
  │
  ▼
[PHASE 4] Gap Aggregation
  │  → Deduplicate overlapping gaps (e.g. "not testable" from INVEST/SMART/IEEE)
  │  → Rank by severity and cross-methodology confirmation
  │
  ▼
[PHASE 5] Challenge Dialog
  │  → Convert each distinct gap into ONE open, business-friendly question
  │
  ▼
OUTPUT: classification + methodology selection + validation report + challenge questions
```

## Phase 1 — Classification

Before validation, tag the requirement along these axes:

| Axis | Values |
|---|---|
| **Type** | Epic • User Story • Technical Requirement • NFR • Business Goal |
| **Abstraction** | High-level (intent) • Mid-level (feature) • Low-level (behavior) |
| **Criticality** | Standard • Regulated (finance/healthcare/public) • Safety-critical |
| **Context** | Backlog item • Tender/RFP response • Formal SRS • Architecture decision |
| **Prioritization present?** | Yes (Must/Should/…) • No |
| **Acceptance criteria present?** | Explicit • Implicit • Absent |

Output a compact classification block:

```
## 🏷️ Classification
- Type: [value]
- Abstraction: [value]
- Criticality: [value]
- Context: [value]
- Has priority: [yes/no]
- Has acceptance criteria: [explicit/implicit/absent]
```

## Phase 2 — Methodology Recommendation

Based on the classification, recommend methodologies using this decision logic:

| Classification signal | Recommended methodologies |
|---|---|
| User Story + Agile | **INVEST** (primary), **SMART**, **5W1H** |
| Technical requirement | **EARS** (primary), **5W1H**, **WOTIF** |
| NFR / Quality attribute | **ATAM-Lite** (primary), **SMART**, **IEEE 830** |
| High-level business goal | **SMART** (primary), **5W1H**, **SWOT-Req** |
| Tender / RFP context | **IEEE 830** (primary), **MoSCoW**, **SWOT-Req** |
| Safety-critical / Regulated | **IEEE 830**, **FMEA-Lite**, **WOTIF** |
| No priority present | Add **MoSCoW** |
| No acceptance criteria | Add **SMART** + **EARS** (whichever is not already selected) |

Rules:
- Minimum 2 methodologies, maximum 5 (avoid overload).
- Always include at least one **completeness** framework (5W1H or IEEE 830).
- Always include at least one **testability** framework (EARS, SMART, or INVEST-T).
- If overlap is unavoidable (e.g. SMART + INVEST-T), pick the one most idiomatic to
  the detected Type.

Output the recommendation as:

```
## 🎯 Recommended Methodologies
Based on the classification, I suggest:

1. **[Methodology]** — [why it fits this requirement]
2. **[Methodology]** — [why it fits this requirement]
...

**Optional additions (lower priority):** [list]

👉 Procedo con queste, ne aggiungiamo/togliamo qualcuna, oppure salto la
   validazione formale?
```

**Wait for the analyst's reply before proceeding to Phase 3.**

If the analyst replies "go" / "proceed" / "ok" → use the proposed list.
If they specify changes → adjust and show the final list before executing.
If they reply "salto" / "skip" / "basta così" → exit the skill gracefully, return
control to Isa without running validation. Never guilt-trip the user for skipping.

## Phase 3 — Validation (only selected methodologies)

For each selected methodology:
1. Load the corresponding skill file (`skills/01-invest.md` etc.) via `Read`.
2. Apply its check logic and produce a score + flag list (`[PASS]` / `[WARN]` /
   `[FAIL]`).
3. Collect the gaps (all `[WARN]` and `[FAIL]`).

## Phase 4 — Gap Aggregation

Before generating challenge questions, deduplicate overlapping gaps:

| Duplicate pattern | Action |
|---|---|
| "Not testable" appears in INVEST-T, SMART-M, IEEE-Verifiable | Merge into ONE gap, cite all 3 methodologies |
| "No trigger / when" appears in EARS and 5W1H-When | Merge, attribute to both |
| "Vague actor" appears in 5W1H-Who and INVEST-Valuable | Merge, attribute to both |

A gap confirmed by **multiple** methodologies is stronger evidence → boost its priority.

## Phase 5 — Challenge Dialog

Convert each **deduplicated** gap into a single challenge question.

Rules for challenge questions:
- Open-ended (not yes/no).
- Business-friendly language, avoid jargon with non-technical stakeholders.
- One question per gap (do not bundle).
- Lead with FAIL-level gaps, then WARN.
- Include a short "why it matters" line when the motivation is non-obvious.

## Methodology Index

| File | Methodology | Category |
|---|---|---|
| `skills/01-invest.md` | INVEST | Agile Story Quality |
| `skills/02-smart.md` | SMART | Goal Clarity |
| `skills/03-ears.md` | EARS | Syntax & Testability |
| `skills/04-moscow.md` | MoSCoW | Prioritization |
| `skills/05-5w1h.md` | 5W1H | Information Completeness |
| `skills/06-wotif.md` | WOTIF / What-If | Risk & Scenario |
| `skills/07-ieee830.md` | IEEE 830 / 29148 | Standard Compliance |
| `skills/08-fmea-lite.md` | FMEA-Lite | Failure Mode |
| `skills/09-swot-req.md` | SWOT Applied | Strategic Fit |
| `skills/10-atam-lite.md` | ATAM-Lite | Quality Attributes |

## Artifacts & output locations

- Validation report → `docs/requirements/validation-<slug>-<date>.md`
- Challenge questions (standalone, if user wants to paste into sprint manifest) →
  appended to the report, section `## 💬 Challenge Questions`
- Never overwrites the source PRD; always writes a sibling validation file.

## Output Format

```
## 🏷️ Classification
[compact block from Phase 1]

## 🎯 Recommended Methodologies
[recommendation from Phase 2 — ASK analyst and wait for reply]

--- after analyst confirms ---

## 📋 Validation Scores
| Methodology | Score | Status |
|---|---|---|
| ... | X/Y | 🔴/🟡/✅ |

## ⚠️ Aggregated Gaps
1. [FAIL|WARN] [Gap description] (sources: Method1, Method2)
2. ...

## 💬 Challenge Questions
1. [emoji] [Question in business language]
   💡 Why it matters: [short reason]
2. ...
```

## Instructions to the Model

1. **Do NOT answer the requirement directly.** Always run Phase 1 first.
2. **Do NOT run all 10 methodologies.** Always propose a subset (Phase 2) and
   wait for the analyst's decision.
3. **Do NOT skip the challenge dialog.** Every FAIL gap must produce a question.
4. **Do NOT mark the requirement as complete** until all FAIL-level gaps are
   resolved by the analyst's answers.
5. Keep the tone collaborative: "I noticed…" rather than "You are missing…".
6. **Respect skip.** If the user (or Isa on their behalf) says skip/salto/basta at
   Phase 2, return control immediately. This skill is opt-in.
7. **Never self-activate.** Only run when Isa hands off via capability RV or when
   the user explicitly names `bmad-req-validator`.

## Example Interaction

```
Analyst (via Isa RV): "The system must send an email to the user."

Agent (Phase 1):
## 🏷️ Classification
- Type: User Story (implicit, unclear actor)
- Abstraction: Mid-level
- Criticality: Standard
- Context: Backlog item
- Has priority: No
- Has acceptance criteria: Absent

Agent (Phase 2):
## 🎯 Recommended Methodologies
Given this is a vague mid-level user story with no priority and no acceptance
criteria, I suggest:

1. **5W1H** — every dimension (Who/What/When/Why) looks unclear.
2. **EARS** — to pin down the trigger and response in testable syntax.
3. **SMART** — to attach measurable acceptance criteria.
4. **MoSCoW** — to fix the missing priority.

**Optional additions:** WOTIF (if error handling matters), FMEA-Lite (if the
email carries sensitive/regulated data).

👉 Procedo con queste 4, ne aggiungiamo/togliamo qualcuna, oppure salto?

Analyst: "Add WOTIF, drop MoSCoW — priority comes later."

Agent (Phase 3-5): [runs 5W1H + EARS + SMART + WOTIF, aggregates, asks
challenge questions]
```
