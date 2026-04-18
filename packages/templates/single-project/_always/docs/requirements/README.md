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

Organize by domain, feature, or epic — whichever matches how your team reasons about the product:

```
requirements/
├── <domain-or-epic>/
│   ├── <feature>.md
│   └── <feature>.md
└── <another-domain>/
    └── <feature>.md
```

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
