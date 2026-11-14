---
name: reverse-engineering
description: Produces and incrementally maintains a versioned reverse-engineering dossier for a subject — a legacy codebase, a microservice, a third-party API, an internal library, a data pipeline. Output is markdown chapters under `docs/support/reverse/<subject-slug>/`, combining project documents (sprint inputs, meeting notes, functional specs) with the subject's code/artifacts indexed in the codebase-memory-mcp code graph. Flow — (1) code-graph indexing loads context only, (2) long-running interactive Q&A on graph and source, (3) explicit save trigger ("save", "ok write it", "make v1.5") bumps minor version, updates only chapters in the consolidated intent, appends a changelog entry. Triggers — "reverse-engineer X", "document legacy Y", "build a dossier on vendor Z's API", "refresh the reverse on <subject>", "new version of the reverse", or mention of a path under `docs/support/reverse/` in an update context. Do NOT use for one-shot graph queries or single-chapter manual edits.
source: Risko reference-project (reworked whitelabel for NONoise)
variant: nonoise generic; stack-neutral; output under docs/support/reverse/<subject-slug>/
---

# reverse-engineering — versioned reverse dossier for any subject

This skill maintains a **reverse-engineering dossier** for a named subject under:

```
docs/support/reverse/<subject-slug>/
├── 00-overview.md
├── 01-<chapter>.md
├── 02-<chapter>.md
├── ...
├── CHANGELOG.md                 ← versioned history, newest on top
└── .meta/
    └── code-graph-index.json    ← pointer to the subject's graph (not versioned content)
```

A subject is anything worth a dedicated dossier: a **legacy codebase** you're porting, a **current microservice** you need to document, a **vendor API** you're integrating, an **internal library** inherited from another team, a **data pipeline**, a **monolith module** being extracted. The methodology applies equally to legacy-understanding and to current-system documentation — the same chapters, the same workflow, the same versioning.

`<subject-slug>` is free-form kebab-case. Examples:
- `legacy-billing` — an old billing system being decommissioned
- `vendor-stripe-api` — a third-party API you depend on
- `microservice-payments` — a current service whose behavior is tribal knowledge
- `library-internal-orm` — an internal library inherited from another team
- `monolith-inventory` — a module in an existing monolith being extracted

The output is a **minor-version bump** of the dossier (v1.N → v1.N+1) each time you save: only the chapters impacted by the current intent are rewritten, plus one new entry at the top of `CHANGELOG.md`. Everything else stays byte-identical — git diffs stay review-able.

## Guiding principles

1. **Incremental, not one-shot**. The dossier evolves over many sessions. We never rewrite from scratch; we edit the minimum subset of chapters implied by the user's intent.
2. **Never write on our own initiative**. Indexing and analysis happen freely in chat, but the target folder is **not touched** until the user says "save" (or equivalent). A reverse session can run for hours and produce dozens of scratch drafts — most are discarded; only the final consolidated result reaches disk.
3. **The code graph is context, not output**. The knowledge graph built by `codebase-memory-mcp` is consumed to answer questions during the loop; it is not re-indexed on save and it is not copied into the dossier.
4. **Source documents are read-only**. Project inputs (sprint docs, meeting notes, research PDFs, code) are sources. The dossier is a derived artifact. Don't write back.

## When to use this skill

Activate when the user says (either language of the project):

- "reverse-engineer X" / "build a reverse on X" / "document X"
- "refresh/update/regenerate the reverse of <subject>"
- "new version of the dossier on <subject>"
- "add what emerged from <meeting/PRD/spec> to the reverse of <subject>"
- "we have a new BR/spec/note, update the reverse"
- "let me walk through <subject> with you, then we save"
- mentions a path under `docs/support/reverse/<subject>/` in an update context

**Do not activate** for:

- Ad-hoc questions on the graph ("how does X work in the legacy?") → route to the `codebase-memory` skill (`search_graph`, `trace_path`)
- Single-chapter manual edit outside a version bump → use `Edit` directly
- Pure indexing of a repository with no dossier production → use `/index` or `index_repository` (`codebase-memory` skill)

## Working language

Follow the project's working language. Resolution order:
1. If `nonoise.config.json` has a top-level `language` key, use it.
2. Else, infer from the existing dossier (if `00-overview.md` is written in French, continue in French).
3. Else, default to **English**.

Terminology and chapter titles should match whatever language the dossier already uses. Do not switch language mid-version.

## Position in the workflow

The reverse-engineering skill does **not** belong to the "architectural" workflow (`arch-brainstorm` → `arch-decision` → `sprint-manifest` → `atr`). It is an **investigative / documentary** skill that feeds *into* the others:

```
┌─────────────────────┐   feeds context   ┌──────────────────┐
│ reverse-engineering │ ───────────────▶  │ arch-brainstorm  │
│ (THIS SKILL)        │   (the dossier    │ arch-decision    │
│                     │    becomes a      │ sprint-manifest  │
│ produces a dossier  │    reference      │                  │
│ under docs/support/ │    during         │                  │
│ reverse/<subject>/  │    planning)      │                  │
└─────────────────────┘                   └──────────────────┘
```

The dossier lives in `docs/support/` — the NONoise convention for research / supporting docs / legacy analysis / anything that informs decisions without being a decision itself.

---

## REA artifact routing

