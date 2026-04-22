# Site brief — reframe NoNoise site around the bootstrapper

**Audience:** Claude UI (or any model) performing a site rework.
**Source site:** `D:/DEV/NONoise-frmw-site/` — Vite + React, content dictionary at `src/content.js`, rendering at `src/App.jsx`, styles at `src/styles.css`.
**Goal:** reposition the site from *"methodology / pilot project"* framing to *"AI SDLC bootstrapper — covers the entire lifecycle"* framing. Keep visual identity; reshape content and emphasis.

This document is self-contained. A reader can rebuild the site content from it without needing to re-read the code. The authoritative source for every fact is this repo's `docs/` — cross-referenced inline.

---

## 1. What's wrong with the current site

The current site was built before NoNoise became a bootstrapper. It frames the project as:

- *"NoNoise Framework v1.3 — AI-driven framework for the entire SDLC"* — accurate but framework-centric; reads as methodology rather than tool.
- Kicker says *"v1.3 · In sviluppo attivo — SP-1"* — the sub-project version confuses readers; v1.3 is the **handbook** version, not the bootstrapper.
- Phases `00 Preparazione / 01 Skill / 02 Team / 03 Sviluppo / 04 Observability / 05 Deploy` — these are *methodology-pilot phases* (what the RiskoWeb project did), not *bootstrapper SDLC phases*.
- Skill domains `D1 Architectural governance / D2 DevOps / D3 Development / D4 Testing / D5 Knowledge` — 17+ skills listed; bootstrapper actually ships 40+.
- Metrics ticker mentions `9.4× productivity / 93 tasks · 3 people / €400 month tools / 17+ skills` — pilot data. Relevant as validation, but misleading as headline numbers for a bootstrapper prospect.
- Roadmap `SP-1 CLI installer core / SP-2 skill library / ... / SP-7 new skills / SP-8 site` — mostly outdated; SP-1 to SP-8 have progressed, and newer items (bootstrapper docs, Polly v1, c4-doc-writer, docs refactor) are missing.
- Author section describes NoNoise as "lesson learned from Andreani" — should read "lesson learned, **packaged and open-sourced** so the method outlives the project".

**What to keep:** the three visual variants (Editorial / Instrument / Blueprint), the signal-vs-noise bar visualisation, the terminal animation, the pillars interaction, the phases flow, the gantt for roadmap. All good. The fix is **content**, not visual direction.

---

## 2. New headline message

**One sentence pitch:**

> An AI SDLC bootstrapper. One command installs a fully-wired, AI-ready project — skills, docs hierarchy, Polly orchestrator — covering the entire software lifecycle from requirements to observability.

**Five things a first-time visitor must leave knowing:**

1. **It's a bootstrapper.** `npx create-nonoise`. Runs once. Leaves the project owning itself.
2. **It covers the WHOLE SDLC.** Requirements, architecture, sprint, dev, acceptance, operations — not just scaffolding.
3. **Polly is the conductor.** Not a code generator; an orchestrator that tells the team what to do next.
4. **It's team-first.** Pair mode for decisions, solo mode for implementation, announced every step.
5. **Cross-tool.** Claude Code and GitHub Copilot first-class in v1; Cursor / Gemini CLI / Codex best-effort.

All other messages are supporting copy for these five.

---

## 3. New sitemap

Keep the section spine; reshape the content of each.

| § | Section | Framing | Change |
|---|---|---|---|
| — | Nav | unchanged | Replace "Pilastri / Fasi / Skill / Metriche / Roadmap / Autore" with updated labels (section anchors stay the same: `#pillars`, `#phases`, `#skills`, `#metrics`, `#roadmap`, `#author`) |
| Hero | Hero | **Reshape** — lead with bootstrapper + SDLC coverage | Replace kicker, H1, sub, meta row |
| — | SignalNoise | Principle | Small copy tweak; keep visualisation |
| 1 | Pillars | Foundation | Keep 5 pillars; rewrite bodies to say "bootstrapper implements this out-of-the-box" |
| 2 | Phases | **Rename: "SDLC coverage"** | **REPLACE 6 pilot phases with 6 SDLC phases**: Requirements / Architecture / Sprint / Implementation / Acceptance / Operations |
| 3 | Skills | Catalog | **REPLACE 5 pilot domains with bootstrapper catalog**: Orchestration / Requirements & discovery / Architecture & validation / Sprint & implementation / Brownfield / Ops & observability / Integrations / Generators / Vendored superpowers / Vendored design pack — ≥ 40 skills |
| 4 | Metrics | **Reframe: "Evidence from the pilot"** | Keep the numbers; add 3-4 bootstrapper-level numbers (40+ skills, 6 SDLC phases, 5 tools supported, 2 first-class, docs tree 6 folders) |
| NEW | **Polly** | Orchestrator deep-dive | **NEW SECTION** — pair/solo modes, dev trio, greenfield/brownfield decision tree |
| NEW | **Cross-tool** | Support matrix | **NEW SECTION** — Claude/Copilot first-class; others best-effort |
| 5 | Roadmap | Trajectory | **UPDATE** — recent items (Polly v1, docs refactor, bootstrapper migration, core+pack split, multi-repo template) |
| 6 | Author | Author | Reframe bio to "lesson-learned, packaged and open-sourced" |
| — | Footer | unchanged | Keep |

**Two new sections** (Polly, Cross-tool) require App.jsx edits. Placement: after Phases, before Skills, for Polly; after Skills, before Metrics, for Cross-tool.

---

## 4. Content per section — bilingual, final copy

Below: the full content dictionary in the shape `content.js` expects. Use it as-is or adapt phrasing to the visual variant. Every `it` / `en` pair is translation-final — no placeholder text.

### 4.1 Nav

```js
nav: {
  pillars:   { it: "Pilastri",   en: "Pillars" },
  sdlc:      { it: "SDLC",       en: "SDLC" },
  polly:     { it: "Polly",      en: "Polly" },
  skills:    { it: "Skill",      en: "Skills" },
  crosstool: { it: "Multi-tool", en: "Cross-tool" },
  metrics:   { it: "Evidenze",   en: "Evidence" },
  roadmap:   { it: "Roadmap",    en: "Roadmap" },
  author:    { it: "Autore",     en: "Author" },
}
```

Section anchors: `#pillars`, `#sdlc`, `#polly`, `#skills`, `#crosstool`, `#metrics`, `#roadmap`, `#author`.

