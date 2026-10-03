import { Selector } from '@astryxdesign/core/Selector';
import { isAppLocale, LOCALE_LABELS, SUPPORTED_LOCALES, useI18n } from '../i18n';

/**
 * Compact locale picker for the top navigation. Each language is listed in its
 * own language so it stays readable when the UI is in the other one.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <Selector
      label={t('@app.language.label')}
      isLabelHidden
      variant="ghost"
      size="sm"
      options={SUPPORTED_LOCALES.map(tag => ({ value: tag, label: LOCALE_LABELS[tag] }))}
      value={locale}
      onChange={value => {
        if (isAppLocale(value)) setLocale(value);
      }}
    />
  );
}
