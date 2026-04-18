# Adapter — `jira`

> **Status**: stub — schema documented, wiring pending. `create_item` / `update_item` print the translated payload; a future iteration will wire the REST calls. The contract is stable so promoting this stub to a full adapter is non-breaking.

Maps each macro task from the sprint manifest to a single **Jira Issue** (Cloud or Data Center). Dependencies are modeled as issue links with the `Blocks` / `is blocked by` link types, which exist by default on every Jira instance.

## Table of contents

- [Authentication](#authentication)
- [Configuration](#configuration)
- [Target operations](#target-operations)
- [Mapping](#mapping-canonical-workitem-to-jira-issue)
- [Idempotency](#idempotency)
- [Dependencies](#dependencies)
- [Sprint and effort](#sprint-and-effort)
- [Current stub behavior](#current-stub-behavior)

---

## Authentication

Three env vars, all required:

- `JIRA_API_TOKEN` — API token generated at `https://id.atlassian.com/manage-profile/security/api-tokens` (for Cloud) or a PAT on Data Center.
- `JIRA_EMAIL` — Atlassian account email, used as the Basic Auth username on Cloud. On Data Center, set this to your username.
- `JIRA_HOST` — e.g. `https://your-org.atlassian.net` (Cloud) or `https://jira.your-company.com` (Data Center). No trailing slash.

If any variable is missing, the skill stops with a precise message pointing to this file.

Authorization header: `Authorization: Basic <base64(JIRA_EMAIL + ":" + JIRA_API_TOKEN)>`.

## Configuration

Asked from the user on first run, cacheable under `docs/sprints/Sprint-N/export/.jira-config.yml`:

```yaml
project_key: "<KEY>"                 # e.g. "ENG"
issue_type: "Story"                  # or "Task", "Bug", etc. — must exist in the project
board_id: <numeric-board-id>         # needed to add items to a sprint
sprint_id_resolution: "by-name"      # "by-name" (match "Sprint <N>") or "explicit" with sprint_id below
sprint_id: null                      # if explicit, numeric sprint ID in Jira
custom_field_effort: null            # e.g. "customfield_10016" (Story Points) — varies per instance
custom_field_external_id: null       # optional — stamps external_id (e.g. T1) for robust matching
default_labels:
  - "spec"
  - "nonoise"
```

Jira custom field IDs vary per instance (`customfield_10016`, `customfield_10020`, …). The user must discover them via `GET /rest/api/3/field` the first time they configure the adapter. The skill prints a helper command if these are left null and Story Points are needed.

## Target operations

All paths on Cloud assume API v3; on Data Center the adapter falls back to v2.

| Operation | REST call |
|---|---|
| `create_item(work_item)` | `POST {JIRA_HOST}/rest/api/3/issue` — body is an ADF description + fields |
| `list_items(filter)` | `POST {JIRA_HOST}/rest/api/3/search` with a JQL query scoped by `project = <KEY> AND labels = "sprint-<N>"` |
| `update_item(tracker_id, patch)` | `PUT {JIRA_HOST}/rest/api/3/issue/<key>` with a partial `fields` object |
| `search_by_external_id(task_id)` | JQL: `project = <KEY> AND summary ~ "[T<N>]" AND labels = "sprint-<N>"` — or `"External ID" = "T<N>"` if the custom field is configured |

## Mapping — canonical `WorkItem` to Jira Issue

| Canonical field | Jira field |
|---|---|
| `external_id` | Embedded in `summary` as `[T<N>] ...`. Optionally also written to `customfield_external_id` if configured. |
| `title` | `summary` (Jira max 255 chars — adapter truncates with `…` if exceeded and warns). |
| `description` | `description` (Atlassian Document Format — ADF — on Cloud v3; plain wiki markup on Data Center v2). The adapter converts Markdown → ADF via a minimal translator for headings, lists, inline code, links. |
| `labels[]` | `labels[]` (Jira labels, no spaces allowed — area slugs are already slugified; `CL1/CL2/CL3` and `sprint-<N>` work as-is). |
| `effort_days` | If `custom_field_effort` is configured → Story Points (days mapped 1:1, or 1 day = 1 point depending on team convention — the mapping is documented, not computed). Otherwise recorded only in description. |
| `components[]` | Jira `components` field if the project has matching components registered; unmatched component slugs fall back to labels. |
| `user_story_ref` | Recorded in description under "Meta > User story". Optionally, the user story can itself be a Jira Epic and the adapter adds a `Epic Link` (`customfield_10014` on default Cloud setups) — not automatic in v1. |
| `depends_on[]` | Jira issue links — see "Dependencies". |
| Sprint | Sprint field (`customfield_10020` on default Cloud setups) via `POST /rest/agile/1.0/sprint/<id>/issue`. Resolution of `<id>` from the sprint name is done via `GET /rest/agile/1.0/board/<boardId>/sprint`. |

## Idempotency

Primary: JQL search on `summary ~ "[T<N>]" AND labels = "sprint-<N>"`.

Classification:

- Zero → NEW
- One → EXISTS
- Two or more → AMBIGUOUS

If `custom_field_external_id` is set, the query switches to `"External ID" = "T<N>"` for robust matching across title changes.

## Dependencies

Jira has first-class issue links with the default `Blocks` link type. For every `depends_on: [TX, TY]`:

```
POST /rest/api/3/issueLink
{
  "type":         { "name": "Blocks" },
  "inwardIssue":  { "key": "<KEY of TX>" },   // is blocked by
  "outwardIssue": { "key": "<KEY of current task>" }
}
```

Two-pass: create all issues, resolve task IDs to Jira keys, then create links.

## Sprint and effort

- Sprint field on Jira is an agile-board field. The adapter needs the `board_id` and resolves the sprint via `GET /rest/agile/1.0/board/<boardId>/sprint?state=active,future` matching by name `Sprint <N>`. If no sprint with that name exists, the adapter warns and falls back to adding only a `sprint-<N>` label.
- Story Points custom field is instance-dependent. The adapter does not guess; if not configured, effort is only recorded in the description.

## Current stub behavior

Until wired live, `create_item` and `update_item` print the following to the console instead of calling Jira:

```
--- jira stub: would create issue ---
project_key:   ENG
issue_type:    Story
summary:       [T1] Operator starts signup with email and receives an OTP
labels:        sprint-5, user-signup, CL2
components:    auth-service, notifications
body (ADF):
  { ... rendered ADF preview ... }
sprint_id:     <resolved or "not resolved (board_id missing)">
--- end stub ---
```

`search_by_external_id` returns `null` in stub mode — so every task is treated as NEW. This matches the semantics of `dry-run` and produces a usable local plan even without a live Jira connection.
