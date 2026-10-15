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

`native` is the default for new projects and upgrades, including legacy projects.
`embed` must be explicitly selected for an offline upgrade. The CLI still bundles
vendor snapshots for this fallback; native scaffolds do not copy them.

| Component | Native setup |
|---|---|
| Superpowers | `superpowers@nonoise` via the NONoise marketplace; Git URL + immutable SHA `bb92a77741419a4ab5f06e711a283343f1ada0c3` (7.0.0) |
| Claude documents / skill creator | `document-skills@anthropic-agent-skills` from `anthropics/skills`; `skill-creator@claude-plugins-official` from `anthropics/claude-plugins-official` |
| Impeccable | `npx --yes impeccable install --yes --providers=claude,codex,github --scope=project` (selected providers only); one `/impeccable` skill with subcommands |
| Graphify | `uv tool install --force graphifyy==0.9.91`, then `graphify install --project --platform claude` (also `codex`, `copilot`, `cursor`, `gemini` as selected) |

Claude's `.claude/settings.json` merges `extraKnownMarketplaces` and
`enabledPlugins`, so teammates can approve the declared installs when opening
the project. Unrelated settings are preserved. Scaffold and upgrade also execute
the following commands immediately when Claude is available, then confirm each
installation with `claude plugin list --json` in the current project:

```bash
claude plugin marketplace add russosalv/NONoise
claude plugin install superpowers@nonoise --scope project
claude plugin marketplace add anthropics/skills
claude plugin install document-skills@anthropic-agent-skills --scope project
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin install skill-creator@claude-plugins-official --scope project
claude plugin list --json
```

For Codex/Copilot the CLI runs `plugin marketplace add russosalv/NONoise`, then
`codex plugin add superpowers@nonoise` / `copilot plugin install superpowers@nonoise`.
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
availability is not reported as installation. Disabled or unconfirmed plugins
are reported as missing/unverified. Codex/Copilot have no Anthropic plugin channel
configured here; use Claude or the explicit embed fallback for pptx/skill-creator.
Cursor/Gemini have native impeccable/graphify installers but no superpowers plugin
channel in this CLI; use embed if they need that pack.

The repo also exposes its 28 own skills as `nonoise@nonoise` for all three plugin
CLIs. Installing that plugin is optional for scaffold users, who already have
the same NONoise skills locally. For local marketplace development use `/work`
or your checkout path instead of `russosalv/NONoise`. No publication is part of
the 1.7 development change; remote marketplace installation needs this branch
released upstream first. The release tarball URL becomes available on release.

Upgrade preserves text outside NONoise markers in CLAUDE.md, AGENTS.md and
`.github/copilot-instructions.md`. Files without markers retain their entire old
content and receive a current block after the title. An incomplete block is an
error rather than permission to overwrite text. User preferences stay outside
the managed block. Skill names and workflows are unchanged.

Legacy cleanup checks frozen SHA-256 fingerprints of 1.6.0 vendor files,
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
│   ├── skills/                        # 25 NONoise-native skills
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
│   │       ├── superpowers/           # 14 skills from obra/superpowers
│   │       │   ├── agents/
│   │       │   ├── commands/
│   │       │   ├── hooks/
│   │       │   ├── skills/
│   │       │   └── VENDOR.json        # Pinned commit
│   │       ├── impeccable/            # Impeccable design pack
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
pnpm --filter create-nonoise exec vitest run       # 47 CLI tests (at time of writing)
pnpm -r run test                                   # every package's tests
pnpm -r run typecheck                              # typecheck all
```

The CLI test suite is a snapshot-based integration suite: it scaffolds projects against known combinations of tool selections and asserts the output matches pinned snapshots. When a bundled skill or template changes, a snapshot will fail — that's intentional. Update the snapshot deliberately, review the diff in PR.

### Refresh vendored packs

```bash
node scripts/sync-vendor.mjs
```

Pulls the latest from upstream (obra/superpowers, impeccable, skill-creator, pptx) pinned to the commits in each `VENDOR.json`. To bump a pin, edit the `commit` field in `packages/skills/vendor/<pack>/VENDOR.json`, re-run the sync, re-run tests, commit the resulting diff.

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

3. If the skill should ship in scaffolded projects, verify `packages/create-nonoise/scripts/bundle-assets.mjs` picks it up — it globs the skills directory, so most skills need no manual registration.

4. Rebuild and test:

   ```bash
   pnpm --filter create-nonoise run build
   pnpm --filter create-nonoise exec vitest run
   ```

5. Dogfood with `superpowers:writing-skills` from inside this repo (NONoise is self-hosting — it uses its own tooling). That skill lints your SKILL.md and runs pressure-scenario tests against your description-as-trigger surface.

6. Add a changeset: `pnpm changeset`. Describe the change, pick a semver bump.

7. Open a PR. Expect review focused on (a) alignment with pair-vs-solo philosophy where applicable, (b) cross-tool support (both Claude Code and Copilot must work), (c) skill shipped as plain Markdown with progressive disclosure (description = trigger; body = full instructions).

### Release

1. `pnpm version` — applies any changesets, bumps versions.
2. `pnpm release` — publishes to npm (CI-driven in most cases).
3. Tag the release in Git; write release notes based on the changeset content.
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
