const express = require('express');
const controller = require('../controllers/finops.controller');
const { validateBody } = require('../middleware/validate');
const { usageLogSchema, batchEnvelopeSchema, createPricingSchema, upsertThresholdSchema, alertPatchSchema } = require('../validators/finops.schema');

const router = express.Router();

router.post('/usage-logs', validateBody(usageLogSchema), controller.ingestUsageLog);
router.post('/usage-logs/batch', validateBody(batchEnvelopeSchema), controller.ingestUsageLogsBatch);
router.get('/usage', controller.listUsage);
router.get('/usage/summary', controller.getUsageSummary);

router.get('/alerts', controller.listAlerts);
router.patch('/alerts/:id', validateBody(alertPatchSchema), controller.patchAlert);

router.get('/pricing', controller.listPricing);
router.post('/pricing', validateBody(createPricingSchema), controller.createPricing);

router.get('/thresholds', controller.listThresholds);
router.put('/thresholds', validateBody(upsertThresholdSchema), controller.upsertThreshold);

module.exports = router;
