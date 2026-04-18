# Team model — why NONoise is team-first

Most AI-coding frameworks are shaped by their authors' experience as solo developers. Their mental model is one person + one chat window + one assistant, and the flow assumes everyone in that pattern.

NONoise is shaped by the opposite experience: a real software team, with specialised roles, handoffs between phases, artefacts that have to survive a sprint boundary and a developer rotation. The team-first shape is not an afterthought — it is what every decision optimises for.

This document describes the roles NONoise assumes, the pair-vs-solo mapping per SDLC phase, and how the one-man-band degenerate case is still supported.

## The roles NONoise assumes

A "full" NONoise team has (approximately):

- **Analyst / Product Manager.** Owns `docs/requirements/`. Drives the requirements phase. In BMAD personas, this is *Isa*.
- **Architect / Lead.** Owns `docs/architecture/`. Drives `arch-brainstorm`, `arch-decision`, and the Quint FPF audit. In BMAD personas, this is *Alex*. Alex has opinions, and those opinions are the architectural spine of the project — parametric memory, symmetry, local deducibility, no opaque binary deps.
- **Two or more implementers.** Execute the dev trio. One task at a time per dev; tasks parallelise naturally when the sprint manifest slices them vertically.
- **UX designer** (optional but recommended). Owns interaction design and `DESIGN.md`. In BMAD personas, this is *Giulia*.
- **Tech writer** (optional). Owns READMEs, user guides, and public-facing API docs. In BMAD personas, this is *Daniel*.
- **Shadow tester** (optional). A developer or QA who watches the ATR runs and negotiates acceptance criteria with the analyst. Often rotates among the implementers.
- **The AI itself** (non-negotiable). In NONoise the AI is a fourth member of the team, not a tool — it consumes the same `docs/` as the humans, writes to the same `docs/`, and is reviewed through the same PR discipline.

**Minimum team.** Two seniors who can both wear multiple hats (analyst / architect / dev). The BMAD personas make it possible to switch roles cleanly: one morning you're Isa doing requirements, the afternoon you're Alex doing architecture, the next day you're an implementer.

**Maximum team.** No upper bound in principle. In practice, coordination cost rises with team size and NONoise's artefacts (PRDs, sprint manifests, testbook reports) make the cost *linear* rather than combinatorial — anyone new reads the `docs/` tree and catches up.

## Pair vs solo — the core distinction

Every SDLC step is tagged with a mode:

- **`[pair]`** — high-bandwidth work. Multiple seniors present, or a senior + a specialist (analyst, architect, UX). Large model. Discussion is part of the work; the deliverable is as much the alignment as the artefact.
- **`[solo]`** — one person per task. Smaller models are fine. Repeatable, parallelisable. The deliverable is the artefact itself; alignment was established in the preceding pair phase.

**Why the distinction matters.** A team that does everything in pair mode wastes senior time on work that a solo dev + smaller model would finish in half the wall-clock. A team that does everything solo produces architectural decisions made by whichever dev picked up the ticket, usually without buy-in from the others, usually without a PRD to re-read later. Polly annotates the mode so the team consciously picks; doing pair work solo is a defensible choice, but it should be a *choice*.

## Phase → mode mapping

| SDLC step | Mode | Rationale |
|---|---|---|
| Voice-input hint | — | Informational only |
| Greenfield or brownfield | `[pair]` | Branches everything that follows; worth aligning |
| Stack question | `[pair]` | Stack choice binds many future decisions |
| Existing source material ingestion | `[pair]` | Analyst + architect co-read the raw inputs |
| Requirements elicitation | `[pair]` | Analyst leads, seniors present for domain context |
| Advanced elicitation stress-tests | `[pair]` | Socratic / pre-mortem / red-team work poorly in solo |
| Requirements validation (MoSCoW / IEEE 830) | `[pair]` | Disagreement is the signal |
| Feature / product design | `[pair]` | Multiple minds on the shape of the feature |
| UX design / DESIGN.md | `[pair]` | Designer + product + lead dev |
| Frontend-design (high-level) | `[pair]` | The visual direction is a team decision |
| Architecture options | `[pair]` | Architects + seniors; the whole point |
| Architecture decision (arch-decision + Quint) | `[pair]` | Formal audit benefits from challenge |
| Living C4 diagrams (c4-doc-writer) | `[solo]` | Mechanical sync with an already-validated PRD |
| Sprint breakdown | `[pair]` | Task slicing + CL assignment benefits from group |
| Spec-to-workitem push | `[solo]` | Mechanical translation |
| Per-task writing-plans | `[solo]` | One dev, one task, one plan |
| Per-task executing-plans + TDD | `[solo]` | Explicitly single-threaded |
| Parallel agents inside one task | `[solo]` | Sub-agents, not sub-devs |
| Systematic debugging | `[solo]` | Single-threaded reasoning |
| ATR acceptance run | `[solo]` | Generation + run is mechanical; negotiation was upstream |
| Code review (requesting / receiving) | Mixed | Request is solo; review itself is a second pair of eyes |
| Finishing a dev branch | `[solo]` | Merge / PR / cleanup |
| Observability triage | `[solo]` | Single-threaded drilling |
| Ops-skill-builder (pair phase of its 5-phase flow) | `[pair]` | Coaching is paired; crystallisation is solo |

