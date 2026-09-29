import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { ContextListPage, ContextCreatePage, ContextDetailPage, ThreadDetailPage } from './pages/context-pages';
import { KeysPage } from './pages/keys-page';
import { ClipboardPage } from './pages/clipboard-page';
function Layout({ children }: { children: React.ReactNode }) { return <AppShell>{children}</AppShell>; }
export const router = createBrowserRouter([
  { path: '/', element: <Layout><ContextListPage /></Layout> },
  { path: '/contexts/new', element: <Layout><ContextCreatePage /></Layout> },
  { path: '/contexts/:contextId', element: <Layout><ContextDetailPage /></Layout> },
  { path: '/contexts/:contextId/threads/:threadId', element: <Layout><ThreadDetailPage /></Layout> },
  { path: '/keys', element: <Layout><KeysPage /></Layout> },
  { path: '/clipboard', element: <Layout><ClipboardPage /></Layout> },
]);
