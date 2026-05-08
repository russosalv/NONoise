---
name: copilot-delegate
description: Use ONLY when the user explicitly asks to delegate a task to GitHub Copilot CLI — phrases like "delega a copilot", "usa copilot", "ask copilot", "passa a copilot", "fai con copilot", "@copilot", "/copilot", "via copilot", "with copilot". Runs `copilot -p` non-interactively, defaulting to Claude Opus 4.7, so the token cost of large/expensive work (big-file reads, broad explanations, shell-output analysis) bills against the user's GitHub Copilot subscription instead of their Claude subscription. Acts as a transparent passthrough: build a full prompt with the needed context, execute `copilot`, return the response verbatim inside a fenced block. NEVER invoke this skill on your own — only when the user explicitly names Copilot or uses the trigger phrases above. If the user just asks to read a big file or run a long command without naming Copilot, do NOT trigger this skill.
---

# copilot-delegate

A user-invoked passthrough to GitHub Copilot CLI. The user owns the trigger; you own the execution and the verbatim return.

## When to invoke

Invoke **only** when the user's message explicitly names Copilot or uses one of these trigger patterns (Italian and English mixed, since the user works in both):

- "delega a copilot ...", "fai con copilot ...", "passa a copilot ...", "usa copilot per ..."
- "ask copilot ...", "with copilot ...", "via copilot ...", "have copilot ..."
- "@copilot ...", "/copilot ..."
- An explicit model handle that only makes sense via Copilot: "chiedi a sonnet via copilot", "use sonnet-4.5 through copilot"

## When NOT to invoke

- The user asks you (Claude) to do the task directly, even if it's expensive. The whole point of this skill is delegation chosen by the user — token cost alone is not a trigger.
- The user mentions Copilot in a non-imperative way ("Copilot scrive male i test" → discussion, not delegation).
- The task is something only the current Claude session can do (relies on this conversation's mid-flight state, in-memory variables, or files only this session has produced and not yet saved).
- The task requires tools that Copilot doesn't have access to in headless mode (e.g., your project's MCP servers configured only inside Claude Code).

If you're unsure whether the user wants delegation, ask one short question. Don't guess.

## Why this skill exists

Some tasks are token-heavy on the input side: scanning long log files, summarizing big documents, broad codebase Q&A, explaining shell output. Running them through Claude burns the user's Claude subscription. The same Claude family (Opus 4.7, Sonnet 4.6/4.5/4, Haiku 4.5) plus GPT and Gemini are all reachable via GitHub Copilot CLI, where the cost lands on the Copilot subscription instead. This skill is the user's "send this elsewhere" lever.

## Available models

`copilot --model <name>` — confirmed working on this machine. Model name format uses **dots** (`claude-opus-4.7`), not dashes. The "cost" column is the GitHub Copilot premium-request multiplier the user pays per call.

| Shortcut    | `--model` value           | Cost   | Notes                                              |
|-------------|---------------------------|--------|----------------------------------------------------|
| (none)      | `claude-opus-4.7`         | 7.5x   | **Default.** Most capable Claude. Use sparingly — expensive on the Copilot quota. |
| `opus`      | `claude-opus-4.7`         | 7.5x   | Same as default.                                   |
| `sonnet`    | `claude-sonnet-4.6`       | 1x     | Best price/perf Claude. Good first choice if Opus is overkill. |
| `sonnet45`  | `claude-sonnet-4.5`       | 1x     |                                                    |
| `sonnet4`   | `claude-sonnet-4`         | 1x     |                                                    |
| `haiku`     | `claude-haiku-4.5`        | 0.33x  | Cheapest/fastest Claude. Good for simple delegations. |
| `gpt`       | `gpt-5.4`                 | 1x     | Copilot CLI's own default.                         |
| `gpt55`     | `gpt-5.5`                 | 7.5x   | Most capable GPT. Same cost tier as Opus 4.7.      |
| `gpt52`     | `gpt-5.2`                 | 1x     |                                                    |
| `gpt-mini`  | `gpt-5.4-mini`            | 0.33x  | Cheap fast GPT.                                    |
| `gpt5-mini` | `gpt-5-mini`              | 0x     | Free tier.                                         |
| `gpt41`     | `gpt-4.1`                 | 0x     | Free tier.                                         |
| `codex`     | `gpt-5.3-codex`           | 1x     | Code-tuned GPT.                                    |
| `codex2`    | `gpt-5.2-codex`           | 1x     | Older code-tuned GPT.                              |

**Cost-aware delegation:** if the user delegates a simple/cheap task with no model preference, prefer `sonnet` (1x) or `haiku` (0.33x) instead of the 7.5x default — and tell them you did. The whole point is saving on the Claude side without burning the Copilot quota unnecessarily. If they ask for "the best" or for Opus explicitly, use `claude-opus-4.7` without second-guessing.

If the user names a model not in the table, pass the exact string they gave to `--model`. If Copilot rejects it, surface the error verbatim and stop.

## How to run it

On Windows the `copilot` shim sits behind a path with spaces (`Code - Insiders`), and the bash wrapper mishandles `-p` arguments. Use the **PowerShell** tool on Windows; use Bash on macOS/Linux. Always pass the prompt via a here-string so newlines, quotes, and `$` survive.

### Windows (PowerShell)

```powershell
$prompt = @'
<full prompt text — see "Building the prompt" below>
'@
copilot --model claude-opus-4.7 -p $prompt --allow-all-tools --allow-all-paths --log-level none
```

