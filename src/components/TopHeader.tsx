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
  User,
  Lock,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { CompanyProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { ROLE_CONFIG, UserRole } from '../lib/permissions';

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
  const { logout } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentRole: UserRole = (profile?.role as UserRole) || 'accountant';
  const roleConfig = ROLE_CONFIG[currentRole] || ROLE_CONFIG.accountant;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

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
          title="Sync books now with Cloud Firestore"
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
          title="Log out and return to Workspace Portal"
          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Logout</span>
        </button>

        {/* User Profile Chip & Account Details Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            id="header-user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="Click to view user profile and security role"
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
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
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

          {/* User Account & Security Info Dropdown */}
          {showUserMenu && (
            <div
              id="header-user-menu"
              className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in space-y-3"
            >
              {/* User Identity Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {user?.displayName || 'Workspace User'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {user?.email}
                  </div>
                </div>
              </div>

              {/* Active Role Card */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" /> Assigned Security Role
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
                    {roleConfig.badge}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {roleConfig.title}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {roleConfig.description}
                </p>
              </div>

              {/* Security & Access Info */}
              <div className="px-1 py-0.5 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>User roles and permissions are managed exclusively by Workspace Administrators.</span>
              </div>

              {/* Logout Option */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  id="header-menu-logout-btn"
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  className="w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 cursor-pointer text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out / Switch User</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400/80 font-normal">
                    Exit to Portal
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
