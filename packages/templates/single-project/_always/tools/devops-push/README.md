# `@nonoise/devops-push`

Interactive CLI that pushes sprint task breakdowns — `Feature > User Story > Task` — to **Azure DevOps** as work items, using the REST API with a Personal Access Token.

The tool is **Azure DevOps-first**: the REST calls, the JSON Patch documents, and the field names (`Microsoft.VSTS.Scheduling.*`, `System.IterationPath`, etc.) are all Azure-DevOps-specific. See [Extending to other trackers](#extending-to-other-trackers) below.

## What this tool does

For every task breakdown file in `docs/sprints/Sprint-<N>/tasks/<id>-tasks.json`, the tool:

1. **Validates** the JSON against the expected structure (`feature + userStories[] + tasks[]`), checks local ID references, and validates assigned developers against `config/developers.json`.
2. **Creates** a Feature work item under a parent Epic the user provides at push time.
3. **Creates** a User Story work item per entry in `userStories[]`, linked to the Feature.
4. **Creates** a Task work item per entry in each user story's `tasks[]`, linked to the User Story.
5. **Links predecessors** (`dependsOn` arrays) as `System.LinkTypes.Dependency-Reverse` relations in a second pass.
6. **Persists work item IDs** back into the JSON (`devops.featureId` and `devops.mapping`) so subsequent runs are idempotent: existing items are updated, not duplicated.

The CLI supports three modes: `push all`, `push one`, and `push step-by-step` (prompts before each work item, with skip/stop options). All three support **dry-run** (default: on).

## Setup

```bash
cd tools/devops-push
npm install
cp .env.example .env
# Fill .env with your org, project, PAT, iteration path, area path
```

Then run:

```bash
npm start
# or
node src/cli.js
```

The CLI auto-detects sprints under `docs/sprints/Sprint-*/tasks/`.

## Configuration

### `.env`

| Variable | Description |
|----------|-------------|
| `AZURE_DEVOPS_ORG` | Organization URL, e.g. `https://dev.azure.com/my-org` |
| `AZURE_DEVOPS_PROJECT` | Project name (URL-encode spaces: `My%20Project`) |
| `AZURE_DEVOPS_PAT` | Personal Access Token — scopes: **Work Items (Read & Write)** |
| `AZURE_DEVOPS_ITERATION_PATH` | Iteration path, e.g. `My Project\Sprint 5` |
| `AZURE_DEVOPS_AREA_PATH` | Area path, e.g. `My Project` |
| `SPRINT_WORKSPACE` (optional) | Override the default `<repo>/docs/sprints` root |
| `EXPORT_DIR` (optional) | Override the default `<sprint>/export` directory |
| `TEMP_DIR` (optional) | Override the default `tools/devops-push/.temp` directory |

**Never commit `.env`** — it is excluded by `.gitignore`.

### `config/developers.json`

Team roster used to **validate** the `assignedTo` field of each task. The file ships with neutral example entries — replace with your own:

```json
{
  "developers": [
    {
      "name": "Alice Example",
      "email": "alice.example@example.com",
      "team": "Example Team",
      "skills": ["BE", "BFF", "DB", "Infra"]
    }
  ]
}
```

If a task's `assignedTo` email is not found in this file, validation fails.

## Input JSON — task breakdown schema

Each sprint holds one or more `<taskSetId>-tasks.json` files under `docs/sprints/Sprint-<N>/tasks/`. The formal schema is `config/tasks-schema.json`. Key fields:

- `taskSetId`, `sprint`, `generatedDate`, `globalConfidence`, `dependencies`
- `feature` — `title`, `description` (HTML), `storyPoints`, `tags`
- `userStories[]` — `id`, `title`, `description` (HTML), `acceptanceCriteria` (HTML), `storyPoints`, `dependsOn[]`
  - `tasks[]` — `id`, `title`, `description` (HTML), `category`, `originalEstimate` (hours), `assignedTo` (email), `confidence`, `dependsOn[]`
- `devops` — `epicId`, `featureId`, `mapping` (local id → Azure DevOps work item id, populated after push)

## Output / state locations

The tool writes to three well-defined locations:

| Location | Purpose | Git-tracked? |
|----------|---------|---------------|
| `docs/sprints/Sprint-<N>/tasks/<id>-tasks.json` | **Back-written** with created Azure DevOps IDs (`devops.featureId`, `devops.mapping`). Required for idempotency. | Yes |
| `docs/sprints/Sprint-<N>/export/devops-push-<YYYY-MM-DD>[-dryrun].md` | Human-readable audit trail of what was created / updated / linked, one file per day per mode. | Yes |
| `tools/devops-push/.temp/devops-api.log` | Transient HTTP log (every REST request / response, truncated). | No (git-ignored) |

No global home directories are used. No state outside the repo.

## Relation to the `spec-to-workitem` skill

The [`spec-to-workitem`](../../docs/.) skill (shipped under `.claude/skills/` / `.github/copilot/`) is the **high-level, tracker-agnostic** bridge between the NONoise sprint manifest and any external tracker (GitHub Issues, Azure DevOps, Jira, Linear). It works with a canonical `WorkItem` shape and pluggable adapters.

This CLI (`devops-push`) is **narrower and lower-level**: it is the Azure-DevOps-specific executable for users who want (a) a rich JSON breakdown (Feature → User Story → Task with hours, assignments, dependencies) that exceeds the manifest's vertical-slice macro tasks, and (b) a local interactive, step-by-step control over what is created. The skill produces macro tasks; this tool can be fed a more granular decomposition authored or generated separately.

In practice:

- **Use `spec-to-workitem`** if you want to push the sprint manifest's macro tasks to any tracker with the default dry-run safety.
- **Use `devops-push`** if you're on Azure DevOps, want a hierarchical Feature/US/Task push with hour-level estimates, developer assignments, and predecessor links, and have a JSON breakdown already prepared.

Both tools are idempotent by design and both support dry-run.

## Extending to other trackers

This tool is **not** designed as a multi-tracker abstraction — the mapper and API wrapper are intentionally Azure-DevOps-specific. The recommended extension path:

- For **GitHub Issues / Jira / Linear**, use the `spec-to-workitem` skill and implement a new adapter under `packages/skills/spec-to-workitem/references/adapter-<tracker>.md`. The skill already defines the canonical `WorkItem` shape and the four-operation contract (`create_item`, `list_items`, `update_item`, `search_by_external_id`).
- For a thicker, Azure-DevOps-like hierarchical push to a different tracker, fork this tool or wrap it behind the same adapter pattern. The core files to generalize would be `src/mapper.js` (field translation) and `src/devops-api.js` (HTTP client). `src/sync.js` and `src/cli.js` are already tracker-neutral in structure.

## Commands summary

```
1. Validate all task breakdowns in a sprint
2. Validate a single task breakdown
3. Push all task breakdowns to Azure DevOps
4. Push a single task breakdown
5. Push step-by-step (one work item at a time)
6. Sprint summary
7. Exit
```

All push commands:
- Pre-validate the target task breakdowns.
- Ask for the parent **Epic ID** on Azure DevOps.
- Default to **dry-run** (explicit confirmation required to push live).
- Write a report under `docs/sprints/Sprint-<N>/export/`.
