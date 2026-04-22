# Polly advisor redesign

**Status:** design — approved in brainstorming, awaiting writing-plans
**Date:** 2026-04-22
**Author:** Alessandro Russo (with Claude Opus 4.7)
**Related:** `packages/skills/polly/`, `docs/polly.md`, `docs/sdlc.md`, `NONoise-frmw-site/src/content.js`

## 1. Problem

Polly today is an **orchestrator**: a multi-step state machine that walks the user through the SDLC one question at a time, persists state across sessions in `.nonoise/polly-state.json`, auto-triggers on the first scaffold via `.nonoise/POLLY_START.md`, runs a menu system, has handoff/return protocols, and asks a clarifying question before engaging every skill. Bundled SDLC skills mirror the same pedantic cadence — they ask one thing at a time instead of letting the user describe the whole scope.

The result is **too slow and too verbose**. A dev who already knows what they want is forced through catechism. A dev who doesn't know still gets catechism — just with more patience. In both cases Polly becomes friction, not help.

Theoretically Polly shouldn't even be needed: the user writes what they want, the AI recognises the intent, engages the right skill. Polly should exist only as a safety net for ambiguous cases ("where do I start?", "what's next?") — **a consigliera, not a conductor.**

## 2. Target model

**Polly v2 = advisor, fire-and-die, stateless, opt-in.**

### 2.1 Core principles

1. **One-shot output.** Every `/polly` invocation produces one message and then Polly is done. No session state, no cross-turn resume, no "waiting for user" branches.
2. **No auto-trigger.** `.nonoise/POLLY_START.md` is removed. First-session discoverability shifts to the context files (`CLAUDE.md`, `.github/copilot-instructions.md`) which tell the AI: *"if the user seems lost, offer `/polly` — otherwise engage skills directly based on what the user describes"*.
3. **Teach by example.** Polly's primary output is not an orchestration step — it's an **example prompt** the user can paste verbatim. The skill auto-triggers on that paste. Polly optionally offers to engage the skill herself ("vai" / "go") but then terminates.
4. **Driven by `.nonoise/sdlc-flow.md`.** Polly reads a project-local, user-editable flow document to know the phases, the skill per phase, the fingerprint per phase, and the example prompts. The doc is the single source of truth at runtime.
5. **Stateless progress detection.** "Where you are in the flow" is derived by checking fingerprints (files in `docs/requirements/`, `docs/architecture/`, etc.) against `sdlc-flow.md`. No state file is written.
6. **Neutral tone.** The old "warm non-judgmental guide for devs rusty with AI" framing is dropped. Advisor-Polly is terse and practical.

### 2.2 The pattern — what Polly says in a single turn

