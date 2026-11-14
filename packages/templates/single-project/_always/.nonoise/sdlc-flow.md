---
version: 2
default_language: it
default_mode: medium
phases:
  - id: stack
    modes: [long]
    label:
      it: "Stack e vincoli"
      en: "Stack and constraints"
    skill: null
    fingerprint: null
    mode: pair
    conversational: true
  - id: requirements-ingest
    modes: [long]
    label:
      it: "Ingest di materiale esistente"
      en: "Existing material ingest"
    skill: requirements-ingest
    fingerprint: "docs/requirements/ingested/**/*.md"
    mode: pair
    skip_if: "no existing PDFs / docs / transcripts to ingest"
  - id: requirements-elicit
    modes: [long]
    label:
      it: "Elicitation dei requisiti"
      en: "Requirements elicitation"
    skill: bmad-agent-analyst
    fingerprint: "docs/requirements/**/*.md"
    mode: pair
  - id: feature-design
    modes: [medium, long]
    label:
      it: "Design della feature / prodotto"
      en: "Feature / product design"
    skill: "superpowers:brainstorming"
    fingerprint: "docs/superpowers/specs/**/*.md"
    mode: pair
    skip_if: "pure refactor with no new feature"
  - id: arch-brainstorm
    modes: [long]
    label:
      it: "Opzioni architetturali"
      en: "Architectural options"
    skill: arch-brainstorm
    fingerprint: "docs/architecture/brainstorm/**/*.md"
    mode: pair
    skip_if: "feature fits an existing, decided architecture"
  - id: arch-decision
    modes: [long]
    label:
      it: "Decisione architetturale"
      en: "Architectural decision"
    skill: arch-decision
    fingerprint: "docs/architecture/decisions/**/*.md"
    mode: pair
    gate: fpf
    skip_if: "FPF gate does not fire: record a lightweight decision in the PRD instead"
  - id: arch-sync
    modes: [long]
    label:
      it: "Sync architetturale (opzionale)"
      en: "Architecture sync (optional)"
    skill: arch-sync
    fingerprint: "docs/architecture/synced/**/*.md"
    mode: solo
    skip_if: "arch-decision PASS doesn't need propagation yet"
  - id: sprint-manifest
    modes: [long]
    label:
      it: "Sprint breakdown"
      en: "Sprint breakdown"
    skill: sprint-manifest
    fingerprint: "docs/sprints/Sprint-*/manifest.md"
    mode: pair
  - id: implementation
    modes: [quick, medium, long]
    label:
      it: "Implementazione — per task"
      en: "Implementation — per task"
    skill: "superpowers:writing-plans"
    fingerprint: "docs/superpowers/plans/**/*.md"
    mode: solo
  - id: acceptance
    modes: [long]
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

## Modes

The flow is sized to the work. Every phase lists the `modes` it belongs to; a phase outside the current mode is not suggested. The mode is chosen per task: `/polly quick|medium|long <goal>`, or Polly infers it from the goal and says so. `default_mode` applies when nothing else decides.

| | quick | medium (default) | long |
|---|---|---|---|
| Fits | a fix, a tweak, one or two files, a clear outcome | a feature or refactor inside an already-decided architecture | a new product, an epic, anything that changes the architecture |
| Phases | `implementation` only, no plan document | `feature-design` → `implementation` | every phase below, in order |
| Documents | none | one spec, one plan | requirements, PRD, sprint manifest, test report |
| Delegation | none: one agent, direct edits | delegate independent pieces and broad searches | orchestrate: plan first, parallel agents, review every piece |
| FPF validation | never | only if the FPF gate fires | whenever the FPF gate fires |

Signals for inferring the mode: number of files and modules touched, whether requirements already exist, whether the change crosses a public contract or the data model, and how long the work is expected to run. When two modes fit, pick the lighter one and name the heavier as the fallback.

**FPF gate.** Formal validation (`arch-decision` → Haft FPF) is proposed only when the user asks for it, or when the decision is costly to reverse (data model, public contract, security or tenancy boundary, infrastructure, vendor lock-in) **and** at least two materially different options are viable. In every other case the choice is recorded in the PRD as a lightweight decision (`decision.mode: lightweight`) and the flow continues with `sprint-manifest` or `implementation`.

