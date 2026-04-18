# `docs/` — project knowledge base

This folder is the **structured knowledge base** for the project. Every subfolder has a specific purpose. NONoise skills read from these folders in well-known ways.

## Structure

```
docs/
├── architecture/     ← source of truth for architecture, stack, constraints
├── requirements/     ← business/functional requirements
├── calls/            ← meeting notes, call transcripts
├── support/          ← research, legacy analysis, supporting documents
├── prd/              ← PRD drafts (output of arch-brainstorm, input of arch-decision)
└── sprints/          ← promoted work (output of sprint-manifest)
```

Each subfolder has its own `README.md` that documents contents and conventions.

## How NONoise skills interact with `docs/`

| Skill | Reads | Writes |
|---|---|---|
| `arch-brainstorm` | `architecture/`, `requirements/`, `calls/`, `support/`, existing `prd/<area>/` | `prd/<area>/NN-<study>.md`, `prd/<area>/00-area-brief.md`, `prd/<area>/NN-<study>-diagrams.md` |
| `arch-decision` (via `quint-fpf`) | `prd/<area>/NN-<study>.md`, `architecture/` | `prd/<area>/audit/NN-<study>-fpf.md`, updates PRD frontmatter |
| `sprint-manifest` | `prd/<area>/` (validated PRDs) | `sprints/Sprint-XX/<area>/prd|manifest/` |
| `atr` | `requirements/`, `sprints/` | acceptance test reports |
| `arch-brainstorm`/`arch-decision` | `calls/` (context for dialog) | — |

## Filling it in

This is a template. When you bootstrap a new area of work:

1. Populate `architecture/` with your stack, patterns, and absolute constraints (see `architecture/README.md`)
2. Drop functional requirements into `requirements/` as they arrive
3. Keep meeting notes in `calls/` — they feed the brainstorming context
4. Put supporting research, legacy analysis, or external references in `support/`
5. Open PRDs under `prd/<area>/` via `arch-brainstorm`
6. Promote validated PRDs to `sprints/` via `sprint-manifest`

Nothing in this tree is load-bearing for the framework itself — the tree only becomes useful when you start populating it. Empty folders are fine at day 0.
