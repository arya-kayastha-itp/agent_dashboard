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

export function formatMinutes(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n)) return '—';
  if (n === 60) return '1 hour';
  if (n % 60 === 0) return `${n / 60} hours`;
  return `${n} minute${n === 1 ? '' : 's'}`;
}