### 4.2 Hero

```js
hero: {
  kicker: { it: "NoNoise · AI SDLC bootstrapper", en: "NoNoise · AI SDLC bootstrapper" },
  h1_it: "Un bootstrapper AI per l'intero SDLC.",
  h1_en: "A bootstrapper for the entire AI SDLC.",
  sub: {
    it: "Un comando (`npx create-nonoise`) trasforma una cartella vuota in un progetto AI-ready completo: 40+ skill, docs hierarchy, context files multi-tool, e Polly — l'orchestratore che guida il team dall'input grezzo al merge. Copre tutto il ciclo di vita del software: requisiti, architettura, sprint, sviluppo, accettazione, operazioni.",
    en: "One command (`npx create-nonoise`) turns an empty folder into a fully AI-ready project: 40+ skills, docs hierarchy, cross-tool context files, and Polly — the orchestrator that walks the team from raw input to merged PR. Covers the entire software lifecycle: requirements, architecture, sprint, development, acceptance, operations.",
  },
  cta1: { it: "npx create-nonoise", en: "npx create-nonoise" },
  cta2: { it: "Vedi su GitHub",    en: "View on GitHub" },
  meta: {
    version:   { it: "Versione",  en: "Version" },
    status:    { it: "Stato",     en: "Status" },
    author:    { it: "Autore",    en: "Author" },
    scope:     { it: "Scope",     en: "Scope" },
    statusVal: { it: "v1 in sviluppo · Polly v1 validato su Claude Code + Copilot", en: "v1 in development · Polly v1 validated on Claude Code + Copilot" },
    scopeVal:  { it: "Cross-tool · stack-agnostic · team-first", en: "Cross-tool · stack-agnostic · team-first" },
  },
}
```

**Ticker** (hero bottom scrolling bar) — replace the pilot metrics with bootstrapper-scale numbers:

```
40+ skills · entire SDLC
6 phases · requirements → ops
25 NONoise-native skills
14 vendored superpowers
2 first-class tools · Claude Code + Copilot
Polly · greenfield + brownfield
Pair · solo · announced every step
Canonical patterns · DDD · CQRS · Clean Arch
Docs-as-truth · 6-folder hierarchy
stack-agnostic · .NET · Node · Python · Rust · Go
advisor-only · no auto-install
open-source · MIT + attribution
```

**H1 in App.jsx Hero** — currently hardcoded. Change to:

- IT: `Un bootstrapper AI per l'intero SDLC.`
- EN: `A bootstrapper for the entire AI SDLC.`

### 4.3 SignalNoise

```js
signal: {
  label: { it: "Il principio", en: "The principle" },
  lead: {
    it: "Nell'era degli agenti di coding il fattore limitante non è la capacità dell'AI. È il rumore.",
    en: "In the age of coding agents, the limiting factor is not the AI's capability. It's the noise.",
  },
  body: {
    it: "Sviluppatori non coordinati. Architetture esotiche che l'AI non riconosce. Repository senza contesto. Codice nascosto in pacchetti compilati. Documenti pensati per umani che l'AI interpreta male. NoNoise elimina queste cinque fonti di rumore con uno scaffold deterministico — skill condivise, pattern canonici, docs-as-truth, tool multipli supportati.",
    en: "Uncoordinated developers. Exotic architectures the AI doesn't recognize. Repositories with no context. Code hidden in compiled packages. Documents written for humans that the AI misreads. NoNoise eliminates these five noise sources with a deterministic scaffold — shared skills, canonical patterns, docs-as-truth, multiple tools supported.",
  },
},
```

### 4.4 Pillars

Keep the five pillars (the critique of "one-man-band assumption" from the README is implicit — these five principles are universal). Tweak subtitles to stress "bootstrapper implements this".

