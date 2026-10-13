const express = require('express');
const controller = require('../controllers/users.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/personas');
const { validateBody } = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/user.schema');

const router = express.Router();

// Accounts are managed from the Teams page, which is Agent Manager-only.
router.use(authenticate, requirePersona(PERSONAS.AGENT_MANAGER));

router.get('/', controller.listUsers);
router.post('/', validateBody(createUserSchema), controller.createUser);
router.post('/:id/link', controller.sendNewLink);
router.patch('/:id', validateBody(updateUserSchema), controller.updateUser);

module.exports = router;
