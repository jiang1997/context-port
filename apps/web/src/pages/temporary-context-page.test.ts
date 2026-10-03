import { describe, expect, it } from 'vitest';
import {
  buildTemporaryContextAgentInstructions,
  buildTemporaryContextAgentGuide,
  buildClipboardAgentInstructions,
  buildClipboardAgentGuide,
} from './temporary-context-page';

describe('Temporary Context Agent Instructions & Guide', () => {
  const apiBase = 'https://api.example.com/api/v1';

  it('builds agent instructions using /temporary-contexts/ endpoints', () => {
    const text = buildTemporaryContextAgentInstructions('secret-passphrase-123', apiBase, '2026-10-08T00:00:00Z');
    expect(text).toContain('You have access to a shared Temporary Context.');
    expect(text).toContain('Passphrase: secret-passphrase-123');
    expect(text).toContain('Expires: 2026-10-08T00:00:00Z');
    expect(text).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/read"');
    expect(text).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/append"');
    expect(text).not.toContain('/clipboard/');

    // Backwards-compatible alias matches
    expect(buildClipboardAgentInstructions('secret-passphrase-123', apiBase, '2026-10-08T00:00:00Z')).toBe(text);
  });

  it('builds general agent guide using /temporary-contexts/ endpoints', () => {
    const guide = buildTemporaryContextAgentGuide(apiBase);
    expect(guide).toContain('Temporary Context lets any person or agent share short-lived text without login.');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/generate"');
    expect(guide).toContain('Or create / enter with your own passphrase (8-128 characters):');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/open"');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/read"');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/append"');
    expect(guide).not.toContain('/clipboard/');

    // Backwards-compatible alias matches
    expect(buildClipboardAgentGuide(apiBase)).toBe(guide);
  });

  it('localises the prose for Chinese while keeping curl commands intact', () => {
    const instructions = buildTemporaryContextAgentInstructions('secret-passphrase-123', apiBase, undefined, 'zh-CN');
    expect(instructions).toContain('你可以访问一个共享的临时 Context。');
    expect(instructions).toContain('Passphrase：secret-passphrase-123');
    expect(instructions).toContain(
      'curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/read"',
    );

    const guide = buildTemporaryContextAgentGuide(apiBase, 'zh-CN');
    expect(guide).toContain('临时 Context 让任何人或智能体无需登录即可共享短期文本。');
    expect(guide).toContain('curl -s -X POST "https://api.example.com/api/v1/temporary-contexts/generate"');
    // The literal JSON brace examples must survive interpolation untouched.
    expect(guide).toContain('{ passphrase, content, version, expiresAt }');
  });
});
