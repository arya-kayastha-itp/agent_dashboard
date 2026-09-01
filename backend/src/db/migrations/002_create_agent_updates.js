exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE agent_updates (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id            uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      update_date         date NOT NULL DEFAULT CURRENT_DATE,
      status              agent_status NOT NULL,
      progress            smallint NOT NULL CHECK (progress BETWEEN 0 AND 100),
      status_description  text,
      source              varchar(50) NOT NULL DEFAULT 'manual',
      created_at          timestamptz NOT NULL DEFAULT now()
    )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX uq_agent_updates_agent_date ON agent_updates (agent_id, update_date)
  `);
  await knex.raw(`
    CREATE INDEX idx_agent_updates_agent_id_date ON agent_updates (agent_id, update_date DESC)
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TABLE IF EXISTS agent_updates');
};
