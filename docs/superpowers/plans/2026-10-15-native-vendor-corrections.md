# Native vendor corrections implementation plan

**Goal:** Implement and validate /brief/GOAL2.md in the disposable container.
**Architecture:** Keep the existing synchronous command runner and installer orchestration. Add bounded network retries, actual project-scoped Claude installs and registry verification. Use the official standalone skill-creator plugin. Refresh embedded upstream copies while retaining historical migration hashes.
**Tech stack:** TypeScript, Node.js, pnpm, Vitest, real vendor CLIs.
**Constraints:** Local commits only; no push/publish/tag; preserve assertions and user files. No confirmation pauses, per explicit user instruction.

## Tasks
- [ ] Add regression tests in native-vendor.test.ts for Claude installation, distinct marketplaces, current-project registry checks, obsolete example-skills removal, retryable DNS/timeouts/5xx and immediate permanent failures. Observe RED.
- [ ] Implement in native-vendor.ts: shared Claude plugin catalog, three attempts with 1s/2s backoff for external installers only, idempotent marketplace/install verification, project-scoped obsolete-plugin removal and doctor recovery commands. Run suite, commit.
- [ ] Execute node scripts/sync-vendor.mjs --all; update embed layout, preserve historical hashes, add current hashes, check all concrete superpowers references. Test updated embed and migration; commit assets and documentation.
- [ ] Build/typecheck/full Vitest; npm pack and global tgz install. Scaffold p2-claude, p2-copilot, p2-all, p2-embed; inspect installed registries and doctor. Simulate first-attempt DNS with PATH shim delegating to the real npx on retry.
- [ ] Create real published 1.6.0 and pre-fix 1.7.0 projects, upgrade twice, compare full file hashes, verify removal of legacy folders/example declaration and preservation of user files. Independent review, final evidence report, local commit.

## Review focus
Registry entries for a different project must not suppress installation; non-network failures must not retry; stdout errors and spawn timeouts must be recognized; old 18-folder hashes must survive sync; repeated upstream installation must not change project bytes.

## Review decisions
- Tighten retry classification: plugin/dependency resolution failures are permanent. Regression tests reproduced the failure before correction.
- Apply hash-based cleanup to embed upgrades too, preserving modified/user files.
- Retain the original native Superpowers 5.0.7 pin. The brief requests refreshed embed snapshots (7.0.0), not a native dependency version migration; avoids silently changing existing native installs. Both copies contain all referenced names.
- Upstream whitespace is preserved byte-for-byte; diff-check warnings inside vendor/lean copies are provenance, not local edits.
