# Backend

Node/Express API for the Agent Dashboard, backed by Databricks SQL (Unity Catalog, Delta tables). See the [root README](../README.md) for what the product does and how to run the whole stack; this doc is about how the backend code itself is organized.

## Running just the backend

Requires the `DATABRICKS_*` vars set in `.env` (see `.env.example`) — a personal access token (Databricks User Settings → Developer → Access tokens, full/standard scope — a token scoped to exclude `sql` fails with an HTTP 403 whose body says `"does not have required scopes: sql"`), plus `USE CATALOG`/`USE SCHEMA`/`CREATE TABLE`/`MODIFY`/`SELECT` granted on the target catalog+schema.

```
npm run migrate:databricks --workspace backend   # first time / after pulling new DDL
npm run seed:databricks --workspace backend      # optional — loads sample agents/pricing/usage
npm run dev --workspace backend                  # nodemon, restarts on file change
```

Health check: `GET http://localhost:4000/api/health`.

## Structure

```
src/
├── app.js              # Express app: middleware, route mounting, error handlers
├── server.js             # Starts the HTTP server (app.listen)
├── config/env.js           # All env vars read in one place — nothing else should touch process.env
├── routes/               # One router per resource, just path -> controller wiring
├── controllers/            # Thin — pull params/query/body, call a service, shape the response
├── services/              # All business logic and DB queries live here
├── validators/             # Zod schemas for request bodies
├── middleware/             # validate.js (Zod), errorHandler.js (app error code -> HTTP mapping)
└── db/
    ├── databricksClient.js            # @databricks/sql connection + query/queryOne helpers
    ├── databricks-migrations/          # DDL, run in order (000_..., 001_..., ...)
    ├── migrate-databricks.js           # applies DDL, tracked in schema_migrations
    ├── seed-databricks.js              # sample data for local dev
    ├── copy-postgres-to-databricks.js  # one-time cutover: live Postgres -> Databricks
    └── load-backup-to-databricks.js    # one-time cutover: a pg_dump backup file -> Databricks
```

The layering is strict: routes never talk to `db/` directly, controllers never write SQL, services never touch `req`/`res`. When adding an endpoint, that's the order to build it in — migration (if needed) → service → controller → route.

## Domain model

| Table | What it is |
|---|---|
| `agents` | One row per tracked AI agent project |
| `agent_updates` | Append-only history of status/progress changes (one create per update, including the initial one on agent creation) |
| `model_pricing` | Effective-dated $/1k-token pricing per model — historical calls are never re-priced after a rate change |
| `api_usage_logs` | One row per AI API call an external app reports (tokens, cost, status, latency) |
| `finops_thresholds` | Cost/error-rate limits, either global or scoped to one agent |
| `finops_alerts` | Auto-raised when a threshold is crossed or usage hits an unpriced model |

## Routes

