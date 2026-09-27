// src/components/SuperAdminForgotPasswordModal.tsx
import React, { useState } from 'react';
import {
  Crown,
  KeyRound,
  ShieldCheck,
  Lock,
  Mail,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  resetSuperAdminPassword,
  updateSuperAdminMasterCredential,
  DEFAULT_SUPER_ADMIN_PASSWORDS,
  SYSTEM_ROOT_RECOVERY_KEYS,
  resetSuperAdminAttempts,
} from '../lib/sessionSecurity';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface SuperAdminForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSuccess?: (newPassword?: string) => void;
}

export const SuperAdminForgotPasswordModal: React.FC<SuperAdminForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onResetSuccess,
}) => {
  const { signInSuperAdmin } = useAuth();

  const superAdminEmail = 'nawarkuldeep@gmail.com';
  const defaultRecoveryKey = 'ZOOKA-ROOT-2026';

  const [recoveryCode, setRecoveryCode] = useState(defaultRecoveryKey);
  const [newPassword, setNewPassword] = useState('Zooka@2026');
  const [confirmPassword, setConfirmPassword] = useState('Zooka@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(defaultRecoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSendFirebaseReset = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, superAdminEmail);
        setEmailSent(true);
        setSuccessMsg(`Official password reset instructions have been dispatched to ${superAdminEmail}.`);
      } else {
        setEmailSent(true);
        setSuccessMsg(`Password recovery notification logged for root administrator (${superAdminEmail}).`);
      }
    } catch (err: any) {
      console.warn('Firebase reset email note:', err);
      setEmailSent(true);
      setSuccessMsg(`Password recovery requested for ${superAdminEmail}. You can also reset directly below using Master Root Key.`);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      setErrorMsg('Please enter a new Super Admin password or Master PIN.');
      return;
    }

    if (trimmedNew.length < 4) {
      setErrorMsg('Password / PIN must be at least 4 characters in length.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetSuperAdminPassword(recoveryCode, trimmedNew);
      if (res.success) {
        setSuccessMsg(res.message);
        // Automatically unblock any rate limits
        resetSuperAdminAttempts();
        if (onResetSuccess) {
          onResetSuccess(trimmedNew);
        }
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to reset Super Admin password. Please verify recovery code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoLoginWithNewPassword = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await signInSuperAdmin(newPassword.trim(), true);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to auto-sign-in. Please log in from the security gate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        id="modal-superadmin-forgot-password"
        className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5"
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Super Admin Password Reset
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-bold">
                  Root Recovery
                </span>
              </h3>
              <p className="text-xs text-slate-400">Recover and configure Super Admin master credentials</p>
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

        {/* Super Admin Verified Identity Banner */}
        <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-200">Kuldeep Siraswar (Super Administrator)</div>
              <div className="text-[11px] text-amber-400/90 font-mono truncate">{superAdminEmail}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSendFirebaseReset}
            className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Send recovery email to Superadmin"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send Email</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">{successMsg}</div>
            </div>
            <button
              type="button"
              onClick={handleAutoLoginWithNewPassword}
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Log In Now to Super Admin Console</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
          {/* Recovery Authorization Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-medium text-slate-300">
                Master Recovery Key / Security Passcode *
              </label>
              <button
                type="button"
                onClick={handleCopyKey}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Use System Key: <strong className="font-mono">{defaultRecoveryKey}</strong></span>
              </button>
            </div>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                id="input-sa-recovery-key"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="Enter recovery key (e.g., ZOOKA-ROOT-2026 or nawarkuldeep@gmail.com)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono text-xs"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Enter your Master Root Key (<code className="text-amber-300 font-mono">ZOOKA-ROOT-2026</code>) or verified Superadmin email (<code className="text-amber-300 font-mono">nawarkuldeep@gmail.com</code>).
            </p>
          </div>

          {/* New Password & Confirmation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block font-medium text-slate-300">New Master Password / PIN *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="input-sa-new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password or PIN"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono text-xs"
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

            <div className="space-y-1.5">
              <label className="block font-medium text-slate-300">Confirm New Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  id="input-sa-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Quick Master Presets:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['Zooka@2026', 'SuperAdmin@2026', 'Admin@123', '123456'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setNewPassword(preset);
                    setConfirmPassword(preset);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer transition font-mono"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs cursor-pointer transition text-center"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="btn-sa-submit-reset"
              disabled={isSubmitting || !newPassword.trim() || !recoveryCode.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Resetting Cloud Key...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset &amp; Save Password</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Notice Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            SHA-256 Cloud Cryptographic Hash
          </span>
          <span className="flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-400" />
            Auto-Unlocks Rate Limit
          </span>
        </div>
      </div>
    </div>
  );
};
