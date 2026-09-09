exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE model_pricing (
      id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      model                       varchar(100) NOT NULL,
      input_price_per_1k_tokens   numeric(12, 6) NOT NULL,
      output_price_per_1k_tokens  numeric(12, 6) NOT NULL,
      effective_from              timestamptz NOT NULL,
      created_at                  timestamptz NOT NULL DEFAULT now(),
      created_by                  varchar(200)
    )
  `);

  await knex.raw(`
    CREATE INDEX idx_model_pricing_model_effective_from ON model_pricing (model, effective_from DESC)
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TABLE IF EXISTS model_pricing');
};
