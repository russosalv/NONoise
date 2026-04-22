---
"create-nonoise": minor
---

Polly advisor redesign: Polly is now a one-shot, stateless, opt-in advisor. Scaffolded projects no longer receive `.nonoise/POLLY_START.md`, `.nonoise/polly-state.json`, `.nonoise/polly-state.schema.json`, or `.nonoise/polly-state.mjs`. They get `.nonoise/sdlc-flow.md` instead — an editable YAML-headed Markdown doc driving what Polly suggests.

Context files (CLAUDE.md / .github/copilot-instructions.md / .cursor/rules.md / GEMINI.md / AGENTS.md) now tell the AI to engage skills directly from user intent and to ask for the full scope in one message when engaging SDLC skills. Polly is the fallback, not the default.

Six native `[pair]` SDLC skills (`requirements-ingest`, `bmad-agent-analyst`, `bmad-advanced-elicitation`, `arch-brainstorm`, `arch-decision`, `sprint-manifest`) carry a one-line preamble reinforcing the same behaviour at the skill level.

**Migration for existing scaffolded projects:** the stale `.nonoise/POLLY_START.md` and `.nonoise/polly-state.*` files become harmless — delete them at your leisure (`rm .nonoise/POLLY_START.md .nonoise/polly-state.*`). Copy the new `sdlc-flow.md` template from `node_modules/create-nonoise/templates/single-project/_always/.nonoise/sdlc-flow.md` (or re-scaffold into a scratch directory and copy the file). Add the "Working with skills" block from the new templates into your existing `CLAUDE.md` / `copilot-instructions.md` / etc.
