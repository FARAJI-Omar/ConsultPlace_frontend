import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import Login from './features/auth/Login';
import CompleteRegistrationPage from './features/auth/CompleteRegistrationPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import GuestGuard from './components/common/Guards/GuestGuard';
import AdminRoute from './components/common/Guards/AdminRoute';
import ManagerRoute from './components/common/Guards/ManagerRoute';
import ConsultantRoute from './components/common/Guards/ConsultantRoute';
import AdminLayout from './components/layout/AdminLayout';
import DashboardPage from './features/admin/dashboard/DashboardPage';
import ClientsPage from './features/admin/clients/ClientsPage';
import ClientDetailPage from './features/admin/clients/ClientDetailPage';
import ArchivedClientsPage from './features/admin/clients/ArchivedClientsPage';
import ConsultantsPage from './features/admin/consultants/ConsultantsPage';
import ContractsPage from './features/admin/contracts/ContractsPage';
import ContractDetailsPage from './features/admin/contracts/ContractDetailsPage';
import ArchivedContractsPage from './features/admin/contracts/ArchivedContractsPage';
import MissionsPage from './features/admin/missions/MissionsPage';
import MissionDetailsPage from './features/admin/missions/MissionDetailsPage';
import BdcPage from './features/admin/bdc/BdcPage';
import BdcDetailPage from './features/admin/bdc/BdcDetailPage';
import GestionnairesPage from './features/admin/system/GestionnairesPage';
import AlertRulesPage from './features/admin/system/AlertRulesPage';
import AuditLogPage from './features/admin/system/AuditLogPage';
import ManagerDashboard from './features/manager/dashboard/ManagerDashboard';
import AlertCenterPage from './features/manager/dashboard/AlertCenterPage';
import ManagerAlertRulesPage from './features/manager/alertRules/AlertRulesPage';
import PendingCrasPage from './features/manager/timesheets/PendingCrasPage';
import TimesheetDetailsPage from './features/manager/timesheets/TimesheetDetailsPage';
import InvoicesLayout from './features/manager/invoices/InvoicesLayout';
import AllInvoicesPage from './features/manager/invoices/AllInvoicesPage';
import InvoiceDetailsPage from './features/manager/invoices/InvoiceDetailsPage';
import PartialPaymentsPage from './features/manager/invoices/PartialPaymentsPage';
import PayoutTrackingPage from './features/manager/payouts/PayoutTrackingPage';
import GlobalTrackingPage from './features/manager/tracking/GlobalTrackingPage';
import ForecastsPage from './features/manager/tracking/ForecastsPage';
import ManagerBdcPage from './features/manager/bdc/ManagerBdcPage';
import ManagerBdcDetailPage from './features/manager/bdc/ManagerBdcDetailPage';
import ManagerLayout from './features/manager/layout/ManagerLayout';
import ConsultantLayout from './features/consultant/layout/ConsultantLayout';
import ConsultantDashboard from './features/consultant/dashboard/ConsultantDashboard';
import ProfilePage from './features/consultant/profile/ProfilePage';
import ConsultantMissionsPage from './features/consultant/missions/MissionsPage';
import ConsultantMissionDetailsPage from './features/consultant/missions/MissionDetailsPage';
import TimesheetsPage from './features/consultant/timesheets/TimesheetsPage';
import TimesheetDetailPage from './features/consultant/timesheets/TimesheetDetailPage';
import DraftsPage from './features/consultant/timesheets/DraftsPage';
import RejectedPage from './features/consultant/timesheets/RejectedPage';
import CreateCraPage from './features/consultant/timesheets/CreateCraPage';
import PaymentsHistoryPage from './features/consultant/payments/PaymentsHistoryPage';
import RootRedirect from './pages/RootRedirect';
import NotFoundPage from './pages/NotFoundPage';
import { useVersionCheck } from './hooks/useVersionCheck';

function VersionCheckLayout() {
  useVersionCheck();
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <VersionCheckLayout />,
    children: [
      {
        path: '/',
        element: <RootRedirect />,
      },
      {
        path: '/login',
        element: <GuestGuard><Login /></GuestGuard>,
      },
      {
        path: '/complete-registration',
        element: <CompleteRegistrationPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
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
              { path: 'clients/archived', element: <ArchivedClientsPage /> },
              { path: 'clients/:id', element: <ClientDetailPage /> },
              { path: 'consultants', element: <ConsultantsPage /> },
              { path: 'contracts', element: <ContractsPage /> },
              { path: 'contracts/archived', element: <ArchivedContractsPage /> },
              { path: 'contracts/:id', element: <ContractDetailsPage /> },
              { path: 'missions', element: <MissionsPage /> },
              { path: 'missions/:id', element: <MissionDetailsPage /> },
              { path: 'bons-de-commande', element: <BdcPage /> },
              { path: 'bons-de-commande/:id', element: <BdcDetailPage /> },
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
          {
            element: <ManagerLayout />,
            children: [
              { index: true, element: <ManagerDashboard /> },
              { path: 'alerts', element: <AlertCenterPage /> },
              { path: 'alertrules', element: <ManagerAlertRulesPage /> },
              { path: 'timesheets', element: <PendingCrasPage /> },
              { path: 'timesheets/:id', element: <TimesheetDetailsPage /> },
              {
                path: 'invoices',
                element: <InvoicesLayout />,
                children: [
                  { index: true, element: <AllInvoicesPage /> },
                  { path: ':id', element: <InvoiceDetailsPage /> },
                  { path: 'partial-payments', element: <PartialPaymentsPage /> },
                ],
              },
              { path: 'payouts', element: <PayoutTrackingPage /> },
              { path: 'bons-de-commande', element: <ManagerBdcPage /> },
              { path: 'bons-de-commande/:id', element: <ManagerBdcDetailPage /> },
              { path: 'tracking', element: <GlobalTrackingPage /> },
              { path: 'forecasts', element: <ForecastsPage /> },
            ],
          },
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
              { path: 'timesheets/:id', element: <TimesheetDetailPage /> },
              { path: 'timesheets/drafts', element: <DraftsPage /> },
              { path: 'timesheets/rejected', element: <RejectedPage /> },
              { path: 'timesheets/new', element: <CreateCraPage /> },
              { path: 'payments', element: <PaymentsHistoryPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
