# `docs/prd/` — PRD drafts (arch-brainstorm output)

This folder holds **narrative PRDs** produced by the `arch-brainstorm` skill and validated by the `arch-decision` skill. It is the workspace where architectural decisions are explored, debated, validated, and either promoted to sprints or superseded.

## Structure

One folder per architectural **area**, containing one or more **studies** plus audit folders:

```
prd/
├── <area-slug>/
│   ├── 00-area-brief.md                    ← area index
│   ├── 01-<study-slug>.md                  ← PRD narrative
│   ├── 01-<study-slug>-diagrams.md         ← standalone Mermaid diagrams
│   ├── 02-<study-slug>.md                  ← second study
│   └── audit/
│       ├── 01-<study-slug>-fpf/            ← Quint FPF audit folder (from arch-decision)
│       │   ├── 00-context.md               ← Phase 0 — Bounded Context
│       │   ├── 01-hypotheses.md            ← Phase 1 — L0 hypotheses (abduction)
│       │   ├── 02-verification.md          ← Phase 2 — L0 → L1 verdicts
│       │   ├── 03-validation.md            ← Phase 3 — L1 → L2 with evidence
│       │   ├── 04-audit.md                 ← Phase 4 — R_eff via WLNK
│       │   └── 05-decision.md              ← Phase 5 — final DRR (verdict + rationale)
│       └── 02-<study-slug>-fpf/
│           └── …(same six files)
```

One folder per validated study, deletable in a single `rm -rf` if you need to redo the pre-validation from scratch. The final verdict lives in `05-decision.md`'s frontmatter (`verdict: PASS | FAIL | NEEDS-REVISION`).

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
