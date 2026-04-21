---
name: graphify-setup
description: Installs the graphify knowledge-graph tool and wires its usage rules into the project. Use when the user asks to "install graphify", "set up graphify", "add graphify rules", or when graphify is listed in the installed skills but `graphify-out/` is missing. Optionally bootstraps the first graph when invoked with `mode=reverse-engineering` or `mode=brownfield` — in that case, after install/rules, runs an explicit indexing proposal with strong warning (skippable). Without `mode`, does NOT build the first graph — that is left to the orchestrator skill or the user.
---

# graphify-setup

Installs the [graphify](https://github.com/safishamsi/graphify) tool and registers its usage rules in every AI-tool context file present in the project. The first graph is **not** built: in a greenfield project there is nothing to graph yet, and in a brownfield project the decision to run `graphify .` belongs to a higher-level orchestrator (or to the user).

## Inputs (optional, from Polly handoff args)

Parse the caller's args string per `polly/references/handoff-protocol.md` §
"Skill arguments convention". Recognized keys:

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

- `MISSING` → propose `graphify "<path>"` (initial full build).
- `EXISTS` → propose `graphify "<path>" --update` (incremental). Mention
  that a full rebuild is available on request.

### 5.3 — Strong-warning prompt

Shown before executing anything. `mode=reverse-engineering` variant:

> ⚠️ **Indexing is essential for a useful reverse-engineering result.**
> Without a graphify graph, downstream skills (`reverse-engineering`,
> `arch-brainstorm`, ad-hoc code Q&A) have no god-node map, no
> communities, no semantic lookup. Chapters that depend on source
> become stubs with open points.
>
> Proposed command: `graphify "<path>"` (MISSING) or
> `graphify "<path>" --update` (EXISTS).
> Can take several minutes on large codebases.
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

- `yes` → run the chosen graphify command. Capture stdout/stderr. Parse
  nodes/edges/communities from `graphify-out/GRAPH_REPORT.md` if present,
  else from the command's summary. Store the counts for the final report.
- `different-path` → back to 5.1.
- `skip` → no command run, record the skip for the report.

### 5.5 — Failure handling

- `graphify` command missing from PATH (despite Step 1 reporting install
  success) → abort Step 5 with a clear error; do NOT undo Steps 1–4.
- Target path does not exist → ask the user to correct it in 5.1.
- `graphify` exit ≠ 0 → show stderr, ask the user: retry / skip / abort.
  Do NOT treat a non-zero exit as a silent skip.

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
