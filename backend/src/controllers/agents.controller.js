const agentsService = require('../services/agents.service');
const updatesService = require('../services/updates.service');

async function listAgents(req, res, next) {
  try {
    const { status } = req.query;
    const agents = await agentsService.listAgents({ status });
    res.json(agents);
  } catch (err) {
    next(err);
  }
}

async function getAgent(req, res, next) {
  try {
    const agent = await agentsService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: { message: 'Agent not found', code: 'NOT_FOUND' } });
    }
    return res.json(agent);
  } catch (err) {
    return next(err);
  }
}

async function createAgent(req, res, next) {
  try {
    const agent = await agentsService.createAgent(req.validatedBody);
    res.status(201).json(agent);
  } catch (err) {
    next(err);
  }
}

async function updateAgent(req, res, next) {
  try {
    const agent = await agentsService.updateAgentMetadata(req.params.id, req.validatedBody);
    if (!agent) {
      return res.status(404).json({ error: { message: 'Agent not found', code: 'NOT_FOUND' } });
    }
    return res.json(agent);
  } catch (err) {
    return next(err);
  }
}

async function deleteAgent(req, res, next) {
  try {
    const deleted = await agentsService.deleteAgent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: { message: 'Agent not found', code: 'NOT_FOUND' } });
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function getAgentHistory(req, res, next) {
  try {
    const { from, to } = req.query;
    const history = await updatesService.getAgentHistory(req.params.id, { from, to });
    res.json(history);
  } catch (err) {
    next(err);
  }
}

module.exports = { listAgents, getAgent, createAgent, updateAgent, deleteAgent, getAgentHistory };
