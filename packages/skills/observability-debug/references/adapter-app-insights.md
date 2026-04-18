# Adapter — `app-insights`

> **Status**: implemented (first-class v1 adapter). Ported from the Risko reference project, whitelabeled. Uses Azure Application Insights via the `az` CLI as primary transport, with an `APPINSIGHTS_API_KEY` HTTP-API fallback for CI / non-interactive environments.

Application Insights models telemetry in five tables — `requests`, `dependencies`, `exceptions`, `traces`, `customEvents` — queried via **KQL** (Kusto Query Language). This adapter wraps those tables behind the five contract methods.

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

Two sources, tried in this order:

1. **`az` CLI session** — if `az account show` succeeds, the CLI session is used. Recommended for local / interactive use.
2. **`APPINSIGHTS_API_KEY` env var + `APPINSIGHTS_APP_ID`** — HTTP API fallback. Use in CI or where `az` is not available.

The reference Application ID comes from `nonoise.config.json.observability.settings.applicationId`. Ask the user if missing.

### `az` CLI setup

On Windows, `az` is frequently installed but not on the bash `PATH`. Prepend this **once at the start of the first command**, then keep it in the shell environment:

```bash
export PATH="$PATH:/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin"
```

### HTTP API fallback

```
GET https://api.applicationinsights.io/v1/apps/{APPINSIGHTS_APP_ID}/query?query=<KQL>&timespan=PT6H
Headers:
  x-api-key: <APPINSIGHTS_API_KEY>
```

API keys are created in the Azure Portal under "API Access" for the App Insights resource. Read-only scope is sufficient (`Read telemetry`).

---

## Availability probe

The `authenticate()` implementation:

```bash
export PATH="$PATH:/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin"
az account show --query "{name:name, id:id}" -o table 2>/dev/null || echo "NOT_LOGGED_IN"
```

- If output contains `NOT_LOGGED_IN` → tell the user to run `! az login` in the prompt (interactive — the skill must not run it silently).
- If `az` not on PATH even after the export → report "Azure CLI not installed"; suggest the API-key fallback.
- If `APPINSIGHTS_API_KEY` is set, probe with a trivial KQL (`requests | take 0`) to confirm the key + app ID combo works.

---

## Query examples — the five contract methods

All queries use `--offset <TIMESPAN>` to scope the window:

- `1h` — recent errors, quick checks
- `6h` — default triage window
- `24h` — trend analysis, regression detection
- `7d` — historical comparison

### 1. `authenticate()`

See above.

### 2. `query_by_correlation_id(id, time_range)`

Run these four queries in parallel; merge results into the canonical event shape.

**Request envelope**:
```kusto
requests | where operation_Id == "<ID>"
| project timestamp, name, resultCode, duration, cloud_RoleName, cloud_RoleInstance, customDimensions
```

**Dependency call chain**:
```kusto
dependencies | where operation_Id == "<ID>"
| project timestamp, target, name, duration, success, resultCode, type, data
| order by timestamp asc
```

**Exceptions**:
```kusto
exceptions | where operation_Id == "<ID>"
| project timestamp, type, outerMessage, innermostMessage, details, cloud_RoleName
```

**Structured logs / audit**:
```kusto
traces | where operation_Id == "<ID>"
| order by timestamp asc
| project timestamp, message, severityLevel, cloud_RoleName, customDimensions
```

If the user provides only a `CorrelationId` (custom header value, not the App Insights `operation_Id`), resolve first:

```kusto
traces
| where customDimensions["CorrelationId"] == "<CORRELATION_ID>"
| project timestamp, message, operation_Id, cloud_RoleName
| take 5
```

Pick the most recent `operation_Id` and run the four queries above.

### 3. `query_by_time_range(start, end, filter)`

```kusto
requests | where timestamp between (datetime(<start>) .. datetime(<end>))
| where cloud_RoleName == "<service>" and name == "<endpoint>"
| project timestamp, name, resultCode, duration, operation_Id, cloud_RoleName, success
| order by timestamp desc
| take 50
```

