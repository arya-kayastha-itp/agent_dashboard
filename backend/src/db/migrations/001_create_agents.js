exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.raw(`
    CREATE TYPE agent_status AS ENUM
      ('Not Started', 'In Progress', 'Blocked', 'Completed', 'On Hold')
  `);

  await knex.raw(`
    CREATE TABLE agents (
      id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name                        varchar(200) NOT NULL,
      description                 text,
      assigned_to                 varchar(200),
      eta                         date,
      current_status              agent_status NOT NULL DEFAULT 'Not Started',
      current_progress            smallint NOT NULL DEFAULT 0 CHECK (current_progress BETWEEN 0 AND 100),
      current_status_description  text,
      last_update_at              timestamptz,
      created_at                  timestamptz NOT NULL DEFAULT now(),
      updated_at                  timestamptz NOT NULL DEFAULT now()
    )
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TABLE IF EXISTS agents');
  await knex.raw('DROP TYPE IF EXISTS agent_status');
};
