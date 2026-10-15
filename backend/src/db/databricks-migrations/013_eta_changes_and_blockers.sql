-- Target-date history: one row per change to an agent's eta, from an edit
-- of the agent's details or an approved update. A change to a later date
-- than before is a "slip", and needs a reason (checked in application code).
CREATE TABLE IF NOT EXISTS eta_changes (
  id               STRING NOT NULL,
  agent_id         STRING NOT NULL,
  from_eta         DATE,
  to_eta           DATE,
  reason           STRING,
  changed_by       STRING,
  changed_by_name  STRING,
  source           STRING NOT NULL,
  submission_id    STRING,
  changed_at       TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE eta_changes ADD CONSTRAINT pk_eta_changes PRIMARY KEY (id);

ALTER TABLE eta_changes ADD CONSTRAINT chk_eta_changes_source
  CHECK (source IN ('edit', 'submission'));

ALTER TABLE eta_changes ADD CONSTRAINT fk_eta_changes_agent
  FOREIGN KEY (agent_id) REFERENCES agents (id) NOT ENFORCED;

-- While an agent is Blocked: when it became blocked, why, who or what can
-- unblock it, and when the Agent Manager was emailed about it having been
-- blocked too long (so they're only emailed once per block). All four are
-- cleared when the agent leaves Blocked.
ALTER TABLE agents ADD COLUMNS (blocked_since TIMESTAMP, blocker_reason STRING, blocked_by STRING, blocker_escalated_at TIMESTAMP);

-- What a contributor's update says about a later target date or a block.
ALTER TABLE update_submissions ADD COLUMNS (eta_reason STRING, blocker_reason STRING, blocked_by STRING);

-- Agents already Blocked get blocked_since from their history: the first day
-- of their current run of Blocked updates (after their last non-Blocked one).
MERGE INTO agents AS a
USING (
  SELECT u.agent_id, MIN(u.update_date) AS since
  FROM agent_updates u
  LEFT JOIN (
    SELECT agent_id, MAX(update_date) AS last_unblocked
    FROM agent_updates WHERE status <> 'Blocked' GROUP BY agent_id
  ) ok ON ok.agent_id = u.agent_id
  WHERE u.status = 'Blocked' AND (ok.last_unblocked IS NULL OR u.update_date > ok.last_unblocked)
  GROUP BY u.agent_id
) AS s
ON a.id = s.agent_id
WHEN MATCHED AND a.current_status = 'Blocked' AND a.blocked_since IS NULL THEN UPDATE SET
  blocked_since = CAST(s.since AS TIMESTAMP);

-- Any Blocked agent with no usable history falls back to its last update.
UPDATE agents SET blocked_since = COALESCE(last_update_at, updated_at)
WHERE current_status = 'Blocked' AND blocked_since IS NULL;

-- The audit log gains one action: the automatic "blocked too long" escalation.
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS chk_audit_events_action;

ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action
  CHECK (action IN ('agent_created', 'agent_edited', 'agent_deleted', 'update_recorded',
                    'update_submitted', 'update_approved', 'changes_requested', 'update_rejected',
                    'blocker_escalated'));
