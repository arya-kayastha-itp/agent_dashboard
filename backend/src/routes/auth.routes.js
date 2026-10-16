const express = require('express');
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { limits } = require('../middleware/rateLimit');
const { validateBody } = require('../middleware/validate');
const { loginSchema, linkTokenSchema, setPasswordSchema, forgotPasswordSchema } = require('../validators/auth.schema');

const router = express.Router();

// Everything but /me is reachable signed out, so each is rate-limited per IP.
const passwordLinks = limits.passwordLinks();

router.post('/login', limits.signIn(), validateBody(loginSchema), controller.login);
router.post('/link', passwordLinks, validateBody(linkTokenSchema), controller.describeLink);
router.post('/set-password', passwordLinks, validateBody(setPasswordSchema), controller.setPassword);
router.post('/forgot-password', limits.forgotPassword(), validateBody(forgotPasswordSchema), controller.forgotPassword);
router.get('/me', authenticate, controller.me);

module.exports = router;
