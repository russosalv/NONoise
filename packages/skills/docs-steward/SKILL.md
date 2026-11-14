---
name: docs-steward
description: Keeps the project's documentation trustworthy - one owner document for each kind of fact, no fact stated in two places, links and the decision index that still resolve. Audits the NONoise docs hierarchy (AGENTS.md, docs/architecture, docs/prd, docs/sprints, docs/requirements) and reports drift, duplicates and broken references; fixes only what the user approves. Use after arch-sync, at sprint closure or acceptance, before a release, and when someone says "the docs are out of date", "audit the docs", "controlla la documentazione".
---

# docs-steward — one owner per fact

Documentation rots in a predictable way: the same fact is written in three
places, one of them is updated, and nobody knows which to believe. This skill
gives every kind of fact a single owner document in the NONoise hierarchy and
checks that the rest of the documentation points to it instead of repeating it.

It was written for NONoise and works on the folders `create-nonoise` scaffolds.
The four roles and the rule of updating only the role a change affects are
inspired by the `living-docs-governance` and `docs-governance` skills of ECC
(https://github.com/affaan-m/ECC, MIT).

## The four roles, mapped onto NONoise

| Role | Question it answers | Owner in a NONoise project |
|---|---|---|
| **Constitution** | What rules does every contributor and every AI tool follow? | `AGENTS.md` (source of truth); `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules.md`, `GEMINI.md` are adapters kept in sync by `docs-md-generator` |
| **Map** | What is the system and how is it built? | `docs/architecture/` (constraints, C4, components), written through `arch-sync` and `c4-doc-writer` |
| **Status** | What is being built now, and what state is it in? | `docs/sprints/Sprint-N/` (manifest, promoted PRDs, acceptance reports) and draft PRDs under `docs/prd/` |
| **History** | What was decided, when and why? | PRD frontmatter (`status`, `decision`, `haft` references) and the canonical `.haft/` records; `docs/requirements/` for what was asked |

Read `docs/README.md` first: if the project documents a different mapping there,
that mapping wins. Do not create new top-level documents to host a role: every
role already has a home.

## What to check

Run the checks that apply; say which you skipped.

1. **Duplicated facts.** The same fact (a version, a port, a rule, a component
   list, a decision) stated in more than one role. The owner keeps it; the others
   should link to it. Use Grep for the distinctive values; when the
   `codebase-memory` graph is available, `search_code` finds them across code and
   docs together.
2. **Drift between map and code.** Components, endpoints or modules named in
   `docs/architecture/` that the code no longer has, and the reverse.
   `get_architecture` and `search_graph` give the code side.
3. **Drift between history and map.** A validated PRD whose
   `## Impact on docs/architecture/` checklist was never applied (no sync report
   under `docs/architecture/sync-reports/`), or a decision superseded without the
   map following.
4. **Decision index.** Every validated PRD has either `haft.decisions` references
   that resolve to files under `.haft/decisions/`, or `decision.mode:
   lightweight` with `choice` and `rationale`. PRDs with `status: draft` older
   than the current sprint are listed, not judged.
5. **Broken references.** Relative links and file paths in Markdown that do not
   resolve; references to skills, commands or folders that no longer exist.
6. **Adapters out of sync.** The managed blocks in the context files differ from
   `AGENTS.md` in substance (hand this to `docs-md-generator`).
7. **Orphans.** Documents nothing links to and no index lists.

## How to work

- **Audit first, change nothing.** Produce the report below and stop.
- **Fix only on request**, one finding or one group at a time, with a diff the
  user sees before it is written.
- **Update only the role the change affects.** A new endpoint changes the map,
  not the constitution. A decision changes history and, through `arch-sync`, the
  map.
- **Never rewrite history.** A superseded decision is marked superseded; it is
  not deleted or edited to look right. `.haft/` records are never edited by hand.
- **Documents are evidence, not truth.** When a document and the code disagree,
  report both; do not assume which is right.

## The report

```markdown
## Docs audit — <date>

Scope: <folders checked> · Skipped: <checks not run and why>

| # | Check | Where | What is wrong | Owner document | Suggested fix |
|---|-------|-------|---------------|----------------|---------------|

Summary: <n> duplicated facts, <n> drifts, <n> broken references, <n> orphans.
Next: <the one or two fixes that matter most>
```

Show the report in the conversation. Save it only if the user asks; the place
for it is the current sprint's folder (`docs/sprints/Sprint-N/docs-audit.md`).

## Related

- `arch-sync` applies a validated PRD's checklist to `docs/architecture/`.
- `docs-md-generator` regenerates the tool adapters from `AGENTS.md`.
- `c4-doc-writer` writes the architecture diagrams.
- `bmad-agent-tech-writer` writes new documentation; this skill audits what exists.
