# Access model — the shared "access-first" reference

Single source of truth for how NONoise skills reach the target environment (cloud, CI, ticket tracker, observability backend, etc.). Consumed by at least:

- [`ops-skill-builder`](../ops-skill-builder/SKILL.md) — Phase 1 "access menu"
- [`observability-debug`](../observability-debug/SKILL.md) — Phase 2 "access check"
- Any future skill that negotiates credentials with a third-party system

Each consumer may add **tool-specific probes** in its own adapter / reference files (e.g. `ops-skill-builder/references/access-patterns.md` keeps the Azure-specific probe snippets). The **philosophy and generic recipes** live here.

This file is self-standing — readable without opening any SKILL.md.

---

## 1. The access tiers — CLI > API > Web

NONoise follows a tiered preference. The AI always proposes the cheapest tier first; the user chooses.

| Tier | Rank | When it wins | When it loses |
|---|---|---|---|
| **CLI** | 1st | A vendor CLI (`az`, `aws`, `gcloud`, `gh`, `kubectl`, `helm`, `terraform`, `pulumi`, vendor-specific) is installed, authenticated, and its session is alive. Shell history gives a free audit trail. Fastest, most scriptable, lowest setup cost. | CLI absent (air-gapped, locked container, CI without binaries), SSO forced for every command, rate-limits tighter than the REST API. |
| **API** | 2nd | CLI unavailable or painful. The user supplies a token (PAT, service-principal credential, OIDC federated token) via an env var the skill reads at runtime. Suits CI and non-interactive shells. | Backend has no public REST surface for the operation; SigV4-style signing makes raw `curl` harder than the CLI. |
| **Web** | 3rd | CLI and API are both closed (vendor only exposes the web UI, or the specific operation is portal-only). | **Always more complex than the other two**: no stable selectors, no audit trail unless a browser MCP captures it, MFA in the loop, breaks on every vendor UI refresh. |

### Rationale (why this order, not alphabetical)

1. **Audit** — CLI commands land in shell history; API calls can be mirrored to a log with `--trace` or a proxy; Web has no native audit unless a browser MCP records traces.
2. **Reproducibility** — a captured CLI sequence is a shell script; an API sequence is a curl script; a Web sequence is brittle DOM choreography.
3. **Cost to set up** — a CLI is usually already there; a token is 30 seconds; configuring a browser MCP is 10 minutes and adds a dependency.
4. **Cost to maintain** — CLIs are versioned and stable; APIs are versioned; DOMs change weekly.

### Trade-offs to surface to the user

- If CLI rate-limits are too tight for a bulk operation, **deliberately choose API** — but tell the user and capture the decision.
- If the task is genuinely UI-only (e.g. configure something that has no CLI/API surface), **acknowledge Web is fragile** and embed that warning in any crystallized skill that ships with a web-tier path.

---

## 2. The access-probe pattern

Before attempting any real operation, verify the access path works. The probe is **cheap, read-only, and unmistakable** — a command whose non-zero exit or empty response is a clear "not authenticated".

### Generic probe recipe — specialize per tool

```text
1. Ensure the CLI/SDK is on PATH (Windows bash: export PATH=... before every block)
2. Run a "whoami" that requires auth but mutates nothing:
     CLI  : az account show | aws sts get-caller-identity | gcloud auth list | gh auth status | kubectl config current-context | pulumi whoami
     API  : GET /user | GET /_apis/connectionData | GET /myself | whatever the vendor calls "who am I"
     Web  : check that the browser MCP is configured and can navigate (pure tool discovery, no network call yet)
3. Parse the output for identity + scope (tenant, subscription, account, org, project)
4. On failure: STOP. Do not proceed. Print the remediation and wait for the user.
```

### Probe checklist — what it must verify

