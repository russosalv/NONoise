# Installation profiles (1.8.0)

`--profile minimal|core|developer|security|brownfield|full` selects the project
capabilities. Interactive setup asks once; `--yes` defaults to `core`.
The single catalog is `packages/create-nonoise/src/profiles.ts`; scaffold,
upgrade and doctor resolve it together with `--stack`.

| Profile | Native skills and ECC | Optional NONoise hooks | REA |
|---|---|---|---|
| minimal | Polly, skill-finder, requirements-ingest, sprint-manifest, rea-setup; no agents/rules or external vendor runtimes | None | Opt-in |
| core | Historical 27-skill bundle + rea-setup; common rules; database/build/test/simplification/refactoring agents; verification-loop, intent-driven-development, production-audit, change-impact, code-tour | None | Opt-in |
| developer | Core plus selected stack capabilities | post-edit-format, stop-format-typecheck | Opt-in |
| security | Core + security-reviewer, silent-failure-hunter, mcp-dependency-review | block-no-verify, config-protection, pre-bash-git-push-reminder, mcp-health-check, safety-guard | Opt-in |
| brownfield | Core + spec-miner, inherit-legacy-style, module-regression, brownfield-retrospective | None | Yes |
| full | Union of the above for the selected stack | All seven | Yes |

Every profile except minimal honors `--stack dotnet,typescript,angular,web`.
Even core accepts an explicit stack, preserving the goal-5 interface. `full`
means all capabilities for those stacks; use all four values for every language.
No stack is inferred silently. Minimal intentionally ignores stack capabilities
while retaining the selection in config, ready for a later profile change.

```sh
create-nonoise service --yes --profile developer --stack dotnet --ai claude-code,copilot,codex
create-nonoise --upgrade service --profile security
create-nonoise --upgrade service --with-rea
create-nonoise doctor service
```

`nonoise.config.json` stores `profile`, `stack` and `withRea`. Upgrades reuse these
values; only `--profile` changes the profile. Once activated, REA remains enabled
across profile changes: removing an MCP registration is a deliberate user edit.
For 1.6/1.7 projects without a profile, upgrade records `core` and
`legacyProfileCompatibility: true`: all previous ECC/common and stack capabilities
remain selected. Legacy vendor/Quint/retired-skill cleanup is deferred, including
old `codex-delegate` copies. Existing skills and custom files stay; an explicit profile change
opts into the new catalog. Only pristine managed ECC files may be removed on an
explicit stack/profile change. Modified files are preserved and doctor reports drift.
NONoise hook registrations follow the selected profile; unrelated hook entries stay.

Minimal skips vendor/plugin/Graphify/Haft installation, including their hooks.
Core and larger profiles retain the existing vendor installation behavior; these
vendors can have their own hooks, separate from the seven optional NONoise hooks.
This distinction also applies to existing projects downgraded to minimal: existing
vendor files/configuration are retained; the profile does not uninstall third-party
software. [Hook compatibility](hooks-compatibility.md) and [REA](rea-integration.md)
describe runtime limits and project-local registration.
