---
name: docs-md-generator
description: Generate and keep in sync the three meta-docs of a NONoise project — `AGENTS.md` (root, cross-tool, source of truth), `CLAUDE.md` (root, Claude Code adapter), and `.github/copilot-instructions.md` (Copilot adapter). Treats `AGENTS.md` as the single source of truth and preserves skill-owned managed blocks verbatim. Use whenever the user says "generate CLAUDE.md", "generate AGENTS.md", "generate copilot-instructions.md", "sync the meta-docs", "the docs are out of date", "AGENTS.md changed — regenerate the others", "bootstrap docs from scratch", "import this project into NONoise conventions", "reconcile CLAUDE.md and AGENTS.md", or when they start from an existing codebase and want NONoise-style meta-docs produced consistently. Trigger proactively when the user edits `AGENTS.md` and asks for "the others to match", or when the three files visibly disagree.
---

# docs-md-generator

Keep the three AI-context meta-docs of a NONoise project coherent:

- `AGENTS.md` (root) — **source of truth**, cross-tool, tool-agnostic.
- `CLAUDE.md` (root) — Claude Code adapter, derived from `AGENTS.md`.
- `.github/copilot-instructions.md` — GitHub Copilot adapter, derived from `AGENTS.md`.

This skill **writes and reconciles** those three files. It never writes
source code, never touches templates under `packages/templates/`, and
never touches tests.

## Source of truth — `AGENTS.md`

The contract is simple: if the three files disagree about a project-level
rule, `AGENTS.md` wins. The tool-specific files may add tool-specific
prose (slash commands, tool-specific triggers) but they must not
contradict `AGENTS.md` on anything cross-tool — project structure,
build/test commands, conventions, installed skills list.

Consequence: when `AGENTS.md` changes, the other two must be regenerated.
When the other two drift from `AGENTS.md`, they must be reconciled.

## Three modes

This skill has three operating modes. Pick one by looking at what exists:

| State on disk | Mode | What to do |
|---|---|---|
| Only `AGENTS.md` exists | **Bootstrap** | Generate `CLAUDE.md` and `.github/copilot-instructions.md` from `AGENTS.md`. |
| All three exist but differ | **Import** | Reconcile all three into a coherent triad with `AGENTS.md` as source of truth. |
| All three exist, consistent, but `AGENTS.md` was just edited | **Sync** | Regenerate the tool-specific files from `AGENTS.md`, preserving managed blocks. |

If nothing exists, ask the user whether the project was meant to be
NONoise-scaffolded. If yes, point them at `create-nonoise`. This skill
does not scaffold from zero — it maintains an existing `AGENTS.md`.

See `references/mode-prompts.md` for the exact Q&A phrasing per mode
(EN + IT).

## Managed blocks — NEVER edit the inside

`CLAUDE.md` and `.github/copilot-instructions.md` contain **managed
blocks** owned by OTHER skills. A managed block looks like:

```markdown
<!-- >>> polly (managed by polly skill) -->
## polly
...body written by polly...
<!-- <<< polly -->
```

The rule is one line long: **content inside `<!-- >>> name --> ... <!-- <<< name -->`
is owned by another skill. Preserve it verbatim.** Do not reformat, do
not re-wrap, do not "improve" prose inside a managed block. Copy the
bytes as-is from the old file into the new one.

Known markers in the NONoise framework today:

- `polly` — owned by the `polly` skill (entry-point reminder for Polly).
- `graphify` — owned by the `graphify-setup` skill (knowledge-graph rules).
- `design-md` — optional, owned by `design-md-generator` (pointer to
  `docs/design.md` for UI code generation).

