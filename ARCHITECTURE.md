# Architecture — Agent Dashboard

This document explains *how the system fits together*: process boundaries, request flow, data model, and the key design decisions behind them. For tech stack/feature inventory, see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md).

## 1. System Overview

Three processes, no gateway or shared runtime between them:

```
┌─────────────────────┐        HTTP (axios)        ┌──────────────────────┐   SQL (@databricks/sql)   ┌─────────────────┐
│   Frontend (SPA)    │ ──────────────────────────▶ │   Backend (Express)  │ ────────────────────────▶ │  Databricks SQL │
│  React + Vite        │  /api/*  (proxied in dev)   │   Node.js, port 4000  │                            │  warehouse      │
│  served on 5174       │ ◀────────────────────────── │                       │ ◀──────────────────────── │  (Delta tables) │
└─────────────────────┘        JSON responses        └──────────────────────┘        rows/errors        └─────────────────┘
```

- **Frontend** is a Vite dev server (port 5174) in dev, or static build output in prod. It never talks to Databricks directly.
- **Backend** is a single Express process (port 4000). It owns all business logic and is the only thing that talks to the database.
- **Database** is a Databricks SQL warehouse (Unity Catalog, Delta tables) — see `backend/src/db/databricks-migrations/*.sql` for schema and `backend/README.md` for the migration history. Postgres (`docker-compose.yml`) is kept around only as the source for the one-time data copy and for `scripts/backup-db.js`/`restore-db.js`; the running app no longer reads or writes it.
- In dev, Vite's proxy forwards `/api/*` → `http://localhost:4000`, so the frontend code only ever knows about a relative `/api` base URL (`VITE_API_BASE_URL`). In prod, whatever serves the static frontend build needs to proxy `/api` to the backend, or `VITE_API_BASE_URL` needs to point at the backend's real origin.
- There is **no auth, no gateway, no message queue, no cache layer, no background workers** — every request is a synchronous HTTP round-trip ending in one or more Databricks SQL statements. Unlike Postgres, Delta has no cross-statement transactions, so multi-statement writes (§3) are sequenced rather than wrapped in a transaction.

## 2. Backend: Layered Request Flow

The backend is a straightforward layered architecture. Every request passes through the same pipeline, defined in `backend/src/app.js`:

```
Request
  │
  ▼
cors()                          — allow only env.corsOrigin
  │
  ▼
express.json()                  — parse JSON body
  │
  ▼
route match (routes/*.routes.js)
  │
  ▼
validateBody(zodSchema)         — middleware/validate.js: Zod .safeParse(req.body)
  │   400 + { error: { message, code: 'VALIDATION_ERROR', details } } on failure
  ▼
controller (controllers/*.controller.js)  — thin: pulls req params/validatedBody, calls a service, shapes the HTTP response
  │
  ▼
service (services/*.service.js)  — business logic + parameterized SQL against Databricks, one statement at a time
  │
  ▼
db/databricksClient.js  (@databricks/sql, one long-lived connection + a session per query) ──▶ Databricks SQL warehouse
  │
  ▼
notFoundHandler                 — unmatched routes → 404 (registered after all routes)
errorHandler                    — catches thrown/rejected errors, maps app-level error codes to HTTP status
```

**Why this shape**: each layer has exactly one job, so a change in one direction doesn't ripple into controllers or routes. It also means adding a new resource is a copy of the same five files (migration → schema → service → controller → route) — see [PROJECT_OVERVIEW.md § Extensibility](PROJECT_OVERVIEW.md#9-extensibility--where-to-plug-in).

**Error handling** (`middleware/errorHandler.js`): Delta doesn't enforce foreign keys or uniqueness and has no Postgres-style SQLSTATE error codes to map, so those checks moved into the service layer, which throws plain `Error`s carrying an app-defined `code`:

| App error code | Where it's thrown | HTTP status |
|---|---|---|
| `FK_VIOLATION` | `usage-logs.service.js` before inserting a usage log, if `agent_id` doesn't exist | 400 |
| `VALIDATION_ERROR` | `middleware/validate.js`, from a failed Zod `.safeParse()` | 400 |
| (anything else) | falls through to `err.status`/`err.code` or a generic 500 | 500 (default) |

