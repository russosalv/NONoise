# Examples — three end-to-end flows

Three worked examples of the full five-phase flow across Azure, AWS, and GCP. Each example is ~40 lines and demonstrates how intent, access, context, plan, execution, and crystallization fit together.

These are illustrative — not copy-paste recipes. Your project's `docs/architecture/` and access model will change the specifics, which is exactly the point of this skill.

---

## Example 1 — Azure AKS deploy (CLI access)

**User says**: "I want to deploy `auth-service` version 2.1.0 to the dev namespace on our AKS cluster."

### Phase 0 — Intent
- Category: `deploy`
- Existing infra: "AKS cluster `aks-foo` on Azure, 3 namespaces (`dev`, `test`, `prod`), Helm-based deploys, GitHub Actions CI/CD."

### Phase 1 — Access
- Tier: CLI.
- Probe: `az account show` → OK. `kubectl config current-context` → `aks-foo`. `gh auth status` → logged in.

### Phase 2 — Context
- Read `docs/architecture/01-constraints.md` → "Azure-only, Helm charts under `infra/helm/<svc>/`, appVersion in Chart.yaml drives the image tag."
- No graphify needed (the user knows the service).
- Target probe: `kubectl get deploy auth-service -n dev -o jsonpath='{.spec.template.spec.containers[0].image}'` → current image is `auth-service:2.0.3`.
- `az acr repository show-tags --name acrfoo --repository auth-service --orderby time_desc --top 5` → `2.1.0`, `2.0.3`, `2.0.2` present.

### Phase 3 — Plan
| # | Step | Command | Risk |
|---|------|---------|------|
| 1 | Verify tag in ACR | `az acr manifest show-metadata --registry acrfoo --name auth-service:2.1.0` | non-destructive |
| 2 | Update Chart.yaml | `yq -i '.appVersion = "2.1.0"' infra/helm/auth-service/Chart.yaml` | reversible |
| 3 | Commit + push | `git commit -am "deploy auth-service 2.1.0 to dev" && git push origin develop` | reversible |
| 4 | Trigger CD | `gh workflow run cd-dev.yml -f service=auth-service` | destructive |
| 5 | Rollout status | `kubectl rollout status deploy/auth-service -n dev --timeout=5m` | non-destructive |
| 6 | Health check | `curl -sf https://auth-service-dev.example.com/health` | non-destructive |

Mode chosen: paired.

### Phase 4 — Execute
- Dry-run first → plan reviewed.
- Paired run → each step shows output, user confirms.
- Success.

### Phase 5 — Crystallize
- Accepted. Slug: `deploy-auth-service-dev`.
- `skill-creator` invoked with the package.
- Generated skill at `.claude/skills/deploy-auth-service-dev/SKILL.md`.
- Reviewed together, committed.

---

## Example 2 — AWS EKS rollout (CLI access)

**User says**: "We just pushed a hotfix. I need to roll out `orders-svc` to production on our EKS cluster without going through CI — fast path."

### Phase 0 — Intent
- Category: `deploy` (hotfix variant).
- Existing infra: "EKS cluster `eks-prod-us-east-1`, kustomize overlays under `k8s/overlays/<env>/`, normally deployed via Argo CD but we have a manual fast-path."

### Phase 1 — Access
- Tier: CLI.
- Probe: `aws sts get-caller-identity` → OK. `kubectl config current-context` → `eks-prod`. `aws eks describe-cluster --name eks-prod-us-east-1 --region us-east-1` → ACTIVE.

### Phase 2 — Context
- Read `docs/architecture/01-constraints.md` → "Production changes require manual approval from on-call. Rollback is `kubectl rollout undo`."
- Skill pauses: "This is a prod op. Who approved? Please paste approval ticket / Slack link."
- User confirms approval.
- Target probe: `kubectl get deploy orders-svc -n prod -o jsonpath='{.spec.template.spec.containers[0].image}'` → `orders-svc:3.2.1`.
- `aws ecr describe-images --repository-name orders-svc --image-ids imageTag=3.2.2` → new hotfix image exists.

### Phase 3 — Plan
| # | Step | Command | Risk |
|---|------|---------|------|
| 1 | Verify image in ECR | `aws ecr describe-images --repository-name orders-svc --image-ids imageTag=3.2.2` | non-destructive |
| 2 | Patch deployment | `kubectl set image deploy/orders-svc -n prod orders-svc=<ecr>/orders-svc:3.2.2` | **destructive** (live prod) |
| 3 | Watch rollout | `kubectl rollout status deploy/orders-svc -n prod --timeout=5m` | non-destructive |
| 4 | Health check | `curl -sf https://orders-svc.example.com/health` | non-destructive |

