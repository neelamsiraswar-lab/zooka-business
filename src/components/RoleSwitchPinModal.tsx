import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Delete,
  ShieldAlert,
} from 'lucide-react';
import {
  ROLE_CONFIG,
  UserRole,
  DEFAULT_ROLE_PINS,
  getRoleDefaultPin,
} from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { verifyAndSwitchRole } from '../db/users';
import { logActivity } from '../db/dataService';

interface RoleSwitchPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: UserRole | null;
  currentRole: UserRole;
  onSuccess: () => void;
  getToken: () => Promise<string | null>;
}

export const RoleSwitchPinModal: React.FC<RoleSwitchPinModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  currentRole,
  onSuccess,
  getToken,
}) => {
  const { profile, refreshProfile } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, targetRole]);

  if (!isOpen || !targetRole) return null;

  const targetConfig = ROLE_CONFIG[targetRole] || ROLE_CONFIG.accountant;
  const currentConfig = ROLE_CONFIG[currentRole] || ROLE_CONFIG.accountant;
  const defaultPin = getRoleDefaultPin(targetRole);

  const handleSubmit = async (pinToVerify?: string) => {
    const finalPin = (pinToVerify !== undefined ? pinToVerify : pin).trim();
    if (finalPin.length < 4) {
      setError('Please enter a 4-digit security PIN');
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const userId = profile?.id || 1;
      await verifyAndSwitchRole(userId, targetRole, finalPin);
      await logActivity(
        userId,
        profile?.email || 'user',
        'UPDATE_USER_ROLE',
        'user',
        String(userId),
        `Switched active role to ${targetRole.toUpperCase()}`
      );

      await refreshProfile();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Role switch PIN verification error:', err);
      setError(err?.message || 'Incorrect Security PIN. Please try again.');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setPin(defaultPin);
    setError(null);
    handleSubmit(defaultPin);
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        handleSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Authorize Role Switch
              </h3>
              <p className="text-xs text-slate-400">
                Enter Security PIN to verify role privilege
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Role Transition Preview */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">From:</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md ${currentConfig.bgBadge} ${currentConfig.textBadge} border ${currentConfig.borderBadge}`}
              >
                {currentConfig.badge}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-600" />

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">To:</span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${targetConfig.bgBadge} ${targetConfig.textBadge} border ${targetConfig.borderBadge}`}
              >
                {targetConfig.title}
              </span>
            </div>
          </div>

          {/* Quick Default PIN helper */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-purple-200">
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Default PIN for <strong>{targetConfig.badge}</strong> is{' '}
                <span className="font-mono font-bold text-white bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/30">
                  {defaultPin}
                </span>{' '}
                <span className="text-slate-400 text-[11px]">(or Master: 1234)</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleQuickFill}
              disabled={submitting}
              className="px-2.5 py-1 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 shadow-sm"
              title="Auto-fill default PIN for rapid testing"
            >
              <Sparkles className="w-3 h-3" />
              <span>Quick Fill</span>
            </button>
          </div>

          {/* PIN Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="role-switch-pin-input"
                  className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>4-Digit Security PIN</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show PIN</span>
                    </>
                  )}
                </button>
              </div>

              {/* Visual 4-Digit Display */}
              <div className="flex justify-center items-center gap-3 py-1">
                {[0, 1, 2, 3].map((index) => {
                  const digit = pin[index];
                  const isFilled = digit !== undefined;
                  const isCurrent = pin.length === index;

                  return (
                    <div
                      key={index}
                      onClick={() => inputRef.current?.focus()}
                      className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center font-mono text-xl font-bold cursor-text transition-all ${
                        isCurrent
                          ? 'border-purple-500 bg-purple-500/10 text-white shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/30'
                          : isFilled
                          ? 'border-slate-600 bg-slate-800 text-white'
                          : 'border-slate-800 bg-slate-950/60 text-slate-600'
                      }`}
                    >
                      {isFilled ? (showPin ? digit : '•') : ''}
                    </div>
                  );
                })}
              </div>

              {/* Hidden text input for native keyboard typing */}
              <input
                ref={inputRef}
                id="role-switch-pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                  setError(null);
                  if (val.length === 4) {
                    handleSubmit(val);
                  }
                }}
                className="opacity-0 absolute -z-10 pointer-events-none"
                autoComplete="off"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Onscreen Keypad for mouse/touch convenience */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  disabled={submitting}
                  className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-100 font-mono text-base font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                disabled={submitting || pin.length === 0}
                className="py-2.5 rounded-xl bg-slate-800/30 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                disabled={submitting}
                className="py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-100 font-mono text-base font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                disabled={submitting || pin.length === 0}
                className="py-2.5 rounded-xl bg-slate-800/30 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-40"
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-700/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting || pin.length < 4}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Authorize & Switch</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
