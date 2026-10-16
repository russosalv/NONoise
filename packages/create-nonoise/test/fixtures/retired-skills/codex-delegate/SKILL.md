---
name: codex-delegate
description: Use ONLY when the user explicitly asks Claude to delegate, hand over, pass, or send work to Codex CLI - phrases like "delega a codex", "usa codex", "handover a codex", "passa a codex", "ask codex", "@codex", "/codex", "via codex", or "with codex". Runs `codex exec` non-interactively and returns Codex's final answer verbatim. NEVER invoke this skill unless the user explicitly names Codex or Codex CLI as the delegate.
allowed-tools: Bash(codex:*)
---

# codex-delegate

User-invoked passthrough from Claude to Codex CLI. The user owns the trigger; Claude owns the briefing, execution, and verbatim return.

## When to invoke

Invoke **only** when the user's message explicitly names Codex or Codex CLI as the delegate, for example:

- "delega a codex ...", "passa a codex ...", "usa codex per ...", "fai fare a codex ..."
- "handover a codex ...", "hand off to codex ...", "send this to codex ..."
- "ask codex ...", "with codex ...", "via codex ..."
- "@codex ...", "/codex ..."
- "usa codex cli ...", "fallo con codex cli ..."

## When NOT to invoke

- The user asks Claude to do the task directly and does not explicitly request Codex.
- The user mentions Codex in discussion, not as an instruction to delegate.
- The task depends on Claude's unsaved in-memory state. Save the needed context to disk first or ask one short clarification.
- The task requires Claude-only tools, MCP servers, or session state that Codex CLI cannot access.

If intent is ambiguous, ask one short question. Do not guess.

## How to run it

Use `codex exec` in non-interactive mode. Prefer stdin for the prompt so newlines, quotes, backticks, and `$` survive intact.

```bash
codex exec \
  --cd /path/to/project \
  --sandbox workspace-write \
  --ask-for-approval never \
  --color never \
  --output-last-message /dev/stdout \
  - <<'EOF'
<full prompt text>
EOF
```

Use the current repository root for `--cd` unless the user explicitly gives another workspace. `--ask-for-approval never` is deliberate for non-interactive execution: if Codex needs something outside its sandbox, it should fail and report that instead of hanging for approval.

### Optional flags

- `--model <name>` when the user names a Codex/OpenAI model. Pass the exact model string they requested.
- `--sandbox read-only` for analysis-only delegations where Codex must not edit files.
- `--sandbox danger-full-access` only if the user explicitly asks for unrestricted local execution and accepts the risk.
- `--search` only if the user explicitly asks Codex to use live web search.
- `--add-dir <path>` when the user wants Codex to access an additional local directory.
- `--ephemeral` when the user wants no Codex session saved.

## Building the prompt

Create a self-contained prompt for a fresh Codex session. Include:

1. **Task**: what the user wants Codex to do.
2. **Context**: repo path, relevant file paths, constraints from the conversation, and whether edits are allowed.
3. **Output contract**: exact answer format, whether to summarize or patch files, and what verification Codex should run.

Do not paste huge files into the prompt. Give absolute paths and tell Codex what to inspect. That keeps Claude-side tokens low and lets Codex use the local workspace directly.

If a skill should guide Codex, reference it by full absolute path:

```text
Apply the skill at /absolute/path/to/SKILL.md. Resolve sibling files relative to that skill directory.
```

## Returning the response

Return Codex's final answer **verbatim**, wrapped exactly like this:

```text
---
codex-model: <model if specified, otherwise default>
prompt: <one-line summary of what Claude asked, <=120 chars>
---
<verbatim final answer printed by codex exec>
```

Do not rewrite, translate, correct, summarize, or add commentary. The user asked for Codex's answer, not Claude's interpretation.

If `codex exec` fails, return the error text verbatim in the response slot and stop. Do not silently retry with broader permissions, and do not fall back to doing the delegated task locally unless the user asks.

## Examples

### Analysis delegation

User: "delega a codex l'analisi di backend/src/bookings e dimmi dove manca structureId"

Prompt:

```text
In /path/to/project, inspect backend/src/bookings for database queries that may miss tenant filtering by structureId. Do not edit files. Return findings as markdown bullets with file paths and line numbers.
```

Command:

```bash
codex exec --cd /path/to/project --sandbox read-only --ask-for-approval never --color never --output-last-message /dev/stdout - <<'EOF'
In /path/to/project, inspect backend/src/bookings for database queries that may miss tenant filtering by structureId. Do not edit files. Return findings as markdown bullets with file paths and line numbers.
EOF
```

### Implementation handoff

User: "handover a codex: sistema i test frontend falliti"

Prompt:

```text
In /path/to/project, run the relevant frontend tests, identify the failures, and make the smallest code changes needed to fix them. Respect existing worktree changes and do not revert user edits. Report changed files and verification commands.
```

Use `--sandbox workspace-write` for this case.

## Edge cases

- **Prompt contains `EOF`**: use a different heredoc delimiter such as `CODEX_PROMPT`.
- **Long-running task**: allow a long shell timeout. If Codex times out, return the timeout/error output.
- **Codex not authenticated**: return the auth error verbatim and tell the user to run `codex login` interactively.
- **Edits requested**: after Codex finishes, Claude may inspect `git diff` only to report changed files if needed, but must not alter Codex's result unless the user asks.
- **Dirty worktree**: tell Codex to preserve unrelated changes and not revert files it did not need to touch.
