# Installation profiles (1.8.0)

`--profile minimal|core|developer|security|brownfield|full` selects the project
capabilities. Interactive setup asks once; `--yes` defaults to `core`.
The single catalog is `packages/create-nonoise/src/profiles.ts`; scaffold,
upgrade and doctor resolve it together with `--stack`.

| Profile | Native skills and ECC | Optional NONoise hooks | REA |
|---|---|---|---|
| minimal | Polly, skill-finder, requirements-ingest, sprint-manifest, rea-setup; no agents/rules or external vendor runtimes | None | Opt-in |
| core | Standard 27-skill bundle + rea-setup; the three NONoise agents (graph-explorer, blueprint-architect, evidence-reviewer); common rules; database/build/test/simplification/refactoring agents; verification-loop, intent-driven-development, production-audit, change-impact, code-tour | None | Opt-in |
| developer | Core plus selected stack capabilities | post-edit-format, stop-format-typecheck | Opt-in |
| security | Core + security-reviewer, silent-failure-hunter, mcp-dependency-review | block-no-verify, config-protection, pre-bash-git-push-reminder, mcp-health-check, safety-guard | Opt-in |
| brownfield | Core + spec-miner, inherit-legacy-style, module-regression, brownfield-retrospective | None | Yes |
| full | Union of the above for the selected stack | All seven | Yes |

Every profile except minimal honors `--stack`. Its values are `dotnet`,
`typescript`, `angular`, `web`, `python`, `go`, `rust`, `java`, `kotlin`, `cpp`,
`swift`, `php`, `ruby`, `react`, `vue`, `flutter` and `fsharp`, comma-separated,
or `none` alone. Even core accepts an explicit stack, preserving the goal-5
interface. `full` means all capabilities for the selected stacks; list every
value to get every language.
No stack is inferred silently. Minimal intentionally ignores stack capabilities
while retaining the selection in config, ready for a later profile change.

Agents and rules per stack (1.9). Each stack adds its language reviewer, a build
resolver where ECC has one, and its rule group:

| Stack | Agents | Rule groups |
|---|---|---|
| dotnet | csharp-reviewer | csharp |
| typescript | typescript-reviewer | typescript |
| angular | typescript-reviewer | angular, typescript, web |
| web | — | web |
| python | python-reviewer | python |
| go | go-reviewer, go-build-resolver | golang |
| rust | rust-reviewer, rust-build-resolver | rust |
| java | java-reviewer, java-build-resolver | java |
| kotlin | kotlin-reviewer, kotlin-build-resolver | kotlin |
| cpp | cpp-reviewer, cpp-build-resolver | cpp |
| swift | swift-reviewer, swift-build-resolver | swift |
| php | php-reviewer | php |
| ruby | ruby-reviewer | ruby |
| react | react-reviewer, react-build-resolver, typescript-reviewer | react, typescript |
| vue | vue-reviewer, typescript-reviewer | vue, typescript |
| flutter | flutter-reviewer, dart-build-resolver | dart |
| fsharp | fsharp-reviewer | fsharp |

The ECC snapshot now holds 31 agents (10 before 1.9): 8 common ones chosen by
the profile and 23 chosen by the stack. No new ECC skills were added for the
stacks from python to fsharp: stack skills exist only for dotnet, typescript,
angular and web ([mapping](ecc-integration.md)). The three NONoise agents are
installed by every profile except minimal and do not depend on the stack. What
each agent does: [agents](agents.md).

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
old `codex-delegate`, `swarm-router`, `copilot-delegate` and `gemini-delegate` copies. Existing skills and custom files stay; an explicit profile change
opts into the new catalog. Only pristine managed ECC files may be removed on an
explicit stack/profile change. Modified files are preserved and doctor reports drift.
NONoise hook registrations follow the selected profile; unrelated hook entries stay.

Minimal skips vendor/plugin (the Regia mod included), code graph (`codebase-memory-mcp`) and Haft installation, including vendor hooks.
Core and larger profiles retain the existing vendor installation behavior; these
vendors can have their own hooks, separate from the seven optional NONoise hooks.
This distinction also applies to existing projects downgraded to minimal: existing
vendor files/configuration are retained; the profile does not uninstall third-party
software. [Hook compatibility](hooks-compatibility.md) and [REA](rea-integration.md)
describe runtime limits and project-local registration.
