---
name: swarm-router
description: Use ONLY when the user explicitly asks the AI assistant to route, dispatch, fan-out, split, or parallelize a task across multiple AI model CLIs (Claude / Codex / Gemini / Copilot's many models) — phrases like "usa lo swarm", "swarm:", "/swarm", "instrada", "fan-out", "route this task", "scegli il modello migliore per", "delega allo swarm", "best model for this", "ensemble", "second opinion da", "team mode", "parallel-dev", "sviluppa in parallelo", "swarm parallel", "fai team", "build with a team". Four modes: single dispatch, sequential pipeline, parallel fan-out, and parallel-team. Works across any harness that can read this SKILL.md (Claude Code, Copilot, Gemini CLI, Codex) — the dispatch mechanism differs per harness (see Harness-specific dispatch). Hierarchical orchestration only — there is NO peer-to-peer messaging between different model CLIs. NEVER invoke this skill on your own; only when the user explicitly uses one of the trigger phrases above.
---

# swarm-router

User-invoked task router across Claude / Codex / Gemini / any-model-via-Copilot. The user owns the trigger; **the orchestrator** (whichever AI harness is reading this skill) owns the classification, dispatch, and aggregation.

This is **hierarchical orchestration**, not a true swarm. Different model CLIs do not message each other — the orchestrator classifies, dispatches via shell or skill invocation, and stitches results back together verbatim. Read [Architecture truth](#architecture-truth) before extending this skill.

## When to invoke

Invoke **only** when the user's message explicitly asks for routing across models or a "best model" decision:

- "usa lo swarm per ...", "delega allo swarm ...", "instrada ...", "scegli il modello migliore per ..."
- "swarm: ...", "/swarm ...", "fan-out ...", "ensemble ..."
- "route this task ...", "best model for ...", "second opinion da ..."
- "team mode", "parallel-dev", "sviluppa in parallelo", "swarm parallel", "fai team", "build with a team"
- "fai questo task con tre modelli", "chiedi anche a Codex e Gemini"

## When NOT to invoke

- The user explicitly names exactly one model — call that CLI directly.
- The user asks the orchestrator to do the task itself. Token cost alone is not a swarm trigger.
- The task depends on the orchestrator's unsaved in-memory state. Save needed context to disk first or ask one short clarification.
- The task needs harness-specific tools (MCP servers, slash commands, in-process state) that other CLIs cannot access.

If intent is ambiguous, ask **one** short question. Do not guess.

## Architecture truth

What this skill IS:
- A classifier + dispatcher that decides which model to call.
- Four modes: **single**, **sequential**, **parallel fan-out**, **parallel-team**.
- A verbatim aggregator that labels each model's contribution.
- Harness-aware: dispatch implementation differs per orchestrator. Same skill, three runtime profiles.
- Aware that **Copilot is a multiplexer**, not a model — `copilot --model <name>` (or the `copilot-delegate` skill if the orchestrator is Claude) can target any of: Claude (Opus 4.7 / Sonnet 4.6, 4.5, 4 / Haiku 4.5), GPT (5.5, 5.4, 5.2, mini, codex), or free tiers (`gpt-4.1`, `gpt-5-mini` at 0× cost).

What this skill is NOT:
- A peer-to-peer swarm between Codex, Gemini, and Claude. **That doesn't exist today.** Different model CLIs run in separate shell processes with no mailbox protocol between them.
- A wrapper around Anthropic Agent Teams. Agent Teams is peer-to-peer but **Claude-only** and experimental — out of scope.
- A wrapper around AionUi's Team MCP Server. AionUi (open-source, Apache-2.0) does real multi-agent coordination via its custom ACP protocol, but it's a desktop app — not a CLI skill. If true peer-to-peer multi-model is required, evaluate AionUi separately.
- A way to bypass per-model auth, quotas, or sandboxing. Each CLI enforces its own.

## Specialization matrix (2026 benchmarks)

Use this matrix to classify the task. Numbers cited are from public benchmarks (SWE-bench Verified, Terminal-Bench 2.0, blind code-review evals) — treat as priors, not certainties.

| Capability                                           | Strongest model        | Why                                                                                    |
|------------------------------------------------------|------------------------|----------------------------------------------------------------------------------------|
| Implementation, agentic loops, edge-case hunting     | **Claude (Opus 4.7)**  | SWE-bench #1 (~87.6%); won 67% of blind code-review evals vs Codex                     |
| Frontend HTML/CSS, Figma→code, SVG, visual fidelity  | **Gemini (3.x Pro)**   | Higher visual fidelity, better padding/contrast/SVG geometry; less "AI-designed" output |
| Big-context architectural reads (>200k tokens)       | **Gemini (3.x Pro)**   | 1M-token context window                                                                |
| Code review, security/diff audit, second opinion     | **Codex (GPT-5.x)**    | Surfaces security reasoning more often; cheap second opinion vs Opus                   |
| Terminal/DevOps/scripting/sys-admin                  | **Codex (GPT-5.x)**    | Terminal-Bench 2.0 leader (77.3% vs 65.4%); ~4× more token-efficient                   |
| GPT-5.5 standalone (not Codex-tuned)                 | **GPT-5.5 via Copilot**| Reachable only through Copilot CLI                                                     |
| Cheap one-shot Q&A, summaries, classification        | **Free tier via Copilot** | `gpt-4.1` and `gpt-5-mini` are 0× cost on Copilot quota                              |
| Tasks requiring this session's in-memory state       | **Orchestrator only**  | Other CLIs can't see it                                                                |

**Trigger words → model** quick lookup:

| Words in user's task                                            | Default route                                |
|------------------------------------------------------------------|----------------------------------------------|
| UI, component, HTML, CSS, Tailwind, Figma, mockup, SVG, icon, layout, dark mode | Gemini                                       |
| review, audit, security, diff, PR, lint, smell, refactor-safety  | Codex                                        |
| script, bash, zsh, Dockerfile, CI, GH Actions, deploy, sysadmin  | Codex                                        |
| summarize, "leggi tutto", >200k tokens, big log, big repo Q&A    | Gemini (1M context)                          |
| bug, edge case, integration test, end-to-end feature, debugging  | Claude (orchestrator-local if it is Claude, else delegate) |
| "the best", "more thorough", "double-check"                      | parallel fan-out (Claude + Codex + Gemini)   |
| "free", "gratis", "budget zero", "non costare nulla"             | Copilot free tier (`gpt-4.1` or `gpt-5-mini`) |

## Modes of execution

Pick the lightest mode that fits the task. Default to **single** unless the user asks for more.

- **Mode 1 — single**: one dispatch, one model, one answer. ~80% of routings. Works in every harness.
- **Mode 2 — sequential pipeline**: A's output feeds B (e.g. Gemini writes UI → Codex reviews). Works in every harness.
- **Mode 3 — parallel fan-out**: same prompt to N models, synthesize answers. For competing hypotheses / second opinions. Works in every harness (mechanism differs).
- **Mode 4 — parallel-team**: split a *complex feature* into N disjoint subtasks, spawn N parallel workers, each delegating its work to the specialist model best suited to its role. **Mode 4 quality depends on the harness** — Claude Code has the cleanest implementation (native subagent in-process); Copilot/Gemini fall back to shell-parallel background processes, which works but loses coordination guarantees.

## Harness-specific dispatch

The skill is identical; the dispatch implementation depends on which AI tool is reading this file. Follow the section that matches **your current harness**.

### When the orchestrator is Claude Code

Claude Code is the reference implementation — every primitive maps cleanly.

| Target              | Mechanism                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------|
| Claude (self)       | In-session work. No delegation needed.                                                     |
| Claude via Copilot  | Invoke `copilot-delegate` skill via `Skill` tool, `--model claude-opus-4.7\|sonnet\|haiku`. |
| Gemini              | Invoke `gemini-delegate` skill via `Skill` tool. Use `--approval-mode plan` for read-only. |
| Codex CLI           | Invoke `codex-delegate` skill via `Skill` tool. Use `--sandbox read-only` for audits.       |
| GPT via Copilot     | Invoke `copilot-delegate` skill, `--model gpt-5.5\|gpt-5.4\|gpt-5.3-codex\|...`.            |
| Free tier (Copilot) | Invoke `copilot-delegate` skill, `--model gpt-4.1` or `gpt-5-mini` (0× cost).               |
| **Mode 4 subagents**| Spawn N parallel subagents via the `Agent` tool — **send all `Agent` calls in one message** so they run concurrently. Each subagent is a fresh Claude with its own context; in its prompt, instruct it to invoke the matching `*-delegate` skill for its specialist work. Cap N ≤ 4. |

### When the orchestrator is GitHub Copilot

Copilot reads this SKILL.md as plain instructions (no `Skill` tool, no `Agent` tool). Dispatch is shell-based.

| Target              | Mechanism                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------|
| Copilot (self, any model) | **Direct model swap, no shell-out**: just continue working under `copilot --model <name>`. If user already runs `copilot --model claude-opus-4.7`, you ARE Opus. |
| Different Copilot model | Out-of-band: tell the user "switch to `copilot --model <X>` for this subtask" — Copilot cannot self-restart with a new model mid-session. Alternative: shell-out to a new copilot process (see below). |
| Gemini              | `gemini --approval-mode plan -p "$(cat <<'EOF'\n<prompt>\nEOF\n)"` via shell.               |
| Codex CLI           | `codex exec --sandbox read-only --ask-for-approval never --color never --output-last-message /dev/stdout - <<'EOF' ... EOF` via shell. |
| Claude Code (one-shot) | `claude -p "<prompt>"` via shell — useful when the orchestrator Copilot needs Claude as a tool. |
| Free-tier sub-call (within Copilot session) | `copilot -p "<prompt>" --model gpt-4.1 --allow-all-tools --allow-all-paths --log-level none` as a child process. |
| **Mode 4 subagents**| **Shell parallelism**, no in-process subagent. Background the N CLI calls and `wait`: <br>```bash\n(gemini -p "..." > /tmp/swarm/frontend.out 2>&1) &\nGEMI_PID=$!\n(codex exec ... > /tmp/swarm/a11y.out 2>&1) &\nCDX_PID=$!\n# ... orchestrator does Claude work here in foreground\nwait $GEMI_PID $CDX_PID\n```<br>Cap N ≤ 3 in Copilot — coordination overhead and `wait` semantics make 4+ unreliable. **No file-ownership enforcement** at runtime; you must trust the prompt boundaries. Write outputs to `/tmp/swarm/<role>.out` (or `%TEMP%\swarm\<role>.out` on Windows) and read them back after `wait` finishes. |

Copilot-specific caveats:
- `copilot -p` requires `--allow-all-tools` (or `--yolo`) to run unattended. Without it the child process hangs on approval.
- Use `--log-level none` to keep child output clean — the orchestrator parses it.
- When using `--effort high`, expect 2–3× longer wall time per call; don't fan-out high-effort calls in parallel without explicit user opt-in (premium-request cost balloons).

### When the orchestrator is Gemini CLI

Gemini CLI reads SKILL.md as instructions (or via its `activate_skill` mechanism if configured). Dispatch is shell-based, mirroring Copilot.

| Target              | Mechanism                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------|
| Gemini (self)       | In-session work. No delegation needed.                                                     |
| Claude Code         | `claude -p "<prompt>"` via shell.                                                          |
| Codex CLI           | `codex exec ... - <<'EOF' ... EOF` via shell.                                              |
| Copilot (any model) | `copilot -p "<prompt>" --model <name> --allow-all-tools --allow-all-paths --log-level none` via shell. |
| **Mode 4 subagents**| **Shell parallelism**, same pattern as Copilot. Cap N ≤ 3. No file-ownership enforcement at runtime. |

### When the orchestrator is Codex CLI

Codex CLI reads `AGENTS.md` and follows skill instructions referenced by absolute path. Dispatch is shell-based.

| Target              | Mechanism                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------|
| Codex (self)        | In-session work.                                                                           |
| Claude Code         | `claude -p "<prompt>"` via shell.                                                          |
| Gemini              | `gemini -p ... --approval-mode plan` via shell.                                            |
| Copilot (any model) | `copilot -p ... --model <name>` via shell.                                                 |
| **Mode 4 subagents**| Shell parallelism, same as Copilot/Gemini. Codex's `--sandbox` flag only affects Codex itself, not child processes. |

## Modes — implementation notes

### Mode 1 — single (default)

Classify → pick one target → invoke per the [Harness-specific dispatch](#harness-specific-dispatch) table → return verbatim with a one-line preamble naming the chosen model and reason. ~80% of routings.

### Mode 2 — sequential pipeline

A's output feeds B. Always:
1. Run stage A.
2. Save stage A's output to a temp file (so stage B reads from disk, not from the orchestrator's context).
3. Run stage B, pointing it at the temp file.
4. Return a single combined block.

Never chain more than 3 stages without explicit user confirmation.

### Mode 3 — parallel fan-out

Send the **same** prompt to 2–3 models in parallel, then synthesize.

- **Claude Code orchestrator**: invoke the delegate skills in a single message (parallel tool calls).
- **Copilot / Gemini / Codex orchestrator**: shell parallelism with `&` + `wait`. Pipe each CLI's output to a temp file, read all files back after `wait`.

Cap at 3 models. Synthesis cites which model said what for divergent points; convergent points need no attribution.

Never fan-out for trivial questions — it burns the user's quota across three providers for nothing.

### Mode 4 — parallel-team (subagent / process-parallel dev swarm)

Use when the user wants a **complex feature built in parallel** with multiple specialists working concurrently — phrases like "team mode", "parallel-dev", "sviluppa in parallelo", "swarm parallel", "fai team", "build with a team".

Mechanism:

1. **Split**: orchestrator decomposes the feature into **N disjoint subtasks**, each with a clear *role* and a *file ownership boundary* so two workers never edit the same file.
2. **Assign a specialist model per role** from the [Specialization matrix](#specialization-matrix-2026-benchmarks).
3. **Spawn N workers in parallel** per the harness rules:
   - **Claude Code**: native `Agent` tool, all calls in one message (cap N ≤ 4).
   - **Copilot / Gemini / Codex**: shell background processes + `wait` (cap N ≤ 3).
4. **Aggregate**: when all workers finish, emit a single combined block — one section per worker + a Synthesis section with integration points, conflicts spotted, recommended merge order, and cost breakdown per provider.

**Hard rules (all harnesses):**
- **File ownership is non-negotiable**: list every file/directory each worker may write to. If two subtasks need the same file, sequence them via Mode 2 instead.
- **Each worker gets its own context window**. Its prompt must be self-contained.
- **Cost transparency**: state which provider's quota each worker burns.
- **No native enforcement outside Claude Code**: in Copilot/Gemini/Codex, file ownership is enforced only by prompt discipline. Audit `git status` after Mode 4 finishes to spot boundary violations.

## Output contract

Always return **one** block in this exact shape. No prose before or after.

```text
---
swarm-mode: single | sequential | parallel-fanout | parallel-team
swarm-orchestrator: claude-code | copilot | gemini-cli | codex
swarm-route:
  - <model-name> (<dispatch mechanism>) — <one-line reason>
  - <model-name> (<dispatch mechanism>) — <one-line reason>   # only if multi-step
file-ownership:                                                  # ONLY for parallel-team
  - <worker role>: <comma-separated paths it may write>
task: <one-line summary of the user's request, ≤120 chars>
---

## <stage / worker role / model name>
<verbatim output from that worker, byte-for-byte>

## <next stage / worker role>   # only for sequential, fan-out, or parallel-team
<verbatim output>

## Synthesis                       # for parallel-fanout AND parallel-team
<For parallel-fanout: merged answer citing which model contributed each divergent point.>
<For parallel-team: integration points across workers, conflicts spotted, recommended merge order, cost breakdown per provider.>
```

Trim only:
- Each CLI's metadata footer (token usage, "Changes/Requests/Tokens" summary blocks).
- ANSI color escape sequences.

Do **not** rewrite, summarize, translate, or "fix" any model's output. Synthesis is the **one** place where the orchestrator is allowed to merge — and even there, divergent points must cite the source model.

If any worker fails, surface the error verbatim in that stage's block and continue with the remaining stages. Don't silently retry, don't broaden permissions, and don't fall back to doing the task yourself.

## Examples

### Example 1 — single (UI task → Gemini)

User: "usa lo swarm: scrivi il componente RatePicker in React+Tailwind con i 4 stati visivi"

Classification: UI/React/Tailwind → Gemini. Orchestrator invokes Gemini per its harness rules and returns:

```text
---
swarm-mode: single
swarm-orchestrator: <whichever harness ran>
swarm-route:
  - Gemini 2.5 Pro — UI/React/Tailwind specialization
task: Build React+Tailwind RatePicker component with 4 visual states.
---

## Gemini 2.5 Pro
<verbatim gemini output>
```

### Example 2 — sequential pipeline (Gemini → Codex)

User: "swarm: Gemini scrive la pagina di onboarding, poi falla revisionare a Codex per accessibility"

Pipeline:
1. Gemini builds onboarding page → writes `frontend/src/app/onboarding/page.tsx`.
2. Codex (`--sandbox read-only`) reads the file and reports a11y issues.

### Example 3 — parallel fan-out (competing hypotheses)

User: "swarm fan-out: perché il rate-review submit fallisce in QA? Chiedi a tutti e tre"

Fan-out the **same** prompt (with log path attached) to Claude + Codex + Gemini in parallel, then synthesize. The orchestrator's harness determines the mechanism (Claude Code: 3 parallel tool calls; Copilot/Gemini/Codex: 3 background shell processes).

### Example 4 — Copilot multiplexer (free-tier classification + paid execution)

User: "swarm: classifica questi 200 messaggi support come bug/feature/question (gratis se possibile) e poi per ogni 'bug' fai una bozza di reply professionale"

Two-stage routing mixing free and paid tiers within Copilot:

1. **Classification** → `gpt-4.1` (0× cost) reads the JSON file and emits a category map.
2. **Reply drafting (only for `bug` items)** → `claude-sonnet-4.6` via Copilot (1×) drafts the replies.

### Example 5 — Cross-harness sanity check (fan-out)

User: "swarm fan-out: chiedi a Opus locale e a Opus via Copilot la stessa analisi del modulo auth. Voglio vedere se rispondono uguale."

Same model, two harnesses. Useful to spot harness-specific bias.

### Example 6 — parallel-team in Claude Code (dev swarm with 3 specialist subagents)

User: "swarm parallel-dev: implementa la feature RatePicker end-to-end. Frontend in React+Tailwind, backend NestJS endpoint, accessibility review finale."

Lead Claude decomposes into 3 disjoint subtasks with file ownership boundaries, picks specialist models, then spawns 3 subagents in a **single message** so they run concurrently:

- `[frontend-specialist]` — Gemini specialty. Owns `frontend/src/components/RatePicker.{tsx,test.tsx}`.
- `[backend-specialist]` — Claude in-session subagent (no further delegation). Owns `backend/src/rates/*`.
- `[a11y-reviewer]` — Codex specialty. Read-only on the frontend file once it exists.

Each subagent prompt explicitly instructs which `*-delegate` skill to invoke for its specialist work. Lead aggregates with a Synthesis section listing integration points and cost breakdown.

### Example 7 — parallel-team in Copilot (shell-parallel dev swarm)

User: "swarm parallel-dev (sono su Copilot): stesso RatePicker end-to-end"

Same split as Example 6, but the dispatch is shell-parallel since Copilot has no native subagent primitive. Orchestrator Copilot writes:

```bash
mkdir -p /tmp/swarm
# frontend specialist → Gemini
(gemini --approval-mode auto_edit --skip-trust -p "$(cat <<'EOF'
You are the frontend specialist. Build frontend/src/components/RatePicker.tsx
with 4 visual states (idle/hover/selected/disabled). React + Tailwind.
File ownership boundary: only RatePicker.tsx and RatePicker.test.tsx.
EOF
)" > /tmp/swarm/frontend.out 2>&1) &
GEMI_PID=$!

# a11y reviewer → Codex (read-only — must wait for frontend to land)
# Note: in shell parallelism there is no native barrier; instruct in prompt
(sleep 60 && codex exec --cd $(pwd) --sandbox read-only --ask-for-approval never \
   --color never --output-last-message /dev/stdout - <<'EOF' > /tmp/swarm/a11y.out 2>&1
Review frontend/src/components/RatePicker.tsx for a11y once it exists.
Report issues with severity, focus on keyboard nav and ARIA.
EOF
) &
CDX_PID=$!

# backend specialist → orchestrator Copilot itself (running claude-opus-4.7)
# does it in foreground. Edits backend/src/rates/* directly.

wait $GEMI_PID $CDX_PID
echo "=== FRONTEND ==="; cat /tmp/swarm/frontend.out
echo "=== A11Y ===";     cat /tmp/swarm/a11y.out
```

Then Copilot aggregates the three outputs into the standard combined block. **Caveats vs Claude Code**:
- No atomic spawn — frontend and a11y race; the `sleep 60` is a brittle barrier (replace with file-existence polling in production).
- No per-subagent context window — each child CLI process is fresh, same as Claude Code, but the orchestrator can't `Shift+Down` into one and steer.
- File ownership is prompt-only. Audit `git status` after.

### Example 8 — refused routing

User: "usa lo swarm per leggere quella variabile in memoria che abbiamo creato prima"

Decline (politely): the variable is in the orchestrator's session memory; no other CLI can see it. Ask whether to dump it to disk first or do the read locally — no swarm needed.

## Cost-aware defaults

If the user does not specify a model tier:

- **Throwaway classification / short Q&A** → Copilot free tier (`gpt-4.1` or `gpt-5-mini`, 0× cost). Use this also for the swarm-router's *own* classification step when unsure which lane fits — it's literally free.
- **Cheap summaries at scale** → Gemini Flash (`gemini-2.5-flash`) or Copilot Haiku (`claude-haiku-4.5`, 0.33×). Pick by which quota the user wants to spend.
- **Code review / security audit** → Codex default (1× on OpenAI quota) **or** Copilot Codex (1× on GitHub quota).
- **UI implementation** → Gemini Pro (default).
- **Heavy implementation / edge cases** → Claude in-session (no extra cost if orchestrator is Claude) **or** Copilot Opus if Claude turn-limit is the bottleneck.
- **Parallel fan-out** → Pro tier per model unless user says "cheap fan-out" (then Flash + Sonnet/Codex 1× + free-tier GPT).

Tell the user which tier you picked in the `swarm-route` block reason. They can override on the next turn.

## Edge cases

- **Task is half UI, half backend** → split into two subtasks, sequential mode (Gemini → Claude or vice versa, by data flow). Don't dump a mixed task on one model.
- **User asks for "all three but only the best wins"** → parallel-fanout, then in Synthesis pick the best answer and mark the others as discarded with one-line reasons.
- **One target is not authenticated** → return its auth error verbatim in its stage block, complete the other stages, and tell the user how to authenticate (e.g. "run `gemini` interactively once").
- **Quota exhausted on one provider** → don't silently substitute. Return the quota error verbatim and ask the user how to proceed.
- **User asks to involve >3 models** → push back. Only Claude, Codex, Gemini, Copilot's many models are useful CLIs today. Additional copies of the same model are not a swarm.
- **Synthesis would leak orchestrator bias** → in parallel-fanout, synthesize neutrally: list points each model raised, mark unique vs shared. Avoid the orchestrator "voting" on its own answer.
- **(Mode 4) Two workers need the same file** → split is wrong. Either sequence via Mode 2 or extract a helper module so ownership stays clean.
- **(Mode 4) Worker B depends on worker A's output** → keep in the same wave but state the dependency in B's prompt ("wait until `<path>` exists before reading"). In shell-parallel harnesses (Copilot/Gemini/Codex), implement the barrier with an explicit `until [ -f <path> ]; do sleep 2; done` loop in B's command, not with arbitrary `sleep N`.
- **(Mode 4) One worker fails or returns garbage** → surface its failure verbatim in its section, mark the file-ownership block as `partial`, and ask the user whether to respawn that single worker or fall back to the orchestrator.
- **(Mode 4) Dirty worktree on files the team would touch** → confirm with the user before spawning. The team will overwrite uncommitted changes if boundaries overlap them.
- **(Copilot/Gemini/Codex orchestrator) Child CLI hangs** → enforce a per-child shell timeout (`timeout 600 gemini -p ...`). Default 10 min.
- **(Copilot orchestrator) Child `copilot -p` triggers approval prompt** → always include `--allow-all-tools --allow-all-paths --log-level none`. Without these the child hangs.

## NONoise integration

When this skill is scaffolded by `create-nonoise`:

- The skill lives in `packages/skills/swarm-router/SKILL.md` and is copied/symlinked into `.claude/skills/swarm-router/` of each scaffolded project.
- The generated context files reference it per-harness:
  - `CLAUDE.md` → "When the user says 'swarm: …' or 'parallel-dev: …', invoke the `swarm-router` Skill tool."
  - `.github/copilot-instructions.md` → "When the user says 'swarm: …' or 'parallel-dev: …', read `.claude/skills/swarm-router/SKILL.md` and follow it (you are the Copilot orchestrator — apply the Copilot section)."
  - `GEMINI.md` → "When the user says 'swarm: …' or 'parallel-dev: …', read `.claude/skills/swarm-router/SKILL.md` and follow it (you are the Gemini orchestrator — apply the Gemini CLI section)."
  - `AGENTS.md` → "When the user says 'swarm: …' or 'parallel-dev: …', read `.claude/skills/swarm-router/SKILL.md` and follow it (apply the section matching your harness)."
- Skill is registered in `docs/skills-catalog.md` under the **Multi-model orchestration** domain.
- Cross-tool tier: **first-class on Claude Code** (cleanest Mode 4 via `Agent` tool); **best-effort on Copilot / Gemini / Codex** (Mode 1/2/3 first-class, Mode 4 via shell-parallel with documented caveats).

## Composition with subagent-driven-development (Claude Code only)

This skill is **stand-alone** by design. It does not auto-inject into `superpowers:subagent-driven-development` or `superpowers:dispatching-parallel-agents`. To use it inside a Super Powers flow, name it explicitly in your plan step:

```text
Step 4: Build the rate-picker UI.
  Use the swarm-router skill to route this UI work to Gemini, then have Codex review the diff.
```

Or as a one-liner: "swarm: <task>" inside the plan.
