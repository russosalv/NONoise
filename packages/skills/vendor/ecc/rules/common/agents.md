<!-- Source: https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/rules/common/agents.md | Commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29 | MIT | Adapted for NONoise; see UPSTREAM.md. -->

# Agent coordination

NONoise installs a pinned selection of ECC agents with bare names. Read the generated .nonoise/ecc/index.md for the installed roster and stack rules. Use the harness agent tool when available; otherwise apply the agent instructions directly and disclose that no independent review ran.

Use security-reviewer, pr-test-analyzer and silent-failure-hunter before delivery, plus csharp-reviewer or typescript-reviewer when installed. Use database-reviewer for SQL and migrations, spec-miner for brownfield specifications, build-error-resolver for build failures, code-simplifier and refactor-cleaner for scoped cleanup.

Planning uses superpowers:writing-plans; architecture decisions use arch-decision and Haft; testing uses superpowers:test-driven-development and atr. E2E work uses e2e-testing when installed.

Delegate only when appropriate to the user's task and harness permissions. Collect and integrate every delegated result before reporting completion. Do not redelegate work that fits one agent's context.
