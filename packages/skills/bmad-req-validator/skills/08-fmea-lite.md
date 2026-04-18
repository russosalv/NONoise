---
name: fmea-lite-validator
description: >
  Applies a simplified version of FMEA (Failure Mode and Effects Analysis) to
  functional requirements to identify potential failure modes, their impact and
  mitigation priority via RPN (Risk Priority Number).
methodology: FMEA-Lite
category: Failure Mode Analysis
---

# FMEA-Lite — Failure Mode Analysis for Requirements

## Origin and Context

Failure Mode and Effects Analysis (FMEA) was originally developed by the US
Armed Forces in the 1950s (MIL-P-1629, 1949) and later adopted by the
automotive (AIAG), aerospace and manufacturing industries. In software, it is
applied in a simplified form ("FMEA-Lite") to analyze functional requirements
and identify potential failure points before development.

The "Lite" version proposed here is specifically adapted to IT requirement
validation, combining FMEA with elements from the SWOT-FMEA integration
(Lancaster University, 2016).

## Key Concepts

### Failure Mode
A way in which the requirement could NOT be satisfied or could produce an
unintended effect in the system.

### Effect
The consequence of the failure mode on the user, business or system.

### RPN — Risk Priority Number
```
RPN = Severity (S) × Occurrence (O) × Detectability (D)
```

| Parameter | Scale 1-5 | Description |
|---|---|---|
| S (Severity) | 1=Minor, 5=Critical | Impact of the failure on user/business |
| O (Occurrence) | 1=Rare, 5=Frequent | Probability of the failure occurring |
| D (Detectability) | 1=Easily detectable, 5=Undetectable | Difficulty of detecting the failure |

**RPN thresholds:**
- RPN < 20: 🟢 Low risk — monitor
- RPN 20-50: 🟡 Medium risk — define mitigation plan
- RPN > 50: 🔴 High risk — rework requirement or mandatory mitigation

---

## FMEA-Lite Analysis Framework

### Step 1: Identify Failure Modes

For each functional requirement, identify potential failure modes in these
categories:

**A. Functional failures:**
- The system does not perform the required action
- The system performs the action partially
- The system performs the action incorrectly
- The system performs the action at the wrong time
- The system performs an unrequested action

**B. Performance failures:**
- The system responds too slowly (SLA not met)
- The system does not scale to required volume

**C. Security failures:**
- Unauthorized access to the feature
- Leak of sensitive data
- Bypass of validation controls

**D. Integration failures:**
- Dependent service unavailable
- Incompatible data exchange format
- Call sequence produces inconsistent results

---

### Step 2: FMEA-Lite Analysis Template

```
| ID  | Function | Failure Mode | Effect | S | O | D | RPN | Cause | Mitigation |
|-----|----------|--------------|--------|---|---|---|-----|-------|------------|
| FM1 |          |              |        |   |   |   |     |       |            |
```

**Example applied (requirement: "send notification email"):**

| ID | Function | Failure Mode | Effect | S | O | D | RPN | Cause | Mitigation |
|---|---|---|---|---|---|---|---|---|---|
| FM1 | Send email | Email not sent | User not notified | 4 | 3 | 2 | 24 | SMTP server down | Retry with exponential backoff |
| FM2 | Send email | Email sent to wrong recipient | Privacy breach (GDPR) | 5 | 2 | 1 | 10 | Bug in mapping | Address validation + audit log |
| FM3 | Send email | Duplicate email | User confusion | 3 | 3 | 4 | 36 | Missing idempotency | Idempotency key on send |
| FM4 | Send email | Wrong email content | False information to user | 4 | 2 | 3 | 24 | Wrong template | Unit tests on template |

---

### Step 3: Identify Gaps in the Requirement

After the FMEA analysis, failure modes with RPN > 20 that are **not covered**
by the requirement represent gaps to address via:
1. Adding explicit error-handling requirements
2. Adding NFRs (Non-Functional Requirements) for performance/security
3. Adding acceptance criteria for failure scenarios

---

## FMEA-Lite Scoring Schema

```
[ ] At least 3 failure modes identified and analyzed
[ ] RPN computed for each failure mode
[ ] Failure modes with RPN > 50 have proposed mitigation
[ ] Gaps in the original requirement identified
[ ] Critical failure modes added as requirements or AC
```

| Result | Status |
|---|---|
| All checks pass, no RPN > 50 uncovered | ✅ PASS |
| RPN 20-50 present, mitigation plan defined | 🟡 WARN |
| RPN > 50 present without mitigation in requirement | 🔴 FAIL |

## Challenge Questions Template

| Scenario | Challenge Question |
|---|---|
| No error handling | "What should the system do if this feature fails? Is there a fallback plan?" |
| Performance failure | "What is the expected system behavior under high load for this feature?" |
| Security failure | "Are there scenarios where this feature could be used improperly or maliciously?" |
| Integration failure | "What happens if the service/API this feature depends on is unavailable?" |
| High RPN unmitigated | "Is the risk of [failure mode] acceptable? If not, which additional controls do you want to include in the requirement?" |
