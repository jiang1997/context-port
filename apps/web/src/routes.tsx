import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { ContextListPage, ContextCreatePage, ContextDetailPage, ThreadDetailPage } from './pages/context-pages';
function Layout({ children }: { children: React.ReactNode }) { return <AppShell>{children}</AppShell>; }
export const router = createBrowserRouter([
  { path: '/', element: <Layout><ContextListPage /></Layout> },
  { path: '/contexts/new', element: <Layout><ContextCreatePage /></Layout> },
  { path: '/contexts/:contextId', element: <Layout><ContextDetailPage /></Layout> },
  { path: '/contexts/:contextId/threads/:threadId', element: <Layout><ThreadDetailPage /></Layout> },
]);
