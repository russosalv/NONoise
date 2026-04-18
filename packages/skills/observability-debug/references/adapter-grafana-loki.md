# Adapter — `grafana-loki`

> **Status**: usable stub. Auth + LogQL queries documented. For distributed traces, Loki is typically paired with **Tempo** (same Grafana Labs stack) — a secondary endpoint is documented below. The stub is "usable" because `curl` + `logcli` are straightforward and the project may already have `LOKI_URL` configured for dashboards.

Grafana Loki stores logs (and nothing else). Its query language is **LogQL**, a PromQL-inspired DSL. Traces live in **Tempo**; metrics in Prometheus/Mimir. This adapter wraps Loki for logs and optionally Tempo for spans.

## Table of contents

- [Authentication](#authentication)
- [Availability probe](#availability-probe)
- [Query examples — the five contract methods](#query-examples--the-five-contract-methods)
- [Tempo — traces companion](#tempo--traces-companion)
- [Pagination and rate limits](#pagination-and-rate-limits)
- [Known quirks](#known-quirks)

---

## Authentication

Loki supports several auth models depending on deployment:

| Env var | Purpose | Notes |
|---|---|---|
| `LOKI_URL` | Base URL of the Loki read endpoint | e.g. `https://logs.example.com` |
| `LOKI_TOKEN` | Bearer token (optional) | For gateways with token auth |
| `LOKI_TENANT_ID` | Multi-tenant header (optional) | Sent as `X-Scope-OrgID` |
| `LOKI_USERNAME` / `LOKI_PASSWORD` | Basic auth (optional) | For protected endpoints |

Grafana Cloud uses a pattern like:

```
LOKI_URL=https://logs-prod-XXX.grafana.net
LOKI_USERNAME=<instance-id>        # numeric
LOKI_PASSWORD=<cloud-access-policy-token>
```

The `logcli` CLI respects `LOKI_ADDR`, `LOKI_USERNAME`, `LOKI_PASSWORD`, `LOKI_TENANT_ID`, and `LOKI_BEARER_TOKEN` — use it when available.

---

## Availability probe

```bash
curl -s "${LOKI_URL}/ready" -H "Authorization: Bearer $LOKI_TOKEN" \
  ${LOKI_TENANT_ID:+-H "X-Scope-OrgID: $LOKI_TENANT_ID"}
```

Expected: HTTP 200 with body `ready`. Anything else → emit remediation and stop.

---

## Query examples — the five contract methods

The Loki HTTP API endpoint for range queries is `GET /loki/api/v1/query_range`.

### `query_by_correlation_id(id, time_range)`

Correlation IDs are typically stored as **log labels** (if low cardinality, e.g. `env`, `service`) or as **JSON-parsed fields** (if high cardinality, e.g. `trace_id`, `correlation_id`). Use `json` or `logfmt` parsers accordingly:

```bash
curl -G -s "${LOKI_URL}/loki/api/v1/query_range" \
  -H "Authorization: Bearer $LOKI_TOKEN" \
  --data-urlencode 'query={service="orders-api"} | json | trace_id="<ID>"' \
  --data-urlencode "start=$(date -u -d '6 hours ago' +%s)000000000" \
  --data-urlencode "end=$(date -u +%s)000000000" \
  --data-urlencode 'limit=500' \
  --data-urlencode 'direction=forward'
```

If the correlation ID is a log label (rare, cardinality-wise): `{trace_id="<ID>"}`.

### `query_by_time_range(start, end, filter)`

```logql
{service="orders-api", env="prod"} |~ "(?i)error|exception" | json
```

Time is passed via `start` / `end` as nanosecond-since-epoch timestamps in the `query_range` endpoint.

### `get_exception_details(exception_id)`

Loki has no standalone "exception" resource. The "exception ID" in this adapter is a synthetic composite of `(trace_id, timestamp)`; the method re-runs a narrower correlation query with a tight time window around the timestamp and filters on `level=error`:

```logql
{service="orders-api"} | json | trace_id="<ID>" | level="error"
```

Return the matched log lines; stack traces are typically in the `exception` or `stack_trace` JSON field.

### `list_sampled_errors(time_range, severity)`

LogQL has aggregation via `count_over_time`. Top N error resources in the last 6h:

```logql
topk(10,
  sum by (service, resource) (
    count_over_time({env="prod"} | json | level="error" [6h])
  )
)
```

Query endpoint: `GET /loki/api/v1/query` (instant query) or `/query_range` (range). For "what's broken lately" the instant endpoint is cheaper.

---

## Tempo — traces companion

When the project sends traces to Tempo (OTLP → Tempo, same Grafana stack), query traces by ID via:

```bash
curl -s "${TEMPO_URL}/api/traces/<TRACE_ID>" \
  -H "Authorization: Bearer $TEMPO_TOKEN"
```

Configure a second env pair `TEMPO_URL` / `TEMPO_TOKEN` if available. If not, Loki alone still covers `query_by_correlation_id` (via the `trace_id` field on logs) and `list_sampled_errors` (via log counts).

The Tempo response conforms to the OTLP trace JSON schema — the adapter converts it into the canonical shape the same way the `otel-collector` adapter does.

---

## Pagination and rate limits

- **`limit` cap**: Loki defaults to `100`, max usually `5000`. For correlation-ID queries, `500` is fine. Use `start` / `end` to page; Loki does not use cursors.
- **Query limits** (self-hosted): `max_query_length` (default 721h), `max_query_parallelism`, `max_entries_limit_per_query` — if you hit one, the error message is explicit.
- **Rate limits** on Grafana Cloud: per-plan; respond with 429 + `Retry-After` when exceeded. Back off exponentially.
- **Parallelism**: Loki splits long queries into chunks internally; you do not need to chunk on the client side.

---

## Known quirks

1. **Label cardinality** — DO NOT use `trace_id` as a label. High cardinality kills Loki. It must be a parsed field (`| json` / `| logfmt`), not a label.
2. **Parser choice** — `json` is expensive; `logfmt` is lighter. If the project logs structured JSON, it's worth the cost. If logs are free-form, use `pattern` or `regexp` to extract the correlation ID.
3. **Time must be nanoseconds** — Loki's `start` / `end` are nanoseconds since epoch. `date +%s` returns seconds; append `000000000`.
4. **Multi-tenant header** — on multi-tenant setups, omitting `X-Scope-OrgID` returns an empty set, not an error. Diagnose "empty results" by checking this header first.
5. **Retention** — typically 30 days on Grafana Cloud starter tiers. If the window is older, results will be empty without explanation.
6. **`logcli` vs HTTP** — `logcli` is great for interactive debug but returns text, not JSON. For programmatic parsing, use the HTTP API.
