// src/components/SubscriptionManagementModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Workspace,
  SubscriptionPlanTier,
  SubscriptionBillingCycle,
  SubscriptionStatus,
  SubscriptionInvoice,
} from '../types';
import {
  X,
  ShieldAlert,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Plus,
  FileText,
  Eye,
  Check,
  Building2,
  Users,
  Receipt,
  Layers,
  Zap,
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
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
  extendSubscriptionPeriod,
  updateSubscriptionStatus,
  recordSubscriptionInvoice,
  getSampleSubscriptionInvoices,
} from '../db/subscriptions';
import { getAllSubscriptionPlans } from '../db/subscriptionPlans';
import { SubscriptionReceiptModal } from './SubscriptionReceiptModal';

interface SubscriptionManagementModalProps {
  workspace: Workspace;
  onClose: () => void;
  onUpdated: (updatedWorkspace: Workspace) => void;
  availablePlans?: PlanTierConfig[];
}

export const SubscriptionManagementModal: React.FC<SubscriptionManagementModalProps> = ({
  workspace,
  onClose,
  onUpdated,
  availablePlans,
}) => {
  const [currentWs, setCurrentWs] = useState<Workspace>(workspace);
  const [activeTab, setActiveTab] = useState<'overview' | 'change_plan' | 'invoices'>('overview');
  const [plansList, setPlansList] = useState<PlanTierConfig[]>(availablePlans || DEFAULT_BUILTIN_PLANS);

  useEffect(() => {
    if (availablePlans && availablePlans.length > 0) {
      setPlansList(availablePlans);
    } else {
      getAllSubscriptionPlans()
        .then((res) => {
          if (res && res.length > 0) setPlansList(res);
        })
        .catch(console.error);
    }
  }, [availablePlans]);

  // Change plan state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanTier>(workspace.plan || 'professional');
  const [selectedCycle, setSelectedCycle] = useState<SubscriptionBillingCycle>(workspace.billingCycle || 'annual');
  const [updatingPlan, setUpdatingPlan] = useState(false);

  // Extend validity state
  const [extendingDays, setExtendingDays] = useState<number | null>(null);

  // Status toggle
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Record payment form
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [recordPlan, setRecordPlan] = useState<SubscriptionPlanTier>(workspace.plan || 'professional');
  const [recordCycle, setRecordCycle] = useState<SubscriptionBillingCycle>(workspace.billingCycle || 'annual');
  const [recordMethod, setRecordMethod] = useState<SubscriptionInvoice['paymentMethod']>('UPI');
  const [recordTxnRef, setRecordTxnRef] = useState('');
  const [recordNotes, setRecordNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // View Receipt Modal
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<SubscriptionInvoice | null>(null);

  // Invoices list
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>(
    workspace.subscriptionInvoices && workspace.subscriptionInvoices.length > 0
      ? workspace.subscriptionInvoices
      : getSampleSubscriptionInvoices(workspace)
  );

  const statusMeta = getSubscriptionStatusMeta(currentWs.subscriptionStatus || currentWs.status);
  const daysMeta = getDaysRemaining(currentWs.currentPeriodEnd || currentWs.trialEndsAt);
  const planConfig = getPlanConfig(currentWs.plan);
  const costPreview = calculateSubscriptionCost(selectedPlan, selectedCycle);

  // Handle Plan Change
  const handleSavePlanChange = async () => {
    try {
      setUpdatingPlan(true);
      const updated = await updateSubscriptionPlan(currentWs.id, selectedPlan, selectedCycle);
      setCurrentWs(updated);
      onUpdated(updated);
      setActiveTab('overview');
    } catch (err: any) {
      console.error('Failed to change plan:', err);
      alert(err.message || 'Failed to change plan');
    } finally {
      setUpdatingPlan(false);
    }
  };

  // Handle Extend Days
  const handleExtendDays = async (days: number) => {
    try {
      setExtendingDays(days);
      const updated = await extendSubscriptionPeriod(currentWs.id, days);
      setCurrentWs(updated);
      onUpdated(updated);
    } catch (err: any) {
      console.error('Failed to extend subscription:', err);
      alert(err.message || 'Failed to extend subscription');
    } finally {
      setExtendingDays(null);
    }
  };

  // Handle Status Change
  const handleStatusChange = async (newStatus: SubscriptionStatus) => {
    try {
      setStatusUpdating(true);
      const updated = await updateSubscriptionStatus(currentWs.id, newStatus);
      setCurrentWs(updated);
      onUpdated(updated);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRecordingPayment(true);
      const newInvoice = await recordSubscriptionInvoice({
        workspaceId: currentWs.id,
        plan: recordPlan,
        billingCycle: recordCycle,
        paymentMethod: recordMethod,
        transactionReference: recordTxnRef.trim() || undefined,
        notes: recordNotes.trim() || undefined,
      });

      const updatedInvoices = [newInvoice, ...invoices];
      setInvoices(updatedInvoices);

      const updatedWs: Workspace = {
        ...currentWs,
        plan: recordPlan,
        billingCycle: recordCycle,
        subscriptionStatus: 'active',
        status: 'active',
        subscriptionInvoices: updatedInvoices,
      };
      setCurrentWs(updatedWs);
      onUpdated(updatedWs);

      setShowRecordPaymentModal(false);
      setRecordTxnRef('');
      setRecordNotes('');
      setSelectedReceiptInvoice(newInvoice);
    } catch (err: any) {
      console.error('Failed to record subscription invoice:', err);
      alert(err.message || 'Failed to record subscription payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[92vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-slate-800 bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                <CreditCard className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Subscription & Plan Governance
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">{currentWs.businessName || currentWs.name}</h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                <span>{statusMeta.label}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-medium border border-slate-700">
                GSTIN: {currentWs.gstin || 'Unregistered'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="self-start sm:self-center p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Subscription Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('change_plan')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'change_plan'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Change Plan & Tiers</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Invoices & Billing History ({invoices.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Active Plan Hero Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/20 shadow-lg relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Plan</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                        {currentWs.plan.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 capitalize">
                        {currentWs.billingCycle || 'annual'} billing
                      </span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-white tracking-tight">{planConfig.name}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl">{planConfig.tagline}</p>
                  </div>

                  {/* Validity Box */}
                  <div className="w-full md:w-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-right space-y-1">
                    <div className="flex items-center gap-2 justify-end text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Renewal / Expiry Date</span>
                    </div>
                    <p className="text-base font-bold text-white">
                      {currentWs.currentPeriodEnd
                        ? new Date(currentWs.currentPeriodEnd).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Permanent Active'}
                    </p>
                    <p className={`text-xs font-medium ${daysMeta.isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {daysMeta.label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resource Entitlements & Usage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>User Seats</span>
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{currentWs.membersCount || 1}</span>
                    <span className="text-xs text-slate-400">
                      / {planConfig.maxUsers === -1 ? 'Unlimited' : planConfig.maxUsers} Allowed
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{
                        width:
                          planConfig.maxUsers === -1
                            ? '25%'
                            : `${Math.min(100, ((currentWs.membersCount || 1) / planConfig.maxUsers) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Monthly Invoices</span>
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{currentWs.invoicesCount || 0}</span>
                    <span className="text-xs text-slate-400">
                      / {planConfig.maxInvoicesPerMonth === -1 ? 'Unlimited' : planConfig.maxInvoicesPerMonth}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{
                        width:
                          planConfig.maxInvoicesPerMonth === -1
                            ? '15%'
                            : `${Math.min(100, ((currentWs.invoicesCount || 0) / planConfig.maxInvoicesPerMonth) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>GST Branches</span>
                    <Building2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">1</span>
                    <span className="text-xs text-slate-400">
                      / {planConfig.maxBranches === -1 ? 'Unlimited' : planConfig.maxBranches}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '33%' }} />
                  </div>
                </div>
              </div>

              {/* Super Admin Quick Actions */}
              <div className="p-5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Super Admin Lifecycle Overrides
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Directly grant complimentary trial extensions, modify subscription status, or issue invoices.
                    </p>
                  </div>
                </div>

                {/* Extend Days Pill Buttons */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">Extend Validity:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '+14 Days Trial', days: 14 },
                      { label: '+30 Days', days: 30 },
                      { label: '+90 Days (Quarter)', days: 90 },
                      { label: '+1 Year (Annual)', days: 365 },
                    ].map((btn) => (
                      <button
                        key={btn.days}
                        onClick={() => handleExtendDays(btn.days)}
                        disabled={extendingDays !== null}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {extendingDays === btn.days ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-400">Force Subscription Status:</span>
                  <div className="flex flex-wrap gap-2">
                    {(['active', 'trial', 'past_due', 'suspended', 'expired'] as SubscriptionStatus[]).map((st) => {
                      const isSelected = (currentWs.subscriptionStatus || currentWs.status) === st;
                      return (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(st)}
                          disabled={statusUpdating || isSelected}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHANGE PLAN & TIERS */}
          {activeTab === 'change_plan' && (
            <div className="space-y-6">
              {/* Billing Cycle Toggle */}
              <div className="flex justify-center">
                <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 inline-flex items-center gap-1">
                  <button
                    onClick={() => setSelectedCycle('monthly')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedCycle === 'monthly'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setSelectedCycle('annual')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedCycle === 'annual'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                      SAVE 17%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plansList
                  .filter((p) => p.status !== 'archived' || p.id === currentWs.plan)
                  .map((plan) => {
                    const tierKey = plan.id;
                    const isSelected = selectedPlan === tierKey;
                    const isCurrent = currentWs.plan === tierKey;
                    const cost = calculateSubscriptionCost(tierKey, selectedCycle, plansList);

                    return (
                      <div
                        key={tierKey}
                        onClick={() => setSelectedPlan(tierKey)}
                        className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/20 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        {/* Popular / Custom Badge */}
                        {(plan.popular || plan.badge) && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow">
                            {plan.badge || (plan.popular ? 'Most Popular' : '')}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{plan.name}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                                Current
                              </span>
                            )}
                          </div>

                          <div className="mt-3">
                            <span className="text-2xl font-extrabold text-white">
                              {formatINR(selectedCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice)}
                            </span>
                            <span className="text-xs text-slate-400">/{selectedCycle === 'annual' ? 'yr' : 'mo'}</span>
                            {selectedCycle === 'annual' && (
                              <p className="text-[11px] text-emerald-400 mt-0.5">
                                {formatINR(plan.monthlyEquivalentAnnual)}/mo equivalent
                              </p>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 mt-2 min-h-[36px]">{plan.tagline}</p>

                          <div className="my-4 border-t border-slate-800/80" />

                          <ul className="space-y-2 text-xs text-slate-300">
                            {plan.features.slice(0, 5).map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-[11px]">
                                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                      <div className="mt-4 pt-3">
                        <button
                          type="button"
                          className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                              <span>Selected Tier</span>
                            </>
                          ) : (
                            <span>Select {plan.name}</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cost Preview & Confirm Action */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-white">Tier Summary:</span>
                    <span className="capitalize">{getPlanConfig(selectedPlan).name}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedCycle} Cycle</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Base: {formatINR(costPreview.baseAmount)} + 18% GST ({formatINR(costPreview.gstAmount)}) ={' '}
                    <span className="font-bold text-emerald-400 text-xs font-mono">
                      {formatINR(costPreview.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedPlan(currentWs.plan)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSavePlanChange}
                    disabled={updatingPlan}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {updatingPlan ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                    <span>Apply Plan Change</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVOICES & BILLING HISTORY */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Subscription Invoices & Receipts
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Official GST Tax Invoices for platform software subscriptions.
                  </p>
                </div>
                <button
                  onClick={() => setShowRecordPaymentModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Payment & Issue Invoice</span>
                </button>
              </div>

              {invoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                  No subscription invoices recorded yet. Click "Record Payment & Issue Invoice" to generate one.
                </div>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-slate-800 shadow-sm">
                  <table className="w-full min-w-[650px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                        <th className="py-3 px-4 whitespace-nowrap">Invoice #</th>
                        <th className="py-3 px-3 whitespace-nowrap">Date</th>
                        <th className="py-3 px-3 whitespace-nowrap">Tier</th>
                        <th className="py-3 px-3 whitespace-nowrap">Cycle</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Amount (Incl. GST)</th>
                        <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono font-semibold text-white whitespace-nowrap">{inv.invoiceNumber}</td>
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                            {new Date(inv.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-3 capitalize text-indigo-300 whitespace-nowrap">{inv.plan}</td>
                          <td className="py-3 px-3 capitalize text-slate-400 whitespace-nowrap">{inv.billingCycle}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                            {formatINR(inv.totalAmount)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedReceiptInvoice(inv)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-indigo-400" />
                              <span>View Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Multi-Tenant Real-Time Subscription Cloud</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Record Payment Sub-Modal */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Record Subscription Payment</h3>
              <button
                onClick={() => setShowRecordPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Plan Tier</label>
                <select
                  value={recordPlan}
                  onChange={(e) => setRecordPlan(e.target.value as SubscriptionPlanTier)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white capitalize"
                >
                  {plansList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.monthlyPrice}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Billing Cycle</label>
                <select
                  value={recordCycle}
                  onChange={(e) => setRecordCycle(e.target.value as SubscriptionBillingCycle)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual (17% Discount)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Payment Method</label>
                <select
                  value={recordMethod}
                  onChange={(e) => setRecordMethod(e.target.value as any)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">NEFT / RTGS / IMPS Bank Transfer</option>
                  <option value="Razorpay">Razorpay Payment Gateway</option>
                  <option value="Admin Grant">Super Admin Complimentary Grant</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Transaction / UTR Reference (Optional)</label>
                <input
                  type="text"
                  value={recordTxnRef}
                  onChange={(e) => setRecordTxnRef(e.target.value)}
                  placeholder="e.g. UPI/619284019284 or BANK-REF"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Notes (Optional)</label>
                <input
                  type="text"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="e.g. Annual renewal for FY 2026-27"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600"
                />
              </div>

              {/* Cost Calculation Summary */}
              {(() => {
                const c = calculateSubscriptionCost(recordPlan, recordCycle, plansList);
                return (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Taxable Value:</span>
                      <span className="font-mono">{formatINR(c.baseAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>18% GST:</span>
                      <span className="font-mono">{formatINR(c.gstAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                      <span>Total Invoice Amount:</span>
                      <span className="font-mono text-emerald-400">{formatINR(c.totalAmount)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {recordingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                  <span>Generate Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Viewer */}
      {selectedReceiptInvoice && (
        <SubscriptionReceiptModal
          invoice={selectedReceiptInvoice}
          workspace={currentWs}
          onClose={() => setSelectedReceiptInvoice(null)}
        />
      )}
    </div>
  );
};
