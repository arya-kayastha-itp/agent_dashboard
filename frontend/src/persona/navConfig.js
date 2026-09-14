import { PERSONAS } from '../constants';

const { EXECUTIVE, AGENT_MANAGER, FINOPS } = PERSONAS;

// "Home" is one route for everyone, but not one component — App.jsx's
// HomePage renders a different composition per persona (queue / cost
// console / portfolio overview). Pricing and Alert Rules are flagged
// `configure: true` — occasional setup tasks, so App.jsx renders them in a
// secondary "Configure" menu instead of as equal-weight top-nav buttons.
export const NAV_ITEMS = [
  { label: 'Home', path: '/', visibleTo: [EXECUTIVE, AGENT_MANAGER, FINOPS] },
  { label: 'Daily Update Sheet', path: '/daily-sheet', visibleTo: [AGENT_MANAGER] },
  { label: 'Pricing', path: '/finops/pricing', visibleTo: [FINOPS], configure: true },
  { label: 'Alert Rules', path: '/finops/thresholds', visibleTo: [FINOPS], configure: true },
];

export const SHOW_ALERT_BELL = [FINOPS];

export function navItemFor(path) {
  return NAV_ITEMS.find((item) => item.path === path);
}
