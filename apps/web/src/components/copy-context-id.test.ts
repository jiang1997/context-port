import { describe, expect, it } from 'vitest';
import { shortContextId } from './copy-context-id';

describe('copy-context-id', () => {
  it('shortens UUID to first 8 chars', () => {
    expect(shortContextId('ccbc10fd-bb38-48b7-ab7a-a813661cb6ab')).toBe('ccbc10fd…');
  });

  it('leaves short ids untouched', () => {
    expect(shortContextId('abc')).toBe('abc');
  });
});
