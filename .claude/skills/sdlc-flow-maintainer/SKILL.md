---
name: sdlc-flow-maintainer
description: Dev tool for the NONoise maintainer — audits the default `.nonoise/sdlc-flow.md` template against the actually-bundled skills and reports drift. Use when you add or remove a skill in `packages/skills/` or change `MVP_SKILL_BUNDLE` in `packages/create-nonoise/src/scaffold.ts`, to decide if the flow template needs a new phase, a deleted phase, or a renamed `skill` field. Also use when the user says "check sdlc-flow", "audit polly flow", "sync flow template", or after syncing a vendored pack via `node scripts/sync-vendor.mjs`. Scoped to THIS monorepo only — never invoke in a scaffolded project. Proposes a diff against the template; human applies it.
---

# sdlc-flow-maintainer — keep the default flow template honest

When the NONoise maintainer adds a skill to `packages/skills/`, bumps the vendored packs, or changes `MVP_SKILL_BUNDLE`, the default `.nonoise/sdlc-flow.md` template in `packages/templates/*/_always/.nonoise/` can drift — a new skill without a phase, or a phase pointing at a skill that has been removed. This skill performs the audit and proposes a diff. It never auto-applies.

## When to use

- Right after you add, rename, or delete a native skill in `packages/skills/`.
- Right after `MVP_SKILL_BUNDLE` in `packages/create-nonoise/src/scaffold.ts` is changed.
- Right after `node scripts/sync-vendor.mjs` brings in new vendored skills that are mentioned in the flow (e.g. `superpowers:brainstorming`, `superpowers:writing-plans`).
- Before a release if you are unsure whether the template and the bundle are in sync.
- When the user says "check sdlc-flow", "audit polly flow", "sync flow template", "verify sdlc-flow".

## When NOT to use

- Inside a scaffolded project — the target file (`.nonoise/sdlc-flow.md` in scaffolded projects) is user-editable and may legitimately diverge from the default template. This skill audits the **source template**, not any project-local copy.
- As a replacement for reading the spec. Design decisions about which skill belongs in which phase live in `docs/polly.md` / the spec at `docs/superpowers/specs/2026-04-22-polly-advisor-redesign-design.md`.

## What it checks

Three dimensions of drift:

1. **Bundle → flow:** every skill in `MVP_SKILL_BUNDLE` + every vendored skill referenced by name in the default flow should map to exactly one phase — unless the skill is explicitly "utility / orthogonal" (no SDLC phase). Anything installed but not referenced and not orthogonal is a candidate new phase, or at least an acknowledged gap.
2. **Flow → bundle:** every `skill:` field in the default template's frontmatter must resolve to a skill that actually exists either in `packages/skills/` or in a vendored pack under `packages/skills/vendor/`. A phase pointing at a skill that no longer exists ships broken defaults to every new scaffold.
3. **Fingerprint sanity:** every `fingerprint:` glob should be anchored under a directory that the current scaffold conventions produce (`docs/requirements/`, `docs/architecture/`, `docs/sprints/`, `docs/atr/`, `docs/superpowers/`). Globs pointing at legacy or renamed trees are stale.

## Inputs (read-only)

- `packages/templates/single-project/_always/.nonoise/sdlc-flow.md` — the canonical default flow. Parse the YAML frontmatter to get the `phases:` list.
- `packages/templates/multi-repo/_always/.nonoise/sdlc-flow.md` — same shape, verify the two files are structurally equivalent (multi-repo has one extra pre-phase `multi-repo-setup`).
- `packages/skills/polly/references/sdlc-flow.default.md` — the embedded fallback. Must match the single-project template body byte-for-byte after the HTML comment banner. Verify.
- `packages/create-nonoise/src/scaffold.ts` — `MVP_SKILL_BUNDLE` constant (array literal around line 23). Parse it.
- `packages/skills/` — list directories (filter: ignore `vendor`). Each directory that contains `SKILL.md` is a native skill.
- `packages/skills/vendor/superpowers/skills/` — list directories. Each is a `superpowers:<name>` skill.
- `packages/skills/vendor/impeccable/` — list directories containing `SKILL.md`. Each is an `impeccable:<name>` skill.

## Process

1. **Load the default flow's phases**

   Open both template files and the embedded fallback. Confirm the two template variants differ only by the `multi-repo-setup` pre-phase. Confirm the fallback equals the single-project template after stripping the HTML comment banner.

2. **Enumerate what ships**

   Read `MVP_SKILL_BUNDLE`. Enumerate `packages/skills/` excluding `vendor/`. Enumerate the superpowers + impeccable sub-dirs. Call the union the **shipped set** (native bundled + vendored).

