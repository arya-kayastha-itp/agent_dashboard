# Agent Dashboard

Internal tool for tracking the status and progress of AI agent development workstreams, with a built-in FinOps module for monitoring API usage, cost, and reliability across those agents.

## Features

**Agent tracking**
- Dashboard — grid of agent cards (status, assignee, ETA, progress bar), with a summary banner and health-based filtering
- Add Agent — modal to create a new agent (name, description, assignee, status, ETA, progress)
- Agent Detail — metadata, single-agent update form, progress-over-time chart, and per-agent API usage/cost stats
- Daily Update Sheet — bulk editor to submit today's status/progress/notes for every agent at once (upserts, one entry per agent per day)
- Update History — full history of updates across all agents

**FinOps (cost & reliability)**
- Cost & Reliability dashboard — usage/cost trend chart and totals (calls, cost, failed calls) across all agents
- Usage ingestion API — single and batch endpoints for external apps to self-report token usage per call
- Automatic cost calculation from effective-dated model pricing (no cost re-pricing of historical calls after a price change)
- Alerts — auto-raised for expensive calls, high API/validation error rates, and usage on unpriced models; bell icon with live open-alert count
- Pricing Admin (`/finops/pricing`) — manage model pricing (input/output $ per 1k tokens) with full history
- Alert Rules (`/finops/thresholds`) — configure cost/error-rate thresholds globally or per agent

## Tech Stack

**Frontend** — React 19, Vite, React Router, MUI (Material UI), TanStack React Query, Axios, react-hook-form, Recharts, date-fns, oxlint

**Backend** — Node.js, Express, Knex (query builder/migrations), PostgreSQL, Zod (validation), cors, dotenv, nodemon

**Infra** — Docker Compose (PostgreSQL), npm workspaces monorepo (`backend` + `frontend`)

## Steps to Run

**Prerequisites**: Node.js 20+, and a PostgreSQL 13+ database (locally installed, or via Docker as below)

1. Start Postgres:

   ```
   docker compose up -d
   ```

2. Copy env files:

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
