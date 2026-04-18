---
name: design-md-generator
description: Generates a DESIGN.md design-system document for the current project following the Stitch DESIGN.md format popularized by getdesign.md (VoltAgent/awesome-design-md). Use when the user asks to "create a design.md", "generate design system docs", "write DESIGN.md", "bootstrap UI style guide", "document the design system for AI agents", or when starting a frontend project and no design spec exists yet. Can start from scratch via guided Q&A or clone an existing community DESIGN.md as a starting point.
---

# design-md-generator

Generates a `DESIGN.md` in the project following the **Stitch DESIGN.md format** (9 sections), which the `getdesign.md` ecosystem has made the de-facto convention for giving coding agents (Claude, Copilot, Cursor) a machine-friendly design-system brief.

A good `DESIGN.md` means: when the user says "add a settings page", the AI produces a page that matches the rest of the app out of the box — no color/typography/component drift.

## When to invoke

- User asks to *"create a DESIGN.md"*, *"generate design system docs"*, *"bootstrap a style guide for this project"*.
- User has a new frontend project and wants a single source of truth for UI decisions.
- User has an existing UI and wants to reverse-document the design system.
- Polly invokes this during the greenfield flow when frontend is part of the stack.

## Two modes

### Mode A — From scratch (guided Q&A)
Walk the user through the 9 sections of the Stitch format, proposing options at each step based on their product/brand.

### Mode B — Clone from community
Start from a published `DESIGN.md` in `VoltAgent/awesome-design-md` as a base, then customize.

Community clone is a single command the user runs — we don't run it:

```bash
npx getdesign@latest add <name>   # e.g. claude, spotify, linear, vercel, ...
```

The repo at https://github.com/VoltAgent/awesome-design-md has 68+ curated systems. After running the command, the user has a file to edit; skill-driver then guides the customization.

## Output location

Default: `docs/design.md` (or `docs/DESIGN.md` if the project convention uses uppercase). Confirm with the user before writing — some projects prefer `DESIGN.md` at repo root.

## The 9 sections — canonical Stitch format

For each section, produce concrete content, not placeholders. If the user can't answer a question, pick a sensible default aligned with their brand/tone and mark it *"(default — adjust if needed)"*.

### 1. Visual Theme & Atmosphere
- **Mood** in 3-5 adjectives (e.g. *warm, editorial, calm, rooted, deliberate*).
- **Density**: tight / comfortable / generous (pick one).
- **Design philosophy** in 2-3 sentences. Reference a precedent if useful ("inspired by the NYT editorial layout", "Notion meets Dieter Rams").

### 2. Color Palette & Roles
Table with columns: **Name · Hex · Role**. Typical rows:
- `background` / `surface` / `surface-muted`
- `text-primary` / `text-secondary` / `text-muted`
- `accent` (primary brand) / `accent-hover` / `accent-muted`
- `success` / `warning` / `error` / `info`
- `border` / `border-subtle`

Provide **semantic names first**, hex second. Light + dark variants if both are supported.

### 3. Typography Rules
- Font families: display + body + mono. Specify fallback stacks.
- Hierarchy table: **Level · Font · Weight · Size · Line-height · Letter-spacing · Use for**.
  - Typical levels: `display`, `h1`, `h2`, `h3`, `body-lg`, `body`, `body-sm`, `caption`, `code`.

### 4. Component Stylings
Minimum set: **Button**, **Input**, **Card**, **Navigation**, **Modal/Dialog**. For each, describe the **default / hover / active / disabled** states with color + border + shadow + padding.

### 5. Layout Principles
- Spacing scale (e.g. `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`).
- Grid: max-width, columns, gutter.
- Whitespace philosophy (1-2 sentences).

### 6. Depth & Elevation
Shadow tokens with purpose:
- `shadow-sm` (subtle lift — dropdowns, hover states)
- `shadow-md` (modals, popovers)
- `shadow-lg` (command palettes, overlays)
- Optional: border-based elevation for flat designs.

### 7. Do's and Don'ts
Two lists, 5-8 items each, phrased concretely:
- **Do**: "Use `accent` only for the primary CTA on a page", "Keep body text at 16px minimum", "Prefer 1-2 weights per section".
- **Don't**: "No gradients on backgrounds (reserved for illustrations)", "Never put two `accent` buttons side-by-side", "Avoid all-caps body copy".

