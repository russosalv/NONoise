# Requirement file template

Reference for the mandatory structure of requirement files produced by `requirements-ingest`. Every file under `docs/requirements/<domain>/<feature>.md` must follow this template.

## Template philosophy

A requirement file is the **input contract** to `arch-brainstorm`. It must be:

1. **Unambiguous** — every acceptance criterion has one and only one interpretation.
2. **Traceable** — every criterion ties back to at least one source quote or open point.
3. **Testable** — every criterion is observable and falsifiable.
4. **Scoped** — one cohesive capability per file, with explicit out-of-scope.
5. **Honest** — unresolved disagreements are open points, not silently picked.

If even one of these is missing, the file is not ready to feed `arch-brainstorm`.

---

## Full template

```markdown
---
title: "<Readable feature title>"
domain: <domain-slug>
feature: <feature-slug>
status: draft
source_documents:
  - path: <relative-or-absolute-path>
    kind: call-transcript | brief | email | note | mockup | other
    sections: ["<optional section / page / timestamp references>"]
created_at: YYYY-MM-DD
authors: [<name-or-stakeholder>]
---

# <Readable feature title>

> **Domain**: `<domain-slug>` • **Feature**: `<feature-slug>`
> **Status**: `draft` — ingested from raw input on YYYY-MM-DD
> **Source documents**: see frontmatter `source_documents`

## Who needs it

<Actor, persona, or stakeholder. 1-3 sentences naming them and the context in which they operate. Prefer concrete personas ("the billing operator closing the monthly cycle") over abstract ones ("the user").>

## What they need to do

<Prose description of the capability, in the project's working language. Short paragraphs, not implementation details. 1-3 paragraphs. Describe behavior, not mechanism.>

## Why — the outcome

<The business or user outcome this enables. Tie back to source documents when possible ("per the vendor brief, this reduces churn by ~15%"). If the source does not state an outcome, write "outcome not stated in source — open point".>

## Acceptance criteria

Observable, testable criteria. Each must be falsifiable — a reader must be able to say "this was met" or "this was not met" without interpretation.

Use Given-When-Then when it clarifies scenarios; use numbered bullets when it does not.

1. **Given** <precondition>, **when** <action>, **then** <observable outcome>.
2. **Given** <precondition>, **when** <action>, **then** <observable outcome>.
3. <simpler bullet when Given-When-Then is overkill>

## Business rules

Invariants and constraints that always hold, independent of a specific scenario. These are the rules the domain imposes — things that are always true, regardless of which flow is active.

- <rule 1>
- <rule 2>

## Out-of-scope

Explicit exclusions. A reader should not have to guess what is covered and what is not.

- <excluded item> — <short reason / where it will be handled instead>

## Open points

TBDs, disagreements between source documents, missing information. Every open point must be resolved before `arch-brainstorm` runs (the architect will typically ask the stakeholder).

- [ ] <open point 1> — <source of uncertainty>
- [ ] <open point 2> — <disagreement: source A says X, source B says Y>

## Source quotes

Verbatim quotes from the source documents that ground this requirement. This is the audit trail that lets the team check later whether ingestion preserved the stakeholder's intent.

> "<quote 1>" — source: `sources/2026-04-18-<slug>.md` §3.2
>
> "<quote 2>" — source: `sources/<brief>.pdf` p. 13

## Ingestion history

Append-only log of ingestion events for this file. Added on first creation and on every subsequent merge.

- YYYY-MM-DD — initial ingestion from `<source-path>`
- YYYY-MM-DD — added candidates CR-NNN, CR-NNN from `<source-path>`
```

---

## Section-by-section guidance

### Frontmatter

**All fields mandatory**. Fill `null` only where noted.

- `title` — human-readable, roughly sentence-case. Not a slug.
- `domain` — kebab-case slug. Must match an existing domain under `docs/requirements/` unless the user has explicitly approved a new one.
- `feature` — kebab-case slug. One per file.
- `status` — lifecycle state: `draft` → `reviewed` → (optionally) `superseded`.
- `source_documents` — list of `{path, kind, sections}` triples. At least one entry. If the source is a file that lives outside `docs/`, reference the parked copy instead.
- `created_at` — ISO date of creation.
- `authors` — list of people or stakeholders. Use the requestor's name or role, not the skill's name.

### Who needs it

Prefer concrete personas over abstract ones. "The billing operator closing the monthly cycle" reads better than "the user".

If the source document does not name an actor, write:

> Actor not named in source — inferred as `<best-guess>`. Confirm during `arch-brainstorm`.

and add an open point.

### What they need to do

Describe **behavior**, not **mechanism**. "The operator can approve a batch of pending invoices in one action" is behavior. "The operator clicks the 'Approve Batch' button that triggers POST /invoices/batch-approve" is mechanism and does not belong here.

If the source document drifted into mechanism (UI details, API shapes), distill the behavior and park the mechanism hint in an open point for `arch-brainstorm` to consider.

### Acceptance criteria

The most-scrutinized section. Failure modes to avoid:

| Failure mode | Example | Fix |
|---|---|---|
| Not observable | "The system should be fast" | "95th-percentile response time is below 500ms under nominal load" |
| Not falsifiable | "Users should like the new flow" | "In user testing with N participants, at least N-2 complete the flow without assistance" |
| Mechanism leaked | "The API returns 200 with JSON payload" | "The operator sees the confirmation message within 2 seconds" |
| Compound criterion | "The operator can approve, reject, and batch-export invoices" | Split into 3 separate criteria |

### Business rules

Keep these **invariant across scenarios**. If a rule only applies to one acceptance criterion, fold it into that criterion instead. Business rules are for cross-cutting invariants (e.g. "no invoice can be approved by the same user who created it").

### Out-of-scope

