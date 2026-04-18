# `docs/requirements/` — functional and business requirements

This folder holds the **requirements** that drive the project: user-facing features, business rules, acceptance criteria, compliance obligations.

## What goes here

- Functional requirements from stakeholders (what the product must do)
- Business rules (what the domain says must be true)
- Acceptance criteria (how we know a feature is done)
- Compliance and regulatory obligations
- Out-of-scope declarations (what the product explicitly will NOT do)

## What does NOT go here

- Architectural decisions → `docs/architecture/`
- PRDs / design studies → `docs/prd/`
- Meeting notes / call transcripts → `docs/calls/`
- External research / legacy analysis → `docs/support/`

## Suggested layout

Organize by domain / epic. **All raw source material that fed a domain's requirements lives inside that domain's `sources/` subfolder** — there is no scattering across `calls/`, `support/notes/`, etc. for per-domain material. Cross-domain material (multi-domain meetings, shared vendor specs, regulatory standards) uses the top-level `docs/calls/` and `docs/support/` buckets.

```
requirements/
├── <domain-or-epic>/
│   ├── <feature>.md            ← structured requirement (output)
│   ├── README.md               ← domain index
│   └── sources/                ← ALL raw inputs that fed this domain
│       ├── 2026-04-10-kickoff-call.md
│       ├── vendor-brief.pdf
│       ├── email-thread.md
│       └── mockup-flow-01.png
└── <another-domain>/
    ├── <feature>.md
    └── sources/
        └── ...
```

Sub-organization inside `sources/` is **optional and user-driven** — free-form. If a domain accumulates many items, organize as you prefer (`sources/calls/`, `sources/emails/`, etc.); the skill does not impose the sub-structure.

Each requirement file should include:

- **Who needs it** (persona / stakeholder)
- **What** they need to do
- **Why** (the outcome they care about)
- **Acceptance criteria** (observable, testable)
- **Out-of-scope** (explicit exclusions)

## How NONoise skills use this folder

- `arch-brainstorm` reads relevant requirement files during DISCOVER to seed the dialog
- `atr` (acceptance test runner) reads acceptance criteria to generate testbooks
- `arch-decision` may reference specific requirements when validating that a PRD addresses them
