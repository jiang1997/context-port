import { z } from 'zod';
import { CreatorSchema, IdempotencyKeySchema, UUIDSchema } from './common.js';

export const ContextTypeSchema = z.string().trim().min(1).max(50);

export const ContextMetadataSchema = z.record(z.string(), z.unknown());

export const InitialContextSchema = z
  .object({
    type: z.literal('requirement'),
    title: z.string().trim().min(1).max(300).nullable().optional(),
    content: z.string().trim().min(1).max(100_000),
    source: z.string().trim().min(1).max(500).nullable().optional(),
    metadata: ContextMetadataSchema.optional(),
  })
  .strict();

export const CreateContextSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    stageId: UUIDSchema.nullable().optional(),
    supersedesContextId: UUIDSchema.nullable().optional(),
    expectedHandoffContextId: UUIDSchema.nullable().optional(),
    type: ContextTypeSchema,
    title: z.string().trim().min(1).max(300).nullable().optional(),
    content: z.string().trim().min(1).max(100_000),
    source: z.string().trim().min(1).max(500).nullable().optional(),
    metadata: ContextMetadataSchema.optional(),
  })
  .extend(CreatorSchema.shape)
  .strict()
  .superRefine((value, context) => {
    if (value.type === 'handoff') {
      if (value.stageId != null) {
        context.addIssue({
          code: 'custom',
          path: ['stageId'],
          message: 'A handoff context must be global.',
        });
      }
      if ([...value.content].length > 8_000) {
        context.addIssue({
          code: 'custom',
          path: ['content'],
          message: 'A handoff context cannot exceed 8,000 Unicode code points.',
        });
      }
      return;
    }

    if (value.expectedHandoffContextId !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['expectedHandoffContextId'],
        message: 'Only handoff contexts accept expectedHandoffContextId.',
      });
    }
  });

export const ContextSummarySchema = z.object({
  id: UUIDSchema,
  taskId: UUIDSchema,
  stageId: UUIDSchema.nullable(),
  type: ContextTypeSchema,
  title: z.string().nullable(),
  excerpt: z.string(),
  contentLength: z.number().int().nonnegative(),
  contentOmitted: z.boolean(),
  source: z.string().nullable(),
  supersedesContextId: UUIDSchema.nullable(),
  supersededByCount: z.number().int().nonnegative(),
  hasReplacementConflict: z.boolean(),
  createdByType: z.enum(['human', 'agent']),
  createdBy: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const ContextDetailSchema = ContextSummarySchema.extend({
  content: z.string(),
  contentTotalChars: z.number().int().nonnegative(),
  nextOffset: z.number().int().nonnegative().nullable(),
  metadata: ContextMetadataSchema.optional(),
});

export type CreateContextInput = z.infer<typeof CreateContextSchema>;
export type ContextSummary = z.infer<typeof ContextSummarySchema>;
export type ContextDetail = z.infer<typeof ContextDetailSchema>;
