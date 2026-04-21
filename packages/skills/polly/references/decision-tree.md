# Polly — decision tree in full

This file expands the decision tree sketched in `SKILL.md` into concrete
prompts. Read when Polly needs the exact phrasing for a step, or when a step
needs adaptation.

## Global rule — never auto-advance between steps

Every step-to-step transition is gated. After answering the current
question (or returning from a skill), Polly STOPS and presents options
before moving on: typically **procedi / pausa / menu / salta a una fase
diversa**. The user must pick one explicitly. This overrides the
apparent linear flow below — the numbering is a *map*, not a conveyor
belt. See `handoff-protocol.md` § "Non-negotiable: every phase
transition is gated" for the full rule and `menu.md` for the overview
the user gets when they ask.

If the user's latest message contains `menu`, `mostra menu`, `cosa puoi
fare`, `show menu`, `overview`, `opzioni`, `panoramica`, or `/polly
menu` — render `menu.md` instead of continuing the tree.

## Step 0 — Voice input hint

See `voice-tools.md`. Fire once per session, before any other prompt.

## Step 1 — Greenfield or brownfield

Exact prompt (EN):
> Is this a **greenfield** project (something new, starting from scratch) or
> **brownfield** (an existing codebase we need to analyze or extend)?

Adaptation (IT):
> Questo è un progetto **greenfield** (nuovo, da zero) o **brownfield**
> (codice esistente da analizzare o estendere)?

Wait for an explicit answer. Do not infer from directory contents — an empty
`docs/` tree is produced by both paths.

## Step 1.5 — Multi-repo workspace detection (fire before proceeding)

Detection signals (any one is enough):

- `repositories.json` exists at project root
- `nonoise.config.json` has `"workspace": "multi-repo"`
- `repos/` folder exists with `.gitkeep`

If detected, handle BEFORE continuing with Step 2 or Step 3:

**1. Acknowledge the workspace shape**
> This is a multi-repo workspace. Sub-repos live under `repos/<path>` and are
> managed by the scripts in `./scripts/`:
> - `clone-all.(sh|ps1)` — reads `repositories.json`, clones each `active`
>   repo into `repos/<path>`
> - `switch-branch.(sh|ps1) <branch>` — checkout the same branch across all
>   sub-repos (creates if missing)
> - `pull-all.(sh|ps1)` — `git pull --ff-only` across all active sub-repos

**2. Check bootstrap state** — is `repos/` empty (only `.gitkeep`)?

- **If yes**: offer two paths:
  - *Guided*: "I can walk you through `repositories.json` entry-by-entry —
    for each repo ask URL / path inside repos / branch / status. Then run
    clone-all for you."
  - *Manual*: "Edit `repositories.json` yourself, flip `status` to `active`
    for the repos you want, then run `./scripts/clone-all.sh` and come back
    to me."

- **If no** (sub-repos already cloned): skip, move on.

**3. Skills policy reminder**

> This workspace is **workspace-centric**: skills live only at the workspace
> root (`.claude/skills/` here). Open this directory in Claude Code / Copilot
> and you have all skills available. Sub-repos under `repos/` are plain code
> — they don't carry their own skill tree. If you ever need skills inside a
> specific sub-repo (e.g. working isolated on a single service), say so and
> I'll copy `.claude/` into that sub-repo on demand.

**4. VibeKanban hint** (only if the user later mentions bugs in UAT/SIT — see
`external-tools.md` § VibeKanban)

> In a multi-repo workspace, `./scripts/switch-branch.sh <branch>` aligns all
> sub-repos on the same branch — VibeKanban then treats the workspace as one
> unit during bug triage.

**5. Proceed with Step 1** — greenfield vs brownfield question still applies
(a multi-repo workspace can be either).

## Pair vs solo mode per step

Every step is annotated with a **mode**: `[pair]` means gather multiple
humans on one screen with a large model (decisional phases); `[solo]`
means distributed per-task work (implementation). Announce the mode when
engaging a step. Rationale: see `feedback_pair_vs_solo_workflow` — NONoise
is explicit about this; most AI frameworks assume one-man-band.

## Skip rules (when to bypass a step)

- **Pure refactor, no new feature** → skip Step 2.4, start at Step 2.5
  with an area-slug.
- **Simple feature on known architecture (no new ADR)** → skip Step 2.5
  and Step 2.6, go from Step 2.4 straight to Step 2.7. `sprint-manifest`
  will consume the `docs/superpowers/specs/` design doc directly.
- **Architectural study with no feature yet** → skip Step 2.4, start at
  Step 2.5.
- **Brownfield** → follow Step 3, then resume greenfield at Step 2.4 or
  2.5 depending on scope (new feature vs architectural refactor).

## Greenfield — Step 2.1 — Stack     `[pair]`

Prompt:
> What's the stack you're building? Short form is fine — "Node + React",
> "Python FastAPI", "Flutter app", "data pipeline in dbt", "CLI in Rust".
> If you're not sure yet, say "not decided" and we'll figure it out together
> during arch-brainstorm.

Record the answer in your working memory — later steps (`arch-brainstorm`,
`sprint-manifest`, `atr`) will use it. Don't write it to disk yet.

## Greenfield — Step 2.2 — Existing source material     `[pair]`

Prompt:
> Do you already have any material about this project — meeting notes,
> email threads, briefs, regulatory documents, sketches, a PRD draft? Even
> rough stuff counts. Transcripts of stakeholder calls are gold — if you
> have them, see `external-tools.md` § call transcriptions for the
> cleanest workflow.

If **yes**:
1. Ask where the files are.
2. Engage `requirements-ingest` to organize them under
   `docs/requirements/<domain>/sources/`. `requirements-ingest` will ask its
   own questions about domain and ownership.
3. When it returns, note the domains created and carry them into Step 2.3.

If **no**: skip, move to Step 2.3.

## Greenfield — Step 2.3 — Requirements elicitation     `[pair]`

Prompt:
> Let's capture what we know about the project. I'll engage
> `bmad-agent-analyst` — it runs a structured elicitation, asks questions
> like "who are the users?", "what's the core problem?", "what counts as
> success?". Takes 10-20 minutes. OK to start?

If the user wants a lighter touch, substitute `bmad-advanced-elicitation`
(single-round, no agent persona).

Output lives in `docs/requirements/<domain>/`.

## Greenfield — Step 2.4 — Feature / product design     `[pair]`

Prompt:
> Now the feature design. I'll engage `superpowers:brainstorming` — a
> disciplined Q&A where we explore the *what* and *why* before the *how*.
> It ends with a design spec at
> `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`. It even offers a
> visual companion (browser mockups) if we hit UI questions. One question
> at a time, no hurry.

`superpowers:brainstorming` is product/feature level — it does NOT read
`docs/architecture/` constraints, so if you also need architectural
decisions, continue to Step 2.5. If the feature is simple and the
architecture is already known (just plumbing), skip Step 2.5 → 2.6 and
go straight to Step 2.7 (sprint-manifest consumes the design spec).

**Fallback**: if `superpowers:brainstorming` was removed manually, see
`fallback-messages.md` § brainstorming.

## Greenfield — Step 2.5 — Architecture options     `[pair]`  *(skip if arch is known)*

Prompt:
> With the feature design in hand, let's pick the architecture. I'll
> engage `arch-brainstorm` — it takes the area-slug, reads
> `docs/architecture/01-constraints.md` (your source of truth),
> `docs/requirements/`, and the Step 2.4 design spec, then produces a
> narrative PRD under `docs/prd/<area>/NN-<study>.md` with 2-3
> alternatives, Mermaid diagrams, and explicit anti-scope.

Unlike `superpowers:brainstorming`, `arch-brainstorm` is project-aware —
it pulls constraints and past ADRs from `docs/architecture/`. Use it
when the architecture is non-trivial, or when the user explicitly wants
to explore system-level options.

**Alex personality note**: if the architect reaches for exotic patterns,
Alex (`bmad-agent-architect`) will push back per
`feedback_canonical_architectures_alex` — prefer canonical patterns
(MVC, Repository, CQRS, Clean, hexagonal) unless there's a strong reason.

## Greenfield — Step 2.6 — Architecture decision     `[pair]`

Prompt:
> Time to commit. I'll engage `arch-decision` — it takes the Step 2.5
> study, runs Quint FPF validation (`quint-fpf` as a sub-skill:
> abduction → deduction → induction → R_eff via WLNK), and updates the
> PRD frontmatter to `validated` or `rejected`. On PASS it produces an
> "Impact on docs/architecture/" checklist you apply manually.

Output is a validated PRD + FPF audit at `docs/prd/<area>/audit/`. No
auto-sync to `docs/architecture/` — Alex does that manually with the DOC
capability.

After `arch-decision` PASS, engage `c4-doc-writer` to update `docs/architecture/c4/workspace.dsl`. This keeps the architectural diagrams in sync with the validated decision — one Structurizr DSL source, many regenerated views (Context / Container / Component). The skill is advisory on CLI install (never auto-installs Structurizr) and appends a dated entry to `docs/architecture/c4/CHANGELOG.md` noting which ADR triggered the refresh.

## Step 8b — arch-sync suggestion (between arch-decision and sprint-manifest)

**Pre-condition**: `arch-decision` has just completed Phase 6 (PRD has
`status: validated`, audit folder exists with `05-decision.md` carrying
the strict-format `## Impact on docs/architecture/` checklist). On Polly's
resume, the `archDecision` handoff fingerprint is satisfied and
`archSyncOffered` is `null` (or `false` from a previous postpone).

