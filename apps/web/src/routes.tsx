import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { ContextEditorPage } from './pages/context-editor-page';
import { ContextListPage } from './pages/context-list-page';

function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Layout><ContextListPage /></Layout> },
  { path: '/contexts/new', element: <Layout><ContextEditorPage /></Layout> },
  { path: '/contexts/:contextId', element: <Layout><ContextEditorPage /></Layout> },
]);
