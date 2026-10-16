---
name: arch-decision
description: Validate an existing draft PRD through Haft ProblemCard, solution variants and parity comparison, then route the operator's explicit Phase 5.5 choice through h-decide and project the result into PRD frontmatter. Use for architectural PRD validation; creates no duplicate FPF audit register.
---

# arch-decision — PRD review with Haft

Read the complete PRD and the constraints it cites. Reuse scope and authority
already supplied by the operator. Input is an existing `draft` PRD at
`docs/prd/<area>/NN-<study>.md`; use `arch-brainstorm` if the PRD is absent.
For an already validated PRD, inspect the referenced decision before any
operator-requested supersession; do not silently replace a binding choice.

## Runtime and current basis

Load sibling `quint-fpf` and follow its required-runtime check. If the `haft`
MCP server or required skill is unavailable, stop and give
`create-nonoise --upgrade .` and `create-nonoise doctor .`; no fallback.
Read the installed Haft skills for exact interfaces and authority rules.
Use `h-status` and exact artifact recovery to resume existing work. Historical
`docs/prd/*/audit/*-fpf/` folders are evidence to inspect, never state to erase or
a substitute for a current Haft decision. Keep the PRD `draft` while review runs.

## Frame, variants and comparison

This PRD validation has a durable receiving use: architecture projection and
sprint planning must be able to recover the reviewed basis.

1. Use `h-frame` to record the PRD's problem as a ProblemCard. Separate observed
   signal, bounded context, hard constraints, optimization targets, observation
   indicators and acceptance criteria. Retain the returned ID/path.
2. Use `h-explore` to recover the PRD's proposed choice and materially different
   alternatives. Label additional alternatives honestly. Record the portfolio
   needed for this review, preserving returned option `record_reference` values
   from candidate Notes when typed projection is applicable. Never invent IDs.
3. Use `h-compare`: declare dimensions, parity conditions, evidence window,
   missing-data policy and selection policy **before** scoring. Check constraints
   and gather reproducible evidence; report gaps and the Pareto/non-dominated
   set without turning a recommendation into a selection.
4. Prepare a reviewed decision payload with rationale, counterargument, weakest
   link, rejected alternatives, rollback, invariants, affected files, predictions
   and validity as required by the installed `h-decide` contract. Include actual
   problem/portfolio references. No binding write happens at this point.

Follow kernel gates and errors. NONoise adds no scalar reliability formula or
PASS threshold. Do not request confirmation between ordinary evidence steps.

## Phase 5.5 — human review and binding request

This gate is the operator request required by `h-decide`, not a second approval
round after binding. Before binding or changing the PRD to `validated/rejected`,
present a self-contained Human Gate Brief:

- readable PRD and decision subject, exact effect and scope;
- options, constraint exclusions, parity basis, declared selection policy,
  Pareto set and concrete trade-offs;
- evidence freshness, uncertainty, weakest links, counterargument and rollback;
- advisory recommendation, with uncertain rationale prominently identified;
- real choices: bind a specified option, reject the current set, gather more
  evidence/revise, or defer. State consequences for each available choice.

Accept a direct natural-language choice. There is no default; silence, a
recommendation or "validate this PRD" without a specific choice cannot bind.
If the operator already directly requested the exact current effect, subject,
option and scope, route that request without a second confirmation. For multiple
independent architectural choices, each must have its own explicit authority
and DecisionRecord; never bundle ambiguous selections.

A human may accept stated risks against the advisory recommendation. Preserve
the rationale and mark `validated_by: human-override`; this cannot bypass a
kernel constraint, invalid reference, or spec-binding conflict. Revise or gather
more evidence when the kernel does not admit the requested effect.

## Bind and project the PRD

Follow installed `h-decide`: discover `haft interface decision.decide --json`,
run `haft_query(action="spec_binding_preflight", decision_draft=...)`, resolve
its applicable gates, then route the explicit choice through
`haft artifact create decision.decide --input-file <reviewed-input.json> --json`.
MCP `haft_decision(action="decide")` rejects binding and is not a shortcut.
Record `host_routed_operator_request` honestly. Only successful kernel results
establish an ID/path; recover the exact result on uncertain completion before
retrying to avoid duplicate decisions.

For acceptance set `status: validated`; for an explicit rejection of the set
use the kernel's supported `ChoiceResult` (`reject_current_set`) and set
`status: rejected` only once the rejection is recorded. Revision/defer leaves
`status: draft`. Do not fabricate a DecisionRecord when binding fails.

Preserve unrelated PRD fields and write this reference shape, using actual
returned IDs and repository-root-relative carrier paths (arrays support multiple
independent choice groups):

```yaml
status: validated
validated_at: YYYY-MM-DD
validated_by: arch-decision (Haft, operator-requested)
haft:
  problems:
    - id: <returned problem id>
      path: .haft/problems/<returned filename>.md
  solutions:
    - id: <returned portfolio id>
      path: .haft/solutions/<returned filename>.md
  decisions:
    - id: <returned decision id>
      path: .haft/decisions/<returned filename>.md
```

The canonical FPF record is `.haft/`; no per-phase audit folder is created.
For an accepted PRD, put the derived `## Impact on docs/architecture/` checklist
in the **PRD**, with bullets `- [file: <basename>] Add|Append|Mark|Remove|Update:
<payload>`. This is a projection of the bound decision, not another decision
register; cite its Haft refs. Do not append edits directly to Haft-owned carriers.

Return the verdict, readable artifact titles with IDs/paths, remaining risks and
next steps. Offer `arch-sync` for the PRD checklist, with diff preview; never
invoke it automatically. `sprint-manifest` retains the references when moving
PRDs. Use `h-verify` later for observed outcomes and `h-status` for resumption.
