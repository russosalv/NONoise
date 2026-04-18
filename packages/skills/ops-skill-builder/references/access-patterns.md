# Access patterns — CLI / API / Web

This reference is the **depth-dive** for Phase 1 of `ops-skill-builder`. It documents concrete auth setups, verification probes, and failure modes across the three access tiers and across the most common cloud / tool ecosystems.

## Principle: three tiers, tried in order

| Tier | Preference | When to use |
|---|---|---|
| **CLI** | 1st choice | A CLI exists for the target and the user is willing to run it with their credentials. Auditable (shell history), fast, minimal setup. |
| **API** | 2nd choice | No CLI available, or the CLI is locked behind SSO / corporate proxy. The user supplies a token via env var. |
| **Web** | 3rd choice | Neither CLI nor API is practical. Requires a browser MCP server (e.g. Playwright MCP), or pair-driven manual navigation. Documented as "more complex". |

Never silently downgrade. If tier N is unavailable, explicitly ask the user to approve moving to tier N+1.

---

## Tier 1 — CLI access

### Azure — `az`

```bash
# Auth (interactive)
az login

# Auth (headless — service principal)
az login --service-principal -u "$AZ_CLIENT_ID" -p "$AZ_CLIENT_SECRET" --tenant "$AZ_TENANT_ID"

# Auth (headless — workload identity / OIDC, recommended in CI)
az login --service-principal -u "$AZ_CLIENT_ID" --federated-token "$ID_TOKEN" --tenant "$AZ_TENANT_ID"

# Verify
az account show --query '{subscription:name, tenant:tenantId, user:user.name}' -o json

# Switch subscription if needed
az account set --subscription "<subscription-id-or-name>"
```

**Windows bash note**: `az` is often installed under `C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin` and is **not on the bash `PATH` by default**. Add it at the top of every command block:

```bash
export PATH="$PATH:/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin"
```

**Kubernetes via AKS**:

```bash
az aks get-credentials --resource-group <rg> --name <cluster>
# If the cluster uses Azure AD auth, convert kubeconfig via kubelogin:
kubelogin convert-kubeconfig -l azurecli
kubectl config set-context --current --namespace=<ns>
```

### AWS — `aws`

```bash
# Auth (interactive SSO, recommended for humans)
aws configure sso
aws sso login --profile <profile>

# Auth (static keys — discouraged, acceptable for CI)
aws configure    # prompts for Access Key ID / Secret Access Key / region

# Verify
aws sts get-caller-identity
aws configure list

# Switch profile
export AWS_PROFILE=<profile>
```

**Kubernetes via EKS**:

```bash
aws eks update-kubeconfig --name <cluster> --region <region>
kubectl get nodes
```

### GCP — `gcloud`

```bash
# Auth (interactive)
gcloud auth login
gcloud auth application-default login   # for ADC — most SDKs use this

# Auth (service account key)
gcloud auth activate-service-account --key-file="$GCP_SA_KEY_PATH"

# Verify
gcloud auth list
gcloud config list
gcloud projects list --format="value(projectId,name)"

# Switch project
gcloud config set project <project-id>
```

**Kubernetes via GKE**:

```bash
gcloud container clusters get-credentials <cluster> --region <region> --project <project>
```

### GitHub — `gh`

```bash
# Auth (interactive)
gh auth login

# Auth (headless)
echo "$GH_TOKEN" | gh auth login --with-token

# Verify
gh auth status
gh api user -q .login
```

### Azure DevOps — `az devops` (extension) or raw CLI

```bash
# Install extension
az extension add --name azure-devops
az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>

# Auth — use az login (if AAD-backed), or PAT
export AZURE_DEVOPS_EXT_PAT="$AZDO_PAT"

# Verify
az devops project list
az pipelines list --top 5
```

### Kubernetes — `kubectl`

```bash
# Verify current context
kubectl config current-context
kubectl config get-contexts
kubectl auth can-i get pods --namespace=<ns>

# Switch context / namespace
kubectl config use-context <ctx>
kubectl config set-context --current --namespace=<ns>
```

### Terraform / OpenTofu

