import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEMO_RBAC_PERSONAS } from '../context/AuthContext';
import {
  Building2,
  ShieldCheck,
  Zap,
  Users,
  FileSpreadsheet,
  Lock,
  ArrowRight,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  X,
  Mail,
  KeyRound,
  UserPlus,
  LogIn,
  User,
  Shield,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Delete,
  ShieldAlert,
  BadgeCheck,
  FileText,
  ShoppingCart,
  Search,
} from 'lucide-react';
import {
  UserRole,
  ROLE_CONFIG,
  DEFAULT_ROLE_PINS,
  getRoleDefaultPin,
} from '../lib/permissions';

export const LoginView: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInDemoRole,
    loading,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'rbac' | 'signin' | 'register'>('rbac');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedInitialRole, setSelectedInitialRole] = useState<UserRole>('accountant');
  const [submitting, setSubmitting] = useState(false);
  const [authenticatingRole, setAuthenticatingRole] = useState<UserRole | null>(null);

  // Security PIN verification modal state on login page
  const [pinModalRole, setPinModalRole] = useState<UserRole | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pinModalRole) {
      setPinInput('');
      setPinError(null);
      setPinSuccess(false);
      setTimeout(() => pinInputRef.current?.focus(), 150);
    }
  }, [pinModalRole]);

  const handleInstantRoleLogin = async (role: UserRole) => {
    setAuthenticatingRole(role);
    clearError();
    try {
      await signInDemoRole(role);
    } finally {
      setAuthenticatingRole(null);
    }
  };

  const handleVerifyPinAndLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinModalRole) return;

    const trimmed = pinInput.trim();
    if (trimmed.length < 4) {
      setPinError('Please enter the 4-digit security PIN.');
      pinInputRef.current?.focus();
      return;
    }

    const expectedPin = getRoleDefaultPin(pinModalRole);
    const isMaster = trimmed === DEFAULT_ROLE_PINS.master || trimmed === '1234';

    if (trimmed !== expectedPin && !isMaster) {
      setPinError(`Invalid PIN for ${ROLE_CONFIG[pinModalRole].title}. Default PIN is ${expectedPin} (or Master 1234).`);
      setPinInput('');
      pinInputRef.current?.focus();
      return;
    }

    setPinSuccess(true);
    setPinError(null);
    setAuthenticatingRole(pinModalRole);

    setTimeout(async () => {
      try {
        await signInDemoRole(pinModalRole);
        setPinModalRole(null);
      } finally {
        setAuthenticatingRole(null);
      }
    }, 400);
  };

  const handleSubmitEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (mode === 'register' && !displayName) return;
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      // handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const rolesList: UserRole[] = ['admin', 'accountant', 'billing_operator', 'auditor'];

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
              Apex TallyGST <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider font-bold">RBAC Ready</span>
            </span>
            <p className="text-xs text-slate-400">Enterprise Cloud Accounting & Tax Compliance</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Cloud SQL PostgreSQL Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>4 Security Roles Configured</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Platform Overview & RBAC Permissions Matrix */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full GST Compliance (CGST, SGST, IGST & ITC)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Enterprise Role-Based Access Control (RBAC)
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Log in directly as any predefined role to test isolated permissions, financial authorizations, and PIN-secured switches.
            </p>

            {/* Quick RBAC Role Cards Matrix */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Security Roles & Access Privileges
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Admin */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-purple-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-purple-300">Administrator</span>
                      </div>
                      <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                        PIN: 9999
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Unconstrained authority: Master company profile, user accounts, role management, database restore & PIN settings.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>13 / 13 Modules</span>
                    <span className="text-purple-400 font-semibold">Full Authority</span>
                  </div>
                </div>

                {/* Senior Accountant */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-emerald-300">Senior Accountant</span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        PIN: 2222
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Complete financial accounting: Day book, journal vouchers, BRS, GSTR-1 & 3B, P&L, balance sheets & adjustments.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>13 / 13 Modules</span>
                    <span className="text-emerald-400 font-semibold">Financial Control</span>
                  </div>
                </div>

                {/* Billing Operator */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-blue-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-blue-300">Billing Operator</span>
                      </div>
                      <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">
                        PIN: 1111
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      POS & sales desk: Inward/outward bills, receipts, customer ledger lookup. Locked out of bank, journals & settings.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>6 Modules Only</span>
                    <span className="text-blue-400 font-semibold">POS Restricted</span>
                  </div>
                </div>

                {/* Statutory Auditor */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-amber-300">Statutory Auditor</span>
                      </div>
                      <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">
                        PIN: 3333
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Inspection authority: Complete read-only audit access across all books, GSTR-2B matching, and immutable audit logs.
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>12 Modules</span>
                    <span className="text-amber-400 font-semibold">Strict Read-Only</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Master Security Bypass PIN: <strong className="text-slate-200 font-mono">1234</strong> can unlock any role for development.
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Login / RBAC Selection Card */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Mode Toggle Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
                <button
                  type="button"
                  id="tab-rbac-mode"
                  onClick={() => { setMode('rbac'); clearError(); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'rbac'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  RBAC Roles
                </button>
                <button
                  type="button"
                  id="tab-signin-mode"
                  onClick={() => { setMode('signin'); clearError(); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Email Sign In
                </button>
                <button
                  type="button"
                  id="tab-register-mode"
                  onClick={() => { setMode('register'); clearError(); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'register'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Register
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

              {/* ---------------- MODE 1: RBAC ROLE SELECTION (DEFAULT) ---------------- */}
              {mode === 'rbac' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Select Security Persona</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                          Instant Access
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Choose a role below to log in directly or enter its PIN to verify:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {rolesList.map((roleKey) => {
                      const persona = DEMO_RBAC_PERSONAS[roleKey];
                      const conf = ROLE_CONFIG[roleKey];
                      const isSubmittingThis = authenticatingRole === roleKey;
                      const defaultPin = getRoleDefaultPin(roleKey);

                      return (
                        <div
                          key={roleKey}
                          id={`rbac-card-${roleKey}`}
                          className={`p-3 sm:p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            roleKey === 'admin'
                              ? 'bg-purple-950/20 border-purple-500/30 hover:border-purple-500/50'
                              : roleKey === 'accountant'
                              ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                              : roleKey === 'billing_operator'
                              ? 'bg-blue-950/20 border-blue-500/30 hover:border-blue-500/50'
                              : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={persona.photoURL}
                              alt={persona.displayName}
                              className={`w-10 h-10 rounded-full border-2 object-cover shrink-0 ${
                                roleKey === 'admin'
                                  ? 'border-purple-500'
                                  : roleKey === 'accountant'
                                  ? 'border-emerald-500'
                                  : roleKey === 'billing_operator'
                                  ? 'border-blue-500'
                                  : 'border-amber-500'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white truncate">
                                  {persona.displayName}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border leading-none ${conf.bgBadge} ${conf.textBadge} ${conf.borderBadge}`}>
                                  {conf.badge}
                                </span>
                              </div>
                              <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                                {persona.email}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                                  PIN: <strong className="text-slate-200">{defaultPin}</strong>
                                </span>
                                <span className="text-[10px] text-slate-500 hidden sm:inline">
                                  {persona.subtitle.slice(0, 35)}...
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Option 1: Enter PIN Button */}
                            <button
                              type="button"
                              id={`btn-pin-${roleKey}`}
                              onClick={() => setPinModalRole(roleKey)}
                              disabled={loading || Boolean(authenticatingRole)}
                              title={`Enter security PIN for ${conf.title}`}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">Enter PIN</span>
                            </button>

                            {/* Option 2: Instant Login Button */}
                            <button
                              type="button"
                              id={`btn-instant-login-${roleKey}`}
                              onClick={() => handleInstantRoleLogin(roleKey)}
                              disabled={loading || Boolean(authenticatingRole)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow active:scale-[0.98] disabled:opacity-50 ${
                                roleKey === 'admin'
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : roleKey === 'accountant'
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : roleKey === 'billing_operator'
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white'
                              }`}
                            >
                              {isSubmittingThis ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Entering...</span>
                                </>
                              ) : (
                                <>
                                  <LogIn className="w-3.5 h-3.5" />
                                  <span>Login</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Switching between roles tests instant permission recalculation.</span>
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="text-emerald-400 hover:underline cursor-pointer"
                    >
                      Use Custom Email →
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------- MODE 2: EMAIL SIGN IN ---------------- */}
              {mode === 'signin' && (
                <div>
                  <form onSubmit={handleSubmitEmailAuth} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. ca.kuldeep@apexaccounting.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || submitting}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitting ? 'Authenticating...' : 'Sign In with Email'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-900 px-2 text-slate-500 font-medium">Or continue with</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      disabled={loading || submitting}
                      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-medium text-slate-900 bg-white hover:bg-slate-100 transition shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer text-xs"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                        />
                      </svg>
                      <span className="font-semibold">Sign in with Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('rbac')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-xs cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Back to RBAC Role Selectors (4 Roles)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------- MODE 3: REGISTER ---------------- */}
              {mode === 'register' && (
                <div>
                  <form onSubmit={handleSubmitEmailAuth} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. CA Kuldeep Nawar"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. kuldeep@apexaccounting.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                        />
                      </div>
                    </div>

                    {/* Initial Role Selection */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Initial Assigned Role
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {rolesList.map((r) => {
                          const conf = ROLE_CONFIG[r];
                          const isSelected = selectedInitialRole === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setSelectedInitialRole(r)}
                              className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-800 border-emerald-500 text-white shadow'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${conf.textBadge}`}>
                                  {conf.title}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                              </div>
                              <span className="block text-[10px] text-slate-500 mt-0.5 truncate">
                                {conf.description.slice(0, 30)}...
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || submitting}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submitting ? 'Creating Account...' : 'Register New Account'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ---------------- INTERACTIVE PIN VERIFICATION MODAL ON LOGIN PAGE ---------------- */}
      {pinModalRole && (
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
              onClick={() => { setPinModalRole(null); setPinError(null); }}
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
                Verify Role Security PIN
              </h3>
              <p className="text-xs text-slate-400">
                Enter the 4-digit authorization PIN for{' '}
                <span className="text-white font-semibold">
                  {ROLE_CONFIG[pinModalRole].title}
                </span>
              </p>
            </div>

            {/* Persona Target Info */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <img
                src={DEMO_RBAC_PERSONAS[pinModalRole].photoURL}
                alt={DEMO_RBAC_PERSONAS[pinModalRole].displayName}
                className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0"
              />
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">
                  {DEMO_RBAC_PERSONAS[pinModalRole].displayName}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">
                  {DEMO_RBAC_PERSONAS[pinModalRole].email}
                </span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border leading-none mt-1 ${ROLE_CONFIG[pinModalRole].bgBadge} ${ROLE_CONFIG[pinModalRole].textBadge} ${ROLE_CONFIG[pinModalRole].borderBadge}`}>
                  {ROLE_CONFIG[pinModalRole].badge}
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
                  <span>PIN verified! Logging into {ROLE_CONFIG[pinModalRole].title}...</span>
                </div>
              )}

              {/* Quick Fill Default PIN Helper */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 text-[11px]">Quick Autofill:</span>
                <button
                  type="button"
                  onClick={() => {
                    const pin = getRoleDefaultPin(pinModalRole);
                    setPinInput(pin);
                    setPinError(null);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-[11px] font-mono border border-slate-700 cursor-pointer"
                >
                  Use PIN: {getRoleDefaultPin(pinModalRole)}
                </button>
              </div>

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
                className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify PIN & Login</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        © 2026 Apex TallyGST Accounting Platform. Multi-role cloud synchronization, PIN-secured RBAC & automated tax compliance.
      </footer>
    </div>
  );
};
