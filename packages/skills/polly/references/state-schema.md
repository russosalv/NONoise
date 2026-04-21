# Polly state file — schema v1

Polly persists its orchestration state at `.nonoise/polly-state.json` so that
the decision tree is not re-walked from the top on every invocation. The
scaffold writes an initial file when Polly-compatible AI tools (Claude Code,
Copilot) are selected; Polly updates it at every meaningful transition.

**Golden rule:** the filesystem is the source of truth for *whether a phase
is done*. This state file is a cache of that judgement plus the facts that
can't be recovered from disk (the user's answers, the active area, the
currently running handoff). On every entry Polly reconciles `phases` against
the fingerprints in `fingerprints.md`; **on conflict, the filesystem wins**.

## Location

`<workspace-root>/.nonoise/polly-state.json`

Same directory as `POLLY_START.md` (the one-shot scaffold marker) so that
everything Polly-infrastructural is contained in `.nonoise/`.

The companion JSON Schema lives alongside it at
`<workspace-root>/.nonoise/schemas/polly-state.v1.json`. The state file's
`$schema` points to it with a relative path (`./schemas/polly-state.v1.json`)
so editors (VS Code, JetBrains, Cursor) resolve it locally — no network,
no published URL. Re-scaffolding refreshes it; do not edit by hand.

## JSON shape (v1)

```json
{
  "$schema": "./schemas/polly-state.v1.json",
  "version": 1,
  "createdAt": "2026-04-19T20:00:00Z",
  "updatedAt": "2026-04-19T20:15:00Z",
  "voiceHintShown": false,
  "archSyncOffered": null,

  "session": {
    "kind": "greenfield|brownfield|refactor|arch-study|unknown",
    "scope": "new-feature|refactor|arch-study|null",
    "currentStep": "intro|stack|material|requirements|feature-design|arch-brainstorm|arch-decision|sprint|implementation|acceptance|done",
    "mode": "pair|solo|unknown",
    "stack": null,
    "activeArea": null,
    "activeSprint": null,
    "studyCounter": {},
    "brownfieldCodePath": null
  },

  "handoff": null,

  "phases": {
    "scan":           { "done": false },
    "reverse":        { "done": false },
    "requirements":   { "done": false },
    "featureDesign":  { "done": false },
    "archBrainstorm": { "done": false },
    "archDecision":   { "done": false },
    "fpfAudit":       { "done": false },
    "sprint":         { "done": false },
    "implementation": { "done": false },
    "acceptance":     { "done": false },
    "c4":             { "done": false },
    "workitemExport": { "done": false }
  },

  "events": []
}
```

## Field reference

### Top-level

| Field | Type | Notes |
|---|---|---|
| `version` | `1` (literal) | Bump only on breaking schema changes. |
| `createdAt` | ISO date | Written by scaffold; immutable. |
| `updatedAt` | ISO date | Polly updates on every write. |
| `voiceHintShown` | boolean | Step 0 flips to `true` after showing the voice-tools hint. Prevents re-spam across sessions. |

### `archSyncOffered`

`boolean | null` — tracks whether Polly has already presented the
`arch-sync` suggestion menu after the most recent `arch-decision`
completion.

| Value | Meaning |
|-------|---------|
| `null` | Never offered (initial state, or no `arch-decision` PASS yet) |
| `true` | Offered AND the architect made a final choice (1 = invoked arch-sync, 2 = chose to skip). The menu is NOT re-offered. |
| `false` | Offered but the architect chose 3 (postpone). The menu re-appears on the next `/polly` invocation. |

