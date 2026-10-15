const { z } = require('zod');

const STATUS_VALUES = ['Not Started', 'In Progress', 'Blocked', 'Completed', 'On Hold'];

// Required (by the services) when an agent becomes Blocked.
const blockerFields = {
  blockerReason: z.string().max(1000).optional().nullable(),
  blockedBy: z.string().max(300).optional().nullable(),
};

const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
  marketplaceDeployment: z.boolean().default(false),
  eta: z.string().date().optional().nullable(),
  status: z.enum(STATUS_VALUES).default('Not Started'),
  progress: z.number().int().min(0).max(100).default(0),
  statusDescription: z.string().max(2000).optional().nullable(),
  ...blockerFields,
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
  marketplaceDeployment: z.boolean().optional(),
  eta: z.string().date().optional().nullable(),
  // Required (by the service) when eta moves later.
  etaChangeReason: z.string().max(1000).optional().nullable(),
});

const reorderAgentsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

module.exports = { STATUS_VALUES, blockerFields, createAgentSchema, updateAgentSchema, reorderAgentsSchema };
