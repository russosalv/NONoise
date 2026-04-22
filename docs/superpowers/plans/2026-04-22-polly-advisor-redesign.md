# Polly advisor redesign — Plan A (core)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Polly from a multi-step SDLC orchestrator into a one-shot, stateless, opt-in advisor driven by a project-local `.nonoise/sdlc-flow.md`, and reshape bundled SDLC skills to ask for the full scope in one message instead of turn-by-turn questionnaires.

**Architecture:** Scaffold stops writing the POLLY_START marker and state files. A new `.nonoise/sdlc-flow.md` template (YAML frontmatter + per-phase Markdown sections) ships in both workspace templates and drives Polly at runtime. Polly's `SKILL.md` is rewritten to ~100 lines covering the 4-block advisor output pattern. A meta-rule added to every context-file template (CLAUDE.md / Copilot / Cursor / Gemini / AGENTS) and a one-line preamble on 6 native `[pair]` SDLC skills together implement the "ask for full scope in one shot" behaviour change. `docs/polly.md` is rewritten, `docs/sdlc.md` aligned, and `docs/multi-repo.md` created to absorb the multi-repo detection block that used to live inside Polly.

**Tech Stack:** TypeScript (create-nonoise CLI), Handlebars templates, Vitest snapshot tests, pnpm workspace, Changesets. Shell: Git Bash on Windows — use forward-slash paths in commands.

**Related spec:** `docs/superpowers/specs/2026-04-22-polly-advisor-redesign-design.md`

**Follow-on plans (not covered here):**
- **Plan B** — `sdlc-flow-maintainer` self-hosted skill at `.claude/skills/sdlc-flow-maintainer/` (independent dev tool for the NONoise maintainer).
- **Plan C** — Site updates in `D:\DEV\NONoise-frmw-site` (`content.js` Polly section, Visual flow explorer, impeccable default-install reflection).

---

## File structure — what this plan touches

### Create

- `packages/templates/single-project/_always/.nonoise/sdlc-flow.md` — new default flow
- `packages/templates/multi-repo/_always/.nonoise/sdlc-flow.md` — same content, adapted for multi-repo phrasing
- `packages/skills/polly/references/sdlc-flow.default.md` — embedded fallback copy Polly uses if the project's flow file is missing
- `docs/multi-repo.md` — multi-repo detection + scripts + VibeKanban content moved out of Polly

### Modify

- `packages/create-nonoise/src/scaffold.ts` — drop `writePollyStartMarker`, `writePollyInitialState`, `writePollyStateSchema`, `writePollyStateCli` calls + their definitions
- `packages/skills/polly/SKILL.md` — rewrite to advisor model (~100 lines, down from ~350)
- `packages/templates/single-project/_if-claude-code/CLAUDE.md.hbs`
- `packages/templates/multi-repo/_if-claude-code/CLAUDE.md.hbs`
- `packages/templates/single-project/_if-copilot/.github/copilot-instructions.md.hbs`
- `packages/templates/multi-repo/_if-copilot/.github/copilot-instructions.md.hbs`
- `packages/templates/single-project/_if-cursor/.cursor/rules.md.hbs`
- `packages/templates/multi-repo/_if-cursor/.cursor/rules.md.hbs`
- `packages/templates/single-project/_if-gemini-cli/GEMINI.md.hbs`
- `packages/templates/multi-repo/_if-gemini-cli/GEMINI.md.hbs`
- `packages/templates/single-project/_always/AGENTS.md.hbs`
- `packages/templates/multi-repo/_always/AGENTS.md.hbs`
- `packages/skills/requirements-ingest/SKILL.md` — one-line preamble
- `packages/skills/bmad-agent-analyst/SKILL.md` — one-line preamble
- `packages/skills/bmad-advanced-elicitation/SKILL.md` — one-line preamble
- `packages/skills/arch-brainstorm/SKILL.md` — one-line preamble
- `packages/skills/arch-decision/SKILL.md` — one-line preamble
- `packages/skills/sprint-manifest/SKILL.md` — one-line preamble
- `docs/polly.md` — rewrite to advisor model
- `docs/sdlc.md` — align references to Polly advisor mode

### Delete

- `packages/skills/polly/references/handoff-protocol.md`
- `packages/skills/polly/references/state-schema.md`
- `packages/skills/polly/references/menu.md`
- `packages/skills/polly/references/voice-tools.md`
- `packages/skills/polly/references/fingerprints.md` — content absorbed into `sdlc-flow.md` per-phase `fingerprint` field
- `packages/skills/polly/references/decision-tree.md` — content becomes the default `sdlc-flow.md` template
- `packages/skills/polly/references/skill-invocation-matrix.md` — content absorbed into `sdlc-flow.md` per-phase `skill` field + example prompts

### Keep (unchanged)

- `packages/skills/polly/references/fallback-messages.md`
- `packages/skills/polly/references/external-tools.md`
- `packages/skills/polly/references/project-tools.md`

---

## Task 1 — Scaffold: stop writing POLLY_START and state files

**Files:**
- Modify: `packages/create-nonoise/src/scaffold.ts`
- Test: `packages/create-nonoise/test/integration/scaffold.test.ts` (existing tests; check first)

**Context:** `supportsPolly()` currently gates a 4-call block: `writePollyStartMarker`, `writePollyStateSchema`, `writePollyInitialState`, `writePollyStateCli`. All four become no-ops. The `supportsPolly` helper also becomes dead code after this task if it has no other callers.

- [ ] **Step 1: Search for existing tests that assert Polly marker/state files exist**

Run:
```bash
pnpm --filter create-nonoise exec vitest run --no-coverage -t "polly" 2>&1 | head -40
```

Record which test files reference `POLLY_START.md`, `polly-state.json`, `polly-state.schema.json`, `polly-state.mjs`. These tests will need updating.

Also `grep` the test directory:
```bash
grep -rn "POLLY_START\|polly-state" packages/create-nonoise/test/ || true
```

- [ ] **Step 2: Write a failing test asserting the marker is NOT written**

Add to `packages/create-nonoise/test/integration/scaffold.test.ts` (find a suitable `describe` block, otherwise append a new one):

```ts
it('does not write Polly state-machinery files (POLLY_START.md, polly-state.json, polly-state.schema.json, polly-state.mjs)', async () => {
  const ctx = makeCtx({ aiTools: { claudeCode: true, copilot: true, cursor: false, geminiCli: false, codex: false } });
  const projectPath = await runScaffold(ctx);
  for (const f of ['POLLY_START.md', 'polly-state.json', 'polly-state.schema.json', 'polly-state.mjs']) {
    const p = join(projectPath, '.nonoise', f);
    expect(existsSync(p), `${f} should not exist after scaffold`).toBe(false);
  }
});
```

(Adapt helper names `makeCtx` / `runScaffold` to the actual helpers used elsewhere in that test file — read the file's top to match the local convention.)

- [ ] **Step 3: Run the new test and confirm it FAILS**

Run:
```bash
pnpm --filter create-nonoise exec vitest run -t "does not write Polly state-machinery"
```

Expected: FAIL — at least `POLLY_START.md` will still exist.

- [ ] **Step 4: Delete the four writer function calls in `scaffold()`**

In `packages/create-nonoise/src/scaffold.ts`, remove the block:

```ts
if (supportsPolly(ctx.aiTools)) {
  await writePollyStartMarker(ctx.projectPath);
  await writePollyStateSchema(ctx.projectPath);
  await writePollyInitialState(ctx.projectPath);
  await writePollyStateCli(ctx.projectPath);
}
```

Delete the four function definitions below (`writePollyStartMarker`, `writePollyStateSchema`, `writePollyInitialState`, `writePollyStateCli`). Delete the `supportsPolly` helper function and its import in any file that used it. Remove any now-unused imports from `node:fs/promises` that were only used by those writers.

- [ ] **Step 5: Update existing tests that asserted marker/state presence**

Based on Step 1 output: for every existing test that asserts any of `POLLY_START.md`, `polly-state.json`, `polly-state.schema.json`, `polly-state.mjs` exist post-scaffold — invert the assertion to `toBe(false)` or delete the assertion if the whole test was only about that. If a whole test file was exclusively about Polly state, delete the file.

- [ ] **Step 6: Regenerate snapshots and verify green**

Run:
```bash
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run -u
pnpm --filter create-nonoise exec vitest run
```

Expected: all 83+ tests pass (the count will shift as tests are added/removed). The new test from Step 2 now passes.

- [ ] **Step 7: Commit**

```bash
git add packages/create-nonoise/src/scaffold.ts packages/create-nonoise/test/
git commit -m "feat(scaffold): stop writing Polly state-machinery files

POLLY_START.md, polly-state.json, polly-state.schema.json, and
polly-state.mjs are no longer written at scaffold time. Polly v2 is
stateless and has no auto-trigger — the advisor model reads the
project-local sdlc-flow.md instead.

Existing scaffolded projects keep their stale .nonoise/polly-state.*
files as harmless leftovers; release notes will document manual cleanup."
```

---

## Task 2 — New `.nonoise/sdlc-flow.md` template

**Files:**
- Create: `packages/templates/single-project/_always/.nonoise/sdlc-flow.md`
- Create: `packages/templates/multi-repo/_always/.nonoise/sdlc-flow.md`
- Test: `packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap` (auto-updated)

**Context:** `_always/.nonoise/` does not exist yet. Creating the directory and file is enough — the scaffold's `resolveTemplateFiles` walks `_always/` unconditionally. This replaces the old state machinery with a single project-editable flow doc.

- [ ] **Step 1: Create the directory + file for single-project**

Write `packages/templates/single-project/_always/.nonoise/sdlc-flow.md` with:

````markdown
---
version: 1
default_language: it
phases:
  - id: stack
    label:
      it: "Stack e vincoli"
      en: "Stack and constraints"
    skill: null
    fingerprint: null
    mode: pair
    conversational: true
  - id: requirements-ingest
    label:
      it: "Ingest di materiale esistente"
      en: "Existing material ingest"
    skill: requirements-ingest
    fingerprint: "docs/requirements/ingested/**/*.md"
    mode: pair
    skip_if: "no existing PDFs / docs / transcripts to ingest"
  - id: requirements-elicit
    label:
      it: "Elicitation dei requisiti"
      en: "Requirements elicitation"
    skill: bmad-agent-analyst
    fingerprint: "docs/requirements/**/*.md"
    mode: pair
  - id: feature-design
    label:
      it: "Design della feature / prodotto"
      en: "Feature / product design"
    skill: "superpowers:brainstorming"
    fingerprint: "docs/superpowers/specs/**/*.md"
    mode: pair
    skip_if: "pure refactor with no new feature"
  - id: arch-brainstorm
    label:
      it: "Opzioni architetturali"
      en: "Architectural options"
    skill: arch-brainstorm
    fingerprint: "docs/architecture/brainstorm/**/*.md"
    mode: pair
    skip_if: "feature fits an existing, decided architecture"
  - id: arch-decision
    label:
      it: "Decisione architetturale"
      en: "Architectural decision"
    skill: arch-decision
    fingerprint: "docs/architecture/decisions/**/*.md"
    mode: pair
  - id: arch-sync
    label:
      it: "Sync architetturale (opzionale)"
      en: "Architecture sync (optional)"
    skill: arch-sync
    fingerprint: "docs/architecture/synced/**/*.md"
    mode: solo
    skip_if: "arch-decision PASS doesn't need propagation yet"
  - id: sprint-manifest
    label:
      it: "Sprint breakdown"
      en: "Sprint breakdown"
    skill: sprint-manifest
    fingerprint: "docs/sprints/Sprint-*/manifest.md"
    mode: pair
  - id: implementation
    label:
      it: "Implementazione — per task"
      en: "Implementation — per task"
    skill: "superpowers:writing-plans"
    fingerprint: "docs/superpowers/plans/**/*.md"
    mode: solo
  - id: acceptance
    label:
      it: "Acceptance test run"
      en: "Acceptance test run"
    skill: atr
    fingerprint: "docs/atr/**/report.md"
    mode: solo
---

# SDLC flow

This file is read by **Polly** (`/polly`, `avvia polly`, `start polly`) to decide what to suggest next. It is project-local — edit it to match your actual flow.

Each phase below has: when to run it, when to skip, and an example prompt in Italian + English you can paste into chat to trigger the skill automatically.

## stack

Conversational phase — no skill. Describe your stack, constraints, team shape. Polly uses this to tailor later suggestions.

- Run when: project is newly scaffolded and `README.md` / `nonoise.config.json` haven't been fleshed out.
- Skip when: the README already contains the stack decisions.

## requirements-ingest

```prompt (it)
Ho del materiale esistente da cui partire: <lista PDF / DOCX / link / trascrizioni / screenshot>. Ingerisci tutto il materiale, estrai requisiti e produci un dossier in docs/requirements/ingested/. Procedi.
```

```prompt (en)
I have existing material to start from: <list of PDFs / DOCX / links / transcripts / screenshots>. Ingest everything, extract requirements, and produce a dossier under docs/requirements/ingested/. Proceed.
```

Skip when: there is no pre-existing source material — go straight to requirements-elicit.

## requirements-elicit

```prompt (it)
Mi servono requisiti strutturati per <feature / progetto>. Lo scope completo è <chi usa, cosa fa, perché, vincoli, criteri di successo>. Elicita a fondo, produci spec EARS/INVEST in docs/requirements/. Procedi.
```

```prompt (en)
I need structured requirements for <feature / project>. Full scope: <who uses it, what it does, why, constraints, success criteria>. Elicit deeply, produce EARS/INVEST-style spec under docs/requirements/. Proceed.
```

## feature-design

```prompt (it)
Fai brainstorming sulla feature <nome>. Requisiti in docs/requirements/<file>.md. Vincoli noti: <…>. Esplora 2-3 approcci con trade-off e scegli, poi salva uno spec in docs/superpowers/specs/. Procedi.
```

```prompt (en)
Brainstorm the feature <name>. Requirements at docs/requirements/<file>.md. Known constraints: <…>. Explore 2-3 approaches with trade-offs, pick one, save a spec under docs/superpowers/specs/. Proceed.
```

Skip when: the work is a pure refactor with no new feature.

## arch-brainstorm

```prompt (it)
Voglio esplorare opzioni architetturali per <area / feature>. Contesto: <scope, vincoli, pattern canonici attesi>. Produci 2-3 opzioni con trade-off e una raccomandazione in docs/architecture/brainstorm/. Procedi.
```

```prompt (en)
I want to explore architectural options for <area / feature>. Context: <scope, constraints, expected canonical patterns>. Produce 2-3 options with trade-offs and a recommendation under docs/architecture/brainstorm/. Proceed.
```

Skip when: the feature fits an already-decided architecture.

## arch-decision

```prompt (it)
Porta a decisione l'opzione architetturale <scelta> da docs/architecture/brainstorm/<file>.md. Esegui il processo arch-decision (incluso Quint FPF) e pubblica l'ADR finale in docs/architecture/decisions/. Procedi.
```

```prompt (en)
Drive option <choice> from docs/architecture/brainstorm/<file>.md to a decision. Run the arch-decision process (including Quint FPF) and publish the final ADR under docs/architecture/decisions/. Proceed.
```

## arch-sync

```prompt (it)
Propaga la decisione architetturale <ADR> ai documenti di progetto (C4, ADR index, README). Procedi.
```

```prompt (en)
Propagate architectural decision <ADR> to the project documents (C4, ADR index, README). Proceed.
```

Optional — skip if the decision doesn't yet need propagation.

## sprint-manifest

```prompt (it)
Spezza <ADR / design doc> in uno sprint operativo. Produci Sprint-<N>/manifest.md + task JSON in docs/sprints/. Target tracker: <none / GitHub / Jira / Azure DevOps>. Procedi.
```

```prompt (en)
Break down <ADR / design doc> into a workable sprint. Produce Sprint-<N>/manifest.md + task JSON under docs/sprints/. Target tracker: <none / GitHub / Jira / Azure DevOps>. Proceed.
```

## implementation

```prompt (it)
Devo implementare il task <id> dello Sprint-<N>. Scrivi un plan dettagliato e poi eseguilo via subagent-driven-development con TDD. Procedi.
```

```prompt (en)
I need to implement task <id> of Sprint-<N>. Write a detailed plan and execute it via subagent-driven-development with TDD. Proceed.
```

## acceptance

```prompt (it)
Esegui l'Acceptance Test Run per <feature>. Produci testbook + Playwright run + report in docs/atr/. Procedi.
```

```prompt (en)
Run the Acceptance Test Run for <feature>. Produce testbook + Playwright run + report under docs/atr/. Proceed.
```
````

- [ ] **Step 2: Create the multi-repo variant**

Write `packages/templates/multi-repo/_always/.nonoise/sdlc-flow.md` with the SAME content as Step 1, **plus** an additional phase at the top, right after the frontmatter marker and before the `stack` phase:

In the frontmatter, insert as the first entry of `phases:`:

```yaml
  - id: multi-repo-setup
    label:
      it: "Setup del workspace multi-repo"
      en: "Multi-repo workspace setup"
    skill: null
    fingerprint: "repos/**/.git"
    mode: pair
    conversational: true
```

In the body, insert `## multi-repo-setup` as the first per-phase section:

````markdown
## multi-repo-setup

Conversational phase — see `docs/multi-repo.md` for scripts (`clone-all`, `switch-branch`, `pull-all`) and the skills-policy rule.

- Run when: `repositories.json` has been filled but `repos/` is empty.
- Skip when: all repos are already cloned and on the expected branch.
````

- [ ] **Step 3: Build + snapshot regen**

```bash
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run -u
```

Expected: snapshot updated to include `.nonoise/sdlc-flow.md` in the scaffolded tree for both workspace kinds. Review the diff in `canonical.test.ts.snap` to confirm only the expected new paths and content appeared.

- [ ] **Step 4: Commit**

```bash
git add packages/templates/single-project/_always/.nonoise packages/templates/multi-repo/_always/.nonoise packages/create-nonoise/test/
git commit -m "feat(templates): add .nonoise/sdlc-flow.md default template

Project-local, user-editable SDLC flow doc that drives Polly v2. YAML
frontmatter declares phases (id, label IT/EN, skill, fingerprint, mode,
optional skip_if); per-phase Markdown body holds copy-pasteable example
prompts in IT + EN. Multi-repo template adds a pre-phase for workspace
setup."
```

---

## Task 3 — Context-file templates: remove auto-trigger, add meta-rule

**Files (10 total):**
- Modify: `packages/templates/single-project/_if-claude-code/CLAUDE.md.hbs`
- Modify: `packages/templates/multi-repo/_if-claude-code/CLAUDE.md.hbs`
- Modify: `packages/templates/single-project/_if-copilot/.github/copilot-instructions.md.hbs`
- Modify: `packages/templates/multi-repo/_if-copilot/.github/copilot-instructions.md.hbs`
- Modify: `packages/templates/single-project/_if-cursor/.cursor/rules.md.hbs`
- Modify: `packages/templates/multi-repo/_if-cursor/.cursor/rules.md.hbs`
- Modify: `packages/templates/single-project/_if-gemini-cli/GEMINI.md.hbs`
- Modify: `packages/templates/multi-repo/_if-gemini-cli/GEMINI.md.hbs`
- Modify: `packages/templates/single-project/_always/AGENTS.md.hbs`
- Modify: `packages/templates/multi-repo/_always/AGENTS.md.hbs`

**Context:** Every template currently contains a block telling the AI *"if `.nonoise/POLLY_START.md` exists, invoke Polly first then delete the marker"*. That block is deleted. In its place, a new block is added that (a) tells the AI to engage skills directly based on user intent and (b) instructs the AI to ask for full scope when engaging any SDLC skill.

- [ ] **Step 1: Identify the exact auto-trigger block in one of the files**

Read `packages/templates/single-project/_if-claude-code/CLAUDE.md.hbs`. Find the paragraph that mentions `.nonoise/POLLY_START.md`. It is typically 3-8 lines of text forming a cohesive block — note its exact start and end markers (surrounding blank lines or markdown headers) so you can locate it in the other 9 files.

- [ ] **Step 2: Delete the auto-trigger block from all 10 files**

For each file listed above, remove the Polly auto-trigger block in full. The surrounding headers should remain — only the block referencing `POLLY_START.md` goes. The file's Polly section (if any header-level section exists about Polly) can stay but its description should no longer promise auto-invocation.

In each file, also update any adjacent sentence that described Polly as an "orchestrator" that "guides you step by step" — change it to describe Polly as an "advisor" that "suggests the right skill when you're unsure". If such a sentence is tightly coupled to the deleted block, just delete it; the next task (§5 of the spec) keeps Polly as opt-in, not a headline feature.

- [ ] **Step 3: Add the meta-rule block to all 10 files**

In each file, immediately after the top-level section that introduces the repo's AI tooling (usually the section right after the intro paragraph), add this block verbatim:

```markdown
## Working with skills

This project ships a curated set of skills under `.claude/skills/`. When the user describes a task, your default path is to **engage a skill directly** based on the intent — do not route through Polly unless the user is explicitly lost ("where do I start?", "what's next?", "sono perso"). Examples: "I need to reverse engineer this codebase" → engage `reverse-engineering`; "draft requirements for X" → engage `bmad-agent-analyst`; "sprint breakdown for the ADR" → engage `sprint-manifest`.

**When you engage any SDLC skill, your first action is to ask the user for the full scope in one go — who, what, why, constraints, success criteria.** Use the skill's internal structure as a schema to fill, not as a turn-by-turn questionnaire. Only ask follow-up questions for genuine blockers (missing critical information you cannot infer). This applies to every SDLC skill — native, bundled, or vendored (superpowers/impeccable/skill-creator).

If the user is unsure which skill to use, they can invoke `/polly` (Claude Code), say "avvia polly" / "start polly" (Copilot and others), or you can offer Polly proactively as a fallback — never as the default.
```

The block is English-only inside these templates; Polly's user-facing output still respects the `default_language` from `sdlc-flow.md` / `nonoise.config.json`.

- [ ] **Step 4: Build + snapshot regen**

```bash
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run -u
```

Review the `canonical.test.ts.snap` diff — you should see: (a) old auto-trigger paragraph gone from each context file, (b) new "Working with skills" block inserted. No other content should have changed.

- [ ] **Step 5: Sanity-check by running the full test suite**

```bash
pnpm --filter create-nonoise exec vitest run
```

Expected: all tests pass. If any integration test references the deleted auto-trigger phrase, update or drop it per the same logic as Task 1 Step 5.

- [ ] **Step 6: Commit**

```bash
git add packages/templates/ packages/create-nonoise/test/
git commit -m "feat(templates): context-file meta-rule for skill engagement

Remove the .nonoise/POLLY_START.md auto-trigger block from all 10
context-file templates (CLAUDE.md, copilot-instructions.md, rules.md,
GEMINI.md, AGENTS.md x single-project + multi-repo). Add a new
'Working with skills' block telling the AI to (a) engage skills
directly from user intent without routing through Polly by default,
and (b) ask for the full scope in one shot when engaging an SDLC
skill, using the skill's structure as a schema to fill."
```

---

## Task 4 — Polly references cleanup

**Files:**
- Delete: `packages/skills/polly/references/handoff-protocol.md`
- Delete: `packages/skills/polly/references/state-schema.md`
- Delete: `packages/skills/polly/references/menu.md`
- Delete: `packages/skills/polly/references/voice-tools.md`
- Delete: `packages/skills/polly/references/fingerprints.md`
- Delete: `packages/skills/polly/references/decision-tree.md`
- Delete: `packages/skills/polly/references/skill-invocation-matrix.md`
- Create: `packages/skills/polly/references/sdlc-flow.default.md`

**Context:** Seven reference files become obsolete or get absorbed into `sdlc-flow.md`. One new file is added: the embedded fallback Polly uses when the project's `.nonoise/sdlc-flow.md` is missing.

- [ ] **Step 1: Delete the seven obsolete reference files**

```bash
cd packages/skills/polly/references
rm handoff-protocol.md state-schema.md menu.md voice-tools.md fingerprints.md decision-tree.md skill-invocation-matrix.md
cd ../../../../
```

- [ ] **Step 2: Create the embedded fallback**

Copy the content you wrote into `packages/templates/single-project/_always/.nonoise/sdlc-flow.md` (Task 2 Step 1) into `packages/skills/polly/references/sdlc-flow.default.md`. **Prepend** the following banner at the very top of the file:

```markdown
<!--
Embedded fallback copy of the default SDLC flow. Polly reads this ONLY
when the project-local .nonoise/sdlc-flow.md is missing. Keep in sync
with packages/templates/single-project/_always/.nonoise/sdlc-flow.md.
-->

```

- [ ] **Step 3: Build + snapshot regen**

```bash
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run -u
```

Review diffs:
- `canonical.test.ts.snap` — the 7 deleted files vanish from `.claude/skills/polly/references/`, the new `sdlc-flow.default.md` appears.
- All other tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/skills/polly/references packages/create-nonoise/test/
git commit -m "refactor(polly): prune references for advisor mode

Delete 7 reference files obsoleted by the advisor redesign:
- handoff-protocol.md, state-schema.md, menu.md, voice-tools.md:
  no longer applicable (no handoff, no state file, no menu, no Step 0
  voice hint).
- fingerprints.md, decision-tree.md, skill-invocation-matrix.md:
  content absorbed into the new .nonoise/sdlc-flow.md per-phase
  schema (fingerprint, phases, example prompts).

Add references/sdlc-flow.default.md as the embedded fallback Polly
reads when the project-local flow file is missing."
```

---

## Task 5 — Rewrite `packages/skills/polly/SKILL.md`

**Files:**
- Modify: `packages/skills/polly/SKILL.md` (full rewrite)

**Context:** Reduce from ~350 lines to ~100 lines. New SKILL.md describes the advisor model, the 4-block output pattern, entry points, and how to read `sdlc-flow.md`. No handoff, no state, no menu, no voice hint, no pair-vs-solo rationale (moves to `team-model.md` which already exists).

- [ ] **Step 1: Replace the file contents**

Overwrite `packages/skills/polly/SKILL.md` with:

```markdown
---
name: polly
description: NONoise SDLC advisor — reads the project-local .nonoise/sdlc-flow.md, tells the user where they are in the flow and what skill to engage next, with a copy-pasteable example prompt. Use when the user types `/polly`, says "start polly" / "avvia polly" / "run polly", or asks an ambiguous "where do I start?" / "what's next?" / "sono perso" and the intent does not map cleanly to a single skill. Polly is a one-shot advisor — produces one message then terminates. Does not orchestrate across turns, does not persist state, does not auto-trigger. The default path for any clear user intent is to engage the matching skill directly; Polly is a fallback for ambiguous cases.
---

# Polly — NONoise Advisor

Polly is a consigliera, not a conductor. Her job is to read the project-local flow, detect where the user is, and hand them the exact prompt to trigger the next useful skill — once, then get out of the way.

## When Polly runs

Three triggers, all equivalent:

1. **Manual slash:** user types `/polly` (Claude Code).
2. **Phrase:** user says "avvia polly" / "start polly" / "run polly" (Copilot and any other chat interface).
3. **Confusion fallback:** the user writes *"where do I start?"*, *"what's next?"*, *"sono perso"*, and the phrase does not map to a specific skill. In that case the AI offers Polly. If the phrase DOES map to a specific skill (e.g. "I need to reverse engineer this repo" → `reverse-engineering`), the AI engages that skill directly instead — do not route through Polly.

Polly is **opt-in and one-shot**. She produces one message per invocation and then terminates. She does not resume across sessions, does not persist state, does not auto-trigger.

## Step 1 — Read the flow

Open `.nonoise/sdlc-flow.md` in the project root. If it is missing, fall back to `references/sdlc-flow.default.md`. Parse the YAML frontmatter to get the list of phases; each phase has `id`, `label.{it,en}`, `skill`, `fingerprint` (a glob), `mode` (`pair`/`solo`), and optional `skip_if`.

## Step 2 — Detect where the user is

For each phase with a non-null `fingerprint`, check whether any file in the project matches that glob. The **current phase** is the last phase whose fingerprint is absent — i.e. walk the phases in order and stop at the first one that isn't done. If all phases have fingerprints present, the user is at "post-implementation" — point at the last phase (acceptance / observability / ops) or congratulate and suggest the dev trio loop for the next task.

## Step 3 — Produce the 4-block output

Render your single message in the user's language (`default_language` from the flow frontmatter, overridden by the user's current typing if clearly different). The message has exactly four blocks:

