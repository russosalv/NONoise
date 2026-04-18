---
name: docs-md-generator
description: (Stub — implementation lands in SP-7.b.) Generates and keeps coherent CLAUDE.md, AGENTS.md, and .github/copilot-instructions.md from a single AGENTS.md source-of-truth. When invoked today, this skill tells the user the skill is not yet operational and asks them to edit those files manually.
---

# docs-md-generator (STUB — SP-1)

> **Status**: stub. Real implementation will ship in SP-7.b.

## Intended behavior (SP-7.b)

Maintain three AI-context files in sync by treating `AGENTS.md` as source-of-truth and rendering per-tool adapters:

```
      AGENTS.md  (source of truth)
      ├──► CLAUDE.md                     (Claude Code adapter)
      ├──► .github/copilot-instructions.md (Copilot adapter)
      └──► GEMINI.md                     (Gemini CLI adapter)
```

## Today (SP-1)

When invoked today, respond to the user exactly:

> `docs-md-generator` is a stub in this version of the NONoise Framework. The real implementation lands in SP-7.b.
>
> For now, please edit `CLAUDE.md`, `AGENTS.md`, and `.github/copilot-instructions.md` manually.

Then stop. Do not attempt any file write.
