CREATE TABLE IF NOT EXISTS team_members (
  id          STRING NOT NULL,
  name        STRING NOT NULL,
  created_at  TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE team_members ADD CONSTRAINT pk_team_members PRIMARY KEY (id);

-- Seed the roster from the free-text names already in agents.assigned_to.
-- Names are trimmed, inner runs of spaces collapsed, and matched
-- case-insensitively, so "Nancy Vaghela " and "Nancy Vaghela  " become one
-- member. The NOT EXISTS guard keeps this safe to re-run.
INSERT INTO team_members (id, name, created_at)
SELECT uuid(), n.name, current_timestamp()
FROM (
  SELECT min(regexp_replace(trim(assigned_to), '[ ]+', ' ')) AS name
  FROM agents
  WHERE assigned_to IS NOT NULL AND trim(assigned_to) <> ''
  GROUP BY lower(regexp_replace(trim(assigned_to), '[ ]+', ' '))
) n
WHERE NOT EXISTS (SELECT 1 FROM team_members m WHERE lower(m.name) = lower(n.name));

-- No unique-index equivalent exists in Delta. "At most one member per name,
-- ignoring case" is enforced in application code (team-members.service.js).