Row uniqueness that used to be a Postgres unique index (one `agent_updates` row per agent/day, one `finops_thresholds` row per agent+alert-type) is now enforced by `MERGE INTO` statements in the service layer instead — see §3.

## 3. Writes Without Transactions: `recordUpdate` and friends

Postgres transactions used to keep multi-statement writes atomic. Delta Lake has no equivalent (no multi-table, multi-statement transactions), so every service that used to open a `db.transaction()` now runs its statements sequentially and reasons explicitly about partial failure instead:

- **`agents.service.js#createAgent`** inserts the `agents` row, then the initial `agent_updates` row. If the second insert throws, it deletes the `agents` row it just created so a failed create never leaves an agent with no history.
- **`updates.service.js#recordUpdate`** — the single most important piece of backend logic, used by both the single-agent update endpoint and the daily-sheet batch endpoint:

  ```
  recordUpdate({ agentId, updateDate, status, progress, statusDescription, source })
    │
    ├─▶ MERGE INTO agent_updates ...   ← upsert: one row per agent per day (replaces ON CONFLICT)
    │
    └─▶ UPDATE agents SET current_status=…, current_progress=…, last_update_at=…
          WHERE id = agentId            ← refresh denormalized cache, as a separate statement
  ```

  These two writes are **not atomic with each other** — if the process dies between them, the history row is correct but `agents.current_*` is stale until the next successful update. This is an accepted tradeoff of the Databricks cutover, not an oversight.
- **`recordBatch({ updateDate, entries })`** loops `recordUpdate` per entry, sequentially. A batch submit is **no longer all-or-nothing**: an entry that throws stops the loop, but entries already processed before it stay committed (Delta has no rollback to undo them).
- **`usage-logs.service.js#ingestUsageLog`** now explicitly checks `agent_id` exists before inserting (the FK is declared `NOT ENFORCED` in the DDL, so nothing else guarantees this), then inserts the log, then evaluates pricing/threshold alerts as separate follow-up statements.
- The `source` column (default `'manual'`) and `recordUpdate` are still the intended seam for future automated ingestion (e.g., a webhook from the agents themselves) — see `PROJECT_OVERVIEW.md § 9`.

## 4. Data Model

```
┌────────────────────────────┐          ┌──────────────────────────────────┐
│           agents            │          │          agent_updates            │
├────────────────────────────┤          ├──────────────────────────────────┤
│ id                uuid PK   │◀────┐    │ id              uuid PK           │
│ name               varchar  │     │    │ agent_id        uuid FK ──────────┼─┐
│ description        text     │     └────┤   ON DELETE CASCADE               │ │
│ assigned_to        varchar  │          │ update_date     date (=CURRENT)   │ │
│ eta                date      │          │ status          agent_status enum│ │
│ current_status  agent_status│◀╌╌╌╌╌╌╌╌╌│ progress        smallint 0-100    │ │
│ current_progress   smallint │  refreshed│ status_description text          │ │
│ current_status_desc text     │  by       │ source          varchar (='manual')│
│ last_update_at  timestamptz  │  recordUpdate│ created_at    timestamptz      │ │
│ created_at/updated_at        │          └──────────────────────────────────┘ │
└────────────────────────────┘                                                │
        ▲                                                                      │
        └──────────────────────────────────────────────────────────────────────┘
                        UNIQUE (agent_id, update_date)  — enables upsert
                        INDEX  (agent_id, update_date DESC) — fast history reads
```

