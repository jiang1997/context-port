-- Empty-database launch: existing ownerless Contexts are intentionally not migrated.
-- Apply this migration only to the new database described in the rollout checklist.
ALTER TABLE contexts ALTER COLUMN owner_user_id SET NOT NULL;
