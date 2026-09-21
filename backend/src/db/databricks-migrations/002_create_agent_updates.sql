CREATE TABLE IF NOT EXISTS agent_updates (
  id                  STRING NOT NULL,
  agent_id            STRING NOT NULL,
  update_date         DATE NOT NULL,
  status              STRING NOT NULL,
  progress            SMALLINT NOT NULL,
  status_description  STRING,
  source              STRING NOT NULL,
  created_at          TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE agent_updates ADD CONSTRAINT chk_agent_updates_status
  CHECK (status IN ('Not Started', 'In Progress', 'Blocked', 'Completed', 'On Hold'));

ALTER TABLE agent_updates ADD CONSTRAINT chk_agent_updates_progress
  CHECK (progress BETWEEN 0 AND 100);

ALTER TABLE agent_updates ADD CONSTRAINT pk_agent_updates PRIMARY KEY (id);

-- Informational only, not enforced. agent_id existence and (agent_id, update_date)
-- uniqueness are both enforced in application code (updates.service.js) via an
-- existence check and a MERGE INTO upsert, respectively.
ALTER TABLE agent_updates ADD CONSTRAINT fk_agent_updates_agent
  FOREIGN KEY (agent_id) REFERENCES agents (id) NOT ENFORCED;
