import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@astryxdesign/core/Button';
import { LinkProvider } from '@astryxdesign/core/Link';
import { describe, expect, it, vi } from 'vitest';
import { googleLoginUrl } from '../api/auth';
import { AstryxRouterLink } from './astryx-router-link';

vi.mock('react-router-dom', () => ({
  Link: ({ to, ...props }: { to: string }) => <a href={to} data-client-navigation="true" {...props} />,
}));

describe('Astryx router link', () => {
  it('keeps the design-system login button out of client-side routing', () => {
    const markup = renderToStaticMarkup(
      <LinkProvider component={AstryxRouterLink as never}>
        <Button label="登录" href={googleLoginUrl('/contexts')} />
      </LinkProvider>,
    );
    expect(markup).toContain('href="/api/v1/auth/google/start?redirect=%2Fcontexts"');
    expect(markup).not.toContain('data-client-navigation');
  });

  it('sends the Google login link to the server and preserves the return path', () => {
    const markup = renderToStaticMarkup(
      <AstryxRouterLink href={googleLoginUrl('/contexts')} className="login">登录</AstryxRouterLink>,
    );
    expect(markup).toBe('<a href="/api/v1/auth/google/start?redirect=%2Fcontexts" class="login">登录</a>');
  });

  it.each(['/contexts', '/keys', '/api-reference'])('keeps client navigation for the page %s', href => {
    const markup = renderToStaticMarkup(<AstryxRouterLink href={href}>页面</AstryxRouterLink>);
    expect(markup).toContain('data-client-navigation="true"');
  });

  it.each(['/api', '/api?check=1', '/api/v1/auth/google/callback', 'https://example.com', 'mailto:test@example.com'])(
    'uses browser navigation for %s', href => {
      const markup = renderToStaticMarkup(<AstryxRouterLink href={href}>链接</AstryxRouterLink>);
      expect(markup).not.toContain('data-client-navigation');
      expect(markup).toContain(`href="${href}"`);
    },
  );
});
