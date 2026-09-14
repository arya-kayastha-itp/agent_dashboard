# Backend

Node/Express API for the Agent Dashboard, backed by PostgreSQL via Knex. See the [root README](../README.md) for what the product does and how to run the whole stack; this doc is about how the backend code itself is organized.

## Running just the backend

Requires a running Postgres reachable at `DATABASE_URL` (see `.env.example` — `docker compose up -d` from the repo root starts one).

```
npm run migrate --workspace backend   # first time / after pulling new migrations
npm run seed --workspace backend      # optional — loads sample agents/pricing/usage
npm run dev --workspace backend       # nodemon, restarts on file change
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
├── middleware/             # validate.js (Zod), errorHandler.js (Postgres error -> HTTP mapping)
└── db/
    ├── pool.js              # Knex instance
    ├── migrations/           # Schema, run in order (001_..., 002_..., ...)
    └── seeds/                # Sample data for local dev
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

All error responses share one shape: `{ error: { message, code } }`. `middleware/errorHandler.js` maps common Postgres error codes (unique violation, FK violation, check/invalid-input) to the right HTTP status automatically — don't catch-and-rethrow those in a service just to add a message.

## Insights & narrative generation

`services/insights.service.js` is the one place that computes calls/cost/error-rate/trend/anomalies from `api_usage_logs` rows — `getAgentInsights` (one agent), `getPortfolioInsights` (all agents), and `getAgentsInsightsSummary` (all agents, but per-agent totals instead of aggregated — powers the Dashboard cards) all share the same `computeTotals`/`computeTrend`/`computeAnomalies` helpers. The window is monthly (30 days) everywhere by default, and trend comparisons are month-over-month.

Each of those also produces a `narrative` — a template-generated plain-English summary, always available with no external dependency. `services/ai-narrative.service.js` can generate a richer version via the Anthropic API when `ANTHROPIC_API_KEY` is set (returns a 503 `AI_NOT_CONFIGURED` otherwise); `POST /api/agents/:id/insights/narrative` and `POST /api/insights/portfolio/narrative` expose that. As of this writing the frontend doesn't call either regenerate endpoint from any UI control — only the computed/template narrative is currently shown.

## Validation

Request bodies are validated with Zod schemas in `validators/`, applied via `middleware/validate.js` (`validateBody(schema)`) on the route definition. Query params are read directly in controllers and aren't schema-validated — keep that in mind if you add a query param that needs real validation, not just a `Number(...)` cast.

## Email alerts

`services/mailer.service.js` is a stub — it logs what it would send instead of sending it. No SMTP is configured. Alert-raising code (`alerts.service.js`) already calls it, so wiring real delivery in only touches that one file.

## Linting / tests

No dedicated backend lint script or test suite exists yet — `node -e "require('./src/app.js')"` is a quick sanity check that the app boots without a syntax/require error.
