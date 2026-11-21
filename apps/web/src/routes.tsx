import { createBrowserRouter } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Layout as PageLayout } from '@astryxdesign/core/Layout';
import { AppShell } from './components/app-shell';
import { ContextListPage, ContextCreatePage, ContextDetailPage, ThreadDetailPage } from './pages/context-pages';
import { KeysPage } from './pages/keys-page';
import { TemporaryContextPage } from './pages/temporary-context-page';
import { restoreLoginFragment } from './api/auth';
import { AccountAccess } from './components/account-access';
import { useI18n } from './i18n';
function Layout({ children }: { children: React.ReactNode }) { return <AppShell>{children}</AppShell>; }
function NotFoundPage() {
  const { t } = useI18n();
  return <PageLayout height="auto" contentWidth={1120} content={
    <EmptyState title={t('@app.notFound.title')} description={t('@app.notFound.description')}
      actions={<Button label={t('@app.notFound.home')} href="/" variant="primary" />} />
  } />;
}
restoreLoginFragment();
export const router = createBrowserRouter([
  { path: '/', element: <Layout><TemporaryContextPage /></Layout> },
  { path: '/contexts', element: <Layout><AccountAccess><ContextListPage /></AccountAccess></Layout> },
  { path: '/contexts/new', element: <Layout><AccountAccess><ContextCreatePage /></AccountAccess></Layout> },
  { path: '/contexts/:contextId', element: <Layout><AccountAccess><ContextDetailPage /></AccountAccess></Layout> },
  { path: '/contexts/:contextId/threads/:threadId', element: <Layout><AccountAccess><ThreadDetailPage /></AccountAccess></Layout> },
  { path: '/keys', element: <Layout><AccountAccess><KeysPage /></AccountAccess></Layout> },
  // Legacy alias: Temporary Context used to live at /clipboard.
  { path: '/clipboard', element: <Layout><TemporaryContextPage /></Layout> },
  { path: '*', element: <Layout><NotFoundPage /></Layout> },
]);
