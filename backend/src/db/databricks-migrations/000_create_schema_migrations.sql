CREATE TABLE IF NOT EXISTS schema_migrations (
  name        STRING NOT NULL,
  applied_at  TIMESTAMP NOT NULL
) USING DELTA;
