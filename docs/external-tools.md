# External tools and project integrations

Most tools Polly mentions are advisory. Explicit framework integrations are
the code graph (`codebase-memory-mcp`), Haft, native vendor plugins (among them Regia, the orchestration mod for Claude Code) and optional REA. Profile selection controls
which integrations the CLI installs; `minimal` skips external runtimes. No secrets
are shipped. [Profiles](install-profiles.md) distinguish this setup from Polly's
recommendations.

## Why advisor-only

Three reasons:

1. **Trust boundary.** The user's tooling environment is theirs. Auto-modifying it — even with consent — is bad posture in enterprise contexts with strict endpoint policy, procurement review, or security sign-off. Printing the install command and letting the user copy-paste respects that boundary.
2. **Vendor neutrality.** Polly doesn't want to become a sales channel for any particular vendor. Listing options with a one-line value proposition keeps the framework aligned with the user's interests, not any vendor's.
3. **Reproducibility.** If the framework auto-installs tools at scaffold time, the resulting project becomes non-reproducible across machines with different pre-existing states. Advisor-only keeps scaffolding deterministic.

## The tools Polly mentions

### Voice-to-text (Step 0 — first screen of every Polly session)

Polly suggests voice input for long pair-work sessions. The three mainstream options:

- **Wispr Flow** — cross-platform, commercial, polished UX. https://wisprflow.ai
- **Handy** — open-source, Win / Mac / Linux. https://github.com/cjpais/Handy
- **Superwhisper** — macOS only, excellent quality. https://superwhisper.com

Polly also mentions, as a fourth option when the team uses GitHub Copilot:

- **Copilot native transcription** — built into Copilot recent versions. No install needed; use whatever binding your Copilot surface provides.

And for dedicated recording hardware used in requirements-gathering calls:

- **Plaud** — physical recorder with on-device speech-to-text and meeting summaries. Useful for stakeholder interviews where typing breaks the conversation flow. https://www.plaud.ai
- **Microsoft Copilot in Teams** — native call recording with transcription for teams already on Microsoft 365.

**What NONoise does not do:** install them, configure them, integrate them, push text from them into the IDE. The user installs whichever they like; output files go wherever the tool puts them; `requirements-ingest` accepts those files as input if they're Markdown or common document formats.

### Cross-session memory (mentioned when context survives multiple sessions)

- **`claude-mem`** — persistent cross-session memory for Claude Code. Mentioned when users want to carry long-term project context between sessions. GitHub plugin search: https://github.com/topics/claude-mem
- **GitHub Copilot native memory** — where Copilot's own memory features apply.

Polly mentions these at the relevant moments (e.g., "you'll be back on this project next week; consider enabling `claude-mem` to carry forward what we built today"). She does not install the plugin, does not configure it, does not push observations to it.

### Issue trackers (sprint phase — `spec-to-workitem`)

- **Azure DevOps** — primary tracker. The `spec-to-workitem` adapter targets it.
- **Jira** — adapter available.
- **GitHub Issues** — adapter available.
- **Linear** — adapter available.

The `spec-to-workitem` skill is the integration layer. It reads the sprint manifest and pushes work items via the tracker's REST API. Credentials come from the user's environment (`AZURE_DEVOPS_PAT`, `JIRA_TOKEN`, etc.) — the framework never ships credentials or stores them.

The `tools/devops-push/` Node CLI (scaffolded into every project) is a dedicated Azure-DevOps-first pusher for teams that want an interactive workflow over the skill-driven one.

### UAT / SIT bug triage

- **Paseo** — lightweight kanban for UAT / SIT bugs. Mentioned by `atr` as a future push target for acceptance-test failures (UAT integration is on the ATR roadmap).

The mention surfaces during the atr phase; the framework does not push to Paseo automatically. Paseo has an "copy-as-fetch" pattern for bugs — the idea is that a failing acceptance test produces a Paseo-ready fetch command the user runs manually.

### Code graph

