import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { LoginResultNotice } from './feedback';

const location = vi.hoisted(() => ({ search: '' }));
vi.mock('react-router-dom', () => ({ useLocation: () => location }));

describe('login result feedback', () => {
  it.each([
    ['?login=failed', 'Sign-in failed. Please try again.'],
    ['?login=denied', 'Google sign-in was cancelled. You can try again.'],
  ])('shows feedback for %s', (search, message) => {
    location.search = search;
    expect(renderToStaticMarkup(<I18nProvider><LoginResultNotice /></I18nProvider>)).toContain(message);
  });

  it.each(['', '?login=unknown'])('shows no login error for %s', search => {
    location.search = search;
    expect(renderToStaticMarkup(<I18nProvider><LoginResultNotice /></I18nProvider>)).toBe('');
  });
});
