-- Updates proposed by an agent's assignees, waiting for (or past) the Agent
-- Manager's review. Nothing here touches the dashboard until a row is
-- approved -- approval writes the approved_* values into agent_updates and
-- the agent's current_* fields. Every submission and decision is kept.
--
-- review_status: pending -> approved | changes_requested | rejected, or
-- superseded (the same person sent a newer one, or another update for the
-- agent was approved). approved_* hold what was actually applied, which can
-- differ from what was proposed when the reviewer edits before approving.
-- eta is a proposed new target date, NULL meaning "no change".
CREATE TABLE IF NOT EXISTS update_submissions (
  id                           STRING NOT NULL,
  agent_id                     STRING NOT NULL,
  submitted_by                 STRING NOT NULL,
  submitted_at                 TIMESTAMP NOT NULL,
  update_date                  DATE NOT NULL,
  status                       STRING NOT NULL,
  progress                     SMALLINT NOT NULL,
  status_description           STRING,
  eta                          DATE,
  review_status                STRING NOT NULL,
  reviewed_by                  STRING,
  reviewed_at                  TIMESTAMP,
  review_comment               STRING,
  approved_status              STRING,
  approved_progress            SMALLINT,
  approved_status_description  STRING,
  approved_eta                 DATE,
  updated_at                   TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE update_submissions ADD CONSTRAINT pk_update_submissions PRIMARY KEY (id);

ALTER TABLE update_submissions ADD CONSTRAINT chk_update_submissions_status
  CHECK (status IN ('Not Started', 'In Progress', 'Blocked', 'Completed', 'On Hold'));

ALTER TABLE update_submissions ADD CONSTRAINT chk_update_submissions_progress
  CHECK (progress BETWEEN 0 AND 100);

ALTER TABLE update_submissions ADD CONSTRAINT chk_update_submissions_review_status
  CHECK (review_status IN ('pending', 'approved', 'changes_requested', 'rejected', 'superseded'));

ALTER TABLE update_submissions ADD CONSTRAINT chk_update_submissions_approved_status
  CHECK (approved_status IS NULL OR approved_status IN ('Not Started', 'In Progress', 'Blocked', 'Completed', 'On Hold'));

-- Informational only, not enforced.
ALTER TABLE update_submissions ADD CONSTRAINT fk_update_submissions_agent
  FOREIGN KEY (agent_id) REFERENCES agents (id) NOT ENFORCED;

ALTER TABLE update_submissions ADD CONSTRAINT fk_update_submissions_submitted_by
  FOREIGN KEY (submitted_by) REFERENCES users (id) NOT ENFORCED;

-- Who authored each day's history row: the Agent Manager for direct updates,
-- the assignee for an approved submission (submission_id points back to it).
-- NULL on rows from before accounts existed. Added without defaults, so
-- existing rows are left exactly as they are.
ALTER TABLE agent_updates ADD COLUMNS (recorded_by STRING, submission_id STRING);
