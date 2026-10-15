# Native vendor installation — container validation

Validated on 2026-10-15, branch `feat/native-vendor-install`. No push, tag, release
or registry publication. CLI package version: **1.7.0 (unreleased)**.

## Build and tests

All passed:

```bash
pnpm install
pnpm --filter create-nonoise run build
pnpm --filter create-nonoise exec vitest run
pnpm -r run typecheck
node scripts/sync-vendor.mjs --all --dry-run
claude plugin validate /work
```

Vitest: **138 tests, 14 files**. Existing embed assertions remain tested with
explicit `vendorMode: 'embed'`. Native coverage includes unavailable commands,
settings merge and obsolete-hook removal, immutable marketplace pins, migration
with changed/unknown files and symlinks, managed blocks, read-only doctor,
graphify receipts, and preservation of instructions across upstream installers.
The snapshot deliberately loses embedded vendor content in the default scaffold.
Marketplace validation passes with an advisory about the optional plugin author.
All five vendor dry-runs succeed, including impeccable at `plugin/skills`.

## Real project scaffolds

Commands ran from `/projects`, with `/home/lab/.local/bin` added to PATH for uv tools:

```bash
node /work/packages/create-nonoise/bin/create-nonoise.mjs p-claude --yes --ai claude-code --no-git
node /work/packages/create-nonoise/bin/create-nonoise.mjs p-copilot --yes --ai copilot --no-git
node /work/packages/create-nonoise/bin/create-nonoise.mjs p-all --yes --ai claude-code,copilot,codex --no-git
node /work/packages/create-nonoise/bin/create-nonoise.mjs p-multi --yes --ai claude-code,copilot,codex --no-git --template multi-repo
node /work/packages/create-nonoise/bin/create-nonoise.mjs p-embed --yes --ai claude-code,copilot,codex --no-git --vendor-mode embed
```

Every command exited 0. Assertions checked version, vendor mode, absence of
embedded superpowers/pptx/skill-creator and the old impeccable subskills in native
projects, presence in embed, both NONoise markers in all three instruction files,
Claude marketplace/plugin declarations and absence of the obsolete local
superpowers hook. Native impeccable and graphify files are created by upstream
installers, not copied from the NONoise vendor bundle.

For each project, including migrated `p-legacy`:

```bash
node /work/packages/create-nonoise/bin/create-nonoise.mjs doctor /projects/PROJECT
```

All doctor commands exited 0; SHA-256 inventories before/after matched. The native
reports recognize installed superpowers, impeccable and graphify for selected
harnesses, and explicitly describe the unavailable Anthropic channel on
Codex/Copilot. Claude declarations and installed records are checked separately.

## Real plugin and graphify installation

Verified help output for `claude plugin`, `codex plugin`, `copilot plugin`, their
marketplace/install subcommands, `npx --yes impeccable install --help`, and
`graphify install --help`. Cloned upstream README/source repositories into `/tmp`:
obra/superpowers, obra/superpowers-marketplace, pbakaus/impeccable,
anthropics/skills, safishamsi/graphify; inspected Codex marketplace parsing source.
Installed CLI versions: Claude **2.1.300**, Codex **0.162.1**, Copilot **1.0.98**.

In `p-claude`, all successful:

```bash
claude plugin marketplace add /work --scope project
claude plugin install superpowers@nonoise --scope project
claude plugin install nonoise@nonoise --scope project
claude plugin list --json
claude plugin details superpowers
claude plugin details nonoise
claude plugin marketplace add anthropics/skills
claude plugin install document-skills@anthropic-agent-skills --scope project
claude plugin install example-skills@anthropic-agent-skills --scope project
```

NONoise inventory: 28 own skills. Superpowers: 5.0.7, 14 skills. Every concrete
`superpowers:*` name referenced by Polly (`brainstorming`, `writing-plans`,
`executing-plans`) exists in the installed plugin. The skill bytes also match the
pinned snapshot in Claude, Codex and Copilot installations.

In `p-all`, all successful:

```bash
codex plugin marketplace add /work --json
codex plugin add superpowers@nonoise --json
codex plugin add nonoise@nonoise --json
# Use real Git cloning of the local commit, without publishing a remote:
git config --global url.file:///work.insteadOf https://nonoise-container.invalid/NONoise.git
copilot plugin marketplace add https://nonoise-container.invalid/NONoise.git
copilot plugin install superpowers@nonoise
copilot plugin install nonoise@nonoise
copilot plugin list --json
uv tool install graphifyy==0.9.91
graphify install --project --platform claude
graphify install --project --platform codex
graphify install --project --platform copilot
graphify vscode install
```

