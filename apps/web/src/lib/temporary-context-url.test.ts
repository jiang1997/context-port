import { describe, expect, it } from 'vitest';
import { buildTemporaryContextShareUrl, readTemporaryContextPassphrase, temporaryContextHash } from './temporary-context-url';

describe('temporary context URLs', () => {
  it.each(['ordinary-phrase', '  中文 & # + / ? = %  ', 'a'.repeat(128)])('round-trips the exact credential: %s', phrase => {
    const url = new URL(buildTemporaryContextShareUrl('https://example.com/clipboard?lang=zh-CN', phrase));
    expect(readTemporaryContextPassphrase(url.hash)).toBe(phrase);
    expect(url.pathname).toBe('/clipboard');
    expect(url.search).toBe('?lang=zh-CN');
    expect(url.searchParams.has('passphrase')).toBe(false);
  });

  it('distinguishes missing credentials from invalid empty credentials', () => {
    expect(readTemporaryContextPassphrase('')).toBeNull();
    expect(readTemporaryContextPassphrase('#other=value')).toBeNull();
    expect(readTemporaryContextPassphrase('#passphrase=')).toBe('');
  });

  it('updates and removes the credential while retaining other fragment parameters', () => {
    const hash = temporaryContextHash('#other=value&passphrase=old-phrase', 'new-phrase');
    expect(readTemporaryContextPassphrase(hash)).toBe('new-phrase');
    expect(temporaryContextHash(hash, null)).toBe('#other=value');
    expect(temporaryContextHash('#passphrase=old-phrase', null)).toBe('');
  });
});
