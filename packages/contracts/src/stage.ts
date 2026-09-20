import { z } from 'zod';
import { UUIDSchema } from './common.js';

export const CreateStageSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(20_000).nullable().optional(),
  })
  .strict();

export const UpdateStageSchema = CreateStageSchema.partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  });

export const ReorderStagesSchema = z
  .object({ stageIds: z.array(UUIDSchema) })
  .strict()
  .refine((value) => new Set(value.stageIds).size === value.stageIds.length, {
    path: ['stageIds'],
    message: 'Stage IDs must be unique.',
  });

export type CreateStageInput = z.infer<typeof CreateStageSchema>;
export type UpdateStageInput = z.infer<typeof UpdateStageSchema>;
export type ReorderStagesInput = z.infer<typeof ReorderStagesSchema>;
