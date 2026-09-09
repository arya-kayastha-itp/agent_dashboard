exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE finops_thresholds (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id         uuid REFERENCES agents(id) ON DELETE CASCADE,
      alert_type       varchar(50) NOT NULL,
      threshold_value  numeric(12, 4) NOT NULL,
      window_minutes   integer,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    )
  `);

  // agent_id is nullable (null = global default). These two partial unique
  // indexes keep "at most one row per (agent, alert_type)" and "at most one
  // global default per alert_type" so threshold resolution is unambiguous.
  await knex.raw(`
    CREATE UNIQUE INDEX uq_finops_thresholds_agent_type
      ON finops_thresholds (agent_id, alert_type) WHERE agent_id IS NOT NULL
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX uq_finops_thresholds_global_type
      ON finops_thresholds (alert_type) WHERE agent_id IS NULL
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TABLE IF EXISTS finops_thresholds');
};
