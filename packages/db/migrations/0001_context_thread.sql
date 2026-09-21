CREATE TABLE contexts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(300) NOT NULL,
content text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1 CHECK (version > 0),
created_by_type varchar(16) NOT NULL CHECK (created_by_type IN ('human','agent')), created_by varchar(200),
updated_by_type varchar(16) NOT NULL CHECK (updated_by_type IN ('human','agent')), updated_by varchar(200),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz);
CREATE TABLE threads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(300) NOT NULL,
content text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1 CHECK (version > 0),
created_by_type varchar(16) NOT NULL CHECK (created_by_type IN ('human','agent')), created_by varchar(200),
updated_by_type varchar(16) NOT NULL CHECK (updated_by_type IN ('human','agent')), updated_by varchar(200),
created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz, context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE RESTRICT);
CREATE INDEX contexts_created_idx ON contexts(created_at, id);
CREATE INDEX threads_context_idx ON threads(context_id, created_at, id);
CREATE TABLE revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 context_id uuid REFERENCES contexts(id) ON DELETE RESTRICT,
 thread_id uuid REFERENCES threads(id) ON DELETE RESTRICT,
 version integer NOT NULL CHECK (version > 0), title varchar(300) NOT NULL, content text NOT NULL,
 created_by_type varchar(16) NOT NULL CHECK (created_by_type IN ('human','agent')), created_by varchar(200),
 source varchar(16) NOT NULL CHECK (source IN ('rest','mcp')), created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT revisions_one_owner CHECK ((context_id IS NOT NULL) <> (thread_id IS NOT NULL)),
 UNIQUE(context_id, version), UNIQUE(thread_id, version)
);
CREATE FUNCTION prevent_revision_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Revisions are immutable'; END; $$;
CREATE TRIGGER revisions_immutable BEFORE UPDATE OR DELETE ON revisions
FOR EACH ROW EXECUTE FUNCTION prevent_revision_change();
