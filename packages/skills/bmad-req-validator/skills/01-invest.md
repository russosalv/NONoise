---
name: invest-validator
description: >
  Applies the INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small,
  Testable) to assess the quality of a user story or functional requirement in an
  Agile context.
methodology: INVEST
category: Agile Story Quality
---

# INVEST Methodology — Functional Requirement Validation

## Origin and Context

The INVEST framework was proposed by Bill Wake in 2003 as an acronym describing the
characteristics of a good Agile user story. It is widely adopted in Scrum, Kanban
and other iterative methodologies. It also applies well to classic functional
requirements as a quality-verification tool.

## The Six Criteria

### I — Independent
The requirement should not depend on other requirements that are not yet defined
or approved. Each requirement should be developable and deliverable autonomously.

**Check questions:**
- Does this requirement need another undefined requirement to make sense?
- Are there implicit dependencies on systems or components not mentioned?

**Validation flags:**
- `[PASS]` if the requirement is autonomous or dependencies are explicit and already defined
- `[WARN]` if implicit dependencies must be inferred from context
- `[FAIL]` if the requirement cannot be understood without other non-included requirements

---

### N — Negotiable
The requirement represents an intent, not a rigid contract. The "how" should be
discussable with the team without changing the "why".

**Check questions:**
- Does the requirement already prescribe a technical implementation instead of the
  expected behavior?
- Is the business owner open to discussing alternative approaches?

**Validation flags:**
- `[PASS]` if the requirement describes behavior, not implementation
- `[WARN]` if it contains rigid technical specifications that may be constraining
- `[FAIL]` if it prescribes a specific technical solution without business rationale

---

### V — Valuable
The requirement must deliver measurable value to a user or the business. The
value must be explicit in the text.

**Check questions:**
- Is it clearly stated who receives value from this requirement?
- Is the expected benefit (outcome) explained, not only the functionality (output)?
- Is the requirement aligned with the project's business goals?

**Validation flags:**
- `[PASS]` if value to user/business is explicit
- `[WARN]` if value is implicit but inferable from context
- `[FAIL]` if no benefit or beneficiary user is indicated

---

### E — Estimable
The team must be able to estimate the effort required. A non-estimable requirement
is usually too vague or too large.

**Check questions:**
- Does the team have enough information to estimate complexity?
- Is the requirement specific enough to allow planning?
- Are there technical unknowns that block estimation?

**Validation flags:**
- `[PASS]` if the requirement is detailed enough to be estimated
- `[WARN]` if ambiguities require a spike or PoC before estimation
- `[FAIL]` if the requirement is too vague for any estimation attempt

---

### S — Small
The requirement must be small enough to be completed within a single sprint
(typically 1-2 weeks). Requirements that are too large are Epics or Features,
not user stories.

**Check questions:**
- Can this requirement be completed within one sprint?
- Can it be split into smaller requirements while preserving value?

**Validation flags:**
- `[PASS]` if the requirement fits in one sprint
- `[WARN]` if it may need multiple sprints (consider epic/feature split)
- `[FAIL]` if it describes an entire module or functional area

---

### T — Testable
The requirement must have verifiable acceptance criteria. It must be possible to
answer yes/no to "is this requirement satisfied?".

**Check questions:**
- Are explicit acceptance criteria present?
- Do the criteria allow automated or manual tests to be written?
- Does the requirement contain vague terms ("easy", "fast", "intuitive") without
  concrete metrics?

**Validation flags:**
- `[PASS]` if acceptance criteria are explicit and verifiable
- `[WARN]` if criteria are present but not measurable (e.g. "the user must be
  satisfied")
- `[FAIL]` if no acceptance criteria exist or the text is entirely subjective

---

## INVEST Scoring Schema

```
Score: [I:?] [N:?] [V:?] [E:?] [S:?] [T:?]
Total: X/6
```

| Score | Status | Action |
|-------|-------|--------|
| 6/6 | ✅ PASS | Requirement ready for development |
| 4-5/6 | 🟡 WARN | Refine failed criteria |
| 0-3/6 | 🔴 FAIL | Rewrite with the Product Owner |

## Challenge Questions Template

For each failed criterion, use these challenge questions:

| Criterion | Challenge Question |
|---|---|
| I (Independence) | "Does this requirement depend on other requirements that are not yet defined? Which ones?" |
| N (Negotiable) | "Are you flexible on how to implement this, or is the technical solution already defined and non-negotiable?" |
| V (Valuable) | "What concrete benefit does this requirement bring to the user or the business?" |
| E (Estimable) | "Does the team have all the information needed to estimate this, or are there technical unknowns to investigate first?" |
| S (Small) | "Can this requirement be delivered in a single two-week sprint, or should it be broken down into smaller pieces?" |
| T (Testable) | "How will we verify that this requirement is satisfied? What are the acceptance criteria?" |

## Applicative Notes

- INVEST is optimal for user stories in the form "As a [user] I want [feature]
  so that [benefit]".
- For technical or non-functional requirements, the **Small** criterion is less
  relevant; focus on **Testable** and **Valuable**.
- Always combine INVEST with **SMART** (for measurability) and **EARS** (for
  formal syntax).
