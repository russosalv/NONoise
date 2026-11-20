# Qwen/Qoder Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Regia's existing `qwen` executor work safely with either a compatible `qwen` or `qoder` CLI, and document that behavior throughout NONoise.

**Architecture:** Keep one stable executor identity (`qwen`) and add a capability-based resolver in Regia. The TypeScript control plane and shell launcher apply the same required-flag contract; launches record the selected CLI family so resumes never cross incompatible session stores. NONoise remains an installer/documentation consumer of Regia and does not gain a separate Qoder tool choice.

**Tech Stack:** TypeScript, Bash, Claude Code plugin test framework, Vitest, pnpm, Markdown.

**Spec:** `docs/superpowers/specs/2026-11-19-qwen-qoder-compatibility-design.md`

## Global Constraints

- Keep tool names, executor values, config keys, counts and `~/.claude/regia/qwen` storage under the stable identity `qwen`.
- Prefer compatible `qwen`, then compatible `qoder`; reject a command that is installed but lacks any required launcher flag.
- Resume with the CLI family recorded for that job; legacy jobs may infer it from the session root, but must never silently cross from one family to the other.
- Recognise `qwen`, `qoder` and `qodercli` processes as executor `qwen`.
- Do not add `qoder` to NONoise's AI-tool selection or Regia's executor/config enums.
- Preserve unrelated work, especially `packages/skills/vendor/graphify/` and the diverged `../claude-regia` checkout.
- Push only after all repository-specific and end-to-end verification passes.

## Review Focus

- Both commands installed but only Qoder compatible: select Qoder consistently in the TypeScript probe and shell launcher.
- Recorded resume family installed but now incompatible: fail with a useful message and leave no stale pid file.
- Legacy session ID appears under both roots: report ambiguity rather than guessing the wrong family.
- Process list contains interactive Qoder or shell text mentioning Qoder: do not count it as a Regia job.
- Session activity exists only under `~/.qoder/projects`: use it to prevent false stall termination.

---

### Task 1: Isolated, current repository workspaces

**Files:**
- No product files.

**Interfaces:**
- Consumes: `origin/main` from `russosalv/NONoise` and `russosalv/claude-regia`.
- Produces: clean feature worktrees/checkouts rooted at the latest remote main commits.

- [ ] **Step 1: Create an isolated NONoise worktree**

Use `superpowers:using-git-worktrees`, verify the selected worktree directory is ignored, fetch `origin`, and create a feature branch from current `origin/main` without touching the untracked graphify directory.

- [ ] **Step 2: Create an isolated Claude Regia worktree**

Fetch the existing clean reference clone and create a separate feature worktree from its latest `origin/main`; do not modify the diverged `../claude-regia` checkout.

- [ ] **Step 3: Verify both baselines**

Run each repository's fast test command before changes. Expected: exit 0; if a baseline fails, record it before implementation.

### Task 2: Capability-based Qwen-family resolver

**Files:**
- Create: `claude-regia/hooks/qwen-cli.ts`
- Modify: `claude-regia/hooks/esecutori.ts`
- Modify: `claude-regia/hooks/ponytail.ts`
- Modify: `claude-regia/hooks/doctor.ts`
- Test: `claude-regia/tests/qwen.test.ts`
- Test: `claude-regia/tests/orchestra-sciame.test.ts`
- Test: `claude-regia/tests/regia.test.tsx`

**Interfaces:**
- Consumes: `EngineInterface.process.run`, existing `StatoCli` and plugin dependency checks.
- Produces: `type ComandoQwen = 'qwen' | 'qoder'`, `type CliQwen = { comando: ComandoQwen; versione: string }`, `isHelpQwenCompatibile(help: string): boolean`, and `trovaCliQwen($: EngineInterface): Promise<CliQwen | undefined>`.

- [ ] **Step 1: Write failing resolver tests**

Add tests asserting: compatible Qwen wins; Qoder is used when Qwen is absent; incompatible Qwen falls through to compatible Qoder; neither compatible returns `undefined`; missing one required flag rejects the help text.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `claude plugin test . -- tests/qwen.test.ts`

Expected: FAIL because `hooks/qwen-cli.ts` and its exports do not exist.

- [ ] **Step 3: Implement the minimal resolver**

Require the exact long-option markers used by Regia: `--permission-mode`, `--strict-mcp-config`, `--session-id`, `--name`, `--cwd`, `--print`, `--resume`, `--model`, and `--reasoning-effort`. Probe `qwen` then `qoder` with bounded `--help` and `--version` calls and return the concrete command plus its first version line.

- [ ] **Step 4: Integrate availability, doctor and plugin eligibility**

Make `leggiCli` populate the existing `qwen` slot from `trovaCliQwen`; make the companion plugin check accept the same compatible family; update diagnostics to display `Qwen/Qoder` and the concrete version while preserving `/regia qwen` and config key names.

