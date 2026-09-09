const usageLogsService = require('../services/usage-logs.service');
const pricingService = require('../services/pricing.service');
const thresholdsService = require('../services/thresholds.service');
const alertsService = require('../services/alerts.service');

async function ingestUsageLog(req, res, next) {
  try {
    const log = await usageLogsService.ingestUsageLog(req.validatedBody);
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
}

async function ingestUsageLogsBatch(req, res, next) {
  try {
    const results = await usageLogsService.ingestBatch(req.validatedBody.entries);
    const hasFailures = results.some((r) => !r.success);
    res.status(hasFailures ? 207 : 201).json({ results });
  } catch (err) {
    next(err);
  }
}

async function listUsage(req, res, next) {
  try {
    const { agentId, from, to, status } = req.query;
    const rows = await usageLogsService.listUsage({ agentId, from, to, status });
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getUsageSummary(req, res, next) {
  try {
    const { agentId, from, to } = req.query;
    const rows = await usageLogsService.getUsageSummary({ agentId, from, to });
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function listAlerts(req, res, next) {
  try {
    const { status } = req.query;
    const rows = await alertsService.listAlerts({ status });
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function patchAlert(req, res, next) {
  try {
    const alert = await alertsService.updateAlertStatus(req.params.id, req.validatedBody.status);
    if (!alert) {
      return res.status(404).json({ error: { message: 'Alert not found', code: 'NOT_FOUND' } });
    }
    return res.json(alert);
  } catch (err) {
    return next(err);
  }
}

async function listPricing(req, res, next) {
  try {
    const rows = await pricingService.listPricing();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function createPricing(req, res, next) {
  try {
    const row = await pricingService.createPricing(req.validatedBody);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

async function listThresholds(req, res, next) {
  try {
    const rows = await thresholdsService.listThresholds();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function upsertThreshold(req, res, next) {
  try {
    const row = await thresholdsService.upsertThreshold(req.validatedBody);
    res.status(200).json(row);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ingestUsageLog,
  ingestUsageLogsBatch,
  listUsage,
  getUsageSummary,
  listAlerts,
  patchAlert,
  listPricing,
  createPricing,
  listThresholds,
  upsertThreshold,
};