**Action**: Polly does NOT advance to `sprint-manifest`. Instead it
presents:

```
✅ Architettura validata — PRD <path>, R_eff <X>.

Prima di passare allo sprint, vuoi proiettare la decisione in
`docs/architecture/`?

  [1] Sì — invoco arch-sync (legge PRD+05-decision.md, scrive in architettura con diff)
  [2] No, lo faccio a mano — vado a sprint-manifest
  [3] Dopo — fermati qui, ti chiamo io quando voglio
```

**Choice handlers**:

| # | Effect on state | Next Polly action |
|---|-----------------|-------------------|
| 1 | `archSyncOffered = true` | Standard handoff to `arch-sync` (pass `prdPath` + `auditFolder` in handoff args). After it returns, advance to `sprint-manifest`. |
| 2 | `archSyncOffered = true` | Advance to `sprint-manifest`. The suggestion is not re-offered for this decision. |
| 3 | `archSyncOffered = false` | Stop. On the next `/polly` invocation, this menu re-appears (because `archSyncOffered === false` and `archDecision` fingerprint still satisfies). |

**Reset rule**: when a new PRD validation occurs (new `archDecision`
fingerprint), reset `archSyncOffered` to `null` so the menu fires again
for the new decision.

## Greenfield — Step 2.7 — Sprint breakdown     `[pair]`

