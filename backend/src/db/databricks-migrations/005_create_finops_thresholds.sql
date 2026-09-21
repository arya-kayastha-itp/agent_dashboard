CREATE TABLE IF NOT EXISTS finops_thresholds (
  id               STRING NOT NULL,
  agent_id         STRING,
  alert_type       STRING NOT NULL,
  threshold_value  DECIMAL(12, 4) NOT NULL,
  window_minutes   INT,
  created_at       TIMESTAMP NOT NULL,
  updated_at       TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE finops_thresholds ADD CONSTRAINT pk_finops_thresholds PRIMARY KEY (id);

-- Informational only, not enforced.
ALTER TABLE finops_thresholds ADD CONSTRAINT fk_finops_thresholds_agent
  FOREIGN KEY (agent_id) REFERENCES agents (id) NOT ENFORCED;

-- No unique-index equivalent exists in Delta. "At most one row per
-- (agent_id, alert_type)" and "at most one global default per alert_type"
-- are enforced in application code (thresholds.service.js) via MERGE INTO.
