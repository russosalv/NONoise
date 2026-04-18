# Narrative PRD template

Reference for the mandatory structure of PRDs produced by `arch-brainstorm`. The PRD must be **self-contained, narrative, readable**. The "Decision story" section is **mandatory** and cannot be replaced by technical bullet lists.

## Template philosophy

A PRD is not only a technical reference document — it is also a **memory of why we decided this way**. Six months from now, when a new team member (or you yourself) opens the document, they must be able to understand:

1. **What** is being built (summary + architecture)
2. **Why** these choices (narrative story, rejected alternatives, motivations)
3. **How** to implement it (data model, contracts, handlers, checklist)
4. **What we are not doing** (explicit anti-scope)

If even one of these four dimensions is missing, the PRD is incomplete.

## Mandatory structure

### YAML frontmatter (mandatory)

```yaml
---
title: "Readable title of the study"
area: <area-slug>
study: <study-slug>
status: draft
sprint: null
validated_at: null
validated_by: null
superseded_by: null
superseded_reason: null
created_at: YYYY-MM-DD
authors: [name1]
---
```

All fields are mandatory. Use `null` for those not applicable at writing time.

### Header

```markdown
# PRD — <descriptive study title>

> **Status**: `draft` — produced by architectural brainstorming on YYYY-MM-DD
> **Area**: `<area-slug>` (this is study `NN-<study-slug>`)
> **Scope**: <1 sentence describing what is in scope and what is out>
> **Standalone diagrams**: [NN-<study>-diagrams.md](./NN-<study>-diagrams.md)
> **Area brief**: [00-area-brief.md](./00-area-brief.md)
```

---

## § 1 — Executive summary

Quick opener: 1–2 paragraphs of prose + a table of key choices.

### Structure

```markdown
## 1. Executive summary

<1–2 paragraphs: what this PRD does, which problem it solves, what the scope is.
Make what is in and what is out explicit. If there is a contract with upstream/downstream
flows, mention it.>

**Key architectural choices:**

| Decision | Choice | Motivation |
|---|---|---|
| <dimension 1> | <choice 1> | <short motivation> |
| <dimension 2> | <choice 2> | <short motivation> |
| ... | ... | ... |
```

The table must include all important decisions (typically 6–12 rows). It is the "cheat sheet" for someone opening the document who wants to understand the design in 30 seconds.

---

## § 2 — Decision story (MANDATORY)

Most important section of the PRD. Must be written as **discursive prose**, not bullet lists. Explain to an intelligent but external reader how we arrived at this design.

### Mandatory subsections

#### § 2.1 — The starting problem

2–4 paragraphs of prose describing:
- The state of the world before this study (what exists in code, what is missing)
- The trigger for the study (why now, what prompted the need)
- The actors involved (users, upstream/downstream systems)

Do not list components in a table: narrate them. "`auth-service` exists and is functional, it handles sign-up and password flows. `notifications` is a stub that needs to be completed. `billing` does not yet have an `Invoice` aggregate…" — this is the expected form.

#### § 2.2 — The N key decisions

For **each** important decision taken during brainstorming, one micro-section with this schema:

```markdown
#### Decision K — <short title>

**Question**: <the question asked to the architect>

**Alternatives considered** (if relevant):
- **A.** <description of option A>
- **B.** <description of option B>
- **C.** <description of option C>

**Choice**: <the final choice>

**Why**: <1 paragraph of motivation. Must include the pros of the choice AND the cons of
the rejected alternatives. The "why" is often the most useful content over time — write
it well, not hurriedly.>
```

Not every decision has explicit alternatives — some are "forced" choices from project constraints. In those cases skip the alternatives and go straight to choice + why (e.g. "We use the project's ORM" needs no alternatives — it is a constraint).

**Order**: follow the chronological order of the brainstorming, not a "reconstructed" logical order. It is more honest and more readable.

