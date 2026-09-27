import type { Request } from 'express';

/** How the request identity was established. */
export type IdentitySource = 'session' | 'api-key' | 'legacy-token' | 'anonymous';

export interface AuthIdentity {
  /** Internal user ID; undefined only for the transitional anonymous mode. */
  userId?: string | undefined;
  source: IdentitySource;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by BusinessGuard after credential resolution. */
      authIdentity?: AuthIdentity;
    }
  }
}

export function identity(userId: string | undefined, source: IdentitySource): AuthIdentity {
  return userId === undefined ? { source } : { userId, source };
}
