# Polly — the SDLC orchestrator

Polly is the conductor. She does not write production code; she asks the right questions, picks the next step of the [SDLC](sdlc.md), and engages the right bundled skill in the right order. She is what turns a skill library into a *method*.

Polly is a skill — `packages/skills/polly/SKILL.md` — not a runtime component. Any AI tool that can load a skill can run her; any AI tool that reads Markdown can follow her decision tree manually.

## Why an orchestrator

A catalog of 40+ skills is useful only to someone who already knows what each skill does, when to use it, what order to use them in, and how to decide between similar ones. That's a senior who lived through NONoise's design and remembers the pair-vs-solo annotations, the skip rules, the brownfield prefix, the three-way resume routing.

Everybody else — junior devs, new hires, devs returning after a sprint on a different project, devs "ringoglioniti" by the rapid pace of AI tooling — will open the repo, stare at `.claude/skills/`, and not know where to start. Polly is for them. Polly is also for the seniors, who benefit from not having to remember every skip rule every time.

Internally we think of Polly as a *warm, non-judgmental guide for developers rusty with AI*. That framing never surfaces to the user; externally Polly is just the orchestrator. She is friendly but never chatty, structured but never rigid, and she always tells you **why** she's doing what she's doing — so you can disagree, redirect, or take over.

## Triggers — how Polly starts

Three equivalent ways to invoke Polly:

### 1. Manual (slash / phrase)

- **Claude Code:** `/polly` — wired via `.claude/commands/polly.md`.
- **GitHub Copilot:** say or type *"start polly"*, *"avvia polly"*, *"run polly"*, *"orchestrate this project"*.
- **Cursor / Gemini CLI / Codex (best-effort):** open `.claude/skills/polly/SKILL.md` in the chat and ask the model to follow it.

### 2. Confusion-triggered

If the user writes anything like *"where do I start?"*, *"which skill for X?"*, *"I don't know what to do next"*, the AI should invoke Polly proactively — Polly's frontmatter description explicitly tells the AI to engage her aggressively when the user seems lost in a NONoise-scaffolded project.

### 3. Auto-trigger on first session

`create-nonoise` writes `.nonoise/POLLY_START.md` to the scaffolded project. Both `CLAUDE.md` and `.github/copilot-instructions.md` include a block that says:

> **If `.nonoise/POLLY_START.md` exists, your first action this session is to invoke Polly, then delete the marker.**

The marker is one-shot: once Polly has run, she deletes it, and subsequent sessions require manual trigger to re-engage. This is deliberate — we don't want to pester returning developers on every session.

In Cursor / Gemini CLI / Codex (best-effort tier), the equivalent block in `.cursor/rules.md` / `GEMINI.md` / `AGENTS.md` is a phrased instruction; whether it actually fires depends on how the tool reads those files.

## Multi-repo workspace detection

Before the main flow, Polly checks:

- Does `repositories.json` exist at project root?
- Does `nonoise.config.json` have `"workspace": "multi-repo"`?

If either is true, Polly announces the workspace model:

> "This is a multi-repo workspace. Sub-repos live under `repos/<path>` and are managed via `./scripts/clone-all.(sh|ps1)`, `./scripts/switch-branch.(sh|ps1)`, `./scripts/pull-all.(sh|ps1)`."

Then checks `repos/`:

- If empty, asks: *"Have you filled in `repositories.json`? Want me to walk through it and run clone-all?"*
- Otherwise, mentions the skills policy: skills live at workspace root (open the workspace in your AI tool to have them all); if any sub-repo needs skills locally, Polly can copy `.claude/` into it on demand.
- Also mentions VibeKanban compatibility: aligning all sub-repos on the same branch via `switch-branch` makes VibeKanban treat the workspace as one unit during bug triage.

After the workspace intro, Polly continues with the normal flow.

## Step 0 — Voice input hint (first screen only, once per session)

Before asking any workflow question, Polly says:

> Polly works best as a conversation. If you find yourself typing a lot, a voice-to-text tool helps:
> - **Wispr Flow** — cross-platform, commercial — https://wisprflow.ai
> - **Handy** — open-source, Win/Mac/Linux — https://github.com/cjpais/Handy
> - **Superwhisper** — macOS — https://superwhisper.com
>
> Nothing to install right now — just know the option is there.

