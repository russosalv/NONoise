---
"create-nonoise": minor
---

Replace the `codex-delegate` skill with OpenAI's official Claude Code plugin `codex@openai-codex`
(marketplace `openai/codex-plugin-cc`): installed in native mode, declared in `.claude/settings.json`
in embed mode. `--upgrade` removes pristine `codex-delegate` copies and preserves modified ones.
NONoise skills are now also installed in `.agents/skills/` when Codex or Copilot CLI is selected,
so those harnesses can actually use them; `doctor` checks the right directory per harness.
