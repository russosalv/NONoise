---
name: arch-sync
description: Generic projector of a validated PRD's "Impact on docs/architecture/" checklist into the actual files. Reads the validated PRD plus its `arch-decision` audit folder (specifically `05-decision.md`), parses the strict `[file: NN.md]` format from the appended `## Impact on docs/architecture/` section, proposes a unified diff per target file, applies only the diffs the architect approves, and writes a sync report under `docs/architecture/sync-reports/`. Stack-neutral — knows no target constraints, never validates anything, never reads source code. Triggers — invoked by Polly after `arch-decision` PASS (the architect chooses "Sì — invoco arch-sync" at the post-finalize menu); also invokable manually with phrases like "arch-sync <prd-path>", "project the validated PRD into docs/architecture/", "sync architecture from <prd-path>", "recepisci il PRD validato <path>".
source: NONoise (generic distillation of the project-locked Andreani `andreani-arch-docs` mode M)
variant: nonoise generic; stack-neutral; markdown-only
---

# arch-sync — project a validated PRD into `docs/architecture/`

A *writer assistant* that turns the `## Impact on docs/architecture/` checklist
(produced by `arch-decision` Phase 6 inside `05-decision.md`) into actual file
writes, with diff preview and per-file confirmation. Stack-neutral by design:
it does not know what constitutes a valid constraint, pattern, or component
for your project. That knowledge belongs in the human's head and, optionally,
in a project-locked skill the architect builds with `skill-finder` /
`ops-skill-builder`.

## Position in the workflow

```
arch-brainstorm  →  arch-decision  →  [arch-sync]  →  sprint-manifest
                                       ↑
                                       optional, opt-in,
                                       offered by Polly
```

`arch-sync` is **never** invoked automatically by `arch-decision`. The
architect chooses to run it (via Polly's post-finalize menu, or manually).
This preserves the "the source of truth is governed by the human" design
principle of `arch-decision`.

## Inputs

The skill expects two paths:

- `prdPath` — absolute or repo-relative path to a PRD with frontmatter
  `status: validated`
- `auditFolder` — absolute or repo-relative path to the per-cycle audit
  folder produced by `arch-decision` (e.g. `docs/prd/<area>/audit/NN-<study>-fpf/`).
  Must contain `05-decision.md` (the DRR) with frontmatter
  `verdict: PASS` AND a `human_verdict` field in `{ approve, force-validated }`.

When invoked by Polly, both paths are passed in the handoff. When invoked
manually, the skill first asks the architect for them — defaulting to the
most recent files matching `docs/prd/*/NN-*.md` with `status: validated`.

If either precondition fails (PRD not validated, `human_verdict: reject`,
or `human_verdict: go-back`), **stop** and instruct the architect to use the
correct flow (`arch-decision` first; rejected or in-progress decisions are
not synced).

## Five-step flow

### Step 1 — READ

1. Open the PRD at `prdPath`. Verify frontmatter `status: validated`.
2. Open `<auditFolder>/05-decision.md`. Verify frontmatter `verdict: PASS`
   and `human_verdict ∈ { approve, force-validated }`.
3. Find the section `## Impact on docs/architecture/` inside `05-decision.md`
   (Phase 6 of `arch-decision` appends it there).
4. Parse the strict-format bullets:

   ```
   - [file: <basename>] <Verb>: <payload>
   ```

   where `<Verb>` ∈ `{ Add, Append, Mark, Remove, Update }`.

5. Bullets that don't match the format (missing `[file:]` tag, unknown
   verb, missing colon after verb) are collected into a `skipped` list and
   shown to the architect in Step 3 for manual handling.

### Step 2 — PLAN

Group parsed entries by target file. For each file, classify the operation:

| Case | Operation |
|------|-----------|
| File exists, verb is `Add` or `Append` | **Append** at the end of the file (or under the matching section heading if one already exists — e.g. `Append: pattern …` goes under a `## Patterns` heading) |
| File doesn't exist | **Create** with a minimal stub (frontmatter `kind: architecture`, H1 title from the basename, an empty body) and write the new entries |
| File exists, verb is `Mark`, `Remove`, or `Update` | **Patch**: locate the relevant block deterministically — case-insensitive substring match against H2/H3 heading text first, then against the first column of any markdown table; scan top-to-bottom; if more than one match, list ALL matches with their line numbers and ask the architect to pick by index. Never pick implicitly. |

### Step 3 — DIFF PREVIEW

For every target file the plan touches, render a unified diff
(`--- old / +++ new`). Number each diff block.

Also list:

- The `skipped` bullets from Step 1, with a one-line reason each
  (`"missing [file:] tag"`, `"unknown verb 'Foo'"`, etc.) so the
  architect can apply them by hand.

### Step 4 — APPLY (interactive)

Prompt the architect (the bracketed numbers below are an *example* — show whichever diff numbers Step 3 produced):

```
Apply which diffs? (e.g. "1,2,4", "all", "none", "skip 3"):
```

Honor the architect's choice. Apply only the approved diffs. Rejected
diffs are kept in the sync report (Step 5) so they're recoverable.