**Typical number**: 5–15 decisions. If you have 30 decisions, you are probably including details that belong in the technical sections (§6–§10), not in the story.

#### § 2.3 — How a request flows end-to-end

Narrative prose describing the flow from the point of view of a single request (or a single event). Use logical timestamps (T0, T1, T2…) and describe what happens at each point.

**Goal**: a reader must be able to follow the flow without looking at the diagrams. Diagrams are a visual complement, not the main vehicle.

**Example style**:

> **T0 — The event arrives from phase 1.**
> Phase 1 has just finished the calculation: it persisted a `Job` in state `InProgress`, created N `Item` rows in state `Computed`, and for each one published an `ItemComputed` event on the message bus.
>
> **T1 — Self-subscription.**
> Pod replicas consume events from the topic in parallel. Each replica receives a subset of events. For each event, the handler invokes `ProcessItem`.
>
> **T2 — Idempotency check.** […]

#### § 2.4 — Flow diagrams (inline)

Exactly two Mermaid diagrams embedded inline:

1. **Component diagram** (`graph TB` or `graph LR`) — shows the components involved and their relationships
2. **Sequence diagram** (`sequenceDiagram` with `autonumber`) — happy path end-to-end

Use the standard chromatic `classDef` set (see parent SKILL.md). Write a short legend after each diagram.

The same diagrams go into the standalone file `NN-<study>-diagrams.md` with a minimal header — useful for reuse in presentations, external reviews, sprint documentation.

#### § 2.5 — What we will NOT do (anti-scope)

Explicit list of things excluded from the PRD, **each with motivation**. Example:

> - **External orchestrator** — explicitly excluded from this flow. The team has no expertise with it; the self-sub pattern already in production covers the same needs. […]
> - **Job progress bar** — no incremental counters. […]
> - **Long-lived tokens in DB** — no persisted tokens. […]

Anti-scope is often more informative than scope. If a reader wonders "why did we not do Y?", they must find the answer here. Never leave implicit exclusions.

---

## § 3 — Context and motivation

Now a secondary section (the bulk is in the story). Contains:

### § 3.1 — What exists today

Tabular or bullet list of: relevant existing components, consolidated patterns, stubs, gaps. Code references with file:line where useful.

### § 3.2 — What is missing

Concise list of what needs to be built.

### § 3.3 — Constraints and requirements

- Stack and infrastructure
- Patterns to reuse
- Entity states (TBD from spec → documented placeholders)
- Absolute constraints from the project source of truth that apply

---

## § 4 — Contract with adjacent phases (optional)

If the PRD covers only part of a larger flow, document here the contract with upstream/downstream phases. Useful to enable parallel development of multiple studies in the same area.

Example: "Phase 1 (out of scope for this PRD) must honor this contract for phase 2 to work without changes: […]".

---

## § 5 — Target architecture

Keep it short — refer back to the inline diagrams in §2.4 for self-containment. Add:

- Table of components involved with role and status (new / modified / unchanged)

Do not duplicate the diagrams here. The diagram lives in §2.4.

---

## § 6 — Data model

If applicable. Tables for each entity/aggregate with columns, types, notes, constraints. Suggested unique constraints.

---

## § 7 — Event contracts

If applicable. For each event:
- Name
- Producer / consumer
- Example JSON payload
- Notes (ordering, retry, idempotency)

---

## § 8 — API contracts

If applicable. For each endpoint:
- Method + path
- Request body (example JSON)
- Response 200/4xx/5xx
- Common errors

---

## § 9 — Orchestration / handler pseudocode

If applicable. Language-neutral pseudocode showing how the main handler works, idempotency handling, service calls, error handling.

---

## § 10 — Error handling, retry, idempotency

- Retry strategy (platform-native, custom, etc.)
- Idempotency (natural key, state check)
- Error classification (recoverable / non-recoverable / fatal)
- Manual recovery if applicable

---

