# Cross-tool support — Claude Code, Copilot, and friends

NONoise targets multiple AI coding assistants. Some are **first-class** (fully validated and supported); others are **best-effort** (the Markdown flows work, but tool-specific niceties may not). This document lays out the support matrix, the mechanism for each tool, and the degradation profile when leaving first-class territory.

## V1 scope — Claude Code and GitHub Copilot

**Polly v1 targets Claude Code and GitHub Copilot explicitly.** The advisor flow is validated on those two. Both tools are first-class — the SDLC loop is identical; the mechanics underneath differ.

- **Claude Code** is the original target and has the deepest integration: slash commands, `Skill` tool invocation, hooks, MCP servers.
- **GitHub Copilot** is an equal first-class — the scaffolder writes `.github/copilot-instructions.md` and wires the same auto-trigger as a phrased instruction; every skill runs as "read the SKILL.md and follow it".

| Capability | Claude Code | GitHub Copilot |
|---|---|---|
| **Scaffold writes context file** | `CLAUDE.md` (plus `.claude/skills/`, `.claude/commands/`, `.claude/settings.json`) | `.github/copilot-instructions.md` |
| **Launch Polly** | `/polly` slash command (wired via `.claude/commands/polly.md`) | Phrase trigger: "start polly" / "avvia polly" / "run polly" |
| **Pick a development mode** | `/polly quick\|medium\|long <goal>`; the prompt Polly returns starts with `/regia <mode>` | Phrase trigger: `start polly quick <goal>`; the `development-modes` block in `.github/copilot-instructions.md` |
| **Orchestration** | [Regia](regia.md) mod (`regia@claude-regia`), installed by NONoise: delegation, model and effort per task, swarms of Claude, Codex and Qwen Code agents | None from NONoise: the `development-modes` block says when to delegate, Copilot's own subagent features do it |
| **Invoke a specialist skill** | `Skill` tool by name — e.g. `arch-brainstorm`, `superpowers:writing-plans` | Read the SKILL.md file inline and follow its instructions |
| **Optional NONoise hooks** | Project `.claude/settings.json` | CLI project `.github/hooks/nonoise.json` (version 1); see verified limits below |
| **MCP servers** (`.mcp.json`) | Project code graph (`codebase-memory-mcp`), Haft, optional REA | CLI workspace `.mcp.json` (code graph, Haft, optional REA); `.vscode/mcp.json` (code graph) for Copilot in VS Code |
| **Worktrees** (`superpowers:using-git-worktrees`) | Active | Active (worktrees are a git feature, not tool-specific) |
| **Native vendors** | `superpowers:<name>` plugin; `/impeccable <subcommand>` | Native Copilot plugin skills and `.github/skills/impeccable/` |
| **Memory integration** | `claude-mem` plugin mentioned by Polly (info-only) | Native memory features used by the user |

## Best-effort tier — Cursor, Gemini CLI, Codex

These tools read plain Markdown and can follow a SKILL.md by hand. NONoise writes the correct entry-point file for each during scaffolding, but v1 does **not** validate the full flow on them.

- **Cursor** — entry file `.cursor/rules.md`; the skill library is in `.claude/skills/` and Cursor users open the SKILL.md manually. Most skills work; slash commands and hooks do not.
- **Gemini CLI** — entry file `GEMINI.md`. Gemini uses an `activate_skill` tool mechanism that differs from Claude Code's; NONoise ships the skills as Markdown under `.claude/skills/` and the Gemini context file points at them. Best-effort.
- **Codex** — entry file `AGENTS.md` (the industry-standard file name many tools respect). When Codex is selected, the NONoise skills are also installed in `.agents/skills/`, the directory Codex reads repository skills from.

### Support matrix — best-effort tier

| Capability | Cursor | Gemini CLI | Codex |
|---|---|---|---|
| **Scaffold writes context file** | `.cursor/rules.md` | `GEMINI.md` | `AGENTS.md` |
| **Launch Polly** | Read `.claude/skills/polly/SKILL.md` manually | Ask Gemini to activate `polly` skill | Ask Codex to use the `polly` skill (from `.agents/skills/`) |
| **Invoke a specialist skill** | Read its SKILL.md manually | Ask Gemini to activate the named skill | Ask Codex to use the named skill from `.agents/skills/` |
| **NONoise hooks / MCP** | No optional hook integration; code graph MCP in `.cursor/mcp.json` | No optional hook integration; code graph MCP in `.gemini/settings.json` | Project hooks per verified CLI support; MCP in `.codex/config.toml` |
| **Development modes** | `development-modes` block in `.cursor/rules.md` | `development-modes` block in `GEMINI.md` | `development-modes` block in `AGENTS.md` |

