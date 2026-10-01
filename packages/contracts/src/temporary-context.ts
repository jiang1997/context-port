import { z } from 'zod';

export const PassphraseSchema = z.string().min(8).max(128);

export const TemporaryContextAccessSchema = z.object({ passphrase: PassphraseSchema }).strict();

export const TemporaryContextAppendSchema = TemporaryContextAccessSchema.extend({
  content: z.string().min(1).max(20_000),
}).strict();

export const TemporaryContextSchema = z.object({
  content: z.string(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  created: z.boolean().optional(),
});

export type TemporaryContext = z.infer<typeof TemporaryContextSchema>;

// Backwards-compatible aliases
export const ClipboardAccessSchema = TemporaryContextAccessSchema;
export const ClipboardAppendSchema = TemporaryContextAppendSchema;
export const ClipboardSchema = TemporaryContextSchema;
export type Clipboard = TemporaryContext;
