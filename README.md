# Agent Dashboard

Centralized dashboard for tracking the status/progress of AI agent workstreams. React + Express + PostgreSQL.

## Prerequisites

- Node.js 20+
- A PostgreSQL 13+ database (locally installed, or via Docker — see below)

## First-time setup

1. Start Postgres (skip if you already have one running locally):

   ```
   docker compose up -d
   ```

2. Copy env files and adjust if needed:

   ```
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Install dependencies (installs both `backend` and `frontend` workspaces):

   ```
   npm install
   ```

4. Run migrations and seed sample data:

   ```
   npm run migrate
   npm run seed
   ```

5. Start both apps:

   ```
   npm run dev
   ```

   - Backend: http://localhost:4000/api/health
   - Frontend: http://localhost:5174

## Everyday use

- **Dashboard** (`/`) — see all agents, click "Add Agent" to create a new one.
- **Daily Update Sheet** (`/daily-sheet`) — fill in today's status/progress/notes for every agent at once; each submission is stored as a dated history record (one per agent per day — resubmitting the same day updates that day's entry rather than creating a duplicate).
- **Agent detail** (click any agent card) — shows the progress-over-time chart built from daily history.

## Backups

Postgres data lives in a Docker named volume, which survives normal `docker compose stop`/`up`/`down` (without `-v`) — but `docker compose down -v` (or deleting the volume directly) wipes it permanently. To protect against that, take real file-based backups outside Docker:

```
npm run db:backup
```

Writes a timestamped `.sql` dump to `backups/` (gitignored — these are local files only). To restore the most recent backup:

```
npm run db:restore
```

Or restore a specific file: `npm run db:restore -- backups/agent_dashboard_2026-08-26T10-00-00-000Z.sql`. Restores are safe to re-run — the dump includes `DROP ... IF EXISTS` before recreating everything, so it won't error against an already-populated database.

Run `npm run db:backup` periodically (e.g. before pulling schema changes, or just at the end of each day) since there's no automatic scheduling yet.

## Notes for the next phase

Agents currently report status manually via the Daily Update Sheet. The `agent_updates` table has a `source` column (`'manual'` today) and a single `recordUpdate()` service function (`backend/src/services/updates.service.js`) that any future automated ingestion (webhook/API from the agents themselves) can call directly — no schema change needed to wire that up later.