1. **Where you are in the flow.** One to three sentences. Cite which fingerprints you found and which you didn't.
2. **What I suggest next.** Name the next phase, its skill, and a one-line reason. Announce the mode (`pair` / `solo`) if relevant.
3. **How to trigger it (example prompt).** Copy the `prompt (it)` or `prompt (en)` block from the matching per-phase section of `sdlc-flow.md`, interpolating any `<placeholder>` tokens with the user's actual context if you can infer them. Render as a code block the user can copy verbatim. Add one short line: *"The skill will engage automatically from this prompt — you don't need to type `/<skill-name>`."*
4. **Or — delegate.** One line: *"Say 'vai' / 'go' and I'll engage the skill for you, then disappear."*

Then stop.

## Step 4 — If the user says "vai" / "go"

Engage the skill named in Step 2 with a short handoff line (*"Engaging `<skill>`. Take it over."*) and stop. Do not resume. If the user later asks "what's next?", it is a fresh Polly invocation (or a direct skill engagement by the AI) — not a continuation.

## What Polly never does

- **Writes code.** Polly is advisor-only.
- **Persists state.** No `polly-state.json`. Progress is always re-derived from filesystem fingerprints.
- **Auto-triggers.** No marker files. Polly runs only when invoked by `/polly`, a phrase, or a user-facing AI fallback.
- **Multi-turn orchestration.** One message per invocation, then she is done.
- **Modifies the user's environment.** No installs, no git operations, no file writes outside a rare cache.
- **Asks questions before the 4-block output.** If `sdlc-flow.md` is readable, Polly has everything she needs to produce the message; asking "what are you trying to do?" is a regression to the old pedagogue Polly.

