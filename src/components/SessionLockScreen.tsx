// src/components/SessionLockScreen.tsx
import React, { useState } from 'react';
import { Lock, ShieldCheck, LogOut, ArrowRight, AlertTriangle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_CONFIG } from '../lib/permissions';

export const SessionLockScreen: React.FC = () => {
  const { session, user, profile, unlockSession, logout } = useAuth();
  const [unlockInput, setUnlockInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const displayName = session?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const email = session?.email || user?.email || 'user@apex.local';
  const role: UserRole = (session?.role || profile?.role || 'accountant') as UserRole;
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.accountant;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = unlockInput.trim();
    if (!trimmed) {
      setError('Please enter your password or Security PIN.');
      return;
    }

    setIsUnlocking(true);
    try {
      const success = unlockSession(trimmed);
      if (!success) {
        setError('Invalid credentials to resume session. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to unlock session.');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fade-in">
      <div
        id="screen-session-lock"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl relative overflow-hidden text-center space-y-6"
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        {/* User Identity */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Session Locked
          </h2>
          <p className="text-xs text-slate-400">
            Your workspace session is secured. Enter your credentials or PIN to resume work.
          </p>
        </div>

        {/* User Card */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 flex items-center gap-3.5 text-left">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0 overflow-hidden">
            {session?.photoURL || user?.photoURL ? (
              <img
                src={session?.photoURL || user?.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              displayName[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{displayName}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{email}</div>
          </div>
          <span className={`text-[9px] px-2 py-0.5 rounded font-medium border shrink-0 ${roleConfig.bgBadge} ${roleConfig.textBadge} ${roleConfig.borderBadge}`}>
            {roleConfig.badge}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 text-left animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-3.5 text-xs text-left">
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-300">
              Password or Master PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="password"
                required
                autoFocus
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                placeholder="Enter password or PIN to unlock"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isUnlocking || !unlockInput.trim()}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>Resume Active Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Sign Out Option */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center">
          <button
            type="button"
            onClick={logout}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign in as a different user</span>
          </button>
        </div>
      </div>
    </div>
  );
};
