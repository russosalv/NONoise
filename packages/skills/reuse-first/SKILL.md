---
name: reuse-first
description: Before writing new code or adding a dependency, check what already solves the problem - in this codebase, in the project's dependencies, in the standard library, in a well-maintained package - and record an adopt / extend / build decision. Use at the start of feature design and architecture brainstorming, and whenever the task is "add X" where X sounds like something that already exists (a client, a parser, a validator, a retry helper, a date utility). Not needed in quick mode for a one-line fix.
---

# reuse-first — look before you build

New code is the most expensive way to get a capability: it has to be written,
tested, documented and maintained. This skill makes the search for an existing
answer an explicit, recorded step instead of an afterthought.

It was written for NONoise and follows its "canonical over exotic" principle.
The idea of a mandatory research step with an adopt / extend / build outcome is
inspired by the `search-first` skill of ECC (https://github.com/affaan-m/ECC, MIT).

## When to run it

- At the start of `feature-design` (medium and long mode) and of
  `arch-brainstorm` (long mode).
- When a task introduces a new dependency, a new utility module or a new service
  client.
- Skip it in quick mode, and for work that only changes existing behaviour.

## Step 1 — State the capability, not the solution

Write one sentence: what must the code be able to do, with which inputs and
constraints (runtime, licence, offline, performance, security). "A wrapper around
fetch" is a solution; "call the billing API with retries and a timeout, from the
browser and from Node" is a capability.

## Step 2 — Search, nearest first

Stop at the first level that gives a good answer.

1. **This codebase.** Use the `codebase-memory` tools: `search_graph` with a
   `semantic_query` for the capability and a `name_pattern` for likely names;
   `search_code` for distinctive strings. Without the graph, use Grep. Look in
   shared and utility modules first. In a multi-repo workspace, search the sibling
   repositories too.
2. **What the project already depends on.** Read the manifest (`package.json`,
   `*.csproj`, `pyproject.toml`, `go.mod`, ...). A library already in the project
   often has the feature; check its documentation before adding another one.
3. **The platform and the standard library.** Language and framework built-ins.
4. **A maintained external package.** Only now look outside. Prefer the canonical
   choice for the ecosystem over a clever newcomer. Check: licence compatible with
   the project, recent releases, open security advisories, size and transitive
   dependencies, and that it fits the constraints from Step 1. Use the web search
   or documentation tools the host offers; if there are none, say that the
   external search was not done.

## Step 3 — Decide

| Decision | When | What follows |
|---|---|---|
| **Adopt** | Something existing meets the need as it is | Use it; name the symbol or package and version |
| **Extend** | Something existing covers most of it | Extend or wrap it in place; do not fork a copy |
| **Build** | Nothing fits, or the fit costs more than building | Build the smallest thing; say why the candidates were rejected |

Adding a dependency is a decision the user owns when it is costly to remove
(a framework, a database client, anything with a licence or a runtime of its
own). Present it with the alternatives; do not install it on your own.

## Step 4 — Record it

Add a short section to the document the phase is producing — the spec under
`docs/superpowers/specs/` or the PRD under `docs/prd/<area>/`:

```markdown
## Reuse check

Capability: <one sentence>

| Candidate | Where | Fit | Verdict |
|-----------|-------|-----|---------|
| <existing symbol / package> | <path:line or registry> | <what it covers, what it lacks> | adopt / extend / rejected: <reason> |

Decision: adopt | extend | build — <one line why>
Not searched: <levels skipped and why>
```

There is no separate file and no separate register: the decision lives with the
design it belongs to.

## What this skill does not do

- It does not choose an architecture. A reuse decision that is costly to reverse
  goes through `arch-decision`.
- It does not install packages.
- It does not replace `reverse-engineering` or `graph-explorer`: those explain how
  existing code works; this one asks whether existing code already does the job.
