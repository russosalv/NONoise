---
version: 1
default_language: it
phases:
  - id: multi-repo-setup
    label:
      it: "Setup del workspace multi-repo"
      en: "Multi-repo workspace setup"
    skill: null
    fingerprint: "repos/**/.git"
    mode: pair
    conversational: true
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

## multi-repo-setup

Conversational phase — see `docs/multi-repo.md` for scripts (`clone-all`, `switch-branch`, `pull-all`) and the skills-policy rule.

- Run when: `repositories.json` has been filled but `repos/` is empty.
- Skip when: all repos are already cloned and on the expected branch.

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
