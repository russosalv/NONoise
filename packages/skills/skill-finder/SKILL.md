---
name: skill-finder
description: Discovers AI skills from a curated registry of external sources (Anthropic official, Claude plugin marketplaces, community repos, awesome-lists) and installs them into the current project. Use when the user asks to "find a skill for X", "do we have something for Y?", "add <technology>/stack support", "install a skill from GitHub", "what skills could help with this codebase?", or when Polly needs to plug a gap by fetching a skill that isn't bundled in the framework. Also use proactively after detecting the project stack (Angular, C#, Python, Go, etc.) to suggest stack-specific skills the framework does not ship by default.
---

# skill-finder

Meta-skill that knows **where** AI skills live outside this framework and can install them on demand into the current project. Skill‑finder is the bridge between the 29 bundled skills of NONoise and the long tail of community skills the framework chooses not to ship directly.

## When to invoke

- User asks *"do we have something for <X>?"* and the answer is "not bundled".
- User asks *"find me a skill for <technology>"*, *"install <skill-name>"*, *"what skills help with <domain>?"*.
- Polly (the orchestrator) detects a gap and delegates to skill-finder as fallback.
- After stack detection at project start: proactively propose stack-specific skills (e.g. `angular`, `csharp-pro`) that live in `anthropics/skills` or community repos.
- User types `/skill-finder` or an equivalent explicit trigger.

## Architecture

Skill‑finder is a skill **plus two helper scripts** (decided 2026‑04‑18, option B). The skill drives the conversation; the scripts do the network I/O.

```
packages/skills/skill-finder/
├── SKILL.md                        # this file — tells the AI how to orchestrate
├── registry.json                   # 9 source entries (read-only, shipped)
└── scripts/
    ├── fetch-registry.mjs          # lists available skills per source
    └── install-skill.mjs           # installs one chosen skill into a project
```

### Sources (registry.json)

| id | kind | purpose |
|---|---|---|
| `anthropics-skills` | github-repo-tree | Official Anthropic skills |
| `claude-plugins-official` | marketplace-json | Official plugins (inc. LSP) — install is `/plugin install …@claude-plugins-official` |
| `piebald-lsps` | marketplace-json | Community LSPs (broader language coverage) |
| `obra-superpowers` | github-repo-tree | Already vendored; useful for delta checks |
| `impeccable` | github-repo-tree | Already vendored; useful for delta checks |
| `ui-ux-pro-max` | github-repo-tree | Community UI/UX skill |
| `awesome-claude-code` | awesome-list | Curated index of community skills/plugins |
| `skills-sh` | web-scrape | Community directory — **not implemented in v1** |
| `skillui` | web-scrape | UI skills index — **not implemented in v1** |

Web‑scrape sources are registered but skipped by the scripts until we implement a parser per site.

### Custom sources

Users can add sources for their own project in `.nonoise/skill-finder-custom-sources.json`:

```json
{
  "sources": [
    {
      "id": "my-org-skills",
      "url": "https://github.com/my-org/internal-skills",
      "indexType": "github-repo-tree",
      "branch": "main",
      "skillsPath": "skills",
      "tags": ["internal", "my-org"],
      "notes": "Private org skills"
    }
  ]
}
```

Both helper scripts accept `--custom-sources <path>` to merge the custom file with the shipped registry.

## Workflow

Follow these phases in order. Skip phases that aren't relevant (e.g. skip stack detection if the user already named the stack).

### Phase 1 — Understand intent

Ask the user (or infer from context):
- What stack / technology? (e.g. "Angular 20", "C# + .NET 10", "Go + gRPC")
- What task is the skill needed for? (e.g. "linting", "performance", "auth with EntraID")
- Prefer **copy-from-source** (install the skill as-is) or **generate** (Claude writes a new skill from scratch using `skill-creator`)?

If the project has `nonoise.config.json` with a stack declared, use it as default and confirm.

### Phase 2 — Enumerate candidates

Run the fetch helper. Always pass `--json` for machine-readable output.

```bash
# All sources, unfiltered
node packages/skills/skill-finder/scripts/fetch-registry.mjs --json

# Specific source
node packages/skills/skill-finder/scripts/fetch-registry.mjs --source anthropics-skills --json

# With stack filter (heuristic match on name+description+tags)
node packages/skills/skill-finder/scripts/fetch-registry.mjs --stack csharp,dotnet --json

# With user custom sources merged in
node packages/skills/skill-finder/scripts/fetch-registry.mjs \
  --custom-sources .nonoise/skill-finder-custom-sources.json --json
```

