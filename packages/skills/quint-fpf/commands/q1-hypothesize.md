---
description: "Generate Hypotheses (Abduction)"
pre: "context recorded (Phase 0 complete; <output_dir>/00-context.md exists)"
post: ">=1 L0 hypothesis exists; <output_dir>/01-hypotheses.md written"
invariant: "hypotheses must have kind ∈ {system, episteme}"
required_tools: ["Read", "Write"]
required_tools_tooled: ["quint_propose"]
---

# Phase 1: Abduction

You are the **Abductor** operating as a **state machine executor**. Your goal is to generate **plausible, competing hypotheses** (L0) for the user's problem AND to record them in the per-cycle markdown trail.

## Locating the active cycle

Before doing anything else, locate the active cycle and read its `output_dir`:

1. If `.quint/context.md` exists, read the active cycle path from there.
2. Otherwise, scan `docs/fpf/*/00-context.md` and `docs/prd/*/audit/*-fpf/00-context.md`, pick the most recent whose `verdict_phase5` frontmatter is empty. If multiple candidates remain, ask the user which to continue.
3. If none is found, stop with: "No active FPF cycle. Run `/q0-init` first."

Read `<output_dir>/00-context.md` to ground yourself in vocabulary, invariants, and constraints.

## Enforcement Model

**Hypotheses must be recorded in BOTH the markdown trail AND (in tooled mode) `.quint/`.** Mental notes or prose descriptions in the conversation are NOT hypotheses — they are not auditable.

| Precondition | Action | Postcondition |
|--------------|--------|---------------|
| Phase 0 complete | locate active cycle, read `00-context.md` | `output_dir` known |
| `output_dir` known | `Write` `<output_dir>/01-hypotheses.md` from template | markdown trail of L0 hypotheses on disk |
| (tooled only) markdown written | `quint_propose` × N | L0 holons created in `.quint/` |

**RFC 2119 Bindings:**
- You MUST `Write` `<output_dir>/01-hypotheses.md` containing every hypothesis you generate, in BOTH modes. The markdown is the canonical human-readable trail.
- In tooled mode you MUST ALSO call `quint_propose` for EACH hypothesis you want trackable in `.quint/`.
- You MUST NOT proceed to Phase 2 without `01-hypotheses.md` containing at least one hypothesis.
- You SHALL include `kind` (system/episteme) and `scope` for every hypothesis (in both the markdown and the tool call).
- Mentioning a hypothesis only in chat — without writing it to the markdown — does NOT create it.
- Skipping the markdown write — even in tooled mode — is a **protocol violation**.

**If you skip the markdown write:** Phase 2 (`/q2-verify`) cannot find the hypotheses to verify and will block.

## Invalid Behaviors

- Listing hypotheses in prose without calling `quint_propose` for each
- Claiming "I generated 3 hypotheses" when tool was called 0 times
- Proceeding to `/q2-verify` with zero L0 holons
- Using `kind` values other than "system" or "episteme"

## Context
The user has presented an anomaly or a design problem.

## Method (B.5.2 Abductive Loop)
1.  **Frame the Anomaly:** Clearly state what is unknown or broken.
2.  **Generate Candidates:** Brainstorm 3-5 distinct approaches.
    -   *Constraint:* Ensure **Diversity** (NQD). Include at least one "Conservative" (safe) and one "Radical" (novel) option.
3.  **Plausibility Filter:** Briefly assess each against constraints. Discard obviously unworkable ones.
4.  **Formalize:** For each survivor, call `quint_propose`.

## Before Calling quint_propose: Linking Checklist

**For EACH hypothesis, explicitly answer these questions:**

| Question | If YES | If NO |
|----------|--------|-------|
| Are there multiple alternatives for the same problem? | Create parent decision first, then use `decision_context` for all alternatives | Skip `decision_context` |
| Does this hypothesis REQUIRE another holon to work? | Add to `depends_on` (affects R_eff via WLNK!) | Leave `depends_on` empty |
| Would failure of another holon invalidate this one? | Add that holon to `depends_on` | Leave empty |

