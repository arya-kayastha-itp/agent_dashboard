exports.up = async function (knex) {
  await knex.raw(`
    CREATE TYPE finops_alert_severity AS ENUM ('warning', 'critical')
  `);
  await knex.raw(`
    CREATE TYPE finops_alert_status AS ENUM ('open', 'acknowledged', 'resolved')
  `);

  await knex.raw(`
    CREATE TABLE finops_alerts (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id      uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      alert_type    varchar(50) NOT NULL,
      severity      finops_alert_severity NOT NULL,
      message       text NOT NULL,
      details       jsonb,
      status        finops_alert_status NOT NULL DEFAULT 'open',
      created_at    timestamptz NOT NULL DEFAULT now(),
      resolved_at   timestamptz
    )
  `);

  await knex.raw(`
    CREATE INDEX idx_finops_alerts_agent_type_status ON finops_alerts (agent_id, alert_type, status)
  `);
  await knex.raw(`
    CREATE INDEX idx_finops_alerts_status_created ON finops_alerts (status, created_at DESC)
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TABLE IF EXISTS finops_alerts');
  await knex.raw('DROP TYPE IF EXISTS finops_alert_severity');
  await knex.raw('DROP TYPE IF EXISTS finops_alert_status');
};
