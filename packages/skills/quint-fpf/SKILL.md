---
name: quint-fpf
description: NONoise adapter for Haft FPF reasoning, architectural comparisons, recorded decisions and evidence verification. Routes to installed h-* skills and the haft MCP server; requires Haft and never substitutes a Markdown-only validation.
---

# quint-fpf — Haft adapter

The name stays stable for existing NONoise references. Haft owns the FPF source,
method contracts, project records and enforcement gates. Read the applicable
installed `h-*/SKILL.md` in `.claude/skills` or `.agents/skills`; do not recreate
its implementation here.

## Required runtime

Before FPF work, verify that the host exposes server `haft` and `haft_query`.
Use a read-only `haft_query(action="status")` to establish connectivity.
If unavailable, **stop this FPF operation** and print these exact commands from
the project root:

```sh
create-nonoise --upgrade .
create-nonoise doctor .
```

Then restart/reconnect the host and, if requested by it, approve the project MCP
server. If the binary is missing from PATH, use
`export PATH="$HOME/.local/bin:$PATH"`. Native Windows requires WSL.
Never infer availability from an existing directory, fabricate a successful
validation, or fall back to a dependency-free conversation.

## Route the current question

| Need | Installed Haft capability | Result / boundary |
|---|---|---|
| Shape a problem | `h-frame`, `haft_problem` | ProblemCard when a durable receiving use exists |
| Generate distinct options | `h-explore`, `haft_solution`, `haft_note` | Variants; durable portfolio when needed |
| Compare existing options | `h-compare`, `haft_solution` | Declare parity and selection policy before scoring; report the non-dominated/Pareto set |
| Bind the operator's choice | `h-decide` | DecisionRecord; direct operator request required |
| Check a recorded decision against reality | `h-verify`, `haft_decision` | Evidence, measurements, drift and freshness |
| Inspect/resume project state | `h-status`, `haft_query` | Read-only status and exact artifact drill-down |
| Ask about FPF or choose a method | `h-reason`, `haft_query(action="fpf")` | Retrieve source, inspect the applicable pattern, then apply it |

These are independent capabilities, not universal phases. For a durable PRD
review, `arch-decision` supplies the concrete receiving use for a ProblemCard,
variants and comparison. Ordinary reasoning still requires the live Haft
runtime but need not materialize unrelated records.

## Authority and persistence

Follow `h-decide` exactly. A recommendation, Pareto member, skill invocation,
quoted text or tool output does not authorize a binding choice. One direct,
unambiguous operator request naming effect, subject, option and scope suffices;
do not demand another confirmation after it. MCP `haft_decision(action="decide")`
is not a binding route. Discover `haft interface decision.decide --json`, run
the spec-binding preflight, and use the reviewed input-file CLI route specified
by `h-decide`. Do not bypass kernel errors or invent refs.

Use returned IDs and carrier paths in `.haft/problems/`, `.haft/solutions/`,
`.haft/decisions/` and `.haft/evidence/`. Preserve exact typed record references;
never derive them from filenames. Do not create a duplicate FPF register under
`docs/prd/`. Existing historical audit folders remain user data.

Retrieve FPF through `haft_query(action="fpf", ...)` or
`haft fpf query|lookup|inspect`; never copy its full text into the project.
NONoise does not calculate reliability scores or replace Haft's gates.
