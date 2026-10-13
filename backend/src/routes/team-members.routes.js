const express = require('express');
const controller = require('../controllers/team-members.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/personas');
const { validateBody } = require('../middleware/validate');
const { createTeamMemberSchema } = require('../validators/team-member.schema');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.listTeamMembers);
router.post('/', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(createTeamMemberSchema), controller.createTeamMember);
router.delete('/:id', requirePersona(PERSONAS.AGENT_MANAGER), controller.deleteTeamMember);

module.exports = router;