- [ ] **Step 5: Add failure-mode tests from Review Focus**

Assert mixed installations choose Qoder, an incompatible-only installation is unusable, plugin installation is attempted for compatible Qoder, and doctor/executor output names Qwen/Qoder without introducing a `qoder` executor value.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run: `claude plugin test . -- tests/qwen.test.ts tests/orchestra-sciame.test.ts tests/regia.test.tsx`

Expected: all selected tests pass.

- [ ] **Step 7: Commit the resolver slice**

Commit in Claude Regia with: `feat: resolve qwen executor through qwen or qoder`

### Task 3: Safe launch and resume through the selected family

**Files:**
- Modify: `claude-regia/script/qwen-esegui`
- Modify: `claude-regia/tests/qwen-esegui.sh`

**Interfaces:**
- Consumes: the required-flag contract from Task 2, job metadata files already stored beside `<nome>.sessione`.
- Produces: `<nome>.cli` containing exactly `qwen` or `qoder`; shell helpers that choose a compatible family and validate a recorded family.

- [ ] **Step 1: Add failing shell tests**

Extend the fake-CLI harness to cover Qwen-only, Qoder-only, incompatible-Qwen-plus-Qoder, fresh metadata write, resume reuse of the recorded family, recorded-family incompatibility, unambiguous legacy-root inference, ambiguous legacy roots, and pid cleanup on every early failure.

- [ ] **Step 2: Run the launcher suite and confirm RED**

Run: `bash tests/qwen-esegui.sh`

Expected: non-zero with Qoder/family-metadata cases failing.

- [ ] **Step 3: Implement compatible command selection**

In `script/qwen-esegui`, validate the same required long flags, prefer `qwen`, fall back to `qoder`, and invoke the selected command without changing the existing arguments or output/log locations.

- [ ] **Step 4: Implement family-safe resume metadata**

For new jobs write `<nome>.cli`. For resume, require the recorded family when present; for legacy jobs inspect `~/.qwen/projects/**/<session>.jsonl` and `~/.qoder/projects/**/<session>.jsonl`, accept exactly one matching family, fall back to normal resolution only when neither exists, and fail on ambiguity or recorded-family incompatibility. Ensure failures append a `fine` entry and remove `<nome>.pid`.

- [ ] **Step 5: Run the launcher suite and confirm GREEN**

Run: `bash tests/qwen-esegui.sh`

Expected: `ok` and exit 0.

- [ ] **Step 6: Commit the launcher slice**

Commit in Claude Regia with: `feat: preserve qwen or qoder family on resume`

### Task 4: Qoder process and session activity tracking

**Files:**
- Modify: `claude-regia/hooks/parsers.ts`
- Modify: `claude-regia/hooks/sorveglianza.ts`
- Test: `claude-regia/tests/qwen.test.ts`
- Test: `claude-regia/tests/sorveglianza.test.ts`

**Interfaces:**
- Consumes: `<nome>.cli` from Task 3 and existing `ProcessoCodex`/stall-check APIs.
- Produces: Qwen-family process parsing for `qwen | qoder | qodercli`; exact-root session activity for recorded jobs and newest activity across roots only for legacy jobs.

- [ ] **Step 1: Add failing parser tests**

Assert headless `qoder` and `qodercli` processes, directly and behind `timeout`, become executor `qwen`; interactive processes and `bash -c` mentions do not; model, effort, name and cwd remain parsed.

- [ ] **Step 2: Add failing stall tests**

Assert a Qoder session file newer than the log prevents termination, recorded `qwen` does not consult Qoder's root, and a legacy job uses the newest matching session activity across both roots.

- [ ] **Step 3: Run focused tests and confirm RED**

Run: `claude plugin test . -- tests/qwen.test.ts tests/sorveglianza.test.ts`

Expected: Qoder parser/activity assertions fail.

- [ ] **Step 4: Implement process parsing**

Generalise the existing Qwen row parser to accept basenames `qwen`, `qoder`, and `qodercli` while requiring headless `-p`/`--print` and preserving the returned executor as `qwen`.

- [ ] **Step 5: Implement family-aware session activity**

Read `<nome>.cli` when present and search only its matching root. For legacy jobs search both roots and use the greatest mtime among matching session files. Keep the log mtime as the floor.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run: `claude plugin test . -- tests/qwen.test.ts tests/sorveglianza.test.ts`

Expected: all selected tests pass.

- [ ] **Step 7: Commit the tracking slice**

Commit in Claude Regia with: `feat: track qoder jobs as qwen executor`

### Task 5: Regia user-facing documentation

