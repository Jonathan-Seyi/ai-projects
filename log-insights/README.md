# Log Insights (Python CLI)

A dependency-free command-line analyzer for **JSON Lines HTTP access logs**. Demonstrates defensive input validation, streaming record processing, deterministic aggregation, and automated tests. All processing stays local.

## Input format

Each line is a JSON object with `status` (HTTP integer 100–599), `path` (starting with `/`), `method` (alphabetic HTTP method), and nonnegative finite numeric `duration_ms`:

```json
{"status":200,"path":"/health","method":"GET","duration_ms":12.5}
{"status":404,"path":"/missing?debug=true","method":"GET","duration_ms":4}
```

Save these as `requests.jsonl` (one object per line). Empty lines are ignored. Invalid records are skipped and their 1-based line numbers are reported; `--strict` exits with status 1 if any invalid records are encountered. Query strings are removed from path counts to avoid grouping sensitive query parameters, but **input files may still contain sensitive data**; don't commit real logs.

## Run

Requires Python 3.10+. From the `log-insights` directory:

```bash
python analyzer.py requests.jsonl
python analyzer.py requests.jsonl --strict
```

The JSON report contains request count, HTTP status classes, method counts, ten most frequent paths, average latency, and nearest-rank p95 latency. Empty inputs report `null` latencies. The program stores valid durations in memory for percentile calculation, so very large files may require substantial RAM. It does not support Apache/Nginx text log formats.

## Test

```bash
python -m unittest discover -s tests -v
```

No external packages, credentials, network services, or API keys required.
