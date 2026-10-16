# ECC agents, rules and skills

NONoise 1.7.0 includes an adapted MIT snapshot of [ECC](https://github.com/affaan-m/ECC) at `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29`. It is always local, including in native vendor mode. ECC is never installed as a plugin and never auto-updated. The canonical sources, license, selection manifest and complete file/adaptation inventory are in `packages/skills/vendor/ecc/`.

```sh
npx create-nonoise my-app --yes --ai claude-code,copilot,codex --stack dotnet,angular
npx create-nonoise ts-app --yes --ai copilot --stack typescript
npx create-nonoise common-app --yes --stack none
npx create-nonoise --upgrade my-app --stack dotnet,angular
npx create-nonoise doctor my-app
```

The interactive wizard has a stack multiselect. `none` (also `nessuno`) cannot be combined with a language; omitted stack defaults to none on new projects. Upgrades reuse `nonoise.config.json.stack`, or none for older configs. An explicit `--stack` replaces that selection; pristine assets no longer selected are removed, user edits are retained and reported. Stack does not change which AI tools are selected.

| Selection | Rules | Additional agents | Additional skills |
|---|---|---|---|
| Always | common (9 files) | silent-failure-hunter, security-reviewer, database-reviewer, build-error-resolver, pr-test-analyzer, spec-miner, code-simplifier, refactor-cleaner | change-impact, module-regression, inherit-legacy-style, brownfield-retrospective, verification-loop, intent-driven-development, production-audit, code-tour |
| dotnet | csharp | csharp-reviewer | dotnet-patterns, csharp-testing |
| typescript | typescript | typescript-reviewer | e2e-testing |
| angular | angular, typescript, web | typescript-reviewer | angular-developer, e2e-testing |
| web | web | — | e2e-testing |
| Any nonempty stack | as above | — | database-migrations, api-design, contract-first |

Common agents are available for any project; build-error-resolver and refactor-cleaner contain JavaScript tool examples that must be adapted to the project's actual tooling. `database-reviewer` is PostgreSQL-oriented. Angular implies TypeScript/web rules, but never .NET. Shared skills are installed once.

| Harness | Agent files | Rules | Skills |
|---|---|---|---|
| Claude Code | `.claude/agents/<name>.md` | `.claude/rules/ecc/<group>/*.md`, language `paths` frontmatter | `.claude/skills/<name>/` |
| Copilot CLI | `.github/agents/<name>.agent.md` | `.github/instructions/ecc-<group>-<name>.instructions.md`, `applyTo` | `.agents/skills/<name>/` (also canonical `.claude/skills/`) |
| Codex 0.162 | `.codex/agents/<name>.toml` | `AGENTS.md` → `.nonoise/ecc/index.md` → `.nonoise/ecc/rules/` | `.agents/skills/<name>/` (also canonical `.claude/skills/`) |

`src/ecc.ts` is the converter, driven by the single manifest. Claude tool permissions are preserved; Copilot gets supported read/search/execute/edit aliases. Models inherit from the parent. Codex project configuration must be trusted through the normal CLI trust flow before project agents are loaded. Codex TOML contains `name`, `description`, `developer_instructions`; it does not impose Claude tool names, sandbox overrides or a model from another provider. Code fences, quotes and newlines are escaped in TOML strings. Source/commit comments survive conversion. The common index carries applicability patterns for Codex, whose rules are instruction links rather than native `paths` filters. Cursor/Gemini receive the shared skills and index, without an unsupported custom-agent format.

Upgrades use `.nonoise/file-hashes.json` plus known 1.6.0/1.7.0 NONoise skill hashes. Only missing, identical or recognized unmodified files are written. Unknown collisions, edited files and symlink paths are preserved and reported. The ECC inventory tracks stack removals. `doctor` compares expected agents, rules and skill files against the shipped snapshot and reports missing, modified or unsafe paths without changing them. Existing NONoise template managed-block semantics remain in place; prose outside the block is preserved. Other native vendor installers retain their existing lifecycle.

Polly recommends capabilities at their appropriate phase; ATR and sprint closure use test/security/silent-failure/language reviews; reverse engineering uses specification mining and legacy-style/regression/retrospective support. `change-impact` supports risky sprint tasks. `verification-loop` supplies execution evidence alongside Superpowers' completion gate. Architecture and story ownership stay with Haft/arch-decision and sprint-manifest. No ECC hooks, learning system, dashboard or `/orch-*`/`/prp-*` commands are included.

## Manual maintainer update

```sh
node scripts/update-ecc.mjs /path/to/ECC <full-commit> --dry-run
node scripts/update-ecc.mjs /path/to/ECC <full-commit>
node scripts/update-ecc.mjs /path/to/ECC <full-commit> --check
npm run build
npm test
npm run typecheck
```

The updater reads only git objects from the source clone, stages the complete selected snapshot, prints the diff and then replaces the destination. Review `scripts/ecc-adapt.mjs` as well as new upstream prose; the adapter is not an automatic semantic dependency checker. Missing selected agents/skills/rule groups fail before any replacement. `--check` exits nonzero on drift. Before modifying released NONoise skills, append their hashes with `node scripts/update-skill-hashes.mjs [release-skills-dir]`.

See [validation evidence](ecc-validation-goal5.md) for the installed CLI versions, real scaffolds, upgrade and discovery checks.