### 8. Responsive Behavior
- Breakpoints (e.g. `sm: 640, md: 768, lg: 1024, xl: 1280`).
- Touch targets (≥ 44×44 on mobile).
- Collapsing strategy: what hides on mobile, what switches to vertical stacks, what remains sticky.

### 9. Agent Prompt Guide
Short-form reference the AI agent reads before generating UI code:
- Quick color cheatsheet (just name → hex, no role)
- 3-5 canonical prompts: *"a settings page in this design system"*, *"an empty state illustration placeholder"*, *"a destructive action confirmation"*.
- Common gotchas (e.g. *"this design uses sans-serif for body; never switch to serif except for long-form reading views"*).

## Workflow

1. **Confirm mode**: scratch (A) or clone (B). If uncertain, suggest B if the user can name a brand whose style they like.
2. **Location**: propose `docs/design.md`, confirm.
3. **Phase 1 — Brand brief** (skip in mode B if the clone is already aligned):
   - Product name + 1-sentence description
   - Audience (who uses it, tech comfort level)
   - Tone (3-5 adjectives)
   - Reference brands / sites the user admires (1-3)
4. **Phase 2 — Draft sections**: produce sections 1-9 in order. For each, show a draft, ask the user *"accept, refine, or skip?"* before moving on.
5. **Phase 3 — Write**: assemble into the final file, format as clean markdown (no HTML unless needed), save to the chosen path.
6. **Phase 4 — Update project meta**:
   - Add `design.md` to `nonoise.config.json` under `artifacts.design` (if the config exists).
   - Reference it from `CLAUDE.md` / `.github/copilot-instructions.md` so agents read it when generating UI.

## Template snippet (minimal example)

The following is a skeleton Claude/Copilot can fill with section 1 content:

```markdown
# <Product Name> — Design System

> Source of truth for UI decisions. Agents (Claude Code, Copilot) should
> read this before generating any user-facing code.

## 1. Visual Theme & Atmosphere

**Mood**: warm, editorial, calm, rooted, deliberate.
**Density**: comfortable.
**Philosophy**: The product is a long-form reading tool for policy professionals.
The UI should feel like a thoughtful magazine, not a dashboard — generous
whitespace, one dominant typeface, accent color used sparingly for signals
(saved items, unread, destructive actions).
```

Repeat the same pattern for sections 2-9 with real content filled in from the Q&A.

## Integration with other NONoise skills

- **`frontend-design`** (bundled): produces distinctive, production-grade UI.
  Once `DESIGN.md` exists, `frontend-design` must consult it before picking fonts,
  colors, or layout patterns. The Agent Prompt Guide (section 9) is the handoff.
- **`impeccable/*`** (vendored): the 18 impeccable skills (audit, polish, adapt,
  etc.) can use `DESIGN.md` as the reference when critiquing existing UI.
- **Polly**: during the greenfield flow, propose running this skill right after
  the user says "the frontend should look like X".

## Rules

- **Write concrete content, never placeholders**. If the user can't decide, pick a sensible default and flag it `(default — revisit)`.
- **Stitch format compliance**: all 9 sections present, in order, with H2 heading per section.
- **No proprietary brand imitation**: the skill will not generate a system that explicitly copies a trademarked look (e.g. "make it exactly like Stripe"). Use the community DESIGN.md clone for legitimate reuse of published open systems.
- **Update `CLAUDE.md` pointer**: append a line in `CLAUDE.md` (and `.github/copilot-instructions.md` if present) telling future agents: *"When generating UI, read `docs/design.md` first."* Use a managed block with HTML-comment markers so re-runs are idempotent:
  ```markdown
  <!-- >>> design-md (managed by design-md-generator) -->
  ## design.md
  When generating user-facing UI code, first read `docs/design.md` for colors,
  typography, spacing, and component rules. Section 9 (Agent Prompt Guide) has
  the quick reference for common prompts.
  <!-- <<< design-md -->
  ```

## Out of scope (v1)

- Generating design-token JSON/CSS variables from the produced `DESIGN.md` (future work — can be a companion skill).
- Auto-scraping a live website to reverse the design (future; in v1 this skill asks the user to provide the reference manually).
- Multi-brand / white-label support in a single `DESIGN.md` (one file per brand).
