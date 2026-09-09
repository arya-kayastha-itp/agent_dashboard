const usageLogsService = require('./usage-logs.service');
const agentsService = require('./agents.service');

const LOOKBACK_DAYS_DEFAULT = 30;
const TREND_PERIOD_DAYS = 7;
// Don't flag anomalies without a few days of baseline to compare against —
// same rationale as MIN_CALLS_FOR_RATE_ALERT in usage-logs.service.js.
const ANOMALY_MIN_BASELINE_DAYS = 5;
const ANOMALY_STDDEV_MULTIPLIER = 2;
const MIN_CALLS_FOR_ERROR_RATE_ANOMALY = 5;

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeTotals(rows) {
  const totals = rows.reduce(
    (acc, row) => ({
      calls: acc.calls + row.calls,
      cost: acc.cost + Number(row.cost),
      tokens: acc.tokens + row.tokens,
      errors: acc.errors + row.errors,
    }),
    { calls: 0, cost: 0, tokens: 0, errors: 0 },
  );
  const errorRate = totals.calls > 0 ? round2((totals.errors / totals.calls) * 100) : 0;
  return { ...totals, cost: round2(totals.cost), errorRate };
}

function pctDelta(current, previous) {
  if (!previous) return current > 0 ? null : 0;
  return round2(((current - previous) / previous) * 100);
}

function computeTrend(rows) {
  const currentCutoff = daysAgo(TREND_PERIOD_DAYS);
  const previousCutoff = daysAgo(TREND_PERIOD_DAYS * 2);

  const currentRows = rows.filter((r) => new Date(r.day) >= currentCutoff);
  const previousRows = rows.filter((r) => new Date(r.day) >= previousCutoff && new Date(r.day) < currentCutoff);

  const currentTotals = computeTotals(currentRows);
  const previousTotals = computeTotals(previousRows);

  return {
    current: { periodDays: TREND_PERIOD_DAYS, calls: currentTotals.calls, cost: currentTotals.cost, errorRate: currentTotals.errorRate },
    previous: { periodDays: TREND_PERIOD_DAYS, calls: previousTotals.calls, cost: previousTotals.cost, errorRate: previousTotals.errorRate },
    deltas: {
      callsPct: pctDelta(currentTotals.calls, previousTotals.calls),
      costPct: pctDelta(currentTotals.cost, previousTotals.cost),
      errorRatePct: pctDelta(currentTotals.errorRate, previousTotals.errorRate),
    },
  };
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values, avg) {
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// Flags a day as anomalous when it's more than ANOMALY_STDDEV_MULTIPLIER
// standard deviations above the agent's own mean for the window — simplest
// deterministic "unusual spike vs recent baseline" rule, no ML involved.
function computeAnomalies(rows) {
  if (rows.length < ANOMALY_MIN_BASELINE_DAYS) return [];

  const anomalies = [];

  const costs = rows.map((r) => Number(r.cost));
  const costMean = mean(costs);
  const costStddev = stddev(costs, costMean);

  const errorRows = rows.filter((r) => r.calls >= MIN_CALLS_FOR_ERROR_RATE_ANOMALY);
  const errorRates = errorRows.map((r) => (r.errors / r.calls) * 100);
  const errorMean = errorRates.length ? mean(errorRates) : 0;
  const errorStddev = errorRates.length ? stddev(errorRates, errorMean) : 0;

  rows.forEach((row) => {
    const cost = Number(row.cost);
    if (costStddev > 0 && cost > costMean + ANOMALY_STDDEV_MULTIPLIER * costStddev) {
      anomalies.push({ day: row.day, metric: 'cost', value: round2(cost), baselineMean: round2(costMean), baselineStddev: round2(costStddev) });
    }
    if (row.calls >= MIN_CALLS_FOR_ERROR_RATE_ANOMALY && errorStddev > 0) {
      const rate = (row.errors / row.calls) * 100;
      if (rate > errorMean + ANOMALY_STDDEV_MULTIPLIER * errorStddev) {
        anomalies.push({ day: row.day, metric: 'errorRate', value: round2(rate), baselineMean: round2(errorMean), baselineStddev: round2(errorStddev) });
      }
    }
  });

  return anomalies.sort((a, b) => new Date(b.day) - new Date(a.day));
}

function formatDay(day) {
  return new Date(day).toISOString().slice(0, 10);
}

function buildTrendSentence(trend) {
  const { costPct } = trend.deltas;
  if (costPct === null) return 'cost data is too new to compare against the prior week';
  if (costPct === 0) return 'cost held flat versus the prior week';
  return `cost is ${costPct > 0 ? 'up' : 'down'} ${Math.abs(costPct)}% versus the prior week`;
}

function buildErrorSentence(stats) {
  if (stats.errorRate === 0) return 'No failed calls in this window';
  return `${stats.errorRate}% of calls failed in this window`;
}

function buildAnomalySentence(anomalies) {
  if (!anomalies.length) return 'No unusual spikes detected';
  const [latest] = anomalies;
  const metricLabel = latest.metric === 'cost' ? 'Cost' : 'Error rate';
  return `${metricLabel} spiked on ${formatDay(latest.day)}, well above its recent baseline`;
}

function buildTemplatedNarrative({ agent, stats, trend, anomalies }) {
  const sentences = [`${agent.name} is currently ${agent.currentStatus.toLowerCase()} at ${agent.currentProgress}%.`];

  if (stats.calls === 0) {
    sentences.push('No API usage has been logged yet for this agent.');
  } else {
    sentences.push(`Over the last ${LOOKBACK_DAYS_DEFAULT} days it made ${stats.calls} calls costing $${stats.cost.toFixed(2)}, and ${buildTrendSentence(trend)}.`);
    sentences.push(`${buildErrorSentence(stats)}.`);
    sentences.push(`${buildAnomalySentence(anomalies)}.`);
  }

  return sentences.join(' ');
}

async function getAgentInsights(agentId, { days } = {}) {
  const windowDays = Number(days) > 0 ? Number(days) : LOOKBACK_DAYS_DEFAULT;
  const agent = await agentsService.getAgentById(agentId);
  if (!agent) return null;

  const from = daysAgo(windowDays);
  const rows = await usageLogsService.getUsageSummary({ agentId, from });

  const stats = computeTotals(rows);
  const trend = computeTrend(rows);
  const anomalies = computeAnomalies(rows);
  const narrative = buildTemplatedNarrative({ agent, stats, trend, anomalies });

  return {
    agentId,
    windowDays,
    generatedAt: new Date().toISOString(),
    agentSnapshot: {
      currentStatus: agent.currentStatus,
      currentProgress: agent.currentProgress,
      eta: agent.eta,
      lastUpdateAt: agent.lastUpdateAt,
    },
    stats,
    trend,
    anomalies,
    narrative: { text: narrative, source: 'template' },
  };
}

module.exports = { getAgentInsights };
