# Regia — orchestration in Claude Code

[Regia](https://github.com/russosalv/claude-regia) ("direction", as in film directing) is a Claude Code mod. It makes the main session coordinate instead of doing all the work itself, gives each task the model and effort it needs, and runs swarms of Claude, Codex, Qwen Code and Copilot agents, watched from a live pane beside the chat.

Since 1.9 NONoise installs Regia for Claude Code and treats it as the framework's orchestration layer. This page covers how the two fit together. The full reference — every command, tool, config key and known limit — is the [Regia README](https://github.com/russosalv/claude-regia).

## Why Regia is the orchestration layer

NONoise decides *what* comes next: the SDLC flow, the phases, the skill for each phase, the mode a task deserves. It does not manage how a session spends its agents. Until 1.9 that part was covered by hand-over skills (`swarm-router` and the `*-delegate` skills): Markdown instructions the model had to remember to follow.

Regia does the same job as a mod. Its rule travels in the system prompt, a hook reads every subagent call, and the plan, the questions and the swarm boards are kept outside the conversation. NONoise and Regia already shared the same three modes, so in 1.9 the hand-over skills were retired and Regia took their place.

## How NONoise installs it

Regia is installed when Claude Code is among the selected tools, in every profile except `minimal` (which installs no vendor runtimes). The plugin is `regia@claude-regia`, from the marketplace `russosalv/claude-regia`.

| Vendor mode | What `create-nonoise` does |
|---|---|
| **native** (default) | Runs `claude plugin marketplace add russosalv/claude-regia` and `claude plugin install regia@claude-regia --scope project`, and declares the marketplace and the plugin in `.claude/settings.json` so teammates get it too. |
| **embed** | Stays offline: only declares the marketplace and the plugin in `.claude/settings.json`. Claude Code offers the installation the first time the project is trusted. |

`--upgrade` does the same on an existing project. In native mode `create-nonoise doctor` reports `regia@claude-regia` as installed or missing, with the two commands above as the fix.

Regia is not pinned. Like any Claude Code plugin it updates through its own marketplace, independently of the NONoise version.

Restart the session after the installation, then run `/regia doctor`. On its first interactive session Regia installs, if they are missing, [Ponytail](https://github.com/DietrichGebert/ponytail) (always), the Codex plugin `codex@openai-codex` (only if the `codex` CLI is on the machine) and a Qwen Code plugin (only if the `qwen` CLI is on the machine). NONoise used to install the Codex plugin itself and no longer does. `/regia codex off`, `/regia qwen off` and `/regia ponytail off` opt out.

## The three modes

NONoise's [development modes](development-modes.md) and Regia's modes are the same three, one to one.

| NONoise mode | Regia command | What the main session does |
|---|---|---|
| **quick** | `/regia quick [goal]` | Works alone, with no subagents and no plan, on a smaller model (`sonnet` by default). |
| **medium** (default) | `/regia medium [goal]` | Works itself and delegates the independent pieces and the broad searches. |
| **long** | `/regia long [goal]` | Orchestrates and acts on your behalf. The plan in the list is mandatory, and surveillance and wake are on. |

When the project has a `.nonoise/sdlc-flow.md`, the rule of the current mode tells the main session to follow it. In long, the phases the file assigns to `long` go into the plan in that order, and each runs the skill the file names. In medium the work is short spec, plan, development, verification. In quick there are no phases and no documents. In every mode the formal FPF validation is proposed only when the [FPF gate](development-modes.md#the-fpf-gate) fires.

## How Polly hands over

Polly stays a one-shot advisor: she picks the mode and the phase, and writes the prompt. She does not orchestrate, and she does not call Regia's tools.

When Regia is active in the session, the example prompt in Polly's message starts with the matching Regia command. `/polly long <goal>` returns a prompt prefixed with `/regia long`; `/polly medium` and `/polly quick` do the same with their mode. Polly adds one line saying that Regia will hold the plan and the questions. You paste the prompt, and the mode is chosen once for both.

When Regia is not active — the plugin is not loaded yet, or the tool is not Claude Code — Polly hands over the plain prompt. Its first words already state the mode, so it works as it is.

## What Regia adds

- **Model and effort per task.** For each subagent call a quick check reads the task and picks the model (`haiku`, `sonnet`, `opus`) and the effort (`low`, `medium`, `high`). What the call or the agent's own file states is never overridden. A failed task retries one step higher.
- **Swarms.** `sciame_avvia` runs Claude, Codex, Qwen Code and Copilot agents on a board with dependencies and a parallelism limit. Each task that writes gets its own git worktree and branch; agents can write to each other. `/regia swarm` shows the boards.
- **The plan as a task list.** `scaletta_scrivi` records each item with a description and a phase; finished items fold away.
- **Questions with their context.** `domanda_scrivi` records a decision that is yours with where things stand, the options and a recommendation. After `/regia away` it reaches you as a notification; `/regia here` turns notifications off.
- **Surveillance and wake.** Stuck agents are detected. In long mode a session left alone is woken while the plan still has open items.
- **A live pane.** `/regia` opens a pane beside the chat with the questions, the plan and the running, queued and finished agents, each with model, effort, duration and tokens.
- **`/regia doctor`.** What is active right now: mode, version, Ponytail, Codex, Qwen, config.

## What it replaces in NONoise

| Retired skill | Now |
|---|---|
| `swarm-router` | Regia's per-task model and effort, and its swarms (`sciame_avvia`, `/regia swarm`). |
| `codex-delegate` (retired in 1.7) | Codex as a swarm executor or a Codex job started by Regia. The Codex plugin `codex@openai-codex` is installed by Regia when the `codex` CLI is present. |
| `copilot-delegate` | Copilot as a Regia executor: delegation to Copilot CLI exists again, through Regia, from Regia 0.14.0 (`copilot_avvia`, `copilot_riprendi`, and `esecutore: "copilot"` in a swarm). |
| `gemini-delegate` | No replacement: Regia does not delegate to Gemini CLI. |

These skills are no longer shipped. `create-nonoise --upgrade` removes pristine copies from `.claude/skills/` and `.agents/skills/` and keeps edited ones, which it lists. A profile-less 1.6/1.7 project keeps every previous file until an explicit `--profile` opts into the cleanup.

## Limits

- **Claude Code only.** Regia is a Claude Code mod. Codex, Copilot, Cursor and Gemini CLI get no orchestration from NONoise: they get the `development-modes` table in their context file and use their own subagent features.
- **Executors are Claude, Codex, Qwen Code and Copilot.** Delegation to Copilot CLI exists again, through Regia and therefore from Claude Code only, from Regia 0.14.0. The Copilot executor was built against the Copilot CLI documentation and tested with a stand-in CLI; it has not yet been run against a real `copilot`. There is no delegation to Gemini CLI: `swarm-router` could send UI work to Gemini, Regia does not. Regia's automatic choice is among Claude models and effort levels; Codex, Qwen Code and Copilot run the tasks that name them as executor.
- **Codex, Qwen Code and Copilot are optional.** Each needs its own CLI on the machine (`codex`, `qwen`, `copilot`). Without a CLI Regia runs without that executor. Regia installs a companion Claude Code plugin for Codex and for Qwen Code; Copilot has none and needs only the CLI.
- **It needs an interactive session.** The delegation rule and the wake do not apply to `claude -p` or the SDK.
- **Not pinned.** Regia's behaviour follows Regia's releases, not the NONoise version.
- **Partly in Italian.** The commands and the README are in English; the pane, the tool names and parameters, the config keys and the messages are still in Italian.

## Related

- [Regia README](https://github.com/russosalv/claude-regia) — the full reference.
- [`development-modes.md`](development-modes.md) — quick / medium / long and the FPF gate.
- [`polly.md`](polly.md) — the advisor that picks the mode and writes the prompt.
- [`agents.md`](agents.md) — the agents NONoise installs and when the flow calls them.
- [`cross-tool.md`](cross-tool.md) — what each tool supports.
- [`installation.md`](installation.md) — native and embed vendor modes, `doctor`.
