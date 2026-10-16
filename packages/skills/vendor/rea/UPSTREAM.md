# REA upstream snapshot

- Repository: https://github.com/morluto/rea
- Commit: `f9ccacca2cbf7c7f1c338cddd19160fc0a778074`
- npm package: `rea-agents@6.5.0`; MIT, copyright retained in LICENSE.
- Source: `.agents/skills/reverse-engineer-anything/` (entrypoint and all six reference files).
- NONoise adaptations: pin npm examples to 6.5.0; replace global setup/recovery instructions with project-only `rea-setup`; retain all analysis recipes, provider boundaries and evidence guidance.
- DISCLAIMER.md is preserved verbatim and describes target authorization and runtime-operation boundaries; it does not change the MIT license.

To refresh, review the exact upstream commit, copy the complete skill and legal notices, reapply project-only connection instructions, update REA_VERSION and validation evidence, then run the REA and skill compatibility tests. Do not run upstream `rea setup` during refresh.
