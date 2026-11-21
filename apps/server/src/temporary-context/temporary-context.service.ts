import { createHmac, randomBytes } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { clipboards, type Database } from '@contextport/db';
import { PassphraseSchema, TemporaryContextUpdateSchema } from '@contextport/contracts';
import { DATABASE } from '../db/db.module.js';
import { getEnvironment } from '../config/environment.js';

const ACCESS_EXPIRY = sql`now() + interval '7 days'`;
const MAX_CONTENT = 100_000;

@Injectable()
export class TemporaryContextService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async deleteExpired() {
    await this.db.delete(clipboards).where(sql`${clipboards.expiresAt} <= now()`);
  }

  private hash(passphrase: string) {
    const secret = getEnvironment().CLIPBOARD_SECRET ?? 'contextport-local-development-only-secret';
    return createHmac('sha256', secret).update(passphrase).digest('hex');
  }

  async open(passphrase: string) {
    const hash = this.hash(PassphraseSchema.parse(passphrase));
    await this.deleteExpired();
    const inserted = await this.db.insert(clipboards).values({
      passphraseHash: hash,
      expiresAt: ACCESS_EXPIRY,
    }).onConflictDoNothing().returning();
    const row = inserted[0] ?? (await this.db.update(clipboards).set({ expiresAt: sql`greatest(${clipboards.expiresAt}, ${ACCESS_EXPIRY})` }).where(and(
      eq(clipboards.passphraseHash, hash), sql`${clipboards.expiresAt} > now()`,
    )).returning())[0];
    if (!row) throw new NotFoundException('Temporary Context expired. Please try again.');
    return this.publicRow(row, inserted.length > 0);
  }

  async generate() {
    const passphrase = randomBytes(24).toString('base64url');
    return { passphrase, ...(await this.open(passphrase)) };
  }

  async read(passphrase: string) {
    const hash = this.hash(PassphraseSchema.parse(passphrase));
    const [row] = await this.db.update(clipboards).set({ expiresAt: sql`greatest(${clipboards.expiresAt}, ${ACCESS_EXPIRY})` }).where(and(
      eq(clipboards.passphraseHash, hash), sql`${clipboards.expiresAt} > now()`,
    )).returning();
    if (!row) throw new NotFoundException('Temporary Context not found or expired.');
    return this.publicRow(row);
  }

  async append(passphrase: string, content: string) {
    const hash = this.hash(PassphraseSchema.parse(passphrase));
    const addition = content;
    if (!addition || addition.length > 20_000) throw new PayloadTooLargeException({
      code: 'TEMPORARY_CONTEXT_APPEND_SIZE', message: 'Append must contain 1–20,000 characters.',
    });
    const [row] = await this.db.update(clipboards).set({
      content: sql`${clipboards.content} || CASE WHEN ${clipboards.content} = '' THEN '' ELSE E'\n\n' END || ${addition}`,
      version: sql`${clipboards.version} + 1`,
      updatedAt: sql`now()`,
      expiresAt: sql`greatest(${clipboards.expiresAt}, ${ACCESS_EXPIRY})`,
    }).where(and(
      eq(clipboards.passphraseHash, hash),
      sql`${clipboards.expiresAt} > now()`,
      sql`char_length(${clipboards.content}) + CASE WHEN ${clipboards.content} = '' THEN 0 ELSE 2 END + char_length(${addition}) <= ${MAX_CONTENT}`,
    )).returning();
    if (!row) {
      await this.findActive(hash);
      throw new PayloadTooLargeException({
        code: 'TEMPORARY_CONTEXT_FULL', message: 'Temporary Context is full (100,000 characters).',
      });
    }
    return this.publicRow(row);
  }

  async update(passphrase: string, content: string, expectedVersion: number) {
    TemporaryContextUpdateSchema.parse({ passphrase, content, expectedVersion });
    const hash = this.hash(passphrase);
    const [row] = await this.db.update(clipboards).set({
      content,
      version: sql`${clipboards.version} + 1`,
      updatedAt: sql`now()`,
      expiresAt: sql`greatest(${clipboards.expiresAt}, ${ACCESS_EXPIRY})`,
    }).where(and(
      eq(clipboards.passphraseHash, hash),
      eq(clipboards.version, expectedVersion),
      sql`${clipboards.expiresAt} > now()`,
    )).returning();
    if (!row) {
      const current = await this.findActive(hash);
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'Version conflict. Re-read, merge, then retry.',
        details: { expectedVersion, currentVersion: current.version },
      });
    }
    return this.publicRow(row);
  }

  // Failed writes must not renew the deadline.
  private async findActive(hash: string) {
    const [row] = await this.db.select().from(clipboards).where(and(
      eq(clipboards.passphraseHash, hash), sql`${clipboards.expiresAt} > now()`,
    ));
    if (!row) throw new NotFoundException('Temporary Context not found or expired.');
    return row;
  }

  private publicRow(row: typeof clipboards.$inferSelect, created?: boolean) {
    return {
      content: row.content,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt,
      ...(created === undefined ? {} : { created }),
    };
  }
}

// Backwards-compatible alias
export { TemporaryContextService as ClipboardService };
