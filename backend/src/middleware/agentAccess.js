const agentsService = require('../services/agents.service');
const { PERSONAS } = require('../config/personas');

// Contributors only see the agents they're assigned to. Anything else under
// /api/agents/:id answers 404, not 403, so the API doesn't even confirm the
// agent exists. Every other persona passes straight through.
async function requireAgentAccess(req, res, next) {
  if (req.user.persona !== PERSONAS.CONTRIBUTOR) return next();
  try {
    if (!(await agentsService.isAssigned(req.params.id, req.user.teamMemberId))) {
      return res.status(404).json({ error: { message: 'Agent not found', code: 'NOT_FOUND' } });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAgentAccess };
