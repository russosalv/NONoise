---
name: spec-to-workitem
description: Translates macro functional tasks from a NONoise sprint manifest (`docs/sprints/Sprint-N/sprint-manifest.md`) into work items on an external issue tracker via a pluggable **adapter** pattern. Ships with adapters for GitHub Issues (default), Azure DevOps, Jira, and Linear, plus a `dry-run` mode that prints what would be created without touching any remote system. Idempotent by design — searches for existing work items matching a task ID before creating new ones. Use this skill when the user mentions "export to tracker", "create issues from sprint manifest", "push work items", "sync sprint to GitHub / Azure DevOps / Jira / Linear", "spec to workitem", "dry-run work items", or wants to translate a manifest into an external backlog. Triggers — `/spec-to-workitem sprint N`, `/spec-to-workitem sprint N adapter=github-issues`, `/spec-to-workitem sprint N dry-run`, "export Sprint N to Jira", "create GitHub issues for the sprint manifest". Authentication is **always per-adapter, via environment variables** — the skill never hardcodes credentials.
source: Risko reference-project (reworked whitelabel for NONoise)
variant: nonoise generic; stack-neutral; tracker-agnostic adapter pattern
---

# spec-to-workitem — Sprint Manifest to External Work Items

This skill is the **export bridge** between a NONoise sprint manifest and any external issue tracker. It reads the aggregated sprint manifest produced by [`sprint-manifest`](../sprint-manifest/SKILL.md), asks the user which tracker adapter to use, and creates one work item per macro functional task — with title, description, labels, effort, and dependency links where the adapter supports them.

The skill is **tracker-agnostic**: all tracker-specific logic is isolated in **adapters** (see `references/adapter-*.md`). Adding a new tracker means adding a new adapter reference and a minimal code stub — the core flow stays the same.

## Position in the workflow

```
┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ arch-       │──▶│ arch-        │──▶│ sprint-manifest  │──▶│ spec-to-workitem │
│ brainstorm  │   │ decision     │   │                  │   │ (THIS SKILL)     │
│             │   │              │   │ produces         │   │                  │
│ produces    │   │ validates    │   │ aggregated       │   │ exports manifest │
│ PRDs as     │   │ via          │   │ manifest +       │   │ to external      │
│ draft       │   │ quint-fpf    │   │ macro tasks      │   │ tracker          │
│             │   │              │   │                  │   │                  │
└─────────────┘   └──────────────┘   └──────────────────┘   └──────────────────┘
     STEP 1            STEP 2              STEP 3                  STEP 4
```

## What this skill does

1. **Reads the sprint manifest** at `docs/sprints/Sprint-N/sprint-manifest.md` and, optionally, the promoted PRDs under `docs/sprints/Sprint-N/<area>/` for richer context.
2. **Asks the user** which tracker adapter to use and which tasks to export (all / by area / by confidence / specific IDs).
3. **Generates work items** — one per macro functional task — with a stable title convention including the task ID so the export is idempotent.
4. **Links dependencies** between work items where the adapter supports it (native parent/child, blocks/blocked-by, or related-link fallback).
5. **Reports** what was created, skipped (already present), or failed.

## What this skill does NOT do

- **Does not create a sprint manifest** — that is `sprint-manifest`'s job.
- **Does not edit PRDs or the manifest** — read-only on the source of truth.
- **Does not hardcode credentials** — authentication comes from environment variables or config files declared per adapter.
- **Does not silently mutate existing work items** — if a match is found, the skill reports it as skipped and asks the user before updating.
- **Does not push automatically** — the default mode is `dry-run`; a live push requires explicit user confirmation.

---

## Arguments

`$ARGUMENTS` can be:

- `sprint N` — process all macro tasks of Sprint N (adapter defaults to `dry-run` unless otherwise specified)
- `sprint N adapter=<name>` — use a specific adapter (`github-issues`, `azure-devops`, `jira`, `linear`, `dry-run`)
- `sprint N adapter=<name> area=<slug>` — only tasks from a given area
- `sprint N adapter=<name> confidence=CL1` — only tasks at a given confidence level
- `sprint N adapter=<name> tasks=T1,T3,T7` — only specific task IDs
- `sprint N dry-run` — alias for `adapter=dry-run`; no external call, just prints what would be done

