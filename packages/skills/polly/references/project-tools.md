# Polly — project tools (bundled executables)

Distinct from **skills** (markdown instructions that guide the AI) and
from **external tools** (`external-tools.md` — claude-mem, VibeKanban,
etc.), **project tools** are Node.js / shell executables that the
scaffold drops physically into the project under `tools/` and
`scripts/`. Polly knows about them, mentions them at the right moment,
and knows which skill invokes them in practice.

Polly **never runs these tools directly**: it explains what they do,
when they help, and lets the user (or the skill that owns the call)
launch them.

## Detection

Before mentioning a tool, Polly verifies the folder exists in the
workspace. Do not trust the list blindly — the project may have removed
or renamed them:

| Tool | Expected path | Present in |
|---|---|---|
| `md-extractor` | `tools/md-extractor/extract.js` | single-project + multi-repo |
| `devops-push` | `tools/devops-push/src/cli.js` | single-project + multi-repo |
| `clone-all` | `scripts/clone-all.sh` + `.ps1` | multi-repo only |
| `switch-branch` | `scripts/switch-branch.sh` + `.ps1` | multi-repo only |
| `pull-all` | `scripts/pull-all.sh` + `.ps1` | multi-repo only |

If the path does not exist, do not mention the tool — or propose
`skill-finder` to reinstall it (see `fallback-messages.md`).

## 1. `tools/md-extractor` — PDF/DOCX/images → Markdown

**What it does.** Converts documents (`.pdf`, `.docx`, `.jpg`, `.jpeg`,
`.png`) into structured Markdown via LlamaCloud (tier `agentic`),
extracting embedded images into a sibling `<basename>-assets/` folder
and rewriting the Markdown image references to point at that folder.

**Why it exists.** The sibling `.md` is the de-facto contract with the
downstream skills:
- `graphify` indexes the `.md`, not the `.pdf`
- `reverse-engineering` looks for a sibling `.md` next to every `.pdf`
  under `docs/support/reverse/<subject>/.meta/raw/`
- `requirements-ingest` consumes `docs/requirements/<domain>/sources/*.md`

**When Polly mentions it:**
- During Step 2.2 / 3.4 ("existing source material?") if the user
  names PDFs, DOCX, scanned specs, contracts, or briefs saved as PDF
- During brownfield Step 3.2 if there are legacy PDF documents that
  need to be indexed by `graphify`
- Any time the conversation mentions "I have a PDF with the specs"

**Sample line Polly can say (EN):**

> Got PDFs or DOCX? Before passing them to `requirements-ingest` or
> `graphify`, run `tools/md-extractor` — it extracts the content into
> Markdown (+ images) next to the original. The downstream skills read
> that `.md`, not the PDF. Needs `LLAMA_CLOUD_API_KEY` (the tool asks
> if missing). Command: `node tools/md-extractor/extract.js <path>`.

Italian adaptation:

> Hai documenti in PDF/DOCX? Prima di passarli a `requirements-ingest`
> o a `graphify`, lancia `tools/md-extractor` — estrae in Markdown
> (+ immagini) accanto al file originale. Le skill a valle leggono quel
> `.md`, non il PDF. Serve `LLAMA_CLOUD_API_KEY` (il tool la chiede se
> manca). Comando: `node tools/md-extractor/extract.js <path>`.

**Prerequisites:** Node.js + LlamaCloud account. `npm install` inside
the folder the first time.

## 2. `tools/devops-push` — sprint → Azure DevOps

**What it does.** Interactive CLI that reads
`docs/sprints/Sprint-<N>/tasks/<id>-tasks.json` (produced by
`sprint-manifest`) and pushes the `Feature > User Story > Task`
hierarchy to Azure DevOps via the REST API. Persists work-item IDs
into the JSON for idempotency. Supports `push all` / `push one` /
`push step-by-step` + dry-run (default on).

**Why it exists.** `spec-to-workitem` is the skill that *decides what
to push* (can target Jira, GitHub Issues, Linear, etc.), but for Azure
DevOps the actual push needs a client that speaks the REST API,
handles JSON Patch, maps `Microsoft.VSTS.Scheduling.*`, and wires
dependencies via `System.LinkTypes.Dependency-Reverse`. That client is
`devops-push`.

**When Polly mentions it:**
- After a completed `sprint-manifest`, if the user's declared target is
  Azure DevOps
- When the user says "push to Azure DevOps" / "sync with ADO" / "create
  the work items in DevOps"
- As the *recommended tool* called out by the `spec-to-workitem` skill
  when the target is ADO (other targets use different paths)

**Sample line Polly can say (EN):**

> For Azure DevOps there's `tools/devops-push`: it reads the tasks
> JSON that `sprint-manifest` produced under
> `docs/sprints/Sprint-<N>/tasks/` and creates the Feature → User
> Story → Task hierarchy, with dependencies and idempotency. Setup:
> `.env` with org / project / PAT / iteration path, then `npm start`.
> Default is dry-run — disable it when you're ready.

**Prerequisites:** Node.js + Azure DevOps PAT with scope *Work Items
(R&W)* + a filled `tools/devops-push/.env`.

## 3. Multi-repo scripts (`scripts/*.sh` + `.ps1`)

Multi-repo workspaces only. They read `repositories.json` at the
workspace root.

### `clone-all`
Clones every sub-repo marked `active` into `repos/<path>/`.
Idempotent: skips if already present.

**When:** after the user has filled `repositories.json` for the first
time, or at the start of a fresh checkout on a new machine.

### `switch-branch <branch>`
Checks out `<branch>` across all `active` sub-repos. Creates the branch
if missing. Key for making VibeKanban treat the workspace as a single
unit during triage.

**When:** to align all sub-repos on a shared feature branch (e.g. a
sprint that spans frontend + backend + infra) or to reproduce a past
state.

### `pull-all`
`git pull --ff-only` across all `active` sub-repos.

**When:** at the start of each working session in a multi-repo
workspace, so local state is never taken for granted.

**Polly mentions them:**
- At Step 1.5 (multi-repo detection) if `repos/` is still empty
- When the user says "align all repos on branch X" / "clone
  everything" / "update the sub-repos"

## Rules

- **Never auto-execute.** Polly explains; the user runs (or the skill
  that owns the call runs it explicitly).
- **Never one line more than needed.** A tool gets mentioned when the
  context matches; don't dump the whole list every time.
- **Never on the first turn.** The intro is not the place for these
  pointers — they belong at the relevant step, or in the menu.
- **Respect detection.** If the tool's folder does not exist, do not
  say it exists. Offer `skill-finder` or a manual reinstall from the
  template instead.
- **One tool per session.** If the user already heard about
  `md-extractor` earlier in the session, don't re-describe it on the
  next occasion — the name and the command are enough.

## Relationship with skills

| Tool | Skills that drive / benefit from it |
|---|---|
| `md-extractor` | `requirements-ingest`, `reverse-engineering`, `graphify-setup` |
| `devops-push` | `spec-to-workitem` (for Azure DevOps targets) |
| `clone-all` / `switch-branch` / `pull-all` | No skill — workspace infrastructure for multi-repo |

The skills already know about these tools in their own references (see
e.g. `reverse-engineering` § "PDFs in .meta/raw/"). Polly is the
conductor that reminds the user of the staging before entering the
skill.
