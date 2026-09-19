import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  Crown,
  ArrowRight,
  Layers,
  BarChart3,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Plus,
  MessageSquareQuote,
} from 'lucide-react';
import { CompanyProfile, Workspace } from '../types';
import { canAccessTab, ROLE_CONFIG, UserRole, isSuperAdmin } from '../lib/permissions';
import { getAllWorkspaces, getActiveWorkspaceId } from '../db/workspaces';
import { getAllSubscriptionPlans } from '../db/subscriptionPlans';
import { getPlatformSettings } from '../db/platformSettings';
import { getAllCustomerReviews } from '../db/customerReviews';

export type NavTab =
  | 'dashboard'
  | 'super_admin'
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

export type SuperAdminSubTab = 'home' | 'workspaces' | 'subscriptions' | 'catalog' | 'pillars' | 'reviews' | 'audit' | 'analytics' | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  superAdminSubTab?: SuperAdminSubTab;
  onSelectSuperAdminSubTab?: (subTab: SuperAdminSubTab) => void;
  onSwitchWorkspace?: (workspace: Workspace) => void;
  activeWorkspace?: Workspace | null;
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
  superAdminSubTab = 'workspaces',
  onSelectSuperAdminSubTab,
  onSwitchWorkspace,
  activeWorkspace,
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
  const isSuper = isSuperAdmin(user, profile) || userRole === 'super_admin';

  const [superAdminMenuExpanded, setSuperAdminMenuExpanded] = useState<boolean>(true);
  const [workspacesList, setWorkspacesList] = useState<Workspace[]>([]);
  const [plansCount, setPlansCount] = useState<number>(3);
  const [reviewsCount, setReviewsCount] = useState<number>(6);
  const [activeWsId, setActiveWsId] = useState<string>(getActiveWorkspaceId());

  const [platformAppName, setPlatformAppName] = useState(() => localStorage.getItem('platform_app_name') || 'TallyGST ERP');
  const [platformAppLogo, setPlatformAppLogo] = useState(() => localStorage.getItem('platform_app_logo') || '');

  useEffect(() => {
    const handleBrandingUpdate = () => {
      setPlatformAppName(localStorage.getItem('platform_app_name') || 'TallyGST ERP');
      setPlatformAppLogo(localStorage.getItem('platform_app_logo') || '');
    };
    window.addEventListener('platform_branding_updated', handleBrandingUpdate);
    return () => {
      window.removeEventListener('platform_branding_updated', handleBrandingUpdate);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchMeta = async () => {
      try {
        const [wsList, plans, cloudSettings, reviewsList] = await Promise.all([
          getAllWorkspaces(),
          getAllSubscriptionPlans(),
          getPlatformSettings(),
          getAllCustomerReviews(),
        ]);
        if (mounted) {
          if (Array.isArray(wsList)) setWorkspacesList(wsList);
          if (Array.isArray(plans)) setPlansCount(plans.length);
          if (Array.isArray(reviewsList)) setReviewsCount(reviewsList.length);
          if (cloudSettings) {
            if (cloudSettings.appName) setPlatformAppName(cloudSettings.appName);
            if (cloudSettings.appLogoUrl) setPlatformAppLogo(cloudSettings.appLogoUrl);
          }
          setActiveWsId(getActiveWorkspaceId());
        }
      } catch (err) {
        console.warn('Sidebar meta fetch:', err);
      }
    };

    fetchMeta();

    const handleReviewsUpdate = () => {
      getAllCustomerReviews().then((list) => {
        if (mounted && Array.isArray(list)) setReviewsCount(list.length);
      });
    };
    window.addEventListener('customer_reviews_updated', handleReviewsUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('customer_reviews_updated', handleReviewsUpdate);
    };
  }, [activeTab, activeWorkspace]);

  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Overview',
      subtitle: 'KPIs & recent activity',
      icon: LayoutDashboard,
    },
    {
      id: 'super_admin',
      label: 'Super Admin Dashboard',
      shortLabel: 'Super Admin',
      subtitle: 'Multi-tenant master console',
      icon: Crown,
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

  const superAdminSubItems = [
    {
      id: 'home' as SuperAdminSubTab,
      label: 'Super Admin Home',
      shortLabel: 'Home',
      subtitle: 'Platform overview & status KPIs',
      icon: LayoutDashboard,
    },
    {
      id: 'workspaces' as SuperAdminSubTab,
      label: 'Workspaces Directory',
      shortLabel: 'Workspaces',
      subtitle: 'Tenant accounts & isolation',
      icon: Building2,
      badge: workspacesList.length > 0 ? `${workspacesList.length}` : undefined,
    },
    {
      id: 'subscriptions' as SuperAdminSubTab,
      label: 'Tenant Subscriptions',
      shortLabel: 'Subscriptions',
      subtitle: 'Entitlements & tax invoices',
      icon: CreditCard,
    },
    {
      id: 'catalog' as SuperAdminSubTab,
      label: 'Plan Tier Catalog',
      shortLabel: 'Catalog',
      subtitle: 'Pricing tiers & resource quotas',
      icon: Layers,
      badge: plansCount > 0 ? `${plansCount}` : undefined,
    },
    {
      id: 'pillars' as SuperAdminSubTab,
      label: 'Architectural Pillars',
      shortLabel: 'Pillars',
      subtitle: 'Core statutory platform pillars',
      icon: Sparkles,
    },
    {
      id: 'reviews' as SuperAdminSubTab,
      label: 'Customer Reviews',
      shortLabel: 'Reviews',
      subtitle: 'Landing page testimonials & ratings',
      icon: MessageSquareQuote,
      badge: reviewsCount > 0 ? `${reviewsCount}` : undefined,
    },
    {
      id: 'audit' as SuperAdminSubTab,
      label: 'Platform Audit Trail',
      shortLabel: 'Audit Logs',
      subtitle: 'Security & multi-tenant logs',
      icon: ShieldAlert,
    },
    {
      id: 'analytics' as SuperAdminSubTab,
      label: 'Platform Analytics',
      shortLabel: 'Analytics',
      subtitle: 'MRR, ARR & growth telemetry',
      icon: BarChart3,
    },
    {
      id: 'profile' as SuperAdminSubTab,
      label: 'Super Admin Business Profile',
      shortLabel: 'Admin Profile',
      subtitle: 'Platform business & credentials',
      icon: Settings,
    },
  ];

  const handleSelectTab = (tabId: NavTab) => {
    setActiveTab(tabId);
    if (mobileOpen) {
      onCloseMobile();
    }
  };

  const handleSelectSuperAdminItem = (subTab: SuperAdminSubTab) => {
    if (activeTab !== 'super_admin') {
      setActiveTab('super_admin');
    }
    if (onSelectSuperAdminSubTab) {
      onSelectSuperAdminSubTab(subTab);
    }
    if (mobileOpen) {
      onCloseMobile();
    }
  };

  const currentWorkspace = activeWorkspace || workspacesList.find((w) => w.id === activeWsId) || workspacesList[0];

  // Nav list renderer shared between desktop & mobile
  const renderNavList = (collapsed: boolean) => {
    // ----------------------------------------------------
    // 1. COLLAPSED VIEW FOR DESKTOP (collapsed === true)
    // ----------------------------------------------------
    if (collapsed) {
      return (
        <div className="space-y-1.5 px-2">
          {/* If Super Admin, show Super Admin primary icons */}
          {isSuper && (
            <div className="space-y-1 pb-2 mb-2 border-b border-slate-800/80">
              {/* Master Console Root Button */}
              <button
                type="button"
                id="sidebar-collapsed-super-admin"
                onClick={() => handleSelectTab('super_admin')}
                title="Super Admin Master Console"
                className={`w-full p-2.5 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  activeTab === 'super_admin'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <Crown className="w-4 h-4" />
              </button>

              {/* In Super Admin mode, show sub-item icons */}
              {activeTab === 'super_admin' && (
                <>
                  {superAdminSubItems.map((item) => {
                    const Icon = item.icon;
                    const isSubActive = superAdminSubTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        id={`sidebar-collapsed-super-${item.id}`}
                        onClick={() => handleSelectSuperAdminItem(item.id)}
                        title={`${item.label} (${item.subtitle})`}
                        className={`w-full p-2.5 rounded-lg flex items-center justify-center transition cursor-pointer ${
                          isSubActive
                            ? 'bg-slate-800 text-amber-300 border border-amber-500/30 font-medium'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Standard Workspace Nav Items (if inside a workspace) */}
          {(!isSuper || activeTab !== 'super_admin') && (
            <div className="space-y-1">
              {navItems
                .filter((item) => item.id !== 'super_admin' && canAccessTab(userRole, item.id))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id || (activeTab === 'invoices' && item.id === 'sales');
                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => handleSelectTab(item.id)}
                      title={`${item.label} (${item.subtitle})`}
                      className={`w-full p-2.5 rounded-lg flex items-center justify-center relative transition cursor-pointer ${
                        isActive
                          ? 'bg-slate-800 text-emerald-400 border border-slate-700/70 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.badge !== undefined && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      );
    }

    // ----------------------------------------------------
    // 2. EXPANDED VIEW (Desktop & Mobile Drawer)
    // ----------------------------------------------------
    return (
      <div className="space-y-3 px-3">
        {/* ======================================================= */}
        {/* VIEW A: ON SUPER ADMIN CONSOLE (activeTab === 'super_admin') */}
        {/* ======================================================= */}
        {isSuper && activeTab === 'super_admin' && (
          <div className="space-y-2.5">
            {/* Section Header */}
            <div className="flex items-center justify-between px-2 pt-0.5 pb-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Governance</span>
              </div>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Master Mode</span>
              </span>
            </div>

            {/* Super Admin Sub-Items List */}
            <div className="space-y-0.5">
              {superAdminSubItems.map((item) => {
                const Icon = item.icon;
                const isSubActive = superAdminSubTab === item.id;

                return (
                  <button
                    key={item.id}
                    id={`super-admin-nav-${item.id}`}
                    type="button"
                    onClick={() => handleSelectSuperAdminItem(item.id)}
                    className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg transition cursor-pointer text-left ${
                      isSubActive
                        ? 'bg-slate-800 text-white font-medium border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex-shrink-0 transition-colors ${
                          isSubActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-amber-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-xs truncate leading-tight ${isSubActive ? 'text-white font-medium' : 'text-slate-300'}`}>
                          {item.label}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`ml-2 px-1.5 py-0.2 rounded text-[10px] font-mono shrink-0 ${
                          isSubActive
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* VIEW B: INSIDE WORKSPACE (activeTab !== 'super_admin') */}
        {/* ======================================================= */}
        {activeTab !== 'super_admin' && (
          <>
            {/* If Super Admin is viewing a workspace: Show Dedicated Super Admin Menu Widget */}
            {isSuper && (
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5 space-y-2">
                {/* Super Admin Menu Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                      Super Admin Mode
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuperAdminMenuExpanded(!superAdminMenuExpanded)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    title={superAdminMenuExpanded ? 'Collapse Super Admin Menu' : 'Expand Super Admin Menu'}
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${superAdminMenuExpanded ? '' : '-rotate-90'}`}
                    />
                  </button>
                </div>

                {/* Expanded Super Admin Menu Sub-Items */}
                {superAdminMenuExpanded && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleSelectTab('super_admin')}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span className="truncate">Master Console Hub</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-amber-400/70" />
                    </button>

                    {/* Fast Tenant Switcher dropdown */}
                    {workspacesList.length > 1 && (
                      <div className="pt-1 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span>Tenant:</span>
                          <span className="text-slate-300 font-mono text-[9px] truncate max-w-[120px]">
                            {currentWorkspace?.name}
                          </span>
                        </div>
                        <select
                          value={currentWorkspace?.id || activeWsId || ''}
                          onChange={(e) => {
                            const selected = workspacesList.find((w) => w.id === e.target.value);
                            if (selected && onSwitchWorkspace) {
                              onSwitchWorkspace(selected);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700/80 text-slate-200 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          {workspacesList.map((ws) => (
                            <option key={ws.id} value={ws.id}>
                              {ws.name} ({ws.plan.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Workspace Accounting Section Header */}
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </div>

            {/* Regular Accounting Nav Items */}
            <div className="space-y-0.5">
              {navItems
                .filter((item) => item.id !== 'super_admin' && canAccessTab(userRole, item.id))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id || (activeTab === 'invoices' && item.id === 'sales');

                  return (
                    <button
                      key={item.id}
                      id={`nav-item-${item.id}`}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer text-left ${
                        isActive
                          ? 'bg-slate-800/90 text-white font-medium border border-slate-700/60 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex-shrink-0 transition-colors ${
                            isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <span className={`block text-xs truncate leading-tight ${isActive ? 'text-white font-semibold' : 'text-slate-300 font-medium'}`}>
                            {item.label}
                          </span>
                          <span className="block text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={`ml-2 px-1.5 py-0.2 rounded text-[10px] font-mono ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </>
        )}
      </div>
    );
  };

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
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
            {activeTab === 'super_admin' ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Crown className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="block font-semibold text-xs text-white truncate">
                    Super Admin Console
                  </span>
                  <span className="block text-[10px] text-amber-400/80 font-mono truncate">
                    Master Console
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                {company?.invoiceLogoUrl ? (
                  <img
                    src={company.invoiceLogoUrl}
                    alt="Company Logo"
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="block font-semibold text-xs text-white truncate">
                    {company?.businessName || 'TallyGST ERP'}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono truncate">
                    {company?.gstin || '27AAECB9382M1ZR'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="py-3 overflow-y-auto max-h-[calc(100vh-190px)]">
            {renderNavList(false)}
          </div>
        </div>

        {/* Mobile Drawer Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Cloud Firestore Synced</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2 min-w-0">
              {profile?.avatarUrl || user?.photoURL ? (
                <img
                  src={profile?.avatarUrl || user?.photoURL}
                  alt="User"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full border border-slate-700 flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {profile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <span className="block text-xs font-medium text-slate-200 truncate">
                  {profile?.displayName || user?.displayName || user?.email?.split('@')[0]}
                </span>
                <span className={`inline-block px-1.5 py-0.2 mt-0.5 rounded text-[9px] font-medium border ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
                  {roleConfig.badge}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- DESKTOP COLLAPSIBLE SIDEBAR ---------------- */}
      <aside
        id="desktop-collapsible-sidebar"
        className={`hidden lg:flex flex-col justify-between bg-slate-950 border-r border-slate-800/60 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Top Section: Brand & Collapse Toggle */}
        <div className="flex flex-col">
          <div
            className={`h-14 border-b border-slate-800/60 flex items-center transition-all bg-slate-950/80 ${
              isCollapsed ? 'justify-center px-1.5' : 'justify-between px-3.5'
            }`}
          >
            {isCollapsed ? (
              <button
                type="button"
                id="sidebar-expand-button"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                className="p-1.5 rounded-lg hover:bg-slate-900 transition cursor-pointer group flex items-center justify-center border border-slate-800/60"
              >
                {activeTab === 'super_admin' ? (
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Crown className="w-3.5 h-3.5" />
                  </div>
                ) : company?.invoiceLogoUrl ? (
                  <img
                    src={company.invoiceLogoUrl}
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-lg object-contain bg-slate-900 border border-slate-800 p-0.5"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            ) : (
              <>
                {activeTab === 'super_admin' ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block font-semibold text-xs text-white tracking-tight truncate">
                        {platformAppName || 'Super Admin'}
                      </span>
                      <div className="text-[10px] text-amber-400/80 font-mono truncate">
                        Master Console
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 min-w-0">
                    {platformAppLogo || company?.invoiceLogoUrl ? (
                      <img
                        src={platformAppLogo || company?.invoiceLogoUrl}
                        alt="Logo"
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-lg object-contain bg-slate-900 border border-slate-800 p-0.5 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <span className="block font-semibold text-xs text-white tracking-tight truncate">
                        {company?.businessName || platformAppName || 'TallyGST ERP'}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {company?.gstin || localStorage.getItem('platform_app_tagline') || 'Cloud Accounting'}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  id="sidebar-collapse-button"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer flex-shrink-0"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Navigation Items List */}
          <div className="py-3 overflow-y-auto max-h-[calc(100vh-140px)]">
            {renderNavList(isCollapsed)}
          </div>
        </div>

        {/* Bottom Section: Database Sync & User Profile */}
        <div className="border-t border-slate-800/80 bg-slate-950/40 p-2.5 space-y-2">
          {/* Cloud Firestore Synced Badge */}
          <div
            className={`flex items-center rounded-lg bg-slate-900/60 border border-slate-800/80 transition-all ${
              isCollapsed ? 'justify-center p-1.5' : 'justify-between px-2.5 py-1'
            }`}
            title="Google Cloud Firestore Synced & ITC Section 16 Compliant"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-[10px] font-medium text-slate-400 truncate">
                  Cloud Synced
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
              isCollapsed ? 'justify-center py-0.5' : 'justify-between px-1 py-0.5'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {profile?.avatarUrl || user?.photoURL ? (
                <img
                  src={profile?.avatarUrl || user?.photoURL}
                  alt="User"
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full border border-slate-700 flex-shrink-0 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                  {profile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}

              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-slate-200 truncate leading-tight">
                    {profile?.displayName || user?.displayName || user?.email?.split('@')[0]}
                  </span>
                  <span className={`inline-block px-1.5 py-0.2 mt-0.5 rounded text-[9px] font-medium border leading-none ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
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
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Collapsed logout icon */}
          {isCollapsed && (
            <div className="flex justify-center pt-0.5">
              <button
                type="button"
                id="sidebar-logout-button-collapsed"
                onClick={logout}
                title="Sign Out"
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