```bash
# No "auth" step per se — relies on provider-level auth (az / aws / gcp / etc.)
terraform -version
terraform init
terraform plan -out plan.tfplan       # always produce a plan first; it's the "dry-run"
# Then, after explicit user approval:
terraform apply plan.tfplan
```

### Pulumi

```bash
pulumi whoami
pulumi stack ls
pulumi preview                         # the "dry-run"
pulumi up                              # with explicit confirmation
```

### Helm

```bash
helm version
helm list -A
helm diff upgrade <release> <chart> -f values.yaml   # dry-run diff (requires helm-diff plugin)
helm upgrade --install <release> <chart> -f values.yaml --dry-run --debug
```

---

## Tier 2 — API access

### Azure — Azure REST API

```bash
# Acquire a token via az (simplest)
export AZ_TOKEN=$(az account get-access-token --resource=https://management.azure.com/ --query accessToken -o tsv)

# Or via service principal OAuth2 flow
export AZ_TOKEN=$(curl -s -X POST \
  "https://login.microsoftonline.com/$AZ_TENANT_ID/oauth2/v2.0/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=$AZ_CLIENT_ID" \
  -d "client_secret=$AZ_CLIENT_SECRET" \
  -d "scope=https://management.azure.com/.default" \
  | node -e "process.stdin.pipe(require('stream').Writable({write(c,e,cb){console.log(JSON.parse(c).access_token);cb();}}))")

# Verify
curl -s -H "Authorization: Bearer $AZ_TOKEN" \
  "https://management.azure.com/subscriptions?api-version=2022-12-01"
```

### Azure DevOps — REST API

```bash
export AZDO_PAT="<token-with-Build-Read-Execute-scope>"
AZDO_BASE="https://dev.azure.com/<org>/<project>/_apis"

# Auth style: HTTP Basic, empty username, PAT as password
curl -s -u ":$AZDO_PAT" "$AZDO_BASE/connectionData?api-version=7.1"

# List pipelines
curl -s -u ":$AZDO_PAT" "$AZDO_BASE/pipelines?api-version=7.1"

# Trigger a build
curl -s -u ":$AZDO_PAT" -X POST -H "Content-Type: application/json" \
  -d '{"definition":{"id":123},"sourceBranch":"refs/heads/develop"}' \
  "$AZDO_BASE/build/builds?api-version=7.1"
```

**Windows bash — JSON handling**: Python is often unavailable. Use `node` with temp files; avoid inline `-d '{...}'` payloads (shell escaping fails with backslashes):

```bash
node -e '
var payload = { definition: { id: 123 }, sourceBranch: "refs/heads/develop" };
require("fs").writeFileSync(process.env.TEMP + "/payload.json", JSON.stringify(payload));
'
curl -s -u ":$AZDO_PAT" -X POST -H "Content-Type: application/json" \
  -d @"$TEMP/payload.json" \
  "$AZDO_BASE/build/builds?api-version=7.1" > "$TEMP/result.json"
node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.TEMP+'/result.json','utf8')).id)"
```

### GitHub — REST API

```bash
export GH_TOKEN="<PAT with repo scope, or fine-grained with Contents/Issues/Actions>"

# Verify
curl -s -H "Authorization: Bearer $GH_TOKEN" https://api.github.com/user

# Trigger a workflow
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<owner>/<repo>/actions/workflows/<workflow>.yml/dispatches \
  -d '{"ref":"main","inputs":{"environment":"dev"}}'
```

### AWS — SigV4 signing

The AWS API uses SigV4 signing, not a bearer token. For quick API calls, the CLI is strictly easier than raw curl. If curl is required (automation), use `aws-sigv4` tooling, or call via the `awscurl` wrapper, or let the SDK do the signing.

### GCP — REST API

```bash
export GCP_TOKEN=$(gcloud auth print-access-token)

# Verify
curl -s -H "Authorization: Bearer $GCP_TOKEN" \
  "https://cloudresourcemanager.googleapis.com/v1/projects"
```

### Jira Cloud — REST API

```bash
export JIRA_EMAIL="user@example.com"
export JIRA_API_TOKEN="<token from id.atlassian.com>"
export JIRA_HOST="example.atlassian.net"

# Verify
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "https://$JIRA_HOST/rest/api/3/myself"
```

### Linear — GraphQL API

