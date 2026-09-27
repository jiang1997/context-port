-- Ownership for Contexts (add first; NOT NULL + backfill happen in the later
-- production migration per docs/google-login-plan.md stage 4) and personal
-- MCP API keys (hash-only storage).

ALTER TABLE contexts
  ADD COLUMN owner_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;

CREATE INDEX contexts_owner_idx ON contexts(owner_user_id, created_at, id);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  token_hash varchar(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX api_keys_user_idx ON api_keys(user_id, created_at);
