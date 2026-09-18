// src/components/SuperAdminSecurityGateModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Crown,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getSuperAdminBruteForceStatus,
  SESSION_CONFIG,
  getRememberedCredentials,
} from '../lib/sessionSecurity';

interface SuperAdminSecurityGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SuperAdminSecurityGateModal: React.FC<SuperAdminSecurityGateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { signInSuperAdmin, signInWithEmail, loading } = useAuth();

  const [masterCredential, setMasterCredential] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberedCredentials().isEnabled);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [bfStatus, setBfStatus] = useState(getSuperAdminBruteForceStatus());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setBfStatus(getSuperAdminBruteForceStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuperAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const currentBf = getSuperAdminBruteForceStatus();
    if (currentBf.isBruteForceLocked) {
      setAuthError(`Security rate limit active. Please wait ${currentBf.lockoutRemainingSeconds}s.`);
      return;
    }

    const trimmed = masterCredential.trim();
    if (!trimmed) {
      setAuthError('Please enter Super Admin Master Password or PIN.');
      return;
    }

    setIsAuthenticating(true);
    try {
      await signInSuperAdmin(trimmed, rememberMe);
      setAuthSuccess('Super Admin authenticated securely. Redirecting to Console...');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 500);
    } catch (err: any) {
      setAuthError(err?.message || 'Super Admin authentication failed.');
      setBfStatus(getSuperAdminBruteForceStatus());
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleQuickMasterAuth = async () => {
    setAuthError(null);
    setAuthSuccess(null);

    const currentBf = getSuperAdminBruteForceStatus();
    if (currentBf.isBruteForceLocked) {
      setAuthError(`Security rate limit active. Please wait ${currentBf.lockoutRemainingSeconds}s.`);
      return;
    }

    setIsAuthenticating(true);
    try {
      await signInSuperAdmin(SESSION_CONFIG.SUPER_ADMIN_MASTER_PIN, rememberMe);
      setAuthSuccess('Master Access Verified! Entering Super Admin Console...');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 400);
    } catch (err: any) {
      setAuthError(err?.message || 'Master access verification failed.');
      setBfStatus(getSuperAdminBruteForceStatus());
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        id="modal-super-admin-security-gate"
        className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5"
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Super Admin Security Gate
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-bold">
                  Level 5 Clearance
                </span>
              </h3>
              <p className="text-xs text-slate-400">Supreme Multi-Tenant Governance</p>
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

        {/* Master User Identity Badge */}
        <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
              KS
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200">Kuldeep Siraswar</div>
              <div className="text-[11px] text-amber-400/90 font-mono truncate">nawarkuldeep@gmail.com</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Primary Root
            </span>
          </div>
        </div>

        {/* Rate Limiting / Lockout Alert Banner */}
        {bfStatus.isBruteForceLocked && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="font-bold text-rose-200 flex items-center justify-between">
                <span>Security Rate-Limit Active</span>
                <span className="font-mono text-xs">{bfStatus.lockoutRemainingSeconds}s</span>
              </div>
              <p className="text-[11px] text-rose-300 leading-relaxed">
                Repeated failed authentication attempts detected. Super Admin portal is locked for security.
              </p>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {authSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{authSuccess}</span>
          </div>
        )}

        {/* Error Banner */}
        {authError && !bfStatus.isBruteForceLocked && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="flex-1">{authError}</span>
          </div>
        )}

        {/* 1-Click Master PIN Quick Access Button */}
        <div className="space-y-3">
          <button
            type="button"
            id="btn-sa-quick-verify"
            disabled={isAuthenticating || loading || bfStatus.isBruteForceLocked}
            onClick={handleQuickMasterAuth}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            {isAuthenticating ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying Master Security Token...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Verify &amp; Enter Super Admin Console</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-medium">
              or verify with custom password / PIN
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Master Password Form */}
          <form onSubmit={handleSuperAdminSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1.5">
              <label className="block font-medium text-slate-300">
                Master Security Password / Master PIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="input-sa-master-credential"
                  value={masterCredential}
                  onChange={(e) => setMasterCredential(e.target.value)}
                  placeholder="Enter Master Password or PIN (e.g. 2785)"
                  disabled={bfStatus.isBruteForceLocked}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono text-xs disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 text-xs">
                <input
                  type="checkbox"
                  id="checkbox-sa-remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                />
                <span>Remember Super Admin on this device (24 Hours)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating || loading || !masterCredential.trim() || bfStatus.isBruteForceLocked}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Authenticate Credentials</span>
            </button>
          </form>
        </div>

        {/* Security Badges Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            30-Min Elevated Window
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-slate-400" />
            Audit Log Tracked
          </span>
        </div>
      </div>
    </div>
  );
};
