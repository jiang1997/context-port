import { z } from 'zod';

export const UUIDSchema = z.string().uuid();

export const CreatorTypeSchema = z.enum(['human', 'agent']);

export const CreatorSchema = z.object({
  createdByType: CreatorTypeSchema,
  createdBy: z.string().trim().min(1).max(200).nullable().optional(),
});

export const IdempotencyKeySchema = UUIDSchema;

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string(),
  }),
});

export const CursorPageSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  });

export type CreatorType = z.infer<typeof CreatorTypeSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
