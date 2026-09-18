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
  Dices,
  Sparkles,
  Crown,
} from 'lucide-react';
import { CompanyProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { ROLE_CONFIG, UserRole, isSuperAdmin } from '../lib/permissions';
import { updateUserProfile } from '../db/users';

interface TopHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
  company: CompanyProfile | null;
  onRefresh: () => void;
  dataLoading: boolean;
  user: any;
  profile: any;
  activeTab?: string;
  onNavigateToSuperAdmin?: () => void;
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
  activeTab,
  onNavigateToSuperAdmin,
}) => {
  const { logout, refreshProfile } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [isChangingAvatar, setIsChangingAvatar] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleQuickAutoChangeAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile?.id) return;
    setIsChangingAvatar(true);
    try {
      const styles = ['notionists', 'lorelei', 'adventurer', 'avataaars', 'bottts', 'micah', 'initials'];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const name = profile?.displayName || user?.displayName || 'User';
      const seed = `${name}-${randomSuffix}`;
      const newAvatarUrl =
        randomStyle === 'initials'
          ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&chars=2`
          : `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${encodeURIComponent(seed)}`;

      await updateUserProfile(profile.id, { avatarUrl: newAvatarUrl });
      await refreshProfile();
    } catch (err) {
      console.error('Quick auto change avatar error:', err);
    } finally {
      setIsChangingAvatar(false);
    }
  };

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
      className="sticky top-0 z-20 h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors"
    >
      {/* Left side: Mobile menu toggle + Desktop sidebar toggle when collapsed */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Button (< lg) */}
        <button
          type="button"
          id="mobile-nav-toggle-btn"
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 rounded-lg transition cursor-pointer flex items-center gap-2 border border-slate-800/60"
          title="Open Navigation Menu"
        >
          <Menu className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-slate-100 truncate max-w-[160px] sm:max-w-xs">
            {activeTab === 'super_admin' ? 'Super Admin Console' : (company?.businessName || 'TallyGST ERP')}
          </span>
        </button>

        {/* Desktop Sidebar Expand Toggle Button (only when collapsed) */}
        {isCollapsed && (
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              type="button"
              id="desktop-sidebar-expand-btn"
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg transition cursor-pointer items-center justify-center border border-slate-800/80"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <span className="font-semibold text-[13px] tracking-tight text-slate-100 truncate">
              {activeTab === 'super_admin' ? 'Super Admin Console' : (company?.businessName || 'TallyGST ERP')}
            </span>
            {activeTab === 'super_admin' ? (
              <span className="text-[10px] font-mono font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Master Governance
              </span>
            ) : (
              company?.gstin && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800/80">
                  {company.gstin}
                </span>
              )
            )}
          </div>
        )}
      </div>

      {/* Right side: Place of supply / Master control, Cloud sync status, Manual Refresh, User info */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* If Super Admin is viewing a workspace, offer an instant Return to Super Admin button */}
        {onNavigateToSuperAdmin && activeTab !== 'super_admin' && (isSuperAdmin(user, profile) || profile?.role === 'super_admin') && (
          <button
            type="button"
            onClick={onNavigateToSuperAdmin}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-medium transition cursor-pointer"
            title="Return to Super Administrator Console"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Super Admin Console</span>
            <span className="sm:hidden">Super Admin</span>
          </button>
        )}

        {/* Place of supply / Master Mode badge */}
        {activeTab === 'super_admin' ? (
          <div
            title={`Master Business: ${localStorage.getItem('platform_invoice_name') || 'Apex Cloud Technologies'} | Place of Supply: ${localStorage.getItem('platform_invoice_state_name') || 'Maharashtra'} (${localStorage.getItem('platform_invoice_state_code') || '27'})`}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/60 text-[11px] text-slate-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-slate-400">Master Supply:</span>
            <span className="text-slate-200 font-medium">{localStorage.getItem('platform_invoice_state_name') || 'Maharashtra'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{localStorage.getItem('platform_invoice_state_code') || '27'}</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/60 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>State: <strong className="text-slate-200 font-medium">{company?.stateName || 'Maharashtra'}</strong> <span className="font-mono text-[10px] text-slate-400">({company?.stateCode || '27'})</span></span>
          </div>
        )}

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer transition hidden sm:flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Manual Refresh / Sync Button */}
        <button
          type="button"
          id="header-refresh-sync-btn"
          onClick={onRefresh}
          title="Sync books now with Cloud Firestore"
          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">{dataLoading ? 'Syncing...' : 'Sync Books'}</span>
        </button>

        {/* User Profile Chip & Account Details Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            id="header-user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="Click to view user profile and security role"
            className="flex items-center gap-2 pl-2 border-l border-slate-800/80 hover:bg-slate-900/80 py-1 px-1.5 rounded-lg transition cursor-pointer group"
          >
            {profile?.avatarUrl || user?.photoURL ? (
              <img
                src={profile?.avatarUrl || user?.photoURL}
                alt="User"
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full ring-1 ring-slate-700/80 object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] font-semibold">
                {profile?.displayName?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="hidden sm:block text-left min-w-0">
              <span className="block text-xs font-medium text-slate-200 leading-tight truncate max-w-[120px]">
                {user?.displayName || user?.email?.split('@')[0]}
              </span>
              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-medium border leading-none mt-0.5 ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
                {roleConfig.badge}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-transform" />
          </button>

          {/* User Account & Security Info Dropdown */}
          {showUserMenu && (
            <div
              id="header-user-menu"
              className="absolute right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5"
            >
              {/* User Identity Header */}
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative group">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xs font-semibold text-emerald-400 shrink-0 overflow-hidden">
                      {profile?.avatarUrl || user?.photoURL ? (
                        <img
                          src={profile?.avatarUrl || user?.photoURL}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white tracking-tight truncate">
                      {profile?.displayName || user?.displayName || 'Workspace User'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {user?.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  id="quick-auto-change-avatar-btn"
                  onClick={handleQuickAutoChangeAvatar}
                  disabled={isChangingAvatar}
                  title="Automatically change profile image"
                  className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition shrink-0"
                >
                  {isChangingAvatar ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                  ) : (
                    <Dices className="w-3 h-3 text-slate-400" />
                  )}
                  <span>Avatar</span>
                </button>
              </div>

              {/* Active Role Card */}
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" /> Role
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
                    {roleConfig.badge}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {roleConfig.title}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {roleConfig.description}
                </p>
              </div>

              {/* Security & Access Info */}
              <div className="px-1 py-0.5 text-[10px] text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                <span>Multi-tenant cloud sync active</span>
              </div>

              {/* Logout Option */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  id="header-menu-logout-btn"
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg transition flex items-center justify-between gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Exit
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