Parse the JSON (`sources[].skills[]`) and rank candidates by relevance to the stack / task. Present **top 3-5** to the user with:
- skill name + source
- short description (if available)
- link (github URL)
- install command preview

### Phase 3 — Install

When the user picks one, run the install helper. Destination is the project root (where `nonoise.config.json` lives); the script creates `.claude/skills/<skill-name>/` under it.

```bash
# Standard install from a github-repo-tree source
node packages/skills/skill-finder/scripts/install-skill.mjs \
  --source anthropics-skills --skill pptx --dest .

# Install with renaming (avoid name clash)
node packages/skills/skill-finder/scripts/install-skill.mjs \
  --source my-org-skills --skill auth --as my-org-auth --dest .

# Dry run before committing
node packages/skills/skill-finder/scripts/install-skill.mjs \
  --source anthropics-skills --skill pptx --dest . --dry-run
```

For **marketplace-json** sources (Claude plugins), the script does **not** auto-install — it prints the `/plugin install` command for the user to run manually in Claude Code. This is by design: plugin install is user-gated on Claude Code (see `feedback_lsp_advisor_only.md`).

For **awesome-list** sources, the script refuses and asks the user to register the specific entry URL as a custom source first.

### Phase 4 — Generate mode (alternative to install)

If no existing skill matches, offer to generate one. This path uses the bundled `skill-creator` skill:

1. Invoke `skill-creator` with a description of what the new skill should do.
2. `skill-creator` walks through the canonical structure (`SKILL.md` with frontmatter, optional `references/`, `assets/`, `scripts/`).
3. Save the new skill in `.claude/skills/<new-name>/`.
4. Frontmatter includes `sourcedBy: skill-finder/generated` and `generatedAt: <ISO>`.

### Phase 5 — Report

After install (or after printing install instructions for marketplace sources):
- Confirm the skill is in `.claude/skills/<name>/`.
- Note the `sourceCommit` pinned (the SKILL.md frontmatter is enriched with `sourcedBy`, `sourceCommit`, `sourceFetchedAt`).
- Suggest updating `nonoise.config.json` skills list to record the new entry (manual step for now — a future `skill-finder sync-config` subcommand can automate).
- If the installed skill has non-obvious prerequisites (e.g. a CLI, a package), flag them.

## Heuristics for stack detection

Quick helpers to infer the stack without asking every time. Check in this order:

1. `nonoise.config.json` → if `stack` field present, use it.
2. File presence:
   - `package.json` → Node/JS/TS; peek at `dependencies` for Angular/React/Vue/Next.
   - `*.csproj`, `*.sln`, `global.json` → .NET / C#.
   - `pyproject.toml`, `requirements.txt`, `setup.py` → Python.
   - `go.mod` → Go.
   - `Cargo.toml` → Rust.
   - `pom.xml`, `build.gradle` → Java / JVM.
   - `pubspec.yaml` → Flutter / Dart.
3. Ask the user to confirm or override.

Pass detected stacks to `fetch-registry.mjs --stack <csv>`.

## Rules

- **Whitelist-first**: only install from sources in the shipped `registry.json` or in the user's `skill-finder-custom-sources.json`. If the user points at an arbitrary URL, require explicit confirmation before treating it as a new custom source.
- **No LSP auto-install**: marketplace-json results for LSP plugins always print the `/plugin install` command, never execute it. LSP is user-gated (see `feedback_lsp_advisor_only.md`).
- **No destructive overwrites**: if `.claude/skills/<name>/` exists, refuse and ask the user for `--as <new-name>` or manual removal.
- **Pin source commit**: every installed skill records `sourceCommit` in its frontmatter for future `skill-finder update <name>` workflow (not implemented in v1).
- **Fall back to generate**: if no source matches AND the user doesn't want to point to a custom source, offer generate mode via `skill-creator`.

## Rate limiting

`fetch-registry.mjs` uses GitHub's anonymous API (60 req/hour). For power users:

```bash
export GITHUB_TOKEN=<your-token>
node fetch-registry.mjs ...
```

Bumps the limit to 5000/hour. Skill‑finder never requires a token — falls back to anonymous gracefully.

## Out of scope (v1)

- Web‑scrape indexers for `skills.sh` and `skillui.vercel.app` (sources registered but skipped).
- Signature verification or security scanning of installed skills (trust is based on the whitelist).
- `skill-finder update` / `skill-finder remove` subcommands (manual for now).
- Automatic stack detection from code contents (only filename heuristics).
