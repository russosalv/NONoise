---
name: ops-skill-builder
description: Meta-skill that coaches the AI + user pair through any operational task (deploy, pipeline, provision, migrate, rollback, diagnose, debug-wiring) in any stack, then crystallizes the successful workflow into a project-local reusable skill. Asks WHAT the user wants to achieve, proposes an access menu (CLI > API > Web), gathers context from `docs/architecture/` + optional graphify index, proposes a dry-run plan with risk annotations, executes in paired or delegated mode, and — on success — invokes `skill-creator` to save the command sequence as a project-local skill under `.claude/skills/<slug>/SKILL.md`. Triggers — "deploy this service", "create a CI/CD pipeline for X", "set up rollback", "provision dev env", "run this migration", "automate this ops thing I do manually", "ops on Azure / AWS / GCP / kubernetes", or turning a manual op into a repeatable team skill. Also triggers without explicit mention when the user describes a repeated manual ops workflow with no fitting deploy skill available.
source: NONoise (merges devops-deploy + devops-pipeline from Risko reference-project as a stack-neutral meta-skill)
variant: nonoise generic; stack-neutral; access-first; crystallizes into project-local skills via skill-creator
---

# ops-skill-builder — Operational coach that builds YOUR ops skill

This is a **meta-skill**. It does not ship a canned deploy or pipeline recipe. Instead, it coaches the AI + user pair through a five-phase flow:

1. **Intent** — what do you want to achieve?
2. **Access** — how can the AI reach the target (CLI, API, Web)?
3. **Context** — what is the project + target environment actually like?
4. **Operation** — what exactly do we do, and how (dry-run / paired / delegated)?
5. **Crystallize** — save the working flow as a reusable project-local skill.

The philosophy is the inverse of "ship a generic deploy skill". A generic deploy skill works 60% of the time because every organization is different. This skill builds **your** deploy skill, which works 100% of the time because it was grown from **your** environment, **your** access model, **your** constraints.

## Position in the NONoise workflow

This skill sits on the **operations** axis, orthogonal to the architectural axis (`arch-brainstorm` → `arch-decision` → `sprint-manifest` → `spec-to-workitem`). It is called any time the team needs to perform or automate an ops task.

```
┌───────────────────────────────────────────────────────────────┐
│                    operations axis                            │
│                                                               │
│   user describes an ops task                                  │
│                    │                                          │
│                    ▼                                          │
│   ┌────────────────────────────┐                              │
│   │      ops-skill-builder     │                              │
│   │                            │                              │
│   │  Phase 0  Intent           │                              │
│   │  Phase 1  Access (menu)    │                              │
│   │  Phase 2  Context          │──┐                           │
│   │  Phase 3  Operation plan   │  │ (may call /graphify) │
│   │  Phase 4  Execute          │  │ (may call arch docs)      │
│   │  Phase 5  Crystallize      │──┼──▶ skill-creator          │
│   │                            │  │                           │
│   └────────────────────────────┘  │                           │
│                                   ▼                           │
│                 .claude/skills/<slug>/SKILL.md                │
│                 (project-local, shareable via git)            │
└───────────────────────────────────────────────────────────────┘
```

Related skills:

- [`../skill-creator/SKILL.md`](../skill-creator/SKILL.md) — invoked in Phase 5 to crystallize the successful flow.
- [`../graphify/SKILL.md`](../graphify/SKILL.md) — invoked in Phase 2 when the operation needs code-level awareness (rollback mapped to the right module, a migration driven by schema references, etc.).
- [`../observability-debug/SKILL.md`](../observability-debug/SKILL.md) — paired skill for production debugging: this skill handles Phase 0 "wire correlation-ID tracking on the code side" (an ops concern: configure App Insights / Datadog / OpenTelemetry), then `observability-debug` takes over Phase 1+ (read traces, find the bug, propose a fix).
- [`../spec-to-workitem/SKILL.md`](../spec-to-workitem/SKILL.md) — sibling in spirit (adapter pattern, env-var auth, dry-run default).

## What this skill does

