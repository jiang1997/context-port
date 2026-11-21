// Import compiled JS so Nest's TypeScript decorator metadata is preserved.
import { httpServerHandler } from 'cloudflare:node';
import { createApplication } from './dist/bootstrap.js';
import { withRequestDatabase } from './dist/db/request-database.js';
import { DatabaseMaintenance } from './dist/db/database-maintenance.js';

// Initialize during the startup budget, rather than charging Nest bootstrap to
// the first request's 10 ms CPU budget. No database I/O runs during startup.
const application = await createApplication();
await application.listen(3000);
const handler = httpServerHandler({ port: 3000 });

export default {
  async fetch(request, env, ctx) {
    // MCP uses JSON responses, so all DB work completes before fetch resolves.
    return withRequestDatabase(env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL,
      () => handler.fetch(request, env, ctx));
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(withRequestDatabase(env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL, async () => {
      await application.get(DatabaseMaintenance).pruneExpired();
    }));
  },
};