## Fallback — missing `sdlc-flow.md`

If `.nonoise/sdlc-flow.md` is missing or unreadable, read `references/sdlc-flow.default.md` and produce the 4-block output against that. In your "Where you are" block, mention that the project-local flow file is missing and suggest creating one from the default (optional for the user).

## Fallback — missing skill

If the skill suggested for the next phase is not installed at `.claude/skills/<name>/`, follow `references/fallback-messages.md` to give the user the three-way option (skip / manual / install).

## Multi-repo workspaces

If `repositories.json` is present at project root (or `nonoise.config.json` has `"workspace": "multi-repo"`), add a single line at the top of the "Where you are" block: *"This is a multi-repo workspace — see `docs/multi-repo.md` for scripts and policy."* Do not walk through multi-repo setup yourself.

## References

- `references/fallback-messages.md` — what to say when a skill is missing.
- `references/external-tools.md` — info-only mentions (claude-mem, VibeKanban, call transcriptions).
- `references/project-tools.md` — bundled executables Polly may cite when the phase calls for them (`md-extractor`, `devops-push`, multi-repo scripts).
- `references/sdlc-flow.default.md` — embedded fallback copy of the flow.
```

- [ ] **Step 2: Build + snapshot regen**

```bash
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run -u
```

- [ ] **Step 3: Commit**

```bash
git add packages/skills/polly/SKILL.md packages/create-nonoise/test/
git commit -m "feat(polly): rewrite SKILL.md to advisor model

