import React, { useState, useEffect } from 'react';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Building2,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CompanyProfile } from '../types';

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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

        {/* User Profile Chip */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
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
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-medium text-slate-200 leading-tight truncate max-w-[120px]">
              {user?.displayName || user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {profile?.role || 'Accountant'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
