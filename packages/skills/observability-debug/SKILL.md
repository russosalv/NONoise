---
name: observability-debug
description: Observability-driven debugging, triage, and performance analysis. Ingests traces, logs, and exceptions from any configured backend (App Insights, Datadog, Grafana+Loki, CloudWatch, OpenTelemetry collector, or a generic log file), correlates them by request/trace ID, walks the call chain, identifies the root cause in source code, and proposes a fix with file:line precision. Backend-agnostic via adapter pattern — same methodology across backends. USE whenever the user mentions errors, latency, production incidents, or triage — even without naming a tool. Triggers — pasted correlation/trace/operation/request IDs, browser console errors, HTTP status codes (500, 401, 403, 504, timeout), performance complaints ("is slow", "is lagging"), phrases like "what's broken", "why isn't this working", "check the logs", "triage this", "find the exception for request Y", "what changed in prod in the last hour".

source: Risko reference-project (reworked whitelabel for NONoise)
variant: nonoise generic; stack-neutral; adapter pattern
---

# observability-debug — From symptom to fix via traces

This skill is a **coach + executor**. It walks you from a raw symptom (an error, a slow page, a user report) to a concrete fix with `file:line` precision, using whatever observability backend you already have. The **methodology** is universal; the **adapter** encapsulates backend-specific authentication, query language, and response shape.

Like its sibling [`ops-skill-builder`](../ops-skill-builder/SKILL.md), this skill follows an **access-first philosophy**: it never fabricates a trace. If you do not have a working access path to your observability backend, the first thing the skill does is walk you through setting one up — or degrading to the generic log file adapter.

## Position in the debugging workflow

```
┌───────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────────┐   ┌─────────────────┐
│ symptom   │──▶│ adapter      │──▶│ query &      │──▶│ correlate     │──▶│ root-cause +    │
│ elicit    │   │ select +     │   │ ingest       │   │ with source   │   │ fix proposal    │
│ (phase 0) │   │ access check │   │ traces/logs  │   │ (codebase)    │   │ (file:line)     │
│           │   │ (phase 1-2)  │   │ (phase 3)    │   │ (phase 4)     │   │ (phase 5)       │
└───────────┘   └──────────────┘   └──────────────┘   └───────────────┘   └─────────────────┘
                                                                                   │
                                                                                   ▼
                                                                         ┌──────────────────┐
                                                                         │ crystallize      │
                                                                         │ (optional)       │
                                                                         │ → skill-creator  │
                                                                         │ (phase 6)        │
                                                                         └──────────────────┘
```

Phases 0 → 5 are always executed. Phase 6 is opt-in.

## What this skill does

1. **Elicits the symptom** — error message, timing, correlation ID, affected user/endpoint/tenant.
2. **Selects the adapter** — reads `nonoise.config.json.observability.backend` when set, otherwise asks. Falls back to the `generic-log-file` adapter.
3. **Probes access** — verifies the selected adapter is reachable. If not, coaches the user through authentication (env vars, CLI login, OIDC).
4. **Fetches traces/logs** — calls the adapter's contract methods to pull all telemetry for the correlation ID, or a time-range window.
5. **Correlates with code** — matches stack frames, file paths, function names in the traces to actual files in the repo via `Grep` / `Read` / (optionally) `graphify` queries.
6. **Explains and proposes a fix** — narrates the chain of events in plain language; proposes a concrete patch with file:line, a minimal diff, and a regression test.
7. **Optionally crystallizes** — if the debugging flow is worth reusing, offers to save it as a project-local skill via [`skill-creator`](../skill-creator/SKILL.md).

## What this skill does NOT do

- **Does not apply fixes automatically** — it proposes; the user (or a downstream skill) applies.
- **Does not edit the observability backend** — read-only on telemetry.
- **Does not hardcode query language** — KQL, LogQL, CloudWatch Logs Insights, PromQL, etc. are **adapter-specific**. The core flow calls the adapter's contract methods.
- **Does not assume Azure / AWS / any cloud** — each adapter is optional and declares its own auth model.
- **Does not silently pick an adapter** — if the choice is ambiguous, the skill asks.

---

## The adapter contract

Every observability adapter must implement these five operations. This is the **contract** — the core flow of the skill calls these methods regardless of the underlying backend.

