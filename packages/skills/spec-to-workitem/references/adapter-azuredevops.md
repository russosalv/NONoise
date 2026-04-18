# Adapter — `azure-devops`

> **Status**: implemented. Port of the original Risko reference skill. Kept as a first-class supported adapter, but not the v1 default (GitHub Issues is more universal).

Maps each macro task from the sprint manifest to a single **Azure DevOps Work Item** — typically type `User Story` or `Task`, configurable per project. Dependencies are modeled as native Work Item Links (`System.LinkTypes.Dependency-Forward` / `-Reverse`).

## Table of contents

- [Authentication](#authentication)
- [Configuration](#configuration)
- [Operations](#operations)
- [Mapping](#mapping-canonical-workitem-to-azure-devops-work-item)
- [Idempotency](#idempotency)
- [Dependencies](#dependencies)
- [Iteration path](#iteration-path)
- [Rate limits and retries](#rate-limits-and-retries)

---

## Authentication

One supported source:

- **`AZURE_DEVOPS_PAT` env var** — Personal Access Token. Required scopes:
  - `Work Items (Read, write, & manage)`
  - `Project and Team (Read)` — to resolve iteration paths
  - `Graph (Read)` — if assigning users by identity

Token expiration is checked at start; if the token is >90 days old the adapter warns the user (Azure DevOps PATs default to 90 days).

If `AZURE_DEVOPS_PAT` is missing, the skill stops with:

> ERROR: Azure DevOps adapter requires `AZURE_DEVOPS_PAT` set to a PAT with `Work Items (R/W)` scope. See `references/adapter-azuredevops.md`.

## Configuration

Asked from the user on first run, cacheable under `docs/sprints/Sprint-N/export/.azuredevops-config.yml`:

```yaml
organization: "<org>"              # https://dev.azure.com/<org>
project: "<Project Name>"          # may contain spaces
work_item_type: "User Story"       # or "Task", "Product Backlog Item", "Issue"
area_path_root: "<Project Name>"   # most teams use the project name as root
iteration_path_pattern: "<Project Name>\\Sprint <N>"  # how this skill maps sprint number to iteration
default_tags:
  - "spec"
  - "nonoise"
default_fields:                    # optional static fields added on every item
  "System.AssignedTo": ""          # leave empty unless you want auto-assign
```

The REST base URL is always `https://dev.azure.com/<org>/<project>/_apis/wit/` (and the Graph API on `https://vssps.dev.azure.com/<org>/_apis/`).

## Operations

All calls use API version `7.1-preview.3` (stable as of 2025).

| Operation | REST call |
|---|---|
| `create_item(work_item)` | `POST /_apis/wit/workitems/$<type>?api-version=7.1` with a JSON-patch body (`op: add` for each field) |
| `list_items(filter)` | `POST /_apis/wit/wiql?api-version=7.1` with a WIQL query scoped by `[System.IterationPath]` and `[System.Tags] Contains 'sprint-<N>'` |
| `update_item(tracker_id, patch)` | `PATCH /_apis/wit/workitems/<id>?api-version=7.1` with a JSON-patch body |
| `search_by_external_id(task_id)` | WIQL: `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.Title] CONTAINS '[T<N>]' AND [System.Tags] CONTAINS 'sprint-<N>'` |

Authorization header: `Authorization: Basic <base64(":" + AZURE_DEVOPS_PAT)>`.

## Mapping — canonical `WorkItem` to Azure DevOps Work Item

| Canonical field | ADO field |
|---|---|
| `external_id` | Embedded in `System.Title` as `[T<N>] ...` — primary idempotency key. Optionally also written to a custom string field (e.g. `Custom.ExternalId`) if the process template exposes one. |
| `title` | `System.Title` (verbatim) |
| `description` | `System.Description` (rendered as HTML — Markdown is converted to HTML before the call) |
| `labels[]` | `System.Tags` (semicolon-separated string on write, array-like on read). Confidence (`CL1`/`CL2`/`CL3`), area slug, sprint tag, and components all flow here. |
| `effort_days` | `Microsoft.VSTS.Scheduling.OriginalEstimate` (hours) — multiplied by 8 from days. Also mirrored in `Microsoft.VSTS.Scheduling.Effort` (story points) if the process template uses it. |
| `components[]` | Appended to `System.Tags`. No native components field. |
| `user_story_ref` | Recorded in description body "Meta > User story". Optionally link-typed `System.LinkTypes.Hierarchy-Reverse` to a parent User Story item if one exists (the adapter does not create the parent automatically in v1). |
| `depends_on[]` | Native `System.LinkTypes.Dependency-Forward` / `-Reverse` links — see "Dependencies". |
| Sprint | `System.IterationPath` — computed from `iteration_path_pattern` (see below). |
| Area | `System.AreaPath` — defaults to `area_path_root`; if the project has per-area structure, the area slug is mapped to an area path (documented per project). |

## Idempotency

WIQL query:

```sql
SELECT [System.Id], [System.Title], [System.State], [System.Tags]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.Title] CONTAINS '[T<N>]'
  AND [System.Tags] CONTAINS 'sprint-<N>'
```

Classification:

- Zero → **NEW**
- One → **EXISTS** — skip (or update on user approval)
- Two or more → **AMBIGUOUS** — flag

If the process template exposes a custom `External ID` field, the query switches to `[Custom.ExternalId] = 'T<N>'` — more robust against title renames.

## Dependencies

Azure DevOps has native work-item links with a semantic `Dependency` type:

- `System.LinkTypes.Dependency-Forward` — "successor"
- `System.LinkTypes.Dependency-Reverse` — "predecessor"

For every `depends_on: [TX, TY]`, the adapter adds a **Reverse** dependency link from the current item to the items for TX and TY. Two-pass: first create all items (collecting ADO IDs), then issue `PATCH` calls to add links.

JSON-patch example for linking:

```json
[
  {
    "op": "add",
    "path": "/relations/-",
    "value": {
      "rel": "System.LinkTypes.Dependency-Reverse",
      "url": "https://dev.azure.com/<org>/<project>/_apis/wit/workItems/<id-of-TX>",
      "attributes": { "comment": "From sprint manifest depends_on: T<X>" }
    }
  }
]
```

## Iteration path

The `iteration_path_pattern` is interpolated with the sprint number from the manifest. Example:

- Pattern `<Project Name>\\Sprint <N>` + manifest sprint `5` → iteration path `<Project Name>\Sprint 5`.

Before pushing, the adapter verifies the iteration exists via `GET /_apis/work/teamsettings/iterations` and warns if it does not (iterations cannot be created via the Work Items API alone; the user must create them in ADO).

## Rate limits and retries

- Azure DevOps applies TSTU (Transaction Service Task Units). The adapter paces itself at 4 req/s by default.
- Retries: exponential back-off on 429 with `Retry-After` honored. Max 3 retries per item.
- On `401` (auth), the whole run aborts with a precise message pointing here.
