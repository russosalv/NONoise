---
name: wotif-validator
description: >
  Applies WOTIF (What-If Analysis) to identify alternative scenarios, edge cases,
  error conditions and implementation risks not covered by a functional requirement.
  Generates challenge questions on uncovered scenarios.
methodology: WOTIF / What-If Analysis
category: Risk & Scenario Analysis
---

# WOTIF — What-If Analysis for Functional Requirements

## Origin and Context

What-If Analysis is a structured risk-analysis technique originally used in the
chemical and process industry (HAZOP — Hazard and Operability Study) and later
adopted in software engineering, IT architecture and requirements engineering
to identify scenarios not covered by the requirements.

In IT, WOTIF is systematically applied to functional requirements to explore
input variations, edge conditions, system failures, unexpected user behavior
and security implications.

## WOTIF Framework for IT Requirements

WOTIF analysis is organized around six "what-if" categories:

### 1. What-If: Abnormal Input
What happens if the system receives input other than expected?

**Scenarios to explore:**
- Null or empty input (null, empty string, zero)
- Input at the edge of the valid range (boundary values: min-1, min, max, max+1)
- Wrong-format input (wrong type, different encoding, special characters)
- Duplicate or already-existing input
- Very large input (oversized payload, large files)
- Input with special characters, SQL injection, XSS

**Challenge questions:**
- "What should the system do if it receives a null value for [field]?"
- "What is the maximum acceptable value for [field] and what happens if it is exceeded?"
- "How are duplicates handled?"

---

### 2. What-If: System Failure
What happens if the system or a dependency fails during execution?

**Scenarios to explore:**
- Database unavailable or timeout
- Third-party service/API unreachable
- Intermittent network error
- Timeout during processing
- Out of memory / disk full
- Concurrency: two users modify the same record simultaneously

**Challenge questions:**
- "What does the system show the user if the database does not respond?"
- "If the external API call fails, does the process block or continue?"
- "How does the system handle concurrent writes on the same record?"

---

### 3. What-If: Unexpected User Behavior
What happens if the user does not follow the happy path?

**Scenarios to explore:**
- User reloads the page during an operation
- User presses browser "back" after a transaction
- User opens the same feature in multiple tabs/windows
- Session expires during a long form submission
- User abandons a multi-step process
- Double-click on a submit button

**Challenge questions:**
- "What happens if the user presses 'Submit' twice in a row?"
- "How is session loss handled during form completion?"
- "Does the system correctly handle concurrent use across multiple tabs?"

---

### 4. What-If: Volume and Performance Conditions
What happens under high load or with unexpected data volumes?

**Scenarios to explore:**
- Concurrent users 10x the average
- Dataset size 100x the current
- Peak requests in a short period (marketing launch)
- Records with many relations (e.g. one customer with 10,000 orders)
- Reports on large datasets without pagination

**Challenge questions:**
- "How many concurrent users must be supported at peak?"
- "What is the maximum data volume this feature must operate on?"
- "Is there a performance SLA the requirement must respect?"

---

### 5. What-If: Security and Authorization
What happens if a user tries to access unauthorized resources?

**Scenarios to explore:**
- Unauthenticated user attempts to access a protected feature
- Authenticated user with insufficient role attempts a privileged operation
- User tries to access another user's data (IDOR — Insecure Direct Object Reference)
- Expired or tampered session token
- Privilege escalation

**Challenge questions:**
- "What happens if an unauthenticated user tries to access this feature?"
- "How is it handled when a user tries to view another user's data?"
- "Are there authorization checks at record/entity level as well as feature level?"

---

### 6. What-If: Data and Consistency
What happens if data is in an inconsistent or unexpected state?

**Scenarios to explore:**
- Records in "in-progress" state left by previously failed processes
- Migrated data with legacy incompatible formats
- Orphan foreign keys or violated integrity constraints
- Soft-deleted entities referenced elsewhere
- Partially updated data from an interrupted transaction

**Challenge questions:**
- "How does the system handle data left in an inconsistent state by failed operations?"
- "Are there legacy data with different formats to handle in this requirement?"

---

## WOTIF Scoring Schema

For each category, verify whether the requirement includes at least handling
of the most likely scenarios:

```
[ ] Abnormal input handled
[ ] System failures handled (or deferred to separate NFR)
[ ] Unexpected user behaviors considered
[ ] Volume/performance constraints defined
[ ] Security/authorization checks included
[ ] Data consistency handled
```

| Score | Status | Action |
|---|---|---|
| 5-6/6 | ✅ PASS | Alternative scenarios well covered |
| 3-4/6 | 🟡 WARN | Add error-handling scenarios |
| 0-2/6 | 🔴 FAIL | The requirement describes only the happy path |

## Applicative Notes

- WOTIF does not replace test cases but prepares them: each WOTIF scenario
  should become an error / edge-case test.
- For simple requirements, focus on categories 1, 2 and 5 (input, failure,
  security).
- For complex or high-traffic requirements, add category 4 (volume/performance).
- WOTIF gaps often produce separate error-handling requirements or NFRs.
