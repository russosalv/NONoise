# Philosophy — why NONoise is shaped the way it is

Three principles underpin every decision in the framework. They are not slogans; they are the *operational constraints* that decide what goes into the bundle, what stays out, and how skills are written.

1. [Signal over noise](#1-signal-over-noise) — the name of the project.
2. [Parametric memory beats context injection](#2-parametric-memory-beats-context-injection) — the architecture principle.
3. [Pair vs solo per phase](#3-pair-vs-solo-per-phase) — the team principle.

Plus four operating postures derived from those principles:

4. [Docs are the source of truth](#4-docs-are-the-source-of-truth)
5. [Skills are plain Markdown](#5-skills-are-plain-markdown)
6. [Advisor-only where it matters](#6-advisor-only-where-it-matters)
7. [Canonical over exotic](#7-canonical-over-exotic)

---

## 1. Signal over noise

In the age of coding agents, the limiting factor is not the model's capability. It is the noise around it.

**Five sources of noise** the framework attacks systematically:

1. **Uncoordinated developers.** Each senior has their own prompt library, their own skill folder, their own mental model of "the right way". Nothing is shared; nothing is reviewed. New hires pick up habits by osmosis. → **Fix:** skills in `.claude/skills/` are committed, versioned, and reviewed in PR. A senior's prompt library becomes a file anyone can read and extend.
2. **Exotic architectures the AI doesn't recognise.** The LLM has read standard patterns thousands of times; your bespoke abstraction zero. Every session you pay the context-injection tax to re-teach the model what you've built. → **Fix:** `arch-brainstorm` and `arch-decision` push toward canonical patterns; exotic deviations require a formal Quint FPF first-principles audit.
3. **Repositories with no context.** The AI opens your codebase and has to guess what Entity X, UseCase Y, and the "Adapters" folder mean. → **Fix:** every scaffolded project has `CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md` generated from one source, so every tool reads the same project glossary, the same conventions, the same "do / don't".
4. **Code hidden in compiled packages.** The agent sees signatures, not behaviour. It can navigate types but cannot reason about implementation. → **Fix:** the framework's architectural guidance defaults to `ProjectReference` in .NET, source-over-binary in every language, and calls out binary-only vendor lock as a red flag in `arch-decision`.
5. **Documents written for humans the AI misreads.** Stream-of-consciousness call transcripts, slide decks that assume you were in the room, acceptance criteria that only make sense to someone who lived through the last sprint. → **Fix:** `requirements-ingest` turns raw PDFs / DOCX / emails / transcripts into structured, AI-readable requirement files with explicit signals (functional, business rule, UI, out-of-scope, open-question). `bmad-advanced-elicitation` stress-tests drafts before they become sprint input.

Every feature in NONoise either reduces one of those five noise sources or it doesn't belong.

## 2. Parametric memory beats context injection

LLMs have two kinds of knowledge:

- **Parametric memory** — what's baked into the weights at training time. Reading this costs zero context tokens at inference.
- **In-context learning** — what you teach the model in your prompt or context files. Reading this costs N tokens where N is the number of tokens you send, and competes for attention with the actual problem.

Canonical patterns (Repository, CQRS, Clean Architecture, DDD, MVC, observer, event-sourcing, standard REST, GraphQL) are in parametric memory. The model can write idiomatic versions of them with no explanation. Exotic patterns — your bespoke mediator, your house-specific aggregate boundaries, your "we-always-do-it-this-way" naming convention — are not. Each one forces in-context learning, consumes tokens, and competes with the actual problem for the model's attention.

**Practical consequences:**

- `arch-brainstorm` explicitly surfaces canonical-pattern options first. Exotic options are listed only when the canonical set has been eliminated by constraint.
- `arch-decision` runs a Quint FPF six-phase audit (Initialize → Abduct → Deduce → Induce → Audit → Decide) on any exotic decision. If the pattern isn't in the LLM's training data, the team must be able to defend it from first principles or it doesn't ship.
- Context files (`CLAUDE.md`, `AGENTS.md`, `copilot-instructions.md`) have strict length budgets — 500 lines at repo root, 200 per service. Beyond that, instructions get systematically ignored by the model. The framework will refuse to scaffold context files longer than the budget and will use progressive disclosure (skill description ≈ 80 tokens of discovery, full body loaded only on activation).
- The `docs-md-generator` skill keeps the three context files coherent from one source of truth — because drift between files is another tax on attention.

**Intuition.** Every token you spend re-teaching the LLM your bespoke abstraction is a token the LLM isn't spending on your actual problem. Budget your context the way you'd budget your own working memory: if it's standard, don't repeat it; if it's non-standard, justify it.

## 3. Pair vs solo per phase

Not every step benefits from a 400B-parameter model and three senior people on one screen. Not every step tolerates a junior and a small model either.

NONoise labels every SDLC step with a **mode**:

- `[pair]` — work together on one screen with a large model. Typical for: discovery, architecture, technical decisions, sprint planning, acceptance criteria negotiation. You want high bandwidth, strong reasoning, skin in the game from multiple seniors.
- `[solo]` — one developer per task, smaller models are fine, repeatable loops. Typical for: implementation of a well-specified task, test writing, refactor inside a known boundary, bug fix with a clear reproduction.

Polly **announces the mode** when engaging each step. Examples from the decision tree:

> "[pair] Architecture options for the invoicing subsystem. Gather your senior devs and open arch-brainstorm. This is high-bandwidth — don't do it alone."

> "[solo] Implementation of task T-14: validate ISO 20022 Pain.001 against XSD. Open superpowers:writing-plans, draft a plan, then executing-plans with TDD. Solo is fine; this is well-specified."

The value is not the label per se — it is the *discipline* of forcing the team to decide, out loud, whether the next step is pair or solo. You will find you wanted pair and got solo half the time; that's the wasted hour NONoise is trying to prevent.

See [`team-model.md`](team-model.md) for a full taxonomy of which phases are pair and which are solo, and why.

## 4. Docs are the source of truth

The `docs/` tree scaffolded into every project is **the** source of truth for the project's requirements, architecture, and sprint state. Not Confluence. Not Notion. Not the chat history. Not Slack DMs. Not "Marco remembers".

Six folders, six ownerships (detailed in [`docs-hierarchy.md`](docs-hierarchy.md)):

- `docs/architecture/` — the target architecture. Architect, manual.
- `docs/requirements/` — structured requirements, one file per feature/domain. `requirements-ingest`.
- `docs/calls/` — raw transcripts and meeting notes. `requirements-ingest` (parking).
- `docs/support/` — reverse-engineering dossiers, third-party references. `reverse-engineering`, ad-hoc.
- `docs/prd/<area>/` — architectural PRDs. `arch-brainstorm` → `arch-decision`.
- `docs/sprints/Sprint-N/` — per-sprint promotion of validated PRDs. `sprint-manifest`, `atr`.

**Operational consequence.** If an AI can't read a piece of information, it can't help with it. Anything load-bearing for the project must live in `docs/`. Everything else — slide decks, customer-facing brochures, internal pitch material — is *optional* and lives wherever you like.

**Corollary.** If you find yourself pasting the same background into chat every morning, that background is missing from `docs/` and needs to be written there once.

## 5. Skills are plain Markdown

Every skill in `.claude/skills/` is:

- A folder with a `SKILL.md` file at its root.
- YAML frontmatter (`name`, `description`) that any AI tool can parse.
- A Markdown body describing what the skill does and when to use it.
- Optional `references/`, `assets/`, `scripts/` subfolders for supporting material.

No registry. No build step. No runtime dependency. A `git clone` is enough to carry your skills between projects. A `cp -r` is enough to share one skill with another team.

Why that matters:

- **Cross-tool by construction.** Plain Markdown is readable by every AI tool in use today. Claude Code has first-class skill support; Copilot reads the SKILL.md inline and follows; Cursor / Gemini / Codex read the Markdown manually.
- **Reviewable.** Skills are diffed in PR. A new skill goes through the same code review as a production class.
- **Evolvable.** If a skill's decision tree is wrong, you edit the Markdown. No DSL, no CLI flags, no migration.

See [`skills-catalog.md`](skills-catalog.md) for the full catalog and how to author a new one.

## 6. Advisor-only where it matters

NONoise explicitly refuses to automate two categories:

- **LSP / plugin installation.** When a step needs an LSP server or an editor plugin, Polly *prints the install command* for the user to copy-paste. It does not invoke `npm install -g` or `code --install-extension` on the user's behalf. Reason: the user's tooling environment is theirs; auto-modifying it without consent is bad posture, especially in enterprise contexts with strict endpoint policy.
- **Voice input tools.** Polly mentions Wispr Flow, Handy, Superwhisper, and Copilot's built-in transcription at the right moment. It never downloads them, never installs them, never configures them. Reason: voice tools have side effects on microphone access, global hotkeys, and OS permissions — all of which deserve the user's explicit decision.

Other categories — Superpowers skills, BMAD-derived personas, Quint, Graphify, Polly herself — **are** auto-installed, because they are plain Markdown inside the project itself. No system-wide side effects. No opt-in needed.

See [`external-tools.md`](external-tools.md) for the full advisor-only list.

## 7. Canonical over exotic

Restating §2 in operational terms:

- If the pattern is in every LLM's training data (DDD, Clean Arch, CQRS, Repository, standard REST, MVC, observer, strategy, event-sourcing, hexagonal, BFF, saga, outbox), prefer it. The LLM will generate correct idiomatic code zero-shot.
- If the pattern is unusual (a custom event bus, a bespoke aggregate boundary rule, a "we-always-do-it-this-way" convention), require a Quint FPF audit.
- Binary-only vendor dependencies are a yellow flag. The LLM sees signatures but can't reason about behaviour. Prefer source dependencies (`ProjectReference` in .NET, Git submodule or workspace package in Node/Python, vendored source trees where licence permits).

**What this does for the team.** A junior + small model is productive on canonical patterns because the LLM carries the idiom. The same junior + same model on an exotic architecture is a source of bugs because every decision requires an explanation the LLM doesn't have the memory for.

**What this does for code review.** Reviewers can focus on business logic instead of re-litigating the architectural choice every PR. The architectural choice is in `docs/prd/<area>/` with a validated ADR; anything in the PR that contradicts it is a review flag.

---

## Reading the principles together

1. Signal over noise tells you *what the framework is for* (reducing the five noise sources).
2. Parametric memory tells you *which architectures to pick* (canonical).
3. Pair vs solo tells you *how to spend team effort* (pair on the decisions that matter, solo on the implementations that parallelise).
4. Docs-as-truth tells you *where the knowledge lives* (the `docs/` tree, not chat).
5. Skills-as-Markdown tells you *how knowledge propagates* (committed plain text, not private prompt libraries).
6. Advisor-only tells you *where the tool stops* (before modifying the user's environment).
7. Canonical over exotic tells you *how to decide* when you have a choice.

Every skill, every scaffolded file, every Polly step is a direct consequence of one or more of these. If a future change can't be justified by one of them, it shouldn't ship.