| Operation | Input | Output | Purpose |
|---|---|---|---|
| `authenticate()` | (reads env vars / CLI session) | `ok` or a precise "how to set me up" message | Proves identity to the backend; runs once per skill session |
| `query_by_correlation_id(id, time_range)` | correlation/trace/request ID + optional offset (e.g. `6h`) | Structured list of spans/logs/exceptions ordered by timestamp | Primary drill-down — one ID, everything about it |
| `query_by_time_range(start, end, filter)` | time window + filter (service, endpoint, severity, user) | Structured list of matching records | For broader sweeps when no ID is known |
| `get_exception_details(exception_id)` | backend-native exception/event reference | Full stack trace, inner messages, custom dimensions | Targeted deep dive once a candidate exception is found |
| `list_sampled_errors(time_range, severity)` | time window + severity floor | Grouped, counted errors (by endpoint, service, status code) | "What's breaking lately?" — triage entry point |

An adapter **may** implement more — but the skill's core flow only relies on these five. Any additional capability must be documented in the adapter's reference file.

### Canonical event shape

Every adapter must normalize its results into a tracker-agnostic shape before returning. Stable field names across adapters = no backend-specific code leaks into the core flow:

```yaml
timestamp: "2026-04-18T09:32:14.112Z"
kind: "request" | "dependency" | "exception" | "log"
correlation_id: "abc-123-…"          # unified across adapters
service: "orders-api"                  # backend: cloud_RoleName / service.name / host
operation: "POST /orders"              # backend: name / endpoint
status: "failure" | "success" | "unknown"
status_code: 500                       # http/grpc/custom
duration_ms: 342                       # null if not applicable
target: "sql-server"                   # for dependency kind; backend-specific
exception:                             # populated only on kind=exception
  type: "NullReferenceException"
  message: "Object reference not set…"
  stack: |
    at Foo.Bar(Baz.cs:line 42)
    …
raw: { … }                             # adapter-specific passthrough for advanced use
```

The skill consumes this shape throughout phases 3–5. Adapters that cannot populate a field set it to `null`.

---

## Available adapters

| Adapter | Status | Ships with v1? | Reference |
|---|---|---|---|
| `app-insights` | Implemented (first-class v1 adapter) | Yes | [`references/adapter-app-insights.md`](./references/adapter-app-insights.md) |
| `datadog` | Usable stub (documented API + env var auth) | Yes | [`references/adapter-datadog.md`](./references/adapter-datadog.md) |
| `grafana-loki` | Usable stub (documented LogQL API) | Yes | [`references/adapter-grafana-loki.md`](./references/adapter-grafana-loki.md) |
| `cloudwatch` | Usable stub (AWS CLI wired, Logs Insights) | Yes | [`references/adapter-cloudwatch.md`](./references/adapter-cloudwatch.md) |
| `otel-collector` | Document-only stub (OTLP + Jaeger + Prometheus) | Yes | [`references/adapter-otel-collector.md`](./references/adapter-otel-collector.md) |
| `generic-log-file` | Implemented fallback — works offline on a flat log | Yes | [`references/adapter-generic-log-file.md`](./references/adapter-generic-log-file.md) |

"Usable stub" = auth + query shape documented; the user can copy the commands and use them manually, and wiring them into a full adapter is mostly about response parsing. "Document-only" = the backend requires too much project-specific config to ship a default wiring.

Promoting a stub to a full adapter is **non-breaking** — the contract stays the same.

---

## Configuration — `nonoise.config.json.observability`

**Proposed schema** (the skill uses it when present; it works without it by asking the user):

```json
{
  "observability": {
    "backend": "app-insights",
    "settings": {
      "applicationId": "<app-insights-application-id>"
    },
    "correlationIdHeader": "X-Correlation-Id",
    "fallback": "generic-log-file",
    "fallbackSettings": {
      "path": "./logs/app.log",
      "format": "json-lines"
    }
  }
}
```

Supported `backend` values: `app-insights`, `datadog`, `grafana-loki`, `cloudwatch`, `otel-collector`, `generic-log-file`, or `ask` (always prompt the user).

If the key is missing, the skill asks the user. If the chosen backend's auth fails, the skill offers to degrade to the configured `fallback`.

> **Note**: this skill only **reads** the config; it never writes to `nonoise.config.json`. Adding the `observability` section is the user's responsibility. The schema above is a proposal — future NONoise versions may bless it formally.

---

## Correlation ID propagation

The skill's effectiveness depends on **one** thing: being handed a correlation ID that links client, server, and downstream calls. This is a **project discipline** concern — the skill documents best practices, but it cannot retrofit missing propagation.

### Inbound — client to server

- Use **W3C Trace Context** headers: `traceparent` + `tracestate`. OpenTelemetry instrumentation handles this automatically.
- Or a simpler custom header, typically `X-Correlation-Id` / `X-Request-Id` — pick one and be consistent.
- The front-end generates the ID at the earliest safe point (e.g. when the user clicks "Submit") and attaches it to **every** outbound request tied to that logical action.

