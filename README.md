# Agent Dashboard

Internal tool for tracking the status and progress of AI agent development workstreams, with a built-in FinOps module for monitoring API usage, cost, and reliability across those agents. Access is split across four personas — Contributor, Agent Manager, Executive, and FinOps — each seeing a different slice of the same data.

See also: [frontend/README.md](frontend/README.md) for the React app's structure, [backend/README.md](backend/README.md) for the API's structure, and [.claude/ui-ux-audit.md](.claude/ui-ux-audit.md) for the UI/UX review this app has been through.

## Accounts and personas

Everyone signs in with their own account. The Agent Manager invites people from the **Teams** page (email + role); each invite is a one-time link, valid for 48 hours, that's emailed when email is configured and can always be copied from the Teams page to send another way. The person opens it, sets a password (12+ characters, stored as a scrypt hash) and is signed in. "Forgot password" on the sign-in page sends a one-hour reset link.

Five failed sign-ins lock an account for 15 minutes. Deactivating someone, changing their role, or a password reset ends their existing sessions immediately. An account's role is its persona:

| Persona | Can see | Can do |
|---|---|---|
| **Contributor** | My Agents — only the agents they're assigned to (enforced by the API: other agents answer 404, and portfolio insights and the team roster are closed to them) | Send updates for those agents, for the Agent Manager to review |
| **Executive** | Dashboard (incl. Portfolio Insights) | View-only |
| **Agent Manager** | Dashboard (no Portfolio Insights), Review, Daily Update Sheet, Teams, Audit log | Review contributors' updates, add agents, edit agent metadata, log daily updates directly, invite people and manage their access |

## Updates and review

An agent's assignees send updates (status, progress, notes, and optionally a new target date) from their My Agents home or the agent's page. Nothing on the dashboard changes until the Agent Manager approves on the **Review** page, where each update is shown next to the agent's current values. The reviewer can approve, edit before approving, ask for changes, or not accept — the last two need a comment, which the assignee sees on the agent's page. Several updates can be approved at once.

- While an update waits, the agent shows a "Pending review" badge and keeps its last approved values.
- Sending a new update replaces your own earlier pending one. Approving one update for an agent closes any older pending ones for it.
- An approved update becomes the history entry for the day it was sent, credited to the person who sent it. An old update approved late is recorded in history but never rolls the agent's current status back.
- The Agent Manager's own updates (Daily Update Sheet, quick update, agent page) apply straight away, as before, and are now credited to them.

## Target date slips and blockers

- **Target date (ETA) history.** Every change to an agent's target date — from Edit Agent Details or an approved update — is recorded with the old and new date, who, when and why, and listed on the agent's page. Moving a date *later* needs a reason (for a contributor's update, theirs; if the reviewer pushes it later, their comment). An agent whose date has moved later more than once shows a "Slipped 3× · +24 days" badge (total delay = today's date vs the first one on record).
- **Blockers.** Setting an agent to Blocked — anywhere: Daily Update Sheet, quick update, agent page, Add Agent, a contributor's update, or the reviewer's edits — needs why it's blocked and who or what can unblock it. The dashboard shows how long it's been blocked and what it's waiting on; unblocking clears it.
- **Escalation.** An hourly check finds agents blocked for `BLOCKER_ESCALATION_DAYS` (default 3) or more and, once per block, emails every active Agent Manager, highlights them at the top of the Executive's Home, and logs it in the audit log. `ESCALATION_CHECKS=off` turns the check off (it runs only in the server process).

## Audit log

The **Audit log** page (Agent Manager) lists every change to an agent, newest first: agents created, edited (name, description, target date, marketplace flag, assignees) and deleted; direct updates; and every submission and review decision — each with who did it, when, and the before → after values. Filter by agent or by person (a person filter shows what they did *and* reviews of their updates). Each agent's page shows its latest activity with a link to its full log. Entries are never edited or deleted, and keep the agent's and people's names even after they're removed. The log starts when migration `012` runs; earlier changes aren't backfilled.
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

   Migration `010_create_users.sql` creates invited accounts for the three original users. To sign in the first time, print a set-password link (it points at `APP_URL`):

   ```
   npm run users:link --workspace backend -- arya.kayastha@intuitive.ai
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

Config lives on the Container App, not in the image: `DATABRICKS_*`, `CORS_ORIGIN`, `APP_URL` (the live URL above — invite links point at it) and `EMAIL_SENDER` as env vars; `DATABRICKS_TOKEN`, `JWT_SECRET` and `ACS_CONNECTION_STRING` as Container App secrets (`az containerapp secret set …`). The two email settings are optional — without them invites are copy-link only. Values must not have trailing whitespace — unlike `dotenv`, Azure doesn't trim them.

**Redeploy** the current working tree (needs Docker, `az login`, and `az extension add --name containerapp`):

```
./scripts/deploy-azure.sh
```

**Logs:** `az containerapp logs show -g rg-agent-dashboard -n agent-dashboard --follow`
