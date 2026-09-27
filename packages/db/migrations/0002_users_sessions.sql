-- Additive migration: Google account users and application sessions.
-- Follows the safe "add first, tighten later" order from docs/google-login-plan.md;
-- no existing table or row is modified.

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub varchar(64) NOT NULL UNIQUE,
  email varchar(320) NOT NULL,
  name varchar(300),
  avatar_url varchar(2048),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT sessions_expiry_after_creation CHECK (expires_at > created_at)
);
