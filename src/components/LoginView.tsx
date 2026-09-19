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
  Calculator,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  BarChart3,
  BookOpen,
  Receipt,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  Check,
  Clock,
  Fingerprint,
} from 'lucide-react';

import { createWorkspace } from '../db/workspaces';
import { INDIAN_STATES } from '../data/indianStates';
import { SuperAdminSecurityGateModal } from './SuperAdminSecurityGateModal';
import { RoleMatrixModal } from './RoleMatrixModal';
import { GstQuickCalculatorWidget } from './GstQuickCalculatorWidget';
import { getRememberedCredentials } from '../lib/sessionSecurity';
import { getAllSubscriptionPlans } from '../db/subscriptionPlans';
import { PlanTierConfig, DEFAULT_BUILTIN_PLANS, formatINR } from '../data/subscriptionPlans';
import { ArchitecturalPillar, CustomerReview, FeatureBadge } from '../types';
import { getAllArchitecturalPillars } from '../db/architecturalPillars';
import {
  COLOR_THEMES,
  renderPillarIcon,
} from './ArchitecturalPillarManager';
import { getAllCustomerReviews } from '../db/customerReviews';
import { CustomerReviewsSection } from './CustomerReviewsSection';
import { getAllFeatureBadges, DEFAULT_FEATURE_BADGES } from '../db/featureBadges';
import { renderFeatureBadgeIcon, BADGE_COLOR_THEMES } from './FeatureBadgeManager';
import { getAllHomepageSections, DEFAULT_HOMEPAGE_SECTIONS } from '../db/homepageSections';
import { HomepageSection } from '../types';