- [ ] Identity is resolved (user / service principal / role ARN / bot name)
- [ ] Scope is correct (subscription, region, project, org, namespace)
- [ ] Permissions roughly match the coming operation (a `can-i` check when supported — e.g. `kubectl auth can-i get pods -n <ns>`)
- [ ] Token / session is not expired (check `exp`, or rely on the CLI's own error)

### Where to specialize

- **`ops-skill-builder`** — every entry in `references/access-patterns.md` declares the CLI/API probe for its provider.
- **`observability-debug`** — every adapter's `authenticate()` method IS the probe for that backend; it documents its env vars and CLI prereqs in the adapter file (`adapter-<backend>.md`).

Adapters document their own auth via env vars (e.g. `<BACKEND>_API_KEY`, `<BACKEND>_APP_ID`, cloud-CLI sessions); the shared contract here is just "a probe exists and is cheap".

---

## 3. The fallback protocol — tier N fails, move to tier N+1

### The rule

When the preferred tier fails, **do not silently pick another**. Always:

1. **Explain** — what probe failed, what error came back, what that likely means (expired token, missing CLI, network block).
2. **Propose** — the next tier down with its trade-offs.
3. **Ask** — get explicit user consent before switching.
4. **Record** — note the switch in the execution log so the crystallized skill reflects what actually worked.

### Worked example

```text
[probe] tier=cli  cmd="az account show"  → ERROR  "Please run 'az login' to setup account."
[propose]
  Option A (preferred): you run 'az login' in a separate terminal, then I re-probe.
  Option B (fallback, tier=api): you set AZ_CLIENT_ID / AZ_CLIENT_SECRET / AZ_TENANT_ID
                                  and I use the REST API with a client-credentials token.
  Option C (last resort, tier=web): I drive the Azure Portal via the browser MCP;
                                    slower, fewer operations automatable.
  Which do you prefer? (A/B/C)
[user] A
[await] user runs az login, confirms
[probe] tier=cli  cmd="az account show"  → OK  subscription=... tenant=...
[proceed]
```

### When ALL three fail

Stop. Ask the user to choose from:

- Install the missing CLI (print the install command; the user runs it — LSP/runtime installs are advisor-only per the global rule).
- Generate the missing token (link to the provider's token-generation doc).
- Configure the missing browser MCP (see section 7 below).
- Defer the operation.

Never invent credentials. Never prompt the user for a secret in chat — always point them at an env var or a secure token-manager.

---

## 4. Never-silent-login rule

**The skill MUST NOT run any of these commands on its own:**

```bash
az login
aws sso login
aws configure sso
gcloud auth login
gcloud auth application-default login
gh auth login
pulumi login
kubectl config *credentials
docker login
npm login
helm registry login
```

These commands typically:

- Open an **interactive browser** or read stdin — they will hang a non-interactive shell.
- Change the user's global auth state (affects other terminals and tools).
- Can generate long-lived cached credentials — a security-relevant side effect.

### What the skill DOES instead

1. **Print the exact command** to the user, prefixed with `! ` (the Claude Code / Copilot convention for "run this in your prompt, not in the agent shell").
2. **Explain why** — one sentence: "I can't run this myself because it opens a browser window for MFA."
3. **Wait** for the user to confirm they've run it.
4. **Re-probe** — the same cheap "whoami" from section 2 — to confirm the session is now alive.

Example:

```text
Please run this in your terminal (not the agent shell):

  ! az login --tenant <tenant-id-or-name>

This opens an MFA browser window. Tell me when you're done and I'll re-probe.
```

### Exceptions (narrow)

- **Headless service-principal login** with credentials already in env vars (`az login --service-principal ...`) is technically non-interactive and safe; still, require the user to have explicitly set the env vars themselves, and announce the command before running it.
- **OIDC federated-token login in CI** is designed to run silently (section 6); that's its whole point. The rule applies to developer machines, not to crystallized ops skills running in a pipeline.

---

## 5. Auth via env vars — the convention

### The shape

| Kind | Env var pattern | Example |
|---|---|---|
| Personal Access Token | `<TOOL>_TOKEN` or `<TOOL>_PAT` | `GH_TOKEN`, `AZDO_PAT`, `GITLAB_TOKEN` |
| API key | `<TOOL>_API_KEY` | `LINEAR_API_KEY`, `DD_API_KEY`, `APPINSIGHTS_API_KEY` |
| App/client key (paired) | `<TOOL>_APP_KEY` + `<TOOL>_API_KEY` | `DD_APP_KEY` + `DD_API_KEY` |
| Service principal (Azure) | `AZ_CLIENT_ID`, `AZ_CLIENT_SECRET`, `AZ_TENANT_ID` | — |
| User credentials (Basic auth) | `<TOOL>_USER` + `<TOOL>_TOKEN` | `JIRA_EMAIL` + `JIRA_API_TOKEN` |
| Endpoint overrides | `<TOOL>_HOST`, `<TOOL>_URL`, `<TOOL>_BASE_URL` | `LOKI_URL`, `JIRA_HOST` |

Keep names **namespaced by tool**. Do not reuse `TOKEN` or `API_KEY` bare — they collide across tools.

### Where to document them

- **Project README** — a table: env var, purpose, where to generate, required scope. This is the single public declaration of the skill's auth contract.
- **`.env.example`** at the repo root — every env var listed with a placeholder value. Real values live in `.env` (gitignored) or the user's shell.
- **Skill SKILL.md** — mentions the variable names in the "Pre-check auth" section but does **not** re-document scopes / generation steps. That's what the README is for — single source of truth.

### What NOT to do

- Never cache a token in a file the skill controls (no `~/.nonoise/tokens.json`). The user's shell or `.env` owns lifecycle.
- Never write an env var to `nonoise.config.json` (it's committed).
- Never prompt for a secret value inline. If the variable is missing, tell the user "set `<NAME>` via your shell or `.env`, see README § Auth".

---

## 6. OIDC federation for CI — the modern recommended pattern

Long-lived PATs / static client secrets are the historical default in CI. OIDC federation removes them entirely: the CI provider (GitHub Actions, GitLab, Azure Pipelines) issues a short-lived identity token on each run, and the cloud provider exchanges it for a short-lived access token bound to a specific workload.

**Prefer OIDC whenever the CI provider and cloud provider both support it.**

### 6.1 GitHub Actions → Azure (Workload Identity)

Setup on the Azure side (one-time, via `az` or the Portal):

```bash
# 1. Create an Entra ID app registration + service principal
az ad app create --display-name "gh-actions-<repo>"
APP_ID=$(az ad app list --display-name "gh-actions-<repo>" --query "[0].appId" -o tsv)
az ad sp create --id "$APP_ID"

# 2. Configure a federated credential (GitHub → Entra ID trust)
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gh-actions-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<owner>/<repo>:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
# Repeat with subject: "repo:<owner>/<repo>:environment:<env-name>" for environment-scoped jobs
# Or:                   "repo:<owner>/<repo>:pull_request"         for PR-triggered jobs

# 3. Assign a role on the target scope
az role assignment create --assignee "$APP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/<rg>"
```

Workflow (GitHub Actions side):

```yaml
permissions:
  id-token: write         # required for OIDC token issuance
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: az account show    # the probe from section 2
      - run: az deployment group create ...
```

No secrets stored in GitHub. Identity is tied to the branch / environment / PR trigger, not to a human who may leave.

### 6.2 GitHub Actions → AWS (IAM OIDC)

Setup on the AWS side (one-time):

```bash
# 1. Create the OIDC identity provider (once per AWS account)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# 2. Create an IAM role with a trust policy that restricts assume to GitHub runs
cat > trust.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:<owner>/<repo>:ref:refs/heads/main" }
    }
  }]
}
JSON
aws iam create-role --role-name gh-actions-deploy --assume-role-policy-document file://trust.json
aws iam attach-role-policy --role-name gh-actions-deploy --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

Workflow:

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<account>:role/gh-actions-deploy
          aws-region: us-east-1
      - run: aws sts get-caller-identity     # probe
      - run: aws s3 sync ./dist s3://my-bucket
```

### 6.3 GitHub Actions → GCP (Workload Identity Federation)

Setup on the GCP side (one-time):

```bash
# 1. Create a Workload Identity Pool + Provider
gcloud iam workload-identity-pools create "github-pool" \
  --project="<project>" --location="global" --display-name="GitHub pool"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="<project>" --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository == '<owner>/<repo>'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 2. Bind a service account to the pool for the specific repo
gcloud iam service-accounts add-iam-policy-binding "deploy-bot@<project>.iam.gserviceaccount.com" \
  --project="<project>" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/<n>/locations/global/workloadIdentityPools/github-pool/attribute.repository/<owner>/<repo>"
```

Workflow:

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/<n>/locations/global/workloadIdentityPools/github-pool/providers/github-provider
          service_account: deploy-bot@<project>.iam.gserviceaccount.com
      - uses: google-github-actions/setup-gcloud@v2
      - run: gcloud auth list      # probe
      - run: gcloud run deploy my-service --image=...
```

### 6.4 When to prefer OIDC over long-lived PATs

**Prefer OIDC** when:

- The CI provider supports it (GitHub Actions, GitLab, Azure Pipelines, Bitbucket Pipelines all do).
- The cloud provider supports it (Azure, AWS, GCP all do).
- The operation runs **only from CI** — not from a developer laptop.

**Security argument**:

- No secret in the CI vault to rotate, revoke, or leak.
- Token expires in minutes (default ~1h), not years.
- Trust is **scoped to the workflow** (branch, environment, PR status) via the subject claim — a compromised repo can't use the identity from an unrelated branch.

**Keep PATs** when:

- The third party (GitHub itself, Jira, Linear, a legacy system) has no OIDC support.
- A human developer's tools need credentials (laptop `gh auth login`, `az login`).

### 6.5 Common OIDC gotchas

| Gotcha | Symptom | Fix |
|---|---|---|
| **Audience mismatch** | `AADSTS700024: Client assertion is not within its valid time range` or `InvalidIdentityToken` from STS | Align the `audience:` requested by the GitHub action with the one the cloud side accepts (`api://AzureADTokenExchange`, `sts.amazonaws.com`, your GCP provider's default) |
| **Subject claim too broad or too narrow** | `AADSTS70021: No matching federated identity record found` / AWS `Not authorized to perform sts:AssumeRoleWithWebIdentity` | The `subject` in the federated credential must match the exact combination used by the workflow: `repo:<owner>/<repo>:ref:refs/heads/<branch>` vs `:environment:<env>` vs `:pull_request`. Create one credential per trigger. |
| **`permissions: id-token` missing** | The step that requests the token 401s | Every job that calls OIDC login needs `id-token: write` at the job or workflow level. Default is `none` on recent GH Actions settings. |
| **Trust policy too permissive** | Security review flags the role | Always include `StringLike` / attribute conditions on the repository and branch/environment — not just the issuer. |
| **Role permissions too broad** | Least-privilege lint fails | Scope the attached policy to the exact resources and actions the workflow needs (no `*:*`). |
| **Token endpoint blocked** | `could not fetch identity token` | Self-hosted runners behind a proxy need `ACTIONS_ID_TOKEN_REQUEST_URL` and `ACTIONS_ID_TOKEN_REQUEST_TOKEN` to reach `token.actions.githubusercontent.com`; whitelist that host. |

Similar OIDC flows exist for **GitLab → Azure/AWS/GCP**, **Azure Pipelines → AWS/GCP**, and **Bitbucket → AWS**. The pattern is the same: CI issues an ID token, cloud validates issuer + audience + subject claim, and exchanges it for a short-lived access token. Follow the vendor's current docs — these APIs evolve.

---

## 7. Browser-MCP pin per AI tool

When tiers 1 and 2 are unavailable and the operation is Web-only, the skill drives a browser through an **MCP server**. The exact package + config depends on which AI tool is hosting the skill.

### 7.1 Claude Code — `@microsoft/playwright-mcp`

Canonical pick (as of 2026):

```bash
# Install via Claude Code plugin CLI (recommended)
/plugin install playwright@claude-plugins-official

# OR configure an MCP server manually in the user's .mcp.json:
```

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

Expected tool names after install: `mcp__playwright__navigate`, `mcp__playwright__click`, `mcp__playwright__fill`, `mcp__playwright__screenshot`, `mcp__playwright__evaluate`.

Verify the MCP is loaded:

```text
/mcp
# should list "playwright" in the attached servers
```

### 7.2 GitHub Copilot CLI — equivalent path

Copilot reads its MCP config from `.vscode/mcp.json` (per-project) or `~/.copilot/mcp.json` (per-user). Same Playwright MCP package works:

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

In Copilot CLI, verify with the MCP listing:

```text
copilot mcp list
# playwright   stdio   npx -y @playwright/mcp@latest
```

Tool names are exposed with the same `playwright_*` prefix (Copilot's naming convention strips the `mcp__` prefix but keeps the server name).

### 7.3 Fallback — no MCP configured (pair-driven)

If neither tool has a browser MCP configured and the user doesn't want to install one, the skill **degrades to "interactive pair mode"**:

- The skill **dictates** the next action ("Navigate to X", "Click button Y").
- The **user drives** the browser and reports back (screenshot, pasted text, yes/no).
- The skill does **not** try to simulate what would have happened.

What can still work in pair mode:

- One-shot operations where the user only needs a recipe (login, enable a setting, export a file).
- Diagnostic flows where reading back a screen is enough.

What breaks in pair mode:

- Loops over N items (N > ~5 becomes unbearable).
- Anything requiring precise timing or concurrency.
- Anything that must be captured in a crystallized skill (pair mode is not automatable).

A crystallized skill that relies on pair mode must flag this in its description: *"Interactive-only: the AI dictates, the user clicks. Not runnable in CI."*

---

## 8. Anti-patterns — applicable to any access-first skill

| # | Anti-pattern | Why it hurts |
|---|---|---|
| 1 | **Hardcoding auth in a skill body** (tokens, client secrets, passwords in SKILL.md or committed files) | Leaks on git push; revoking is expensive; violates every org's security policy. |
| 2 | **Caching tokens in skill-controlled files** (e.g. `~/.<skill>/tokens.json`) | Duplicates state the vendor CLI / shell already manages; silent expiry; cross-user contamination. |
| 3 | **Skipping the probe** (jumping straight to the real operation) | Opaque errors mid-operation; partial side effects before the auth failure is surfaced. |
| 4 | **Silent downgrade** (tier 1 fails, skill uses tier 2 without asking) | User loses visibility; crystallized skill records the wrong tier; audit trail misleads. |
| 5 | **Running `az login` / `aws sso login` / `gh auth login` silently** | Hangs on MFA; changes user's global state; violates the never-silent-login rule. |
| 6 | **Web as the default tier** | Inverts the preference; costs 10x more to automate; breaks on every UI refresh. |
| 7 | **Re-documenting env vars in every SKILL.md** | Drift across skills; single source of truth should be the project README. |
| 8 | **Using long-lived PATs where OIDC works** | Accumulates secret debt; rotation is manual; breach surface is long. |
| 9 | **Ignoring scope checks** (`kubectl auth can-i ...`, role ARN match) | Skill "works" until it hits a boundary and fails cryptically mid-operation. |
| 10 | **Inventing a correlation / trace / tenant ID** when probing | Falsifies telemetry; observability-debug explicitly forbids this. |
| 11 | **Prompting for a secret value in chat** ("paste your token") | Secret ends up in the transcript; violates the "env var or nothing" rule. |
| 12 | **Leaving the access negotiation out of the execution log** | Crystallized skill cannot reproduce what actually worked. |

---

## See also

- `../ops-skill-builder/references/access-patterns.md` — concrete per-tool probes (Azure, AWS, GCP, GitHub, Azure DevOps, Kubernetes, Terraform, Pulumi, Helm, Jira, Linear) with Windows-bash quirks.
- `../observability-debug/references/adapter-*.md` — concrete per-backend auth (App Insights, Datadog, Grafana/Loki, CloudWatch, OTel collector, generic log file). Each adapter specializes the probe pattern from section 2.
- Project README and `.env.example` — single source of truth for which env vars the user must set.