1. **Elicits intent** — asks the user what they want to achieve, in their own words, then slots it into a category (deploy / pipeline / provision / teardown / rollback / migrate / scale / cron / diagnose / debug-wiring / custom).
2. **Proposes an access menu** — CLI first, API second, Web last — with trade-offs. Bundles reference file `references/access-patterns.md` with concrete examples for Azure / AWS / GCP / GitHub / Azure DevOps / Jira / Kubernetes / Terraform.
3. **Gathers context** — reads `docs/architecture/` (project constraints), `nonoise.config.json` (project metadata + working language), optionally invokes `/graphify .` to index the codebase, and probes the target environment (`az account show`, `kubectl config current-context`, `gh auth status`, etc.).
4. **Defines the operation** — translates the user's natural-language intent into an ordered, risk-annotated plan. Every step is labeled `non-destructive` / `reversible` / `destructive`.
5. **Executes paired or delegated** — dry-run is the default. Paired mode: step-by-step with "proceed?" between steps. Delegated mode: autonomous after plan confirmation. On error: snapshot state, explain, propose rollback.
6. **Crystallizes** — on success, offers to save the exact sequence as a reusable project-local skill via `skill-creator`. The generated skill becomes the team's source of truth for "how we do this op in THIS project".

## What this skill does NOT do

- **Does not ship a pre-baked deploy recipe**. No hardcoded cloud provider, no hardcoded CI/CD vendor, no hardcoded auth flow.
- **Does not hardcode credentials**. All auth is via env vars or existing CLI sessions — documented per access pattern in `references/access-patterns.md`.
- **Does not execute destructive actions without explicit confirmation**. Dry-run is the default; destructive steps require a second, explicit confirmation.
- **Does not skip the crystallization step silently**. Even if the user declines to save the skill, the offer is always made.
- **Does not edit `docs/architecture/`** — read-only on the source of truth. If the operation uncovers an architecture drift, it is surfaced as a recommendation, not a silent edit.
- **Does not replace `observability-debug`** for production debugging — it only sets up the correlation-ID wiring on the code side.

---

## Arguments

`$ARGUMENTS` can be:

- *(empty)* — start from scratch, Phase 0 asks the user what they want to achieve.
- `intent=<category>` — skip Phase 0 category selection (e.g. `intent=deploy`, `intent=pipeline`, `intent=rollback`).
- `access=cli|api|web` — skip Phase 1 access negotiation (use only if the user is already sure).
- `dry-run` — force dry-run for Phase 4 (default anyway, but explicit).
- `paired` — force paired execution mode.
- `delegated` — force delegated execution mode (requires explicit plan confirmation regardless).
- `skill-slug=<slug>` — pre-declare the crystallization target (Phase 5).

If arguments are missing, the skill asks interactively — one question at a time, multiple-choice when possible, in the style of `arch-brainstorm`.

---

## Flow — five phases

### Phase 0 — Intent elicitation

**Goal**: understand what the user wants to achieve, in concrete terms.

#### Actions

1. **Ask the opening question** (verbatim or adapted):

   > "What do you want to achieve? In your own words — one sentence is fine. If you don't have a specific task yet, tell me the area (deploy / pipeline / provision / rollback / migrate / scale / cron / diagnose / debug-wiring / custom) and we'll narrow down."

2. **Map to a category**. Use this table as a guide — not as a strait-jacket. If the user's intent doesn't match, pick `custom` and work from their words.

   | Category | Typical phrasing | Notes |
   |---|---|---|
   | `deploy` | "deploy service X to env Y" | Push a built artifact to a runtime environment |
   | `pipeline` | "create a CI/CD pipeline for X" | Configure a build/release pipeline on the chosen CI vendor |
   | `provision` | "set up a dev environment", "create a new cluster" | Create infrastructure from scratch |
   | `teardown` | "delete the sandbox env", "clean up this experiment" | Remove infrastructure, explicit confirmation required |
   | `rollback` | "undo the last deploy", "roll back to version N" | Reverse a previous deploy |
   | `migrate` | "run this DB migration", "move data from A to B" | Schema or data migration |
   | `scale` | "scale X up/down", "adjust autoscaler" | Change resource sizing |
   | `cron` | "schedule a job that runs every night" | Create a scheduled task |
   | `diagnose` | "figure out why prod is slow" | Read-only investigation |
   | `debug-wiring` | "wire correlation-ID tracking so the AI can debug prod" | Code-side observability setup — Phase 0 of the prod-debug flow. After this skill finishes, hand off to `observability-debug`. |
   | `custom` | anything else | Use the user's own words |

