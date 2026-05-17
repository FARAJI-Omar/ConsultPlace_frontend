import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './features/auth/Login';
import AdminRoute from './components/common/Guards/AdminRoute';
import ManagerRoute from './components/common/Guards/ManagerRoute';
import ConsultantRoute from './components/common/Guards/ConsultantRoute';
import AdminLayout from './components/layout/AdminLayout';
import DashboardPage from './features/admin/dashboard/DashboardPage';
import ClientsPage from './features/admin/clients/ClientsPage';
import ConsultantsPage from './features/admin/consultants/ConsultantsPage';
import ManagerDashboard from './pages/ManagerDashboard';
import ConsultantDashboard from './pages/ConsultantDashboard';
import RootRedirect from './pages/RootRedirect';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/admin',
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'clients', element: <ClientsPage /> },
          { path: 'consultants', element: <ConsultantsPage /> },
        ],
      },
    ],
  },
  {
    path: '/manager',
    element: <ManagerRoute />,
    children: [
      { index: true, element: <ManagerDashboard /> },
    ],
  },
  {
    path: '/consultant',
    element: <ConsultantRoute />,
    children: [
      { index: true, element: <ConsultantDashboard /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
