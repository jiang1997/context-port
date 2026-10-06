# Deployment

[Back to README](../README.md) · [简体中文](deployment.zh-CN.md)

The repository includes [Vercel configuration](../vercel.json) for the Web and a
[Render Blueprint](../render.yaml) for the server. Configure the projects' Git
connections and production branch; this repository uses `main`. With Git deployment
enabled, Vercel deploys the production branch and Render is configured to wait for
CI checks to pass. Confirm both deployments finish before testing a new feature.

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
