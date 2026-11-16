# create-nonoise

**An AI SDLC bootstrapper.** One command turns an empty directory into a fully-wired, AI-ready project — skills, docs hierarchy, cross-tool context files, and an advisor (Polly) that tells your team where they are in the SDLC and what to do next.

🌐 **Site:** https://nonoise-frmk.com
📦 **Repo:** https://github.com/russosalv/NONoise
📚 **Docs:** https://github.com/russosalv/NONoise/tree/main/docs

---

## Quickstart

```bash
npx create-nonoise my-project
cd my-project
# Open in Claude Code, or tell Copilot: "start polly"
```

> **GitHub Release fallback.** If the npm registry is temporarily unavailable, install the identical tarball from the GitHub Release:
>
> ```bash
> npx https://github.com/russosalv/NONoise/releases/download/v1.8.0/create-nonoise-1.8.0.tgz my-project
> ```

The CLI asks which AI tools your team uses (Claude Code, GitHub Copilot), then scaffolds:

- **`src/`** — your code. Stack-agnostic: pick .NET, Node, Python, Rust, Go.
- **`docs/`** — six-folder source-of-truth hierarchy (architecture, requirements, calls, support, prd, sprints).
- **`.claude/skills/`** (and `.agents/skills/` for Codex / Copilot CLI) — 27 NONoise skills plus vendor packs, 40+ in total: Polly advisor, BMAD personas, Haft FPF validator (`quint-fpf` adapter), the `codebase-memory` code graph, `reuse-first` and `docs-steward`, native [superpowers](https://github.com/obra/superpowers), design and ops packs.
- **Agents** (`.claude/agents/`, `.github/agents/`, `.codex/agents/`) — three NONoise agents (`graph-explorer`, `blueprint-architect`, `evidence-reviewer`) plus the reviewers and build resolvers selected by profile and `--stack`. See [Agents](#agents).
- **Regia** (Claude Code only) — the orchestration layer, installed as the plugin `regia@claude-regia`: the main session delegates, model and effort are chosen per task, and swarms of Claude, Codex, Qwen Code and Copilot agents run on a dependency board. See [Orchestration (Regia)](#orchestration-regia).
- **Context files** for each selected tool — `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md` — generated from one source of truth.
- **`tools/md-extractor/`** and **`tools/devops-push/`** — Node CLIs.
- **`.nonoise/sdlc-flow.md`** — the SDLC flow Polly reads to detect where you are and suggest the next skill, sized per task as quick, medium or long.

## Options

```bash
npx create-nonoise [directory] [options]
npx create-nonoise doctor [path]

  --vendor-mode <mode>  native (default): upstream installers; embed: offline bundled copies
  --workspace <kind>    new | existing-single | existing-multi
  --template <name>     single-project | multi-repo   (default: single-project)
  --ai <csv>            claude-code,copilot,codex,cursor,gemini-cli
  --profile <name>      minimal | core (default) | developer | security | brownfield | full
  --stack <csv>         languages/frameworks, or none (default); saved for upgrades:
                        dotnet,typescript,angular,web,python,go,rust,java,kotlin,
                        cpp,swift,php,ruby,react,vue,flutter,fsharp
  --user-name <name>    developer name (used by AI to address you)
  --user-locale <iso>   ISO 639-1 language code (en, it, …)
  --reverse / --no-reverse   enable/disable reverse-engineering config block
  --no-git              skip git init
  --yes, -y             non-interactive defaults
  --version, -v         print version
  --help, -h            print help

Maintenance (existing projects):
  --upgrade [path]          refresh bundled skills + update the code graph
  --code-graph-only [path]  narrow path: only codebase-memory-mcp and its MCP config
                            (--graphify-only is accepted as an alias)
```

When run with no flags, the CLI asks interactively whether to:

1. **Create a new NONoise project** (full scaffold)
2. **Upgrade an existing project** (refresh skills + code graph)
3. **Install the code graph only** (`codebase-memory-mcp`; narrow, idempotent fix)

If you pass a positional path that already contains `nonoise.config.json`, the CLI auto-detects it as an existing project and prompts: *Upgrade / Install the code graph only / Cancel* — it never silently scaffolds over an existing project.

## Upgrading an existing project

NONoise skills are copied at scaffold time and stay frozen at that version — `npm install -g create-nonoise` doesn't reach them. To pick up improvements (e.g. hardened anti-pattern guards on `reverse-engineering`, new skills, the `/index` slash command), run:

```bash
# Interactive (auto-detect)
npx create-nonoise@latest path/to/existing-project

# Direct, non-interactive
npx create-nonoise@latest --upgrade path/to/existing-project

# Read-only health check (plugins, skills per harness, code graph, Haft, broken skill symlinks)
npx create-nonoise@latest doctor path/to/existing-project
```

What `--upgrade` does:

- **Re-copies all NONoise skills** under `<project>/.claude/skills/` (and `.agents/skills/` when Codex or Copilot CLI is selected), picking up the latest `SKILL.md` files.
- **Re-runs the vendor installers** — native mode by default (upstream plugins and installers, NONoise marketplace pinned to the CLI release tag), or the bundled snapshots with `--vendor-mode embed` — plus the Haft FPF runtime. For Claude Code this includes the Regia mod (`regia@claude-regia`): installed at project scope in native mode, declared in `.claude/settings.json` in embed mode. Regia is not pinned; it updates through its own marketplace.
- **Updates the code graph** — `codebase-memory-mcp` is not pinned: upgrade runs `npm install -g codebase-memory-mcp@latest` and registers the MCP server in the project-local config of the selected tools. A failed update keeps the working binary and prints why; NONoise never downgrades it. An unmodified graphify integration from earlier versions is retired (graphify skill folders, graphify hooks in `.claude/settings.json`, `.nonoise/native-graphify.json`); `graphify-out/` and the graphify CLI are left for you to remove (`uv tool uninstall graphifyy`).
- **Retired skills** — `swarm-router`, `copilot-delegate` and `gemini-delegate` (and `codex-delegate`, retired in 1.7) are no longer shipped: Regia replaces them. Upgrade removes pristine copies and keeps edited ones, which it lists, together with modified vendor files. Profile-less 1.6/1.7 upgrades retain every previous file until an explicit `--profile` opts into the cleanup. NONoise no longer installs the Codex plugin `codex@openai-codex` itself: Regia installs it when the `codex` CLI is on the machine.
- **Updates only the NONoise managed block** in `CLAUDE.md`, `AGENTS.md`, `copilot-instructions.md` — your edits outside the markers stay.
- **Keeps your `nonoise.config.json` settings** — it only refreshes `frameworkVersion`, `vendorMode`, `aiTools`, the skill list and `preservedVendorFiles`.

For the narrower repair path (only the code graph, no skill refresh):

```bash
npx create-nonoise@latest --code-graph-only path/to/existing-project
```

In `--yes` mode auto-detection refuses to operate on an existing project and prints the explicit `--upgrade` / `--code-graph-only` command you should run — non-interactive scripts cannot silently clobber an existing project.

## The SDLC flow

```
Requirements → Discovery → Architecture → Sprint → Implementation → Acceptance → Operations
```

Every phase is annotated `[pair]` (multiple seniors, large model) or `[solo]` (one dev per task, smaller model, parallelisable). Invoke `/polly` to find out where you are and get the exact prompt for the next skill.

The flow is sized to the work. `/polly quick <goal>` goes straight to the change, `/polly medium <goal>` is spec → plan → implement, `/polly long <goal>` is the full flow above; with a goal and no mode, Polly picks the lightest mode that fits. Formal Haft FPF validation is proposed only when the FPF gate fires (a costly-to-reverse decision with at least two viable options, or an explicit request); otherwise the choice is recorded in the PRD as a lightweight decision. Details: [development modes](https://github.com/russosalv/NONoise/blob/main/docs/development-modes.md).

## Orchestration (Regia)

For Claude Code, NONoise installs [Regia](https://github.com/russosalv/claude-regia), a Claude Code mod, as the plugin `regia@claude-regia` (all profiles except `minimal`). Regia is the framework's orchestration layer: the main session coordinates instead of doing all the work itself, each task gets the model and effort it needs, and swarms of Claude, Codex, Qwen Code and Copilot agents run on a dependency board with an isolated git worktree for every task that writes. It also keeps the plan as a task list, brings you questions with their context (as notifications when you are away), detects stuck agents, wakes an idle session while the plan has open items, and shows everything in a live pane (`/regia`). `/regia doctor` reports what is active.

Its three modes are NONoise's three development modes: `/regia long|medium|quick [goal]`. `/polly long <goal>` hands back a prompt that starts with `/regia long`, so the mode is chosen once.

Regia replaces the `swarm-router`, `copilot-delegate` and `gemini-delegate` skills, which are no longer shipped. It is Claude-Code-only: Codex, Copilot, Cursor and Gemini CLI get the development-modes table in their context file and use their own subagent features. Its executors are Claude, Codex, Qwen Code and Copilot: delegation to Copilot CLI exists again, through Regia, while there is none to Gemini CLI. Details: [Regia in NONoise](https://github.com/russosalv/NONoise/blob/main/docs/regia.md).

## Agents

Every profile except `minimal` installs three NONoise agents, converted for Claude Code (`.claude/agents/`), Copilot (`.github/agents/`) and Codex (`.codex/agents/`). Cursor and Gemini CLI get none.

- **`graph-explorer`** — maps how an existing feature works (entry points, call path, layers, conventions, reusable pieces) by querying the code graph first. Used before design in existing code.
- **`blueprint-architect`** — turns an approved spec into a file-level blueprint with interfaces, data flow and a build sequence, inside the already-decided architecture.
- **`evidence-reviewer`** — reviews a change and reports only findings it can prove; "no findings" is a valid result. Runs at the end of an implementation task, before acceptance or a pull request.

All three are read-only. Next to them, `--profile` selects the common ECC agents and `--stack` the language reviewers and build resolvers. Two skills in the bundle complete the picture: `reuse-first` (an adopt / extend / build decision before new code or a new dependency) and `docs-steward` (one owner document per kind of fact; audit first, fixes on request). Details: [Agents](https://github.com/russosalv/NONoise/blob/main/docs/agents.md).

## Code graph (codebase-memory-mcp)

Every scaffolded project (all profiles except `minimal`) is wired to [`codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp), a local code knowledge graph: functions, classes, call chains, HTTP routes, infrastructure files and documentation sections, linked to each other.

**No Python, no `uv`, no API key.** The code graph is one native binary (macOS, Linux and native Windows), and it is not pinned. The scaffold installs the latest release (`npm install -g codebase-memory-mcp@latest`) only when no binary answers on `PATH`, and leaves an existing one alone; `--upgrade` and `--code-graph-only` move it to the latest release. In between you update it with the same command whenever you like, and `create-nonoise doctor` flags a version older than 0.12.0. The scaffold also registers the MCP server `codebase-memory-mcp` in the project's own config — `.mcp.json` (Claude Code, Copilot CLI), `.vscode/mcp.json` (Copilot in VS Code), `.codex/config.toml` (Codex), `.cursor/mcp.json`, `.gemini/settings.json`. It never runs upstream `codebase-memory-mcp install`, which edits user-global configuration. Indexing is deterministic and the index lives in `~/.cache/codebase-memory-mcp/`, outside the repository.

Build the graph once; it then stays in sync while a session is open:

```
/index                   # Claude Code: index the project root
/index <path>            # index a specific path (a sub-repo in a multi-repo workspace)
```

In any other tool, say "index this repository", or run `codebase-memory-mcp cli index_repository --repo-path .`. The `codebase-memory` skill tells the assistant which MCP tool answers which question (`get_architecture`, `search_graph`, `trace_path`, `detect_changes`, …) and falls back to `codebase-memory-mcp cli <tool>` when the MCP tools are not connected.

## Who this is for

Teams adopting AI-assisted development with **Claude Code** or **GitHub Copilot** as first-class AI tools (v1 scope). Cursor, Gemini CLI, and Codex work in best-effort mode — the skills are plain Markdown and any tool can follow them.

## Learn more

- [Overview & philosophy](https://github.com/russosalv/NONoise/blob/main/docs/overview.md)
- [Full SDLC flow](https://github.com/russosalv/NONoise/blob/main/docs/sdlc.md)
- [Polly decision tree](https://github.com/russosalv/NONoise/blob/main/docs/polly.md)
- [Development modes — quick / medium / long](https://github.com/russosalv/NONoise/blob/main/docs/development-modes.md)
- [Regia — orchestration in Claude Code](https://github.com/russosalv/NONoise/blob/main/docs/regia.md)
- [Skill catalog (40+ skills)](https://github.com/russosalv/NONoise/blob/main/docs/skills-catalog.md)
- [Agents — NONoise agents and ECC reviewers per stack](https://github.com/russosalv/NONoise/blob/main/docs/agents.md)
- [Cross-tool support matrix](https://github.com/russosalv/NONoise/blob/main/docs/cross-tool.md)

## License

MIT, with attribution. See the repo for full `LICENSE` and `ATTRIBUTION.md`.

## Acknowledgements

NONoise owes a specific debt to [ECC](https://github.com/affaan-m/ECC) (MIT), for two things:

- **A pinned snapshot.** The common agents, language reviewers, build resolvers, rules and process skills selected by `--profile` and `--stack` are an adapted copy of ECC at a fixed commit ([source and adaptations](https://github.com/russosalv/NONoise/blob/main/packages/skills/vendor/ecc/UPSTREAM.md)).
- **Inspiration.** NONoise's own agents (`graph-explorer`, `blueprint-architect`, `evidence-reviewer`) and the skills `reuse-first` and `docs-steward` were written by NONoise after studying ECC. Each one names, in its own text, the ECC agent or skill it draws on.

---

Created by [Alessandro Russo](https://github.com/russosalv).

### Stack-specific agents and rules (1.8.0)

Use `--stack dotnet,angular`, `--stack typescript` or `--stack none` with the wizard or `--upgrade`. Accepted values: `dotnet`, `typescript`, `angular`, `web`, `python`, `go`, `rust`, `java`, `kotlin`, `cpp`, `swift`, `php`, `ruby`, `react`, `vue`, `flutter`, `fsharp`, or `none` (the thirteen from `python` on were added in 1.9 and install a language reviewer, a build resolver where ECC has one, and a rule group — no stack skills). The choice is saved in `nonoise.config.json`. The profile selects common ECC agents/rules and process skills; language rules, reviewers and stack skills follow `--stack`. Minimal excludes ECC capabilities. ECC is a pinned local MIT snapshot, never an auto-updating plugin. Upgrades preserve modified agents, rules and NONoise/ECC skills using SHA-256 ownership; `doctor` reports missing or modified ECC files.

[Full stack mapping and update procedure](https://github.com/russosalv/NONoise/blob/main/docs/ecc-integration.md) · [Agents](https://github.com/russosalv/NONoise/blob/main/docs/agents.md).

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

See [profile table](../../docs/install-profiles.md), [verified hook formats](../../docs/hooks-compatibility.md), and [REA activation](../../docs/rea-integration.md).
