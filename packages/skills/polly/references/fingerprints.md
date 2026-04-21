# Polly filesystem fingerprints

This is the **source of truth** for whether a phase is complete. Polly
reconciles `polly-state.json#phases` against this table on every entry; the
filesystem wins.

Paths are relative to the **workspace root** (i.e. the folder where
`nonoise.config.json` lives). In multi-repo workspaces, everything here is
still rooted at workspace level — `repos/<name>/` is the sub-repo content
and is NOT inspected for Polly fingerprints.

## Phase → fingerprint

| Phase key | Skill(s) that produce it | Fingerprint (at least one must exist) |
|---|---|---|
| `scan` | `graphify-setup` | `graphify-out/GRAPH_REPORT.md` |
| `reverse` | `reverse-engineering` | any file matching `docs/support/reverse/*/00-overview.md` OR `docs/support/reverse/*/CHANGELOG.md` |
| `requirements` | `requirements-ingest` | any `docs/requirements/*/*.md` that is NOT the template `README.md` (check size > 1 KB or non-placeholder content) |
| `featureDesign` | `bmad-agent-analyst`, `superpowers:brainstorming` | any `docs/prd/*.md` (flat, not under an area folder) OR any `docs/prfaq/*.md` OR any `docs/superpowers/specs/*.md` |
| `archBrainstorm` | `arch-brainstorm` | any `docs/prd/<area>/NN-*.md` where `NN` is a 2-digit prefix and the file is not `00-area-brief.md` |
| `archDecision` | `arch-decision` | any `docs/prd/<area>/audit/*-fpf.md` OR any `docs/prd/<area>/NN-*.md` with frontmatter `status: validated` |
| `fpfAudit` | `quint-fpf` | `.quint/context.md` OR any `docs/fpf/*.md` |
| `sprint` | `sprint-manifest` | any `docs/sprints/Sprint-*/sprint-manifest.md` |
| `implementation` | dev trio (`superpowers:writing-plans` → `executing-plans`) | any `docs/sprints/Sprint-*/plans/*.md` OR — pragmatic v1 — presence of `docs/sprints/Sprint-*/acceptance/testbook.yml` implies implementation ran |
| `acceptance` | `atr` | any `docs/sprints/Sprint-*/acceptance/testbook.yml` |
| `c4` | `c4-doc-writer` | `docs/architecture/c4/workspace.dsl` OR any `docs/support/reverse/*/c4/workspace.dsl` (reverse-mode output) |
| `workitemExport` | `spec-to-workitem` | any `docs/sprints/Sprint-*/export/spec-to-workitem-*.md` |

## Per-skill handoff fingerprint

When a skill is engaged via `handoff.skill`, the fingerprint Polly checks
on return is the one that maps to that skill's primary output:

