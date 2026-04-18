---
name: moscow-validator
description: >
  Applies the MoSCoW method (Must/Should/Could/Won't) to verify that a functional
  requirement is properly prioritized and that the classification is justified and
  consistent with project goals.
methodology: MoSCoW
category: Prioritization
---

# MoSCoW — Requirement Prioritization

## Origin and Context

The MoSCoW method was developed by Dai Clegg at Oracle UK in 1994 within the
DSDM (Dynamic Systems Development Method) framework. It is a de facto standard
in Agile requirements management and enterprise IT projects, especially in
tender/RFP contexts where prioritization must be explicit and defensible.

The MoSCoW acronym derives from the first letter of each category, with 'o'
added to make it pronounceable.

## The Four Categories

### M — Must Have
Non-negotiable requirements critical to project success. If even one is not
implemented, delivery is considered a failure.

**Characteristics:**
- Represent the Minimum Usable Subset (MUS) of the product
- Must be verifiable via acceptance test
- Cannot be deferred to later phases
- Typically 60-70% of the priority backlog

**Classification test:**
Ask: "If this requirement were not implemented at go-live, could the product
still be used? Could the business still accept it?"
- If **NO** → Must Have
- If **YES** → not a Must

---

### S — Should Have
Important but not critical requirements. The product can function without them
but with significant limitations. They are implemented if resources allow.

**Characteristics:**
- High priority but not blocking go-live
- Often deferred to the second sprint/release
- Strong impact on user experience
- Typically 20-30% of the backlog

---

### C — Could Have
Desirable requirements with limited impact if omitted. Implemented only if
time and budget remain after Must and Should.

**Characteristics:**
- "Nice to have" with real but non-critical benefit
- Candidates for future product versions
- Do not significantly affect core business
- Typically 10-15% of the backlog

---

### W — Won't Have (for now)
Requirements explicitly excluded from the current scope. Documenting them is
essential to manage stakeholder expectations and prevent scope creep.

**Characteristics:**
- Out of scope for this iteration/release
- Potentially included in future versions
- Documented to avoid repeated requests
- Help focus the team on priorities

---

## Validating MoSCoW Classification

When a requirement is received with a MoSCoW classification, verify:

### Check 1: Category Justification
- Is the assigned category documented and motivated?
- Is there a reference to the business objective that justifies the priority?

### Check 2: Over-classification (everything is Must)
Symptom: all requirements are classified as Must Have.

**Warning signal:** if more than 70% of requirements are Must, prioritization
probably was not done correctly.

**Challenge:** "If you had to cut scope by 30% to meet the deadline, which
requirements would you be willing to postpone? This helps separate true Musts
from Shoulds."

### Check 3: Cross-Category Consistency
Verify that higher-category requirements do not functionally depend on
lower-category ones.

**Anti-pattern:** a Must Have that functionally depends on a Could Have.

---

## MoSCoW Scoring Schema

```
Check: [Category present: ?] [Justification: ?] [Category test: ?] [Dependency consistency: ?]
```

| Result | Status |
|---|---|
| All checks pass | ✅ PASS |
| Category present but not justified | 🟡 WARN |
| Category absent or inconsistent | 🔴 FAIL |

## Challenge Questions Template

| Scenario | Challenge Question |
|---|---|
| Missing category | "Is this requirement critical for go-live, or could it be deferred to a later version?" |
| Everything Must Have | "If you could only deliver 60% of the requirements at go-live, which ones would you absolutely include?" |
| Missing justification | "Why is this requirement classified as [category]? Which business objective does it address at this priority?" |
| Anomalous dependency | "I noticed that this Must requirement depends on a Could one. Do you want to reconsider the priority of the dependent requirement?" |
| Won't documented | "Is this requirement explicitly out of scope? Can we document it as Won't Have to avoid future ambiguity?" |
