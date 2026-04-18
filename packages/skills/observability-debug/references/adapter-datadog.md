# Adapter — `datadog`

> **Status**: usable stub. Auth model fully documented and testable; response parsing wired for logs and traces (APM). The only thing preventing "implemented" status is end-to-end exercise against a real Datadog tenant in the NONoise test suite.

Datadog exposes telemetry through four products that matter here: **Logs** (the log search API), **APM** (traces and spans), **Metrics**, and **Events**. This adapter uses Logs + APM. Query language is **Datadog Log Search syntax** (logs) and the APM trace search DSL (traces).

## Table of contents

- [Authentication](#authentication)
- [Availability probe](#availability-probe)
- [Query examples — the five contract methods](#query-examples--the-five-contract-methods)
- [Pagination and rate limits](#pagination-and-rate-limits)
- [Known quirks](#known-quirks)

---

## Authentication

Datadog requires **two** keys — both required for most endpoints:

| Env var | Purpose | Where to create |
|---|---|---|
| `DD_API_KEY` | Account-level API key | Organization Settings → API Keys |
| `DD_APP_KEY` | User-level application key (scoped) | Personal Settings → Application Keys |
| `DD_SITE` | Regional endpoint (default `datadoghq.com`) | One of: `datadoghq.com`, `datadoghq.eu`, `us3.datadoghq.com`, `us5.datadoghq.com`, `ap1.datadoghq.com` |

All requests go to `https://api.<DD_SITE>/api/...`. Example base URLs:

- US1 (default): `https://api.datadoghq.com`
- EU: `https://api.datadoghq.eu`

Both headers are required on every call:

```
DD-API-KEY: <DD_API_KEY>
DD-APPLICATION-KEY: <DD_APP_KEY>
```

Scopes required on the App Key: `logs_read`, `apm_read`, `apm_service_catalog_read`.

---

## Availability probe

```bash
curl -s -X GET "https://api.${DD_SITE:-datadoghq.com}/api/v1/validate" \
  -H "DD-API-KEY: $DD_API_KEY" \
  -H "DD-APPLICATION-KEY: $DD_APP_KEY"
```

Success returns `{"valid": true}`. Any other response → print remediation and stop.

---

## Query examples — the five contract methods

Datadog's **Logs Search v2** API: `POST /api/v2/logs/events/search`. The **APM Spans Search** API: `POST /api/v2/spans/events/search`.

### `query_by_correlation_id(id, time_range)`

Two calls — logs and spans — merged into the canonical shape.

**Logs** (correlation ID is indexed as `@trace_id` by the Datadog tracer, or a custom attribute like `@correlation_id` depending on your instrumentation):

```bash
curl -X POST "https://api.${DD_SITE}/api/v2/logs/events/search" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "query": "@trace_id:<ID>",
      "from": "now-6h",
      "to":   "now"
    },
    "sort": "timestamp",
    "page": { "limit": 200 }
  }'
```

**Spans** (APM):

```bash
curl -X POST "https://api.${DD_SITE}/api/v2/spans/events/search" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "query": "trace_id:<ID>",
      "from": "now-6h",
      "to":   "now"
    },
    "sort": "timestamp",
    "page": { "limit": 200 }
  }'
```

### `query_by_time_range(start, end, filter)`

```json
{
  "filter": {
    "query": "service:<service-name> status:error",
    "from": "<ISO-8601 or now-6h>",
    "to":   "<ISO-8601 or now>"
  },
  "sort": "-timestamp",
  "page": { "limit": 50 }
}
```

Common filter keys: `service:`, `env:`, `host:`, `@http.status_code:`, `@usr.id:`, `status:` (error/warn/info), `resource_name:`.

### `get_exception_details(exception_id)`

Datadog does not expose a standalone exception resource. Retrieve the log event by ID:

```bash
curl -X GET "https://api.${DD_SITE}/api/v2/logs/events/<LOG_EVENT_ID>" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY"
```

The `error.stack`, `error.kind`, and `error.message` attributes carry the exception.

### `list_sampled_errors(time_range, severity)`

Aggregation endpoint — groups errors by service + resource:

```bash
curl -X POST "https://api.${DD_SITE}/api/v2/logs/analytics/aggregate" \
  -H "DD-API-KEY: $DD_API_KEY" -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "compute": [{ "aggregation": "count", "type": "total" }],
    "filter":  { "query": "status:error", "from": "now-6h", "to": "now" },
    "group_by": [
      { "facet": "service", "limit": 10, "sort": { "order": "desc", "aggregation": "count" } },
      { "facet": "@resource_name", "limit": 5 }
    ]
  }'
```

---

## Pagination and rate limits

- **Logs Search v2**: default `page.limit` is 10, max 1000. For correlation-ID queries 200 is plenty. Use `page.cursor` from the response for continuation.
- **Rate limits**: vary per plan. On the `Pro` plan, `logs_query` is typically 300 req/hour per org. The `X-RateLimit-Remaining` header is always present — the adapter should back off at < 10% remaining.
- **Retention**: indexed logs default to 15 days; live tail is ~15 min. If the user's time window exceeds retention, a 200 OK with an empty array comes back — mention this in empty-result diagnostics.

---

## Known quirks

1. **`trace_id` vs `@trace_id`** — in log queries, attributes are prefixed with `@`; in span queries they are not. Same value, two syntaxes.
2. **Custom correlation attribute** — if the project sets its own `@correlation_id` attribute (common when you need cross-language correlation older than OpenTelemetry), switch both queries to use it. Update `observability.correlationIdHeader` in `nonoise.config.json` to match.
3. **Env-scoped tags** — always combine correlation ID with `env:<env>` (e.g. `env:prod`) when the same trace ID might appear across environments.
4. **APM trace sampling** — at default sampling rates (1%), not every request has a trace. Logs will still have `@trace_id` for the sampled traces; for unsampled ones you're flying blind on APM.
5. **Custom attributes must be faceted** — to query by `@custom_attr`, the attribute must be **faceted** in the Datadog UI. Advise the user to facet the correlation attribute at setup time.
6. **Site-specific URLs** — always respect `DD_SITE`. A US1 key will not authenticate against the EU endpoint.
