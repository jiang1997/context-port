import { createHmac, randomBytes } from 'node:crypto';
import { Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { and, eq, gt, sql } from 'drizzle-orm';
import { clipboards, type Database } from '@contextport/db';
import { PassphraseSchema } from '@contextport/contracts';
import { DATABASE } from '../db/db.module.js';
import { getEnvironment } from '../config/environment.js';

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONTENT = 100_000;

@Injectable()
export class ClipboardService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private hash(passphrase: string) {
    const secret = getEnvironment().CLIPBOARD_SECRET ?? 'contextport-local-development-only-secret';
    return createHmac('sha256', secret).update(passphrase).digest('hex');
  }

  async open(passphrase: string) {
    const hash = this.hash(PassphraseSchema.parse(passphrase));
    const now = new Date();
    await this.db.delete(clipboards).where(sql`${clipboards.expiresAt} <= ${now.toISOString()}`);
    const inserted = await this.db.insert(clipboards).values({
      passphraseHash: hash,
      expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
    }).onConflictDoNothing().returning();
    const row = inserted[0] ?? (await this.db.select().from(clipboards).where(and(
      eq(clipboards.passphraseHash, hash), gt(clipboards.expiresAt, now.toISOString()),
    )))[0];
    if (!row) throw new NotFoundException('Clipboard expired. Please try again.');
    return this.publicRow(row, inserted.length > 0);
  }

  async generate() {
    const passphrase = randomBytes(24).toString('base64url');
    return { passphrase, ...(await this.open(passphrase)) };
  }

  async read(passphrase: string) {
    const hash = this.hash(PassphraseSchema.parse(passphrase));
    const [row] = await this.db.select().from(clipboards).where(and(
      eq(clipboards.passphraseHash, hash), gt(clipboards.expiresAt, new Date().toISOString()),
    ));
    if (!row) throw new NotFoundException('Clipboard not found or expired.');
    return this.publicRow(row);
  }

  async append(passphrase: string, content: string) {
    const hash = this.hash(PassphraseSchema.parse(passphrase));
    const addition = content;
    if (!addition || addition.length > 20_000) throw new PayloadTooLargeException('Append must contain 1–20,000 characters.');
    const [row] = await this.db.update(clipboards).set({
      content: sql`${clipboards.content} || CASE WHEN ${clipboards.content} = '' THEN '' ELSE E'\n\n' END || ${addition}`,
      version: sql`${clipboards.version} + 1`,
      updatedAt: new Date().toISOString(),
    }).where(and(
      eq(clipboards.passphraseHash, hash),
      gt(clipboards.expiresAt, new Date().toISOString()),
      sql`char_length(${clipboards.content}) + CASE WHEN ${clipboards.content} = '' THEN 0 ELSE 2 END + char_length(${addition}) <= ${MAX_CONTENT}`,
    )).returning();
    if (!row) {
      await this.read(passphrase);
      throw new PayloadTooLargeException('Clipboard is full (100,000 characters).');
    }
    return this.publicRow(row);
  }

  private publicRow(row: typeof clipboards.$inferSelect, created?: boolean) {
    return { content: row.content, version: row.version, createdAt: row.createdAt,
      updatedAt: row.updatedAt, expiresAt: row.expiresAt, ...(created === undefined ? {} : { created }) };
  }
}