```js
pillars: {
  title: { it: "I cinque pilastri", en: "The five pillars" },
  sub: {
    it: "Prerequisiti tecnici non negoziabili. Il bootstrapper li implementa out-of-the-box — se ne manca uno, lo sviluppo agentico produce risultati inconsistenti.",
    en: "Non-negotiable technical prerequisites. The bootstrapper ships them out-of-the-box — missing even one degrades the whole system.",
  },
  items: [
    {
      k: "01",
      t: { it: "Ambiente locale runnabile", en: "Runnable local environment" },
      s: { it: "Un bottone e parte tutto · Docker Compose, VS Code Tasks", en: "One click and everything runs · Docker Compose, VS Code Tasks" },
      b: {
        it: "L'intero stack lanciabile in locale con un singolo comando. L'agente esegue, testa, mette breakpoint, verifica risultati — senza dipendere da ambienti remoti. Il feedback loop passa da 20-30 minuti a 30-60 secondi. Lo scaffold genera i file VS Code (via vscode-config-generator) per Node, .NET, Python.",
        en: "The entire stack runnable locally with a single command. The agent executes, tests, sets breakpoints, verifies results — without remote dependencies. The feedback loop drops from 20-30 minutes to 30-60 seconds. The scaffold generates VS Code files (via vscode-config-generator) for Node, .NET, Python.",
      },
      tags: ["docker compose", "vscode tasks", "vscode-config-generator", "local db"],
    },
    {
      k: "02",
      t: { it: "Codice visibile", en: "Visible code" },
      s: { it: "L'agente apre il motore e guarda dentro · ProjectReference > binary", en: "Agent opens the engine and looks inside · ProjectReference > binary" },
      b: {
        it: "I pacchetti compilati nascondono l'implementazione: l'agente vede le firme, non il comportamento. Alex (bmad-agent-architect) è intransigente su questo: in arch-decision le dipendenze binary-only sono una yellow flag. Con ProjectReference / source dependencies il codice è navigabile, debuggabile, ispezionabile riga per riga.",
        en: "Compiled packages hide the implementation: the agent sees signatures, not behaviour. Alex (bmad-agent-architect) is strict on this: in arch-decision, binary-only dependencies are a yellow flag. With ProjectReference / source dependencies the code is navigable, debuggable, inspectable line by line.",
      },
      tags: ["ProjectReference", "source-over-binary", "arch-decision"],
    },
    {
      k: "03",
      t: { it: "Pattern standard", en: "Standard patterns" },
      s: { it: "Memoria parametrica > context injection", en: "Parametric memory > context injection" },
      b: {
        it: "I pattern ad alta frequenza (DDD, Repository, CQRS, Clean Architecture, hexagonal, BFF, saga, outbox) sono nella memoria parametrica dell'LLM: generazione zero-shot, zero token di descrizione. I pattern esotici forzano in-context learning, consumano token, competono per l'attenzione. arch-brainstorm li elenca per primi; arch-decision + quint-fpf auditano le deviazioni in sei fasi strutturate.",
        en: "High-frequency training-data patterns (DDD, Repository, CQRS, Clean Architecture, hexagonal, BFF, saga, outbox) live in the LLM's parametric memory: zero-shot generation, zero description tokens. Exotic patterns force in-context learning, consume tokens, compete for attention. arch-brainstorm lists them first; arch-decision + quint-fpf audit deviations via a six-phase structured cycle.",
      },
      tags: ["DDD", "CQRS", "Clean Arch", "arch-brainstorm", "quint-fpf"],
    },
    {
      k: "04",
      t: { it: "Contesto nel repo", en: "Context in the repo" },
      s: { it: "Docs-as-truth · 6 cartelle · context file multi-tool", en: "Docs-as-truth · 6 folders · cross-tool context files" },
      b: {
        it: "La gerarchia docs/ è la fonte di verità: architecture/, requirements/, calls/, support/, prd/, sprints/. Ogni skill legge e scrive qui — niente Confluence, niente chat, niente 'Marco ricorda'. I file di contesto tool-specifici (CLAUDE.md, AGENTS.md, .github/copilot-instructions.md) sono generati da un unico source-of-truth con budget rigidi (500 righe root, 200 per servizio). docs-md-generator mantiene coerenza tra i tre.",
        en: "The docs/ hierarchy is the source of truth: architecture/, requirements/, calls/, support/, prd/, sprints/. Every skill reads and writes here — no Confluence, no chat, no 'Marco remembers'. Tool-specific context files (CLAUDE.md, AGENTS.md, .github/copilot-instructions.md) are generated from one source-of-truth with strict budgets (500 lines root, 200 per service). docs-md-generator keeps the three coherent.",
      },
      tags: ["docs/", "CLAUDE.md", "AGENTS.md", "copilot-instructions.md", "docs-md-generator"],
    },
    {
      k: "05",
      t: { it: "Accesso ai sistemi reali", en: "Access to real systems" },
      s: { it: "CLI > API > Web · 550× più efficiente di MCP", en: "CLI > API > Web · 550× more efficient than MCP" },
      b: {
        it: "L'agente chiude il loop debug→fix→verify in 2-3 minuti se può interrogare App Insights, pipeline, cluster via CLI autenticata. Via CLI: ~260 token. Via MCP: 143.000 token (72% di una context window da 200K). observability-debug fornisce adapter per App Insights, Datadog, Grafana+Loki, CloudWatch, OpenTelemetry. ops-skill-builder insegna l'approccio access-first a qualsiasi task ops.",
        en: "The agent closes the debug→fix→verify loop in 2-3 minutes if it can query App Insights, pipelines, clusters via authenticated CLI. Via CLI: ~260 tokens. Via MCP: 143,000 tokens (72% of a 200K window). observability-debug ships adapters for App Insights, Datadog, Grafana+Loki, CloudWatch, OpenTelemetry. ops-skill-builder teaches the access-first approach for any ops task.",
      },
      tags: ["az cli", "kubectl", "observability-debug", "ops-skill-builder", "gh"],
    },
  ],
},
```

### 4.5 Phases — RESHAPE to SDLC coverage

**Section anchor:** `#sdlc` (was `#phases`). Section title: "SDLC coverage" / "Copertura SDLC".

This is the section the user wants most emphasised. The six phases of the real SDLC that Polly orchestrates (see `docs/sdlc.md` for authority):

```js
phases: {
  title: { it: "Copertura SDLC — sei fasi", en: "SDLC coverage — six phases" },
  sub: {
    it: "Dall'input grezzo al merge. Il bootstrapper copre tutto il ciclo di vita. Polly orchestra · pair/solo annunciato per ogni step.",
    en: "From raw input to merge. The bootstrapper covers the entire lifecycle. Polly orchestrates · pair/solo announced every step.",
  },
  items: [
    {
      n: "01",
      t: { it: "Requisiti & Discovery", en: "Requirements & Discovery" },
      d: {
        it: "PDF / DOCX / email / trascrizioni call → requisiti strutturati in docs/requirements/. Tassonomia: functional / business-rule / UI / out-of-scope / open-question. Skill: requirements-ingest, bmad-agent-analyst (Isa), bmad-advanced-elicitation, bmad-req-validator.",
        en: "PDFs / DOCX / emails / call transcripts → structured requirements in docs/requirements/. Taxonomy: functional / business-rule / UI / out-of-scope / open-question. Skills: requirements-ingest, bmad-agent-analyst (Isa), bmad-advanced-elicitation, bmad-req-validator.",
      },
      dur: "[pair]",
    },
    {
      n: "02",
      t: { it: "Architettura", en: "Architecture" },
      d: {
        it: "Brainstorm pattern canonici → PRD draft → validazione formale Quint FPF (6 fasi) → ADR → diagrammi C4 vivi via Structurizr DSL. Skill: arch-brainstorm, arch-decision, quint-fpf, bmad-agent-architect (Alex), c4-doc-writer.",
        en: "Canonical-pattern brainstorm → draft PRD → formal Quint FPF validation (6 phases) → ADR → living C4 diagrams via Structurizr DSL. Skills: arch-brainstorm, arch-decision, quint-fpf, bmad-agent-architect (Alex), c4-doc-writer.",
      },
      dur: "[pair]",
    },
    {
      n: "03",
      t: { it: "Sprint breakdown", en: "Sprint breakdown" },
      d: {
        it: "PRD validati → sprint-manifest con macro-task vertical-slice, confidence level CL1/CL2/CL3. Push opzionale a GitHub Issues / Azure DevOps / Jira / Linear via spec-to-workitem (adapter pattern).",
        en: "Validated PRDs → sprint-manifest with vertical-slice macro tasks, confidence levels CL1/CL2/CL3. Optional push to GitHub Issues / Azure DevOps / Jira / Linear via spec-to-workitem (adapter pattern).",
      },
      dur: "[pair]",
    },
    {
      n: "04",
      t: { it: "Implementazione — dev trio", en: "Implementation — dev trio" },
      d: {
        it: "Per ogni task: writing-plans → executing-plans (con test-driven-development, dispatching-parallel-agents) → systematic-debugging su fail inattesi → verification-before-completion prima di dire 'done'. Loop solo, parallelizzabile, smaller model OK.",
        en: "Per task: writing-plans → executing-plans (with test-driven-development, dispatching-parallel-agents) → systematic-debugging on unexpected failures → verification-before-completion before claiming 'done'. Solo loop, parallelizable, smaller models OK.",
      },
      dur: "[solo]",
    },
    {
      n: "05",
      t: { it: "Acceptance & Review", en: "Acceptance & Review" },
      d: {
        it: "atr (Acceptance Test Runner): legge criteri dal sprint-manifest, genera testbook, esegue via Playwright, produce report Markdown con screenshot. Poi requesting-code-review / receiving-code-review con rigore tecnico. finishing-a-development-branch per merge / PR / cleanup.",
        en: "atr (Acceptance Test Runner): reads criteria from sprint-manifest, generates testbook, runs via Playwright, produces Markdown report with screenshots. Then requesting-code-review / receiving-code-review with technical rigor. finishing-a-development-branch for merge / PR / cleanup.",
      },
      dur: "[solo]",
    },
    {
      n: "06",
      t: { it: "Operations & Ongoing", en: "Operations & Ongoing" },
      d: {
        it: "Post-merge: observability-debug con adapter backend-agnostici (App Insights, Datadog, Grafana+Loki, CloudWatch, OTel). ops-skill-builder: ogni task operativo fatto due volte diventa una skill locale al progetto — coach-then-crystallize in cinque fasi.",
        en: "Post-merge: observability-debug with backend-agnostic adapters (App Insights, Datadog, Grafana+Loki, CloudWatch, OTel). ops-skill-builder: every ops task done twice becomes a project-local skill — coach-then-crystallize in five phases.",
      },
      dur: "[solo]",
    },
  ],
  brownfield_note: {
    it: "Prefisso brownfield: reverse-engineering (build del grafo + analisi). Poi rientro al punto 1 o 2 secondo la three-way routing table.",
    en: "Brownfield prefix: reverse-engineering (graph build + analysis). Then re-enter at step 1 or 2 per the three-way routing table.",
  },
},
```