3. **Ask about existing infra** — one sentence:

   > "Do you already have infrastructure for this, or is this a greenfield op? In one sentence — e.g. 'We have an AKS cluster on Azure with 3 services, deployed via Helm from a GitHub Actions pipeline', or 'Nothing yet, we're starting from scratch'."

4. **Acknowledge and summarize**. Before moving on, read back what you understood. Invite correction.

#### Phase 0 checkpoint

- [ ] Intent stated by the user in a sentence
- [ ] Mapped to a category (or `custom`)
- [ ] Existing infra described in a sentence
- [ ] Summary confirmed by the user

---

### Phase 1 — Access proposal (the access menu)

**Goal**: agree on HOW the AI will reach the target environment.

The *philosophy* (CLI > API > Web, never-silent-login, fallback protocol, OIDC for CI, browser-MCP pins) lives in the shared reference [`../_shared/access-model.md`](../_shared/access-model.md). The *operational prompt* the skill shows the user stays here.

#### Present the tiered menu

Use this exact framing (adapt to the user's language from `nonoise.config.json` if it's not English):

> "I need access to your target environment to help execute this. In order of simplicity:
>
> 1. **CLI access** — you grant me permission to run `az` / `gcloud` / `aws` / `gh` / `kubectl` / `terraform` / project-specific binaries on your behalf. Simplest, fastest, most auditable (your shell history keeps a record). **This is my recommendation.**
> 2. **API access** — I call the cloud provider's REST API using a token you configure via env var (PAT, OIDC, service principal). Works when no CLI is installed or when the CLI is locked behind SSO.
> 3. **Web access** — I navigate the vendor's web UI. This is **more complex**: it typically requires a browser MCP server (e.g. Playwright MCP) or pairing with you where you drive and I dictate.
>
> Which works for you? If unsure, go with #1."

#### Match the choice to an auth flow

- [`../_shared/access-model.md`](../_shared/access-model.md) — tier definitions, probe pattern, fallback protocol, OIDC federation for CI, browser-MCP pins per AI tool. **Read this for the generic philosophy.**
- [`references/access-patterns.md`](./references/access-patterns.md) — concrete per-tool probes for Azure / AWS / GCP / GitHub / Azure DevOps / Kubernetes / Terraform / Pulumi / Helm / Jira / Linear, plus Windows-bash quirks. **Read this for the exact commands.**

At a glance:

| Access tier | Typical commands to check it's live |
|---|---|
| CLI | `az account show`, `gcloud auth list`, `aws sts get-caller-identity`, `gh auth status`, `kubectl config current-context`, `terraform version`, `pulumi whoami` |
| API | probe the provider's "whoami" endpoint with the user-supplied token — e.g. Azure DevOps `GET /_apis/connectionData`, GitHub `GET /user`, Jira `GET /rest/api/3/myself` |
| Web | probe that a browser MCP server is configured (`mcp__playwright__navigate` or equivalent; see `_shared/access-model.md` § 7 for the pinned package per AI tool). If not, explain this will be pair-driven. |

#### Fallback chains

Follow the fallback protocol documented in `../_shared/access-model.md` § 3: when the preferred tier fails, **explain → propose → ask → record**. Never silently downgrade.

If **none** of the three tiers is feasible, stop and ask the user whether to install the missing CLI, generate the missing token, configure the missing browser MCP, or defer. Per global rule, LSP/runtime installs are advisor-only — print the install command, do not run it.

#### Phase 1 checkpoint

- [ ] Access tier chosen (CLI / API / Web) with explicit user consent
- [ ] Auth source verified (CLI session alive, or token present and valid)
- [ ] Fallback chain documented if primary fails

---

### Phase 2 — Context gathering

**Goal**: know enough about the project AND the target environment to produce a safe, realistic plan.

#### Project-side context

1. **Read `nonoise.config.json`** — extract `working_language`, `framework_version`, `installed_skills`. Working language governs the operation's output language; the generated skill in Phase 5 inherits it.
2. **Read `docs/architecture/`** — in this order:
   - `01-constraints.md` — hard constraints (cloud provider, vendor restrictions, compliance)
   - Other numbered files — stack, patterns, component registry
