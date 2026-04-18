# Adapter — `generic-log-file`

> **Status**: implemented. Offline fallback. Works on any flat log file — JSON Lines, logfmt, or free-form text. The tools are `rg` (ripgrep), `jq`, and native shell. No network calls. Always available.

When all else fails — the backend is unreachable, the project has no observability setup, the user dropped a log file into the repo from a production node — this adapter takes over. It trades distributed tracing and aggregation for **absolute availability**.

## Table of contents

- [When to use it](#when-to-use-it)
- [Authentication](#authentication)
- [Availability probe](#availability-probe)
- [Query examples — the five contract methods](#query-examples--the-five-contract-methods)
- [Pagination and rate limits](#pagination-and-rate-limits)
- [Known quirks and tradeoffs](#known-quirks-and-tradeoffs)

---

## When to use it

Four scenarios:

1. **Fallback** — the configured `backend` failed its availability probe and `observability.fallback` is `generic-log-file`.
2. **Air-gapped / offline** — the user explicitly wants offline debugging.
3. **Post-mortem with a dropped log** — the user obtained `prod.log` from a sysadmin and wants to correlate it with the code.
4. **Early development** — no observability stack is set up yet; the skill still works against `./logs/app.log`.

---

## Authentication

None. The adapter reads files on the local filesystem. Required: the `path` config (or a user-provided absolute path).

From `nonoise.config.json`:

```json
{
  "observability": {
    "backend": "generic-log-file",
    "fallbackSettings": {
      "path": "./logs/app.log",
      "format": "json-lines"
    }
  }
}
```

Supported `format` values:

- `json-lines` — one JSON object per line (recommended for structured logs)
- `logfmt` — `key=value key2=value2` (e.g. Go's slog default)
- `text` — free-form — regex-only matching, no field extraction

If `path` is a directory, all `.log` / `.log.gz` / `.jsonl` files inside are included. `.gz` is auto-decompressed via `zcat`.

---

## Availability probe

```bash
test -r "<path>" && echo "ok" || echo "NOT_READABLE"
```

Followed by a one-line sample to confirm format:

```bash
head -n 1 "<path>" | jq -r type 2>/dev/null \
  || head -n 1 "<path>"
```

Report back to the user:

> "Reading `<path>` (format: json-lines, 24 MB, last line at 2026-04-18T10:14:02Z)."

---

## Query examples — the five contract methods

### `query_by_correlation_id(id, time_range)`

**JSON Lines**:

```bash
rg --no-heading --no-filename -F '"<ID>"' "<path>" \
  | jq -c 'select(.trace_id == "<ID>" or .correlation_id == "<ID>" or .traceparent // "" | contains("<ID>"))' \
  | jq -s 'sort_by(.timestamp)'
```

The `rg -F` first pass is pure string match — fast. The `jq` refine filters out coincidental string matches in unrelated fields.

**logfmt**:

```bash
rg --no-heading --no-filename "trace_id=<ID>|correlation_id=<ID>" "<path>"
```

**text**:

```bash
rg --no-heading --no-filename "<ID>" "<path>"
```

Without structured fields, correlation is only by literal string presence — use with caution on short IDs.

For `time_range`, post-filter by the log's native timestamp field. The adapter does not pre-slice on time (the files are too small to justify indexing; too big to justify sorting).

### `query_by_time_range(start, end, filter)`

```bash
rg --no-heading --no-filename "<filter>" "<path>" \
  | jq -c --arg s "<start ISO>" --arg e "<end ISO>" \
      'select(.timestamp >= $s and .timestamp <= $e)'
```

For logfmt / text, use `awk` / `rg` with an appropriate regex for the timestamp.

### `get_exception_details(exception_id)`

In this adapter, "exception_id" is a composite `(line_number, file_path)` — since a flat log has no server-side IDs. The method re-reads the line by number:

```bash
sed -n '<LINE>p' "<FILE>" | jq .
```

The full exception payload is just the log entry — stack trace, inner message, and custom fields are all there. If the stack is truncated (rare in JSON logs but common in free-form), concatenate the 10 lines after the marker:

```bash
sed -n '<LINE>,+10p' "<FILE>"
```

### `list_sampled_errors(time_range, severity)`

```bash
rg --no-heading --no-filename '"level":"ERROR"|"level":"error"|"severity":"ERROR"' "<path>" \
  | jq -c '{service: .service, message: .message, kind: (.error.type // .exception.type // "unknown")}' \
  | sort | uniq -c | sort -rn | head -20
```

Groups identical error messages; counts occurrences. The sample ID is implicit — to drill down, grep by message text.

---

## Pagination and rate limits

- **File size** — `rg` handles multi-GB files in seconds. No practical limit on queries; `jq` streaming (`--stream`) if memory is tight.
- **No rate limits** — it's a filesystem.
- **Time filtering** is linear in file size. For very large files, index by time via `logrotate` date markers or `zgrep` on rotated files.

---

## Known quirks and tradeoffs

1. **No distributed tracing** — a single flat log only has what the current process emitted. Cross-service correlation requires merging logs from all services — tell the user this upfront.
2. **Free-form `text` format is brittle** — without structured fields, stack traces spanning multiple lines are hard to detect. Prefer `json-lines` whenever possible; advise the user to switch their logger to structured output.
3. **Clock sources** — if logs come from multiple hosts, clock skew makes timeline reconstruction unreliable. Sort by `trace_id` + an explicit sequence number when possible.
4. **Gzipped rotated logs** — auto-decompress with `zcat` / `zgrep`; be mindful of costs on terabyte archives.
5. **Sensitive data** — flat logs often contain request bodies with PII. Before sharing query output back to the user, skim for tokens / emails / names — if found, warn and suggest redaction.
6. **No aggregation primitives** — `count`, `sum` over time buckets are ad-hoc shell pipelines; not as clean as LogQL / KQL. Accept the tradeoff for the "always works" guarantee.
7. **The skill announces the degradation** — when this adapter is selected as a fallback, the core flow prints:

   > "Degraded to `generic-log-file` — distributed tracing, live data, and cross-service aggregation are not available. File: `<path>`."

   So the user is never surprised when correlation across services is missing.
