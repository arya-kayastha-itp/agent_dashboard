const { z } = require('zod');
const { STATUS_VALUES, blockerFields } = require('./agent.schema');

const updateEntrySchema = z.object({
  agentId: z.string().uuid(),
  status: z.enum(STATUS_VALUES),
  progress: z.number().int().min(0).max(100),
  statusDescription: z.string().max(2000).optional().nullable(),
  ...blockerFields,
});

const singleUpdateSchema = updateEntrySchema.extend({
  updateDate: z.string().date().optional(),
});

const batchUpdateSchema = z.object({
  updateDate: z.string().date().optional(),
  entries: z.array(updateEntrySchema).min(1),
});

module.exports = { updateEntrySchema, singleUpdateSchema, batchUpdateSchema };
