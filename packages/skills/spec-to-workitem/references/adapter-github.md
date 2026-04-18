# Adapter — `github-issues`

> **Status**: implemented. This is the **default live adapter** for NONoise v1 — most universal, easy to authenticate, works on both github.com and GitHub Enterprise Server.

Maps each macro task from the sprint manifest to a single **GitHub Issue** on a target repository. Uses the `gh` CLI when available (recommended) or the REST API via `GH_TOKEN`. Issue dependencies are declared with GitHub's native `blocked-by` links if the repo has Projects v2 with dependency support; otherwise, they are recorded as a markdown list in the issue body plus mutual `related-to` cross-references in comments.

## Table of contents

- [Authentication](#authentication)
- [Configuration](#configuration)
- [Operations](#operations)
- [Mapping](#mapping-canonical-workitem-to-github-issue)
- [Idempotency](#idempotency)
- [Dependencies](#dependencies)
- [Rate limits and retries](#rate-limits-and-retries)

---

## Authentication

Two supported sources, tried in this order:

1. **`gh` CLI session** — if `gh auth status` succeeds, use the CLI (no extra env var needed). Recommended for interactive use.
2. **`GH_TOKEN` env var** — Personal Access Token (classic) with scopes:
   - `repo` (full repo access) for private repositories
   - `public_repo` is sufficient for public repos
   - For fine-grained tokens: `Contents: read`, `Issues: read/write`, `Metadata: read`, and `Pull requests: read` (only if milestones are used)

If neither source is configured, the skill stops with:

> ERROR: GitHub adapter requires either `gh` CLI authenticated (`gh auth login`) or `GH_TOKEN` set with `repo` scope. See `references/adapter-github.md`.

## Configuration

Configuration is asked from the user on first run and can be cached under `docs/sprints/Sprint-N/export/.github-config.yml` (user-writable, not committed if it contains secrets — which it should not, since auth is env-based):

```yaml
repo: "<owner>/<repo>"     # target repository
milestone: "Sprint 5"       # optional, defaults to "Sprint <N>" from manifest frontmatter
default_labels:            # merged with task-specific labels
  - "spec"
  - "nonoise"
assignees: []              # optional GitHub logins
project_v2:                # optional, for Projects v2 integration (dependencies)
  enabled: false
  project_number: null
```

## Operations

| Operation | Implementation |
|---|---|
| `create_item(work_item)` | `gh issue create --repo <owner>/<repo> --title "{title}" --body "{body}" --label "<labels>" --milestone "Sprint <N>"` — or REST `POST /repos/{owner}/{repo}/issues` |
| `list_items(filter)` | `gh issue list --repo <owner>/<repo> --label "sprint-<N>" --json number,title,labels,state,body` — or REST `GET /repos/{owner}/{repo}/issues` with `labels=sprint-<N>` |
| `update_item(tracker_id, patch)` | `gh issue edit <number> --add-label ...` / `gh api` for body edits — or REST `PATCH /repos/{owner}/{repo}/issues/{number}` |
| `search_by_external_id(task_id)` | `gh issue list --repo <owner>/<repo> --search "[T1] in:title" --json number,title` — or REST `GET /search/issues?q=repo:...+in:title+[T1]+label:sprint-<N>` |

## Mapping — canonical `WorkItem` to GitHub Issue

| Canonical field | GitHub Issue field |
|---|---|
| `external_id` | Embedded in `title` as `[T<N>] ...` (stable idempotency key) |
| `title` | `title` (verbatim) |
| `description` | `body` (Markdown) |
| `labels[]` | `labels[]` — created on the repo if missing (requires push access; otherwise warns and strips missing labels) |
| `effort_days` | Cited in body under "Meta > Estimated effort". No native story-point field on Issues — if Projects v2 is enabled in config, also written to the custom "Effort (days)" field. |
| `components[]` | Appended to `labels[]` as-is; also listed in body |
| `user_story_ref` | Cited in body under "Meta > User story" + linked as `Related: #<issue of parent user story>` if a user-story issue exists |
| `depends_on[]` | See "Dependencies" section |
| Sprint number | `milestone` "Sprint <N>" (created if missing) |

### Labels auto-created

On first run, the adapter ensures these labels exist on the repo (creates them with sensible colors):

- `sprint-<N>` — `#0E8A16` (green)
- `CL1` — `#D93F0B` (red — new pattern, decision record needed)
- `CL2` — `#FBCA04` (yellow — known pattern)
- `CL3` — `#0366D6` (blue — straightforward)
- `<area-slug>` — `#5319E7` (purple)
- `spec` — `#C2E0C6` (light green)
- `nonoise` — `#1D76DB` (dark blue)

If the authenticated principal does not have `issues: write` scope to create labels, the adapter warns and drops missing labels (does not fail the whole run).

## Idempotency

Primary search: title prefix `[T<N>]` **scoped** to label `sprint-<N>` to avoid cross-sprint collisions.

```
gh issue list --repo <owner>/<repo> \
  --label "sprint-5" --search "[T1] in:title" \
  --json number,title,state,url
```

Classification:

- Zero results → **NEW**, call `create_item`
- Exactly one result → **EXISTS**, skip by default (or `update_item` on user approval)
- Two or more results → **AMBIGUOUS**, flag to user

**Custom field fallback**: if Projects v2 is enabled and the "External ID" custom field is set, matching happens on the field instead of the title — more robust if someone renames the issue title. Without Projects v2, the title prefix is the only key.

## Dependencies

Three levels of support, auto-detected:

1. **Projects v2 with dependency support** (best) — creates native parent/child or blocks/blocked-by links via the GraphQL API.
2. **Task lists in the issue body** — writes a `### Blocked by` section with `- [ ] #<issue-number>` lines. GitHub renders these as tracked dependencies on the issue's side panel.
3. **Plain Markdown fallback** — lists dependencies as `- Depends on: #<issue-number> [T<N>]` lines. Not auto-tracked by GitHub but visible and clickable.

Two-pass execution is required: first create all issues (collecting their numbers), then update each issue's body to inject the dependency block.

## Rate limits and retries

- Primary rate limit: 5000 req/h (authenticated REST).
- Secondary rate limit on issue creation: ~20/min as of April 2026 — the adapter paces itself at 1 create / 2 seconds for runs of >30 items.
- Retries: exponential back-off on 429 / 403 with `Retry-After` honored. Max 3 retries per item.

On exhaustion, the adapter writes partial results to the local summary file and exits with the exact count of items still pending — so a re-run can resume idempotently.
