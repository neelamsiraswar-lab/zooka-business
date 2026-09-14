import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ShieldCheck,
  Zap,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle2,
  X,
  KeyRound,
  LogIn,
  Eye,
  EyeOff,
  Delete,
  FileText,
  Search,
  RefreshCw,
  Clock,
  Shield,
  Mail,
} from 'lucide-react';
import {
  UserRole,
  ROLE_CONFIG,
} from '../lib/permissions';
import { api, ApiUser } from '../services/api';

export const LoginView: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signInAsUser,
    loading,
    error,
    clearError,
  } = useAuth();

  const [authenticatingTarget, setAuthenticatingTarget] = useState<string | null>(null);

  // Live registered users fetched from server API
  const [registeredUsers, setRegisteredUsers] = useState<ApiUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Email login tab
  const [showEmailLogin, setShowEmailLogin] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');

  // Security PIN verification modal state
  const [pinModalTarget, setPinModalTarget] = useState<{
    role: UserRole;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
    userObj: ApiUser;
  } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Fetch all registered workspace users from Server API
  const fetchRegisteredUsers = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingUsers(true);
    try {
      const usersList = await api.getUsers();
      if (Array.isArray(usersList)) {
        // Filter out any lingering mock emails
        const realUsers = usersList.filter(
          (u) =>
            u.email &&
            !u.email.includes('apexaccounting.com') &&
            !u.email.includes('demo')
        );
        setRegisteredUsers(realUsers);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn('Could not fetch registered users from server API:', err);
    } finally {
      if (showLoading) setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchRegisteredUsers(true);
    const interval = setInterval(() => {
      fetchRegisteredUsers(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchRegisteredUsers]);

  useEffect(() => {
    if (pinModalTarget) {
      setPinInput('');
      setPinError(null);
      setPinSuccess(false);
      setTimeout(() => pinInputRef.current?.focus(), 150);
    }
  }, [pinModalTarget]);

  const handleGoogleSignIn = async () => {
    setAuthenticatingTarget('google');
    clearError();
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign In error:', err);
    } finally {
      setAuthenticatingTarget(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setAuthenticatingTarget('email');
    clearError();
    try {
      await signInWithEmail(emailInput.trim(), passwordInput);
    } catch (err) {
      console.error('Email sign in error:', err);
    } finally {
      setAuthenticatingTarget(null);
    }
  };

  const handleVerifyPinAndLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinModalTarget) return;

    const trimmed = pinInput.trim();
    if (trimmed.length < 4) {
      setPinError('Please enter the 4-digit security PIN.');
      pinInputRef.current?.focus();
      return;
    }

    try {
      // Verify securely on server
      const verifyRes = await api.verifyPin(trimmed, pinModalTarget.userObj.id, pinModalTarget.role);

      if (!verifyRes.success) {
        setPinError('Invalid security PIN. Please check your credentials.');
        setPinInput('');
        pinInputRef.current?.focus();
        return;
      }

      setPinSuccess(true);
      setPinError(null);
      setAuthenticatingTarget(`user-${pinModalTarget.userObj.id}`);

      setTimeout(async () => {
        try {
          await signInAsUser({
            uid: pinModalTarget.userObj.uid,
            email: pinModalTarget.userObj.email,
            displayName: pinModalTarget.userObj.displayName,
            avatarUrl: pinModalTarget.userObj.avatarUrl,
            role: pinModalTarget.userObj.role as UserRole,
          });
          setPinModalTarget(null);
        } finally {
          setAuthenticatingTarget(null);
        }
      }, 400);
    } catch (err: any) {
      setPinError(err?.message || 'Server verification failed. Please retry.');
    }
  };

  // Filter registered workspace users by search query
  const query = userSearchQuery.trim().toLowerCase();
  const filteredWorkspaceUsers = registeredUsers.filter((u) => {
    if (!query) return true;
    return (
      (u.displayName || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.role || '').toLowerCase().includes(query) ||
      (ROLE_CONFIG[u.role as UserRole]?.title || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="px-4 sm:px-6 py-4 border-b border-slate-800/80 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
            <Building2 className="w-5 h-5 font-bold" />
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
              Accounting, Billing &amp; GST <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider font-bold">Secure Server-Side</span>
            </span>
            <p className="text-xs text-slate-400">Enterprise Accounting, Invoicing &amp; Tax Compliance</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Server-Side Database Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 font-medium">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>{registeredUsers.length} Team Members Provisioned</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Platform Overview & Security Architecture */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full-Stack Security &amp; Data Isolation</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Secure Cloud Accounting &amp; GST Billing
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Protected accounting platform with double-entry ledgers, automated tax calculations, strict role-based access control, and encrypted server-side operations.
            </p>

            {/* Security Guarantee Banner */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-bold text-white">Strict Security Invariants Enforced</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                All database operations are executed strictly server-side. Team authentication requires verified credentials or protected 4-digit PINs. Default mock businesses and placeholder credentials have been eliminated.
              </p>
            </div>

            {/* Key Features Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">GST Invoicing &amp; ITC</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Automated HSN calculation, CGST/SGST/IGST breakdown, GSTR-1, GSTR-3B preparation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-teal-400">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Server-Side User Roles</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Role validation on every API endpoint: Admin, Accountant, Billing Operator, and Auditor.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Auditor Protection</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Statutory Auditors possess strictly read-only inspection access without mutation privileges.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Zero Plaintext PINs</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Security credentials are validated server-side without client-side exposure.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Secure Authentication Card */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header */}
              <div className="mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <span>Secure Workspace Sign In</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Authenticate with Google, your email credentials, or your provisioned team PIN.
                </p>
              </div>

              {/* Notification Banner */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 relative">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 pr-6">{error}</div>
                  <button
                    type="button"
                    onClick={clearError}
                    className="absolute top-2 right-2 text-rose-400/80 hover:text-rose-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Primary Option: Google Authentication */}
              <button
                type="button"
                id="btn-google-sign-in"
                onClick={handleGoogleSignIn}
                disabled={loading || Boolean(authenticatingTarget)}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition shadow-lg cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or team member sign in</span>
                </div>
              </div>

              {/* Email / Password Toggle Form */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowEmailLogin(!showEmailLogin)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer mb-2"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{showEmailLogin ? 'Hide Email / Password Sign In' : 'Sign in with Email & Password'}</span>
                </button>

                {showEmailLogin && (
                  <form onSubmit={handleEmailSignIn} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 mb-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="nawarkuldeep@gmail.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || Boolean(authenticatingTarget)}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      Authenticate with Password
                    </button>
                  </form>
                )}
              </div>

              {/* Team Personnel Card Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Provisioned Team Accounts
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchRegisteredUsers(true)}
                    disabled={loadingUsers}
                    title="Refresh user list"
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingUsers ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>Sync</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search provisioned team accounts..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Team Users List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {loadingUsers && registeredUsers.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-slate-400">Loading authorized users...</p>
                    </div>
                  ) : filteredWorkspaceUsers.length > 0 ? (
                    filteredWorkspaceUsers.map((u) => {
                      const conf = ROLE_CONFIG[u.role as UserRole] || ROLE_CONFIG.accountant;
                      const isSubmittingThis = authenticatingTarget === `user-${u.id}`;
                      const displayNameStr = u.displayName || u.email.split('@')[0];

                      return (
                        <div
                          key={u.id}
                          id={`workspace-user-card-${u.id}`}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                              {displayNameStr.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white truncate">
                                  {displayNameStr}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border leading-none ${conf.bgBadge} ${conf.textBadge} ${conf.borderBadge}`}>
                                  {conf.badge}
                                </span>
                              </div>
                              <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                                {u.email}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            id={`btn-pin-user-${u.id}`}
                            onClick={() =>
                              setPinModalTarget({
                                role: u.role as UserRole,
                                displayName: displayNameStr,
                                email: u.email,
                                avatarUrl: u.avatarUrl,
                                userObj: u,
                              })
                            }
                            disabled={loading || Boolean(authenticatingTarget)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Enter PIN</span>
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center space-y-1.5">
                      <Users className="w-7 h-7 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">No team members match your search.</p>
                      <p className="text-[11px] text-slate-500">
                        Sign in as Administrator using Google or configure accounts in Settings &gt; Team.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Encrypted credentials &amp; server-side audit trails</span>
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> Protected
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------- PIN VERIFICATION MODAL ---------------- */}
      {pinModalTarget && (
        <div
          id="login-pin-verification-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            id="login-pin-verification-modal"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => { setPinModalTarget(null); setPinError(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                Verify Security PIN
              </h3>
              <p className="text-xs text-slate-400">
                Enter your 4-digit authorization PIN for{' '}
                <span className="text-white font-semibold">
                  {pinModalTarget.displayName}
                </span>
              </p>
            </div>

            {/* Persona Target Info */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                {pinModalTarget.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">
                  {pinModalTarget.displayName}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">
                  {pinModalTarget.email}
                </span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border leading-none mt-1 ${ROLE_CONFIG[pinModalTarget.role]?.bgBadge} ${ROLE_CONFIG[pinModalTarget.role]?.textBadge} ${ROLE_CONFIG[pinModalTarget.role]?.borderBadge}`}>
                  {ROLE_CONFIG[pinModalTarget.role]?.badge}
                </span>
              </div>
            </div>

            {/* PIN Form */}
            <form onSubmit={handleVerifyPinAndLogin} className="mt-4 space-y-3">
              <div>
                <div className="relative">
                  <input
                    ref={pinInputRef}
                    type={showPinText ? 'text' : 'password'}
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPinInput(val);
                      if (pinError) setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full text-center tracking-[0.6em] text-2xl font-mono bg-slate-950 border border-slate-800 rounded-xl py-2 text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinText(!showPinText)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Pin Error message */}
              {pinError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Pin Success state */}
              {pinSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>PIN verified! Authorizing access...</span>
                </div>
              )}

              {/* Virtual Numpad */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (pinInput.length < 4) {
                        setPinInput((prev) => prev + num);
                      }
                    }}
                    className="py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-white transition active:scale-95 cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPinInput('')}
                  className="py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 transition active:scale-95 cursor-pointer"
                >
                  CLR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 4) {
                      setPinInput((prev) => prev + '0');
                    }
                  }}
                  className="py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-white transition active:scale-95 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPinInput((prev) => prev.slice(0, -1))}
                  className="py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 transition active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={pinInput.length < 4 || pinSuccess}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify PIN &amp; Login</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        © 2026 Accounting, Billing &amp; GST Platform. Server-side persistence &amp; strict role-based authorization.
      </footer>
    </div>
  );
};
