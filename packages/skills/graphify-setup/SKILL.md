---
name: graphify-setup
description: Installs the graphify knowledge-graph tool and wires its usage rules into the project. Use when the user asks to "install graphify", "set up graphify", "add graphify rules", or when graphify is listed in the installed skills but `graphify-out/` is missing. Optionally bootstraps the first graph when invoked with `mode=reverse-engineering` or `mode=brownfield` — in that case, after install/rules, runs an explicit indexing proposal with strong warning (skippable). Without `mode`, does NOT build the first graph — that is left to the orchestrator skill or the user.
---

# graphify-setup

Installs the [graphify](https://github.com/safishamsi/graphify) tool and registers its usage rules in every AI-tool context file present in the project. By default (no `mode` arg) the first graph is **not** built — greenfield projects have nothing to graph yet, and brownfield builds belong to a higher-level orchestrator. When the caller passes `mode=reverse-engineering` or `mode=brownfield` (typically Polly during a reverse-engineering flow), Step 5 below proposes the first build explicitly with a strong "essential but skippable" warning.

## Inputs (optional, from caller)

Two equivalent ways to pass arguments depending on the host tool:

- **Claude Code**: Polly invokes this skill via the `Skill` tool with an `args` string parsed per `polly/references/handoff-protocol.md` § "Skill arguments convention".
- **GitHub Copilot / Cursor / Gemini / Codex / any other tool without a native skill harness**: there is no `args` channel. Look for the same `key=value` tokens directly in the user's message that triggered this skill (e.g. "run graphify-setup mode=reverse-engineering source_path=./legacy"). If the tokens are absent, behave as if `mode` is unset (default flow, no Step 5).

Recognized keys:

| Key | Values | Behavior |
|---|---|---|
| `mode` | `reverse-engineering` | Enables Step 5 (indexing proposal) with RE-flavored warning. |
| `mode` | `brownfield` | Enables Step 5 with softer "strongly recommended" wording. |
| `mode` | any other | Log `unknown mode <value>, treating as absent` and continue as default. |
| `source_path` | any path | Default target for Step 5 when `mode` is set. If the path doesn't exist, the skill asks the user for a correction in Step 5.1. |

When `mode` is absent, Steps 1–4 run exactly as before and Step 5 is
skipped. No warning, no prompt — fully backwards compatible.

## What this skill does

1. **Package install** (idempotent)
   - Checks that Python ≥ 3.10 is available (`python --version` or `python3 --version`).
   - If missing: prints the install command and stops gracefully (does not fail the scaffold).
   - Else: runs `pip install graphifyy` (or `pipx install graphifyy` if pipx is available and preferred).
   - The PyPI package is `graphifyy` (double‑y). `graphify` tout court is a different, unaffiliated package — do not install it.

2. **Global wiring** (idempotent)
   - Runs `graphify install`, which writes the per‑user skill in `~/.claude/skills/graphify/SKILL.md` and updates `~/.claude/CLAUDE.md`.

3. **Project‑level rules** for every selected AI tool. Writes the same 3 rules in each tool's context file. **Claude and Copilot are always covered; Cursor / Gemini / Codex only if selected.**

   Target files:
   - `CLAUDE.md` (if Claude Code selected)
   - `.github/copilot-instructions.md` (if Copilot selected)
   - `GEMINI.md` (if Gemini CLI selected)
   - `.cursor/rules.md` (if Cursor selected)
   - `AGENTS.md` (always — cross‑tool fallback)

   Block content (identical across tools, only the surrounding context changes):

   ```markdown
   ## graphify

   This project has a graphify knowledge graph at `graphify-out/`.

   Rules:
   - Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.
   - If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
   - After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current.
   ```

   Idempotence: the block is delimited by HTML‑comment markers so it can be re‑applied without duplication:

   ```markdown
   <!-- >>> graphify (managed by graphify-setup skill) -->
   ## graphify
   ...
   <!-- <<< graphify -->
   ```

   If a block with these markers already exists, replace it. Otherwise append.

4. **`.gitignore` block** (idempotent) — writes or confirms this block in the root `.gitignore`:

   ```gitignore
   # >>> graphify (managed by graphify-setup skill)
   graphify-out/
   .graphify_*
   .obj/
   # <<< graphify
   ```

   If the file does not exist, create it containing only this block.

## Step 5 — Initial indexing proposal (only when `mode` is set)

Fires after Steps 1–4 complete successfully. Skipped when `mode` is absent
or unrecognized.

### 5.1 — Resolve target path

Priority:

1. If the caller passed `source_path=<path>`, use it directly.
2. Else, if `nonoise.config.json` has a top-level `reverse.source_path`,
   propose it as default (show it in the prompt).
3. Else, propose `.` (the project root) as default.

Prompt (adapt to user locale; English template):

> **Indexing target**: I'm about to index `<path>` so the reverse-engineering
> flow has a knowledge graph to work with.
>
> Accept this path, or give me a different one (e.g. external legacy repo)?

If the user provides a different path, validate it exists (`test -d <path>`)
and loop back if missing.

### 5.2 — Existing-graph check

For the resolved `<path>`:

```bash
test -f "<path>/graphify-out/graph.json" && echo "EXISTS" || echo "MISSING"
```

- `MISSING` → propose the full `/graphify <path>` pipeline (AST extraction + LLM semantic pass + community detection + HTML/JSON/GRAPH_REPORT.md).
- `EXISTS` → propose `/graphify <path> --update` (the skill's incremental mode, which re-extracts only changed files and reuses cached semantic results).

### 5.2.1 — How to invoke the pipeline (tool-dependent)

The `graphify` binary CLI does NOT have a `graphify <path>` command — running it directly fails with "unknown command". The full pipeline (AST + **semantic extraction via LLM** + clustering) is orchestrated by the **graphify skill** at `~/.claude/skills/graphify/SKILL.md` (installed by Step 2 above), not by the CLI alone.

Invocation depends on the host tool:

- **Claude Code**: type `/graphify <path>` — the slash command is registered by `graphify install` (Step 2) and triggers the skill. Or, equivalently, invoke `Skill(skill: "graphify", args: "<path>")`.
- **GitHub Copilot / Cursor / Gemini / Codex / any tool without slash commands**: open `~/.claude/skills/graphify/SKILL.md` (or the platform-specific path under `.copilot/skills/`, `.cursor/rules/`, etc.) and follow its step-by-step instructions, which call `graphify.detect`, `graphify.extract`, `graphify.cluster` directly via Python. Pass the target `<path>` as the input.
- **Flag variants** available at the skill level:
  - `--update` → incremental (no LLM for unchanged files — cache reuse)
  - `--mode deep` → richer INFERRED edges
  - `--cluster-only` → rerun clustering on existing `graph.json` (no re-extraction)
  - `--no-viz` → skip HTML, just JSON + GRAPH_REPORT.md
  - `--wiki` → also build the navigable wiki under `graphify-out/wiki/`

**The CLI `graphify` binary is useful ONLY for these narrower operations** (do NOT use them for the initial full build):

- `graphify update <path>` — re-extract AST only (**no LLM**) when you've changed code and just need to refresh structural edges
- `graphify cluster-only <path>` — rerun community detection on an existing graph
- `graphify query "..."`, `graphify path "A" "B"`, `graphify explain "X"` — read-side operations on an existing graph

### 5.3 — Strong-warning prompt

Shown before executing anything. `mode=reverse-engineering` variant:

> ⚠️ **Indexing is essential for a useful reverse-engineering result.**
> Without a graphify graph, downstream skills (`reverse-engineering`,
> `arch-brainstorm`, ad-hoc code Q&A) have no god-node map, no
> communities, no semantic lookup. Chapters that depend on source
> become stubs with open points.
>
> I will run the full `/graphify <path>` pipeline — that is AST
> extraction + semantic extraction via LLM + community detection. The
> LLM pass is what produces the "surprising connections", god-node
> labels, and community names; without it the report is near-empty.
> Expect a few minutes and real LLM tokens on the first run. Re-runs
> reuse cached results and are nearly free.
>
> Proposed command: `/graphify <path>` (MISSING) or
> `/graphify <path> --update` (EXISTS).
>
> Proceed? (`yes` / `different-path` / `skip`)
>
> - `yes` → run now.
> - `different-path` → loops back to 5.1.
> - `skip` → explicit opt-out. Logged in the final report; reverse-engineering
>   / architecture answers will have degraded quality until you come back.

`mode=brownfield` variant: same structure, softer wording —
"strongly recommended" instead of "essential", "may have reduced
quality" instead of "chapters become stubs".

### 5.4 — Execution

- `yes` → invoke the graphify skill per §5.2.1 for the host tool. Wait for completion. Parse nodes/edges/communities from `graphify-out/GRAPH_REPORT.md` for the final report. Verify the "Token cost" line in the report is non-zero on a MISSING (initial) run — if it reports `0 input · 0 output` on an initial build, the semantic pass did not actually run (likely no LLM credentials configured, or `--no-semantic` flag slipped in); surface this as a warning.
- `different-path` → back to 5.1.
- `skip` → no command run, record the skip for the report.

### 5.5 — Failure handling

- `graphify` Python package not importable (despite Step 1 reporting install
  success) → abort Step 5 with a clear error; do NOT undo Steps 1–4.
- Target path does not exist → ask the user to correct it in 5.1.
- Semantic pass fails (LLM credentials missing, network error) → surface the error and ask: retry, proceed with AST-only (`graphify update <path>` — degraded output, explicitly logged), skip, or abort. Do NOT treat a silent semantic failure as success.
- Graph builds but `GRAPH_REPORT.md` reports 0-token extraction on an initial run → warn the user: the semantic pass was skipped for some reason, and the resulting report will lack community names and cross-concept connections.

## What this skill does NOT do

- **Does not run `graphify .` unless `mode` is set** — in greenfield invocations (no `mode` arg) the first graph is not built, because projects scaffolded from NONoise start empty. When Polly hands off with `mode=reverse-engineering` or `mode=brownfield`, Step 5 proposes the first build explicitly and the user can accept or skip.
- **Does not invoke `graphify hook install`** — git hooks are opt‑in and belong to the orchestrator.
- **Does not modify per‑directory `.gitignore`** — only the root one.

## Reporting

After each run, report to the user:
- Whether Python was found (version).
- Whether `graphifyy` was installed (or already present).
- Whether `graphify install` succeeded.
- For each context file touched: `+` (block added), `=` (block already present), or `~` (block replaced).
- **Only when `mode` was set (Step 5 ran)**:
  - If indexing ran: `📊 Initial graph built at <path>/graphify-out/ — N nodes, M edges, K communities`.
  - If the user skipped: `⚠️ Initial indexing skipped (user explicit opt-out). Reverse-engineering / architecture answers will have degraded quality. Re-run graphify-setup or invoke /graphify <path> when ready.`
  - If Step 5 failed: `❌ Initial indexing attempted but failed: <error>. Install/rules are OK; graph is not built.`

## Failure modes

- Python missing → print `pip install graphifyy && graphify install` and continue (non‑fatal).
- `pip install graphifyy` fails → print the error and the manual command, continue.
- Everything else (writing `.gitignore`, context files) is local file I/O and must succeed.
