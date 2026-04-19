# Polly handoff & return protocol

The single most common Polly failure mode in v1 was: user enters a skill
(e.g. `graphify-setup`), completes it, forgets to come back, later re-invokes
Polly — and Polly re-walks the entire decision tree from Step 0 because it
has no memory of what was done. This protocol fixes that.

Polly keeps its orchestration state in `.nonoise/polly-state.json` (see
`state-schema.md`) and uses filesystem fingerprints (see `fingerprints.md`)
as the source of truth for phase completion.

## Two moments that matter

1. **Handoff** — when Polly is about to engage a specialist skill, it MUST
   announce the return expectation and write the handoff to state.
2. **Return** — when Polly is re-invoked, it MUST check the state file for
   an active handoff and reconcile against the filesystem before asking the
   user anything new.

Everything else in Polly's decision tree is unchanged.

## Non-negotiable: every phase transition is gated

Polly does not auto-advance. Ever. After any skill completes, any phase
finishes, or the tree hits a junction (e.g. brownfield Step 3.5 → the
greenfield resume point), Polly presents concrete options — typically
**procedi / pausa / menu / salta** — and **waits for the user's explicit
answer** before engaging the next skill.

A soft "Ok?" at the end of a declarative sentence is NOT a gate. A
statement like "Procedo con X" is NOT a gate. A gate is a question with
concrete options and a full stop.

This applies equally to:
- Return from a completed handoff (§ "Handle active handoff")
- Resume after silent re-entry (§ "No active handoff — offer resume")
- Step-to-step transitions inside a single session (no filesystem signal,
  but still a junction — ask)
- The brownfield → greenfield seam (Step 3.5 has multiple resume targets;
  never auto-pick one)

---

## Handoff — what Polly does

When engaging skill `X` for phase `P` with next-step `N`:

### 1. Announce (to the user)

Adapt to the user's locale (read `user.locale` from `nonoise.config.json`).
Template in English:

> Now I'm handing off to **`<X>`**. That skill will <what it does — 1 sentence>,
> and produces <expected fingerprint>. When you're done there, come back to
> me: type `/polly` (Claude Code) or say **"back to polly"** (Copilot). I'll
> pick up from **<N>**.

Italian variant:

> Ora passo la parola a **`<X>`**. Ti guiderà in <cosa fa — 1 frase> e
> produrrà <fingerprint attesa>. Quando hai finito, torna da me: scrivi
> `/polly` (Claude Code) o dì **«back to polly»** (Copilot). Riprendo da
> **<N>**.

Do NOT skip the "come back to me" sentence. It is the single word that tells
the user Polly isn't a one-shot.

### 2. Write state (atomic overwrite of `polly-state.json`)

Before invoking the skill, update:

```json
{
  "updatedAt": "<now>",
  "session": { "currentStep": "<P>", "mode": "<pair|solo>" },
  "handoff": {
    "skill": "<X>",
    "engagedAt": "<now>",
    "returnTo": "<N>",
    "userMessage": "<the last sentence Polly said above>"
  },
  "events": [ ..., { "at": "<now>", "action": "handoff", "phase": "<P>", "skill": "<X>" } ]
}
```

Use the Write tool (or equivalent) to overwrite the file. Read → merge →
write is the safe path: never partial-patch without reading first.

### 3. Engage the skill

Only after the state file is flushed to disk. If the write fails, tell the
user and abort the handoff rather than losing the trail.

---

## Return — what Polly does on every re-entry

This is the new **Step −1** — runs before Step 0 (voice hint).

### 1. Read state

Read `.nonoise/polly-state.json`. Three outcomes:

- **File absent** → session is fresh. Initialize in-memory with the schema
  default (see `state-schema.md`), continue to Step 0. Do NOT write the
  file yet — that's the scaffold's job; Polly writes it the first time it
  advances state.
- **File present, `version != 1`** → abort with the version message from
  `state-schema.md#versioning--migration`.
- **File present, version 1** → continue.

### 2. Reconcile `phases` against the filesystem

For every phase entry in `phases`, look up the fingerprint in
`fingerprints.md` and check disk:

- Fingerprint satisfied AND `phases[P].done === false` → set
  `phases[P].done = true`, `via = "<inferred or last-known skill>"`,
  `at = <file mtime>`, append a `phase-complete` event.
- Fingerprint satisfied AND `phases[P].done === true` → leave alone.
- Fingerprint NOT satisfied AND `phases[P].done === true` → trust the
  state file (the user may have renamed or moved files). Don't silently
  downgrade; log a `reconcile-warning` event and move on.

This keeps Polly coherent even when the user did work outside Polly.

### 3. Handle active handoff

If `handoff !== null`:

Let `fp = fingerprint(handoff.skill)`.

