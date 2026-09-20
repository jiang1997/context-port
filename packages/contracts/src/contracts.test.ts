import { describe, expect, it } from 'vitest';
import { CreateContextSchema, TagNameSchema } from './index.js';

describe('shared contracts', () => {
  it('normalizes tag names', () => {
    expect(TagNameSchema.parse(' High-Priority ')).toBe('high-priority');
  });

  it('requires handoff contexts to be global', () => {
    const result = CreateContextSchema.safeParse({
      idempotencyKey: '2fcf603b-ad8b-4f1c-8553-d6a9547420d5',
      stageId: 'dcb3b4e6-9bdb-4504-8f2c-1b7c3ff2f475',
      expectedHandoffContextId: null,
      type: 'handoff',
      content: 'next step',
      createdByType: 'agent',
      createdBy: 'test-agent',
    });

    expect(result.success).toBe(false);
  });
});