Pattern: **anything that changes the project's direction is pair; anything that executes the direction is solo.**

## Why pair for discovery / architecture

Discovery and architecture decisions are *load-bearing for everything downstream*. Miss a requirement and three sprints later the sprint-manifest slices the wrong vertical; pick the wrong pattern and every future sprint pays the re-teach-the-model tax.

The pair mode on these steps is not about being nice; it is about putting more than one senior's attention on decisions that are expensive to reverse. The typical NONoise pair-mode session:

- Large model (Claude Opus 4.x, GPT-5, or local equivalent).
- Two seniors on one screen (the driver typing, the navigator challenging).
- One or two specialists depending on the phase (analyst, architect, UX, or the domain SME).
- One hour to four hours per session, depending on the decision.
- Output: a `docs/requirements/<file>.md`, or `docs/prd/<area>/<feature>.md`, or `docs/architecture/decisions/<ADR>.md`, or `docs/sprints/Sprint-N/manifest.md`.

The session is documented *as it happens* — Polly's pair-mode convention is that the specialist skill produces the artefact inside the conversation, so there's no "someone will write this up later" step.

## Why solo for implementation

Implementation of a well-specified task is:

- **Parallelisable.** Five developers can work on five tasks independently because the sprint manifest sliced vertically.
- **Repeatable.** `writing-plans` → `executing-plans` with TDD is the same loop every time. A smaller model is competent at this loop because the hard parts (architecture, acceptance criteria, API shape) are already decided upstream.
- **Reviewable.** The plan was reviewed before execution; the code is reviewed after execution; the acceptance test is reviewed by the shadow tester. Three review gates catch what a pair session wouldn't.

Moving implementation to solo is what makes NONoise scale. A six-person team that pair-programmed every task would finish one task a day; the same six people each doing their own task with the dev trio finishes six — with better coverage.

## The one-man-band case

NONoise is team-first but **not team-only**. A solo developer can use the full framework:

- Pair steps become solo steps by necessity. Polly still announces the mode; you just mentally replace "senior + senior" with "senior + large model".
- The BMAD personas (Isa, Alex, Giulia, Daniel) become *hats* the solo dev wears in sequence. The framework's role-tagging lets a solo dev keep the perspectives distinct — "this morning I'm Isa doing requirements" → "this afternoon I'm Alex doing architecture" — which turns out to be a useful discipline even without colleagues.
- The dev trio runs the same way. Solo or team, implementation is `[solo]`.
- The `docs/` tree pays off even for a solo dev: three sprints from now, future-you reads the PRDs and remembers why you picked that pattern.

The degenerate case is supported; the design target is the team case.

## Working modes in practice

Three typical rhythms NONoise teams converge on:

### Rhythm A — "Pair morning, solo afternoon"

- Mornings: pair work on discovery / architecture / sprint planning / acceptance negotiation.
- Afternoons: solo on implementation / tests / bug fixes.
- Cadence: new sprint every 1-2 weeks, one or two pair-morning sessions per sprint.

### Rhythm B — "Architecture sprint then implementation sprints"

- One full sprint in pair mode on architecture + sprint planning + backlog seeding.
- Next 2-3 sprints entirely in solo mode, blasting through the seeded backlog.
- Good for projects with stable, slowly-changing architectures.

### Rhythm C — "Ad-hoc, per-task judgement"

- Each new task asks "pair or solo?" based on novelty.
- Polly's mode annotation is the prompt; the team decides.
- Good for small teams (2-3) where coordination overhead of rhythm A or B is disproportionate.

All three rhythms are compatible with NONoise. The framework does not prescribe a rhythm; it prescribes the *mode per step*, and the team composes rhythms from there.

## Handoff mechanics

When one phase ends and the next begins, the handoff is an artefact in `docs/`:

- Requirements phase → architecture phase: the validated requirement files.
- Architecture phase → sprint phase: the validated PRD(s) under `docs/prd/<area>/`.
- Sprint phase → implementation phase: the sprint manifest under `docs/sprints/Sprint-N/`.
- Implementation phase → acceptance phase: the merged branches + test reports under `docs/sprints/Sprint-N/acceptance/`.

Handoffs are asynchronous by construction: the morning pair session produces the PRD; the afternoon solo implementer reads it and starts work. No meeting required.

If a handoff artefact is unclear, the rule is: the implementer files an issue or asks in the sprint channel, and the pair that produced the artefact fixes it — they don't re-negotiate the decision verbally, because then the next implementer inherits the same confusion.

## Polly and the team model

Polly is the orchestrator, not the manager. She:

- Announces the mode for every step.
- Picks the next skill.
- Applies skip rules.
- Routes brownfield re-entries.

She does not:

- Assign tasks to specific humans.
- Enforce the rhythm.
- Insist the team actually does pair work when they choose to go solo.
- Remember who's out sick today.

That's management; that's your job. NONoise gives you the method, not the management.
