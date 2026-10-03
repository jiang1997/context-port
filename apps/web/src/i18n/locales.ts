/**
 * Supported UI locales and locale detection / persistence.
 *
 * The product ships exactly two locales, English and Simplified Chinese. Add a
 * tag here *and* an entry in `./catalog.ts` to introduce another one; the
 * catalog type makes a missing translation a compile error.
 */
export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

/** localStorage key holding the reader's explicit choice. */
const STORAGE_KEY = 'contextport.locale';

/** Names shown in the language switcher, always written in their own language. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  'zh-CN': '中文',
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function readStoredLocale(): AppLocale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAppLocale(stored) ? stored : null;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return null;
  }
}

/** Persist the explicit choice so it survives reloads. Never throws. */
export function storeLocale(locale: AppLocale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The in-memory locale still applies for this session.
  }
}

/**
 * Resolve the initial locale: an explicit stored choice wins, otherwise follow
 * the browser's language preferences. Only `en` and `zh*` are recognised;
 * anything else falls back to English.
 */
export function detectLocale(): AppLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const stored = readStoredLocale();
  if (stored) return stored;

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of candidates) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('zh')) return 'zh-CN';
    if (lower.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}
