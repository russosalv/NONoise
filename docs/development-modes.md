# Development modes — quick, medium, long

The SDLC flow is sized to the work. A one-line fix does not need requirements, a PRD and a sprint manifest; a new product does. NONoise names three sizes — **quick**, **medium** and **long** — and every phase of `.nonoise/sdlc-flow.md` declares which of them it belongs to. The mode is chosen per task and is not stored anywhere.

## The three modes

| | quick | medium (default) | long |
|---|---|---|---|
| **Fits** | a fix, a tweak, one or two files, a clear outcome | a feature or refactor inside an already-decided architecture | a new product, an epic, anything that changes the architecture |
| **Phases** | implement → verify | short spec → plan → implement → verify | requirements → design → architecture → sprint → implementation → acceptance |
| **Documents** | none | one spec, one plan | requirements, PRD, sprint manifest, test report |
| **Delegation** | none: one agent, direct edits | delegate independent pieces and broad searches | orchestrate: plan first, parallel agents, review every piece |
| **FPF validation** | never | only if the FPF gate fires | whenever the FPF gate fires |

One rule sits above the table: never run a heavier mode than the work needs. If a task turns out bigger than its mode, the assistant says so and proposes the next mode up. It does not expand silently.

## How the mode is chosen

Polly decides the mode before she walks the phases, without asking a question:

1. **You name it.** `/polly quick fix the date parser`, `/polly long <goal>`, or in words: "quick mode", "modalità long". Whatever follows the mode word is the goal.
2. **You give a goal and no mode.** Polly infers it. A fix or tweak in one or two files is quick. A feature or refactor inside an already-decided architecture is medium. A new product, an epic, missing requirements, or a change to the data model, a public contract or the architecture is long. When two modes fit, she picks the lighter one and names the heavier as the fallback.
3. **No goal at all** (`/polly` on its own, "what's next?"). Polly uses `default_mode` from `.nonoise/sdlc-flow.md`, which is `medium` in a new scaffold. If the project has no code and no documents yet, she uses long.

The signals behind the inference are the number of files and modules touched, whether requirements already exist, whether the change crosses a public contract or the data model, and how long the work is expected to run.

Polly states the mode and a one-line reason in the first block of her message. She stays stateless: the mode is derived again on every invocation.

## What each mode runs

### quick

No phase walk. Polly hands over the `### quick` prompt from the flow file, filled with the goal. The assistant works directly: the smallest change, the relevant tests, and a three-line summary of what changed and what was verified. No documents, no subagents, no FPF. That also means no `reuse-first` step and none of the NONoise agents. If the work turns out bigger, it stops and proposes medium.

### medium

Two phases: `feature-design` → `implementation`. The assistant writes a short spec under `docs/superpowers/specs/`, then a plan under `docs/superpowers/plans/`, executes the plan with TDD, delegates the independent pieces, and closes with verification (tests and build). The architecture is treated as decided. If a hard-to-reverse choice with several viable options comes up, the work stops and `arch-decision` is proposed.

Since 1.9 three steps sit inside those two phases. `feature-design` starts with the `reuse-first` skill, which records an adopt / extend / build decision in the spec. When the feature lands in existing code, the `graph-explorer` agent maps the area and the `blueprint-architect` agent derives a file-level blueprint before the spec is closed. Each implementation task closes with the `evidence-reviewer` agent and the language reviewer installed for the stack. See [`agents.md`](agents.md).

Fingerprints left by earlier work do not count for a new goal: Polly starts from `feature-design` unless a spec for this goal already exists.

### long

The full flow, in order, starting from the first phase whose fingerprint is missing: stack, requirements ingest and elicitation, feature design, architectural options, architectural decision, architecture sync, sprint breakdown, implementation, acceptance. The assistant plans first, runs parallel agents and reviews every piece. The phases are described in [`sdlc.md`](sdlc.md).

The medium steps apply here too, and long adds its own: `arch-brainstorm` also starts with `reuse-first`; the `docs-steward` skill audits the documentation after `arch-sync` and at sprint closure; and `atr` requests `evidence-reviewer` and the other installed reviewers before acceptance or a sprint is marked complete.

## The FPF gate

Formal validation (`arch-decision` → Haft FPF) costs time and attention, so it runs only when it is warranted. `arch-decision` evaluates the gate in its Step 0, before loading any runtime, and Polly evaluates it before suggesting `arch-decision`.

