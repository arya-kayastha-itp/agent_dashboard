-- Dashboard sign-in accounts. Every account belongs to a team member (the
-- Teams roster stays the one list of people), but credentials live here so
-- GET /team-members can never leak them. password_hash is NULL until the
-- person sets a password from their invite link. token_version is copied
-- into each login JWT and bumped to end every existing session at once
-- (deactivation, password set, role change).
CREATE TABLE IF NOT EXISTS users (
  id                  STRING NOT NULL,
  team_member_id      STRING NOT NULL,
  email               STRING NOT NULL,
  role                STRING NOT NULL,
  status              STRING NOT NULL,
  password_hash       STRING,
  token_version       INT NOT NULL,
  failed_login_count  INT NOT NULL,
  locked_until        TIMESTAMP,
  last_login_at       TIMESTAMP,
  created_at          TIMESTAMP NOT NULL,
  updated_at          TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (id);

ALTER TABLE users ADD CONSTRAINT chk_users_role
  CHECK (role IN ('EXECUTIVE', 'AGENT_MANAGER', 'FINOPS', 'CONTRIBUTOR'));

ALTER TABLE users ADD CONSTRAINT chk_users_status
  CHECK (status IN ('invited', 'active', 'deactivated'));

-- Informational only, not enforced. "One account per email" and "one account
-- per team member" are enforced in application code (users.service.js).
ALTER TABLE users ADD CONSTRAINT fk_users_team_member
  FOREIGN KEY (team_member_id) REFERENCES team_members (id) NOT ENFORCED;

-- One-time links for setting a password (invite) or resetting it (reset).
-- Only a SHA-256 of the token is stored, so a leaked table can't be used to
-- sign in. used_at is set when the link is used or superseded by a newer one.
CREATE TABLE IF NOT EXISTS user_tokens (
  id          STRING NOT NULL,
  user_id     STRING NOT NULL,
  purpose     STRING NOT NULL,
  token_hash  STRING NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP,
  created_by  STRING,
  created_at  TIMESTAMP NOT NULL
) USING DELTA;

ALTER TABLE user_tokens ADD CONSTRAINT pk_user_tokens PRIMARY KEY (id);

ALTER TABLE user_tokens ADD CONSTRAINT chk_user_tokens_purpose
  CHECK (purpose IN ('invite', 'reset'));

ALTER TABLE user_tokens ADD CONSTRAINT fk_user_tokens_user
  FOREIGN KEY (user_id) REFERENCES users (id) NOT ENFORCED;

-- Carry over the three accounts that used to be hardcoded in
-- config/authUsers.js. Each gets a team member (matched case-insensitively
-- by name, created if missing) and an account in the invited state with no
-- password -- run `npm run users:link -- <email>` to get the first set-password
-- link. The NOT EXISTS guards keep this safe to re-run.
INSERT INTO team_members (id, name, created_at)
SELECT uuid(), s.name, current_timestamp()
FROM VALUES ('Debrup Mondal'), ('Arya Kayastha'), ('Nancy Vaghela') AS s(name)
WHERE NOT EXISTS (SELECT 1 FROM team_members m WHERE lower(m.name) = lower(s.name));

INSERT INTO users (id, team_member_id, email, role, status, password_hash, token_version,
                   failed_login_count, locked_until, last_login_at, created_at, updated_at)
SELECT uuid(), m.id, s.email, s.role, 'invited', CAST(NULL AS STRING), 0,
       0, CAST(NULL AS TIMESTAMP), CAST(NULL AS TIMESTAMP), current_timestamp(), current_timestamp()
FROM VALUES
  ('Debrup Mondal', 'debrup.mondal@intuitive.ai', 'EXECUTIVE'),
  ('Arya Kayastha', 'arya.kayastha@intuitive.ai', 'AGENT_MANAGER'),
  ('Nancy Vaghela', 'nancy.vaghela@intuitive.ai', 'FINOPS') AS s(name, email, role)
JOIN team_members m ON lower(m.name) = lower(s.name)
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = s.email);