If arguments are missing, ask the user for sprint number and adapter via `AskUserQuestion`.

---

## Adapters — the pluggable core

Every adapter must implement the following four operations. This is the **contract** — the core flow of the skill calls these operations regardless of the underlying tracker.

| Operation | Input | Output | Purpose |
|---|---|---|---|
| `create_item(work_item)` | `WorkItem` object | Tracker ID + URL | Create a new work item on the tracker |
| `list_items(filter)` | Filter (labels, area, sprint) | List of `WorkItem` summaries | Enumerate existing items (used for context and reports) |
| `update_item(tracker_id, patch)` | Tracker ID + partial `WorkItem` | Updated ID + URL | Apply changes to an existing item (used only on explicit user approval) |
| `search_by_external_id(task_id)` | Task ID string (e.g. `T1`) | Matching item or `null` | Idempotency check — find existing items created by a previous run |

### Work item canonical shape

Before handing off to an adapter, the skill normalizes every task into this tracker-agnostic shape:

```yaml
external_id: "T1"                     # matches manifest section 4 task ID
title: "[T1] Operator starts signup with email and receives an OTP"
description: |                        # markdown body
  **Functional description**: ...
  **Acceptance test**: ...
  **Dependencies**: T2, T5
  **Manifest ref**: docs/sprints/Sprint-5/sprint-manifest.md §4 T1
labels: ["sprint-5", "user-signup", "CL2"]
effort_days: 3.5
components: ["auth-service", "notifications"]
depends_on: ["T2", "T5"]              # resolved to tracker IDs by the adapter
user_story_ref: "US1"                 # manifest section 3 reference
```

The adapter translates this canonical shape into the tracker's native format (see the per-adapter references).

### Available adapters

| Adapter | Status | Default? | Reference |
|---|---|---|---|
| `dry-run` | Implemented | Yes (when no adapter configured) | `references/adapter-dryrun.md` |
| `github-issues` | Implemented | Yes (live default for v1) | `references/adapter-github.md` |
| `azure-devops` | Implemented | No | `references/adapter-azuredevops.md` |
| `jira` | Stub — schema documented, wiring pending | No | `references/adapter-jira.md` |
| `linear` | Stub — schema documented, wiring pending | No | `references/adapter-linear.md` |

Stub adapters document the target shape and authentication model. Their `create_item` prints the translated payload to the console (so the user can copy-paste it or run a side integration). Promoting a stub to a full adapter is non-breaking — the contract stays the same.

---

## Authentication model

Authentication is **always per-adapter, from environment variables or CLI sessions — never hardcoded**. If the required variables are missing, the skill stops and explains what to set.

| Adapter | Required env vars / auth source | Optional fallback |
|---|---|---|
| `github-issues` | `GH_TOKEN` (Personal Access Token with `repo` scope) | `gh` CLI if authenticated (`gh auth status`) |
| `azure-devops` | `AZURE_DEVOPS_PAT` (Personal Access Token, scopes: Work Items R/W) | none |
| `jira` | `JIRA_API_TOKEN`, `JIRA_EMAIL`, `JIRA_HOST` | none |
| `linear` | `LINEAR_API_KEY` | none |
| `dry-run` | none | n/a |

The adapter-specific reference files document **exactly** how each variable is used and what scopes / permissions are needed.

---

## Flow — 6 steps

### Step 0 — detect mode and verify prerequisites

1. Locate the sprint manifest at `docs/sprints/Sprint-N/sprint-manifest.md`. If missing, stop and redirect to `sprint-manifest`.
2. If the user specified an adapter, check its auth env vars. If missing, stop with a precise message pointing to the adapter reference file.
3. If the user did not specify an adapter, default to `dry-run` and announce it explicitly.

### Step 1 — read the manifest

1. Parse the manifest frontmatter (`sprint`, `areas_covered`, `prd_refs`, `total_effort_days`).
2. Parse section 3 (User stories) — used for the `user_story_ref` field.
3. Parse section 4 (Macro functional tasks) — the primary source for work items.
4. Parse section 5 (Dependencies, Mermaid) — used for `depends_on`.
5. Optionally read promoted PRDs under `docs/sprints/Sprint-N/<area>/NN-<study>.md` to enrich the description if the task references a specific PRD section. Do not duplicate the full PRD in the description — just cite the reference.

