---
description: Build/refresh the project's knowledge graph via the /graphify slash skill (no API key needed).
---

# /index — rebuild the knowledge graph

Builds (or refreshes) the project's knowledge graph at `graphify-out/` by invoking the **`/graphify` slash skill**. Always uses the IDE assistant's own model — never the headless `graphify extract` CLI — so no external LLM API key is required.

## What it does

Delegates to `/graphify <path>`. That skill runs the full pipeline:
1. **Detect** — classifies files (code / docs / images).
2. **AST extraction** — deterministic, free, structural edges from code.
3. **Semantic extraction** — dispatched as parallel sub-agents using *your* IDE session, no key. This is the step that gets confused for "the LLM did it externally" — it didn't, it was you.
4. **Build + cluster** — Louvain community detection.
5. **Outputs** in `graphify-out/`: `graph.json`, `GRAPH_REPORT.md`, `graph.html`.

## Usage

```
/index               # indexes the current directory
/index <path>        # indexes a specific path
/index . --update    # incremental — re-extract only changed files
/index . --no-viz    # skip HTML, just report + JSON
```

Any flag accepted by `/graphify` (see `~/.claude/skills/graphify/SKILL.md`) is forwarded as-is.

## When NOT to use

- **You want a versioned markdown dossier** about a subsystem → use the `reverse-engineering` skill instead. That skill *uses* `/index` (Step 2) but produces `docs/support/reverse/<slug>/` chapters as output.
- **You only modified code and want an AST-only refresh** (no semantic re-pass) → run the bare `graphify update .` CLI. That command is AST-only and needs no key.

## Anti-pattern (do not do this)

> "Esegui l'indicizzazione semantica" / "fai graphify extract"

→ Will run `graphify extract`, the **headless CLI**, which requires `ANTHROPIC_API_KEY` / `MOONSHOT_API_KEY` / `OPENAI_API_KEY` etc. That's exactly what `/index` exists to avoid.

## Implementation

When this command fires, invoke the `graphify` skill explicitly:

```
Skill(skill: "graphify", args: "<path or '.' if none given>")
```

Or pass through to the slash trigger: `/graphify <path>`. Forward all extra flags.
