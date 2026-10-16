# ECC agents, rules and skills implementation plan

> Execute inline with superpowers:executing-plans; final independent review.

**Goal:** Implement the approved specification at `/brief/GOAL5.md` completely.
**Architecture:** One pinned, adapted ECC source tree and a selection manifest. Pure TypeScript emitters produce harness files; SHA-256 ownership protects upgrades and powers doctor. Existing NONoise skill and managed-instruction paths remain the integration points.
**Tech stack:** Node, TypeScript, Vitest, Markdown/YAML and TOML.
**Constraints:** ECC commit b92f181b3b748d1abbc2afd94af6aa7d8c8fca29, MIT, manual updates only; no hooks, duplicated workflows, push, tags or publication. User explicitly requests autonomous execution with no confirmation gates. Work directly on the supplied isolated disposable branch.

## Review focus
- Existing untracked or edited files and symlink ancestors must never be overwritten.
- Missing manifests on 1.6/1.7 projects must still allow adding new files safely.
- Angular needs TypeScript rules; no-stack must exclude language material.
- Harness metadata, quoting and relative rule links must survive conversion.
- A repeated upgrade must leave bytes and ownership unchanged, including conflicts.

## Tasks
- [ ] Snapshot: select 10 agents, 15 skills and five rule groups; exclude hook instructions; record every source and adaptation. Build a manual git-object-based updater with preview diff and reproducibility check.
- [ ] Conversion/selection: test parseStack, selectEcc and renderEccFiles against actual YAML/TOML expectations, then implement. Preserve Claude tools; map Copilot tools; Codex standalone agents inherit model/permissions.
- [ ] Installation: test missing/edited files, repeated upgrades, symlinks and missing ownership; implement installEcc/doctorEcc using SHA-256. Connect scaffold, flags/prompts/config and upgrade. Protect modified existing NONoise skills using shipped historical hashes.
- [ ] Workflow: update Polly, ATR, reverse engineering, sprint manifest, verification loop, template managed blocks, catalog, README and 1.7.0 changelog.
- [ ] Verification: full npm test/typecheck/build, real /projects/p7-* scaffolds, npm 1.6.0 upgrade, repeated upgrade, CLI offline discovery/validation; record exact limits. Final review and fixes, graphify update if available, final local commit and Italian report <=40 lines in /out/final5.md.
