const express = require('express');
const controller = require('../controllers/agents.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { requireAgentAccess } = require('../middleware/agentAccess');
const { PERSONAS } = require('../config/personas');
const { validateBody } = require('../middleware/validate');
const { createAgentSchema, updateAgentSchema, reorderAgentsSchema } = require('../validators/agent.schema');

const router = express.Router();

router.use(authenticate);

// Contributors get only their assigned agents from the list (controller) and
// from every per-agent read (requireAgentAccess).
router.get('/', controller.listAgents);
router.get('/:id', requireAgentAccess, controller.getAgent);
router.get('/:id/history', requireAgentAccess, controller.getAgentHistory);
router.get('/:id/insights', requireAgentAccess, controller.getAgentInsights);
router.post('/:id/insights/narrative', requireAgentAccess, controller.regenerateAgentNarrative);
router.post('/', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(createAgentSchema), controller.createAgent);
router.patch('/reorder', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(reorderAgentsSchema), controller.reorderAgents);
router.patch('/:id', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(updateAgentSchema), controller.updateAgent);
router.delete('/:id', requirePersona(PERSONAS.AGENT_MANAGER), controller.deleteAgent);

module.exports = router;