| Base path | Router | Covers |
|---|---|---|
| `/api/agents` | `agents.routes.js` | CRUD, history, per-agent insights + narrative regeneration |
| `/api/updates` | `updates.routes.js` | Daily Update Sheet — today's entries, full history, batch submit |
| `/api/finops` | `finops.routes.js` | Usage ingestion (single + batch), usage summary, pricing, thresholds, alerts |
| `/api/insights` | `insights.routes.js` | Portfolio-wide insights + narrative regeneration, and per-agent totals keyed by agent id (`/by-agent`, powers the Dashboard's agent cards) |

All error responses share one shape: `{ error: { message, code } }`. Delta enforces neither foreign keys nor uniqueness and has no Postgres-style SQLSTATE codes, so those checks live in the service layer, which throws a plain `Error` with an app-defined `.code` (e.g. `FK_VIOLATION` when `usage-logs.service.js` finds no matching `agent_id`); `middleware/errorHandler.js` maps those codes to the right HTTP status automatically — don't catch-and-rethrow those in a service just to add a message.

## Insights & narrative generation

`services/insights.service.js` is the one place that computes calls/cost/error-rate/trend/anomalies from `api_usage_logs` rows — `getAgentInsights` (one agent), `getPortfolioInsights` (all agents), and `getAgentsInsightsSummary` (all agents, but per-agent totals instead of aggregated — powers the Dashboard cards) all share the same `computeTotals`/`computeTrend`/`computeAnomalies` helpers. The window is monthly (30 days) everywhere by default, and trend comparisons are month-over-month.

Each of those also produces a `narrative` — a template-generated plain-English summary, always available with no external dependency. `services/ai-narrative.service.js` can generate a richer version via the Anthropic API when `ANTHROPIC_API_KEY` is set (returns a 503 `AI_NOT_CONFIGURED` otherwise); `POST /api/agents/:id/insights/narrative` and `POST /api/insights/portfolio/narrative` expose that. As of this writing the frontend doesn't call either regenerate endpoint from any UI control — only the computed/template narrative is currently shown.

## Validation

Request bodies are validated with Zod schemas in `validators/`, applied via `middleware/validate.js` (`validateBody(schema)`) on the route definition. Query params are read directly in controllers and aren't schema-validated — keep that in mind if you add a query param that needs real validation, not just a `Number(...)` cast.

## Accounts and sign-in

`services/users.service.js` owns accounts (`users` table, one per team member) and one-time links (`user_tokens`, stored as SHA-256 hashes). Passwords are scrypt hashes (`services/credentials.service.js`). Session JWTs carry the account id and its `token_version`; `middleware/auth.js` checks both against the account on every request (cached for 60 seconds, evicted on every account write), so deactivation, role changes and password resets end sessions immediately. The persona on `req.user` comes from the account's role, never from the token. `npm run users:link -- <email>` prints a set-password link for an existing account — that's how the first Agent Manager gets in.

## What contributors can see

Contributors only see the agents they're assigned to. `GET /api/agents` filters to their assignments, and `middleware/agentAccess.js` (`requireAgentAccess`) answers 404 for any other `/api/agents/:id…` read, so the API doesn't confirm the agent exists. Portfolio insights (`/api/insights/*`) and the team roster (`/api/team-members`) cover everyone, so they're closed to contributors. Every other persona sees all agents as before.

## Update submissions and review

`services/submissions.service.js` owns `update_submissions`: contributors' proposed updates and the Agent Manager's decisions (`pending` → `approved` / `changes_requested` / `rejected`, or `superseded`). Only an agent's assignees can submit (checked against `agent_assignees`). Approval — single, with optional reviewer edits, or bulk — runs through one `applyApprovals` that does a fixed number of `MERGE`s however many updates are approved: mark approved, supersede older pending ones per agent, write the history row for the submission's own `update_date` (`source = 'submission'`, `recorded_by` = submitter, `submission_id`), then refresh the agent's `current_*` fields only when no later history day exists. `agent_updates.recorded_by` is also set for the Agent Manager's direct updates. Every agent query returns `pendingReviewCount` (a correlated subquery in `AGENT_SELECT`).

## Email

`services/mailer.service.js` sends invite and password-reset links through Azure Communication Services when `ACS_CONNECTION_STRING` and `EMAIL_SENDER` are set, and logs instead when they aren't; it never throws, so a mail failure can't fail the request. FinOps alert email (`sendAlertEmail`) is still a logging stub — alert-raising code (`alerts.service.js`) already calls it, so wiring real delivery in only touches that one function.

## Databricks migration (done)

The live datastore has been cut over from Postgres/Knex to Databricks SQL (Unity Catalog, Delta tables). What exists:

- `src/db/databricks-migrations/*.sql` — schema DDL for all 6 tables, translated for Delta Lake (no `ENUM`/`jsonb`/unique indexes/enforced FKs; `CHECK` constraints and informational `PRIMARY KEY`/`FOREIGN KEY ... NOT ENFORCED` instead)
- `src/db/databricksClient.js` — thin wrapper around `@databricks/sql` for parameterized queries (`query`/`queryOne`), one long-lived connection + a session per query
- `src/db/migrate-databricks.js` — applies the DDL files in order, tracked in a `schema_migrations` table (run via `npm run migrate:databricks --workspace backend`); statements are individually idempotent (`CREATE TABLE IF NOT EXISTS`, and re-running a file whose `ALTER TABLE ADD CONSTRAINT` already applied is tolerated rather than failing)
- `src/db/copy-postgres-to-databricks.js` — one-time copy from a **live** Postgres (`DATABASE_URL`)
- `src/db/load-backup-to-databricks.js` — one-time load straight from a `scripts/backup-db.js` dump file (parses the pg_dump `COPY ... FROM stdin` blocks itself, no live Postgres/Docker needed) — this is what was actually used for the cutover
- `src/db/seed-databricks.js` — local-dev sample data, driven through the real service functions (`agentsService.createAgent`, `usageLogsService.ingestUsageLog`, etc.) so it exercises the same pricing/alert-evaluation logic as real traffic
- All of `services/*.js` were rewritten off Knex/`pg` onto raw parameterized SQL against Databricks. Because Delta has no cross-table transactions, `RETURNING`, or enforced FK/unique constraints, this was a real logic change, not just a driver swap — see `ARCHITECTURE.md §2-3` for what changed (app-level FK checks, `MERGE INTO` replacing `ON CONFLICT` upserts, sequential non-atomic multi-statement writes with manual compensation where it matters).

`DATABASE_URL` / the Postgres container are now legacy — kept only for `scripts/backup-db.js`/`restore-db.js` and as the source for `copy-postgres-to-databricks.js`; the running app never touches Postgres.

Setup: set the `DATABRICKS_*` vars in `.env` (see `.env.example`) using **your own** personal access token (Databricks User Settings → Developer → Access tokens — tokens are per-user, don't reuse someone else's, and must have standard/full scope — a token missing the `sql` scope fails with an HTTP 403 body `"does not have required scopes: sql"`), and get `USE CATALOG` on the catalog plus `USE SCHEMA`/`CREATE TABLE`/`MODIFY`/`SELECT` on the target schema granted to your account by whoever administers Unity Catalog. Then:

```
npm run migrate:databricks --workspace backend
npm run seed:databricks --workspace backend       # optional, local sample data
```

## Linting / tests

No dedicated backend lint script exists yet. `npm test --workspace backend` runs the unit tests in `test/` with Node's built-in runner (password hashing and link tokens so far). `node -e "require('./src/app.js')"` is a quick sanity check that the app boots without a syntax/require error.
