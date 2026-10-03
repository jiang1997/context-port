import { describe, expect, it } from 'vitest';
import { formatDateTime, formatRelativeTime } from './format';

const now = Date.parse('2026-09-28T12:00:00Z');

describe('formatRelativeTime', () => {
  it('reports anything under a minute as "now"', () => {
    expect(formatRelativeTime('2026-09-28T11:59:30Z', 'en', now)).toBe('now');
  });

  it('formats past timestamps as relative time', () => {
    expect(formatRelativeTime('2026-09-28T11:00:00Z', 'en', now)).toBe('1 hour ago');
  });

  it('formats future timestamps as relative time', () => {
    expect(formatRelativeTime('2026-09-28T14:00:00Z', 'en', now)).toBe('in 2 hours');
  });

  it('picks the largest matching unit', () => {
    expect(formatRelativeTime('2026-09-25T12:00:00Z', 'en', now)).toBe('3 days ago');
  });

  it('follows the requested locale', () => {
    expect(formatRelativeTime('2026-09-25T12:00:00Z', 'zh-CN', now)).toMatch(/[\u4e00-\u9fff]/);
  });

  it('returns an empty string for unparseable input', () => {
    expect(formatRelativeTime('not-a-date', 'en', now)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats a valid timestamp in English', () => {
    expect(formatDateTime('2026-09-28T12:00:00Z', 'en')).toMatch(/2026/);
    expect(formatDateTime('2026-09-28T12:00:00Z', 'en')).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('formats a valid timestamp in the requested locale', () => {
    const english = formatDateTime('2026-09-28T12:00:00Z', 'en');
    const chinese = formatDateTime('2026-09-28T12:00:00Z', 'zh-CN');
    expect(chinese).toMatch(/2026/);
    // zh-CN renders an unambiguous year-first numeric form (2026/9/28 …),
    // distinct from the English month-first one.
    expect(chinese).not.toBe(english);
  });

  it('returns an empty string for unparseable input', () => {
    expect(formatDateTime('not-a-date', 'en')).toBe('');
  });
});
