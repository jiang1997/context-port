# ContextPort

[简体中文](README.zh-CN.md)

Shared task context for humans and agents. Use a Temporary Context for short-lived
collaboration, or keep project knowledge in an account Context with focused Thread
documents. Threads are documents, not chat messages. The Web app renders Markdown
and supports English and Simplified Chinese.

## Choose a context

| | Temporary Context | Account Context / Thread |
| --- | --- | --- |
| Access | Passphrase; no sign-in or API key | Google browser session or personal API key |
| Lifetime | Expires 7 days after creation | No automatic expiry |
| Web | Read, append, edit, and clear content | List, create, and read documents |
| Agent access | REST | REST and MCP |
| Editing | Web and REST; version checked | REST and MCP; version checked |
| History | Current content and version only | Creation and edits store immutable Revisions; browsing/restoration unavailable |

Account documents belong to their owner. Knowing a Context ID does not grant
access. Temporary Contexts are separate from account documents and have no Threads.

## Quick start in the Web app

Open the app's home page `/` (legacy `/clipboard` also works) and choose **For Humans**.
Enter a passphrase of 8–128 characters or choose **Generate random passphrase**.
The first use creates a Temporary Context; the same passphrase opens it again.

- **Copy passphrase** copies only the access passphrase.
- **Copy Prompt** copies instructions with the passphrase and REST commands for an
  agent to read and append content. **For Agents** also offers a prompt to get started.
- **Add content** appends text; **Edit content** replaces the existing text, with
  **Save changes** and **Cancel editing**. Saving an empty document clears it.

Anyone with the passphrase can read and modify the content. Prefer a generated
passphrase and keep it safe: leaving the Context requires entering it again, and
passphrases are not put in URLs. Content expires 7 days after creation; appending
or editing does not extend that deadline. Opening an expired passphrase creates a
new, empty Context; reading or modifying an expired Context returns `404`.

## Agent access

### Temporary Context REST

These JSON endpoints require a passphrase, except generation; they do not require
Google login or an API key. The API base is `/api/v1`. Legacy `/api/v1/clipboard/*`
paths remain supported. Temporary Contexts are not exposed as MCP tools.

| Method | Path | JSON body | Result |
| --- | --- | --- | --- |
| POST | `/temporary-contexts/generate` | None | Generate a passphrase and create a Context |
| POST | `/temporary-contexts/open` | `{"passphrase":"..."}` | Create or reopen |
| POST | `/temporary-contexts/read` | `{"passphrase":"..."}` | Read existing content |
| POST | `/temporary-contexts/append` | `{"passphrase":"...","content":"..."}` | Append text |
| POST | `/temporary-contexts/update` | `{"passphrase":"...","content":"...","expectedVersion":2}` | Replace all content, including clearing it |

Example against the local API (replace the host with your deployed API host):

```bash
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/generate'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/open' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase"}'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/append' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase","content":"Task background"}'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/read' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase"}'
```

Generation returns `passphrase` along with the Context. Other operations return
`content`, `version`, `createdAt`, `updatedAt`, and `expiresAt`; open also returns
`created`. A new Context starts at version 1. Each append or update increments it.

Read before editing and supply that response's version as `expectedVersion`.
For example, if read returns version 2:

```bash
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/update' \
  -H 'Content-Type: application/json' \
  -d '{"passphrase":"example-passphrase","content":"Revised task background","expectedVersion":2}'
```

A stale version returns `409 VERSION_CONFLICT`: read again, merge your changes,
then retry with the latest version. Do not just change the version and overwrite
someone else's additions. Append accepts 1–20,000 characters; total content and
replacement content are limited to 100,000 characters. The server stores a keyed
passphrase digest and the shared content; hashing the passphrase does not encrypt
the content.

### Account Context / Thread REST

Sign in with Google and create a personal key on **API Keys** (`/keys`). Agents send
`Authorization: Bearer <api-key>`. Keys can read and write their owner's documents;
share them with trusted agents and revoke them when no longer needed. Browser
session writes also require the CSRF header handled by the Web app.

All paths below are relative to `/api/v1`:

| Method | Path | Result |
| --- | --- | --- |
| GET | `/contexts?limit=50&offset=0` | Context summaries without bodies |
| POST | `/contexts` | Create a Context |
| GET | `/contexts/:contextId` | Context body and Thread index |
| PATCH | `/contexts/:contextId` | Update a Context |
| POST | `/contexts/:contextId/threads` | Create a Thread |
| GET | `/contexts/:contextId/threads/:threadId` | Read a Thread |
| PATCH | `/contexts/:contextId/threads/:threadId` | Update a Thread |

```bash
curl -fsS -H 'Authorization: Bearer <api-key>' \
  'http://127.0.0.1:3000/api/v1/contexts?limit=50&offset=0'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/contexts' \
  -H 'Authorization: Bearer <api-key>' -H 'Content-Type: application/json' \
  -d '{"title":"Project background","content":"# Goals\nShared instructions","createdByType":"agent","createdBy":"My agent"}'
curl -fsS -X PATCH 'http://127.0.0.1:3000/api/v1/contexts/<context-id>' \
  -H 'Authorization: Bearer <api-key>' -H 'Content-Type: application/json' \
  -d '{"content":"Updated instructions","updatedByType":"agent","updatedBy":"My agent","expectedVersion":1}'
```

