# Adapter — `cloudwatch`

> **Status**: usable stub. AWS CLI is ubiquitous enough that this adapter can be exercised immediately given any authenticated AWS session; the main risk is per-account quirks (log group naming, X-Ray vs CloudWatch Traces). Paired with **X-Ray** for distributed traces.

Amazon CloudWatch Logs stores log events; the query language is **CloudWatch Logs Insights** — a SQL-like DSL with `fields`, `filter`, `stats`, `sort`. For traces, **AWS X-Ray** is the Amazon-native option (CloudWatch Traces being the newer unified overlay). This adapter wraps Logs Insights primarily, with an X-Ray companion for trace retrieval.

## Table of contents

- [Authentication](#authentication)
- [Availability probe](#availability-probe)
- [Query examples — the five contract methods](#query-examples--the-five-contract-methods)
- [X-Ray companion for traces](#x-ray-companion-for-traces)
- [Pagination and rate limits](#pagination-and-rate-limits)
- [Known quirks](#known-quirks)

---

## Authentication

All AWS CLI auth mechanisms are supported — the adapter delegates entirely to the local AWS session:

| Mechanism | How | Notes |
|---|---|---|
| AWS SSO | `aws sso login --profile <profile>` | Recommended for developer machines |
| IAM access keys | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (for STS) | Fine for CI |
| EC2 / ECS / Lambda role | Automatic — no env vars needed | When running inside AWS |
| `aws configure` named profile | `AWS_PROFILE=<profile>` | Common on multi-account setups |

`AWS_REGION` must be set (or in the profile). No additional project-specific key is required.

Required IAM permissions (read-only):

- `logs:StartQuery`, `logs:GetQueryResults`, `logs:DescribeLogGroups`, `logs:DescribeLogStreams`
- `xray:BatchGetTraces`, `xray:GetTraceSummaries` (for trace correlation)

---

## Availability probe

```bash
aws sts get-caller-identity --output table 2>/dev/null || echo "NOT_AUTHENTICATED"
```

If `NOT_AUTHENTICATED`, print remediation based on the user's preferred mechanism (SSO login, `AWS_PROFILE` set, etc.). Do **not** run `aws sso login` silently — it is interactive.

Then confirm Logs Insights reachability:

```bash
aws logs describe-log-groups --limit 1 --query "logGroups[0].logGroupName"
```

---

## Query examples — the five contract methods

CloudWatch Logs Insights runs via `start-query` + `get-query-results`. The query is text; each log group must be specified explicitly (no wildcards).

### `query_by_correlation_id(id, time_range)`

Correlation IDs are usually stored in structured JSON logs; extract with `parse` or reference directly if the log event has been parsed at ingest:

```
fields @timestamp, @message, @logStream, service, level, trace_id, correlation_id
| filter correlation_id = "<ID>" or trace_id = "<ID>"
| sort @timestamp asc
| limit 200
```

Invocation:

```bash
QID=$(aws logs start-query \
  --log-group-names "/aws/ecs/orders-api" "/aws/ecs/inventory-api" \
  --start-time $(date -u -d '6 hours ago' +%s) \
  --end-time   $(date -u +%s) \
  --query-string 'fields @timestamp, @message, service, level, trace_id, correlation_id | filter correlation_id = "<ID>" or trace_id = "<ID>" | sort @timestamp asc | limit 200' \
  --query queryId --output text)

# Poll until Complete:
while [ "$(aws logs get-query-results --query-id "$QID" --query status --output text)" = "Running" ]; do sleep 1; done
aws logs get-query-results --query-id "$QID" --output json
```

### `query_by_time_range(start, end, filter)`

```
fields @timestamp, @message, level, service
| filter service = "<service>" and level = "ERROR"
| sort @timestamp desc
| limit 50
```

### `get_exception_details(exception_id)`

CloudWatch has no exception resource — "exception ID" is again `(trace_id, @timestamp)`. Re-query the narrow range and filter to `level = "ERROR"`. Exception stack is typically in an `exception.stack_trace` or `error.stack` field of the JSON log.

### `list_sampled_errors(time_range, severity)`

```
fields @timestamp, service, @message
| filter level = "ERROR"
| stats count(*) as errorCount by service, bin(5m)
| sort errorCount desc
| limit 20
```

Or, for "what are the error messages right now":

```
fields @timestamp, service, error.message
| filter level = "ERROR"
| stats count(*) as n by service, error.message
| sort n desc
| limit 20
```

---

## X-Ray companion for traces

If the project sends traces to X-Ray, resolve a `trace_id` to its full span tree:

```bash
aws xray batch-get-traces --trace-ids "<TRACE_ID>" --output json
```

The response includes a `Segments` array; each segment has `Document` (JSON) with `start_time`, `end_time`, `name`, `http`, `cause` (on error), and `subsegments`. Parse into the canonical shape the same way as OTLP spans.

Find traces by endpoint + time without an ID:

```bash
aws xray get-trace-summaries \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time   "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --filter-expression 'http.url CONTAINS "/orders" AND error'
```

---

## Pagination and rate limits

- **Logs Insights**: max 10000 rows per query. Use `limit` aggressively; multiple narrow queries beat one wide query.
- **Query quotas**: 20 concurrent queries per account by default; adjustable. Logs Insights queries are billed per GB scanned — scope log groups tightly.
- **X-Ray**: `BatchGetTraces` accepts up to 5 trace IDs per call. Pages via `NextToken`.
- **Throttling**: AWS returns `ThrottlingException` — back off with jitter, 3 retries max.

---

## Known quirks

1. **Log group naming** — `/aws/lambda/<fn>`, `/aws/ecs/<task>`, `/ecs/<cluster>/<service>`, custom namespaces — there is no convention. The adapter must be told which log groups to target; default is to discover them via `describe-log-groups --log-group-name-prefix`.
2. **JSON parsing** — Logs Insights auto-parses JSON logs into fields, but nested objects require `parse` or dot access (`http.status_code`, `error.stack.frames.0.file`).
3. **Clock is UTC** — `@timestamp` is always UTC. Start/end are Unix seconds on start-query.
4. **X-Ray vs CloudWatch Traces** — newer AWS accounts route to CloudWatch Traces (Application Signals). API shape differs; sniff via `aws application-signals list-services` vs the `xray` probes.
5. **Multi-region** — traces and logs are regional. Always confirm `AWS_REGION` matches where the service is deployed.
6. **Cost** — Logs Insights charges per GB scanned. A query over `7d` on a chatty log group can be surprisingly expensive. Warn the user before running wide time-range queries.
