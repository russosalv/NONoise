# create-nonoise

**An AI SDLC bootstrapper.** One command turns an empty directory into a fully-wired, AI-ready project — skills, docs hierarchy, cross-tool context files, and an orchestrator (Polly) that walks your team through the whole software lifecycle.

🌐 **Site:** https://nonoise-frmk.com
📦 **Repo:** https://github.com/russosalv/NONoise
📚 **Docs:** https://github.com/russosalv/NONoise/tree/main/docs

---

## Quickstart

```bash
npx create-nonoise my-project
cd my-project
# Open in Claude Code, or tell Copilot: "start polly"
```

The CLI asks which AI tools your team uses (Claude Code, GitHub Copilot), then scaffolds:

- **`src/`** — your code. Stack-agnostic: pick .NET, Node, Python, Rust, Go.
- **`docs/`** — six-folder source-of-truth hierarchy (architecture, requirements, calls, support, prd, sprints).
- **`.claude/skills/`** — 40+ AI skills: Polly orchestrator, BMAD personas, Quint FPF validator, vendored [superpowers](https://github.com/obra/superpowers), design and ops packs.
- **Context files** for each selected tool — `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md` — generated from one source of truth.
- **`tools/md-extractor/`** and **`tools/devops-push/`** — Node CLIs.
- **`.nonoise/POLLY_START.md`** — auto-trigger marker. On first session, Polly introduces herself and walks you through the SDLC.

## Options

```bash
npx create-nonoise [directory] [options]

  --template <name>    single-project | multi-repo   (default: single-project)
  --ai <csv>           claude-code,copilot,codex,cursor,gemini-cli
  --no-git             skip git init
  --yes, -y            non-interactive defaults
  --version, -v        print version
  --help, -h           print help
```

## The SDLC Polly walks you through

```
Requirements → Discovery → Architecture → Sprint → Implementation → Acceptance → Operations
```

Every step is annotated `[pair]` (multiple seniors, large model) or `[solo]` (one dev per task, smaller model, parallelisable). Polly announces the mode so nobody wastes the wrong model on the wrong problem.

## Who this is for

Teams adopting AI-assisted development with **Claude Code** or **GitHub Copilot** as first-class AI tools (v1 scope). Cursor, Gemini CLI, and Codex work in best-effort mode — the skills are plain Markdown and any tool can follow them.

## Learn more

- [Overview & philosophy](https://github.com/russosalv/NONoise/blob/main/docs/overview.md)
- [Full SDLC flow](https://github.com/russosalv/NONoise/blob/main/docs/sdlc.md)
- [Polly decision tree](https://github.com/russosalv/NONoise/blob/main/docs/polly.md)
- [Skill catalog (40+ skills)](https://github.com/russosalv/NONoise/blob/main/docs/skills-catalog.md)
- [Cross-tool support matrix](https://github.com/russosalv/NONoise/blob/main/docs/cross-tool.md)

## License

MIT, with attribution. See the repo for full `LICENSE` and `ATTRIBUTION.md`.

---

Created by [Alessandro Russo](https://github.com/russosalv).