Context and Thread creation share the same body: required `title` (1–300
characters) and `createdByType` (`human` or `agent`), optional `content` (up to
100,000 characters) and `createdBy`. Updates require `expectedVersion`,
`updatedByType`, and at least one of `title` or `content`; `updatedBy` is optional.
Use the version returned by the preceding read, rather than a fixed value from an
example. Stale updates return `409 VERSION_CONFLICT`; read, merge, and retry.
Creation and each successful edit atomically save an immutable Revision.

Context detail includes Thread summaries without their bodies; read each Thread
separately. Actor names are caller-supplied labels, not permission identities.
Creation has no idempotency key: after a timeout, check the list before retrying.

### Account MCP

The server exposes stateless Streamable HTTP MCP at `http://127.0.0.1:3000/mcp`.
Configure an HTTP MCP client with that URL and the same Bearer API key header.
For a deployed server, use its API host's `/mcp` endpoint; the Vercel Web rewrite
only forwards `/api/*`, not `/mcp`.

Tools: `list_contexts`, `get_context`, `create_context`, `update_context`,
`create_thread`, `get_thread`, and `update_thread`.

Create and update inputs follow the REST contracts above. Context reads/updates
require `contextId`; Thread creation requires `contextId`, and Thread reads/updates
require both `contextId` and `threadId`. Tool failures return `isError: true` with
an error payload; version conflicts use `VERSION_CONFLICT`.

## Local development

Requires Node.js 24+, pnpm 12.4.2, and a running Docker engine. Run from the repository root:

```bash
# First setup only; preserve an existing .env.
cp .env.example .env
pnpm install
docker compose up -d postgres
# Wait for PostgreSQL to report "accepting connections" before migrating.
docker compose exec postgres pg_isready -U contextport -d context_port
pnpm db:migrate
pnpm build
pnpm dev
```

Web: `http://localhost:5173`; REST: `http://127.0.0.1:3000/api/v1`;
MCP: `http://127.0.0.1:3000/mcp`. Open the Web through `localhost` to match the default
`WEB_ORIGIN`. The Web uses `/api/v1` and Vite proxies API calls to the local server.

Temporary Contexts work without Google configuration. To use account Contexts,
Google login, or create API keys, set all three variables in `.env` before starting
the server:

```dotenv
GOOGLE_CLIENT_ID=<your OAuth Web client ID>
GOOGLE_CLIENT_SECRET=<your OAuth Web client secret>
PUBLIC_BASE_URL=http://localhost:5173
```

Register `http://localhost:5173/api/v1/auth/google/callback` as the client's redirect
URI. `.env.example` lists the remaining options. REST/MCP access to account documents
requires authentication in both local and network modes.

## Validation

```bash
pnpm typecheck
pnpm build
pnpm test
```

Without `TEST_DATABASE_URL`, database integration tests are skipped. For a full
run, start the Compose PostgreSQL service above and create a separate test database
once (these commands use the default local Compose credentials):

```bash
docker compose exec postgres createdb -U contextport contextport_test
TEST_DATABASE_URL=postgresql://contextport:contextport@localhost:5432/contextport_test pnpm test
```

On later runs, reuse the test database and run the second command. Tests apply
migrations, clear test data, and temporarily create triggers; use a disposable
test database, never a development or production database. GitHub CI provisions
PostgreSQL and sets `TEST_DATABASE_URL`, so CI runs the database integration tests.

## Deployment

The repository includes [Vercel configuration](vercel.json) for the Web and a
[Render Blueprint](render.yaml) for the server. Configure the projects' Git
connections and production branch; this repository uses `main`. With Git deployment
enabled, Vercel deploys the production branch and Render is configured to wait for
CI checks to pass. Confirm both deployments finish before testing a new feature.

Keep `VITE_API_BASE_URL=/api/v1` on Vercel. Its `/api/*` rewrite targets the Render
server; change the destination if using another server. On Render, configure
`DATABASE_URL`, `WEB_ORIGIN`, and a stable `CLIPBOARD_SECRET` of at least 32
characters for network mode. Account login also needs the Google variables above
and a `PUBLIC_BASE_URL` matching the public Web origin, with the corresponding
OAuth callback registered.

For a new database, apply all migrations. For an existing deployment, apply only
pending migrations when the schema changes; frontend or API-only changes do not
need a database migration. This free-plan Render configuration has no automatic
migration step. Run `pnpm db:migrate` with the target database's direct/unpooled
`DATABASE_URL` before releasing code that depends on the new schema.

Migration `0004` adds a required Context owner and was designed for an empty-database
launch; it does not backfill ownerless records. SQL migrations and the journal are
maintained manually. Legacy experimental tables are preserved without converting
them into Contexts; a complete Drizzle snapshot baseline for `db:generate` is not
established. See [the deployment checklist](docs/production-env-checklist.md) for
setup details and earlier rollout notes.

## Current limits

Account Context/Thread editing is available through REST/MCP; their Web pages
currently provide creation and reading. Deletion, archiving, custom ordering,
Revision browsing, and restoration are not exposed. Temporary Contexts do not
save Revision history or offer account ownership. Product design and planned
work are in [note.md](note.md); planned features there are not all implemented.

## License

[MIT](LICENSE) © 2026 jiang1997
