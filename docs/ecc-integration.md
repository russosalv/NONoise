# ECC agents, rules and skills

NONoise 1.8.0 includes an adapted MIT snapshot of [ECC](https://github.com/affaan-m/ECC) at `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29`. It is always local, including in native vendor mode. ECC is never installed as a plugin and never auto-updated. The canonical sources, license, selection manifest and complete file/adaptation inventory are in `packages/skills/vendor/ecc/`.

Since 1.9 the same pinned commit also supplies language reviewers, build resolvers and rule groups for thirteen more stacks, and NONoise installs three agents of its own next to the ECC ones. What each agent does and when the flow calls it is in [`agents.md`](agents.md); this page covers the selection, the per-host paths and the update procedure.

```sh
npx create-nonoise my-app --yes --ai claude-code,copilot,codex --stack dotnet,angular
npx create-nonoise ts-app --yes --ai copilot --stack typescript
npx create-nonoise api --yes --ai claude-code,codex --stack python,go
npx create-nonoise common-app --yes --stack none
npx create-nonoise --upgrade my-app --stack dotnet,angular
npx create-nonoise doctor my-app
```

`--stack` accepts a comma-separated list of `dotnet`, `typescript`, `angular`, `web`, `python`, `go`, `rust`, `java`, `kotlin`, `cpp`, `swift`, `php`, `ruby`, `react`, `vue`, `flutter` and `fsharp`, or `none` alone.

The interactive wizard asks for a [profile](install-profiles.md) (default core) and a stack multiselect. Security/full additionally include `mcp-dependency-review`; brownfield/full include REA. `none` (also `nessuno`) cannot be combined with a language; omitted stack defaults to none on new projects. Upgrades reuse `nonoise.config.json.stack`, or none for older configs. An explicit `--stack` replaces that selection; pristine assets no longer selected are removed, user edits are retained and reported. Stack does not change which AI tools are selected.

| Selection | Rules | Additional agents | Additional skills |
|---|---|---|---|
| Legacy core / full baseline | common (9 files) | silent-failure-hunter, security-reviewer, database-reviewer, build-error-resolver, pr-test-analyzer, spec-miner, code-simplifier, refactor-cleaner | change-impact, module-regression, inherit-legacy-style, brownfield-retrospective, verification-loop, intent-driven-development, production-audit, code-tour |
| dotnet | csharp | csharp-reviewer | dotnet-patterns, csharp-testing |
| typescript | typescript | typescript-reviewer | e2e-testing |
| angular | angular, typescript, web | typescript-reviewer | angular-developer, e2e-testing |
| web | web | — | e2e-testing |
| dotnet, typescript, angular or web | as above | — | database-migrations, api-design, contract-first |
| python | python | python-reviewer | — |
| go | golang | go-reviewer, go-build-resolver | — |
| rust | rust | rust-reviewer, rust-build-resolver | — |
| java | java | java-reviewer, java-build-resolver | — |
| kotlin | kotlin | kotlin-reviewer, kotlin-build-resolver | — |
| cpp | cpp | cpp-reviewer, cpp-build-resolver | — |
| swift | swift | swift-reviewer, swift-build-resolver | — |
| php | php | php-reviewer | — |
| ruby | ruby | ruby-reviewer | — |
| react | react, typescript | react-reviewer, react-build-resolver, typescript-reviewer | — |
| vue | vue, typescript | vue-reviewer, typescript-reviewer | — |
| flutter | dart | flutter-reviewer, dart-build-resolver | — |
| fsharp | fsharp | fsharp-reviewer | — |

Totals in the snapshot: 31 agents (8 common and 23 stack agents; 10 before 1.9), 18 rule groups (`common` plus 17 stack groups; 5 before 1.9) and 16 skills. The thirteen stacks added in 1.9, from `python` to `fsharp`, install agents and rules only: no new ECC skills were added for them. `database-migrations`, `api-design` and `contract-first` stay tied to `dotnet`, `typescript`, `angular` and `web`, and `e2e-testing` to `typescript`, `angular` and `web`. In the agents and rules of the new stacks, pointers to upstream skills, commands and hook rules that are not in the snapshot were removed by `scripts/ecc-adapt.mjs`; `rules/react/hooks.md` is kept because it is about React hooks.

Profiles select the common agents listed above; build-error-resolver and refactor-cleaner contain JavaScript tool examples that must be adapted to the project's actual tooling. `database-reviewer` is PostgreSQL-oriented. Angular implies TypeScript/web rules, but never .NET. React and Vue include the TypeScript reviewer and rules, which their own files defer to. Shared agents, rules and skills are installed once.

| Harness | Agent files | Rules | Skills |
|---|---|---|---|
| Claude Code | `.claude/agents/<name>.md` | `.claude/rules/ecc/<group>/*.md`, language `paths` frontmatter | `.claude/skills/<name>/` |
| Copilot CLI | `.github/agents/<name>.agent.md` | `.github/instructions/ecc-<group>-<name>.instructions.md`, `applyTo` | `.agents/skills/<name>/` (also canonical `.claude/skills/`) |
| Codex 0.162 | `.codex/agents/<name>.toml` | `AGENTS.md` → `.nonoise/ecc/index.md` → `.nonoise/ecc/rules/` | `.agents/skills/<name>/` (also canonical `.claude/skills/`) |

`src/ecc.ts` is the converter; the manifest declares stack applicability and `src/profiles.ts` selects capabilities for scaffold, upgrade and doctor. Claude tool permissions are preserved; Copilot gets supported read/search/execute/edit aliases. Models inherit from the parent. Codex project configuration must be trusted through the normal CLI trust flow before project agents are loaded. Codex TOML contains `name`, `description`, `developer_instructions`; it does not impose Claude tool names, sandbox overrides or a model from another provider. Code fences, quotes and newlines are escaped in TOML strings. Source/commit comments survive conversion. The common index carries applicability patterns for Codex, whose rules are instruction links rather than native `paths` filters. Cursor/Gemini receive the shared skills and index, without an unsupported custom-agent format.

The three NONoise agents (`graph-explorer`, `blueprint-architect`, `evidence-reviewer`; sources in `packages/skills/_agents/`) go through the same per-host conversion and the same ownership inventory. They are not part of the ECC snapshot: every profile except minimal installs them, whatever the stack, and `.nonoise/ecc/index.md` lists them under "NONoise agents" with their own provenance line.

Upgrades use `.nonoise/file-hashes.json` plus known 1.6.0/1.7.0 NONoise skill hashes. Only missing, identical or recognized unmodified files are written. Unknown collisions, edited files and symlink paths are preserved and reported. The ECC inventory tracks stack removals. `doctor` compares expected agents, rules and skill files against the shipped snapshot and reports missing, modified or unsafe paths without changing them. Existing NONoise template managed-block semantics remain in place; prose outside the block is preserved. Other native vendor installers retain their existing lifecycle.

Polly recommends capabilities at their appropriate phase; implementation tasks close with `evidence-reviewer` and the installed language reviewer; ATR and sprint closure use evidence/test/security/silent-failure/language reviews; reverse engineering uses specification mining and legacy-style/regression/retrospective support. `change-impact` supports risky sprint tasks. `verification-loop` supplies execution evidence alongside Superpowers' completion gate. Architecture and story ownership stay with Haft/arch-decision and sprint-manifest. The security/developer/full profiles add [optional standalone hook adaptations](hooks-compatibility.md); no ECC runtime, learning system, dashboard or `/orch-*`/`/prp-*` commands are included.

## Manual maintainer update

```sh
node scripts/update-ecc.mjs /path/to/ECC <full-commit> --dry-run
node scripts/update-ecc.mjs /path/to/ECC <full-commit>
node scripts/update-ecc.mjs /path/to/ECC <full-commit> --check
npm run build
npm test
npm run typecheck
```

The separately adapted `hooks/` tree is retained verbatim and reviewed/tested manually. The updater reads only git objects from the source clone, stages the complete selected snapshot, prints the diff and then replaces the destination. Review `scripts/ecc-adapt.mjs` as well as new upstream prose; the adapter is not an automatic semantic dependency checker. Missing selected agents/skills/rule groups fail before any replacement. `--check` exits nonzero on drift. Before modifying released NONoise skills, append their hashes with `node scripts/update-skill-hashes.mjs [release-skills-dir]`.

See [validation evidence](ecc-validation-goal5.md) for the installed CLI versions, real scaffolds, upgrade and discovery checks.
