# `docs/sprints/` — promoted work (sprint-manifest output)

This folder holds **sprints**: PRDs that have been validated and promoted to active development, plus the sprint manifests that orchestrate implementation.

## Structure

One folder per sprint, containing one subfolder per area touched in that sprint:

```
sprints/
└── Sprint-XX/
    └── <area-slug>/
        ├── prd/
        │   ├── 01-<study-slug>.md     ← PRDs moved from docs/prd/<area>/
        │   └── 02-<study-slug>.md
        └── manifest/
            ├── 01-<study-slug>.md     ← sprint manifest (work breakdown, acceptance)
            └── 02-<study-slug>.md
```

The exact layout is produced by the `sprint-manifest` skill and mirrors the area/study structure from `docs/prd/`.

## How PRDs get here

`sprint-manifest` scans `docs/prd/<area>/` for all `validated` PRDs and **moves** them into the sprint folder, then generates one sprint manifest per PRD. After promotion:

- The PRD frontmatter becomes `status: promoted, sprint: XX`
- The file no longer lives in `docs/prd/<area>/` — it lives here
- `docs/prd/<area>/00-area-brief.md` is updated with a note "promoted to Sprint XX"

## Sprint manifest content

Each manifest is a work plan that transforms the PRD into actionable tasks:

- Work breakdown (tasks, components, owners)
- Dependencies between tasks
- Acceptance criteria derived from the PRD
- Risk flags (from the Quint FPF audit)
- Testing strategy (unit / integration / acceptance)

## How other skills use this folder

- `atr` (acceptance test runner) reads sprint manifests to generate testbooks
- Future work-tracking skills may sync manifest items to external systems (e.g. GitHub issues, Jira)
