---
description: Invoke Polly — the NONoise SDLC advisor.
---

# /polly — the NONoise advisor

Invokes the Polly skill.

Polly is NONoise's SDLC advisor — not an orchestrator. She:

1. Reads `.nonoise/sdlc-flow.md` (falls back to
   `.claude/skills/polly/references/sdlc-flow.default.md` if the
   project-local copy is missing).
2. Walks the phases, checks fingerprints against the filesystem, detects
   where you are.
3. Produces a single 4-block message: **where you are**, **what I suggest
   next**, **how to trigger it** (copy-pasteable example prompt), **or
   delegate** (say "vai" and Polly engages the skill for you, then
   disappears).

Polly is fire-and-die. One message per invocation, then she terminates.
No state is persisted across turns. No auto-trigger.

## How to use

- Type `/polly` with no arguments — Polly reads the flow and advises.
- If you already know what you want (e.g. "reverse engineer this repo"),
  skip Polly and describe the task directly; the AI will engage the
  matching skill.
- The full advisor behaviour lives in `.claude/skills/polly/SKILL.md`.
