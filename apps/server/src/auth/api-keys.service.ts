import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { apiKeys, type Database } from '@contextport/db';
import { DATABASE } from '../db/db.module.js';
import { hashSessionToken } from './auth.constants.js';

export const API_KEY_PREFIX = 'cpk_';

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return API_KEY_PREFIX + Buffer.from(bytes).toString('base64url');
}

/** Personal keys for MCP and programmatic access; only hashes are persisted. */
@Injectable()
export class ApiKeyService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Issues a new key; the raw value is returned exactly once. */
  async issue(userId: string, name: string) {
    const raw = generateRawKey();
    const [row] = await this.db.insert(apiKeys).values({
      userId,
      name,
      tokenHash: hashSessionToken(raw),
    }).returning({ id: apiKeys.id, name: apiKeys.name, createdAt: apiKeys.createdAt });
    if (!row) throw new Error('API key insert failed.');
    return { ...row, key: raw };
  }

  async list(userId: string) {
    return this.db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    }).from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt), desc(apiKeys.id));
  }

  /** Revokes a key owned by this user (ownership check included). */
  async revoke(userId: string, id: string): Promise<boolean> {
    const result = await this.db.update(apiKeys).set({ revokedAt: new Date().toISOString() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
      .returning({ id: apiKeys.id });
    return result.length > 0;
  }

  /** Maps a raw Bearer key to its owning user, touching lastUsedAt. */
  async resolve(rawKey: string): Promise<string | null> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) return null;
    const [row] = await this.db.select({ userId: apiKeys.userId, id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.tokenHash, hashSessionToken(rawKey)), isNull(apiKeys.revokedAt)));
    if (!row) return null;
    void this.db.update(apiKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiKeys.id, row.id));
    return row.userId;
  }
}