### Step 2 — ask the user what to export

Use `AskUserQuestion` for:

- **Scope**: all tasks, by area, by confidence (CL1 only, CL2, CL3), or specific IDs.
- **Adapter confirmation**: reaffirm the adapter and the target project/repo. Example for `github-issues`: "Export to repo `<owner>/<repo>`? Use milestone `Sprint 5`? Use labels `sprint-5`, `<area-slug>`, `CL{confidence}`?"
- **Dry-run switch**: always offer the chance to run a dry-run first, even when an adapter is configured.

Present a short preview table (task ID, title, area, confidence, effort, existing?) **before** making any remote call.

### Step 3 — idempotency check

For every task to export, call `search_by_external_id(task_id)` on the adapter. Classify each task into:

| Class | Meaning | Action |
|---|---|---|
| **NEW** | No existing item matches the task ID | Queue for `create_item` |
| **EXISTS** | Existing item found by external ID | Skip by default. Ask the user if they want to `update_item`. |
| **AMBIGUOUS** | Multiple items match the ID | Flag, ask the user which one to update (or skip) |

The canonical idempotency key is the `[T<N>]` prefix in the work item title. Adapters that expose custom fields (Azure DevOps, Jira) should also stamp the `external_id` in a custom field for robust matching; the fallback is a title search.

Present the full impact table to the user **before** calling `create_item` on anything.

### Step 4 — create work items

For each NEW task (and each approved UPDATE):

1. Translate the task into the canonical `WorkItem` shape (see above).
2. Call `create_item(work_item)` (or `update_item`).
3. Collect the tracker ID and URL in a local results table.
4. If the task has `depends_on`, once all items are created, call `update_item` on each created item to add dependency links — two-pass to avoid forward references.

On each call, handle errors gracefully:

- **Auth error** → stop the whole run, emit a precise remediation message.
- **Rate limit** → back off (exponential, max 3 retries) and resume.
- **4xx on a single item** → log as FAILED, continue with the rest.
- **Network** → retry up to 3 times, then FAILED.

### Step 5 — report

Print a summary to the user:

```
spec-to-workitem — Sprint <N> / adapter: <name>

Created:   <N> items
Updated:   <N> items
Skipped:   <N> items (already tracked)
Ambiguous: <N> items (user review needed)
Failed:    <N> items

Detail:
  [T1] Operator starts signup with email and receives an OTP
       -> <tracker URL>  (status: created)
  [T2] Operator verifies OTP and receives a session token
       -> <tracker URL>  (status: skipped — already #142)
  ...

Dependencies linked: <N>
Dependencies skipped (missing target): <N>
```

If the mode was `dry-run`, the same table is produced but no remote call was made; the "tracker URL" column is replaced with `(dry-run)`.

Optionally, write a summary file at `docs/sprints/Sprint-N/export/spec-to-workitem-<adapter>-<YYYY-MM-DD>.md` so the user has a local audit trail of what was pushed. This is a read-only artifact; do not mutate it after creation.

---

## Canonical mapping — from manifest task to `WorkItem`

This is the mapping applied before calling the adapter:

| Manifest field (section 4) | Canonical `WorkItem` field | Notes |
|---|---|---|
| Task ID (e.g. `T1`) | `external_id` | Used for idempotency |
| Functional name | Part of `title` | Title format: `[{task_id}] {functional name}` |
| Area | `labels[]` (as `<area-slug>`) | Also available separately as `area` metadata |
| User story ref | `user_story_ref` | Cited in description as "Linked user story: US1" |
| Description | `description` (top section) | Verbatim |
| Acceptance test | `description` (second section) | Under "Acceptance test" heading |
| Confidence | `labels[]` (as `CL1` / `CL2` / `CL3`) | Also part of description metadata |
| Estimated effort | `effort_days` | Adapter maps to its native field (story points / effort hours / estimate) — see per-adapter reference |
| Dependencies | `depends_on[]` | Resolved to tracker IDs in step 4 |
| Components touched | `components[]` | Adapter maps to tags/areas where supported |
| Relevant PRD sections | `description` (footer) | Cited as "Manifest ref: ... / PRD ref: ..." |
| Sprint number (frontmatter) | `labels[]` (as `sprint-<N>`) and / or sprint/milestone field | Adapter-specific |