**Reset trigger**: when a new PRD reaches `status: validated` (i.e. a new
`archDecision` fingerprint appears that wasn't there before), reset
`archSyncOffered` to `null` so the suggestion fires again for the new
decision.

### `session`

Facts that can't be inferred from the filesystem. Either the user answered a
question or Polly inferred it from context.

| Field | Type | Notes |
|---|---|---|
| `kind` | `greenfield` / `brownfield` / `refactor` / `arch-study` / `unknown` | Answered in Step 1. Drives which tree Polly walks. |
| `scope` | `new-feature` / `refactor` / `arch-study` / `null` | Refines the path inside greenfield/brownfield (skip rules). |
| `currentStep` | step slug | Polly writes this BEFORE engaging the associated skill. On return, Polly reads it to know where to resume. |
| `mode` | `pair` / `solo` / `unknown` | Optional; the announce-mode hint. |
| `stack` | string / null | E.g. `"TypeScript + Next.js + Postgres"`. Gathered in Step 2.1. |
| `activeArea` | string / null | E.g. `"billing"`. Used by arch-brainstorm / arch-decision. |
| `activeSprint` | string / null | E.g. `"Sprint-3"`. Used by sprint-manifest / atr. |
| `studyCounter` | `{ [area]: number }` | Monotonic per-area PRD numbering (so the next arch-brainstorm under `billing` knows it's `03-…`). |
| `brownfieldCodePath` | string / null | The path the user gave in Step 3.1. |

### `handoff`

Non-null only while a skill is engaged. Cleared on return.

```json
{
  "skill": "graphify-setup",
  "engagedAt": "2026-04-19T20:05:00Z",
  "returnTo": "reverse",
  "userMessage": "When you're done scanning, come back with /polly"
}
```

- `skill` — the skill that's currently running. The fingerprint Polly checks on return is derived from this (see `fingerprints.md`).
- `returnTo` — the next step slug Polly will advance to if the fingerprint confirms completion.
- `userMessage` — the last sentence Polly told the user before handing off, kept so the return prompt can reference it.

### `phases`

Cache of "is this phase done?". Polly reconciles each key against
`fingerprints.md` on every entry; the filesystem is authoritative.

Each entry:

```json
{ "done": true, "via": "graphify-setup", "at": "2026-04-19T20:12:00Z", "note": null }
```

If `done: false`, the `via` / `at` fields are absent.

The full phase set (v1):

- `scan` — graphify knowledge graph built
- `reverse` — reverse-engineering dossier generated
- `requirements` — any requirement file under `docs/requirements/`
- `featureDesign` — a PRD or design spec exists
- `archBrainstorm` — draft PRDs under `docs/prd/<area>/`
- `archDecision` — at least one PRD validated (status: validated) with an audit file
- `fpfAudit` — quint-fpf has run (`.quint/` or `docs/fpf/*`)
- `sprint` — a sprint manifest exists
- `implementation` — we track this via sprint progress, optional in v1
- `acceptance` — at least one testbook/report exists
- `c4` — C4 workspace file exists
- `workitemExport` — spec-to-workitem has produced an export

### `events`

Append-only trail. Bounded to the last 100 entries (Polly trims on write).

Each event:

```json
{
  "at": "2026-04-19T20:05:00Z",
  "action": "answered|handoff|return|phase-complete|skip|abandon|reset",
  "phase": "stack",
  "skill": "graphify-setup",
  "key": "kind",
  "value": "brownfield",
  "note": "user picked brownfield"
}
```

Only fields relevant to the action are present. `action` is required;
everything else is optional.

## Example — initial state (written by scaffold)

```json
{
  "$schema": "./schemas/polly-state.v1.json",
  "version": 1,
  "createdAt": "2026-04-19T19:00:00Z",
  "updatedAt": "2026-04-19T19:00:00Z",
  "voiceHintShown": false,
  "session": {
    "kind": "unknown",
    "scope": null,
    "currentStep": "intro",
    "mode": "unknown",
    "stack": null,
    "activeArea": null,
    "activeSprint": null,
    "studyCounter": {},
    "brownfieldCodePath": null
  },
  "handoff": null,
  "phases": {
    "scan": { "done": false },
    "reverse": { "done": false },
    "requirements": { "done": false },
    "featureDesign": { "done": false },
    "archBrainstorm": { "done": false },
    "archDecision": { "done": false },
    "fpfAudit": { "done": false },
    "sprint": { "done": false },
    "implementation": { "done": false },
    "acceptance": { "done": false },
    "c4": { "done": false },
    "workitemExport": { "done": false }
  },
  "events": [
    { "at": "2026-04-19T19:00:00Z", "action": "bootstrap", "note": "created by create-nonoise scaffold" }
  ]
}
```

## Example — mid-session with active handoff

Brownfield scan in progress:

```json
{
  "$schema": "./schemas/polly-state.v1.json",
  "version": 1,
  "createdAt": "2026-04-19T19:00:00Z",
  "updatedAt": "2026-04-19T20:05:00Z",
  "voiceHintShown": true,
  "session": {
    "kind": "brownfield",
    "scope": null,
    "currentStep": "scan",
    "mode": "pair",
    "stack": "TypeScript + Next.js + Postgres",
    "activeArea": null,
    "activeSprint": null,
    "studyCounter": {},
    "brownfieldCodePath": "./legacy-app"
  },
  "handoff": {
    "skill": "graphify-setup",
    "engagedAt": "2026-04-19T20:05:00Z",
    "returnTo": "reverse",
    "userMessage": "When graphify-out/ is populated, say 'back to polly' and I'll pick up with reverse-engineering."
  },
  "phases": {
    "scan": { "done": false },
    "reverse": { "done": false },
    "requirements": { "done": false },
    "featureDesign": { "done": false },
    "archBrainstorm": { "done": false },
    "archDecision": { "done": false },
    "fpfAudit": { "done": false },
    "sprint": { "done": false },
    "implementation": { "done": false },
    "acceptance": { "done": false },
    "c4": { "done": false },
    "workitemExport": { "done": false }
  },
  "events": [
    { "at": "2026-04-19T19:00:00Z", "action": "bootstrap" },
    { "at": "2026-04-19T19:20:00Z", "action": "answered", "key": "kind", "value": "brownfield" },
    { "at": "2026-04-19T19:45:00Z", "action": "answered", "key": "brownfieldCodePath", "value": "./legacy-app" },
    { "at": "2026-04-19T20:00:00Z", "action": "answered", "key": "stack", "value": "TypeScript + Next.js + Postgres" },
    { "at": "2026-04-19T20:05:00Z", "action": "handoff", "phase": "scan", "skill": "graphify-setup" }
  ]
}
```

## Example — after return from a completed skill

```json
  "session": { ..., "currentStep": "reverse" },
  "handoff": null,
  "phases": {
    "scan": {
      "done": true,
      "via": "graphify-setup",
      "at": "2026-04-19T20:30:00Z",
      "note": "graphify-out/GRAPH_REPORT.md present"
    },
    ...
  },
  "events": [
    ...,
    { "at": "2026-04-19T20:30:00Z", "action": "return", "skill": "graphify-setup" },
    { "at": "2026-04-19T20:30:00Z", "action": "phase-complete", "phase": "scan", "via": "graphify-setup" }
  ]
```

## Versioning & migration

If Polly reads a state file with `version != 1`:

- `version > 1` → newer Polly, refuse to touch it; ask the user to upgrade
  the framework (`npm install -g create-nonoise@latest` only affects new
  scaffolds, so really they need to sync this project's `.claude/skills/polly/`
  from a fresh scaffold).
- `version < 1` → doesn't exist yet (v1 is the first schema).

Never silently migrate. Keep the file backward-compatible by adding optional
fields only; schema-breaking changes require a version bump + a companion
migration note here.
