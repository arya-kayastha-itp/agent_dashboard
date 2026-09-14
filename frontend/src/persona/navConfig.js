import { PERSONAS } from '../constants';

const { EXECUTIVE, AGENT_MANAGER, FINOPS } = PERSONAS;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', visibleTo: [EXECUTIVE, AGENT_MANAGER, FINOPS] },
  { label: 'Daily Update Sheet', path: '/daily-sheet', visibleTo: [AGENT_MANAGER] },
  { label: 'Cost & Reliability', path: '/finops', visibleTo: [FINOPS] },
  { label: 'Pricing', path: '/finops/pricing', visibleTo: [FINOPS] },
  { label: 'Alert Rules', path: '/finops/thresholds', visibleTo: [FINOPS] },
];

export const SHOW_ALERT_BELL = [FINOPS];

export function navItemFor(path) {
  return NAV_ITEMS.find((item) => item.path === path);
}