Most of the SDLC flow works in best-effort tier because skills are plain Markdown and the AI follows them conversationally. What degrades is slash-command ergonomics and hook-based validations.

## Deferred — full support on best-effort tier

v1 explicitly does not validate Polly's full advisor flow on Cursor / Gemini CLI / Codex. Reaching Claude-Code / Copilot parity requires:

1. Per-tool phrasing in the entry-point file blocks (`.cursor/rules.md`, `GEMINI.md`, `AGENTS.md`) tested against the actual tool's rule-matching behaviour.
2. Tool-specific skill invocation syntax encoded in the skill library (e.g., Gemini's `activate_skill` vs Claude Code's `Skill` tool).
3. Validation of the auto-trigger path on each tool.
4. A decision on whether namespacing (`superpowers:*`) survives the translation or collapses to filenames.

These are roadmap items. Until they ship, the tier stays *best-effort*: "most things work; some tool-specific niceties don't; if you want first-class, pick Claude Code or Copilot".

## When scaffolding for multiple tools

`create-nonoise` asks which AI tools your team uses. In v1 the prompt is tuned to Claude Code and Copilot (both / either), with a note that other tools are best-effort. Selecting multiple writes all the corresponding entry files from a single source of truth — `docs-md-generator` keeps them coherent.

```
Which AI tools does your team use?
[x] Claude Code          (first-class)
[x] GitHub Copilot       (first-class)
[ ] Cursor               (best-effort)
[ ] Gemini CLI           (best-effort)
[ ] Codex-style agents   (best-effort)
```

The scaffold writes:

- Always: `AGENTS.md` (industry-standard, read by multiple tools).
- If Claude Code: `CLAUDE.md`, `.claude/skills/`, `.claude/commands/`, `.claude/settings.json`.
- If Copilot: `.github/copilot-instructions.md`.
- If Cursor: `.cursor/rules.md`.
- If Gemini CLI: `GEMINI.md`.

All entry files are generated from one template per template plus shared stanzas — the Polly invocation block, the `codebase-memory` (code graph first) block, the `development-modes` block, the project glossary — so edits to shared content don't require touching each file manually.

## Why multiple tools matter

Three practical reasons NONoise bothers with cross-tool support:

1. **Teams don't pick one tool.** In any organisation of ≥ 10 developers, some will be on Claude Code, some on Copilot, some experimenting with Cursor. If the framework forces a tool choice, it fragments the team. Cross-tool by default means a senior can pair with a junior on whichever tool each is comfortable with and the project stays navigable for both.
2. **Tools churn fast.** Models improve at different rates in different tools. A project tied to one tool inherits the tool's release cadence. NONoise's skill library, being plain Markdown, is invariant to the tool's evolution.
3. **Vendor independence.** Organisations that can't commit to a single vendor for policy reasons (procurement, security review, export control) can still adopt NONoise because it runs on whichever AI tool they already have approved.

## The shared substrate

Every NONoise skill is plain Markdown because that's the greatest common denominator. Every AI tool in current use can read and follow Markdown. If a future tool appears, the framework works with it as long as the tool can read `.md` files and follow instructions — no porting required.

The convention each entry-point file respects:

- Frontmatter with `name` and `description` on SKILL.md.
- Trigger phrases in the `description` field that a trigger-matching mechanism can key off.
- A clear body with numbered steps where applicable.
- Sub-assets under `references/`, `assets/`, `scripts/`.

Tools that support richer mechanisms (Claude Code's `Skill` tool, Gemini's `activate_skill`) layer on top; tools that don't fall back to "read the file and follow it".

## Orchestration — Regia in Claude Code, native features elsewhere

Orchestration is the one capability NONoise does not deliver as cross-tool Markdown. In Claude Code it is [Regia](regia.md), a mod installed as the plugin `regia@claude-regia`. The other tools have no equivalent from NONoise.

| | Claude Code | Copilot / Codex / Cursor / Gemini CLI |
|---|---|---|
| **Modes** | `/regia long\|medium\|quick [goal]`, enforced by the mod's rule in the system prompt | The `development-modes` table in the context file, as plain instructions |
| **Delegation** | The main session delegates (medium) or orchestrates (long) | Whatever subagent feature the tool has; nothing is enforced |
| **Model and effort per task** | Chosen for each subagent call | Not provided |
| **Swarms** | Claude, Codex and Qwen Code agents on a dependency board, one git worktree per task that writes | Not provided |
| **Plan, questions, surveillance, live pane** | Provided by Regia | Not provided |

