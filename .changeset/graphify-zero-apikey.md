---
'create-nonoise': minor
---

Project-local graphify skills — no API key, ever.

**Problem.** Before this change, graphify's per-platform skill files (`.claude/skills/graphify/SKILL.md`, `.copilot/skills/graphify/SKILL.md`, …) were installed only in the user's home directory by the `graphify <X> install` step run after scaffold. If that step failed silently (e.g. no Python/uv on `PATH`), or a teammate cloned the repo on a fresh machine, the LLM would find no skill and fall back to `graphify`'s direct API path — which prompts for `ANTHROPIC_API_KEY`. Empirically observed in Copilot CLI: "esegui graphify del repo" → "I need an API key".

**Fix.** `create-nonoise` now writes per-platform skill files **into the project itself** as part of every scaffold and `--upgrade`:

- `.claude/skills/graphify/SKILL.md` (Claude Code; `skill-windows.md` on Windows)
- `.copilot/skills/graphify/SKILL.md` (GitHub Copilot)
- `.agents/skills/graphify/SKILL.md` (Codex)

Each location also gets a `.graphify_skill_version` stamp for `--upgrade` drift detection. Cursor and Gemini CLI continue to be wired via `graphify install --platform <X>` because graphify upstream's installers already produce project-local output for them.

**Source resolution (vendor + dynamic fallback).** The CLI ships a lean snapshot of graphify's per-platform skill files at `packages/skills/graphify-platform-skills/` (vendored at `graphifyy v0.7.10`, commit `ef1050b0`). At install time, if the user has a fresher `graphifyy` installed via `uv tool`, the CLI reads skill files from that installation instead, so users never get out-of-date skills just because NONoise's vendor pin lags upstream.

**Belt-and-suspenders.** Per-platform `graphify <X> install` is still attempted (it covers user-global installs in `$HOME`). But it's no longer the source of truth — exit code is now driven by whether the project-local writer succeeded, not by hook-install success.

**Coverage.** Now wires graphify-related output for all 5 NONoise-supported tools: Claude Code, Copilot, Codex, Cursor, Gemini CLI. Previously only Claude Code and Copilot were wired.

**Vendor bump.** `packages/skills/vendor/graphify/` re-synced from `v4` (graphifyy 0.4.25) to `v7` (graphifyy 0.7.10) — matches the install pin floor of `graphifyy>=0.7.0`.
