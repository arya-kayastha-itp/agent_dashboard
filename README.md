# Agent Dashboard

Internal tool for tracking the status and progress of AI agent development workstreams, with a built-in FinOps module for monitoring API usage, cost, and reliability across those agents. Access is split across three personas — Executive, Agent Manager, and FinOps — each seeing a different slice of the same data.

See also: [frontend/README.md](frontend/README.md) for the React app's structure, [backend/README.md](backend/README.md) for the API's structure, and [.claude/ui-ux-audit.md](.claude/ui-ux-audit.md) for the UI/UX review this app has been through.

## Personas

There's no real authentication — `/login` is a persona picker (stored in `localStorage`) that stands in for it. Each persona sees a different set of nav items and page content:

| Persona | Can see | Can do |
|---|---|---|
| **Executive** | Dashboard (incl. Portfolio Insights) | View-only |
| **Agent Manager** | Dashboard (no Portfolio Insights), Daily Update Sheet | Add agents, edit agent metadata, log daily updates |
| **FinOps** | Dashboard (incl. Portfolio Insights), Cost & Reliability, Pricing, Alert Rules | Manage model pricing and alert thresholds; sees the alert bell |

Portfolio Insights is deliberately hidden from Agent Manager — it's aggregate cost/reliability data that isn't relevant to someone logging daily progress. Route-level access is enforced in `frontend/src/persona/` (`RequirePersonaRoute`, `navConfig.js`, `permissions.js`); this one component-level exception lives directly in `DashboardPage.jsx`.

## Features

**Agent tracking**
- Dashboard — grid of agent cards (status, assignee, ETA, progress bar, and this month's calls/cost/error-rate at a glance), with a summary banner and health-based filtering
- Portfolio Insights — aggregate monthly calls/cost/error-rate across every agent, month-over-month trend, anomaly detection, and a computed summary (Executive + FinOps only)
- Add Agent — modal to create a new agent (name, description, assignee, status, ETA, progress)
- Agent Detail — metadata behind a sticky breadcrumb, single-agent update form, progress-over-time chart, and per-agent monthly insights (same figures shown on that agent's card)
- Daily Update Sheet — bulk editor to submit today's status/progress/notes for every agent at once (upserts, one entry per agent per day), sortable by agent name
- Update History — full history of updates across all agents

**FinOps (cost & reliability)**
- Cost & Reliability dashboard — usage/cost trend chart (with legend and labeled axes) and totals (calls, cost, failed calls) across all agents
- Usage ingestion API — single and batch endpoints for external apps to self-report token usage per call
- Automatic cost calculation from effective-dated model pricing (no cost re-pricing of historical calls after a price change)
- Alerts — auto-raised for expensive calls, high API/validation error rates, and usage on unpriced models; bell icon with live open-alert count
- Pricing Admin (`/finops/pricing`) — manage model pricing (input/output $ per 1k tokens), sortable/paginated history
- Alert Rules (`/finops/thresholds`) — configure cost/error-rate thresholds globally or per agent, sortable/paginated

**Cross-cutting**
- Insights — every "calls / cost / error rate" figure in the app (card, agent detail, portfolio) uses the same monthly window and the same computed-narrative logic, whether it's for one agent or all of them
- Toast notifications for every save (success and failure) instead of alerts that never dismiss
- Responsive nav — collapses to a hamburger menu below ~900px

## Tech Stack

**Frontend** — React 19, Vite, React Router, MUI (Material UI), TanStack React Query, Axios, react-hook-form, Recharts, date-fns, oxlint

**Backend** — Node.js, Express, Databricks SQL (Unity Catalog, Delta tables) via `@databricks/sql`, Zod (validation), cors, dotenv, nodemon, Anthropic SDK (optional — powers AI narrative generation when `ANTHROPIC_API_KEY` is set; the app falls back to a computed/template narrative otherwise, which is what's currently wired into the UI)

**Infra** — a Databricks SQL warehouse (external, configured via env vars — nothing to run locally for it), npm workspaces monorepo (`backend` + `frontend`). Postgres (via the included `docker-compose.yml`) is legacy: kept only as a rollback reference and as the source for the one-time cutover scripts — see `backend/README.md`.

## Steps to Run

**Prerequisites**: Node.js 20+, and access to a Databricks SQL warehouse (a personal access token with standard/full scope, plus `USE CATALOG`/`USE SCHEMA`/`CREATE TABLE`/`MODIFY`/`SELECT` on the target catalog+schema)

1. Copy env files and fill in your Databricks credentials:

   ```
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. Install dependencies (installs both `backend` and `frontend` workspaces):

   ```
   npm install
   ```

3. Run migrations and seed sample data:

   ```
   npm run migrate:databricks --workspace backend
   npm run seed:databricks --workspace backend
   ```

4. Start both apps:

   ```
   npm run dev
   ```

   - Backend: http://localhost:4000/api/health
   - Frontend: http://localhost:5174

## Deployment (Azure)

Live at https://agent-dashboard.ambitioussky-c28d301a.eastus.azurecontainerapps.io

The app ships as a single Docker image ([Dockerfile](Dockerfile)): Express serves both `/api` and the built React SPA from one origin, so there's no CORS or API-URL wiring. It runs on Azure Container Apps (subscription `Intuitive-AIOps-POC-1-MPN`, resource group `rg-agent-dashboard`, East US — same metro as the Databricks workspace in AWS us-east-1), scaling 0→1 replicas.

| Resource | Name |
|---|---|
| Container App | `agent-dashboard` |
| Container Apps environment | `cae-agent-dashboard` |
| Container Registry | `acragentdash8cb3e1` |
| Log Analytics | `log-agent-dashboard` |

Config lives on the Container App, not in the image: `DATABRICKS_*`, `CORS_ORIGIN` as env vars; `DATABRICKS_TOKEN`, `AUTH_PASSWORD`, `JWT_SECRET` as Container App secrets (`az containerapp secret set …`). Values must not have trailing whitespace — unlike `dotenv`, Azure doesn't trim them.

**Redeploy** the current working tree (needs Docker, `az login`, and `az extension add --name containerapp`):

```
./scripts/deploy-azure.sh
```

**Logs:** `az containerapp logs show -g rg-agent-dashboard -n agent-dashboard --follow`
