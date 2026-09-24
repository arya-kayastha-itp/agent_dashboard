const express = require('express');
const controller = require('../controllers/updates.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/authUsers');
const { validateBody } = require('../middleware/validate');
const { singleUpdateSchema, batchUpdateSchema } = require('../validators/update.schema');

const router = express.Router();

// Daily Update Sheet is Agent Manager-only in the frontend (navConfig.js) —
// enforced here too, not just hidden from the nav.
router.use(authenticate, requirePersona(PERSONAS.AGENT_MANAGER));

router.get('/today', controller.getToday);
router.get('/history', controller.getHistory);
router.post('/', validateBody(singleUpdateSchema), controller.createUpdate);
router.post('/batch', validateBody(batchUpdateSchema), controller.createBatch);

module.exports = router;
