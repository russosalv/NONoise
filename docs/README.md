# NONoise Documentation

This folder is the long-form documentation for the NONoise bootstrapper. The [top-level `README.md`](../README.md) is the entry point and stays intentionally short; everything detailed — philosophy, SDLC walkthrough, skill catalog, tool support, install — lives here.

These files are also the source material for the public site at [NONoise-frmw-site](https://github.com/russosalv/NONoise-frmw-site): when the site is rebuilt, copy or transform from here — do not hand-edit the site and let it drift.

## Read in order (first-time reader)

1. **[`overview.md`](overview.md)** — what NONoise is, what it isn't, who it's for, and the 60-second pitch. Start here.
2. **[`philosophy.md`](philosophy.md)** — the principles behind every decision: signal-vs-noise, parametric memory, canonical architectures, docs-as-source-of-truth, advisor-only posture for LSP and voice tools.
3. **[`sdlc.md`](sdlc.md)** — the full software lifecycle, greenfield and brownfield paths, skip rules, the dev trio.
4. **[`polly.md`](polly.md)** — Polly the orchestrator, her decision tree, pair/solo annotation, auto-trigger mechanics.
5. **[`team-model.md`](team-model.md)** — why NONoise is explicitly team-first, the roles it assumes, the one-man-band degenerate case.
6. **[`skills-catalog.md`](skills-catalog.md)** — all bundled skills, grouped by domain, with trigger surface and purpose.
7. **[`docs-hierarchy.md`](docs-hierarchy.md)** — the six `docs/` folders scaffolded into every project, who owns each, and how skills read/write them.
8. **[`cross-tool.md`](cross-tool.md)** — support matrix for Claude Code, GitHub Copilot, Cursor, Gemini CLI, Codex.
9. **[`external-tools.md`](external-tools.md)** — the tools Polly mentions but NONoise does not integrate (voice, memory, kanban, trackers).
10. **[`installation.md`](installation.md)** — install, scaffold output, repo layout, dev loop for framework contributors.

## Read selectively (returning reader)

- **"I need to know what Polly does at step X"** → [`polly.md`](polly.md) §Decision tree, or the authoritative `packages/skills/polly/SKILL.md` and its `references/decision-tree.md`.
- **"Does Copilot support feature Y?"** → [`cross-tool.md`](cross-tool.md) §Capability matrix.
- **"Where do I put requirement files?"** → [`docs-hierarchy.md`](docs-hierarchy.md) §`docs/requirements/`.
- **"Which skill validates a PRD?"** → [`skills-catalog.md`](skills-catalog.md) §Architecture & validation.

## Editorial conventions

- **Audience.** Senior developers and architects adopting NONoise. We assume familiarity with AI coding assistants and standard SDLC vocabulary.
- **Voice.** Declarative and opinionated. NONoise takes positions on purpose — those positions are the product.
- **Links.** Relative links into the repo (`../packages/...`) or sibling docs (`./sdlc.md`). Avoid absolute URLs except for upstream projects and external resources.
- **Canonical source.** If a skill's SKILL.md disagrees with what's written here, the SKILL.md wins — it is what runs. Fix the doc.
- **Length.** Verbose is fine. These files feed slides, the public site, and executive decks. Prefer one rich document over a chain of stubs.