Sprint field mapping per adapter:

- `github-issues` → milestone named `Sprint <N>`
- `azure-devops` → `System.IterationPath` set to the project's iteration matching `Sprint <N>`
- `jira` → custom `sprint` field in the active board
- `linear` → cycle named `Sprint <N>`

---

## Description template (what the body looks like)

Every created work item uses this structure for its description/body, rendered as Markdown:

```markdown
## Functional description

<verbatim "Description" field from manifest task>

## Acceptance test

<verbatim "Acceptance test" field from manifest task>

## Meta

- **Task**: T<N>
- **Area**: <area-slug>
- **User story**: US<M> — <user story name>
- **Confidence**: CL<k>
- **Estimated effort**: <X> days
- **Components touched**: <component list>
- **Dependencies**: T<A>, T<B> (linked as tracker references when supported)

## References

- Sprint manifest: `docs/sprints/Sprint-<N>/sprint-manifest.md` §4 T<N>
- Promoted PRD: `docs/sprints/Sprint-<N>/<area>/NN-<study>.md` (if task cites one)
- Generated by: spec-to-workitem skill (NONoise) — <YYYY-MM-DD>
```

The description is stable — re-running on an existing item shows no diff unless the underlying manifest task changed.

---

## Operating principles

1. **Dry-run is the safety net** — always available, always explicit. No silent push.
2. **Idempotency is mandatory** — every creation is preceded by a search by `external_id`. No duplicates.
3. **Auth is externalized** — env vars only. A missing credential stops the run with a precise message.
4. **Adapters are the only tracker-specific code** — if a tracker behavior leaks into the core flow, it is a bug.
5. **Read-only on the source of truth** — the skill never edits the sprint manifest or PRDs.
6. **Impact table before write** — the user sees the plan (NEW / EXISTS / AMBIGUOUS) before any remote call.
7. **Two-pass for dependencies** — create all items first, then link dependencies, to avoid forward references.
8. **Fail-soft per item, fail-hard on auth** — one broken item should not abort the whole export; a broken credential always aborts.

---

## Anti-patterns

1. **Hardcoded credentials or organization slugs** — always env vars.
2. **Creating without idempotency check** — duplicates the work item if the user re-runs.
3. **Pushing in "live" by default** — surprise pushes break trust. The default must be `dry-run`.
4. **Translating PRDs into work items directly** — PRDs are not tasks. The manifest's section 4 is the only source.
5. **Opaque failures** — every failure in the report must carry the tracker's error message + the task ID that failed.
6. **Silent updates** — if a task already exists and the manifest changed, ask the user before updating.

## When NOT to use this skill

- No sprint manifest exists yet → use `sprint-manifest` first.
- The manifest has open CL1 tasks without decision records → proceed with caution. Optionally ask the user if CL1 tasks should be labeled `needs-decision-record` and still exported, or held back.
- The user wants to push raw PRDs to a tracker → out of scope. Promote them via `sprint-manifest`, then run this skill.

---

## Reference files

- `references/adapter-dryrun.md` — the default no-op adapter (always works)
- `references/adapter-github.md` — GitHub Issues adapter (default live adapter)
- `references/adapter-azuredevops.md` — Azure DevOps adapter (REST API, PAT auth)
- `references/adapter-jira.md` — Jira adapter (schema documented, wiring pending)
- `references/adapter-linear.md` — Linear adapter (schema documented, wiring pending)

## Related skills

- [`sprint-manifest`](../sprint-manifest/SKILL.md) — produces the input for this skill
- [`atr`](../atr/SKILL.md) — acceptance testing of tasks after export
- [`arch-decision`](../arch-decision/SKILL.md) / [`arch-brainstorm`](../arch-brainstorm/SKILL.md) — upstream skills that produce validated PRDs
