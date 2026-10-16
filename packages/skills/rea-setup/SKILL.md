---
name: rea-setup
description: Use when artifact analysis needs REA and its project MCP server is absent or needs repair — source-less .NET DLL/EXE, Electron/app.asar, HAR/SAZ captures, SQLite, APK, native binaries, firmware, or understanding an app/site without its source. Skip ordinary source-repository analysis.
---

# REA project activation

Route these targets to REA: .NET `.dll`/`.exe` without `.csproj` or source;
`app.asar` or packaged Electron apps; `.har`/`.saz` captures; SQLite databases;
APK packages; native binaries; firmware; “how does this app/site work without
code?”. For a complete source repository, use repository tools and Graphify.

## Check the project

Look for `mcpServers.rea` in project `.mcp.json` (Claude/Copilot) or
`mcp_servers.rea` in project `.codex/config.toml` (Codex). The NONoise launcher
is `npx -y rea-agents@6.5.0 mcp`, with environment
`REA_MCP_INPUT_SCHEMA_PROFILE=compact`; Codex uses `startup_timeout_sec=120`.

If already configured and tools are connected, use `reverse-engineer-anything`
directly within the requested target scope. Do not repeat activation consent or
run readiness checks before each analysis. If registration exists but tools are
absent, ask for a client restart/reconnection or the client's MCP approval;
inspect its launch error if that fails. Reinstalling does not reconnect a session.

## One consent, then activate

For missing registration, explain the concrete reason in one sentence, such as:
“REA can inspect this packaged .NET assembly because its sources are unavailable.”
Then ask **one confirmation** covering both project installation and lawful
target scope:

> May I install REA in this project and analyze `<target>`? Confirm that you own this software or have the client's authorization to examine it for this task.

An explicit request already covering both installation and authorized analysis
counts as confirmation; do not ask twice. A bare request to analyze a file does
not establish both. Without confirmation, install nothing; continue useful
source/document analysis if available. Declining does not authorize a CLI
package download as a workaround.

After confirmation, from the project root run:

```sh
create-nonoise --upgrade . --with-rea
```

If the CLI is absent, use `npx -y create-nonoise@1.8.0 --upgrade . --with-rea`.
Check the upgrade result: conflicting user entries are preserved and need a
scoped merge, not an overwrite. An equivalent idempotent project-only merge is
permitted: preserve other servers/settings, pin the same launcher/environment,
and install the complete bundled `reverse-engineer-anything` skill. Never run
`rea setup`, edit global `~/.claude`, `~/.codex`, or `~/.copilot` settings, or
install unrelated providers/toolchains as part of activation.

Tell the user to restart/reconnect the client and approve the project MCP server
if prompted. Once its tools are visible, resume the original analysis. Node
>=22.19 is required (upstream supported lines: ^22.19, ^24.11, >=26); REA exposes
172 tools, and compact schemas reduce their context cost.

## Target and operation boundaries

The upstream disclaimer is bundled at `.nonoise/rea/DISCLAIMER.md`. Ownership or
client authorization covers only the agreed analysis. Artifact inspection does
not itself authorize executing untrusted programs, intercepting traffic,
changing devices, or interacting with third-party systems. Keep those operations
within the explicitly authorized scope. Do not use REA to circumvent DRM,
licenses, authentication or access controls, copy protected code/assets, or
perform unauthorized access. Preserve evidence, limitations and unknowns; output
from a decompiler is not proof of original source or permission to reuse it.
