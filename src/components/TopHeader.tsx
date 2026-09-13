import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Building2,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Shield,
  ChevronDown,
  Check,
  LogOut,
} from 'lucide-react';
import { CompanyProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { ROLE_CONFIG, UserRole } from '../lib/permissions';
import { RoleSwitchPinModal } from './RoleSwitchPinModal';

interface TopHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
  company: CompanyProfile | null;
  onRefresh: () => void;
  dataLoading: boolean;
  user: any;
  profile: any;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  isCollapsed,
  onToggleCollapse,
  onOpenMobile,
  company,
  onRefresh,
  dataLoading,
  user,
  profile,
}) => {
  const { getToken, refreshProfile, logout } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);
  const [pinModalTargetRole, setPinModalTargetRole] = useState<UserRole | null>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const currentRole: UserRole = (profile?.role as UserRole) || 'accountant';
  const roleConfig = ROLE_CONFIG[currentRole] || ROLE_CONFIG.accountant;

  const handleSelectRole = (targetRole: UserRole) => {
    setShowRoleMenu(false);
    if (targetRole === currentRole) return;
    setPinModalTargetRole(targetRole);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    if (showRoleMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleMenu]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request could not be completed:', err);
    }
  };
  return (
    <header
      id="app-top-header"
      className="sticky top-0 z-20 h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4"
    >
      {/* Left side: Mobile menu toggle + Desktop sidebar toggle when collapsed */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Button (< lg) */}
        <button
          type="button"
          id="mobile-nav-toggle-btn"
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-2"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-xs text-white truncate max-w-[160px] sm:max-w-xs">
            {company?.businessName || 'TallyGST ERP'}
          </span>
        </button>

        {/* Desktop Sidebar Expand Toggle Button (only when collapsed) */}
        {isCollapsed && (
          <div className="hidden lg:flex items-center gap-3">
            <button
              type="button"
              id="desktop-sidebar-expand-btn"
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition cursor-pointer items-center justify-center border border-slate-800"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <span className="font-bold text-xs text-white truncate">
              {company?.businessName || 'TallyGST ERP'}
            </span>
            {company?.gstin && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                GSTIN: {company.gstin}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: Place of supply, Cloud sync status, Manual Refresh, User info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Place of supply badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>State: {company?.stateName || 'Maharashtra'} ({company?.stateCode || '27'})</span>
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white cursor-pointer transition hidden sm:flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Manual Refresh / Sync Button */}
        <button
          type="button"
          id="header-refresh-sync-btn"
          onClick={onRefresh}
          title="Sync books now with Cloud SQL"
          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-emerald-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span className="hidden sm:inline">{dataLoading ? 'Syncing...' : 'Sync Books'}</span>
        </button>

        {/* Quick Header Logout Button */}
        <button
          type="button"
          id="header-quick-logout-btn"
          onClick={logout}
          title="Log out and return to Homepage"
          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Logout</span>
        </button>

        {/* User Profile Chip & Interactive Role Switcher */}
        <div className="relative" ref={roleMenuRef}>
          <button
            type="button"
            id="header-role-switcher-btn"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            title="Click to view permissions or switch security role"
            className="flex items-center gap-2 pl-2 border-l border-slate-800 hover:bg-slate-800/50 py-1 px-1.5 rounded-xl transition cursor-pointer group"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="User"
                className="w-7 h-7 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="hidden sm:block text-left min-w-0">
              <span className="block text-xs font-medium text-slate-200 leading-tight truncate max-w-[120px]">
                {user?.displayName || user?.email?.split('@')[0]}
              </span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border leading-none mt-0.5 ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
                {roleConfig.badge}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform" />
          </button>

          {/* Role Switcher Dropdown */}
          {showRoleMenu && (
            <div
              id="header-role-menu"
              className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-fade-in space-y-1.5"
            >
              <div className="px-2.5 py-1.5 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Active Security Role
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
                    {roleConfig.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {roleConfig.description}
                </p>
              </div>

              <div className="px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Role for Testing:
              </div>

              {(['admin', 'accountant', 'billing_operator', 'auditor'] as UserRole[]).map((roleKey) => {
                const conf = ROLE_CONFIG[roleKey];
                const isSelected = roleKey === currentRole;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleSelectRole(roleKey)}
                    className={`w-full text-left p-2 rounded-xl transition flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border border-slate-700'
                        : 'hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${conf.textBadge}`}>
                          {conf.title}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-400 leading-tight mt-0.5">
                        {conf.description.slice(0, 55)}...
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}

              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  id="header-menu-logout-btn"
                  onClick={async () => {
                    setShowRoleMenu(false);
                    await logout();
                  }}
                  className="w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 cursor-pointer text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out / Logout</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400/80 font-normal">
                    Exit to RBAC Login
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Switch Security PIN Verification Modal */}
      <RoleSwitchPinModal
        isOpen={Boolean(pinModalTargetRole)}
        onClose={() => setPinModalTargetRole(null)}
        targetRole={pinModalTargetRole}
        currentRole={currentRole}
        onSuccess={async () => {
          await refreshProfile();
        }}
        getToken={getToken}
      />
    </header>
  );
};
