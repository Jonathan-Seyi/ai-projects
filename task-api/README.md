# Task API

A small **dependency-free Node.js REST API** for managing tasks. Built to demonstrate HTTP request handling, input validation, API design and automated integration tests without hiding the fundamentals behind a framework.

## Features

- Create, list, retrieve, update and delete tasks.
- Filter task lists by status and page through results with validated `limit` (1–100) and `offset` (0–1,000,000) parameters.
- Validates titles (1–120 nonblank characters), statuses (`todo`, `doing`, `done`) and allowed JSON fields.
- Returns meaningful HTTP statuses (`200`, `201`, `400`, `404`, `405`, `413`, `415`, `422`).
- Limits request bodies to 16 KiB and sends JSON responses with no-store cache headers.
- Keeps data in an in-memory Map and assigns random UUIDs.
- No npm packages, API keys, cloud services or database required.

## Run locally

Requires **Node.js 20+**. From the `task-api` directory:

```bash
npm start
```

The server listens at `http://127.0.0.1:3000`. Override with `PORT=4000 npm start` on macOS/Linux. The server binds to loopback only and is intended for local development.

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

The Node built-in test runner starts a temporary server on an ephemeral port and checks CRUD operations, validation, malformed JSON, request size limits and HTTP errors. GitHub Actions runs the same test suite on changes to this project.

## Architecture

- `src/app.mjs`: HTTP handler, validation, and injectable in-memory store
- `src/server.mjs`: local server entrypoint
- `tests/api.test.mjs`: HTTP integration tests using built-in `node:test` and `fetch`

## Limitations and next steps

**Demo only.** All tasks disappear when the server restarts. There is no authentication, rate limiting, persistence, multi-user support or HTTPS termination. Do **not** expose this service to the public internet or store sensitive information.

Potential next improvements: persistent SQLite storage, pagination, OpenAPI documentation and authorization with a clear security model.
