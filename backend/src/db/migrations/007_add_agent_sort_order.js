exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE agents ADD COLUMN sort_order integer NOT NULL DEFAULT 0
  `);

  // Backfill existing rows with their current created_at order so drag-and-drop
  // reordering starts from the order users already see today.
  await knex.raw(`
    UPDATE agents a
    SET sort_order = ranked.rn
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
      FROM agents
    ) ranked
    WHERE a.id = ranked.id
  `);
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE agents DROP COLUMN IF EXISTS sort_order');
};
