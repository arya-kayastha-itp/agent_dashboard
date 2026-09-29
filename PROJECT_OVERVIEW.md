# Agent Dashboard — Project Overview

> A handoff doc for teammates who want to build a new project on top of this one, or integrate their own work into it.

## 1. What This Is

**Agent Dashboard** is an internal tool for tracking the status and progress of AI agent development workstreams. Each "agent" (an AI-agent project being built by the team) has a status (Not Started / In Progress / Blocked / Completed / On Hold), a 0–100% progress value, an owner, and an ETA. The team logs daily progress updates against each agent and can view history/trend charts over time.

Three user-facing screens (React Router SPA):

| Route | Purpose |
|---|---|
| `/` | Dashboard — grid of agent cards, "Add Agent" FAB/modal |
| `/daily-sheet` | Daily Update Sheet — bulk-edit today's status/progress/notes for *all* agents at once, plus full update-history table below it |
| `/agents/:id` | Agent detail — metadata, single-agent update form, progress-over-time line chart |

## 2. Tech Stack

It's an **npm workspaces monorepo** with two workspaces: `backend` and `frontend`.

### Frontend (`frontend/`)
- **React 19.2.8** + **Vite 8.2.2** (plain SPA, no Next.js/file-based routing)
- **React Router DOM 7.0.2** — single route table in `App.jsx`
- **MUI (Material UI) 6.1.10** + Emotion — component library and styling, custom theme (indigo primary `#4F46E5`, Inter font, rounded corners)
- **TanStack React Query 5.62.7** — all server state/data-fetching/caching
- **Axios 1.7.9** — HTTP client
- **react-hook-form 7.54.1** — forms
- **Recharts 2.13.3** — progress-history line chart
- **date-fns 4.1.0**
- Linting: **oxlint** (not ESLint/Prettier) — `frontend/.oxlintrc.json`
- **Plain JavaScript/JSX — no TypeScript**
- No test framework configured

### Backend (`backend/`)
- **Node.js + Express 4.21.1** (CommonJS)
- **Databricks SQL** (Unity Catalog, Delta tables) via **`@databricks/sql` 2.1.0** — no ORM/query builder, services write parameterized SQL directly through `backend/src/db/databricksClient.js`
- Postgres (`docker-compose.yml`, `pg` 8.13.1) is legacy — kept only as the source for the one-time `copy:postgres-to-databricks` script and for `scripts/backup-db.js`/`restore-db.js`; the running app doesn't use it
- **Zod 3.23.8** — request validation
- **cors**, **dotenv**
- Dev: **nodemon**
- **No authentication/authorization** currently implemented
- No test framework configured

### Infra / Deployment
- `docker-compose.yml` at repo root runs **Postgres only** (named volume, port 5432, default `postgres/postgres` creds, db `agent_dashboard`) — legacy, see above; the live datastore is a Databricks SQL warehouse configured entirely via env vars, nothing to run locally for it
- No Dockerfile for the app itself, no CI config, no hosting config (no `vercel.json`, etc.)
- This is currently a **local/dev-only setup** — frontend/backend run via `npm run dev` (Vite dev server + nodemon). Anyone deploying this for real will need to add a Dockerfile, CI, and hosting config.

## 3. Project Structure

```
agent-dashboard/
├── package.json            # root workspace orchestrator (dev/migrate/seed/backup/restore)
├── docker-compose.yml       # Postgres 16 only
├── README.md
├── scripts/                 # backup-db.js, restore-db.js (pg_dump/psql via docker compose)
├── backups/                  # gitignored local .sql dumps
├── backend/
│   ├── .env.example
│   └── src/
│       ├── app.js            # express app; mounts /api/agents, /api/updates, /api/finops, /api/insights, /api/health
│       ├── server.js         # entrypoint
│       ├── config/env.js     # PORT, CORS_ORIGIN, DATABRICKS_*
│       ├── routes/            # agents.routes.js, updates.routes.js, finops.routes.js, insights.routes.js
│       ├── controllers/       # thin HTTP glue
│       ├── services/          # DB/business logic (raw parameterized SQL against Databricks)
│       ├── validators/        # Zod schemas
│       ├── middleware/        # validate.js, errorHandler.js
│       └── db/
│           ├── databricksClient.js         # @databricks/sql connection + query/queryOne helpers
│           ├── databricks-migrations/      # DDL, applied via migrate:databricks
│           ├── migrate-databricks.js
│           ├── seed-databricks.js
│           ├── copy-postgres-to-databricks.js    # one-time cutover: live Postgres -> Databricks
│           └── load-backup-to-databricks.js      # one-time cutover: a pg_dump backup file -> Databricks
└── frontend/
    ├── vite.config.js        # dev server port 5174, proxies /api → localhost:4000
    ├── .oxlintrc.json
    └── src/
        ├── main.jsx           # QueryClientProvider + ThemeProvider + BrowserRouter
        ├── App.jsx            # nav + routes + Add Agent FAB/modal
        ├── theme.js
        ├── constants.js       # STATUS_VALUES, STATUS_COLORS
        ├── pages/              # DashboardPage, DailyUpdateSheetPage, AgentDetailPage
        ├── components/         # AgentCard, AgentForm, AgentUpdateForm, AddAgentModal,
        │                        # DailySheetRow, UpdateHistoryList, HistoryChart, ProgressBar, StatusBadge
        ├── hooks/              # useAgents, useAgentHistory, useDailySheet, useRecordUpdate (React Query wrappers)
        └── api/                # client.js (axios instance), agents.api.js, updates.api.js
```

