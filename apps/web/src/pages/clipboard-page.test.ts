import { describe, expect, it } from 'vitest';
import { buildClipboardAgentInstructions, buildClipboardAgentGuide } from './clipboard-page';

describe('Temporary Context Agent Instructions & Guide', () => {
  const apiBase = 'https://api.example.com/api/v1';

  it('builds agent instructions using /temporary-contexts/ endpoints', () => {
    const text = buildClipboardAgentInstructions('secret-passphrase-123', apiBase, '2026-10-08T00:00:00Z');
    expect(text).toContain('You have access to a shared Temporary Context.');
    expect(text).toContain('Passphrase: secret-passphrase-123');
    expect(text).toContain('Expires: 2026-10-08T00:00:00Z');
    expect(text).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/read"');
    expect(text).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/append"');
    expect(text).not.toContain('/clipboard/');
  });

  it('builds general agent guide using /temporary-contexts/ endpoints', () => {
    const guide = buildClipboardAgentGuide(apiBase);
    expect(guide).toContain('Temporary Context lets any person or agent share short-lived text without login.');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/generate"');
    expect(guide).toContain('Or create / enter with your own passphrase (8-128 characters):');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/open"');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/read"');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/append"');
    expect(guide).not.toContain('/clipboard/');
  });
});
