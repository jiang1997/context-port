# Deployment

[Back to README](../README.md) · [简体中文](deployment.zh-CN.md)

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

Keep `VITE_API_BASE_URL=/api/v1` on Vercel. Its `/api/*` rewrite targets the Render
server; change the destination if using another server. On Render, configure
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
