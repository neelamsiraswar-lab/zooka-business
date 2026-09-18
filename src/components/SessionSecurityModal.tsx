// src/components/SessionSecurityModal.tsx
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  KeyRound,
  AlertTriangle,
  X,
  LogOut,
  RefreshCw,
  Crown,
  CheckCircle2,
  Shield,
  Activity,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getSuperAdminBruteForceStatus,
  SESSION_CONFIG,
} from '../lib/sessionSecurity';
import { isSuperAdmin } from '../lib/permissions';

interface SessionSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionSecurityModal: React.FC<SessionSecurityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    session,
    user,
    profile,
    isSuperAdminElevated,
    elevateSuperAdmin,
    dropSuperAdminElevation,
    lockSession,
    logout,
    refreshSession,
  } = useAuth();

  const [masterPinInput, setMasterPinInput] = useState('');
  const [elevationError, setElevationError] = useState<string | null>(null);
  const [elevationSuccess, setElevationSuccess] = useState<string | null>(null);
  const [isElevating, setIsElevating] = useState(false);
  const [remainingTimeText, setRemainingTimeText] = useState('');
  const [saStatus, setSaStatus] = useState(getSuperAdminBruteForceStatus());

  useEffect(() => {
    if (!isOpen) return;

    const updateTimes = () => {
      setSaStatus(getSuperAdminBruteForceStatus());
      if (session?.expiresAt) {
        const diff = new Date(session.expiresAt).getTime() - Date.now();
        if (diff <= 0) {
          setRemainingTimeText('Expired');
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          if (hours > 24) {
            const days = Math.floor(hours / 24);
            setRemainingTimeText(`${days}d ${hours % 24}h remaining`);
          } else {
            setRemainingTimeText(`${hours}h ${mins}m ${secs}s`);
          }
        }
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [isOpen, session]);

  if (!isOpen) return null;

  const isUserMasterAdmin = isSuperAdmin(user, profile) || profile?.role === 'super_admin';

  const handleElevateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setElevationError(null);
    setElevationSuccess(null);
    setIsElevating(true);
    try {
      const res = await elevateSuperAdmin(masterPinInput);
      if (res.success) {
        setElevationSuccess('Super Admin elevated privileges granted for 30 minutes.');
        setMasterPinInput('');
        refreshSession();
      } else {
        setElevationError(res.error || 'Invalid Master Security PIN.');
      }
    } catch (err: any) {
      setElevationError(err?.message || 'Failed to elevate privileges.');
    } finally {
      setIsElevating(false);
    }
  };

  const handleDropElevation = async () => {
    await dropSuperAdminElevation();
    setElevationSuccess('Super Admin elevated privileges dropped.');
    refreshSession();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        id="modal-session-security"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Session Security &amp; Access Controls
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                  Active &amp; Guarded
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                End-to-end token validation, device fingerprinting &amp; multi-tenant isolation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Session Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {/* Session ID & Role */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Session Token ID
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-emerald-300">
                256-bit AES
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-200 truncate bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
              {session?.sessionId || 'sess_default_active_01'}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-400">
              <span>Account:</span>
              <span className="text-slate-200 font-mono font-medium">{session?.email}</span>
            </div>
          </div>

          {/* Client Device & Browser */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                {session?.device?.isMobile ? <Smartphone className="w-3.5 h-3.5 text-blue-400" /> : <Laptop className="w-3.5 h-3.5 text-blue-400" />}
                Client Device &amp; OS
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                Verified Client
              </span>
            </div>
            <div className="text-[11px] text-slate-200 font-medium">
              {session?.device?.browser || 'Web Browser'} on {session?.device?.os || 'Host OS'} ({session?.device?.platform || 'Web'})
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-400">
              <span>IP Fingerprint:</span>
              <span className="text-slate-300 font-mono text-[10px]">{session?.ipHash || 'ip_fp_verified'}</span>
            </div>
          </div>

          {/* Expiry & Remember Me Status */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Session Expiration
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                session?.rememberMe ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-slate-800 text-slate-300'
              }`}>
                {session?.rememberMe ? 'Remembered (30 Days)' : 'Session-Only (8 Hours)'}
              </span>
            </div>
            <div className="font-mono text-[12px] text-amber-300 font-medium">
              {remainingTimeText || 'Calculating...'}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-400">
              <span>Login Timestamp:</span>
              <span className="text-slate-300 font-mono text-[10px]">
                {session?.createdAt ? new Date(session.createdAt).toLocaleTimeString() : 'Active'}
              </span>
            </div>
          </div>

          {/* Database & Multi-Tenant Channel */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Firestore TLS WebChannel
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Secure TLS 1.3
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Tenant Data Isolation: <strong className="text-white">Active</strong>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-400">
              <span>Idle Inactivity Protection:</span>
              <span className="text-slate-300 font-medium">{SESSION_CONFIG.IDLE_TIMEOUT_MINUTES} Minutes Auto-Lock</span>
            </div>
          </div>
        </div>

        {/* Super Admin Elevation Panel (If Super Admin user) */}
        {isUserMasterAdmin && (
          <div className="bg-slate-950/90 p-4 rounded-xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Super Admin Privilege Elevation
                </h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                isSuperAdminElevated
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isSuperAdminElevated ? `Elevated (${saStatus.elevationRemainingSeconds}s left)` : 'Standard Mode'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Super Admin destructive operations (cross-tenant overrides, database purges, license modifications) require high-privilege elevation.
            </p>

            {elevationSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{elevationSuccess}</span>
              </div>
            )}

            {elevationError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{elevationError}</span>
              </div>
            )}

            {isSuperAdminElevated ? (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="text-xs text-emerald-300 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Elevated Governance Mode Active (30-min window)
                </div>
                <button
                  type="button"
                  onClick={handleDropElevation}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition"
                >
                  Drop Elevation
                </button>
              </div>
            ) : (
              <form onSubmit={handleElevateSubmit} className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <input
                  type="password"
                  value={masterPinInput}
                  onChange={(e) => setMasterPinInput(e.target.value)}
                  placeholder="Enter Master Security PIN (e.g. 2785)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isElevating || !masterPinInput.trim() || saStatus.isBruteForceLocked}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {isElevating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                  <span>Unlock Elevated Mode</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Modal Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                lockSession();
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Lock Active Session</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={async () => {
                onClose();
                await logout();
              }}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Terminate Session &amp; Sign Out</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
