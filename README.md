# ContextPort

[简体中文 / Setup and API reference](README.zh-CN.md)

A shared knowledge workspace for humans and agents. A Context holds shared background;
Threads are focused documents belonging to a Context.

The MVP supports creating and reading Contexts and Threads through Web, REST, and MCP.
Every creation atomically stores an immutable v1 revision. Editing, revision browsing,
restoration, archiving, and custom ordering are deferred. Future edits must check
`expectedVersion` and store a revision in the same transaction.

## Temporary Context without sign-in

Open `/clipboard` in the Web app. Enter a passphrase of at least 12 characters, or generate
a random one. The first use creates a temporary Context; the same passphrase opens it again.
Anyone with the passphrase can read and append content. It expires 7 days after creation;
using the passphrase after expiry creates a new, empty Context. Prefer generated passphrases
for private content. The Web app does not put passphrases in URLs.

Agents can call these anonymous JSON endpoints: `POST /api/v1/clipboard/generate` (no body),
`/open` and `/read` (`{"passphrase":"..."}`), and `/append`
(`{"passphrase":"...","content":"..."}`). Each append is limited to 20,000 characters;
the Context is limited to 100,000 characters. The server stores only a keyed passphrase digest.
Network deployments require a stable `CLIPBOARD_SECRET` of at least 32 characters and the
`0005` database migration before deploying the new server.

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

An Agent can also read JSON through REST with curl, without configuring an MCP client.
Create a personal key on the Web API Keys page and use it in the local examples below.
For a deployed app, replace the host with the API server host.

```bash
curl -fsS -H 'Authorization: Bearer <api-key>' 'http://127.0.0.1:3000/api/v1/contexts?limit=50&offset=0'
curl -fsS -H 'Authorization: Bearer <api-key>' 'http://127.0.0.1:3000/api/v1/contexts/<context-id>'
curl -fsS -H 'Authorization: Bearer <api-key>' 'http://127.0.0.1:3000/api/v1/contexts/<context-id>/threads/<thread-id>'
```

The Context response includes a Thread index; read each Thread body separately.
Keys can read and write the owner's Contexts, so share them only with trusted agents
and revoke them on the API Keys page when no longer needed.

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
