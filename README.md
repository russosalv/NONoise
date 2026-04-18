# NONoise Framework

**An SDLC bootstrapper that scaffolds projects with AI skills, agents, tools, and templates — cross-tool by design, Claude Code and GitHub Copilot first-class.**

NONoise takes a blank directory and turns it into a fully-wired, AI-ready project with a documented SDLC, a skill library that works across multiple assistants, and a conductor ([Polly](packages/skills/polly/SKILL.md)) that walks your team through greenfield or brownfield development — step by step, pair vs solo, from raw requirements to merged PR.

---

## Why NONoise

**Most AI frameworks assume a one-man-band solo developer.** They optimize for the lone hacker with a chat window, then stretch awkwardly when a real team shows up — an analyst writing requirements, an architect making decisions, three devs implementing. NONoise is built around the opposite assumption: **different phases need different modes**. Discovery, architecture, and sprint breakdown are `[pair]` work — senior people on one screen with a large model. Implementation is `[solo]` — one developer per task, smaller models, repeatable loops. Polly announces the mode for every step so nobody wastes the wrong model on the wrong problem.

**Canonical architectures beat exotic ones** because they already live in the parametric memory of every frontier LLM. If you build a DDD + event-driven microservice the "boring" way, GPT-5 / Claude / Copilot all know the idioms cold and will generate code that fits. If you invent a bespoke architecture, every session you pay the context-injection tax to re-teach it. NONoise's architectural skills ([`arch-brainstorm`](packages/skills/arch-brainstorm/SKILL.md), [`arch-decision`](packages/skills/arch-decision/SKILL.md), [`quint-fpf`](packages/skills/quint-fpf/SKILL.md)) explicitly reward canonical choices and only validate deviations with a formal first-principles audit.