Replace the ~350-line orchestrator spec with a ~100-line advisor spec:
fire-and-die, stateless, opt-in, reads .nonoise/sdlc-flow.md (falls
back to references/sdlc-flow.default.md), produces a single 4-block
message (where-you-are / what-I-suggest / example-prompt / delegate),
then terminates. No more handoff protocol, state file, menu, voice
hint, or pair-vs-solo preamble. Multi-repo detection collapses to a
one-liner pointing at docs/multi-repo.md."
```

---

## Task 6 — Create `docs/multi-repo.md`

**Files:**
- Create: `docs/multi-repo.md`

**Context:** Move the multi-repo detection content out of Polly's SKILL.md (already removed in Task 5) into a dedicated doc.

- [ ] **Step 1: Write the file**

Write `docs/multi-repo.md` with:

```markdown
# Multi-repo workspaces

A NONoise multi-repo workspace is a single scaffolded project that holds one or more Git sub-repositories under `repos/<path>/`. It is useful when a feature spans multiple repos you want to align branch-by-branch — typically when your bug-triage tool (e.g. VibeKanban) treats the workspace as a single unit.

## Detection

A project is multi-repo when either:

- `repositories.json` exists at project root, or
- `nonoise.config.json` has `"workspace": "multi-repo"`.

## Layout

