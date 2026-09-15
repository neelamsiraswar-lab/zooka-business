import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_CONFIG } from '../lib/permissions';
import {
  Building2,
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  AlertTriangle,
  LogIn,
  Eye,
  EyeOff,
  FileText,
  Users,
  UserPlus,
  CheckCircle2,
  Shield,
  CreditCard,
  Landmark,
  Crown,
  Sparkles,
  KeyRound,
  X,
  ArrowRight,
} from 'lucide-react';

import { createWorkspace } from '../db/workspaces';
import { INDIAN_STATES } from '../data/indianStates';

export const LoginView: React.FC = () => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInSuperAdmin,
    loading,
    error,
    clearError,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In Form States
  const [email, setEmail] = useState('admin.rohit@apexaccounting.com');
  const [password, setPassword] = useState('Admin@2026');
  const [showPassword, setShowPassword] = useState(false);

  // Super Admin Modal States
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('nawarkuldeep@gmail.com');
  const [superAdminPassword, setSuperAdminPassword] = useState('Kuldeep@2785');
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [superAdminError, setSuperAdminError] = useState<string | null>(null);

  // Sign Up & Workspace Registration Form States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('accountant');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [signupWorkspaceName, setSignupWorkspaceName] = useState('');
  const [signupBusinessName, setSignupBusinessName] = useState('');
  const [signupGstin, setSignupGstin] = useState('');
  const [signupStateCode, setSignupStateCode] = useState('27');
  const [signupAddress, setSignupAddress] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPlan, setSignupPlan] = useState<string>('professional');

  // General States
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Platform White-Label Branding
  const [platformAppName, setPlatformAppName] = useState(() => localStorage.getItem('platform_app_name') || 'Apex TallyGST');
  const [platformAppTagline, setPlatformAppTagline] = useState(() => localStorage.getItem('platform_app_tagline') || 'Multi-Tenant Accounting & GST Compliance');
  const [platformAppLogo, setPlatformAppLogo] = useState(() => localStorage.getItem('platform_app_logo') || '');
  const [platformFooterCopyright, setPlatformFooterCopyright] = useState(() => localStorage.getItem('platform_footer_copyright') || '© 2026 Apex TallyGST Accounting Platform. Multi-tenant cloud synchronization, verified role-based access & automated tax compliance.');

  useEffect(() => {
    const handleBrandingUpdate = () => {
      setPlatformAppName(localStorage.getItem('platform_app_name') || 'Apex TallyGST');
      setPlatformAppTagline(localStorage.getItem('platform_app_tagline') || 'Multi-Tenant Accounting & GST Compliance');
      setPlatformAppLogo(localStorage.getItem('platform_app_logo') || '');
      setPlatformFooterCopyright(localStorage.getItem('platform_footer_copyright') || '© 2026 Apex TallyGST Accounting Platform. Multi-tenant cloud synchronization, verified role-based access & automated tax compliance.');
    };
    window.addEventListener('platform_branding_updated', handleBrandingUpdate);
    return () => {
      window.removeEventListener('platform_branding_updated', handleBrandingUpdate);
    };
  }, []);

  // Quick autofill preset handler
  const handleSelectPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setLocalError(null);
    clearError();
  };

  // Handle Quick Super Admin 1-Click Login
  const handleInstantSuperAdminLogin = async () => {
    setSuperAdminError(null);
    setSuperAdminLoading(true);
    try {
      await signInSuperAdmin();
    } catch (err: any) {
      setSuperAdminError(err?.message || 'Failed to authenticate Super Admin.');
    } finally {
      setSuperAdminLoading(false);
    }
  };

  // Handle Super Admin Form Submit
  const handleSuperAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuperAdminError(null);
    const trimmedEmail = superAdminEmail.trim();
    const trimmedPass = superAdminPassword.trim();
    if (!trimmedEmail || !trimmedPass) {
      setSuperAdminError('Please provide Super Admin email and credentials.');
      return;
    }
    setSuperAdminLoading(true);
    try {
      await signInWithEmail(trimmedEmail, trimmedPass);
    } catch (err: any) {
      setSuperAdminError(err?.message || 'Super Admin authentication failed.');
    } finally {
      setSuperAdminLoading(false);
    }
  };

  // Handle Sign In Submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmail(trimmedEmail, password);
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please check your credentials.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setLocalError('Invalid email or password. Please verify your credentials or create a new account.');
      } else if (msg.includes('auth/invalid-email')) {
        setLocalError('Please enter a valid email address.');
      } else {
        setLocalError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    clearError();

    const trimmedName = signupName.trim();
    const trimmedEmail = signupEmail.trim();
    const trimmedPass = signupPassword.trim();
    const trimmedConfirm = signupConfirmPassword.trim();

    if (!trimmedName) {
      setLocalError('Please provide your full name.');
      return;
    }

    if (!trimmedEmail) {
      setLocalError('Please provide a corporate email address.');
      return;
    }

    if (!trimmedPass) {
      setLocalError('Please enter a secure password.');
      return;
    }

    if (trimmedPass.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (trimmedPass !== trimmedConfirm) {
      setLocalError('Passwords do not match. Please verify and retry.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUpWithEmail(trimmedEmail, trimmedPass, trimmedName, signupRole);

      // Create workspace with full details
      const wsName = signupWorkspaceName.trim() || `${trimmedName.split(' ')[0]}'s Company`;
      const stateObj = INDIAN_STATES.find((s) => s.code === signupStateCode);
      await createWorkspace({
        name: wsName,
        businessName: (signupBusinessName || wsName).trim(),
        gstin: signupGstin.trim().toUpperCase(),
        stateCode: signupStateCode,
        stateName: stateObj ? stateObj.name : 'Maharashtra',
        address: signupAddress.trim(),
        phone: signupPhone.trim(),
        email: trimmedEmail,
        ownerEmail: trimmedEmail,
        ownerName: trimmedName,
        plan: signupPlan as any,
        status: 'active',
      }, trimmedEmail);

      setLocalSuccess('Account & workspace registered successfully! Entering...');
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account.';
      if (msg.includes('auth/email-already-in-use')) {
        setLocalError('An account with this email already exists. Please sign in instead.');
      } else {
        setLocalError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative">
      {/* Top Navigation Bar */}
      <header className="px-4 sm:px-6 py-4 border-b border-slate-800/80 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          {platformAppLogo ? (
            <img
              src={platformAppLogo}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-slate-800 p-1 shadow-lg"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <Building2 className="w-5 h-5 font-bold" />
            </div>
          )}
          <div>
            <span className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
              {platformAppName}{' '}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider font-bold">
                Enterprise Cloud
              </span>
            </span>
            <p className="text-xs text-slate-400">{platformAppTagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Super Admin Login Action from Home Header */}
          <button
            type="button"
            id="btn-header-super-admin-login"
            onClick={() => {
              setSuperAdminError(null);
              setShowSuperAdminModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-600/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold transition cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95"
            title="Access Super Administrator Console"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Super Admin Login</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cloud Firestore Synced</span>
          </div>
        </div>
      </header>

      {/* Super Admin Login Modal Dialog */}
      {showSuperAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div
            id="modal-super-admin-login"
            className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Super Admin Portal
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-bold">
                      Master Access
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Supreme Multi-Tenant Governance</p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-super-admin-modal"
                onClick={() => setShowSuperAdminModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Super Admin Error Banner */}
            {superAdminError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">{superAdminError}</div>
              </div>
            )}

            {/* Quick 1-Click Super Admin Login Button */}
            <div className="mt-5 space-y-3">
              <button
                type="button"
                id="btn-super-admin-1click"
                disabled={superAdminLoading || loading}
                onClick={handleInstantSuperAdminLogin}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {superAdminLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Entering Super Admin Console...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Instant 1-Click Super Admin Access</span>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-500">or sign in with credentials</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Super Admin Credential Form */}
              <form onSubmit={handleSuperAdminSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block font-medium text-slate-300">Super Admin Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5 pointer-events-none" />
                    <input
                      type="email"
                      id="input-super-admin-email"
                      required
                      value={superAdminEmail}
                      onChange={(e) => setSuperAdminEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-300">Master Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5 pointer-events-none" />
                    <input
                      type={showSuperAdminPassword ? 'text' : 'password'}
                      id="input-super-admin-password"
                      required
                      value={superAdminPassword}
                      onChange={(e) => setSuperAdminPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showSuperAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-super-admin-submit-form"
                  disabled={superAdminLoading || loading}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Authenticate Super Admin Credentials</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Platform Overview & Enterprise Trust */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full GST Compliance (CGST, SGST, IGST &amp; ITC)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Enterprise Cloud Accounting &amp; GST Compliance
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Secure role-based accounting, double-entry general ledgers, tax filings, and automated GSTR-2B reconciliation backed by Google Cloud Firestore.
            </p>

            {/* Key Features Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Full GST Invoicing</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Automated HSN calculation, tax splits, GSTR-1, GSTR-3B preparation and Day Book tracking.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-teal-400">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Role-Based Access (RBAC)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Fine-grained permissions for Workspace Admins, Senior Accountants, Billing Clerks, and Auditors.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Landmark className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Banking &amp; Auto BRS</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Cheque management, PDF/Excel bank statement parsing, and instant ledger reconciliation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Audit Trail Logging</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Immutable audit records for all vouchers, master edits, ledger syncs, and user sessions.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card with Sign In / Create Account tabs */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Mode Toggle Tabs (Sign In vs Create Account) */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
                <button
                  type="button"
                  id="tab-mode-signin"
                  onClick={() => {
                    setAuthMode('signin');
                    setLocalError(null);
                    setLocalSuccess(null);
                    clearError();
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  id="tab-mode-signup"
                  onClick={() => {
                    setAuthMode('signup');
                    setLocalError(null);
                    setLocalSuccess(null);
                    clearError();
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account / Register</span>
                </button>
              </div>

              {/* Feedback Banners */}
              {activeError && (
                <div
                  id="auth-error-banner"
                  className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{activeError}</div>
                </div>
              )}

              {localSuccess && (
                <div
                  id="auth-success-banner"
                  className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{localSuccess}</div>
                </div>
              )}

              {/* ----------------- SIGN IN FORM ----------------- */}
              {authMode === 'signin' ? (
                <form onSubmit={handleSignInSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="block font-medium text-slate-300">Corporate Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="email"
                        id="input-auth-email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-medium text-slate-300">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="input-auth-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="btn-auth-submit"
                    disabled={loading || isSubmitting}
                    className="w-full py-3 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting || loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to Workspace</span>
                      </>
                    )}
                  </button>

                  {/* Quick Preset Roles Bar */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="text-[11px] text-slate-400 mb-2 font-medium flex items-center justify-between">
                      <span>Quick Demo Logins:</span>
                      <span className="text-[10px] text-slate-500">Click to autofill</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectPreset('admin.rohit@apexaccounting.com', 'Admin@2026')}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition cursor-pointer"
                      >
                        <div className="text-[11px] font-semibold text-emerald-400 truncate">Admin</div>
                        <div className="text-[9px] text-slate-500 truncate">Rohit</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset('ca.kuldeep@apexaccounting.com', 'Accountant@2026')}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-left transition cursor-pointer"
                      >
                        <div className="text-[11px] font-semibold text-teal-400 truncate">Accountant</div>
                        <div className="text-[9px] text-slate-500 truncate">CA Kuldeep</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset('billing.vikram@apexaccounting.com', 'Billing@2026')}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-left transition cursor-pointer"
                      >
                        <div className="text-[11px] font-semibold text-indigo-400 truncate">Billing</div>
                        <div className="text-[9px] text-slate-500 truncate">Vikram</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset('auditor.kavita@apexaccounting.com', 'Auditor@2026')}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition cursor-pointer"
                      >
                        <div className="text-[11px] font-semibold text-amber-400 truncate">Auditor</div>
                        <div className="text-[9px] text-slate-500 truncate">Kavita</div>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* ----------------- CREATE ACCOUNT / REGISTER FORM ----------------- */
                <form onSubmit={handleSignUpSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="block font-medium text-slate-300">Full Name *</label>
                    <input
                      type="text"
                      id="input-signup-name"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Kuldeep Siraswar"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-medium text-slate-300">Corporate Email Address (Login ID) *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5 pointer-events-none" />
                      <input
                        type="email"
                        id="input-signup-email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-medium text-slate-300">Assign Security Role *</label>
                    <select
                      id="select-signup-role"
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value as UserRole)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 transition text-xs cursor-pointer font-medium"
                    >
                      <option value="admin">Workspace Administrator (Full Company Management)</option>
                      <option value="accountant">Senior Accountant (Ledgers, GST, Vouchers)</option>
                      <option value="billing_operator">Billing Operator (Invoices, POS &amp; Stock)</option>
                      <option value="auditor">Statutory Auditor (Read-Only Compliance)</option>
                    </select>
                  </div>

                  {/* Workspace Registration Section */}
                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Workspace & Company Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-300">Workspace / Company Name *</label>
                        <input
                          type="text"
                          required
                          value={signupWorkspaceName}
                          onChange={(e) => setSignupWorkspaceName(e.target.value)}
                          placeholder="e.g. Apex Industrial Tech"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-medium text-slate-300">Legal Business Name</label>
                        <input
                          type="text"
                          value={signupBusinessName}
                          onChange={(e) => setSignupBusinessName(e.target.value)}
                          placeholder="e.g. Apex Industrial Pvt Ltd"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-300">GSTIN Number</label>
                        <input
                          type="text"
                          maxLength={15}
                          value={signupGstin}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setSignupGstin(val);
                            if (val.length >= 2) {
                              const prefix = val.substring(0, 2);
                              const matched = INDIAN_STATES.find((s) => s.code === prefix);
                              if (matched) {
                                setSignupStateCode(prefix);
                              }
                            }
                          }}
                          placeholder="e.g. 27AAECB9382M1ZR"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-medium text-slate-300">GST State & Jurisdiction</label>
                        <select
                          value={signupStateCode}
                          onChange={(e) => setSignupStateCode(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 transition text-xs cursor-pointer"
                        >
                          {INDIAN_STATES.map((s) => (
                            <option key={s.code} value={s.code}>
                              {s.code} - {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-300">Registered Address</label>
                        <input
                          type="text"
                          value={signupAddress}
                          onChange={(e) => setSignupAddress(e.target.value)}
                          placeholder="e.g. BKC Bandra East, Mumbai"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-medium text-slate-300">Business Phone</label>
                        <input
                          type="text"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          placeholder="e.g. +91 9876543210"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-medium text-slate-300">Initial Subscription Plan</label>
                      <select
                        value={signupPlan}
                        onChange={(e) => setSignupPlan(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 transition text-xs cursor-pointer font-medium"
                      >
                        <option value="starter">Starter Plan (₹999/mo - Up to 2 Users, 150 Invoices)</option>
                        <option value="professional">Professional Plan (₹2,499/mo - 10 Users, Unlimited Invoices)</option>
                        <option value="enterprise">Enterprise Plan (₹6,999/mo - Unlimited Users &amp; Multi-Branch)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-medium text-slate-300">Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          id="input-signup-password"
                          required
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-medium text-slate-300">Confirm Password *</label>
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        id="input-signup-confirm-password"
                        required
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                      />
                    </div>
                  </div>

                  {/* Create Account Submit Button */}
                  <button
                    type="submit"
                    id="btn-signup-submit"
                    disabled={loading || isSubmitting}
                    className="w-full py-3 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting || loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Login &amp; Enter Workspace</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 underline cursor-pointer"
                    >
                      Already have an account? Sign In here
                    </button>
                  </div>
                </form>
              )}

              {/* Footer Note */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secure SSL Cloud Sync
                </span>
                <span>Role-Based Access Control Active</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        {platformFooterCopyright}
      </footer>
    </div>
  );
};