### Downstream — server to its dependencies

- Propagate the same ID on **every** outbound call (HTTP to other services, message queues, Dapr sidecars, database calls via a custom SQL tag if supported).
- Stamp it on **every** log line and every exception via your logger's MDC / scoped property / custom dimension.

### Surfacing to the user

The project's vision:

> "If you're smart, when there's an error on the client, show the correlation ID or pluck it from your metrics system. Just hand that to me."

Concretely:

- **Error page / toast** shows the correlation ID ("If you contact support, reference ID `abc-123`").
- **Browser console** logs it on every failure.
- **Support dashboards / metrics UI** lets operators copy it from a row.
- The user pastes it into chat, or points to a URL in the backend's UI (Azure Portal, Datadog, Grafana) and the skill extracts the ID from the URL.

### How the skill receives the ID

Any of these is fine — the skill normalizes:

- Pasted string: `"abc-123-def"` or `operation_Id=abc-123`.
- Pasted URL from the backend's web UI — the skill extracts the ID from known URL patterns per adapter (see adapter references).
- Pasted screenshot of an error page — ask the user to type the ID if OCR isn't reliable.
- **No ID** — the skill degrades to `query_by_time_range` + filter (service/endpoint/user/time window).

---

## Flow — 6 phases

### Phase 0 — symptom elicitation

Before doing anything, ask. One question at a time, multiple-choice preferred.

1. **What's the symptom?** — offer: error message / slow page / unexpected behavior / intermittent failure / monitoring request.
2. **Do you have a correlation ID / trace ID / request ID?** — if yes, paste. If no, continue.
3. **If no ID**: *approximate time of failure* (last 5 min / last hour / specific timestamp), *affected surface* (endpoint / page / user / tenant / cluster), *how the symptom was observed* (user reported / automated alert / browser console / log tail).
4. **Severity floor** — only errors, or also warnings? (informs phase 3 query).

Summarize in one sentence: *"I'm investigating `<symptom>` for `<ID or scope>` in the last `<window>`. Proceeding to adapter selection."* — then move on.

### Phase 1 — adapter selection

1. **Read `nonoise.config.json`** at repo root. If `observability.backend` is set, propose it and ask for confirmation (one-word confirm or override).
2. **Else, infer from `docs/architecture/`** — grep for known markers:
   - "Application Insights" / "App Insights" → `app-insights`
   - "Datadog" → `datadog`
   - "Grafana" / "Loki" → `grafana-loki`
   - "CloudWatch" / AWS-heavy stack → `cloudwatch`
   - "OpenTelemetry collector" / "OTLP" → `otel-collector`
3. **Else, ask** the user explicitly via multiple choice: `app-insights | datadog | grafana-loki | cloudwatch | otel-collector | generic-log-file`.
4. **Announce the choice** — "Using `<adapter>`. Reference: `references/adapter-<adapter>.md`."

### Phase 2 — access check

This skill follows the shared **access-first** methodology documented in [`../_shared/access-model.md`](../_shared/access-model.md) (CLI > API > Web preference, cheap read-only probes, never-silent-login, explicit fallback protocol, OIDC for CI). Each adapter specializes the generic probe into its own `authenticate()` implementation and documents the required env vars / CLI prerequisites in its `adapter-<backend>.md` reference file.

Call `authenticate()` on the chosen adapter. Three outcomes:

- **Ok** — print one line (*"`<adapter>` authenticated"*) and advance to phase 3.
- **Fails with a remediation known to the adapter** — print the exact commands the user must run (e.g. `! az login`, `export DD_API_KEY=…`, `! aws sso login`), then wait for the user to run them. Per the never-silent-login rule in `_shared/access-model.md` § 4, **do not run auth commands yourself** — they typically need an interactive browser/MFA prompt. Re-probe after user confirmation.
- **Fails unrecoverably** — offer to degrade to the configured `fallback` adapter (default `generic-log-file`). Confirm before switching (never silently downgrade; see `_shared/access-model.md` § 3).

The adapter reference files document every required env var, CLI prerequisite, and OIDC flow. Do **not** hardcode these in SKILL.md — they live per-adapter.

### Phase 3 — query and ingest

**Strategy depends on what the user provided in phase 0.**

#### Sub-flow A — correlation ID present

Call `query_by_correlation_id(id, time_range)`. Default `time_range` is `6h` unless the user said otherwise. If the result is empty, retry with widening windows (`24h`, then `7d`) and, if still empty, warn: *"No telemetry found for ID `<id>` in the last 7 days — the ID may be wrong, the backend may not have received the trace, or the logging level may be too low to capture it. Read `references/adapter-<adapter>.md` for backend-specific empty-result diagnostics."*