export const LoginView: React.FC = () => {
  const {
    signInWithEmail,
    signUpWithEmail,
    loading,
    error,
    clearError,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In Form States
  const remembered = getRememberedCredentials();
  const [email, setEmail] = useState(() => remembered.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => remembered.isEnabled);

  // Modal States
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [showRoleMatrixModal, setShowRoleMatrixModal] = useState(false);

  // Dynamic Subscription Plans State (Synced with Super Admin Firestore Catalog)
  const [availablePlans, setAvailablePlans] = useState<PlanTierConfig[]>(DEFAULT_BUILTIN_PLANS);
  const [plansLoading, setPlansLoading] = useState<boolean>(true);
  const [pricingCycle, setPricingCycle] = useState<'monthly' | 'annual'>('annual');

  // Sign Up & Workspace Registration Form States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('admin');
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

  // Active FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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
        const activeOnly = fetched.filter((p) => p.status !== 'archived');
        const listToUse = activeOnly.length > 0 ? activeOnly : fetched;
        setAvailablePlans(listToUse);

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
    const handlePlansUpdate = () => loadPlans();
    window.addEventListener('subscription_plans_updated', handlePlansUpdate);
    return () => window.removeEventListener('subscription_plans_updated', handlePlansUpdate);
  }, []);

  const [pillars, setPillars] = useState<ArchitecturalPillar[]>([]);
  const [pillarsLoading, setPillarsLoading] = useState(false);

  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [featureBadges, setFeatureBadges] = useState<FeatureBadge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);

  const loadBadges = async () => {
    setBadgesLoading(true);
    try {
      const list = await getAllFeatureBadges();
      setFeatureBadges(list || []);
    } catch (err) {
      console.error('Failed to load feature badges in LoginView:', err);
    } finally {
      setBadgesLoading(false);
    }
  };

  const loadPillars = async () => {
    setPillarsLoading(true);
    try {
      const list = await getAllArchitecturalPillars();
      setPillars(list || []);
    } catch (err) {
      console.error('Failed to load architectural pillars in LoginView:', err);
    } finally {
      setPillarsLoading(false);
    }
  };

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const list = await getAllCustomerReviews();
      setReviews(list || []);
    } catch (err) {
      console.error('Failed to load customer reviews in LoginView:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    loadPillars();
    const handlePillarsUpdate = () => loadPillars();
    window.addEventListener('architectural_pillars_updated', handlePillarsUpdate);
    return () => window.removeEventListener('architectural_pillars_updated', handlePillarsUpdate);
  }, []);

  useEffect(() => {
    loadReviews();
    const handleReviewsUpdate = () => loadReviews();
    window.addEventListener('customer_reviews_updated', handleReviewsUpdate);
    return () => window.removeEventListener('customer_reviews_updated', handleReviewsUpdate);
  }, []);

  useEffect(() => {
    loadBadges();
    const handleBadgesUpdate = () => loadBadges();
    window.addEventListener('feature_badges_updated', handleBadgesUpdate);
    return () => window.removeEventListener('feature_badges_updated', handleBadgesUpdate);
  }, []);

  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  const loadSections = async () => {
    setSectionsLoading(true);
    try {
      const list = await getAllHomepageSections();
      if (list && list.length > 0) {
        setHomepageSections(list);
      }
    } catch (err) {
      console.error('Failed to load homepage sections in LoginView:', err);
    } finally {
      setSectionsLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
    const handleSectionsUpdate = () => loadSections();
    window.addEventListener('homepage_sections_updated', handleSectionsUpdate);
    return () => window.removeEventListener('homepage_sections_updated', handleSectionsUpdate);
  }, []);

  useEffect(() => {
    const handleBrandingUpdate = () => {
      setPlatformAppName(localStorage.getItem('platform_app_name') || 'Apex TallyGST');
      setPlatformAppTagline(localStorage.getItem('platform_app_tagline') || 'Multi-Tenant Accounting & GST Compliance');
      setPlatformAppLogo(localStorage.getItem('platform_app_logo') || '');
      setPlatformFooterCopyright(localStorage.getItem('platform_footer_copyright') || '© 2026 Apex TallyGST Accounting Platform. Multi-tenant cloud synchronization, verified role-based access & automated tax compliance.');
    };
    window.addEventListener('platform_branding_updated', handleBrandingUpdate);
    return () => window.removeEventListener('platform_branding_updated', handleBrandingUpdate);
  }, []);

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
      await signInWithEmail(trimmedEmail, password, rememberMe);
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
      await signUpWithEmail(trimmedEmail, trimmedPass, trimmedName, signupRole, rememberMe);

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

  const faqs = [
    {
      q: 'How does multi-tenant isolation work for our financial records?',
      a: 'Each organization operates in its own isolated Firestore workspace context with distinct company settings, chart of accounts, vouchers, and audit logs. Data is encrypted in transit via TLS 1.3 and partitioned with strict role-based authorization rules.',
    },
    {
      q: 'Does Apex TallyGST support automated HSN codes and GST splits?',
      a: 'Yes. The system automatically computes Intra-State (CGST + SGST) vs Inter-State (IGST) calculations based on Place of Supply rules, generates compliant e-invoice formats, day books, and prepares real-time GSTR-1, GSTR-3B, and GSTR-2B reconciliations.',
    },
    {
      q: 'Can we import existing party ledgers and bank statements?',
      a: 'Absolutely. The platform includes smart PDF/Excel/CSV parsers for ICICI, HDFC, SBI, and Axis Bank statements with automated BRS voucher matching, as well as bulk party ledger and inventory imports.',
    },
    {
      q: 'What roles are supported for internal control and statutory audits?',
      a: 'Five distinct privilege tiers: Super Administrator (platform governance), Workspace Admin (full company control), Senior Accountant (vouchers, journals & taxes), Billing Operator (sales & inventory), and Statutory Auditor (read-only compliance inspection).',
    },
  ];

  const sortedVisibleSections = [...homepageSections]
    .filter((s) => s.isVisible)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative">
      {/* Top Navigation Bar */}
      <header className="px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md max-w-7xl mx-auto w-full flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {platformAppLogo ? (
            <img
              src={platformAppLogo}
              alt="Logo"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl object-contain bg-slate-900 border border-slate-800 p-1 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-sm font-bold">
              <Building2 className="w-5 h-5 text-slate-950" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                {platformAppName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider font-semibold">
                Enterprise Cloud
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">{platformAppTagline}</p>
          </div>
        </div>

        {/* Navigation jump links & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400">
            {homepageSections.some((s) => s.key === 'features_pillars' && s.isVisible) && (
              <a href="#features-section" className="hover:text-white transition">Features</a>
            )}
            {homepageSections.some((s) => s.key === 'gst_calculator' && s.isVisible) && (
              <a href="#gst-calculator-section" className="hover:text-emerald-400 transition">GST Simulator</a>
            )}
            <button
              type="button"
              onClick={() => setShowRoleMatrixModal(true)}
              className="hover:text-white transition cursor-pointer"
            >
              Role Matrix
            </button>
            {homepageSections.some((s) => s.key === 'pricing' && s.isVisible) && (
              <a href="#pricing-section" className="hover:text-white transition">Pricing</a>
            )}
            {homepageSections.some((s) => s.key === 'reviews' && s.isVisible) && (
              <a href="#reviews-section" className="hover:text-amber-400 transition">Reviews</a>
            )}
            {homepageSections.some((s) => s.key === 'faq' && s.isVisible) && (
              <a href="#faq-section" className="hover:text-white transition">FAQs</a>
            )}
          </nav>

          {/* Super Admin Login Action */}
          <button
            type="button"
            id="btn-header-super-admin-login"
            onClick={() => setShowSuperAdminModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
            title="Access Super Administrator Console"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Super Admin</span>
          </button>
        </div>
      </header>

      {/* Super Admin Security Gate Modal Dialog */}
      <SuperAdminSecurityGateModal
        isOpen={showSuperAdminModal}
        onClose={() => setShowSuperAdminModal(false)}
      />

      {/* Role Matrix Modal Dialog */}
      <RoleMatrixModal
        isOpen={showRoleMatrixModal}
        onClose={() => setShowRoleMatrixModal(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-8 sm:py-12 max-w-7xl mx-auto w-full space-y-16">
        {sortedVisibleSections
          .filter((s) => s.key !== 'footer')
          .map((section) => {
            if (section.key === 'hero') {
              return (
                <div key={section.id} id="hero-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start scroll-mt-20">
          
          {/* Left Column: Value Proposition & 1-Click Role Sandbox */}
          <div className="lg:col-span-6 space-y-6 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-medium shadow-xs">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{section.badgeText || 'India GST Statutory Compliance • Real-Time Cloud Sync'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {section.title || 'Enterprise GST Invoicing & Double-Entry Accounting'}
            </h1>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              {section.subtitle || 'Power your business with automated HSN calculations, real-time GSTR-1/3B summaries, bank statement auto-reconciliation, multi-branch bookkeeping, and immutable audit trails.'}
            </p>

            {/* Enterprise Core Features Summary */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(featureBadges.length > 0 && featureBadges.some((b) => b.isActive)
                  ? featureBadges.filter((b) => b.isActive)
                  : DEFAULT_FEATURE_BADGES
                ).map((badge) => {
                  const theme = BADGE_COLOR_THEMES[badge.colorTheme] || BADGE_COLOR_THEMES.emerald;
                  return (
                    <div
                      key={badge.id}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-1 transition hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2 text-white font-semibold text-xs">
                        <div className={theme.textIcon}>
                          {renderFeatureBadgeIcon(badge.icon, 'w-4 h-4')}
                        </div>
                        <span>{badge.title}</span>
                        {badge.badgeText && (
                          <span
                            className={`ml-auto px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} border`}
                          >
                            {badge.badgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {badge.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Granular role permissions for Administrators, Accountants, Billing &amp; Auditors
                </span>
                <button
                  type="button"
                  onClick={() => setShowRoleMatrixModal(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer shrink-0"
                >
                  View Role Matrix →
                </button>
              </div>
            </div>

            {/* Trust Metrics Bar */}
            <div className="pt-2 grid grid-cols-3 gap-3 border-t border-slate-800/80">
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-base font-bold text-white font-mono">100%</div>
                <div className="text-[10px] text-slate-400">GST Calculation Accuracy</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-base font-bold text-emerald-400 font-mono">0-Loss</div>
                <div className="text-[10px] text-slate-400">ITC Tax Credit Tracking</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="text-base font-bold text-white font-mono">256-Bit</div>
                <div className="text-[10px] text-slate-400">Encrypted Cloud Ledgers</div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card (Sign In / Register Company) */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Mode Toggle Tabs */}
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
                  <span>Register Company / Account</span>
                </button>
              </div>

              {/* Feedback Banners */}
              {activeError && (
                <div
                  id="auth-error-banner"
                  className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{activeError}</div>
                </div>
              )}

              {localSuccess && (
                <div
                  id="auth-success-banner"
                  className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5"
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

                  {/* Remember Me & Security Status */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 text-xs">
                      <input
                        type="checkbox"
                        id="checkbox-auth-remember-me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                      />
                      <span>Remember this device (30 Days)</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      TLS 1.3
                    </span>
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
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
                    <div className="flex justify-between items-center">
                      <label className="font-medium text-slate-300">Assign Security Role *</label>
                      <button
                        type="button"
                        onClick={() => setShowRoleMatrixModal(true)}
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        Compare Roles
                      </button>
                    </div>
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
                      <span>Workspace &amp; Company Details</span>
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
                        <label className="block font-medium text-slate-300">GST State &amp; Jurisdiction</label>
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
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
              );
            }

            if (section.key === 'gst_calculator') {
              return (
                <section key={section.id} id="gst-calculator-section" className="pt-4 scroll-mt-20">
                  <GstQuickCalculatorWidget />
                </section>
              );
            }

            if (section.key === 'features_pillars') {
              return (
                <section key={section.id} id="features-section" className="space-y-6 pt-4 scroll-mt-20">
                  <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{section.badgeText || 'Core Architectural Pillars'}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">
                      {section.title || "Built specifically for India's Statutory Accounting Standards"}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {section.subtitle || "Designed from the ground up to replace legacy desktop bookkeeping software with real-time multi-branch cloud infrastructure."}
                    </p>
                  </div>

          {pillarsLoading && pillars.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800" />
                  <div className="h-4 w-3/4 bg-slate-800 rounded" />
                  <div className="h-3 w-full bg-slate-800/60 rounded" />
                  <div className="h-3 w-5/6 bg-slate-800/60 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pillars
                .filter((p) => p.isActive)
                .map((pillar) => {
                  const theme = COLOR_THEMES[pillar.colorTheme] || COLOR_THEMES.emerald;
                  return (
                    <div
                      key={pillar.id}
                      className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-9 h-9 rounded-xl ${theme.bgIcon} ${theme.borderIcon} ${theme.textIcon} border flex items-center justify-center`}
                          >
                            {renderPillarIcon(pillar.icon, 'w-5 h-5')}
                          </div>
                          {pillar.badge && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                            >
                              {pillar.badge}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white">{pillar.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {pillar.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
              );
            }

            if (section.key === 'pricing') {
              return (
                <section key={section.id} id="pricing-section" className="pt-8 border-t border-slate-800/80 space-y-8 scroll-mt-20">
                  <div className="text-center max-w-2xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{section.badgeText || 'Transparent Pricing Plans'}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">
                      {section.title || 'Choose the Right Plan for Your Business Growth'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {section.subtitle || 'Scale your accounting operations from single proprietorships to multi-branch enterprises with transparent billing and full GST compliance.'}
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
              );
            }

            if (section.key === 'reviews') {
              return (
                <section key={section.id} id="reviews-section" className="pt-8 border-t border-slate-800/80 scroll-mt-20">
                  <CustomerReviewsSection
                    reviews={reviews}
                    loading={reviewsLoading}
                  />
                </section>
              );
            }

            if (section.key === 'faq') {
              return (
                <section key={section.id} id="faq-section" className="pt-8 border-t border-slate-800/80 space-y-6 max-w-3xl mx-auto scroll-mt-20">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{section.badgeText || 'Frequently Asked Questions'}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">{section.title || 'Got Questions? We Have Answers.'}</h2>
                    {section.subtitle && (
                      <p className="text-xs text-slate-400 max-w-md mx-auto">{section.subtitle}</p>
                    )}
                  </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-white hover:text-emerald-400 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
              );
            }

            // Fallback renderer for custom added components from Super Admin Homepage Customization
            return (
              <section key={section.id} id={`custom-section-${section.key}`} className="pt-8 border-t border-slate-800/80 space-y-4 max-w-4xl mx-auto text-center scroll-mt-20">
                {section.badgeText && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{section.badgeText}</span>
                  </div>
                )}
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{section.title}</h2>
                {section.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">{section.subtitle}</p>
                )}
                {section.customHtml && (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs text-left" dangerouslySetInnerHTML={{ __html: section.customHtml }} />
                )}
              </section>
            );
          })}
      </main>

      {/* Page Footer */}
      {homepageSections.find((s) => s.key === 'footer')?.isVisible !== false && (
        <footer className="px-6 py-6 border-t border-slate-900 text-center text-xs text-slate-500 max-w-7xl mx-auto w-full space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 text-[11px]">
            <span>GSTN Rule 46 Compliant</span>
            <span>•</span>
            <span>Double-Entry General Ledger</span>
            <span>•</span>
            <span>SHA-256 Audit Trail</span>
            <span>•</span>
            <span>Automated BRS Reconciliation</span>
          </div>
          <div className="text-slate-600 text-[11px] pt-1">
            {platformFooterCopyright}
          </div>
        </footer>
      )}
    </div>
  );
};
