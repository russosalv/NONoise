# `docs/calls/` — meeting notes and call transcripts

This folder holds **cross-domain meeting material**: notes, transcripts, recordings-to-text from business calls, technical calls, stakeholder interviews that span **multiple requirement domains** (company-wide kick-offs, quarterly planning, multi-team reviews).

**Domain-specific calls** live inside the domain they feed: `docs/requirements/<domain>/sources/<YYYY-MM-DD>-<slug>.md`. Use this top-level folder only when the same meeting informs 2+ domains.

## Why this folder exists

When `arch-brainstorm` runs its DISCOVER phase, it can read recent call notes to understand the context of the architect's request — what was discussed with stakeholders, what concerns were raised, what trade-offs were implicit. This dramatically shortens the Q&A phase.

Calls are the **source material**; requirements (`docs/requirements/`) and PRDs (`docs/prd/`) are the refined output.

## Suggested naming

```
calls/
├── YYYY-MM-DD-<type>-<topic>.md
│   e.g. 2026-04-18-business-user-signup.md
│        2026-04-20-architect-review-payments.md
```

The ISO date prefix makes chronological sorting trivial. `<type>` can be `business`, `architect`, `stakeholder`, `br` (business requirements), `review`, etc.

## Suggested content

Each file should include:

- **Date, participants, type of call**
- **Agenda** (what was planned)
- **Decisions taken** (with caveats / pending validations)
- **Open questions** (what was not resolved)
- **Action items** (who owns what)

Raw transcript is optional — if you have it, put it in a fenced block at the bottom or link to the source.

## Retention

These are historical records. Do not edit old calls; if a decision is later revised, write a new call note or a PRD that supersedes — do not rewrite history.
