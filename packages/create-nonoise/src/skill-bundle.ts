// Historical core native skills, retained for release compatibility and native plugins.
// The installation source of truth is profiles.ts, which composes this base with
// profile-specific skills, agents, rules, hooks and REA for scaffold/upgrade/doctor.
// New profile capabilities belong in that catalog; adding to this base expands
// every non-minimal profile and requires updating the native plugin manifests.
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
