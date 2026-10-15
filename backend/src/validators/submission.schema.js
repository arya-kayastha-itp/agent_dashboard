const { z } = require('zod');
const { STATUS_VALUES, blockerFields } = require('./agent.schema');

const REVIEW_STATUSES = ['pending', 'approved', 'changes_requested', 'rejected', 'superseded'];

// What a submission proposes. `eta` is a new target date, or null/absent for
// "no change"; `etaReason` is required (by the service) when it's later than
// the current one, and the blocker fields when the agent becomes Blocked.
const proposedValues = {
  status: z.enum(STATUS_VALUES),
  progress: z.number().int().min(0).max(100),
  statusDescription: z.string().max(2000).optional().nullable(),
  eta: z.string().date().optional().nullable(),
  etaReason: z.string().max(1000).optional().nullable(),
  ...blockerFields,
};

const submissionSchema = z.object({
  agentId: z.string().uuid(),
  ...proposedValues,
});

const reviewSchema = z
  .object({
    decision: z.enum(['approve', 'request_changes', 'reject']),
    comment: z.string().trim().max(2000).optional().nullable(),
    // Only for "approve": the reviewer's changes on top of what was proposed.
    // A later target date takes its reason from the submitter or the comment.
    edits: z.object(proposedValues).omit({ etaReason: true }).partial().optional(),
  })
  .refine((review) => review.decision === 'approve' || Boolean(review.comment), {
    message: 'Add a comment so the submitter knows what to change',
    path: ['comment'],
  });

const bulkApproveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

module.exports = { REVIEW_STATUSES, submissionSchema, reviewSchema, bulkApproveSchema };
