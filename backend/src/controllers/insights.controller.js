const insightsService = require('../services/insights.service');
const aiNarrativeService = require('../services/ai-narrative.service');

async function getPortfolioInsights(req, res, next) {
  try {
    const insights = await insightsService.getPortfolioInsights({ days: req.query.days });
    res.json(insights);
  } catch (err) {
    next(err);
  }
}

async function regeneratePortfolioNarrative(req, res, next) {
  try {
    const insights = await insightsService.getPortfolioInsights({});
    const text = await aiNarrativeService.generateNarrative(insights);
    res.json({ text, source: 'ai', model: 'claude-opus-5', generatedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
}

async function getAgentsInsightsSummary(req, res, next) {
  try {
    const summary = await insightsService.getAgentsInsightsSummary({ days: req.query.days });
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

module.exports = { getPortfolioInsights, regeneratePortfolioNarrative, getAgentsInsightsSummary };