**App.jsx change needed:** the Phases component currently renders `PHASE · <n>` + title + description + `⏱ <dur>`. The `dur` field I've repurposed to carry the `[pair]` / `[solo]` mode — which is the more important signal. If the rework prefers a separate mode-badge, add a field; the current field re-use is the minimal-change path.

### 4.6 NEW section — Polly orchestrator

**Anchor:** `#polly`. **Placement:** after SDLC, before Skills.

```js
polly: {
  title: { it: "Polly — orchestratore SDLC", en: "Polly — the SDLC orchestrator" },
  sub: {
    it: "Non scrive codice. Conduce. Chiede 'greenfield o brownfield?' e guida il team attraverso le sei fasi, invocando la skill giusta al momento giusto.",
    en: "Does not write code. Conducts. Asks 'greenfield or brownfield?' and walks the team through the six phases, invoking the right skill at the right moment.",
  },
  features: [
    {
      k: "auto-trigger",
      t: { it: "Auto-trigger post-scaffold", en: "Auto-triggers post-scaffold" },
      d: {
        it: "Lo scaffold scrive .nonoise/POLLY_START.md. CLAUDE.md e copilot-instructions.md hanno un blocco che dice all'AI: 'se questo file esiste, invoca Polly per prima cosa, poi cancellalo'. One-shot — niente pester sulle sessioni successive.",
        en: "The scaffold writes .nonoise/POLLY_START.md. CLAUDE.md and copilot-instructions.md include a block telling the AI 'if this file exists, your first action this session is to invoke Polly, then delete it'. One-shot — no pestering on later sessions.",
      },
    },
    {
      k: "pair-vs-solo",
      t: { it: "Pair vs solo per ogni step", en: "Pair vs solo every step" },
      d: {
        it: "Ogni step ha una modalità annunciata a voce alta: [pair] = banda larga, senior insieme, modello grande. [solo] = un dev per task, smaller model OK, parallelizzabile. Requirements / architettura / sprint planning = [pair]. Implementazione = [solo].",
        en: "Every step has a mode announced out loud: [pair] = high-bandwidth, seniors together, large model. [solo] = one dev per task, smaller models OK, parallelizable. Requirements / architecture / sprint planning = [pair]. Implementation = [solo].",
      },
    },
    {
      k: "greenfield-brownfield",
      t: { it: "Greenfield + brownfield", en: "Greenfield + brownfield" },
      d: {
        it: "Greenfield: stack → requisiti → design → architettura → sprint → dev → acceptance. Brownfield: reverse-engineering → requirements-ingest → rientro via three-way routing (nuova feature / cambio architetturale / solo documentazione).",
        en: "Greenfield: stack → requirements → design → architecture → sprint → dev → acceptance. Brownfield: reverse-engineering → requirements-ingest → re-entry via three-way routing (new feature / architectural change / doc-only).",
      },
    },
    {
      k: "skip-rules",
      t: { it: "Skip rules intelligenti", en: "Smart skip rules" },
      d: {
        it: "Refactor puro salta design. Feature semplice su architettura nota salta l'ADR. Bug fix entra direttamente in systematic-debugging. Ogni skip è annunciato con motivo — il team può dissentire.",
        en: "Pure refactor skips design. Simple feature on known architecture skips the ADR. Bug fix enters systematic-debugging directly. Every skip is announced with reason — the team can disagree.",
      },
    },
    {
      k: "multi-repo",
      t: { it: "Multi-repo workspace", en: "Multi-repo workspace" },
      d: {
        it: "Rileva repositories.json, annuncia la convenzione workspace-centric (skill alla radice), integrazione con script clone-all / switch-branch / pull-all, compatibilità VibeKanban per triage bug cross-repo.",
        en: "Detects repositories.json, announces workspace-centric convention (skills at root), integration with clone-all / switch-branch / pull-all scripts, VibeKanban compatibility for cross-repo bug triage.",
      },
    },
    {
      k: "dev-trio",
      t: { it: "Dev trio mandatory", en: "Mandatory dev trio" },
      d: {
        it: "In implementazione Polly ingaggia writing-plans → executing-plans → atr → finishing-a-development-branch come default, non opzione. I team che vogliono saltare annunciano la deviazione esplicitamente.",
        en: "In implementation Polly engages writing-plans → executing-plans → atr → finishing-a-development-branch as default, not optional. Teams wanting to skip announce the deviation explicitly.",
      },
    },
  ],
},
```

