---
name: gemini-delegate
description: Use ONLY when the user explicitly asks Claude to delegate, hand over, pass, or send work to Gemini CLI — phrases like "delega a gemini", "usa gemini", "passa a gemini", "fai con gemini", "ask gemini", "@gemini", "/gemini", "via gemini", "with gemini". Runs `gemini -p` non-interactively and returns Gemini's answer verbatim. The point is to offload token-heavy work (long file analysis, broad codebase Q&A, big log summaries) to the user's Gemini account quota instead of the Claude subscription. NEVER invoke this skill unless the user explicitly names Gemini or Gemini CLI as the delegate.
allowed-tools: Bash(gemini:*)
---

# gemini-delegate

User-invoked passthrough from Claude to Gemini CLI. The user owns the trigger; Claude owns the briefing, execution, and verbatim return.

## When to invoke

Invoke **only** when the user's message explicitly names Gemini or Gemini CLI as the delegate, for example:

- "delega a gemini ...", "passa a gemini ...", "usa gemini per ...", "fai fare a gemini ..."
- "handover a gemini ...", "hand off to gemini ...", "send this to gemini ..."
- "ask gemini ...", "with gemini ...", "via gemini ..."
- "@gemini ...", "/gemini ..."
- "usa gemini cli ...", "fallo con gemini cli ..."
- Explicit model handle that only makes sense via Gemini: "chiedi a gemini-2.5-pro", "use flash through gemini"

## When NOT to invoke

- The user asks Claude to do the task directly and does not explicitly request Gemini.
- The user mentions Gemini in discussion, not as an instruction to delegate.
- The task depends on Claude's unsaved in-memory state. Save the needed context to disk first or ask one short clarification.
- The task requires Claude-only tools, MCP servers, or session state that Gemini CLI cannot access.

If intent is ambiguous, ask one short question. Do not guess.

## Why this skill exists

Some tasks are token-heavy on the input side: scanning long log files, summarizing big documents, broad codebase Q&A, explaining shell output. Running them through Claude burns the user's Claude subscription. Gemini CLI bills against the user's Google AI / Gemini quota (generous free tier on personal accounts), so this skill is the user's "send this elsewhere" lever when they want to save Claude tokens.

## Available models

`gemini --model <name>` — pass the exact Gemini model string. If the user does not specify a model, omit `-m` and let the CLI use its default.

| Shortcut    | `--model` value           | Notes                                                              |
|-------------|---------------------------|--------------------------------------------------------------------|
| (none)      | *(CLI default)*           | Whatever Gemini CLI ships as default (typically a Pro tier).       |
| `pro`       | `gemini-2.5-pro`          | Most capable 2.5 Gemini. Good for analysis and codebase Q&A.        |
| `flash`     | `gemini-2.5-flash`        | Fast/cheap. Good first choice for simple delegations.              |
| `flash-lite`| `gemini-2.5-flash-lite`   | Cheapest/fastest. Trivial summaries, classification.               |
| `pro3`      | `gemini-3-pro`            | Latest Pro tier (if available on this account).                    |
| `flash3`    | `gemini-3-flash`          | Latest Flash tier (if available on this account).                  |

**Cost-aware delegation:** if the user delegates a simple/cheap task with no model preference, prefer `flash` over the default Pro tier — and tell them you did. If they ask for "the best" or name a Pro/3 tier explicitly, use that string without second-guessing.

If the user names a model not in the table, pass the exact string they gave to `-m`. If Gemini rejects it, surface the error verbatim and stop.

## How to run it

Use `gemini -p` in non-interactive (headless) mode. Prefer stdin for the prompt so newlines, quotes, backticks, and `$` survive intact. The prompt passed via `-p` is appended to whatever arrives on stdin, so the heredoc pattern below works cleanly.

### macOS / Linux (Bash)

```bash
gemini \
  --approval-mode plan \
  --output-format text \
  --skip-trust \
  -p "$(cat <<'EOF'
<full prompt text>
EOF
)"
```

### Windows (PowerShell)

```powershell
$prompt = @'
<full prompt text — see "Building the prompt" below>
'@
gemini --approval-mode plan --output-format text --skip-trust -p $prompt
```

The closing `'@` MUST be at column 0. Single-quoted (`@'...'@`) so PowerShell doesn't expand `$` inside the prompt.

### Approval mode (choose per task)

`--approval-mode` controls what Gemini may do without prompting. Pick the most restrictive mode that fits the task:

| Mode         | What it allows                                | Use when                                    |
|--------------|-----------------------------------------------|---------------------------------------------|
| `plan`       | Read-only. No edits, no shell side-effects.   | Analysis, Q&A, summaries (DEFAULT here).    |
| `auto_edit`  | Auto-approves edit tools.                     | User asked Gemini to modify files.          |
| `yolo`       | Auto-approves everything (incl. shell).       | Only if user explicitly accepts the risk.   |
| `default`    | Prompts for each action — hangs in headless.  | Never use with `-p`.                        |

Never pass `-y / --yolo` or `--approval-mode yolo` unless the user explicitly opts in.

