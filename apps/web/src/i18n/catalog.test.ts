import { describe, expect, it } from 'vitest';
import { catalogs, enCatalog, translate } from './catalog';
import { detectLocale, isAppLocale, DEFAULT_LOCALE } from './locales';

describe('translate', () => {
  it('returns the English message by default', () => {
    expect(translate('en', '@app.common.copied')).toBe('Copied');
  });

  it('returns the Chinese message for zh-CN', () => {
    expect(translate('zh-CN', '@app.common.copied')).toBe('已复制');
  });

  it('interpolates named values', () => {
    expect(translate('en', '@app.common.metaVersion', { author: 'Ada', version: 3 })).toBe('Ada · v3');
  });

  it('leaves unknown placeholders untouched', () => {
    // Agent notes embed literal JSON braces with spaces, which must survive.
    expect(translate('en', '@app.agent.instructions.note2')).toContain('{ content, version, expiresAt }');
  });

  it('ships every English key in the Chinese catalog', () => {
    for (const key of Object.keys(enCatalog)) {
      expect(catalogs['zh-CN'][key]?.defaultMessage, key).toBeTruthy();
    }
  });
});

describe('locale helpers', () => {
  it('recognises only supported tags', () => {
    expect(isAppLocale('en')).toBe(true);
    expect(isAppLocale('zh-CN')).toBe(true);
    expect(isAppLocale('fr')).toBe(false);
    expect(isAppLocale(undefined)).toBe(false);
  });

  it('falls back to English without a DOM', () => {
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
  });
});
