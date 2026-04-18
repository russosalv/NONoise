# Adapter — `linear`

> **Status**: stub — schema documented, wiring pending. `create_item` / `update_item` print the translated payload; a future iteration will wire the GraphQL calls. The contract is stable so promoting this stub to a full adapter is non-breaking.

Maps each macro task from the sprint manifest to a single **Linear Issue**. Linear is a GraphQL-only API — this adapter uses the official `linear-api` HTTP endpoint. Dependencies are modeled as the native **Issue Relations** (`blocks` / `blocked-by`).

## Table of contents

- [Authentication](#authentication)
- [Configuration](#configuration)
- [Target operations](#target-operations)
- [Mapping](#mapping-canonical-workitem-to-linear-issue)
- [Idempotency](#idempotency)
- [Dependencies](#dependencies)
- [Cycle and estimate](#cycle-and-estimate)
- [Current stub behavior](#current-stub-behavior)

---

## Authentication

One env var:

- `LINEAR_API_KEY` — Personal API Key from `https://linear.app/settings/api` (format: `lin_api_XXXXXXXXXX`).

If missing, the skill stops with:

> ERROR: Linear adapter requires `LINEAR_API_KEY` set to a Linear Personal API Key. See `references/adapter-linear.md`.

Authorization header: `Authorization: <LINEAR_API_KEY>` (no `Bearer` prefix — Linear's convention).

All calls go to `https://api.linear.app/graphql` with `Content-Type: application/json`.

## Configuration

Asked from the user on first run, cacheable under `docs/sprints/Sprint-N/export/.linear-config.yml`:

```yaml
team_key: "<KEY>"             # e.g. "ENG" — appears in issue IDs like ENG-123
cycle_resolution: "by-name"   # "by-name" (match "Sprint <N>") or "explicit" with cycle_id below
cycle_id: null                # if explicit, the UUID of the Linear cycle
default_labels:
  - "spec"
  - "nonoise"
state_on_create: "Backlog"    # Linear workflow state for new items
priority_mapping:
  CL1: 2                       # 1=urgent, 2=high, 3=medium, 4=low, 0=none — here CL1 gets "high"
  CL2: 3
  CL3: 4
```

The `team_key` is the short prefix Linear uses for issue identifiers (`ENG-123`). It is resolved to a team UUID at runtime via GraphQL.

## Target operations

| Operation | GraphQL |
|---|---|
| `create_item(work_item)` | `mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }` |
| `list_items(filter)` | `query Issues { issues(filter: { team: { key: { eq: "<KEY>" } }, labels: { name: { eq: "sprint-<N>" } } }) { nodes { id identifier title labels { nodes { name } } state { name } } } }` |
| `update_item(tracker_id, patch)` | `mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier url } } }` |
| `search_by_external_id(task_id)` | `query { issues(filter: { team: { key: { eq: "<KEY>" } }, title: { containsIgnoreCase: "[T<N>]" }, labels: { name: { eq: "sprint-<N>" } } }) { nodes { id identifier title } } }` |

## Mapping — canonical `WorkItem` to Linear Issue

| Canonical field | Linear field |
|---|---|
| `external_id` | Embedded in `title` as `[T<N>] ...`. Linear has no custom fields on the free tier; matching is title-based. |
| `title` | `title` (verbatim) |
| `description` | `description` (Markdown, natively supported) |
| `labels[]` | `labelIds[]` — resolved from label names via `teamLabels` query. Missing labels are created if the API key has `Admin` scope, otherwise warned and dropped. Confidence (`CL1/CL2/CL3`), area slug, and `sprint-<N>` all flow here. |
| `effort_days` | `estimate` field — Linear uses 0/1/2/3/5/8 (Fibonacci) by default. The adapter rounds `effort_days` to the nearest Fibonacci number in the scale (3 days → 3 pts, 3.5 → 3, 4 → 5, 7 → 8). |
| `components[]` | Appended to `labelIds[]` as labels |
| `user_story_ref` | Recorded in description under "Meta > User story". If the parent user story exists as a Linear Project, the adapter optionally links via `projectId` (not automatic in v1). |
| `depends_on[]` | Native Linear Issue Relations — see "Dependencies". |
| Sprint | Linear `cycle` — resolved via `cycle_resolution` (see below). |
| Priority | Optional `priority` integer set from `priority_mapping[CL<k>]` in config. |

## Idempotency

GraphQL filter on `title: containsIgnoreCase: "[T<N>]"` scoped to the team and the `sprint-<N>` label.

Classification:

- Zero results → NEW
- One result → EXISTS
- Two or more → AMBIGUOUS

Linear does not offer custom fields on the standard plan, so the title prefix is the canonical key. If the user renames the title, idempotency breaks — document this limitation in the user-facing help the first time the adapter is selected.

## Dependencies

Linear has first-class **Issue Relations** with semantic types (`blocks`, `blocked-by`, `related`, `duplicate`). For every `depends_on: [TX, TY]`:

```graphql
mutation {
  issueRelationCreate(input: {
    type: blocks,
    issueId:      "<id of TX>",
    relatedIssueId: "<id of current task>"
  }) { success }
}
```

The adapter issues one call per dependency pair. Two-pass: create all issues, then create relations.

## Cycle and estimate

- **Cycle**: Linear's iteration unit. Resolved from the cycle name `Sprint <N>` via `query { team(id: "<uuid>") { cycles { nodes { id name number } } } }`. If no cycle matches, the adapter warns and skips setting the cycle (label-only fallback).
- **Estimate**: Linear's Fibonacci scale (0, 1, 2, 3, 5, 8). The adapter maps `effort_days` to the closest value; if a team uses a custom estimate scale, the mapping table must be documented in config (not supported in v1).

## Current stub behavior

Until wired live, `create_item` and `update_item` print the following to the console instead of calling Linear:

```
--- linear stub: would create issue ---
team_key:      ENG
title:         [T1] Operator starts signup with email and receives an OTP
labels:        sprint-5, user-signup, CL2
estimate:      3 (from effort_days 3.5)
priority:      3 (from CL2 via priority_mapping)
cycle:         Sprint 5 (resolved: <pending>)
description (markdown): |
  ## Functional description
  ...
--- end stub ---
```

`search_by_external_id` returns `null` in stub mode — every task is treated as NEW.