**Architectural pattern**: classic layered backend (routes → controllers → services → db) and a plain Vite SPA on the frontend. Not feature-folder-based — the codebase is small (2 resources: agents, updates), so a layer-based split works cleanly. Every resource follows the same repeatable pattern: `api/*.api.js` (axios wrapper) → `hooks/use*.js` (React Query hook) → page/component.

## 4. Features (User-Facing)

1. **Dashboard** (`/`) — grid of agent cards (name, status badge, assignee, ETA, progress bar, status description); click to open detail.
2. **Add Agent** — global FAB + modal to create a new agent (name, description, assignee, status, ETA, initial progress, status description).
3. **Agent Detail** (`/agents/:id`) — metadata card, single-agent update form, and a Recharts line chart of progress % over time.
4. **Daily Update Sheet** (`/daily-sheet`) — spreadsheet-like bulk editor: one row per agent, batch-submits status/progress/notes for all agents at once. Rows pre-fill from today's existing update if present, otherwise carry over the agent's last known values (flagged "carried over — please confirm"). Resubmitting the same day **upserts** rather than duplicating.
5. **Update History** — full history of all updates across all agents, grouped by agent, on the same page as the Daily Update Sheet.

> Note: the backend supports `PATCH`/`DELETE /api/agents/:id` but there is **no edit/delete UI** wired up yet — a ready-made integration point for someone wanting to add that.

## 5. Data Layer

**Database**: Databricks SQL (Unity Catalog, Delta tables), DDL in `backend/src/db/databricks-migrations/*.sql`, applied via `npm run migrate:databricks --workspace backend`. Six tables: `agents`, `agent_updates`, `model_pricing`, `api_usage_logs`, `finops_thresholds`, `finops_alerts`.