The closing `'@` MUST be at column 0. Single-quoted (`@'...'@`) so PowerShell doesn't expand `$` inside the prompt.

### macOS / Linux (Bash)

```bash
copilot --model claude-opus-4.7 \
  --allow-all-tools --allow-all-paths --log-level none \
  -p "$(cat <<'EOF'
<full prompt text>
EOF
)"
```

### Required flags (always include)

- `--allow-all-tools` — required for non-interactive `-p` mode.
- `--allow-all-paths` — let Copilot read whatever files the prompt references.
- `--log-level none` — suppress noise; you want only the model's response.

### Optional flags (use when relevant)

- `--add-dir <path>` — narrow file access to one directory instead of `--allow-all-paths`. Use when the user wants to scope the delegation tightly.
- `--effort high` — if the user asks for a thorough analysis. Default reasoning effort is fine for most things.
- `--allow-all-urls` — only if the task explicitly requires web fetching.

## Building the prompt

You are constructing a single self-contained prompt for a fresh Copilot session that has none of this conversation's context. Treat it like briefing a smart colleague who just walked in.

Include:

1. **The task itself** — exactly what the user asked, in clear terms.
2. **The context Copilot needs** — file paths it should read (Copilot can read files itself if you give absolute paths and `--allow-all-paths` is set), relevant constraints from this conversation, the format of the expected answer.
3. **Output expectations** — if the user wants a list, ask for a list. If they want code, ask for code. If they want a one-line answer, say so. Copilot has no idea what "concise" means in your shared context.

Do not paste huge file contents into the prompt — point to the path and let Copilot read it. That's the whole point: keep tokens off the Claude side.

## Returning the response

Return the response **verbatim**, wrapped in this exact block. No prose before or after, no editorializing, no "Copilot says:" preamble.

```
---
copilot-model: <the model you used>
prompt: <one-line summary of what you asked, ≤120 chars>
---
<response from copilot, byte-for-byte>
```

Trim only:
- The trailing `Changes / Requests / Tokens` summary block that Copilot CLI prints after the response (it's CLI metadata, not part of the answer).
- ANSI color escape sequences if present.

Do **not** rewrite, summarize, translate, or "fix" Copilot's response. The user explicitly chose to delegate; they want the other model's answer, not your interpretation of it.

If Copilot returns an error, surface the error verbatim in the response slot and stop — don't retry silently or fall back to doing the task yourself.

## Examples

### Example 1 — file analysis delegation

User: "delega a copilot l'analisi di D:\DEV\newBookingMan\backend\logs\app.log e dimmi quanti errori ci sono per tipo"

You build:

```powershell
$prompt = @'
Read the file at D:\DEV\newBookingMan\backend\logs\app.log and count errors grouped by type (e.g., DB error, validation error, timeout). Return a markdown table sorted by count descending. If the file is too large, sample the last 50k lines and note that you sampled.
'@
copilot --model claude-opus-4.7 -p $prompt --allow-all-tools --allow-all-paths --log-level none
```

Then return:

```
---
copilot-model: claude-opus-4.7
prompt: Count errors by type in app.log, return markdown table sorted desc.
---
<verbatim copilot output>
```

### Example 2 — explicit model choice

User: "ask copilot with haiku: spiegami la differenza tra BullMQ e RabbitMQ in 5 righe"

You use `--model claude-haiku-4.5` (the `haiku` shortcut), build a short prompt, run, return verbatim.

### Example 3 — refused delegation

User: "delega a copilot la lettura di quella variabile in memoria che abbiamo creato prima"

You decline (politely): Copilot has no access to this session's in-memory state. Ask the user whether to write it to disk first or do the read locally.

## Passing skills to Copilot

Copilot CLI can load and execute skills too — both its own skills and the ones in this repo (e.g. `.claude/skills/*/SKILL.md`). When the user asks to delegate a task that involves a specific skill, **always reference the skill by its full absolute path** in the prompt, not by name alone. Copilot's skill discovery may differ from Claude's, and a bare name (`use the foo skill`) can resolve to nothing or to the wrong skill.

Good:

```
Apply the skill defined at D:\DEV\newBookingMan\.claude\skills\foo-bar\SKILL.md to the file D:\DEV\newBookingMan\src\baz.ts. Follow that skill's instructions exactly.
```

Bad:

```
Use the foo-bar skill on src/baz.ts.
```

If the skill itself references other files (templates, helper scripts), include their absolute paths too, or tell Copilot the skill's directory so it can resolve siblings.

## Edge cases

- **Prompt contains backticks or `'@` patterns**: switch to a temp file. Write the prompt to `$env:TEMP\copilot-prompt.txt` (or `/tmp/copilot-prompt.txt`), then `copilot ... -p (Get-Content -Raw $env:TEMP\copilot-prompt.txt)`. Delete the temp file after.
- **Long-running delegation**: pass `timeout` ~600000ms (10 min) to the shell tool. If Copilot hangs longer, kill and report.
- **User asks for a model not in the table**: pass the literal string they gave. If Copilot errors out, return the error verbatim — don't substitute a different model without asking.
- **User asks "Opus" specifically**: use `claude-opus-4.7` (it's the default anyway). Note that it costs 7.5x premium requests — if the task is trivial, suggest `sonnet` (1x) before launching.
- **Stale credentials / not logged in**: Copilot will print an auth error. Surface it verbatim and tell the user to run `copilot` once interactively to authenticate.
