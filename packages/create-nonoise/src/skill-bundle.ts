// SINGLE SOURCE OF TRUTH for which native NONoise skills ship in a scaffold.
//
// Both `scaffold.ts` (fresh `npx create-nonoise`) and `upgrade.ts` (refresh an
// existing project) import this list. Do NOT redeclare it anywhere else — the
// whole point of this module is that adding a skill is a one-line change here.
//
// Checklist when adding a skill:
//   1. Drop its dir in `packages/skills/<name>/` (bundle-assets copies ALL of
//      packages/skills into the CLI tarball, so this makes it shippable).
//   2. Add its name to the array below.
//   3. Rebuild (`pnpm --filter create-nonoise run build`) and update snapshots
//      (`vitest -u`). The integration test reads THIS array, so it can't drift.
export const MVP_SKILL_BUNDLE = [
  'vscode-config-generator',
  'docs-md-generator',
  'playwright-cli',
  'frontend-design',
  'skill-finder',
  'design-md-generator',
  'bmad-advanced-elicitation',
  'bmad-agent-analyst',
  'bmad-agent-architect',
  'bmad-agent-tech-writer',
  'bmad-agent-ux-designer',
  'quint-fpf',
  'arch-brainstorm',
  'arch-decision',
  'arch-sync',
  'sprint-manifest',
  'atr',
  'reverse-engineering',
  'requirements-ingest',
  'spec-to-workitem',
  'ops-skill-builder',
  'observability-debug',
  'polly',
  'c4-doc-writer',
  'swarm-router',
  'copilot-delegate',
  'gemini-delegate',
] as const;