- **codebase-memory-mcp** — indexes a codebase into a local knowledge graph: functions, classes, call chains, HTTP routes, infrastructure files and documentation sections, linked to each other. One native binary, no Python or `uv`, no LLM and no API key; indexing is deterministic. The binary is not pinned: the `create-nonoise` CLI installs the latest release (`npm install -g codebase-memory-mcp@latest`) at scaffold time only when no binary answers on `PATH`, moves it to the latest release on `--upgrade` and `--code-graph-only`, and otherwise leaves updates to you. It registers the MCP server `codebase-memory-mcp` in the project-local config of each selected tool (`.mcp.json`, `.vscode/mcp.json`, `.codex/config.toml`, `.cursor/mcp.json`, `.gemini/settings.json`). It never runs upstream `codebase-memory-mcp install`, which edits user-global configuration. Build the graph once with `/index <path>` in Claude Code or "index this repository" in any tool; it then stays in sync while a session is open. The `codebase-memory` skill maps questions to tools (`get_architecture`, `search_graph`, `trace_path`, `detect_changes`, `get_code_snippet`, …); without MCP the same tools run as `codebase-memory-mcp cli <tool>`. https://github.com/DeusData/codebase-memory-mcp

Output: none in the repository. The index lives in `~/.cache/codebase-memory-mcp/`. The context files tell the AI to call `get_architecture` and `search_graph` before grep or raw file reads. See [`sdlc.md`](sdlc.md) §Brownfield prefix and [`installation.md`](installation.md#code-graph-codebase-memory-mcp-19).

### Orchestration (Claude Code)

- **Regia** — a Claude Code mod that makes the main session coordinate instead of doing all the work itself: three modes (`/regia long|medium|quick`, the same as NONoise's development modes), model and effort chosen per task, swarms of Claude, Codex, Qwen/Qoder and Copilot agents, the plan as a task list, questions with their context, a live pane. The `create-nonoise` CLI installs it for Claude Code as the plugin `regia@claude-regia` (native mode) or declares it in `.claude/settings.json` (embed mode). It is not pinned and updates through its own marketplace. https://github.com/russosalv/claude-regia

Regia is installed, not just mentioned, and it replaces the retired `swarm-router`, `copilot-delegate` and `gemini-delegate` skills. It is Claude-Code-only. Its executors are Claude, Codex, Qwen/Qoder and Copilot: delegation to Copilot CLI exists again, through Regia, and there is none to Gemini CLI. On its first interactive session Regia itself installs Ponytail, plus the Codex plugin `codex@openai-codex` when `codex` is present and the Qwen companion when either a compatible `qwen` or `qoder` command is present; NONoise does not install those. See [`regia.md`](regia.md).

### LSPs and editor plugins

Polly **never auto-installs** LSPs, IDE extensions, or plugins. When a step needs one, Polly prints the install command:

- `/plugin install <plugin-name>@claude-plugins-official` — for Claude Code plugins.
- `setup lsp` — for Copilot's LSP setup flow.
- `code --install-extension <extension-id>` — for VS Code extensions.

The user runs it; Polly then continues.

## The full "mentioned but not wired" list

| Tool | SDLC step | What it helps with | Link |
|---|---|---|---|
| Wispr Flow | Polly Step 0 | Voice-to-text | https://wisprflow.ai |
| Handy | Polly Step 0 | Voice-to-text (OSS) | https://github.com/cjpais/Handy |
| Superwhisper | Polly Step 0 | Voice-to-text (macOS) | https://superwhisper.com |
| Copilot transcription | Polly Step 0 | Voice-to-text (Copilot-native) | GitHub Copilot docs |
| Plaud | Requirements phase | Recorder + meeting summaries | https://www.plaud.ai |
| Microsoft Copilot (Teams) | Requirements phase | Call recording + transcription | Microsoft 365 docs |
| claude-mem | Ongoing | Cross-session memory (Claude Code) | Plugin search on GitHub |
| Azure DevOps | Sprint phase | Work-item tracker | adapter in `spec-to-workitem` |
| Jira | Sprint phase | Work-item tracker | adapter in `spec-to-workitem` |
| GitHub Issues | Sprint phase | Work-item tracker | adapter in `spec-to-workitem` |
| Linear | Sprint phase | Work-item tracker | adapter in `spec-to-workitem` |
| Paseo | UAT / SIT | Bug triage kanban | upstream search |
| codebase-memory-mcp | Brownfield and every codebase question | Code knowledge graph (MCP server) | installed at scaffold time by `create-nonoise` |
| Regia | Every medium or long task in Claude Code | Orchestration: delegation, model and effort per task, swarms | installed for Claude Code by `create-nonoise`; see [`regia.md`](regia.md) |
| App Insights | Observability | Tracing + logs | adapter in `observability-debug` |
| Datadog | Observability | Tracing + logs | adapter in `observability-debug` |
| Grafana + Loki | Observability | Dashboards + logs | adapter in `observability-debug` |
| CloudWatch | Observability | Logs + metrics | adapter in `observability-debug` |
| OpenTelemetry Collector | Observability | Trace aggregation | adapter in `observability-debug` |

The *adapters* under `observability-debug` and `spec-to-workitem` are a special case: the framework ships the adapter (plain Markdown + optional scripts) and expects the user to have the backend CLI authenticated. The adapter knows how to call `az monitor app-insights query`, `ddog logs search`, etc., but never handles credentials — those are in the user's shell environment.

## What wouldn't qualify as "info only"

If NONoise ever moves a tool from advisor-only to integrated, it has to cross these bars:

- **Plain Markdown + optional shell scripts.** No dedicated runtime components.
- **Credentials from user env only.** Never committed, never injected, never stored by the framework.
- **No auto-install.** The first invocation fails gracefully with instructions if the CLI isn't present.
- **Adapter pattern.** Other backends must be pluggable; the framework does not bind to one vendor.
- **Dry-run first.** Any destructive action has a dry-run default that the user explicitly opts out of.

Today's integrated surface — `md-extractor` (via LlamaCloud), `devops-push` (Azure DevOps), the observability and workitem adapters — was built against those bars. Additions must meet them too.

## The anti-pattern: MCP auto-install

An earlier iteration of NONoise considered auto-installing MCP servers (e.g., an Azure MCP server, a Linear MCP server) during scaffolding. It was explicitly rejected because:

- MCP servers run as processes on the user's machine; installing them without consent is a side effect.
- MCP token cost is high (a single server can consume 50k+ tokens in discovery); the CLI equivalent is ~260 tokens — a 200x+ factor in favour of CLI.
- The user's security team may not have approved the MCP server; auto-installing circumvents review.

Instead NONoise uses the adapter pattern — the adapter is plain Markdown that says "run this CLI command" — and lets the user choose if and when to adopt an MCP layer on top.

The MCP servers NONoise does register — Haft, the code graph (`codebase-memory-mcp`) and optional REA — are written only to project-local config, never to user-global settings, and the AI tool asks the user to approve them. The code graph also works without MCP, through its CLI.

## Where to read more

- [`philosophy.md`](philosophy.md) §6 *Advisor-only where it matters* — the principle.
- [`polly.md`](polly.md) §Step 0 — the voice-tool phrasing.
- [`skills-catalog.md`](skills-catalog.md) §Integrations — `spec-to-workitem`, `observability-debug` adapter catalogues.
- `packages/skills/ops-skill-builder/references/access-patterns.md` — the "access menu CLI > API > Web" reasoning applied to any ops tool.

## REA: optional project integration

`--with-rea` and profiles brownfield/full configure `rea-agents@6.5.0 mcp` locally
in `.mcp.json` and/or `.codex/config.toml`; they never call `rea setup` or write
REA into global client settings. Node >=22.19 is required. The compact schema
profile reduces the context cost of 172 tools; the first server launch may download
the pinned package through npx. Polly proposes REA for artifacts without sources;
`rea-setup` obtains one installation/analysis confirmation and resumes the task after
the server is connected. [Setup and provenance](rea-integration.md).
