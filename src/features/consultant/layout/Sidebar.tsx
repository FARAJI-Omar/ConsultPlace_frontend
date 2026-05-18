import { NavLink } from 'react-router-dom';
import smallLogo from '../../../assets/small_logo.png';
import {
  LayoutDashboard,
  Briefcase,
  Clock,
  FileText,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavGroupItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavGroupItem[];
}

interface NavLeaf {
  label: string;
  path: string;
  icon: LucideIcon;
}

type NavItem = NavLeaf | NavGroup;

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', path: '/consultant', icon: LayoutDashboard },
  { label: 'Mes missions', path: '/consultant/missions', icon: Briefcase },
  {
    label: 'Relevés Mensuels',
    icon: Clock,
    children: [
      { label: 'Tous les relevés', path: '/consultant/timesheets', icon: FileText },
      { label: 'Brouillons', path: '/consultant/timesheets/drafts', icon: FileText },
    ],
  },
  { label: 'Profil', path: '/consultant/profile', icon: User },
];

function isNavLeaf(item: NavItem): item is NavLeaf {
  return 'path' in item;
}

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const [expandedGroup, setExpandedGroup] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-colors whitespace-nowrap cursor-pointer ${
      isActive
        ? 'bg-primary-blue text-[#ffffff]'
        : 'text-[#6b7280] hover:bg-light-blue hover:text-[#111111]'
    }`;

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
          {!collapsed && <img src={smallLogo} alt="ConsultPlace" className="h-26 w-38" />}
          <button
            onClick={() => { onClose(); }}
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
            if ('children' in item && item.children) {
              if (collapsed) {
                return (
                  <div key={item.label} className="relative group">
                    <span className="flex items-center justify-center rounded-[8px] px-3 py-2 text-[#6b7280] hover:bg-[#f3f4f6] cursor-default">
                      <item.icon className="h-5 w-5 shrink-0" />
                    </span>
                    <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-50">
                      <div className="bg-[#111111] text-[#ffffff] text-xs rounded-[6px] px-2 py-1 whitespace-nowrap">
                        {item.label}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => setExpandedGroup(!expandedGroup)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111111] transition-colors"
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {expandedGroup ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedGroup && (
                    <div className="ml-4 space-y-1 border-l border-[#e5e7eb] pl-3">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end
                          className={linkClass}
                          onClick={onClose}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            if (!isNavLeaf(item)) return null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/consultant'}
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