**Skills beat prompts.** A prompt disappears the moment the window closes; a skill is a versioned, named, discoverable artifact that any AI tool can load. NONoise ships 23 bundled skills plus 14 vendored from [`obra/superpowers`](https://github.com/obra/superpowers) — all live in `.claude/skills/`, all are plain Markdown, all work in Claude Code and GitHub Copilot today (and in Cursor / Gemini CLI / Codex best-effort).

**Polly is the conductor.** A well-stocked skill library is useless if nobody knows what to use when. Polly is the orchestrator skill that auto-triggers on a freshly scaffolded project, asks greenfield-vs-brownfield, then walks the SDLC in order — requirements, discovery, architecture, sprint, implementation, acceptance. You never pick the wrong skill; you always know the next step.

---

## Quickstart

```bash
npx create-nonoise my-project
cd my-project
# Open in Claude Code, or tell Copilot: "start polly"
```

**What scaffolding does.** The CLI asks which AI tools your team uses (Claude Code, Copilot, Cursor, Gemini CLI, Codex — any combination), then writes:

- `src/` — your code (stack-agnostic; add whatever you want)
- `AGENTS.md` — cross-tool context every assistant reads
- `CLAUDE.md` + `.claude/skills/` + `.claude/commands/` — if Claude Code is selected
- `.github/copilot-instructions.md` — if Copilot is selected
- Tool-specific files for each of the others you chose
- `docs/` — the six-folder hierarchy (see [Docs hierarchy](#docs-hierarchy-in-scaffolded-projects))
- `tools/md-extractor/` and `tools/devops-push/` — Node CLIs ready to use
- `nonoise.config.json` — project-level settings
- `.nonoise/POLLY_START.md` — the auto-trigger marker

**What `.nonoise/POLLY_START.md` triggers.** Both `CLAUDE.md` and `.github/copilot-instructions.md` include a block that tells the AI: "if this file exists, your first action this session is to invoke Polly, then delete the file." The marker is one-shot — once Polly has run you won't be pestered again.

**How Polly kicks off.** On first entry Polly briefly mentions the voice-input option (long conversations go faster by voice), then asks the one question that branches everything: **greenfield or brownfield?** From there it walks the appropriate pipeline, skill by skill, announcing the mode (`[pair]` / `[solo]`) for each step. You can also invoke Polly manually at any point by typing `/polly` in Claude Code or saying "start polly" / "avvia polly" to Copilot.

### A minimal first session

```text
You            > (opens the scaffolded project in Claude Code)
Claude Code    > (detects .nonoise/POLLY_START.md, invokes polly)
Polly          > Voice-to-text options for long sessions: Wispr Flow, Handy,
                 Superwhisper. Nothing to install — just know the option.
                 Is this greenfield (new) or brownfield (existing code)?
You            > Greenfield. Web SaaS, B2B invoicing.
Polly          > [pair] Stack? And do you have any source material — briefs,
                 call notes, PDFs — to ingest first?
You            > .NET + Angular. Yes, three PDFs from stakeholder interviews.
Polly          > [pair] Let's ingest. Engaging requirements-ingest…
(…the SDLC proceeds, Polly announcing each skill and mode as it goes…)
```

---

## The SDLC flow

### Greenfield path

```
Step   Phase                                    Mode     Skill
────   ─────                                    ────     ─────
 2.1   Stack question                           [pair]   —
 2.2   Existing source material                 [pair]   requirements-ingest
 2.3   Requirements elicitation                 [pair]   bmad-agent-analyst (+ bmad-advanced-elicitation)
 2.4   Feature / product design                 [pair]   superpowers:brainstorming
 2.5   Architecture options (if non-trivial)    [pair]   arch-brainstorm
 2.6   Architecture decision                    [pair]   arch-decision (+ quint-fpf)
 2.7   Sprint breakdown                         [pair]   sprint-manifest
 2.8   Implementation loop — per task           [solo]   ─── dev trio ───
                                                         a) superpowers:writing-plans
                                                         b) superpowers:executing-plans
                                                            └─ superpowers:test-driven-development
                                                            └─ superpowers:dispatching-parallel-agents
                                                         c) atr (acceptance runner)
                                                         d) superpowers:finishing-a-development-branch
```

### Brownfield prefix (steps 3.1 – 3.5)

```
 3.1   Path of the existing code                [pair]   —
 3.2   Indexing the codebase                    [pair]   graphify-setup  →  graphify .
 3.3   Understand what's there                  [pair]   reverse-engineering
 3.4   Existing source material                 [pair]   requirements-ingest
 3.5   Re-enter the greenfield flow at 2.4 (new feature on legacy) or 2.5 (architectural change)
```

**Skip rules.** Pure refactor with no new feature skips 2.4. A simple feature on a known architecture skips 2.5 (no new ADR). An architectural study with no concrete feature yet skips 2.4 and enters at 2.5 with an area slug.

Full specification lives in [`packages/skills/polly/SKILL.md`](packages/skills/polly/SKILL.md) and its `references/`.

---

## Bundled skills catalog

**37 skills total at time of writing** — 23 NONoise-native, 14 vendored from [obra/superpowers](https://github.com/obra/superpowers). All ship under `.claude/skills/` in scaffolded projects and work cross-tool (markdown files readable by any AI).

### Orchestrator
| Skill | What it does |
|---|---|
| [`polly`](packages/skills/polly/SKILL.md) | Conductor. Walks the SDLC, picks the next skill, announces pair-vs-solo mode. Auto-triggers post-scaffold. |

### Requirements & discovery
| Skill | What it does |
|---|---|
| [`requirements-ingest`](packages/skills/requirements-ingest/SKILL.md) | Raw PDFs / DOCX / emails / call transcripts → structured requirement files under `docs/requirements/`. |
| [`bmad-agent-analyst`](packages/skills/bmad-agent-analyst/SKILL.md) | Isa — strategic business analyst persona. Requirements elicitation, market / domain / tech research, PRFAQ. |
| [`bmad-advanced-elicitation`](packages/skills/bmad-advanced-elicitation/SKILL.md) | Stress-test drafts via Socratic, pre-mortem, red-team, SCAMPER, 25+ structured methods. |

### Architecture & validation
| Skill | What it does |
|---|---|
| [`arch-brainstorm`](packages/skills/arch-brainstorm/SKILL.md) | Step 1 of the architecture workflow — dialogic brainstorm, produces a PRD under `docs/prd/<area>/`. |
| [`arch-decision`](packages/skills/arch-decision/SKILL.md) | Step 2 — formal Quint FPF validation of a draft PRD. Updates frontmatter to `validated` / `rejected`. |
| [`quint-fpf`](packages/skills/quint-fpf/SKILL.md) | First Principles Framework — 6-phase structured reasoning (Initialize → Abduct → Deduce → Induce → Audit → Decide). |
| [`bmad-agent-architect`](packages/skills/bmad-agent-architect/SKILL.md) | Alex — system architect persona. Drives the arch-brainstorm → arch-decision → source-of-truth loop. |

### Sprint & implementation
| Skill | What it does |
|---|---|
| [`sprint-manifest`](packages/skills/sprint-manifest/SKILL.md) | Step 3 — promotes validated PRDs to a sprint. Breaks work into macro functional tasks, assigns CL1/CL2/CL3 confidence. |
| [`atr`](packages/skills/atr/SKILL.md) | Acceptance Test Runner. Reads criteria from the sprint manifest, generates a testbook, executes via Playwright, produces Markdown reports with screenshots. |

### Brownfield
| Skill | What it does |
|---|---|
| [`graphify-setup`](packages/skills/graphify-setup/SKILL.md) | Installs the graphify knowledge-graph tool and wires its usage rules into the project. |
| [`reverse-engineering`](packages/skills/reverse-engineering/SKILL.md) | Versioned reverse-engineering dossier for any subject (legacy codebase, third-party API, data pipeline). Interactive Q&A + explicit save trigger. |

### Ops & observability
| Skill | What it does |
|---|---|
| [`ops-skill-builder`](packages/skills/ops-skill-builder/SKILL.md) | Meta-skill — coaches any ops task (deploy, pipeline, provision, migrate), then crystallizes the workflow into a project-local skill via `skill-creator`. |
| [`observability-debug`](packages/skills/observability-debug/SKILL.md) | Backend-agnostic trace/log triage (App Insights, Datadog, Grafana+Loki, CloudWatch, OpenTelemetry). Root-causes with file:line precision. |

### Integrations
| Skill | What it does |
|---|---|
| [`spec-to-workitem`](packages/skills/spec-to-workitem/SKILL.md) | Translates sprint manifest tasks into work items on GitHub Issues, Azure DevOps, Jira, or Linear. Adapter pattern. |
| [`playwright-cli`](packages/skills/playwright-cli/SKILL.md) | Browser automation — navigation, form filling, screenshots, data extraction, web-app testing. |
| [`frontend-design`](packages/skills/frontend-design/SKILL.md) | Production-grade frontend interfaces with high design quality. Avoids the generic-AI look. |
| [`bmad-agent-ux-designer`](packages/skills/bmad-agent-ux-designer/SKILL.md) | Giulia — UX designer persona. Interaction design, DESIGN.md authoring, UI critique. |
| [`bmad-agent-tech-writer`](packages/skills/bmad-agent-tech-writer/SKILL.md) | Daniel — tech writer persona. READMEs, user guides, API docs, Mermaid diagrams. |

### Generators
| Skill | What it does |
|---|---|
| [`vscode-config-generator`](packages/skills/vscode-config-generator/SKILL.md) | Generates `.vscode/tasks.json` + `launch.json` based on detected stack (Node, .NET, Python). |
| [`docs-md-generator`](packages/skills/docs-md-generator/SKILL.md) | Keeps `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` coherent from a single source-of-truth. (Operational implementation lands in SP-7.b.) |
| [`design-md-generator`](packages/skills/design-md-generator/SKILL.md) | Generates a `DESIGN.md` design-system document in the Stitch format popularized by `getdesign.md`. |

### Utility
| Skill | What it does |
|---|---|
| [`skill-finder`](packages/skills/skill-finder/SKILL.md) | Discovers AI skills from a curated registry (Anthropic official, plugin marketplaces, community, awesome-lists) and installs them into the project. |

### Vendored — `superpowers:*` (14 skills from [obra/superpowers](https://github.com/obra/superpowers))

Planning and execution: `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`. Quality and review: `test-driven-development`, `verification-before-completion`, `systematic-debugging`, `requesting-code-review`, `receiving-code-review`. Workflow: `using-git-worktrees`, `finishing-a-development-branch`, `writing-skills`, `using-superpowers`.

Refreshed in-repo via `node scripts/sync-vendor.mjs` — see [`packages/skills/vendor/superpowers/VENDOR.json`](packages/skills/vendor/superpowers/VENDOR.json) for the pinned commit.

> **New in this release:** A `c4-doc-writer` skill is planned and may land alongside this README — if it's listed under `packages/skills/c4-doc-writer/` check its SKILL.md frontmatter for current trigger surface.

---

## Tools

Two Node CLIs ship under `tools/` in every scaffolded project (sources at [`packages/templates/single-project/_always/tools/`](packages/templates/single-project/_always/tools/)):

| Tool | What it does |
|---|---|
| [`md-extractor`](packages/templates/single-project/_always/tools/md-extractor/) | PDF / DOCX / JPG / JPEG / PNG → structured Markdown via the LlamaCloud `agentic` parser. Extracts embedded images into a sibling `<name>-assets/` folder and rewrites link references. The extracted Markdown — not the raw PDF — is what `graphify` indexes. |
| [`devops-push`](packages/templates/single-project/_always/tools/devops-push/) | Interactive CLI that pushes sprint task breakdowns (`Feature → User Story → Task`) to **Azure DevOps** as work items via the REST API. JSON Patch + field names are Azure-DevOps-specific; an extension pattern for other trackers is documented in the tool's README. |

---

## Claude Code vs Copilot support

Both tools are first-class — the SDLC loop is identical; the mechanics underneath differ. Cursor, Gemini CLI, and Codex are best-effort (most of the flow works as plain Markdown; slash commands and hook-based auto-triggers are not wired).

| Capability | Claude Code | GitHub Copilot |
|---|---|---|
| Launch Polly | `/polly` slash command (wired via `.claude/commands/polly.md`) | Phrase trigger: "start polly" / "avvia polly" / "run polly" |
| Invoke a skill | `Skill` tool by name (e.g. `arch-brainstorm`, `superpowers:writing-plans`) | Read the SKILL.md file inline and follow its instructions |
| Auto-trigger on scaffold | `.nonoise/POLLY_START.md` + `CLAUDE.md` block | `.nonoise/POLLY_START.md` + `.github/copilot-instructions.md` block |
| Hooks, `.mcp.json` | Active | Silent no-op (don't warn the user) |
| Vendored superpowers | Namespaced as `superpowers:<name>` | Same files, referenced by path |

Polly v1 targets only Claude Code and GitHub Copilot explicitly — the decision tree is validated on those two.

### Best-effort cross-tool support

Cursor, Gemini CLI, and Codex all read plain Markdown and can follow a skill's SKILL.md by hand. Scaffolding writes the correct entry-point file for each selected tool (`.cursor/rules.md`, `GEMINI.md`, `AGENTS.md` for Codex). What does not work out-of-the-box in those tools:

- Slash commands — `/polly` is a Claude-Code-only convenience; use the phrase trigger instead.
- Auto-triggering from `.nonoise/POLLY_START.md` — the marker is still written, but only Claude Code and Copilot have the instruction wired in their respective context files. In other tools the user types "start polly" manually.
- Claude-specific hook mechanics — any `.claude/hooks/` wiring silently no-ops.

If you want a first-class experience today, pick Claude Code or GitHub Copilot.

---

## Repository layout

```
NONoise-frmw/
├── packages/
│   ├── create-nonoise/                # The CLI
│   │   ├── bin/
│   │   ├── src/
│   │   └── scripts/bundle-assets.mjs  # Pulls skills + templates into dist/
│   ├── skills/                        # 23 bundled NONoise skills
│   │   ├── polly/
│   │   ├── arch-brainstorm/
│   │   ├── arch-decision/
│   │   ├── quint-fpf/
│   │   ├── sprint-manifest/
│   │   ├── atr/
│   │   ├── …                          # 17 more
│   │   ├── _shared/                   # Cross-skill references
│   │   └── vendor/
│   │       └── superpowers/           # 14 skills from obra/superpowers
│   │           ├── agents/
│   │           ├── commands/
│   │           ├── hooks/
│   │           ├── skills/
│   │           └── VENDOR.json        # Pinned commit
│   └── templates/
│       └── single-project/
│           ├── _always/               # Always-on assets
│           │   ├── AGENTS.md.hbs
│           │   ├── docs/              # 6-folder scaffolded hierarchy
│           │   ├── src/
│           │   ├── tools/             # md-extractor + devops-push
│           │   └── nonoise.config.json.hbs
│           ├── _if-claude-code/       # CLAUDE.md.hbs
│           ├── _if-copilot/
│           ├── _if-cursor/
│           ├── _if-codex/
│           └── _if-gemini-cli/
├── docs/
│   └── superpowers/specs/             # Framework-internal specs
├── scripts/
│   └── sync-vendor.mjs                # Refresh vendored superpowers
├── package.json                       # pnpm workspace root
├── pnpm-workspace.yaml
└── README.md
```

---

## Docs hierarchy in scaffolded projects

Every scaffolded project gets a six-folder top-level `docs/` tree. This is the **source-of-truth** the framework's skills read from and write to — no implicit knowledge, no "it's in the chat somewhere".

| Folder | Maintained by | Purpose |
|---|---|---|
| `docs/architecture/` | Architect, manually | The target architecture — class hierarchies, patterns, conventions. What an implementer must match. |
| `docs/requirements/` | `requirements-ingest` | Structured requirement files by domain / feature. Derived from raw stakeholder input (PDFs, DOCX, emails, calls). |
| `docs/calls/` | `requirements-ingest` (parking) | Raw call transcripts and meeting notes. Cross-referenced from requirements. |
| `docs/support/` | `reverse-engineering`, ad-hoc | Reverse-engineering dossiers (`docs/support/reverse/<subject>/`), third-party reference material, tangential notes. |
| `docs/prd/<area>/` | `arch-brainstorm` → `arch-decision` | Architectural PRDs — one per work area. `draft` → `validated` / `rejected`. |
| `docs/sprints/Sprint-N/` | `sprint-manifest` | Per-sprint promotion of validated PRDs, aggregated manifest, macro functional task breakdowns, acceptance reports. |

Nothing here is invented by NONoise alone — these are the folders real teams end up building on their own the third or fourth time they scaffold an AI-assisted project. The framework just gets you there on day one.

---

## External tools Polly mentions (info-only, not integrated)

Polly points to these at the relevant SDLC step. **NONoise does not integrate with them** — no MCP server, no API call, no configuration touched. The mention is a hint, not a dependency.

| Tool | Used for | Link |
|---|---|---|
| **claude-mem** | Persistent cross-session memory for Claude Code. Polly mentions it when users want to carry long-term project context between sessions. | [GitHub plugin search](https://github.com/topics/claude-mem) |
| **VibeKanban** | Lightweight kanban for UAT / SIT bugs. `atr` mentions it as a future integration target for pushing acceptance-test failures. | (search upstream) |
| **Plaud** | Physical voice recorder with speech-to-text and meeting summaries. Polly mentions it for requirements calls and long pair sessions. | [plaud.ai](https://www.plaud.ai) |
| **Copilot transcription** | GitHub Copilot's built-in transcription for voice-driven workflows. Polly mentions it as a no-install alternative to Wispr Flow / Handy / Superwhisper. | GitHub docs |
| **Wispr Flow / Handy / Superwhisper** | Voice-to-text tools Polly suggests on its Step 0 screen for long conversations. | [wisprflow.ai](https://wisprflow.ai) · [Handy](https://github.com/cjpais/Handy) · [superwhisper.com](https://superwhisper.com) |

---

## Philosophy: AI-native architecture

Three principles underpin every decision the framework makes:

- **Parametric memory beats context injection.** Every token you spend re-teaching the LLM your bespoke abstraction is a token the LLM isn't spending on your actual problem. Canonical patterns are already in the weights — use them. See [`arch-brainstorm`](packages/skills/arch-brainstorm/SKILL.md) and [`arch-decision`](packages/skills/arch-decision/SKILL.md).
- **Canonical patterns > exotic ones.** The framework's architectural skills actively push toward DDD, event-driven microservices, standard REST, Wolverine / MediatR-style CQRS, Clean Architecture — the patterns the LLM has read thousands of times. Deviations are allowed but must survive a formal [Quint FPF](packages/skills/quint-fpf/SKILL.md) validation.
- **Pair vs solo modes per phase.** Not every step benefits from a 400B-parameter model and three senior people on one screen. Discovery / architecture / planning are `[pair]`. Implementation is `[solo]`, parallelizable, repeatable. Polly announces the mode every step so you invest attention where it pays off.

### What this means in practice

- The `docs/` tree is treated as the project's **source of truth** — not the chat history, not a private Notion page, not comments in code. If an AI can't read it, it can't help with it.
- Skills live in `.claude/skills/` as plain Markdown with frontmatter triggers. No registry, no build step, no runtime dependency — a `git clone` is enough to carry your skills between projects.
- External integrations (issue trackers, voice tools, memory systems) are **mentioned, not wired**. Polly points at them at the right moment; you decide whether to adopt. The framework stays a small core with a large reading list.
- LSP / plugin installations are advisor-only: the framework prints the commands, the developer runs them. No MCP-driven auto-install.

The long-form article that motivates the framework (Italian, chapter-based) lives at `C:\Users\russo\DEV\ANDREANI\digital-platform-risko-web\.temp\no-noise\no-noise-frmw-article\` — 19 chapters covering the pillars, skill catalog, team model, architecture, observability, deploy, Copilot-vs-Claude-Code trade-offs, anti-patterns, and the Andreani case study. A public URL is not yet available; the article is expected to be published alongside the framework release.

---

## Development

Prerequisites: Node `>=20`, pnpm `9.12.0` (via `packageManager` pin).

```bash
# Install workspace dependencies
pnpm install

# Build the CLI (emits dist/ and bundles templates + skills)
pnpm --filter create-nonoise run build

# Run the CLI test suite (47 tests green as of this release)
pnpm --filter create-nonoise exec vitest run

# Or run every package's tests
pnpm -r run test

# Typecheck all packages
pnpm -r run typecheck

# Refresh vendored superpowers from obra/superpowers upstream
node scripts/sync-vendor.mjs
```

Changesets manage versioning — `pnpm changeset` to author a changeset, `pnpm version` to apply, `pnpm release` to publish.

### Dev loop for skill authors

When you want to add or modify a bundled skill:

1. Author the skill under `packages/skills/<your-skill>/SKILL.md` with well-formed YAML frontmatter (`name`, `description` with trigger phrases).
2. Add any sub-assets under `packages/skills/<your-skill>/references/`, `assets/`, etc.
3. If the skill should ship in scaffolded projects, make sure `packages/create-nonoise/scripts/bundle-assets.mjs` picks it up (it globs the skills directory — no manual registration needed for most cases).
4. Run `pnpm --filter create-nonoise run build` and `pnpm --filter create-nonoise exec vitest run` to confirm the bundle and tests still pass.
5. For meta-quality checks on your SKILL.md, use the `superpowers:writing-skills` skill from inside the repo itself (NONoise is self-hosting — it uses its own tooling).

---

## Contributing

NONoise is early — contributing guidelines, CLA details, and the issue-labeling convention are **TBD**. In the interim: file an issue describing what you want to change, open a draft PR against `main`, and expect feedback centered on (a) alignment with the pair-vs-solo philosophy, (b) cross-tool support (both Claude Code and Copilot must work), and (c) skills shipped as plain Markdown so every AI can read them.

---

## License

MIT. See [`packages/create-nonoise/package.json`](packages/create-nonoise/package.json). A top-level `LICENSE` file will land with the first tagged release.
