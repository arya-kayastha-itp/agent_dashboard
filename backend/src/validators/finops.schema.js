const { z } = require('zod');

const ERROR_CATEGORIES = ['api_error', 'validation_error'];
const ALERT_TYPES = ['expensive_call', 'high_api_error_rate', 'high_validation_error_rate'];
const ALERT_STATUSES = ['open', 'acknowledged', 'resolved'];

const usageLogSchema = z
  .object({
    agentId: z.string().uuid(),
    requestId: z.string().max(100).optional().nullable(),
    endpoint: z.string().max(200).optional().nullable(),
    model: z.string().min(1).max(100),
    tokensInput: z.number().int().min(0).default(0),
    tokensOutput: z.number().int().min(0).default(0),
    status: z.enum(['success', 'error']),
    errorCategory: z.enum(ERROR_CATEGORIES).optional().nullable(),
    errorCode: z.string().max(200).optional().nullable(),
    latencyMs: z.number().int().min(0).optional().nullable(),
    source: z.string().max(50).optional(),
    occurredAt: z.coerce.date().optional(),
    rawMetadata: z.record(z.any()).optional().nullable(),
  })
  .refine((data) => data.status !== 'error' || Boolean(data.errorCategory), {
    message: 'errorCategory is required when status is "error"',
    path: ['errorCategory'],
  });

// Batch entries are validated one-by-one inside the service (not here) so one
// malformed entry doesn't reject the whole request — this only checks the envelope shape.
const batchEnvelopeSchema = z.object({
  entries: z.array(z.unknown()).min(1),
});

const createPricingSchema = z.object({
  model: z.string().min(1).max(100),
  inputPricePer1kTokens: z.number().positive(),
  outputPricePer1kTokens: z.number().positive(),
  effectiveFrom: z.coerce.date().optional(),
  createdBy: z.string().max(200).optional().nullable(),
});

const upsertThresholdSchema = z
  .object({
    agentId: z.string().uuid().optional().nullable(),
    alertType: z.enum(ALERT_TYPES),
    thresholdValue: z.number().positive(),
    windowMinutes: z.number().int().positive().optional().nullable(),
  })
  .refine((data) => data.alertType === 'expensive_call' || Boolean(data.windowMinutes), {
    message: 'windowMinutes is required for error-rate alert types',
    path: ['windowMinutes'],
  });

const alertPatchSchema = z.object({
  status: z.enum(['acknowledged', 'resolved']),
});

module.exports = {
  ERROR_CATEGORIES,
  ALERT_TYPES,
  ALERT_STATUSES,
  usageLogSchema,
  batchEnvelopeSchema,
  createPricingSchema,
  upsertThresholdSchema,
  alertPatchSchema,
};
