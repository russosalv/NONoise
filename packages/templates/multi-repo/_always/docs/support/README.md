# `docs/support/` — supporting documents

This folder is the **catch-all for cross-domain contextual material** that does not fit the other top-level folders but is still valuable context for the team and for NONoise skills.

**Per-domain material** (emails / notes / briefs that fed a specific requirement) lives inside the domain it supports: `docs/requirements/<domain>/sources/<filename>`. Use this top-level folder only for material that is genuinely **shared across domains** (vendor specs used by 2+ domains, regulatory standards like GDPR / PCI-DSS, legacy analyses informing multiple teams).

## What goes here

- External research (vendor docs, articles, RFC links with excerpts)
- Legacy system analysis (reverse-engineering notes on older codebases)
- Historical decisions that predate the current workflow
- Market / competitor analysis
- Regulatory documents (raw, before being distilled into requirements)
- Third-party API reference material specific to this project
- Diagrams or artifacts not tied to a specific PRD

## What does NOT go here

- Current architecture → `docs/architecture/`
- Current requirements → `docs/requirements/`
- Meeting notes → `docs/calls/`
- PRD drafts → `docs/prd/`

## Suggested layout

Free-form. Organize by topic:

```
support/
├── legacy/
│   └── <notes-on-existing-system>.md
├── research/
│   └── <external-reference>.md
├── vendor/
│   └── <third-party>.md
└── regulatory/
    └── <standard-or-law>.md
```

## How NONoise skills use this folder

- `arch-brainstorm` reads `support/` during DISCOVER when the area-slug maps to an existing support document — e.g. a legacy analysis relevant to the area under study
- Other skills may cite support material as evidence (CL1 — external research) during `arch-decision` / `quint-fpf` VALIDATE phase
