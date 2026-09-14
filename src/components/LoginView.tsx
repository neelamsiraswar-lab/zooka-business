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
  Mail,
  ArrowRight,
} from 'lucide-react';
import {
  UserRole,
  ROLE_CONFIG,
} from '../lib/permissions';

interface RegisteredWorkspaceUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  hasPin?: boolean;
  avatarUrl: string | null;
  createdAt?: string;
}

export const LoginView: React.FC = () => {
  const {
    signInAsUser,
    loading,
    error,
    clearError,
  } = useAuth();

  const [authenticatingTarget, setAuthenticatingTarget] = useState<string | null>(null);

  // Authentication mode tabs: 'directory' (select provisioned user) or 'direct' (email & PIN)
  const [loginTab, setLoginTab] = useState<'directory' | 'direct'>('directory');

  // Direct login form state
  const [directEmail, setDirectEmail] = useState<string>('');
  const [directPin, setDirectPin] = useState<string>('');
  const [showDirectPin, setShowDirectPin] = useState<boolean>(false);
  const [directLoading, setDirectLoading] = useState<boolean>(false);
  const [directError, setDirectError] = useState<string | null>(null);

  // Live registered users fetched automatically from backend
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredWorkspaceUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Security PIN verification modal state on login page
  const [pinModalTarget, setPinModalTarget] = useState<{
    role: UserRole;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
    userObj?: RegisteredWorkspaceUser;
  } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [restoringAdmin, setRestoringAdmin] = useState<boolean>(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreAdmin = async () => {
    setRestoringAdmin(true);
    try {
      const res = await fetch('/api/public/restore-admin', { method: 'POST' });
      if (res.ok) {
        await fetchRegisteredUsers(true);
      }
    } catch (err) {
      console.error('Failed to restore admin profile:', err);
    } finally {
      setRestoringAdmin(false);
    }
  };

  // Fetch all registered workspace users from API
  const fetchRegisteredUsers = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingUsers(true);
    try {
      const res = await fetch('/api/public/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRegisteredUsers(data);
          setLastSyncTime(new Date());
        }
      }
    } catch (err) {
      console.warn('Could not auto-fetch registered users from server:', err);
    } finally {
      if (showLoading) setLoadingUsers(false);
    }
  }, []);

  // Auto-fetch on mount and poll periodically every 8s so new/edited users appear live
  useEffect(() => {
    fetchRegisteredUsers(true);
    const interval = setInterval(() => {
      fetchRegisteredUsers(false);
    }, 8000);
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

  const handleVerifyPinAndLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinModalTarget) return;

    const trimmed = pinInput.trim();
    if (trimmed.length < 4) {
      setPinError('Please enter your 4-digit security PIN.');
      pinInputRef.current?.focus();
      return;
    }

    try {
      // Secure server-side PIN verification
      const verifyRes = await fetch('/api/public/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pinModalTarget.userObj?.id,
          email: pinModalTarget.email,
          role: pinModalTarget.role,
          pin: trimmed,
        }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok || !verifyData.valid) {
        setPinError(verifyData.error || 'Incorrect Security PIN. Please try again.');
        setPinInput('');
        pinInputRef.current?.focus();
        return;
      }

      setPinSuccess(true);
      setPinError(null);
      setAuthenticatingTarget(pinModalTarget.userObj ? `user-${pinModalTarget.userObj.id}` : `role-${pinModalTarget.role}`);

      setTimeout(async () => {
        try {
          const userPayload = verifyData.user || pinModalTarget.userObj || {
            uid: `user-${Date.now()}`,
            email: pinModalTarget.email,
            displayName: pinModalTarget.displayName,
            avatarUrl: pinModalTarget.avatarUrl,
            role: pinModalTarget.role,
          };
          await signInAsUser({
            uid: userPayload.uid,
            email: userPayload.email,
            displayName: userPayload.displayName,
            avatarUrl: userPayload.avatarUrl,
            role: userPayload.role,
          });
          setPinModalTarget(null);
        } finally {
          setAuthenticatingTarget(null);
        }
      }, 350);
    } catch (err: any) {
      setPinError(err?.message || 'Verification service error. Please try again.');
      setPinInput('');
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError(null);
    clearError();
    const email = directEmail.trim();
    const pin = directPin.trim();

    if (!email) {
      setDirectError('Please enter your workspace email address.');
      return;
    }
    if (pin.length < 4) {
      setDirectError('Please enter your 4-digit security PIN.');
      return;
    }

    setDirectLoading(true);
    try {
      const res = await fetch('/api/public/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.valid || !data.user) {
        setDirectError(data.error || 'Invalid email address or PIN.');
        return;
      }
      await signInAsUser(data.user);
    } catch (err: any) {
      setDirectError(err?.message || 'Login failed. Please try again.');
    } finally {
      setDirectLoading(false);
    }
  };

  // Filter dynamic registered workspace users by search query
  const query = userSearchQuery.trim().toLowerCase();
  const filteredWorkspaceUsers = registeredUsers.filter((u) => {
    if (!query) return true;
    return (
      (u.displayName || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.role || '').toLowerCase().includes(query) ||
      (ROLE_CONFIG[u.role]?.title || '').toLowerCase().includes(query)
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
              Apex TallyGST <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider font-bold">Admin Managed</span>
            </span>
            <p className="text-xs text-slate-400">Enterprise Cloud Accounting &amp; Tax Compliance</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Supabase PostgreSQL Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 font-medium">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>{registeredUsers.length} Workspace Users Registered</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Platform Overview & Security Architecture */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full GST Compliance (CGST, SGST, IGST &amp; ITC)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Enterprise Multi-User Cloud Accounting
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Secure role-based accounting, double-entry general ledgers, tax filings, and verified 4-digit PIN authentication for provisioned workspace personnel.
            </p>

            {/* Admin Management Policy Notice */}
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <div className="flex items-center gap-2 text-purple-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold text-white">Centralized Administrator Control</span>
              </div>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                Public self-registration is strictly disabled. Only workspace <strong>Administrators</strong> can provision team accounts, assign security roles, and configure 4-digit access PINs in <strong>Settings &gt; Team &amp; RBAC</strong>.
              </p>
            </div>

            {/* Key Features Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Full GST Invoicing &amp; Ledgers</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Automated HSN calculation, tax splits, GSTR-1, GSTR-3B preparation and Day Book tracking.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-teal-400">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Dynamic User Management</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Live team directory synchronized directly with Supabase PostgreSQL.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Role-Based Security</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Fine-grained permissions for Admins, Accountants, Billing Operators, and Statutory Auditors.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400">
                  <KeyRound className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">4-Digit PIN Security</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Zero unauthenticated access. Every session requires verified 4-digit PIN authorization.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>Workspace Sign In</span>
                  </h2>
                  <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300"
                    title={`Last updated at ${lastSyncTime.toLocaleTimeString()}`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] font-medium text-emerald-400">
                      Live Sync ({registeredUsers.length} Users)
                    </span>
                    <button
                      type="button"
                      id="btn-refresh-users-homepage"
                      onClick={() => fetchRegisteredUsers(true)}
                      disabled={loadingUsers}
                      title="Refresh live users list from database"
                      className="ml-1 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingUsers ? 'animate-spin text-emerald-400' : ''}`} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Enter your registered credentials or select your provisioned account to sign in:
                </p>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl mb-4">
                <button
                  type="button"
                  id="tab-select-account"
                  onClick={() => { setLoginTab('directory'); setDirectError(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    loginTab === 'directory'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Select Account</span>
                </button>
                <button
                  type="button"
                  id="tab-direct-login"
                  onClick={() => { setLoginTab('direct'); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    loginTab === 'direct'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Email &amp; PIN</span>
                </button>
              </div>

              {/* Notification Banner */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2 relative animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="flex-1 pr-6">{error}</div>
                  <button
                    type="button"
                    onClick={clearError}
                    className="absolute top-2 right-2 text-amber-400/80 hover:text-amber-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* TAB 1: DIRECT EMAIL & PIN FORM */}
              {loginTab === 'direct' && (
                <form onSubmit={handleDirectLogin} className="space-y-4 py-1 animate-fade-in">
                  {directError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{directError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Workspace Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        id="input-direct-email"
                        required
                        value={directEmail}
                        onChange={(e) => setDirectEmail(e.target.value)}
                        placeholder="your.email@company.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      4-Digit Security PIN
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showDirectPin ? 'text' : 'password'}
                        id="input-direct-pin"
                        required
                        maxLength={4}
                        value={directPin}
                        onChange={(e) => setDirectPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDirectPin(!showDirectPin)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showDirectPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Provided by your Administrator during onboarding.
                    </p>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-direct-login"
                    disabled={directLoading || !directEmail.trim() || directPin.length < 4}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-950/40 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {directLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to Workspace</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: PROVISIONED USERS DIRECTORY */}
              {loginTab === 'directory' && (
                <div className="space-y-3 animate-fade-in">
                  {/* Live Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      id="input-search-users"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search accounts by name, email, or role..."
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

                  {/* Dynamic Workspace Users List */}
                  <div className="space-y-2.5">
                    {loadingUsers && registeredUsers.length === 0 ? (
                      <div className="py-12 text-center space-y-2">
                        <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs text-slate-400">Loading registered workspace users...</p>
                      </div>
                    ) : filteredWorkspaceUsers.length > 0 ? (
                      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                        {filteredWorkspaceUsers.map((u) => {
                          const conf = ROLE_CONFIG[u.role] || ROLE_CONFIG.accountant;
                          const displayNameStr = u.displayName || u.email.split('@')[0];
                          const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayNameStr)}`;

                          return (
                            <div
                              key={u.id}
                              id={`workspace-user-card-${u.id}`}
                              onClick={() =>
                                setPinModalTarget({
                                  role: u.role || 'accountant',
                                  displayName: displayNameStr,
                                  email: u.email,
                                  avatarUrl: u.avatarUrl,
                                  userObj: u,
                                })
                              }
                              className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group ${
                                u.role === 'admin'
                                  ? 'bg-purple-950/20 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-950/30'
                                  : u.role === 'billing_operator'
                                  ? 'bg-blue-950/20 border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-950/30'
                                  : u.role === 'auditor'
                                  ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-950/30'
                                  : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-950/30'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={u.avatarUrl || fallbackAvatar}
                                  alt={displayNameStr}
                                  className={`w-11 h-11 rounded-full border-2 object-cover shrink-0 ${
                                    u.role === 'admin'
                                      ? 'border-purple-500'
                                      : u.role === 'billing_operator'
                                      ? 'border-blue-500'
                                      : u.role === 'auditor'
                                      ? 'border-amber-500'
                                      : 'border-emerald-500'
                                  }`}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition">
                                      {displayNameStr}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border leading-none ${conf.bgBadge} ${conf.textBadge} ${conf.borderBadge}`}>
                                      {conf.badge}
                                    </span>
                                  </div>
                                  <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                                    {u.email}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-medium text-emerald-400/90 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5 text-emerald-400" />
                                      <span>PIN Protected</span>
                                    </span>
                                    {u.createdAt && (
                                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(u.createdAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  id={`btn-pin-user-${u.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPinModalTarget({
                                      role: u.role || 'accountant',
                                      displayName: displayNameStr,
                                      email: u.email,
                                      avatarUrl: u.avatarUrl,
                                      userObj: u,
                                    });
                                  }}
                                  disabled={loading || Boolean(authenticatingTarget)}
                                  title={`Authenticate with PIN for ${displayNameStr}`}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow active:scale-[0.98] disabled:opacity-50 ${
                                    u.role === 'admin'
                                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                      : u.role === 'billing_operator'
                                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                      : u.role === 'auditor'
                                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  }`}
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>Sign In</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center space-y-2">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400">
                          {userSearchQuery
                            ? `No registered workspace users match "${userSearchQuery}".`
                            : 'No workspace users found.'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          New users must be provisioned by the Administrator inside Settings &gt; Team &amp; RBAC.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>Role-based access control &amp; audit trails.</span>
                <div className="flex items-center gap-3">
                  {!registeredUsers.some(u => u.role === 'admin') && (
                    <button
                      type="button"
                      id="btn-recover-admin-homepage"
                      onClick={handleRestoreAdmin}
                      disabled={restoringAdmin}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
                    >
                      {restoringAdmin ? 'Restoring Admin...' : 'Restore Admin Profile'}
                    </button>
                  )}
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> PIN Protected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------- INTERACTIVE PIN VERIFICATION MODAL ON LOGIN PAGE ---------------- */}
      {pinModalTarget && (
        <div
          id="login-pin-verification-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            id="login-pin-verification-modal"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-scale-up"
          >
            <button
              type="button"
              id="btn-close-pin-modal"
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
                Enter Security PIN
              </h3>
              <p className="text-xs text-slate-400">
                Enter the 4-digit authorization PIN for{' '}
                <span className="text-white font-semibold">
                  {pinModalTarget.displayName}
                </span>
              </p>
            </div>

            {/* Account Target Info */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <img
                src={pinModalTarget.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(pinModalTarget.displayName)}`}
                alt={pinModalTarget.displayName}
                className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0"
              />
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
                    id="input-pin-code"
                    type={showPinText ? 'text' : 'password'}
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPinInput(val);
                      if (pinError) setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full text-center tracking-[0.6em] text-2xl font-mono bg-slate-950 border border-slate-800 rounded-xl py-2 text-white focus:outline-none focus:border-amber-500 transition"
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
                  <span>PIN verified! Logging in...</span>
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
                id="btn-verify-pin-submit"
                disabled={pinInput.length < 4 || pinSuccess}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify PIN &amp; Sign In</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        © 2026 Apex TallyGST Accounting Platform. Multi-role cloud synchronization, PIN-secured RBAC &amp; automated tax compliance.
      </footer>
    </div>
  );
};