```
my-workspace/
├─ .claude/              # skills, agents, commands, hooks (workspace-wide)
├─ .nonoise/             # scaffold artefacts
├─ repositories.json     # declarative list of sub-repos
├─ repos/                # sub-repos live here
│  ├─ backend/           # = repositories.json entry { path: "backend" }
│  └─ frontend/          # = repositories.json entry { path: "frontend" }
├─ scripts/              # workspace-level scripts
│  ├─ clone-all.sh/.ps1
│  ├─ switch-branch.sh/.ps1
│  └─ pull-all.sh/.ps1
├─ CLAUDE.md
├─ AGENTS.md
└─ …
```

## `repositories.json`

Array of `{ name, path, url, branch? }` entries. The scaffold does not auto-clone sub-repos unless the user opts in; `./scripts/clone-all.(sh|ps1)` clones any entry whose working directory under `repos/<path>/` is empty.

## Scripts

- **`clone-all`** — iterates `repositories.json`, clones each entry into `repos/<path>/` if absent.
- **`switch-branch <branch>`** — switches every sub-repo to the given branch (creates tracking branch if needed). Aligns the workspace so tools like VibeKanban treat it as a single unit.
- **`pull-all`** — fast-forwards every sub-repo on its current branch.

Each script ships in both `.sh` (POSIX) and `.ps1` (PowerShell) flavours.

## Skills policy

Skills are installed **at workspace root** (`.claude/skills/`), not per sub-repo. Open the workspace in your AI tool to have them all available everywhere. If a specific sub-repo needs its own copy of `.claude/` (e.g. a sub-repo that will later spin out as an independent project), copy the directory in by hand — the framework does not force per-sub-repo duplication.

## VibeKanban alignment

Aligning all sub-repos on the same branch via `switch-branch` lets VibeKanban treat the workspace as one unit during bug triage. When a VibeKanban task spans multiple repos, align first, work second.

## Relationship to Polly

Polly detects multi-repo at the top of her output (*"This is a multi-repo workspace — see `docs/multi-repo.md` for scripts and policy."*) and does not walk through setup herself. The advisor's single-message output is not the place for a multi-step workspace bootstrap; that lives here.
```

- [ ] **Step 2: Commit**

```bash
git add docs/multi-repo.md
git commit -m "docs: new docs/multi-repo.md

Absorb the multi-repo detection + scripts + VibeKanban + skills-policy
content that used to live inside Polly's SKILL.md. Polly now references
this doc in a single line; the walkthrough lives in project docs where
users expect it."
```

---

## Task 7 — Native skill preamble on 6 `[pair]` SDLC skills

**Files:**
- Modify: `packages/skills/requirements-ingest/SKILL.md`
- Modify: `packages/skills/bmad-agent-analyst/SKILL.md`
- Modify: `packages/skills/bmad-advanced-elicitation/SKILL.md`
- Modify: `packages/skills/arch-brainstorm/SKILL.md`
- Modify: `packages/skills/arch-decision/SKILL.md`
- Modify: `packages/skills/sprint-manifest/SKILL.md`

**Context:** One-line preamble reinforcing the context-file meta-rule at the SKILL.md level. Vendored skills are not touched.

- [ ] **Step 1: For each of the 6 files, insert the preamble after the frontmatter**

The preamble line:

```markdown
> **Before running this skill's procedure: ask the user to describe the full scope in one message (who, what, why, constraints, success criteria). Treat the rest of this document as a schema to fill against their answer, not a turn-by-turn questionnaire. Only ask follow-up questions for genuine blockers.**
```

Insertion rule: find the closing `---` of the YAML frontmatter, then the first header line below it (typically `# <Skill Name>`). Insert the preamble between the frontmatter close and the first header — leave one blank line on each side.

Example before:
```markdown
---
name: requirements-ingest
description: …
---

# Requirements Ingest

<body…>
```

Example after:
```markdown
---
name: requirements-ingest
description: …
---

> **Before running this skill's procedure: ask the user to describe the full scope in one message (who, what, why, constraints, success criteria). Treat the rest of this document as a schema to fill against their answer, not a turn-by-turn questionnaire. Only ask follow-up questions for genuine blockers.**

# Requirements Ingest

<body…>
```

- [ ] **Step 2: Build + snapshot regen**

```bash
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run -u
```

Diff should show only the 6 files gaining the preamble line.

- [ ] **Step 3: Commit**

```bash
git add packages/skills/ packages/create-nonoise/test/
git commit -m "feat(skills): preamble on 6 native [pair] SDLC skills

Ask for full scope in one message instead of walking a turn-by-turn
questionnaire. Reinforces the context-file meta-rule at the skill
level for AIs that ignore the context block once inside a SKILL.md.
Vendored skills (superpowers, impeccable, skill-creator) are not
modified."
```

---

## Task 8 — Rewrite `docs/polly.md`

**Files:**
- Modify: `docs/polly.md` (full rewrite)

**Context:** Current doc is 210 lines of orchestrator description. Replace with ~90 lines on advisor mode.

- [ ] **Step 1: Replace the file contents**

Overwrite `docs/polly.md` with:

```markdown
# Polly — the SDLC advisor

Polly is NONoise's opt-in advisor. She does not orchestrate the SDLC — she reads the project's flow, tells you where you are in it, and hands you the exact prompt to trigger the next useful skill. One message per invocation, then she terminates.

Polly is a skill — `packages/skills/polly/SKILL.md` — not a runtime component. Any AI tool that can load a skill can run her; any AI tool that reads Markdown can follow her source manually.

## The default path isn't Polly — it's direct skill engagement

A catalog of 40+ skills is useful when you can describe what you want and the AI picks the matching skill. Context files (`CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, `.cursor/rules.md`, `GEMINI.md`) tell the AI to do exactly that: if the user says "I need to reverse engineer this repo", engage `reverse-engineering` directly. Polly is the fallback for when intent is ambiguous.

If you know what you want, just say it — skip Polly. If you don't, `/polly`.

## Triggers

Three equivalent ways:

