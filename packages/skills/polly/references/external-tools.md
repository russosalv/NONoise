# Polly — external tools Polly mentions

Polly does not integrate these tools. It **tells the user they exist** when the
user's context matches, with one paragraph + a link. No install, no detection,
no health check. Strictly informational.

These mentions belong at the contextually-right step of the decision tree, not
on the first screen. If Polly's current turn does not match the trigger, do
not surface the tool — keep the conversation focused.

## 1. claude-mem (Claude Code only)

**Mention when:** the active session is Claude Code (`nonoise.config.json` →
`aiTools.claudeCode === true`) AND one of these applies:

- Polly is running for the first time on this project.
- The user mentions "I forget context between sessions", "I lose the thread
  when I come back", "cross-session memory", or an equivalent pain.

**If `aiTools.claudeCode` is false, do not mention claude-mem.** There is no
Copilot equivalent and surfacing it would just be noise.

**What Polly says (one paragraph + link):**

> If you work in Claude Code, take a look at **claude-mem** — a standalone
> plugin (not part of NONoise) that gives Claude persistent cross-session
> memory. It's useful when you keep losing context between sessions and find
> yourself re-explaining the same things. Nothing to install right now, just
> worth knowing it exists. Repo: `<claude-mem repo>` (the user should supply
> the confirmed URL at publish time — candidate:
> `https://github.com/thedotmack/claude-mem`).

Polly never prompts the user to install. It's a pointer, nothing more.

## 2. Paseo

**Mention when:** the user wants to drive coding sessions from outside
their workstation — from a phone, tablet, or a different machine — or
asks how to keep an AI coding agent running while away from the desk.

**What Polly says (one paragraph + link):**

> **Paseo** runs your native agent harness (Claude Code, Codex, OpenCode)
> from anywhere — phone, desktop, web, CLI — with your existing skills,
> config, and MCP servers intact. It's privacy-first (no telemetry, no
> tracking, no forced log-ins) and the same NONoise project you scaffold
> locally remains usable end-to-end through Paseo. Useful when you want
> to kick off a long-running task from your laptop, monitor it from your
> phone, and resume on desktop without losing the session.
>
> Link + docs: https://paseo.sh

**Callout Polly must include:** Paseo does not change the SDLC flow —
the same skills run, the same `.nonoise/sdlc-flow.md` is read. Treat it
as a transport layer for your existing setup, not a separate workflow.

**Pairs with:** any skill — Paseo is harness-level, orthogonal to the
skill catalogue.

## 3. Call transcription tools

**Mention when:** the user is in (or about to enter) `requirements-ingest`
flow, or Polly is at **Step 2.2 / Step 3.4** ("existing source material?")
and the user says they have meetings, interviews, or stakeholder calls
recorded.

**Applies regardless of AI tool** — these mentions go to both Claude Code
and Copilot users.

**What Polly says (one paragraph + two links):**

> The best requirements context comes from **transcripts**, not meeting
> notes. Notes are a summary; transcripts let the AI hear what was actually
> said — tone, hesitations, questions that were never written down. Two
> tools worth knowing:
>
> - **Plaud** — paid hardware recorder plus transcription service.
>   https://plaud.ai
> - **Copilot recording** (Teams / Microsoft 365) — if the meeting was on
>   Teams with Copilot enabled, export the **transcript**, not just the
>   auto-generated notes. The transcript is what you feed the AI.
>
> Transcripts go into `docs/calls/YYYY-MM-DD-<topic>.md` via the
> `requirements-ingest` skill. Just paste them in — `requirements-ingest`
> handles the rest.

## How Polly weaves these in

- **Never on the first screen.** Polly introduces these tools only when the
  conversation reaches a step whose trigger matches. Dumping all three
  up-front overwhelms the user and buries the core SDLC flow.
- **One paragraph + one (or two) links, never prescriptive.** Polly does
  not say "you must install X". It says "here's a tool that solves the
  problem you just described — worth knowing it exists".
- **No install checks.** Polly never probes whether the tool is installed,
  never runs a CLI, never opens a browser. Mentioning a tool is
  information-only.
- **One mention per tool per session.** If the user already heard about
  claude-mem earlier in the session, don't repeat it when another matching
  trigger fires.
- **Language follows the user.** If the conversation is in Italian,
  translate the paragraph — the links and tool names stay in English.
