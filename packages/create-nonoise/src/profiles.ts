import { MVP_SKILL_BUNDLE } from './skill-bundle.js';
import { selectEcc, type EccSelection } from './ecc.js';

const coreAgents = ['database-reviewer', 'build-error-resolver', 'pr-test-analyzer', 'code-simplifier', 'refactor-cleaner'];
const processSkills = ['verification-loop', 'intent-driven-development', 'production-audit', 'change-impact', 'code-tour'];
const securityAgents = ['security-reviewer', 'silent-failure-hunter'];
const brownfieldSkills = ['module-regression', 'inherit-legacy-style', 'brownfield-retrospective'];
const securityHooks = ['block-no-verify', 'config-protection', 'pre-bash-git-push-reminder', 'mcp-health-check', 'safety-guard'];
const developerHooks = ['post-edit-format', 'stop-format-typecheck'];
const nativeSkills = [...MVP_SKILL_BUNDLE, 'rea-setup'];
type Definition = { description: string; nativeSkills: readonly string[]; agents: readonly string[]; skills: readonly string[]; rules: readonly string[]; stack: boolean; hooks: readonly string[]; rea: boolean; vendors: boolean };
const core = { nativeSkills, agents: coreAgents, skills: processSkills, rules: ['common'], stack: true, hooks: [], rea: false, vendors: true };

/** Single declarative catalog consumed by scaffold, upgrade and doctor. Stack
 * assets remain opt-in in every profile, including full (all selected capabilities). */
export const PROFILES = {
  minimal: { description: 'Polly and essential skills; no agents, rules, hooks or external runtimes', nativeSkills: ['polly', 'skill-finder', 'requirements-ingest', 'sprint-manifest', 'rea-setup'], agents: [], skills: [], rules: [], stack: false, hooks: [], rea: false, vendors: false },
  core: { ...core, description: 'NONoise bundle, common agents/rules and process skills' },
  developer: { ...core, description: 'Core plus selected stack and format/typecheck hooks', hooks: developerHooks },
  security: { ...core, description: 'Core plus security reviews and safety hooks', agents: [...coreAgents, ...securityAgents], skills: [...processSkills, 'mcp-dependency-review'], hooks: securityHooks },
  brownfield: { ...core, description: 'Core plus legacy analysis and REA', agents: [...coreAgents, 'spec-miner'], skills: [...processSkills, ...brownfieldSkills], rea: true },
  full: { ...core, description: 'All capabilities for the selected stack, all hooks and REA', agents: [...coreAgents, ...securityAgents, 'spec-miner'], skills: [...processSkills, ...brownfieldSkills, 'mcp-dependency-review'], hooks: [...securityHooks, ...developerHooks], rea: true },
} as const satisfies Record<string, Definition>;
export type Profile = keyof typeof PROFILES;
export function parseProfile(value: string = 'core'): Profile {
  if (!Object.hasOwn(PROFILES, value)) throw new Error(`Invalid profile: ${value}. Use ${Object.keys(PROFILES).join(', ')}.`);
  return value as Profile;
}
export type ProfileSelection = { profile: Profile; nativeSkills: readonly string[]; ecc: EccSelection; hooks: readonly string[]; rea: boolean; vendors: boolean };
export function resolveProfile(root: string, profile: Profile = 'core', stack: readonly string[] = [], opts: { withRea?: boolean; legacy?: boolean } = {}): ProfileSelection {
  const def: Definition = PROFILES[parseProfile(profile)];
  const available = selectEcc(root, stack), common = selectEcc(root, []);
  const choose = (kind: keyof EccSelection, names: readonly string[]) => [...new Set([
    ...names,
    ...(def.stack ? available[kind].filter(n => !common[kind].includes(n)) : []),
    ...(opts.legacy && profile === 'core' ? available[kind].filter(n => n !== 'mcp-dependency-review') : []),
  ])];
  return { profile, nativeSkills: def.nativeSkills, ecc: { agents: choose('agents', def.agents), rules: choose('rules', def.rules), skills: choose('skills', def.skills) }, hooks: def.hooks, rea: def.rea || Boolean(opts.withRea), vendors: def.vendors };
}
