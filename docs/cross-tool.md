# Cross-tool support — Claude Code, Copilot, and friends

NONoise targets multiple AI coding assistants. Some are **first-class** (fully validated and supported); others are **best-effort** (the Markdown flows work, but tool-specific niceties may not). This document lays out the support matrix, the mechanism for each tool, and the degradation profile when leaving first-class territory.

## V1 scope — Claude Code and GitHub Copilot

**Polly v1 targets Claude Code and GitHub Copilot explicitly.** The advisor flow is validated on those two. Both tools are first-class — the SDLC loop is identical; the mechanics underneath differ.

- **Claude Code** is the original target and has the deepest integration: slash commands, `Skill` tool invocation, hooks, MCP servers.
- **GitHub Copilot** is an equal first-class — the scaffolder writes `.github/copilot-instructions.md` and wires the same auto-trigger as a phrased instruction; every skill runs as "read the SKILL.md and follow it".

| Capability | Claude Code | GitHub Copilot |
|---|---|---|
| **Scaffold writes context file** | `CLAUDE.md` (plus `.claude/skills/`, `.claude/commands/`, `.claude/settings.json`) | `.github/copilot-instructions.md` |
| **Launch Polly** | `/polly` slash command (wired via `.claude/commands/polly.md`) | Phrase trigger: "start polly" / "avvia polly" / "run polly" |
| **Invoke a specialist skill** | `Skill` tool by name — e.g. `arch-brainstorm`, `superpowers:writing-plans` | Read the SKILL.md file inline and follow its instructions |
| **Hooks** (pre/post tool-use) | Active (defined in `.claude/settings.json`) | No hook mechanism — relevant hooks are silent no-op |
| **MCP servers** (`.mcp.json`) | Supported if user configures | Silent no-op |
| **Worktrees** (`superpowers:using-git-worktrees`) | Active | Active (worktrees are a git feature, not tool-specific) |
| **Namespacing for vendored** | `superpowers:<name>`, `impeccable:<name>` | Same files, referenced by path |
| **Memory integration** | `claude-mem` plugin mentioned by Polly (info-only) | Native memory features used by the user |

## Best-effort tier — Cursor, Gemini CLI, Codex

These tools read plain Markdown and can follow a SKILL.md by hand. NONoise writes the correct entry-point file for each during scaffolding, but v1 does **not** validate the full flow on them.

- **Cursor** — entry file `.cursor/rules.md`; the skill library is in `.claude/skills/` and Cursor users open the SKILL.md manually. Most skills work; slash commands and hooks do not.
- **Gemini CLI** — entry file `GEMINI.md`. Gemini uses an `activate_skill` tool mechanism that differs from Claude Code's; NONoise ships the skills as Markdown under `.claude/skills/` and the Gemini context file points at them. Best-effort.
- **Codex** — entry file `AGENTS.md` (the industry-standard file name many tools respect). Codex-style tools read `AGENTS.md` and the user points at skills manually.

### Support matrix — best-effort tier

| Capability | Cursor | Gemini CLI | Codex |
|---|---|---|---|
| **Scaffold writes context file** | `.cursor/rules.md` | `GEMINI.md` | `AGENTS.md` |
| **Launch Polly** | Read `.claude/skills/polly/SKILL.md` manually | Ask Gemini to activate `polly` skill | Read `.claude/skills/polly/SKILL.md` manually |
| **Invoke a specialist skill** | Read its SKILL.md manually | Ask Gemini to activate the named skill | Read its SKILL.md manually |
| **Hooks / slash commands / MCP** | Silent no-op | Silent no-op | Silent no-op |

Most of the SDLC flow works in best-effort tier because skills are plain Markdown and the AI follows them conversationally. What degrades is slash-command ergonomics and hook-based validations.

## Deferred — full support on best-effort tier

v1 explicitly does not validate Polly's full advisor flow on Cursor / Gemini CLI / Codex. Reaching Claude-Code / Copilot parity requires:

1. Per-tool phrasing in the entry-point file blocks (`.cursor/rules.md`, `GEMINI.md`, `AGENTS.md`) tested against the actual tool's rule-matching behaviour.
2. Tool-specific skill invocation syntax encoded in the skill library (e.g., Gemini's `activate_skill` vs Claude Code's `Skill` tool).
3. Validation of the auto-trigger path on each tool.
4. A decision on whether namespacing (`superpowers:*`) survives the translation or collapses to filenames.

These are roadmap items. Until they ship, the tier stays *best-effort*: "most things work; some tool-specific niceties don't; if you want first-class, pick Claude Code or Copilot".

## When scaffolding for multiple tools

`create-nonoise` asks which AI tools your team uses. In v1 the prompt is tuned to Claude Code and Copilot (both / either), with a note that other tools are best-effort. Selecting multiple writes all the corresponding entry files from a single source of truth — `docs-md-generator` keeps them coherent.

```
Which AI tools does your team use?
[x] Claude Code          (first-class)
[x] GitHub Copilot       (first-class)
[ ] Cursor               (best-effort)
[ ] Gemini CLI           (best-effort)
[ ] Codex-style agents   (best-effort)
```

The scaffold writes:

- Always: `AGENTS.md` (industry-standard, read by multiple tools).
- If Claude Code: `CLAUDE.md`, `.claude/skills/`, `.claude/commands/`, `.claude/settings.json`.
- If Copilot: `.github/copilot-instructions.md`.
- If Cursor: `.cursor/rules.md`.
- If Gemini CLI: `GEMINI.md`.

All entry files are generated from one template per template plus shared stanzas — the Polly invocation block, the graphify-report-first block, the project glossary — so edits to shared content don't require touching each file manually.

## Why multiple tools matter

Three practical reasons NONoise bothers with cross-tool support:

1. **Teams don't pick one tool.** In any organisation of ≥ 10 developers, some will be on Claude Code, some on Copilot, some experimenting with Cursor. If the framework forces a tool choice, it fragments the team. Cross-tool by default means a senior can pair with a junior on whichever tool each is comfortable with and the project stays navigable for both.
2. **Tools churn fast.** Models improve at different rates in different tools. A project tied to one tool inherits the tool's release cadence. NONoise's skill library, being plain Markdown, is invariant to the tool's evolution.
3. **Vendor independence.** Organisations that can't commit to a single vendor for policy reasons (procurement, security review, export control) can still adopt NONoise because it runs on whichever AI tool they already have approved.

## The shared substrate

Every NONoise skill is plain Markdown because that's the greatest common denominator. Every AI tool in current use can read and follow Markdown. If a future tool appears, the framework works with it as long as the tool can read `.md` files and follow instructions — no porting required.

The convention each entry-point file respects:

- Frontmatter with `name` and `description` on SKILL.md.
- Trigger phrases in the `description` field that a trigger-matching mechanism can key off.
- A clear body with numbered steps where applicable.
- Sub-assets under `references/`, `assets/`, `scripts/`.

Tools that support richer mechanisms (Claude Code's `Skill` tool, Gemini's `activate_skill`) layer on top; tools that don't fall back to "read the file and follow it".

## Where to read more

- [`polly.md`](polly.md) §Best-effort mode — what degrades when Polly runs outside Claude Code / Copilot.
- [`skills-catalog.md`](skills-catalog.md) §Authoring a new skill — conventions that keep skills cross-tool.
- `packages/skills/vendor/superpowers/skills/using-superpowers/references/copilot-tools.md`, `gemini-tools.md`, `codex-tools.md` — tool-equivalence mapping for the superpowers ecosystem, which NONoise inherits.