Until 1.8 the `swarm-router` skill covered this for every harness from one SKILL.md, with shell-outs to peer CLIs (`gemini -p`, `codex exec`, `copilot -p`) on the best-effort tools. It is retired together with `copilot-delegate` and `gemini-delegate`, and it has no cross-harness successor: no NONoise skill fans work out from Copilot, Gemini CLI or Codex to other model CLIs, and nothing delegates to Copilot CLI or Gemini CLI any more. Regia's executors are Claude, Codex and Qwen Code.

Where the superpowers pack is installed, `superpowers:dispatching-parallel-agents` and `superpowers:subagent-driven-development` still describe parallel work in any tool.

## Where to read more

- [`polly.md`](polly.md) §Best-effort mode — what degrades when Polly runs outside Claude Code / Copilot.
- [`development-modes.md`](development-modes.md) — quick / medium / long, the FPF gate, and how each tool gets the same modes.
- [`regia.md`](regia.md) — the orchestration layer for Claude Code: installation, mode mapping, limits.
- [`skills-catalog.md`](skills-catalog.md) §Authoring a new skill — conventions that keep skills cross-tool.
- `packages/skills/vendor/superpowers/skills/using-superpowers/references/copilot-tools.md`, `gemini-tools.md`, `codex-tools.md` — tool-equivalence mapping for the superpowers ecosystem, which NONoise inherits.

## Native vendor delivery (1.7)

Vendor dependencies use their upstream installers by default (`native` mode);
`--vendor-mode embed` is the offline fallback with bundled snapshots. In native
mode, do not infer that `superpowers:*` is absent because a local folder is
missing: resolve it from the harness plugin registry. Codex and Copilot use
`superpowers@nonoise`; the marketplace pins the same superpowers SHA as Claude.
`create-nonoise doctor [path]` checks each selected harness without installing.

### Per-harness skill directories

The profile-selected NONoise skills are installed in `.claude/skills/`. When Codex or
Copilot CLI is selected they are also installed in `.agents/skills/`, because
those harnesses read repository skills from there. `doctor` checks the
directory each selected harness reads:

| Harness | NONoise skills read from |
|---|---|
| Claude Code | `.claude/skills/` |
| Codex | `.agents/skills/` |
| Copilot CLI | `.agents/skills/` |
| Cursor / Gemini CLI | `.claude/skills/` (pointed to by the context file) |

### Regia and the Codex plugin (Claude Code)

For Claude Code, NONoise installs the Regia mod as the plugin `regia@claude-regia`
(marketplace `russosalv/claude-regia`). Native mode installs it at project scope;
embed mode only declares it in `.claude/settings.json`, so Claude Code offers it
when the project is trusted. It is not pinned and updates through its own
marketplace. See [`regia.md`](regia.md).

NONoise no longer installs OpenAI's Codex plugin `codex@openai-codex` itself.
Regia installs it on its first interactive session when the `codex` CLI is on the
machine; Regia's Codex jobs and swarm tasks run on that same CLI.

The hand-over skills `swarm-router`, `copilot-delegate` and `gemini-delegate` (and
`codex-delegate`, retired in 1.7) are no longer shipped. `--upgrade` removes
unmodified copies and preserves modified ones. Profile-less 1.6/1.7 upgrades defer
cleanup and keep every prior file.

### Native vendor layout

