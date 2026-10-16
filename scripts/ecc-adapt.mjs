// Deliberate, reproducible NONoise adaptations; reviewed alongside snapshot updates.
export function adaptEcc(path, text) {
  const replacements = {
    'architecture-decision-records': 'arch-decision',
    'story-lifecycle': 'sprint-manifest',
    'codebase-onboarding': 'reverse-engineering',
    'test-collaboration': 'atr',
    'ai-regression-testing': 'module-regression',
    'tdd-workflow': 'superpowers:test-driven-development',
    'security-review': 'security-reviewer',
    'postgres-patterns': 'database-migrations',
  };
  for (const [from, to] of Object.entries(replacements)) {
    text = text.replace(new RegExp(`(?<![\\w-])${from}(?![\\w-])`, 'g'), to);
  }
  text = text.replace(/ecc:/g, '');
  text = text.replace(/\*\*tdd-guide\*\* agent/g, '**superpowers:test-driven-development** skill')
    .replace(/\*\*tdd-guide\*\*/g, '**superpowers:test-driven-development**')
    .replace(/\*\*planner\*\* agent/g, '**superpowers:writing-plans** skill')
    .replace(/\*\*code-reviewer\*\* agent/g, '**superpowers:requesting-code-review** skill')
    .replace(/\*\*e2e-runner\*\*/g, '**e2e-testing** skill (when installed)')
    .replace(/\*\*security-reviewer\*\* skill/g, '**security-reviewer** agent');
  // Related guidance that is not part of this snapshot must not become a dependency.
  text = text.split('\n').filter(line => !/^[-|].*`(?:frontend-patterns|backend-patterns|coding-standards|council|init|code-review|simplify)`/.test(line)).join('\n');
  text = text.replace('see skill: `security-reviewer`', 'use the `security-reviewer` agent checklist and the `production-audit` skill');
  text = text.replace('see skills: `database-migrations` and `database-migrations`.', 'see `database-migrations` when installed; otherwise use the checklist above.');
  if (path === 'agents/typescript-reviewer.md') {
    text = text.replace(/^> \*\*For React-specific review.*$/m, '> For React files, apply the React checklist below; no additional ECC reviewer is required.');
    text = text.replace(/^This repo does not yet ship.*$/m, 'Use the installed TypeScript rules and the project conventions for detailed TypeScript and JavaScript patterns.');
  }
  if (path === 'agents/spec-miner.md' || path === 'skills/brownfield-retrospective/SKILL.md') {
    text = text.replaceAll('openspec/specs/<capability>/spec.md', 'docs/architecture/specs/<capability>/spec.md')
      .replaceAll('openspec/specs/', 'docs/architecture/specs/').replaceAll('OpenSpec', 'NONoise')
      .replaceAll('If the project uses NONoise,', 'In NONoise,');
  }
  if (path === 'rules/common/agents.md') text = `# Agent coordination\n\nNONoise installs a pinned selection of ECC agents with bare names. Read the generated .nonoise/ecc/index.md for the installed roster and stack rules. Use the harness agent tool when available; otherwise apply the agent instructions directly and disclose that no independent review ran.\n\nUse security-reviewer, pr-test-analyzer and silent-failure-hunter before delivery, plus csharp-reviewer or typescript-reviewer when installed. Use database-reviewer for SQL and migrations, spec-miner for brownfield specifications, build-error-resolver for build failures, code-simplifier and refactor-cleaner for scoped cleanup.\n\nPlanning uses superpowers:writing-plans; architecture decisions use arch-decision and Haft; testing uses superpowers:test-driven-development and atr. E2E work uses e2e-testing when installed.\n\nDelegate only when appropriate to the user's task and harness permissions. Collect and integrate every delegated result before reporting completion. Do not redelegate work that fits one agent's context.\n`;
  if (path === 'rules/common/code-review.md') {
    text = text.split('\n').filter(line => !/^\|.*(?:python-reviewer|go-reviewer|rust-reviewer|code-reviewer|architect|tdd-guide)/.test(line)).join('\n');
  }
  if (path === 'skills/inherit-legacy-style/SKILL.md') {
    text = text.replace(/\*\*6\. Install the persistent hook\*\*[\s\S]*?(?=### Branch B)/, '**6. Reference the style rules**\n\nAdd a reference to `.ai-style-rules.md` in the project instructions (CLAUDE.md, AGENTS.md or copilot-instructions.md), preserving existing content. NONoise does not install ECC hooks.\n\n');
    text = text.split('\n').filter(line => !/hard hook/i.test(line)).join('\n')
      .replace(/optional enforcement hooks/g, 'a persistent instruction reference')
      .replace(/offer hook strength \(soft\/hard\/none\)/g, 'add an instruction reference')
      .replace(/optional CLAUDE\.md hook/g, 'persistent project-instruction reference')
      .replace(/Soft hook installed/g, 'Instruction reference installed')
      .replace(/When hooked via/g, 'When referenced in');
  }
  if (path === 'skills/verification-loop/SKILL.md') {
    text = text.replace('Run: /verify', 'Run the verification-loop skill')
      .replace('This skill complements PostToolUse hooks but provides deeper verification.', 'This skill complements superpowers:verification-before-completion: collect build, typecheck, test, security and diff evidence here; use that skill before claiming completion. No ECC hooks are installed.');
  }
  if (path.startsWith('agents/') || path === 'skills/brownfield-retrospective/SKILL.md') {
    const capabilities = {
      'planner': 'superpowers:writing-plans',
      'architect': 'arch-brainstorm',
      'code-architect': 'arch-brainstorm',
      'tdd-guide': 'superpowers:test-driven-development',
      'code-reviewer': 'superpowers:requesting-code-review',
      'code-explorer': 'reverse-engineering',
      'doc-updater': 'bmad-agent-tech-writer',
      'unified-memory': 'sprint-manifest',
    };
    for (const [from, to] of Object.entries(capabilities)) {
      text = text.replace(new RegExp(`(?<![\\w:-])${from}(?![\\w-])`, 'g'), to);
    }
  }
  text = text.replaceAll('Skill: `security-reviewer`', 'Agent: `security-reviewer`')
    .replaceAll('See skill: `security-reviewer`', 'Use the `security-reviewer` agent')
    .replace('- Skill: `deployment-patterns`', '- Use the project deployment documentation and `ops-skill-builder` for operational procedures.');
  if (path === 'skills/brownfield-retrospective/SKILL.md') {
    text = text.replace('`arch-brainstorm` or `arch-brainstorm`', '`arch-brainstorm`');
    text = text.replace(/^Backfilled decisions go to .*$/m, 'Reconstruct decision evidence through `arch-decision` and Haft, retaining canonical `.haft/` records. Link the resulting artifact IDs from the retrospective; do not create a second decision register. Behavioral specifications may use `docs/architecture/specs/<capability>/spec.md` produced by `spec-miner`.');
    text = text.replaceAll('`docs/adr/`', 'canonical `.haft/` records');
    text = text.replace(/^2\. Backfill retro-ADRs.*$/m, '2. Send undocumented decisions from Phase 2 through `arch-decision` and Haft. Distinguish observed history from inferred intent, record reconstructed status and the retrospective date in the canonical artifacts, and link their IDs. Keep any accepted binding under the existing project authority; never present reconstructed evidence as contemporaneous or create a parallel ADR directory.');
    text = text.replace('standard ECC pipeline', 'NONoise workflow')
      .replace('bmad-agent-tech-writer + ADR (if the decision changed)', 'bmad-agent-tech-writer + arch-decision / Haft (if the decision changed)')
      .replace("the project's memory mechanism (`sprint-manifest`, context carriers)", "the existing sprint manifest and linked retrospective artifacts")
      .replace('`arch-decision` — retro-ADR backfill in Phase 4', '`arch-decision` and Haft — canonical reconstructed decisions in Phase 4');
  }
  if (path === 'skills/change-impact/SKILL.md') text = text.replace('`arch-decision` and the ADR set', '`arch-decision` and canonical `.haft/` decision artifacts');
  text = text.replace(/^Note: ECC-managed installs.*$/m, 'Commit attribution follows the project and CLI settings; NONoise does not change global attribution settings.');
  text = text.replace('Hooks catch issues immediately; this skill provides comprehensive review.', 'Record the actual commands and their results before delivery.');
  text = text.replace('an persistent project-instruction reference', 'a persistent project-instruction reference');
  text = text.replace('- See hooks for automatic detection', '- Check the changed files manually or with the project lint command');
  if (path === 'skills/mcp-dependency-review/SKILL.md') {
    text = text.replace('Use when reviewing .mcp.json, Cursor, VS Code, Claude, Windsurf, or other repo-scoped MCP config.', 'Use when reviewing NONoise project MCP configuration for Claude, Codex, Copilot, or another host.');
    text = text.replace('## When to Activate', '## NONoise host scope\n\nUse the current host’s available file-reading and search tools. No ECC plugin, runtime, slash command, or external scanner is required. In NONoise, inspect project-local `.mcp.json` (Claude and Copilot CLI) and `.codex/config.toml` (Codex `[mcp_servers.<name>]` entries). Parse the actual JSON or TOML format as data; never source it or execute configured commands. Additional supported host paths below are discovery candidates only, not instructions to create configuration.\n\nREA uses an exact `rea-agents@6.5.0` selector; review it using the same rules as every other server. This skill does not install or enable REA. Use `rea-setup` when installed for a requested REA setup. Preserve secret environment values and never include them in reports.\n\n## When to Activate');
    text = text.replace('.mcp.json\n.github/mcp.json', '.mcp.json\n.codex/config.toml\n.github/mcp.json');
    text = text.replace('Read JSON or configuration text', 'Read JSON, TOML, or configuration text');
    text = text.replace(/## Related Skills[\s\S]*?(?=## Further Reading)/, '## Related NONoise capabilities\n\n- `security-reviewer` agent, when installed — broader application-security review.\n- `production-audit`, when installed — deployment and production-readiness checks.\n- If a capability is absent from `.nonoise/ecc/index.md`, use the checklist in this skill directly; do not assume an ECC runtime is available.\n\n');
  }
  return text;
}
