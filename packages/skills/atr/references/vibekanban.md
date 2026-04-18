# ATR Phase 3 — VibeKanban Push Details (future integration)

> **Status**: planned integration. The VibeKanban MCP server is not yet bundled with NONoise v1. This file documents the target workflow so that when the MCP is wired, `/atr push` can be completed without rewriting.

Reference for `/atr push` — MCP configuration, issue templates, and workflow details.

## Table of Contents

- [Current status in NONoise v1](#current-status-in-nonoise-v1)
- [MCP Auto-Configuration (when wired)](#mcp-auto-configuration-when-wired)
- [Push Process](#push-process)
- [Severity to Priority Mapping](#severity-to-priority-mapping)
- [Issue Description Template](#issue-description-template)
- [Idempotency](#idempotency)
- [Output Format](#output-format)

---

## Current status in NONoise v1

`/atr push` runs in **dry-run mode**: it reads `backlog.md` and prints a formatted summary of what would be pushed to a tracker. This gives the user a copy-paste-friendly view of the failures without requiring any external integration.

When the VibeKanban MCP (or another tracker integration) becomes available, the same `/atr push` command will switch to live mode automatically — this file documents what that live mode will do.

---

## MCP Auto-Configuration (when wired)

If `vibe_kanban` is not in the MCP configuration, ask the user:

> "VibeKanban MCP server is not configured. Do you want me to add it automatically? I can configure it for:
> 1. **Claude Code** (`.claude/settings.json`)
> 2. **GitHub Copilot** (`.vscode/mcp.json`)
> 3. **Both**
>
> Which one?"

**Claude Code configuration** — add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "vibe_kanban": {
      "command": "npx",
      "args": ["-y", "vibe-kanban@latest", "--mcp"]
    }
  }
}
```

Merge with existing settings (preserve `enabledPlugins` and other keys).

**GitHub Copilot configuration** — create or update `.vscode/mcp.json`:

```json
{
  "servers": {
    "vibe_kanban": {
      "command": "npx",
      "args": ["-y", "vibe-kanban@latest", "--mcp"]
    }
  }
}
```

After configuring, inform the user they need to restart Claude Code or reload VS Code for the MCP server to be available, then retry `/atr push`.

---

## Push Process

1. **Read `backlog.md`** from the specified path (or the latest one under `docs/sprints/Sprint-N/acceptance/`)
2. **Discover VibeKanban context**:
   - Call `list_organizations` to get the org ID
   - Call `list_projects` to find the target project (ask the user which one if multiple exist)
   - Call `list_tags` to check if `atr` and `sprint-{N}` tags exist
3. **For each failure entry** in the backlog:
   - Call `create_issue` with:
     - **title**: `[{test_id}] {short description}` (e.g. `[US-003] Signup form does not show loading state`)
     - **description**: full body assembled from the backlog entry (see template below)
     - **priority**: mapped from ATR severity (see mapping table)
   - Call `add_issue_tag` to tag with `atr` and `sprint-{N}`
4. **Report results**: show how many issues were created with their IDs and links

---

## Severity to Priority Mapping

| ATR Severity | VibeKanban Priority |
|---|---|
| critical | urgent |
| high | high |
| medium | medium |
| low | low |

---

## Issue Description Template

The body of each VibeKanban issue is assembled from the backlog entry:

```markdown
## Context

**ATR test**: {test_id} — {test_title}
**Manifest section**: {manifest_ref}
**Sprint**: {N}

## Problem

**Manifest requirement**: {exact requirement text}
**Expected**: {expected}
**Observed**: {actual observation}

## Technical details

**Likely files**: {file paths}
**Fix hint**: {suggested fix}
**Screenshot**: {screenshot path} (see the local ATR report)

## References

- ATR report: `docs/sprints/Sprint-{N}/acceptance/{report_file}`
- Manifest: `docs/sprints/Sprint-{N}/sprint-manifest.md` {manifest_ref}
```

---

## Idempotency

Before creating an issue, search existing issues (via `list_issues` with a query matching the test ID like `[US-003]`) to avoid duplicates. If an issue with the same test ID already exists, skip and report it as "already tracked".

---

## Output Format

After pushing, print a summary:

```
ATR Push — Sprint {N}

Created:  5 issues
Skipped:  2 (already tracked)
Failed:   0

Issues created:
  [US-003] Signup form does not show loading state -> #42 (medium)
  [US-005] Empty fields render as "null" -> #43 (medium)
  ...
```