Claude project settings declare the NONoise, Anthropic and `claude-regia`
marketplaces and vendor plugins. The NONoise marketplace is pinned to the CLI's
release tag (`russosalv/NONoise#v<version>` for Claude, `@v<version>` for Codex;
Copilot reads the default branch). Impeccable uses one skill with subcommands (providers `claude`,
`codex`, `github`); for Codex it lands under `.agents/skills/`. Offline `--vendor-mode embed` retains the old layout.
See [installation](installation.md#native-vendor-installation-and-upgrades-17).

### Code graph (1.9)

The code graph is the same MCP server, `codebase-memory-mcp`, in every tool. It
replaces graphify and its per-platform skill folders. The binary is installed once
per machine and is not pinned: a scaffold installs the latest release
(`npm install -g codebase-memory-mcp@latest`) only when none is on `PATH`,
`--upgrade` and `--code-graph-only` move it to the latest release, and NONoise
never downgrades it. The server is registered only in project-local config:

| Harness | MCP config |
|---|---|
| Claude Code | `.mcp.json` |
| Copilot CLI | `.mcp.json` |
| Copilot in VS Code | `.vscode/mcp.json` |
| Codex | `.codex/config.toml` |
| Cursor | `.cursor/mcp.json` |
| Gemini CLI | `.gemini/settings.json` |

The `codebase-memory` skill and the `codebase-memory` block of each context file
tell the assistant to query the graph before grep or raw file reads. Where the
MCP tools are not connected (host without MCP, server not yet approved, session
not restarted) the same tools run through `codebase-memory-mcp cli <tool>`.
Project trust and MCP approval work as described for Haft below.
See [installation](installation.md#code-graph-codebase-memory-mcp-19).

## Development modes across tools (1.9)

The quick / medium / long modes are plain instructions, so the same table reaches
every tool:

- **Claude Code** — `/polly quick|medium|long <goal>`, or Polly infers the mode.
  NONoise installs the [Regia](regia.md) mod, whose `/regia <mode> <goal>` maps
  1:1 to the same three modes; Polly's prompt starts with it. Regia is
  Claude-Code-only.
- **Codex and Copilot** — the `development-modes` managed block in `AGENTS.md`
  and `.github/copilot-instructions.md` carries the same table and rules. Phrase
  triggers such as `start polly quick <goal>` select the mode. There is no Regia
  here: delegation relies on the tool's own subagent features.
- **Cursor and Gemini CLI** — the same block in `.cursor/rules.md` and `GEMINI.md`.

Full description: [`development-modes.md`](development-modes.md).

## Haft FPF integration

Haft is installed in both vendor modes and is required for formal FPF validation. Claude and Codex use upstream-generated
project carriers; Copilot CLI is configured by NONoise and reuses Haft's agent
skill output, with no second skill distribution:

| Harness | Explicit init flags (plus `--local`) | MCP | Skills |
|---|---|---|---|
| Claude Code | `--claude` | `.mcp.json` → `haft serve` | `.claude/skills/h-*` |
| Codex | `--codex` | `.codex/config.toml` → `haft serve` | `.agents/skills/h-*` |
| Copilot CLI | `--agents` unless Codex already selected | shared `.mcp.json` → `haft serve` | same `.agents/skills/h-*` |

Verified discovery contracts with installed Copilot CLI 1.0.98:
`copilot mcp --help`, `copilot skill --help`, `copilot mcp list --json` and
`copilot skill list --json`. Workspace MCP sources require folder trust; a clean
home can list skills while returning no MCP servers until trust is granted.
Review the project and use the interactive trust flow, then
`copilot mcp get haft --json`. In this container, the isolated fixture grants
trust by adding the project to `trustedFolders` in `~/.copilot/config.json`,
as documented by GitHub. CLI 1.0.98 rejects `copilot config trustedFolders`
with `Unknown settings key segment "trustedFolders" at "<root>"`.
NONoise does not grant trust or log in on the user's behalf. See the
[official CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#mcp-server-loading-priority).
For prompt-mode sessions the CLI also documents
`GITHUB_COPILOT_PROMPT_MODE_WORKSPACE_MCP=true`. A discovery listing alone is not
an authenticated model-to-tool execution test.

Both `<!-- haft:start -->` / `<!-- haft:end -->` and the NONoise managed block
coexist in project instructions. Each installer owns only its own block.
Formal validation runs only when the FPF gate in `arch-decision` fires; a
lightweight decision recorded in the PRD needs no Haft runtime.
`quint-fpf` retains its name as an adapter, routes to `h-frame`, `h-explore`,
`h-compare`, `h-decide`, `h-verify`, `h-status` or `h-reason`, and stops if Haft MCP
is unavailable. The Phase 5.5 operator choice in `arch-decision` supplies the
explicit binding request required by `h-decide`; a comparison does not bind.
PRDs keep root-relative IDs/paths to `.haft/` even after sprint promotion.

Codex also loads project `.codex/config.toml` only for trusted projects (see
[official configuration precedence](https://learn.chatgpt.com/docs/config-file/config-basic#configuration-precedence)).
For these isolated fixtures, `~/.codex/config.toml` has a project entry with
`trust_level = "trusted"`; NONoise never grants trust automatically.
`claude mcp list` may report pending approval until the user approves the server.

## Profiles and verified host formats (1.8.0)

All three CLI hosts consume the same [profile and stack catalog](install-profiles.md).
Skills are native YAML-frontmatter Markdown in `.claude/skills/` (Claude) and
`.agents/skills/` (Codex/Copilot). ECC agents become Claude Markdown, Copilot
`.agent.md`, and Codex TOML. CI checks discoverability metadata for every shipped
skill and the actual converted agent outputs; it does not claim that every host
supports every optional upstream skill extension.

Optional hook registration, supported events, confirmation behavior and version
proofs are maintained in [hook compatibility](hooks-compatibility.md). Hook scripts
are project-local Node modules with no ECC runtime dependency. Copilot CLI support
must not be inferred to mean identical behavior in every Copilot editor surface.

REA is registered only in project `.mcp.json` for Claude/Copilot and
`.codex/config.toml` for Codex, pinned to 6.5.0 with compact schemas. Codex startup
timeout is 120 seconds. Project trust and MCP approval/restart may be necessary;
`doctor` reports configuration separately from actual connection readiness.
See [REA integration](rea-integration.md).