**Regia.** In Claude Code, NONoise installs the Regia mod (`regia@claude-regia`), which owns orchestration: delegation, model and effort per task, swarms of Claude, Codex and Qwen agents, the plan list and the questions for you. Its three modes are these same three. Prefix the phase prompt with `/regia quick|medium|long` and let Regia hold the plan and the questions. Codex, Copilot and the other tools have no Regia: use the prompts as they are.

### quick

```prompt (it)
Modalità quick: <cosa va cambiato e dove>. Lavora direttamente, senza subagent e senza documenti: modifica minima, esegui i test pertinenti, riassumi in tre righe cosa hai cambiato e cosa hai verificato. Se il lavoro si rivela più grande, fermati e proponi la modalità medium.
```

```prompt (en)
Quick mode: <what must change and where>. Work directly, no subagents and no documents: smallest change, run the relevant tests, sum up in three lines what you changed and what you verified. If the work turns out bigger, stop and propose medium mode.
```

### medium

```prompt (it)
Modalità medium: <feature / refactor>. Vincoli noti: <…>. Scrivi uno spec breve in docs/superpowers/specs/, poi un plan in docs/superpowers/plans/ ed eseguilo con TDD delegando i pezzi indipendenti. L'architettura è già decisa: se emerge una scelta difficile da invertire con più opzioni valide, fermati e proponi arch-decision. Chiudi con la verifica (test e build). Procedi.
```

```prompt (en)
Medium mode: <feature / refactor>. Known constraints: <…>. Write a short spec under docs/superpowers/specs/, then a plan under docs/superpowers/plans/ and execute it with TDD, delegating the independent pieces. The architecture is already decided: if a hard-to-reverse choice with several viable options comes up, stop and propose arch-decision. Close with verification (tests and build). Proceed.
```

### long

Walk the phases below in order, starting from the first one whose fingerprint is missing.

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

Run when: the FPF gate fires (see **Modes**) — a costly-to-reverse decision with at least two viable options, or an explicit request for formal validation.

```prompt (it)
Valuta il PRD draft docs/prd/<area>/<file>.md con arch-decision e Haft: ProblemCard, varianti e confronto. Presenta il gate 5.5; vincola una DecisionRecord in .haft/decisions/ solo su mia richiesta esplicita della scelta e aggiorna i riferimenti del PRD.
```

```prompt (en)
Review draft docs/prd/<area>/<file>.md through arch-decision and Haft: ProblemCard, variants and comparison. Present Phase 5.5; bind a DecisionRecord in .haft/decisions/ only on my explicit choice request and update PRD references.
```

Skip when: the FPF gate does not fire. Record a lightweight decision instead:

```prompt (it)
Il PRD docs/prd/<area>/<file>.md non richiede validazione FPF: <perché — reversibile / un'unica opzione praticabile>. Registra la scelta <opzione> come decisione lightweight nel frontmatter del PRD (decision.mode: lightweight, con scelta, motivazione e motivo del gate) e proponi il passo successivo.
```

```prompt (en)
PRD docs/prd/<area>/<file>.md does not need FPF validation: <why — reversible / a single viable option>. Record choice <option> as a lightweight decision in the PRD frontmatter (decision.mode: lightweight, with choice, rationale and gate reason) and propose the next step.
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

Vendor skill identifiers such as `superpowers:writing-plans` resolve through the native harness plugin registry by default; only `--vendor-mode embed` requires a local vendor directory. Use `create-nonoise doctor` to check availability.

## Supporting checks from the ECC snapshot

Read `.nonoise/ecc/index.md` for installed capabilities. Before risky sprint tasks use `change-impact`; for brownfield work use `spec-miner`, `inherit-legacy-style` and, when redesign is requested, `brownfield-retrospective`. Before acceptance use `module-regression`, `pr-test-analyzer`, `security-reviewer`, `silent-failure-hunter` and the installed language reviewer through `atr`. Final evidence comes from `verification-loop` alongside `superpowers:verification-before-completion`; release readiness uses `production-audit`. These checks support the existing phases and do not add a lifecycle.