- **`agents.current_*`** columns are a **denormalized read cache** of the latest `agent_updates` row for that agent — this is *why* the dashboard/list views can be a single `SELECT * FROM agents` with no join or aggregation.
- **`agent_updates`** is the append-style history log (though same-day resubmits update in place via the `MERGE INTO` in `recordUpdate`, they don't append a second row).
- Diagram above shows the Postgres-era types (`uuid`, native `agent_status` enum, a real `UNIQUE` constraint) for readability. On Databricks, ids are `STRING` (a `crypto.randomUUID()` generated in Node, since Delta has no `gen_random_uuid()` default), statuses are a plain `STRING` with a `CHECK` constraint instead of an enum, and the `(agent_id, update_date)` uniqueness is enforced by `recordUpdate`'s `MERGE INTO`, not a unique index (Delta has none) — see `backend/src/db/databricks-migrations/*.sql` for the actual DDL and its comments on what's enforced by the database vs. by application code.
- `agent_status` values (`Not Started | In Progress | Blocked | Completed | On Hold`) are the one piece of domain vocabulary duplicated outside the DB — mirrored in `backend/src/validators/agent.schema.js` (Zod) and again in `frontend/src/constants.js` (`STATUS_VALUES`) since there's no shared types package between workspaces.

## 5. Frontend Architecture

Plain Vite SPA — no file-based routing, no SSR. Composition root is `frontend/src/main.jsx`:

```
<BrowserRouter>
  <QueryClientProvider client={queryClient}>   ← TanStack React Query: all server state
    <ThemeProvider theme={theme}>              ← MUI theme (indigo, Inter font)
      <App />                                  ← AppBar/nav + <Routes> + global "Add Agent" FAB
```

`App.jsx` holds the three routes (`/`, `/daily-sheet`, `/agents/:id`) and the app-wide "Add Agent" FAB/modal, since adding an agent is possible from any screen.

**Data flow per feature** — every screen follows the same repeatable pattern:

```
page (pages/*.jsx)
  │  calls a hook
  ▼
hook (hooks/use*.js)              — wraps React Query: useQuery/useMutation, cache keys, invalidation
  │  calls an api function
  ▼
api (api/*.api.js)                — thin axios wrapper around one REST endpoint
  │
  ▼
client.js                         — shared axios instance, baseURL = VITE_API_BASE_URL
  │
  ▼
Backend /api/*
```

This mirrors the backend's layering (route→controller→service) almost exactly, just renamed for the frontend (page→hook→api-wrapper) — the same "one job per layer" principle applies, and it's the template to copy when wiring up a new resource on the frontend.

**Why React Query instead of Redux/Context for state**: there is no real client-only state to manage here (no multi-step wizards, no cross-page client state) — everything the UI shows is server data, so React Query's cache/invalidation model *is* the state layer. Mutations (`useRecordUpdate`, agent create) invalidate the relevant query keys on success so the dashboard/history views refetch automatically.

## 6. Request Walkthrough: Daily Update Sheet Submission

This is the most involved flow in the app and a good one to trace end-to-end:

1. `DailyUpdateSheetPage` loads via `useDailySheet()` → `GET /api/updates/today` → backend's `getTodayUpdates()` joins every agent with today's `agent_updates` row if one exists (`services/updates.service.js`).
2. Rows without a today's update pre-fill from the agent's `current_*` cache and are flagged "carried over — please confirm" in the UI.
3. User edits N rows, clicks submit → one `POST /api/updates/batch` with `{ updateDate, entries: [...] }`.
4. Backend's `recordBatch` opens **one transaction**, loops `recordUpdate(trx, entry)` per row — each iteration does the upsert-into-`agent_updates` + refresh-`agents.current_*` pair described in §3.
5. Any single-row failure (e.g., a check-constraint violation) rolls back the *entire* batch — partial submits are not possible by design.
6. On success, the frontend invalidates the relevant React Query keys, so the Dashboard and Update History views reflect the change without a manual refresh.

## 7. Deliberate Non-Features (context for anyone extending this)

These are absent by design/oversight, not accident — worth knowing before building on top:

- **No auth** — anyone who can reach the backend can read/write everything. If integrating this into a larger system, auth should sit as Express middleware in `app.js` (before route mounts) and an axios interceptor in `frontend/src/api/client.js`.
- **No API gateway / BFF** — the frontend calls the backend directly (via Vite's dev proxy or a prod-configured `VITE_API_BASE_URL`). Fine at this scale; would need revisiting if this backend starts serving multiple frontends with different needs.
- **No background jobs / queue** — all writes are synchronous within the HTTP request. The `source` column on `agent_updates` anticipates automated (non-manual) writes, but nothing currently produces them.
- **No caching layer** (Redis, etc.) between backend and Databricks — the `agents.current_*` denormalization *is* the app's only caching strategy. It's kept close to consistent by always writing through `recordUpdate`, though (per §3) that's no longer a single atomic transaction the way it was on Postgres.

## 8. Related Docs

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) — tech stack, feature list, scripts, env vars, extensibility points.
- [README.md](README.md) — local setup instructions.