Every non-trivial requirement has something a reader could reasonably assume is covered. State it explicitly. Examples:

- "Multi-currency invoices — out of scope for v1, tracked under domain `billing-i18n` (future)."
- "Bulk import from legacy system — out of scope; use existing migration tool."

If truly nothing is out of scope, write `None identified — revisit during arch-brainstorm`.

### Open points

The health indicator of the file. A mature file has zero open points. A just-ingested file typically has 2-6.

Each open point should name the **source of uncertainty**:

- Source document contradiction (A vs B)
- Missing information in all sources
- Inferred fact awaiting confirmation
- Deferred decision explicitly flagged by stakeholder

### Source quotes

Short, verbatim, traceable. Two purposes:

1. **Audit trail** — someone auditing the ingestion can check that the requirement reflects the source.
2. **Seed for arch-brainstorm** — the architect can go back to raw context when a criterion is ambiguous.

Keep quotes short (1-2 sentences). If longer context is needed, reference the parked source document by section instead of pasting pages of text.

---

## Worked example

See a realistic filled-in example below for feature `invoice-generation` in domain `billing`.

```markdown
---
title: "Invoice generation for monthly billing cycle"
domain: billing
feature: invoice-generation
status: draft
source_documents:
  - path: docs/requirements/billing/sources/2026-04-10-billing-kickoff.md
    kind: call-transcript
    sections: ["§2 Monthly cycle", "§4 Edge cases"]
  - path: docs/requirements/billing/sources/finance-team-brief-q2.pdf
    kind: brief
    sections: ["pp. 4-7"]
created_at: 2026-04-18
authors: ["Finance Team", "Ops Lead"]
---

# Invoice generation for monthly billing cycle

> **Domain**: `billing` • **Feature**: `invoice-generation`
> **Status**: `draft` — ingested from raw input on 2026-04-18
> **Source documents**: see frontmatter `source_documents`

## Who needs it

The billing operator running the monthly close. They process ~800 active contracts on the first business day of each month and must produce one invoice per contract, ready for finance approval within the same day.

## What they need to do

The operator triggers a monthly invoice-generation run. The system produces one draft invoice per eligible contract, grouping line items per contract, applying the contract's tax profile, and marking each invoice as `pending-approval`. The operator reviews and approves invoices in batches afterwards (different feature).

During the run, the operator sees progress and can pause / resume. Contracts in anomalous states (missing tax profile, expired, disputed) are skipped and surface in an error list for manual handling.

## Why — the outcome

The monthly close currently takes ~3 operator-days of manual spreadsheet work. The finance team wants it reduced to under 4 operator-hours, eliminating spreadsheet errors and ensuring invoices are ready for audit within 24h of cycle close.

## Acceptance criteria

1. **Given** a monthly cycle is active, **when** the operator triggers invoice generation, **then** the system produces exactly one draft invoice per eligible contract.
2. **Given** a contract is in anomalous state (no tax profile / expired / disputed), **when** the run processes it, **then** it is skipped and appears in the error list with a reason code.
3. **Given** a run is in progress, **when** the operator clicks pause, **then** no new invoices are started and in-flight ones complete; resume picks up from the next contract.
4. **Given** a run completes, **when** the operator opens the summary, **then** the count of drafts produced, contracts skipped, and total run duration are visible.

## Business rules

- Exactly one invoice per contract per cycle. Re-running the cycle for a contract already invoiced is a no-op.
- Tax profile at contract level takes precedence over customer default.
- Invoices are always created in `pending-approval` status. The skill does not auto-approve.

## Out-of-scope

- Invoice approval workflow — separate feature `invoice-approval` in the same domain.
- Multi-currency invoices — out of scope for v1; all contracts in v1 are EUR-denominated.
- Ad-hoc (non-monthly) invoice generation — deferred to future `ad-hoc-invoicing` feature.

## Open points

- [ ] Source A (call) says "skip disputed contracts entirely"; source B (brief) says "generate draft with a warning flag". Confirm with finance team.
- [ ] Run duration target — brief says "under 30 minutes for 1000 contracts"; call says "overnight is fine". Clarify.
- [ ] Notification on run completion — not mentioned in any source. Likely needed; confirm.

## Source quotes

> "We need one invoice per contract, same logic as the manual spreadsheet, but automated and finished by lunch on day 1." — source: `sources/2026-04-10-billing-kickoff.md` §2
>
> "Contracts in a disputed state should not produce invoices — finance handles those manually until the dispute is resolved." — source: `sources/2026-04-10-billing-kickoff.md` §4
>
> "For contracts without a tax profile, a draft invoice should still be generated with a warning, so finance sees the backlog at-a-glance." — source: `sources/finance-team-brief-q2.pdf` p. 5

## Ingestion history

- 2026-04-18 — initial ingestion from `sources/2026-04-10-billing-kickoff.md` and `sources/finance-team-brief-q2.pdf` (candidates CR-001 through CR-007)
```

---

## File-update rules (incremental ingestion)

When the feature file already exists and new input brings additional candidates:

1. **Frontmatter**: append to `source_documents` — do not overwrite.
2. **Who needs it** / **What they need to do** / **Why**: update if the new source materially changes the understanding. If it only confirms existing text, no change.
3. **Acceptance criteria**: append new criteria. Never silently change an existing criterion — if the new source contradicts an existing one, add both, flag the contradiction in **Open points**, and let the architect resolve it.
4. **Business rules**: append new rules; same contradiction rule as above.
5. **Out-of-scope**: append new exclusions.
6. **Open points**: add new ones; resolve existing ones only if the new source explicitly resolves them.
7. **Source quotes**: append — preserve audit trail.
8. **Ingestion history**: always append a new entry with date, added candidate IDs, and source path.
