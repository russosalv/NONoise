---
"create-nonoise": patch
---

Generated `AGENTS.md`, `CLAUDE.md` and `.github/copilot-instructions.md` now include an "Updating NONoise" section in the managed block, so an agent asked to "update"/"aggiorna" runs `create-nonoise@latest doctor` / `--upgrade` instead of copying files by hand. Existing projects receive it on their next `--upgrade`.
