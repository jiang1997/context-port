import { z } from 'zod';
import { UUIDSchema } from './common.js';

export const CreateSharedContextSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(100_000),
  })
  .strict();

export const UpdateSharedContextSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).max(100_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

export const SharedContextSchema = z.object({
  id: UUIDSchema,
  title: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateSharedContextInput = z.infer<typeof CreateSharedContextSchema>;
export type UpdateSharedContextInput = z.infer<typeof UpdateSharedContextSchema>;
export type SharedContext = z.infer<typeof SharedContextSchema>;
