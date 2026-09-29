ALTER TABLE agents ADD COLUMNS (marketplace_deployment BOOLEAN);

-- Tags an agent as one that will be available on the marketplaces. Nullable
-- and added without a default, so existing rows are left exactly as they are:
-- NULL means "not tagged", and the app reads it as false (COALESCE in
-- agents.service.js), so no backfill is needed.
