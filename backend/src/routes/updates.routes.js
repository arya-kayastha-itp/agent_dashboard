const express = require('express');
const controller = require('../controllers/updates.controller');
const { validateBody } = require('../middleware/validate');
const { singleUpdateSchema, batchUpdateSchema } = require('../validators/update.schema');

const router = express.Router();

router.get('/today', controller.getToday);
router.get('/history', controller.getHistory);
router.post('/', validateBody(singleUpdateSchema), controller.createUpdate);
router.post('/batch', validateBody(batchUpdateSchema), controller.createBatch);

module.exports = router;