1. **Slash.** `/polly` in Claude Code. Wired via `.claude/commands/polly.md`.
2. **Phrase.** *"start polly"*, *"avvia polly"*, *"run polly"* — Copilot and any other chat interface.
3. **Confusion fallback.** If the user writes *"where do I start?"*, *"what's next?"*, *"sono perso"* and the phrase does not map to a specific skill, the AI offers Polly. If the phrase does map to a specific skill, the AI engages that skill directly and does not route through Polly.

There is no auto-trigger. Older NONoise versions wrote `.nonoise/POLLY_START.md` as a first-session marker; that mechanism has been removed. Existing scaffolds can delete the leftover marker safely.

## The 4-block output pattern

Every Polly invocation produces exactly one message with four blocks:

1. **Where you are in the flow.** Polly reads `.nonoise/sdlc-flow.md`, walks the phases, checks each fingerprint against the filesystem, and reports the phase you are in.
2. **What I suggest next.** The next phase, its associated skill, and a one-line reason.
3. **How to trigger it.** A copy-pasteable example prompt in your language. The skill will engage automatically from this prompt — no need to type `/<skill-name>`.
4. **Or — delegate.** Polly offers: *"Say 'vai' / 'go' and I'll engage the skill for you, then disappear."*

After producing the message, Polly terminates. If the user says *"vai"*, Polly engages the skill with one handoff line and terminates. She does not resume.

## `.nonoise/sdlc-flow.md` — the source of truth

Every scaffolded project gets a default `.nonoise/sdlc-flow.md`. YAML frontmatter declares the phases; per-phase Markdown sections hold example prompts in IT + EN. The file is user-editable: remove phases that don't apply, add custom ones, rewrite prompts to match your domain.

Polly reads the project-local copy every invocation. If it is missing, she falls back to `packages/skills/polly/references/sdlc-flow.default.md` (the embedded copy shipped with the skill) and mentions the fallback in her output.

## Language

Polly speaks the language captured at scaffold time in `nonoise.config.json`. If the user is clearly typing a different language, Polly matches them. IT and EN are first-class — other languages are best-effort; users can add `label.<lang>` fields to `sdlc-flow.md` to extend.

## What Polly never does

- **Writes code.** Advisor only. Code lives in the specialist skills.
- **Persists state.** No `polly-state.json`. Progress is always re-derived from filesystem fingerprints.
- **Auto-triggers.** No marker files, no first-session auto-invocation.
- **Multi-turn orchestration.** One message per invocation.
- **Modifies your environment.** No installs, no config changes, no file writes outside a rare cache.
- **Asks clarifying questions before the 4-block output.** If `sdlc-flow.md` is readable she has everything she needs.

## Multi-repo workspaces

If the workspace is multi-repo (`repositories.json` present or `nonoise.config.json` says so), Polly adds a one-line pointer at the top of the "Where you are" block: *"This is a multi-repo workspace — see `docs/multi-repo.md` for scripts and policy."* The walkthrough lives in [`multi-repo.md`](multi-repo.md), not inside the advisor.

## Differences vs older Polly

| Old Polly (orchestrator) | New Polly (advisor) |
|---|---|
| Multi-turn decision tree (Steps 0-10) | One-shot 4-block message |
| `polly-state.json` + handoff protocol | Stateless, no resume |
| Auto-trigger via `POLLY_START.md` | Manual only, plus confusion fallback |
| Step 0 voice hint on first screen | Dropped |
| Menu (`/polly menu`) | Dropped |
| Pair vs solo narrated per step | `mode` is a per-phase field in `sdlc-flow.md`, Polly mentions it if relevant |

## Related

- [`sdlc.md`](sdlc.md) — the SDLC flow the advisor reads against.
- [`multi-repo.md`](multi-repo.md) — multi-repo workspace setup.
- [`team-model.md`](team-model.md) — pair vs solo rationale.
- `packages/skills/polly/SKILL.md` — the skill source. If this doc disagrees, the SKILL.md wins.
```

- [ ] **Step 2: Commit**

```bash
git add docs/polly.md
git commit -m "docs(polly): rewrite for advisor model

Replace the 210-line orchestrator description with ~90 lines covering
the 4-block advisor output pattern, the three triggers (slash, phrase,
confusion-fallback — no auto), .nonoise/sdlc-flow.md as source of
truth, language handling, multi-repo pointer, and a diff vs older
Polly. Drop handoff, state file, menu, voice hint, pair-vs-solo
preamble."
```

---

## Task 9 — Align `docs/sdlc.md`

**Files:**
- Modify: `docs/sdlc.md`

**Context:** Audit for orchestrator/auto-trigger language that no longer matches reality. Low-risk content edits.

- [ ] **Step 1: Read `docs/sdlc.md` end-to-end**

```bash
cat docs/sdlc.md | head -200
```

Note every passage that:
- calls Polly an "orchestrator", "conductor", "walks you through", or similar;
- mentions `.nonoise/POLLY_START.md`, `polly-state.json`, auto-trigger, first-session behaviour;
- implies Polly engages per-step across multiple turns;
- mentions the Step 0 voice hint.

- [ ] **Step 2: Rewrite those passages**

For each passage, apply one of these transforms:

| Old language | New language |
|---|---|
| "Polly orchestrates the SDLC" | "Skills are the primary engagement path; Polly is the opt-in advisor that points at the next one when intent is ambiguous" |
| "Polly walks you through each step" | "Polly reads `.nonoise/sdlc-flow.md` and tells you where you are + what to run next" |
| "Auto-triggers on first session via POLLY_START.md" | (delete — no auto-trigger anymore) |
| "`polly-state.json` tracks your progress" | (delete — no state file; progress derived from filesystem) |
| "Step 0 voice hint" | (delete — removed in advisor redesign) |

- [ ] **Step 3: Add a short pointer to `sdlc-flow.md` near the top**

Somewhere in the intro, add a line: *"Every scaffolded project ships with `.nonoise/sdlc-flow.md`, an editable version of this flow that Polly reads at runtime."*

- [ ] **Step 4: Commit**

```bash
git add docs/sdlc.md
git commit -m "docs(sdlc): align with Polly advisor redesign

