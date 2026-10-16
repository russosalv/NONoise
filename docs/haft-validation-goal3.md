# Haft integration: container validation, 2026-10-16

Validation started from `8b500d0` on `feat/native-vendor-install`, using Linux
x64, Node 22, Claude Code 2.1.300, Codex 0.162.1 and Copilot CLI 1.0.98.
The prepared release reports `haft 9.1.1-nonoise.1`. `/haft-src` remained clean.
No push, publish or tag was performed. The package remains unreleased 1.7.0.

## Setup and reproducible commands

```sh
git config --global user.name 'NONoise validation'
git config --global user.email 'validation@example.invalid'
git config --global --add url.file:///work.insteadOf https://github.com/russosalv/NONoise
git config --global --add url.file:///work.insteadOf https://github.com/russosalv/NONoise.git
npm config set prefix /home/lab/.npm-global
export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
python3 -m http.server 8765 --bind 127.0.0.1 --directory /haft-release
# In the CLI test shell:
export NONOISE_HAFT_BASE_URL=http://127.0.0.1:8765
```

The Git rewrite replaces the NONoise marketplace with this local repository;
other vendor sources retain their normal URLs. The release HTTP log contains
exactly one request each for checksums and the real Linux amd64 tarball across
all projects. A separate server on port 8766 supplies deliberately invalid bytes.
The fork is unpublished: the public release URL was not claimed as tested.

```sh
pnpm install
pnpm --filter create-nonoise build
pnpm -r run typecheck
pnpm -r run test
cd packages/create-nonoise
npm pack --pack-destination /tmp/goal3-evidence
npm install -g /tmp/goal3-evidence/create-nonoise-1.7.0.tgz
cd /projects
create-nonoise p4-claude --yes --ai claude-code
create-nonoise p4-all --yes --ai claude-code,copilot,codex
create-nonoise p4-multi --yes --template multi-repo --ai claude-code,copilot,codex
create-nonoise p4-copilot --yes --ai copilot
create-nonoise p4-embed --yes --vendor-mode embed --ai claude-code,copilot,codex
```

Install/build/typecheck passed; Vitest passed **180 tests in 15 files**, none
skipped. Snapshot changes reflect the rewritten skills and template text;
the doctor assertion was extended to allow only its new read-only commands.
The skill-creator validator also passed for `quint-fpf` and `arch-decision`.
Pack and global install passed, including a final pack of the completed sources.

## Project and host results

All five scaffold commands exited 0. The single-project fixtures initialized
Haft and generated the expected MCP configuration and all 12 selected host
skills. `p4-multi` correctly reported its missing Git prerequisite: the existing
multi-repo `--yes` default does not initialize Git. Test setup then ran
`git init -b main`, `git add .`, `git commit -m 'test: prepare multi-repo Git prerequisite'`
inside that fixture; these are test operator actions, not installer behavior.

An early multi-repo recovery exposed an upstream successful exit without project
state. The installer now reports the upstream output and refuses to create a
Copilot MCP entry before project state exists (covered by a regression test).
The early fixture was repaired with direct explicit Haft init. A fresh
`p4-multi-clean`, created with the final package and the same template/flags,
completed upgrade after Git preparation with no manual Haft repair.
Both multi-repo fixtures passed two subsequent upgrades, single occurrences of
both instruction markers, full file-hash equality and read-only doctor checks.

`claude mcp list` shows `haft serve — Pending approval`; `codex mcp list` shows
`haft` enabled (`Auth Unsupported`, its stdio authentication column).
Codex requires project trust before loading `.codex/config.toml`.
Copilot `mcp get haft --json` and `skill list --json` find the shared `.mcp.json`
server and exactly 12 `h-*` skills from `.agents/skills` after folder trust.
Trust was configured only in the isolated test home, never by NONoise.
See [cross-tool contracts and official sources](cross-tool.md#haft-fpf-integration).

The actual `haft serve` subprocess passed JSON-RPC `initialize`, `tools/list`
(12 tools, including `haft_query`) and `tools/call` with `haft_query(action=status)`.
`create-nonoise doctor /projects/<fixture>` reports the pinned version, host
carriers and valid `haft spec status --json`. The status is
`profile_underdetermined`: successful transport is not completed onboarding or
authority to bind a decision.

## Migration, corruption and limitations

The original HEAD package was packed before edits and extracted under
`/tmp/goal3-evidence/baseline/package`. It created `p4-before17-final` with
`node .../bin/create-nonoise.mjs p4-before17-final --yes --ai claude-code,copilot,codex --vendor-mode embed`.
The other baseline used
`npx --yes create-nonoise@1.6.0 p4-legacy-final --yes --ai claude-code,copilot,codex`.
Both received custom `.quint/user.md`, a historical FPF audit, a user q-command
and a modified shipped q-command before `create-nonoise --upgrade /projects/<name>`.
Known q-command bytes were removed; all custom data stayed at its original path.
Second upgrades changed **0 of 372** and **0 of 402** files respectively,
including both NONoise and Haft instruction blocks. Existing vendor files whose
hashes were unknown were also preserved.

`python3 /tmp/goal3-evidence/bad-checksum.py` used a separate invalid release:
SHA256 mismatch refused extraction, preserved the machine binary, and let the
embed scaffold exit 0 with exact upgrade/doctor recovery commands. Unit tests
also verify transient retry, permanent 404, platform selection, Windows/WSL,
MCP conflicts, failed/no-op init, symlinks and legacy-ledger protection.

Authenticated Copilot invocation was attempted with
`copilot -p 'Use only the Haft MCP read-only haft_query action status, then report its result. Do not modify files.' --allow-tool haft --disable-builtin-mcps --no-ask-user`.
It exited 1: **`Error: No authentication information found.`**
`copilot config trustedFolders` also failed:
`Error: Unknown settings key segment "trustedFolders" at "<root>".`
The fixture used the documented `trustedFolders` JSON setting instead.
Authenticated model/tool execution remains for the user's login; native macOS
and ARM execution and a real Windows/WSL session were unavailable (unit coverage
only). No live architectural decision was bound as part of installation tests.

Commands, logs, protocol results and hash comparisons are collected in
`/out/goal3-evidence/`. The final Italian report is `/out/final3.md`.
