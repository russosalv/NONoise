---
title: SP-1 — CLI installer core + template "single-project"
status: draft
date: 2026-04-18
author: russo
---

# SP-1 — CLI installer core + template "single-project"

## Context

Primo sub-progetto del **NONoise Framework**, un meta-framework installabile via NPX
che bootstrappa progetti di sviluppo già configurati con skill, agent, tool e template
per accelerare l'SDLC. Nasce generalizzando il setup del progetto Andreani-Risko
(`reference-project/`).

Lo scope complessivo del framework è descritto in `D:\DEV\NONoise-frmw\ROADMAP.md`
(sub-progetti SP-1..SP-8 + future implementations). Questo spec copre **solo SP-1**:
CLI runnable end-to-end con un unico template `single-project` stack-agnostic.

## Goals

- `npx create-nonoise` funzionante end-to-end con UX moderna.
- Template `single-project` generato correttamente su Windows e macOS.
- Multi-AI opt-in: genera solo i file necessari per gli strumenti AI scelti dall'utente
  (Claude Code, GitHub Copilot, Codex, Cursor, Gemini CLI).
- Bundle di 3 skill nuove (`graphify-gitignore`, `vscode-config-generator` full;
  `docs-md-generator` stub).
- Test suite CI-ready su Win/Mac/Linux con coverage minimo accettabile.
- Package pubblicabile su npm con provenance.

## Non-goals (SP-1)

- Template `umbrella multi-repo` (→ SP-3).
- Language bootstrap di Node/Python (→ SP-4).
- Integrazione Azure DevOps / App Insights / Dapr (→ SP-6).
- Riuso di skill esistenti da `reference-project/` (→ SP-2).
- Sito documentazione pubblico (→ SP-8).
- Implementazione operativa di `docs-md-generator` (→ SP-7.b).

## Architettura monorepo

```
D:\DEV\NONoise-frmw\NONoise-frmw\                    ← root repo pubblicato
├── .changeset/                                       ← changesets per versioning
├── .github/workflows/                                ← CI (test + release on tag)
├── packages/
│   ├── create-nonoise/                               ← il CLI eseguibile
│   │   ├── src/
│   │   │   ├── index.ts                              ← entry point, prompts UX
│   │   │   ├── prompts.ts                            ← domande @clack/prompts
│   │   │   ├── scaffold.ts                           ← orchestrazione copy+render
│   │   │   ├── template-resolver.ts                  ← logica _always + _if-*
│   │   │   ├── skill-installer.ts                    ← copia skill in .claude/skills/
│   │   │   └── types.ts                              ← ProjectContext, AiTools
│   │   ├── bin/
│   │   │   └── create-nonoise.mjs                    ← shim Node che chiama src/index
│   │   ├── package.json                              ← "bin": { "create-nonoise": "..." }
│   │   └── tsconfig.json
│   ├── templates/                                    ← i template scaffold
│   │   ├── single-project/                           ← (MVP, vedi sez. Template)
│   │   └── package.json                              ← no build, solo assets
│   └── skills/                                       ← le skill agnostiche
│       ├── graphify-gitignore/
│       │   ├── SKILL.md
│       │   └── assets/
│       ├── vscode-config-generator/
│       │   ├── SKILL.md
│       │   └── assets/
│       ├── docs-md-generator/
│       │   └── SKILL.md                              ← stub in SP-1
│       └── package.json
├── docs/
│   └── superpowers/
│       └── specs/                                    ← questo documento
├── pnpm-workspace.yaml
├── package.json                                      ← root, scripts workspace-wide
├── tsconfig.base.json
├── .gitignore
└── README.md
```

### Scelte chiave

- **`create-nonoise`** è l'unico package pubblicato su npm.
  `templates/` e `skills/` sono dipendenze workspace (`"templates": "workspace:*"`),
  ma vengono **bundlate dentro il tarball** di `create-nonoise` tramite
  `files: ["templates", "skills", "dist"]` + script `prepack`. Così `npx create-nonoise`
  scarica un singolo package contenente tutto.
- **`@clack/prompts`** come prompt library: moderna, animata, piccola (~10KB gzipped),
  gestisce cancel/signal nativamente, tipi TypeScript eccellenti.
- **Handlebars** come template engine: unica dipendenza runtime oltre a clack.
- **Target**: ESM, Node ≥ 20 (top-level await, `import.meta.url`, fetch globale).
- **pnpm workspaces** puro (no turborepo): SP-1 non richiede cache remota.

## CLI interaction flow

### Invocazione

```bash
# Modalità interattiva (default)
npx create-nonoise

# Con argomento directory
npx create-nonoise my-app

# Non-interattiva / CI
npx create-nonoise my-app --template single-project --ai claude-code,copilot --yes
```

### Flusso interattivo

