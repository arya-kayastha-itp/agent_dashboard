const express = require('express');
const controller = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validate');
const { loginSchema } = require('../validators/auth.schema');

const router = express.Router();

router.post('/login', validateBody(loginSchema), controller.login);

module.exports = router;
