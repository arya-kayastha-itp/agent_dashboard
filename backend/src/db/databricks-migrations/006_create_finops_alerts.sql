CREATE TABLE IF NOT EXISTS finops_alerts (
  id            STRING NOT NULL,
  agent_id      STRING NOT NULL,
  alert_type    STRING NOT NULL,
  severity      STRING NOT NULL,
  message       STRING NOT NULL,
  details       STRING,
  status        STRING NOT NULL,
  created_at    TIMESTAMP NOT NULL,
  resolved_at   TIMESTAMP
) USING DELTA;

ALTER TABLE finops_alerts ADD CONSTRAINT chk_finops_alerts_severity
  CHECK (severity IN ('warning', 'critical'));

ALTER TABLE finops_alerts ADD CONSTRAINT chk_finops_alerts_status
  CHECK (status IN ('open', 'acknowledged', 'resolved'));

ALTER TABLE finops_alerts ADD CONSTRAINT pk_finops_alerts PRIMARY KEY (id);

-- Informational only, not enforced.
ALTER TABLE finops_alerts ADD CONSTRAINT fk_finops_alerts_agent
  FOREIGN KEY (agent_id) REFERENCES agents (id) NOT ENFORCED;
