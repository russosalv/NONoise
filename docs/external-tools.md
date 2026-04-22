# External tools Polly mentions (info-only, not integrated)

NONoise takes a strict posture on third-party tooling: **mentioned, not wired**. Polly surfaces useful tools at the right SDLC step; the framework never installs, configures, authenticates, or API-calls them. The user decides whether to adopt each one. No MCP servers, no API keys in the framework, no runtime dependencies.

This is [`philosophy.md`](philosophy.md) §6 *Advisor-only where it matters* applied to tools outside the framework's direct control.

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

- **VibeKanban** — lightweight kanban for UAT / SIT bugs. Mentioned by `atr` as a future push target for acceptance-test failures (UAT integration is on the ATR roadmap).

The mention surfaces during the atr phase; the framework does not push to VibeKanban automatically. VibeKanban has an "copy-as-fetch" pattern for bugs — the idea is that a failing acceptance test produces a VibeKanban-ready fetch command the user runs manually.

### Knowledge graph

- **graphify** — indexes a codebase into a knowledge graph with god-nodes, community clusters, audit-trailed edges. The `create-nonoise` CLI installs the `graphifyy` Python package (`uv tool install "graphifyy>=0.4.23"`) at scaffold time and wires the per-tool hooks (`graphify install`, `graphify copilot install`). Invoke as `/graphify <path>` (the slash-command / Skill invocation; the bare `graphify` binary is reserved for read-side operations like `graphify query`, `graphify path`, `graphify explain`, `graphify update`).

Output: `graphify-out/GRAPH_REPORT.md`, `graph.json`, `graph.html`, `manifest.json`. A pre-tool hook reminds the AI to read the report before searching raw files. See [`sdlc.md`](sdlc.md) §Brownfield prefix.

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
| VibeKanban | UAT / SIT | Bug triage kanban | upstream search |
| graphify | Brownfield | Codebase knowledge graph | installed at scaffold time by `create-nonoise` |
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

## Where to read more

- [`philosophy.md`](philosophy.md) §6 *Advisor-only where it matters* — the principle.
- [`polly.md`](polly.md) §Step 0 — the voice-tool phrasing.
- [`skills-catalog.md`](skills-catalog.md) §Integrations — `spec-to-workitem`, `observability-debug` adapter catalogues.
- `packages/skills/ops-skill-builder/references/access-patterns.md` — the "access menu CLI > API > Web" reasoning applied to any ops tool.
