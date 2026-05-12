# create-nonoise

**An AI SDLC bootstrapper.** One command turns an empty directory into a fully-wired, AI-ready project — skills, docs hierarchy, cross-tool context files, and an advisor (Polly) that tells your team where they are in the SDLC and what to do next.

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

> **GitHub Release fallback.** If the npm registry is temporarily unavailable, install the identical tarball from the GitHub Release:
>
> ```bash
> npx https://github.com/russosalv/NONoise/releases/download/v1.3.0/create-nonoise-1.3.0.tgz my-project
> ```

The CLI asks which AI tools your team uses (Claude Code, GitHub Copilot), then scaffolds:

- **`src/`** — your code. Stack-agnostic: pick .NET, Node, Python, Rust, Go.
- **`docs/`** — six-folder source-of-truth hierarchy (architecture, requirements, calls, support, prd, sprints).
- **`.claude/skills/`** — 40+ AI skills: Polly advisor, BMAD personas, Quint FPF validator, vendored [superpowers](https://github.com/obra/superpowers), design and ops packs.
- **Context files** for each selected tool — `CLAUDE.md`, `.github/copilot-instructions.md`, `AGENTS.md` — generated from one source of truth.
- **`tools/md-extractor/`** and **`tools/devops-push/`** — Node CLIs.
- **`.nonoise/sdlc-flow.md`** — the SDLC flow Polly reads to detect where you are and suggest the next skill.

## Options

```bash
npx create-nonoise [directory] [options]

  --workspace <kind>    new | existing-single | existing-multi
  --template <name>     single-project | multi-repo   (default: single-project)
  --ai <csv>            claude-code,copilot,codex,cursor,gemini-cli
  --user-name <name>    developer name (used by AI to address you)
  --user-locale <iso>   ISO 639-1 language code (en, it, …)
  --reverse / --no-reverse   enable/disable reverse-engineering config block
  --no-git              skip git init
  --yes, -y             non-interactive defaults
  --version, -v         print version
  --help, -h            print help

Maintenance (existing projects):
  --upgrade [path]        refresh bundled skills + re-install graphify
  --graphify-only [path]  narrow path: only the graphify CLI integration
```

When run with no flags, the CLI asks interactively whether to:

1. **Create a new NONoise project** (full scaffold)
2. **Upgrade an existing project** (refresh skills + graphify)
3. **Force-install graphify only** (narrow, idempotent fix)

If you pass a positional path that already contains `nonoise.config.json`, the CLI auto-detects it as an existing project and prompts: *Upgrade / Graphify-only / Cancel* — it never silently scaffolds over an existing project.

## Upgrading an existing project

Bundled skills are copied at scaffold time and stay frozen at that version — `npm install -g create-nonoise` doesn't reach them. To pick up improvements (e.g. hardened anti-pattern guards on `reverse-engineering`, new skills, the `/index` slash command), run:

```bash
# Interactive (auto-detect)
npx create-nonoise@latest path/to/existing-project

# Direct, non-interactive
npx create-nonoise@latest --upgrade path/to/existing-project
```

What `--upgrade` does:

- **Re-copies all bundled skills** under `<project>/.claude/skills/` (overwrites — picks up the latest `SKILL.md` files).
- **Re-runs the graphify install** (`graphify claude install` / `graphify copilot install`) so `<project>/CLAUDE.md` and `.claude/settings.json` get the current hook.
- **Does NOT touch templates** — `CLAUDE.md`, `AGENTS.md`, `copilot-instructions.md` keep your edits.
- **Does NOT touch `nonoise.config.json`**.

For the narrower repair path (only graphify, no skill refresh):

```bash
npx create-nonoise@latest --graphify-only path/to/existing-project
```

In `--yes` mode auto-detection refuses to operate on an existing project and prints the explicit `--upgrade` / `--graphify-only` command you should run — non-interactive scripts cannot silently clobber an existing project.

## The SDLC flow

```
Requirements → Discovery → Architecture → Sprint → Implementation → Acceptance → Operations
```

Every phase is annotated `[pair]` (multiple seniors, large model) or `[solo]` (one dev per task, smaller model, parallelisable). Invoke `/polly` to find out where you are and get the exact prompt for the next skill.

## Knowledge graph (graphify)

Every scaffolded project ships an integration with [`graphify`](https://github.com/safishamsi/graphify) for AST + semantic + community-detection knowledge graphs.

**No API key needed.** The scaffold writes per-platform graphify skill files **into the project itself** — `.claude/skills/graphify/SKILL.md` for Claude Code, `.copilot/skills/graphify/SKILL.md` for Copilot, `.agents/skills/graphify/SKILL.md` for Codex. Anyone who clones the repo (or runs the CLI without Python/uv on `PATH`) immediately gets the subagent-dispatch flow — no `ANTHROPIC_API_KEY` prompt, no missing-skill fallback. The companion `graphify <X> install` is still run as belt-and-suspenders for the user-global install.

In Claude Code there is also a project-level `/index` slash command that wraps the `/graphify` skill — it builds the graph using your IDE's own model:

```
/index .                 # index the current directory
/index <path>            # index a specific path
/index . --update        # incremental — re-extract only changed files
```

Don't use the bare `graphify extract` CLI for indexing — it requires an external LLM API key. The `/graphify` slash skill (and the `/index` shortcut) runs the same pipeline through your IDE assistant's session.

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
