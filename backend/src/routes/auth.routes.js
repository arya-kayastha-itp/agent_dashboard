const express = require('express');
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { loginSchema, linkTokenSchema, setPasswordSchema, forgotPasswordSchema } = require('../validators/auth.schema');

const router = express.Router();

router.post('/login', validateBody(loginSchema), controller.login);
router.post('/link', validateBody(linkTokenSchema), controller.describeLink);
router.post('/set-password', validateBody(setPasswordSchema), controller.setPassword);
router.post('/forgot-password', validateBody(forgotPasswordSchema), controller.forgotPassword);
router.get('/me', authenticate, controller.me);

module.exports = router;