Prompt:
> Architecture locked. Let's plan the sprint. I'll engage
> `sprint-manifest` — it promotes all validated PRDs to
> `docs/sprints/Sprint-N/<area>/` and produces **one aggregated manifest**
> at `docs/sprints/Sprint-N/sprint-manifest.md` — vertical slices, user
> stories, macro tasks, confidence CL1/CL2/CL3, cross-area dependencies.

Ask for the sprint number if the user hasn't specified.

## Greenfield — Step 2.8 — Implementation loop (dev trio + ATR)     `[solo]`

This is where the mode flips. Decisional phases were pair; per-task work
is solo — ideally distributed across the team.

For **each task** in the manifest, Polly engages the superpowers dev
trio + atr as the default shipping path (not optional):

**Prompt (per task):**
> Task `<task-id>`: `<task-title>`. Solo work — one dev picks this up.
> The shipping sequence is:
>
> **a.** `superpowers:writing-plans` — I'll turn this task into a
> numbered plan with explicit dependencies.
>
> **b.** `superpowers:executing-plans` — runs the plan with review
> checkpoints; uses `superpowers:subagent-driven-development` and
> `superpowers:dispatching-parallel-agents` where the plan allows,
> plus `superpowers:test-driven-development` for red-green-refactor.
>
> **c.** `atr` — acceptance runner: generates the testbook from
> acceptance criteria in the manifest, runs it with Playwright,
> produces the report + screenshots at
> `docs/sprints/Sprint-N/acceptance/`.
>
> **d.** `superpowers:finishing-a-development-branch` — structured
> merge/PR decision; picks the right integration path.
>
> Ready to start?

After each task, return to Polly and ask "next one?". Polly is the
conductor across tasks.

**Bug triage interlude** (during sprint, before release): if the user
mentions bugs from UAT / SIT / QA, route to `external-tools.md` §
VibeKanban and `observability-debug` — they compound.

## Brownfield — Step 3.1 — Code path     `[pair]`

Prompt:
> Where's the code? Absolute path or relative to the scaffold root.

If the code is inside the scaffold (same repo), check that `.git` exists so
`graphify` can scan. If it's in a sibling repo, note the path.

## Brownfield — Step 3.2 — Graphify setup     `[pair]`

