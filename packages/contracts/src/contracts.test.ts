import { describe, expect, it } from 'vitest';
import { CreateContextSchema, CreateThreadSchema, ListContextsSchema, PassphraseSchema, TemporaryContextUpdateSchema, UpdateContextSchema } from './index.js';
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
  it('requires expectedVersion and at least one editable field for updates', () => {
    const base = { updatedByType: 'human', expectedVersion: 1 } as const;
    expect(UpdateContextSchema.safeParse({ ...base }).success).toBe(false);
    expect(UpdateContextSchema.safeParse({ ...base, expectedVersion: 0 }).success).toBe(false);
    expect(UpdateContextSchema.parse({ ...base, title: 'New' })).toMatchObject({ title: 'New', expectedVersion: 1 });
    expect(UpdateContextSchema.safeParse({ ...base, title: 'New', version: 2 }).success).toBe(false);
  });
  it('validates temporary context passphrases (8-128 chars)', () => {
    expect(PassphraseSchema.safeParse('1234567').success).toBe(false);
    expect(PassphraseSchema.safeParse('12345678').success).toBe(true);
    expect(PassphraseSchema.safeParse('a'.repeat(8)).success).toBe(true);
    expect(PassphraseSchema.safeParse('a'.repeat(128)).success).toBe(true);
    expect(PassphraseSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });
  it('allows replacing or clearing temporary content only with a valid version', () => {
    const base = { passphrase: 'example-passphrase', content: '', expectedVersion: 1 };
    expect(TemporaryContextUpdateSchema.parse(base)).toEqual(base);
    expect(TemporaryContextUpdateSchema.safeParse({ ...base, content: 'x'.repeat(100_000) }).success).toBe(true);
    expect(TemporaryContextUpdateSchema.safeParse({ ...base, content: 'x'.repeat(100_001) }).success).toBe(false);
    for (const expectedVersion of [undefined, 0, -1, 1.5]) {
      expect(TemporaryContextUpdateSchema.safeParse({ ...base, expectedVersion }).success).toBe(false);
    }
    expect(TemporaryContextUpdateSchema.safeParse({ ...base, version: 2 }).success).toBe(false);
  });
});
