## Code graph — codebase-memory-mcp

This project's code is indexed as a knowledge graph by the `codebase-memory-mcp` MCP server (skill: `codebase-memory`).

Rules:
- Before answering architecture or codebase questions, call `get_architecture`, then `search_graph` — before grep or reading raw files.
- For "who calls X", "what does X reach" and cross-module "how does X relate to Y" questions, use `trace_path`; for the blast radius of a change, `detect_changes`. Read source with `get_code_snippet` once the graph has named the symbol.
- If `list_projects` does not show this repository, run `index_repository` once (`repo_path` = the project root). After that the graph stays in sync by itself while a session is open — there is no manual update step.
- Before treating a missing result as proof of absence, call `check_index_coverage`.
- If the MCP tools are not available in this host, run the same tools through the CLI: `codebase-memory-mcp cli <tool> --help` (for example `codebase-memory-mcp cli index_repository --repo-path .`).
- Triggers that mean "build the graph": `/index`, "indicizza il grafo", "index this repository", "build the knowledge graph", "rebuild the graph".