## § 11+ — Domain-specific sections

Variable depending on the study. Examples:
- Token/SAS strategy (for areas touching files / blobs)
- Security and authorization (for areas touching sensitive data)
- Scheduling (for areas with timers / cron)
- UX / UI flow (for areas affecting the frontend)

Number in sequence after §10.

---

## § N-3 — Code changes checklist

Three mandatory subsections:

### § N-3.1 — New

List everything to be built from scratch, organized by component. Example:

```markdown
#### auth-service
- [ ] Domain: `PasswordlessSession` entity
- [ ] Infrastructure: ORM mapping + migration
- [ ] API: `POST /auth/passwordless/start`
- [ ] Application: `StartPasswordlessHandler`
- [ ] ...
```

### § N-3.2 — Modified

List existing components to be extended/modified, by component.

### § N-3.3 — Unchanged

List existing components that must NOT be modified — useful to explicitly exclude unneeded changes.

---

## § N-2 — Testing strategy

### § N-2.1 — Unit

Which components to test, with expected mocks.

### § N-2.2 — Integration

End-to-end scenarios with testcontainers / mock HTTP / seeded data.

### § N-2.3 — Acceptance

User-facing scenarios with a complete environment.

---

## § N-1 — Open points / future analysis

List of deferred decisions, with a note on who/what is needed to close them. Examples:
- Exact enum states (awaiting spec)
- Exact domain fields (awaiting functional specification)
- Matching policy (awaiting business requirement)
- SLA / retention policy

Each point is a check item `- [ ] <description>`.

---

## § N — Appendices

### § N.1 — References to existing code

Table with file:line of components cited in the PRD. Useful for navigation.

### § N.2 — Decisions closed during brainstorming

Summary ✅ list of decisions closed during the brainstorming session, with 1 line each. Serves as a "changelog" of the brainstorming.

### § N.3 — Names and conventions

Table of chosen names: topics, containers, handlers, controllers, clients, events. Quick reference for implementation.

---

## Style rules

1. **Prose for the story, details in tables**. §2 is prose (except the key-choices table in §1). §5–§N are tables, bullets, pseudocode.
2. **Prefer domain vocabulary**. Do not over-translate domain terms. If a business term is customary in one language, keep it consistent.
3. **Never use "we" or "I"**. Prose in impersonal form or second-person functional voice ("when the handler receives the event…"), not first person ("we decide…").
4. **Present tense**. "The handler loads the entity", not "the handler will load the entity". The present describes the target system state.
5. **Internal links** between sections with Markdown anchors: `[section X](#NN-section-title)`.
6. **External links** with relative paths: `[name](./file.md)` in the same area, `[name](../other-area/file.md)` cross-area.
7. **Inline code** with backticks: `Order.status`, `CustomerId`, `POST /api/v1/...`.
8. **Fenced code blocks** with language specified: ` ```ts`, ` ```json`, ` ```mermaid`, ` ```yaml`.

---

## Self-review checklist before saving

Re-read the just-written PRD and verify:

- [ ] Frontmatter complete and correct
- [ ] §1 summary with key-choices table
- [ ] §2 story in **prose**, not bullet list
- [ ] §2.2 at least 5 decisions with question → alternatives → choice → why
- [ ] §2.3 end-to-end flow in prose (T0 → TN)
- [ ] §2.4 Mermaid diagrams embedded (component + sequence)
- [ ] §2.5 anti-scope with motivations
- [ ] No implicit TBDs (all in §N-1 Open points)
- [ ] Code changes checklist per component
- [ ] Testing strategy (unit + integration + acceptance)
- [ ] Internal consistency (§2 decisions = §6–§10 details)
- [ ] Language in present tense, impersonal
- [ ] Working internal and external links
- [ ] File `NN-<study>-diagrams.md` generated alongside
- [ ] `00-area-brief.md` created or updated

If even one of these checks fails, **do not save**. Fix first.