1. **Banner** — ASCII art logo NONoise + versione CLI.
   (Asset del logo da fornire in fase di implementazione; strumento di conversione da
   decidere tra ASCII art scritto a mano e librerie tipo `ascii-image-converter`.)
2. **Prompt nome progetto** — text input, validato kebab-case, 1–214 char, no collision.
3. **Prompt template** — select. In SP-1 solo `single-project` (altre opzioni nascoste).
4. **Prompt AI tools** — multi-select checkbox. Default pre-selezionati: Claude Code,
   GitHub Copilot. Opzionali: Codex, Cursor, Gemini CLI.
5. **Prompt git init** — yes/no. Default yes.
6. **Scaffolding** — spinner con step visibili: write template files, install skills,
   git init + first commit, generate `nonoise.config.json`.
7. **Next steps** — messaggio finale con `cd <projectName>` + suggerimenti.

### Context object passato a scaffold

```ts
type ProjectContext = {
  projectName: string;              // "my-app"
  projectPath: string;              // absolute path
  template: "single-project";       // solo questa in SP-1
  aiTools: {
    claudeCode: boolean;
    copilot: boolean;
    codex: boolean;
    cursor: boolean;
    geminiCli: boolean;
  };
  gitInit: boolean;
  frameworkVersion: string;         // da package.json del CLI
};
```

### Flag CLI

| Flag                | Default | Note                                        |
|---------------------|---------|---------------------------------------------|
| `--template <name>` | —       | Skip prompt template                        |
| `--ai <csv>`        | —       | es. `--ai claude-code,copilot`              |
| `--no-git`          | —       | Skip prompt git init (no)                   |
| `--yes, -y`         | —       | Conferma tutto con default, utile in CI     |
| `--version, -v`     | —       | Stampa versione                             |
| `--help, -h`        | —       | Help                                        |

### Gestione errori UX

| Scenario                              | Comportamento                                              |
|---------------------------------------|------------------------------------------------------------|
| Ctrl+C                                | Exit 130, "Aborted", rollback cartella parziale             |
| Directory esistente non vuota         | Re-prompt: Cancel / Overwrite / Choose different name       |
| Nome progetto non valido              | Errore inline, re-prompt sullo stesso campo                 |
| Nessun AI tool selezionato            | Conferma esplicita (caso legittimo)                         |
| Scaffold fallisce a metà              | Rollback best-effort, scrive `<projectPath>/.nonoise-error.log` |
| Node < 20                             | Exit 1 con messaggio "Node ≥ 20 required"                   |

## Template rendering engine

### Convenzione cartelle `_always/` + `_if-<flag>/`

```
packages/templates/single-project/
├── _always/
│   ├── AGENTS.md.hbs
│   ├── README.md.hbs
│   ├── .gitignore.hbs
│   ├── nonoise.config.json.hbs
│   ├── docs/{adr,specs,guides}/.gitkeep
│   ├── tools/.gitkeep
│   ├── src/.gitkeep
│   └── .vscode/{settings,extensions}.json.hbs
├── _if-claude-code/
│   ├── CLAUDE.md.hbs
│   └── .claude/
│       ├── skills/.gitkeep                          ← popolato da skill-installer
│       ├── agents/.gitkeep
│       ├── commands/.gitkeep
│       └── settings.json.hbs
├── _if-copilot/
│   └── .github/
│       ├── copilot-instructions.md.hbs
│       └── instructions/.gitkeep
├── _if-codex/
│   └── .codex/.gitkeep
├── _if-cursor/
│   └── .cursor/rules.md.hbs
└── _if-gemini-cli/
    └── GEMINI.md.hbs
```

### Regole resolver

1. Walk ricorsivo di `single-project/`.
2. Per ogni cartella top-level:
   - Nome `_always` → include sempre.
   - Nome `_if-<flag>` → include solo se `ctx.aiTools.<flagCamelCase>` è `true`
     (mapping: `claude-code`→`claudeCode`, `gemini-cli`→`geminiCli`, ecc.).
3. I contenuti delle cartelle incluse vengono "spostati virtualmente" alla root
   di destinazione.

### File processing

| Estensione sorgente | Processing                     | Estensione destinazione |
|---------------------|--------------------------------|-------------------------|
| `*.hbs`             | Render handlebars, strip `.hbs`| `*` (senza `.hbs`)      |
| `.gitkeep`          | Copia (preserva cartelle vuote)| `.gitkeep`              |
| Binari whitelist    | Copia byte-per-byte             | Invariata               |
| Altro               | Copia byte-per-byte             | Invariata               |

Whitelist binari: `.png .jpg .jpeg .ico .webp .zip`. File non-testuali fuori whitelist
generano errore di build (protegge da render accidentale di file binari).

### Placeholder handlebars disponibili

