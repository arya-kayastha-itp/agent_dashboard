# Frontend

React 19 + Vite app for the Agent Dashboard. See the [root README](../README.md) for what the product does and how to run the whole stack; this doc is about how the frontend code itself is organized.

## Running just the frontend

```
npm run dev --workspace frontend
```

Vite serves on `http://localhost:5174` and proxies `/api/*` to the backend at `http://localhost:4000` (see `vite.config.js`). The backend needs to be running separately — from the repo root, `npm run dev` starts both.

`VITE_API_BASE_URL` (in `.env`, copied from `.env.example`) controls the API base path; it defaults to `/api`, which relies on the Vite proxy in dev.

## Structure

```
src/
├── App.jsx                # Top-level shell: AppBar/nav, routes, Add Agent FAB
├── main.jsx                # Provider stack (see below) + root render
├── theme.js                 # MUI theme — palette, typography, component overrides
├── constants.js              # Enums mirroring backend values (personas, statuses, alert types)
├── labels.js                 # Plain-language copy (kept separate from constants.js on purpose)
├── formatters.js              # formatCurrency / formatPercent / formatMinutes
├── healthLevel.js, agentHealth.js   # Client-side "is this agent healthy?" logic
├── api/                    # One file per backend resource — thin axios wrappers, nothing else
├── hooks/                   # React Query hooks (one per api/ file) + a few UI-only hooks
├── components/                # Reusable, mostly presentational
├── pages/                   # One per route, composed from components/ + hooks/
└── persona/                  # Persona context, route guard, nav visibility config, permissions
```

### Provider stack (`main.jsx`)

```
QueryClientProvider          — TanStack React Query
  ThemeProvider + CssBaseline  — MUI
    BrowserRouter
      PersonaProvider          — current persona, stored in localStorage
        ToastProvider          — app-wide success/error toasts (useToast())
          App
```

### Data fetching

Every backend resource has an `api/<resource>.api.js` (plain axios calls) and a `hooks/use<Resource>.js` (React Query wrapping those calls). Pages and components only ever import from `hooks/`, never `api/` directly — keep that boundary when adding a new resource. Mutations invalidate the relevant query key on success (see any `useCreate*`/`useUpdate*` hook for the pattern).

### Personas

`persona/PersonaContext.jsx` holds the current persona (no real auth — see the root README). `persona/navConfig.js` maps each nav item to the personas that can see it; `persona/RequirePersonaRoute.jsx` enforces that at the route level. `persona/permissions.js` holds the two fine-grained checks that aren't route-level (`canEditAgents`, `canAddAgent`). There's exactly one component-level (non-route) persona check in the app — hiding `PortfolioInsightsPanel` from Agent Manager in `pages/DashboardPage.jsx` — everything else is nav/route granularity.

### Notable shared components

- `ToastProvider.jsx` / `useToast()` — call `showToast(message, 'success' | 'error')` from anywhere; don't add another inline `<Alert>` for form feedback.
- `ErrorAlert.jsx` — error state with a built-in Retry button, wraps React Query's `refetch`.
- `ProgressSlider.jsx` — slider + numeric input pair, used everywhere progress is set (Add Agent, daily update, daily sheet rows).
- `hooks/useSortableData.js` — generic client-side table sort; pairs with MUI's `TablePagination` (see `PricingTable.jsx` for the full pattern).
- `hooks/usePageTitle.js` — sets `document.title` per page.

## Linting

```
npm run lint --workspace frontend
```

Runs `oxlint`. A few pre-existing warnings are expected (documented inline where they occur) — don't chase them down as part of an unrelated change.

## Build

```
npm run build --workspace frontend
```
