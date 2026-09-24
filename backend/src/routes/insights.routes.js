const express = require('express');
const controller = require('../controllers/insights.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/portfolio', controller.getPortfolioInsights);
router.post('/portfolio/narrative', controller.regeneratePortfolioNarrative);
router.get('/by-agent', controller.getAgentsInsightsSummary);

module.exports = router;