```bash
export LINEAR_API_KEY="<personal API key from linear.app/settings/api>"

# Verify
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { viewer { id name email } }"}'
```

### Kubernetes — raw API

```bash
# Kubectl can proxy the API locally — useful if you need curl-style access
kubectl proxy --port=8001 &
curl -s http://localhost:8001/api/v1/namespaces
# Kill the proxy when done: kill %1
```

---

## Tier 3 — Web access

### Via a browser MCP server (Playwright MCP, puppeteer MCP, etc.)

Check that a browser MCP is configured:

- In Claude Code / Copilot: list MCP servers (`/mcp`, or check `.mcp.json`)
- Probe for tool names like `mcp__playwright__navigate`, `mcp__puppeteer__click`

If present, the skill can drive the browser. Typical flow:

1. `navigate` to the vendor's login URL
2. User completes any MFA step manually
3. Skill navigates to the target page
4. Skill reads back the DOM or screenshots it
5. Skill proposes actions (click X, fill Y) and executes with user confirmation

### Without a browser MCP — pair-driven

If no MCP is available, the skill dictates steps and the user drives the browser:

1. Skill: "Open https://portal.azure.com/#resource/subscriptions/..."
2. User: confirms they're on the page
3. Skill: "Click 'Overview' → 'Running pods'. Report what you see."
4. User: types back or pastes a screenshot
5. Skill: "Now click 'Restart' on pod `payments-api-abc123`. Confirm before clicking."
6. User: clicks, reports outcome

This mode is **slow and lossy**. Document it as "interactive pair mode" and only use it when no better option exists.

### Web is "more complex" — what that means

Compared to CLI / API, web access:

- Cannot be safely automated without a browser MCP (DOMs change, selectors break)
- Has no standard audit trail (no shell history)
- Usually requires human-in-the-loop for MFA
- Is the first to break on vendor UI updates

Crystallized skills that depend on web access should **embed a warning in their description**: "Fragile: depends on the vendor's web UI, may break on UI changes. Preferred path is CLI or API; see `references/access-patterns.md`."

---

## Common failure modes and remediations

| Symptom | Likely cause | Fix |
|---|---|---|
| `az: command not found` (bash on Windows) | PATH doesn't include Azure CLI | `export PATH="$PATH:/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin"` |
| `kubectl` returns `Forbidden` | RBAC denies the current user | Ask an admin for a `view` / `edit` RoleBinding on the target namespace |
| `az acr` returns `connectivity_forbidden_error` | Registry requires VPN / VNet | Ask the user to enable VPN; as fallback, read image tags from CI logs |
| `gh auth status` says `not logged in` | No gh session | `gh auth login` interactively, or `echo $GH_TOKEN | gh auth login --with-token` |
| Azure DevOps API returns `JsonReaderException` | Windows shell escaping broke inline JSON payload | Write payload via `node` to `$TEMP/payload.json`, use `curl -d @$TEMP/payload.json` |
| Azure DevOps pipeline created but doesn't auto-trigger | Missing `triggers[]` array with `settingsSourceType: 2` | Add the trigger block pointing to YAML-defined triggers |
| Pulumi / Terraform hangs on apply | Asking for interactive input (y/n) | Use `-auto-approve` only after explicit dry-run review; never in destructive ops without user confirmation |
| `aws sts` returns `ExpiredToken` | SSO session expired | `aws sso login --profile <profile>` |
| Jira API returns 401 | API token valid but email mismatched | Verify `JIRA_EMAIL` matches the token's owner |
| Linear API returns 400 | GraphQL query malformed | Validate with `linear.app/graphql` playground first |

---

## Auth model summary for crystallized skills

Every generated skill (Phase 5 output) must declare its auth model in the frontmatter and in a **Pre-check auth** section. Standard shape:

```markdown
## Pre-check auth

This skill requires <tier> access to <target>. Verify before running:

\`\`\`bash
<verify command>
\`\`\`

Expected output: <non-empty string / specific context name / etc.>

If it fails:
- Run <auth command> (interactive), OR
- Set env var <NAME> (document scope/permissions required), OR
- Ask your platform team for <specific permission>
```

No secrets in the generated skill. Never. Secrets live in the user's shell or in `.env` (gitignored).
