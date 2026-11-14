---
name: codebase-memory
description: Query and build the project's code knowledge graph through the codebase-memory-mcp server — architecture overview, symbol search, call chains, change impact, cross-service links. Use for "how does X work", "who calls X", "what breaks if I change X", "where is X defined", "index this repository", "indicizza il grafo", "rebuild the graph", and before any broad grep or multi-file read of an unfamiliar codebase. Works in Claude Code, Codex, Copilot, Cursor and Gemini CLI; falls back to the codebase-memory-mcp CLI when the MCP tools are not connected.
---

# codebase-memory — the project's code graph

`codebase-memory-mcp` indexes the repository into a local knowledge graph:
functions, classes, modules, call chains, HTTP routes, infrastructure files and
documentation sections, linked to each other. Indexing is deterministic (tree-sitter,
no LLM, no API key) and the index lives in `~/.cache/codebase-memory-mcp/`, outside
the repository. One graph query usually replaces a dozen grep-and-read rounds.

NONoise installs the binary (the latest release, never pinned: `npm install -g
codebase-memory-mcp@latest` updates it at any time) and registers the MCP server
`codebase-memory-mcp` in the project (`.mcp.json`, `.codex/config.toml`,
`.vscode/mcp.json`, `.cursor/mcp.json`, `.gemini/settings.json`, according to the
selected tools).

## Step 0 — is the graph there?

1. If the tools `list_projects` / `search_graph` are available, the server is
   connected. Call `list_projects`. Most tools take a `project` argument: it is
   the name `list_projects` prints for this repository (derived from its path).
2. If this repository is not listed, call `index_repository` with `repo_path`
   set to the absolute project root. For a very large repository start with
   `mode: "fast"`. Index once: the server then watches the project and stays in
   sync while a session is open. Do not re-index after every edit.
3. If the MCP tools are **not** available (host without MCP, server not yet
   approved, session not restarted), use the CLI. It runs the same tools:

   ```sh
   codebase-memory-mcp cli index_repository --repo-path .
   codebase-memory-mcp cli list_projects
   codebase-memory-mcp cli search_graph --project <name> --name-pattern '.*Handler.*' --label Function
   codebase-memory-mcp cli trace_path --project <name> --function-name <fn> --direction both
   codebase-memory-mcp cli <tool> --help      # flags of any tool
   ```

4. If the `codebase-memory-mcp` command does not exist, stop and print:

   ```sh
   create-nonoise --code-graph-only .
   create-nonoise doctor .
   ```

   Then ask the user to restart the AI tool and approve the project MCP server.
   Do not fall back to pretending the graph was consulted.

## Which tool for which question

| Question | Tool | Notes |
|---|---|---|
| "Give me the lay of the land" | `get_architecture` | Languages, packages, routes, hotspots, clusters. Ask for specific `aspects` when you need depth. |
| "Where is X?" / "find things like X" | `search_graph` | `name_pattern` (regex) and `label` for structure; `query` for keyword ranking; `semantic_query` for meaning. |
| "Who calls X?" / "what does X reach?" | `trace_path` | `function_name`, `direction` (`inbound` / `outbound` / `both`), `depth`. `mode: "cross_service"` follows HTTP/gRPC/queue edges. |
| "What does my diff affect?" | `detect_changes` | Maps the git diff to symbols and risk. `scope: "tests"` lists the tests to run. |
| "Show me the code" | `get_code_snippet`, `get_file_outline` | Use the qualified name the graph returned. |
| "Find this string / pattern" | `search_code` | Text search ranked by graph context. Prefer it over raw grep. |
| Anything structural not covered above | `query_graph` | Read-only openCypher. Call `get_graph_schema` first to learn labels and edge types. |
| "Is that area indexed at all?" | `check_index_coverage`, `index_status` | Run before concluding that something does not exist. |
| "What changed between two snapshots?" | `compare_graphs` | |
| Decision records kept next to the graph | `manage_adr` | NONoise's canonical architectural decisions live in the PRDs and `.haft/`; use this only when the user asks for it. |

## Working rules

- **Graph first, files second.** Start from `get_architecture` or `search_graph`;
  open files only for the symbols the graph named.
- **A missing result is not proof of absence.** Check `check_index_coverage`
  before saying "there is no such thing".
- **Quote what the graph returned.** Cite the qualified names and the tool you
  used, so the user can re-run the query.
- **Do not edit the graph by hand** and do not commit `~/.cache` content. The
  shared artifact `.codebase-memory/graph.db.zst` is written only when the user
  asks for `index_repository` with `persistence: true`; committing it is a team
  decision.
- **Per-project tuning** belongs in `.cbmignore` (gitignore syntax, extra
  exclusions) and `.codebase-memory.json` (extra file extensions).
- **Multi-repo workspaces:** index each repository under `repos/` on its own
  (`repo_path` = that repository), then use `trace_path` with
  `mode: "cross_service"` or `index_repository` with
  `mode: "cross-repo-intelligence"` to link them.

## What this skill does not do

- It does not write documentation. For a versioned dossier of a subsystem use
  `reverse-engineering`, which queries this graph and writes
  `docs/support/reverse/<slug>/`.
- It does not install anything. A missing binary is fixed by
  `create-nonoise --code-graph-only .`.
- It does not run upstream `codebase-memory-mcp install`: that command edits
  user-global agent configuration and hooks, which NONoise never does on the
  user's behalf.