If you encounter a marker not on this list, treat it as orphan: leave
the block alone, flag it in the summary ("Found unknown managed block
`foo` — left intact."). Other skills may introduce their own markers
over time; the pattern is designed to extend.

See `references/managed-blocks-protocol.md` for the parsing regex, the
extension rule, and the orphan-marker policy in detail.

## Mode 1 — Bootstrap

**State**: only `AGENTS.md` exists. Generate the other two.

Step by step:

1. **Inventory**. Read `AGENTS.md` in full. Note the project name (top
   H1), the stack mentions, the installed skills section (if any), the
   existing managed blocks (there will be at least `graphify` usually).
2. **Ask the minimum**. If the following are not already obvious from
   `AGENTS.md`, ask them one at a time (Polly-style — one question at a
   time, wait for an answer, move on):
   - Is this project using Claude Code, GitHub Copilot, or both? (Affects
     which of the two files to create. Default: both.)
   - Is Polly installed as the orchestrator? (Yes → add the Polly
     managed block in each tool file. Default: yes for NONoise projects.)
   - Language for the generated prose. (Follow the language already
     used in `AGENTS.md`. Default: English.)
3. **Emit `CLAUDE.md`** at project root if Claude Code is selected. Use
   the canonical structure from `references/output-templates.md`:
   title, intro line, Polly entry-point section (if Polly present),
   installed skills section (copied or rephrased from `AGENTS.md`),
   "Working in this project" conventions section, managed blocks area
   (copy `polly` block and `graphify` block from `AGENTS.md`
   equivalents, plus any other known markers present), footer.
4. **Emit `.github/copilot-instructions.md`** if Copilot is selected.
   Same content spine as `CLAUDE.md` but rephrased for Copilot (no
   slash-command references; instead, tell Copilot to read
   `.claude/skills/<name>/SKILL.md` when triggers match).
5. **Summarize**. Show the user: which files were written, byte counts,
   and any managed blocks carried over. Do not write without showing
   the summary first if either target file already existed (it
   shouldn't, in bootstrap mode — but double-check).

## Mode 2 — Import

**State**: all three files exist but drifted. Reconcile.

This is the longest mode. The project was probably built without
NONoise and the user now wants NONoise conventions applied.

Step by step:

1. **Read all three files** into memory. Record the set of H2 sections
   in each.
2. **Parse managed blocks** in `CLAUDE.md` and
   `.github/copilot-instructions.md`. Store them keyed by marker name.
   These are sacred — they will be re-emitted verbatim.
3. **Build a section-by-section diff**. For each H2 section that
   appears in at least one file, classify it:
   - **Only in `AGENTS.md`** → propagate to the other two.
   - **Only in a tool-specific file, and the section name is tool-neutral**
     (e.g. `## Build & test`, `## Project structure`) → propose moving
     the content into `AGENTS.md` as the new source of truth.
   - **Only in a tool-specific file, and the section name is
     tool-specific** (e.g. Claude slash commands, Copilot-specific
     hints) → leave as tool-specific; do not copy to `AGENTS.md`.
   - **In multiple files with different wording** → flag a conflict.
4. **Resolve conflicts one at a time**. For each flagged conflict, ask
   the user: "`AGENTS.md` says X, `CLAUDE.md` says Y — which wins?"
   Default answer is `AGENTS.md` wins. Record the decision.
5. **Rewrite all three** coherently:
   - `AGENTS.md` gets the agreed content, plus any tool-neutral
     sections lifted from the tool files.
   - `CLAUDE.md` and `.github/copilot-instructions.md` get the shared
     content (from `AGENTS.md`) + their managed blocks (verbatim) + any
     legitimately tool-specific sections they had before.
6. **Summarize aggressively**. List every section that was moved,
   every conflict that was resolved, every managed block that was
   preserved. Show the diff-size per file before asking for the
   go-ahead to write.

See `references/mode-prompts.md` for conflict-resolution Q&A templates.

## Mode 3 — Sync

**State**: `AGENTS.md` was edited, the other two are stale.

This mode is mostly silent — no questions unless something unrecognized
appears.

Step by step:

1. **Diff** `AGENTS.md` against `CLAUDE.md` and
   `.github/copilot-instructions.md` section-by-section.
2. **For each unchanged section**, skip.
3. **For each section in `AGENTS.md` that changed**, regenerate the
   corresponding section in each tool file, rewriting only the prose
   *outside* managed blocks.
4. **Preserve verbatim**:
   - All managed blocks (match by marker name).
   - All tool-specific sections that have no equivalent in `AGENTS.md`
     (Claude slash-command hints, Copilot `.github/instructions/*.md`
     pointers, etc.).
5. **Unrecognized new H2 in `AGENTS.md`**: ask the user one question —
   "AGENTS.md has a new section `## X` — should I mirror it verbatim
   into CLAUDE.md and copilot-instructions.md, or adapt it per tool?"
6. **Write** and show a short summary (N sections changed, M managed
   blocks preserved).

## Trigger detection — pick the mode automatically

When the skill is invoked, look at the filesystem and the user's message:

- If the user mentions "bootstrap", "new project", "from scratch", or
  only `AGENTS.md` exists → **Mode 1**.
- If the user mentions "import", "brownfield", "existing codebase",
  "reconcile", "fix the drift", or the three files exist with visible
  disagreements → **Mode 2**.
- If the user says "sync", "AGENTS.md changed", "update the others",
  or `AGENTS.md` has a newer mtime than the others → **Mode 3**.

If the mode is ambiguous, ask the user once: "I see all three files
exist. Do you want me to (a) reconcile them (Import mode — assumes
they may disagree), or (b) propagate recent AGENTS.md changes (Sync
mode — assumes they agreed until recently)?"

## Output format conventions

- **H2 structure**. Every first-level section in the generated files
  uses `##`. The file starts with a single `#` title and a one-line
  intro.
- **Skills list**. Group the installed skills by purpose (SDLC
  orchestrator, Requirements & discovery, Architecture & validation,
  Sprint & implementation, Brownfield, Ops & observability,
  Integrations, Generators, Utility). Keep the group headings in bold,
  list the skills inline with backticks.
- **Language**. Follow the language used in `AGENTS.md`. If `AGENTS.md`
  is in Italian, produce Italian prose; if English, English. Never mix.
- **Managed blocks area**. Place managed blocks at the bottom of the
  file, just before the footer. Order: `polly` first (if present),
  then `graphify`, then any other known markers, then orphans.
- **Footer**. If the file had `Generated by create-nonoise v{{frameworkVersion}}.`
  keep it as-is. Do not invent a version string.

See `references/output-templates.md` for the canonical skeletons of
all three files.

## Safety rules

- **Never destroy a managed block.** If you cannot parse the closing
  marker for an opened block, abort the write and ask the user to
  repair the file manually. Better to do nothing than to corrupt a
  skill-owned section.
- **Never overwrite without confirmation on a large diff.** Threshold:
  if more than 30% of the target file would change, present the diff
  summary and ask for explicit "go ahead" before writing.
- **Always show a summary before writing**, even on a small change.
  The user should never be surprised by what ended up on disk.
- **Idempotent**: running the skill twice in a row on an unchanged
  state must produce no diff. If your second run changes anything,
  something is wrong — investigate before committing.
- **No scope creep**. This skill does not touch `README.md`,
  `docs/**/*`, `GEMINI.md`, `.cursor/rules.md`, or any other file.
  Those belong to other skills or to the user. If the user asks for
  them, politely say this skill's scope is the AGENTS/CLAUDE/Copilot
  triad and route the rest elsewhere.
- **No Handlebars rendering.** This skill operates on rendered
  markdown files. The `{{projectName}}` and `{{frameworkVersion}}`
  placeholders are a scaffolding-time concern — if the user's files
  still contain them, flag it but do not try to re-render.

## References

- `references/managed-blocks-protocol.md` — full list of known
  markers, regex for parsing, extension rule, orphan policy.
- `references/mode-prompts.md` — verbatim Q&A prompts for each mode
  in English and Italian.
- `references/output-templates.md` — canonical skeletons of
  `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`.

## Out of scope (v1)

- Scaffolding the files from zero with no prior `AGENTS.md`. That's
  `create-nonoise`'s job.
- Rendering Handlebars templates. Handled at scaffold time.
- Maintaining `GEMINI.md`, `.cursor/rules.md`, `.codex/*`. Those are
  owned by other tool-specific adapters (possibly future skills).
- Non-interactive / CLI mode. Today this skill is conversational.
  Noted as backlog — a `--sync` flag invoked from a pre-commit hook
  would enable automation.
