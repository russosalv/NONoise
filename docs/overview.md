# Overview — what NONoise is

**NONoise is an AI SDLC bootstrapper.** One command (`npx create-nonoise`) turns an empty directory into a project that is AI-ready from minute zero: a documented lifecycle, a curated skill library that works across multiple AI tools, tool-specific context files, and an orchestrator (Polly) that walks your team from raw requirements to merged pull request.

It is not a framework for *building* AI applications. It is a framework for *running an AI-assisted team*. The distinction matters.

## The 60-second pitch

Take any empty folder. Run `npx create-nonoise`, pick which AI assistants your team uses, answer three scaffold questions, and you get:

- A **`docs/`** hierarchy with six purpose-built folders — the canonical source of truth for requirements, architecture decisions, PRDs, sprint manifests, reverse-engineering dossiers, and meeting transcripts. Every NONoise skill reads from and writes to this tree.
- A **`.claude/skills/`** library of 40+ AI skills covering the full SDLC: requirements elicitation, architectural brainstorming and formal validation, sprint breakdown, test-driven implementation, acceptance running, observability triage, brownfield reverse engineering, UI / UX design, technical writing.
- **Tool-specific context files** for every AI tool your team uses — `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for Copilot, `AGENTS.md` for Codex, `.cursor/rules.md` for Cursor, `GEMINI.md` for Gemini CLI — all generated from one source of truth so they don't drift.
- **Polly**, an orchestrator skill that auto-triggers on the first session, asks whether you're on a greenfield or brownfield project, and walks the SDLC step-by-step — announcing `[pair]` vs `[solo]` mode for every step and invoking the right specialist skill in the right order.
- Two **Node CLIs** (`tools/md-extractor/` and `tools/devops-push/`) for the two operations that are painful to do by hand: ingesting raw PDFs / DOCX into structured Markdown, and pushing sprint task breakdowns to Azure DevOps as work items.
- A **`nonoise.config.json`** that records which tools and skill packs were installed, so a future `nonoise update` can diff against a registry without clobbering local customisation.

That's day one. Every subsequent day, you or any teammate can open the project in the same or a different AI tool, type `/polly` or "start polly", and the orchestrator picks up where you left off.

## What NONoise is *not*

- **Not an agent framework.** We do not compete with LangGraph, AutoGen, Claude Agent SDK, Crew, or Semantic Kernel. We assume you already use one of the AI-assistant IDEs (Claude Code, Copilot, Cursor, Gemini CLI, Codex) and we wire them up so they're productive on day one. If you want to build an autonomous agent, use one of those frameworks; if you want to make your team productive with existing AI assistants, use NONoise.
- **Not a code generator.** None of the skills write production code without human involvement. The architecture skills produce PRDs; the sprint skills produce manifests; the implementation skills wrap `superpowers:*` planning and execution under human review with test-driven development. The framework's job is to tell you *what to do next* and *which skill to engage*, not to pretend it can finish your feature alone.
- **Not opinionated about your stack.** `src/` is empty on purpose. Pick .NET, Node, Python, Rust, Go, Flutter, Elixir — whatever your team likes. The SDLC flow, the docs hierarchy, and most of the skills are stack-agnostic. A few skills (`vscode-config-generator`, `playwright-cli`, `frontend-design`) are stack-aware and detect what they need.
- **Not a service.** Everything runs locally inside your AI tool of choice. No server, no telemetry, no account, no API key required for the framework itself. (Your AI tool still needs its own API key; the framework does not add another.)
- **Not a monolithic methodology.** NONoise integrates several open-source bodies of work — Brian Madigan's `superpowers` skills, a persona extraction inspired by `bmad-method`, the Quint First Principles Framework, the Impeccable design skills — and adds orchestration on top. It is not "yet another proprietary SDLC" invented from scratch.

## Who it's for

NONoise is built for **teams** adopting AI-assisted development. A team here means ≥ 2 people with distinct roles: at minimum a senior developer + someone doing analysis or architecture work, ideally an analyst or product manager, an architect, two or more implementers, and a shadow tester.

It works for a single developer too — the one-man-band degenerate case is supported — but the *design target* is the real-world situation where different people need to hand off context, where architecture decisions must be recorded so the next sprint doesn't relitigate them, and where acceptance tests need to live somewhere reviewable by someone who didn't write them.

NONoise assumes:

- Your team already uses at least one AI coding assistant in IDE form (not just "I sometimes open chat.openai.com").
- Your team writes code in a repository under version control (Git).
- Your organisation is willing to keep requirements and architecture decisions in the repository itself, not in Confluence / Notion / SharePoint. (If they must also live elsewhere, the `docs/` hierarchy in the repo is the *authoritative* copy.)
- You want an actual SDLC — not "I'll vibe-code this and see what happens". NONoise is incompatible with pure vibe-coding; it is deliberately structured.

## Positioning: bootstrapper, not framework

An earlier version of this repository called itself a *framework*. That framing invited a comparison to framework-like things — LangGraph, Claude Agent SDK, AutoGen — which NONoise is not.

The honest label is **bootstrapper**: a tool whose job ends the moment your project is running. After scaffolding, nothing in the bootstrapper is imported at runtime; the skills are plain Markdown files inside your repository; the docs tree is yours; the context files are yours; you can delete the `nonoise.config.json` tomorrow and everything still works. The bootstrapper *leaves you with a project you own outright*, with conventions you can evolve without asking permission.

Some people prefer the framing *"project operating system"* — you install it once and it shapes how the project breathes from then on. That framing is also fine. What matters is that NONoise is not a runtime dependency.

## The three levers NONoise pulls

Across every design decision, three levers recur:

1. **Skill > prompt.** A prompt dies with the window. A skill is a named, versioned, discoverable artifact with a Markdown body and YAML frontmatter that any AI tool can load. NONoise ships skills exclusively — no hidden prompt libraries, no proprietary templates. If your team wants to customise, they edit the Markdown. If another team wants to reuse, they copy the folder.
2. **Canonical > exotic.** Every frontier LLM has read the Repository pattern, CQRS, Clean Architecture, DDD, standard REST, MVC, observer, strategy, event-sourcing thousands of times. Those patterns cost zero context tokens because they are already in the weights. NONoise's architectural skills (`arch-brainstorm`, `arch-decision`, `quint-fpf`) actively reward canonical choices and formally validate anything exotic. The LLM you pay for is not a replacement for the patterns the community has already written down — it is a machine that works spectacularly well when you feed it patterns it already knows.
3. **Team > solo.** Every step is annotated `[pair]` or `[solo]`. Pair work is high-bandwidth work on a large model (analyst + senior dev, or architect + lead, or whatever the project needs). Solo work is parallelisable, repeatable, smaller-model work. The value of labelling the mode is that *nobody wastes the wrong model on the wrong problem* — a solo dev does not convene a three-person architecture meeting for a string-format bug, and a pair of seniors does not use a 2-billion-parameter model to argue about event-sourcing.

## What changes day-to-day

Before NONoise (typical AI-adoption scenario in a company of ~50 devs):

- Each developer configures their own AI tool differently.
- Context files drift across projects or don't exist at all.
- Requirements live in email threads, transcripts, ad-hoc Confluence pages.
- Architecture decisions are recorded (if at all) in ad-hoc wiki pages nobody re-reads.
- Nobody knows which prompts work; each senior has their own private library.
- "How do we start a new project AI-first?" is a cross-team Slack thread every quarter.

After NONoise:

- `npx create-nonoise` gives every new project the same starting shape, regardless of who scaffolds it.
- The context files are generated from one source of truth, stay coherent, and are reviewed in PR.
- Requirements go into `docs/requirements/` via the `requirements-ingest` skill; meeting transcripts go into `docs/calls/`.
- Architecture decisions are PRDs under `docs/prd/<area>/` with frontmatter showing `draft` → `validated` / `rejected`; validation goes through the Quint FPF.
- Every skill is in `.claude/skills/` in every project. If a senior develops a new skill, it propagates by being committed, not by Slack screenshot.
- "How do we start?" is a three-word answer: `npx create-nonoise`.

## What this repository contains

```
NONoise-frmw/
├── packages/
│   ├── create-nonoise/              # The CLI
│   ├── skills/                      # 25 NONoise-native skills + vendor/
│   └── templates/single-project/    # What gets scaffolded into user projects
├── docs/                            # This documentation (and site source material)
├── scripts/                         # Vendor sync, release tooling
└── README.md                        # The entry point
```

See [`installation.md`](installation.md) §Repository layout for the full tree.

## Feedback incorporated in this version

This documentation explicitly incorporates feedback from an independent review (`todo.txt` at the repository root) that flagged four issues in the prior README:

1. **Messaging.** The earlier framing called NONoise a "framework". We now use **bootstrapper** (primary) and "project operating system" (secondary). The word *framework* is retained only where it refers generically to a body of conventions, not to a runtime framework.
2. **Doc coherence.** Earlier drafts mentioned "3 skill bundles" while the scaffold actually installs 25+14 = 39+ skills. This documentation reflects the actual count and organises them by domain (see [`skills-catalog.md`](skills-catalog.md)).
3. **Overreach risk.** The review flagged that if NONoise keeps bundling more and more skills, it becomes "noise itself". The response is to move toward a **core + optional packs** model: core always installed (Polly + requirements + architecture + sprint + dev trio), optional packs explicitly selected at scaffold time (frontend pack, docs/analysis pack, ops pack, PM/architecture pack). That split is planned, not yet implemented — see [`skills-catalog.md`](skills-catalog.md) §Roadmap.
4. **Vendor drift.** Vendored assets (superpowers, impeccable, skill-creator, pptx tooling, Polly's own vendored payloads) pin a commit in `VENDOR.json`. Snapshot tests fail when the vendored material changes; the response is a deliberate `node scripts/sync-vendor.mjs` + updated snapshot, reviewed in PR. Automatic updates on the user side are **not** enabled by design: the compromise is *automatic check, manual apply* (a future `nonoise update --check` + `nonoise update`).

## Where to read next

- If you want the **principles**: [`philosophy.md`](philosophy.md).
- If you want the **flow**: [`sdlc.md`](sdlc.md).
- If you want the **catalog**: [`skills-catalog.md`](skills-catalog.md).
- If you want the **mechanics**: [`installation.md`](installation.md).

Everything else in this folder is a deeper dive into one of those four spines.
