const db = require('../db/pool');

// Numeric columns need an explicit raw cast (knex's `col as alias` string
// parsing doesn't understand `col::type as alias`) so pg returns a JS number, not a string.
const PRICING_COLUMNS = [
  'id',
  'model',
  db.raw('input_price_per_1k_tokens::float8 as "inputPricePer1kTokens"'),
  db.raw('output_price_per_1k_tokens::float8 as "outputPricePer1kTokens"'),
  'effective_from as effectiveFrom',
  'created_at as createdAt',
  'created_by as createdBy',
];

async function listPricing() {
  return db('model_pricing').select(PRICING_COLUMNS).orderBy([{ column: 'model', order: 'asc' }, { column: 'effective_from', order: 'desc' }]);
}

async function createPricing(data) {
  const [row] = await db('model_pricing')
    .insert({
      model: data.model,
      input_price_per_1k_tokens: data.inputPricePer1kTokens,
      output_price_per_1k_tokens: data.outputPricePer1kTokens,
      effective_from: data.effectiveFrom || new Date(),
      created_by: data.createdBy ?? null,
    })
    .returning(PRICING_COLUMNS);
  return row;
}

// Cost lookup for a call on `model` at time `occurredAt`: the price row for
// that model with the latest effective_from <= occurredAt. Runs inside the
// caller's transaction (trx) when part of the ingest flow.
async function priceFor(model, occurredAt, trx = db) {
  return trx('model_pricing')
    .select(PRICING_COLUMNS)
    .where('model', model)
    .andWhere('effective_from', '<=', occurredAt)
    .orderBy('effective_from', 'desc')
    .first();
}

module.exports = { listPricing, createPricing, priceFor };
