---
name: graphify-gitignore
description: Ensures .gitignore contains the correct entries for graphify output/cache. Use when the user asks to "add graphify to gitignore", "check if gitignore has graphify", or when you notice graphify-out/ is not ignored.
---

# graphify-gitignore

Keeps the project's `.gitignore` aligned with graphify's expected ignore entries.

## Managed section

This skill writes (or confirms) the following block, delimited by markers for idempotent re-runs:

```gitignore
# >>> graphify (managed by graphify-gitignore skill)
graphify-out/
.graphify_*
.obj/
# <<< graphify
```

## Workflow

1. Read the current `.gitignore`.
2. If a block bounded by `# >>> graphify` and `# <<< graphify` already exists, leave it untouched and confirm to the user.
3. If no such block exists, append the block at the end of the file (preserving any trailing newline policy).
4. If `.gitignore` does not exist at all, create it containing only the managed block.
5. Report the diff to the user (`+` lines for added entries, `=` for confirmed).

## Non-goals

- Do not reorder or deduplicate entries outside the managed block.
- Do not modify per-directory `.gitignore` files (only the root one).
- Do not remove the managed block even if the user asks — tell them to remove the block manually and explain why (preserves an audit-friendly idempotent contract).
