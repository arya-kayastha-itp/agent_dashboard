const express = require('express');
const controller = require('../controllers/finops.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/personas');
const { validateBody } = require('../middleware/validate');
const { usageLogSchema, batchEnvelopeSchema, createPricingSchema, upsertThresholdSchema, alertPatchSchema } = require('../validators/finops.schema');

const router = express.Router();

// Usage ingestion is called by running agents themselves, not by a logged-in
// dashboard user — no persona session to check here, so it stays open ahead
// of the authenticate() gate below.
router.post('/usage-logs', validateBody(usageLogSchema), controller.ingestUsageLog);
router.post('/usage-logs/batch', validateBody(batchEnvelopeSchema), controller.ingestUsageLogsBatch);

// Everything else here is FinOps-only dashboard UI (navConfig.js).
router.use(authenticate, requirePersona(PERSONAS.FINOPS));

router.get('/usage', controller.listUsage);
router.get('/usage/summary', controller.getUsageSummary);

router.get('/alerts', controller.listAlerts);
router.patch('/alerts/:id', validateBody(alertPatchSchema), controller.patchAlert);

router.get('/pricing', controller.listPricing);
router.post('/pricing', validateBody(createPricingSchema), controller.createPricing);

router.get('/thresholds', controller.listThresholds);
router.put('/thresholds', validateBody(upsertThresholdSchema), controller.upsertThreshold);

module.exports = router;
