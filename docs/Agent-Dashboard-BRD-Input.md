# Agent Dashboard (AGD) — Business Requirements Input

Doc ID acronym: AGD
Project name: Agent Dashboard (AI Garage Agent Dashboard)
Decision audience: Leadership approving continued investment in the AI Garage agent program **[VP / Head of AI Garage — fill in]**. Tone: outcomes and risk, not implementation detail.

Items in **[brackets]** are placeholders to confirm before approval.

---

## 1. Problem Statement

Intuitive's AI Garage team is building many AI agents at once. They have different owners and run across Azure, AWS, GCP and laptops. There is no single, trusted place to see each agent's status, progress, target date and blockers, or what it costs and how reliably it runs.

- Executives cannot see portfolio health without asking people.
- The Agent Manager has to chase updates by hand.
- Contributors have no structured way to report progress.
- Date slips and blockers are noticed late.

Agent Dashboard solves this for the AI Garage leadership, the Agent Manager, FinOps and the agent builders.

## 2. Business Context

Agent Dashboard is an internal tool that tracks AI agent development workstreams and, through a FinOps module, the cost and reliability of those agents once they run.

- **Phase 1 (live):** agent tracking, daily updates, history charts, FinOps usage/cost/alerts and portfolio insights. It runs on Azure Container Apps with a Databricks SQL warehouse as the datastore.
- **Phase 2 (in progress):** moves from a shared-password, manager-edits-everything model to personal accounts, contributor self-service updates with Agent Manager review, ETA slip tracking, blocker escalation and an audit log (2a). Agents then report their own health and usage over HTTPS (2b).
- **Phase 3 (future):** weekly executive summary, Teams notifications, A2A test tasks, control features and Microsoft sign-in.

The project has no IT permissions available: no Entra app registration, no new mailbox and no DNS changes. Every design choice avoids needing them. Phase 2 is visibility only; control comes later.

## 3. Objectives

| # | Objective | How it is measured |
|---|---|---|
| O1 | One source of truth for all agents | 100% of active agents tracked with status, progress, owner and target date |
| O2 | Fresh data | Share of active agents with an approved update in the last 7 days **[confirm window and target, e.g. ≥ 90%]** |
| O3 | Accountable updates | Assignees send updates; only the Agent Manager's approval changes the dashboard. Share of updates reviewed within 2 business days **[confirm, e.g. ≥ 90%]** |
| O4 | Early warning on slips and blockers | 100% of blockers open 3+ days escalated automatically; every ETA change recorded with a reason |
| O5 | Cost and reliability visibility | Share of production agents reporting usage **[target]** |
| O6 | Live agent health (2b) | Offline agents detected within 15 minutes of the last heartbeat |

## 4. Stakeholders

| Stakeholder | Role / interest |
|---|---|
| Executive sponsor **[name]** | Approves investment; wants portfolio view |
| Agent Manager (Arya Kayastha) | Owner and sole reviewer today; runs the update process |
| Executives | View-only consumers of Dashboard and Portfolio Insights |
| FinOps (e.g. Nancy) | Manages model pricing and alert thresholds; watches cost |
| Agent builders / assignees | Send updates; report usage and health |
| Team leads | Future reviewers (reviewer is a permission, not a fixed role) |
| IT / Security | Not engaged; design avoids their approvals. Consulted if scope changes |

## 5. Target Users

- **Contributor:** sees only the agents they are assigned to (My Agents) and sends updates for review.
- **Agent Manager:** reviews updates, manages agents, people and access, and reads the audit log.
- **Executive:** read-only access to the Dashboard and Portfolio Insights.
- **FinOps:** cost and reliability, pricing and alert rules. Also acts as a contributor on any agents assigned to them (updates go to review).
- **Agents themselves (2b):** machine users that push health and usage data with their own API key.

Being assigned to an agent makes someone a contributor on it, whatever their role. Each person still has one role. Executives stay view-only even if assigned.

## 6. Scope

### 6.1 In Scope

- Agent register: create, edit and delete agents; assign owners; marketplace flag
- Dashboard with status, progress, ETA, health filters and monthly calls/cost/error rate
- Personal accounts: one-time invite links (48 h), password reset (1 h), lockout, role-based access
- Contributor updates with Agent Manager review: approve, edit then approve, request changes, not accept, bulk approve
- Daily Update Sheet, update history and progress trend chart
- Target date (ETA) history, slip badges, mandatory reason when a date moves later
- Mandatory blocker reason and unblocker; automatic escalation after 3 days of being blocked
- Audit log of every change to an agent
- FinOps: usage ingestion API, effective-dated model pricing, alerts and thresholds
- Portfolio Insights with month-over-month trend and anomaly detection
- Agent-to-dashboard connection (2b): per-agent API keys, HTTPS push, 5-minute heartbeat, offline alerts
- Unit tests, integration suites, CI and Azure deployment

### 6.2 Deferred Scope

