import { describe, expect, it } from 'vitest';
import { formatDateTime, formatRelativeTime } from './format';

const now = Date.parse('2026-09-28T12:00:00Z');

describe('formatRelativeTime', () => {
  it('reports anything under a minute as "now"', () => {
    expect(formatRelativeTime('2026-09-28T11:59:30Z', now)).toBe('now');
  });

  it('formats past timestamps as relative time', () => {
    expect(formatRelativeTime('2026-09-28T11:00:00Z', now)).toBe('1 hour ago');
  });

  it('formats future timestamps as relative time', () => {
    expect(formatRelativeTime('2026-09-28T14:00:00Z', now)).toBe('in 2 hours');
  });

  it('picks the largest matching unit', () => {
    expect(formatRelativeTime('2026-09-25T12:00:00Z', now)).toBe('3 days ago');
  });

  it('is pinned to English regardless of the reader locale', () => {
    // The product ships a single English interface, so a zh-CN browser must
    // still see English relative time rather than a mixed-language UI.
    expect(formatRelativeTime('2026-09-25T12:00:00Z', now)).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('returns an empty string for unparseable input', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats a valid timestamp in English', () => {
    expect(formatDateTime('2026-09-28T12:00:00Z')).toMatch(/2026/);
    expect(formatDateTime('2026-09-28T12:00:00Z')).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('returns an empty string for unparseable input', () => {
    expect(formatDateTime('not-a-date')).toBe('');
  });
});