3. **Read the repo root** — `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md` if present (they may declare ops rules specific to this project).
4. **Optionally invoke `/graphify .`** — only if the operation needs code-level awareness:
   - Rollback that needs to identify the right module
   - Migration driven by schema references scattered in code
   - Pipeline that needs to list every service's build command
   - Debug-wiring that must know where HTTP clients / loggers live

   If `graphify-out/` is missing, ask the user: "This op needs code-level context. Would you like me to invoke `/graphify .` to index the codebase? (~1–5 min)". On decline, proceed without it.

#### Target-side context

Using the access granted in Phase 1, probe the target to learn its state:

| Access tier | Probe examples |
|---|---|
| CLI | `az aks list`, `kubectl get ns`, `gh pipeline list`, `gcloud run services list`, `aws s3 ls`, `terraform state list` |
| API | `curl` whatever's the equivalent "list" endpoint |
| Web | navigate to the provider's dashboard and read back what's visible |

#### Report back

Before Phase 3, summarize to the user in ~100 words what you learned. Example:

> "I read your `docs/architecture/01-constraints.md`: you're Azure-only, multi-region (italynorth + westeurope), compliance requires encryption-at-rest on all data stores. I probed your AKS: cluster `aks-foo` in `rg-bar`, 3 namespaces (`dev`, `test`, `prod`), 5 services already deployed. `kubectl` works with `view` role on all namespaces. `az acr show --name acrxxx` works. You're good to go for a dev-side deploy — I'd need an additional approver for prod."

Invite correction. Move to Phase 3 only on explicit user "ok".

#### Phase 2 checkpoint

- [ ] `nonoise.config.json` + `docs/architecture/` read
- [ ] Optional graphify indexing decided
- [ ] Target environment probed
- [ ] Report summarized and confirmed

---

### Phase 3 — Operation definition

**Goal**: turn natural-language intent into a concrete ordered plan, with risk annotations.

#### Steps

1. **Ask the specific operation**. In the user's words:

   > "Now, specifically: what do you want to do? Describe it like you'd tell a colleague. e.g. 'Deploy service `payments-api` version 1.4.2 to the dev namespace'."

2. **Translate into an ordered plan**. Each step gets:
   - A one-line description
   - The exact command / API call / web action that will run
   - A **risk label**: `non-destructive`, `reversible`, `destructive`
   - A precondition check where applicable (e.g. "only if version 1.4.2 exists in the registry")

3. **Present the plan as a table**. Example:

   | # | Step | Command | Risk | Precondition |
   |---|------|---------|------|--------------|
   | 1 | Verify image tag exists in ACR | `az acr repository show-tags --name acrxxx --repository payments-api --orderby time_desc --top 5` | non-destructive | — |
   | 2 | Update `Chart.yaml` appVersion to `1.4.2` | `yq -i '.appVersion = "1.4.2"' infra/helm/payments-api/Chart.yaml` | reversible (git revert) | step 1 passed |
   | 3 | Commit + push to `develop` | `git commit -am "deploy payments-api 1.4.2 to dev" && git push` | reversible (git revert + force-push) | step 2 succeeded |
   | 4 | Trigger CD pipeline | `gh workflow run cd-dev.yml -f service=payments-api` | destructive (live deploy) | push succeeded |
   | 5 | Monitor rollout | `kubectl rollout status deploy/payments-api -n dev --timeout=5m` | non-destructive | pipeline triggered |
   | 6 | Smoke-test endpoint | `curl -sf https://payments-api-dev.example.com/health` | non-destructive | rollout succeeded |

4. **Offer execution modes**:

   > "Three modes:
   >
   > - **Dry-run** (default): I print what I'd do, I don't touch anything. Best for the first iteration.
   > - **Paired**: I execute one step at a time, show you the output, ask 'proceed?' before the next. You learn by watching.
   > - **Delegated**: I execute the whole plan autonomously. You confirm the plan once, then I run it and report at the end.
   >
   > Which?"

5. **For destructive steps**, require a second, explicit confirmation even in delegated mode.

