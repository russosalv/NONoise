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
- **Haft** (required FPF runtime) — installed automatically by scaffold and `--upgrade` on Linux (amd64/arm64) and macOS arm64; Windows needs WSL. See [Haft: required FPF runtime](#haft-required-fpf-runtime-170).
- **Network access to upstream installers** for the default native vendor mode (Claude/Codex/Copilot plugin CLIs, `npx`, `uv`); use `--vendor-mode embed` offline.

Optional (scaffolded but advisor-only — you install if and when you need them):

- **graphify** — for brownfield codebases. The `create-nonoise` scaffolder installs the `graphifyy` Python package automatically at project creation time (via `uv tool install "graphifyy==0.9.91"`); no on-demand install step is needed.
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
- `.claude/commands/` + `.claude/settings.json` (Claude Code selected).
- `CLAUDE.md` (Claude Code selected).
- `.github/copilot-instructions.md` (Copilot selected).
- `AGENTS.md` (industry-standard, always written).
- `.cursor/rules.md`, `GEMINI.md` as appropriate.
- `tools/md-extractor/` — Node CLI for ingesting PDF / DOCX / images via LlamaCloud Agentic API.
- `tools/devops-push/` — Node CLI for pushing sprint task breakdowns to Azure DevOps.
- `nonoise.config.json` — project-level settings (installed packs, selected tools, scaffold-time choices).
- `.nonoise/sdlc-flow.md` — SDLC flow file Polly reads to detect your current phase and suggest the next skill.

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

Polly reads `.nonoise/sdlc-flow.md`, detects your current phase, and produces a one-shot 4-block message: where you are, what skill to engage next, a copy-pasteable prompt, and an offer to delegate. One message per invocation.

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

New scaffolds ignore `*.graphify-bak` at every directory depth. Graphify creates
these rolling backups before changing hook/settings JSON; NONoise keeps them
available for recovery while excluding them from the initial commit. Existing
projects need the same ignore rule added manually; already tracked backups must
also be removed from the Git index if they should stop being tracked.

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
| Graphify | `uv tool install --force graphifyy==0.9.91`, then `graphify install --project --platform claude` (also `codex`, `copilot`, `cursor`, `gemini` as selected) |
| Codex delegation (Claude Code) | `codex@openai-codex`, OpenAI's official Claude Code plugin from marketplace `openai/codex-plugin-cc`; declared in `.claude/settings.json` in both modes, installed only in native mode |

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
claude plugin marketplace add openai/codex-plugin-cc
claude plugin install codex@openai-codex --scope project
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

The Codex plugin replaces the former `codex-delegate` skill. In Claude Code it
provides `/codex:rescue` (subagent `codex:codex-rescue`), `/codex:review`,
`/codex:adversarial-review`, `/codex:status`, `/codex:result`, `/codex:cancel`,
`/codex:transfer` and `/codex:setup`. Embed mode stays offline: the plugin is
only declared in `.claude/settings.json`, and Claude Code offers it when the
project is trusted. Explicit profile migration (`--upgrade --profile core`) removes `codex-delegate` copies that match the
shipped version and preserves (and lists) modified ones.
Already registered marketplaces and confirmed installations are reused.
Transient DNS, connection, timeout and HTTP 5xx failures in marketplace/plugin,
impeccable and uv installers get two retries, after 1 and 2 seconds. Other errors
return immediately. The old `example-skills` declaration and any installation
scoped to this project are removed during native upgrade; unrelated plugins remain.
The official [standalone skill-creator plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator)
avoids installing the other example skills and their conflicting frontend-design.
Embed snapshots were refreshed on 2026-10-15: impeccable is one skill, superpowers
is 7.0.0 (skills and hooks; upstream no longer ships commands or agents). Historical
1.6.0 hashes, including all 18 impeccable directories, remain available for migration.
After vendor refreshes run `node scripts/sync-graphify-platform-skills.mjs` and
`node scripts/update-vendor-hashes.mjs` to update lean assets and append ownership hashes. Missing commands and installer failures
are non-fatal and printed with exact retry commands. `doctor [path]` only reads
project files and native `plugin list --json` / `uv tool list` output; catalog
availability is not reported as installation. It checks the NONoise skills in
the directory each selected harness reads (`.claude/skills` for Claude Code,
`.agents/skills` for Codex and Copilot CLI). Disabled or unconfirmed plugins
are reported as missing/unverified. Codex/Copilot have no Anthropic plugin channel
configured here; use Claude or the explicit embed fallback for pptx/skill-creator.
Cursor/Gemini have native impeccable/graphify installers but no superpowers plugin
channel in this CLI; use embed if they need that pack.


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
installers that would overwrite those impeccable/graphify paths are deferred.
Resolve those files and remove the corresponding entries to enable installation.
New user files are never inferred to belong to NONoise from their name alone.
Run upgrade twice to check stable project output.

Graphify's native skill performs semantic extraction with the harness model;
NONoise no longer provides its own native-mode copy. For VS Code, optional
`graphify vscode install` and `code --install-extension renaissance-geek.impeccable`
remain separate editor choices. Codex impeccable hooks require approval in `/hooks`
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
│   ├── team-model.md
│   ├── skills-catalog.md
│   ├── docs-hierarchy.md
│   ├── cross-tool.md
│   ├── external-tools.md
│   ├── installation.md
│   └── superpowers/specs/             # Framework-internal specs
├── graphify-out/                      # Graphify output for THIS repo
│   ├── GRAPH_REPORT.md                # god-nodes + communities
│   ├── graph.html
│   ├── graph.json
│   └── manifest.json
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
│   │   ├── design-md-generator/
│   │   ├── docs-md-generator/
│   │   ├── frontend-design/
│   │   ├── observability-debug/
│   │   ├── ops-skill-builder/
│   │   ├── playwright-cli/
│   │   ├── polly/
│   │   ├── quint-fpf/
│   │   ├── requirements-ingest/
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
node scripts/sync-graphify-platform-skills.mjs
node scripts/update-vendor-hashes.mjs
```

Fetches each configured upstream `ref` (Superpowers, Impeccable, skill-creator, pptx and Graphify), writes the fetched revision to `VENDOR.json`, and refreshes its scoped contents. The second command refreshes the lean Graphify files shipped in the package; the third appends current ownership hashes without dropping historical migration entries. Re-run tests and review the resulting diff before committing.

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
- `graphify-out/GRAPH_REPORT.md` is produced by running `graphify .` on the repo itself.
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

### Regenerating the graphify index on this repo

```bash
graphify .
```

Produces / refreshes `graphify-out/GRAPH_REPORT.md`. Useful after a large refactor or before a release — the report's god-nodes and community hubs are a sanity check that the architecture hasn't drifted.

Note: `graphify-out/cache/` is gitignored; the report, `graph.json`, `graph.html`, and `manifest.json` are committed.

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
| `graphify .` produces an empty report | graphify binary not installed or not on PATH | re-run `create-nonoise` in the project, or install manually: `uv tool install "graphifyy==0.9.91"` |
| `superpowers@nonoise` install fails with an unknown ref | the CLI version's tag `v<version>` is missing from the repository | push the tag; for an untagged branch set `NONOISE_MARKETPLACE_REF=<branch>` |
| After native → embed → native upgrades, `npx impeccable install` stays PENDING ("Preserved modified legacy impeccable files"); graphify likewise | known issue [#8](https://github.com/russosalv/NONoise/issues/8): files written by the native installers are recorded as preserved user files in `preservedVendorFiles` | delete `.claude/skills/impeccable` and `.agents/skills/impeccable` (graphify: its native skill folders), remove the matching entries from `preservedVendorFiles` in `nonoise.config.json`, rerun `--upgrade` |
| `upgrade` reports a preserved `codex-delegate` skill | the skill was modified locally, so it is not removed | use the `codex@openai-codex` plugin instead and delete the folder once the local changes are no longer needed |

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

Graphify 0.9.91 can replace a legacy `## graphify` section through the end of an
instruction file. NONoise preserves existing instruction-file bytes around the
upstream installer, keeping user prose and NONoise markers intact while allowing
native skills, references and hooks to be installed. Use `--graphify-only` for a
forced repair through this protection. Successful native installs have a local
version/hash receipt so repeated upgrades do not rewrite graphify backup files.

## Haft: required FPF runtime (1.7.0)

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
