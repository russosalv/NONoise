---
name: publish-nonoise
description: End-to-end release flow for the `create-nonoise` CLI — creates a changeset, runs `pnpm run version` to bump `packages/create-nonoise/package.json` + CHANGELOG, updates the GitHub Release tarball URL in both READMEs, commits + pushes to `main` (which triggers `auto-tag.yml` → `release.yml` → npm publish with provenance), builds and packs the tarball locally, creates the matching GitHub Release with the `.tgz` attached, then polls the workflow until complete. Use whenever the user says "bump create-nonoise", "rilascia nuova versione", "pubblica", "new version", "release 0.X.Y", "bump and publish", "fai il bump", or asks to cut a new version of the CLI. Scoped to THIS monorepo only — do not invoke in scaffolded projects. Also handles the npm-unpublish 24h lock failure mode by surfacing the error and suggesting `gh run rerun --failed`.
---

# publish-nonoise — release flow for the `create-nonoise` CLI

The only package this repo publishes is `packages/create-nonoise/`. Everything here is scoped to that package. **Do not run this skill inside a scaffolded project** — it targets the monorepo's own release plumbing.

## When to use

- User says: "bump create-nonoise", "fai il bump", "rilascia", "pubblica", "publish new version", "release 0.X.Y", "bump and publish".
- User asks for a new CLI version after a batch of merged features/fixes.
- User wants to retry a failed publish.

## When NOT to use

- Publishing from a scaffolded NONoise project (no such package there).
- Publishing other workspace packages (`@nonoise/templates-internal`, `@nonoise/skills-internal`) — these are ignored by changesets and never go to npm.
- Hotfixing by hand-editing `package.json` without a changeset. Changesets own the CHANGELOG; bypassing them breaks history.

## Why this skill exists

The release flow has sharp edges that are easy to trip over:

1. **`pnpm version` vs `pnpm run version`** — the bare command runs native npm's version bumper and does the wrong thing. Only `pnpm run version` runs the changesets script defined in the root `package.json`.
2. **Two README URLs bump in lockstep with the version.** The "GitHub Release fallback" block in `README.md` and `packages/create-nonoise/README.md` embeds the new version twice (path segment + filename). Missing the bump leaves users with a 404 fallback link until the next doc change.
3. **npm unpublish → 24h lock.** If the user ran `npm unpublish` recently, `npm publish` returns HTTP 403 with message `create-nonoise cannot be republished until 24 hours have passed`. The tag and GitHub Release go through fine; only the npm step fails. The correct remedy is to wait out the lock and rerun just the failed job.
4. **The GitHub Release is the fallback install path.** The `.tgz` attached to the release is the exact same artifact npm would serve. Documented in `README.md` so users stay unblocked when npm is unavailable for any reason.

Workflow order matters — push first, pack + attach second. Pushing is what creates the `v<VERSION>` tag; the release must attach to an existing tag.

## Prerequisites

Before starting, verify:

```bash
git status                    # working tree must be clean
git rev-parse --abbrev-ref HEAD   # must be "main"
git fetch origin && git status    # must be in sync with origin/main
gh auth status                # gh CLI must be authenticated
```

If the tree is dirty, stop and ask the user whether to include the changes in this release or stash them first. If not on `main`, stop — this skill only releases from `main`.

## Workflow

### 1. Decide the bump type

Default to **patch**. Pick **minor** only if there are user-visible feature additions (new CLI flags, new bundled skills, new template options) and the user hasn't overridden. **Major** requires the user to explicitly say "breaking" or "major bump".

If the user didn't specify, inspect commits since the last tag to inform the recommendation:

```bash
PREV_TAG=$(git describe --tags --abbrev=0)
git log --oneline "$PREV_TAG"..HEAD
```

### 2. Create the changeset

Write a new file at `.changeset/<kebab-case-summary>.md`:

```markdown
---
"create-nonoise": patch
---

<one-paragraph summary of what's included, derived from the commits listed above>
```

Use one continuous paragraph for the body (that's the convention in this repo's existing CHANGELOG). Mention the main user-visible changes; skip pure test/snapshot churn.

### 3. Apply the changeset (bump version)

```bash
pnpm run version
```

**Critical**: use `pnpm run version`, not `pnpm version`. The bare form invokes native npm's version bumper and will not run the changesets script. After this command:

- `packages/create-nonoise/package.json` version is bumped.
- `packages/create-nonoise/CHANGELOG.md` gets a new section.
- The changeset file you wrote is deleted.

Capture the new version for subsequent steps:

```bash
NEW_VERSION=$(node -p "require('./packages/create-nonoise/package.json').version")
echo "Bumping to $NEW_VERSION"
```

### 4. Update the GitHub Release fallback URL in both READMEs

The URL appears twice per file — once in the path segment `/v<VERSION>/`, once in the filename `create-nonoise-<VERSION>.tgz`. Update both occurrences in both files:

- `README.md` (repo root) — inside the "GitHub Release fallback" blockquote under Quickstart
- `packages/create-nonoise/README.md` — same block, same content

Use Edit/Grep to find the previous version's URL and swap it in one pass.

### 5. Commit and push

```bash
git add packages/create-nonoise/package.json packages/create-nonoise/CHANGELOG.md README.md packages/create-nonoise/README.md
git commit -m "chore(release): create-nonoise $NEW_VERSION"
git push origin main
```

