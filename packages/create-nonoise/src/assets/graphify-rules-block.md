## graphify

This project has a graphify knowledge graph at `graphify-out/`.

Rules:
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files.
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost).
- To **rebuild the graph from scratch** (semantic extraction + clusters), always invoke the `/graphify <path>` slash skill — NEVER the bare `graphify extract` CLI. The bare CLI requires an external LLM API key; the slash skill runs through the IDE assistant's own model with no key needed. In Claude Code you can also use the project's `/index` shortcut. Triggers that mean "rebuild the graph": `/index`, `/index-graph`, "indicizza il grafo", "build the knowledge graph", "rebuild the graph".
