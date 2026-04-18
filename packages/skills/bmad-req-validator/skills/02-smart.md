---
name: smart-validator
description: >
  Applies the SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
  to verify that a functional requirement is sufficiently precise, measurable,
  realistic, relevant and bounded in time.
methodology: SMART
category: Goal Clarity
---

# SMART Methodology — Functional Requirement Validation

## Origin and Context

The SMART framework, originally proposed by George Doran in 1981 within Peter
Drucker's Management by Objectives (MBO), has become a de facto standard for
defining clear goals and requirements in any domain. In IT, it is especially
useful for checking that requirements are not vague or aspirational but concrete
and verifiable.

## The Five Criteria

### S — Specific
The requirement must describe exactly what the system must do, who is involved,
what output is expected, and in which context it applies.

**Check questions (the 5W):**
- Who? (actor/user invoking the feature)
- What? (specific action the system must perform)
- Where? (application context, screen, API, service)
- When? (triggering condition or event)
- Why? (business rationale)

**Ambiguity signals to detect:**
- Vague verbs: "manage", "support", "improve", "optimize"
- Undefined subjects: "the user", "the system" with no precise identification
- Generic actions: "allow", "enable" without specifying behavior

**Validation flags:**
- `[PASS]` if who/what/where/when/why are all present
- `[WARN]` if 1-2 elements are implicit but inferable
- `[FAIL]` if 3+ elements are missing or the text is generic

---

### M — Measurable
The requirement must contain quantitative or qualitative verifiable criteria
that allow one to determine whether it is satisfied.

**Check questions:**
- Are there metrics or numeric thresholds? (e.g. "within 3 seconds", "at least 99.9%")
- Are acceptance criteria binary (yes/no) or measurement-based?
- How is "done" determined?

**Anti-patterns to detect:**
- "The system must be fast" → not measurable
- "The interface must be user-friendly" → subjective
- "The process must be efficient" → not quantified

**Validation flags:**
- `[PASS]` if acceptance criteria with concrete metrics are present
- `[WARN]` if criteria exist but are qualitative without thresholds
- `[FAIL]` if no verification criterion exists

---

### A — Achievable
The requirement must be technically and organizationally realistic in the
project context, given existing resources and constraints.

**Check questions:**
- Does the team have the technical skills to implement this?
- Are there technology, integration or architecture constraints that make it
  difficult or impossible?
- Is the requirement consistent with the existing tech stack and architecture?
- Are there dependencies on third-party systems that are not yet available?

**Validation flags:**
- `[PASS]` if the requirement fits the architecture and team skills
- `[WARN]` if it requires spikes, new technologies or integrations to verify
- `[FAIL]` if it contradicts known architectural constraints or is infeasible
  with available resources

---

### R — Relevant
The requirement must be aligned with the project's business goals and deliver
real value. It must not be a "nice to have" disguised as "must have".

**Check questions:**
- Is this requirement directly correlated with project/sprint goals?
- Which business objective does it serve?
- Who asked for this requirement, and with what priority?
- What happens if it is not implemented?

**Validation flags:**
- `[PASS]` if the requirement is explicitly tied to a business objective
- `[WARN]` if relevance is implicit but not declared
- `[FAIL]` if the requirement seems disconnected from project goals

---

### T — Time-bound
The requirement must have a temporal context or be associable with a specific
milestone, sprint or release.

**Check questions:**
- Which sprint, release or milestone is this requirement assigned to?
- Is there a business deadline (go-live, audit, regulatory deadline)?
- Does timing affect priority or implementation?

**Validation flags:**
- `[PASS]` if the requirement is tied to a specific milestone or sprint
- `[WARN]` if timing is implicit ("in the next release") but not formalized
- `[FAIL]` if the requirement is temporally undefined and not prioritized

---

## SMART Scoring Schema

```
Score: [S:?] [M:?] [A:?] [R:?] [T:?]
Total: X/5
```

| Score | Status | Action |
|-------|-------|--------|
| 5/5 | ✅ PASS | Clear, well-defined requirement |
| 3-4/5 | 🟡 WARN | Refine failed criteria |
| 0-2/5 | 🔴 FAIL | Rewrite with PO/BA |

## Challenge Questions Template

| Criterion | Challenge Question |
|---|---|
| S (Specific) | "Can you describe more precisely who does what, in which context, and for which reason?" |
| M (Measurable) | "How will we know this requirement has been implemented correctly? What are the acceptance conditions?" |
| A (Achievable) | "Are there technology, architecture or resource constraints that could make this hard to realize?" |
| R (Relevant) | "Which business or project objective does this requirement directly contribute to?" |
| T (Time-bound) | "In which sprint, release or by which date must this requirement be delivered?" |

## Practical Transformation

**Vague requirement:** "The system must let users log in quickly."

**SMART analysis:**
- S: ❌ Which system? What kind of login? Which users?
- M: ❌ "Quickly" is not measurable
- A: ✅ Likely a standard login implementation
- R: 🟡 Implicit (security and usability)
- T: ❌ No temporal context

**SMART requirement:** "The customer portal authentication system must allow
registered users to complete login (username + password) within 2 seconds (p95)
99.9% of the time, to be delivered in Sprint 3 (Q2 2026)."