Mode chosen: paired (user wants to watch prod carefully).

### Phase 4 — Execute
- Destructive step 2 requires explicit `y` confirmation at run time. User approves.
- Rollout succeeds. Health check OK.

### Phase 5 — Crystallize
- Accepted. Slug: `hotfix-deploy-prod-eks`.
- Generated skill notes: "Requires prod approval. Not for regular deploys — use Argo CD for those. Fast-path only."
- Committed.

---

## Example 3 — GCP Cloud Run deploy with pipeline setup (CLI access + API)

**User says**: "I want to create a Cloud Build pipeline for our new service `notifications`, and do the first deploy to Cloud Run."

### Phase 0 — Intent
- Category: mixed — `pipeline` + `deploy`. Skill treats them as two linked ops.
- Existing infra: "GCP project `acme-prod`, other services already on Cloud Run deployed via Cloud Build, GitHub repo `acme/notifications` newly created."

### Phase 1 — Access
- Tier: CLI primarily (gcloud), API as fallback for the Cloud Build trigger creation if `gcloud builds triggers create` doesn't support the GitHub v2 integration we need.
- Probe: `gcloud auth list` → OK. `gcloud config get project` → `acme-prod`. `gh auth status` → OK (needed to set up the GitHub connection).

### Phase 2 — Context
- Read `docs/architecture/01-constraints.md` → "All new services must: deploy to Cloud Run, use the shared VPC connector `vpc-conn-prod`, have a min instances of 0 in dev."
- Read existing similar service: `services/billing/cloudbuild.yaml` as a reference template.
- Target probe: `gcloud run services list` → no `notifications` service yet (greenfield). `gcloud builds triggers list` → existing triggers visible for patterns.

### Phase 3 — Plan
| # | Step | Command | Risk |
|---|------|---------|------|
| 1 | Generate `cloudbuild.yaml` | (file write, using `billing/cloudbuild.yaml` as template) | reversible (git) |
| 2 | Commit + push | `git commit -am "add cloudbuild pipeline" && git push` | reversible |
| 3 | Create Cloud Build trigger | `gcloud builds triggers create github --name=notifications-ci --repo-owner=acme --repo-name=notifications --branch-pattern=^main$ --build-config=cloudbuild.yaml` | reversible (trigger deletable) |
| 4 | Trigger first build | `gcloud builds triggers run notifications-ci --branch=main` | destructive (builds and pushes image) |
| 5 | Deploy to Cloud Run | (Cloud Build does this via its own `gcloud run deploy` step) | destructive |
| 6 | Verify service URL | `gcloud run services describe notifications --region us-central1 --format='value(status.url)'` | non-destructive |
| 7 | Hit health endpoint | `curl -sf $(gcloud run services describe notifications --region us-central1 --format='value(status.url)')/health` | non-destructive |

Mode chosen: paired — user wants to review each generated file and the first build logs.

### Phase 4 — Execute
- Paired run.
- Step 3 fails: "Repository `acme/notifications` not connected to Cloud Build." Skill proposes fix: "Run `gcloud builds connections create github` or use the console one-time setup. Which do you prefer?" User opts for the console (web fallback). After connection, retry step 3 → OK.
- Subsequent steps all pass.

### Phase 5 — Crystallize
- Accepted. Two skills generated (the skill-creator supports multi-skill output):
  1. `setup-cloudbuild-for-service` — the pipeline bootstrap (reusable for any new service).
  2. `deploy-notifications-dev` — the deploy-specific skill.
- Generated skill 1 notes: "The GitHub-to-Cloud-Build connection step is web-only one-time setup per repo; this skill documents the manual step and the post-connection `gcloud builds triggers create` command."
- Committed.

---

## Takeaways

1. **Every example starts by asking the user what they want** — no assumed category, no assumed stack.
2. **CLI was the right tier in all three** — the most common case. API and Web are fallbacks.
3. **Context reading caught at least one constraint** in each example (e.g. prod requires approval, new services must use a VPC connector, greenfield service needs a GitHub connection).
4. **Dry-run then paired** was the default pattern — only delegated when the op is well-known and low-risk.
5. **Crystallization produced reusable skills** in every case — and each generated skill is specific enough to "just work" the second time.

The flip from "generic skill that works sometimes" to "specific skill grown from your environment that works every time" is the entire value proposition.
