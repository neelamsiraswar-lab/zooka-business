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
import { FirestoreConnectionModal } from './FirestoreConnectionModal';
import { getAllSubscriptionPlans } from '../db/subscriptionPlans';
import { PlanTierConfig, DEFAULT_BUILTIN_PLANS, formatINR, PLAN_COLOR_PRESETS } from '../data/subscriptionPlans';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Super Admin Modal States
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [showFirestoreModal, setShowFirestoreModal] = useState(false);
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);
  const [superAdminLoading, setSuperAdminLoading] = useState(false);
  const [superAdminError, setSuperAdminError] = useState<string | null>(null);

  // Dynamic Subscription Plans State (Synced with Super Admin Firestore Catalog)
  const [availablePlans, setAvailablePlans] = useState<PlanTierConfig[]>(DEFAULT_BUILTIN_PLANS);
  const [plansLoading, setPlansLoading] = useState<boolean>(true);
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'annual'>('annual');

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

  // Load live subscription plans from Super Admin Firestore Catalog
  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const fetched = await getAllSubscriptionPlans();
      if (fetched && fetched.length > 0) {
        // Filter out archived plans from public landing page
        const activeOnly = fetched.filter((p) => p.status !== 'archived');
        const listToUse = activeOnly.length > 0 ? activeOnly : fetched;
        setAvailablePlans(listToUse);

        // Ensure selected plan is valid in catalog
        setSignupPlan((prev) => {
          if (listToUse.some((p) => p.id === prev)) return prev;
          const proPlan = listToUse.find((p) => p.id === 'professional');
          return proPlan ? proPlan.id : listToUse[0].id;
        });
      }
    } catch (err) {
      console.error('Failed to load subscription plans in LoginView:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    const handlePlansUpdate = () => {
      loadPlans();
    };
    window.addEventListener('subscription_plans_updated', handlePlansUpdate);
    return () => {
      window.removeEventListener('subscription_plans_updated', handlePlansUpdate);
    };
  }, []);

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

      // Create workspace with full details from selected live plan
      const wsName = signupWorkspaceName.trim() || `${trimmedName.split(' ')[0]}'s Company`;
      const stateObj = INDIAN_STATES.find((s) => s.code === signupStateCode);
      const selectedPlanObj = availablePlans.find((p) => p.id === signupPlan);
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
        maxUsers: selectedPlanObj?.maxUsers,
        maxInvoicesPerMonth: selectedPlanObj?.maxInvoicesPerMonth,
        billingCycle: pricingCycle,
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
      <header className="px-4 sm:px-6 py-3.5 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md max-w-7xl mx-auto w-full flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {platformAppLogo ? (
            <img
              src={platformAppLogo}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl object-contain bg-slate-900 border border-slate-800/80 p-1 shadow-xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-xs">
              <Building2 className="w-4 h-4 font-bold" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-white">
                {platformAppName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider font-semibold">
                Enterprise Cloud
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">{platformAppTagline}</p>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
            title="Access Super Administrator Console"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Super Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFirestoreModal(true)}
            title="Cloud Firestore Connection Diagnostics"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[11px] text-emerald-300 font-medium transition cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Firestore Synced</span>
          </button>
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
      <main className="flex-1 px-4 py-8 sm:py-12 max-w-7xl mx-auto w-full space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Platform Overview & Enterprise Trust */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-medium">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full GST Compliance (CGST, SGST, IGST &amp; ITC)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Enterprise Cloud Accounting &amp; GST Compliance
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              Secure role-based accounting, double-entry general ledgers, statutory tax filings, and automated GSTR-2B reconciliation backed by Google Cloud Firestore.
            </p>

            {/* Key Features Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1.5 transition-colors hover:border-slate-700/80">
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Full GST Invoicing</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Automated HSN calculation, tax splits, GSTR-1, GSTR-3B preparation and Day Book tracking.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1.5 transition-colors hover:border-slate-700/80">
                <div className="flex items-center gap-2 text-teal-400">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Role-Based Access (RBAC)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Fine-grained permissions for Workspace Admins, Senior Accountants, Billing Clerks, and Auditors.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1.5 transition-colors hover:border-slate-700/80">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Landmark className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Banking &amp; Auto BRS</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Cheque management, PDF/Excel bank statement parsing, and instant ledger reconciliation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-1.5 transition-colors hover:border-slate-700/80">
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
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xs">
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
                        {availablePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({plan.monthlyPrice === 0 ? 'Free' : `₹${plan.monthlyPrice.toLocaleString('en-IN')}/mo`} - {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} Users, {plan.maxInvoicesPerMonth === -1 ? 'Unlimited' : plan.maxInvoicesPerMonth} Invoices)
                          </option>
                        ))}
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

        {/* ----------------- PRICING & SUBSCRIPTION PLANS TABLE SECTION ----------------- */}
        <section className="mt-16 pt-12 border-t border-slate-800/80 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transparent Pricing Plans</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Choose the Right Plan for Your Business Growth
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Scale your accounting operations from single proprietorships to multi-branch enterprises with transparent billing and full GST compliance.
            </p>

            {/* Billing Cycle Toggle */}
            <div className="pt-2 flex items-center justify-center">
              <div className="inline-flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setPricingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    pricingCycle === 'monthly'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setPricingCycle('annual')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    pricingCycle === 'annual'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Annual Billing</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                    pricingCycle === 'annual' ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    Save ~17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {availablePlans.map((plan) => {
              const isPopular = Boolean(plan.popular);
              const isFree = plan.monthlyPrice === 0;

              return (
                <div
                  key={plan.id}
                  className={`bg-slate-900 rounded-2xl p-6 flex flex-col justify-between transition relative shadow-lg ${
                    isPopular
                      ? 'border-2 border-emerald-500 shadow-emerald-500/10'
                      : 'border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-full uppercase tracking-wider shadow">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className={`flex items-center justify-between mb-3 ${isPopular ? 'pt-1' : ''}`}>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {plan.badge || (isFree ? 'Free Tier' : plan.isBuiltIn ? 'Standard' : 'Custom')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700/50">
                        {plan.maxUsers === -1 ? 'Unlimited Seats' : `${plan.maxUsers} Seat${plan.maxUsers > 1 ? 's' : ''}`}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mb-4 h-10 line-clamp-2">{plan.tagline}</p>

                    <div className="mb-6 pb-4 border-b border-slate-800">
                      {isFree ? (
                        <>
                          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">₹0</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Free forever • No credit card required</div>
                        </>
                      ) : pricingCycle === 'annual' ? (
                        <>
                          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
                            <span className={isPopular ? 'text-emerald-400' : 'text-white'}>
                              ₹{plan.monthlyEquivalentAnnual.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-normal text-slate-400">/mo</span>
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isPopular ? 'text-emerald-400/90' : 'text-slate-400'}`}>
                            Billed annually (₹{plan.annualPrice.toLocaleString('en-IN')}/yr • 10 mos calc)
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
                            <span className={isPopular ? 'text-emerald-400' : 'text-white'}>
                              ₹{plan.monthlyPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs font-normal text-slate-400">/mo</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Billed monthly (₹{(plan.monthlyPrice * 12).toLocaleString('en-IN')}/yr)
                          </div>
                        </>
                      )}
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{plan.maxUsers === -1 ? 'Unlimited User Accounts' : `Up to ${plan.maxUsers} User Seat${plan.maxUsers > 1 ? 's' : ''}`}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{plan.maxInvoicesPerMonth === -1 ? 'Unlimited GST Invoices & Bills' : `${plan.maxInvoicesPerMonth.toLocaleString('en-IN')} Invoices / month`}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{plan.maxBranches === -1 ? 'Unlimited Multi-Branch Locations' : `${plan.maxBranches} Branch Location${plan.maxBranches > 1 ? 's' : ''}`}</span>
                      </li>
                      {plan.features.slice(0, 3).map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPopular ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span className="line-clamp-1">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSignupPlan(plan.id);
                      setAuthMode('signup');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : isFree
                        ? 'bg-slate-800 hover:bg-slate-700 text-white'
                        : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                    }`}
                  >
                    <span>
                      {isFree ? 'Get Started Free' : isPopular ? `Select ${plan.name}` : `Choose ${plan.name}`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Page Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        {platformFooterCopyright}
      </footer>

      {/* Cloud Firestore Diagnostic Modal */}
      <FirestoreConnectionModal
        isOpen={showFirestoreModal}
        onClose={() => setShowFirestoreModal(false)}
      />
    </div>
  );
};
