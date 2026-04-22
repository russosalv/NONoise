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

- **graphify** — for brownfield codebases. The `create-nonoise` scaffolder installs the `graphifyy` Python package automatically at project creation time (via `uv tool install "graphifyy>=0.4.23"`); no on-demand install step is needed.
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
- `.claude/skills/` — the full skill library (Polly + specialists + vendored superpowers + impeccable + skill-creator + pptx tooling). See [`skills-catalog.md`](skills-catalog.md).
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

### Updating a scaffolded project (roadmap)

Future CLI commands (not in v1):

- `nonoise update --check` — compares local manifest in `nonoise.config.json` with the upstream registry; prints "N updates available".
- `nonoise update` — applies a specific update the user opts into.
- `nonoise add <pack>` — adds a new optional pack to an existing project.

Design principle (per review feedback in `todo.txt`): **automatic check yes, automatic apply no.** Auto-updates break reproducibility and trust; check + manual apply is the right compromise.

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
| `graphify .` produces an empty report | graphify binary not installed or not on PATH | re-run `create-nonoise` in the project, or install manually: `uv tool install "graphifyy>=0.4.23"` |

---

## Attribution and licence

The framework is MIT-licensed (see `LICENSE` — landing with the first tagged release). Use of the framework or its methodology requires visible attribution per `ATTRIBUTION.md`:

- A "powered by NONoise" note in the project README.
- Attribution in "About" / credits in user-facing applications.
- Attribution in marketing / slides / case studies that reference the architecture or methodology.

Full attribution terms in `ATTRIBUTION.md` (landing with the first tagged release).
