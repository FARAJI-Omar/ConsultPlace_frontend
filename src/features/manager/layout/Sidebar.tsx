import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import smallLogo from '../../../assets/small_logo.png';
import collapsedLogo from '../../../assets/collapsed_logo.png';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Wallet,
  Bell,
  Activity,
  TrendingUp,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavLeaf {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface NavChild {
  label: string;
  path: string;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavChild[];
}

type NavItem = NavLeaf | NavGroup;

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/manager', icon: LayoutDashboard },
  {
    label: 'Alertes',
    icon: Bell,
    children: [
      { label: 'Alertes', path: '/manager/alerts' },
      { label: "Règles d'alerte", path: '/manager/alertrules' },
    ],
  },
  { label: 'Relevés ', path: '/manager/timesheets', icon: FileText },
  { label: 'Factures', path: '/manager/invoices', icon: Receipt },
  { label: 'Paiements consultants', path: '/manager/payouts', icon: Wallet },
  { label: 'Suivi Global', path: '/manager/tracking', icon: Activity },
  { label: 'Prévisions et Rentabilité ', path: '/manager/forecasts', icon: TrendingUp },
];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Alertes']);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-colors whitespace-nowrap cursor-pointer ${
      isActive
        ? 'bg-primary-blue text-[#ffffff]'
        : 'text-[#6b7280] hover:bg-light-blue hover:text-[#111111]'
    }`;

  const childLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-[8px] px-3 py-1.5 text-sm transition-colors cursor-pointer ${
      isActive
        ? 'bg-primary-blue text-[#ffffff]'
        : 'text-[#6b7280] hover:bg-light-blue hover:text-[#111111]'
    }`;

  const isGroup = (item: NavItem): item is NavGroup => 'children' in item;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-[#ffffff] border-r border-[#e5e7eb] transition-all duration-200 flex flex-col ${
          collapsed ? 'w-16' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:sticky lg:translate-x-0`}
      >
        <div className={`flex h-16 items-center border-b border-[#e5e7eb] shrink-0 ${collapsed ? 'justify-center px-0' : 'justify-between px-4 pt-2'}`}>
          {collapsed ? <img src={collapsedLogo} alt="ConsultPlace" className="h-8 w-8" /> : <img src={smallLogo} alt="ConsultPlace" className="h-26 w-38" />}
          <button
            onClick={onClose}
            className={`cursor-pointer rounded p-1 text-[#6b7280] hover:bg-[#f3f4f6] lg:hidden ${collapsed ? 'mx-auto' : ''}`}
            aria-label="Fermer le menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            if (isGroup(item)) {
              const isExpanded = expandedGroups.includes(item.label);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => { if (!collapsed) toggleGroup(item.label); }}
                    className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-sm text-[#6b7280] transition-colors hover:bg-light-blue hover:text-[#111111] cursor-pointer"
                    title={collapsed ? item.label : undefined}
                  >
                    <div className={collapsed ? 'mx-auto' : ''}>
                      <item.icon className="h-5 w-5 shrink-0" />
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </>
                    )}
                  </button>
                  {!collapsed && isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
                          className={childLinkClass}
                          onClick={onClose}
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/manager'}
                className={linkClass}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
              >
                <div className={collapsed ? 'mx-auto' : ''}>
                  <item.icon className="h-5 w-5 shrink-0" />
                </div>
                {!collapsed && item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className={`shrink-0 border-t border-[#e5e7eb] p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 text-sm text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111111] transition-colors w-full"
            aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0 mx-auto" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 shrink-0" />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
