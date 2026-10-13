const express = require('express');
const controller = require('../controllers/agents.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/personas');
const { validateBody } = require('../middleware/validate');
const { createAgentSchema, updateAgentSchema, reorderAgentsSchema } = require('../validators/agent.schema');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.listAgents);
router.get('/:id', controller.getAgent);
router.get('/:id/history', controller.getAgentHistory);
router.get('/:id/insights', controller.getAgentInsights);
router.post('/:id/insights/narrative', controller.regenerateAgentNarrative);
router.post('/', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(createAgentSchema), controller.createAgent);
router.patch('/reorder', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(reorderAgentsSchema), controller.reorderAgents);
router.patch('/:id', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(updateAgentSchema), controller.updateAgent);
router.delete('/:id', requirePersona(PERSONAS.AGENT_MANAGER), controller.deleteAgent);

module.exports = router;
