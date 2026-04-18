# Polly — skill invocation matrix

This matrix lists every skill Polly engages, its current install state in
the framework, and the phrase Polly uses to hand off.

## Legend

- **Installed** — ships in the MVP bundle today, always available
- **Vendor-pending** — planned to vendor from an upstream source; use
  fallback in the meantime (see `fallback-messages.md`)
- **External** — not part of the bundle; engage only if the user confirms
  it is installed locally (via `skill-finder` or manual install)

## Core SDLC skills

| Skill | State | Phrase to use |
|---|---|---|
| `requirements-ingest` | Installed | "I'll engage requirements-ingest to sort your sources into `docs/requirements/`." |
| `bmad-agent-analyst` | Installed | "I'll engage bmad-agent-analyst — it runs the structured elicitation." |
| `bmad-advanced-elicitation` | Installed | "I'll engage bmad-advanced-elicitation for a lighter one-round pass." |
| `bmad-agent-architect` | Installed | "Architect persona engaged — let's lay out the architectural frame." |
| `bmad-agent-ux-designer` | Installed | "UX-designer persona engaged — let's map the flows." |
| `bmad-agent-tech-writer` | Installed | "Tech-writer persona engaged — let's get the docs drafted." |
| `superpowers:brainstorming` | Vendor-pending | "I'll engage superpowers:brainstorming for the PRD." (fallback: manual, see `fallback-messages.md`) |
| `arch-brainstorm` | Installed | "I'll engage arch-brainstorm — it proposes architectures against the constraints." |
| `quint-fpf` | Installed | Engaged automatically by `arch-decision`. Polly does not invoke it directly. |
| `arch-decision` | Installed | "I'll engage arch-decision — it picks one architecture and writes the ADR." |
| `sprint-manifest` | Installed | "I'll engage sprint-manifest — it produces the aggregated manifest for the sprint." |
| `atr` | Installed | "I'll engage atr for this item — acceptance, test, implementation." |

## Brownfield-specific

| Skill | State | Phrase to use |
|---|---|---|
| `graphify-setup` | Installed | "I'll engage graphify-setup to verify the graph tooling." |
| `reverse-engineering` | Installed | "I'll engage reverse-engineering — we'll explore the legacy code together before writing anything." |

## Orthogonal / on-demand

| Skill | State | Trigger |
|---|---|---|
| `observability-debug` | Installed | "prod is broken", "why is this slow?", "I need logs" |
| `ops-skill-builder` | Installed | "I keep doing this ops task by hand" |
| `spec-to-workitem` | Installed | "push to Jira / Azure DevOps / GitHub / Linear" |
| `frontend-design` | Installed | "design this UI", "component design", "frontend patterns" |
| `playwright-cli` | Installed | "write a Playwright test" |
| `vscode-config-generator` | Installed | "generate VSCode configs", ".vscode settings" |
| `docs-md-generator` | Installed | "I need a docs markdown", "README template" |
| `design-md-generator` | Installed | "I need a design.md", "design doc template" |
| `skill-finder` | Installed | "I don't know which skill I want" |

## Superpowers (vendor-pending — full list)

When the `superpowers` vendor lands in the framework (SP-9 step 2), the
following skills become available to Polly. Until then, treat them as
vendor-pending and use manual fallback:

- `superpowers:brainstorming`
- `superpowers:writing-plans`
- `superpowers:executing-plans`
- `superpowers:tdd`
- `superpowers:verification-before-completion`
- `superpowers:systematic-debugging`

## External / user-managed

These are not managed by Polly; if the user mentions them, acknowledge and
stay out of the way:

- `graphify` (the core Python package, not the `graphify-setup` skill)
- IDE / LSP plugins installed via Claude Code marketplace or Copilot
  `setup lsp` (Polly never auto-installs — see `feedback_lsp_advisor_only`
  in the framework's design memory)

## How Polly engages a skill

### Claude Code

Use the `Skill` tool with the skill's `name` frontmatter value:

```
Skill(skill: "arch-brainstorm")
Skill(skill: "superpowers:brainstorming")   # once vendored
```

### GitHub Copilot

Read the skill's `SKILL.md` directly from `.claude/skills/<name>/SKILL.md`
and follow the instructions inline. Copilot has no `Skill` tool
equivalent, so the skill's markdown IS the instruction set.

### When a skill is not present

1. Check `.claude/skills/<name>/SKILL.md` exists before invoking.
2. If it doesn't, use the fallback templates in `fallback-messages.md`.
