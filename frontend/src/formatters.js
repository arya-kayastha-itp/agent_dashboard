import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Shared number formatting — replaces the three different currency/percent
// conventions previously scattered across FinOpsPage, UsageCostChart, and
// PricingTable/ThresholdsTable (some with "$", some without, inconsistent decimals).

export function formatCurrency(value, { precision = 2 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision })}`;
}

export function formatPercent(value, { precision = 1 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(precision)}%`;
}

// An agent's assignees as one display string, e.g. "Puja Rachchh, Sumit Mishra".
export function formatAssignees(agent) {
  return (agent?.assignees || []).map((assignee) => assignee.name).join(', ');
}

// An agent's eta as the API sends it → the 'yyyy-MM-dd' an <input type="date"> takes.
export function toDateInputValue(eta) {
  if (!eta) return '';
  try {
    return format(new Date(eta), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

// A 'yyyy-MM-dd' day (how submission dates arrive) as e.g. "Oct 14, 2026".
// parseISO reads a bare date as local midnight, so it never shifts a day.
export function formatDay(day) {
  return day ? format(parseISO(day), 'PP') : '—';
}

export function formatTimeAgo(timestamp) {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

export function formatMinutes(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n)) return '—';
  if (n === 60) return '1 hour';
  if (n % 60 === 0) return `${n / 60} hours`;
  return `${n} minute${n === 1 ? '' : 's'}`;
}
