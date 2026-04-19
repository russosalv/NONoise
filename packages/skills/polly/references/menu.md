# Polly — menu command

The menu is Polly's read-only overview. It answers three questions in one
render:

1. **Where we are** — project kind, scope, current step, phases done/pending
2. **Where we can go** — the full decision tree for this `kind`, with the
   current step highlighted and the available transitions
3. **What Polly can orchestrate** — every skill Polly can hand off to,
   grouped by flow, plus orthogonal entry points

The menu never engages a skill and never changes state. It prints, then
Polly waits for the user's next instruction.

The sample outputs below are shown in Italian (matching the locale of
the user who currently drives the project); adapt the locale at render
time based on `user.locale` in `nonoise.config.json` or the ongoing
conversation language.

## Trigger phrases

The menu fires on any of these (case-insensitive, IT or EN), checked at
Step −0.5 of `SKILL.md` on every turn:

- `menu`
- `mostra menu` / `show menu`
- `mostra fasi` / `show phases`
- `cosa puoi fare` / `what can you do`
- `opzioni` / `options`
- `panoramica` / `overview`
- `/polly menu` (when the slash command carries an `menu` argument)

If the phrase appears alongside another instruction (e.g. "menu poi
procedi"), render the menu first, then ask the user to confirm the
follow-up.

## What to render

Structure the output as plain markdown. Four sections, in this order.

### 1. Current state

Read `.nonoise/polly-state.json`. Render:

```
## 📍 Dove siamo

- **Progetto**: <kind> (<scope or "—">)
- **Step corrente**: <currentStep>
- **Stack**: <stack or "non deciso">
- **Area attiva**: <activeArea or "—">
- **Sprint attivo**: <activeSprint or "—">
- **Handoff aperto**: <handoff.skill or "nessuno">
```

If the state file is absent (fresh session with no Step 0 yet), say so
plainly — e.g. "Polly has no saved state yet: we're at the start" /
"Polly non ha ancora stato salvato: siamo all'inizio" — and skip to
section 2.

### 2. Phases

Render every phase from `phases` with a status glyph:

```
## ✅ Fasi

| Fase            | Stato | Fingerprint                                   |
|-----------------|-------|-----------------------------------------------|
| scan            | ✓     | graphify-out/GRAPH_REPORT.md                  |
| reverse         | ✓     | docs/support/reverse/*/overview.md            |
| requirements    | ○     | docs/requirements/**/requirements.md          |
| featureDesign   | ○     | docs/superpowers/specs/*.md                   |
| archBrainstorm  | ○     | docs/prd/*/NN-*.md                            |
| archDecision    | ○     | docs/prd/*/audit/*.md (status: validated)     |
| fpfAudit        | ○     | .quint/ or docs/fpf/*                          |
| sprint          | ○     | docs/sprints/Sprint-N/sprint-manifest.md      |
| implementation  | ○     | (tracked via sprint progress)                 |
| acceptance      | ○     | docs/sprints/Sprint-N/acceptance/*            |
| c4              | ○     | docs/architecture/c4/workspace.dsl            |
| workitemExport  | ○     | (varies — spec-to-workitem output)            |
```

Glyphs: `✓` = done (from `phases[P].done === true`), `○` = pending,
`⋯` = in-progress (there's an active handoff tied to this phase).

### 3. Possible next steps

Based on `kind` and `currentStep`, show the local slice of the decision
tree. Don't dump all 8 greenfield steps if we're at step 2.6 — show the
current node, the 1-2 natural next nodes, and the junction options.

Example for brownfield after `reverse` just completed:

```
## 🧭 Prossimi passi

Sei al giunto brownfield → greenfield. Tre strade:

- **a) Nuova feature** — Step 2.4 → `superpowers:brainstorming`
- **b) Refactor architetturale** — Step 2.5 → `arch-brainstorm`
- **c) Manutenzione semplice** — Step 2.7 → `sprint-manifest`
```

Example mid-greenfield after `archDecision`:

```
## 🧭 Prossimi passi

- **a) Continua** — Step 2.7 sprint-manifest (la prossima fase naturale)
- **b) Aggiorna i C4** — `c4-doc-writer` (consigliato dopo un arch-decision)
- **c) Export work items** — `spec-to-workitem` (Jira / Azure DevOps / GitHub Issues)
- **d) Salta a un altro punto** — dimmi quale
```

Always include a "jump elsewhere" option so the user can break out of
the linear flow.

### 4. Skills Polly can engage

Reference `skill-invocation-matrix.md` for the full list. In the menu,
render a compact version grouped by use:

```
## 🛠 Skill che posso ingaggiare

**Flusso greenfield / brownfield**
- `requirements-ingest` — organizza materiale esistente in docs/requirements
- `bmad-agent-analyst` — elicitation strutturata
- `superpowers:brainstorming` — feature / product design
- `arch-brainstorm` — opzioni architetturali
- `arch-decision` — commit all'architettura (FPF audit incluso)
- `sprint-manifest` — manifesto di sprint aggregato
- `atr` — acceptance + test + implementazione per task

**Brownfield**
- `graphify-setup` / `graphify` — indicizzazione del codice
- `reverse-engineering` — dossier interattivo sul legacy

**Implementation (dev trio + ATR)**
- `superpowers:writing-plans` → `superpowers:executing-plans` → `atr` → `superpowers:finishing-a-development-branch`

**Entry points ortogonali**
- `observability-debug` — "prod è rotto"
- `ops-skill-builder` — "questa operazione la ripeto a mano"
- `spec-to-workitem` — push a Jira / Azure DevOps / GitHub / Linear
- `frontend-design` — design UI
- `playwright-cli` — test Playwright
- `c4-doc-writer` — aggiorna i diagrammi C4
- `docs-md-generator` / `design-md-generator` — template markdown
- `skill-finder` — "non so quale skill mi serve"
```

Keep this list in sync with `skill-invocation-matrix.md`. If a skill is
missing locally (fingerprint check), mark it with `(not installed)` (or
`(non installata)` when rendering in Italian) and point to
`fallback-messages.md`.

### 4.25. Project tools (bundled executables)

On top of the skills, the scaffold drops runnable tools under `tools/`
and (in multi-repo workspaces) `scripts/`. List only the ones actually
present on the filesystem — see `project-tools.md` for the detection
table.

```
## 🧰 Tool nel progetto

- **`tools/md-extractor`** — PDF/DOCX/immagini → Markdown (via LlamaCloud).
  Produce il `.md` sorella che `graphify` / `reverse-engineering` /
  `requirements-ingest` leggono come canonico.
  `node tools/md-extractor/extract.js <path>`
- **`tools/devops-push`** — push della gerarchia Feature → User Story →
  Task su Azure DevOps (legge i JSON prodotti da `sprint-manifest`).
  `cd tools/devops-push && npm start` (dry-run di default)
```

In multi-repo workspaces, add:

```
- **`scripts/clone-all`** — clona i sub-repo attivi da `repositories.json`
- **`scripts/switch-branch <branch>`** — allinea tutti i sub-repo sullo
  stesso branch (crea se manca)
- **`scripts/pull-all`** — `git pull --ff-only` su tutti i sub-repo
```

If a tool is not on disk, do not include it in the list. Never promise
tools that aren't actually there.

### 4.5. Bonus capabilities (via skill-finder)

Polly is not limited to the bundled skills: via `skill-finder` it can
search, download, and install skills from external registries (official
Anthropic, Claude plugin marketplaces, community repos) straight into
`.claude/skills/` of the current project. Make this an explicit invite
in the menu — most users don't know this path exists. Example of how
to present it (Italian sample output, since the rest of the menu uses
IT):

```
## ✨ Cose ganze che posso sbloccare (via skill-finder)

Le skill qui sopra sono quelle bundlate. Ma posso andare a cercarne
altre e installarle al volo — basta chiedere «cerca una skill per X»:

- 📊 **Slide / pitch deck (PPTX)** — `pptx` skill (Anthropic ufficiale)
- 🎬 **Video / animazioni** — skill community (Remotion, Manim, ecc.)
- 📄 **PDF generativi** — `pdf` skill (Anthropic ufficiale)
- 🧾 **Excel / fogli di calcolo** — skill community dedicate
- 🖼 **Editing immagini / generative art** — skill community
- 🌐 **Stack-specific** — Angular / C# / .NET / Go / Python avanzato
  (skill che non bundlo di default per non appesantire lo scaffold)
- ➕ **Qualsiasi altra cosa** — dimmi il dominio, skill-finder cerca
  nei registri ufficiali e community e ti propone 3-5 candidate

Scrivi «cerca una skill per <cosa>» e ingaggio `skill-finder`.
```

The list is **indicative, not exhaustive** — it's there to spark a
lightbulb, not to maintain a catalog. The actual registries live in
`packages/skills/skill-finder/registry.json` and are the source of
truth. If the user names something specific, do not promise it exists:
delegate to `skill-finder`, which will do the real lookup and propose
what it actually finds (including the offer to generate the skill from
scratch via `skill-creator` if no registry has one).

### 5. Closing question

End with a single question that returns control to the user. English
template:

> What would you like to do? Pick one of the letters above, name a
> specific skill, type "find a skill for &lt;thing&gt;" to unlock extra
> capabilities (PPT, video, PDF, etc.), or say "pause" to stop here.

Italian adaptation:

> Cosa vuoi fare? Scrivi la lettera di una delle opzioni qui sopra,
> il nome di una skill specifica, «cerca una skill per &lt;cosa&gt;» per
> sbloccare capacità extra (PPT, video, PDF, ecc.), oppure «pausa» per
> fermarci.

Then **stop**. Do not engage a skill in the same turn. Do not auto-pick
an option on silence.

## What the menu is NOT

- Not a state-changing action. Rendering the menu must not write
  `polly-state.json`.
- Not a tutorial. Keep it compact; link to `decision-tree.md` for long
  explanations rather than inlining them.
- Not a replacement for the tree. When the user picks an option, hand
  back to the normal flow at that step (using the handoff protocol for
  skill engagement).

## Copilot / other tools

The menu is plain markdown — it renders identically in Claude Code and
Copilot. The trigger phrases are the same. The only difference is how
the user re-enters Polly after the menu: `/polly` in Claude Code, "back
to polly" in Copilot.
