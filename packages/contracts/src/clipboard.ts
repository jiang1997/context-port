import { z } from 'zod';

export const PassphraseSchema = z.string().min(12).max(128);
export const ClipboardAccessSchema = z.object({ passphrase: PassphraseSchema }).strict();
export const ClipboardAppendSchema = ClipboardAccessSchema.extend({
  content: z.string().min(1).max(20_000),
}).strict();
export const ClipboardSchema = z.object({
  content: z.string(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  created: z.boolean().optional(),
});
export type Clipboard = z.infer<typeof ClipboardSchema>;
