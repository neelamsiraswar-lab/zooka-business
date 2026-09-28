// src/components/WorkspaceSubscriptionView.tsx
import React, { useState, useEffect } from 'react';
import {
  Workspace,
  SubscriptionPlanTier,
  SubscriptionBillingCycle,
  SubscriptionInvoice,
  RenewalReminderLog,
} from '../types';
import {
  CreditCard,
  CheckCircle,
  Calendar,
  Zap,
  Users,
  FileText,
  Building2,
  ShieldCheck,
  Check,
  Receipt,
  Eye,
  RefreshCw,
  QrCode,
  Sparkles,
  ArrowRight,
  Clock,
  AlertCircle,
  X,
  BellRing,
  Mail,
  CheckCircle2,
  Shield,
  Bell,
  Send,
  Lock,
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  COMPARISON_FEATURES,
  getPlanConfig,
  calculateSubscriptionCost,
  getDaysRemaining,
  getSubscriptionStatusMeta,
  formatINR,
  PlanTierConfig,
  DEFAULT_BUILTIN_PLANS,
} from '../data/subscriptionPlans';
import {
  updateSubscriptionPlan,
  recordSubscriptionInvoice,
  getSampleSubscriptionInvoices,
  sendWorkspaceRenewalReminder,
  updateWorkspaceRenewalPreferences,
} from '../db/subscriptions';
import { evaluateSubscription, getRenewalReminderEvaluation } from '../lib/subscriptionEnforcement';
import { getAllSubscriptionPlans } from '../db/subscriptionPlans';
import { getActiveWorkspaceId, getAllWorkspaces } from '../db/workspaces';
import { SubscriptionReceiptModal } from './SubscriptionReceiptModal';
import { ProratedUpgradeModal } from './ProratedUpgradeModal';
import { SecurePaymentModal } from './SecurePaymentModal';

interface WorkspaceSubscriptionViewProps {
  workspace?: Workspace | null;
  onWorkspaceUpdated?: (ws: Workspace) => void;
}

