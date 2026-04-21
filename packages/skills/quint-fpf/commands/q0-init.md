---
description: "Initialize FPF Context"
pre: "none"
post: "<output_dir>/00-context.md exists AND (in tooled mode) .quint/ directory exists AND context recorded"
invariant: "initialization is idempotent; output_dir is resolved exactly once and recorded in 00-context.md frontmatter"
required_tools: ["Write"]
required_tools_tooled: ["quint_init", "quint_record_context"]
---

# Phase 0: Initialization

You are the **Initializer** operating as a **state machine executor**. Your goal is to establish the **Bounded Context (A.1.1)** for this reasoning session AND to set up the per-cycle output folder that all subsequent phases will write to.

## Arguments

`/q0-init` accepts two optional arguments (used to resolve the output directory):

- `--target <path>` — used by parent skills (e.g. `arch-decision` passes `docs/prd/<area>/audit/NN-<study>-fpf/`). Bypasses slug derivation. Path is used verbatim.
- `--slug <kebab-slug>` — manual override. Resolves to `docs/fpf/<slug>/`.

If neither is provided, derive the slug from the user's problem statement (2–3 keywords, kebab-case) and resolve to `docs/fpf/<slug>/`. If the problem statement is too vague to produce a slug, ask the user once for one.

## Enforcement Model

**Execution is IMPOSSIBLE without producing the markdown artifact.** Prose descriptions of initialization do not establish the cycle — `00-context.md` does. In tooled mode, holon state additionally lives in `.quint/`.

| Precondition | Action | Postcondition |
|--------------|--------|---------------|
| none | resolve `output_dir` (see Arguments) | path string ready |
| `output_dir` resolved | `Write` `<output_dir>/00-context.md` | markdown context exists on disk |
| (tooled only) markdown exists | `quint_init` | `.quint/` structure exists |
| (tooled only) `.quint/` exists | `quint_record_context` | `.quint/context.md` populated |

**RFC 2119 Bindings:**
- You MUST resolve `output_dir` before any other action and record it in `00-context.md` frontmatter.
- You MUST `Write` `<output_dir>/00-context.md` from the template below — in BOTH modes. This is the canonical human-readable record of the cycle and the lookup target for subsequent phases.
- In tooled mode you MUST ALSO call `quint_init` and `quint_record_context` so the MCP holon state is consistent with the markdown.
- You SHALL NOT proceed to Phase 1 without `00-context.md` existing on disk.
- Skipping the markdown write — even in tooled mode where `.quint/context.md` is also produced — is a **protocol violation** (the human-readable trail is mandatory).

**If you skip the markdown write:** Subsequent phases (`/q1-*`, `/q2-*`, …) cannot find the active cycle and will block with "No active FPF cycle. Run `/q0-init` first."

## Invalid Behaviors

- Claiming "context established" without writing `00-context.md`
- In tooled mode: writing the markdown but skipping `quint_init` / `quint_record_context`
- Hardcoding `output_dir` instead of resolving it from arguments / slug derivation
- Proceeding to `/q1-hypothesize` without `00-context.md` on disk
- Resolving a different `output_dir` per phase — once chosen in Phase 0, it is invariant for the whole cycle

## Method

1. **Resolve `output_dir`** — apply the order in *Arguments* above.
2. **Probe mode** — check whether the `quint` MCP tools are available (e.g. attempt `/q-status` or look for `.quint/`). Record the result for the frontmatter.
3. **Context scanning** — analyze the project directory: read `README.md`, `package.json` / `go.mod` / `pyproject.toml` / `CLAUDE.md` to understand stack, constraints, domain.
4. **Context definition** — derive `vocabulary`, `invariants`, `constraints` for the session.
5. **Write the markdown** — `Write` `<output_dir>/00-context.md` using the template below. Create parent directories as needed.
6. **(Tooled mode only)** Call `quint_init` then `quint_record_context` so `.quint/context.md` mirrors the markdown.

## Markdown template — `00-context.md`

```markdown
---
phase: 0
slug: <slug>
output_dir: <resolved path>
mode: tooled | conversational
problem_statement: <one-sentence framing>
created_at: <UTC ISO-8601>
verdict_phase5:
---

# Phase 0 — Bounded Context

## Problem statement
<the user's question or anomaly, restated in one paragraph>

## Vocabulary
- **Term1**: definition
- **Term2**: definition
- ...

## Invariants
- <rule that MUST NOT be broken>
- ...

## Constraints
- <stack constraint, e.g. "Must use Postgres">
- <perf constraint, e.g. "Latency < 100ms p95">
- ...

## Tools detected
- quint MCP: present (vN.M) | absent — running in conversational mode
- Other: <relevant MCPs, e.g. browser, github>

## Sources scanned
- <files read while building this context, e.g. `README.md`, `docs/architecture/01-constraints.md`>

## Revisions
<empty on first run; appended on re-init>
```

The `verdict_phase5` field is left empty on creation. `/q5-decide` fills it in with `PASS | FAIL | NEEDS-REVISION`. Subsequent commands use it to detect whether the cycle is still open (empty = open, value = closed).

## Tool Guide: `quint_record_context` (tooled mode only)

-   **vocabulary**: same content as the `## Vocabulary` section above.
-   **invariants**: same content as the `## Invariants` section above.

Pass the same content you just wrote to the markdown — the two artifacts must agree.

## Checkpoint

Before proceeding to Phase 1, verify:
- [ ] `output_dir` resolved and recorded in `00-context.md` frontmatter
- [ ] `<output_dir>/00-context.md` exists on disk with the full template populated
- [ ] Mode (`tooled` / `conversational`) recorded in frontmatter
- [ ] (Tooled only) `quint_init` called (success, not BLOCKED)
- [ ] (Tooled only) `quint_record_context` called with same vocabulary and invariants

**If any checkbox is unchecked, you MUST complete it before proceeding.**
