# NONoise Framework

SDLC bootstrapper that scaffolds projects with skills, agents, and tools for Claude Code, GitHub Copilot, Codex, Cursor, and Gemini CLI.

## Quick start

```bash
npx create-nonoise my-app
```

The CLI asks which AI tools you use, then generates a ready-to-code project with:

- `src/` for your code (stack-agnostic)
- `AGENTS.md` cross-tool context
- `CLAUDE.md` + `.claude/skills/` (if Claude Code selected)
- `.github/copilot-instructions.md` (if Copilot selected)
- `.cursor/rules.md`, `GEMINI.md`, etc. per your selection
- 3 bundled skills: `graphify-gitignore`, `vscode-config-generator`, `docs-md-generator` (stub)

## Repo structure

- `packages/create-nonoise/` — the CLI
- `packages/templates/` — template assets (single-project)
- `packages/skills/` — bundled skill assets

See `docs/superpowers/specs/2026-04-18-sp1-cli-installer-single-project-design.md` for the design and `docs/superpowers/plans/2026-04-18-sp1-cli-installer-single-project.md` for the implementation plan.

## Development

```bash
pnpm install
pnpm -r run typecheck
pnpm -r run build
pnpm -r run test
```

## License

MIT
