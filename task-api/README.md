# Task API

A small **dependency-free Node.js REST API** for managing tasks. Built to demonstrate HTTP request handling, input validation, API design and automated integration tests without hiding the fundamentals behind a framework.

## Features

- Create, list, retrieve, update and delete tasks.
- Filter task lists by status and page through results with validated `limit` (1–100) and `offset` (0–1,000,000) parameters.
- Validates titles (1–120 nonblank characters), statuses (`todo`, `doing`, `done`) and allowed JSON fields.
- Returns meaningful HTTP statuses (`200`, `201`, `400`, `404`, `405`, `413`, `415`, `422`).
- Limits request bodies to 16 KiB and sends JSON responses with no-store cache headers.
- Assigns random UUIDs and uses in-memory storage by default, with **optional local JSON persistence** via `TASKS_FILE`.
- No npm packages, API keys, cloud services or database required.

## Run locally

Requires **Node.js 20+**. From the `task-api` directory:

```bash
npm start
```

The server listens at `http://127.0.0.1:3000`. Override with `PORT=4000 npm start` on macOS/Linux. The server binds to loopback only and is intended for local development.

## Optional persistent storage

By default tasks are held in memory and disappear when the server stops. To keep
them between restarts, set `TASKS_FILE` to a writable JSON file path:

```bash
TASKS_FILE=./data/tasks.json npm start
```

This is intended for **single-process local development only**. Every create,
update or delete atomically replaces the JSON snapshot using a temporary file,
and startup validates existing data. If a snapshot is corrupted, startup fails
instead of silently deleting it. Keep the data file outside version control
(the `data/` folder is ignored). Back up important data separately.

There is **no concurrent writer coordination, database, encryption, or user
authentication**. Do not run multiple server instances against the same file,
and do not expose this API to the public internet.

## API

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/tasks` | List tasks; optional `status`, `limit`, `offset` query parameters |
| POST | `/tasks` | Create task |
| GET | `/tasks/:id` | Retrieve task |
| PATCH | `/tasks/:id` | Change title or status |
| DELETE | `/tasks/:id` | Delete task |

Example:

```bash
curl -X POST http://127.0.0.1:3000/tasks -H 'Content-Type: application/json' -d '{"title":"Write integration tests","status":"todo"}'
```

A successful response includes a generated UUID. Use it in `GET /tasks/<id>`, `PATCH /tasks/<id>` or `DELETE /tasks/<id>`.

## Filter and paginate tasks

```bash
curl 'http://127.0.0.1:3000/tasks?status=doing&limit=10&offset=0'
```

When query parameters are supplied, the response includes `tasks` and `pagination` with `total`, `limit`, `offset`, and `hasMore`. Without parameters, the original `{ "tasks": [...] }` response is preserved for existing clients. Invalid or duplicate parameters return HTTP 400. Ordering follows task creation order; all data remains in memory.

## Tests

```bash
npm test
```

The Node built-in test runner starts temporary servers on ephemeral ports and checks CRUD operations, validation, malformed JSON, request size limits, HTTP errors, and file-store persistence/restart behavior. GitHub Actions runs the same test suite on changes to this project.

## OpenAPI contract and contract tests

The machine-readable [OpenAPI 3.0 specification](openapi.json) documents the local HTTP routes, request bodies, validation constraints, response schemas and error statuses. Import it into an OpenAPI-compatible viewer or API client to explore the service. The API is deliberately bound to loopback and has no authentication, so **do not expose it publicly**.

Run `npm test` from this directory to execute the built-in Node.js tests. The new `tests/openapi.test.mjs` checks that local schema references resolve and compares live HTTP responses against the documented shapes. These checks cover representative CRUD, pagination and validation cases, not every possible request or a full third-party OpenAPI conformance suite.

## Architecture

- `openapi.json`: OpenAPI 3.0 HTTP contract
- `tests/openapi.test.mjs`: schema and live response contract checks
- `src/app.mjs`: HTTP handler, validation, and injectable in-memory store
- `src/file-store.mjs`: opt-in, single-process JSON snapshot store with atomic replacement
- `tests/file-store.test.mjs`: persistence and HTTP restart regression tests
- `src/server.mjs`: local server entrypoint
- `tests/api.test.mjs`: HTTP integration tests using built-in `node:test` and `fetch`

## Limitations and next steps

**Demo only.** Tasks disappear on restart unless `TASKS_FILE` is set. File persistence is not multi-writer safe. There is no authentication, rate limiting, multi-user support or HTTPS termination. Do **not** expose this service to the public internet or store sensitive information.

Potential next improvements: replace JSON snapshots with SQLite transactions, add OpenAPI documentation, and implement authorization with a clear security model.
