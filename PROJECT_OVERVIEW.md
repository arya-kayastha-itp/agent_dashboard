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
- **Knex 3.1.0** — query builder / migrations (not a full ORM), driver: `pg` 8.13.1
- **PostgreSQL 16** (via `docker-compose.yml`; README says 13+ also works)
- **Zod 3.23.8** — request validation
- **cors**, **dotenv**
- Dev: **nodemon**
- **No authentication/authorization** currently implemented
- No test framework configured

### Infra / Deployment
- `docker-compose.yml` at repo root runs **Postgres only** (named volume, port 5432, default `postgres/postgres` creds, db `agent_dashboard`)
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
│   ├── knexfile.js
│   ├── .env.example
│   └── src/
│       ├── app.js            # express app; mounts /api/agents, /api/updates, /api/health
│       ├── server.js         # entrypoint
│       ├── config/env.js     # PORT, DATABASE_URL, CORS_ORIGIN
│       ├── routes/            # agents.routes.js, updates.routes.js
│       ├── controllers/       # thin HTTP glue
│       ├── services/          # DB/business logic (Knex)
│       ├── validators/        # Zod schemas
│       ├── middleware/        # validate.js, errorHandler.js
│       └── db/
│           ├── pool.js
│           ├── migrations/    # 001_create_agents.js, 002_create_agent_updates.js
│           └── seeds/         # seed_agents.js
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

**Database**: PostgreSQL, two tables (raw SQL in Knex migrations, `backend/src/db/migrations/`):

- **`agents`** — `id uuid PK` (via `pgcrypto`), `name`, `description`, `assigned_to`, `eta date`, `current_status` (Postgres ENUM `agent_status`: `Not Started | In Progress | Blocked | Completed | On Hold`), `current_progress smallint CHECK 0-100`, `current_status_description`, `last_update_at`, timestamps.
- **`agent_updates`** — `id uuid PK`, `agent_id uuid FK → agents(id) ON DELETE CASCADE`, `update_date date default CURRENT_DATE`, `status`, `progress smallint CHECK 0-100`, `status_description`, `source varchar(50) default 'manual'`, `created_at`. Unique index on `(agent_id, update_date)` enables the one-record-per-agent-per-day upsert; covering index `(agent_id, update_date DESC)` for history queries.

The `agents.current_*` columns are a **denormalized cache** of the latest `agent_updates` row, refreshed transactionally on every update (`updates.service.js: recordUpdate`).

**API routes** (all under `/api`):
- `GET /api/health`
- `GET /api/agents`, `GET /api/agents/:id`, `GET /api/agents/:id/history` (`?from`/`&to`)
- `POST /api/agents`, `PATCH /api/agents/:id`, `DELETE /api/agents/:id`
- `GET /api/updates/today`, `GET /api/updates/history`
- `POST /api/updates` (single-agent upsert), `POST /api/updates/batch` (daily-sheet bulk submit)

**External integrations**: none currently — no third-party APIs, cloud SDKs, auth providers, or webhooks. The `source` column on `agent_updates` (always `'manual'` today) is explicitly designed as the extension point for future automated ingestion — a future webhook could call the same `recordUpdate(trx, {...})` with `source: 'automated'`, no schema change needed.

**Backup/restore**: `scripts/backup-db.js` / `restore-db.js` shell out to `docker compose exec postgres pg_dump`/`psql`.

## 6. Environment / Config

`backend/.env.example`:
```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/agent_dashboard
CORS_ORIGIN=http://localhost:5174
```

`frontend/.env.example`:
```
VITE_API_BASE_URL=/api
```
In dev, Vite proxies `/api` → `http://localhost:4000`, so the frontend never needs the backend's real host in dev.

> Minor gotcha: `backend/src/config/env.js`'s default fallback for `corsOrigin` is `http://localhost:5173`, but the `.env.example` and Vite's actual dev port are `5174` — worth knowing if you hit a CORS error locally.

No real secrets are involved — only default local Postgres credentials for the Docker Compose instance.

## 7. Scripts

**Root**:
- `npm run dev` — backend + frontend concurrently (color-coded)
- `npm run migrate` / `npm run seed`
- `npm run db:backup` / `npm run db:restore`

**Backend**: `dev` (nodemon), `start`, `migrate`, `migrate:rollback`, `seed`

**Frontend**: `dev` (vite), `build`, `lint` (oxlint), `preview`

## 8. Conventions

- **No TypeScript** anywhere — plain JS/JSX, no `tsconfig.json`.
- Frontend uses **oxlint**, not ESLint/Prettier; backend has **no linter** configured.
- **Zod** is the single source of truth for the status enum on the backend (`agent.schema.js`); it's manually mirrored in `frontend/src/constants.js` since there's no shared types package between the two workspaces.
- Centralized `errorHandler.js` maps Postgres error codes to structured `{ error: { message, code } }` responses (23505 → 409 conflict, 23503 → 400 FK violation, 23514/22P02 → 400 check/invalid input).
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
