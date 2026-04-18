# superpowers (vendored)

This directory is **vendored from upstream** — do not edit files here in place.

- **Source**: https://github.com/obra/superpowers
- **Pinned commit**: see [`VENDOR.json`](./VENDOR.json)
- **License**: MIT — see [`LICENSE`](./LICENSE) (upstream copy)

## Scope

The whole upstream repo is vendored, scoped to the following directories:

- `skills/` — 14 superpowers skills (brainstorming, systematic-debugging, writing-plans, etc.)
- `agents/` — sub-agent definitions (`code-reviewer.md`)
- `commands/` — slash commands (`brainstorm`, `execute-plan`, `write-plan`)
- `hooks/` — session hooks (`session-start`, `run-hook.cmd`, `hooks.json`)

## Updating

Use the sync script at the repo root:

```bash
node scripts/sync-vendor.mjs superpowers              # re-sync
node scripts/sync-vendor.mjs superpowers --dry-run    # check for upstream changes without writing
node scripts/sync-vendor.mjs --all                    # sync every vendor
```

The script:

1. Reads `VENDOR.json` in this directory.
2. Clones upstream shallowly at the manifest's `ref`.
3. If the upstream HEAD differs from the pinned `commit`, wipes the scoped directories and copies the new upstream tree over.
4. Updates `commit` and `fetchedAt` in `VENDOR.json`.

If you need to patch a vendored skill, do it **upstream first**, then re-sync. Local patches belong in `packages/skills/<non-vendor-skill>/` or as overlay files managed by the scaffold.
