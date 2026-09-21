const crypto = require('crypto');
const db = require('../db/databricksClient');

const PRICING_SELECT = `
  id,
  model,
  CAST(input_price_per_1k_tokens AS DOUBLE) as inputPricePer1kTokens,
  CAST(output_price_per_1k_tokens AS DOUBLE) as outputPricePer1kTokens,
  effective_from as effectiveFrom,
  created_at as createdAt,
  created_by as createdBy
`;

async function listPricing() {
  return db.query(`SELECT ${PRICING_SELECT} FROM model_pricing ORDER BY model ASC, effective_from DESC`);
}

async function createPricing(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom).toISOString() : now;

  await db.query(
    `INSERT INTO model_pricing (id, model, input_price_per_1k_tokens, output_price_per_1k_tokens, effective_from, created_at, created_by)
     VALUES (:id, :model, CAST(:inputPrice AS DECIMAL(12,6)), CAST(:outputPrice AS DECIMAL(12,6)), CAST(:effectiveFrom AS TIMESTAMP), CAST(:createdAt AS TIMESTAMP), :createdBy)`,
    {
      id,
      model: data.model,
      inputPrice: data.inputPricePer1kTokens,
      outputPrice: data.outputPricePer1kTokens,
      effectiveFrom,
      createdAt: now,
      createdBy: data.createdBy ?? null,
    },
  );

  return {
    id,
    model: data.model,
    inputPricePer1kTokens: data.inputPricePer1kTokens,
    outputPricePer1kTokens: data.outputPricePer1kTokens,
    effectiveFrom,
    createdAt: now,
    createdBy: data.createdBy ?? null,
  };
}

// Cost lookup for a call on `model` at time `occurredAt`: the price row for
// that model with the latest effective_from <= occurredAt.
async function priceFor(model, occurredAt) {
  return db.queryOne(
    `SELECT ${PRICING_SELECT} FROM model_pricing
     WHERE model = :model AND effective_from <= CAST(:occurredAt AS TIMESTAMP)
     ORDER BY effective_from DESC LIMIT 1`,
    { model, occurredAt: new Date(occurredAt).toISOString() },
  );
}

module.exports = { listPricing, createPricing, priceFor };