The push triggers two workflows:
- `.github/workflows/auto-tag.yml` — sees the version changed, creates tag `v$NEW_VERSION`, pushes it, then calls `release.yml` via `workflow_call`.
- `.github/workflows/release.yml` — runs CI (typecheck, build, test), packs the tarball, and runs `npm publish --access public --provenance`.

**Do not proceed to step 6 until the tag exists on origin.** The GitHub Release needs the tag to attach to:

```bash
until git ls-remote origin "refs/tags/v$NEW_VERSION" | grep -q refs/tags; do sleep 5; done
```

### 6. Build and pack the tarball locally

```bash
(cd packages/create-nonoise && pnpm pack --pack-destination "$(git rev-parse --show-toplevel)")
```

The subshell keeps the `cd` local, so it works whether the caller runs it as one bash call or splits the skill's steps across invocations.

`prepack` runs the build automatically (tsc + `scripts/bundle-assets.mjs`), so bundled `templates/` and `skills/` are populated before packing. Output: `create-nonoise-$NEW_VERSION.tgz` at repo root (gitignored by `*.tgz` in `.gitignore`).

### 7. Create the GitHub Release with the tarball attached

```bash
TGZ="$(git rev-parse --show-toplevel)/create-nonoise-$NEW_VERSION.tgz"

gh release create "v$NEW_VERSION" "$TGZ" \
  --title "create-nonoise $NEW_VERSION" \
  --notes "$(cat <<EOF
## create-nonoise $NEW_VERSION

<paste the CHANGELOG entry you wrote in step 2, or a short paraphrase>

### Installation

**npm (when available)**

\`\`\`bash
npm create nonoise my-project
# or
npx create-nonoise my-project
\`\`\`

**GitHub Release tarball (fallback)**

\`\`\`bash
npx https://github.com/russosalv/NONoise/releases/download/v$NEW_VERSION/create-nonoise-$NEW_VERSION.tgz my-project
\`\`\`

Both commands produce an identical scaffold — the tarball attached here is bit-for-bit the same artifact that goes to the npm registry (signed with GitHub Actions provenance in the CI pipeline).
EOF
)"
```

### 8. Poll the publish workflow to completion

```bash
gh run list --limit 3 --workflow "Auto-tag on version bump"
```

Wait until the most recent run for this commit is `completed`. A full run typically takes ~2 minutes. Use a 60-second poll interval, cap at 10 minutes total.

On **success**: report the npm URL — `https://www.npmjs.com/package/create-nonoise/v/$NEW_VERSION`. Users can now `npx create-nonoise@$NEW_VERSION` or `npm create nonoise`.

On **failure**: fetch the failing step's log and hand it to the user:

```bash
FAILED_RUN=$(gh run list --limit 1 --workflow "Auto-tag on version bump" --json databaseId --jq '.[0].databaseId')
gh run view "$FAILED_RUN" --log-failed | tail -60
```

Then classify the failure (see below).

## Known failure modes

### Error: `403 Forbidden ... cannot be republished until 24 hours have passed`

Cause: someone ran `npm unpublish create-nonoise` (or an old version) within the last 24 hours. npm's registry policy locks the package name for exactly 24h from the unpublish moment, no override possible — not even with `--force`, different tokens, or a new version number. The lock applies to the name, not the version.

State after this failure: the commit is on `main`, the tag `v<VERSION>` exists on origin, the GitHub Release is live with the tarball. Only the npm registry entry is missing.

Remedy: wait out the lock, then retry only the failed job (the `tag` job and the GH release creation are already done — no need to re-push or re-tag):

```bash
gh run rerun <RUN_ID> --failed
```

If the user is time-sensitive, remind them that the GitHub Release tarball install (`npx https://github.com/.../create-nonoise-<VERSION>.tgz`) already works — it's documented in the README as the fallback and doesn't depend on npm.

### Error: snapshot test failure in CI

Cause: a bundled skill or template changed but the snapshot wasn't regenerated. Fix locally before retrying:

```bash
pnpm --filter create-nonoise exec vitest run -u
```

Review the diff deliberately — snapshot drift often hides unintentional changes. Commit the updated snapshots as a follow-up and re-cut the release.

### Error: `Verify NPM_TOKEN is set` step fails

Cause: the `NPM_TOKEN` secret was rotated or removed from the GitHub repository. Regenerate an npm Automation token and re-add it under Settings → Secrets and variables → Actions.

## Retrying after any failure

If the tag was created but publish failed:

```bash
gh run rerun <RUN_ID> --failed
```

If the tag was not created (e.g., push itself failed), fix the underlying issue and push again. The auto-tag workflow is idempotent — it checks if the tag already exists and exits cleanly if so.

## Verification after success

```bash
npm view create-nonoise@$NEW_VERSION version     # should echo $NEW_VERSION
curl -sI "https://github.com/russosalv/NONoise/releases/download/v$NEW_VERSION/create-nonoise-$NEW_VERSION.tgz" | head -1
# HTTP/1.1 302 Found (or 200 after the redirect follows)
```

Both paths should resolve. If npm is slow to propagate, wait 30s and retry `npm view`.

## Tell the user

When the publish completes successfully, report:
- New version number
- Commit SHA
- Tag URL on GitHub
- Release URL on GitHub
- npm package URL

When a failure hits the 24h lock, explicitly reassure them: the tag, the GitHub Release, and the fallback install all work — only the npm registry entry is missing, and that's a timed lock, not a bug.