The local Git URL rewrite is solely a container test fixture: real CLI commands,
real Git clones, real installed plugin registry, no mocked installation and no
push. Copilot lists both NONoise 1.7.0 and superpowers 5.0.7 as enabled/installed.
Graphify 0.9.91 installs into `.claude/skills`, `.codex/skills`, `.copilot/skills`;
impeccable uses `.claude/skills`, `.agents/skills`, `.github/skills` respectively.
Scaffold invokes `npx --yes impeccable install --yes --providers=claude,github,codex
--scope=project` for the combined selection; provider-specific scaffolds also pass.

## Migration and idempotence

Created a fresh project with the **published** package, not a simulated fixture:

```bash
cd /projects
npx --yes create-nonoise@1.6.0 p-legacy --yes --ai claude-code,copilot,codex --no-git
mkdir -p p-legacy/.claude/skills/my-personal
printf '%s\n' 'USER SKILL MUST SURVIVE' > p-legacy/.claude/skills/my-personal/SKILL.md
printf '\n%s\n' 'RIGA PERSONALE DA CONSERVARE' >> p-legacy/CLAUDE.md
node /work/packages/create-nonoise/bin/create-nonoise.mjs --upgrade /projects/p-legacy
node /work/packages/create-nonoise/bin/create-nonoise.mjs --upgrade /projects/p-legacy
```

First upgrade: 91 recognized vendor files removed, native dependencies installed,
managed block v1.7.0 inserted, user skill and personal line preserved. Second
upgrade: zero removals, whole-tree SHA-256 inventory identical. Tests additionally
cover modified vendor files and new files *inside* vendor directories, which
remain protected from subsequent upstream installs.

## Differences and exact observed failures resolved during validation

- `codex plugin add superpowers@nonoise --json` with a GitHub source object:
  `Error: plugin \`superpowers\` was not found in marketplace \`nonoise\``.
  Resolved using a Git URL source and immutable `sha` in both catalogs.
- Putting the SHA in `ref` caused Copilot's clone to fail:
  `warning: Could not find remote branch b55764852ac78870e65c6565fb585b6cd8b3c5c9 to clone.`
  `fatal: Remote branch b55764852ac78870e65c6565fb585b6cd8b3c5c9 not found in upstream origin`
  Resolved with `sha` alone; no vendored plugin substitute needed.
- Copilot's live local marketplace logged:
  `Dropped cached copies of repo-local marketplace plugins; they are now loaded live {"pruned_specs":"[\"superpowers@nonoise\"]"}`.
  Install reported success but list omitted superpowers. Real Git transport fixed
  this; NONoise now verifies the installed registry after a successful command.
- Copilot rejected `file:///work` as a direct marketplace source:
  `Local marketplace path does not exist: /work/file:/work`.
  The Git `insteadOf` fixture above resolves this CLI limitation.
- Graphify repeated installation changed `.claude/settings.json.graphify-bak`.
  Version/hash receipts and semantic JSON comparison fixed byte idempotence.
- Graphify replaced old `## graphify` sections through trailing personal text and
  removed NONoise end markers in fresh projects. Instruction preservation around
  the real installer fixed both native and embed paths; final fresh migration
  and full scaffold checks pass with both markers and user text intact.
- Impeccable is now one skill; upstream sync uses `plugin/skills`, not the removed
  `source/skills`. Its CLI needs `--yes` for noninteractive hook consent/defaults.
- This published 1.6.0 scaffold actually copied superpowers, impeccable and
  graphify, but did not copy pptx/skill-creator. Embed 1.7 explicitly includes both.

No required installation test remains unverified or blocked by login. Interactive
assistant sessions, actual semantic graph generation and the VS Code GUI were
outside the requested installation tests. The remote NONoise marketplace cannot
serve the new manifests until these local commits are released; no publication
was attempted. Superpowers is pinned at SHA b5576485… (5.0.7), graphify is pinned
at the explicitly requested 0.9.91, other vendor installs are unpinned.

Also ran `graphify update .` per repository instructions: exit 0. It reported the
pre-existing unsupported SQL dependency (`tree_sitter_sql not installed`), a Luau
fixture syntax warning, and legacy graph schema normalization warnings; these do
not block CLI tests. Updated graph artifacts are committed separately.

Raw command logs and whole-tree hash inventories: `/tmp/nonoise-evidence/`.
Verification scripts: `/tmp/verify-projects.py`, `/tmp/project-hashes.py`.

Schema references consulted alongside actual CLI execution:
[Claude marketplace format](https://code.claude.com/docs/en/plugin-marketplaces),
[Claude settings](https://code.claude.com/docs/en/settings),
[Codex plugins](https://learn.chatgpt.com/docs/plugins),
[Copilot plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).
