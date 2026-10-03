import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import { providerMessages, translate, type AppMessageKey } from './catalog';
import { detectLocale, storeLocale, type AppLocale } from './locales';

export interface I18nContextValue {
  /** Active locale. */
  locale: AppLocale;
  /** Switch locale; persisted across reloads. */
  setLocale: (locale: AppLocale) => void;
  /** Translate an application message key, interpolating `{name}` values. */
  t: (key: AppMessageKey, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Owns the active locale and feeds it to both the app translator and Astryx's
 * `InternationalizationProvider` (so built-in component strings localise too).
 * The document `lang` attribute tracks the choice for assistive tech and CSS.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => detectLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
    // Keep the document metadata in step with the UI language. index.html ships
    // the English default so there is no empty description before hydration.
    document.querySelector('meta[name="description"]')?.setAttribute('content', translate(locale, '@app.meta.description'));
  }, [locale]);

  const setLocale = useCallback((next: AppLocale) => {
    // Persist only an explicit choice. Auto-detected locales are intentionally
    // not stored, so a later browser-language change is picked up on reload
    // until the reader actually picks a language.
    storeLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale, setLocale],
  );

  return (
    <InternationalizationProvider locale={locale} messages={providerMessages}>
      <I18nContext value={value}>{children}</I18nContext>
    </InternationalizationProvider>
  );
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>.');
  return value;
}
