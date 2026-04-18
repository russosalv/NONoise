# Adapter — `otel-collector`

> **Status**: document-only stub. Unlike the other adapters, "OTel collector" is a **pipeline**, not a backend — its final destination varies (Jaeger, Prometheus, custom). This reference documents the common deployment pattern and how the skill connects to the typical sinks. Wiring depends on the user's exact pipeline, so the adapter ships advice, not a finished implementation.

An OpenTelemetry Collector receives OTLP (gRPC or HTTP) and forwards to one or more exporters. The three exporters most commonly observed in the wild — and therefore the three the adapter plans for:

- **Jaeger** (or Grafana Tempo) for **traces**
- **Prometheus** (scrape endpoint) for **metrics**
- **Elasticsearch / OpenSearch** / **Loki** / **stdout → file** for **logs**

When any of those exporters is present, the correct adapter to use is usually that sink's native one (`grafana-loki`, a dedicated Elasticsearch adapter, …). The `otel-collector` adapter is relevant when the sink is **Jaeger** + **Prometheus** with no separate log backend — a common open-source development / on-prem setup.

## Table of contents

- [Authentication](#authentication)
- [Availability probe](#availability-probe)
- [Query examples — the five contract methods](#query-examples--the-five-contract-methods)
- [Integrating with a real log sink](#integrating-with-a-real-log-sink)
- [Pagination and rate limits](#pagination-and-rate-limits)
- [Known quirks](#known-quirks)

---

## Authentication

OTLP endpoints are often unauthenticated on private networks. Public endpoints typically use:

| Env var | Purpose |
|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint (e.g. `http://otel-collector:4318`) |
| `OTEL_EXPORTER_OTLP_HEADERS` | Static headers, e.g. `Authorization=Bearer <token>` |
| `JAEGER_QUERY_URL` | Jaeger query UI base (e.g. `http://jaeger:16686`) |
| `PROMETHEUS_URL` | Prometheus HTTP API (e.g. `http://prom:9090`) |

**The collector itself has no query API** — it is a one-way pipeline. All read queries go to the downstream sinks (Jaeger, Prometheus, log backend).

---

## Availability probe

Three sub-probes, depending on which sinks the project declares:

```bash
# Jaeger
curl -s "${JAEGER_QUERY_URL}/api/services" | head -c 200

# Prometheus
curl -s "${PROMETHEUS_URL}/-/ready"

# Collector (health extension, if enabled)
curl -s "${OTEL_COLLECTOR_HEALTH:-http://otel-collector:13133}/health/status"
```

At least one must succeed. Otherwise, emit remediation and stop.

---

## Query examples — the five contract methods

### `query_by_correlation_id(id, time_range)`

**Traces via Jaeger**:

```bash
curl -s "${JAEGER_QUERY_URL}/api/traces/<TRACE_ID>?prettyPrint=false"
```

Response is the Jaeger-specific JSON (not OTLP). Fields: `traceID`, `spans[].operationName`, `spans[].duration`, `spans[].references`, `spans[].tags`, `spans[].logs`, `spans[].process.serviceName`.

**Logs**: not handled by the collector itself. Delegate to the configured log sink adapter (`grafana-loki`, a file adapter, …). If the user has no log sink, the adapter degrades further to `generic-log-file` if the collector was configured with a `file` exporter.

### `query_by_time_range(start, end, filter)`

Jaeger search by service + time:

```bash
curl -G "${JAEGER_QUERY_URL}/api/traces" \
  --data-urlencode "service=<service>" \
  --data-urlencode "start=$(date -u -d '1 hour ago' +%s)000000" \
  --data-urlencode "end=$(date -u +%s)000000" \
  --data-urlencode "limit=20" \
  --data-urlencode "tags=%7B%22error%22%3A%22true%22%7D"
```

(Start/end are microseconds — Jaeger's convention.)

### `get_exception_details(exception_id)`

Exceptions in OTel are spans with `status.code = ERROR` and an `exception` event in `span.logs`. Re-fetch the span by its `spanID` within the trace:

```bash
curl -s "${JAEGER_QUERY_URL}/api/traces/<TRACE_ID>"
```

Find the span by `spanID`; extract `logs[] | select(.fields[].key == "exception.stacktrace")`.

### `list_sampled_errors(time_range, severity)`

Jaeger alone cannot aggregate errors; use Prometheus metrics emitted by the collector (if `spanmetrics` or `servicegraph` processors are configured):

```promql
topk(10,
  sum by (service_name, operation) (
    rate(traces_spanmetrics_calls_total{status_code="STATUS_CODE_ERROR"}[5m])
  )
)
```

Invocation:

```bash
curl -G "${PROMETHEUS_URL}/api/v1/query" \
  --data-urlencode 'query=topk(10, sum by (service_name, operation) (rate(traces_spanmetrics_calls_total{status_code="STATUS_CODE_ERROR"}[5m])))'
```

If no `spanmetrics` processor is configured, this method is not available — the adapter reports `capability_missing` and falls back to per-service log queries if a log sink exists.

---

## Integrating with a real log sink

When the collector exports logs to a known backend, **switch to that backend's adapter** rather than funneling through this one. Examples:

| Collector log exporter | Recommended adapter |
|---|---|
| `loki` | `grafana-loki` |
| `elasticsearch` / `opensearch` | (dedicated adapter, not in v1 — use `generic-log-file` via beats pipeline) |
| `otlphttp` → vendor backend | that vendor's adapter (Datadog, New Relic, …) |
| `file` | `generic-log-file` |

Document the choice in `nonoise.config.json.observability.backend` directly — the `otel-collector` adapter is really the "Jaeger + Prometheus" case.

---

## Pagination and rate limits

- **Jaeger query**: no documented rate limit on the query API; response size grows linearly with trace span count. Large traces (>5000 spans) slow the UI but not the API.
- **Prometheus**: up to 11000 data points per range query by default; narrow the `step` parameter if the window is wide.
- **Collector OTLP ingest**: 4 MB default gRPC message size. Irrelevant for reads.

---

## Known quirks

1. **No central query API** — this is the main difference from every other adapter. You query **each exporter's** native API.
2. **Trace ID format** — Jaeger accepts both 64-bit and 128-bit hex trace IDs. OTel always emits 128-bit. If a 64-bit Jaeger UI shows a short ID, the project is still on Jaeger-native instrumentation.
3. **Sampling** — if the collector uses tail-based sampling (`tailsamplingprocessor`), most non-error traces are dropped. You'll see 100% of errors but only a % of successes — factor this into "rate" queries.
4. **Span-to-log correlation** — OTel logs carry `trace_id` and `span_id` attributes when instrumentation is correct. If logs lack these, trace ↔ log correlation degrades to timestamp proximity + service name (brittle).
5. **`servicegraph` processor** gives you `service_graph_request_total` metrics — the fastest way to answer "which service → which service is erroring out the most". Configure it when starting a new project.
6. **OTLP JSON vs protobuf** — HTTP endpoints accept both; Jaeger query responses are Jaeger-proto JSON, not OTLP — conversion to canonical event shape requires mapping.