Remove references to Polly as orchestrator/conductor and to the
auto-trigger + state machinery. Point at .nonoise/sdlc-flow.md as the
editable, project-local version of the flow that Polly reads at
runtime."
```

---

## Task 10 — Final verification + snapshot sanity

**Files:** no writes — this task validates.

- [ ] **Step 1: Fresh full build and test**

```bash
pnpm install
pnpm --filter create-nonoise run build
pnpm -r run typecheck
pnpm -r run test
```

Expected: all packages typecheck clean, all tests pass.

- [ ] **Step 2: Visual diff of the canonical snapshot**

```bash
git diff HEAD~10 -- packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap | head -200
```

Eyeball the aggregate changes. You should see:
- `.nonoise/POLLY_START.md`, `.nonoise/polly-state.json`, `.nonoise/polly-state.schema.json`, `.nonoise/polly-state.mjs` — gone.
- `.nonoise/sdlc-flow.md` — present (in both single-project and multi-repo runs).
- Polly `SKILL.md` — greatly shortened.
- `packages/skills/polly/references/` — 7 fewer files, 1 new (`sdlc-flow.default.md`).
- Context files — auto-trigger block gone, "Working with skills" block added.
- 6 native pair skills — preamble line added.

No unexpected changes elsewhere.

- [ ] **Step 3: Scaffold a real project as smoke test**

```bash
cd /tmp
rm -rf smoke-polly-advisor
node D:/DEV/NONoise-frmw/NONoise-frmw/packages/create-nonoise/bin/create-nonoise.js smoke-polly-advisor --yes
cd smoke-polly-advisor
ls -la .nonoise/
cat .nonoise/sdlc-flow.md | head -40
ls -la .claude/skills/polly/references/
```

Expected:
- `.nonoise/sdlc-flow.md` present; no `POLLY_START.md`, no `polly-state.*`.
- `.claude/skills/polly/references/` contains exactly: `fallback-messages.md`, `external-tools.md`, `project-tools.md`, `sdlc-flow.default.md`. (4 files — the old 10 minus 7 deleted plus 1 added.)
- `.claude/skills/impeccable/` present (from the earlier isolated fix, independent of this plan).

- [ ] **Step 4: If anything is off, diagnose and open a follow-up task**

Don't patch in this plan — open a follow-up issue / commit with a dedicated plan entry. This task is read-only.

---

## Task 11 — Changeset entry (release notes)

**Files:**
- Create: `.changeset/<auto-named>.md` (via `pnpm changeset`)

**Context:** The change is user-facing (CLI output differs, scaffolded projects differ). Needs a minor-version bump with a clear migration note.

- [ ] **Step 1: Create the changeset interactively**

```bash
pnpm changeset
```

Select `create-nonoise` as the package to bump. Pick **minor**. Use the following body:

```markdown
Polly advisor redesign: Polly is now a one-shot, stateless, opt-in advisor. Scaffolded projects no longer receive `.nonoise/POLLY_START.md`, `.nonoise/polly-state.json`, `.nonoise/polly-state.schema.json`, or `.nonoise/polly-state.mjs`. They get `.nonoise/sdlc-flow.md` instead — an editable YAML-headed Markdown doc driving what Polly suggests.

Context files (CLAUDE.md / .github/copilot-instructions.md / .cursor/rules.md / GEMINI.md / AGENTS.md) now tell the AI to engage skills directly from user intent and to ask for the full scope in one message when engaging SDLC skills. Polly is the fallback, not the default.

Six native `[pair]` SDLC skills (`requirements-ingest`, `bmad-agent-analyst`, `bmad-advanced-elicitation`, `arch-brainstorm`, `arch-decision`, `sprint-manifest`) carry a one-line preamble reinforcing the same behaviour at the skill level.

**Migration for existing scaffolded projects:** the stale `.nonoise/POLLY_START.md` and `.nonoise/polly-state.*` files become harmless — delete them at your leisure (`rm .nonoise/POLLY_START.md .nonoise/polly-state.*`). Copy the new `sdlc-flow.md` template from `node_modules/create-nonoise/templates/single-project/_always/.nonoise/sdlc-flow.md` (or re-scaffold into a scratch directory and copy the file). Add the "Working with skills" block from the new templates into your existing `CLAUDE.md` / `copilot-instructions.md` / etc.
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/
git commit -m "changeset: Polly advisor redesign"
```

- [ ] **Step 3: Do NOT run `pnpm version` or `pnpm release` in this plan**

The release flow (`pnpm version` → bump + CHANGELOG → commit + push → GitHub Release → npm publish) is driven by the `publish-nonoise` self-hosted skill when the user explicitly asks for a new version. This plan only drops the changeset entry; publishing happens later, as a separate action.

---

## Self-review

Spec coverage (spec §1–§13 → plan task mapping):
- §1 Problem statement → contextualises the plan; no task.
- §2 Target model — Polly v2 → Task 5 (SKILL.md rewrite) + §2.2 4-block pattern embedded in SKILL.md.
- §2.3 Entry points → covered in Task 5 SKILL.md + Task 3 context-file meta-rule (triggers section) + removed auto-trigger (Task 1).
- §3 `.nonoise/sdlc-flow.md` → Task 2 (template) + Task 4 (embedded fallback).
- §4.1 Context-file meta-rule → Task 3.
- §4.2 Native skill preamble → Task 7.
- §5.1 Remove marker + state files → Task 1.
- §5.2 References cleanup → Task 4.
- §5.3 Multi-repo move → Task 6 (docs/multi-repo.md) + Task 5 SKILL.md multi-repo section.
- §6 sdlc-flow-maintainer → **Plan B** (follow-on), not this plan.
- §7 Docs updates → Task 8 (polly.md) + Task 9 (sdlc.md) + Task 6 (multi-repo.md).
- §8 Site updates → **Plan C** (follow-on, separate repo), not this plan.
- §9 Language handling → Task 2 (IT/EN in sdlc-flow.md) + Task 5 (SKILL.md language step) + Task 8 (docs/polly.md "Language" section).
- §10 Non-goals → respected: vendored skills not touched (Task 7 targets natives only), `[solo]` skills not touched, no migration tool (release notes explain manual cleanup).
- §11 Risks → acknowledged in plan (Task 10 smoke test, follow-on for site, etc.).
- §12 Acceptance criteria → mapped 1:1 to tasks; the site + maintainer-skill bullets deferred to Plans B and C.
- §13 Impeccable default-install → already shipped as `294033a` before this plan started; Task 10 smoke test verifies it remains installed.

Placeholder scan: no TBD / TODO / "implement later" / vague "add error handling" / unfilled snippets. Every code and text block is literal.

Type / name consistency: `writePollyStartMarker` / `writePollyStateSchema` / `writePollyInitialState` / `writePollyStateCli` used consistently in Task 1. `sdlc-flow.md` / `sdlc-flow.default.md` spelled consistently across tasks. `bmad-agent-analyst` (not `bmad-analyst`), `bmad-advanced-elicitation`, `arch-brainstorm`, `arch-decision`, `sprint-manifest`, `requirements-ingest` — matched against `packages/skills/` glob output.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-polly-advisor-redesign.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