- **`fp` satisfied** → the skill finished. Act:
  1. Clear `handoff` (set to `null`).
  2. Mark `phases[<phase tied to that skill>].done = true`, set `via`/`at`.
  3. Set `session.currentStep = handoff.returnTo`.
  4. Append a `return` event and a `phase-complete` event.
  5. Write the file.
  6. Greet the user with **an explicit choice, then STOP and wait**. Do
     not engage the next skill in the same turn. Template (IT):

     > Bentornato. Vedo che **`<X>`** ha finito — trovo `<fingerprint>`.
     > La prossima fase sarebbe **`<returnTo>`** — <1 frase su cosa fa>.
     >
     > Cosa vuoi fare?
     > - **a) Procedi** — ingaggio `<next skill>` per `<returnTo>`
     > - **b) Pausa** — ci fermiamo qui, riprendiamo con `/polly` quando vuoi
     > - **c) Menu** — mostrami tutte le fasi e le skill disponibili
     > - **d) Salta a un'altra fase** — dimmi quale (es. "vai a sprint")

     English equivalent:

     > Welcome back. **`<X>`** is done — I can see `<fingerprint>`.
     > The next phase would be **`<returnTo>`** — <1 sentence on what it does>.
     >
     > What would you like to do?
     > - **a) Proceed** — I'll engage `<next skill>` for `<returnTo>`
     > - **b) Pause** — we stop here, resume with `/polly` later
     > - **c) Menu** — show me all phases and available skills
     > - **d) Jump to a different phase** — tell me which one

     **Wait for the answer before doing anything else.** The user may type
     (a), "procedi", "yes", a skill name, "menu", "pausa", "stop" — parse
     permissively but never auto-advance on silence or on a bare
     acknowledgement. If the answer is ambiguous, ask again.

- **`fp` NOT satisfied** → ambiguous. Ask the user directly, offering 3
  choices:

  > Bentornato. Eravamo a **`<X>`** ma non vedo ancora `<fingerprint>`.
  > Tre opzioni:
  > 1. **Completato** — procedo con `<returnTo>` (ricontrollerò il filesystem
  >    prima di fidarmi).
  > 2. **Pausato** — torniamo dentro `<X>`, continuo da lì.
  > 3. **Saltato** — segno la fase come skip e procedo con `<returnTo>`.

  On each answer: update state, clear or retain `handoff`, write, continue.

### 4. No active handoff — offer resume

If `handoff === null` AND `session.currentStep !== "intro"`:

Show the user their progress and offer options — same gate pattern as
above: present concrete choices and WAIT.

> Bentornato. Ecco dove eravamo:
> - Tipo progetto: **`<kind>`** (`<scope>`)
> - Ultimo passo: **`<currentStep>`**
> - Fasi completate: `<list of phases with done:true>`
>
> Cosa vuoi fare?
> - **a) Continua da `<currentStep>`**
> - **b) Menu** — vedi tutte le fasi e le skill
> - **c) Ricomincia dall'inizio**

Restart = clear session (but keep `voiceHintShown: true` — no point
re-showing it) and re-enter the tree at Step 1. Wait for the explicit
choice; never assume "continue" on silence.

### 5. No handoff, fresh session

If `handoff === null` AND `session.currentStep === "intro"`:

Proceed to Step 0 (voice hint) → Step 1 normally. At the end of each
answered question in Steps 1–N, persist the answer to `session.*` and
append an event.

---

## Voice hint gate (Step 0)

Old behavior: always show the voice hint on first screen.

New behavior: if `voiceHintShown === true`, SKIP Step 0 entirely. After
showing it for the first time, set `voiceHintShown = true` and write.

---

## What Polly writes, and when

Polly writes `polly-state.json` on each of these events:

| Trigger | Fields updated |
|---|---|
| Voice hint shown | `voiceHintShown = true` |
| User answers `kind` | `session.kind`, events |
| User answers `scope` | `session.scope`, events |
| User answers stack | `session.stack`, events |
| User answers brownfield code path | `session.brownfieldCodePath`, events |
| User sets active area | `session.activeArea`, `session.studyCounter`, events |
| User sets active sprint | `session.activeSprint`, events |
| Step advances (no handoff) | `session.currentStep`, events |
| Skill engaged | `handoff`, events |
| Return from skill | `handoff = null`, `phases[P]`, `session.currentStep`, events |
| Reconcile finds new phase complete | `phases[P]`, events |
| User answers "skip" or "abandon" | `phases[P].done = true` with `via: "skipped"` or `via: "abandoned"`, events |

Keep `events` bounded: trim to the most recent 100 entries on every write.

---

## Self-destruct interaction

Existing rule: when invoked via `POLLY_START.md` auto-trigger, delete
`POLLY_START.md` at end of session.

**Do NOT delete `polly-state.json` in self-destruct.** The state file
outlives the auto-trigger marker by design — the next manual `/polly`
should benefit from the accumulated state.

---

## Implementation notes for the AI running Polly

- Use the `Write` tool to overwrite `polly-state.json` atomically. Read the
  existing file first (if present), modify the fields you need, then write
  the whole JSON back. This avoids losing fields written by an older or
  newer Polly.
- Keep `updatedAt` fresh on every write.
- Ignore `createdAt` — it's set by the scaffold and never mutated.
- Use ISO-8601 UTC (`.toISOString()`-equivalent) for all timestamps.
- If you can't parse the file (corrupted JSON), rename it to
  `polly-state.corrupt-<timestamp>.json` and bootstrap a fresh one, log a
  `reset` event mentioning the rename. Tell the user.
