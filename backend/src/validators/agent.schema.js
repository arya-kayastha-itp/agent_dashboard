const { z } = require('zod');

const STATUS_VALUES = ['Not Started', 'In Progress', 'Blocked', 'Completed', 'On Hold'];

const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  assignedTo: z.string().max(200).optional().nullable(),
  eta: z.string().date().optional().nullable(),
  status: z.enum(STATUS_VALUES).default('Not Started'),
  progress: z.number().int().min(0).max(100).default(0),
  statusDescription: z.string().max(2000).optional().nullable(),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  assignedTo: z.string().max(200).optional().nullable(),
  eta: z.string().date().optional().nullable(),
});

const reorderAgentsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

module.exports = { STATUS_VALUES, createAgentSchema, updateAgentSchema, reorderAgentsSchema };
