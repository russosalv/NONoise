# Polly — the SDLC advisor

Polly is NONoise's opt-in advisor. She does not orchestrate the SDLC — she reads the project's flow, tells you where you are in it, and hands you the exact prompt to trigger the next useful skill. One message per invocation, then she terminates.

Polly is a skill — `packages/skills/polly/SKILL.md` — not a runtime component. Any AI tool that can load a skill can run her; any AI tool that reads Markdown can follow her source manually.

## The default path isn't Polly — it's direct skill engagement

A catalog of 40+ skills is useful when you can describe what you want and the AI picks the matching skill. Context files (`CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, `.cursor/rules.md`, `GEMINI.md`) tell the AI to do exactly that: if the user says "I need to reverse engineer this repo", engage `reverse-engineering` directly. Polly is the fallback for when intent is ambiguous.

If you know what you want, just say it — skip Polly. If you don't, `/polly`.

## Triggers

Three equivalent ways:

1. **Slash.** `/polly` in Claude Code, optionally with a mode and a goal: `/polly quick|medium|long <goal>`. Wired via `.claude/commands/polly.md`.
2. **Phrase.** *"start polly"*, *"avvia polly"*, *"run polly"* — Copilot and any other chat interface. The mode can follow the phrase: *"start polly quick …"*.
3. **Confusion fallback.** If the user writes *"where do I start?"*, *"what's next?"*, *"sono perso"* and the phrase does not map to a specific skill, the AI offers Polly. If the phrase does map to a specific skill, the AI engages that skill directly and does not route through Polly.

There is no auto-trigger. Older NONoise versions wrote `.nonoise/POLLY_START.md` as a first-session marker; that mechanism has been removed. Existing scaffolds can delete the leftover marker safely.

## Development modes

Before walking the flow, Polly sizes the work as **quick**, **medium** or **long**, without asking:

- **You named the mode** (`/polly quick fix the date parser`, "modalità long") — she uses it.
- **You gave a goal and no mode** — she infers the lightest mode that fits and names the heavier one as the fallback.
- **No goal** (`/polly` on its own) — she uses `default_mode` from `.nonoise/sdlc-flow.md` (`medium` in a new scaffold), or long if the project has no code and no documents yet.

Then she keeps only the phases whose `modes` contain that mode. Quick has no phase walk: the suggestion is the quick prompt, filled with the goal. Medium is `feature-design` → `implementation`. Long walks every phase. The mode is not stored; it is derived again on every invocation.

**FPF gate.** Polly suggests `arch-decision` with formal Haft validation only when the gate fires: you asked for it, or the decision is costly to reverse and the draft PRD shows at least two materially different viable options. When it does not fire she says so in one sentence and hands over the lightweight-decision prompt instead. FPF is never suggested in quick mode. If the case is borderline she names the fact that would tip it and lets you choose, inside the 4-block message.

**Regia.** In Claude Code, NONoise installs the [Regia](regia.md) mod, which owns orchestration: delegation, model and effort per task, swarms, the plan list and the questions for you. When it is active in the session, Polly prefixes the example prompt with `/regia <mode>` — `/polly long <goal>` returns a prompt that starts with `/regia long` — and notes that Regia will hold the plan and the questions. She does not call Regia's tools herself. In Codex, Copilot and the other tools there is no Regia: she hands over the plain prompt, whose first words already state the mode.

Full description: [`development-modes.md`](development-modes.md).

## The 4-block output pattern

Every Polly invocation produces exactly one message with four blocks:

1. **Where you are in the flow.** Polly reads `.nonoise/sdlc-flow.md`, names the mode she is using and why, walks the phases of that mode, checks each fingerprint against the filesystem, and reports the phase you are in.
2. **What I suggest next.** The next phase, its associated skill, and a one-line reason. If the FPF gate was evaluated, its outcome and the fact it rests on.
3. **How to trigger it.** A copy-pasteable example prompt in your language. The skill will engage automatically from this prompt — no need to type `/<skill-name>`.
4. **Or — delegate.** Polly offers: *"Say 'vai' / 'go' and I'll engage the skill for you, then disappear."*

After producing the message, Polly terminates. If the user says *"vai"*, Polly engages the skill with one handoff line and terminates. She does not resume.

## `.nonoise/sdlc-flow.md` — the source of truth

Every scaffolded project gets a default `.nonoise/sdlc-flow.md`. YAML frontmatter declares `default_mode` and the phases, each with the `modes` it belongs to; a `## Modes` section and per-phase Markdown sections hold example prompts in IT + EN. The file is user-editable: remove phases that don't apply, add custom ones, rewrite prompts to match your domain.

Polly reads the project-local copy every invocation. If it is missing, she falls back to `packages/skills/polly/references/sdlc-flow.default.md` (the embedded copy shipped with the skill) and mentions the fallback in her output.

## Language

Polly speaks the language captured at scaffold time in `nonoise.config.json`. If the user is clearly typing a different language, Polly matches them. IT and EN are first-class — other languages are best-effort; users can add `label.<lang>` fields to `sdlc-flow.md` to extend.

## What Polly never does

- **Writes code.** Advisor only. Code lives in the specialist skills.
- **Persists state.** No `polly-state.json`. Progress is always re-derived from filesystem fingerprints.
- **Auto-triggers.** No marker files, no first-session auto-invocation.
- **Multi-turn orchestration.** One message per invocation.
- **Modifies your environment.** No installs, no config changes, no file writes outside a rare cache.
- **Asks clarifying questions before the 4-block output.** If `sdlc-flow.md` is readable she has everything she needs.

## Multi-repo workspaces

If the workspace is multi-repo (`repositories.json` present or `nonoise.config.json` says so), Polly adds a one-line pointer at the top of the "Where you are" block: *"This is a multi-repo workspace — see `docs/multi-repo.md` for scripts and policy."* The walkthrough lives in [`multi-repo.md`](multi-repo.md), not inside the advisor.

## Differences vs older Polly

| Old Polly (orchestrator) | New Polly (advisor) |
|---|---|
| Multi-turn decision tree (Steps 0-10) | One-shot 4-block message |
| `polly-state.json` + handoff protocol | Stateless, no resume |
| Auto-trigger via `POLLY_START.md` | Manual only, plus confusion fallback |
| Step 0 voice hint on first screen | Dropped |
| Menu (`/polly menu`) | Dropped |
| Pair vs solo narrated per step | `mode` is a per-phase field in `sdlc-flow.md`, Polly mentions it if relevant |

## Related

- [`sdlc.md`](sdlc.md) — the SDLC flow the advisor reads against.
- [`development-modes.md`](development-modes.md) — quick / medium / long, the FPF gate.
- [`regia.md`](regia.md) — the orchestration layer for Claude Code that Polly hands over to.
- [`multi-repo.md`](multi-repo.md) — multi-repo workspace setup.
- [`team-model.md`](team-model.md) — pair vs solo rationale.
- `packages/skills/polly/SKILL.md` — the skill source. If this doc disagrees, the SKILL.md wins.

## Profiles and brownfield artifacts (1.8.0)

Polly reads the installed skill/agent index and `nonoise.config.json` before
suggesting a capability. Minimal installations can expand through an explicit
`create-nonoise --upgrade . --profile <name>` command.
For source-less DLL/EXE, packaged Electron/app.asar, HAR/SAZ, SQLite, APK, native
binaries, firmware or understanding an app/site without code, Polly proposes REA
and hands off to `rea-setup`. That skill explains the specific need and asks one
confirmation covering project installation and permission to analyze the target.
Already configured REA is used directly when connected. Polly itself retains its
advisor role. [REA flow](rea-integration.md) · [Profiles](install-profiles.md).
