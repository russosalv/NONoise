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
- **`.claude/skills/`** — a library of **40+ AI skills**: Polly advisor, BMAD-derived personas, Quint FPF validator, vendored [superpowers](https://github.com/obra/superpowers), design / ops / testing packs.
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

**Canonical architectures beat exotic ones** because they're already in the parametric memory of every frontier LLM. NONoise's architectural skills push toward DDD, Clean Architecture, CQRS, standard REST — and only allow deviations that survive a formal Quint FPF validation. Every token you spend re-teaching the LLM your bespoke abstraction is a token it isn't spending on your actual problem.

**Local tooling, no service.** Everything runs inside your AI tool of choice. No server, no telemetry, no account. Skills are plain Markdown; a `git clone` carries them between projects. External tools (issue trackers, voice recorders, memory systems) are mentioned by Polly at the right moment — not wired, not required.

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
> npx https://github.com/russosalv/NONoise/releases/download/v0.24.7/create-nonoise-0.24.7.tgz my-project
> ```

Invoke Polly whenever you're unsure what to do next:

- **Claude Code:** `/polly`
- **GitHub Copilot:** "start polly" / "avvia polly" / "run polly"
- **Cursor / Gemini CLI / Codex:** read `.claude/skills/polly/SKILL.md` and follow

Polly reads `.nonoise/sdlc-flow.md`, tells you where you are in the SDLC, and hands you the exact prompt to trigger the right skill. One message per invocation, then she terminates.

A full walkthrough of the SDLC lives in [`docs/sdlc.md`](docs/sdlc.md); Polly's advisor model is documented in [`docs/polly.md`](docs/polly.md).

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
pnpm --filter create-nonoise exec vitest run           # 47 CLI tests
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