**App.jsx work:** add a `Polly` component rendering a 2-column or 3-column grid of feature cards, similar to Pillars but with `key / title / description` instead of numbered pillars. Insert between `<Phases>` and `<Skills>`.

### 4.7 Skills — REPLACE catalog

Ten domains, ≥ 40 skills. Shape matches the existing `skills.domains[].items[].k/d` pattern.

```js
skills: {
  title: { it: "Catalogo skill — 40+", en: "Skill catalog — 40+" },
  sub: {
    it: "25 native NoNoise + 14 superpowers vendored + pack design (Impeccable) + skill-creator + tooling. Tutte plain Markdown. Cross-tool. Progressive disclosure: ~80 token di discovery, body caricato solo all'attivazione.",
    en: "25 NoNoise-native + 14 vendored superpowers + design pack (Impeccable) + skill-creator + tooling. All plain Markdown. Cross-tool. Progressive disclosure: ~80 discovery tokens, body loaded only on activation.",
  },
  domains: [
    {
      n: "D1",
      t: { it: "Orchestrazione", en: "Orchestration" },
      s: { it: "Il direttore d'orchestra", en: "The conductor" },
      items: [
        { k: "polly", d: { it: "Walkthrough SDLC · pair/solo · auto-trigger post-scaffold", en: "SDLC walkthrough · pair/solo · post-scaffold auto-trigger" } },
      ],
    },
    {
      n: "D2",
      t: { it: "Requisiti & Discovery", en: "Requirements & Discovery" },
      s: { it: "Input grezzo → requisiti strutturati", en: "Raw input → structured requirements" },
      items: [
        { k: "requirements-ingest", d: { it: "PDF/DOCX/email → docs/requirements/ con signal taxonomy", en: "PDF/DOCX/email → docs/requirements/ with signal taxonomy" } },
        { k: "bmad-agent-analyst", d: { it: "Isa — business analyst persona · elicitation · PRFAQ", en: "Isa — business analyst persona · elicitation · PRFAQ" } },
        { k: "bmad-advanced-elicitation", d: { it: "25+ metodi: Socratic, pre-mortem, SCAMPER, Five Whys", en: "25+ methods: Socratic, pre-mortem, SCAMPER, Five Whys" } },
        { k: "bmad-req-validator", d: { it: "MoSCoW · IEEE 830 · INVEST · SMART · ATAM-lite scoring", en: "MoSCoW · IEEE 830 · INVEST · SMART · ATAM-lite scoring" } },
      ],
    },
    {
      n: "D3",
      t: { it: "Architettura & Validazione", en: "Architecture & Validation" },
      s: { it: "PRD draft → validazione formale → ADR", en: "Draft PRD → formal validation → ADR" },
      items: [
        { k: "arch-brainstorm", d: { it: "Dialogo pattern-canonici-first · produce PRD draft", en: "Canonical-first dialogue · produces draft PRD" } },
        { k: "arch-decision", d: { it: "Quint FPF validation · aggiorna status PRD + ADR", en: "Quint FPF validation · updates PRD status + ADR" } },
        { k: "quint-fpf", d: { it: "Six-phase FPF: abduce → deduce → induce → audit → decide", en: "Six-phase FPF: abduce → deduce → induce → audit → decide" } },
        { k: "bmad-agent-architect", d: { it: "Alex — architect persona · niente binary deps · simmetria", en: "Alex — architect persona · no binary deps · symmetry" } },
        { k: "c4-doc-writer", d: { it: "C4 vivi via Structurizr DSL · rigenera Mermaid/PlantUML", en: "Living C4 via Structurizr DSL · regenerates Mermaid/PlantUML" } },
      ],
    },
    {
      n: "D4",
      t: { it: "Sprint & Implementazione", en: "Sprint & Implementation" },
      s: { it: "Task slicing · CL1/2/3 · dev trio · acceptance", en: "Task slicing · CL1/2/3 · dev trio · acceptance" },
      items: [
        { k: "sprint-manifest", d: { it: "PRD → macro-task vertical-slice · confidence levels", en: "PRDs → vertical-slice macro tasks · confidence levels" } },
        { k: "spec-to-workitem", d: { it: "GitHub / Azure DevOps / Jira / Linear adapter pattern", en: "GitHub / Azure DevOps / Jira / Linear adapter pattern" } },
        { k: "atr", d: { it: "Testbook → Playwright run → report Markdown + screenshot", en: "Testbook → Playwright run → Markdown report + screenshots" } },
      ],
    },
    {
      n: "D5",
      t: { it: "Brownfield & Knowledge", en: "Brownfield & Knowledge" },
      s: { it: "Indicizzazione codebase + dossier reverse-engineering", en: "Codebase indexing + reverse-engineering dossiers" },
      items: [
        { k: "reverse-engineering", d: { it: "Dossier versionato · Q&A interattivo · changelog", en: "Versioned dossier · interactive Q&A · changelog" } },
      ],
    },
    {
      n: "D6",
      t: { it: "Ops & Observability", en: "Ops & Observability" },
      s: { it: "Triage incidenti · skill ops per ogni task ripetuto", en: "Incident triage · ops skills for every repeated task" },
      items: [
        { k: "observability-debug", d: { it: "Adapter: App Insights · Datadog · Grafana+Loki · CW · OTel", en: "Adapters: App Insights · Datadog · Grafana+Loki · CW · OTel" } },
        { k: "ops-skill-builder", d: { it: "5-fasi access-first · coach · crystallize in skill locale", en: "5-phase access-first · coach · crystallize into local skill" } },
      ],
    },
    {
      n: "D7",
      t: { it: "Integrazioni", en: "Integrations" },
      s: { it: "Tracker · browser · UI/UX · tech writing", en: "Trackers · browsers · UI/UX · tech writing" },
      items: [
        { k: "playwright-cli", d: { it: "Navigazione · mock · sessioni · tracing · webm", en: "Navigation · mocks · sessions · tracing · webm" } },
        { k: "frontend-design", d: { it: "UI production-grade · nessun generic-AI look", en: "Production-grade UI · no generic-AI look" } },
        { k: "bmad-agent-ux-designer", d: { it: "Giulia — UX designer · DESIGN.md · critique", en: "Giulia — UX designer · DESIGN.md · critique" } },
        { k: "bmad-agent-tech-writer", d: { it: "Daniel — tech writer · READMEs · user guides · Mermaid", en: "Daniel — tech writer · READMEs · user guides · Mermaid" } },
      ],
    },
    {
      n: "D8",
      t: { it: "Generators", en: "Generators" },
      s: { it: "Config file · context file · design system", en: "Config files · context files · design system" },
      items: [
        { k: "vscode-config-generator", d: { it: ".vscode/tasks.json + launch.json · Node/.NET/Python", en: ".vscode/tasks.json + launch.json · Node/.NET/Python" } },
        { k: "docs-md-generator", d: { it: "CLAUDE.md + AGENTS.md + copilot-instructions coerenti", en: "CLAUDE.md + AGENTS.md + copilot-instructions coherent" } },
        { k: "design-md-generator", d: { it: "DESIGN.md in formato Stitch · design system doc", en: "DESIGN.md in Stitch format · design system doc" } },
      ],
    },
    {
      n: "D9",
      t: { it: "Utility", en: "Utility" },
      s: { it: "Scoperta e installazione altre skill", en: "Discover and install more skills" },
      items: [
        { k: "skill-finder", d: { it: "Registry Anthropic + marketplace + awesome-lists", en: "Registry Anthropic + marketplaces + awesome-lists" } },
      ],
    },
    {
      n: "D10",
      t: { it: "Vendored superpowers", en: "Vendored superpowers" },
      s: { it: "14 skill da obra/superpowers · dev trio + review", en: "14 skills from obra/superpowers · dev trio + review" },
      items: [
        { k: "writing-plans", d: { it: "plan.md bite-sized · review before execution", en: "bite-sized plan.md · review before execution" } },
        { k: "executing-plans", d: { it: "Segue il piano con review checkpoint", en: "Executes the plan with review checkpoints" } },
        { k: "test-driven-development", d: { it: "Red → green → refactor per ogni unità", en: "Red → green → refactor per unit" } },
        { k: "dispatching-parallel-agents", d: { it: "Parallelizza task indipendenti", en: "Parallelizes independent tasks" } },
        { k: "subagent-driven-development", d: { it: "Delega con two-stage review: spec + code quality", en: "Delegation with two-stage review: spec + code quality" } },
        { k: "systematic-debugging", d: { it: "Evidence-based · root-cause · no shotgun patch", en: "Evidence-based · root-cause · no shotgun patch" } },
        { k: "verification-before-completion", d: { it: "Mai 'done' senza aver fatto girare il check", en: "Never 'done' without running the check" } },
        { k: "requesting-code-review", d: { it: "Verifica allineamento con requisiti prima del merge", en: "Verify work meets requirements before merge" } },
        { k: "receiving-code-review", d: { it: "Implementa review con rigore, non compiacenza", en: "Implement review with rigor, not compliance" } },
        { k: "using-git-worktrees", d: { it: "Isola lavoro feature dal workspace corrente", en: "Isolate feature work from current workspace" } },
        { k: "finishing-a-development-branch", d: { it: "Opzioni strutturate per merge · PR · cleanup", en: "Structured options for merge · PR · cleanup" } },
        { k: "brainstorming", d: { it: "Esplora intent prima dell'implementazione", en: "Explores intent before implementation" } },
        { k: "writing-skills", d: { it: "Meta · autore nuove skill · verifica prima del deploy", en: "Meta · author new skills · verify before deploy" } },
        { k: "using-superpowers", d: { it: "Entry-point · rende skill discoverable da ogni tool", en: "Entry-point · makes skills discoverable from any tool" } },
      ],
    },
  ],
},
```

