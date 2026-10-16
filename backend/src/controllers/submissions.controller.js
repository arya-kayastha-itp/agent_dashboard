const submissionsService = require('../services/submissions.service');
const { PERSONAS } = require('../config/personas');
const { REVIEW_STATUSES } = require('../validators/submission.schema');

async function createSubmission(req, res, next) {
  try {
    res.status(201).json(await submissionsService.submitUpdate(req.validatedBody, req.user));
  } catch (err) {
    next(err);
  }
}

// ?status= one of REVIEW_STATUSES, ?agentId= one agent. Everyone but the
// Agent Manager only ever gets their own submissions back, whatever they ask for.
async function listSubmissions(req, res, next) {
  try {
    const { status, agentId } = req.query;
    if (status && !REVIEW_STATUSES.includes(status)) {
      return res.status(400).json({ error: { message: `Unknown status "${status}"`, code: 'VALIDATION_ERROR' } });
    }
    const allUsers = req.user.persona === PERSONAS.AGENT_MANAGER;
    return res.json(await submissionsService.listSubmissions({ reviewStatus: status, agentId }, req.user, { allUsers }));
  } catch (err) {
    return next(err);
  }
}

const CLOSING_DECISIONS = { request_changes: 'changes_requested', reject: 'rejected' };

async function reviewSubmission(req, res, next) {
  try {
    const { decision, comment, edits } = req.validatedBody;
    const result =
      decision === 'approve'
        ? await submissionsService.approveSubmission(req.params.id, { edits, comment }, req.user)
        : await submissionsService.closeSubmission(req.params.id, { decision: CLOSING_DECISIONS[decision], comment }, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function approveSubmissions(req, res, next) {
  try {
    res.json(await submissionsService.approveSubmissions(req.validatedBody.ids, req.user));
  } catch (err) {
    next(err);
  }
}

module.exports = { createSubmission, listSubmissions, reviewSubmission, approveSubmissions };