```handlebars
{{projectName}}          → "my-app"
{{projectNamePascal}}    → "MyApp"
{{projectNameSnake}}     → "my_app"
{{frameworkVersion}}     → "0.1.0"
{{year}}                 → "2026"
{{#if aiTools.claudeCode}}...{{/if}}
```

Esportati come tipi da `types.ts` → type-check automatico nei test.

### Skill installer (orchestrazione separata)

Le skill **non** vivono dentro `_if-claude-code/.claude/skills/`. Dopo il render dei
template, se `ctx.aiTools.claudeCode === true`, `skill-installer.ts` copia le skill
da `packages/skills/<name>/` a `<projectPath>/.claude/skills/<name>/`.

- In SP-1 le 3 skill del bundle sono **hardcoded** nel codice del CLI.
- In SP-2 il bundle diventerà configurabile (manifest JSON + prompt dedicato).

### Edge cases resolver

- Cartella destinazione inesistente → crea ricorsivamente.
- Collisione file `_always/X` + `_if-Y/X` → errore al test CI (L1), mai runtime.
- Path normalization: internamente POSIX (`path.posix`), scritture con `path` nativo.

## Le 3 skill bundled (SP-7)

### `graphify-gitignore` (full in SP-1)

**Scopo**: assicura che `.gitignore` contenga le entry corrette per graphify.

**Trigger**: "aggiungi graphify al gitignore", "il gitignore ha graphify?",
proattivo se rileva `graphify-out/` non ignorato.

**Sezione idempotente**:

```gitignore
# >>> graphify (managed by graphify-gitignore skill)
graphify-out/
.graphify_*
.obj/
# <<< graphify
```

**Comportamento**:
1. Legge `.gitignore` esistente.
2. Sezione marker già presente → no-op con conferma.
3. Non presente → appende la sezione.
4. File inesistente → crea con solo la sezione.
5. Risponde con diff di cosa è stato aggiunto/confermato.

**Implementazione**: pura skill Claude (solo `SKILL.md`), zero asset, zero runtime.

### `vscode-config-generator` (full in SP-1)

**Scopo**: crea/aggiorna `.vscode/tasks.json` e `.vscode/launch.json` sullo stack
detectato.

**Trigger**: "crea task vscode", "genera launch.json", "configura vscode per debug".

**Comportamento**:
1. Scannerizza la root per marker di stack:
   - `package.json` con `scripts` → task `npm run <script>` per ogni script.
   - `*.csproj` / `*.sln` → task `dotnet build`, `dotnet test`; launch `dotnet run`.
   - `pyproject.toml` / `requirements.txt` → task `python -m <module>`; launch Python.
2. Se il file esiste, mostra diff e chiede conferma.
3. Merge intelligente: preserva task/launch scritti a mano, aggiorna solo quelli
   generati (identificati da `"detail": "generated by vscode-config-generator"`).
4. Output formattato: 2 spaces, array ordinati stabilmente.

**Implementazione**: skill Claude con **asset JSON template** in `assets/`:
`tasks.node.json.hbs`, `tasks.dotnet.json.hbs`, `tasks.python.json.hbs`,
`launch.node.json.hbs`, `launch.dotnet.json.hbs`, `launch.python.json.hbs`.

**Multi-stack**: monorepo Node+.NET → task di entrambi + compound launch config.

### `docs-md-generator` (stub in SP-1, full in SP-7.b)

**Scopo finale (SP-7.b)**: genera/aggiorna coerentemente `CLAUDE.md`, `AGENTS.md`,
`.github/copilot-instructions.md`.

**Modello source-of-truth** (SP-7.b):

```
       ┌─────────────────────┐
       │   AGENTS.md         │
       │   (source of truth) │
       └──────────┬──────────┘
                  │ render con adapter-specifici
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
CLAUDE.md  copilot-inst.md  GEMINI.md
```

**SP-1 ship (stub)**: solo `SKILL.md` descrittivo che:
- Dichiara lo scopo e il modello.
- Segnala "stub: implementazione reale in SP-7.b".
- Suggerisce di editare a mano i 3 file finché la skill non sarà operativa.

**Ratio**: shippare lo stub per discovery (utente vede la skill installata) e per
avere il placeholder nel registry (`packages/skills/docs-md-generator/` esiste,
in SP-7.b è solo overwrite).

## Testing strategy

### Stack

- **Runner**: `vitest`.
- **CI**: GitHub Actions, matrix `[ubuntu-latest, windows-latest, macos-latest] × Node [20, 22]`.

### Livelli

**L1 — Unit** (`packages/create-nonoise/src/**/*.test.ts`)

Funzioni pure: `template-resolver`, `skill-installer`, handlebars helpers.
Target coverage: ≥ 80% branches su resolver e installer.

**L2 — Integration** (`packages/create-nonoise/test/integration/*.test.ts`)

