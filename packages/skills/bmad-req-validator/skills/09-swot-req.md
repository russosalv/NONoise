---
name: swot-req-validator
description: >
  Applies a requirement-oriented SWOT analysis to evaluate the strategic robustness
  of a functional requirement against the project context: strengths of the
  approach, weaknesses of the specification, opportunities for added value, and
  implementation threats.
methodology: SWOT Applied to Requirements
category: Strategic Fit
---

# SWOT Applied to Functional Requirements

## Origin and Context

SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) was developed by
Albert Humphrey at the Stanford Research Institute in the 1960s-70s. Traditionally
used for strategic business analysis, here it is applied at the level of a single
functional requirement to assess its robustness within the project.

SWOT for requirements complements structural analyses (INVEST, SMART, EARS) by
adding a strategic and contextual dimension to the evaluation.

## SWOT Framework for Requirements

### S — Strengths (of the requirement specification)
Positive aspects of the requirement spec that increase the probability of
successful implementation and adoption.

**Analysis questions:**
- Is the requirement clear and unambiguous?
- Does it solve a real problem recognized by stakeholders?
- Is it aligned with the project's technology roadmap?
- Do reusable components or applicable best practices exist?
- Does the team already have experience with similar requirements?

**Strength indicators:**
- Requirement validated by multiple stakeholders
- Aligned with already-implemented standards or patterns
- Backed by a clear, shared use case

---

### W — Weaknesses (of the specification)
Intrinsic limitations of the requirement as written that could create problems
during development, testing or adoption.

**Analysis questions:**
- Is the requirement too vague to be directly implemented?
- Is critical information missing for the development team?
- Are there unverified implicit assumptions?
- Is the requirement so rigid that alternative solutions are prevented?
- Are there terminological ambiguities in the domain?

**Weakness indicators:**
- Missing acceptance criteria
- Undefined or ambiguous terminology
- Unverified technology assumptions
- Scope too broad to be managed as a single requirement

---

### O — Opportunities (for added value)
Possibilities to extend the value of the requirement beyond the minimum,
leveraging the technology or business context.

**Analysis questions:**
- By implementing this requirement, can we also solve related problems?
- Are there patterns or architectures that add value at low cost?
- Can the requirement become reusable in other project contexts?
- Are there automation or AI opportunities this requirement could leverage?
- Could the implementation produce useful data or analytics for the business?

**Opportunity indicators:**
- Synergy with other backlog requirements
- Reuse potential as a shared component
- Chance to improve user experience beyond baseline

---

### T — Threats (to implementation)
External or contextual factors that could prevent or compromise implementation
or adoption of the requirement.

**Analysis questions:**
- Are there time constraints (business deadlines) that could compromise quality?
- Are there dependencies on external teams or vendors with uncertain timelines?
- Is the requirement subject to ongoing regulatory changes (GDPR, AI Act)?
- Is there risk of resistance to change from users?
- Are there technical debts in the current architecture that complicate implementation?

**Threat indicators:**
- Critical third-party dependencies
- Evolving regulatory requirements
- Stakeholders with divergent expectations
- Budget or resource constraints that may force trade-offs

---

## TOWS Matrix (Strategic Extension)

After the SWOT, apply the TOWS matrix to derive strategic actions:

| | Opportunities (O) | Threats (T) |
|---|---|---|
| **Strengths (S)** | **SO:** Use strengths to exploit opportunities | **ST:** Use strengths to mitigate threats |
| **Weaknesses (W)** | **WO:** Overcome weaknesses by exploiting opportunities | **WT:** Minimize weaknesses and avoid threats |

**Applied example:**
- **SO:** The team has OAuth2 experience (S) and there is an opportunity to
  implement SSO for more modules (O) → expand the authentication requirement
  to corporate SSO.
- **WT:** The spec is vague (W) and there is a rigid deadline (T) → request
  urgent refinement with the PO before the sprint.

---

## SWOT-Req Scoring Schema

```
[ ] At least 2 Strengths identified
[ ] Requirement weaknesses mapped
[ ] Value-add opportunities explored
[ ] Implementation threats identified
[ ] At least one TOWS strategy proposed
```

| Result | Status |
|---|---|
| Robust requirement with weaknesses and threats handled | ✅ PASS |
| Weaknesses present but mitigable | 🟡 WARN |
| Critical threats or fundamental weaknesses unaddressed | 🔴 FAIL |

## Challenge Questions Template

| Quadrant | Challenge Question |
|---|---|
| Weaknesses | "What implicit assumptions in this requirement have not yet been verified?" |
| Opportunities | "By implementing this requirement, are there side benefits or synergies with other requirements we can leverage?" |
| Threats | "Are there external dependencies, regulatory constraints or organizational resistance that could compromise this requirement?" |
| TOWS | "Given the identified weaknesses and the deadline of [date], do you want to refine the requirement now or accept the risk of implementing on an incomplete spec?" |
