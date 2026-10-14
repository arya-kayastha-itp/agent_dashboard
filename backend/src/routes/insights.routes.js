const express = require('express');
const controller = require('../controllers/insights.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/personas');

const router = express.Router();

// Portfolio-wide figures cover every agent, so contributors (who only see
// their own agents) are kept out.
router.use(authenticate, requirePersona(PERSONAS.EXECUTIVE, PERSONAS.AGENT_MANAGER, PERSONAS.FINOPS));

router.get('/portfolio', controller.getPortfolioInsights);
router.post('/portfolio/narrative', controller.regeneratePortfolioNarrative);
router.get('/by-agent', controller.getAgentsInsightsSummary);

module.exports = router;