- **`agents`** — `id STRING PK` (app-generated `crypto.randomUUID()` — Delta has no `gen_random_uuid()` default), `name`, `description`, `assigned_to` (legacy free-text column — no longer read or written; assignees now live in `agent_assignees`), `eta DATE`, `current_status` (`STRING` + `CHECK` constraint: `Not Started | In Progress | Blocked | Completed | On Hold` — no native enum type in Delta), `current_progress SMALLINT CHECK 0-100`, `current_status_description`, `last_update_at`, `sort_order`, timestamps.
- **`team_members`** — `id STRING PK`, `name`, `created_at`. The roster managed on the Teams page (Agent Manager only). Case-insensitive name uniqueness is enforced in `team-members.service.js`, not by a DB constraint.
- **`agent_assignees`** — `(agent_id, team_member_id)` composite PK, `created_at`. One row per assignee, so an agent can have several. Both FKs are `NOT ENFORCED`; `agents.service.js` only accepts ids that exist in `team_members`, so free-text assignees can't be saved, and removing a member deletes their rows here.
- **`agent_updates`** — `id STRING PK`, `agent_id STRING` (FK to `agents.id`, declared `NOT ENFORCED` — Delta doesn't enforce FKs), `update_date DATE`, `status`, `progress SMALLINT CHECK 0-100`, `status_description`, `source STRING default 'manual'`, `created_at`. No unique index equivalent exists in Delta, so "one row per (agent_id, update_date)" is enforced by application code via `MERGE INTO` in `updates.service.js: recordUpdate`, not a DB constraint.

The `agents.current_*` columns are a **denormalized cache** of the latest `agent_updates` row, refreshed by `recordUpdate` as a second, separate statement — not atomically, since Delta has no cross-table transactions (see `ARCHITECTURE.md §3`).

**API routes** (all under `/api`):
- `GET /api/health`
- `GET /api/agents`, `GET /api/agents/:id`, `GET /api/agents/:id/history` (`?from`/`&to`)
- `POST /api/agents`, `PATCH /api/agents/:id`, `DELETE /api/agents/:id`
- `GET /api/updates/today`, `GET /api/updates/history`
- `POST /api/updates` (single-agent upsert), `POST /api/updates/batch` (daily-sheet bulk submit)
- `GET/POST /api/finops/usage`, `GET /api/finops/usage/summary`, `GET/POST /api/finops/pricing`, `GET/POST /api/finops/thresholds`, `GET/PATCH /api/finops/alerts`
- `GET /api/insights/portfolio`, `GET /api/insights/by-agent`, plus per-agent insights under `/api/agents/:id/insights`

**External integrations**: the Anthropic API (optional, for AI narrative generation) is the only outbound third-party call; no auth providers or webhooks. The `source` column on `agent_updates` (always `'manual'` today) is still the intended extension point for future automated ingestion — a future webhook could call the same `recordUpdate({...})` with `source: 'automated'`, no schema change needed.

**Postgres cutover**: the app ran on Postgres/Knex until this migration. `backend/src/db/copy-postgres-to-databricks.js` copies from a **live** Postgres (`DATABASE_URL`); `backend/src/db/load-backup-to-databricks.js` instead parses a `scripts/backup-db.js` dump file directly (no live Postgres/Docker needed) — that's what was used for the actual cutover. Both are one-time scripts, safe to re-run (each clears its target table before reloading). `scripts/backup-db.js` / `restore-db.js` still shell out to `docker compose exec postgres pg_dump`/`psql` against the now-legacy Postgres container, kept around only as a rollback/reference copy.

## 6. Environment / Config

`backend/.env.example`:
```
PORT=4000
CORS_ORIGIN=http://localhost:5174
ANTHROPIC_API_KEY=
DATABRICKS_HOST=
DATABRICKS_TOKEN=
DATABRICKS_HTTP_PATH=
DATABRICKS_CATALOG=
DATABRICKS_SCHEMA=
DATABASE_URL=postgres://postgres:postgres@localhost:5432/agent_dashboard   # legacy, see §5
```

`frontend/.env.example`:
```
VITE_API_BASE_URL=/api
```
In dev, Vite proxies `/api` → `http://localhost:4000`, so the frontend never needs the backend's real host in dev.

> Minor gotcha: `backend/src/config/env.js`'s default fallback for `corsOrigin` is `http://localhost:5173`, but the `.env.example` and Vite's actual dev port are `5174` — worth knowing if you hit a CORS error locally.

`DATABRICKS_TOKEN` is a real per-user personal access token — treat `.env` as a secret, not just local Postgres creds like before. Databricks personal access tokens can be scope-restricted by workspace policy; a token missing the `sql` scope fails with an HTTP 403 whose body says `"does not have required scopes: sql"` — regenerate the token with full/standard scope (or ask a workspace admin) if you hit that.

## 7. Scripts

**Root**:
- `npm run dev` — backend + frontend concurrently (color-coded)
- `npm run db:backup` / `npm run db:restore` — legacy Postgres dumps only

**Backend**: `dev` (nodemon), `start`, `migrate:databricks`, `seed:databricks`, `copy:postgres-to-databricks`

**Frontend**: `dev` (vite), `build`, `lint` (oxlint), `preview`

## 8. Conventions

- **No TypeScript** anywhere — plain JS/JSX, no `tsconfig.json`.
- Frontend uses **oxlint**, not ESLint/Prettier; backend has **no linter** configured.
- **Zod** is the single source of truth for the status enum on the backend (`agent.schema.js`); it's manually mirrored in `frontend/src/constants.js` since there's no shared types package between the two workspaces.
- `middleware/errorHandler.js` maps small set of app-defined error codes (e.g. `FK_VIOLATION`, thrown by services when a referenced row doesn't exist) to HTTP status, since Delta has no enforced FKs/uniqueness and no Postgres-style SQLSTATE codes to key off of anymore.
- No code generation (no OpenAPI/GraphQL/Prisma).

## 9. Extensibility — Where To Plug In

- **New resource**: add a migration → Zod schema → service → controller → route (mounted in `app.js`); mirror on the frontend with an `api/*.api.js` file + `hooks/use*.js` React Query hook + page/component. This pattern is consistent and easy to replicate.
- **Automated update ingestion**: use the existing `recordUpdate(trx, {...})` function and `source` column — no schema change needed for a webhook/API-driven data source.
- **Agent edit/delete UI**: backend already supports `PATCH`/`DELETE /api/agents/:id`; just needs frontend wiring.
- **Auth**: none exists. Natural insertion points are Express middleware in `backend/src/app.js` (before route mounts) and an axios interceptor in `frontend/src/api/client.js`.
- **Different frontend/backend pairing**: `CORS_ORIGIN` (backend) and `VITE_API_BASE_URL` (frontend) make it straightforward to point this frontend at a different backend, or put a different frontend in front of this backend.
- **New service/shared lib**: since this is an npm workspaces monorepo, add a third `workspaces` entry at the root `package.json` (e.g., a shared types/schema package to de-duplicate the status enum between frontend and backend).

## 10. Known Gaps (be aware before extending)

- No authentication/authorization layer.
- No automated tests (frontend or backend).
- No CI/CD pipeline.
- No production deployment config (Dockerfile, hosting) — dev-only today.
- `CORS_ORIGIN` default (5173) vs. actual dev port (5174) mismatch in `env.js`.
