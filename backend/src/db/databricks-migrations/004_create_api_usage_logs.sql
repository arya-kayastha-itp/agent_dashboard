CREATE TABLE IF NOT EXISTS api_usage_logs (
  id               STRING NOT NULL,
  agent_id         STRING NOT NULL,
  request_id       STRING,
  endpoint         STRING,
  model            STRING NOT NULL,
  tokens_input     INT NOT NULL,
  tokens_output    INT NOT NULL,
  tokens_total     INT NOT NULL,
  status           STRING NOT NULL,
  error_category   STRING,
  error_code       STRING,
  cost_usd         DECIMAL(12, 6),
  latency_ms       INT,
  source           STRING NOT NULL,
  occurred_at      TIMESTAMP NOT NULL,
  created_at       TIMESTAMP NOT NULL,
  raw_metadata     STRING
) USING DELTA;

ALTER TABLE api_usage_logs ADD CONSTRAINT chk_api_usage_logs_status
  CHECK (status IN ('success', 'error'));

ALTER TABLE api_usage_logs ADD CONSTRAINT chk_api_usage_logs_error_category
  CHECK (error_category IS NULL OR error_category IN ('api_error', 'validation_error'));

ALTER TABLE api_usage_logs ADD CONSTRAINT pk_api_usage_logs PRIMARY KEY (id);

-- Informational only, not enforced. agent_id existence is validated in
-- application code (usage-logs.service.js) before insert.
ALTER TABLE api_usage_logs ADD CONSTRAINT fk_api_usage_logs_agent
  FOREIGN KEY (agent_id) REFERENCES agents (id) NOT ENFORCED;
