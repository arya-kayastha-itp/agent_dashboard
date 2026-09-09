exports.up = async function (knex) {
  await knex.raw(`
    CREATE TYPE usage_status AS ENUM ('success', 'error')
  `);

  await knex.raw(`
    CREATE TYPE usage_error_category AS ENUM ('api_error', 'validation_error')
  `);

  await knex.raw(`
    CREATE TABLE api_usage_logs (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id         uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      request_id       varchar(100),
      endpoint         varchar(200),
      model            varchar(100) NOT NULL,
      tokens_input     integer NOT NULL DEFAULT 0,
      tokens_output    integer NOT NULL DEFAULT 0,
      tokens_total     integer NOT NULL DEFAULT 0,
      status           usage_status NOT NULL,
      error_category   usage_error_category,
      error_code       varchar(200),
      cost_usd         numeric(12, 6),
      latency_ms       integer,
      source           varchar(50) NOT NULL DEFAULT 'manual',
      occurred_at      timestamptz NOT NULL DEFAULT now(),
      created_at       timestamptz NOT NULL DEFAULT now(),
      raw_metadata     jsonb
    )
  `);

  await knex.raw(`
    CREATE INDEX idx_api_usage_logs_agent_occurred ON api_usage_logs (agent_id, occurred_at DESC)
  `);
  await knex.raw(`
    CREATE INDEX idx_api_usage_logs_agent_status_occurred ON api_usage_logs (agent_id, status, occurred_at DESC)
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TABLE IF EXISTS api_usage_logs');
  await knex.raw('DROP TYPE IF EXISTS usage_status');
  await knex.raw('DROP TYPE IF EXISTS usage_error_category');
};
