---
name: arch-brainstorm
description: Dialogic architectural brainstorming skill. Helps an architect study how to implement something starting from just an area name, exploring the existing codebase, reading the project's source of truth at `docs/architecture/` plus `docs/requirements/` and `docs/calls/`, and producing a narrative PRD (story of the decision, inline Mermaid diagrams, explicit anti-scope) under `docs/prd/<area>/`. USE AS STEP 1 of the end-to-end architectural workflow — brainstorm → arch-decision (Quint FPF validation via `quint-fpf`) → sprint-manifest (promotion to sprint). Triggers — "I want to study how to implement X", "how should we handle Y", "brainstorm on area Z", "open a PRD for W", "arch-brainstorm area <slug>". Also triggers without explicit mention when the user is defining a new architectural work area from scratch and wants to think it through together.
source: Risko reference-project (reworked whitelabel for NONoise)
variant: nonoise generic; stack-neutral
---

# arch-brainstorm — Architectural dialog and narrative PRD

This skill is **step 1** of the NONoise architectural workflow. It turns an idea or an area name into a narrative PRD that is complete, self-contained, and ready for formal validation via `arch-decision` (which delegates to `quint-fpf`).

## Position in the workflow

```
┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
│ arch-       │──▶│ arch-        │──▶│ sprint-manifest  │
│ brainstorm  │   │ decision     │   │                  │
│             │   │              │   │                  │
│ explore +   │   │ validate via │   │ promote to       │
│ dialog +    │   │ quint-fpf    │   │ sprint manifest  │
│ write PRD   │   │              │   │                  │
└─────────────┘   └──────────────┘   └──────────────────┘
     STEP 1            STEP 2              STEP 3
```

