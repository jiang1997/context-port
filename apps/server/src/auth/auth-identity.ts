import type { Request } from 'express';

/** How the request identity was established. */
export type IdentitySource = 'session' | 'api-key';

export interface AuthIdentity {
  /** Internal user ID resolved from a verified credential. */
  userId: string;
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

export function identity(userId: string, source: IdentitySource): AuthIdentity {
  return { userId, source };
}
