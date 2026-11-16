# Managed blocks — protocol

Managed blocks are the mechanism skills use to own a slice of
`CLAUDE.md` / `.github/copilot-instructions.md` / `AGENTS.md` without
stepping on each other. Each block is delimited by two HTML comments,
one to open and one to close:

```markdown
<!-- >>> <marker> (managed by <skill-name> skill) -->
## <human-readable heading>

...body owned by the skill...
<!-- <<< <marker> -->
```

- `<marker>` is a short lowercase slug (`polly`, `codebase-memory`,
  `development-modes`, `design-md`, ...).
- `(managed by <skill-name> skill)` is informational for humans — the
  parser does not depend on it. When emitting a new block, include it
  for clarity.
- Closing marker reuses the same `<marker>` slug inside the
  `<!-- <<< ... -->` comment.

## Known markers in the NONoise framework

| Marker | Owning skill | Typical body |
|---|---|---|
| `polly` | `polly` | Polly advisor invocation block — trigger phrases (`/polly`, "start polly", "avvia polly", ...) and a pointer to `.nonoise/sdlc-flow.md`. |
| `codebase-memory` | `create-nonoise` CLI | Code-graph rules for the `codebase-memory-mcp` MCP server: call `get_architecture` and `search_graph` before grep, `trace_path` and `detect_changes` for call chains and change impact, `index_repository` once, and the `codebase-memory-mcp cli <tool>` fallback. Marker comment: `<!-- >>> codebase-memory (managed by create-nonoise) -->`. |
| `development-modes` | `create-nonoise` CLI | The quick / medium / long table (fit, phases, documents, delegation, FPF validation) and its rules: never run a heavier mode than the work needs, the FPF gate, Regia. Marker comment: `<!-- >>> development-modes (managed by create-nonoise) -->`. |
| `design-md` | `design-md-generator` | Pointer telling AI code-generators to read `docs/design.md` before producing UI code. |

This list is authoritative as of the current framework version. New
skills may introduce new markers — see the extension rule below.

Migration note: `codebase-memory` replaced the `graphify` block in NONoise 1.9; a leftover `graphify` block in an older project is an orphan (see the orphan-marker policy below).

## Parsing regex

Use this pattern to locate managed blocks (multiline, not greedy):

```
<!--\s*>>>\s*([a-z0-9][a-z0-9-]*)\b[^>]*-->([\s\S]*?)<!--\s*<<<\s*\1\s*-->
```

Capture groups:
1. The marker slug.
2. The block body (including the human-readable heading). Preserve
   this byte-for-byte when rewriting the host file.

Rules when parsing:

- A block must be closed. An unclosed open marker means the file is
  corrupted — abort the write and surface the issue to the user.
- Blocks may not nest. If an open marker appears inside another block,
  treat the file as corrupted.
- Whitespace around the marker (inside the comment) is tolerated. The
  regex above allows for variations like `<!-- >>>polly-->` and
  `<!--   >>>   polly   (managed by polly skill)   -->`.

## Extension rule — how a new skill claims a marker

A skill that wants its own managed block MUST:

1. Choose a slug that does not collide with existing markers. Check
   this file first; update the known-markers table in the PR that
   introduces the skill.
2. Always emit both the open and close comment. Never produce content
   that would leave a dangling `>>>` or `<<<`.
3. Be idempotent on re-run. Running the owning skill twice in a row
   must produce the same managed block bytes.
4. Document in the skill's own SKILL.md which file(s) it writes a
   managed block into.

## Orphan-marker policy

An orphan marker is a well-formed managed block whose slug is NOT in
the known-markers table. Causes:

- A skill that was installed in the past and then removed, but the
  managed block was not cleaned up.
- A new skill that extended the protocol faster than this reference
  was updated.
- A user who hand-authored a marker using the same pattern.

Policy for `docs-md-generator`:

- **Preserve the block verbatim.** Do not delete it, do not rewrite
  it. It may still be meaningful to a user or a process.
- **Flag it in the summary.** Tell the user: "I found managed block
  `<marker>` in `<file>`. No installed skill claims it. I kept it
  intact. Remove it manually if it is obsolete, or add it to the
  known-markers table if a skill owns it."
- **Never propagate an orphan from a tool-specific file into
  `AGENTS.md`.** Managed blocks belong in the files they are in. If
  the user wants the orphan content elsewhere, that is a manual
  decision.

## Interaction with `AGENTS.md`

`AGENTS.md` may also contain managed blocks (at minimum the
`codebase-memory` and `development-modes` blocks live there too). The
same rules apply: preserve verbatim, do not invent new ones from this
skill.

This skill only writes managed blocks that already exist in the
source file. It does not create `polly`, `codebase-memory` or
`development-modes` blocks from scratch — those are the
responsibility of `polly` and the `create-nonoise` CLI. If the user's `AGENTS.md` lacks a block that
their tool file clearly needs, tell the user to scaffold the project
with `create-nonoise` or run the relevant skill (e.g. `polly`) before
re-running this one.
