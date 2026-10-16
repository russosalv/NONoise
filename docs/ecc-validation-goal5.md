# Goal 5 validation — 2026-10-16

Specification: `/brief/GOAL5.md`. Branch: `feat/ecc-agents-rules`, baseline `f3b29d1` (unreleased 1.7.0). ECC source: `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29`, read-only `/ecc` checkout. No push, tag or publish.

## Automated checks

- `npm test`: **220 tests, 20 files passed**, including native/embed compatibility, stack selection, conversion, CLI persistence, doctor, ownership, symlink handling, deselection and upgrade regressions. Log: `/out/test-final.log`.
- `npm run typecheck`: exit 0. `pnpm --filter create-nonoise run build`: exit 0, bundled ECC with runtime `js-yaml`. Logs: `/out/typecheck-final.log`, `/out/build.log`.
- `node scripts/update-ecc.mjs /ecc b92f181b3b748d1abbc2afd94af6aa7d8c8fca29 --check`: exit 0, no diff. `git -C /ecc status --porcelain`: empty.
- Snapshot changes reviewed and refreshed deliberately. Unit regressions were observed failing before fixes: missing conversion/selection, stack removal, embed preservation/idempotence and unresolved ECC dependencies.
- Python 3.11 `tomllib` parsed all 10 generated Codex files, including escaped multiline instructions. Every generated rule link resolves (independent review probe).

## Real projects

The CLI itself created the projects, with real graphify/Haft binaries on PATH. `--vendor-mode embed` isolates ECC/scaffold verification from unrelated native plugin networks; unit tests also cover native mode. No CLI was replaced with a stub during scaffolding or upgrading.

| Project under `/projects/` | Creation / migration | Final stack | Agents Claude / Copilot / Codex | Repeated upgrade |
|---|---|---|---|---|
| `p7-all` | current CLI, all three tools | dotnet,angular | 10 / 10 / 10 | 690 file hashes identical |
| `p7-copilot-ts` | current CLI, Copilot only | typescript | 0 / 9 / 0 | 504 file hashes identical |
| `p7-none` | current CLI, all three tools | none | 8 / 8 / 8 | 546 file hashes identical |
| `p7-upgrade160-final` | `npx --yes create-nonoise@1.6.0 … --yes --ai claude-code,copilot,codex`, then current `--upgrade --stack dotnet,angular` | dotnet,angular | 10 / 10 / 10 | 688 file hashes identical |
| `p7-upgrade17` | CLI built from `git archive f3b29d1`, then current upgrade | dotnet,angular | 10 / 10 / 10 | 690 file hashes identical |

All upgrade commands exited 0. The byte comparisons cover every project file except Git internals. Both legacy projects preserve deliberately modified Polly and Superpowers brainstorming skills plus custom instruction prose. The 1.7 case also preserves an edited Copilot agent and Claude rule. Deleting a Codex agent triggers doctor; upgrade restores it. Doctor then reports exactly the two deliberate ECC modifications (214/216 current files); the clean all-tools project reports **216/216**. Evidence and replay script: `/out/real-validation.json`, `/out/real-validation.py`, `/out/p7-*-final-*.log`, `/out/p7-doctor-before-repair.log`, `/out/doctor-all.log`, `/out/doctor-upgrade17.log`.

The initial real repeat exposed an existing embed migration defect: graphify stamps were reclassified as user files on the second run, changing config. A migration receipt now prevents replaying legacy cleanup. Managed embed copies also preserve edited vendor files. The regression test and repeated real 1.6/1.7 upgrades both pass.

## Formats and discovery in installed CLIs

**Claude Code 2.1.300.** Inspected `--version`, `--help`, `agents --help`, installed package README/binary location and official [subagent documentation](https://code.claude.com/docs/en/sub-agents) / [path-scoped rules](https://code.claude.com/docs/en/memory). Agents use Markdown frontmatter `name`, `description`, `tools`; language rules retain `paths`. `claude agents` in this version lists background sessions, so it is not a custom-profile listing command. Instead, `claude -p 'Reply OK' --output-format stream-json --verbose --debug-file …` emitted its native `system/init` event containing **all 10 ECC agents and all 15 ECC skills**, then reported `apiKeySource: none` / not logged in. Log: `/out/claude-discovery.jsonl`. No authenticated inference ran.

**Copilot CLI 1.0.98.** Inspected installed README, `--help`, `help commands` (`/agent`, `/instructions`, `/env`) and `help providers`. Checked official [agent profile configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) and [CLI instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions). Generated `.github/agents/*.agent.md` with read/search/execute/edit tool aliases and `.github/instructions/*.instructions.md` with `applyTo`. The normal CLI reports no authentication and explicitly skips custom-agent loading without a backend. Its documented local BYOK mode accepts an endpoint without an API key. A loopback HTTP probe selected each of the **10 agents** with `--agent`, recorded that the complete corresponding profile body reached the model input, and returned a synthetic fixed response: **10/10, all exit 0**, no external inference. Evidence/replay: `/out/copilot-offline-discovery.json`, `/out/copilot-offline-probe.py`. This proves native parsing/discovery, not review quality from a real model.

**Codex CLI 0.162.1.** Inspected installed help, `doctor`, generated app-server TypeScript schema and binary agent-role diagnostics. Cross-checked the exact release's [agent-role loader](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/agent-roles/src/loader.rs), [directory discovery](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/agent-roles/src/discovery.rs), [configuration schema](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/core/config.schema.json), and official [standalone agent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents). The supported project format is `.codex/agents/*.toml`, with `name`, `description`, `developer_instructions`. No registration table is needed. Project trust must be recorded in the user configuration; a per-invocation trust override alone did not activate the project layer in this build. After trusting the disposable test project, a local `requires_openai_auth=false` provider captured the **native spawn tool's role registry containing all 10 agents**, returning a synthetic empty completion with zero tokens. Evidence/replay: `/out/codex-offline-discovery.json`, `/out/codex-offline-tools.json`, `/out/codex-offline-probe.py`. `codex agents` concerns sessions, not custom role validation. Codex rule loading is the explicit `AGENTS.md` → index → rule-file reading contract, not an automatic path-filter claim.

## Review and limits

An independent read-only reviewer checked the implementation and ran safety/link probes. Two important findings were corrected in the reproducible adapter: residual references to unimported ECC agents/skills, and a retrospective path that created competing ADR records instead of canonical Haft artifacts. The associated capability-type mislabels were fixed in the same adaptation pass. A new regression test fails on those dependencies and competing paths, then passes after regeneration. No deferred findings remain within this goal.

`/home/lab/.local/bin/graphify update .` completed successfully before the final commit: 8,995 nodes, 15,662 edges, 663 communities. It reported optional SQL parser absence, a pre-existing Luau fixture syntax issue and unclassified/template or symbol-free files; this is an AST update, not a semantic/document rebuild. Log: `/out/graphify-update.log`.

Remaining external verification: authenticated model execution and actual reviewer output quality on Claude/Copilot/Codex; offline probes establish discovery and serialization only. A fresh Haft project still needs application-specific onboarding (`profile_underdetermined` is reported by its spec status), outside this ECC integration. Existing native installer/template policies remain outside the targeted asset-conversion change. No credentials were added to generated files.
