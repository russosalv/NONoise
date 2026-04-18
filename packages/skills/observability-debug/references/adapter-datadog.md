# Adapter — `datadog`

> **Status**: implemented (first-class v1 adapter). All five contract methods are specified with concrete endpoints, JSON payloads, pagination handling, and a response parser that emits the canonical event shape. End-to-end exercise against a live tenant is still pending in the NONoise test suite.

Datadog exposes telemetry through **Logs**, **APM** (traces/spans), **Metrics**, and **Events**. This adapter uses Logs + APM + Events. Query language is **Datadog Log Search syntax** for logs and the APM trace-search DSL for spans — not KQL, not LogQL. Docs: [Logs search v2](https://docs.datadoghq.com/api/latest/logs/#search-logs), [APM spans search](https://docs.datadoghq.com/api/latest/spans/#search-spans), [Validate key](https://docs.datadoghq.com/api/latest/authentication/#validate-api-key), [Rate limits](https://docs.datadoghq.com/api/latest/rate-limits/).

## Table of contents

- [Authentication](#authentication)
- [Availability probe](#availability-probe)
- [Query examples — the five contract methods](#query-examples--the-five-contract-methods)
- [Parsing results](#parsing-results)
- [Pagination and rate limits](#pagination-and-rate-limits)
- [Empty results — diagnostic table](#empty-results--diagnostic-table)
- [Known quirks](#known-quirks)

---

## Authentication

Datadog requires **two** keys — both needed for every endpoint this adapter uses except `/api/v1/validate`:

| Env var | Purpose | Where to create |
|---|---|---|
| `DD_API_KEY` | Account-level API key | Organization Settings → API Keys |
| `DD_APP_KEY` | User-level application key (scoped) | Personal Settings → Application Keys |
| `DD_SITE` | Regional endpoint (default `datadoghq.com`) | One of `datadoghq.com`, `datadoghq.eu`, `us3.datadoghq.com`, `us5.datadoghq.com`, `ap1.datadoghq.com` |

Base URL: `https://api.<DD_SITE>/api/...` (e.g. US1 `api.datadoghq.com`, EU `api.datadoghq.eu`). Required headers on every call except validate: `DD-API-KEY: <DD_API_KEY>` and `DD-APPLICATION-KEY: <DD_APP_KEY>`. App Key scopes required: `logs_read`, `apm_read`, `apm_service_catalog_read`, `events_read`.

---

## Availability probe

Validate checks only `DD_API_KEY`. Follow it with a cheap logs search to confirm the App Key and site match:

```bash
DD_SITE=${DD_SITE:-datadoghq.com}

# 1. Validate DD_API_KEY (returns {"valid": true} on success)
curl -s -X GET "https://api.${DD_SITE}/api/v1/validate" \
  -H "DD-API-KEY: $DD_API_KEY" > "$TEMP/dd-validate.json"

# 2. Confirm DD_APP_KEY + site via a zero-cost logs search
curl -s -X POST "https://api.${DD_SITE}/api/v2/logs/events/search" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filter":{"query":"*","from":"now-1m","to":"now"},"page":{"limit":1}}' \
  -o "$TEMP/dd-probe.json" -w "%{http_code}"
```

`{"valid": true}` + `200` on the probe → OK. `403` on the probe but `valid:true` → App Key missing, revoked, or scoped to a different org. `403` on both → `DD_SITE` mismatch (US1 key against `api.datadoghq.eu`, etc.); the error is a generic 403 with no body — check the suffix of your Datadog web UI URL.

---

## Query examples — the five contract methods

Two APIs drive this adapter: **Logs Search v2** (`POST /api/v2/logs/events/search`) and **APM Spans Search** (`POST /api/v2/spans/events/search`). Both accept the same time-range vocabulary: `now`, `now-<N>{m,h,d}`, ISO-8601 (`2026-04-18T09:32:14Z`), or Unix timestamps in **milliseconds** as strings. Seconds-precision Unix is rejected silently — multiply by 1000.

### 1. `authenticate()`

See [Availability probe](#availability-probe).

### 2. `query_by_correlation_id(id, time_range)`

Run logs + spans in parallel and merge into the canonical shape.

**Resolve-first pattern** — the caller may hand over a Datadog `dd.trace_id`, a raw `X-Correlation-Id` header value, or an internal business ID. If the ID is not clearly a hex trace ID (16 or 32 hex chars), **resolve first** by searching logs for the raw string in any attribute:

```bash
curl -s -X POST "https://api.${DD_SITE}/api/v2/logs/events/search" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filter":{"query":"<ID>","from":"now-6h","to":"now"},"sort":"timestamp","page":{"limit":5}}'
```

Pull `attributes.attributes.dd.trace_id` from the first hit, then run the two queries below with the resolved trace ID.

**Logs** — attributes use `@` prefix in the query DSL (`@dd.trace_id`); tags are bare:

```bash
curl -s -X POST "https://api.${DD_SITE}/api/v2/logs/events/search" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": { "query": "@dd.trace_id:<TRACE_ID>", "from": "now-6h", "to": "now" },
    "sort": "timestamp",
    "page": { "limit": 200 }
  }'
```

**Spans** (APM) — no `@` prefix on span attributes:

```bash
curl -s -X POST "https://api.${DD_SITE}/api/v2/spans/events/search" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": { "query": "trace_id:<TRACE_ID>", "from": "now-6h", "to": "now" },
    "sort": "timestamp",
    "page": { "limit": 200 }
  }'
```

### 3. `query_by_time_range(start, end, filter)`

```json
{
  "filter": {
    "query": "service:<service> status:error",
    "from": "<ISO-8601 or now-6h>",
    "to":   "<ISO-8601 or now>"
  },
  "sort": "-timestamp",
  "page": { "limit": 50 }
}
```

Common filter keys: `service:`, `env:`, `host:`, `@http.status_code:`, `@usr.id:`, `status:` (error/warn/info), `resource_name:`. Combine with boolean operators: `service:orders-api AND env:prod AND status:error`.

### 4. `get_exception_details(exception_id)`

Datadog has no standalone exception resource. The caller passes a **log event ID** returned by a prior search; retrieve it with:

```bash
curl -s -X GET "https://api.${DD_SITE}/api/v2/logs/events/<LOG_EVENT_ID>" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY"
```

`attributes.attributes.error.{kind,message,stack}` carry the exception payload. For APM-originated exceptions, pass a span ID and route to `GET /api/v2/spans/events/<SPAN_EVENT_ID>` — the span's `meta.error.stack` is the equivalent.

### 5. `list_sampled_errors(time_range, severity)`

Aggregation endpoint — groups errors by service + resource and returns a sample trace ID per bucket for drill-down:

```bash
curl -s -X POST "https://api.${DD_SITE}/api/v2/logs/analytics/aggregate" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "compute": [
      { "aggregation": "count",    "type": "total" },
      { "aggregation": "earliest", "metric": "@dd.trace_id", "type": "total" }
    ],
    "filter":  { "query": "status:error", "from": "now-6h", "to": "now" },
    "group_by": [
      { "facet": "service",        "limit": 10, "sort": { "order": "desc", "aggregation": "count" } },
      { "facet": "@resource_name", "limit": 5 }
    ]
  }'
```

The `earliest(@dd.trace_id)` bucket yields a trace ID the caller can feed back into `query_by_correlation_id`. If the plan does not support `earliest` on a faceted attribute, fall back to two passes: aggregate top buckets, then one narrow `logs/events/search` per bucket with `page.limit: 1`.

---

## Parsing results

Both search endpoints return the same envelope. Relevant fields: `data[].id`, `data[].attributes.{timestamp, service, status, message}`, `data[].attributes.attributes.{dd, http, error, resource_name, duration, peer_service, db_instance}`, `meta.page.after` (pagination cursor), `meta.warnings[]` (silent query issues on 200).

Windows-friendly Node parser — no `jq` dependency, use `node -e` or the script below:

```js
// scripts/parse-dd.js — normalize Datadog search response → canonical event shape
const fs = require('fs');

function parseDatadogSearch(path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  const events = (raw.data || []).map(d => {
    const a = d.attributes || {};
    const inner = a.attributes || {};                // Datadog nests attributes.attributes
    const dd = inner.dd || {};
    const http = inner.http || {};
    const err = inner.error || {};
    return {
      timestamp: a.timestamp,
      kind: err.kind ? 'exception' : (d.type === 'span' ? 'dependency' : 'log'),
      correlation_id: dd.trace_id || inner.trace_id || null,
      service: a.service || null,
      operation: inner.resource_name
        || (http.method && http.url && `${http.method} ${http.url}`)
        || a.message,
      status: a.status === 'error' ? 'failure' : (a.status === 'ok' ? 'success' : 'unknown'),
      status_code: http.status_code ?? null,
      duration_ms: inner.duration != null ? Math.round(inner.duration / 1e6) : null, // ns → ms
      target: inner.peer_service || inner.db_instance || null,
      exception: err.kind ? { type: err.kind, message: err.message, stack: err.stack } : null,
      raw: d,
    };
  });
  return { events, nextCursor: raw.meta?.page?.after || null, warnings: raw.meta?.warnings || [] };
}

module.exports = { parseDatadogSearch };
```

A tiny POST helper that centralizes headers, site substitution, and 429 backoff:

```js
// scripts/dd-post.js
async function ddPost(endpoint, body, attempt = 0) {
  const site = process.env.DD_SITE || 'datadoghq.com';
  const res = await fetch(`https://api.${site}${endpoint}`, {
    method: 'POST',
    headers: {
      'DD-API-KEY': process.env.DD_API_KEY,
      'DD-APPLICATION-KEY': process.env.DD_APP_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429 && attempt < 4) {
    const cap = 30, base = 1;                        // seconds
    const sleep = Math.random() * Math.min(cap, base * 2 ** attempt);
    await new Promise(r => setTimeout(r, sleep * 1000));
    return ddPost(endpoint, body, attempt + 1);
  }
  if (!res.ok) throw new Error(`Datadog ${res.status}: ${await res.text()}`);
  return res.json();
}
module.exports = { ddPost };
```

---

## Pagination and rate limits

- **Logs & spans search**: default `page.limit` 10, max 1000. Pagination uses `meta.page.after` as the cursor; pass it back in the next request's `page.cursor`. Loop until `after` is `null` or the caller's row budget is exhausted.
- **Rate limits**: plan-dependent. Typical `Pro` plan: `logs_query` ≈ 300 req/hour per org, `spans_query` ≈ 300 req/hour per org, `events_list` ≈ 1000/hour (verify against the user's plan — see [rate-limits docs](https://docs.datadoghq.com/api/latest/rate-limits/)). All responses carry `X-RateLimit-{Limit,Remaining,Reset,Period}`. Back off when `Remaining < 10% * Limit`.
- **429 handling**: exponential backoff with full jitter — base 1s, cap 30s, `sleep = random(0, min(cap, base * 2^attempt))`. The `ddPost` helper above implements this up to 4 retries.
- **Retention**: indexed logs default to 15 days, up to 30d on higher plans; live tail ~15 min; spans ~15 days.
- **Archive rehydration** (data `>30d`): async via `POST /api/v2/logs/config/archives/{archive_id}/rehydrations`. Poll `GET .../rehydrations/{job_id}` until `status:done`, then re-run the normal search against the rehydrated index. This adapter does **not** initiate rehydration automatically — it prints the command and lets the user confirm.

---

## Empty results — diagnostic table

| Empty result | Likely reason | What to do |
|---|---|---|
| Logs empty, spans populated | Logs not shipping to Datadog, or index filter drops them | Check Datadog Agent log forwarder + log-index filters |
| Spans empty, logs have `dd.trace_id` | APM sampling dropped the trace (default 1%) | Coverage partial; logs still have `@dd.trace_id` for sampled traces |
| Both empty within 15d | Wrong trace ID, wrong site, wrong env, service not reporting | Verify site via `/api/v1/validate`; check `env:<env>` tag |
| Both empty beyond 15–30d | Past retention | Offer archive rehydration; warn it is async |
| 200 OK, `data:[]`, `meta.warnings` non-empty | Query syntactically valid but semantically wrong (e.g. missing `@` on a facet) | Log warnings verbatim; suggest fix |

---

## Known quirks

1. **`trace_id` vs `@trace_id`** — in the **logs** DSL, attributes are `@`-prefixed (`@dd.trace_id`); in the **spans** DSL they are not (`trace_id`). Same value, two syntaxes.
2. **Custom correlation attribute** — if the project uses its own `@correlation_id` (common for cross-language correlation predating OpenTelemetry), switch both queries and set `observability.correlationIdHeader` in `nonoise.config.json`.
3. **Env-scoped tags** — always combine correlation ID with `env:<env>` when the same trace ID might reappear across environments (test fixtures, shadow traffic).
4. **APM sampling** — at default 1%, most requests have no span. Logs still have `@dd.trace_id` for sampled traces; unsampled ones are invisible to APM.
5. **Custom attributes must be faceted** — to query `@custom_attr`, the attribute must be faceted in Logs → Configuration → Facets. Advise the user to facet the correlation attribute at setup time.
6. **Unix timestamp precision** — API wants **milliseconds**. `1713437534` silently matches nothing; `1713437534000` works.
7. **Duration units** — span `duration` is **nanoseconds**; the parser divides by 1e6 for canonical `duration_ms`.
8. **Site-specific URLs** — always respect `DD_SITE`. A US1 key will not authenticate against `api.datadoghq.eu`; error is a generic 403 with no body.
9. **PII scrubbing** — some orgs scrub `@usr.email` from indexed logs. If a user filter returns nothing but the time range is right, try `@usr.id` instead.
10. **`meta.warnings` is silent** — Datadog returns HTTP 200 on a semantically wrong query (e.g. faceting on a non-faceted attribute). Always inspect `meta.warnings` and surface entries to the caller.