On a non-empty result, list sampled exceptions via `get_exception_details` for each distinct exception in the trace.

#### Sub-flow B — no ID, but a scope

Call `list_sampled_errors(time_range, severity)` to surface the top N error clusters.

For each cluster, pull one sample ID and descend into sub-flow A.

This also serves as the default for *"what's broken lately?"* requests (no specific symptom, just a health-check).

#### Sub-flow C — monitoring loop

User wants to keep watching. Invoke the [`loop`](../../skills/loop/SKILL.md) (or harness-native equivalent) with a 1–5 min cadence; on each tick, call `list_sampled_errors` and diff against the last seen set. Report only newly appearing error clusters. Maintain the seen set between iterations.

#### Building the timeline

Whatever sub-flow ran, the phase's output is a **timeline of events** ordered by timestamp:

```
T+0ms    REQUEST   POST /orders           orders-api     started
T+12ms   DEPEND    SQL INSERT Orders      sql-server     ok
T+45ms   DEPEND    HTTP POST inventory    inventory-api  FAILED (504)
T+45ms   EXCEPTION TimeoutException       orders-api     "Inventory did not…"
T+46ms   REQUEST   POST /orders           orders-api     status=500
```

Present this to the user as a compact ASCII table. This is the primary artifact of phase 3.

### Phase 4 — code correlation

Now match trace entries to actual source code:

1. **Extract candidate code locations** from exceptions — file names, line numbers, function names, class names appearing in stack traces.
2. **Grep the repo** for each candidate. Prefer fully qualified names (namespace + class) for precision.
3. **Read the file(s)** around the matched line. Reconstruct the execution path: which code path was taken, what inputs led here, which assumption failed.
4. **Optional — query the existing graph** via `graphify query "<question>"`, `graphify path "A" "B"`, or `graphify explain "<concept>"` if `graphify-out/` exists. A graph query can disambiguate when the stack trace is ambiguous or optimized away.
5. **Re-read the request/input data** from the trace — custom dimensions, request body (if captured), headers, user identity — to see what triggered the failing branch.

Produce an **annotated timeline**: each row from phase 3 is now decorated with the `file:line` it corresponds to, and with the data that was flowing at that point.

### Phase 5 — root cause and fix proposal

Write the analysis in this structured format (keep it compact — readable at a glance):

```markdown
## Analysis — <correlation ID or scope>

**Endpoint**: <METHOD> <PATH>
**Status**: <CODE>
**Service chain**: <frontend> → <bff> → <service A> → <service B>
**Source**: <deployment source / env>
**Time**: <UTC timestamp of failure>

### Call chain
1. <service> <operation> (<duration>ms)      ok
2. → <dependency> <target> (<duration>ms)   ok
3.   → <dependency> <target> (<duration>ms) FAILED <reason>
4. exception thrown: <Type>

### Exception
- **Type**: <ExceptionType>
- **Message**: "<message>"
- **Location**: <path/to/file.ext>:<line>

### Root cause
<1–2 sentences, plain language, causal>

### Proposed fix
**File**: <path>:<line>
**Change**:
```diff
- <bad line>
+ <good line>
```
**Why this fixes it**: <1 sentence>
**Regression test**: <test file + a one-liner describing the test to add>
**Confidence**: HIGH / MEDIUM / LOW — <reason>

### Follow-up questions (if any)
- <question for the user if the fix is ambiguous>
```

If confidence is LOW, **do not propose a destructive fix** — propose a diagnostic step instead (e.g. add logging, enable SQL instrumentation, reproduce locally).

### Phase 6 — crystallize (optional)

Offer, in one sentence:

> "I can save this debugging workflow as a project-local skill so your team can re-run it next time. Want me to invoke `skill-creator`?"

If yes, hand off to [`skill-creator`](../skill-creator/SKILL.md) with a draft frontmatter prefilled (name suggestion: `debug-<scope>`, description with the triggers seen in this session, methodology copied from the flow you just ran). If no, stop cleanly.

---

## Operating principles

