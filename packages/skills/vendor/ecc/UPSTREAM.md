# ECC snapshot

Repository: https://github.com/affaan-m/ECC
Commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29
License: MIT (see LICENSE). Manual snapshot; no plugin, installer or automatic updates.

Refresh: `node scripts/update-ecc.mjs /path/to/ECC <commit>`; preview with `--dry-run`, verify reproducibility with `--check`. The source clone is read-only. Review both the complete diff and scripts/ecc-adapt.mjs before committing.

## Adaptations

- Every copied file records its upstream path and commit.
- Hook rule files are excluded; legacy-style uses instruction references, verification-loop complements Superpowers.
- ECC planning/TDD/review/onboarding/ADR/test references route to NONoise/Superpowers or included agents and skills. No ECC orchestration, learning, dashboard, hook or duplicate lifecycle system is installed.
- common/agents.md describes only this selection. Non-imported reviewer and related-skill dependencies are removed.
- spec-miner writes docs/architecture/specs/<capability>/spec.md and retains read-only shell guardrails; no OpenSpec dependency.
- TypeScript reviewer uses its included React checklist; security/database reviewers use included guidance.
- Harness emitters convert metadata, rule paths and relative links; Claude model is inherited, Copilot/Codex do not inherit Anthropic model names. Codex permissions inherit from the parent.
- Stack mapping is recorded in manifest.json: empty eligibility means always; Angular includes TypeScript and web rules; cross-stack API/database/contract skills require any stack, E2E requires a JS/web stack.

## Files copied

- LICENSE
- agents/build-error-resolver.md
- agents/code-simplifier.md
- agents/csharp-reviewer.md
- agents/database-reviewer.md
- agents/pr-test-analyzer.md
- agents/refactor-cleaner.md
- agents/security-reviewer.md
- agents/silent-failure-hunter.md
- agents/spec-miner.md
- agents/typescript-reviewer.md
- rules/angular/coding-style.md
- rules/angular/patterns.md
- rules/angular/security.md
- rules/angular/testing.md
- rules/common/agents.md
- rules/common/code-review.md
- rules/common/coding-style.md
- rules/common/development-workflow.md
- rules/common/git-workflow.md
- rules/common/patterns.md
- rules/common/performance.md
- rules/common/security.md
- rules/common/testing.md
- rules/csharp/coding-style.md
- rules/csharp/patterns.md
- rules/csharp/security.md
- rules/csharp/testing.md
- rules/typescript/coding-style.md
- rules/typescript/patterns.md
- rules/typescript/security.md
- rules/typescript/testing.md
- rules/web/coding-style.md
- rules/web/design-quality.md
- rules/web/patterns.md
- rules/web/performance.md
- rules/web/security.md
- rules/web/testing.md
- skills/angular-developer/SKILL.md
- skills/angular-developer/references/angular-animations.md
- skills/angular-developer/references/angular-aria.md
- skills/angular-developer/references/cli.md
- skills/angular-developer/references/component-harnesses.md
- skills/angular-developer/references/component-styling.md
- skills/angular-developer/references/components.md
- skills/angular-developer/references/creating-services.md
- skills/angular-developer/references/data-resolvers.md
- skills/angular-developer/references/define-routes.md
- skills/angular-developer/references/defining-providers.md
- skills/angular-developer/references/di-fundamentals.md
- skills/angular-developer/references/e2e-testing.md
- skills/angular-developer/references/effects.md
- skills/angular-developer/references/hierarchical-injectors.md
- skills/angular-developer/references/host-elements.md
- skills/angular-developer/references/injection-context.md
- skills/angular-developer/references/inputs.md
- skills/angular-developer/references/linked-signal.md
- skills/angular-developer/references/loading-strategies.md
- skills/angular-developer/references/mcp.md
- skills/angular-developer/references/navigate-to-routes.md
- skills/angular-developer/references/outputs.md
- skills/angular-developer/references/reactive-forms.md
- skills/angular-developer/references/rendering-strategies.md
- skills/angular-developer/references/resource.md
- skills/angular-developer/references/route-animations.md
- skills/angular-developer/references/route-guards.md
- skills/angular-developer/references/router-lifecycle.md
- skills/angular-developer/references/router-testing.md
- skills/angular-developer/references/show-routes-with-outlets.md
- skills/angular-developer/references/signal-forms.md
- skills/angular-developer/references/signals-overview.md
- skills/angular-developer/references/tailwind-css.md
- skills/angular-developer/references/template-driven-forms.md
- skills/angular-developer/references/testing-fundamentals.md
- skills/api-design/SKILL.md
- skills/brownfield-retrospective/SKILL.md
- skills/change-impact/SKILL.md
- skills/code-tour/SKILL.md
- skills/contract-first/SKILL.md
- skills/csharp-testing/SKILL.md
- skills/database-migrations/SKILL.md
- skills/dotnet-patterns/SKILL.md
- skills/e2e-testing/SKILL.md
- skills/inherit-legacy-style/SKILL.md
- skills/intent-driven-development/SKILL.md
- skills/module-regression/SKILL.md
- skills/module-regression/templates/REGRESSION.example.md
- skills/production-audit/SKILL.md
- skills/verification-loop/SKILL.md