| Item | Why it is not in this phase |
|---|---|
| Weekly executive summary email | Phase 3; needs 2a/2b data first |
| Microsoft Teams notifications | Phase 3; avoids new tenant permissions for now |
| A2A test tasks | Phase 3; Phase 2 is visibility only |
| Control features (start/stop agents) | Phase 3; visibility must be trusted first |
| Microsoft sign-in (SSO) | Needs an Entra app registration, which requires IT |
| Multi-role users / role switcher | One role per person is simpler; assignment already covers most needs |
| CI running integration tests | Decision not to store Databricks secrets in GitHub; run locally before each deploy |

### 6.3 Permanently Excluded

- Connecting directly to agents' own databases or infrastructure (agents push over HTTPS only)
- Storing agents' business data or prompts
- Replacing project-management tools (tasks, sprints)
- Executives editing data

## 7. Functional Requirements

M = Must have, S = Should have, C = Could have.

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Create, edit and delete agents with name, description, assignees, ETA, status and progress | M |
| FR-2 | Sign in with personal accounts via one-time invite links (48 h) and password reset links (1 h) | M |
| FR-3 | Role-based access (Contributor, Agent Manager, Executive, FinOps) enforced by the API | M |
| FR-4 | Contributors see and update only their assigned agents; other agents return 404 | M |
| FR-5 | Contributor updates go to review; only approval changes status and progress | M |
| FR-6 | Reviewer can approve, edit then approve, request changes or not accept; a comment is required for the last two and is shown to the assignee | M |
| FR-7 | Reviewer can approve several updates at once | S |
| FR-8 | Agent Manager's own updates apply directly and are credited to them | M |
| FR-9 | Moving an ETA later requires a reason; ETA history and a slip badge (e.g. "Slipped 3× · +24 days") are shown | M |
| FR-10 | Setting an agent to Blocked requires a reason and who or what can unblock it; blocked duration is shown | M |
| FR-11 | A blocker open 3+ days (configurable) triggers one email to Agent Managers, a dashboard highlight and an audit entry, once per block | M |
| FR-12 | Append-only audit log with before/after values, filterable by agent and person | M |
| FR-13 | Daily Update Sheet bulk editor (one entry per agent per day) | S |
| FR-14 | Progress history chart and full update history | S |
| FR-15 | Usage ingestion API (single and batch) with automatic cost calculation | M |
| FR-16 | Effective-dated model pricing; alerts for expensive calls, high error rates and unpriced models | M |
| FR-17 | Alert thresholds, global or per agent; alert bell with open-alert count | S |
| FR-18 | Portfolio Insights with month-over-month trend, anomaly detection and computed summary | S |
| FR-19 | Teams page to invite people, set roles and deactivate accounts (ends sessions immediately) | M |
| FR-20 | Agents push a heartbeat every 5 minutes with a per-agent API key; offline after 15 minutes (production only) | M (2b) |
| FR-21 | Offline alerts: at most two emails per outage (offline, then back online after 15 minutes stable) to assignees and Agent Manager | S (2b) |
| FR-22 | Copy-paste integration snippets in several languages | S (2b) |
| FR-23 | AI-written narrative via the Anthropic API when a key is set, with a computed fallback | C |

## 8. Constraints

- No IT help: no Entra app registration, no new mailbox, no DNS changes.
- Email only through Azure Communication Services on the Azure-managed domain; limit about 5 per minute and 10 per hour per subscription.
- Databricks Delta has no cross-statement transactions and no enforced foreign keys or uniqueness; the application handles both.
- Azure policy: new resources need a Practice tag, and an append policy sets CreatedMonth, so updates to existing resources fail unless that tag is current.
- Phase 2 is visibility only; no control actions on agents.
- Integration tests run only against the `agent-dashboard-test` schema, never the live schema.

## 9. Success Metrics

- Active agents tracked: 100%
- Active agents with an approved update in the last 7 days: **[target, e.g. ≥ 90%]**
- Updates reviewed within 2 business days: **[target, e.g. ≥ 90%]**
- Blockers over 3 days escalated: 100%
- Production agents reporting heartbeat and usage: **[target]**
- Time spent compiling status reports: reduced **[baseline needed]**
- Executive logins per month: **[baseline needed]**

## 10. Dependencies

- Databricks SQL warehouse, catalog, schema and access token
- Azure Container Apps, Container Registry, Log Analytics and Communication Services
- Docker (for image builds)
- Anthropic API key (optional)
- Agent builders adding the push snippet to their agents (2b)
- Completing the paused Phase 2a deploy: migrations 010–013 on the live schema, image rollout, environment variables, merge to main

## 11. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | Passwords stored as scrypt hashes (12+ characters); 5 failed sign-ins lock an account for 15 minutes; deactivation, role change or password reset ends sessions; per-agent API keys; rate limits; Zod input validation; no secrets in the repository |
| Access control | Enforced on the server, not only in the UI |
| Auditability | Append-only audit log that keeps agent and person names after they are removed |
| Availability | Minimum and maximum replicas of 1 once heartbeats are live, so offline detection is reliable |
| Performance | Dashboard loads in a few seconds; batched Databricks writes for ingestion |
| Data integrity | Application-level uniqueness (one update per agent per day via MERGE); partial-failure behaviour documented |
| Usability | Responsive down to mobile; dark and light themes; toast feedback on every save |
| Testability | Unit tests, lint and builds in CI; integration suites run before every deploy |
| Cost | Low run cost; about $0.00025 per email |
| Maintainability | Layered architecture (route, controller, service, db), plain JavaScript, documented |

