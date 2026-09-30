import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link as RouterLink, RouterProvider } from 'react-router-dom';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { router } from './routes';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1 },
  },
});

// Astryx renders <a href>; map it onto react-router for client-side nav.
function AstryxRouterLink({ href, ...rest }: { href?: string } & Record<string, unknown>) {
  if (!href || href.startsWith('http') || href.startsWith('mailto:')) {
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    return <a href={href} {...rest} />;
  }
  return <RouterLink to={href} {...(rest as object)} />;
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing.');

createRoot(root).render(
  <StrictMode>
    <Theme theme={neutralTheme}>
      <LinkProvider component={AstryxRouterLink as never}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </LinkProvider>
    </Theme>
  </StrictMode>,
);
