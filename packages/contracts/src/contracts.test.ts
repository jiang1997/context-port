import { describe, expect, it } from 'vitest';
import { CreateContextSchema, CreateThreadSchema, ListContextsSchema } from './index.js';
describe('MVP document contracts', () => {
  it('accepts human and agent documents and preserves Markdown whitespace', () => {
    for (const createdByType of ['human', 'agent']) {
      expect(CreateContextSchema.parse({ title: ' Title ', content: '  code\n', createdByType })).toEqual({ title: 'Title', content: '  code\n', createdByType });
    }
  });
  it('rejects blank titles, oversized bodies and injected versions', () => {
    const valid = { title: 'Title', createdByType: 'human' };
    expect(CreateThreadSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false);
    expect(CreateContextSchema.safeParse({ ...valid, content: 'x'.repeat(100001) }).success).toBe(false);
    expect(CreateContextSchema.safeParse({ ...valid, version: 8 }).success).toBe(false);
  });
  it('bounds pagination', () => {
    expect(ListContextsSchema.parse({})).toEqual({ limit: 50, offset: 0 });
    expect(ListContextsSchema.safeParse({ limit: 10000 }).success).toBe(false);
  });
});