**Examples of when to use `depends_on`:**
- "Health Check Endpoint" depends on "Background Task Fix" (can't check what doesn't work)
- "API Gateway" depends on "Auth Module" (gateway needs auth to function)
- "Performance Optimization" depends on "Baseline Metrics" (can't optimize without baseline)

**Examples of when to use `decision_context`:**
- "Redis Caching" and "CDN Edge Cache" are alternatives → group under "Caching Decision"
- "JWT Auth" and "Session Auth" are alternatives → group under "Auth Strategy Decision"

**CRITICAL:** If you skip linking, the audit tree will show isolated nodes and R_eff won't reflect true dependencies!

## Action (Run-Time)
1.  Locate the active cycle and read `<output_dir>/00-context.md` (see *Locating the active cycle* above).
2.  Ask the user for the problem statement if not already in `00-context.md`.
3.  Think through the options against the recorded vocabulary, invariants, and constraints.
4.  **If proposing multiple alternatives:** Create parent decision holon FIRST.
5.  **(Tooled mode)** Call `quint_propose` for EACH hypothesis, setting `decision_context` and `depends_on` as needed. The tool stores these in `.quint/knowledge/L0/`.
6.  **`Write` the markdown trail** at `<output_dir>/01-hypotheses.md` using the template below. Include every hypothesis (and the parent decision holon if any). In tooled mode, the markdown documents what `quint_propose` recorded; in conversational mode, the markdown IS the record.
7.  Summarize the generated hypotheses to the user, noting any declared dependencies.

## Markdown template — `01-hypotheses.md`

On first run, write the full structure. On re-runs, leave `## Initial entries` untouched and append to `## Revisions`.

```markdown
---
phase: 1
slug: <same as 00-context.md>
output_dir: <same as 00-context.md>
mode: tooled | conversational
last_updated: <UTC ISO-8601>
---

# Phase 1 — Hypotheses (L0)

## Initial entries

### Decision context: <title> (if applicable)
- **ID**: <kebab-id>
- **Kind**: episteme
- **Scope**: <where this decision applies>

### H1 — <title>
- **ID**: <kebab-id>
- **Kind**: system | episteme
- **Scope**: <claim scope>
- **Method**: <how it works — the recipe>
- **Rationale**:
  - Anomaly: <what triggered the need>
  - Approach: <why this works>
  - Alternatives rejected: <list>
- **decision_context**: <id of parent decision, if any>
- **depends_on**: [<id1>, <id2>] (with CL: <1|2|3>)

### H2 — <title>
…(same template per hypothesis)

## Revisions
<empty on first run; appended on re-runs of /q1-hypothesize or /q1-add>
```

When `quint_propose` returns a generated holon ID in tooled mode, write the same ID under `**ID**` in the markdown so the two artifacts cross-reference cleanly via shared identifiers (the markdown remains autonomous — IDs are conveniences, not links).

## Tool Guide: `quint_propose`

### Required Parameters
-   **title**: Short, descriptive name (e.g., "Use Redis for Caching").
-   **content**: The Method (Recipe). Detail *how* it works.
-   **scope**: The Claim Scope (G). Where does this apply?
    *   *Example:* "High-load systems, Linux only, requires 1GB RAM."
-   **kind**: "system" (for code/architecture) or "episteme" (for process/docs).
-   **rationale**: A JSON string explaining the "Why".
    *   *Format:* `{"anomaly": "Database overload", "approach": "Cache read-heavy data", "alternatives_rejected": ["Read replicas (too expensive)"]}`

### Optional Parameters (Dependency Modeling)
-   **decision_context**: ID of parent decision/problem holon.
    -   Creates `MemberOf` relation (groups alternatives together)
    -   Example: `"caching-strategy-decision"`

-   **depends_on**: Array of holon IDs this hypothesis depends on.
    -   Creates `ComponentOf` (if kind=system) or `ConstituentOf` (if kind=episteme)
    -   Enables WLNK: parent R_eff ≤ dependency R_eff
    -   Example: `["auth-module", "crypto-library"]`

-   **dependency_cl**: Congruence level for dependencies (1-3, default: 3)
    -   CL3: Same context (0% penalty)
    -   CL2: Similar context (10% penalty)
    -   CL1: Different context (30% penalty)

## Example: Competing Alternatives

```
# First, create the decision context
[quint_propose(title="Caching Strategy Decision", kind="episteme", ...)]
→ Created: caching-strategy-decision

# Then, propose alternatives grouped under it
[quint_propose(
    title="Use Redis",
    kind="system",
    decision_context="caching-strategy-decision"
)]
→ Created: use-redis (MemberOf caching-strategy-decision)

[quint_propose(
    title="Use CDN Edge Cache",
    kind="system",
    decision_context="caching-strategy-decision"
)]
→ Created: use-cdn-edge-cache (MemberOf caching-strategy-decision)
```

## Example: Declaring Dependencies

```
# Hypothesis that depends on existing holons
[quint_propose(
    title="API Gateway with Auth",
    kind="system",
    depends_on=["auth-module", "rate-limiter"],
    dependency_cl=3
)]
→ Created: api-gateway-with-auth
→ Relations: auth-module --componentOf--> api-gateway-with-auth
             rate-limiter --componentOf--> api-gateway-with-auth

# Now WLNK applies:
# api-gateway-with-auth.R_eff ≤ min(auth-module.R_eff, rate-limiter.R_eff)
```

## Example: Success Path

```
User: "How should we handle caching?"

[Call quint_propose(title="Use Redis", kind="system", ...)]  → Success, ID: redis-caching
[Call quint_propose(title="Use CDN edge cache", kind="system", ...)]  → Success, ID: cdn-edge
[Call quint_propose(title="In-memory LRU", kind="system", ...)]  → Success, ID: lru-cache

Result: 3 L0 hypotheses created, ready for Phase 2.
```

## Example: Failure Path

```
User: "How should we handle caching?"

"I think we could use Redis, a CDN, or in-memory LRU cache..."
[No quint_propose calls made]

Result: 0 L0 hypotheses. Phase 2 will find nothing. This is a PROTOCOL VIOLATION.
```

## Checkpoint

Before proceeding to Phase 2, verify:
- [ ] Active cycle located and `00-context.md` read
- [ ] `<output_dir>/01-hypotheses.md` exists with at least one hypothesis under `## Initial entries`
- [ ] Each hypothesis has valid `kind` (system or episteme) and defined `scope`
- [ ] If multiple alternatives exist: they share the same `decision_context`
- [ ] If dependencies exist: they are declared in `depends_on` (with CL)
- [ ] (Tooled only) Called `quint_propose` for each hypothesis (success, not BLOCKED)
- [ ] (Tooled only) Markdown IDs match the holon IDs returned by `quint_propose`

**If any checkbox is unchecked, you MUST complete it before proceeding.**
