import { z } from 'zod';
import { CreatorSchema } from './common.js';

export const TagNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[\p{L}\p{N}_-]+$/u, 'Tag contains unsupported characters.')
  .transform((name) => name.toLocaleLowerCase());

export const AddTagSchema = z
  .object({ name: TagNameSchema })
  .extend(CreatorSchema.shape)
  .strict();

export type AddTagInput = z.infer<typeof AddTagSchema>;
