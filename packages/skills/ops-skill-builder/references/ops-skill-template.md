# Ops skill template — the canonical structure

This is the **template** a generated ops skill follows. Phase 5 of `ops-skill-builder` hands this structure to `skill-creator` along with the crystallization package (see the YAML shape in the main `SKILL.md`).

Every crystallized ops skill has the same skeleton: pre-check auth → read state → validate args → execute → verify → report → rollback hint. This uniformity is the whole point: once a team has two or three crystallized ops skills, their shape is predictable and new team members can read any of them in under a minute.

## File layout

```
.claude/skills/<slug>/
├── SKILL.md                    (required)
└── references/                 (optional, typically just examples and sample outputs)
    └── example-run.md          (sample invocation + output — useful for onboarding)
```

**Project-local, not global**: these skills live in the repo under `.claude/skills/`, committed alongside the code. They are inherently project-scoped.

## Frontmatter template

```yaml
---
name: <slug>                         # kebab-case, e.g. deploy-payments-api-dev
description: >
  <one paragraph: what the skill does + when to trigger.
   Include: the op category (deploy/pipeline/provision/...),
   the target environment (dev/test/prod),
   the stack ("Azure AKS", "GCP Cloud Run", "AWS EKS"),
   concrete trigger phrases ("deploy payments-api to dev",
   "push 1.4.2 to dev namespace"). The description is the
   triggering mechanism — be concrete.>
source: ops-skill-builder (crystallized <YYYY-MM-DD> from a live run by <user>)
variant: project-local; access-tier=<cli|api|web>; target=<env-or-scope>
working_language: <from nonoise.config.json at crystallization time>
access_tier: <cli|api|web>
requires_env:                        # list of required env vars (no values)
  - AZDO_PAT
  - GH_TOKEN
requires_cli:                        # list of required CLI tools
  - az
  - kubectl
  - helm
risk_level: <non-destructive | reversible | destructive>
---
```

## Body structure — mandatory sections in this order

### 1. Pre-check auth

Verify the user can actually perform the operation **before** touching any side-effecting command.

```markdown
## Pre-check auth

This skill requires <tier> access. Verify:

\`\`\`bash
<verify command 1>   # e.g. az account show --query id -o tsv
<verify command 2>   # e.g. kubectl config current-context
\`\`\`

Expected:
- Command 1: non-empty subscription ID, matching `<expected-subscription>`
- Command 2: `<expected-context>` (e.g. `aks-prod-xyz`)

If either fails:
- `az login` (interactive) — then retry
- `az aks get-credentials --resource-group <rg> --name <cluster>` — then retry
- Ensure env var `<NAME>` is set with scope `<scope>`
```

### 2. Read state

Pre-op context. Always read-only. Shows the user the current state before making changes.

```markdown
## Read state

\`\`\`bash
# Current image tag in the target environment
kubectl get deploy <deploy> -n <ns> -o jsonpath='{.spec.template.spec.containers[0].image}'

# Latest tags available in the registry
az acr repository show-tags --name <acr> --repository <svc> --orderby time_desc --top 5

# Current replica count
kubectl get deploy <deploy> -n <ns> -o jsonpath='{.spec.replicas}'
\`\`\`

Report the output to the user. Do not proceed if the state looks wrong.
```

### 3. Validate args

Parse `$ARGUMENTS`. Fail fast on missing / malformed inputs.

```markdown
## Validate args

Expected: `<required-arg-1>=<format>` `<required-arg-2>=<format>` [`<optional>`=<format>]

Example: `version=1.4.2 env=dev`

Validation:
- `version` must match semver
- `env` must be one of: `dev`, `test`
- `env=prod` is rejected by this skill — use `deploy-payments-api-prod` instead (requires approval)
```

### 4. Execute

The ordered plan. **Every step annotated with risk**. Destructive steps require explicit confirmation at run time.

```markdown
## Execute

| # | Step | Command | Risk | Precondition |
|---|------|---------|------|--------------|
| 1 | Verify target version exists | `az acr manifest show-metadata --registry <acr> --name <svc>:<version>` | non-destructive | — |
| 2 | Update Chart.yaml | `yq -i '.appVersion = "<version>"' infra/helm/<svc>/Chart.yaml` | reversible (git revert) | 1 OK |
| 3 | Commit + push | `git commit -am "deploy <svc> <version> to <env>" && git push origin develop` | reversible | 2 OK |
| 4 | Trigger CD | `gh workflow run cd-<env>.yml -f service=<svc>` | **destructive** — live deploy | push OK |
| 5 | Monitor rollout | `kubectl rollout status deploy/<svc> -n <env> --timeout=5m` | non-destructive | 4 triggered |

**Destructive step (4) requires explicit `y` confirmation at run time.**

**Dry-run**: if invoked with `dry-run`, print the table and the commands but do not execute.
```

### 5. Verify

Post-op checks. If these fail, the op did not succeed — propose rollback.

```markdown
## Verify

\`\`\`bash
# Pod running the new image
kubectl get pods -n <env> -l app=<svc> -o jsonpath='{.items[*].spec.containers[*].image}' | grep -q "<version>"

# Health endpoint responds
curl -sf https://<svc>-<env>.example.com/health

# No pod restarts in the last 2 minutes
kubectl get pods -n <env> -l app=<svc> --sort-by=.status.startTime
\`\`\`

All three must pass. If any fail, treat the deploy as broken and invoke the rollback section.
```

### 6. Report

