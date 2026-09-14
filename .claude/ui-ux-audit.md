# Agent Dashboard — UI/UX Interface Audit

**Scope:** frontend UI only (React + MUI). Persona-based access control is already handled separately and is out of scope here.
**Reviewed for:** Arya (Agent Manager), Nancy (FinOps), Executive/Manager viewer
**Date:** September 2026
**Live version (better for reading/sharing):** https://claude.ai/code/artifact/c173a009-21a5-4ac3-a5cc-cebcce9a2cb2

---

## Executive summary

25 concrete issues found across 6 categories. None are architectural — the MUI + theme foundation
(`frontend/src/theme.js`) is sound, no ad-hoc inline styles, consistent spacing units — so this is fixable
without a rebuild. The two **Critical** items involve silent data failure and keyboard accessibility, the
kind of gap that looks fine in a demo and causes real support tickets once Arya and Nancy are using this daily.

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 9 |
| Medium | 9 |
| Low | 5 |

**If you fix five things first:**
1. Give the pricing & threshold forms real success/error feedback — right now a failed save is invisible.
2. Make the custom expand-row and health-chip filters keyboard-operable.
3. Show which nav item is active, and let the top bar collapse instead of overflow on narrow windows.
4. Label the FinOps chart's two axes and add a legend — a dual-axis chart with no key isn't exec-readable.
5. Give the Dashboard home page an actual chart — right now the page a Manager opens to "see how things
   are going" has zero visualizations.

---

## Navigation & wayfinding (5 findings)

- **[High] No active-page indicator in the top nav** — nav buttons are plain links, no comparison against
  the current route. *(`App.jsx:61-65`)*
- **[High] Top nav has no wrap or collapse behavior** — up to 5 nav buttons + alert bell + persona chip in
  one `Stack`, no `flexWrap`, no `useMediaQuery` anywhere in the codebase. Overflows on narrower windows.
  *(`App.jsx:60`)*
- **[Medium] No breadcrumbs on nested pages** — Agent Detail is two levels deep; only a plain text "back"
  button that scrolls out of view. *(`AgentDetailPage.jsx:36-38`)*
- **[Medium] Persona switcher has low discoverability** — the closest thing to "sign out" is a small
  outlined chip in the toolbar corner. *(`App.jsx:42-45`)*
- **[Medium] Alert bell always routes to `/finops`** regardless of which agent/issue triggered it, even
  though each alert carries `agentName`. *(`AlertBell.jsx:46-49, 65-68`)*

## Visual hierarchy & branding (6 findings)

- **[Medium] Every surface has identical visual weight** — all Cards are flat-outlined with zero elevation,
  so the dashboard summary banner reads the same as a routine form panel. *(`theme.js:26`,
  `DashboardSummaryBanner.jsx:24`)*
- **[Low] Corner radius is inconsistent** — 12px default shape, 16px on Cards, 10px on Buttons.
  *(`theme.js:10-11, 24-25, 49-51`)*
- **[Medium] Content capped well short of full width on large monitors** — `Container maxWidth="lg"` wraps
  the whole app, including FinOps charts. *(`App.jsx:77`)*
- **[Low] The one brand mark never appears inside the product** — favicon is a distinct gradient mark, but
  the AppBar shows plain text only. *(`public/favicon.svg`, `App.jsx:57-59`)*
- **[Low] Browser tab title never changes** — static "Agent Dashboard" on every route. *(`index.html:7`)*
- **[Low] No dark mode** — only a light palette defined. *(`theme.js`)*

## Data visualization (4 findings)

- **[High] The Dashboard home page has zero charts** — the page the Manager persona opens specifically to
  check progress is entirely cards/chips. *(`DashboardPage.jsx`)*
- **[High] Dual-axis chart has no legend and no axis labels** — cost (left axis) vs. calls (right axis),
  nothing on the chart says which is which. *(`UsageCostChart.jsx:16-24`)*
- **[Medium] Y-axis values are unlabeled** — no "%" on the progress chart, no axis title on the cost chart.
  *(`HistoryChart.jsx:14`, `UsageCostChart.jsx:19-20`)*
- **[Low] `Legend.jsx` is a status-color key, not a chart legend** — naming collision with the missing
  chart legends above. *(`Legend.jsx`)*

## Accessibility (4 findings)

- **[Critical] The expandable update row can't be operated by keyboard** — plain `<Box onClick>`, no
  `role`, `tabIndex`, key handler, or `aria-expanded`; a real `IconButton` is nested inside it relying on
  click-bubbling. *(`UpdateStoryRow.jsx:20-23, 37-39`)*
- **[Critical] Health-chip filters on the dashboard are mouse-only** — bare `<span onClick>` wrappers, no
  button role, no focus state, no keyboard handler. *(`DashboardSummaryBanner.jsx:31, 36, 41`)*
