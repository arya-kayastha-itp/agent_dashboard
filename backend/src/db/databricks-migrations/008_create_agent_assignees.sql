CREATE TABLE IF NOT EXISTS agent_assignees (
  agent_id        STRING NOT NULL,
  team_member_id  STRING NOT NULL,
  created_at      TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE agent_assignees ADD CONSTRAINT pk_agent_assignees PRIMARY KEY (agent_id, team_member_id);

-- Informational only, not enforced.
ALTER TABLE agent_assignees ADD CONSTRAINT fk_agent_assignees_agent
  FOREIGN KEY (agent_id) REFERENCES agents (id) NOT ENFORCED;

ALTER TABLE agent_assignees ADD CONSTRAINT fk_agent_assignees_team_member
  FOREIGN KEY (team_member_id) REFERENCES team_members (id) NOT ENFORCED;

-- Carry each agent's existing assigned_to over to the matching team member
-- (same normalisation as 007). The NOT EXISTS guard keeps this safe to re-run.
-- agents.assigned_to itself is left in place but is no longer read or written
-- by the app — agent_assignees is the source of truth from here on.
INSERT INTO agent_assignees (agent_id, team_member_id, created_at)
SELECT a.id, m.id, current_timestamp()
FROM agents a
JOIN team_members m
  ON lower(m.name) = lower(regexp_replace(trim(a.assigned_to), '[ ]+', ' '))
WHERE a.assigned_to IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM agent_assignees x WHERE x.agent_id = a.id AND x.team_member_id = m.id);
