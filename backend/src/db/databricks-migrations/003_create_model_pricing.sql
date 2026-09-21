CREATE TABLE IF NOT EXISTS model_pricing (
  id                          STRING NOT NULL,
  model                       STRING NOT NULL,
  input_price_per_1k_tokens   DECIMAL(12, 6) NOT NULL,
  output_price_per_1k_tokens  DECIMAL(12, 6) NOT NULL,
  effective_from              TIMESTAMP NOT NULL,
  created_at                  TIMESTAMP NOT NULL,
  created_by                  STRING
) USING DELTA;

ALTER TABLE model_pricing ADD CONSTRAINT pk_model_pricing PRIMARY KEY (id);
