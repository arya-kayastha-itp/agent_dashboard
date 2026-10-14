const express = require('express');
const auditService = require('../services/audit.service');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/personas');

const router = express.Router();

router.use(authenticate, requirePersona(PERSONAS.AGENT_MANAGER));

// GET /api/audit?agentId=&personId=&cursor=&limit= — newest first. Pass the
// response's nextCursor back as ?cursor= for the next page (null = no more).
router.get('/', async (req, res, next) => {
  try {
    const { agentId, personId, cursor, limit } = req.query;
    res.json(await auditService.listEvents({ agentId, personId, cursor, limit }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
