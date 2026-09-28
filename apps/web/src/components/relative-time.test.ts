import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relative-time';

const now = Date.parse('2026-09-28T12:00:00Z');

describe('formatRelativeTime', () => {
  it('reports anything under a minute as "just now"', () => {
    expect(formatRelativeTime('2026-09-28T11:59:30Z', now)).toBe('刚刚');
  });

  it('formats past timestamps as relative time', () => {
    expect(formatRelativeTime('2026-09-28T11:00:00Z', now)).toBe('1小时前');
  });

  it('formats future timestamps as relative time', () => {
    expect(formatRelativeTime('2026-09-28T14:00:00Z', now)).toBe('2小时后');
  });

  it('picks the largest matching unit', () => {
    expect(formatRelativeTime('2026-09-25T12:00:00Z', now)).toBe('3天前');
  });

  it('returns an empty string for unparseable input', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
