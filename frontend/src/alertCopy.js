import { formatCurrency, formatMinutes, formatPercent } from './formatters';
import { ALERT_TYPE_EXPLAINERS } from './labels';

function formatWindowPhrase(windowMinutes) {
  if (windowMinutes === 60) return 'the last hour';
  return `the last ${formatMinutes(windowMinutes)}`;
}

// Turns alertType + details (both stable API fields) into an impact-first
// sentence. details is nullable jsonb on the backend, so every branch falls
// through to the raw backend message rather than ever rendering "undefined".
export function getAlertHeadline(alert) {
  const { alertType, details } = alert;
  const d = details || {};

  if (alertType === 'expensive_call' && d.costUsd != null && d.thresholdValue != null) {
    return `A call cost ${formatCurrency(d.costUsd)} — well above the ${formatCurrency(d.thresholdValue)} limit for this project.`;
  }

  if (alertType === 'unpriced_usage' && d.model) {
    return `Some recent calls can't be priced yet — no cost is set up for "${d.model}".`;
  }

  if (alertType === 'high_api_error_rate' && d.rate != null) {
    const countSuffix = d.totalCalls != null && d.errorCalls != null ? ` (${d.errorCalls} of ${d.totalCalls})` : '';
    return `${formatPercent(d.rate, { precision: 0 })} of calls failed in ${formatWindowPhrase(d.windowMinutes)}${countSuffix} — more than expected.`;
  }

  if (alertType === 'high_validation_error_rate' && d.rate != null) {
    return `${formatPercent(d.rate, { precision: 0 })} of requests were rejected as invalid in ${formatWindowPhrase(d.windowMinutes)} — worth checking the integration.`;
  }

  return alert.message || 'Something needs your attention.';
}

export function getAlertExplainer(alertType) {
  return ALERT_TYPE_EXPLAINERS[alertType] || null;
}