3. **Enumerate what the flow references**

   For each phase in the default flow, extract the `skill:` field. Normalise: a bare name like `arch-decision` refers to a native skill; a `superpowers:<name>` or `impeccable:<name>` string refers to a vendored one. A `null` skill means a conversational phase (no skill).

4. **Three-way diff**

   - **Flow-without-skill:** every `skill:` the flow references that is not in the shipped set → report as a broken default.
   - **Shipped-without-flow:** every item in `MVP_SKILL_BUNDLE` that no phase references → report as a potential missing phase. Propose the phase (id, label IT/EN, fingerprint guess, mode guess) based on the skill's name and frontmatter description, but do not apply.
   - **Vendored-without-flow:** note if any vendored skill not referenced in the flow is obviously SDLC-shaped (name matches `brainstorm*`, `writing-plans`, `executing-plans`, etc.). Report for human review. Most vendored skills are orthogonal; only a few should be in the flow.

5. **Fingerprint check**

   For each phase with a non-null `fingerprint`, match the glob's directory prefix against the canonical docs trees:
   - `docs/requirements/`, `docs/requirements/ingested/`
   - `docs/superpowers/specs/`, `docs/superpowers/plans/`
   - `docs/architecture/brainstorm/`, `docs/architecture/decisions/`, `docs/architecture/synced/`
   - `docs/sprints/Sprint-*/`
   - `docs/atr/`
   - `repos/**/.git` (multi-repo only)

   A fingerprint that starts with anything else is stale — flag it.

6. **Emit the report**

   Produce a single Markdown report in the chat (do NOT write it to a file unless the user asks). Shape:

   ```
   # sdlc-flow-maintainer audit — <YYYY-MM-DD>

   ## Summary
   - <N> phases in default flow.
   - <N> native skills bundled, <N> vendored skills available, <N> referenced in flow.
   - Drift items: <N>.

   ## Broken defaults (flow → bundle)
   <list, or "none">

   ## Missing phases (bundle → flow)
   <list, with proposed phase YAML + rationale>

   ## Vendored-SDLC candidates
   <list of vendored skills that look SDLC-shaped but aren't in the flow>

   ## Stale fingerprints
   <list of phases whose fingerprint prefix is not in the canonical tree>

   ## Proposed diff
   <unified diff against packages/templates/single-project/_always/.nonoise/sdlc-flow.md and, if needed, the multi-repo variant and the embedded fallback. IF drift is zero, state "No diff needed — template is in sync."
   ```

   Include per-item rationale. Be conservative: if a skill is ambiguous between "should be a phase" and "orthogonal", default to marking it orthogonal and flagging for human review.

7. **Stop**

   Do not write any file. Do not run tests. Do not commit. Human decides whether to apply the proposed diff — typically by copying the suggested phase into the template and running `pnpm --filter create-nonoise run build && pnpm --filter create-nonoise exec vitest run -u`.

## Known invariants

- The single-project template and the multi-repo template share the same phases list except the multi-repo prepends `multi-repo-setup` (conversational, fingerprint `repos/**/.git`). All other phases must match.
- The embedded fallback (`packages/skills/polly/references/sdlc-flow.default.md`) mirrors the single-project template byte-for-byte, after stripping the leading `<!-- … -->` HTML comment and the blank line that follows.
- Skills in `MVP_SKILL_BUNDLE` that are orthogonal and deliberately absent from the flow (as of 2026-04-22): `playwright-cli`, `frontend-design`, `skill-finder`, `docs-md-generator`, `design-md-generator`, `vscode-config-generator`, `bmad-agent-architect`, `bmad-agent-tech-writer`, `bmad-agent-ux-designer`, `bmad-advanced-elicitation`, `quint-fpf`, `reverse-engineering`, `spec-to-workitem`, `ops-skill-builder`, `observability-debug`, `polly` (itself), `c4-doc-writer`. If this list needs to grow, update it here with a one-line rationale.

## Scope and safety

- Read-only. Never writes files, never runs builds, never commits.
- Always operates against the monorepo root. If invoked in a scaffolded project (i.e. no `packages/templates/` present), fail fast with a friendly message: *"This skill only runs in the NONoise monorepo. In a scaffolded project, edit `.nonoise/sdlc-flow.md` directly."*
- The "propose diff" output is advisory. The maintainer reviews it, edits the template by hand (or instructs an assistant to), runs the usual build + snapshot flow, and commits.

## References

- Spec: `docs/superpowers/specs/2026-04-22-polly-advisor-redesign-design.md` §6.
- Plan A (core redesign that introduced the template): `docs/superpowers/plans/2026-04-22-polly-advisor-redesign.md`.
- The default flow template itself: `packages/templates/single-project/_always/.nonoise/sdlc-flow.md`.
- The embedded fallback: `packages/skills/polly/references/sdlc-flow.default.md`.
