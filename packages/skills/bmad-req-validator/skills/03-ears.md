---
name: ears-validator
description: >
  Applies EARS (Easy Approach to Requirements Syntax) notation to verify that a
  functional requirement is written with structured, unambiguous, testable syntax.
  Identifies the applicable EARS pattern and checks syntactic correctness.
methodology: EARS
category: Syntax & Testability
---

# EARS — Easy Approach to Requirements Syntax

## Origin and Context

EARS was developed by Alistair Mavin and colleagues at Rolls-Royce PLC in 2009
while analyzing airworthiness regulations for jet-engine control systems. The
notation reduces or eliminates common problems in natural-language requirements:
ambiguity, incompleteness, noise and inconsistency.

EARS is lightweight, requires no specialized tooling, has minimal learning overhead
and is adopted by organizations worldwide, including safety-critical sectors
(automotive, aerospace, medical) and IT enterprise.

## The Six EARS Patterns

### 1. Ubiquitous (always-active)
Requirements that always apply, without conditions or triggers.

**Syntax:**
```
The [system name] SHALL [system response].
```

**Example:**
```
The authentication service SHALL encrypt all passwords using bcrypt with a
minimum cost factor of 12.
```

**When to use:** general system requirements, architectural constraints,
security policies.

---

### 2. Event-Driven
Requirements triggered by an identifiable external event.

**Syntax:**
```
WHEN [optional precondition] [trigger event], the [system name] SHALL
[system response].
```

**Example:**
```
WHEN a registered user submits valid login credentials, the portal SHALL
authenticate the user and redirect them to the dashboard within 2 seconds.
```

**When to use:** most user-system interactions and service-to-service integrations.

---

### 3. State-Driven
Requirements that apply while the system or user is in a specific state.

**Syntax:**
```
WHILE [system state], the [system name] SHALL [system response].
```

**Example:**
```
WHILE a user session is active, the portal SHALL refresh the authentication
token every 15 minutes.
```

**When to use:** continuous behaviors depending on system state (active session,
maintenance in progress, authenticated user).

---

### 4. Optional Feature
Requirements that apply only when a given feature or configuration is enabled.

**Syntax:**
```
WHERE [feature is included], the [system name] SHALL [system response].
```

**Example:**
```
WHERE the two-factor authentication module is enabled, the system SHALL
require users to enter a TOTP code after successful password validation.
```

**When to use:** requirements conditional on configuration, licenses or optional
modules.

---

### 5. Error Handling
Requirements specifying system behavior under error or exception conditions.

**Syntax:**
```
IF [optional precondition] [trigger event] THEN the [system name] SHALL
[system response].
```

**Example:**
```
IF a user enters invalid credentials three consecutive times, THEN the
authentication service SHALL lock the account for 30 minutes and send a
notification email to the registered address.
```

**When to use:** error handling, fallbacks, business exceptions, negative scenarios.

---

### 6. Complex (pattern combination)
Combines two or more EARS patterns for requirements with multiple conditions.

**Syntax:**
```
WHILE [state], WHEN [event], IF [condition], the [system name] SHALL
[system response].
```

**Example:**
```
WHILE the maintenance window is active, WHEN a user attempts to login, IF
the session count exceeds 100 concurrent users, THEN the system SHALL
queue the request and notify the user with an estimated wait time.
```

**When to use:** complex scenarios combining state + event + condition. Use
sparingly — overly complex requirements should be split.

---

## EARS Ruleset

A valid EARS requirement must have:
- **Zero or more preconditions** (WHILE, WHERE)
- **Zero or one trigger** (WHEN, IF)
- **An explicit system name**
- **One or more system responses** (SHALL)

### Required keywords:
| Keyword | Role |
|---|---|
| `SHALL` | Mandatory system response (mandatory requirement) |
| `WHEN` | Triggering event |
| `WHILE` | System or user state |
| `WHERE` | Optional feature or configuration |
| `IF / THEN` | Error or exception condition |

### Keywords to avoid:
| Anti-pattern | Problem | Alternative |
|---|---|---|
| `should` | Ambiguous (obligation or wish?) | `SHALL` |
| `must` | Non-standard in EARS | `SHALL` |
| `may` | Too permissive | Specify with `WHERE` |
| `user` (generic) | Who is the user? | Specific role (e.g. `registered user`, `admin`) |
| `fast`, `quickly` | Not measurable | Provide threshold (e.g. "within 2 seconds") |

---

## EARS Validation Schema

Checklist for each requirement:

```
[ ] An applicable EARS pattern can be identified (Ubiquitous/Event/State/Optional/Error/Complex)
[ ] The SHALL keyword is present for the system response
[ ] The system name is explicit and not generic
[ ] The trigger/condition is clear and unambiguous
[ ] No vague terms are present (should, must, may, fast, good, etc.)
[ ] The requirement describes ONE single system behavior
[ ] The system response is verifiable (testable)
```

| Result | Status |
|---|---|
| 7/7 criteria | ✅ PASS |
| 5-6/7 criteria | 🟡 WARN |
| < 5/7 criteria | 🔴 FAIL |

---

## Challenge Questions Template

| Detected Gap | Challenge Question |
|---|---|
| Pattern not identifiable | "Under what circumstance or following which event should this behavior be activated?" |
| Missing SHALL | "Is the requirement mandatory or optional? If mandatory, under which condition should it always apply?" |
| Unspecified system | "Which specific component or service should implement this behavior?" |
| Ambiguous trigger | "What is the precise event that triggers this action? What must happen for the system to respond?" |
| Vague terms | "When you say '[vague term]', can you quantify it with a concrete metric or threshold?" |
| Multiple behaviors | "This requirement seems to describe multiple behaviors. Can we split it into separate requirements?" |
| Not testable | "How do we verify in test that this requirement is satisfied? What is the expected system output?" |

## Transformation Example

**Before (non-EARS):**
```
The user must be able to reset their password.
```

**After (EARS — Event-Driven + Error Handling):**
```
WHEN an unauthenticated user requests a password reset by providing a
registered email address, the authentication service SHALL send a
password reset link valid for 30 minutes to the specified email.

IF the provided email address does not match any registered account,
THEN the authentication service SHALL display a neutral confirmation
message without revealing whether the account exists.
```