### 4.8 NEW section — Cross-tool support

**Anchor:** `#crosstool`. **Placement:** after Skills, before Metrics.

```js
crosstool: {
  title: { it: "Multi-tool by design", en: "Cross-tool by design" },
  sub: {
    it: "Polly v1 valida il flusso su Claude Code e GitHub Copilot. Altri tool funzionano come best-effort sul plain Markdown.",
    en: "Polly v1 validates the flow on Claude Code and GitHub Copilot. Other tools work as best-effort on plain Markdown.",
  },
  tiers: [
    {
      tier: "first-class",
      label: { it: "First-class · v1", en: "First-class · v1" },
      tools: ["Claude Code", "GitHub Copilot"],
      features: [
        { it: "Auto-trigger da .nonoise/POLLY_START.md", en: "Auto-trigger from .nonoise/POLLY_START.md" },
        { it: "Slash command /polly (Claude Code)", en: "Slash command /polly (Claude Code)" },
        { it: "Phrase trigger 'start polly' (Copilot)", en: "Phrase trigger 'start polly' (Copilot)" },
        { it: "Skill namespacing superpowers:* e impeccable:*", en: "Skill namespacing superpowers:* and impeccable:*" },
        { it: "Hook + MCP attivi (Claude Code)", en: "Hooks + MCP active (Claude Code)" },
      ],
    },
    {
      tier: "best-effort",
      label: { it: "Best-effort · roadmap", en: "Best-effort · roadmap" },
      tools: ["Cursor", "Gemini CLI", "Codex"],
      features: [
        { it: "Context file scritto (.cursor/rules.md, GEMINI.md, AGENTS.md)", en: "Context file written (.cursor/rules.md, GEMINI.md, AGENTS.md)" },
        { it: "Skill come plain Markdown · invocazione manuale", en: "Skills as plain Markdown · manual invocation" },
        { it: "Slash / hook / MCP = silent no-op", en: "Slash / hooks / MCP = silent no-op" },
        { it: "Validation completa roadmap futura", en: "Full validation on future roadmap" },
      ],
    },
  ],
},
```

**App.jsx work:** add a `CrossTool` component with 2 tier cards side-by-side, bullet lists under each. Insert between `<Skills>` and `<Metrics>`.

### 4.9 Metrics — reframe + additions

Keep the pilot numbers as **validation** (past-tense, clearly attributed to the Andreani pilot). Add bootstrapper-scale structural numbers at the top.