Before checking code-graph prerequisites, inspect the supplied target. For .NET
`.dll`/`.exe` without `.csproj` or source, `app.asar`/Electron applications,
`.har`/`.saz` traffic captures, SQLite databases, APKs, native binaries, firmware,
or “how does this app/site work without code?”, route to `rea-setup` when the
project has no REA registration. It explains why REA helps and obtains one
combined installation/target-authorization confirmation before any install.
When REA is already configured and connected, invoke `reverse-engineer-anything`
directly within the authorized scope; do not repeat activation consent. An
existing registration without connected tools needs restart/reconnection or
client approval, not repeated installation.

For artifact-only investigations, REA Evidence replaces the source-graph input:
use the relevant shipped-artifact tools, retain evidence IDs/paths, limitations,
and unknowns. Do not send raw executables, captures or databases to the code
graph or block this path on `codebase-memory-mcp` availability. Apply the
code-graph prerequisites and indexing steps only to actual source/document
inputs when those are present. Keep `.meta/code-graph-index.json` accurate: no
REA result counts as an indexed source graph; record a source-less run when
source indexing did not occur.
This route changes evidence collection only: retain the explicit save boundary,
read-only target handling, incremental chapters and dossier versioning below.
For ordinary repositories with complete source, keep the code-graph workflow;
REA is optional and should not be installed merely because a repo is old.

## Brownfield support from the ECC snapshot

Read `.nonoise/ecc/index.md` to discover installed support. During initial analysis, use `spec-miner` to extract evidence-backed behavior into `docs/architecture/specs/<capability>/spec.md` and `inherit-legacy-style` to record real code conventions before proposing changes. Preserve the dossier's incremental update rules and link these artifacts instead of copying them into a second lifecycle system.

When changing an existing module, use `module-regression` to capture affected consumers and executable acceptance commands. Use `brownfield-retrospective` when the task includes reassessing historical choices; send architectural decisions through `arch-decision`, which runs Haft only when its FPF gate fires. For discovery alone, stop at the requested analysis. These capabilities do not authorize implementation or hooks.

## Flow — 7 steps

- **Step 0** — prerequisites
- **Step 1** — collect input (subject slug, source folders)
- **Step 2** — code-graph indexing (loads context only)
- **Step 3** — interactive analysis loop (the heart — user-driven, no writes)
- **Step 4** — explicit save trigger + current-version read
- **Step 5** — regeneration of impacted chapters (only after save)
- **Step 6** — metadata + CHANGELOG update + summary

Steps 0–3 are linear. Steps 4–6 fire **only** when the user utters a save phrase (see 4.1). Hours and dozens of Q&A rounds can pass between Step 3 and Step 4 — that is normal.

### Step 0 — Prerequisites

**0.1 — code graph reachable (`codebase-memory-mcp`)**

The graph is built and queried by the `codebase-memory-mcp` MCP server (sibling skill [`codebase-memory`](../codebase-memory/SKILL.md)). Indexing is deterministic — no LLM pass, no API key — and the index lives in `~/.cache/codebase-memory-mcp/`, outside the repository.

**Check A — MCP tools connected**

If the tools `list_projects` / `search_graph` are available, the server is connected. Call `list_projects` and keep the result for Q4.

**Check B — CLI fallback**

If the MCP tools are **not** available (host without MCP, server not yet approved, session not restarted), the CLI runs the same tools:

```bash
codebase-memory-mcp cli list_projects >/dev/null 2>&1 && echo "CLI_OK" || echo "CLI_MISSING"
```

On `CLI_OK`, run every graph call in this skill as `codebase-memory-mcp cli <tool>` (`codebase-memory-mcp cli <tool> --help` lists the flags) and tell the user once that you are on the CLI path.

**If both checks fail:**

> `codebase-memory-mcp` is not available in this project. It's normally installed at scaffold time by `create-nonoise`. Re-run the code-graph-only mode (idempotent, safe on existing projects), then check the result:
>
> ```
> create-nonoise --code-graph-only .
> create-nonoise doctor .
> ```
>
> Then restart the AI tool and approve the project MCP server. Can't proceed without the code graph — re-run me once it's available.

Then stop. Do not carry on as if the graph had been consulted.

**0.2 — Local developer config**

Paths to external/legacy repos are developer-specific. Read them from `.reverse-engineering.local.json` at repo root.

```bash
test -f .reverse-engineering.local.json && cat .reverse-engineering.local.json || echo "MISSING"
```

Expected structure (see `references/config.example.json`):

```json
{
  "subjects": {
    "legacy-billing": {
      "source_path": "C:\\path\\to\\legacy-billing",
      "last_run": "2026-04-15T10:00:00Z",
      "last_source_indexed": "docs/sprints/Sprint-3"
    }
  }
}
```

If the file is missing, create it empty (`{ "subjects": {} }`) and **add it to `.gitignore`** if it's not already there:

```bash
grep -q "^.reverse-engineering.local.json$" .gitignore 2>/dev/null || echo ".reverse-engineering.local.json" >> .gitignore
```

This file holds machine-local paths and must never be committed.

**0.3 — Destination root exists**

```bash
test -d "docs/support/reverse" || mkdir -p "docs/support/reverse"
```

The per-subject folder (`docs/support/reverse/<subject-slug>/`) is created on first save, not here.