- **[Medium] Charts have no text alternative** — hover-only tooltips, nothing for screen readers.
  *(`HistoryChart.jsx`, `UsageCostChart.jsx`)*
- **[Low] `aria-*` used in only ~4 of 30 components** — fine where MUI icon buttons are used directly; the
  gap is specifically the two custom clickable elements above.

## Responsiveness (3 findings)

- **[Medium] Admin tables aren't wrapped for horizontal scroll** — Pricing/Thresholds tables render
  directly in a `Paper`, no `TableContainer`, unlike the Daily Sheet table which does wrap.
  *(`PricingAdminPage.jsx:30-44`, `ThresholdsAdminPage.jsx:31-46`)*
- **[Medium] Floating "Add Agent" button can sit on top of page content** — no collision handling with
  on-page Save/Submit buttons. *(`App.jsx:88-98`)*
- **[Low] Daily Sheet row controls have a hard minimum width** — fixed `minWidth` per cell (180/160/220px),
  no stacked fallback. *(`DailySheetRow.jsx:27-58`)*

## Tables & forms (3 findings)

- **[High] No sorting, filtering, or pagination anywhere** — works today because datasets are small, not
  because it scales. *(`PricingTable.jsx`, `ThresholdsTable.jsx`, `DailyUpdateSheetPage.jsx:86-110`)*
- **[Medium] Sliders have no numeric entry fallback** — drag-only, no adjacent number field.
  *(`AgentForm.jsx:72-85`, `AgentUpdateForm.jsx:58-65`, `DailySheetRow.jsx:40-47`)*
- **[Medium] Validation only covers "required," not range errors** — a `min: 0` violation just shows a red
  outline, no helper text. *(`AddPricingForm.jsx:45, 54`)*

## Feedback states (4 findings)

- **[Critical] Two forms give no feedback at all on save** — pricing/threshold "add" forms just reset;
  no success message, no error handling if the save fails. This is Nancy's FinOps config data — a silent
  failure means she believes a rule is active when it isn't. *(`AddPricingForm.jsx:18-26`,
  `ThresholdForm.jsx:33-41`)*
- **[High] Success messages never auto-dismiss** — persistent inline `Alert`, no Snackbar/toast system
  anywhere in the app. *(`AgentUpdateForm.jsx:40`, `DailyUpdateSheetPage.jsx:84`)*
- **[High] Errors have no retry action** — generic error alert, only recourse is a manual page refresh.
  *(`DashboardPage.jsx`, `FinOpsPage.jsx`, `PricingAdminPage.jsx`, `ThresholdsAdminPage.jsx`)*
- **[Medium] No skeleton loaders** — every panel pops in after a spinner rather than preserving layout.
  *(`DashboardPage.jsx:25-30`, `FinOpsPage.jsx:37-42`, `InsightsPanel.jsx:73-78`)*

---

## Fix roadmap

### Quick wins (hours, not days) — feasible to build right now
All frontend-only, no backend changes, no new design assets, no cross-team decisions needed.
**Status: done, verified in a running instance (build + lint clean, keyboard/retry behavior tested with Playwright).**
- [x] Active nav-item highlighting (`App.jsx`)
- [x] Keyboard support + `role`/`aria-expanded` on the expand row and health-chip filters
      (`UpdateStoryRow.jsx`, `HealthChip.jsx`, `DashboardSummaryBanner.jsx`) — closes both Critical
      accessibility findings
- [x] Legend + axis labels on both charts (`HistoryChart.jsx`, `UsageCostChart.jsx`)
- [x] Wrap the two admin tables in `TableContainer` (`PricingTable.jsx`, `ThresholdsTable.jsx`)
- [x] Retry button on error alerts, new shared `ErrorAlert.jsx` (React Query's `refetch`) — applied across
      Dashboard, FinOps, Pricing, Thresholds, Agent Detail, Daily Sheet
- [x] Per-page document titles, new `usePageTitle.js` hook — applied to all 7 pages
- [x] Logo mark in the app bar (existing favicon asset)
- [x] Removed unused `icons.svg`

### Medium effort (1-3 days)
- Error + success handling on the pricing and threshold forms
- Toast/Snackbar system replacing persistent inline alerts
- Sorting + pagination on all three tables
- Responsive nav collapse below ~900px
- Breadcrumb trail on Agent Detail
- Numeric input alongside each slider
- Give the summary banner visual weight (tint or elevation) distinct from routine panels

### Larger investment (design-system level)
- Add a rollup chart to the Dashboard home page (may need a new backend aggregate endpoint — check with
  backend owner before scoping)
- Unify border-radius and elevation into a documented scale
- Skeleton loaders in place of spinners
- Full-width layout tuned for large monitors
- Dark mode
