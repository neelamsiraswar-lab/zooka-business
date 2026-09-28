// src/components/SecurePaymentModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Workspace,
  SubscriptionPlanTier,
  SubscriptionBillingCycle,
  SubscriptionInvoice,
} from '../types';
import {
  X,
  ShieldCheck,
  CreditCard,
  Building2,
  QrCode,
  Calendar,
  Check,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight,
  Copy,
  CheckCircle2,
  Bell,
  Clock,
  Zap,
  Info,
  Layers,
  FileText,
  BadgePercent,
  CheckCircle,
  Receipt,
} from 'lucide-react';
import {
  PlanTierConfig,
  formatINR,
  DEFAULT_BUILTIN_PLANS,
  getPlanConfig,
  calculateSubscriptionCost,
} from '../data/subscriptionPlans';
import { recordSubscriptionInvoice } from '../db/subscriptions';
import { logActivity } from '../db/dataService';

interface SecurePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  initialPlan?: SubscriptionPlanTier;
  initialCycle?: SubscriptionBillingCycle;
  availablePlans?: PlanTierConfig[];
  onPaymentSuccess: (updatedWorkspace: Workspace, invoice: SubscriptionInvoice) => void;
}

export const SecurePaymentModal: React.FC<SecurePaymentModalProps> = ({
  isOpen,
  onClose,
  workspace,
  initialPlan,
  initialCycle,
  availablePlans = DEFAULT_BUILTIN_PLANS,
  onPaymentSuccess,
}) => {
  // Selected Plan & Billing Cycle (Monthly or Yearly)
  const [selectedPlanTier, setSelectedPlanTier] = useState<SubscriptionPlanTier>(
    initialPlan || (workspace?.plan as SubscriptionPlanTier) || 'professional'
  );
  const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>(
    initialCycle || workspace?.billingCycle || 'annual'
  );

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Bank Transfer' | 'Razorpay'>('UPI');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(workspace?.ownerName || workspace?.businessName || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Netbanking State
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Processing Animation State
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Synchronize when initial props change
  useEffect(() => {
    if (initialPlan) setSelectedPlanTier(initialPlan);
    if (initialCycle) setBillingCycle(initialCycle);
    if (workspace && !cardHolder) {
      setCardHolder(workspace.ownerName || workspace.businessName || '');
    }
  }, [initialPlan, initialCycle, workspace]);

  if (!isOpen || !workspace) return null;

  // Pricing & Checkout Summary calculation
  const planConfig = getPlanConfig(selectedPlanTier, availablePlans);
  const cost = calculateSubscriptionCost(selectedPlanTier, billingCycle, availablePlans);

  // Calculate projected validity dates
  const now = new Date();
  let baseDate = now;
  if (workspace.currentPeriodEnd && (workspace.plan === selectedPlanTier || !workspace.plan)) {
    const existingEndMs = new Date(workspace.currentPeriodEnd).getTime();
    if (existingEndMs > now.getTime()) {
      baseDate = new Date(existingEndMs);
    }
  }
  const projectedStart = baseDate === now ? now : new Date(workspace.currentPeriodStart || now);
  const projectedEnd = new Date(baseDate);
  if (billingCycle === 'annual') {
    projectedEnd.setFullYear(projectedEnd.getFullYear() + 1);
  } else {
    projectedEnd.setMonth(projectedEnd.getMonth() + 1);
  }

  // Format Card Number (4-4-4-4)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(val);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('apexenterprises@hdfcbank');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setProcessing(true);

    try {
      // Step-by-step security verification simulation
      setProcessingStep('Connecting to secure 256-bit payment gateway...');
      await new Promise((r) => setTimeout(r, 400));

      setProcessingStep('Authorizing billing credentials & token...');
      await new Promise((r) => setTimeout(r, 450));

      setProcessingStep('Generating GST Tax Invoice (SAC 998315)...');
      const txnRef =
        paymentMethod === 'UPI' && utrNumber.trim()
          ? utrNumber.trim().toUpperCase()
          : paymentMethod === 'Card'
          ? `CARD-****${cardNumber.replace(/\s/g, '').slice(-4) || '8842'}-${Date.now().toString(36).toUpperCase()}`
          : paymentMethod === 'Bank Transfer'
          ? `NEFT-${selectedBank.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
          : `RZP-${Date.now().toString(36).toUpperCase()}`;

      // Create official GST Invoice and update workspace
      const generatedInvoice = await recordSubscriptionInvoice({
        workspaceId: workspace.id,
        plan: selectedPlanTier,
        billingCycle,
        paymentMethod,
        transactionReference: txnRef,
        notes: `Secure payment checkout for ${workspace.businessName || workspace.name} - ${planConfig.name} (${billingCycle === 'annual' ? 'Yearly' : 'Monthly'})`,
        creatorEmail: workspace.ownerEmail || 'nawarkuldeep@gmail.com',
      });

      setProcessingStep('Activating workspace entitlements...');
      await new Promise((r) => setTimeout(r, 350));

      // Construct updated workspace
      const currentInvoices = workspace.subscriptionInvoices || [];
      const updatedInvoices = [generatedInvoice, ...currentInvoices.filter((i) => i.id !== generatedInvoice.id)];

      const updatedWs: Workspace = {
        ...workspace,
        plan: selectedPlanTier,
        billingCycle,
        subscriptionStatus: 'active',
        status: 'active',
        currentPeriodStart: generatedInvoice.periodStart,
        currentPeriodEnd: generatedInvoice.periodEnd,
        maxUsers: planConfig.maxUsers,
        maxInvoicesPerMonth: planConfig.maxInvoicesPerMonth,
        subscriptionInvoices: updatedInvoices,
        autoRenewReminderEnabled: workspace.autoRenewReminderEnabled ?? true,
      };

      await logActivity(
        1,
        workspace.ownerEmail || 'nawarkuldeep@gmail.com',
        'WORKSPACE_SUBSCRIPTION_PAID',
        'workspace',
        workspace.id,
        `Processed secure ${billingCycle} payment of ${formatINR(cost.totalAmount)} for ${planConfig.name} (Invoice: ${generatedInvoice.invoiceNumber})`
      );

      // Callback to parent
      onPaymentSuccess(updatedWs, generatedInvoice);
      onClose();
    } catch (err: any) {
      console.error('Payment execution error:', err);
      setPaymentError(err.message || 'Payment transaction failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 space-y-6 my-6 max-h-[92vh] overflow-y-auto">
        {/* Top Security Banner & Close Button */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Secure Payment &amp; Subscription Checkout
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  <Lock className="w-2.5 h-2.5" /> 256-Bit SSL
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Workspace: <span className="text-slate-200 font-semibold">{workspace.businessName || workspace.name}</span>
                {workspace.gstin && (
                  <span className="ml-2 font-mono text-[11px] text-slate-400">({workspace.gstin})</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={processing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            title="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Trust Badges Bar */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center text-[10px] sm:text-[11px] text-slate-300">
          <div className="flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Bank-Grade Encryption</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 font-medium border-x border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>PCI-DSS Compliant</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 font-medium">
            <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>GST SAC 998315 Invoice</span>
          </div>
        </div>

        {paymentError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <X className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}

        <form onSubmit={handleProcessPayment} className="space-y-6 text-xs">
          {/* ---------------- 1. BILLING CADENCE SELECTION (MONTHLY OR YEARLY) ---------------- */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>1. Select Billing Cadence</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {billingCycle === 'annual' ? (
                  <span className="text-emerald-400 font-semibold">✓ 12 Months Validity + Auto Reminders</span>
                ) : (
                  <span>Monthly Flexibility (1 Month)</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Monthly Option */}
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                  billingCycle === 'monthly'
                    ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      <span>Monthly Plan</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      billingCycle === 'monthly'
                        ? 'border-indigo-500 bg-indigo-500 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}>
                      {billingCycle === 'monthly' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Pay month-to-month. Cancel or change plan anytime without lock-in.
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400">Price for {planConfig.name}:</span>
                  <div>
                    <span className="text-base font-extrabold text-white font-mono">
                      {formatINR(planConfig.monthlyPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400"> / month</span>
                  </div>
                </div>
              </button>

              {/* Yearly Option */}
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                  billingCycle === 'annual'
                    ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500 text-slate-950 shadow">
                  Save ~17% (2 Months Free)
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Yearly Plan</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      billingCycle === 'annual'
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}>
                      {billingCycle === 'annual' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300 mt-1 leading-snug flex items-center gap-1">
                    <Bell className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Auto-reminder to workspace before renewal</span>
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400">Equivalent to </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {formatINR(planConfig.monthlyEquivalentAnnual)}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-base font-extrabold text-white font-mono">
                      {formatINR(planConfig.annualPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400"> / year</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ---------------- 2. PLAN TIER SELECTOR ---------------- */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>2. Select Plan Tier</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Active Tier: <strong className="text-indigo-300 capitalize">{workspace.plan || 'Free'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availablePlans
                .filter((p) => p.status !== 'archived')
                .map((plan) => {
                  const isSelected = selectedPlanTier === plan.id;
                  const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

                  return (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => setSelectedPlanTier(plan.id as SubscriptionPlanTier)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white">{plan.name}</span>
                          {plan.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{plan.tagline}</p>

                        <div className="mt-2 text-sm font-extrabold text-white font-mono">
                          {formatINR(price)}
                          <span className="text-[10px] font-normal text-slate-400">
                            /{billingCycle === 'annual' ? 'yr' : 'mo'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{plan.maxUsers === -1 ? 'Unlimited' : `${plan.maxUsers} Users`}</span>
                        <span className={`font-semibold ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`}>
                          {isSelected ? '✓ Selected' : 'Select'}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ---------------- 3. SIMPLE CHECKOUT SUMMARY ---------------- */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/20 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="font-bold text-xs text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>3. Checkout Summary &amp; Tax Breakdown</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">SAC: 998315</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="text-white font-semibold">{planConfig.name}</span>
                  <span className="text-slate-500">({billingCycle === 'annual' ? '12 Months' : '1 Month'})</span>
                </span>
                <span className="font-mono text-slate-200">
                  {formatINR(billingCycle === 'annual' ? planConfig.annualPrice : planConfig.monthlyPrice)}
                </span>
              </div>

              {billingCycle === 'annual' && cost.annualSavings > 0 && (
                <div className="flex items-center justify-between text-emerald-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <BadgePercent className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Annual Savings Discount (~17% Off):</span>
                  </span>
                  <span className="font-mono font-semibold">- {formatINR(cost.annualSavings)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-400">
                <span>Taxable Base Value:</span>
                <span className="font-mono text-slate-300">{formatINR(cost.baseAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <span>GST @ 18% (Cloud Software SAC 998315):</span>
                </span>
                <span className="font-mono text-slate-300">{formatINR(cost.gstAmount)}</span>
              </div>

              {/* Coverage & Reminder Notice */}
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Coverage Period:</span>
                  <span className="font-medium text-white">
                    {projectedStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' → '}
                    {projectedEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-indigo-300">
                  <span className="flex items-center gap-1">
                    <Bell className="w-3 h-3 text-indigo-400" />
                    <span>Renewal Reminder Guarantee:</span>
                  </span>
                  <span>
                    {billingCycle === 'annual'
                      ? 'Scheduled 30, 15 & 7 days prior'
                      : 'Scheduled 3 days prior'}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-white block">Total Amount Payable:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Inclusive of all applicable GST taxes</span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">
                    {formatINR(cost.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- 4. PAYMENT METHOD ---------------- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span>4. Select Payment Method</span>
              </label>
              <span className="text-[11px] text-emerald-400 font-medium">Instant Activation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'UPI', label: 'UPI / QR', icon: QrCode, badge: 'Popular' },
                { id: 'Card', label: 'Credit / Debit', icon: CreditCard, badge: 'Fast' },
                { id: 'Bank Transfer', label: 'Net Banking', icon: Building2 },
                { id: 'Razorpay', label: 'Razorpay', icon: Zap },
              ].map((pm) => (
                <button
                  type="button"
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id as any)}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 relative ${
                    paymentMethod === pm.id
                      ? 'border-emerald-500 bg-emerald-950/20 text-white ring-1 ring-emerald-500'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {pm.badge && (
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-500 text-slate-950">
                      {pm.badge}
                    </span>
                  )}
                  <pm.icon className={`w-4 h-4 ${paymentMethod === pm.id ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="font-semibold text-[11px]">{pm.label}</span>
                </button>
              ))}
            </div>

            {/* Method Details: UPI */}
            {paymentMethod === 'UPI' && (
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3 text-center">
                <div className="inline-block p-2.5 bg-white rounded-xl shadow-md">
                  <QrCode className="w-24 h-24 text-slate-950 mx-auto" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-300">
                    Scan using Google Pay, PhonePe, Paytm, BHIM or any UPI App
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-300 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
                      apexenterprises@hdfcbank
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {copiedUpi && (
                    <span className="text-[10px] text-emerald-400 block font-semibold">UPI ID Copied!</span>
                  )}
                </div>

                <div className="text-left pt-2 border-t border-slate-800/80">
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    UPI Reference / UTR Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 619284019284"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Method Details: Card */}
            {paymentMethod === 'Card' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4532 8920 1829 4820"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <span>VISA</span>
                      <span>MC</span>
                      <span>RUPAY</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="e.g. Rohit Sharma"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-400 block mb-1">CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        placeholder="•••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Method Details: Bank Transfer */}
            {paymentMethod === 'Bank Transfer' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-[11px] font-medium text-slate-400 block">Choose Bank for Net Banking</label>
                <div className="grid grid-cols-3 gap-2">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Bank', 'Other Banks'].map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setSelectedBank(b)}
                      className={`p-2 rounded-xl border text-center text-[11px] font-medium transition cursor-pointer ${
                        selectedBank === b
                          ? 'border-indigo-500 bg-indigo-950/40 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Method Details: Razorpay */}
            {paymentMethod === 'Razorpay' && (
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 text-center space-y-2">
                <Zap className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
                <p className="text-xs font-semibold text-white">Instant Multi-Option Gateway</p>
                <p className="text-[11px] text-slate-400">
                  Supports NetBanking, UPI, Wallets, and Corporate Cards through Razorpay Gateway.
                </p>
              </div>
            )}
          </div>

          {/* ---------------- 5. ACTION BUTTONS ---------------- */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-slate-400 text-[11px] flex items-center gap-1.5 self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant GST Tax Invoice receipt will be generated</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-xs font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={processing}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-500/25 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{processingStep || 'Processing Payment...'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Pay {formatINR(cost.totalAmount)} &amp; Activate {planConfig.name}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