### Step 1 — Input collection (pre-indexing)

Collect **only** what is needed to index. Do **not** ask about chapter scope here — that emerges during Step 3.

**Q1 — Subject slug**

> **Q1**: Which subject are we working on? Give me a short kebab-case name (e.g. `legacy-billing`, `vendor-stripe-api`, `microservice-payments`).
>
> If a folder `docs/support/reverse/<slug>/` already exists, we'll update that dossier. Otherwise we start a new one.

Validate: must match `^[a-z0-9][a-z0-9-]*$`. No slashes, no spaces, no uppercase.

Check existence:
```bash
test -d "docs/support/reverse/<slug>" && echo "UPDATE" || echo "NEW"
```

If `NEW`, confirm with the user that they want to create a fresh dossier — first-time generation usually needs a larger initial pass than an incremental update.

**Q2 — Project document folders to index**

These are the **non-code** sources: sprint inputs, meeting notes, business analysis calls, functional specs, requirements, research. Default suggestion:

```bash
# Most recent sprint folder, if any
ls docs/sprints/ 2>/dev/null | grep -E "^Sprint-[0-9]+$" | sort -V | tail -1
```

Ask:

> **Q2**: Which folders contain the project documents to feed the reverse?
>
> Suggested default: `docs/sprints/<most-recent>/`.
>
> You can accept, change it, or pass multiple comma-separated (e.g. `docs/requirements/billing, docs/calls/2026-04-10-billing-kickoff`). Typical sources in NONoise projects are under `docs/sprints/`, `docs/requirements/`, `docs/calls/`, `docs/support/`.

**Guard — hard rule**: reject any path that **is** or **contains** `docs/support/reverse/<slug>` — the destination is never a source:

> Can't index `docs/support/reverse/<slug>/` — it's the output folder, not a source. Pick a different path.

**Q3 — Subject source (code / artifact repo)**

Ask:

> **Q3**: Where is the subject's source (code, artifacts, whatever we are reverse-engineering)? Examples:
> - legacy repo: `C:\...\legacy-billing`
> - a folder inside this repo: `services/payments`
> - a vendor-api spec folder: `docs/support/vendor-stripe-api/openapi`
>
> ⚠️ **Source indexing is essential for this skill.** A document-only reverse produces source-less chapters for everything touching internals, data model, and main flows — those become stubs with open points instead of analysis.
>
> If you truly have no source (pure vendor-spec case), type exactly `skip-no-source`. I'll ask for explicit confirmation before accepting.

If the user provides a path, store/update it under `.reverse-engineering.local.json → subjects.<slug>.source_path` and validate it exists.

If the user types `skip-no-source`, ask the confirmation prompt immediately:

> You chose **document-only mode**. The dossier will be partial: internals-, data-model-, and main-flow-style chapters will be stubs flagged as "source not indexed". This is appropriate only when no source exists (pure vendor/spec reverse).
>
> Confirm? Type `yes` to proceed without source. Anything else returns to Q3.

Only a literal `yes` (case-insensitive) moves forward. Any other response (including empty) returns to Q3. When the user confirms, set the in-run flag `source_less_run = true` (used later in Step 2.4 and Step 6).

**Q4 — Reuse or re-index the subject's graph?**

If the user already confirmed `source_less_run` at Q3, skip Q4 entirely — there's nothing to reuse or reindex.

Otherwise check graph presence: look in the `list_projects` result (Step 0.1) for a project rooted at `<source_path>` — or, when `<source_path>` is a folder inside this repository, for this repository's own project. Found → `EXISTS`; not found → `MISSING`.

**Freshness check** (when `EXISTS`): a subject inside this repository is
kept in sync by the server while a session is open — treat it as fresh. A
subject source outside this repository can move between sessions: read
`source_graph.indexed_at` from
`docs/support/reverse/<slug>/.meta/code-graph-index.json` if a previous run
wrote it, else ask `index_status` for the project. If neither gives a date,
treat the graph as stale. Compute age in days. Read
`reverse.graph_freshness_days` from `nonoise.config.json`; default `30`.

**Case EXISTS, fresh** (age ≤ threshold):
> **Q4**: The code graph for `<source_path>` is fresh — indexed N days ago. Reuse it as-is, or re-index to pick up any changes? Default: **reuse**. Type `reindex` to force.

**Case EXISTS, stale** (age > threshold):
> **Q4**: The code graph for `<source_path>` was last indexed **N days ago** (threshold: T days). If the codebase has moved since, a stale graph can mislead the reverse.
>
> **Recommended: reindex.** Press Enter (or type `reindex`) to rebuild, or type `reuse` to keep the old graph anyway.

Default flips from `reuse` to `reindex` in this case — empty input = reindex.

**Case MISSING** (first time for this subject):
> **Q4**: `<source_path>` is not indexed in the code graph yet. **Indexing is essential** — without it, chapters that depend on source become source-less stubs.
>
> Proceed? (`yes` / `skip-no-source`) — indexing runs once and can take a while on very large codebases.

If the user types `skip-no-source` here, run the same explicit confirmation prompt used in Q3:

> You chose **document-only mode**. Confirm? Type `yes` to proceed without source. Anything else returns to Q4.

Only `yes` sets `source_less_run = true` and moves on.

**Pre-indexing summary**

