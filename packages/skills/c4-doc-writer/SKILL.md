---
name: c4-doc-writer
description: Produces and maintains living C4 architecture diagrams (Context / Container / Component / Code) for a NONoise project via a single Structurizr DSL workspace at `docs/architecture/c4/workspace.dsl`, from which all views are regenerated. Source-controlled, diff-able — unlike static Mermaid. USE right after `arch-decision` returns PASS on a PRD so diagrams stay in sync with the validated decision. Triggers on "/c4 update", "update c4", "update C4 diagrams", "generate C4 diagrams", "refresh the architecture diagrams", "structurizr", "rebuild the container view", "sync the C4 with the new PRD". Also triggers without explicit mention when the user wants to refresh architectural diagrams after a PRD/ADR was validated. Stack-neutral — works for any project with populated `docs/architecture/` (Angular+dotnet, Node+React, Python, Go, Flutter, data pipelines, CLIs).
source: NONoise framework (new skill)
variant: nonoise generic; stack-neutral; Structurizr DSL as the single source
---

# c4-doc-writer — Living C4 diagrams via Structurizr DSL

This skill keeps the project's C4 architecture diagrams in sync with the validated architectural decisions. It does **not** brainstorm architecture (`arch-brainstorm`) nor validate it (`arch-decision`) — it is invoked **after** a validated PRD to update the diagram source and regenerate views.

## Output location — where the C4 files land

**Read this section before writing anything.** The target folder is resolved per-run; it is NOT always `docs/architecture/c4/`.

Two modes:

- **Default / new-project mode** → `docs/architecture/c4/workspace.dsl` + `docs/architecture/c4/CHANGELOG.md`. This is the living C4 for the project's **target architecture** (green-field, or post-refactor / post-rewrite).
- **Reverse mode** → `docs/support/reverse/<subject-slug>/c4/workspace.dsl` + `docs/support/reverse/<subject-slug>/c4/CHANGELOG.md`, co-located with the `00-overview.md` / `01-*.md` chapters produced by `reverse-engineering`. This is the C4 of the **existing / legacy** system the dossier describes.

### How to pick the mode (priority order)

1. **Explicit user instruction wins.** If the user says "put it under reverse", "mettilo nel dossier di reverse", "C4 for legacy-billing", or names a subject slug, go straight to reverse mode for that subject.
2. **Polly handoff came from reverse.** If `.nonoise/polly-state.json` exists AND `handoff.skill === "c4-doc-writer"` AND the handoff was engaged while the session was inside the reverse phase (look at `handoff.returnTo` pointing back to `reverse`, or the most recent event before the handoff was `action: "handoff"` from `currentStep === "reverse"`), use reverse mode. If there are multiple subjects under `docs/support/reverse/`, ask which one.
3. **Polly state says we're still in brownfield understanding.** If `session.currentStep === "reverse"` OR (`phases.reverse.done === true` AND `phases.sprint.done === false`), reverse mode is **likely** — ask the user to disambiguate:
   > "Vedo che c'è un dossier di reverse in `docs/support/reverse/<slug>/`. Metto il C4 lì (co-locato con il dossier) o nella `docs/architecture/c4/` a livello progetto?"
4. **Filesystem hint.** If `docs/support/reverse/` has ≥1 subfolder containing `00-overview.md` AND `docs/architecture/c4/workspace.dsl` does NOT yet exist, ask the same disambiguation question.
5. **Otherwise** — default to `docs/architecture/c4/`.

### Multiple reverse subjects

If several subfolders exist under `docs/support/reverse/`, list them and ask which one the C4 belongs to. You may offer "the most recent (by mtime of `00-overview.md`)" as a shortcut.

### Resolved target folder

Once the mode is picked, record the target as the **resolved target folder**. Every subsequent step in this skill (DSL write, CHANGELOG, rendered views) uses that folder — do NOT fall back to hard-coded `docs/architecture/c4/` paths mid-run.

### Why this matters

C4 diagrams for a **reverse / legacy** pass describe the system as-is — its warts, its accidental complexity, its integrations as they really are. They belong with that dossier because they're part of the historical snapshot that the dossier versions together. The top-level `docs/architecture/c4/` is for the **new target architecture** (post-rewrite, post-refactor, or green-field), which may differ significantly from the legacy shape. Conflating the two overwrites the green-field placeholder with a legacy diagram — exactly the bug this section prevents.

## Why Structurizr DSL (not Mermaid, not PlantUML)

Mermaid is great for one-off sketches but it ages fast — every view is hand-written and there is no model underneath. Structurizr DSL is:

