import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './features/auth/Login';
import AdminRoute from './components/common/Guards/AdminRoute';
import ManagerRoute from './components/common/Guards/ManagerRoute';
import ConsultantRoute from './components/common/Guards/ConsultantRoute';
import AdminDashboard from './pages/AdminDashboard';
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
      { index: true, element: <AdminDashboard /> },
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