Print a terse recap — **do not** mention a target version or chapter intent (those surface only after the loop):

> **Indexing plan:**
> - Subject: `<slug>` — status: NEW / UPDATE
> - Document folders: `<q2 paths>`
> - Subject source: `<q3 path or skipped>` — mode: reuse / reindex / initial
> - Current dossier version (reference): v1.N (or "first version")
>
> Proceeding will load context only. I will not write anything under `docs/support/reverse/<slug>/` until you explicitly say "save" (or equivalent). Go? (yes/no)

### Step 2 — code-graph indexing

Indexing goes through `index_repository` (see the `codebase-memory` skill). It parses code structurally and indexes Markdown / reST / AsciiDoc sections, linking them to the code they mention (`MENTIONS` edges). It is deterministic: no LLM pass, no API key, no output folder inside the repository. Index each project once, then query.

**2.0 — Only indexable content — hard rule**

The graph must see **useful text only**. Before indexing, filter:

- **Raw PDFs**: the convention in NONoise projects is to convert PDFs to markdown upstream (a `tools/md-extractor` or equivalent produces a sibling `.md` with extracted images). If you find a `.pdf`:
  1. If a sibling `.md` exists → the `.md` is the canonical source; the `.pdf` is ignored.
  2. If not → **block the skill** and tell the user: *"File `<name>.pdf` has no markdown sibling. Convert it (e.g. via `tools/md-extractor` if the project ships one) before re-running the reverse. I don't index raw PDFs: the code graph indexes Markdown, not PDF."*
- **PDF-conversion artifact folders** (`*/page_N_image_M.jpg`, chart dumps, etc.): exclude any folder whose files are >80% `page_*_image_*` or `page_*_chart_*` noise.
- **`docs/support/reverse/<slug>/`**: destination, never input (see 2.3).
- **`.docx` / `.xlsx`**: not indexed. Tell the user to convert them to `.md` first (`tools/md-extractor` handles `.docx` when the project ships it).