Tell the user what happened, in one readable block.

```markdown
## Report

Print at the end:

\`\`\`
<slug> — <op> complete (<mode>)

Target:     <env>
Service:    <svc>
Version:    <old> → <new>
Duration:   <seconds>s
Verified:   rollout OK, health OK, no restarts
Log:        tmp/<slug>/<timestamp>.log
\`\`\`

If dry-run: replace "Verified" with "(dry-run, no changes applied)".
```

### 7. Rollback

Every skill that has reversible / destructive steps ships with a rollback recipe. Even if the user never invokes it, documenting it is mandatory.

```markdown
## Rollback

If the deploy fails or the new version is unhealthy:

\`\`\`bash
# Option A — CD-driven rollback (preferred when available)
gh workflow run cd-<env>-rollback.yml -f service=<svc> -f version=<previous-version>

# Option B — git revert + redeploy
git revert <commit-sha> && git push origin develop
# CD pipeline re-runs with the previous Chart.yaml

# Option C — kubectl-level emergency rollback
kubectl rollout undo deploy/<svc> -n <env>
\`\`\`

Rollback always requires explicit user confirmation. Never auto-trigger.
```

### 8. Anti-patterns (short)

Close with a concise anti-patterns list. Focus on what's specific to **this** op.

```markdown
## Anti-patterns

- Running this skill on `prod` — use `deploy-payments-api-prod` instead
- Skipping the verify step — a deploy is not done until the rollout succeeds + health responds
- Hardcoding the version in the skill — always pass via `version=<semver>`
- Committing the token into the skill body — auth is via `GH_TOKEN` env var
```

## Full example — `deploy-payments-api-dev`

Below is a full sample SKILL.md that follows this template. Use it as the gold standard the first time you crystallize a skill.

```markdown
---
name: deploy-payments-api-dev
description: >
  Deploy the `payments-api` microservice to the `dev` namespace on AKS
  cluster `aks-adp-noprd`, by updating the service's Helm Chart.yaml
  appVersion, pushing to `develop`, and triggering the `cd-dev.yml`
  GitHub Actions workflow. Use when the user says
  "deploy payments-api to dev", "push <version> of payments-api to dev",
  "roll out payments-api <version>". For prod use
  `deploy-payments-api-prod` instead.
source: ops-skill-builder (crystallized 2026-04-18 from a live run by russo)
variant: project-local; access-tier=cli; target=aks-adp-noprd/dev
working_language: en
access_tier: cli
requires_env: []
requires_cli:
  - az
  - kubectl
  - gh
  - yq
  - git
risk_level: destructive
---

# deploy-payments-api-dev

Canonical deploy of `payments-api` to the `dev` environment.

## Pre-check auth

\`\`\`bash
az account show --query id -o tsv                       # expect: <dev-subscription-id>
kubectl config current-context                          # expect: aks-adp-noprd
gh auth status                                          # expect: logged in to github.com
\`\`\`

If any fail:
- `az login` then `az account set --subscription <dev-subscription-id>`
- `az aks get-credentials --resource-group rg-adp-app-noprd --name aks-adp-noprd`
- `gh auth login`

## Read state

\`\`\`bash
kubectl get deploy payments-api -n dev -o jsonpath='{.spec.template.spec.containers[0].image}'
az acr repository show-tags --name acrxxx --repository payments-api --orderby time_desc --top 5
\`\`\`

## Validate args

`version=<semver>` required.

## Execute

| # | Step | Command | Risk |
|---|------|---------|------|
| 1 | Verify tag exists | `az acr manifest show-metadata --registry acrxxx --name payments-api:$VERSION` | non-destructive |
| 2 | Update Chart.yaml | `yq -i ".appVersion = \"$VERSION\"" infra/helm/payments-api/Chart.yaml` | reversible |
| 3 | Commit + push | `git commit -am "deploy payments-api $VERSION to dev" && git push origin develop` | reversible |
| 4 | Trigger CD | `gh workflow run cd-dev.yml -f service=payments-api` | **destructive** |
| 5 | Monitor | `kubectl rollout status deploy/payments-api -n dev --timeout=5m` | non-destructive |

## Verify

\`\`\`bash
kubectl get pods -n dev -l app=payments-api -o jsonpath='{.items[*].spec.containers[*].image}' | grep -q "$VERSION"
curl -sf https://payments-api-dev.example.com/health
\`\`\`

## Report

\`\`\`
deploy-payments-api-dev — deploy complete
Target:   dev
Service:  payments-api
Version:  <old> → <new>
Duration: <s>s
Verified: rollout OK, health OK
Log:      tmp/deploy-payments-api-dev/<ts>.log
\`\`\`

## Rollback

\`\`\`bash
gh workflow run cd-dev-rollback.yml -f service=payments-api -f version=<previous>
# or: kubectl rollout undo deploy/payments-api -n dev
\`\`\`

## Anti-patterns

- Running on prod — use `deploy-payments-api-prod`
- Skipping verify — a deploy is not done until rollout + health pass
- Hardcoding the version
```

## Why this template works

- **Same shape every time** — team members can jump between skills with zero ramp-up.
- **Auth is a first-class section** — no "it works on my machine" surprises.
- **Risk is explicit** — destructive steps are labelled and double-confirmed.
- **Rollback is planned, not improvised** — every skill has a rollback recipe even if never exercised.
- **Language is inherited** — generated skills in Italian / Spanish / etc. use the project's working language declared in `nonoise.config.json`.
