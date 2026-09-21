CREATE TABLE IF NOT EXISTS agents (
  id                          STRING NOT NULL,
  name                        STRING NOT NULL,
  description                 STRING,
  assigned_to                 STRING,
  eta                         DATE,
  current_status              STRING NOT NULL,
  current_progress            SMALLINT NOT NULL,
  current_status_description  STRING,
  last_update_at              TIMESTAMP,
  sort_order                  INT NOT NULL,
  created_at                  TIMESTAMP NOT NULL,
  updated_at                  TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE agents ADD CONSTRAINT chk_agents_status
  CHECK (current_status IN ('Not Started', 'In Progress', 'Blocked', 'Completed', 'On Hold'));

ALTER TABLE agents ADD CONSTRAINT chk_agents_progress
  CHECK (current_progress BETWEEN 0 AND 100);

-- Informational only: Delta/Unity Catalog does not enforce PRIMARY KEY.
-- Uniqueness of id is guaranteed by the app (crypto.randomUUID()).
ALTER TABLE agents ADD CONSTRAINT pk_agents PRIMARY KEY (id);
