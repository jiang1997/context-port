import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './api/query-client';
import { RouterProvider } from 'react-router-dom';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { Analytics } from '@vercel/analytics/react';
import { I18nProvider } from './i18n';
import { router } from './routes';
import { AstryxRouterLink } from './components/astryx-router-link';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './styles.css';

const queryClient = createQueryClient();

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing.');

createRoot(root).render(
  <StrictMode>
    <Theme theme={neutralTheme}>
      <I18nProvider>
        <LinkProvider component={AstryxRouterLink as never}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </LinkProvider>
      </I18nProvider>
    </Theme>
    <Analytics />
  </StrictMode>,
);
