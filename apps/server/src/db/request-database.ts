import { AsyncLocalStorage } from 'node:async_hooks';
import { createDatabase, type Database } from '@contextport/db';

type DatabaseBundle = ReturnType<typeof createDatabase>;
const requests = new AsyncLocalStorage<DatabaseBundle>();

/** Nest services are singletons; resolve their database within each invocation. */
export const requestDatabase: Database = new Proxy({} as Database, {
  get(_target, property) {
    // Nest inspects provider promises and lifecycle hooks outside requests.
    if (property === 'then' || (typeof property === 'string' && property.startsWith('onModule'))
      || property === 'onApplicationBootstrap' || property === 'onApplicationShutdown'
      || property === 'beforeApplicationShutdown') return undefined;
    if (property === 'constructor') return Object;
    const bundle = requests.getStore();
    if (!bundle) throw new Error('Database access requires a Workers invocation.');
    const value = Reflect.get(bundle.db, property);
    return typeof value === 'function' ? value.bind(bundle.db) : value;
  },
});

export async function withRequestDatabase<T>(databaseUrl: string, callback: () => Promise<T>): Promise<T> {
  const bundle = createDatabase(databaseUrl);
  try {
    return await requests.run(bundle, callback);
  } finally {
    await bundle.pool.end();
  }
}
