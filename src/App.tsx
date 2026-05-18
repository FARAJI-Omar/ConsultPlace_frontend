import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Login from './features/auth/Login';
import GuestGuard from './components/common/Guards/GuestGuard';
import AdminRoute from './components/common/Guards/AdminRoute';
import ManagerRoute from './components/common/Guards/ManagerRoute';
import ConsultantRoute from './components/common/Guards/ConsultantRoute';
import AdminLayout from './components/layout/AdminLayout';
import DashboardPage from './features/admin/dashboard/DashboardPage';
import ClientsPage from './features/admin/clients/ClientsPage';
import ConsultantsPage from './features/admin/consultants/ConsultantsPage';
import ContractsPage from './features/admin/contracts/ContractsPage';
import ContractDetailsPage from './features/admin/contracts/ContractDetailsPage';
import MissionsPage from './features/admin/missions/MissionsPage';
import MissionDetailsPage from './features/admin/missions/MissionDetailsPage';
import GestionnairesPage from './features/admin/system/GestionnairesPage';
import AlertRulesPage from './features/admin/system/AlertRulesPage';
import AuditLogPage from './features/admin/system/AuditLogPage';
import ManagerDashboard from './pages/ManagerDashboard';
import ConsultantLayout from './features/consultant/layout/ConsultantLayout';
import ConsultantDashboard from './features/consultant/dashboard/ConsultantDashboard';
import ProfilePage from './features/consultant/profile/ProfilePage';
import ConsultantMissionsPage from './features/consultant/missions/MissionsPage';
import ConsultantMissionDetailsPage from './features/consultant/missions/MissionDetailsPage';
import TimesheetsPage from './features/consultant/timesheets/TimesheetsPage';
import DraftsPage from './features/consultant/timesheets/DraftsPage';
import PaymentsHistoryPage from './features/consultant/payments/PaymentsHistoryPage';
import RootRedirect from './pages/RootRedirect';
import NotFoundPage from './pages/NotFoundPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <GuestGuard><Login /></GuestGuard>,
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
          { path: 'contracts', element: <ContractsPage /> },
          { path: 'contracts/:id', element: <ContractDetailsPage /> },
          { path: 'missions', element: <MissionsPage /> },
          { path: 'missions/:id', element: <MissionDetailsPage /> },
          { path: 'gestionnaires', element: <GestionnairesPage /> },
          { path: 'alertrules', element: <AlertRulesPage /> },
          { path: 'auditlog', element: <AuditLogPage /> },
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
      {
        element: <ConsultantLayout />,
        children: [
          { index: true, element: <ConsultantDashboard /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'missions', element: <ConsultantMissionsPage /> },
          { path: 'missions/:id', element: <ConsultantMissionDetailsPage /> },
          { path: 'timesheets', element: <TimesheetsPage /> },
          { path: 'timesheets/drafts', element: <DraftsPage /> },
          { path: 'timesheets/create', element: <div className="text-[#6b7280]">Nouveau relevé mensuel (à venir)</div> },
          { path: 'payments', element: <PaymentsHistoryPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
