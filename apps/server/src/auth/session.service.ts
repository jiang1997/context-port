import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { sessions, users, type Database } from '@contextport/db';
import { DATABASE } from '../db/db.module.js';
import { SESSION_TTL_MS, generateSessionToken, hashSessionToken } from './auth.constants.js';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class SessionService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Creates a server-side session; the browser only ever sees the opaque token. */
  async issue(userId: string): Promise<{ token: string; expiresAt: string }> {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const [row] = await this.db.insert(sessions).values({
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: expiresAt.toISOString(),
    }).returning({ expiresAt: sessions.expiresAt });
    if (!row) throw new Error('Session insert failed.');
    return { token, expiresAt: row.expiresAt };
  }

  /** Resolves a cookie token to its active user, checking expiry and revocation. */
  async resolve(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const [row] = await this.db.select({
      userId: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      expiresAt: sessions.expiresAt,
    })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, hashSessionToken(token)), isNull(sessions.revokedAt)));
    if (!row || new Date(row.expiresAt).getTime() <= Date.now()) return null;
    return { id: row.userId, email: row.email, name: row.name, avatarUrl: row.avatarUrl };
  }

  /** Revokes the session row (idempotent). */
  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.db.update(sessions).set({ revokedAt: new Date().toISOString() })
      .where(and(eq(sessions.tokenHash, hashSessionToken(token)), isNull(sessions.revokedAt)));
  }

  /** Housekeeping: drop sessions that expired more than a day ago. */
  async pruneExpired(): Promise<void> {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()));
  }
}