```js
metrics: {
  title: { it: "Evidenze — bootstrapper + pilot", en: "Evidence — bootstrapper + pilot" },
  sub: {
    it: "I numeri bootstrapper descrivono cosa trovi in mano al comando. I numeri del pilot (Andreani RiskoWeb, aprile 2026) sono validation empirica della metodologia packaging.",
    en: "Bootstrapper numbers describe what you get out-of-the-box. Pilot numbers (Andreani RiskoWeb, April 2026) are empirical validation of the packaged methodology.",
  },
  bootstrapper: [
    { v: "40+", l: { it: "Skill bundled", en: "Bundled skills" }, n: { it: "25 NoNoise + 14 superpowers + Impeccable + skill-creator + pptx", en: "25 NoNoise + 14 superpowers + Impeccable + skill-creator + pptx" } },
    { v: "6",   l: { it: "Fasi SDLC coperte", en: "SDLC phases covered" }, n: { it: "Requisiti · Architettura · Sprint · Dev · Acceptance · Ops", en: "Requirements · Architecture · Sprint · Dev · Acceptance · Ops" } },
    { v: "6",   l: { it: "Cartelle docs/ source-of-truth", en: "docs/ source-of-truth folders" }, n: { it: "architecture · requirements · calls · support · prd · sprints", en: "architecture · requirements · calls · support · prd · sprints" } },
    { v: "2",   l: { it: "Tool first-class in v1", en: "First-class tools in v1" }, n: { it: "Claude Code + GitHub Copilot · Cursor/Gemini/Codex best-effort", en: "Claude Code + GitHub Copilot · Cursor/Gemini/Codex best-effort" } },
    { v: "1",   l: { it: "Comando per partire", en: "Command to start" }, n: { it: "npx create-nonoise · niente servizi · niente account · MIT", en: "npx create-nonoise · no services · no accounts · MIT" } },
  ],
  pilot: [
    { v: "9.4×", l: { it: "Produttività — pilot", en: "Productivity — pilot" }, n: { it: "Equivalente 19 FTE con 2 persone · Andreani Apr 2026", en: "Equivalent 19 FTE with 2 people · Andreani Apr 2026" } },
    { v: "93",   l: { it: "Task in una settimana · 3 persone", en: "Tasks in one week · 3 people" }, n: { it: "Vs 74 task con 6 persone nel periodo precedente", en: "Vs 74 tasks with 6 people in the prior period" } },
    { v: "0",    l: { it: "Bug logici generati dall'AI", en: "AI-generated logic bugs" }, n: { it: "Review attiva — nuovi tipi di issue possibili", en: "Active review — new issue types possible" } },
    { v: "550×", l: { it: "Efficienza CLI vs MCP", en: "CLI vs MCP efficiency" }, n: { it: "~260 token vs 143.000 per 3 server MCP", en: "~260 tokens vs 143,000 for 3 MCP servers" } },
    { v: "2-3m", l: { it: "Drill da Correlation ID a file:riga", en: "Drill from Correlation ID to file:line" }, n: { it: "Via observability-debug · 15-30 min manualmente", en: "Via observability-debug · 15-30 min manually" } },
  ],
},
```

**App.jsx work:** split the metric grid into two bands with headers — "Bootstrapper" and "Pilot validation". Current `metrics.items` becomes `metrics.bootstrapper` (top band) + `metrics.pilot` (bottom band).

### 4.10 Roadmap

Update to current state. New items to add: SP-9 Polly, SP-10 bootstrapper docs (this refactor), SP-11 core+packs split, SP-12 multi-repo template, SP-13 site rework.

```js
roadmap: {
  title: { it: "Roadmap", en: "Roadmap" },
  sub: { it: "Sub-progetti in ordine di esecuzione. Aggiornato 2026-04-18.", en: "Sub-projects in execution order. Updated 2026-04-18." },
  legend: {
    done:     { it: "done",        en: "done" },
    progress: { it: "in-progress", en: "in-progress" },
    next:     { it: "next",        en: "next" },
    backlog:  { it: "backlog",     en: "backlog" },
  },
  items: [
    { id: "SP-1",  s: "done",     t: { it: "CLI installer + template single-project", en: "CLI installer + single-project template" } },
    { id: "SP-2",  s: "done",     t: { it: "Skill library agnostica (25 native + vendor)", en: "Agnostic skill library (25 native + vendor)" } },
    { id: "SP-7",  s: "done",     t: { it: "Skill nuove (graphify, vscode-config, docs-md, c4-doc-writer)", en: "New skills (graphify, vscode-config, docs-md, c4-doc-writer)" } },
    { id: "SP-9",  s: "progress", t: { it: "Polly v1 — orchestrator Claude + Copilot", en: "Polly v1 — Claude + Copilot orchestrator" } },
    { id: "SP-10", s: "progress", t: { it: "Docs refactor + site brief (questa iterazione)", en: "Docs refactor + site brief (this iteration)" } },
    { id: "SP-8",  s: "next",     t: { it: "Site rework — bootstrapper framing + SDLC coverage", en: "Site rework — bootstrapper framing + SDLC coverage" } },
    { id: "SP-11", s: "next",     t: { it: "Core + optional packs · nonoise update --check", en: "Core + optional packs · nonoise update --check" } },
    { id: "SP-3",  s: "backlog",  t: { it: "Template multi-repo workspace", en: "Multi-repo workspace template" } },
    { id: "SP-7b", s: "backlog",  t: { it: "docs-md-generator implementazione reale", en: "docs-md-generator real implementation" } },
    { id: "SP-4",  s: "backlog",  t: { it: "Language bootstrap (Node + Python)", en: "Language bootstrap (Node + Python)" } },
    { id: "FI-1",  s: "backlog",  t: { it: "Skill-finder meta-skill maturation", en: "Skill-finder meta-skill maturation" } },
  ],
},
```

### 4.11 Author

```js
author: {
  title: { it: "Chi l'ha creato", en: "Who made this" },
  name: "Alessandro Russo",
  role: { it: "Solution Architect", en: "Solution Architect" },
  bio: {
    it: "NoNoise è nato come lesson learned dal progetto Digital Platform RiskoWeb (Andreani) — enterprise .NET + Angular, microservizi, AKS. Non è un framework teorico: ogni principio ha un caso reale alle spalle. Questa è la sua seconda vita — la metodologia è stata estratta, packaged come bootstrapper, open-sourcata come testimone perché il metodo sopravviva alla singola implementazione.",
    en: "NoNoise was born as a lesson learned from the Digital Platform RiskoWeb project (Andreani) — enterprise .NET + Angular, microservices, AKS. It's not a theoretical framework: every principle has a real case behind it. This is its second life — the methodology was extracted, packaged as a bootstrapper, open-sourced so the method outlives the single implementation.",
  },
  links: {
    handbook: { it: "Manuale v1.3 — 148 pagine", en: "Handbook v1.3 — 148 pages" },
    repo:     { it: "Repository GitHub",         en: "GitHub repository" },
  },
},
```

