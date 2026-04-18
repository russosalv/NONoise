# `docs/prd/` — PRD drafts (arch-brainstorm output)

This folder holds **narrative PRDs** produced by the `arch-brainstorm` skill and validated by the `arch-decision` skill. It is the workspace where architectural decisions are explored, debated, validated, and either promoted to sprints or superseded.

## Structure

One folder per architectural **area**, containing one or more **studies** plus audit reports:

```
prd/
├── <area-slug>/
│   ├── 00-area-brief.md              ← area index
│   ├── 01-<study-slug>.md            ← PRD narrative
│   ├── 01-<study-slug>-diagrams.md   ← standalone Mermaid diagrams
│   ├── 02-<study-slug>.md            ← second study
│   └── audit/
│       ├── 01-<study-slug>-fpf.md    ← Quint FPF audit report (from arch-decision)
│       └── 02-<study-slug>-fpf.md
```

See [`arch-brainstorm`'s folder-conventions reference](../../.claude/skills/arch-brainstorm/references/folder-conventions.md) for full details (naming, frontmatter, lifecycle states).

## Lifecycle

Each PRD goes through these states in its frontmatter:

```
draft → in-validation → validated → { promoted | superseded | rejected }
```

- `arch-brainstorm` creates `draft` PRDs
- `arch-decision` transitions them to `in-validation` → `validated` (or `rejected`)
- `sprint-manifest` transitions `validated` PRDs to `promoted` when moving them into a sprint
- The architect manually marks `superseded` if a later study replaces an earlier one

## Typical workflow

```bash
# 1. Start a new study
arch-brainstorm area user-signup

# 2. Validate it via Quint FPF
arch-decision docs/prd/user-signup/01-email-otp.md

# 3. When ready for sprint, promote
sprint-manifest area user-signup sprint 5
```