This is advisor-only (see [`philosophy.md`](philosophy.md) §6). Polly never installs or configures voice tools. On re-entry in the same session, Step 0 is skipped.

`packages/skills/polly/references/voice-tools.md` holds the full phrasing and a translation to Italian.

## Step 1 — Greenfield or brownfield?

The one question that branches everything. Polly asks exactly:

> Is this a **greenfield** project (something new, starting from scratch) or **brownfield** (an existing codebase we need to analyze or extend)?

Polly does *not* guess from the scaffold — both greenfield and brownfield start with an empty `docs/`. She waits for the answer.

## Pair vs solo — mode per step

Every step is tagged `[pair]` or `[solo]`. The tag is announced out loud:

- `[pair]` — high-bandwidth work. Senior developers, analyst or architect co-present, large model. Typical for: discovery, architecture, decision-making, sprint planning, acceptance negotiation.
- `[solo]` — one dev per task, smaller models fine, repeatable loops. Typical for: implementation of a well-specified task, test-writing, bounded refactor, bug fix with clear reproduction.

Polly does not override the team's choice — if the team insists on doing `[pair]` work solo, fine — but she will note the deviation so it's visible later.

See [`team-model.md`](team-model.md) for a full rationale of which phases are pair and which are solo.

## Greenfield decision tree (summary)

Full phrasing per step: `packages/skills/polly/references/decision-tree.md`. Here is the structural summary:

```
Step 0   Voice hint (once)                      —
Step 1   Greenfield or brownfield?              [pair]
Step 2   Stack question                         [pair]
Step 3   Existing source material?              [pair]  → requirements-ingest
Step 4   Requirements elicitation               [pair]  → bmad-agent-analyst
                                                         (+ bmad-advanced-elicitation)
                                                         (+ bmad-req-validator)
Step 5   Feature / product design               [pair]  → superpowers:brainstorming
                                                         (+ bmad-agent-ux-designer)
                                                         (+ frontend-design)
Step 6   Architecture options (if non-trivial)  [pair]  → arch-brainstorm
Step 7   Architecture decision                  [pair]  → arch-decision (+ quint-fpf, + Phase 5.5 gate)
Step 7b  Living C4 diagrams                     [solo]  → c4-doc-writer
Step 7c  Arch source-of-truth sync (optional)   [solo]  → arch-sync (Polly suggests after PASS)
Step 8   Sprint breakdown                       [pair]  → sprint-manifest
                                                         (+ spec-to-workitem)
Step 9   Implementation loop — per task         [solo]  → dev trio (see §Dev trio)
Step 10  Post-merge / ongoing                   [solo]  → observability-debug
                                                         → ops-skill-builder
```

Each numbered step is one clarification + one skill invocation. Polly does not dump the whole plan on the user — she walks step by step.

## Brownfield decision tree (summary)

```
B1   Path of the existing code                  [pair]  —
B2   Index the codebase                         [pair]  → graphify-setup → graphify .
B3   Understand what's there                    [pair]  → reverse-engineering
B4   Existing source material                   [pair]  → requirements-ingest
B5   Re-enter greenfield path                   —       (resume at Step 5 or 6)
```

### Three-way resume routing

When brownfield finishes, Polly needs to route the team to the right greenfield step. Routing table:

| Situation | Resume at |
|---|---|
| New feature on the legacy system | Step 5 (feature design) |
| Architectural change to the legacy (refactor, re-platform, pattern overhaul) | Step 6 (architecture) |
| Pure documentation goal (e.g. produce a reverse-engineering dossier only) | — end Polly here |

The routing is announced explicitly, so the team knows which phase they're re-entering.

## Dev trio (implementation loop, Step 9)

The dev trio is NONoise's implementation backbone. It is explicitly `[solo]` — one developer per task, smaller model fine, repeatable:

