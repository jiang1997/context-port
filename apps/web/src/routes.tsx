import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { ContextListPage, ContextCreatePage, ContextDetailPage, ThreadDetailPage } from './pages/context-pages';
import { KeysPage } from './pages/keys-page';
import { TemporaryContextPage } from './pages/temporary-context-page';
import { restoreLoginFragment } from './api/auth';
import { AccountAccess } from './components/account-access';
function Layout({ children }: { children: React.ReactNode }) { return <AppShell>{children}</AppShell>; }
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
]);