Every Polly invocation produces a message with four blocks (adapted to the user's installed language; falls back to IT if unset, EN as secondary default):

```
**Where you are in the flow**
I read `sdlc-flow.md` and checked `docs/`. You are at phase <X> because
<fingerprints present/absent>.

**What I suggest next**
Phase <Y> → skill `<skill-name>`. Reason: <1 line>.

**How to trigger it** (example prompt — copy into chat)
<verbatim example prompt, 2-4 lines, interpolating user's project context
if inferable, otherwise with <placeholder> tokens>

The skill will engage automatically from this prompt — you don't need
to type `/<skill-name>`.

**Or** — say "vai" and I'll engage it now, then disappear.
```

If the user types "vai" / "go", Polly engages the skill with one handoff message, then the skill takes over. Polly does not resume after the skill completes — it's the AI's job (via context-file rules) to re-recognise intent if the user asks "what's next" again.

### 2.3 Entry points

| Trigger | Behaviour | Retained? |
|---|---|---|
| `/polly` (Claude Code slash) | Invokes Polly skill | ✅ keep |
| Phrase triggers in Copilot: *"start polly"*, *"avvia polly"*, *"run polly"* | Invokes Polly skill | ✅ keep |
| Confusion trigger (user writes *"where do I start?"*, *"sono perso"*) | AI offers `/polly` as fallback | ✅ keep, but **fallback only** — if the phrase is specific enough to map to a single skill, the AI engages that skill directly |
| Auto-trigger via `.nonoise/POLLY_START.md` | (removed) | ❌ delete |

## 3. `.nonoise/sdlc-flow.md`

Replaces the old `polly-state.json` with a **project-local flow config** — not a state file.

### 3.1 Location and lifecycle

- Path: `.nonoise/sdlc-flow.md` in every scaffolded project.
- Template: `packages/templates/single-project/_always/.nonoise/sdlc-flow.md` (and the equivalent under `multi-repo/_always/`).
- Scaffold writes the default flow at project creation.
- User-editable: devs can add/remove/reorder phases, change skills, rewrite example prompts to match their domain.
- Polly reads it every invocation; never writes to it.
- If the file is missing, Polly falls back to an embedded canonical flow (copied into `packages/skills/polly/references/sdlc-flow.default.md`) and warns the user.

### 3.2 Schema (Markdown with YAML frontmatter + per-phase sections)

```markdown
---
version: 1
default_language: it        # IT | EN | … — from install-time locale
phases:
  - id: stack
    label:
      it: "Stack e vincoli"
      en: "Stack and constraints"
    skill: null                # no skill, conversational phase
    fingerprint: null
    mode: pair
  - id: requirements-ingest
    label:
      it: "Ingest di materiale esistente"
      en: "Existing material ingest"
    skill: requirements-ingest
    fingerprint: "docs/requirements/ingested/*.md"
    mode: pair
    skip_if: "no existing material"
  - id: requirements-elicit
    label:
      it: "Elicitation dei requisiti"
      en: "Requirements elicitation"
    skill: bmad-agent-analyst
    fingerprint: "docs/requirements/**/*.md"
    mode: pair
  - …
---

# SDLC flow — <project-name>

## stack
<per-phase guidance: when to run, example prompts IT/EN, skip rules>

## requirements-ingest
<ditto>

…
```

**Per-phase fields:**

- `id` — stable slug (used for fingerprint lookup, user commands, state derivation)
- `label.{it,en,…}` — human label per language
- `skill` — skill name to engage (or `null` if the phase is conversational)
- `fingerprint` — glob path that, if any file matches, counts as "phase done"; `null` for conversational phases
- `mode` — `pair` | `solo` (informational, announced by Polly when engaging)
- `skip_if` — free-form condition Polly surfaces to the user ("skip this phase if …")
- Example prompts live in the per-phase Markdown section below the frontmatter, under `## <id>` headers, as copy-pasteable code blocks labelled `prompt (it)` / `prompt (en)`.

### 3.3 Default content

The default flow writes the current greenfield tree + brownfield prefix as phases, adapted to the new "copy this prompt" format. Numbering (Step 0..10) in `docs/polly.md` maps 1:1 to `phases[]` in the default template.

## 4. Skill behaviour — the "D + C-light" change

Users reported that bundled SDLC skills feel catechistic: *"non pedissequa, chiedi all'utente di darti tutto lo scope"*. Two complementary mechanisms fix this without editing vendored skills.

### 4.1 Context-file meta-rule (primary — option D)

Add to `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, `.cursor/rules.md`, and `GEMINI.md` a block:

> **When you engage any SDLC skill, your first action is to ask the user for the full scope in one go — who, what, why, constraints, success criteria. Use the skill's structure as a schema to fill, not as a turn-by-turn questionnaire. Only ask follow-up questions for genuine blockers (missing critical info). This applies to all skills the user invokes for SDLC work (requirements, design, architecture, sprint planning, reverse-engineering) — bundled, native, or vendored.**

All templates already use Handlebars, so the rule is authored once and rendered into every context file.

### 4.2 Native skill preamble (secondary — option C-light)

Add a one-line preamble at the top of each native **`[pair]` SDLC skill** in `packages/skills/`:

> *"Before running this skill's procedure: ask the user to describe the full scope in one message. Treat the rest of this document as a schema to fill against their answer, not a questionnaire to walk turn-by-turn."*

Target skills (6): `requirements-ingest`, `bmad-agent-analyst`, `bmad-advanced-elicitation`, `arch-brainstorm`, `arch-decision`, `sprint-manifest`.

**Why both layers?** The context-file rule covers every skill, including vendored, without touching upstream. But AIs sometimes ignore meta-instructions once they've entered a specific skill document. The one-line preamble inside the SKILL.md reinforces the rule at the point of action.

**Vendored skills (superpowers, impeccable, skill-creator, pptx) are never modified** — the context-file rule is their only touchpoint.

## 5. Removals

### 5.1 Files and artefacts to delete

| Artefact | Location | Action |
|---|---|---|
| `POLLY_START.md` marker | `.nonoise/POLLY_START.md` in scaffolded projects | Stop writing it. Delete `writePollyStartMarker()` from `scaffold.ts`. Remove the auto-trigger blocks from `CLAUDE.md.hbs` / `copilot-instructions.md.hbs` / `.cursor/rules.md.hbs` / `GEMINI.md.hbs` / `AGENTS.md.hbs`. |
| `polly-state.json` | `.nonoise/polly-state.json` in scaffolded projects | Stop writing it. Delete `writePollyInitialState()` from `scaffold.ts`. |
| `polly-state.schema.json` | `.nonoise/` | Stop writing it. Delete `writePollyStateSchema()`. |
| `polly-state.mjs` CLI | `.nonoise/polly-state.mjs` | Stop writing it. Delete `writePollyStateCli()`. |

Orphaned existing `.nonoise/POLLY_START.md` / `polly-state.*` files in user projects: not cleaned up automatically — they become harmless. Document in release notes.

### 5.2 References cleanup in `packages/skills/polly/references/`

| File | Action | Reason |
|---|---|---|
| `handoff-protocol.md` | ❌ delete | No more handoff; Polly fire-and-die |
| `state-schema.md` | ❌ delete | No more state file |
| `menu.md` | ❌ delete | No more menu; Polly fire-and-die |
| `voice-tools.md` | ❌ delete | Step 0 voice hint removed |
| `fingerprints.md` | ♻️ absorb into `sdlc-flow.md` schema (per-phase `fingerprint` field) | Single source of truth |
| `decision-tree.md` | ♻️ becomes the default template content for `sdlc-flow.md` | Same info, new format |
| `skill-invocation-matrix.md` | ♻️ absorb into `sdlc-flow.md` (per-phase `skill` field + example prompts) | Single source of truth |
| `fallback-messages.md` | ✅ keep | Still useful when a skill is uninstalled |
| `external-tools.md` | ✅ keep | Info-only references (claude-mem, VibeKanban) |
| `project-tools.md` | ✅ keep | Bundled tools in scaffolded projects |
| `sdlc-flow.default.md` | ➕ new | Embedded fallback copy of the default `.nonoise/sdlc-flow.md` content, used by Polly if the project's copy is missing |

**Net:** 4 deleted, 3 absorbed, 3 kept, 1 new. `SKILL.md` itself shrinks from ~350 lines to ~100.

### 5.3 Multi-repo detection

Move the Step 1.5 multi-repo detection block out of `SKILL.md` into a new `docs/multi-repo.md` (create if not present). Polly's only remaining mention:

> If `repositories.json` is present or `nonoise.config.json` declares `"workspace": "multi-repo"`, tell the user: *"Questo è un multi-repo workspace. Vedi `docs/multi-repo.md` per gli script (clone-all, switch-branch, pull-all) e la policy sulle skill."* — one line, no walkthrough.

## 6. New maintainer skill: `sdlc-flow-maintainer`

Self-hosted in this repo at `.claude/skills/sdlc-flow-maintainer/` (not bundled, not distributed via `create-nonoise` — it's a dev tool for the NONoise maintainer).

**Purpose:** keep the default `sdlc-flow.md` template in `packages/templates/` in sync with the skills actually bundled in `packages/skills/`.

**What it does:**

1. Read the default template at `packages/templates/single-project/_always/.nonoise/sdlc-flow.md`.
2. Read `packages/skills/` to enumerate all native skills.
3. Read `packages/create-nonoise/src/scaffold.ts` for `MVP_SKILL_BUNDLE` to know which are actually installed.
4. Report:
   - Skills installed but not referenced in any phase of the default flow → propose adding them (or mark "utility/orthogonal, no phase").
   - Skills referenced in the default flow but removed from the bundle → propose deletion.
   - Phases with fingerprint globs that don't match any existing scaffolded-project convention.
5. Propose a unified diff the maintainer can apply to the template.
6. Does **not** auto-apply. Human review always.

**Invocation:** manual, e.g. `/sdlc-flow-maintainer` or *"check sdlc-flow"*.

## 7. Documentation updates

### 7.1 `docs/polly.md` — full rewrite

The current 210-line orchestrator description no longer matches reality. Rewrite from scratch as ~80-100 lines covering:

1. What Polly is now: advisor, fire-and-die, opt-in.
2. How Polly decides what to suggest (reads `sdlc-flow.md` + checks fingerprints).
3. The 4-block output pattern (with example).
4. Triggers (slash, phrase, confusion-fallback — no auto).
5. How it differs from automatic skill triggering (most of the time, skills auto-engage from user intent; Polly is the "second opinion").
6. How to customise `sdlc-flow.md`.
7. What Polly never does (write code, auto-engage, persist state, interrupt).

Drop entirely: handoff protocol, state file, menu, voice hint, warm-framing paragraph, pair-vs-solo rationale (move that to `team-model.md` if not already there).

### 7.2 `docs/sdlc.md` — light touch

Audit for references to Polly as "orchestrator" / "conductor" and replace with "advisor". Remove mentions of `POLLY_START.md`, `polly-state.json`, auto-trigger behaviour. Update the SDLC phase narrative to reflect that skills can be triggered directly (Polly is optional). Estimate: ~20-40 lines changed.

### 7.3 `docs/multi-repo.md` — new

Move the multi-repo detection + scripts + VibeKanban compatibility block out of Polly's SKILL.md into this dedicated doc. Content roughly: workspace layout, `repositories.json` schema, `clone-all` / `switch-branch` / `pull-all` scripts, skills-policy rule, VibeKanban alignment note.

### 7.4 `CLAUDE.md` / `.github/copilot-instructions.md` / `AGENTS.md` / `.cursor/rules.md` / `GEMINI.md` templates

Covered in §4.1 (context-file meta-rule) and §5.1 (remove auto-trigger blocks). Also: add the "skills auto-engage from intent; Polly is opt-in advisor" framing near the top so the AI knows to engage skills directly when intent is clear.

## 8. Site updates — `D:\DEV\NONoise-frmw-site`

Repo is separate. **Local-only** edits prepared as commits; do not push without user approval.

### 8.1 `src/content.js`

- **`hero.sub`**: replace *"orchestratore (Polly) che guida il team dal requisito al merge"* with *"Polly, la consigliera opzionale che ti indica la skill giusta al momento giusto"* (IT + EN).
- **`signal.body`**: replace *"E con Polly, l'orchestratore che ti dice sempre cosa fare dopo"* with *"E con Polly, la consigliera che ti suggerisce la skill giusta quando sei incerto"* (IT + EN).
- **`polly` section (line 89+)**:
  - Title → *"Polly ti consiglia. Le skill lavorano."* / *"Polly advises. Skills work."*
  - Lead paragraph → rewrite around advisor model, `sdlc-flow.md`, 4-block output, fire-and-die, opt-in.
  - Triggers list → keep slash + phrase + confusion, **remove auto-trigger item** (the current third bullet about `POLLY_START.md`).
  - "Cosa Polly non fa" list → updated (no handoff, no state, no auto-trigger).

### 8.2 NEW: Visual flow explorer

New section on the site (component under `src/App.jsx` + content keys in `content.js`) that renders the 10 SDLC phases as a **horizontal interactive timeline**:

- Each phase is a clickable/hoverable card: id, label, mode (pair/solo), phase description.
- Clicking a phase opens a panel showing:
  - **Skill(s) associated** — with links to the existing "Skills" section anchors.
  - **When to run / when to skip** — one paragraph.
  - **Example prompt** — the same copy-pasteable block from `sdlc-flow.md`, rendered as a code block with a one-click "copy" button. IT/EN toggle follows the site's existing language toggle.
- Below the timeline: a toggle *"Spiegazione parlata"* / *"Narrated walkthrough"* → expands a verbose prose walkthrough of the full flow (~300-500 words).

Visual style: matches the existing site aesthetic (check `styles.css` for tokens; don't introduce new palette). Responsive: on mobile, timeline collapses to a vertical stack.

### 8.3 Impeccable listed as default-installed

(Rolls in the isolated fix committed as `294033a` on 2026-04-22.)

- In the site's skills area, move `impeccable/*` from "optional / on-demand" to "default-installed" grouping.
- Update any catalog count / tagline that references vendored skills.
- `content.js` likely has a `skills:` or `tools:` section listing these — audit and adjust.

### 8.4 `src/App.jsx`

Audit for hardcoded strings outside `content.js`. If found, either move to `content.js` or patch in place.

### 8.5 Commit strategy on site repo

Two commits, both local-only:

1. `feat(content): Polly advisor redesign + impeccable default-install`
2. `feat(flow): visual flow explorer component`

User reviews locally before push.

## 9. Language handling

The scaffold already captures a language hint in `prompts.ts` and writes it into context files. Polly reads the installed language from `nonoise.config.json` (or context file frontmatter) and renders the 4-block output in that language. If unavailable or unknown, defaults to the language the user is typing in this turn; IT and EN are first-class, other languages best-effort.

The `sdlc-flow.md` default template ships with `label.it` and `label.en` and IT+EN example prompts. Users who want a third language add it by hand in their project's copy.

## 10. Non-goals

- **Rewriting vendored skills** (superpowers, impeccable, skill-creator, pptx) — out of scope. The context-file rule is their only touchpoint.
- **Changing `[solo]` native skills** (`atr`, `writing-plans`, `executing-plans`, debug skills) — out of scope; their turn-by-turn cadence is correct for their use case.
- **Multi-language beyond IT+EN as first-class** — other languages remain best-effort via detection.
- **Migration tool for existing scaffolded projects** — users with older scaffolds keep their `polly-state.json` / `POLLY_START.md` as harmless leftovers. Release notes point at manual cleanup steps; no code-path to auto-migrate.
- **Voice-to-text tools integration** — advisor mode doesn't need the Step 0 hint; references section dropped. Users who want voice still install Wispr/Handy/Superwhisper themselves.
- **Removing `/polly` entirely** — several parts of the audience still want a "give me advice" entry point. Removing it is a future option, not this spec.

## 11. Open questions / risks

1. **Fingerprint reliability.** Fingerprint globs assume users write docs in the canonical `docs/` layout. Projects that diverge (different docs tree, custom folders) will be mis-detected. Mitigation: document that `sdlc-flow.md` is editable — users with custom layouts update their `fingerprint` fields.
2. **Context-file rule ignoring.** There's empirical risk that AIs ignore the "ask for full scope" meta-rule once inside a skill. The C-light preamble on native skills mitigates for native; vendored skills remain at risk. Accept as a known limitation; iterate if field feedback shows persistent problems.
3. **Site Visual flow explorer scope creep.** The component is non-trivial. If writing-plans estimates it as >1 day of work, consider shipping it as a follow-up PR rather than the Polly redesign PR.
4. **Impeccable default-install already committed.** The `294033a` commit on `main` is isolated and doesn't depend on this spec. The site update in §8.3 *does* depend on it, but reflects reality post-commit.
5. **Self-hosting consistency.** This repo's own `.claude/skills/polly/` needs to mirror the new Polly (we self-host). `packages/skills/polly/` is the source; `.claude/` is synced from there by how the monorepo is set up. Confirm in writing-plans that the self-host still works after the cleanup.

## 12. Acceptance criteria

Done when:

- [ ] `packages/skills/polly/SKILL.md` rewritten to advisor model (~80-120 lines).
- [ ] `packages/skills/polly/references/` cleaned per §5.2.
- [ ] `.nonoise/sdlc-flow.md` template added to `packages/templates/single-project/_always/.nonoise/` and `packages/templates/multi-repo/_always/.nonoise/`.
- [ ] `scaffold.ts`: `POLLY_START.md`, `polly-state.json`, state schema, state CLI — no longer written.
- [ ] Auto-trigger blocks removed from all context-file templates.
- [ ] Meta-rule block (§4.1) added to all context-file templates.
- [ ] One-line preamble added to the 6 native `[pair]` skills listed in §4.2.
- [ ] `.claude/skills/sdlc-flow-maintainer/` created in this repo (self-hosted, not bundled).
- [ ] `docs/polly.md` rewritten, `docs/sdlc.md` aligned, `docs/multi-repo.md` created.
- [ ] All snapshot tests regenerated and committed.
- [ ] `pnpm -r run test` + `pnpm -r run typecheck` green.
- [ ] Site: `content.js` updated (§8.1), Visual flow explorer component added (§8.2), impeccable moved to default-installed (§8.3) — commits prepared locally, not pushed.
- [ ] Release notes drafted for `create-nonoise` v+1 covering: Polly advisor mode, removal of auto-trigger, `sdlc-flow.md` as new project artefact, impeccable default-install.

## 13. Out-of-band changes in this session (context for reviewer)

The **impeccable default-install** fix was applied and committed as `294033a` on `main` before this spec was written, at the user's explicit request for an isolated fix. That commit is independent of this spec and did not alter Polly's design — it only fixed a latent gap (bundle said impeccable was installed; reality didn't match).
