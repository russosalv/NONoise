# Mode prompts — verbatim Q&A flows

One question at a time. Wait for the answer before moving on. Follow
the language already in use in `AGENTS.md` (or, if the file is empty,
the user's language in the conversation).

## Mode 1 — Bootstrap

Use these when only `AGENTS.md` exists and the user wants the other
two files generated.

### Q1 — Target tools

- EN: "I can generate `CLAUDE.md` (for Claude Code) and
  `.github/copilot-instructions.md` (for GitHub Copilot). Do you want
  both? (default: both)"
- IT: "Posso generare `CLAUDE.md` (per Claude Code) e
  `.github/copilot-instructions.md` (per GitHub Copilot). Vuoi
  entrambi? (default: entrambi)"

Accept: "both", "entrambi", "claude", "copilot", "only claude", "solo
copilot", etc.

### Q2 — Polly entry point

- EN: "Is **Polly** installed in this project as the SDLC
  orchestrator? (NONoise default: yes.) If yes, I'll add the Polly
  managed block to both generated files."
- IT: "Polly è installato in questo progetto come orchestratore SDLC?
  (default NONoise: sì.) Se sì, aggiungo il blocco gestito di Polly a
  entrambi i file."

If the user answers yes but there's no `polly` managed block in
`AGENTS.md`, say: "`AGENTS.md` doesn't have a Polly block yet — I'll
insert a minimal one based on the framework default. Run the `polly`
skill afterwards if you want it fine-tuned."

### Q3 — Language confirm

- EN: "I see `AGENTS.md` is written in <detected-language>. The
  generated files will follow the same language. Correct?"
- IT: "Vedo che `AGENTS.md` è in <lingua-rilevata>. I file generati
  seguiranno la stessa lingua. Confermi?"

## Mode 2 — Import (conflict resolution)

Fire one of these for each conflict found during section-by-section
diff.

### Template — tool-neutral conflict

- EN: "Conflict on section `## <heading>`:
  - `AGENTS.md` says: <snippet-a>
  - `<tool-file>` says: <snippet-b>
  Which version wins? (a) `AGENTS.md` [default], (b) `<tool-file>`,
  (c) merge (you dictate the merged text), (d) keep both — move the
  tool-file version into a tool-specific section."
- IT: "Conflitto sulla sezione `## <titolo>`:
  - `AGENTS.md` dice: <snippet-a>
  - `<file-tool>` dice: <snippet-b>
  Quale versione vince? (a) `AGENTS.md` [default], (b) `<file-tool>`,
  (c) fondi (mi detti il testo fuso), (d) tienili entrambi — sposto
  quella di `<file-tool>` in una sezione tool-specific."

### Template — tool-file-only, tool-neutral content

- EN: "Section `## <heading>` exists only in `<tool-file>`. The
  content looks tool-neutral (<1-line rationale>). Should I lift it
  into `AGENTS.md` as source of truth? (y/n, default y)"
- IT: "La sezione `## <titolo>` esiste solo in `<file-tool>`. Il
  contenuto sembra tool-neutro (<1-riga motivo>). La sposto in
  `AGENTS.md` come source of truth? (s/n, default s)"

### Template — tool-file-only, tool-specific content

No question needed. Log: "Keeping `## <heading>` in `<tool-file>`
only (tool-specific)."

### Template — managed block inventory

Before writing, show: "Managed blocks I will preserve verbatim:
- `polly` (in CLAUDE.md, copilot-instructions.md)
- `graphify` (in AGENTS.md, CLAUDE.md, copilot-instructions.md)
Any orphans flagged separately below."

## Mode 3 — Sync (silent mode)

Sync is mostly silent. Only one question template applies:

### Template — unrecognized new H2

- EN: "`AGENTS.md` has a new section `## <heading>` that doesn't exist
  in the tool files. Options:
  (a) mirror it verbatim into both tool files,
  (b) rephrase for each tool (I'll draft and show you),
  (c) keep it tool-neutral — put a one-line pointer in the tool files
  that says 'see AGENTS.md §<heading>',
  (d) skip — don't propagate.
  Default: (a)."
- IT: "`AGENTS.md` ha una nuova sezione `## <titolo>` che non esiste
  nei file tool-specific. Opzioni:
  (a) la copio verbatim in entrambi,
  (b) la riformulo per ciascun tool (mostro le bozze),
  (c) la lascio tool-neutra — nei file tool metto solo un puntatore
  'vedi AGENTS.md §<titolo>',
  (d) salto — non la propago.
  Default: (a)."

## Pre-write summary (all modes)

Before any write, show this structured summary:

```
Files to write:
- <path> — <N> bytes, <M>% changed vs on-disk

Managed blocks preserved:
- <marker> (in <file>)
- ...

Unresolved orphans flagged (left intact):
- <marker> (in <file>)

Conflicts resolved:
- <section> → <decision>

Proceed? (yes / no / dry-run)
```

- `dry-run` writes the proposed content to `/tmp/` (or equivalent) and
  shows the user the paths to inspect before the real write.
- Default on empty reply is `no`. Never write without an explicit yes.
