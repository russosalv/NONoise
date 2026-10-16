# Issue #6 — scaffold hygiene outcome

Date: 2026-10-16. Worktree: `NONoise-native-wt-hygiene`, branch:
`fix/scaffold-hygiene`. Starting commit: `36c0a9a`.

## Changes and rationale

### Graphify backups

The installed graphifyy 0.9.91 source creates rolling JSON backups in
`graphify/install.py::_write_settings_with_backup`: before changing existing
settings it copies the original to `<name>.graphify-bak`. Claude settings and
Codex hooks call this helper. NONoise's `preserveInstructionFiles` only restores
Markdown instructions in memory; it does not create these JSON backups.

Both scaffold templates now ignore `*.graphify-bak`. Ignoring is more robust
than deleting backups after one installer invocation: it covers every tool,
different original contents, interrupted installation, and later upstream
reinstalls without destroying recovery data. Existing tracked backups and
existing projects' ignore files are not migrated by this change.

The new tests use the real scaffold and Git initial commit, simulating only
external installers. They prove that settings remain tracked, backups stay on
disk but are absent from HEAD, and later backups stay ignored, for both templates.

### Native → embed Impeccable

No installer fix was justified. Native uses unpinned `npx impeccable install`
and the upstream provider bundle. Embed uses the checked-in snapshot at
`abf5779cabc20147fd9c013fa4705088c200bf8a`, whose skill version is 4.5.2.

A real Claude-provider install with `impeccable@4.6.0` in a temporary Git project
produced 58 files: 57 shared paths plus the downloaded engine binary. Compared
with the embedded snapshot, 40 shared files were byte-identical and 17 differed.
Differences include version 4.6.0 → 4.5.2, engine version, changed reference
instructions, and provider paths versus plugin paths such as
`${CLAUDE_SKILL_DIR}` / `<skill-base-dir>`.

Calling the built `installVendor` with `overwrite: true`, exactly as embed
upgrade does, produced 17 changed files (74 insertions, 77 deletions), with no
file-mode changes. After committing that fixture state, repeating the same call
left `git diff --exit-code` clean. Identical bytes do not create Git changes even
if copied again. Native-only files, including the engine binary, were preserved.
The result establishes expected distribution/version differences for the tested
versions; it does not reconstruct the reporter's original unrecorded native
bundle. User-facing expectations are documented in `docs/installation.md`.

Sources: [upstream install instructions](https://github.com/pbakaus/impeccable),
[embedded revision](https://github.com/pbakaus/impeccable/tree/abf5779cabc20147fd9c013fa4705088c200bf8a/plugin/skills),
and the local `packages/skills/vendor/impeccable/VENDOR.json`.

### Read-only doctor

`doctor()` now scans selected skill roots, including Codex's `.agents` and
`.codex` and Copilot's `.github` and `.copilot`, using `lstat` to detect links
before testing their targets. It reports the relative path, target and repair
guidance for missing targets and link cycles. It checks nested directories and
a symlink at the skill root, skips absent optional roots, and does not recurse
through valid directory links. Other filesystem failures are reported as
inspection failures rather than mislabeled as broken targets.

The logic change in `native-vendor.ts` is confined to `doctor()` plus its required
filesystem imports. Plugin/skill installer logic and all other files reserved
for the parallel developer were left untouched. Eleven new doctor cases cover
selected roots, embed mode, nested links, root links, cycles, healthy links,
unselected tools and preservation of links/configuration. Independent review
found no actionable issues.

## Verification

Tests were written and run before implementation:

```bash
pnpm --filter create-nonoise exec vitest run \
  test/unit/scaffold-hygiene.test.ts test/unit/doctor-symlinks.test.ts
```

Before the fix: 11 failed, 2 passed, with failures showing committed backups or
missing broken-link diagnostics. After the fix: all 13 passed.

Required checks:

| Command | Result |
| --- | --- |
| `pnpm --filter create-nonoise run build` | Passed; TypeScript and assets bundled |
| `pnpm --filter create-nonoise exec vitest run` | Passed: 18 files, 195 tests |
| `pnpm -r run typecheck` | Passed |
| `git diff --check` | Passed for implementation and documentation |

The first full-suite run had 194 passing tests and one expected canonical
snapshot failure. Running
`pnpm --filter create-nonoise exec vitest run test/snapshot/canonical.test.ts -u`
updated only the `.gitignore` content snapshot: one added `*.graphify-bak` line.
The file-tree snapshot and all skill content snapshots are unchanged.

Impeccable reproduction (use a disposable initialized Git project):

```bash
git init -b main
npx --yes impeccable@4.6.0 install --yes --providers=claude --scope=project
git add .claude/skills/impeccable
git commit -m 'test: native impeccable fixture'
# Import dist/skill-installer.js from the built NONoise checkout and call:
# await installVendor({ vendorSourcePath: '<checkout>/packages/skills/vendor/impeccable',
#   projectPath: process.cwd(), namespace: 'impeccable',
#   installClaudeSpecific: true, overwrite: true });
git diff --stat
git diff --summary
git add .claude/skills/impeccable
git commit -m 'test: embedded impeccable fixture'
# Repeat the same installVendor call.
git diff --exit-code
```

As required by `CLAUDE.md`, `graphify update .` completed successfully and
refreshed the tracked graph artifacts. It reported non-blocking warnings about
the unavailable SQL parser, an existing Luau syntax-error fixture, and files
with no extractable symbols. Generated transient caches are excluded from the
deliverable; the four refreshed tracked graph files remain separate from the
implementation changes.

## Commit limitation

No push was attempted. Creating the first requested commit was blocked before
staging: Git cannot create
`/home/russosalv/DEV/NONoise-native/.git/worktrees/NONoise-native-wt-hygiene/index.lock`
because that Git metadata directory is mounted read-only in this session.
The sandbox does not permit approval escalation. No other worktree or branch
was modified. The changes are ready for commits, but the commit criterion is
not fulfilled in this environment.

Suggested commit split once Git metadata is writable:

1. `fix(scaffold): exclude graphify backups from initial commits` — both template
   ignore rules, `scaffold-hygiene.test.ts`, and the one-line canonical snapshot.
2. `fix(doctor): report broken skill symlinks` — `doctor()` and filesystem imports,
   plus `doctor-symlinks.test.ts`.
3. `docs: explain vendor mode changes and record issue 6 results` — installation
   guide and this report.
4. `chore(graphify): refresh graph after scaffold hygiene fixes` — the four tracked
   generated graph artifacts only.
