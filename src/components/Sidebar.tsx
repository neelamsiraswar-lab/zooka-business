import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  TrendingDown,
  BookOpen,
  FileSpreadsheet,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  X,
  Database,
  ShieldCheck,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  FileCheck2,
  Landmark,
  Shield,
} from 'lucide-react';
import { CompanyProfile } from '../types';
import { canAccessTab, ROLE_CONFIG, UserRole } from '../lib/permissions';

export type NavTab =
  | 'dashboard'
  | 'sales'
  | 'purchases'
  | 'payments'
  | 'cheques'
  | 'banking'
  | 'accounting'
  | 'invoices'
  | 'expenses'
  | 'ledgers'
  | 'inventory'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  company: CompanyProfile | null;
  user: any;
  profile: any;
  logout: () => void;
  salesCount?: number;
  purchasesCount?: number;
  paymentsCount?: number;
  chequesCount?: number;
  bankStatementsCount?: number;
  journalEntriesCount?: number;
  invoicesCount?: number;
  expensesCount?: number;
  partiesCount?: number;
  inventoryCount?: number;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  company,
  user,
  profile,
  logout,
  salesCount = 0,
  purchasesCount = 0,
  paymentsCount = 0,
  chequesCount = 0,
  bankStatementsCount = 0,
  invoicesCount = 0,
  expensesCount = 0,
  partiesCount = 0,
  inventoryCount = 0,
  journalEntriesCount = 0,
}) => {
  const effectiveSalesCount = salesCount || invoicesCount;
  const userRole: UserRole = (profile?.role as UserRole) || 'accountant';
  const roleConfig = ROLE_CONFIG[userRole] || ROLE_CONFIG.accountant;

  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Overview',
      subtitle: 'KPIs & recent activity',
      icon: LayoutDashboard,
    },
    {
      id: 'sales',
      label: 'Sales Invoices',
      shortLabel: 'Sales',
      subtitle: 'Outward bills & debtors',
      icon: Receipt,
      badge: effectiveSalesCount > 0 ? effectiveSalesCount : undefined,
    },
    {
      id: 'purchases',
      label: 'Purchase Bills',
      shortLabel: 'Purchases',
      subtitle: 'Inward bills & ITC claims',
      icon: ShoppingCart,
      badge: purchasesCount > 0 ? purchasesCount : undefined,
    },
    {
      id: 'payments',
      label: 'Receipts & Payments',
      shortLabel: 'Vouchers',
      subtitle: 'Cash & bank inflows/outflows',
      icon: CreditCard,
      badge: paymentsCount > 0 ? paymentsCount : undefined,
    },
    {
      id: 'cheques',
      label: 'Cheque Management',
      shortLabel: 'Cheques',
      subtitle: 'PDC, Books, Inward & Clearing',
      icon: FileCheck2,
      badge: chequesCount > 0 ? chequesCount : undefined,
    },
    {
      id: 'banking',
      label: 'Bank Reconciliation',
      shortLabel: 'Banking',
      subtitle: 'Statements & Auto BRS',
      icon: Landmark,
      badge: bankStatementsCount > 0 ? bankStatementsCount : undefined,
    },
    {
      id: 'accounting',
      label: 'Accounting & Books',
      shortLabel: 'Accounting',
      subtitle: 'Day Book, Trial Balance, JV & Ledgers',
      icon: BookOpen,
      badge: journalEntriesCount > 0 ? journalEntriesCount : undefined,
    },
    {
      id: 'expenses',
      label: 'Expenses & ITC',
      shortLabel: 'Expenses',
      subtitle: 'Tax credits & claims',
      icon: TrendingDown,
      badge: expensesCount > 0 ? expensesCount : undefined,
    },
    {
      id: 'ledgers',
      label: 'Parties & Ledgers',
      shortLabel: 'Ledgers',
      subtitle: 'Debtors & Creditors accounts',
      icon: Users,
      badge: partiesCount > 0 ? partiesCount : undefined,
    },
    {
      id: 'inventory',
      label: 'Stock & Inventory',
      shortLabel: 'Stock',
      subtitle: 'HSN, items & valuation',
      icon: Package,
      badge: inventoryCount > 0 ? inventoryCount : undefined,
    },
    {
      id: 'reports',
      label: 'Automated Reports',
      shortLabel: 'Reports',
      subtitle: 'GSTR-1, 3B, P&L & Balance',
      icon: FileSpreadsheet,
    },
    {
      id: 'settings',
      label: 'Company Settings',
      shortLabel: 'Settings',
      subtitle: 'Profile, bank, logo & print',
      icon: Settings,
    },
  ];

  const handleSelectTab = (tabId: NavTab) => {
    setActiveTab(tabId);
    if (mobileOpen) {
      onCloseMobile();
    }
  };

  const visibleNavItems = navItems.filter((item) => canAccessTab(userRole, item.id));

  // Nav list renderer shared between desktop & mobile
  const renderNavList = (collapsed: boolean) => (
    <div className="space-y-1.5 px-3">
      {!collapsed && (
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation Menu
        </div>
      )}
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id || (activeTab === 'invoices' && item.id === 'sales');

        return (
          <button
            key={item.id}
            id={`nav-item-${item.id}`}
            onClick={() => handleSelectTab(item.id)}
            title={collapsed ? `${item.label} (${item.subtitle})` : undefined}
            className={`w-full group relative flex items-center transition-all duration-200 cursor-pointer rounded-xl ${
              collapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
            } ${
              isActive
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 font-medium'
            }`}
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
              <div
                className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {!collapsed && (
                <div className="text-left min-w-0">
                  <span className={`block text-xs truncate leading-tight ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                  <span
                    className={`block text-[10px] truncate leading-tight mt-0.5 ${
                      isActive ? 'text-slate-900/80 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {item.subtitle}
                  </span>
                </div>
              )}
            </div>

            {/* Badges */}
            {!collapsed && item.badge !== undefined && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isActive
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 border border-slate-700'
                }`}
              >
                {item.badge}
              </span>
            )}

            {/* Collapsed Active Indicator Dot */}
            {collapsed && isActive && (
              <span className="absolute right-1 top-1 w-2 h-2 rounded-full bg-slate-950" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ---------------- MOBILE DRAWER BACKDROP ---------------- */}
      {mobileOpen && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 lg:hidden transition-opacity"
        />
      )}

      {/* ---------------- MOBILE OFF-CANVAS DRAWER ---------------- */}
      <aside
        id="mobile-sidebar-drawer"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Mobile Drawer Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company?.invoiceLogoUrl ? (
                <img
                  src={company.invoiceLogoUrl}
                  alt="Company Logo"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <span className="block font-bold text-xs text-white truncate">
                  {company?.businessName || 'TallyGST ERP'}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono truncate">
                  {company?.gstin || '27AAECB9382M1ZR'}
                </span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="py-4 overflow-y-auto max-h-[calc(100vh-210px)]">
            {renderNavList(false)}
          </div>
        </div>

        {/* Mobile Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cloud Firestore Synced</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User"
                  className="w-8 h-8 rounded-full border border-slate-700 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-slate-200 truncate">
                  {user?.displayName || user?.email?.split('@')[0]}
                </span>
                <span className={`inline-block px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-semibold border ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
                  {roleConfig.badge}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- DESKTOP COLLAPSIBLE SIDEBAR ---------------- */}
      <aside
        id="desktop-collapsible-sidebar"
        className={`hidden lg:flex flex-col justify-between bg-slate-900 border-r border-slate-800/90 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top Section: Brand & Collapse Toggle */}
        <div className="flex flex-col">
          <div
            className={`h-16 border-b border-slate-800 flex items-center transition-all ${
              isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            {isCollapsed ? (
              <button
                type="button"
                id="sidebar-expand-button"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                className="p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer group flex items-center justify-center"
              >
                {company?.invoiceLogoUrl ? (
                  <img
                    src={company.invoiceLogoUrl}
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                )}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  {company?.invoiceLogoUrl ? (
                    <img
                      src={company.invoiceLogoUrl}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 flex-shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="block font-bold text-xs text-white truncate tracking-tight">
                      {company?.businessName || 'TallyGST ERP'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                      <span>{company?.gstin || '27AAECB9382M1ZR'}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  id="sidebar-collapse-button"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Navigation Items List */}
          <div className="py-4 overflow-y-auto max-h-[calc(100vh-170px)]">
            {renderNavList(isCollapsed)}
          </div>
        </div>

        {/* Bottom Section: Database Sync & User Profile */}
        <div className="border-t border-slate-800 bg-slate-900/70 p-3 space-y-2">
          {/* Cloud Firestore Synced Badge */}
          <div
            className={`flex items-center rounded-lg bg-slate-950/60 border border-slate-800/80 transition-all ${
              isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-1.5'
            }`}
            title="Google Cloud Firestore Synced & ITC Section 16 Compliant"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-[10px] font-medium text-slate-400 truncate">
                  Cloud Firestore Connected
                </span>
              )}
            </div>
            {!isCollapsed && (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            )}
          </div>

          {/* User Profile Card */}
          <div
            className={`flex items-center transition-all ${
              isCollapsed ? 'justify-center py-1' : 'justify-between px-1 py-1'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="User"
                  className="w-7 h-7 rounded-full border border-slate-700 flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}

              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-200 truncate leading-tight">
                    {user?.displayName || user?.email?.split('@')[0]}
                  </span>
                  <span className={`inline-block px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-semibold border leading-none ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
                    {roleConfig.badge}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                id="sidebar-logout-button"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Collapsed logout icon */}
          {isCollapsed && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                id="sidebar-logout-button-collapsed"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