- **Model-first**: you declare `person`, `softwareSystem`, `container`, `component` once; the views block derives multiple diagrams from the same model
- **Source-controlled**: plain text, diff-able, reviewable in PR
- **Portable**: renders to Mermaid, PlantUML, Structurizr native, DOT — pick what your stack reads best
- **Standard**: official C4 reference implementation (https://structurizr.com)

See `references/structurizr-dsl-cheatsheet.md` for the canonical patterns and `references/c4-levels-primer.md` for what each level means and how it maps to NONoise artifacts.

## Position in the workflow

```
arch-brainstorm ──▶ arch-decision ──PASS──▶ c4-doc-writer ──▶ sprint-manifest
                        │                       │
                        │                       └─▶ docs/architecture/c4/workspace.dsl   (default mode)
                        │                           + rendered views (Mermaid/PlantUML)
                        │
                        └─▶ "Impact on docs/architecture/" checklist includes
                            "refresh C4 via c4-doc-writer"

reverse-engineering ──▶ c4-doc-writer (reverse mode)
                            │
                            └─▶ docs/support/reverse/<subject-slug>/c4/workspace.dsl
                                + rendered views, co-located with the dossier
```

Four valid entry points:

1. **After `arch-decision` PASS** (primary, default mode) — the architect or Polly engages this skill to reflect the validated decision in the diagrams
2. **From a reverse-engineering session** (reverse mode) — the user says "fammi un C4" / "give me a C4 for this" while a reverse dossier is the active context. Output lands next to the dossier, not in `docs/architecture/c4/`.
3. **Manual refresh** — user says "update C4", "refresh diagrams", "/c4 update"
4. **Initial setup** — first time the target folder has no `workspace.dsl` yet: the skill scaffolds from `assets/workspace.dsl.template`

## Inputs

Before writing anything, the skill collects context from:

- `nonoise.config.json` — project name, stack, template
- `docs/architecture/01-constraints.md` and any ADRs (`docs/architecture/02-*.md` …) — the source of truth
- `docs/prd/<area>/` — **only** PRDs with `status: validated` in frontmatter. Skip `draft` and `rejected`.
- `docs/sprints/Sprint-N/sprint-manifest.md` if present — component-level breakdown hints
- Existing `workspace.dsl` at the **resolved target folder** (see "Output location" above) if present — **never overwrite blindly**, always diff and propose changes
- In reverse mode, also read the dossier chapters at `docs/support/reverse/<subject-slug>/00-overview.md` / `01-*.md` — they are the source of truth for the as-is model

If the resolved mode is default and `docs/architecture/` is empty, stop and tell the user to run the arch workflow first (`arch-brainstorm` → `arch-decision`). In reverse mode the pre-req is a populated reverse dossier, not `docs/architecture/`.

## Flow — 5 phases

Each phase is a checkpoint. Ask for confirmation before the next one. Polly-style: **one question at a time**, never dump the full plan.

### Phase 1 — Discover

1. Read `nonoise.config.json` — extract `projectName`, template, aiTools
2. **Resolve the output mode** per the "Output location" section above (check explicit instruction → Polly handoff → Polly state → filesystem hint → default). Record the **resolved target folder**.
3. List `docs/architecture/*.md` — record which constraints/ADRs exist (also in reverse mode, for later cross-links)
4. List `docs/prd/*/` — filter `status: validated` only
5. In reverse mode, list `docs/support/reverse/<subject-slug>/` — record which chapters exist
6. Check whether `<resolved-target-folder>/workspace.dsl` already exists
7. Produce a short discovery summary:

```
Found:
  - project: <projectName>
  - mode: default | reverse(<subject-slug>)
  - target folder: <resolved-target-folder>
  - constraints: 01-constraints.md (+ N ADRs)
  - validated PRDs: 3 (user-signup/01-email-otp, notifications/02-pubsub, …)
  - reverse chapters (if reverse mode): 00-overview.md, 01-modules.md, …
  - existing workspace.dsl: yes, last modified <date>
```

Ask: **"Proceed to propose model updates?"** Wait for confirmation.

### Phase 2 — Propose model updates (Q&A, no disk writes)

Walk the architect through the model dimensions, one question at a time. Do **not** write to `workspace.dsl` during this phase — accumulate the proposed changes in working memory first.

Canonical question set — ask only the ones that are unclear from the discovered material:

1. **Software system name** — default from `nonoise.config.json` `projectName`. Ask only if the architect wants a different display name (e.g. code name vs product name).
2. **Actors (persons)** — extract candidates from `docs/requirements/<domain>/` personas. Ask: "I see these user roles: <list>. Are any missing or should any be merged?"
3. **External systems** — from ADRs, integration tables, `docs/calls/` mentions. Ask: "External systems this app talks to? I see <list> mentioned in ADRs."
4. **Containers** — from `docs/architecture/` "components" / "services" sections and the validated PRDs. Ask one at a time: "Container `X` — purpose, tech, one-line description?"
5. **Relationships** — for each pair of containers with likely traffic, ask: "`A -> B`: what does A send to B, and over what protocol?"
6. **Components (optional, per container)** — only if the architect wants Component-level views. Usually skipped in initial runs.

Phase 2 output = a proposal diff printed to the chat:

```
Proposed DSL changes:
+ person "Compliance Officer"
+ container "ms-auth" ".NET" "Authentication service"
~ container "bff" tech updated from ".NET 8" to ".NET 10"
- container "legacy-worker" (removed — superseded by ms-notifications per PRD 02-pubsub)
```

Ask: **"Apply this diff to `workspace.dsl`?"** Wait for confirmation.

### Phase 3 — Write / update DSL

All paths below are relative to the **resolved target folder** from Phase 1 (see "Output location").

1. If `<resolved-target-folder>/workspace.dsl` does **not** exist: render `assets/workspace.dsl.template` with `{{projectName}}` replaced (in reverse mode, prefer `<subject-slug>` or the dossier's title as the workspace name), then layer the Phase 2 proposals on top. Create the folder if missing.
2. If it exists: apply the Phase 2 diff precisely. Preserve style, formatting, comments, and custom elements the architect added by hand (tags, styles, custom views)
3. Ensure the file ends with a `views` block that contains at least:
   - A `systemContext` view
   - A `systemLandscape` view (if there are external systems)
   - One `container` view per software system
   - Dynamic views for flows that matter (e.g. "user signup sequence") — only if the architect asked for them
4. **Syntactic validation** — parse the DSL mentally for balanced braces, required blocks (`workspace { model { … } views { … } }`), and naming uniqueness. If in doubt, tell the user to run `structurizr-cli validate -workspace <resolved-target-folder>/workspace.dsl` (install info in `references/install-structurizr-cli.md`).
5. Write the file. One atomic write, not piecemeal.

### Phase 4 — Regenerate views

The skill does **not** run Structurizr CLI itself (framework rule: no auto-install of third-party tooling, see `references/install-structurizr-cli.md`). Instead, it prints the exact commands the user runs. In the snippets below, substitute `<TARGET>` with the **resolved target folder** from Phase 1 — e.g. `docs/architecture/c4` (default mode) or `docs/support/reverse/legacy-billing/c4` (reverse mode):

```bash
# Option A — local CLI (recommended for dev loop)
structurizr-cli export -workspace <TARGET>/workspace.dsl \
  -format mermaid \
  -output <TARGET>/rendered

# Option B — one-shot docker (no install)
docker run --rm -v "$PWD:/usr/local/structurizr" structurizr/cli \
  export -workspace /usr/local/structurizr/<TARGET>/workspace.dsl \
  -format mermaid \
  -output /usr/local/structurizr/<TARGET>/rendered

# Optional — PlantUML in addition to Mermaid
structurizr-cli export -workspace <TARGET>/workspace.dsl \
  -format plantuml \
  -output <TARGET>/rendered
```

Expected output layout (example — default mode):

```
docs/architecture/c4/
  workspace.dsl                 (the single source)
  rendered/
    structurizr-SystemContext.md      (Mermaid)
    structurizr-Container.md          (Mermaid)
    structurizr-Component-<name>.md   (Mermaid, if Component views declared)
    structurizr-SignupSequence.md     (Mermaid dynamic view)
    *.puml                            (PlantUML — if Option C ran)
  CHANGELOG.md
```

In reverse mode, the same layout is nested under `docs/support/reverse/<subject-slug>/c4/` and sits next to `00-overview.md`, `01-*.md`, etc.

If the user prefers PNG / SVG directly, Structurizr Lite in docker can render to a browser at `http://localhost:8080`:

```bash
docker run -it --rm -p 8080:8080 -v "$PWD/<TARGET>:/usr/local/structurizr" structurizr/lite
```

Tell the user, don't run it.

### Phase 5 — Changelog

Append to `<resolved-target-folder>/CHANGELOG.md` a dated entry (i.e. `docs/architecture/c4/CHANGELOG.md` in default mode, or `docs/support/reverse/<subject-slug>/c4/CHANGELOG.md` in reverse mode — never the project-wide one when we're in reverse). Create the file if absent. Template:

```markdown
## YYYY-MM-DD — <headline>

- Triggered by: <which ADR / PRD / manual run>
- Added: <new containers / actors / external systems>
- Changed: <modified tech / renamed / relocated>
- Removed: <deleted containers or relations>
- Views affected: <systemContext | container | component-<x> | dynamic-<name>>
- Rendered formats: <mermaid | plantuml | both>
```

Keep entries terse — one bullet per change, one paragraph max. The changelog is for humans scanning the history, not for CI machines.

## Output summary (end of run)

Print a block like this at the end (paths reflect the **resolved target folder**):

```
C4 workspace updated.
  mode     : default | reverse(<subject-slug>)
  source   : <resolved-target-folder>/workspace.dsl
  changelog: <resolved-target-folder>/CHANGELOG.md  (+1 entry)
  next     : run `structurizr-cli export ...` (see Phase 4) to regenerate views
  tracker  : triggered by <arch-decision PASS on docs/prd/... | reverse dossier docs/support/reverse/<slug>/ | manual>
```

Return control to Polly (or to the user directly if invoked standalone). Do **not** invoke `sprint-manifest` — that's a separate decision.

## Resuming mid-flow

If the user aborts at Phase 2 (e.g. one question too many), save no state. Next time the skill runs it re-reads the architecture and starts fresh. The DSL file on disk is the only persistent state.

## Anti-patterns

1. **Silent overwrite of `workspace.dsl`** — always diff and confirm. Architects may have hand-edited styling, tags, or custom views.
2. **Running Structurizr CLI automatically** — advisor-only per framework policy (same rule as LSP / voice tools). Print the command, let the user run it.
3. **Drawing from `draft` PRDs** — only `validated` PRDs inform the diagrams. Draft architecture is not ground truth.
4. **Invoking `arch-decision` from here** — wrong direction. This skill is downstream of validation, not upstream.
5. **Per-view DSL fragments** — keep one `workspace.dsl`. Do not scatter DSL across per-area files. If the project is a monorepo with multiple independent systems, use multiple `softwareSystem` blocks inside one workspace.
6. **Code level by default** — C4 Code is rarely useful outside a few hot spots. Do not emit Code views unless the architect explicitly asked.
7. **Writing to `docs/architecture/c4/` while a reverse session is active** — this is the bug the "Output location" section prevents. When Polly engaged this skill from the `reverse` phase, the C4 belongs with the dossier (`docs/support/reverse/<slug>/c4/`). Putting it under `docs/architecture/c4/` overwrites the green-field placeholder and conflates the as-is model with the target architecture. Always resolve the mode in Phase 1.

## When NOT to use

- Default mode: the project has no `docs/architecture/` yet → run `arch-brainstorm` + `arch-decision` first
- Reverse mode: `docs/support/reverse/<subject-slug>/` has no `00-overview.md` yet → run `reverse-engineering` first to build the dossier
- A draft PRD needs to be validated → that's `arch-decision`'s job
- The user wants a one-shot Mermaid diagram for a slide deck → pure Mermaid is faster; this skill is for the living source
- The project is a pure-data artifact (notebook, dataset, single script) with no system boundary → C4 is overkill

## References

- `references/structurizr-dsl-cheatsheet.md` — the DSL patterns you will use 95% of the time
- `references/install-structurizr-cli.md` — how the user installs the CLI (advisor-only)
- `references/c4-levels-primer.md` — what Context/Container/Component/Code mean, mapped to NONoise inputs
- `assets/workspace.dsl.template` — scaffold used when no `workspace.dsl` exists yet
- Sibling skill [`arch-decision`](../arch-decision/SKILL.md) — the upstream validator; its "Impact on docs/architecture/" checklist should mention this skill
- Sibling skill [`arch-brainstorm`](../arch-brainstorm/SKILL.md) — produces the PRDs this skill reads
- Sibling skill [`reverse-engineering`](../reverse-engineering/SKILL.md) — produces the legacy dossier whose C4 lands under `docs/support/reverse/<slug>/c4/` (reverse mode)
- Sibling skill [`polly`](../polly/SKILL.md) — the orchestrator; engages this skill after `arch-decision` PASS or from a reverse session
- External: https://structurizr.com — official DSL reference and playground
- External: https://c4model.com — C4 levels reference (Simon Brown)
