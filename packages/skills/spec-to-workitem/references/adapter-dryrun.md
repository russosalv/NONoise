# Adapter — `dry-run`

> **Status**: implemented. This is the **default adapter** when no tracker is configured. It performs no remote calls.

The dry-run adapter is the safety net of `spec-to-workitem`. It runs the full flow — parse manifest, normalize tasks into `WorkItem` objects, compute idempotency classification, link dependencies — but replaces every remote call with a formatted print to the console. The output is copy-paste-friendly and mirrors the real export report.

## Table of contents

- [When it is used](#when-it-is-used)
- [Authentication](#authentication)
- [Operations](#operations)
- [Output format](#output-format)
- [Why it exists](#why-it-exists)

---

## When it is used

- No `adapter` argument was provided **and** no adapter env var is set → default.
- The user explicitly passes `adapter=dry-run` or `dry-run`.
- A live adapter is selected but the user wants a preview before committing — can run with `dry-run` first.

## Authentication

None. This adapter never touches the network.

## Operations

| Operation | Behavior |
|---|---|
| `create_item(work_item)` | Prints the rendered work item as a Markdown block. Returns a synthetic ID `dry-run-<external_id>` and a `(dry-run)` URL. |
| `list_items(filter)` | Returns an empty list (no remote state). |
| `update_item(tracker_id, patch)` | Prints the diff that would be applied. Returns the same synthetic ID. |
| `search_by_external_id(task_id)` | Returns `null` (no remote state). Every task is classified as `NEW` in dry-run mode. |

## Output format

For each task, the dry-run adapter emits:

```
--- dry-run: would create work item ---
external_id:   T1
title:         [T1] Operator starts signup with email and receives an OTP
labels:        sprint-5, user-signup, CL2
effort_days:   3.5
depends_on:    T2, T5
user_story:    US1
components:    auth-service, notifications

body:
  ## Functional description
  ...
  ## Acceptance test
  ...
  ## Meta
  ...
  ## References
  ...
--- end dry-run ---
```

At the end of the run, the final summary uses `(dry-run)` in place of the tracker URL column:

```
spec-to-workitem — Sprint 5 / adapter: dry-run

Created:   12 items (dry-run, no remote call)
Skipped:    0 items (no remote state to check)
Failed:     0 items

Detail:
  [T1] Operator starts signup with email and receives an OTP  -> (dry-run)
  [T2] Operator verifies OTP and receives a session token     -> (dry-run)
  ...
```

## Why it exists

- **Safety**: the user sees exactly what would be pushed before authorizing any remote mutation.
- **Offline authoring**: lets the user iterate on the manifest without hitting rate limits on a real tracker.
- **CI/docs**: the dry-run output is a stable artifact and can be committed under `docs/sprints/Sprint-N/export/` for traceability.
- **Fallback**: if a live adapter is misconfigured, the skill degrades to dry-run rather than failing — the user can still see the plan.
