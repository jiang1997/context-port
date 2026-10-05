import { Link as RouterLink } from 'react-router-dom';

// API links must reach the server (OAuth starts with an HTTP redirect).
// Only application pages should use client-side navigation.
export function AstryxRouterLink({ href, ...rest }: { href?: string } & Record<string, unknown>) {
  if (!href || href.startsWith('http') || href.startsWith('mailto:') || /^\/api(?:\/|[?#]|$)/.test(href)) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a href={href} {...rest} />;
  }
  return <RouterLink to={href} {...(rest as object)} />;
}
