// src/components/ProratedUpgradeModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Workspace,
  SubscriptionPlanTier,
  SubscriptionBillingCycle,
  SubscriptionInvoice,
} from '../types';
import {
  X,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  CreditCard,
  Building2,
  QrCode,
  Calendar,
  Layers,
  Sparkles,
  Info,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import {
  PlanTierConfig,
  formatINR,
  DEFAULT_BUILTIN_PLANS,
  getPlanConfig,
} from '../data/subscriptionPlans';
import { calculateProratedSubscription } from '../lib/prorationCalculator';
import { recordSubscriptionInvoice } from '../db/subscriptions';
import { updateWorkspace } from '../db/workspaces';
import { logActivity } from '../db/dataService';

interface ProratedUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  availablePlans?: PlanTierConfig[];
  onUpgradeSuccess: (updatedWorkspace: Workspace, invoice: SubscriptionInvoice) => void;
}

export const ProratedUpgradeModal: React.FC<ProratedUpgradeModalProps> = ({
  isOpen,
  onClose,
  workspace,
  availablePlans = DEFAULT_BUILTIN_PLANS,
  onUpgradeSuccess,
}) => {
  if (!isOpen || !workspace) return null;

  const currentPlanTier = (workspace.plan || 'starter') as SubscriptionPlanTier;
  const currentCycle = (workspace.billingCycle || 'annual') as SubscriptionBillingCycle;

  // Selected target tier & cycle
  const [targetTier, setTargetTier] = useState<SubscriptionPlanTier>(
    currentPlanTier === 'enterprise' ? 'enterprise' : 'professional'
  );
  const [targetCycle, setTargetCycle] = useState<SubscriptionBillingCycle>(currentCycle);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Razorpay' | 'Card'>('UPI');
  const [utrNumber, setUtrNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select higher tier if on starter
  useEffect(() => {
    if (workspace.plan === 'starter') {
      setTargetTier('professional');
    } else if (workspace.plan === 'professional') {
      setTargetTier('enterprise');
    }
  }, [workspace.plan]);

  const proration = calculateProratedSubscription(
    workspace,
    targetTier,
    targetCycle,
    availablePlans
  );

  const selectedPlanConfig =
    availablePlans.find((p) => p.id === targetTier) || getPlanConfig(targetTier);

  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const isDowngrade = proration.isDowngrade;
      const invoiceNotes = `Prorated ${
        isDowngrade ? 'Tier Downgrade' : 'Plan Upgrade'
      } to ${selectedPlanConfig.name} (${targetCycle}). Days remaining: ${
        proration.daysRemaining
      }. Unused credit applied: ${formatINR(proration.unusedPlanCredit)}.`;

      // 1. Record subscription invoice with prorated line items
      const generatedInvoice = await recordSubscriptionInvoice({
        workspaceId: workspace.id,
        plan: targetTier,
        billingCycle: targetCycle,
        paymentMethod: paymentMethod,
        transactionReference:
          utrNumber.trim() || `PRORATE-${Date.now().toString(36).toUpperCase()}`,
        notes: invoiceNotes,
        // Override base and total amounts with precise proration math
        baseAmountOverride: proration.netProratedBase,
        taxAmountOverride: proration.gstAmount,
        totalAmountOverride: proration.totalNetPayable,
      });

      // 2. Update workspace limits and active plan
      const updatedFields: Partial<Workspace> = {
        plan: targetTier,
        billingCycle: targetCycle,
        subscriptionStatus: 'active',
        status: 'active',
        maxUsers: selectedPlanConfig.maxUsers,
        maxInvoicesPerMonth: selectedPlanConfig.maxInvoicesPerMonth,
      };

      await updateWorkspace(workspace.id, updatedFields);

      // 3. Log audit activity
      try {
        await logActivity(
          1,
          workspace.ownerEmail,
          'UPDATE',
          'WORKSPACE_PLAN',
          workspace.id,
          `Prorated switch from ${currentPlanTier} to ${targetTier}. Net charge: ${formatINR(
            proration.totalNetPayable
          )} (Credit: ${formatINR(proration.unusedPlanCredit)})`
        );
      } catch (logErr) {
        console.warn('Could not write activity log:', logErr);
      }

      const mergedWorkspace: Workspace = {
        ...workspace,
        ...updatedFields,
        subscriptionInvoices: [generatedInvoice, ...(workspace.subscriptionInvoices || [])],
      };

      onUpgradeSuccess(mergedWorkspace, generatedInvoice);
      onClose();
    } catch (err: any) {
      console.error('Prorated upgrade failed:', err);
      setError(err.message || 'Failed to complete prorated upgrade. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Prorated Plan Switch & Upgrade
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Instant tier change with automatic day-level credit calculations for {workspace.businessName}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Tier Selector Grid */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Select Target Subscription Tier
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {availablePlans
              .filter((p) => p.status !== 'archived')
              .map((plan) => {
                const isSelected = targetTier === plan.id;
                const isCurrent = currentPlanTier === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setTargetTier(plan.id as SubscriptionPlanTier)}
                    className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        Current
                      </span>
                    )}
                    <div className="text-xs font-bold text-white">{plan.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {targetCycle === 'annual'
                        ? `${formatINR(plan.annualPrice)} / yr`
                        : `${formatINR(plan.monthlyPrice)} / mo`}
                    </div>
                    <div className="text-[10px] text-indigo-300 mt-2">
                      {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} Users •{' '}
                      {plan.maxInvoicesPerMonth === -1 ? 'Unlimited' : plan.maxInvoicesPerMonth} Invoices
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
          <span className="text-slate-300 font-medium">Billing Cycle:</span>
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTargetCycle('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                targetCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setTargetCycle('annual')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                targetCycle === 'annual'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Proration Mathematical Breakdown Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="text-slate-400">Current Plan Credit Duration:</span>
            <span className="font-semibold text-white">
              {proration.daysRemaining} days remaining (of {proration.totalPeriodDays} days)
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">
                Target Plan Daily Allocation ({selectedPlanConfig.name}):
              </span>
              <span className="font-mono text-slate-200">
                {formatINR(proration.targetRemainingCost)} ({formatINR(proration.targetDailyRate)}/day)
              </span>
            </div>

            <div className="flex justify-between text-emerald-400">
              <span className="flex items-center gap-1">
                <span>Unused Plan Credit Rollover ({proration.currentTier}):</span>
              </span>
              <span className="font-mono font-semibold">
                - {formatINR(proration.unusedPlanCredit)} ({formatINR(proration.currentDailyRate)}/day)
              </span>
            </div>

            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Net Taxable Prorated Base:</span>
              <span className="font-mono text-slate-200">
                {formatINR(proration.netProratedBase)}
              </span>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>18% GST (SAC 998315 Software as a Service):</span>
              <span className="font-mono text-slate-200">
                {formatINR(proration.gstAmount)}
              </span>
            </div>

            {proration.creditRollOver > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between">
                <span>Surplus Credit Balance to be adjusted in next cycle:</span>
                <span className="font-mono font-bold">{formatINR(proration.creditRollOver)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline font-bold text-sm text-white">
              <span>Total Net Amount Payable:</span>
              <span className="font-mono text-lg text-emerald-400">
                {formatINR(proration.totalNetPayable)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method & UTR Reference */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Select Settlement Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'UPI', label: 'UPI / VPA', icon: QrCode },
              { id: 'Bank Transfer', label: 'NEFT / RTGS', icon: Building2 },
              { id: 'Razorpay', label: 'Razorpay Gateway', icon: CreditCard },
              { id: 'Card', label: 'Credit / Debit', icon: CreditCard },
            ].map((pm) => (
              <button
                type="button"
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id as any)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 text-xs ${
                  paymentMethod === pm.id
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                }`}
              >
                <pm.icon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium truncate">{pm.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-2">
            <label className="text-[11px] text-slate-400 block mb-1">
              Bank Ref / UTR / Transaction ID (Optional)
            </label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g. UPI/420192839211 or UTR-98212"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSwitch}
            disabled={submitting || proration.isSameTier}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Processing Proration...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>
                  {proration.isSameTier
                    ? 'Already on this Plan'
                    : `Confirm Prorated Switch (${formatINR(proration.totalNetPayable)})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