### Step 5 — SYNC REPORT

Write `docs/architecture/sync-reports/YYYY-MM-DD-<area>-<study>.md` with
this frontmatter:

```yaml
---
title: "Sync report — <area>/<study>"
kind: sync-report
prd_source: <prdPath>
audit_folder: <auditFolder>
synced_at: YYYY-MM-DD
triggered_by: polly | manual
r_eff: <X>
verdict: PASS
human_verdict: approve | force-validated
---
```

Body sections:

- **Source PRD** — path, area, study, validated_at, R_eff, human_verdict
- **Diffs applied** — per file, the unified diff that was written
- **Diffs rejected** — per file, the diff and the architect's reason if supplied
- **Skipped bullets** — bullets from Step 1 that didn't match the strict
  format, with their parse-failure reason
- **Files touched** — flat list, suitable for `git add`

Then print to the architect:

```
✅ Sync done.
- Files touched: <N>
- Diffs applied: <N>
- Diffs rejected: <N>
- Skipped bullets (manual handling): <N>
- Report: <path>
```

## Out of scope (explicit)

- Reading source code
- Validating against absolute target constraints (NONoise has none —
  that role belongs to project-locked skills like `andreani-arch-docs`)
- Regenerating component registries or technical-debt analyses
- Calling other skills
- Writing anywhere outside `docs/architecture/`
- Auto-applying diffs without architect approval (every diff is per-file
  opt-in)
- Re-validating the PRD or the audit (those are `arch-decision`'s job)

## Failure modes & guardrails

| Condition | Action |
|-----------|--------|
| `prdPath` frontmatter `status` is not `validated` | Stop. Instruct the architect to run `arch-decision` first. |
| `<auditFolder>/05-decision.md` missing | Stop. Instruct the architect to re-run `arch-decision` Phase 5+. |
| `05-decision.md` frontmatter `verdict` is not `PASS` | Stop. The decision was rejected or is incomplete; nothing to sync. |
| `05-decision.md` `human_verdict` is `reject` or `go-back` | Stop. The architect did not approve this decision. |
| `05-decision.md` missing the `## Impact on docs/architecture/` section | Stop. Instruct the architect to re-run `arch-decision` Phase 6 (or to manually append the section). |
| Target file is git-dirty (uncommitted local changes) | Warn before showing the diff. The architect can still proceed. |
| A target file already contains the same text being added (idempotency) | Skip silently — note in the sync report under "no-op (already present)". **Comparison rule**: trim trailing whitespace per line, collapse runs of blank lines to one, normalize markdown list markers (`*` → `-`); case-sensitive otherwise. Anything else counts as a real diff. |
| Step 4 architect input doesn't parse | Re-prompt. Never interpret silence as "all" — always require explicit input. |

## Anti-patterns

- **Validating decisions** — `arch-sync` is a writer, not a reviewer.
  If the architect's checklist contains a controversial change,
  `arch-sync` writes it as instructed. The review happened at
  `arch-decision` Phase 5.5.
- **Inferring the target file from the bullet content** — the `[file: …]`
  tag is the only source of truth. If a bullet says "this is a
  constraint" but the tag points to `04-components.md`, the file is
  `04-components.md`. Don't second-guess.
- **Silent failures** — if a file can't be written (permission denied,
  read-only filesystem), surface the error and stop the sync. Do not
  pretend partial success.
- **Editing `05-decision.md`** — the audit is immutable history.
  `arch-sync` reads from it; never writes to it.

## Relationship with project-locked sync skills

Some projects ship their own architecture sync skill that knows the
target constraints, the component registry, and the technical-debt
taxonomy (the canonical example is `andreani-arch-docs`, mode M, in the
Andreani / RISKO project). `arch-sync` does NOT replace those — it's the
generic spine. A project-locked sync skill can:

- Run after `arch-sync` to enrich the writes (registry update, debt
  register entries, conformance checks)
- Or replace `arch-sync` entirely by claiming the same Polly trigger
  point — the architect simply chooses the project-specific skill
  instead

Both modes are valid; the choice is per-project.

## Sync report directory

The first time the skill runs in a project, it creates
`docs/architecture/sync-reports/`. The reports are part of the
architectural trace and SHOULD be committed to git.

**Gitignore safety check**: before writing the first sync report, run
`git check-ignore <report-path>` on the target. If the path is ignored
(some projects gitignore parts of `docs/`), warn the architect prominently
— the report would be invisible to git, defeating its purpose as a trace.
The architect can either un-ignore the path or accept the risk explicitly.

## References

- Sibling skill [`arch-decision`](../arch-decision/SKILL.md) — produces
  the validated PRD + `05-decision.md` audit that `arch-sync` consumes
- Sibling skill [`quint-fpf`](../quint-fpf/SKILL.md) — the FPF
  methodology that `arch-decision` runs to produce the audit
- Sibling skill [`c4-doc-writer`](../c4-doc-writer/SKILL.md) — orthogonal
  consumer of the same validated PRD; updates Structurizr DSL
