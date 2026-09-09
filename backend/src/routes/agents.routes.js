const express = require('express');
const controller = require('../controllers/agents.controller');
const { validateBody } = require('../middleware/validate');
const { createAgentSchema, updateAgentSchema } = require('../validators/agent.schema');

const router = express.Router();

router.get('/', controller.listAgents);
router.get('/:id', controller.getAgent);
router.get('/:id/history', controller.getAgentHistory);
router.get('/:id/insights', controller.getAgentInsights);
router.post('/:id/insights/narrative', controller.regenerateAgentNarrative);
router.post('/', validateBody(createAgentSchema), controller.createAgent);
router.patch('/:id', validateBody(updateAgentSchema), controller.updateAgent);
router.delete('/:id', controller.deleteAgent);

module.exports = router;