#### Phase 3 checkpoint

- [ ] Plan presented as an ordered, risk-annotated table
- [ ] Execution mode chosen
- [ ] Destructive steps flagged, explicit confirmation obtained

---

### Phase 4 — Execute

**Goal**: run the plan safely, capture what worked.

#### Dry-run mode (default)

For each step, print:

```
[DRY-RUN] Step <N>: <description>
Would run: <exact command>
Risk: <label>
Would check: <precondition>
```

No side effects. At the end, summarize and offer: "Dry-run complete. Run paired or delegated now?"

#### Paired mode

For each step:

1. Print the step and the command
2. Execute it
3. Show the output (trimmed, with escape codes rendered)
4. Ask: "Output looks right? (y / fix / abort)"
5. On `fix`: discuss, adjust the command, re-run (loop)
6. On `abort`: stop, run rollback if any
7. On `y`: proceed to next step

#### Delegated mode

1. Restate the plan, ask final "go" confirmation
2. Execute all steps in order
3. For each: log command + output to a local execution log at `tmp/ops-skill-builder/<timestamp>-<slug>.log`
4. On any non-zero exit: stop, report the failing step + its output, propose rollback options, ask user what to do
5. On full success: report the log path and step summary

#### On error

- **Snapshot state**: capture `kubectl get all -n <ns>` (or equivalent), last 20 lines of any log the user consented to read, exit codes of each step.
- **Explain**: state what happened, not what "should have" happened. Show the exact error message.
- **Propose rollback**: identify every step with risk `reversible` or `destructive` that ran, and propose a reverse operation. Ask the user to confirm rollback before running.
- **Never auto-rollback destructive steps** — the user must confirm.

#### On success

- **Capture the exact commands used** — verbatim, no paraphrasing, no variable expansion. These are the seeds of the crystallized skill.
- **Capture the access model** — which tier was used (CLI / API / Web), which env vars, which CLI sessions.
- **Capture the context probes** — the "verify auth works" commands that will become pre-checks in the generated skill.

#### Phase 4 checkpoint

- [ ] Plan executed (dry-run, paired, or delegated)
- [ ] All steps reported with output
- [ ] Errors surfaced with rollback proposals
- [ ] On success: exact command sequence captured

---

### Phase 5 — Crystallize (invoke skill-creator)

**Goal**: turn the successful flow into a reusable project-local skill.

#### Offer

After Phase 4 succeeds (or after a successful paired run of a dry-run followed by a real run), ask:

> "That worked. Do you want to save this as a reusable skill for your team? It'll live at `.claude/skills/<slug>/SKILL.md` — project-local, shareable via git. Anyone on the team who triggers it will re-run the exact same sequence, with the same access model, without re-negotiating."

If the user declines, thank them and close gracefully. Do not nag.

#### On acceptance — prepare the crystallization package

Gather everything `skill-creator` needs. The template for the generated skill is documented in [`references/ops-skill-template.md`](./references/ops-skill-template.md) — hand it to `skill-creator` as the structural target.

The package:

```yaml
target_location: .claude/skills/<slug>/SKILL.md    # project-local, not global
suggested_name: <slug>                             # kebab-case, e.g. "deploy-payments-api", "rollback-auth-service"
suggested_description: >                           # one-paragraph, triggering-focused
  <what the skill does> + <when to trigger> (include the category from Phase 0, the stack from Phase 2, the access tier from Phase 1)
working_language: <from nonoise.config.json>       # the generated skill inherits the project's language

# ==== the meat ====

access_model:
  tier: cli | api | web
  auth_sources:                                    # list of env vars and/or CLI sessions
    - type: cli_session
      check: "az account show"
    - type: env_var
      name: "GH_TOKEN"
      scope: "repo"
  fallback: "If `az` CLI isn't authenticated, run `az login` and retry."

preconditions:                                     # runs first in the generated skill
  - name: "Verify Azure auth"
    command: "az account show --query id -o tsv"
    expect: "non-empty string"
  - name: "Verify kubectl context"
    command: "kubectl config current-context"
    expect: "aks-prod-xyz"

command_sequence:                                  # verbatim from Phase 4
  - step: 1
    description: "Verify image tag exists in ACR"
    command: "az acr repository show-tags --name acrxxx --repository payments-api --orderby time_desc --top 5"
    risk: non-destructive
  - step: 2
    ...

verification:                                      # post-op checks
  - "kubectl rollout status deploy/payments-api -n dev --timeout=5m"
  - "curl -sf https://payments-api-dev.example.com/health"

rollback_hints:                                    # reverse ops for reversible/destructive steps
  - applies_to_step: 2
    command: "git revert <commit> && git push"
  - applies_to_step: 4
    command: "gh workflow run cd-dev-rollback.yml -f version=<previous>"

context_refs:                                      # where the generated skill should read from
  - "docs/architecture/01-constraints.md"
  - "nonoise.config.json"
```