After `arch-decision` validates a PRD (PASS), the architect updates `docs/architecture/` (the project's source of truth) manually — NONoise does not ship an auto-sync skill.

## What this skill does

1. **Explores** the codebase relevant to the area (components involved, existing patterns, stubs/gaps).
2. **Reads the source of truth** at `docs/architecture/` — absolute constraints (`01-constraints.md`), patterns, stack, component registry. Also reads `docs/requirements/` for relevant functional requirements, `docs/calls/` for recent meeting context if relevant, and `docs/support/` for prior research.
3. **Reads** prior studies in the area (if `docs/prd/<area>/` already exists).
4. **Dialogs** with the architect via Q&A — one question at a time, multiple-choice preferred — in the style of `superpowers:brainstorming` but tuned to project-specific context.
5. **Writes** a PRD with a mandatory narrative structure (see [`references/prd-template.md`](./references/prd-template.md)), saved as `docs/prd/<area>/NN-<study>.md`.
6. **Writes** a standalone diagrams file `NN-<study>-diagrams.md` (same Mermaid diagrams that are also embedded inline in the PRD).
7. **Updates or creates** `00-area-brief.md` (area index).
8. **Suggests** the next step — invoke `arch-decision` to validate the PRD.

## What this skill does NOT do

- **Does not validate** decisions — that is `arch-decision`'s job (via `quint-fpf`).
- **Does not update** `docs/architecture/` or the component registry — the architect does that manually after a PRD is validated.
- **Does not promote** to a sprint — that is `sprint-manifest`'s job.
- **Does not generate code** — it only produces design documents.
- **Does not create formal ADR-DRAFT files** with tabulated pros/cons — the narrative decision story in the PRD replaces that format with readable prose.

## Possible inputs

The skill can be triggered in several ways:

| User input | Skill action |
|---|---|
| `arch-brainstorm area user-signup` | Use `user-signup` as the area slug |
| "I want to study the PDF export flow" | Propose slug `pdf-export` (or similar), ask for confirmation |
| "New study in area `payments`" | Open a new study `NN+1-<slug>` in an existing area |
| "How should we handle event replay?" | Propose area `event-replay`, ask for confirmation, start exploration |

**Before starting real work**, the skill must always:
1. **Confirm the area slug** with the architect
2. **Check whether the folder exists** at `docs/prd/<area>/`
3. **Decide whether this is a new study or an iteration** of an existing one

---

## Flow — 4 phases

### Phase 1: DISCOVER — explore the context

**Goal**: understand the state of the world before asking the architect anything.

#### Actions

1. **Confirm area slug** — parse user input. If ambiguous, ask: "What area are you studying? Slug in kebab-case (e.g. `user-signup`)".

2. **Check folder existence** — `docs/prd/<area>/`:
   - **Exists with studies inside** → read `00-area-brief.md` and the existing studies to understand what has already been decided. Determine whether the user is opening a **new study** (`NN+1`) or iterating on an existing one.
   - **Exists but empty or brief-only** → new study, prefix `01-`.
   - **Does not exist** → new area; create it with `00-area-brief.md` as the first file.
   - **Exists with marker `README-status.md` declaring `status: external`** → external argumentative folder; **do not touch it**. Propose a different slug (e.g. `-v2` suffix).

3. **Read the project source of truth** — always. In particular:
   - `docs/architecture/01-constraints.md` — absolute constraints (first stop)
   - Other numbered files in `docs/architecture/` — patterns, stack, conventions, component registry
   - `docs/requirements/` filtered to the area — functional requirements to honor
   - `docs/calls/` recent meetings relevant to the area — stakeholder context, pre-decisions
   - `docs/support/` — any legacy analysis, external research, or vendor docs for the area
   - `CLAUDE.md`, `AGENTS.md`, `nonoise.config.json` at repo root — additional project context

4. **Explore the codebase** — identify:
   - Components potentially involved in the area (match by name, by domain, by keyword)
   - Similar patterns that already exist
   - Gaps / stubs / TBDs
   - Existing entities, APIs, events, contracts
   - Cross-component dependencies

   **Tools**: use the `Explore` agent for this reconnaissance, especially when the area spans multiple components. The prompt should be explicit: "Given that I'm studying area X, I want to know what exists today in Y, Z, W; what gaps exist relative to the goal; which patterns are reusable".

5. **Summarize to the architect** in ~150 words what you found, before starting questions. Example:

   > I read the `user-signup` folder (2 files: brief + study 01 validated on OTP). I read the project constraints in `docs/architecture/`. Exploring the code: `auth-service` already has email/password signup, `notifications` is a stub with only the interface, the pipeline uses a queue-based pattern via `events/signup.ts`. I notice there is no passwordless login yet. Can you confirm the new study is about: **[summary of the goal]**?

#### Phase 1 checkpoint

- [ ] Area slug confirmed
- [ ] Folder state verified
- [ ] Project source of truth read (constraints/guidelines in memory)
- [ ] Codebase explored for the area
- [ ] Summary presented to the architect

**Ask for confirmation** before moving to phase 2.

---

### Phase 2: DIALOGUE — Q&A with the architect

**Goal**: gather scope, constraints, preferences, and decisions through structured dialog. Do not write anything to files until you have enough information to produce a coherent PRD.

#### Dialog principles

1. **One question at a time**. Never multi-question. If a topic is complex, break it up.
2. **Multiple-choice when possible** — easier to answer than an open question. Offer 2–4 options with explicit trade-offs.
3. **Explore alternatives** — for each important decision, propose 2–3 approaches with pros/cons before asking for a choice.
4. **Recommend with reservation** — after presenting alternatives, say "my recommendation is X because Y", but leave the final word to the architect.
5. **Respect corrections** — if the architect corrects an assumption, acknowledge it explicitly and update downstream reasoning. Never proceed as if nothing happened.
6. **Prefer explicit confirmations** — never assume silently. "Confirmed X" beats "Assumed X".
7. **Keep the thread** — periodically summarize what has been decided ("so far we've decided: A, B, C — proceeding with D?").

#### Typical question dimensions (non-exhaustive)

| Dimension | Example questions |
|---|---|
| Scope | "Does the study cover only X or also Y?" |
| Volume / scale | "How many items per operation? Tens, hundreds, thousands?" |
| Sync vs async | "Does the user wait for a response or get notified later?" |
| Tracking | "State per item, per job, or both? Progress counter or just end-of-job?" |
| Messaging | "Pub/sub, sync invoke, outbox?" |
| Event granularity | "One event per batch or one per item?" |
| Ownership | "Where does the entity live? Which component owns the data?" |
| State machine | "Final states? Where do they come from (spec, already decided, TBD)?" |
| Error handling | "Retry policy? Dead-letter? Idempotency?" |
| Security | "Short-lived tokens, long-lived in DB, other? Who can access?" |
| Trigger | "Event-driven from upstream, sync API, scheduler?" |
| Notification | "Push, email, polling? When?" |

Adapt to the stack and domain — these are templates, not a script.

#### Visual companion (optional)

If the dialog covers visual questions (UI layout, mockups, diagrams to compare), offer the **visual companion** of `superpowers:brainstorming` once as an isolated message. After acceptance, decide per-question whether to use a browser or the terminal (see `superpowers:brainstorming` for rules).

For textual questions (choices between conceptual alternatives, trade-offs, requirements), stay in the terminal.

#### Dialog length

Number of questions depends on area complexity — typically 5–15 exchanges. Never fire a list of 20 questions at once. Prefer quick iterations.

#### Phase 2 checkpoint

- [ ] Scope clear (what's in / what's out)
- [ ] Key decisions made with alternatives discussed
- [ ] Constraints and integrations identified
- [ ] States / placeholders agreed
- [ ] Error handling and retry agreed
- [ ] Architect has green-lit moving to writing

**Ask for explicit confirmation** before starting to write the PRD.

---

### Phase 3: WRITE — produce the narrative PRD

**Goal**: turn the dialog into a written PRD — self-contained, readable, with mandatory structure.

#### Mandatory PRD template

Use the structure documented in [`references/prd-template.md`](./references/prd-template.md). Non-negotiable elements:

1. **YAML frontmatter** with `status: draft`, `area`, `study`, `created_at`, `authors`, plus all lifecycle fields (see [`references/folder-conventions.md`](./references/folder-conventions.md)).
2. **Executive summary** (§1) — table of key choices, 1–2 paragraphs of intro.
3. **Decision story** (§2) — mandatory section in **prose**, not bullet lists. Must contain:
   - §2.1 The starting problem (state of the world, motivation)
   - §2.2 The N key decisions — for each: *question → alternatives considered → choice → why*
   - §2.3 End-to-end flow narrated in prose (T0 → TN), readable by a non-developer
   - §2.4 Inline diagrams (component + sequence, Mermaid)
   - §2.5 What we will NOT do (anti-scope with explicit motivations)
4. **Context and motivation** (§3) — now secondary, captures existing state and constraints/requirements
5. **Contract with upstream/downstream** (§4, optional, if applicable)
6. **Target architecture** (§5) — refers back to inline diagrams in §2.4 for self-containment, but summarizes components involved and roles
7. **Data model** (§6, if relevant)
8. **Event contracts** (§7, if relevant)
9. **API contracts** (§8, if relevant)
10. **Orchestration / handler pseudocode** (§9, if relevant)
11. **Error handling, retry, idempotency** (§10)
12. **Domain-specific sections** (§11+, variable: security, auth, scheduling, …)
13. **Code changes checklist** — three subsections: new / modified / unchanged
14. **Testing strategy** — unit / integration / acceptance
15. **Open points** — explicit TBDs from spec or future analysis
16. **Appendices** — references to existing code (file:line), closed decisions from brainstorming, names and conventions

**Golden rule**: a new team member must be able to open the PRD and understand everything with no other file open. No "see other doc". Exception: references to code (file:line) and links to supplementary sub-documents.

#### Files to produce

In addition to the main PRD, the skill must produce:

1. **Standalone diagrams**: `NN-<study>-diagrams.md` in the same folder, with the same Mermaid diagrams in minimal form (useful for reuse in presentations or external reviews).
2. **Area brief**: `00-area-brief.md` — if it doesn't exist, create it with index and area context. If it does, add the new study to the index.

#### Mermaid diagrams

Diagrams are **mandatory**. Minimum two:
- **Component diagram** (`graph TB` or `graph LR`): shows components involved with color classification (new / modified / unchanged / store / topic).
- **Sequence diagram** (`sequenceDiagram` with `autonumber`): happy path end-to-end with rect notes for logical sections.

Use these inline CSS classes (neutral palette, override per project if desired):

```
classDef new fill:#fff0f4,stroke:#e50046,stroke-width:2px,stroke-dasharray:4 3;
classDef modified fill:#fff,stroke:#4d59fd,stroke-width:2px;
classDef external fill:#f4f6fa,stroke:#555f6e,stroke-width:1.5px;
classDef store fill:#eaf7ef,stroke:#00714a,stroke-width:1.5px;
classDef topic fill:#fff8e1,stroke:#ec7200,stroke-width:2.5px;
classDef outofscope fill:#fafafa,stroke:#999,stroke-width:1.5px,stroke-dasharray:2 2;
```

#### Self-review before saving

Before writing the file, mentally re-read it and verify:
- **Placeholder scan**: is every TBD explicitly marked as an "open point"?
- **Internal consistency**: do decisions in §2.2 match §5–§10?
- **Scope check**: is the document focused (not too broad)?
- **Ambiguity**: is every requirement interpretable unambiguously?
- **Narrative fronts**: is the §2 story readable as prose, not a bullet list?

Fix inline before saving.

#### Phase 3 checkpoint

- [ ] PRD written per mandatory template
- [ ] Standalone diagrams file produced
- [ ] `00-area-brief.md` created or updated
- [ ] Frontmatter correct (`status: draft`, all fields)
- [ ] Self-review passed

---

### Phase 4: HANDOFF — close the loop

**Goal**: cleanly close your work and pass the baton to the next skill.

#### Actions

1. **Summarize to the architect** what you produced (file paths, key sections, 1–2-sentence recap).
2. **Request review** explicitly: "Review the PRD before proceeding. If you want changes, tell me; otherwise the next step is invoking `arch-decision` to validate with Quint FPF".
3. **User gate**: do not declare the skill "complete" until the architect gives the green light or requests changes.
4. **If the architect requests changes**: return to phase 2 or 3 depending on the kind of change (new decisions → phase 2; only formatting → straight to phase 3 with edits).
5. **If the architect approves**: explicitly suggest the next skill:

   > The PRD is ready. To proceed to the next step of the architectural workflow, invoke:
   >
   > **`arch-decision <path-to-prd>`**
   >
   > arch-decision will apply the Quint FPF methodology (via `quint-fpf`) to validate the decisions embedded in the narrative. On PASS the frontmatter becomes `status: validated`, and `arch-decision` will produce a concrete list of changes to apply to `docs/architecture/` manually.

#### Phase 4 checkpoint

- [ ] Architect received the summary
- [ ] Architect approved (or requested changes have been applied)
- [ ] Next step explicitly suggested

---

## Naming and frontmatter

See [`references/folder-conventions.md`](./references/folder-conventions.md) for full details. Summary:

- **Area folder**: `docs/prd/<area-slug>/`
- **Study files**: `NN-<study-slug>.md` + `NN-<study-slug>-diagrams.md`
- **Area brief**: `00-area-brief.md` (always present)
- **Audit reports**: `audit/NN-<study-slug>-fpf.md` (created by `arch-decision`, not here)

Mandatory PRD frontmatter:

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

Lifecycle: `draft` → `in-validation` → `validated` → {`promoted` | `superseded` | `rejected`}. See `folder-conventions.md`.

---

## Resuming mid-flow

If the user has already started a previous session with this skill (existing area, draft study):

1. Read `00-area-brief.md` to understand area state
2. Read the latest draft study to see where the dialog stopped
3. Summarize to the user: "Last time we decided X, Y, Z. The PRD was draft with sections A, B, C. Do you want to **continue from where we left off** or **start over**?"
4. Proceed accordingly

---

## Anti-patterns

1. **Writing the PRD before the dialog** — never generate a "trial" PRD without having asked questions. The decision story must reflect a real dialog, not a filled-in template.
2. **Skipping the discover phase** — do not start questions without having read the codebase and the source of truth. You risk asking questions that are answerable by looking at the code.
3. **Bullet lists instead of prose in the story** — §2 must be discursive text, not a list. Bullet lists are fine in other sections.
4. **Diagrams as "see other file"** — diagrams must be inline. The separate diagrams file is a complement, not a replacement.
5. **Leaving TBDs unmarked** — every TBD must be explicitly marked as an open point (§N-1 of the PRD). Declared placeholders beat implicit gaps.
6. **Going solo** — every important decision must be discussed, never taken unilaterally. Even when the answer seems obvious from the code, ask for confirmation.
7. **Skipping the handoff phase** — until the architect approves or modifies, the skill is not complete.

---

## When NOT to use this skill

- **Bug fix** → use `superpowers:systematic-debugging`
- **Decision already in absolute constraints** of the project source of truth → nothing to brainstorm
- **Local choices** that do not affect architecture (variable naming, formatting) → do not open a PRD for this
- **Direct implementation** when the design is already validated in a sprint → use `superpowers:writing-plans` or implement directly
- **Review of existing code** → use `superpowers:requesting-code-review`
- **Formalizing decisions taken verbally in a meeting without code analysis** — you may start with this skill, but clearly declare the assumptions to verify

---

## References

- [`references/prd-template.md`](./references/prd-template.md) — Mandatory narrative template
- [`references/folder-conventions.md`](./references/folder-conventions.md) — Naming, frontmatter, lifecycle states
- Sibling skill `quint-fpf` — the formal validation methodology invoked by `arch-decision`
- Sibling skill `arch-decision` — step 2 of the workflow (invoked after this skill's handoff)
- Sibling skill `sprint-manifest` — step 3 (promotion to sprint)
- Project source of truth: `docs/architecture/` (maintained manually by the architect)
