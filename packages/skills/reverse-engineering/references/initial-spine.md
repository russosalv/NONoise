# Initial chapter spine — reverse dossier v1.0

Use this spine for **first-version** runs (Step 5.4 of the `reverse-engineering` skill) when no dossier exists yet for the subject.

The spine is a **suggestion**, not a mandate. Adapt to the subject. What matters is the principle: a v1.0 dossier should cover *why* the subject matters, *how* it is reached, *what* it contains, *what it does*, and *what is unknown*. The numbering pattern (`00-`, `01-`, ..., `99-`) is the NONoise convention — keep it.

## Default spine

```
docs/support/reverse/<slug>/
├── 00-overview.md         ← subject summary, scope, versioning, how to read
├── 01-context.md          ← why this subject, what problem it solves, stakeholders
├── 02-entry-points.md     ← how the subject is invoked / accessed (APIs, UI, CLI, jobs)
├── 03-data-model.md       ← key entities, relationships, invariants, persistence
├── 04-main-flows.md       ← critical user/system flows, state transitions, side effects
├── 99-open-points.md      ← assumptions, gaps, things to validate with the business
├── CHANGELOG.md
└── .meta/
    └── graphify-index.json
```

## Chapter guide

### `00-overview.md`

Minimum content:

- Subject name (human-readable) and slug
- One-paragraph description
- Scope (what this dossier covers) and non-scope (what it doesn't)
- **Version**: `1.0`
- **Date**: today
- How to read the dossier (order of chapters, where to go for what)
- If a table of contents is included, list all sibling chapters with 1-line descriptions

Write this chapter **last** (or regenerate it last on each save) — it references the others, so it's easier when they exist.

### `01-context.md`

- Why does this subject exist / why are we reverse-engineering it?
- Business purpose, users, volumes
- Relationship to the rest of the system (what depends on it, what it depends on)
- History / provenance if known (who built it, when, why)

### `02-entry-points.md`

- API endpoints, CLI commands, UI flows, scheduled jobs, events it subscribes to
- Authentication / authorization model
- Rate limits, quotas, SLAs if known
- Example invocations (curl, CLI, code snippet)

### `03-data-model.md`

- Key entities and their fields
- Relationships (1-1, 1-N, N-N) with mermaid ER diagram if helpful
- Invariants / validation rules
- Storage (DBs, queues, caches, files)
- Lifecycle (creation, mutation, deletion, archival)

### `04-main-flows.md`

- The 3–7 most important flows of the subject (the ones that must work)
- Each flow: trigger, preconditions, steps, side effects, postconditions, failure modes
- Sequence diagrams (mermaid) where helpful
- Cross-reference to entry points (02) and entities (03)

### `99-open-points.md`

- Assumptions that still need business validation — prefix each with an ID (e.g. `OP-01`, `OP-02`)
- Gaps in the dossier (what we don't know yet)
- Suspected inconsistencies between code and documents
- Suggested next investigations

## Extensions

Depending on the subject, add these after the core spine — always append, never renumber:

- `05-integrations.md` — external systems the subject talks to
- `06-error-handling.md` — failure taxonomy, retries, compensations
- `07-performance.md` — hotspots, caching, scaling notes
- `08-security.md` — authn/authz, secrets, threat surface
- `09-observability.md` — logs, metrics, traces, alerts
- `10-operations.md` — deployment, rollback, runbook entries
- `11-legacy-quirks.md` — historical oddities, workarounds in place
- `12-migration-notes.md` — if the subject is being replaced, deltas to the target

## Anti-patterns to avoid

- **Over-ambitious v1.0**. A skinny v1.0 that is correct beats a sprawling v1.0 that is mostly speculation. Move uncertain content into `99-open-points.md`.
- **Code dumps**. The dossier explains; it doesn't reproduce the source. Link / reference sections of the graph instead of copy-pasting.
- **Mirroring the source tree**. Chapters are organized by *function* (flows, data model, entry points), not by folder (controllers, services, repositories). A reader of the dossier shouldn't need to know the source tree to understand it.
- **Future tense**. v1.0 documents what exists today. Future plans go in a separate PRD (`arch-brainstorm`), not in the reverse.

## After v1.0

Every subsequent save (v1.1, v1.2, ...) is a minor bump that touches only the chapters implied by the user's intent. The spine rarely grows after v1.0 — most updates refine existing chapters.