Exclusions are expressed in `.cbmignore` (gitignore syntax) at the root of the repository being indexed. In this project, show the user the missing lines and add them once they agree. In an external subject source, write nothing (Hard rule #9): show the user the lines to add. Either way, if they decline, ignore results from those paths during the loop.

**Textual formats the graph does not index as documentation** — read them directly:

- `.srt` / `.vtt` — subtitle / meeting-transcript files. The timing markers are noise; the text is valuable. Read them with `Read` / `Grep` during the loop; do not convert or rewrite them.
- Other textual formats outside Markdown / reST / AsciiDoc (`.org`, plain `.txt` notes) — same pattern.

**Legacy code — check coverage, then read as prose what the graph lacks.** The indexer parses many legacy languages structurally (COBOL, Fortran, Pascal, PL/SQL, NASM assembly among them), but not all: RPG `.rpg` / `.rpgle`, JCL `.jcl`, PL/I `.pli` / `.pl1`, ABAP `.abap` and dialects such as CLIST, REXX, NATURAL and Easytrieve have no parser. After indexing a legacy subject, run `check_index_coverage` on it before assuming anything. Where coverage is missing, the graph holds no structure for those files. Don't go hunting for parsers: read the files directly (`Read`, `Grep`) and extract programs, paragraphs, `PERFORM`/`CALL` targets, copybook references, file/dataset names, data definitions and so on from the text — for those languages that is the *correct* approach. A non-standard extension of a supported language can be mapped in `.codebase-memory.json` (`extra_extensions`).

When the **subject source** (Q3) is mostly legacy code, tell the user which extensions the graph does not cover, so they understand why the graph is thin or empty there. Per-project tuning (`.cbmignore`, extra file extensions in `.codebase-memory.json`) is described in the `codebase-memory` skill.

After filtering, show the user the final list of paths to index and the exclusions.

**PDF note** (print once per run when you detect raw PDFs):

> **PDF note**: NONoise projects typically convert PDFs to markdown via a project-local tool (e.g. `tools/md-extractor`). The sibling `.md` is the canonical indexable source: the code graph only reads a PDF's text layer (no OCR, no diagrams or tables), so a raw PDF is a poor substitute. If your project has a different convention, wire it up and re-run.

**2.1 — Document folders** (from Q2)

Document folders inside this repository belong to this repository's project — there is no per-folder graph. Check `list_projects`:

- This repository is **not listed** → `index_repository` with `repo_path` = the absolute project root (first build).
- This repository is **listed** → **reuse**. If the intent suggests new material ("new", "added", "update", "changed") and that material does not show up in `search_graph` yet, run `index_repository` again on the same `repo_path`.
- A document folder **outside** this repository → index it as its own project: `index_repository` with `repo_path` = that folder's absolute path.

Quote paths — they can contain spaces. Note the project name `list_projects` reports for each path: later queries are scoped to it.

**2.2 — Subject source** (from Q3/Q4)

- `reuse` → nothing to do.
- `reindex` → `index_repository` again on the same `repo_path`.
- `initial` → `index_repository` with `repo_path` = the absolute `<source_path>`. For a very large repository start with `mode: "fast"`. When `<source_path>` is a folder inside this repository it is already covered by this repository's project from 2.1 — do not index it twice.
- skipped → no source graph (some chapters will be source-less; warn the user).

After completion, verify the index actually covers the subject: `check_index_coverage` (or `index_status`) for the project, then one `get_architecture` call. A near-empty result on a subject that clearly has code means the source is in a language or layout the indexer does not cover (see 2.0). Surface this to the user — do not carry on as if the graph were complete.

Large codebases can take a while — `index_status` shows where indexing is. Index once; do not re-index during the loop.

**2.3 — Anti-destination guard**

Before every `index_repository` call, verify the target path is not `docs/support/reverse/<slug>` and is not contained in it. If it resolves there, abort:

> Defensive abort: this skill is about to index `docs/support/reverse/<slug>/` which is the output folder. Never do that. Please re-check the paths you gave in Q2/Q3.

When the target *contains* the destination — the normal case when this repository's root is indexed — make sure `.cbmignore` at the project root lists `docs/support/reverse/<slug>/` before indexing, and discard any graph result whose path falls under that folder. The existing dossier is read with `Read`, for context only (3.2), never through the graph.

Q1/Q2 already filter — this is the safety net.

**2.4 — Persist graph pointer**

After successful indexing, write/refresh `docs/support/reverse/<slug>/.meta/code-graph-index.json` (creating the folder if needed — the parent `<slug>` folder may not exist yet if this is a NEW subject):

```json
{
  "subject": "<slug>",
  "document_graphs": [
    { "path": "<q2-path-1>", "project": "<project name>", "indexed_at": "<iso>" },
    { "path": "<q2-path-2>", "project": "<project name>", "indexed_at": "<iso>" }
  ],
  "source_graph": { "path": "<source_path>", "project": "<project name>", "indexed_at": "<iso>" },
  "source_less_run": false,
  "updated_at": "<iso>"
}
```

`project` is the name `list_projects` reports for that path. `indexed_at` is when this skill last ran `index_repository` for it; on `reuse`, keep the previous value (`null` if there is none). The graph itself stays in `~/.cache/codebase-memory-mcp/` — this file only points at it.

When the in-run flag `source_less_run` (set by Q3 or Q4 confirmation) is
`true`, write `"source_graph": null` and `"source_less_run": true`. This
file is read by Step 6 on save to decide whether to emit the overview
banner and the CHANGELOG warning.

This file is the only one the skill may create before a save trigger. It's metadata, not content — no chapter ever lives in `.meta/`. Add `.meta/` to a project `.gitignore` if the user prefers to keep the pointer local (it can hold machine-specific paths); the decision is the user's.

### Step 3 — Interactive analysis loop (the heart)

Once indexing is done, **do not write anything**. Open the loop.

**3.1 — Post-indexing summary**

Show concisely, in markdown, from `get_architecture` (one call per indexed project):

- languages and packages, plus node / edge counts where `list_projects` reports them
- entry points and HTTP routes
- top 10 **hotspots** (the most connected, most central symbols)
- the main **clusters**, with one line on what each seems to be about
- 4-5 **Suggested Questions** the graph is well placed to answer for this subject

Then open the loop with a question:

> What do you want to analyze? You can ask me to find where something lives (`search_graph`), trace who calls what (`trace_path`), read a symbol (`get_code_snippet`), compare scenarios, inspect the subject source, read specific passages from the documents, or ask thematic syntheses. When the discussion produces a result you want to freeze into the dossier, say **"save"** (or equivalent) and we'll move to writing. Until then, nothing changes in `docs/support/reverse/<slug>/`.

**3.2 — Behavior during the loop**

- **Answer** using: the indexed graphs, the subject source (via its graph or direct inspection), the document folders, the current dossier chapters (read-only for context).
- **Show drafts in chat**, never on disk. If the user says "draft this chapter so I can see", reply with the markdown in chat — do not write the file.
- **Track mentally** which points the user seems happy to freeze. When the save trigger fires, you'll use that trail to derive the scope.
- **Do not propose a save on your own.** The user may want to iterate more. At most, occasionally and softly note "this draft is ready whenever you want to save" and leave the decision alone.
- **Do not announce target versions** (v1.5, v1.6) during the loop — that can mislead the user into thinking you're about to write.

**3.3 — Tools allowed in the loop**

- Direct `Read` on source files (chapters, documents, code)
- `search_graph` on any of the indexed projects (`name_pattern` / `label` for structure, `semantic_query` for meaning)
- `trace_path` for call chains and relationships (`mode: "cross_service"` across services)
- `get_code_snippet` / `get_file_outline` for a single symbol or file
- `search_code` for strings and patterns; `query_graph` (read-only openCypher, after `get_graph_schema`) for structural questions the other tools don't cover
- Sub-agents (`general-purpose`) for targeted searches on big folders
- `Grep` / `Glob` on source
- **Transient drafts in chat** (never on file)

**3.4 — Hard guard — no silent writes**

During Step 3, **any `Write` or `Edit` on a path inside `docs/support/reverse/<slug>/` is forbidden** (except `.meta/code-graph-index.json` from 2.4). If you catch yourself thinking "I'll just write chapter NN because I've understood the problem", stop and wait for the explicit trigger.

If a write slips through without a trigger, abort and explain: *"I've prepared these edits as a draft but won't commit them to disk until you say 'save'."*

### Step 4 — Save trigger + current-version read

Step 4 starts **only** when the user utters a save phrase.

**4.1 — Recognizing the save trigger**

Valid triggers (non-exhaustive — use judgement from context):

- "save" / "save it" / "save them"
- "ok, looks good, write it"
- "ok, write v1.5"
- "go to write mode" / "go ahead and persist this"
- "commit it to the reverse" / "push it into the dossier"
- "update the reverse" / "update the dossier"
- "make v1.5" / "bump the version"
- "ok, let's persist this result"

Translations in other working languages count too (e.g. Italian "salva", French "enregistre", Spanish "guarda").

If the message is ambiguous (e.g. "interesting, keep going" — not a save), stay in Step 3.

Once recognized, **confirm out loud** before acting:

> Ok, moving to write mode. Before I touch `docs/support/reverse/<slug>/` I'll show you the scope I plan to save and wait for your green light. (see 4.3)

**4.2 — Current-version read**

If the dossier exists (UPDATE case), read `docs/support/reverse/<slug>/00-overview.md` and look for the frontmatter or header line:

```
**Version**: 1.N
```

Extract `N` as integer. Target version = `1.(N+1)`. Keep both `v_current` and `v_next`.

If the line is missing or malformed, stop and ask the user to fix `00-overview.md` by hand.

If the dossier does not exist (NEW case), target version = **`1.0`**. No previous to read.

**4.3 — Consolidated intent**

Distill, from the Step 3 loop, what was actually discussed and is worth persisting. Show the user for confirmation:

> From the loop I've understood that v<next> should freeze:
>
> 1. [topic 1] — impacts chapters [NN, NN]
> 2. [topic 2] — impacts [NN]
> 3. [new chapter proposed: `NN-<name>.md`]
>
> Confirm this scope? Add, remove, or reshape anything?

If the user corrects, iterate (still in Step 4). On confirmation, move to Step 5.

### Step 5 — Regenerate impacted chapters

This is the writing core. Never rewrite chapters that are not in the consolidated intent.

**5.1 — Chapter scope**

Combine three signals:

1. **User intent** (from 4.3). E.g. "add the retry semantics to the payment flow" → candidate chapters are the ones about payment flow, retries, open points.
2. **Graph delta**. If source or documents changed since the last version, use `detect_changes` on a project under git (it maps the diff to symbols and risk) and `search_graph` on the new material's key terms to see which code and document sections it touches. Map those onto the chapters that cite them.
3. **Temporal delta**. If the user said "everything new in the last 2 days", use `git log --since="2 days ago" --name-only -- <q2-path>` and map each modified file onto the chapters that cite it.

Produce `ChaptersToUpdate = [NN-file.md, ...]` and show for confirmation:

> Based on the intent and the delta I'll update these chapters:
>
> - `NN-<name>.md` — direct intent
> - `NN-<name>.md` — indirect (contains an example of the changed flow)
> - `NN-<name>.md` — adds open point OP-...
>
> Confirm? Add or remove?

Accept corrections before proceeding.

**5.2 — Per-chapter regeneration via sub-agent**

For **each** chapter in `ChaptersToUpdate`, dispatch a sub-agent (`general-purpose`) with a structured prompt:

```
You are a per-chapter regeneration sub-agent for the reverse-engineering
dossier of subject "<slug>" in this project.

## Context

The document `docs/support/reverse/<slug>/<NN-file.md>` is a chapter
of the dossier, currently at version v<current>, moving to v<next>.

## Current chapter content (preserve what's still valid)

<full content read from the file>

## User intent for the new version

"<the user's verbatim message(s) that form the consolidated intent>"

## Available sources

1. **Project documents** under <list of Q2 paths>:
   indexed in the codebase-memory-mcp project(s) <project names>
2. **Subject source** at <source_path> (if provided):
   - codebase-memory-mcp project <project name> — query it with the
     `codebase-memory` skill's tools (`get_architecture`, `search_graph`,
     `trace_path`, `get_code_snippet`)
   - raw source code/artifacts under <source_path>
3. **Other chapters of this dossier** (cross-reference, read-only):
   `docs/support/reverse/<slug>/` (all `NN-*.md`)

## Source availability

<source_less = true | false>

- `false` → full source graph available; produce an analytic chapter that
  draws directly from code structure, hotspots, and main flows.
- `true` → this is a source-less run. The chapter must be a stub:
  - State clearly at the top that internals-, data-model-, and
    main-flow-level claims are not validated against source.
  - Where a section would need source, write "⚠️ source not indexed
    — to be validated in a future version with subject indexing".
  - Keep document-derived content (requirements, calls, specs) intact.

## Instructions

1. Read the current chapter in full.
2. Identify what changes based on the user intent.
3. Query the graph(s) for objective data where relevant.
4. Read the pertinent source documents / code.
5. Produce a new version of the chapter that:
   - preserves everything still valid
   - updates the parts that changed
   - keeps the style, format, navigation headers
   - updates any cross-references to other chapters
   - adds explicit warning / open-point markers if the intent touches
     decisions not yet validated
6. Write the result to `docs/support/reverse/<slug>/<NN-file.md>`
   (overwrite).

## Constraints

- DO NOT rewrite from scratch if not strictly necessary
- DO NOT modify chapters other than the one assigned
- Preserve the project's working language and domain terminology
- Preserve mermaid diagrams, tables, formulas as-is
- If you find information contradicting the existing chapter, surface it
  explicitly in the text — never silently
- Do not change the file number or title — only the content

## Output

Report back as a JSON block for the parent skill to parse:

    {
      "path": "docs/support/reverse/<slug>/<NN-file.md>",
      "summary": "2-3 sentences on what changed",
      "warnings": ["any warning / validation request to propagate to the CHANGELOG"],
      "source_less": true | false
    }

The `source_less` field MUST be set. If missing, the parent skill treats it as `true` (worst-case assumption) and lists the chapter in the CHANGELOG source-less block.
```

**Parallelism**: if you have more than ~3 chapters, dispatch sub-agents **in parallel** (multiple tool calls in the same message). Chapters are independent (cross-refs are static titles, not dynamic bodies) — parallel is safe.

**5.3 — New chapters**

If the intent implies a new chapter that doesn't exist yet (e.g. "add a chapter on the auth flow"), propose:

> The intent mentions "auth flow" which has no dedicated chapter. I propose:
>
> - filename: `NN-auth-flow.md` (NN = next free number)
> - position: append at the end (no renumbering of existing chapters)
>
> Confirm? Or tell me where to slot it.

**Numbering rule**: always append at the first free number. Never renumber existing chapters — renumbering breaks cross-references and git history.

On confirmation, dispatch a sub-agent analogous to 5.2 but tasked to **create** the chapter from scratch, with navigation headers consistent with siblings.

**5.4 — First-version case (dossier doesn't exist)**

If NEW (4.2 case, target v1.0), the scope is different: there's no current content to preserve. The user in 4.3 must specify which chapters to generate (or accept a proposed initial spine). Minimal default spine:

- `00-overview.md` — subject summary, scope, versioning convention
- `01-context.md` — why this subject, what problem it solves
- `02-entry-points.md` — how the subject is invoked / accessed
- `03-data-model.md` — key entities, relationships, invariants
- `04-main-flows.md` — critical user/system flows
- `99-open-points.md` — assumptions, gaps, things to validate

Adapt the spine to the subject. Dispatch one sub-agent per chapter in parallel with a "generate from scratch" variant of the 5.2 prompt. Always write `00-overview.md` first or last (it references the others).

### Step 6 — Metadata and CHANGELOG

**6.1 — Update `00-overview.md`**

In `docs/support/reverse/<slug>/00-overview.md`, update:

1. `**Version**: 1.N` → `**Version**: 1.(N+1)`
2. `**Date**: <previous date>` → today, in the dossier's language (e.g. `15 April 2026`, `15 aprile 2026`)
3. If new chapters were added in 5.3, update the chapter list / table of contents if the overview includes one.

**Source-less banner** (depends on `source_less_run` from `.meta/code-graph-index.json`):

- If the CURRENT run is source-less → insert (or replace if already present) this managed block immediately after the H1 title:

  ```markdown
  <!-- >>> source-less-warning (managed by reverse-engineering skill) -->
  > ⚠️ **Partial reverse**: this dossier version was produced without subject-source indexing. Chapters covering internals, data model, and main flows are document-derived only. Index the source (`index_repository` on `<source_path>`) and run a new save to upgrade.
  <!-- <<< source-less-warning -->
  ```

- If the current run IS source-indexed AND a managed block with these markers already exists in the file (leftover from a previous source-less run) → remove it. This makes the banner self-clearing on the first save that restores source indexing.

- Marker-delimited — replay-safe; never duplicate.

**Only** `00-overview.md` is touched here. Other chapters' headers are updated by the sub-agents of 5.2/5.3, not by this step.

**6.2 — Update `CHANGELOG.md`**

If `CHANGELOG.md` does not exist (first save), create it with:

```markdown
# Changelog — reverse dossier `<slug>`

Version history of the reverse-engineering dossier at `docs/support/reverse/<slug>/`.
Newest versions on top.

---
```

Then **prepend** (above any existing entries) a new entry using the template at `references/changelog-entry.md`. Fields:

- **Version**: `v<next>` (e.g. `v1.5`)
- **Date**: today
- **Type**: `regeneration M1` (or `initial` for v1.0)
- **Inputs**: document folders indexed with counts + subject graph mode (reuse / re-indexed / skipped) + node/edge stats
- **User intent**: verbatim quote of the consolidated intent from 4.3
- **Changes**: one bullet per impacted chapter, derived from each sub-agent's summary
- **Impacted chapters**: list of `NN` numbers
- **New chapters**: list of new files, or "none"
- **Unchanged chapters**: count
- **Warnings / open points**: propagated from sub-agents, or "none"
- **Sources consulted**: top-level references the sub-agents used

**Source-less run tracking**: when `source_less_run = true` (read from
`.meta/code-graph-index.json`), the CHANGELOG entry MUST include the
source-less block from the template. Populate the chapter list from the
sub-agents' `source_less: true` return values — one entry per chapter
that could not be analyzed due to missing source indexing. When
`source_less_run = false`, omit the block entirely.

**6.3 — Update `.reverse-engineering.local.json`**

Under `subjects.<slug>`, write:
- `last_run`: current ISO timestamp
- `last_source_indexed`: the first Q2 path (for the Q2 default on the next run)

**6.4 — Summary**

Print to the user:

```
✅ Reverse dossier <slug> updated

Version: v1.4 → v1.5
Date: <today in dossier language>

Chapters changed (N):
  - NN-<name>.md (<1-line summary>)
  - NN-<name>.md (<1-line summary>)
  ...

New chapters: <list or "none">
Unchanged chapters: K of total T

Output under docs/support/reverse/<slug>/
Changelog updated at docs/support/reverse/<slug>/CHANGELOG.md

Suggested next steps:
  - Review the changed chapters
  - Commit on the current branch
  - If new open points were raised, schedule the relevant review
```

## Hard rules (invariant — cannot be bypassed)

1. **Never index `docs/support/reverse/<slug>/`** — it's the output. If a selected path collides, reject. When this repository's root is indexed, the folder is excluded through `.cbmignore` (2.3).
2. **Never build or query the code graph without the Step 0.1 check** — and never carry on as if the graph had been consulted when it was not.
3. **Never write under `docs/support/reverse/<slug>/` without an explicit save trigger** — the cardinal rule. During indexing (Step 2) and the entire loop (Step 3), any `Write` / `Edit` under that folder is forbidden (except `.meta/code-graph-index.json` from 2.4, which is metadata). The transition to Steps 4–6 happens **only** when the user utters a save phrase (4.1). If you're about to write without a trigger, stop and ask.
4. **Never skip the current-version read** from `00-overview.md` — it's the ground truth for the bump. Missing → abort run.
5. **Never index raw PDFs** when a sibling markdown exists — PDFs are converted upstream. An orphan `.pdf` blocks the run and requires user conversion.
6. **Never regenerate chapters outside the consolidated intent** from 4.3 — delta discipline keeps diffs review-able.
7. **Never renumber existing chapters** — append at the next free number.
8. **Never commit on the user's behalf** — the final summary suggests a commit; the commit is the user's call.
9. **Never modify source documents** (`docs/sprints/`, `docs/calls/`, `docs/requirements/`, any Q2 path, any Q3 source). The dossier is a derived read-only artifact.
10. **Never switch language mid-version** — the whole v1.(N+1) stays in the same working language as v1.N.
11. **Never change the user's setup on the graph's behalf** — never run upstream `codebase-memory-mcp install` (it edits user-global agent configuration and hooks), never write the shared artifact `.codebase-memory/graph.db.zst` (`index_repository` with `persistence: true`) unless the user asks for it, and never re-index after every edit: index once, then query. A missing binary is fixed by `create-nonoise --code-graph-only .`, not by this skill.

## Known edge cases

| Scenario | Behavior |
|---|---|
| User says "full sync" in 4.3 | Run `index_repository` again on the document project(s), find what moved with `detect_changes` / `git log`, map all deltas to chapters, update every impacted chapter. Don't touch undelta-ed chapters. |
| Multiple document folders in Q2 | Folders inside this repository share its project; a folder outside it is a separate project. Leave them separate — the sub-agents can query both. |
| Subject source graph missing and user doesn't want to wait | Offer to proceed **without subject context** — some chapters (the ones most dependent on source, e.g. data-model, internals) become read-only for this run. Warn explicitly. |
| A sub-agent in 5.2 fails or returns something suspicious | Log the error, restore the chapter to the previous version (git or pre-overwrite backup), mark it as "regeneration failed" in the CHANGELOG. Don't block the other chapters. |
| 4.3 intent is vague ("make it better") | Ask for clarification — don't guess on a task that writes many files. |
| User interrupts mid-run | No automatic rollback. Already-written chapters stay written. CHANGELOG is not updated until the end — if the interruption happens before Step 6.2, the dossier has an inconsistent state. User can re-run; the delta re-aligns. |
| Subject slug collision (two subjects want the same slug) | Reject — slugs are unique. Ask the user to pick a more specific one. |
| First run ever (`NEW` in Q1) | Skip the current-version read (4.2), target v1.0, and use the 5.4 initial-spine path. |
| Project working language switches mid-session (shouldn't happen) | Stay in the dossier's current language. Warn the user that changing language requires a manual migration pass outside this skill. |

## Support files

- [`references/changelog-entry.md`](./references/changelog-entry.md) — the CHANGELOG entry template (placeholders for v<next>, date, inputs, intent, changes, warnings, sources)
- [`references/config.example.json`](./references/config.example.json) — example of `.reverse-engineering.local.json`
- [`references/initial-spine.md`](./references/initial-spine.md) — suggested v1.0 chapter spine for first-version runs (Step 5.4)

## Related skills

- [`arch-brainstorm`](../arch-brainstorm/SKILL.md) — consumes the dossier as reference when planning new architectural work
- [`sprint-manifest`](../sprint-manifest/SKILL.md) — may reference the dossier in its "supporting docs" list for promoted PRDs

## Final reminder on approach

This skill is an **incremental orchestrator**, not a one-shot generator. Regenerating from scratch every time destroys previously-reviewed work and produces unreadable diffs. The value of the skill is in:

1. Reading the user's intent
2. Identifying the minimum set of chapters to touch
3. Dispatching targeted sub-agents that do surgical edits
4. Tracking everything in the CHANGELOG

If you hit a case where the intent truly impacts every chapter (e.g. "we've completely reframed the subject because the domain shifted"), stop and propose either a manual pass or a major bump (v1.N → v2.0) that exits this skill's scope. Don't force M1 on a case that isn't M1.