## 12. Risks

| Risk | Mitigation |
|---|---|
| Databricks connection resets (ECONNRESET) and slow integration runs (~25 minutes) | Restart guidance; reconnect handling; run the suite before each deploy |
| Non-atomic writes can leave an agent's current values stale | Documented tradeoff; the next update corrects it |
| Single reviewer is a bottleneck | Reviewer is a permission; add team leads later |
| Email limits or deliverability on the Azure-managed domain | Copy-link fallback for invites; limit alert volume |
| Migration 013 backfills blocked-since, so long-blocked live agents are escalated on the first hourly check | Warn the Agent Manager before deploy |
| Azure tag policies break deployments | Update the CreatedMonth tag in the deploy script |
| Low adoption by contributors | Simple My Agents home; reminders in Phase 3 |
| Agent teams do not integrate with 2b | Multi-language snippets; make onboarding visible and easy |
| Token or key leakage | Container App secrets; per-agent keys that can be revoked |
| No SSO until IT approves | Accept local accounts for now |

## 13. Tech Stack Preferences

- Frontend: React 19, Vite, MUI, TanStack React Query, React Router, Recharts, react-hook-form
- Backend: Node.js 20, Express, plain JavaScript (no TypeScript), Zod
- Data: Databricks SQL (Unity Catalog, Delta tables) via `@databricks/sql`
- Hosting: Docker image on Azure Container Apps, Azure Container Registry, Log Analytics
- Email: Azure Communication Services
- Delivery: GitHub Actions CI, oxlint, npm workspaces monorepo
- Optional: Anthropic SDK for AI narrative

## 14. System Components

| Component | Responsibility |
|---|---|
| React SPA | Persona-based user interface |
| Express API | Routes, controllers, services, authentication, rate limiting |
| Accounts and auth service | Invites, sessions, roles, lockout |
| Submissions and review service | Contributor updates, approvals, comments |
| Rules, ETA and escalation service | Slip tracking and the hourly blocker check |
| Audit service | Append-only change log |
| FinOps services | Usage, pricing, alerts, thresholds, insights |
| Mailer | Sends email through Azure Communication Services |
| Agent ingestion API (2b) | API keys, heartbeat, offline detection |
| Databricks warehouse | System of record |
| Container App | Hosts the SPA and API from one image and one origin |

## 15. Data Flow Steps

1. A user opens the SPA and signs in with a personal account.
2. The SPA calls `/api/*` with a session token.
3. The API authenticates the user, checks role and agent assignment, and validates input with Zod.
4. A contributor submits an update, which is saved as pending and the agent shows "Pending review".
5. The Agent Manager reviews it: approve, edit then approve, request changes or not accept.
6. On approval, the update is recorded in history and the agent's current status and progress are refreshed.
7. Audit and ETA-history entries are written, and an email is sent if the update triggers one.
8. The SPA refetches and the dashboard reflects the approved values.
9. Agents push usage and heartbeats over HTTPS with their API key (2b).
10. The API calculates cost, evaluates alerts, writes to Databricks and sends alert emails.

## 16. Integrations

- Databricks SQL warehouse (datastore)
- Azure Communication Services (email)
- Anthropic API (optional)
- Agents pushing usage and heartbeats over HTTPS (2b)
- Future: Microsoft Teams and Microsoft sign-in (Phase 3)

## 17. Timeline Phases

| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Agent tracking, daily updates, FinOps, Azure deployment | Live |
| Phase 2a | Accounts, submit and review, My Agents, audit log, ETA slips, blocker escalation, tests and CI | Built and tested on the test schema; plan finalised 2026-10-13; live deploy paused |
| Phase 2a deploy | Migrations 010–013, email setup, rollout, merge to main | **[target date]** |
| Phase 2b | Per-agent API keys, HTTPS push, heartbeat, offline alerts, integration snippets | Planned **[dates]** |
| Phase 3 | Weekly executive summary, Teams notifications, A2A test tasks, control features, Microsoft sign-in | Future |

## 18. Open Questions

- Who becomes a reviewer besides the Agent Manager, and when?
- Which team owns onboarding agents to the 2b push integration?
- What baselines and targets should the success metrics use?
- Should the weekly executive summary come before 2b?
- When is an agent considered "production" and so expected to send heartbeats?
- What is the retention policy for audit, usage and heartbeat data?
- Will IT approve an Entra app registration for Microsoft sign-in in Phase 3?

## 19. Additional Section: Current Deployment Status

Phase 1 is live on Azure Container Apps. The Phase 2a deploy is paused partway through. Done: the Azure Communication Services resources and sender domain, the email connection secret and the resource tags. Remaining: migrations 010–013 on the live schema, image build and rollout, environment variables (`APP_URL`, `EMAIL_SENDER`, `ACS_CONNECTION_STRING`), removal of the old shared-password setting, creating the first account link, and merging to main. Integration tests are re-run on the test schema before resuming.
