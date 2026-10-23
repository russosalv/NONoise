# Install or update NONoise in a project — runbook for AI agents

> **You are an AI agent and someone pointed you at this repository with a request like
> "update", "aggiorna", "install NONoise", "installa", "aggiorna le skill", "upgrade NONoise"?**
> Follow this file. You do **not** need to clone this repo, read its source or rebuild it:
> everything is done by the published `create-nonoise` CLI, run against the user's project.

The authoritative behaviour lives in the CLI (`create-nonoise --help`). Longer human docs:
[`docs/installation.md`](docs/installation.md), [`docs/install-profiles.md`](docs/install-profiles.md).

---

## 0. Ground rules

- **Work in the user's project, not in this repo.** "Target project" below = the directory the
  user is working in (usually the current working directory). Never copy files from this repo
  into the target by hand: the CLI tracks ownership via SHA-256 hashes and managed markers, and
  hand-copied files break that.
- **Always use the latest CLI:** `npx --yes create-nonoise@latest …`. Requires Node ≥ 20.
- **Start from a clean git tree** in the target (`git status`). If it is dirty, ask the user to
  commit or stash first, so the upgrade diff can be reviewed on its own.
- **Never pass `--yes` to a scaffold over an existing directory**, and never re-scaffold an
  existing NONoise project: use `--upgrade`. Re-scaffolding would discard local customisation.
- Run non-interactively: pass the path explicitly (`--upgrade <path>`) so no prompt appears.
- Report to the user what the CLI printed (removed / preserved files, failed installers with
  their recovery commands). Do not hide warnings.

## 1. Decide which case you are in

Run in the target project root:

```bash
test -f nonoise.config.json && cat nonoise.config.json
```

| What you find | Case | Go to |
|---|---|---|
| `nonoise.config.json` exists | Existing NONoise project → **update** | §2 |
| No `nonoise.config.json`, but an existing codebase | Add NONoise to an existing repo → **install in place** | §3 |
| Empty / non-existing directory | New project → **scaffold** | §4 |
| The target *is* a clone of `russosalv/NONoise` | Contributor checkout → **refresh the monorepo** | §6 |

Useful fields in `nonoise.config.json`: `frameworkVersion` (installed NONoise version),
`aiTools`, `profile`, `stack`, `vendorMode`, `withRea`. The CLI reuses all of them on upgrade —
you normally don't need to pass any flag.

Check the latest released version with `npm view create-nonoise version`. If it equals
`frameworkVersion`, an upgrade is still safe (it is idempotent) and repairs missing pieces.

## 2. Update an existing NONoise project

```bash
# 1. diagnose (read-only)
npx --yes create-nonoise@latest doctor .

# 2. upgrade (reuses aiTools / profile / stack / vendorMode from nonoise.config.json)
npx --yes create-nonoise@latest --upgrade .

# 3. verify
npx --yes create-nonoise@latest doctor .
```

What `--upgrade` does, so you can explain the diff to the user:

- Refreshes NONoise skills in `.claude/skills/` (and `.agents/skills/` when Codex or Copilot is
  selected). Files the user modified are **preserved** and listed; retired skills are removed only
  if unmodified.
- Rewrites only the text between `<!-- nonoise:begin vX.Y.Z -->` and `<!-- nonoise:end -->` in
  `AGENTS.md`, `CLAUDE.md` (Claude Code) and `.github/copilot-instructions.md` (Copilot). Everything outside the
  markers is kept. Files without markers get a block inserted after their title.
- Re-installs vendor packs (native mode: Claude/Codex/Copilot plugins such as
  `superpowers@nonoise`, `codex@openai-codex`, `skill-creator`, plus `impeccable`), graphify
  (`graphifyy==0.9.91`), Haft, profile hooks and, if enabled, REA.
- Rewrites `nonoise.config.json` with the new `frameworkVersion`.

Optional flags (only if the user asks for them):

| Need | Flag |
|---|---|
| Add/override AI tools | `--ai claude-code,copilot,codex,cursor,gemini-cli` (merged with config) |
| Change capability profile | `--profile minimal\|core\|developer\|security\|brownfield\|full` |
| Change stack | `--stack dotnet,typescript,angular,web` |
| Enable REA | `--with-rea` |
| Offline / no upstream installers | `--vendor-mode embed` (produces a large diff; warn the user) |
| Only fix graphify | `--graphify-only .` instead of `--upgrade .` |