**Author sub (hardcoded in App.jsx Author component):**

- IT: `Il manuale v1.3 documenta 148 pagine di metodologia. Il bootstrapper la packagizza. Sotto, la persona che ha scritto entrambi.`
- EN: `The v1.3 handbook documents 148 pages of methodology. The bootstrapper packages it. Below, the person who wrote both.`

### 4.12 Footer

```js
footer: {
  built: { it: "Bootstrapper in sviluppo attivo", en: "Bootstrapper under active development" },
  lang:  { it: "Lingua",                          en: "Language" },
},
```

---

## 5. App.jsx edits — summary

The dictionary edits are portable; the JSX needs these targeted touches to render new sections and updated copy:

1. **Nav** — add `<a href="#sdlc">` and `<a href="#crosstool">`, `<a href="#polly">`. Replace `{tr(n.phases, lang)}` binding with `{tr(n.sdlc, lang)}` (label change only, anchor `#sdlc` instead of `#phases`).
2. **Hero H1** — replace hardcoded string with bootstrapper framing (IT: "Un bootstrapper AI per l'intero SDLC." / EN: "A bootstrapper for the entire AI SDLC.").
3. **Ticker** — replace hardcoded pilot metrics with the bootstrapper-scale list from §4.2.
4. **Phases component** — rename section id to `sdlc`, use `{tr(p.title, lang)}` with SDLC coverage wording; render `[pair]` / `[solo]` badge next to `PHASE · <n>`. Render the `brownfield_note` below the flow as a callout.
5. **NEW Polly component** — see §4.6. Feature-card grid; insert `<Polly lang={lang} />` between `<Phases>` and `<Skills>` in `App()`.
6. **NEW CrossTool component** — see §4.8. Two-tier card layout; insert between `<Skills>` and `<Metrics>`.
7. **Metrics** — split into two bands (bootstrapper + pilot). Visual separation: a thin horizontal rule between with a "pilot — Andreani Apr 2026" label above the second band.
8. **Author component hardcoded sub** — replace with the "bootstrapper packages the methodology" phrasing from §4.11.
9. **Roadmap gantt widths/offsets** — existing logic is fine; just update the items array.

The section kickers currently say `§ 1 / Foundation`, `§ 2 / Lifecycle`, etc. Renumber after the inserted sections:

- `§ 1 / Foundation` — Pillars (unchanged)
- `§ 2 / Lifecycle` — SDLC (unchanged kicker, but content differs)
- `§ 3 / Orchestration` — Polly (new kicker)
- `§ 4 / Catalog` — Skills (was § 3)
- `§ 5 / Interop` — Cross-tool (new kicker)
- `§ 6 / Evidence` — Metrics (was § 4)
- `§ 7 / Trajectory` — Roadmap (was § 5)
- `§ 8 / Author` — Author (was § 6)

---

## 6. Visual direction (keep)

- **Three variants** (Editorial / Instrument / Blueprint) — all should work with the new content because the dictionary shape is preserved for existing sections and the new sections are grid-based.
- **Signal-vs-noise bar visualisation** — untouched.
- **Terminal animation** — already shows Claude Code + Copilot ticked + skills in the output. Minor polish: add a line that says "✓ Polly pronta — /polly per iniziare" / "✓ Polly ready — /polly to start" after the scaffolding-done line.
- **Hero poster** — the `nonoise-cat.png` stays. `pure_signal` caption stays (it reads as bootstrapper mission too).
- **Color palette / typography** — no change.

---

## 7. Acceptance checklist for the rework

A visitor scrolling through the reworked site should verify, within 30 seconds of landing:

- [ ] The word **bootstrapper** appears above the fold.
- [ ] The phrase **entire SDLC** or **SDLC coverage** appears above the fold.
- [ ] The command **`npx create-nonoise`** appears above the fold.
- [ ] Nav includes `SDLC`, `Polly`, `Cross-tool` entries.
- [ ] SDLC section lists 6 phases, each with a `[pair]` / `[solo]` badge.
- [ ] Polly section explains orchestrator + pair/solo + greenfield/brownfield.
- [ ] Skills section shows **10 domains**, at least **40 skill entries** total.
- [ ] Cross-tool section distinguishes **first-class** (Claude Code + Copilot) from **best-effort** (Cursor / Gemini / Codex).
- [ ] Metrics split into **bootstrapper** (40+ / 6 / 6 / 2 / 1) and **pilot** (9.4× / 93 / 0 / 550× / 2-3m).
- [ ] Author bio mentions "lesson learned, packaged and open-sourced".
- [ ] Footer line: "Bootstrapper in sviluppo attivo".

When all eleven check, the rework is shippable.

---

## 8. Authority — where to verify every fact

- [`overview.md`](overview.md) — positioning, 60-second pitch, what NoNoise is and isn't.
- [`philosophy.md`](philosophy.md) — 5 noise sources, parametric memory, pair/solo, advisor-only.
- [`sdlc.md`](sdlc.md) — 6 phases, greenfield + brownfield, skip rules, multi-repo.
- [`polly.md`](polly.md) — triggers, pair/solo, dev trio, three-way resume routing, best-effort mode.
- [`team-model.md`](team-model.md) — roles, pair/solo mapping, rhythms, one-man-band case.
- [`skills-catalog.md`](skills-catalog.md) — full 40+ skill catalog, roadmap for core+packs.
- [`docs-hierarchy.md`](docs-hierarchy.md) — 6-folder tree, ownership, skill→folder matrix.
- [`cross-tool.md`](cross-tool.md) — support matrix, degradation profile.
- [`external-tools.md`](external-tools.md) — advisor-only list, anti-pattern MCP auto-install.
- [`installation.md`](installation.md) — install, scaffold output, dev loop.
- `todo.txt` at repo root — LLM-review critiques incorporated (messaging, coherence, overreach, vendor drift).

If a claim in the rework disagrees with one of those files, that file wins — fix the rework, not the file.
