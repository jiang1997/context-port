import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { TaskCreatePage } from './pages/task-create-page';
import { TaskDetailPage } from './pages/task-detail-page';
import { TaskListPage } from './pages/task-list-page';

function Layout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Layout><TaskListPage /></Layout> },
  { path: '/tasks/new', element: <Layout><TaskCreatePage /></Layout> },
  { path: '/tasks/:taskId', element: <Layout><TaskDetailPage /></Layout> },
]);