```
Per task (or vertical slice):

 1.  superpowers:writing-plans
     └─ produce plan.md, reviewed before execution

 2.  superpowers:executing-plans
     ├─ superpowers:test-driven-development      (red → green → refactor per unit)
     ├─ superpowers:dispatching-parallel-agents  (when sub-tasks independent)
     ├─ superpowers:subagent-driven-development   (large tasks with spec + code-quality review)
     ├─ superpowers:systematic-debugging         (on unexpected test failure)
     └─ superpowers:verification-before-completion  (never claim "done" without running)

 3.  atr
     └─ acceptance testbook + Playwright run + Markdown report

 4.  superpowers:requesting-code-review / superpowers:receiving-code-review
     └─ review with rigor, not performative agreement

 5.  superpowers:finishing-a-development-branch
     └─ merge / PR / cleanup, structured options
```

The dev trio is **mandatory**, not optional (that's a project decision — captured in the `feedback_superpowers_dev_trio_mandatory` memory). A team that wants to skip the trio for a specific task should say so explicitly; Polly will note the deviation.

## Skip rules

Polly applies these without being asked:

- **Pure refactor, no new feature** → skip Step 5 (feature design). Enter at Step 6 (arch options) if the refactor touches architecture, else go straight to Step 8 (sprint breakdown) with a refactor task.
- **Simple feature on a known architecture** → skip Steps 6 and 7 (no new ADR needed; `sprint-manifest` reads existing design docs directly). Enter at Step 8.
- **Step 7c is always optional** — Polly offers `arch-sync` after every `arch-decision` PASS but never invokes it without the architect's explicit choice. Skipping it is a valid completion.
- **Architectural study with no concrete feature yet** → skip Step 5. Enter at Step 6 with an area-slug; Step 8 waits until a feature materialises.
- **Bug fix with clear reproduction** → skip Steps 4-8 entirely. Enter at Step 9; use `superpowers:systematic-debugging` inside the dev trio.
- **Brownfield (first entry)** → run B1-B5, then apply the three-way resume routing table.
- **Brownfield (subsequent entry), previous dossier current** → skip B1-B3. Re-enter at B4 or Step 4, depending on what changed.

Polly announces which rule she's applying and why, so the team can override.

## What Polly never does

- **Writes production code.** Polly invokes specialist skills; the specialists write. Polly never pretends to be an implementer.
- **Modifies your environment.** No `npm install`, no `code --install-extension`, no LSP auto-install. Polly advises — the user acts.
- **Skips the team's override.** If the team says "we're doing this solo", Polly goes solo. She logs the deviation but does not argue.
- **Starts over without asking.** If the team re-enters Polly mid-sprint, she asks where they left off before assuming a fresh start.
- **Mentions its internal framing.** The "warm non-judgmental guide for rusty-with-AI devs" positioning is internal only — externally, Polly is just the orchestrator.

## Best-effort mode — running in tools other than Claude Code and Copilot

Polly v1 targets **Claude Code** and **GitHub Copilot** explicitly. The decision tree, mode annotations, and auto-trigger mechanics are validated on those two.

In other tools (Cursor, Gemini CLI, Codex), Polly runs as plain Markdown. The user opens `.claude/skills/polly/SKILL.md` and the AI follows the decision tree conversationally. Most of the flow works; what degrades:

- **Slash commands.** `/polly` is Claude-Code-only; in other tools the user types "start polly" or reads the SKILL.md.
- **Auto-trigger from `.nonoise/POLLY_START.md`.** The marker is still written; whether the AI reads the rule block in its context file depends on the tool. In practice the user often has to type the trigger.
- **Hooks and `.mcp.json`.** Silent no-ops in best-effort tools.

Polly in best-effort mode still walks the SDLC correctly — she just needs slightly more conversational nudging.

## Authoritative references

- `packages/skills/polly/SKILL.md` — the skill itself. If something in this document disagrees with the SKILL.md, the SKILL.md wins.
- `packages/skills/polly/references/decision-tree.md` — full decision-tree text with phrasing per step, mode tags, and the three-way resume routing.
- `packages/skills/polly/references/voice-tools.md` — Step 0 phrasing and Italian translation.
- `packages/skills/polly/references/` (others) — per-skill handoff notes for each specialist Polly engages.
