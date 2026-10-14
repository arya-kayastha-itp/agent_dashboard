const express = require('express');
const controller = require('../controllers/submissions.controller');
const { authenticate, requirePersona } = require('../middleware/auth');
const { PERSONAS } = require('../config/personas');
const { validateBody } = require('../middleware/validate');
const { submissionSchema, reviewSchema, bulkApproveSchema } = require('../validators/submission.schema');

const router = express.Router();

router.use(authenticate);

// Contributors propose updates for agents they're assigned to (checked in the
// service); the Agent Manager reviews them. The Agent Manager's own updates go
// straight through /api/updates instead.
router.get('/', requirePersona(PERSONAS.AGENT_MANAGER, PERSONAS.CONTRIBUTOR), controller.listSubmissions);
router.post('/', requirePersona(PERSONAS.CONTRIBUTOR), validateBody(submissionSchema), controller.createSubmission);
router.post('/approve', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(bulkApproveSchema), controller.approveSubmissions);
router.post('/:id/review', requirePersona(PERSONAS.AGENT_MANAGER), validateBody(reviewSchema), controller.reviewSubmission);

module.exports = router;
