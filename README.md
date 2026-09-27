# ContextPort

[简体中文 / Setup and API reference](README.zh-CN.md)

A shared knowledge workspace for humans and agents. A Context holds shared background;
Threads are focused documents belonging to a Context.

The MVP supports creating and reading Contexts and Threads through Web, REST, and MCP.
Every creation atomically stores an immutable v1 revision. Editing, revision browsing,
restoration, archiving, and custom ordering are deferred. Future edits must check
`expectedVersion` and store a revision in the same transaction.

## Local development

Requires Node.js 24 LTS, pnpm 12.4.2, and Docker.

```bash
cp .env.example .env # First setup only; preserve existing configuration
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm build
pnpm dev
```

Web: `http://localhost:5173`. REST: `http://127.0.0.1:3000/api/v1`.
Stateless Streamable HTTP MCP: `http://127.0.0.1:3000/mcp`.

MCP tools: `list_contexts`, `get_context`, `create_context`, `create_thread`, `get_thread`.
Creation accepts `title`, optional `content`, `createdByType` (`human` or `agent`), and
optional `createdBy`. Thread operations require `contextId`; reading also requires `threadId`.
Context reads return the Thread index without Thread bodies.

REST and MCP require a verified Google browser session or a personal API key in both
local and network modes. To use the local Web, set `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, and `PUBLIC_BASE_URL=http://localhost:5173` in `.env`, and
register `http://localhost:5173/api/v1/auth/google/callback` with Google. Actor names
remain caller-supplied labels, not permission identities. The `0004` migration requires
an empty database; it does not backfill old Contexts.

## Validation

```bash
pnpm typecheck
pnpm build
pnpm test
# Dedicated disposable database only; integration tests skip without this variable:
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/contextport_test pnpm test
```

Migrations preserve legacy experimental tables. SQL migrations are manually maintained;
a complete Drizzle snapshot baseline for `db:generate` has not been established yet.
See [note.md](note.md) for the product design and next milestones.
