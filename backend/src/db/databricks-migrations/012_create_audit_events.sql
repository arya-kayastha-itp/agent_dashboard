-- Append-only record of every change to an agent: who did it, when, and what
-- changed (details holds JSON, e.g. {"changes": {"progress": {"from": 40, "to": 50}}}).
-- Rows are never updated or deleted -- not even when the agent or the person
-- is -- so names are snapshotted at the time of the event.
--
-- actor_*   who did it (NULL actor_id = no signed-in person, e.g. a script)
-- subject_* the other person an event is about, e.g. whose update was
--           approved, so filtering by a person finds both sides
-- action    agent_created | agent_edited | agent_deleted | update_recorded |
--           update_submitted | update_approved | changes_requested | update_rejected
CREATE TABLE IF NOT EXISTS audit_events (
  id               STRING NOT NULL,
  occurred_at      TIMESTAMP NOT NULL,
  actor_id         STRING,
  actor_name       STRING,
  agent_id         STRING,
  agent_name       STRING,
  subject_user_id  STRING,
  subject_name     STRING,
  action           STRING NOT NULL,
  details          STRING
) USING DELTA;

ALTER TABLE audit_events ADD CONSTRAINT pk_audit_events PRIMARY KEY (id);

ALTER TABLE audit_events ADD CONSTRAINT chk_audit_events_action
  CHECK (action IN ('agent_created', 'agent_edited', 'agent_deleted', 'update_recorded',
                    'update_submitted', 'update_approved', 'changes_requested', 'update_rejected'));
