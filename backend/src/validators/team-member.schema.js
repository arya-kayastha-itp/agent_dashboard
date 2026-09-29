const { z } = require('zod');

const createTeamMemberSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

module.exports = { createTeamMemberSchema };
