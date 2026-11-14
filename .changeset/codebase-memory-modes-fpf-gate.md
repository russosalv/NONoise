---
"create-nonoise": minor
---

Replace graphify with codebase-memory-mcp, add quick / medium / long development modes, and propose FPF validation only when it is warranted.

- **Code graph: codebase-memory-mcp replaces graphify.** The CLI installs the pinned `codebase-memory-mcp@0.12.1` (one native binary, no Python/uv, no LLM key) and registers its MCP server in the project for every selected tool: `.mcp.json` (Claude Code, Copilot CLI), `.vscode/mcp.json` (Copilot in VS Code), `.codex/config.toml`, `.cursor/mcp.json`, `.gemini/settings.json`. New bundled skill `codebase-memory`; context files carry a `codebase-memory` managed block; `/index` builds the graph. `--code-graph-only` replaces `--graphify-only` (still accepted as an alias). `--upgrade` retires an unmodified graphify integration (skill, hooks, receipt) and leaves `graphify-out/` and the graphify CLI in place.
- **Development modes.** `.nonoise/sdlc-flow.md` (version 2) tags every phase with the modes it belongs to and sets `default_mode: medium`. `/polly quick|medium|long <goal>` sizes the process; with a goal and no mode Polly picks the lightest that fits. The same table ships in every context file as the `development-modes` managed block, so Codex and Copilot behave the same way. With the Regia mod for Claude Code the modes map one to one onto `/regia quick|medium|long`.
- **FPF gate.** `arch-decision` now starts by deciding whether formal Haft FPF validation is warranted: an explicit request, or a costly-to-reverse decision with at least two materially different viable options. Otherwise it records a lightweight decision in the PRD frontmatter (`decision.mode: lightweight`), which `arch-sync` and `sprint-manifest` accept without the Haft runtime. FPF is never proposed in quick mode.
