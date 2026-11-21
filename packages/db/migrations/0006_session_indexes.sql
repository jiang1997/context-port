CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
--> statement-breakpoint
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
