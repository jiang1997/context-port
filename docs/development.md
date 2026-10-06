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

## End-to-end tests

One-time setup after installing dependencies:

```bash
pnpm exec playwright install chromium
```

Run the Chromium browser test with:

```bash
pnpm test:e2e
```

The command starts a separate, disposable PostgreSQL container on port `55432`,
waits for readiness, applies migrations, and starts the real frontend and backend
through `pnpm dev`. It removes the database container when finished. Stop any
existing development servers first: ports `3000` and `5173` must be available.
No `.env` or Google credentials are needed; test settings override local configuration.

The test creates a Temporary Context through the Web, appends and edits Markdown,
then reloads and reopens it to verify persistence. Each run uses a server-generated
passphrase. API requests are real and go through the frontend proxy.

CI runs this suite in a separate job against its own PostgreSQL service. To use an
already provisioned disposable database, set `E2E_DATABASE_URL`; this skips Docker
startup and cleanup. Migrations and test data are written to that database.

Failure screenshots, traces, the HTML report, and frontend/backend logs are saved
under `e2e-artifacts/` and uploaded on CI failure. To view the local report:

```bash
pnpm exec playwright show-report e2e-artifacts/report
```

Related: [Deployment](deployment.md) · [Agent access](agent-access.md)
