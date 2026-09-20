import { z } from 'zod';
import { CreatorSchema, IdempotencyKeySchema, UUIDSchema } from './common.js';
import { ContextSummarySchema, InitialContextSchema } from './context.js';

export const CreateTaskSchema = z
  .object({
    idempotencyKey: IdempotencyKeySchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(20_000).nullable().optional(),
    initialContext: InitialContextSchema.optional(),
  })
  .extend(CreatorSchema.shape)
  .strict();

export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(20_000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

export const TaskSchema = z.object({
  id: UUIDSchema,
  title: z.string(),
  description: z.string().nullable(),
  handoffContextId: UUIDSchema.nullable(),
  createdByType: z.enum(['human', 'agent']),
  createdBy: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TaskDetailSchema = TaskSchema.extend({
  tags: z.array(z.string()),
  stages: z.array(
    z.object({
      id: UUIDSchema,
      title: z.string(),
      description: z.string().nullable(),
      position: z.number().int().nonnegative(),
    }),
  ),
  handoff: ContextSummarySchema.nullable(),
  contextCount: z.number().int().nonnegative(),
  contextsAfterHandoffCount: z.number().int().nonnegative().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskDetail = z.infer<typeof TaskDetailSchema>;
