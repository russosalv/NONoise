---
name: atam-lite-validator
description: >
  Applies a simplified version of ATAM (Architecture Tradeoff Analysis Method)
  to verify that a functional requirement has considered the relevant quality
  attribute scenarios: performance, scalability, security, availability,
  maintainability and interoperability.
methodology: ATAM-Lite
category: Quality Attributes
---

# ATAM-Lite — Quality Attribute Scenarios for Requirements

## Origin and Context

The Architecture Tradeoff Analysis Method (ATAM) was developed by the Software
Engineering Institute (SEI) at Carnegie Mellon University as a structured method
to evaluate software architectures against multiple competing quality attributes.
Full ATAM requires multi-day sessions with stakeholders and architects. The
"ATAM-Lite" proposed here is a simplified version applied at the single-
requirement level to check that quality attributes are considered during
specification.

ATAM introduces the concept of **Quality Attribute Scenario (QAS)**, a narrative
structure describing how the system should respond to a specific stimulus under
defined conditions.

## Quality Attribute Scenario (QAS) Structure

A QAS is composed of 6 elements:

```
Source of Stimulus → Stimulus → Environment → Artifact → Response → Response Measure
```

| Element | Description | Example |
|---|---|---|
| Source | Who/what generates the stimulus | Authenticated user |
| Stimulus | The event or action | Financial report request |
| Environment | Operational conditions | 500 concurrent users at peak |
| Artifact | Affected component | Reporting service |
| Response | Expected behavior | Generate and show the report |
| Response Measure | Satisfaction metric | Within 5 seconds at the 95th percentile |

---

## The Six Quality Attributes to Verify

### 1. Performance
The system must meet response-time and throughput constraints under load.

**QAS template:**
"WHEN [N] concurrent users invoke [function], the system SHALL respond
within [X] milliseconds at the [P] percentile."

**Check on the requirement:**
- Are response-time SLAs defined?
- Is the expected number of concurrent users specified?
- Are reference percentiles defined (p95, p99)?

**Flags:**
- `[PASS]` if the requirement includes performance SLAs
- `[WARN]` if performance is mentioned but not quantified
- `[FAIL]` if no reference to performance is made

---

### 2. Scalability
The system must maintain performance as load or data volume grows.

**QAS template:**
"WHILE the volume of [data/users] grows from [X] to [Y], the system SHALL
maintain [metric] within [threshold]."

**Check on the requirement:**
- Are maximum expected volumes defined (users, records, payload)?
- Does the requirement specify graceful-degradation behavior?
- Are future-growth scenarios considered?

**Flags:**
- `[PASS]` if maximum volumes and scaling behavior are defined
- `[WARN]` if volumes are implicit or not quantified
- `[FAIL]` if the requirement reads as if volume were irrelevant

---

### 3. Security
The system must protect data and features from unauthorized access and attacks.

**QAS template:**
"WHEN an unauthorized user attempts [action], the system SHALL [security
response] and SHALL log [audit event]."

**Check on the requirement:**
- Are access controls defined (RBAC, ABAC)?
- Are data-encryption requirements specified?
- Are logging and audit trails mentioned?
- Are applicable GDPR/regulatory requirements considered?

**Flags:**
- `[PASS]` if access, encryption and audit are addressed
- `[WARN]` if security is mentioned generically without specifics
- `[FAIL]` if the requirement makes no reference to security for features that
  require it

---

### 4. Availability
The system must be available for the required time and recover quickly from
failures.

**QAS template:**
"The [system] SHALL maintain [X]% availability during [operational hours]
and SHALL recover from failure within [RTO] minutes."

**Check on the requirement:**
- Is the required availability defined (e.g. 99.9% = 8.7h downtime/year)?
- Are RTO (Recovery Time Objective) and RPO (Recovery Point Objective) defined?
- Does the requirement consider availability during maintenance windows?

**Flags:**
- `[PASS]` if availability SLAs are explicit
- `[WARN]` if availability is implicit ("the system must be reliable")
- `[FAIL]` if absent for mission-critical systems

---

### 5. Maintainability
The system must be modifiable, extendable and fixable efficiently.

**QAS template:**
"WHEN a developer needs to [change type], the system SHALL allow the change
within [X] hours with [N] components affected."

**Check on the requirement:**
- Is the requirement atomic and free of excessive dependencies?
- Are configuration data separated from code?
- Does the requirement allow future extensions without cascading impacts?
- Are modularity or separation-of-concern constraints defined?

**Flags:**
- `[PASS]` if the requirement is atomic and easily modifiable
- `[WARN]` if it introduces dependencies that could impact maintainability
- `[FAIL]` if it is so rigid that future modifications would be very costly

---

### 6. Interoperability
The system must exchange data and functionality with other systems reliably
and using standards.

**QAS template:**
"WHEN [system A] invokes [system B] via [protocol/API], the system SHALL
[response] following [standard] with [data format]."

**Check on the requirement:**
- Are communication protocols defined (REST, GraphQL, SOAP, gRPC)?
- Are data formats specified (JSON, XML, Avro)?
- Are API contracts defined (versioning, backward compatibility)?
- Are inter-service authentication mechanisms specified?

**Flags:**
- `[PASS]` if protocols, formats and contracts are defined
- `[WARN]` if integration is mentioned but not specified
- `[FAIL]` if the requirement assumes undefined integrations

---

## ATAM-Lite Scoring Schema

```
Score: [Perf:?] [Scale:?] [Sec:?] [Avail:?] [Maint:?] [Interop:?]
Total: X/6 (consider only attributes applicable to the requirement)
```

| Score | Status |
|---|---|
| All applicable attributes addressed | ✅ PASS |
| 1-2 attributes not addressed | 🟡 WARN |
| 3+ critical attributes not addressed | 🔴 FAIL |

## Tradeoff Analysis

ATAM emphasizes **tradeoffs** between quality attributes: improving one often
degrades another.

**Common tradeoffs:**
| Performance vs. | Security: encryption adds latency |
|---|---|
| Availability vs. | Consistency: distributed systems (CAP theorem) |
| Scalability vs. | Maintainability: scalable architectures are often more complex |
| Interoperability vs. | Performance: standard protocols may be less efficient |

**Tradeoff challenge question:**
"We have identified a tradeoff between [attribute A] and [attribute B]. What
is the business priority: do you prefer [A] or [B] in case of conflict?"

## Challenge Questions Template

| Quality Attribute | Challenge Question |
|---|---|
| Performance | "What are the response-time requirements for this feature? How many concurrent users must be supported?" |
| Scalability | "What is the maximum data/user volume this feature must handle today and in the next 3 years?" |
| Security | "Who can access this feature? Is sensitive data involved requiring encryption or audit logs?" |
| Availability | "What availability is required for this feature? What happens if it is temporarily unavailable?" |
| Maintainability | "How often do we expect to modify this feature? Are there configurability requirements?" |
| Interoperability | "Which external systems must this feature integrate with? Which protocols and formats must be used?" |
