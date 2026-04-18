# `docs/sprints/` — promoted work (sprint-manifest output)

This folder holds **sprints**: PRDs that have been validated and promoted to active development, plus **one aggregated sprint manifest per sprint** that drives implementation.

## Structure

One folder per sprint. At its root lives a single `sprint-manifest.md` that aggregates all the areas touched in that sprint. PRDs and their audits sit in subfolders by area:

```
sprints/
└── Sprint-XX/
    ├── sprint-manifest.md              ← ONE aggregated manifest per sprint
    ├── <area-slug>/
    │   ├── NN-<study-slug>.md          ← PRDs moved from docs/prd/<area>/
    │   ├── NN-<study-slug>-diagrams.md
    │   └── audit/
    │       └── NN-<study-slug>-fpf.md  ← FPF audits carried over from docs/prd/<area>/audit/
    ├── acceptance/                     ← ATR workspace (output of the `atr` skill)
    │   ├── testbook.yml                ← generated test definitions
    │   ├── testbook-plan.md            ← stakeholder-friendly plan (optional)
    │   ├── report-<area>.md            ← PASS/FAIL report, one per area
    │   ├── backlog.md                  ← failure list for tracker push
    │   └── screenshots/*.png           ← visual evidence, committed to git
    └── export/                         ← spec-to-workitem audit trail
        └── spec-to-workitem-<adapter>-<YYYY-MM-DD>.md
```

Rationale for "one manifest per sprint" instead of "one per PRD": sprint planning needs a single view of all user stories, task dependencies across areas, and CL1 risk flags. A single file beats N scattered ones when the architect is driving a sprint kickoff or reporting to stakeholders.

## How PRDs get here

`sprint-manifest` scans `docs/prd/<area>/` for `validated` PRDs and **moves** them into the target sprint folder, then generates (or updates) the single `sprint-manifest.md`. After promotion:

- The PRD frontmatter becomes `status: promoted, sprint: XX`
- The file no longer lives in `docs/prd/<area>/` — it lives here
- `docs/prd/<area>/00-area-brief.md` is updated with a "promoted to Sprint XX" note

## Sprint manifest content (`sprint-manifest.md`)

One file per sprint, aggregating **all areas**. Structure:

1. **Sprint goal** — 1–2 sentences derived from the goals of the promoted PRDs
2. **PRDs included** — table with area / study / path / goal / aggregate confidence
3. **User stories** — 1–3 user stories per PRD, in the form "As <role>, I want <outcome> so that <value>"
4. **Task macro breakdown** — 10–20 vertical slices (NOT layer-tech tasks — see below) with:
   - Functional name (e.g. "Enable operator to download the PDF", NOT "Create class X")
   - Description of visible behavior when done
   - End-to-end acceptance test
   - Confidence CL1 / CL2 / CL3
   - Effort in days
   - Cross-task dependencies
5. **Dependency graph** — Mermaid `graph LR` showing cross-task, cross-area dependencies
6. **CL1 tasks → decision record needed** — each CL1 task requires an atomic decision record (a mini ADR) or a new `arch-brainstorm` study before implementation
7. **Risks and mitigations** — known risks with severity and mitigation plan
8. **Out of scope for this sprint** — explicit exclusions with rationale
9. **Next steps** — human review, work-item export, etc.
10. **Changelog** — every update of the manifest adds an entry

## Vertical slices — golden rule

Task breakdown must be **vertical slices of functionality**, not horizontal layers. A developer must be able to take a task, implement it end-to-end, demo it, and deliver it as a unit of value.

- ❌ "Create migration for table X" — layer, not value
- ✅ "Enable operator to submit X and see the result persisted" — slice, demoable

Tasks that sound like "create class Y" or "add field Z to table W" are **wrong** and must be absorbed into a larger functional task.

## Dev workflow

```bash
# Promote all validated PRDs of an area to Sprint 5
sprint-manifest area user-signup sprint 5

# Add another validated PRD to an already-open sprint (impact analysis)
sprint-manifest area payments sprint 5 update

# Regenerate the manifest after manual edits (use with care — overwrites)
sprint-manifest area user-signup sprint 5 regenerate
```

## How other skills use this folder

- `atr` (acceptance test runner) reads the sprint manifest to generate testbooks under `acceptance/`, then runs them via `playwright-cli` producing reports + screenshots in the same folder
- Future `spec-to-workitem` / `devops-push` skills translate tasks into external issue-tracker items (GitHub Issues, Azure DevOps, Jira, Linear, …)

## Lifecycle of a promoted PRD

```
validated → promoted → (stays in sprint folder forever as historical record)
```

A promoted PRD is **immutable**. If a change is needed, create a new study (`02-<study-slug>`) under the same area in `docs/prd/` and run the flow again — do not edit in place.