1. **Access first** — never fabricate a trace. If the backend is unreachable, coach the user through authentication or degrade to the fallback adapter.
2. **Adapter-isolated** — no backend-specific logic (KQL, LogQL, …) leaks into SKILL.md. If a backend behavior appears in the core flow, it is a bug.
3. **Canonical event shape** — the core flow only ever touches the normalized shape documented above.
4. **Correlation ID is the key** — every piece of advice, every request for user input, steers toward capturing and using a correlation ID.
5. **File:line or nothing** — a fix proposal without a concrete file and line is not actionable; say so explicitly and ask for more telemetry instead.
6. **Confidence is mandatory** — every proposed fix carries HIGH / MEDIUM / LOW and a one-line justification.
7. **Timeline before narrative** — the compact event table is always shown before the prose explanation. It is the shared artifact the user can scan.
8. **Read-only on the backend** — never acknowledge an incident, never delete a log, never mutate telemetry.
9. **Fallback with a warning** — degrading to `generic-log-file` is always possible, but the skill announces what the user is losing (distributed tracing, live data, aggregation) before switching.

---

## Anti-patterns

Observability-specific anti-patterns only. Access-first / auth anti-patterns (skipping the probe, silent downgrade, running `az login` / `aws sso login` silently, hardcoding tokens, caching credentials, etc.) are documented once in [`../_shared/access-model.md`](../_shared/access-model.md) § 8 — they apply here too.

1. **Hardcoding KQL** (or LogQL, or Logs Insights, or any adapter-specific query language) in SKILL.md — these belong in adapter reference files.
2. **Assuming App Insights** — the first-class adapter is App Insights, but the skill must work even when the user has never heard of Azure.
3. **Proposing a fix without reproducing or correlating** — an untested patch based on a single log line is worse than no patch.
4. **Ignoring correlation ID propagation** — if the traces are not correlated, tell the user why and what to fix **in their project**, rather than trying to patch around it.
5. **Fabricating a correlation ID** — never invent one. If the user says they have none, degrade to phase 3 sub-flow B.
6. **Leaving the timeline implicit** — the compact event timeline (phase 3) must be visible to the user; it is the shared artifact that grounds the rest of the analysis.
7. **Blowing past "empty result"** — an empty query result is informative: either the ID is wrong, the time range is off, or the backend is not capturing the data. Diagnose before retrying.

---

## When NOT to use this skill

- **Pure local build/test failures** with no telemetry involved → use `superpowers:systematic-debugging`.
- **Code review without a live incident** → use `superpowers:requesting-code-review`.
- **Architectural question, not a bug** → use [`arch-brainstorm`](../arch-brainstorm/SKILL.md).
- **Creating a new skill from scratch** → use [`skill-creator`](../skill-creator/SKILL.md). This skill is for *using* observability; skill authoring is its own job.
- **Infrastructure provisioning** ("stand up a Datadog account") → out of scope; use [`ops-skill-builder`](../ops-skill-builder/SKILL.md) to set up access paths, then return here.

---

## Reference files

Read on demand — do not preload upfront.

- [`../_shared/access-model.md`](../_shared/access-model.md) — **shared access-first reference** (CLI > API > Web tiers, probe pattern, fallback protocol, never-silent-login rule, env-var convention, OIDC federation for CI, browser-MCP pins per AI tool, anti-patterns). Consumed by this skill (Phase 2) and by `ops-skill-builder`.
- [`references/adapter-app-insights.md`](./references/adapter-app-insights.md) — **first-class v1 adapter**. Full KQL examples, `az` CLI auth, `APPINSIGHTS_API_KEY` fallback, quirks.
- [`references/adapter-datadog.md`](./references/adapter-datadog.md) — `DD_API_KEY` + `DD_APP_KEY` auth; Logs Search API and APM trace API.
- [`references/adapter-grafana-loki.md`](./references/adapter-grafana-loki.md) — `LOKI_URL` + optional bearer; LogQL examples; Tempo bridge for traces.
- [`references/adapter-cloudwatch.md`](./references/adapter-cloudwatch.md) — AWS CLI session; CloudWatch Logs Insights + X-Ray for traces.
- [`references/adapter-otel-collector.md`](./references/adapter-otel-collector.md) — OTLP endpoint, Jaeger for traces, Prometheus for metrics; document-only.
- [`references/adapter-generic-log-file.md`](./references/adapter-generic-log-file.md) — fallback for offline / air-gapped / "I just have a flat log". `rg`, `jq`, regex correlation.

## Related skills

- [`skill-creator`](../skill-creator/SKILL.md) — phase 6 target; crystallizes a debugging workflow into a reusable skill.
- [`graphify`](../graphify/SKILL.md) — phase 4 companion for repo-scale code navigation.
- [`ops-skill-builder`](../ops-skill-builder/SKILL.md) — sibling access-first skill for setting up the access paths this skill depends on.
- [`arch-brainstorm`](../arch-brainstorm/SKILL.md) — use when the investigation reveals a design problem, not a bug.
