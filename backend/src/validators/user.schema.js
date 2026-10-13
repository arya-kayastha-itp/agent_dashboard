const { z } = require('zod');
const { PERSONA_VALUES } = require('../config/personas');

const createUserSchema = z.object({
  teamMemberId: z.string().min(1),
  email: z.string().trim().email().max(320),
  role: z.enum(PERSONA_VALUES),
});

const updateUserSchema = z
  .object({
    role: z.enum(PERSONA_VALUES).optional(),
    status: z.enum(['active', 'deactivated']).optional(),
  })
  .refine((value) => value.role || value.status, { message: 'Provide a role or a status' });

module.exports = { createUserSchema, updateUserSchema };
