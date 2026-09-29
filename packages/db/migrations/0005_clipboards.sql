CREATE TABLE IF NOT EXISTS "clipboards" (
  "passphrase_hash" varchar(64) PRIMARY KEY NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "clipboards_version_positive" CHECK ("version" > 0)
);
CREATE INDEX IF NOT EXISTS "clipboards_expires_idx" ON "clipboards" ("expires_at");