Prompt:
> I'll engage `graphify-setup` first — it verifies Python is installed,
> installs `graphify` if needed, wires the usage rules into every selected
> AI-tool context file, and — because we're in a reverse-engineering flow —
> it will also propose indexing your code path right away (with a clear
> warning that indexing is essential for a good reverse result, but you can
> skip if you have a reason to).

Pass the args string to the handoff:

```
Skill(skill: "graphify-setup", args: "mode=reverse-engineering source_path=<Step 3.1 answer>")
```

If the user provided no explicit source_path in Step 3.1 (or said "inside
this repo"), omit `source_path` — graphify-setup falls back to `.` or
`nonoise.config.json → reverse.source_path`.

If `graphify-setup` reports Python missing, show the install instructions
and offer the user the chance to install manually, then retry.

**Return fingerprint**: `graphify-out/GRAPH_REPORT.md` (at the indexing
target path, not necessarily the project root).

If the user skipped indexing at Step 5 of graphify-setup, the fingerprint
is absent — Polly sees `scan` phase as NOT done on the next reconcile and
will re-propose indexing before engaging `reverse-engineering` (see
§ "Reverse-engineering intent gate" below).

## Reverse-engineering intent gate

When the user's intent matches any of the reverse-engineering triggers
listed in `reverse-engineering/SKILL.md` (e.g. "reverse-engineer X",
"document legacy Y", "build a dossier on vendor Z's API", Italian/French
/Spanish equivalents, or a path mention under `docs/support/reverse/`),
Polly MUST check the graphify state before engaging `reverse-engineering`:

```
graphify CLI available AND graph exists at the proposed source path?
│
├─ NO (either side)
│    → engage graphify-setup with args="mode=reverse-engineering [source_path=<path>]"
│    → on return, re-check the fingerprint
│         - satisfied → proceed to reverse-engineering
│         - absent (user skipped Step 5) → ASK THE USER:
│             "Indexing was skipped. Reverse-engineering without a
│              subject graph produces a source-less, partial dossier.
│              Three options:
│              a) Run indexing now (engage graphify-setup again)
│              b) Proceed source-less (confirm you understand it's partial)
│              c) Pause"
│           Wait for explicit choice. Never auto-pick (a) or (b).
│
└─ YES → engage reverse-engineering directly.
         Its Q4 freshness check handles the stale-graph case internally.
```

This gate applies both to the brownfield path (Step 3.2 + 3.3) and to
orthogonal entry points where the user invokes RE outside the main tree.

## Brownfield — Step 3.3 — Reverse engineering     `[pair]`

Prompt:
> Now I'll engage `reverse-engineering` — it reads the graphify index and
> produces a subject-driven understanding document under
> `docs/support/reverse/<subject-slug>/`. The skill is interactive: it will
> pause and ask before writing, and will explore with you before committing
> anything to disk.

`reverse-engineering` has a strong "don't write without permission" rule —
trust it, don't override.

## Brownfield — Step 3.4 — Existing source material     `[pair]`

Identical to greenfield Step 2.2. If there are emails / calls / briefs about
the legacy system, route them through `requirements-ingest`.

## Brownfield — Step 3.5 — Resume greenfield at the right step

From here, brownfield joins greenfield. **This is a junction, not a
transition — do NOT auto-pick a target.** Present the three options and
wait for the user to choose. Template (IT):

> Brownfield completo. Adesso raggiungiamo il flusso principale — ma
> l'ingresso dipende da cosa vuoi fare:
>
> - **a) Nuova feature sul codice legacy** → Step 2.4 (feature / product design con `superpowers:brainstorming`)
> - **b) Refactor architetturale / cambio strutturale** → Step 2.5 (`arch-brainstorm` con area-slug)
> - **c) Manutenzione semplice, architettura già chiara** → Step 2.7 (`sprint-manifest` direttamente)
> - **d) Pausa / menu / altro** — dimmelo
>
> Quale?

Do NOT proceed until the user picks one. On silence, re-ask — do not
default to (a).

| User intent | Resume at |
|---|---|
| New feature on top of the legacy code | Step 2.4 (feature / product design) |
| Architectural refactor, no new feature | Step 2.5 (arch-brainstorm with area-slug) |
| Simple maintenance change on known arch | Step 2.7 (sprint-manifest directly) |

`arch-brainstorm` in brownfield mode also reads `docs/support/reverse/`
automatically — the skill figures this out on its own, no extra config
needed.

## Orthogonal entry points

See `SKILL.md` § "Orthogonal entry points" for the routing table. Each entry
is a one-shot handoff — engage the specialist, then return to the user with
the result.
