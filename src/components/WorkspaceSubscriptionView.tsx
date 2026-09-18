// src/components/WorkspaceSubscriptionView.tsx
import React, { useState, useEffect } from 'react';
import {
  Workspace,
  SubscriptionPlanTier,
  SubscriptionBillingCycle,
  SubscriptionInvoice,
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
} from '../db/subscriptions';
import { getAllSubscriptionPlans } from '../db/subscriptionPlans';
import { getActiveWorkspaceId, getAllWorkspaces } from '../db/workspaces';
import { SubscriptionReceiptModal } from './SubscriptionReceiptModal';
import { ProratedUpgradeModal } from './ProratedUpgradeModal';

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
  const invoices =
    workspace.subscriptionInvoices && workspace.subscriptionInvoices.length > 0
      ? workspace.subscriptionInvoices
      : getSampleSubscriptionInvoices(workspace);

  const checkoutCost = calculateSubscriptionCost(checkoutTier, billingCycle, plans);

  const handleOpenCheckout = (tier: SubscriptionPlanTier) => {
    // If user is switching to a different tier, route through the prorated calculation modal
    if (tier !== workspace.plan) {
      setProratedTargetPlan(tier);
      setShowProratedModal(true);
    } else {
      setCheckoutTier(tier);
      setShowCheckoutModal(true);
    }
  };

  const handleProratedUpgradeSuccess = (newPlan: SubscriptionPlanTier) => {
    const updatedWs: Workspace = {
      ...workspace,
      plan: newPlan,
      subscriptionStatus: 'active',
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
    };
    setWorkspace(updatedWs);
    setSelectedTier(newPlan);
    if (onWorkspaceUpdated) {
      onWorkspaceUpdated(updatedWs);
    }
    setCelebrationMessage(
      `Congratulations! Workspace has been switched to ${newPlan.toUpperCase()} with prorated credit applied.`
    );
    setTimeout(() => setCelebrationMessage(null), 6000);
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

      const updatedWs: Workspace = {
        ...workspace,
        plan: checkoutTier,
        billingCycle,
        subscriptionStatus: 'active',
        status: 'active',
        subscriptionInvoices: [generatedInvoice, ...invoices],
      };

      setWorkspace(updatedWs);
      if (onWorkspaceUpdated) {
        onWorkspaceUpdated(updatedWs);
      }

      setShowCheckoutModal(false);
      setCelebrationMessage(`Subscription successfully upgraded to ${getPlanConfig(checkoutTier).name}!`);
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

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
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
            </div>
          </div>

          {/* Quick Action Box */}
          <div className="w-full md:w-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center md:text-right space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Billing Cadence
              </span>
              <p className="text-lg font-bold text-white capitalize">
                {workspace.billingCycle || 'annual'} Plan
              </p>
            </div>
            <button
              onClick={() => handleOpenCheckout(workspace.plan === 'enterprise' ? 'enterprise' : 'enterprise')}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{workspace.plan === 'enterprise' ? 'Renew Enterprise' : 'Upgrade Plan'}</span>
            </button>
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
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 mt-2">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                12 Months
              </span>
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
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      {(() => {
                        const full12Months = plan.monthlyPrice * 12;
                        const savings = full12Months - plan.annualPrice;
                        const discountPct = full12Months > 0 && savings > 0 ? Math.round((savings / full12Months) * 100) : 0;
                        return (
                          <span>
                            Equivalent to {formatINR(plan.monthlyEquivalentAnnual)}/mo
                            {discountPct > 0 ? ` (Save ${discountPct}%)` : ' (12 months billed annually)'}
                          </span>
                        );
                      })()}
                    </p>
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

                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenCheckout(tierKey)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : tierKey === 'enterprise'
                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Renew Current Plan</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Upgrade to {plan.name}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- SECTION 4: BILLING HISTORY & GST INVOICES ---------------- */}
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

      {/* ---------------- CHECKOUT & PAYMENT MODAL ---------------- */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  Secure Checkout
                </span>
                <h3 className="text-lg font-bold text-white">
                  Subscribe to {getPlanConfig(checkoutTier).name}
                </h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCheckout} className="space-y-4 text-xs">
              {/* Plan & Cycle Summary */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Selected Tier:</span>
                  <span className="font-semibold text-white">{getPlanConfig(checkoutTier).name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Billing Cycle:</span>
                  <span className="font-semibold text-white capitalize">{billingCycle}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Taxable Base Value:</span>
                  <span className="font-mono text-slate-200">{formatINR(checkoutCost.baseAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>18% GST (SAC 998315):</span>
                  <span className="font-mono text-slate-200">{formatINR(checkoutCost.gstAmount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                  <span>Total Payable:</span>
                  <span className="font-mono text-emerald-400">{formatINR(checkoutCost.totalAmount)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI / QR Code', icon: QrCode },
                    { id: 'Bank Transfer', label: 'NEFT / NetBanking', icon: Building2 },
                    { id: 'Razorpay', label: 'Razorpay Gateway', icon: CreditCard },
                    { id: 'Card', label: 'Credit / Debit Card', icon: CreditCard },
                  ].map((pm) => (
                    <button
                      type="button"
                      key={pm.id}
                      onClick={() => setCheckoutPaymentMethod(pm.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                        checkoutPaymentMethod === pm.id
                          ? 'border-indigo-500 bg-indigo-950/30 text-white'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      <pm.icon className="w-4 h-4 text-indigo-400" />
                      <span className="font-medium text-xs">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details for UPI / Bank Transfer */}
              {checkoutPaymentMethod === 'UPI' && (
                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-center space-y-2">
                  <div className="inline-block p-2 bg-white rounded-lg">
                    <QrCode className="w-24 h-24 text-slate-950 mx-auto" />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Scan using Google Pay, PhonePe, Paytm or BHIM
                  </p>
                  <p className="font-mono text-xs font-bold text-indigo-300">
                    apexenterprises@hdfcbank
                  </p>
                </div>
              )}

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Transaction / UTR Reference Number (Optional)
                </label>
                <input
                  type="text"
                  value={checkoutUtr}
                  onChange={(e) => setCheckoutUtr(e.target.value)}
                  placeholder="e.g. UPI/619284019284"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {processingPayment ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Confirm & Activate Subscription</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        onUpgradeSuccess={handleProratedUpgradeSuccess}
      />
    </div>
  );
};
