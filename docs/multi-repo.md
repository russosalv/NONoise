# Multi-repo workspaces

A NONoise multi-repo workspace is a single scaffolded project that holds one or more Git sub-repositories under `repos/<path>/`. It is useful when a feature spans multiple repos you want to align branch-by-branch — typically when your bug-triage tool (e.g. Paseo) treats the workspace as a single unit.

## Detection

A project is multi-repo when either:

- `repositories.json` exists at project root, or
- `nonoise.config.json` has `"workspace": "multi-repo"`.

## Layout

```
my-workspace/
├─ .claude/              # skills, agents, commands, hooks (workspace-wide)
├─ .nonoise/             # scaffold artefacts
├─ repositories.json     # declarative list of sub-repos
├─ repos/                # sub-repos live here
│  ├─ backend/           # = repositories.json entry { path: "backend" }
│  └─ frontend/          # = repositories.json entry { path: "frontend" }
├─ scripts/              # workspace-level scripts
│  ├─ clone-all.sh/.ps1
│  ├─ switch-branch.sh/.ps1
│  └─ pull-all.sh/.ps1
├─ CLAUDE.md
├─ AGENTS.md
└─ …
```

## `repositories.json`

Array of `{ name, path, url, branch? }` entries. The scaffold does not auto-clone sub-repos unless the user opts in; `./scripts/clone-all.(sh|ps1)` clones any entry whose working directory under `repos/<path>/` is empty.

## Scripts

- **`clone-all`** — iterates `repositories.json`, clones each entry into `repos/<path>/` if absent.
- **`switch-branch <branch>`** — switches every sub-repo to the given branch (creates tracking branch if needed). Aligns the workspace so tools like Paseo treat it as a single unit.
- **`pull-all`** — fast-forwards every sub-repo on its current branch.

Each script ships in both `.sh` (POSIX) and `.ps1` (PowerShell) flavours.

## Skills policy

Skills are installed **at workspace root** (`.claude/skills/`), not per sub-repo. Open the workspace in your AI tool to have them all available everywhere. If a specific sub-repo needs its own copy of `.claude/` (e.g. a sub-repo that will later spin out as an independent project), copy the directory in by hand — the framework does not force per-sub-repo duplication.

## Paseo alignment

Aligning all sub-repos on the same branch via `switch-branch` lets Paseo treat the workspace as one unit during bug triage. When a Paseo task spans multiple repos, align first, work second.

## Relationship to Polly

Polly detects multi-repo at the top of her output (*"This is a multi-repo workspace — see `docs/multi-repo.md` for scripts and policy."*) and does not walk through setup herself. The advisor's single-message output is not the place for a multi-step workspace bootstrap; that lives here.