### Other useful flags

- `-m, --model <name>` — when the user names a Gemini model. Pass the exact string.
- `--include-directories <path>` — add extra workspace directories Gemini can read. Use when context lives outside the current repo.
- `--skip-trust` — trust the current workspace for this session (avoids the trust prompt in headless mode).
- `-o, --output-format json` — only if the user explicitly wants structured JSON.
- `-e, --extensions <name>` — pin which Gemini CLI extensions are loaded for this run.
- `-s, --sandbox` — run the session inside Gemini's Docker sandbox. Use for untrusted code execution.

## Building the prompt

Create a self-contained prompt for a fresh Gemini session that has none of this conversation's context. Treat it like briefing a smart colleague who just walked in.

Include:

1. **Task** — exactly what the user asked, in clear terms.
2. **Context** — repo path, absolute file paths Gemini should read, relevant constraints from this conversation, and whether edits are allowed.
3. **Output contract** — exact answer format (list, table, code, one-liner). Gemini has no idea what "concise" means in your shared context.

Do not paste huge file contents into the prompt. Give absolute paths and tell Gemini what to inspect — that keeps Claude-side tokens low and lets Gemini read the file itself. If the path is outside the current working directory, add it via `--include-directories`.

If a skill should guide Gemini, reference it by full absolute path:

```text
Apply the skill at /absolute/path/to/SKILL.md. Resolve sibling files relative to that skill directory.
```

Gemini's skill discovery differs from Claude's, so a bare name (`use the foo skill`) can resolve to nothing or to the wrong skill.

## Returning the response

Return Gemini's answer **verbatim**, wrapped exactly like this. No prose before or after, no editorializing, no "Gemini says:" preamble.

```text
---
gemini-model: <model if specified, otherwise "default">
prompt: <one-line summary of what Claude asked, <=120 chars>
---
<verbatim final answer printed by gemini -p>
```

Trim only:
- Any CLI metadata / token-usage footer Gemini prints after the response.
- ANSI color escape sequences if present.

Do **not** rewrite, summarize, translate, or "fix" Gemini's response. The user explicitly chose to delegate; they want the other model's answer, not Claude's interpretation of it.

If Gemini returns an error, surface the error verbatim in the response slot and stop — don't retry silently, don't broaden permissions, and don't fall back to doing the task yourself.

## Examples

### Example 1 — file analysis delegation

User: "delega a gemini l'analisi di /path/to/project/backend/logs/app.log e dimmi quanti errori ci sono per tipo"

You build:

```bash
gemini --approval-mode plan --output-format text --skip-trust -p "$(cat <<'EOF'
Read the file at /path/to/project/backend/logs/app.log and count errors grouped by type (e.g., DB error, validation error, timeout). Return a markdown table sorted by count descending. If the file is too large, sample the last 50k lines and note that you sampled.
EOF
)"
```

Then return:

```text
---
gemini-model: default
prompt: Count errors by type in app.log, return markdown table sorted desc.
---
<verbatim gemini output>
```

### Example 2 — explicit model choice

User: "ask gemini with flash: spiegami la differenza tra BullMQ e RabbitMQ in 5 righe"

You use `-m gemini-2.5-flash` (the `flash` shortcut), build a short prompt, run with `--approval-mode plan`, return verbatim.

### Example 3 — implementation handoff

User: "handover a gemini: sistema i test frontend falliti"

Prompt:

```text
In /path/to/project, run the relevant frontend tests, identify the failures, and make the smallest code changes needed to fix them. Respect existing worktree changes and do not revert user edits. Report changed files and verification commands.
```

Use `--approval-mode auto_edit` for this case (Gemini needs to write files).

### Example 4 — refused delegation

User: "delega a gemini la lettura di quella variabile in memoria che abbiamo creato prima"

You decline (politely): Gemini has no access to this session's in-memory state. Ask the user whether to write it to disk first or do the read locally.

## Edge cases

- **Prompt contains `EOF`**: use a different heredoc delimiter such as `GEMINI_PROMPT`.
- **Prompt contains backticks or `'@` patterns on Windows**: switch to a temp file. Write the prompt to `$env:TEMP\gemini-prompt.txt` (or `/tmp/gemini-prompt.txt`), then read it with `Get-Content -Raw` / `cat` and pipe into `gemini -p` via stdin. Delete the temp file after.
- **Long-running delegation**: pass `timeout` ~600000ms (10 min) to the shell tool. If Gemini hangs longer, kill and report.
- **User asks for a model not in the table**: pass the literal string they gave. If Gemini errors out, return the error verbatim — don't substitute a different model without asking.
- **Stale credentials / not logged in**: Gemini will print an auth error. Surface it verbatim and tell the user to run `gemini` once interactively to authenticate.
- **Trust prompt blocks the session**: include `--skip-trust` on every headless run, otherwise Gemini hangs waiting for workspace trust confirmation.
- **Free-tier rate limit hit**: surface the rate-limit error verbatim; suggest waiting or switching to a `flash` model (cheaper quota).
