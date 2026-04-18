# `docs/architecture/` — source of truth

This folder is the **single source of truth** for the project's target architecture: stack choices, absolute constraints, reusable patterns, and component registry. NONoise skills (`arch-brainstorm`, `arch-decision`) read from here to understand what is allowed, what is mandatory, and what already exists.

## Convention

Files are numbered two-digit prefix to impose reading order:

```
architecture/
├── 00-index.md             ← entry point — one-paragraph system description + pointers
├── 01-constraints.md       ← absolute constraints ("never do X", "always do Y")
├── 02-stack.md             ← chosen stack: runtime, frameworks, infrastructure
├── 03-patterns.md          ← mandatory / recommended patterns (CQRS, hexagonal, layered, ...)
├── 04-components.md        ← component registry (services, modules, libraries) with status
├── 05-conventions.md       ← naming, folder structure, file layout
└── NN-<topic>.md           ← further guideline docs as the project grows
```

Not every file needs to exist from day 0. Start with `00-index.md` + `01-constraints.md` and grow organically.

## Component lifecycle (for `04-components.md`)

Each component in the registry has a state:

| State | Meaning |
|---|---|
| `approved` | Built and in production |
| `draft` | Planned, PRD validated but not built |
| `deprecated` | Being phased out |

## Relationship with PRDs

- `arch-brainstorm` reads this folder during its DISCOVER phase to ground the dialog in real constraints
- `arch-decision` reads this folder during Phase 2 (VERIFY) to check that PRD hypotheses do not violate absolute constraints
- After a PRD reaches `validated` state, **you update this folder manually** to reflect the new decision (stack change, new pattern, new component). NONoise does not auto-sync — the architect is the one who commits the decision into the source of truth.
- Alternative: install a project-specific sync skill (e.g. a fork of `andreani-arch-docs` for heavily-opinionated stacks) via `skill-finder`.

## Style

- English or the project's working language — be consistent
- Mandatory constraints in `01-constraints.md` as bullet imperatives: "Never X", "Always Y"
- Examples welcome, but reference the codebase (`file:line`) rather than duplicating code
- Keep each file focused — split when one file exceeds ~400 lines