CLI end-to-end in modalità non-interattiva con flag `--yes`. Scenari:
- Tutti gli AI tool selezionati.
- Nessun AI tool (solo `AGENTS.md` + struttura base).
- Combinazioni plausibili (Claude+Copilot, Cursor only).
- Directory esistente non vuota → errore controllato.
- Nome progetto invalido → exit non-zero.

Target: ≥ 3 combinazioni di flag coperte.

**L3 — Snapshot** (`packages/create-nonoise/test/snapshots/*.test.ts`)

Golden test con set flag canonico (tutti gli AI tool, git init). Snapshot committati.
Update intenzionale via `vitest -u` + code review. Protegge da file rimossi/rinominati,
placeholder non renderizzati, cambi silenziosi di contenuto.

**L4 — Skill validation**

Per ogni skill in `packages/skills/*/`:
- Esiste `SKILL.md`.
- Frontmatter YAML valido con `name` e `description`.
- Asset referenziati nel markdown esistono sul filesystem.

Target: 100% skill passano.

### Fuori scope test SP-1

- Test di **behavior** della skill (invocazione reale dentro Claude Code).
  Richiede harness non triviale; rimandato a sprint futuro.
- Visual regression terminale. Test manuale pre-release.

## Versioning, release, error handling

### Versioning

Strategia **sincrona con changesets**: tutti i package allo stesso `0.x.y`
durante SP-1.

- `pnpm changeset` per registrare un cambio.
- `pnpm changeset version` → bump + CHANGELOG.
- `pnpm changeset publish` → pubblica solo `create-nonoise` su npm.

Rivalutiamo sync vs indipendente dopo SP-2.

### Release

- Trigger: tag git `v*.*.*` → GitHub Action (`pnpm test` + `pnpm build` + `pnpm changeset publish --provenance`).
- **npm provenance** attivo da day 1 (build attestation automatica).
- **Pre-release**: tag `v*.*.*-alpha.N` → dist-tag `alpha`.

### Error handling cross-cutting

| Scenario                                   | Comportamento                                     |
|--------------------------------------------|---------------------------------------------------|
| Cancel utente (Ctrl+C)                     | Exit 130, "Aborted", rollback parziale             |
| I/O error a metà scaffold                  | Rollback best-effort, log in `.nonoise-error.log`, exit 1 |
| Template handlebars malformato             | Blocco al test CI; se runtime → exit 1 con path    |
| Skill referenziata inesistente             | Blocco al test L4; non raggiunge runtime           |
| Collisione file `_always/X` + `_if-Y/X`    | Blocco al test L1; non raggiunge runtime           |
| Node < 20                                  | Check in bin shim → exit 1                         |

### Logging

- Default: clean (spinner + step).
- `--verbose` o `DEBUG=create-nonoise:*`: log dettagliati di ogni copy/render.
- Errori: sempre visibili.

## `nonoise.config.json` generato

File scritto nella root del progetto generato. Formato:

```json
{
  "$schema": "https://nonoise.dev/schemas/project-config.v1.json",
  "frameworkVersion": "0.1.0",
  "template": "single-project",
  "createdAt": "2026-04-18T10:42:00.000Z",
  "aiTools": {
    "claudeCode": true,
    "copilot": true,
    "codex": false,
    "cursor": false,
    "geminiCli": false
  },
  "skills": [
    "graphify-gitignore",
    "vscode-config-generator",
    "docs-md-generator"
  ]
}
```

Scopo:
- Permette a comandi CLI futuri (es. `create-nonoise upgrade`, `create-nonoise add-skill`
  in sprint successivi) di sapere com'è stato generato il progetto e quali skill
  sono installate.
- Source-of-truth machine-readable per sub-progetti futuri (SP-6 SDLC shell).

URL schema (`https://nonoise.dev/schemas/project-config.v1.json`) è convenzione.
In SP-1 l'URL non risolve ancora — sarà pubblicato in SP-8 (sito docs). Chi valida
localmente prima di SP-8 userà lo schema bundlato in `packages/create-nonoise/schemas/`.

## Decisioni aperte da chiudere in implementazione

- **Banner**: decidere formato sorgente logo (SVG/PNG) e strumento di conversione
  ASCII.
- **Collision directory esistente**: comportamento esatto del flow "Overwrite"
  (rimuove tutto e rigenera, o merge?). Default proposto: rimuove tutto e rigenera
  con doppia conferma.
- **Umbrella template nascosto in prompt**: lo nascondiamo del tutto o lo mostriamo
  disabilitato con label "coming soon"? Default proposto: nascosto.

## Riferimenti

- Roadmap complessivo: `D:\DEV\NONoise-frmw\ROADMAP.md`
- Progetto di riferimento: `D:\DEV\NONoise-frmw\reference-project\`
- Sub-progetti correlati: SP-2 (skill library), SP-3 (umbrella template), SP-7 (skill nuove).
