import { NavLink, Outlet, useLocation } from 'react-router-dom';

export default function InvoicesLayout() {
  const location = useLocation();
  const isDetailPage = /^\/manager\/invoices\/\d+$/.test(location.pathname);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `cursor-pointer rounded-[8px] px-4 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-[#ffffff] text-[#111111] shadow-sm'
        : 'text-[#6b7280] hover:text-[#111111]'
    }`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111111]">Factures</h1>

      {!isDetailPage && (
        <div className="inline-flex gap-1 rounded-[10px] bg-[#f3f4f6] p-1">
          <NavLink to="/manager/invoices" end className={tabClass}>
            Toutes les factures
          </NavLink>
          <NavLink to="/manager/invoices/partial-payments" className={tabClass}>
            Paiements partiels
          </NavLink>
        </div>
      )}

      <Outlet />
    </div>
  );
}