The gate **fires** when at least one of these holds:

- the operator asks for formal validation;
- the decision is costly to reverse — a data model or storage engine, a public API or event contract, a security or tenancy boundary, infrastructure or deployment topology, a vendor or licence lock-in — **and** the PRD has at least two materially different viable options;
- the PRD supersedes a decision that was itself bound through Haft.

When the gate does not fire, the choice is recorded in the PRD frontmatter as a **lightweight decision**:

```yaml
status: validated
validated_by: operator (lightweight)
decision:
  mode: lightweight
  choice: <the option, one line>
  rationale: <one or two lines>
  rejected: [<other options considered>]
  gate: <why FPF was not needed>
  revisit_if: <the fact that would make a formal validation worth it>
```

There is no Haft run and no `.haft/` record. `arch-sync` and `sprint-manifest` accept a lightweight decision. It can be promoted later: run `arch-decision` again when `revisit_if` becomes true.

Per mode:

| Mode | FPF |
|---|---|
| quick | never proposed |
| medium | only if the gate fires; the work stops and `arch-decision` is proposed |
| long | whenever the gate fires |

In a borderline case the assistant names the fact that would tip the answer and lets the operator choose. "Validate it anyway" always fires the gate; "keep it lightweight" is honoured unless the PRD supersedes a Haft-bound decision.

## Regia

In Claude Code the three modes are also the modes of [Regia](regia.md), the mod NONoise installs as its orchestration layer (`regia@claude-regia`): `/regia quick|medium|long <goal>`. The mapping is 1:1 — a NONoise quick is a Regia quick, and so on. The "Delegation" row of the table above is what Regia enforces: in medium the main session delegates the independent pieces, in long it orchestrates. In both, Regia picks model and effort for each delegated task and can run swarms of Claude, Codex, Qwen Code and Copilot agents.

When Regia is active in the session, Polly prefixes the example prompt with `/regia <mode>` and says that Regia will hold the plan (`scaletta_scrivi`) and the questions (`domanda_scrivi`). Polly does not call Regia's tools herself.

Regia is Claude-Code-only, and it is not installed by the `minimal` profile. The flow does not break without it: the same prompt works as it is, because its first words already state the mode. How NONoise installs Regia, what it replaces and its limits are in [`regia.md`](regia.md).

## Codex, Copilot and the other tools

The modes are plain instructions, so every tool gets the same table without Regia. What these tools do not get from NONoise is orchestration: delegation there relies on each tool's own subagent features. The scaffold writes a `development-modes` managed block — the table above plus the rules for the FPF gate — into each context file:

| Tool | Context file |
|---|---|
| Claude Code | `CLAUDE.md` |
| Codex | `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules.md` |
| Gemini CLI | `GEMINI.md` |

In Copilot and any other chat interface the phrase trigger carries the mode: `start polly quick <goal>` (likewise `medium` and `long`). Codex reads the block from `AGENTS.md` and runs Polly from `.agents/skills/polly/`. `create-nonoise --upgrade` refreshes the block together with the rest of the NONoise managed section; text outside the markers is kept.

## Customising

Everything is in the project-local `.nonoise/sdlc-flow.md` (flow `version: 2`):

- **`default_mode`** in the frontmatter — the mode used when nothing else decides. Set it to `quick`, `medium` or `long`.
- **`modes:`** on each phase — the modes the phase belongs to, for example `modes: [medium, long]`. A phase outside the current mode is not suggested. Edit the list to move a phase into or out of a mode.
- **`gate: fpf`** on the `arch-decision` phase — marks the phase as subject to the FPF gate.
- **The `## Modes` section** in the body — the table, the `### quick` and `### medium` prompts in Italian and English. Rewrite the prompts to match your project.

A flow file without `modes` (version 1) is read as a long-only flow: every phase counts as long, and `implementation` also serves quick and medium.

## Related

- [`sdlc.md`](sdlc.md) — the phases of the long flow.
- [`polly.md`](polly.md) — the advisor that picks the mode.
- [`regia.md`](regia.md) — the orchestration layer for Claude Code.
- [`agents.md`](agents.md) — the agents the modes call and where they are installed.
- [`cross-tool.md`](cross-tool.md) — what each tool supports.
- `packages/skills/polly/SKILL.md` (Step 1.5) and `packages/skills/arch-decision/SKILL.md` (Step 0) — the sources. If this document disagrees with them, they win.