#### Invoke skill-creator

Call the sibling skill:

```
Skill: skill-creator
args: crystallize from ops-skill-builder
     target=.claude/skills/<slug>/SKILL.md
     package=<path-to-the-yaml-above-written-to-tmp>
```

`skill-creator` takes the package, generates a SKILL.md that follows the template in [`references/ops-skill-template.md`](./references/ops-skill-template.md), and writes it to the target location.

#### After generation

1. **Review together** — show the generated skill to the user, ask for corrections before committing.
2. **Remind about secrets** — if the skill references env vars, ensure none of them are hardcoded; they must come from the user's shell or from `.env` (which is gitignored).
3. **Offer to commit** — only if the user says "commit it". Never commit automatically.
4. **Close the loop** — tell the user: "From now on, anyone on the team can run `<slug>` and get the same result. If the environment changes, re-run me (`ops-skill-builder`) and I'll regenerate the skill."

#### Phase 5 checkpoint

- [ ] Offer made to crystallize
- [ ] On acceptance: package assembled
- [ ] `skill-creator` invoked with the package
- [ ] Generated skill reviewed with the user
- [ ] User informed about secrets handling
- [ ] Optional commit offered (never automatic)

---

## Operating principles

1. **Intent before access, access before plan, plan before execution, execution before crystallization**. Never skip a phase.
2. **Dry-run is the safety net** — always available, always offered, always the default.
3. **The access menu is explicit** — CLI first, API second, Web last. Never silently downgrade.
4. **Auth is externalized** — env vars or CLI sessions. Never hardcoded in the skill body, never written to committed files.
5. **Destructive steps require double confirmation** — once when planning, once at execution time.
6. **Crystallize on success** — every successful op is an opportunity to stop repeating the negotiation. Always offer.
7. **Project-local skills, not global** — generated skills land under `.claude/skills/<slug>/`, not `~/.claude/skills/`. The team's skill is versioned with the repo.
8. **Read-only on the source of truth** — this skill never edits `docs/architecture/`. Drifts are surfaced as recommendations.
9. **Fail-soft on a step, fail-hard on auth or destructive without confirmation** — one broken step should not auto-abort everything; a missing credential or an unconfirmed destructive step always stops.
10. **Inherit the project's working language** — the generated skill uses the language declared in `nonoise.config.json`.

---

## Anti-patterns

1. **Hardcoding auth in the generated skill** — always env vars or CLI sessions referenced by name, never tokens inline.
2. **Writing a generic deploy without going through the access menu** — skips Phase 1, produces a skill that doesn't work in the user's environment.
3. **Skipping dry-run** — "I'll just run it" is the opposite of this skill's philosophy.
4. **Executing destructive actions without explicit confirmation** — even in delegated mode.
5. **Never crystallizing** — Phase 5 is not optional. If the op succeeds, the offer must be made. Declining is fine; forgetting to offer is not.
6. **Using Web access as the default** — Web is the last resort, not the easy way.
7. **Creating a global skill instead of project-local** — generated skills go under `.claude/skills/<slug>/`, not `~/.claude/skills/`.
8. **Editing `docs/architecture/` silently** — if the op reveals a drift, surface it; do not rewrite the architecture doc.
9. **Leaving the operation log only in memory** — write to `tmp/ops-skill-builder/<timestamp>-<slug>.log` so the user has a local audit trail.
10. **Assuming the stack** — never assume "it's Azure" or "it's AWS" without confirming in Phase 2. Every project is different.

---

## When NOT to use this skill

