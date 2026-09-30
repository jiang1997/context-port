import { z } from 'zod';
import { CreatorSchema, UUIDSchema } from './common.js';

export const CreateContextSchema = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().max(100_000).default(''),
}).extend(CreatorSchema.shape).strict();
export const CreateThreadSchema = CreateContextSchema;
export const ListContextsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();
const UpdateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  content: z.string().max(100_000).optional(),
  updatedByType: z.enum(['human', 'agent']),
  updatedBy: z.string().trim().min(1).max(200).nullable().optional(),
  expectedVersion: z.number().int().positive(),
}).strict().refine(data => data.title !== undefined || data.content !== undefined, {
  message: 'At least one of title or content must be provided.',
});
export const UpdateContextSchema = UpdateDocumentSchema;
export const UpdateThreadSchema = UpdateDocumentSchema;
export const DocumentSchema = z.object({
  id: UUIDSchema, title: z.string(), content: z.string(), version: z.number().int().positive(),
  createdByType: z.enum(['human', 'agent']), createdBy: z.string().nullable(),
  updatedByType: z.enum(['human', 'agent']), updatedBy: z.string().nullable(),
  createdAt: z.string(), updatedAt: z.string(), archivedAt: z.string().nullable(),
});
export const ThreadSchema = DocumentSchema.extend({ contextId: UUIDSchema });
export const ThreadSummarySchema = ThreadSchema.omit({ content: true });
export const ContextSummarySchema = DocumentSchema.omit({ content: true });
export const ContextDetailSchema = DocumentSchema.extend({ threads: z.array(ThreadSummarySchema) });
export type CreateContextInput = z.infer<typeof CreateContextSchema>;
export type CreateThreadInput = z.infer<typeof CreateThreadSchema>;
export type UpdateContextInput = z.infer<typeof UpdateContextSchema>;
export type UpdateThreadInput = z.infer<typeof UpdateThreadSchema>;
export type ContextSummary = z.infer<typeof ContextSummarySchema>;
export type ContextDetail = z.infer<typeof ContextDetailSchema>;
export type Thread = z.infer<typeof ThreadSchema>;
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;