| Handoff skill | Primary fingerprint | Related phase key |
|---|---|---|
| `graphify-setup` | `graphify-out/GRAPH_REPORT.md` | `scan` |
| `reverse-engineering` | `docs/support/reverse/*/00-overview.md` | `reverse` |
| `requirements-ingest` | any `docs/requirements/*/*.md` non-placeholder | `requirements` |
| `bmad-agent-analyst` | any `docs/prd/*.md` or `docs/prfaq/*.md` | `featureDesign` |
| `bmad-advanced-elicitation` | (no standalone fingerprint — folds into caller's output) | (inherit from caller) |
| `superpowers:brainstorming` | `docs/superpowers/specs/*.md` | `featureDesign` |
| `arch-brainstorm` | `docs/prd/<area>/NN-*.md` with status draft | `archBrainstorm` |
| `arch-decision` | `docs/prd/<area>/audit/*-fpf.md` or status validated | `archDecision` |
| `quint-fpf` | `.quint/context.md` or `docs/fpf/*.md` | `fpfAudit` |
| `sprint-manifest` | `docs/sprints/Sprint-*/sprint-manifest.md` | `sprint` |
| `atr` | `docs/sprints/Sprint-*/acceptance/testbook.yml` | `acceptance` |
| `c4-doc-writer` | `docs/architecture/c4/workspace.dsl` OR any `docs/support/reverse/*/c4/workspace.dsl` | `c4` |
| `spec-to-workitem` | `docs/sprints/Sprint-*/export/spec-to-workitem-*.md` | `workitemExport` |

## Glob semantics

The glob patterns above use `*` as a single-segment wildcard (not
recursive). E.g. `docs/prd/<area>/NN-*.md` matches `docs/prd/billing/03-subscriptions.md`
but NOT `docs/prd/billing/drafts/archived/03.md`.

If the AI running Polly doesn't have a glob tool handy, walk the directory
manually (read `docs/prd/<area>/`, filter for files matching `NN-*.md`).

## Non-placeholder detection

The template scaffold ships a `README.md` in each `docs/*` subfolder with
orientation text. These are NOT fingerprints — they exist even in a fresh
project. To distinguish a real artifact:

- For `docs/requirements/*/*.md`: ignore files whose content contains the
  phrase `"(fill this in once the project has requirements)"` or similar
  template boilerplate, or whose size is below 512 bytes.
- Same heuristic for any `README.md` — treat as placeholder by default.
- For YAML files (`testbook.yml`), treat any parseable YAML with at least
  one section/test entry as real.

When in doubt: ask the user "is this file a real artifact or just the
template placeholder?" rather than silently marking a phase done.

## Not fingerprints (v1)

These exist but are NOT tracked by Polly's state cache — they're either
too ephemeral or orthogonal to the SDLC loop:

- `docs/calls/*.md` — meeting notes, cross-cutting context, not phase-tied
- `docs/support/vendor/*` — vendor docs, regulatory
- `tools/*` — scaffold utilities
- `graphify-out/wiki/*` — generated views, second-order

## How Polly uses this

Pseudocode for the reconcile loop:

```
for phase in phases:
  if any(exists(p) for p in fingerprint(phase) where not is_placeholder(p)):
    if not phases[phase].done:
      phases[phase].done = true
      phases[phase].via = infer_skill(phase)  # from the table above
      phases[phase].at = max_mtime(fingerprint(phase))
      emit_event("phase-complete", phase, via=phases[phase].via)
```

"Infer skill" when multiple skills can produce the same fingerprint:

- `requirements` → if there's a `handoff` event for `requirements-ingest`
  in `events`, use that; else default to `requirements-ingest`.
- `featureDesign` → check file location: `docs/prd/*.md` flat →
  `bmad-agent-analyst`; `docs/superpowers/specs/*.md` →
  `superpowers:brainstorming`.
- Otherwise use the first skill in the per-skill table.

## Decision signals (not phase-tied)

These are filesystem signals Polly reads to adjust *routing decisions*,
but they are NOT phase fingerprints — they do not update `phases[*]` and
do not count toward completion. Use them to pick the right next skill
and the right args to pass.

| Signal | Check | Used by |
|---|---|---|
| `graphify_installed_no_graph_RE_intent` | `command -v graphify` succeeds AND `<proposed_source_path>/graphify-out/graph.json` does NOT exist AND user intent is RE | `decision-tree.md` § "Reverse-engineering intent gate" → invoke `graphify-setup` with `args="mode=reverse-engineering source_path=<path>"` |
| `stale_source_graph` | `<source_path>/graphify-out/graph.json` exists AND (`manifest.json` `indexed_at` OR file mtime) is older than `nonoise.config.json → reverse.graph_freshness_days` (default 30 days) | `reverse-engineering` Q4 freshness check (internal; Polly doesn't branch on this — the skill handles it) |

Rules:

- Decision signals are **cheap checks**, not phases. Run them at decision
  time, don't cache them in `polly-state.json`.
- If a decision signal conflicts with a phase fingerprint (e.g. `scan`
  phase is marked done but `graphify_installed_no_graph_RE_intent` is
  true for a different source path), trust the decision signal — the
  phase fingerprint may refer to a prior subject.
