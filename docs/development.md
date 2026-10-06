# Local development

[Back to README](../README.md) · [简体中文](development.zh-CN.md)

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

Related: [Deployment](deployment.md) · [Agent access](agent-access.md)