- **Bug fix in application code** → `superpowers:systematic-debugging`.
- **Production debugging beyond the wiring phase** → `observability-debug` (this skill handles only the Phase 0 "wire correlation-ID tracking on the code side"; everything downstream — reading traces, correlating logs, finding the bug — is `observability-debug`).
- **Architectural decision** → `arch-brainstorm` → `arch-decision`.
- **One-off ops task the user will never repeat** → you can still use this skill, but skip Phase 5 with the user's consent.
- **Non-ops tasks** (writing docs, generating code, running tests) → wrong skill.

---

## Resuming mid-flow

If the user starts a new session mid-crystallization (e.g. Phase 4 ran, crystallization didn't):

1. Check `tmp/ops-skill-builder/` for the latest execution log
2. Ask: "I see you ran `<op>` successfully on `<date>`. Do you want to crystallize it now?"
3. If yes: jump to Phase 5, using the captured log as the command sequence source

If Phase 4 failed and left the environment in a broken state:

1. Read the last execution log
2. Identify which steps ran
3. Propose a rollback plan based on the `rollback_hints` gathered in Phase 3
4. Execute only with user confirmation

---

## Reference files

- [`../_shared/access-model.md`](../_shared/access-model.md) — **shared access-first reference** (CLI > API > Web tiers, probe pattern, fallback protocol, never-silent-login rule, env-var convention, OIDC federation for GitHub Actions → Azure / AWS / GCP, browser-MCP pins per AI tool, anti-patterns). Consumed by this skill and by `observability-debug`.
- [`references/access-patterns.md`](./references/access-patterns.md) — per-tool concrete probes: CLI / API / Web examples across Azure / AWS / GCP / GitHub / Azure DevOps / Jira / Linear / Kubernetes / Terraform / Pulumi / Helm. Covers auth setup, verification commands, and failure modes specific to each tool.
- [`references/ops-skill-template.md`](./references/ops-skill-template.md) — the canonical structure for a generated ops skill: frontmatter template, pre-check auth section, read-state section, validate-args section, execute section, verify section, report section, rollback section. This is the template `skill-creator` receives in Phase 5.
- [`references/examples.md`](./references/examples.md) — three end-to-end worked examples in different clouds (Azure AKS deploy, AWS EKS rollout, GCP Cloud Run deploy), each showing the full five-phase flow.

## Related skills

- [`../skill-creator/SKILL.md`](../skill-creator/SKILL.md) — invoked in Phase 5 to crystallize.
- [`../graphify/SKILL.md`](../graphify/SKILL.md) — invoked in Phase 2 when code-level context is needed.
- [`../observability-debug/SKILL.md`](../observability-debug/SKILL.md) — takes over after Phase 0 debug-wiring for the actual production-debug flow.
- [`../spec-to-workitem/SKILL.md`](../spec-to-workitem/SKILL.md) — sibling adapter-pattern skill (auth via env vars, dry-run default, tracker-agnostic).
- [`../arch-brainstorm/SKILL.md`](../arch-brainstorm/SKILL.md) — the architectural-axis counterpart (one question at a time, multiple-choice, dialog-driven).

## Copilot compatibility rules for new skills

When this skill (or `skill-creator` invoked from Phase 5) emits a new `SKILL.md`, the YAML frontmatter MUST satisfy these rules or the skill will fail to load in GitHub Copilot:

- **`description` ≤ 1024 characters.** Copilot rejects longer descriptions outright. Claude Code does not enforce this, but a single source of truth is preferred.
- **No `: ` (colon + space) inside an unquoted YAML scalar.** A strict YAML parser reads that as a nested mapping. Rewrite to use an em-dash (`—`) or another separator, or wrap the whole value in double quotes.
- **Avoid markdown bold/italic/links inside the `description` field.** They add bytes without improving triggering and can confuse strict parsers.
- **Trigger focus over narrative.** Descriptions are read by a triggering LLM that prioritizes concrete phrases / slash commands. Narrative flourishes dilute the signal.

Verify before committing:

```bash
pnpm --filter create-nonoise exec vitest run test/validation/skill-frontmatter-copilot.test.ts
```

The test fails the build if any native skill in `packages/skills/*/SKILL.md` violates these rules.