**Files:**
- Modify: `claude-regia/README.md`
- Modify: `claude-regia/.claude-plugin/plugin.json`
- Modify: Regia hook/tool descriptions containing user-visible Qwen-only wording as identified by `rg -n "Qwen|qwen" hooks README.md .claude-plugin`.
- Test: existing Regia string/snapshot tests affected by wording.

**Interfaces:**
- Consumes: stable `qwen` tool/config names and concrete runtime behavior from Tasks 2–4.
- Produces: documentation that calls the executor Qwen/Qoder and explains selection, compatibility probing, resume-family persistence and unchanged command names.

- [ ] **Step 1: Update documentation and exact expected strings**

Describe `qwen` and `qoder` as two compatible command families for one executor; explain that tool/config names stay `qwen`, compatible Qwen is preferred, and resume uses the creating family.

- [ ] **Step 2: Run the complete Regia verification**

Run: `claude plugin validate .`

Run: `claude plugin test .`

Run: `bash tests/qwen-esegui.sh && bash tests/copilot-esegui.sh`

Expected: every command exits 0.

- [ ] **Step 3: Commit the Regia documentation slice**

Commit in Claude Regia with: `docs: describe qwen and qoder compatibility`

### Task 6: NONoise documentation and generated output

**Files:**
- Modify: `NONoise/README.md`
- Modify: `NONoise/docs/regia.md`
- Modify: `NONoise/docs/installation.md`
- Modify: `NONoise/docs/skills-catalog.md`
- Modify: `NONoise/packages/create-nonoise/src/assets/development-modes-block.md`
- Modify: `NONoise/packages/create-nonoise/src/native-vendor.ts`
- Modify: any additional authoritative Qwen-only Regia wording found by focused `rg`.
- Modify: `NONoise/packages/create-nonoise/test/snapshot/__snapshots__/canonical.test.ts.snap`

**Interfaces:**
- Consumes: the completed Regia runtime behavior.
- Produces: consistent NONoise documentation and scaffolded context text saying Regia's stable `qwen` executor uses a compatible `qwen` or `qoder` command.

- [ ] **Step 1: Add/update focused expectations before source wording**

Where tests assert generated development-mode or native-vendor wording, update/add the expectation for `Qwen/Qoder` and the unchanged `qwen` executor identity; do not edit the large snapshot manually yet.

- [ ] **Step 2: Run focused NONoise tests and confirm RED**

Run the narrow native-vendor/assets/snapshot tests located with `rg -n "development-modes|native-vendor|canonical" packages/create-nonoise/test`.

Expected: wording assertion or snapshot mismatch.

- [ ] **Step 3: Update NONoise sources and docs**

Change only Regia/Qwen claims: companion installation occurs for either compatible command; the runtime lives in Regia; Qoder is not a separate NONoise AI tool.

- [ ] **Step 4: Rebuild bundled assets and refresh snapshots deliberately**

Run: `pnpm --filter create-nonoise run build`

Run: `pnpm --filter create-nonoise exec vitest run packages/create-nonoise/test/snapshot/canonical.test.ts -u` or the repository-correct relative pattern discovered in Step 1.

Review the snapshot diff and confirm every change is the intended Qwen/Qoder wording.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Re-run the focused tests from Step 2. Expected: all pass.

- [ ] **Step 6: Commit the NONoise slice**

Commit in NONoise with: `docs: document qoder support for regia qwen executor`

### Task 7: Full verification, review and push

**Files:**
- No new product files; only fixes required by verification/review.

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: verified commits pushed to both repositories' `main` branches.

- [ ] **Step 1: Run full NONoise verification**

Run: `pnpm --filter create-nonoise exec vitest run`

Run: `pnpm -r run typecheck`

Expected: exit 0 for both.

- [ ] **Step 2: Invoke verification-before-completion**

Use `superpowers:verification-before-completion` and retain fresh command evidence for both repositories.

- [ ] **Step 3: Request whole-change code review**

Use `superpowers:requesting-code-review` across the Claude Regia and NONoise diffs. Address only findings verified against the approved spec, then rerun affected and full tests.

- [ ] **Step 4: Confirm clean, scoped commits**

Inspect `git status`, `git diff origin/main...HEAD`, and commit logs in both repositories. Confirm no unrelated graphify or historical Regia checkout files are included.

- [ ] **Step 5: Push Claude Regia**

Fetch `origin`, require that the feature branch still fast-forwards `origin/main`, then push the verified Regia HEAD to `origin/main`.

- [ ] **Step 6: Push NONoise**

Fetch `origin`, require that the feature branch still fast-forwards `origin/main`, then push the verified NONoise HEAD to `origin/main`.

- [ ] **Step 7: Synchronise the user's visible NONoise checkout**

Fast-forward the original NONoise `main` checkout to the pushed commit without touching its untracked `packages/skills/vendor/graphify/` directory.