export const WorkspaceSubscriptionView: React.FC<WorkspaceSubscriptionViewProps> = ({
  workspace: propWorkspace,
  onWorkspaceUpdated,
}) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(propWorkspace || null);
  const [loading, setLoading] = useState(!propWorkspace);
  const [plans, setPlans] = useState<PlanTierConfig[]>(DEFAULT_BUILTIN_PLANS);
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>(
    propWorkspace?.billingCycle || 'annual'
  );
  const [selectedTier, setSelectedTier] = useState<SubscriptionPlanTier>(
    propWorkspace?.plan || 'professional'
  );

  // Upgrade / Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<SubscriptionPlanTier>('professional');
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Razorpay' | 'Card'>('UPI');
  const [checkoutUtr, setCheckoutUtr] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  // Dedicated Secure Payment Modal State
  const [showSecurePaymentModal, setShowSecurePaymentModal] = useState(false);
  const [paymentModalPlan, setPaymentModalPlan] = useState<SubscriptionPlanTier>(
    propWorkspace?.plan || 'professional'
  );
  const [paymentModalCycle, setPaymentModalCycle] = useState<SubscriptionBillingCycle>(
    propWorkspace?.billingCycle || 'annual'
  );

  // Auto-renewal reminder state
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);
  const [reminderEmail, setReminderEmail] = useState(
    propWorkspace?.renewalReminderEmail || propWorkspace?.ownerEmail || propWorkspace?.email || ''
  );
  const [autoReminderEnabled, setAutoReminderEnabled] = useState(
    propWorkspace?.autoRenewReminderEnabled ?? true
  );

  // Prorated Upgrade / Downgrade Modal
  const [showProratedModal, setShowProratedModal] = useState(false);
  const [proratedTargetPlan, setProratedTargetPlan] = useState<SubscriptionPlanTier>('enterprise');

  // Invoice Receipt modal
  const [viewInvoice, setViewInvoice] = useState<SubscriptionInvoice | null>(null);

  // Fetch active workspace if not provided as prop
  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const [list, fetchedPlans] = await Promise.all([
          getAllWorkspaces(),
          getAllSubscriptionPlans(),
        ]);
        if (fetchedPlans && fetchedPlans.length > 0) {
          setPlans(fetchedPlans);
        }
        if (!propWorkspace) {
          const activeId = getActiveWorkspaceId();
          const current = list.find((w) => w.id === activeId) || list[0];
          setWorkspace(current || null);
          if (current) {
            setSelectedTier(current.plan || 'professional');
            setBillingCycle(current.billingCycle || 'annual');
            setReminderEmail(current.renewalReminderEmail || current.ownerEmail || current.email || '');
            setAutoReminderEnabled(current.autoRenewReminderEnabled ?? true);
          }
        }
      } catch (err) {
        console.error('Failed to load active workspace subscription:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!propWorkspace) {
      setLoading(true);
      fetchCurrent();
    } else {
      setWorkspace(propWorkspace);
      setSelectedTier(propWorkspace.plan || 'professional');
      setBillingCycle(propWorkspace.billingCycle || 'annual');
      setReminderEmail(propWorkspace.renewalReminderEmail || propWorkspace.ownerEmail || propWorkspace.email || '');
      setAutoReminderEnabled(propWorkspace.autoRenewReminderEnabled ?? true);
      getAllSubscriptionPlans().then((p) => {
        if (p && p.length > 0) setPlans(p);
      }).catch(console.error);
    }
  }, [propWorkspace]);

  if (loading || !workspace) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Loading subscription records...</span>
      </div>
    );
  }

  const currentPlan = getPlanConfig(workspace.plan || 'professional', plans);
  const daysMeta = getDaysRemaining(workspace.currentPeriodEnd || workspace.trialEndsAt);
  const statusMeta = getSubscriptionStatusMeta(workspace.subscriptionStatus || workspace.status);
  const reminderEvaluation = getRenewalReminderEvaluation(workspace);
  const invoices =
    workspace.subscriptionInvoices && workspace.subscriptionInvoices.length > 0
      ? workspace.subscriptionInvoices
      : getSampleSubscriptionInvoices(workspace);

  const checkoutCost = calculateSubscriptionCost(checkoutTier, billingCycle, plans);

  const handleOpenSecurePaymentModal = (
    tier?: SubscriptionPlanTier,
    forcedCycle?: SubscriptionBillingCycle
  ) => {
    if (tier) setPaymentModalPlan(tier);
    if (forcedCycle) {
      setPaymentModalCycle(forcedCycle);
      setBillingCycle(forcedCycle);
    }
    setShowSecurePaymentModal(true);
  };

  const handleOpenCheckout = (tier: SubscriptionPlanTier, forcedCycle?: SubscriptionBillingCycle) => {
    if (forcedCycle) {
      setBillingCycle(forcedCycle);
      setPaymentModalCycle(forcedCycle);
    }
    handleOpenSecurePaymentModal(tier, forcedCycle);
  };

  const handleSecurePaymentSuccess = (updatedWs: Workspace, invoice: SubscriptionInvoice) => {
    setWorkspace(updatedWs);
    setSelectedTier(updatedWs.plan);
    setBillingCycle(updatedWs.billingCycle || 'annual');
    if (onWorkspaceUpdated) {
      onWorkspaceUpdated(updatedWs);
    }
    const targetPlanName = getPlanConfig(updatedWs.plan, plans).name;
    setCelebrationMessage(
      `Payment successful! Workspace subscription is now active on ${targetPlanName} (${updatedWs.billingCycle === 'annual' ? 'Yearly' : 'Monthly'}).`
    );
    setTimeout(() => setCelebrationMessage(null), 8000);
    setViewInvoice(invoice);
  };

  const handleSendTestReminder = async () => {
    if (!workspace) return;
    try {
      setSendingReminder(true);
      const res = await sendWorkspaceRenewalReminder(workspace.id, 'email');
      setWorkspace(res.updatedWorkspace);
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(res.updatedWorkspace);
      }
      setReminderFeedback(`Renewal reminder successfully sent to ${reminderEmail || workspace.ownerEmail || workspace.email}!`);
      setTimeout(() => setReminderFeedback(null), 6000);
    } catch (err: any) {
      console.error('Failed to send renewal reminder:', err);
      alert(err.message || 'Failed to dispatch renewal reminder.');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleToggleAutoReminder = async () => {
    if (!workspace) return;
    const nextVal = !autoReminderEnabled;
    setAutoReminderEnabled(nextVal);
    try {
      const updated = await updateWorkspaceRenewalPreferences(workspace.id, {
        autoRenewReminderEnabled: nextVal,
      });
      setWorkspace(updated);
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(updated);
      }
      setReminderFeedback(`Auto-renewal reminder ${nextVal ? 'enabled' : 'disabled'}.`);
      setTimeout(() => setReminderFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to update renewal preferences:', err);
    }
  };

  const handleSaveReminderEmail = async () => {
    if (!workspace) return;
    try {
      const updated = await updateWorkspaceRenewalPreferences(workspace.id, {
        renewalReminderEmail: reminderEmail.trim(),
      });
      setWorkspace(updated);
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(updated);
      }
      setReminderFeedback(`Reminder email saved: ${reminderEmail}`);
      setTimeout(() => setReminderFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to update reminder email:', err);
    }
  };

  const handleProratedUpgradeSuccess = (updatedWs: Workspace, invoice: SubscriptionInvoice) => {
    setWorkspace(updatedWs);
    setSelectedTier(updatedWs.plan);
    setBillingCycle(updatedWs.billingCycle || 'annual');
    if (onWorkspaceUpdated) {
      onWorkspaceUpdated(updatedWs);
    }
    const targetPlanName = getPlanConfig(updatedWs.plan, plans).name;
    setCelebrationMessage(
      `Congratulations! Workspace has been switched to ${targetPlanName} with prorated credit applied.`
    );
    setTimeout(() => setCelebrationMessage(null), 6000);
    setViewInvoice(invoice);
  };

  const handleConfirmCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessingPayment(true);
      const generatedInvoice = await recordSubscriptionInvoice({
        workspaceId: workspace.id,
        plan: checkoutTier,
        billingCycle,
        paymentMethod: checkoutPaymentMethod,
        transactionReference: checkoutUtr.trim() || `PAY-${Date.now().toString(36).toUpperCase()}`,
        notes: `Online subscription renewal for ${workspace.businessName} (${checkoutTier})`,
      });

      const selectedPlanConfig = getPlanConfig(checkoutTier, plans);

      const updatedWs: Workspace = {
        ...workspace,
        plan: checkoutTier,
        billingCycle,
        subscriptionStatus: 'active',
        status: 'active',
        currentPeriodStart: generatedInvoice.periodStart,
        currentPeriodEnd: generatedInvoice.periodEnd,
        maxUsers: selectedPlanConfig.maxUsers,
        maxInvoicesPerMonth: selectedPlanConfig.maxInvoicesPerMonth,
        subscriptionInvoices: [generatedInvoice, ...invoices],
      };

      setWorkspace(updatedWs);
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(updatedWs);
      }

      setShowCheckoutModal(false);
      setCelebrationMessage(`Subscription successfully renewed/upgraded to ${selectedPlanConfig.name}!`);
      setTimeout(() => setCelebrationMessage(null), 8000);
      setViewInvoice(generatedInvoice);
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.message || 'Payment processing failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Celebration Notification */}
      {celebrationMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{celebrationMessage}</span>
          </div>
          <button
            onClick={() => setCelebrationMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ---------------- SECTION 1: ACTIVE SUBSCRIPTION HERO BANNER ---------------- */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                CURRENT SUBSCRIPTION
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                <span>{statusMeta.label}</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {currentPlan.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              {currentPlan.tagline}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>
                  Renews:{' '}
                  <strong className="text-white">
                    {workspace.currentPeriodEnd
                      ? new Date(workspace.currentPeriodEnd).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Lifetime Access'}
                  </strong>
                </span>
              </div>
              <span>•</span>
              <span className={`font-semibold ${daysMeta.isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                {daysMeta.label}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                <span>Auto-Reminder: <strong>{autoReminderEnabled ? 'Active (Email + In-App)' : 'Paused'}</strong></span>
              </span>
            </div>

            {/* Renewal Alert Box if in reminder window */}
            {reminderEvaluation.shouldShowReminder && (
              <div className={`mt-3 p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                reminderEvaluation.urgency === 'critical'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                  : reminderEvaluation.urgency === 'urgent'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                  : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200'
              }`}>
                <div className="flex items-start sm:items-center gap-2.5">
                  <BellRing className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 animate-pulse" />
                  <div>
                    <span className="font-bold">{reminderEvaluation.title}</span>
                    <p className="text-[11px] opacity-90 mt-0.5">{reminderEvaluation.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenCheckout(workspace.plan || 'professional', workspace.billingCycle || 'annual')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs whitespace-nowrap cursor-pointer shadow flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Renew {workspace.billingCycle === 'annual' ? 'Yearly' : 'Monthly'} Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Box */}
          <div className="w-full md:w-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center md:text-right space-y-3 shrink-0">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Billing Cadence
              </span>
              <p className="text-lg font-bold text-white capitalize">
                {workspace.billingCycle === 'annual' ? 'Annual Plan (Yearly)' : 'Monthly Plan'}
              </p>
              {workspace.billingCycle === 'annual' && (
                <span className="text-[10px] text-emerald-400 font-semibold block">
                  ✓ 30-Day Auto Reminders Enabled
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-2">
              <button
                onClick={() => handleOpenSecurePaymentModal(workspace.plan || 'professional', workspace.billingCycle || 'annual')}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Secure Payment / Renew Plan</span>
              </button>
              <button
                onClick={() => handleOpenSecurePaymentModal()}
                className="w-full px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Select Monthly or Yearly Plan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- SECTION 2: RESOURCE METERS & ENTITLEMENTS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Team Seats (RBAC)</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{workspace.membersCount || 1}</span>
            <span className="text-xs text-slate-400">
              / {currentPlan.maxUsers === -1 ? 'Unlimited' : currentPlan.maxUsers} Max
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Multi-user role access with admin, accountant & auditor security.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Invoices Quota</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{workspace.invoicesCount || 0}</span>
            <span className="text-xs text-slate-400">
              / {currentPlan.maxInvoicesPerMonth === -1 ? 'Unlimited' : currentPlan.maxInvoicesPerMonth}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            GST compliant B2B/B2C invoices, e-way bills & thermal receipts.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Cloud Sync & Storage</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">Active</span>
            <span className="text-xs text-emerald-400 font-semibold">Real-time</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Encrypted Firestore cloud backups with instant multi-device sync.
          </p>
        </div>
      </div>

      {/* ---------------- SECTION 3: PLAN SELECTION & PRICING MATRIX ---------------- */}
      <div className="space-y-6">
        <div className="text-center max-w-lg mx-auto space-y-3">
          <h3 className="text-xl font-bold text-white tracking-tight">Available Subscription Plans</h3>
          <p className="text-xs text-slate-400">
            Scale your corporate accounting operations with enterprise-grade GST billing, bank reconciliation, and audit security.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 mt-2">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Monthly Billing</span>
              <span className="block text-[10px] font-normal opacity-80">Pay month-to-month</span>
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex flex-col items-center ${
                billingCycle === 'annual'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Save ~17%
                </span>
              </div>
              <span className="text-[10px] font-normal opacity-90 text-emerald-300">
                12 Months + Auto-Renewal Reminders
              </span>
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleOpenSecurePaymentModal(selectedTier, billingCycle)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 mx-auto shadow-lg shadow-emerald-500/20 cursor-pointer transition transform hover:scale-[1.02]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Launch Secure Payment Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans
            .filter((p) => p.status !== 'archived' || p.id === workspace.plan)
            .map((plan) => {
              const tierKey = plan.id;
              const isCurrent = workspace.plan === tierKey;
              const isSelected = selectedTier === tierKey;
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

              return (
                <div
                  key={tierKey}
                  className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-indigo-500/80 bg-slate-950/80 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  {/* Popular or Custom Badge */}
                  {(plan.popular || plan.badge) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider shadow">
                      {plan.badge || (plan.popular ? 'Most Popular' : '')}
                    </div>
                  )}

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-white">{plan.name}</h4>
                    {isCurrent && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.tagline}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">{formatINR(price)}</span>
                    <span className="text-xs text-slate-400">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <div className="mt-1 space-y-0.5">
                      {(() => {
                        const full12Months = plan.monthlyPrice * 12;
                        const savings = full12Months - plan.annualPrice;
                        const discountPct = full12Months > 0 && savings > 0 ? Math.round((savings / full12Months) * 100) : 0;
                        return (
                          <>
                            <p className="text-[11px] text-emerald-400 font-medium">
                              Equivalent to {formatINR(plan.monthlyEquivalentAnnual)}/mo
                              {discountPct > 0 ? ` (Save ${discountPct}%)` : ''}
                            </p>
                            <p className="text-[10px] text-indigo-300 flex items-center gap-1">
                              <Bell className="w-3 h-3 text-indigo-400" />
                              <span>Auto-reminder 30 days before renewal</span>
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="my-5 border-t border-slate-800" />

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
                  <button
                    onClick={() => handleOpenSecurePaymentModal(tierKey as SubscriptionPlanTier, billingCycle)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25'
                        : tierKey === 'enterprise'
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {isCurrent
                        ? `Renew ${billingCycle === 'annual' ? 'Yearly' : 'Monthly'} (${formatINR(price)})`
                        : `Pay & Subscribe (${billingCycle === 'annual' ? 'Yearly' : 'Monthly'})`}
                    </span>
                  </button>
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        setProratedTargetPlan(tierKey as SubscriptionPlanTier);
                        setShowProratedModal(true);
                      }}
                      className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-850 transition cursor-pointer flex items-center justify-center gap-1 border border-slate-800"
                    >
                      <span>Prorated Upgrade Calculator</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- SECTION 4: AUTO-RENEWAL & RENEWAL REMINDERS CONTROL CENTER ---------------- */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 border border-indigo-500/20 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Auto-Renewal & Renewal Reminders Control Center
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  autoReminderEnabled
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {autoReminderEnabled ? 'Automated Service Active' : 'Reminders Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated reminders alert your workspace team before plan expiration so your GST e-invoicing, multi-user seats, and books never get locked.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAutoReminder}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                autoReminderEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{autoReminderEnabled ? 'Disable Auto-Reminders' : 'Enable Auto-Reminders'}</span>
            </button>
          </div>
        </div>

        {reminderFeedback && (
          <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{reminderFeedback}</span>
          </div>
        )}

        {/* Reminder Settings & Next Renewal Schedule Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Schedule Card */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Automated Schedule</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {workspace.billingCycle === 'annual' ? (
                <>
                  <strong className="text-emerald-300">Yearly Plan Schedule:</strong> Auto-reminders dispatch at <strong>30 days</strong>, <strong>14 days</strong>, <strong>7 days</strong>, and <strong>1 day</strong> prior to renewal date.
                </>
              ) : (
                <>
                  <strong className="text-indigo-300">Monthly Plan Schedule:</strong> Auto-reminders dispatch at <strong>7 days</strong>, <strong>3 days</strong>, and <strong>1 day</strong> before monthly rollover.
                </>
              )}
            </p>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Cadence:</span>
              <span className="font-semibold text-white capitalize">{workspace.billingCycle || 'annual'}</span>
            </div>
          </div>

          {/* Destination Email Card */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Reminder Email Channel</span>
            </div>
            <div className="space-y-1.5">
              <input
                type="email"
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
                placeholder="accounting@yourcompany.com"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveReminderEmail}
                className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer"
              >
                Save Notification Email
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Also displayed as persistent in-app banner for all workspace members.
            </p>
          </div>

          {/* Test & Upcoming Renewal */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Next Renewal Action</span>
              </div>
              <span className="font-bold text-emerald-400 font-mono">
                {formatINR(calculateSubscriptionCost(workspace.plan || 'professional', workspace.billingCycle || 'annual', plans).totalAmount)}
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Renewal Date:</span>
                <span className="font-semibold text-white">
                  {workspace.currentPeriodEnd
                    ? new Date(workspace.currentPeriodEnd).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Lifetime'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Countdown:</span>
                <span className={`font-semibold ${daysMeta.isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {daysMeta.label}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleSendTestReminder}
                disabled={sendingReminder}
                className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {sendingReminder ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Dispatch Test Reminder Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Renewal Reminder Logs */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <span>Recent Renewal Reminder Dispatches</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400">
              {(workspace.renewalReminderLogs || []).length} logs
            </span>
          </h4>

          {(!workspace.renewalReminderLogs || workspace.renewalReminderLogs.length === 0) ? (
            <div className="p-3 text-center text-slate-500 text-[11px] border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              No manual reminder dispatches yet. Automated reminders trigger automatically based on the schedule above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 font-semibold bg-slate-900/50">
                    <th className="py-2 px-3">Date Dispatched</th>
                    <th className="py-2 px-3">Channel</th>
                    <th className="py-2 px-3">Days Remaining</th>
                    <th className="py-2 px-3">Renewal Amount</th>
                    <th className="py-2 px-3">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-medium text-[11px]">
                  {workspace.renewalReminderLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/30">
                      <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                        {new Date(log.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 px-3 uppercase text-indigo-300">{log.channel}</td>
                      <td className="py-2 px-3 font-semibold text-amber-300">{log.daysRemaining} days left</td>
                      <td className="py-2 px-3 font-mono text-emerald-400 font-semibold">{formatINR(log.amount)}</td>
                      <td className="py-2 px-3 text-slate-400 truncate max-w-xs">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- SECTION 5: BILLING HISTORY & GST INVOICES ---------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Subscription Invoices & Receipts</h3>
            <p className="text-xs text-slate-400">
              Download GST tax invoices for accounting, audit trail, and Input Tax Credit (ITC) claims.
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
            No past subscription invoices found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Cycle</th>
                  <th className="py-3 px-3 text-right">Taxable Amount</th>
                  <th className="py-3 px-3 text-right">GST (18%)</th>
                  <th className="py-3 px-3 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Tax Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-white">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {new Date(inv.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-3 capitalize text-indigo-300">{inv.plan}</td>
                    <td className="py-3 px-3 capitalize text-slate-400">{inv.billingCycle}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{formatINR(inv.baseAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">{formatINR(inv.taxAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatINR(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setViewInvoice(inv)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- SECURE PAYMENT & CHECKOUT MODAL ---------------- */}
      <SecurePaymentModal
        isOpen={showSecurePaymentModal || showCheckoutModal}
        onClose={() => {
          setShowSecurePaymentModal(false);
          setShowCheckoutModal(false);
        }}
        workspace={workspace}
        initialPlan={paymentModalPlan || checkoutTier}
        initialCycle={paymentModalCycle || billingCycle}
        availablePlans={plans}
        onPaymentSuccess={handleSecurePaymentSuccess}
      />

      {/* Tax Invoice Modal */}
      {viewInvoice && (
        <SubscriptionReceiptModal
          invoice={viewInvoice}
          workspace={workspace}
          onClose={() => setViewInvoice(null)}
        />
      )}

      {/* Prorated Upgrades & Downgrades Modal */}
      <ProratedUpgradeModal
        isOpen={showProratedModal}
        onClose={() => setShowProratedModal(false)}
        workspace={workspace}
        targetPlan={proratedTargetPlan}
        availablePlans={plans}
        onUpgradeSuccess={handleProratedUpgradeSuccess}
      />
    </div>
  );
};
