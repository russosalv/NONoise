<p align="center">
  <img src="logos/nonoise-cat.png#gh-light-mode-only" alt="NONoise" height="120" />
  <img src="logos/nonoise-cat.png#gh-dark-mode-only" alt="NONoise" height="120" />
</p>

<h1 align="center">NONoise</h1>

<p align="center"><strong>An AI SDLC bootstrapper.</strong> One command turns an empty directory into a fully-wired, AI-ready project — with skills, a docs hierarchy, templated context files, and an advisor (Polly) that tells your team where they are in the SDLC and what to do next.</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href="docs/README.md">Documentation</a> ·
  <a href="docs/sdlc.md">SDLC flow</a> ·
  <a href="docs/skills-catalog.md">Skills</a> ·
  <a href="docs/cross-tool.md">Tool support</a>
</p>

---

## What you get

```bash
npx create-nonoise my-project
cd my-project
# Open in Claude Code, or tell Copilot: "start polly"
```

The CLI asks which AI tools your team uses (Claude Code, GitHub Copilot), then scaffolds:

- **`src/`** — your code. Stack-agnostic: pick .NET, Node, Python, Rust, Go. The SDLC flow doesn't care.
- **`docs/`** — the six-folder source-of-truth hierarchy (`architecture/`, `requirements/`, `calls/`, `support/`, `prd/`, `sprints/`) — see [`docs/docs-hierarchy.md`](docs/docs-hierarchy.md).
- **`.claude/skills/`** (and `.agents/skills/` for Codex / Copilot CLI) — a library of **27 NONoise skills plus native vendor integrations** (Codex delegation via the official `codex@openai-codex` plugin): Polly advisor, BMAD-derived personas, Haft FPF validator, native [superpowers](https://github.com/obra/superpowers), design / ops / testing packs, plus `swarm-router` for multi-model orchestration across Claude / Codex / Gemini / Copilot.
- **Context files for every selected tool** — `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md`, `.cursor/rules.md`, `GEMINI.md` — generated from one source of truth.
- **`tools/md-extractor/`** and **`tools/devops-push/`** — Node CLIs ready to use.
- **`.nonoise/sdlc-flow.md`** — the SDLC flow Polly reads to detect where you are and suggest the next skill.

---

## Why this exists

**Most AI tooling assumes a one-man-band developer with a chat window.** Real companies have analysts, architects, multiple developers, shadow testers. Different phases need different models — discovery and architecture are `[pair]` work on a large model; implementation is `[solo]` on a smaller one. The SDLC flow **annotates the mode for every step** so nobody wastes the wrong model on the wrong problem.

**A skill library is useless if nobody knows what to use when.** Polly is the advisor that removes that problem entirely. Invoke `/polly` whenever you're unsure what's next — she reads `.nonoise/sdlc-flow.md`, tells you where you are in the SDLC, and hands you the exact prompt to trigger the right skill.

<p align="center">
  <img src="logos/flow.png" alt="NONoise SDLC flow" width="100%" />
</p>

```
🚀 create-nonoise ──► 💡 /polly (advisor)
                          │
             reads .nonoise/sdlc-flow.md
             detects current phase
             suggests next skill
                          │
       📋 Requirements ──► 🔍 Discovery ──► 🏛️ Architecture ──► 📅 Sprint Planning
                                                                          │
                    ┌─────────────────────────────────────────────────────┘
                    ▼
             ⚙️ Implementation ──► 🧪 Unit & Integration ──► 🤖 Test Automation ──► ✅ Acceptance
                    ▲                                                                      │
                    └──────────────────────── 🔁 Next sprint ────────────────────────────┘
```

You never pick the wrong skill. You always know the next step.

**Canonical architectures beat exotic ones** because they're already in the parametric memory of every frontier LLM. NONoise's architectural skills push toward DDD, Clean Architecture, CQRS, standard REST — and only allow deviations that survive a formal Haft FPF validation. Every token you spend re-teaching the LLM your bespoke abstraction is a token it isn't spending on your actual problem.

**Local tooling, no service.** Everything runs inside your AI tool of choice. No server, no telemetry, no account. NONoise skills are plain Markdown; a `git clone` carries them between projects. Vendor plugins are installed through each harness; Claude project settings declare the dependencies for teammates. External tools (issue trackers, voice recorders, memory systems) are mentioned by Polly at the right moment — not wired, not required.

### Multi-model orchestration with swarm-router

One team, many models. `swarm-router` is a NONoise skill that routes a single user request across Claude, Codex, Gemini, and Copilot's many models — picking the right specialist for each piece of work instead of forcing one model to do everything.

Four execution modes:

- **single** — classify the task, dispatch to one model, return verbatim. ~80% of routings.
- **sequential** — pipeline: A's output feeds B (e.g. Gemini writes the UI → Codex audits it).
- **parallel fan-out** — same prompt to N models in parallel, then synthesize. For competing hypotheses or second opinions.
- **parallel-team** — split a complex feature into N disjoint subtasks with explicit file-ownership boundaries, run them concurrently, then merge.

Specialization matrix the router uses by default:

| Model | Default lane |
|---|---|
| **Claude** | Implementation, agentic loops, edge-case hunting, integration tests |
| **Gemini** | Frontend HTML/CSS, Figma→code, SVG, big-context reads (>200k tokens) |
| **Codex** | Code review, security audits, terminal/DevOps/scripting |
| **Copilot** | Multiplexer — reaches any of the above, plus a free tier (`gpt-4.1`, `gpt-5-mini`) for cheap classification |

Cross-tool by design: **first-class on Claude Code** (Mode 4 uses the native `Agent` tool for in-process parallel subagents); **best-effort on Copilot / Gemini CLI / Codex** (Mode 1/2/3 work fully via shell-out to peer CLIs; Mode 4 falls back to background shell processes + `wait`, capped at N ≤ 3).

Trigger phrases are the same in every harness — `swarm: ...`, `/swarm`, `usa lo swarm`, `fan-out`, `parallel-dev`, `fai team` — and the skill reads its own *Harness-specific dispatch* section to pick the right mechanism. Full skill source: [`packages/skills/swarm-router/SKILL.md`](packages/skills/swarm-router/SKILL.md); catalog entry: [`docs/skills-catalog.md#multi-model-orchestration`](docs/skills-catalog.md#multi-model-orchestration).

---

## Quickstart

```bash
# Scaffold
npx create-nonoise my-project

# Enter the project and open your AI tool of choice
cd my-project
code .           # VS Code + Claude Code / Copilot
cursor .         # Cursor
# or in a terminal:
claude           # Claude Code CLI
```

> **GitHub Release fallback.** If the npm registry is temporarily unavailable for this package, you can install the exact same tarball directly from the GitHub Release attached to each tag:
>
> ```bash
> npx https://github.com/russosalv/NONoise/releases/download/v1.8.0/create-nonoise-1.8.0.tgz my-project
> ```

Invoke Polly whenever you're unsure what to do next:

- **Claude Code:** `/polly`
- **GitHub Copilot:** "start polly" / "avvia polly" / "run polly"
- **Cursor / Gemini CLI / Codex:** read `.claude/skills/polly/SKILL.md` and follow

Polly reads `.nonoise/sdlc-flow.md`, tells you where you are in the SDLC, and hands you the exact prompt to trigger the right skill. One message per invocation, then she terminates.

A full walkthrough of the SDLC lives in [`docs/sdlc.md`](docs/sdlc.md); Polly's advisor model is documented in [`docs/polly.md`](docs/polly.md).

---

## Upgrading an existing NONoise project

Version 1.7 defaults to native vendor installation (upstream installers and plugins); `--vendor-mode embed` is the offline fallback. NONoise's own skills remain local, in `.claude/skills/` and, for Codex / Copilot CLI, `.agents/skills/`.

```bash
npx create-nonoise@latest --upgrade path/to/project
npx create-nonoise@latest doctor path/to/project
# Offline fallback: bundled vendor snapshots
npx create-nonoise my-project --vendor-mode embed
```

Upgrade refreshes NONoise skills and only the instruction text inside
`<!-- nonoise:begin vX.Y.Z -->` / `<!-- nonoise:end -->`. Existing instructions
outside the markers survive; older files gain a block after their title.
Known, unmodified 1.6.0 vendor files are removed by SHA-256 comparison; changed
or user-added files are preserved and listed. Superpowers stays pinned to
commit `b55764852ac78870e65c6565fb585b6cd8b3c5c9` (5.0.7); other vendors follow
upstream, except the required graphify runtime pin `graphifyy==0.9.91`.
Claude plugins are installed immediately at project scope and verified in the
registry; skill-creator uses its dedicated official plugin. Network failures get
two retries with increasing waits. Failed/missing installers leave exact recovery
commands and do not stop scaffolding. Embed includes the current unified impeccable skill.
The NONoise plugin marketplace is pinned to the CLI's release tag (`v<version>`).
The `codex-delegate` skill is replaced by OpenAI's official `codex@openai-codex`
plugin (`/codex:rescue`, `/codex:review`, …); upgrade removes unmodified copies.
See [installation](docs/installation.md) for plugin setup and `doctor` details.

Auto-detection guard: when you pass a positional path that already contains a `nonoise.config.json`, the CLI **never silently scaffolds over it**. Without `--yes` it prompts (Upgrade / Graphify-only / Cancel); with `--yes` it aborts and prints the explicit `--upgrade` / `--graphify-only` commands you should run instead.

---

## Read next

| If you want to … | Read |
|---|---|
| **See the big picture** — what NONoise is and isn't | [`docs/overview.md`](docs/overview.md) |
| **Understand the philosophy** — 5 noise sources, parametric memory, canonical patterns | [`docs/philosophy.md`](docs/philosophy.md) |
| **Follow the SDLC flow** — greenfield + brownfield, step by step | [`docs/sdlc.md`](docs/sdlc.md) |
| **Meet Polly** — advisor model, one-shot 4-block output, pair/solo modes | [`docs/polly.md`](docs/polly.md) |
| **See the team model** — why NONoise is team-first, not one-man-band | [`docs/team-model.md`](docs/team-model.md) |
| **Browse the skill catalog** — 40+ skills organized by domain | [`docs/skills-catalog.md`](docs/skills-catalog.md) |
| **Understand the docs/ tree** — six folders, each a source of truth | [`docs/docs-hierarchy.md`](docs/docs-hierarchy.md) |
| **Check tool support** — Claude Code, Copilot, Cursor, Gemini CLI, Codex | [`docs/cross-tool.md`](docs/cross-tool.md) |
| **See external tools** Polly mentions (info-only) | [`docs/external-tools.md`](docs/external-tools.md) |
| **Install, build, and extend** the framework itself | [`docs/installation.md`](docs/installation.md) |

The same material feeds the public site at [NONoise-frmw-site](https://github.com/russosalv/NONoise-frmw-site).

---

## Development

Prerequisites: **Node `>=20`**, **pnpm `9.12.0`** (pinned via `packageManager`).

```bash
pnpm install                                           # workspace deps
pnpm --filter create-nonoise run build                 # build CLI + bundle assets
pnpm --filter create-nonoise exec vitest run           # full CLI suite, including host compatibility
pnpm -r run test                                       # every package's tests
pnpm -r run typecheck                                  # typecheck all
node scripts/sync-vendor.mjs                           # refresh vendored superpowers
```

Versioning via Changesets: `pnpm changeset` → `pnpm version` → `pnpm release`.

Full dev loop, skill authoring flow, and release process: [`docs/installation.md`](docs/installation.md).

---

## License and attribution

MIT (see `LICENSE`, landing with the first tagged release). Use of the framework or its methodology in any project — commercial or internal — requires visible attribution per `ATTRIBUTION.md`: a short "powered by NONoise" note in the project README or About section, pointing to this repository.

---

## Author

NONoise was created by **Alessandro Russo** ([@russosalv](https://github.com/russosalv)) as a lesson-learned, packaged and open-sourced so the method — not just one implementation — outlives the project it was born in.

## Haft powers FPF

NONoise 1.7.0 requires Haft for FPF work in native and embed modes. Scaffold and
upgrade install the SHA-256-verified `russosalv/haft` fork `v9.1.1-nonoise.1` once
per machine in `~/.local/bin`, then initialize selected hosts non-interactively.
This temporary fork fixes upstream v9.1.0 initialization dates
([release](https://github.com/russosalv/haft/releases/tag/v9.1.1-nonoise.1):
linux-amd64, linux-arm64, darwin-arm64). Windows users need WSL.

`quint-fpf` is the stable adapter name for Haft's `h-*` skills. Architecture
reviews persist ProblemCards, variants and decisions in `.haft/`; the explicit
Phase 5.5 operator choice precedes decision binding. PRDs link the returned IDs
and paths; old audit records are preserved. Without Haft MCP, FPF work stops
with `create-nonoise --upgrade .` / `create-nonoise doctor .`, without fallback.
See [installation](docs/installation.md#haft-required-fpf-runtime-170) and
[cross-tool integration](docs/cross-tool.md#haft-fpf-integration).

### Stack-specific agents and rules (1.8.0)

Use `--stack dotnet,angular`, `--stack typescript` or `--stack none` with the wizard or `--upgrade`. The choice is saved in `nonoise.config.json`. The profile selects common ECC agents/rules and process skills; language rules, reviewers and stack skills follow `--stack`. Minimal excludes ECC capabilities. ECC is a pinned local MIT snapshot, never an auto-updating plugin. Upgrades preserve modified agents, rules and NONoise/ECC skills using SHA-256 ownership; `doctor` reports missing or modified ECC files.

[Full stack mapping and update procedure](docs/ecc-integration.md).

### Installation profiles, optional hooks and REA (1.8.0)

```sh
npx create-nonoise app --yes --profile developer --stack dotnet --ai claude-code,codex,copilot
npx create-nonoise --upgrade app --profile security
npx create-nonoise --upgrade app --with-rea
```

Choose `minimal`, `core` (default), `developer`, `security`, `brownfield` or `full`.
The saved profile drives scaffold, upgrade and doctor; older projects retain their
previous capabilities. Safety and formatting hooks are optional, standalone Node
scripts. REA 6.5.0 is enabled by `--with-rea` or brownfield/full, using only project
MCP configuration and compact schemas (172 tools; Node >=22.19).

See [profile table](docs/install-profiles.md), [verified hook formats](docs/hooks-compatibility.md), and [REA activation](docs/rea-integration.md).