A profile-less 1.6/1.7 project is upgraded with `legacyProfileCompatibility` and keeps all its
old files. Only an explicit `--profile` opts it into the new catalog and its cleanup.

Then continue with §5.

## 3. Install NONoise into an existing (non-NONoise) repository

`--upgrade` also works on a directory without `nonoise.config.json` when you pass `--ai`; it
installs skills, managed instruction blocks, vendors and config **in place**, preserving
existing files:

```bash
npx --yes create-nonoise@latest --upgrade . --ai claude-code,copilot
npx --yes create-nonoise@latest doctor .
```

Ask the user which AI tools they use if it is not obvious (look for `CLAUDE.md`, `.claude/`,
`.github/copilot-instructions.md`, `AGENTS.md`, `.cursor/`, `GEMINI.md`). Add `--profile` /
`--stack` if requested (default profile: `core`).

Note: this does not create the NONoise `docs/` hierarchy or `.nonoise/sdlc-flow.md`. If the user
wants the full workspace (docs tree, Polly flow, tools), scaffold a **new** workspace next to the
repo and point it at the existing repo (§4 with `--workspace existing-single` or
`existing-multi`, interactive).

Then continue with §5.

## 4. Scaffold a new project

```bash
npx --yes create-nonoise@latest my-project --yes --ai claude-code,copilot --profile core
```

Without `--yes` the CLI asks for everything interactively (workspace kind, tools, stack,
profile, user name/locale). If npm is unavailable, use the GitHub Release tarball linked in the
[README Quickstart](README.md#quickstart).

## 5. After installing or updating: what to rebuild in the target project

Do these in order and tell the user which ones need their action:

1. **Read the CLI output.** Every failed installer prints an exact retry command — run it (or
   give it to the user if it needs credentials or an interactive harness).
2. **Run `doctor` again** and fix anything still reported `missing`, `missing/unverified` or
   `wrong version` using the command printed on the same line.
3. **Refresh the knowledge graph** if the project uses graphify (`graphify-out/` exists):
   `graphify update .` (AST-only, no API cost). If graphify was just installed and there is no
   graph yet, tell the user they can build it from their harness with the graphify skill.
4. **`.gitignore`:** make sure `*.graphify-bak` is ignored (new scaffolds do this; older
   projects need it added by hand).
5. **Restart the AI harness** (Claude Code, Copilot, Codex…) so new skills, plugins, hooks and
   MCP servers are loaded. In Claude Code the user may have to approve the project's declared
   plugins/marketplaces; in Codex, impeccable hooks must be approved in `/hooks`; REA needs its
   MCP server approved/restarted.
6. **Rebuild the project's own code only if a NONoise-managed tool changed** — e.g. run
   `npm install` inside `tools/md-extractor/` or `tools/devops-push/` if those folders changed in
   the diff. NONoise does not touch the user's application code or its build.
7. **Review the diff with the user** (`git status`, `git diff --stat`), point out preserved
   (user-modified) files listed by the CLI, then commit with a message like
   `chore: upgrade NONoise to vX.Y.Z` — only if the user asks you to commit.
8. Suggest running `/polly` (Claude Code) or "start polly" (Copilot) to continue the SDLC.

## 6. The target is a clone of this repo (contributors)

Only when the user is developing NONoise itself:

```bash
git pull
corepack enable && corepack prepare pnpm@9.12.0 --activate
pnpm install
pnpm --filter create-nonoise run build      # re-bundles skills/ and templates/ into the CLI
pnpm --filter create-nonoise exec vitest run
```

To test an unreleased CLI against a project:
`node packages/create-nonoise/bin/create-nonoise.mjs --upgrade <path>` (after the build; set
`NONOISE_MARKETPLACE_REF=<branch>` if the release tag does not exist yet). See
[`CLAUDE.md`](CLAUDE.md) for the full contributor guide.

## Quick reference

```bash
npx --yes create-nonoise@latest doctor <path>                 # read-only health check
npx --yes create-nonoise@latest --upgrade <path>              # update existing NONoise project
npx --yes create-nonoise@latest --upgrade <path> --ai <csv>   # install into an existing repo
npx --yes create-nonoise@latest --graphify-only <path>        # repair graphify only
npx --yes create-nonoise@latest <new-dir>                     # new project (interactive)
```
