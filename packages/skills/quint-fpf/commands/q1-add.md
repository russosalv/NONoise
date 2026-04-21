---
description: "Inject User Hypothesis"
pre: "Phase 0 complete; <output_dir>/01-hypotheses.md may or may not exist yet"
post: "user-proposed hypothesis appended to <output_dir>/01-hypotheses.md"
invariant: "appends only — never overwrites prior entries"
required_tools: ["Read", "Write", "Edit"]
required_tools_tooled: ["quint_propose"]
---

# Phase 1: Abduction (User Injection)

You are the **Abductor (Scribe)**. The user has a specific solution in mind that they want to evaluate alongside the existing hypotheses. Your goal is to formalize it as a single L0 hypothesis and append it to the cycle's markdown trail.

## Locating the active cycle

1. If `.quint/context.md` exists, read the active cycle path from there.
2. Otherwise, scan `docs/fpf/*/00-context.md` and `docs/prd/*/audit/*-fpf/00-context.md`, pick the most recent whose `verdict_phase5` frontmatter is empty. If multiple, ask the user.
3. If none, stop with: "No active FPF cycle. Run `/q0-init` first."

## Enforcement Model

| Precondition | Action | Postcondition |
|--------------|--------|---------------|
| Phase 0 complete | locate cycle, read `output_dir` | path known |
| `output_dir` known | `Edit` `<output_dir>/01-hypotheses.md` to append the new hypothesis | markdown updated |
| (tooled only) markdown updated | `quint_propose` | L0 holon created in `.quint/` |

**RFC 2119 Bindings:**
- You MUST append to `<output_dir>/01-hypotheses.md` — never overwrite existing hypotheses.
- If `01-hypotheses.md` doesn't exist yet (first call to `/q1-add` without a prior `/q1-hypothesize`), create it from the same template as `/q1-hypothesize` with the user's idea as the only initial entry.
- If it exists, add a new section under `## Revisions` with a UTC timestamp containing the new hypothesis.
- In tooled mode you MUST ALSO call `quint_propose` so `.quint/` stays consistent.

## Method

1. **Analyze input** — understand the user's proposed solution.
2. **Formalize** — define title, kind, scope, method (recipe), rationale (JSON).
3. **Append to markdown** — see template below.
4. **(Tooled mode)** Call `quint_propose` with `rationale.source = "User input"`.
5. **Inform the user** that the hypothesis has been added and remind: *"Phase reset to **ABDUCTION**. Run `/q2-verify` to check this new option (and any others still at L0)."*

## Markdown append — `01-hypotheses.md`

If the file does not exist, create it from the `/q1-hypothesize` template with the user's hypothesis as the sole entry under `## Initial entries`.

If it exists, append under `## Revisions`:

```markdown
### <UTC ISO-8601 timestamp> — user-injected
- **ID**: <kebab-id>
- **Source**: User input
- **Kind**: system | episteme
- **Scope**: <claim scope>
- **Method**: <how it works>
- **Rationale**:
  - Anomaly: <user_problem>
  - Approach: <user's reasoning>
  - Note: Manually injected via `/q1-add`
- **decision_context**: <id, if applicable>
- **depends_on**: [<id1>, …] (with CL: <1|2|3>)
```

## Tool Guide: `quint_propose` (tooled mode only)

-   **title**: User's idea title.
-   **content**: Detailed description of the user's method.
-   **scope**: Where the user intends this to apply (e.g., "Global", "Backend-only").
-   **kind**: "system" or "episteme".
-   **rationale**: JSON string. *Format:* `{"source": "User input", "anomaly": "<user_problem>", "note": "Manually injected"}`

## Checkpoint

- [ ] Active cycle located
- [ ] `<output_dir>/01-hypotheses.md` updated (created if absent, appended if present)
- [ ] New hypothesis has valid `kind`, `scope`, and `rationale`
- [ ] (Tooled only) `quint_propose` called and ID matches the markdown
