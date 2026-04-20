---
"create-nonoise": patch
---

Make 9 bundled skills loadable in GitHub Copilot. Copilot enforces a 1024-character limit on `description` in `SKILL.md` frontmatter (Claude Code does not) and uses a stricter YAML parser. Compressed the descriptions of `polly`, `arch-decision`, `c4-doc-writer`, `docs-md-generator`, `observability-debug`, `ops-skill-builder`, `reverse-engineering`, `spec-to-workitem`, and `sprint-manifest` to ≤1024 characters while preserving the trigger phrases. Fixed a YAML parse error in `polly` (`Polly does NOT write code:` → em-dash). Added `packages/create-nonoise/test/validation/skill-frontmatter-copilot.test.ts` to catch any future regression and a Copilot-compat rules section to `ops-skill-builder` so newly-authored skills are born compliant.