### 4. `get_exception_details(exception_id)`

App Insights exceptions are usually referenced by `operation_Id` + `timestamp`, not a standalone ID. When a caller supplies an `operation_Id`:

```kusto
exceptions
| where operation_Id == "<ID>"
| project timestamp, type, outerMessage, innermostMessage, details, cloud_RoleName, customDimensions
```

The `details` field contains the parsed stack trace array — use it directly to extract `file:line`.

### 5. `list_sampled_errors(time_range, severity)`

```kusto
requests | where success == false
| where timestamp > ago(<TIMESPAN>)
| summarize errorCount=count(), sampleId=any(operation_Id)
         by name, resultCode, cloud_RoleName
| order by errorCount desc
| take 20
```

The `sampleId` gives an operation_Id the caller can feed back into `query_by_correlation_id` for drill-down.

### Query template — invocation

```bash
export PATH="$PATH:/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin"
az monitor app-insights query \
  --app "<applicationId>" \
  --analytics-query '<KQL_QUERY>' \
  --offset <TIMESPAN> \
  --output json > "$TEMP/ai-result.json"
```

---

## Parsing results

`az monitor app-insights query` returns a tabular JSON envelope. Parse it into row objects. Minimal parser in Node.js (no Python assumed):

```js
const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
const table = raw.tables?.[0];
if (!table || !table.rows?.length) { console.log('(no results)'); return; }
const cols = table.columns.map(c => c.name);
const rows = table.rows.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
```

For richer output (table mode, row limits), ship a `scripts/parse-ai.js` alongside this adapter — the reference project includes one and it is portable.

---

## Pagination and rate limits

- **Default row cap**: `az monitor app-insights query` returns up to 30000 rows. Always apply `| take N` in triage queries (`50`–`200` is a reasonable default).
- **Rate limit**: App Insights API is generous for read; a single KQL query counts as one call. No per-minute limit documented under normal use.
- **Large windows**: queries over `7d` with no filters may time out — narrow by `cloud_RoleName` or `success == false` first.

---

## Empty results — diagnostic table

When a query returns zero rows, check these **before** widening the window:

| Empty table | Likely reason | What to do |
|---|---|---|
| `requests` | No matching requests in timeframe | Widen `--offset`; check endpoint name spelling |
| `dependencies` | Request failed before making outbound calls | Check `exceptions` for the same operation_Id |
| `exceptions` | Error was handled (caught + logged, not thrown) | Check `traces` for error-level messages |
| `traces` | `LoggingEnabled: false` for this service/env | Tell the user — this data isn't available at the backend level |
| Everything empty | Wrong operation_Id, or service not sending telemetry | Verify the ID; check telemetry config |

Note: in many production setups, `LoggingEnabled` is false by default (GDPR / cost). If the user is investigating a prod issue and `traces` is always empty, that's the reason — advise enabling audit logging via config for the next deploy.

---

## Known quirks

1. **`render` directives do not work via CLI** — `| render timechart` is valid in the Portal but ignored by `az` / HTTP API. Strip the render line and analyze tabular data.
2. **Hashed user IDs** — in production, `customDimensions["enduser.id"]` is commonly SHA256-hashed for GDPR. Searching by raw OID returns nothing. Ask the user which env has hashing on.
3. **SQL visibility depends on instrumentation** — SQL dependencies appear as individual rows only when the target service has SQL instrumentation enabled. Otherwise you only see the EF Core / ORM call as an aggregate dependency.
4. **Custom correlation headers** — if the project uses `X-Correlation-Id` but the AI SDK is configured to propagate only the W3C `traceparent`, the header value lives in `customDimensions["CorrelationId"]` rather than as `operation_Id`. The resolve-first query above handles this.
5. **Clock skew** — App Insights `timestamp` is server-side ingestion time, not the client's clock. Intra-service ordering is reliable; comparing to front-end timestamps is not.
6. **KQL is case-sensitive** for column names (mostly) — `operation_Id` (lowercase o) is correct; `Operation_Id` is not.
