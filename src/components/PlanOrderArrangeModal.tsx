import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  Layers,
  Save,
  Check,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { PlanTierConfig, formatINR } from '../data/subscriptionPlans';
import { reorderSubscriptionPlans, resetSubscriptionPlansOrder } from '../db/subscriptionPlans';
import { useDialog } from '../context/DialogContext';

interface PlanOrderArrangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: PlanTierConfig[];
  onOrderSaved: (updatedPlans: PlanTierConfig[]) => void;
  currentUserId?: number;
  currentUserEmail?: string;
}

export const PlanOrderArrangeModal: React.FC<PlanOrderArrangeModalProps> = ({
  isOpen,
  onClose,
  plans,
  onOrderSaved,
  currentUserId = 1,
  currentUserEmail = 'admin@platform.com',
}) => {
  const dialog = useDialog();
  const [orderedPlans, setOrderedPlans] = useState<PlanTierConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Sort incoming plans by their existing order
      const sorted = [...plans].sort((a, b) => {
        const orderA = a.order !== undefined && a.order !== null ? a.order : 999;
        const orderB = b.order !== undefined && b.order !== null ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.monthlyPrice || 0) - (b.monthlyPrice || 0);
      });
      setOrderedPlans(sorted);
      setHasChanges(false);
    }
  }, [isOpen, plans]);

  if (!isOpen) return null;

  const handleMove = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (orderedPlans.length <= 1) return;

    const updated = [...orderedPlans];
    const targetItem = updated[index];

    if (direction === 'up') {
      if (index === 0) return;
      updated.splice(index, 1);
      updated.splice(index - 1, 0, targetItem);
    } else if (direction === 'down') {
      if (index === updated.length - 1) return;
      updated.splice(index, 1);
      updated.splice(index + 1, 0, targetItem);
    } else if (direction === 'top') {
      if (index === 0) return;
      updated.splice(index, 1);
      updated.unshift(targetItem);
    } else if (direction === 'bottom') {
      if (index === updated.length - 1) return;
      updated.splice(index, 1);
      updated.push(targetItem);
    }

    setOrderedPlans(updated);
    setHasChanges(true);
  };

  const handlePositionChange = (currentIndex: number, newPos1Based: number) => {
    const targetIndex = Math.max(0, Math.min(orderedPlans.length - 1, newPos1Based - 1));
    if (targetIndex === currentIndex) return;

    const updated = [...orderedPlans];
    const [movedItem] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setOrderedPlans(updated);
    setHasChanges(true);
  };

  const handleResetToDefault = async () => {
    const confirmed = await dialog.confirm({
      title: 'Reset to Default Tier Sequence?',
      message:
        'This will reset the order of plans to the canonical sequence: Free Forever (#1) → Starter Solo (#2) → Business Pro (#3) → Enterprise Matrix (#4), followed by any custom custom plans. Continue?',
      confirmText: 'Reset Order',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (!confirmed) return;

    const builtInIds = ['free', 'starter', 'professional', 'enterprise'];
    const builtIns = orderedPlans.filter((p) => builtInIds.includes(p.id));
    const custom = orderedPlans.filter((p) => !builtInIds.includes(p.id));

    // Sort built-ins in the exact canonical sequence
    builtIns.sort((a, b) => builtInIds.indexOf(a.id) - builtInIds.indexOf(b.id));

    const defaultSequence = [...builtIns, ...custom];
    setOrderedPlans(defaultSequence);
    setHasChanges(true);
    dialog.toast.info('Plan order sequence reset to standard default.');
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const orderedIds = orderedPlans.map((p) => p.id);
      const updated = await reorderSubscriptionPlans(orderedIds, currentUserId, currentUserEmail);
      
      // Notify parent and broadcast event for immediate synchronization
      onOrderSaved(updated);
      window.dispatchEvent(new CustomEvent('subscription_plans_updated'));

      dialog.toast.success(
        `Display order for ${orderedPlans.length} subscription plans successfully updated and published to landing page!`
      );
      setHasChanges(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to save subscription plan order:', err);
      dialog.toast.error(err.message || 'Failed to save subscription plan order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="plan-order-arrange-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Arrange Subscription Plans Display Order</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {orderedPlans.length} Tiers
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Arrange the exact display sequence of pricing cards on the public landing page and checkout registration.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live sync banner */}
        <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-[11px] text-emerald-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Public Landing Page Synchronization:</strong> Tier #1 appears first (leftmost card), followed sequentially by #2, #3, etc.
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition underline decoration-emerald-500/50 underline-offset-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Standard Sequence</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Order List */}
          <div className="space-y-2">
            {orderedPlans.map((plan, index) => {
              const isFirst = index === 0;
              const isLast = index === orderedPlans.length - 1;
              const isBuiltIn = plan.isBuiltIn || ['free', 'starter', 'professional', 'enterprise'].includes(plan.id);

              return (
                <div
                  key={plan.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    plan.popular
                      ? 'bg-slate-950/80 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Position & Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Position Badge with direct selector */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold font-mono flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <select
                        aria-label={`Position for ${plan.name}`}
                        value={index + 1}
                        onChange={(e) => handlePositionChange(index, parseInt(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {orderedPlans.map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Position {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Color dot & Name */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            plan.color?.accent ? plan.color.accent.replace('text-', 'bg-') : 'bg-indigo-400'
                          }`}
                        />
                        <span className="font-bold text-white text-xs sm:text-sm truncate">{plan.name}</span>
                        {plan.badge && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {plan.badge}
                          </span>
                        )}
                        {plan.popular && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Popular
                          </span>
                        )}
                        {isBuiltIn && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400">
                            Built-in
                          </span>
                        )}
                        {plan.status === 'archived' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-semibold">
                          {plan.monthlyPrice === 0 ? 'Free' : `${formatINR(plan.monthlyPrice)}/mo`}
                        </span>
                        <span>•</span>
                        <span>{plan.maxUsers === -1 ? 'Unlimited Users' : `${plan.maxUsers} Users`}</span>
                        <span>•</span>
                        <span>{plan.maxInvoicesPerMonth === -1 ? 'Unlimited Invoices' : `${plan.maxInvoicesPerMonth} Invoices`}</span>
                        <span>•</span>
                        <span className="text-slate-500">{plan.tagline}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Arrangement Buttons */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(index, 'top')}
                      title="Move to Top (#1)"
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(index, 'up')}
                      title="Move Up 1 Position"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Up</span>
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(index, 'down')}
                      title="Move Down 1 Position"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden sm:inline">Down</span>
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(index, 'bottom')}
                      title="Move to Bottom"
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real-time Visual Preview Strip */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Landing Page Layout Sequence Preview</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Order flow: Left → Right
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {orderedPlans.map((p, idx) => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border text-center relative ${
                    p.popular
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/80'
                  }`}
                >
                  <div className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold text-slate-500">
                    #{idx + 1}
                  </div>
                  {p.popular && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-emerald-400">
                      ★ Popular
                    </span>
                  )}
                  <div className="text-xs font-bold text-white truncate mt-2">{p.name}</div>
                  <div className="text-[11px] font-mono font-semibold text-emerald-400 mt-0.5">
                    {p.monthlyPrice === 0 ? '₹0 Free' : `${formatINR(p.monthlyPrice)}/mo`}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 truncate">
                    {p.maxUsers === -1 ? 'Unlimited' : `${p.maxUsers} seats`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            {hasChanges ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Unsaved order arrangement changes
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Current order sequence matches database
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving & Publishing Order...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Apply & Publish Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
