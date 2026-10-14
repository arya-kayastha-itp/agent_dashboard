const express = require('express');
const controller = require('../controllers/team-members.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/personas');
const { validateBody } = require('../middleware/validate');
const { createTeamMemberSchema } = require('../validators/team-member.schema');

const router = express.Router();

// The roster lists everyone and which agents they're on, and only the Agent
// Manager's screens use it (Teams page, assignee picker).
router.use(authenticate, requirePersona(PERSONAS.AGENT_MANAGER));

router.get('/', controller.listTeamMembers);
router.post('/', validateBody(createTeamMemberSchema), controller.createTeamMember);
router.delete('/:id', controller.deleteTeamMember);

module.exports = router;
