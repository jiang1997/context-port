# Deployment

[Back to README](../README.md) · [简体中文](deployment.zh-CN.md)

## Cloudflare Workers

The backend runs on [Cloudflare Workers](https://contextport-server.jieke.workers.dev),
with the existing Neon PostgreSQL database and a Hyperdrive connection pool. Query
caching is disabled to preserve read-after-write consistency. The frontend stays
on [Vercel](https://context-port.vercel.app); `/api/*` and `/mcp` are proxied to
Workers, so OAuth callbacks and browser sessions keep their existing public origin.

Use Node.js 24+ and pnpm. Authenticate with `pnpm exec wrangler login`, copy
`.env.cloudflare.example` to the Git-ignored `.env.cloudflare.local`, and copy the
four production secrets from Render. Keep the original `CLIPBOARD_SECRET` so
existing shared passphrases continue to resolve their records. Then run:

```bash
pnpm check:cloudflare
pnpm deploy:cloudflare
```

The deployment script uploads secrets together with the Worker version. It does
not change the database schema. `wrangler.jsonc` defines the Worker and existing
Hyperdrive binding; deploying to another account requires replacing both resource
IDs. The entry point uses TypeScript-compiled JavaScript to preserve Nest decorator
metadata. Nest initializes during Worker startup, and each invocation creates and
closes its own database connections. A daily 03:00 UTC Cron Trigger deletes expired
temporary contexts instead of relying on a long-lived process timer.

For local development, provide a `.dev.vars` file and set
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` to a local PostgreSQL URL,
then run `pnpm dev:cloudflare`. Include `SERVER_RUNTIME=workers`,
`DEPLOYMENT_MODE=network`, `CLIPBOARD_SECRET`, and matching local `WEB_ORIGIN` and
`PUBLIC_BASE_URL` values. Supply all Google settings together, or omit all three.

Production smoke tests passed for concurrent writes, 100,000-character text,
API-key REST access, MCP initialization, and OAuth redirects. Common text requests
used approximately 4–8 ms of CPU in the migration sample, while some large-text
requests exceeded the Free plan's 10 ms CPU budget. These successful samples do
not guarantee sustained workloads fit the Free plan. Check Workers metrics before
increasing usage; no paid plan was enabled during migration.

Render remains available for existing Agent configurations. New Agent setup
instructions use `https://context-port.vercel.app/mcp` and `/api/v1`; update any
previously copied Render endpoints.

### Automatic deployment

The `deploy-cloudflare` job in `.github/workflows/ci.yml` deploys after both
`verify` and `e2e` pass on pushes to `main`. Pull requests and other branches only
run checks. Deployments run serially and check that the commit is still the latest
`main` before publishing, so rerunning an old job cannot overwrite a newer release.
Liveness and database readiness are checked after deployment.

The GitHub Actions repository secret `CLOUDFLARE_API_TOKEN` authorizes deployment.
The account ID and Hyperdrive binding come from `wrangler.jsonc`. CI runs
`pnpm exec wrangler deploy`, preserving existing Worker business secrets without
requiring the local `.env.cloudflare.local` file. Continue to use
`pnpm deploy:cloudflare` for manual local deployments or business-secret updates.
If the deployment token expires, update the GitHub secret and rerun the failed job
from the Actions page. Production schema migrations remain manual and must use the
database's direct/unpooled connection; CI does not migrate the production database.

## Render (alternative)

The repository includes [Vercel configuration](../vercel.json) for the Web and a
[Render Blueprint](../render.yaml) for the server. Configure the projects' Git
connections and production branch; this repository uses `main`. With Git deployment
enabled, Vercel deploys the production branch and Render is configured to wait for
CI checks to pass. To gate Vercel production releases, open the project's
Settings → Deployment Checks → Add Checks, select GitHub, and require both
`Vercel - context-port: verify` and `Vercel - context-port: e2e`. Keep automatic
production aliasing enabled. CI reports these commit statuses on pushes: pending
before checks run, then success or failure for each job independently. Run the
updated workflow once before searching for the status names. Vercel can build in
parallel, but only promotes the build after both required statuses succeed.
This requires no Vercel deployment token. Confirm both deployments finish before
testing a new feature.

Keep `VITE_API_BASE_URL=/api/v1` on Vercel. To switch back to Render, change the
`/api/*` and `/mcp` rewrite destinations in `vercel.json`. On Render, configure
`DATABASE_URL`, `WEB_ORIGIN`, and a stable `CLIPBOARD_SECRET` of at least 32
characters for network mode. Account login also needs the Google variables in [the development guide](development.md)
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
established. See [the deployment checklist](production-env-checklist.md) for
setup details and earlier rollout notes.

Related: [Local development](development.md) · [Agent access](agent-access.md)
