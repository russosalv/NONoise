# Installation, repository layout, and the dev loop

This document covers two distinct audiences:

1. **Users scaffolding a project** with NONoise — install, scaffold, what you get, how to start.
2. **Framework contributors** — repository layout, dev loop for adding or modifying skills, release tooling.

---

## Part 1 — Installing and scaffolding

### Prerequisites (user side)

- **Node ≥ 20** — required to run `npx create-nonoise`.
- **Git** — the scaffold initialises a Git repo.
- **An AI tool with a project-level context mechanism.** V1 first-class: Claude Code or GitHub Copilot. V1 best-effort: Cursor, Gemini CLI, Codex. See [`cross-tool.md`](cross-tool.md).
- **Haft** (FPF runtime) — installed automatically by scaffold and `--upgrade` on Linux (amd64/arm64) and macOS arm64; Windows needs WSL. It is used only when a decision goes through formal validation (the FPF gate). See [Haft: required FPF runtime](#haft-required-fpf-runtime-170).
- **Code graph** (`codebase-memory-mcp`) — on macOS, Linux and native Windows. Not pinned: scaffold installs the latest release (`npm install -g codebase-memory-mcp@latest`) only when no binary answers on `PATH`, and `--upgrade` moves it to the latest release. The npm global bin directory must be on `PATH`. Python and `uv` are not needed. See [Code graph: codebase-memory-mcp](#code-graph-codebase-memory-mcp-19).
- **Network access to upstream installers** for the default native vendor mode (Claude/Codex/Copilot plugin CLIs, `npx`, `npm`); use `--vendor-mode embed` offline.

Optional (scaffolded but advisor-only — you install if and when you need them):

- **LlamaCloud API key** — if using `tools/md-extractor/` for PDF / DOCX ingestion. The tool prompts for the key; the scaffold does not store it.
- **Playwright** — installed automatically the first time `atr` runs; brings its own browsers.
- **Voice-to-text** — Wispr Flow / Handy / Superwhisper / native Copilot transcription. Polly mentions; you install. See [`external-tools.md`](external-tools.md).

### Scaffolding a new project

```bash
npx create-nonoise my-project
```

The CLI walks through:

1. Project name (defaults to the folder name if you cd'd first).
2. Which AI tools your team uses — tick any combination of Claude Code (first-class), GitHub Copilot (first-class), Cursor / Gemini CLI / Codex (best-effort in v1).
3. Single-project vs multi-repo workspace template. Multi-repo scaffolds `repositories.json` and helper scripts; skills live at workspace root.
4. Language hint for `vscode-config-generator` (Node / .NET / Python / skip).
5. Optional preferences recorded in `nonoise.config.json`.

Then the scaffold runs, bundling:

- `src/` — empty placeholder for your code.
- `docs/` — the six-folder source-of-truth tree (see [`docs-hierarchy.md`](docs-hierarchy.md)).
- `.claude/skills/` — the NONoise skill library (Polly + specialists); third-party skills use native installers by default. See [`skills-catalog.md`](skills-catalog.md).
- `.agents/skills/` — a copy of the NONoise skills when Codex or Copilot CLI is selected (the directory those harnesses read).
- Agents — `.claude/agents/` (Claude Code), `.github/agents/` (Copilot), `.codex/agents/` (Codex): the three NONoise agents plus the ECC agents of the selected profile and `--stack`; none for Cursor and Gemini CLI, none in the `minimal` profile. The roster is `.nonoise/ecc/index.md`. See [`agents.md`](agents.md).
- `.claude/commands/` + `.claude/settings.json` (Claude Code selected).
- Project-local MCP config for the code graph — `.mcp.json`, `.vscode/mcp.json`, `.codex/config.toml`, `.cursor/mcp.json`, `.gemini/settings.json`, according to the selected tools (not in the `minimal` profile).
- `CLAUDE.md` (Claude Code selected).
- `.github/copilot-instructions.md` (Copilot selected).
- `AGENTS.md` (industry-standard, always written).
- `.cursor/rules.md`, `GEMINI.md` as appropriate.
- `tools/md-extractor/` — Node CLI for ingesting PDF / DOCX / images via LlamaCloud Agentic API.
- `tools/devops-push/` — Node CLI for pushing sprint task breakdowns to Azure DevOps.
- `nonoise.config.json` — project-level settings (installed packs, selected tools, scaffold-time choices).
- `.nonoise/sdlc-flow.md` — SDLC flow file Polly reads to detect your current phase and suggest the next skill. Each phase lists the [development modes](development-modes.md) (quick / medium / long) it belongs to.

### First session

```bash
cd my-project
# Open in your preferred tool:
code .          # Claude Code in VS Code, or Copilot
claude          # Claude Code CLI
cursor .        # Cursor
# or paste the project folder into Gemini CLI / your Codex-style agent
```

Invoke Polly whenever you're unsure what to do next:

- **Claude Code:** `/polly`
- **Copilot:** "start polly" / "avvia polly"
- **Cursor / Gemini / Codex:** open `.claude/skills/polly/SKILL.md` and ask the model to follow it.

Polly reads `.nonoise/sdlc-flow.md`, detects your current phase, and produces a one-shot 4-block message: where you are, what skill to engage next, a copy-pasteable prompt, and an offer to delegate. One message per invocation. `/polly quick|medium|long <goal>` sizes the process to the task — see [`development-modes.md`](development-modes.md).

Build the code graph once (`/index` in Claude Code, "index this repository" elsewhere). After the first index it stays in sync while a session is open.

### Native vendor installation and upgrades (1.7)

```bash
npx create-nonoise my-project --yes --ai claude-code,copilot,codex
npx create-nonoise --upgrade my-project
npx create-nonoise doctor my-project
npx create-nonoise offline-project --vendor-mode embed --yes
```

`native` is the default for new projects and upgrades, including legacy projects:
vendor packs come from their upstream installers and plugin registries.
`embed` is the offline fallback and must be explicitly selected, also for an
upgrade. The CLI still bundles vendor snapshots for this fallback; native
scaffolds do not copy them.

NONoise's own 27 skills are copied to `.claude/skills/` and, when Codex or
Copilot CLI is selected, also to `.agents/skills/` — the directory those
harnesses read repository skills from. Both modes do this.

#### Switching from native to embed

`create-nonoise --upgrade --vendor-mode embed <project>` replaces vendor skill
files with the snapshot shipped in that NONoise release. For Impeccable, native
uses the upstream installer and its published, provider-specific bundle; embed
copies `plugin/skills/impeccable` at the commit recorded in `VENDOR.json`. These
can differ in version and command paths even when they expose the same skill.
The switch can therefore produce many real Git changes, and can select an older
version than the native installer. Review that diff before committing it.

For example, the 2026-10-16 check compared native Impeccable 4.6.0 with NONoise's
embedded 4.5.2 snapshot at `abf5779cabc20147fd9c013fa4705088c200bf8a`: 17 of 57
common files differed, including reference instructions and command paths.
The other 40 files produced no Git diff; repeating the embed copy produced no
diff either. This is an expected change of distribution, not a Git content
change caused by rewriting identical files. See the
[issue #6 verification report](notes/issue-6-esito.md) for the reproduction.

#### Installer backups and skill symlinks

Projects scaffolded before 1.9 may contain `*.graphify-bak` files and the matching
ignore rule: graphify wrote these rolling backups before changing hook/settings
JSON. Graphify is no longer installed, so nothing creates them any more and new
scaffolds no longer write the ignore rule.

`create-nonoise doctor <project>` reports broken symlinks within the selected
tools' skill directories, including both `.agents/skills` and `.codex/skills`
for Codex, and both `.github/skills` and `.copilot/skills` for Copilot. Each
diagnostic includes the link path, its target, and guidance to restore the target
or recreate the link with the correct path. This check also runs in embed mode,
handles nested and cyclic links, and never repairs or deletes files. Valid
directory symlinks are checked but not traversed.

#### Native channels

| Component | Native setup |
|---|---|
| Superpowers | `superpowers@nonoise` via the NONoise marketplace; Git URL + immutable SHA `b55764852ac78870e65c6565fb585b6cd8b3c5c9` (5.0.7) |
| Claude documents / skill creator | `document-skills@anthropic-agent-skills` from `anthropics/skills`; `skill-creator@claude-plugins-official` from `anthropics/claude-plugins-official` |
| Impeccable | `npx --yes impeccable install --yes --providers=claude,codex,github --scope=project` (selected providers only); one `/impeccable` skill with subcommands |
| Code graph | `npm install -g codebase-memory-mcp@latest` (not pinned: only when no binary is on `PATH` at scaffold, always on `--upgrade`), then the MCP server `codebase-memory-mcp` is registered in the project-local config of the selected tools; same in native and embed mode. See [Code graph: codebase-memory-mcp](#code-graph-codebase-memory-mcp-19) |
| Orchestration (Claude Code) | `regia@claude-regia`, the Regia mod from marketplace `russosalv/claude-regia`; declared in `.claude/settings.json` in both modes, installed only in native mode; not pinned. See [`regia.md`](regia.md) |

Claude's `.claude/settings.json` merges `extraKnownMarketplaces` and
`enabledPlugins`, so teammates can approve the declared installs when opening
the project. Unrelated settings are preserved. Scaffold and upgrade also execute
the following commands immediately when Claude is available, then confirm each
installation with `claude plugin list --json` in the current project:

```bash
claude plugin marketplace add russosalv/NONoise#v1.8.0
claude plugin install superpowers@nonoise --scope project
claude plugin marketplace add anthropics/skills
claude plugin install document-skills@anthropic-agent-skills --scope project
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin install skill-creator@claude-plugins-official --scope project
claude plugin marketplace add russosalv/claude-regia
claude plugin install regia@claude-regia --scope project
claude plugin list --json
```

For Codex the CLI runs `codex plugin marketplace add russosalv/NONoise@v1.8.0`,
then `codex plugin add superpowers@nonoise`; for Copilot it runs
`copilot plugin marketplace add russosalv/NONoise`, then
`copilot plugin install superpowers@nonoise`.

The NONoise marketplace is pinned to the CLI's own release tag
(`russosalv/NONoise#v<version>` for Claude, `russosalv/NONoise@v<version>` for
Codex), so a CLI never installs plugins from a newer or older manifest. Copilot
has no ref syntax and reads the default branch. Maintainers validating an
untagged branch can override the ref with `NONOISE_MARKETPLACE_REF=<branch>`.

Regia is the orchestration layer for Claude Code: `/regia long|medium|quick`,
model and effort per task, swarms of Claude, Codex, Qwen Code and Copilot agents (see
[`regia.md`](regia.md)). It has no ref: like any Claude plugin it follows its own
marketplace and updates on its own. Embed mode stays offline: the plugin is only
declared in `.claude/settings.json`, and Claude Code offers it when the project is
trusted. Regia is Claude-Code-only; the other tools get no orchestration plugin.

NONoise no longer installs the Codex plugin `codex@openai-codex`. Regia installs
it on its first interactive session when the `codex` CLI is on the machine. A
Codex plugin that an earlier NONoise version installed or declared is left as it is.

Regia replaces the hand-over skills, which are no longer shipped: `swarm-router`,
`copilot-delegate` and `gemini-delegate` (and `codex-delegate`, retired in 1.7).
`--upgrade` removes copies that match a shipped version and preserves (and lists)
modified ones. Profile-less 1.6/1.7 upgrades defer this cleanup, as described below.
Already registered marketplaces and confirmed installations are reused.
Transient DNS, connection, timeout and HTTP 5xx failures in marketplace/plugin,
impeccable installers get two retries, after 1 and 2 seconds. Other errors
return immediately. The old `example-skills` declaration and any installation
scoped to this project are removed during native upgrade; unrelated plugins remain.
The official [standalone skill-creator plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator)
avoids installing the other example skills and their conflicting frontend-design.
Embed snapshots were refreshed on 2026-10-15: impeccable is one skill, superpowers
is 7.0.0 (skills and hooks; upstream no longer ships commands or agents). Historical
1.6.0 hashes, including all 18 impeccable directories, remain available for migration.
After vendor refreshes run `node scripts/update-vendor-hashes.mjs` to append ownership hashes. Missing commands and installer failures
are non-fatal and printed with exact retry commands. `doctor [path]` only reads
project files, native `plugin list --json` output and `codebase-memory-mcp --version`; catalog
availability is not reported as installation. It checks the NONoise skills in
the directory each selected harness reads (`.claude/skills` for Claude Code,
`.agents/skills` for Codex and Copilot CLI). Disabled or unconfirmed plugins
are reported as missing/unverified. Codex/Copilot have no Anthropic plugin channel
configured here; use Claude or the explicit embed fallback for pptx/skill-creator.
Cursor/Gemini have the native impeccable installer and the code-graph MCP config but
no superpowers plugin channel in this CLI; use embed if they need that pack.


The native Superpowers dependency remains at the existing 5.0.7 immutable pin;
the refreshed offline embed snapshot is 7.0.0. All seven concrete Superpowers
skill names referenced by NONoise exist in both versions. Changing an existing
native installation version is intentionally outside this embed refresh.

The repo also exposes its own skills as `nonoise@nonoise` for all three plugin
CLIs. Installing that plugin is optional for scaffold users, who already have
the same NONoise skills locally. For local marketplace development use `/work`
or your checkout path instead of `russosalv/NONoise`.

Upgrade preserves text outside NONoise markers in CLAUDE.md, AGENTS.md and
`.github/copilot-instructions.md`. Files without markers retain their entire old
content and receive a current block after the title. An incomplete block is an
error rather than permission to overwrite text. User preferences stay outside
the managed block. Skill names and workflows are unchanged.

Profile-less 1.6/1.7 upgrades defer legacy vendor, Quint and retired-skill cleanup to preserve all existing files. An explicit `--profile` selects the new catalog and permits the normal hash-protected migration. Legacy cleanup checks frozen SHA-256 fingerprints of 1.6.0 vendor files,
including namespaced and flat impeccable layouts, ancillary superpowers files,
and graphify platform copies. It deletes only exact matches and empty vendor
directories, never traverses symlinks, and lists removals and modifications.
Preserved modified vendor files are recorded in `preservedVendorFiles`; native
installers that would overwrite those impeccable paths are deferred.
Resolve those files and remove the corresponding entries to enable installation.
New user files are never inferred to belong to NONoise from their name alone.
Run upgrade twice to check stable project output.

For VS Code, `code --install-extension renaissance-geek.impeccable` remains a
separate editor choice. Codex impeccable hooks require approval in `/hooks`
inside the harness, as upstream documents.

---

## Part 2 — Repository layout (framework internal)

```
NONoise-frmw/
├── .changeset/                        # Changeset entries for versioning
├── .github/                           # CI workflows
├── docs/                              # This documentation (and site source)
│   ├── README.md                      # TOC
│   ├── overview.md
│   ├── philosophy.md
│   ├── sdlc.md
│   ├── polly.md
│   ├── development-modes.md
│   ├── team-model.md
│   ├── skills-catalog.md
│   ├── agents.md
│   ├── docs-hierarchy.md
│   ├── cross-tool.md
│   ├── external-tools.md
│   ├── installation.md
│   └── superpowers/specs/             # Framework-internal specs
├── logos/                             # nonoise-cat.png, nonoise-logo-*.png
├── packages/
│   ├── create-nonoise/                # The CLI
│   │   ├── bin/create-nonoise.mjs     # CLI entry
│   │   ├── src/
│   │   │   ├── index.ts               # main()
│   │   │   └── …
│   │   ├── scripts/bundle-assets.mjs  # Pulls skills + templates into dist/
│   │   ├── vitest.config.ts
│   │   └── package.json
│   ├── skills/                        # NONoise-native skills (27 shipped in scaffolds)
│   │   ├── _agents/                   # NONoise agent sources (graph-explorer, blueprint-architect, evidence-reviewer)
│   │   ├── _shared/                   # Cross-skill references
│   │   ├── arch-brainstorm/
│   │   ├── arch-decision/
│   │   ├── atr/
│   │   ├── bmad-advanced-elicitation/
│   │   ├── bmad-agent-analyst/
│   │   ├── bmad-agent-architect/
│   │   ├── bmad-agent-tech-writer/
│   │   ├── bmad-agent-ux-designer/
│   │   ├── bmad-req-validator/
│   │   ├── c4-doc-writer/
│   │   ├── codebase-memory/
│   │   ├── design-md-generator/
│   │   ├── docs-md-generator/
│   │   ├── docs-steward/
│   │   ├── frontend-design/
│   │   ├── observability-debug/
│   │   ├── ops-skill-builder/
│   │   ├── playwright-cli/
│   │   ├── polly/
│   │   ├── quint-fpf/
│   │   ├── requirements-ingest/
│   │   ├── reuse-first/
│   │   ├── reverse-engineering/
│   │   ├── skill-finder/
│   │   ├── spec-to-workitem/
│   │   ├── sprint-manifest/
│   │   ├── vscode-config-generator/
│   │   └── vendor/
│   │       ├── superpowers/           # 15 skills from obra/superpowers
│   │       │   ├── hooks/
│   │       │   ├── skills/
│   │       │   └── VENDOR.json        # Pinned commit
│   │       ├── impeccable/            # One unified Impeccable skill
│   │       ├── skill-creator/         # Anthropic's meta-skill
│   │       └── pptx/                  # Office tooling
│   └── templates/
│       └── single-project/
│           ├── _always/               # Always-on assets
│           │   ├── AGENTS.md.hbs
│           │   ├── docs/              # 6-folder scaffolded hierarchy
│           │   ├── src/
│           │   ├── tools/             # md-extractor + devops-push
│           │   └── nonoise.config.json.hbs
│           ├── _if-claude-code/       # CLAUDE.md.hbs + .claude/
│           ├── _if-copilot/           # .github/copilot-instructions.md.hbs
│           ├── _if-cursor/            # .cursor/rules.md.hbs
│           ├── _if-codex/             # AGENTS.md stanzas
│           └── _if-gemini-cli/        # GEMINI.md.hbs
├── scripts/
│   └── sync-vendor.mjs                # Refresh vendored superpowers / impeccable
├── package.json                       # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md                          # Entry-point README (slim)
└── LICENSE                            # MIT + ATTRIBUTION.md (future)
```

---

## Part 3 — Dev loop (framework contributor)

### Prerequisites (contributor side)

- **Node ≥ 20**.
- **pnpm 9.12.0** — pinned via `packageManager` in `package.json`. Use corepack or install explicitly.
- **Git**.
- Optional: **Claude Code** — to dogfood the skills and use `superpowers:writing-skills` on your own SKILL.md.

### Install and bootstrap

```bash
pnpm install
```

Installs workspace deps for `packages/create-nonoise` and any sibling packages.

### Build the CLI

```bash
pnpm --filter create-nonoise run build
```

- Compiles TypeScript from `packages/create-nonoise/src/` to `packages/create-nonoise/dist/`.
- Runs `scripts/bundle-assets.mjs` which pulls `packages/skills/` + `packages/templates/` into the distributable bundle.

### Tests

```bash
pnpm --filter create-nonoise exec vitest run       # CLI tests (unit, integration, snapshot)
pnpm -r run test                                   # every package's tests
pnpm -r run typecheck                              # typecheck all
```

The CLI test suite is a snapshot-based integration suite: it scaffolds projects against known combinations of tool selections and asserts the output matches pinned snapshots. When a bundled skill or template changes, a snapshot will fail — that's intentional. Update the snapshot deliberately, review the diff in PR.

### Refresh vendored packs

```bash
node scripts/sync-vendor.mjs --all
node scripts/update-vendor-hashes.mjs
```

Fetches each configured upstream `ref` (Superpowers, Impeccable, skill-creator and pptx), writes the fetched revision to `VENDOR.json`, and refreshes its scoped contents. The second command appends current ownership hashes without dropping historical migration entries (the graphify hashes stay in the table so upgrades can still remove unmodified copies). Re-run tests and review the resulting diff before committing.

The code graph is not a vendored pack: its version is the `CBM_VERSION` constant in `packages/create-nonoise/src/codebase-memory.ts`.

**Review tip.** Vendor diffs are large; use `git diff --stat packages/skills/vendor/` to get a sense of scope. Read the upstream changelogs before bumping.

### Authoring a new skill

1. Create `packages/skills/<your-skill>/SKILL.md` with YAML frontmatter:

   ```markdown
   ---
   name: your-skill
   description: One-line purpose + trigger phrases that any AI tool can match on (e.g., "use this when X", "invoke on Y").
   ---

   # Your Skill — one-line title

   Body explaining what the skill does, the steps, the deliverables.
   ```

2. Add sub-assets under `packages/skills/<your-skill>/references/`, `assets/`, `scripts/` as needed.

3. If the skill should ship in scaffolded projects, add its name to `MVP_SKILL_BUNDLE` in `packages/create-nonoise/src/skill-bundle.ts` (the single source of truth used by scaffold and upgrade). `bundle-assets.mjs` copies the whole skills directory into the CLI, but only listed skills are installed.

4. Rebuild and test:

   ```bash
   pnpm --filter create-nonoise run build
   pnpm --filter create-nonoise exec vitest run
   ```

5. Dogfood with `superpowers:writing-skills` from inside this repo (NONoise is self-hosting — it uses its own tooling). That skill lints your SKILL.md and runs pressure-scenario tests against your description-as-trigger surface.

6. Add a changeset: `pnpm changeset`. Describe the change, pick a semver bump.

7. Open a PR. Expect review focused on (a) alignment with pair-vs-solo philosophy where applicable, (b) cross-tool support (both Claude Code and Copilot must work), (c) skill shipped as plain Markdown with progressive disclosure (description = trigger; body = full instructions).

### Release

1. `pnpm version` — applies any changesets, bumps versions. In the same commit, update the GitHub Release tarball URL (`releases/download/v<NEW>/create-nonoise-<NEW>.tgz`) in `README.md` and `packages/create-nonoise/README.md`.
2. Push the Git tag `v<NEW>` **before** publishing to npm: native mode pins the NONoise marketplace to that tag, so without it `superpowers@nonoise` cannot be installed.
3. `pnpm release` — publishes to npm (CI-driven in most cases); write the GitHub release notes based on the changeset content and attach the tarball.
4. Update `packages/skills/<modified>/VENDOR.json` pins if any vendored pack bumped.
5. If a breaking change for scaffolded-project users, add a migration note to `docs/overview.md` §"Feedback incorporated".

### Self-hosting (dogfooding)

This repository is itself a NONoise project:

- `.claude/` is present at the repo root; the skills inside are the live copies.
- The code graph of the repo itself is built with `codebase-memory-mcp` (`index_repository`); the index lives in `~/.cache/codebase-memory-mcp/`, not in the repository.
- `CLAUDE.md` at the repo root is the context file for Claude Code working on NONoise.
- Polly can be invoked on this repo: `/polly` asks greenfield-vs-brownfield and walks the SDLC for changes to NONoise itself.

The self-hosting means skill authors test skills on a real project (NONoise's own codebase) before shipping them to users.

### Common contributor tasks

| Task | How |
|---|---|
| Add a new native skill | Create `packages/skills/<name>/SKILL.md` + rebuild + test |
| Modify a bundled skill | Edit the SKILL.md; rebuild will reflect it in the next scaffold |
| Update a vendored pack | Edit `VENDOR.json` pin + `node scripts/sync-vendor.mjs` + review diff |
| Add a new template variant | Create `packages/templates/<variant>/` + wire the CLI prompt |
| Change the six-folder `docs/` hierarchy | Edit `packages/templates/single-project/_always/docs/` + update [`docs-hierarchy.md`](docs-hierarchy.md) |
| Add a cross-tool scaffold target | Create `packages/templates/single-project/_if-<tool>/` + update CLI prompt + extend [`cross-tool.md`](cross-tool.md) |
| Run the public site preview locally | See `D:/DEV/NONoise-frmw-site/` README; the site consumes these `docs/` files |

### Indexing this repo in the code graph

```bash
codebase-memory-mcp cli index_repository --repo-path .
```

Needed once per machine; after that the graph stays in sync while a session is open. `get_architecture` (languages, packages, routes, hotspots, clusters) is a sanity check that the architecture hasn't drifted after a large refactor or before a release.

Note: the `graphify-out/` folder still present in the repository is output of the retired graphify tool. Nothing reads it any more.

### Site source material

This `docs/` folder doubles as the source material for the public site at [NONoise-frmw-site](https://github.com/russosalv/NONoise-frmw-site). When the site is rebuilt:

- Copy or transform from these files; do not hand-edit the site's `src/content.js` and let it drift.
- The site's `content.js` is a bilingual dictionary (it / en); the content authored here is English. Italian translations are derived per-section at site-build time (manual for now; a translation pipeline is roadmap).
- The site's visual variants (Editorial / Instrument / Blueprint) consume the same content — structure content here in a way that survives multiple rendering treatments.

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `pnpm install` fails with version mismatch | wrong pnpm version | `corepack enable; corepack prepare pnpm@9.12.0 --activate` |
| CLI test snapshots fail unexpectedly | a vendored pack bumped | `git diff packages/skills/vendor/` to see; update snapshots deliberately |
| Scaffolded project is missing a skill | `bundle-assets.mjs` didn't pick it up | check the glob; sometimes a new top-level folder needs explicit inclusion |
| Polly can't find the SDLC flow | `.nonoise/sdlc-flow.md` missing | Polly falls back to the embedded default and mentions the missing file; create one from `packages/skills/polly/references/sdlc-flow.default.md` |
| The code-graph tools (`get_architecture`, `search_graph`, …) are not available in the AI tool | the project MCP server is not approved, the session was not restarted, or the binary is missing | restart the AI tool and approve the project MCP server; `create-nonoise doctor .`; meanwhile the same tools run as `codebase-memory-mcp cli <tool>` |
| `codebase-memory-mcp` is missing, or `doctor` reports it older than 0.12.0 | `npm install -g` failed, the npm global bin directory is not on `PATH`, or an old binary was already installed and left alone | fix `PATH`, then `create-nonoise --code-graph-only <path>` (or `npm install -g codebase-memory-mcp@latest`) |
| Upgrade reports an existing `codebase-memory-mcp` entry or unreadable file kept | an MCP config file already holds a different entry for that server, or is not valid JSON | point the entry at `codebase-memory-mcp` (no args), then `create-nonoise --code-graph-only <path>` |
| `doctor` reports graphify leftovers | graphify skill folders from an earlier version are still in the project | `create-nonoise --code-graph-only <path>` retires unmodified copies; a modified copy is kept, delete it when no longer needed |
| `superpowers@nonoise` install fails with an unknown ref | the CLI version's tag `v<version>` is missing from the repository | push the tag; for an untagged branch set `NONOISE_MARKETPLACE_REF=<branch>` |
| After native → embed → native upgrades, `npx impeccable install` stays PENDING ("Preserved modified legacy impeccable files") | known issue [#8](https://github.com/russosalv/NONoise/issues/8): files written by the native installers are recorded as preserved user files in `preservedVendorFiles` | delete `.claude/skills/impeccable` and `.agents/skills/impeccable`, remove the matching entries from `preservedVendorFiles` in `nonoise.config.json`, rerun `--upgrade` |
| `upgrade` reports a preserved `swarm-router`, `copilot-delegate`, `gemini-delegate` or `codex-delegate` skill | the skill is retired but was modified locally, so it is not removed | in Claude Code use Regia instead ([`regia.md`](regia.md)) and delete the folder once the local changes are no longer needed |
| `doctor` reports `regia@claude-regia: missing/unverified` | the plugin installation failed or was never approved (native mode) | run the two `claude plugin` commands printed on the same line, or `create-nonoise --upgrade <path>`; restart Claude Code |

---

## Attribution and licence

The framework is MIT-licensed (see `LICENSE` — landing with the first tagged release). Use of the framework or its methodology requires visible attribution per `ATTRIBUTION.md`:

- A "powered by NONoise" note in the project README.
- Attribution in "About" / credits in user-facing applications.
- Attribution in marketing / slides / case studies that reference the architecture or methodology.

Full attribution terms in `ATTRIBUTION.md` (landing with the first tagged release).

### Verified upstream compatibility notes

The 1.7 container checks used Claude Code 2.1.300, Codex 0.162.1 and Copilot 1.0.98.
The common marketplace uses `source: "url"` plus `sha`; Codex 0.162.1 did not
resolve the `source: "github"` form. Do not put a raw SHA in `ref`: Copilot
passes it to `git clone --branch`. SHA-only Git URL sources worked in all three.
Copilot 1.0.98 prunes remote plugin entries when their marketplace is registered
as a live local directory. For local validation, register through Git transport;
normal deployment uses the hosted repository. See [container validation](native-vendor-validation.md).

NONoise never runs upstream `codebase-memory-mcp install`: that command edits
user-global agent configuration and hooks. The server entry is written only to
the project-local MCP config files, and an entry that already exists is never
rewritten. Use `--code-graph-only` to move the binary to the latest release and
repair the project config.

## Haft: required FPF runtime (1.7.0)

Haft is the runtime for formal FPF validation. Since 1.9 `arch-decision` runs it
only when the FPF gate fires (see [FPF gate and development modes](#fpf-gate-and-development-modes-19));
a lightweight decision needs no Haft runtime. The installation below is unchanged.

Scaffold and `--upgrade` install Haft in both native and embed modes. The temporary
MIT fork `russosalv/haft`, pinned to `v9.1.1-nonoise.1`, fixes the validity dates
that make upstream v9.1.0 initialization fail after 2026-09-18 (upstream #122).
The fork is published as a standalone repository (not a GitHub fork) at
[`russosalv/haft` v9.1.1-nonoise.1](https://github.com/russosalv/haft/releases/tag/v9.1.1-nonoise.1).
Linux assets are built outside CI; darwin-arm64 is built by the manual
`nonoise-darwin.yml` workflow on a macOS runner, which appends its line to
`checksums.txt`. The inherited upstream workflows are disabled in that repository.
The fork adds schema migration 60: returning to upstream requires an upstream
release that includes it. Maintainers can then change `HAFT_REPO` and `HAFT_VERSION`
in `src/haft.ts`.

Supported assets are `haft-linux-amd64.tar.gz`, `haft-linux-arm64.tar.gz` and
`haft-darwin-arm64.tar.gz`, checked against release `checksums.txt` (SHA-256).
Native Windows requires WSL; macOS Intel has no asset in this release set.
The ~170 MB executable lives in `~/.local/bin/haft`, shared by all projects,
without root access or a project-local binary copy. A matching `haft --version`
reuses the installed binary; a checksum failure cannot replace it. Network
failures retry up to three times with 1s/2s waits; permanent HTTP failures and
checksum failures are not retried. Downloads stage outside the project.

If needed, add `export PATH="$HOME/.local/bin:$PATH"` to your shell profile.
No shell profile is changed automatically. Recover an incomplete setup with:

```sh
create-nonoise --upgrade /path/to/project
create-nonoise doctor /path/to/project
```

The new single-project scaffold already creates its initial Git commit.
Multi-repo/existing workspaces with `--yes` retain their prior no-Git default. Haft runs after it,
with `init --local` and explicit selected harness flags, never an interactive
menu. For `--no-git`, missing Git identity, an empty repository or upgrade outside
a Git root, NONoise prints `git init`, `git add .`, `git commit` and the upgrade
command; it does not make an extra commit on the user's behalf. After the commit,
rerun upgrade. Successful init is recorded in `.nonoise/haft.json`; unchanged
upgrades reuse it. Missing host carriers trigger repair.

Version `.haft/` Markdown records, `project.yaml`, its `.gitignore`, host MCP
configs and `h-*` skills. Keep Haft's own `.haft/.gitignore` for transient review
and migration state; do not ignore `.haft/` wholesale. SQLite lives outside the
repository in `~/.haft/projects/<id>/`; backing up the full Haft state requires
both locations. The FPF text stays in the executable and is queried through
`haft fpf query|lookup|inspect` or `haft_query(action="fpf")`.

Offline embed still scaffolds bundled NONoise skills and reports the exact
recovery command if Haft cannot be downloaded. FPF operations then stop until
Haft MCP is connected; there is no conversational substitute. `doctor` reports
platform/version, per-harness MCP/skills/blocks and the read-only
`haft spec status --json` result. Workflow readiness is not a health verdict.

Explicit profile migration removes only hash-recognized old q* copies (including legacy slash
command locations). Modified files and symlinks stay. Neither 1.6.0 nor 8b500d0
shipped `.quint` data, so existing `.quint/` directories are conservatively
preserved, including empty ones. During init, NONoise temporarily shields the
entry from Haft's own automatic `.quint` migration and restores it in `finally`.
A process crash can leave a `.nonoise-quint-preserved-*` directory containing
`original`; retain it and restore that entry to `.quint` before retrying. Historical `docs/prd/*/audit/*-fpf/` data stays;
new reviews link `.haft/` records instead of creating another audit register.

For unpublished-release validation only, serve the prepared artifacts locally:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory /haft-release
NONOISE_HAFT_BASE_URL=http://127.0.0.1:8765 create-nonoise demo --yes --ai claude-code,copilot,codex
```

`NONOISE_HAFT_BASE_URL` replaces the release asset directory, including
`checksums.txt`. Use a trusted release mirror; the checksum confirms transfer
integrity, not an independent publisher signature.

## Profiles, hooks and REA (1.8.0)

Setup asks for `--profile`; the default is `core`. See the complete
[profile table and migration semantics](install-profiles.md). Stack selection
continues to work with profiles. `--upgrade` respects the saved profile; change
it explicitly with `--profile`. A profile-less 1.6/1.7 project receives core with
legacy compatibility and keeps its previous assets.

```sh
npx create-nonoise demo --yes --profile full --stack dotnet,typescript,angular,web --ai claude-code,codex,copilot
npx create-nonoise --upgrade demo --with-rea
npx create-nonoise doctor demo
```

`--stack` accepts `dotnet`, `typescript`, `angular`, `web`, `python`, `go`, `rust`,
`java`, `kotlin`, `cpp`, `swift`, `php`, `ruby`, `react`, `vue`, `flutter` and
`fsharp`, comma-separated, or `none` alone (see
[Agents, new skills and language stacks](#agents-new-skills-and-language-stacks-19)).

REA registration uses `npx -y rea-agents@6.5.0 mcp`, compact input schemas, and
Codex startup timeout 120 seconds. It is project-local, never `rea setup`.
Brownfield/full opt in at scaffold time; otherwise `rea-setup` asks one confirmation
covering installation and authorized software analysis. Restart/approve the MCP
server after activation. [Detailed REA flow](rea-integration.md).

Selected ECC-derived hooks live in `.nonoise/hooks/` and use Node on all platforms.
Host registration and any supported-event limits are documented in
[hook compatibility](hooks-compatibility.md). The old vendor hooks are separate.
`doctor` compares profile assets and reports REA configuration, required Node and
context cost; registration alone does not prove server connectivity.

The 1.8.0 release preparation updates package version, one changelog entry including
goal 5, and both release tarball URLs together. The container validation does not
push tags, publish or deploy; the release maintainer still follows the checklist above.

## Code graph: codebase-memory-mcp (1.9)

[`codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp) (MIT)
replaces graphify as the project's code knowledge graph. It is one native binary:
no Python, no `uv`, no LLM and no API key. Indexing is deterministic. The index
lives in `~/.cache/codebase-memory-mcp/`, outside the repository, and after the
first index it stays in sync while a session is open.

| What | Where |
|---|---|
| Binary, not pinned | `npm install -g codebase-memory-mcp@latest` (macOS, Linux, native Windows) |
| MCP server `codebase-memory-mcp` — Claude Code, Copilot CLI | `.mcp.json` |
| MCP server — Copilot in VS Code | `.vscode/mcp.json` |
| MCP server — Codex | `.codex/config.toml` |
| MCP server — Cursor | `.cursor/mcp.json` |
| MCP server — Gemini CLI | `.gemini/settings.json` |
| Skill | `codebase-memory` in `.claude/skills/` (and `.agents/skills/` for Codex / Copilot CLI) |
| Slash command (Claude Code) | `/index [path]` |
| Context files | a `codebase-memory` section inside the NONoise managed block of `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.cursor/rules.md`, `GEMINI.md` |

Only the config files of the selected tools are written. An existing server entry
is kept as it is; a conflicting entry or an unreadable file is left alone and
reported. The `minimal` profile installs no code graph.

The binary is not pinned to a version:

- **Scaffold** installs the latest release only when no binary answers on `PATH`.
  An existing binary is left alone, whatever its version.
- **`--upgrade` and `--code-graph-only`** run `npm install -g
  codebase-memory-mcp@latest`. If that fails (offline, permissions), the working
  binary stays in use and the CLI prints why.
- **In between** it is yours: update it whenever you like with the same command.
  NONoise never downgrades it.
- **`create-nonoise doctor`** prints the installed version and flags one older
  than 0.12.0, the release the `codebase-memory` skill was written against.

In the repository,
`.codebase-memory/graph.db.zst` exists only if someone runs `index_repository`
with `persistence=true`; committing it is a team decision.

```sh
create-nonoise --code-graph-only /path/to/project   # latest binary + MCP config only
create-nonoise doctor /path/to/project              # version on PATH, MCP config per tool, graphify leftovers
```

`--graphify-only` is still accepted as an alias of `--code-graph-only`.

Build the graph once: `/index` in Claude Code, "index this repository" in any
tool, or `codebase-memory-mcp cli index_repository --repo-path .`. When the MCP
tools are not connected the same tools run through the CLI
(`codebase-memory-mcp cli <tool> --help`). An optional browser view is available
with `codebase-memory-mcp daemon start --open`.

### Upgrading a project that used graphify

`--upgrade` (and `--code-graph-only`) installs or updates the code graph and retires the
graphify integration earlier versions installed. Only files NONoise can prove it
wrote are removed:

- graphify skill folders (`.claude/skills/graphify`, `.copilot/skills/graphify`,
  `.agents/skills/graphify`, `.cursor/skills/graphify`, `.gemini/skills/graphify`)
  whose `SKILL.md` is unmodified; a modified copy is kept and listed;
- graphify hooks in `.claude/settings.json`;
- `.nonoise/native-graphify.json`.

`graphify-out/` and the graphify CLI are left alone. Delete the folder when you
no longer need the old graph; `uv tool uninstall graphifyy` removes the CLI.

| With graphify | With codebase-memory-mcp |
|---|---|
| `graphify-out/GRAPH_REPORT.md` (god nodes, communities) | `get_architecture` (languages, packages, routes, hotspots, clusters) |
| `graphify query "<question>"` | `search_graph` (`name_pattern` / `semantic_query`) or `search_code` |
| `graphify path "<A>" "<B>"` | `trace_path` |
| `graphify explain "<concept>"` | `search_graph` + `get_code_snippet` |
| `graphify update .` | nothing: the graph syncs by itself |
| `/graphify <path>`, `graphify extract` | `/index` or `index_repository` |
| `graphify-out/` (`graph.json`, `graph.html`, wiki) | no output in the repository |
| Semantic (LLM) indexing of docs and PDF-derived Markdown | deterministic indexing of Markdown / reST / AsciiDoc sections, linked to code through `MENTIONS` edges |

## Regia: orchestration for Claude Code (1.9)

For Claude Code, scaffold and `--upgrade` install the
[Regia](https://github.com/russosalv/claude-regia) mod as the plugin
`regia@claude-regia` (see [Native channels](#native-channels)): native mode
installs it at project scope, embed mode declares it in `.claude/settings.json`,
the `minimal` profile skips it. Regia is not pinned and updates through its own
marketplace. It makes the main session delegate, picks model and effort per task
and runs swarms of Claude, Codex, Qwen Code and Copilot agents; its three modes are
NONoise's three development modes. Restart Claude Code after the installation and
run `/regia doctor`.

Upgrade note: the skills Regia replaces — `swarm-router`, `copilot-delegate`,
`gemini-delegate` and `codex-delegate` — are no longer shipped. `--upgrade`
removes pristine copies from `.claude/skills/` and `.agents/skills/` and keeps
edited ones, which it lists. Regia is Claude-Code-only. Its executors are Claude,
Codex, Qwen Code and Copilot: delegation to Copilot CLI exists again, through
Regia, and there is none to Gemini CLI. Full description: [`regia.md`](regia.md).

## FPF gate and development modes (1.9)

`arch-decision` evaluates the FPF gate before loading any runtime. The gate fires
when the operator asks for formal validation, when the decision is costly to
reverse and the PRD has at least two materially different viable options, or when
the PRD supersedes a Haft-bound decision. When it does not fire, the choice is
recorded in the PRD frontmatter as a lightweight decision (`decision.mode:
lightweight`) with no Haft run and no `.haft/` record; `arch-sync` and
`sprint-manifest` accept it.

`.nonoise/sdlc-flow.md` is now `version: 2`: every phase lists its `modes` and the
frontmatter carries `default_mode: medium`. The context files carry a
`development-modes` section inside the NONoise managed block. The three modes,
and how Polly picks one are described in
[`development-modes.md`](development-modes.md); how they map onto Regia's modes in
[`regia.md`](regia.md).

## Agents, new skills and language stacks (1.9)

Every profile except `minimal` installs three agents written by NONoise:
`graph-explorer` (maps existing code through the code graph before design),
`blueprint-architect` (turns an approved spec into a file-level blueprint) and
`evidence-reviewer` (reviews a change and reports only findings it can prove).
They are converted, like the ECC agents, into the format of each host:

| Host | Agent files |
|---|---|
| Claude Code | `.claude/agents/<name>.md` |
| Copilot | `.github/agents/<name>.agent.md` |
| Codex | `.codex/agents/<name>.toml` |
| Cursor, Gemini CLI | none |

Two skills join the standard bundle, which now has 27 skills: `reuse-first`
(an adopt / extend / build decision before new code or a new dependency) and
`docs-steward` (one owner document per kind of fact; audit first, fixes only on
request).

`--stack` now also accepts `python`, `go`, `rust`, `java`, `kotlin`, `cpp`,
`swift`, `php`, `ruby`, `react`, `vue`, `flutter` and `fsharp`. Each installs the
ECC reviewer for that language, its build resolver where ECC has one, and its
rule group, from the same pinned ECC commit as before. The ECC agents go from 10
to 31. No ECC skills were added for the new stacks.

`.nonoise/ecc/index.md` lists what is installed, the NONoise agents under their
own heading. `create-nonoise doctor` reports missing or modified agent files.
Full description: [`agents.md`](agents.md); stack mapping:
[`ecc-integration.md`](ecc-integration.md).
