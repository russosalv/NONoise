---
description: Build or refresh the project's code knowledge graph with codebase-memory-mcp (local, no API key).
---

# /index — build the code graph

Indexes the repository into the `codebase-memory-mcp` knowledge graph: functions, classes, call chains, HTTP routes, infrastructure and docs, queryable through the `codebase-memory` MCP tools. Indexing is local and deterministic: no LLM, no API key.

## Usage

```
/index               # indexes the project root
/index <path>        # indexes a specific path (a sub-repo in a multi-repo workspace)
```

## Implementation

1. Call the MCP tool `index_repository` with `repo_path` set to the absolute path of the target (default: the project root). For a large repository pass `mode: "fast"` first and offer `full` afterwards.
2. If the MCP tools are not available in this session, run the CLI instead:

   ```
   codebase-memory-mcp cli --progress index_repository --repo-path <path>
   ```

3. Report what `get_architecture` returns in five lines: languages, packages, entry points, hotspots.

If the `codebase-memory-mcp` command is missing, stop and print `create-nonoise --code-graph-only .`.

## When NOT to use

- **The graph already exists.** It stays in sync by itself while a session is open; re-indexing after every edit is wasted work. Check with `index_status`.
- **You want a versioned markdown dossier** about a subsystem → use the `reverse-engineering` skill. It queries this graph and writes `docs/support/reverse/<slug>/`.
