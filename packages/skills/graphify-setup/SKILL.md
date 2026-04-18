---
name: graphify-setup
description: Installs the graphify knowledge-graph tool and wires its usage rules into the project. Use when the user asks to "install graphify", "set up graphify", "add graphify rules", or when graphify is listed in the installed skills but `graphify-out/` is missing. Does not build the first graph — that is left to the orchestrator skill or the user.
---

# graphify-setup

Installs the [graphify](https://github.com/safishamsi/graphify) tool and registers its usage rules in every AI-tool context file present in the project. The first graph is **not** built: in a greenfield project there is nothing to graph yet, and in a brownfield project the decision to run `graphify .` belongs to a higher-level orchestrator (or to the user).

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

## What this skill does NOT do

- **Does not run `graphify .`** — the first graph is not built automatically. This is the explicit design decision: projects scaffolded from NONoise start empty, so there is nothing to graph. For brownfield adoption, a future orchestrator skill will decide when/how to trigger the first build.
- **Does not invoke `graphify hook install`** — git hooks are opt‑in and belong to the orchestrator.
- **Does not modify per‑directory `.gitignore`** — only the root one.

## Reporting

After each run, report to the user:
- Whether Python was found (version).
- Whether `graphifyy` was installed (or already present).
- Whether `graphify install` succeeded.
- For each context file touched: `+` (block added), `=` (block already present), or `~` (block replaced).

## Failure modes

- Python missing → print `pip install graphifyy && graphify install` and continue (non‑fatal).
- `pip install graphifyy` fails → print the error and the manual command, continue.
- Everything else (writing `.gitignore`, context files) is local file I/O and must succeed.
