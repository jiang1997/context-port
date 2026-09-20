CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text,
  "handoff_context_id" uuid,
  "idempotency_key" uuid NOT NULL UNIQUE,
  "request_hash" varchar(64) NOT NULL,
  "created_by_type" varchar(16) NOT NULL,
  "created_by" varchar(200),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "tasks_created_by_type_check" CHECK ("created_by_type" IN ('human', 'agent'))
);

CREATE TABLE "task_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "name" varchar(50) NOT NULL,
  "created_by_type" varchar(16) NOT NULL,
  "created_by" varchar(200),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_tags_created_by_type_check" CHECK ("created_by_type" IN ('human', 'agent')),
  CONSTRAINT "task_tags_task_id_name_unique" UNIQUE("task_id", "name")
);

CREATE TABLE "task_stages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "description" text,
  "position" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "task_stages_position_check" CHECK ("position" >= 0),
  CONSTRAINT "task_stages_task_id_position_unique" UNIQUE("task_id", "position")
);

CREATE TABLE "context_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "stage_id" uuid REFERENCES "task_stages"("id") ON DELETE RESTRICT,
  "type" varchar(50) NOT NULL,
  "title" varchar(300),
  "content" text NOT NULL,
  "source" varchar(500),
  "created_by_type" varchar(16) NOT NULL,
  "created_by" varchar(200),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "supersedes_context_id" uuid REFERENCES "context_items"("id") ON DELETE RESTRICT,
  "idempotency_key" uuid NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "context_items_created_by_type_check" CHECK ("created_by_type" IN ('human', 'agent')),
  CONSTRAINT "context_items_task_id_idempotency_key_unique" UNIQUE("task_id", "idempotency_key")
);

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_handoff_context_id_context_items_id_fk"
  FOREIGN KEY ("handoff_context_id") REFERENCES "context_items"("id") ON DELETE RESTRICT;

CREATE INDEX "tasks_updated_at_id_idx" ON "tasks" ("updated_at" DESC, "id" DESC);
CREATE INDEX "task_tags_name_idx" ON "task_tags" ("name");
CREATE INDEX "context_items_task_timeline_idx" ON "context_items" ("task_id", "created_at", "id");
CREATE INDEX "context_items_stage_timeline_idx" ON "context_items" ("stage_id", "created_at", "id");
CREATE INDEX "context_items_task_type_idx" ON "context_items" ("task_id", "type");
CREATE INDEX "context_items_supersedes_idx" ON "context_items" ("supersedes_context_id");
