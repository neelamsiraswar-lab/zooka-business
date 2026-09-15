// src/components/PlanEditorModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Check,
  CreditCard,
  Layers,
  Tag,
  Users,
  FileSpreadsheet,
  Building,
  Info,
} from 'lucide-react';
import { PlanTierConfig, PLAN_COLOR_PRESETS, formatINR } from '../data/subscriptionPlans';
import { useDialog } from '../context/DialogContext';

interface PlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: Partial<PlanTierConfig>) => Promise<void>;
  plan?: PlanTierConfig | null; // null for create, object for edit
}

export const PlanEditorModal: React.FC<PlanEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  plan,
}) => {
  const dialog = useDialog();
  const isEditMode = !!plan;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [badge, setBadge] = useState('');
  const [popular, setPopular] = useState(false);
  const [status, setStatus] = useState<'active' | 'archived' | 'draft'>('active');
  const [monthlyPrice, setMonthlyPrice] = useState(1999);
  const [annualPrice, setAnnualPrice] = useState(19990);
  const [maxUsers, setMaxUsers] = useState<number | string>(5);
  const [maxInvoicesPerMonth, setMaxInvoicesPerMonth] = useState<number | string>(-1);
  const [maxLedgers, setMaxLedgers] = useState<number | string>(1000);
  const [maxBranches, setMaxBranches] = useState<number | string>(2);
  const [selectedColorPreset, setSelectedColorPreset] = useState<string>('indigo');
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setSlug(plan.id);
      setTagline(plan.tagline || '');
      setBadge(plan.badge || '');
      setPopular(!!plan.popular);
      setStatus(plan.status || 'active');
      setMonthlyPrice(plan.monthlyPrice);
      setAnnualPrice(plan.annualPrice);
      setMaxUsers(plan.maxUsers);
      setMaxInvoicesPerMonth(plan.maxInvoicesPerMonth);
      setMaxLedgers(plan.maxLedgers);
      setMaxBranches(plan.maxBranches);
      setFeatures(plan.features || []);

      // Match color preset if possible
      const matched = Object.entries(PLAN_COLOR_PRESETS).find(
        ([, p]) => p.text === plan.color?.text
      );
      setSelectedColorPreset(matched ? matched[0] : 'indigo');
    } else {
      // Default initial state for new plan
      setName('');
      setSlug('');
      setTagline('Tailored accounting and GST billing suite for high-performance teams.');
      setBadge('New Tier');
      setPopular(false);
      setStatus('active');
      setMonthlyPrice(2999);
      setAnnualPrice(29990);
      setMaxUsers(5);
      setMaxInvoicesPerMonth(-1);
      setMaxLedgers(2500);
      setMaxBranches(2);
      setSelectedColorPreset('indigo');
      setFeatures([
        'Up to 5 User Seats with Custom Role Permissions',
        'Unlimited GST Sales Invoices & E-Way Bills',
        'Bank Reconciliation & Multi-Account Matching',
        'Direct PDF & WhatsApp Invoice Dispatch',
        'GSTR-1, GSTR-2B & GSTR-3B Tax Filing Summaries',
        'Standard Email & Chat Support SLA',
      ]);
    }
  }, [plan, isOpen]);

  if (!isOpen) return null;

  // Auto-generate slug when name changes (in create mode)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditMode) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setSlug(generated);
    }
  };

  // Quick auto-fill annual price (10 months pricing = 2 months free)
  const handleMonthlyPriceChange = (val: number) => {
    setMonthlyPrice(val);
    if (!isEditMode || annualPrice === 0 || annualPrice === monthlyPrice * 10) {
      setAnnualPrice(val * 10);
    }
  };

  const handleAddFeature = () => {
    if (!newFeatureInput.trim()) return;
    setFeatures((prev) => [...prev, newFeatureInput.trim()]);
    setNewFeatureInput('');
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      dialog.toast.warning('Plan name is required');
      return;
    }
    if (!slug.trim()) {
      dialog.toast.warning('Plan unique identifier/slug is required');
      return;
    }
    if (features.length === 0) {
      dialog.toast.warning('Please add at least one feature item for the plan.');
      return;
    }

    setSaving(true);
    try {
      const activeColor = PLAN_COLOR_PRESETS[selectedColorPreset] || PLAN_COLOR_PRESETS.indigo;
      const payload: Partial<PlanTierConfig> = {
        id: slug.trim().toLowerCase(),
        name: name.trim(),
        tagline: tagline.trim(),
        badge: badge.trim(),
        popular,
        status,
        monthlyPrice: Number(monthlyPrice),
        annualPrice: Number(annualPrice),
        monthlyEquivalentAnnual: Math.round(Number(annualPrice) / 12),
        maxUsers: Number(maxUsers),
        maxInvoicesPerMonth: Number(maxInvoicesPerMonth),
        maxLedgers: Number(maxLedgers),
        maxBranches: Number(maxBranches),
        features,
        color: activeColor,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save plan:', err);
      dialog.toast.error(err.message || 'Failed to save subscription plan');
    } finally {
      setSaving(false);
    }
  };

  const activeColorTheme = PLAN_COLOR_PRESETS[selectedColorPreset] || PLAN_COLOR_PRESETS.indigo;
  const annualSavings = (monthlyPrice * 12) - annualPrice;
  const savingsPct = Math.round((annualSavings / (monthlyPrice * 12)) * 100);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditMode ? `Edit Plan: ${plan?.name}` : 'Create New Subscription Plan'}
              </h3>
              <p className="text-xs text-slate-400">
                Define tier pricing, quota limits, entitled feature sets, and visual badges.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(85vh-120px)] overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form Fields (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Basic Information */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Plan Identity & Branding</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Plan Display Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Growth Pro Suite"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Plan Identifier Slug <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isEditMode && plan?.isBuiltIn}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. growth_pro"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    />
                    {isEditMode && plan?.isBuiltIn && (
                      <span className="text-[10px] text-slate-500 mt-1 block">Built-in plan ID cannot be modified.</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tagline / Description
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Short description highlighting who this plan is best suited for."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="e.g. Recommended, Best Value"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Catalog Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="active">Active (Available)</option>
                      <option value="draft">Draft (Hidden)</option>
                      <option value="archived">Archived (Grandfathered)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-700/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={popular}
                        onChange={(e) => setPopular(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-medium text-slate-200">Highlight as Popular</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Pricing Structure */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pricing & Billing Terms</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Monthly Price (₹ Excl. GST) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={monthlyPrice}
                        onChange={(e) => handleMonthlyPriceChange(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      + 18% GST = {formatINR(Math.round(monthlyPrice * 1.18))} / month
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Annual Price (₹ Excl. GST) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={annualPrice}
                        onChange={(e) => setAnnualPrice(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-emerald-400 mt-1 block">
                      ≈ {formatINR(Math.round(annualPrice / 12))}/mo {annualSavings > 0 ? `(Save ${savingsPct}%)` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quotas & Entitlement Limits */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Resource Quotas & Enforced Limits</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Enter -1 for Unlimited</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Max Users</span>
                    </label>
                    <input
                      type="number"
                      value={maxUsers}
                      onChange={(e) => setMaxUsers(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="-1 for unlimited"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {maxUsers === -1 ? 'Unlimited' : `${maxUsers} seats`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                      <span>Invoices / Mo</span>
                    </label>
                    <input
                      type="number"
                      value={maxInvoicesPerMonth}
                      onChange={(e) => setMaxInvoicesPerMonth(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="-1 for unlimited"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {maxInvoicesPerMonth === -1 ? 'Unlimited' : `${maxInvoicesPerMonth} inv/mo`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>Max Ledgers</span>
                    </label>
                    <input
                      type="number"
                      value={maxLedgers}
                      onChange={(e) => setMaxLedgers(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="-1 for unlimited"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {maxLedgers === -1 ? 'Unlimited' : `${maxLedgers} accounts`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>Max Branches</span>
                    </label>
                    <input
                      type="number"
                      value={maxBranches}
                      onChange={(e) => setMaxBranches(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="-1 for unlimited"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {maxBranches === -1 ? 'Unlimited' : `${maxBranches} GSTINs`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Theme & Visual Identity */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Card Theme & Visual Palette</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(PLAN_COLOR_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedColorPreset(key)}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer flex items-center gap-2 ${
                        selectedColorPreset === key
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${preset.text.replace('text-', 'bg-')}`} />
                      <span className="text-xs font-medium text-slate-200">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Features List */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Included Plan Features ({features.length})</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureInput}
                    onChange={(e) => setNewFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="e.g. Automated GST E-Way Bill generation"
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 group hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {features.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500">
                      No features defined yet. Add features using the box above.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live Plan Card Preview (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="sticky top-20">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live Card Preview</span>
                </div>

                <div
                  className={`rounded-2xl border bg-gradient-to-b ${activeColorTheme.gradient} ${activeColorTheme.border} p-5 relative overflow-hidden shadow-2xl transition`}
                >
                  {badge && (
                    <div className="mb-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${activeColorTheme.badge}`}>
                        {badge}
                      </span>
                    </div>
                  )}

                  <div className="font-bold text-white text-lg">{name || 'Plan Title'}</div>
                  <div className="text-xs text-slate-400 mt-1 min-h-[32px] line-clamp-2">
                    {tagline || 'Short descriptive value proposition for this plan.'}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono text-white">
                        {formatINR(monthlyPrice)}
                      </span>
                      <span className="text-xs text-slate-400">/ mo</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      or {formatINR(annualPrice)} / yr billed annually
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Included Highlights
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{maxUsers === -1 ? 'Unlimited User Seats' : `Up to ${maxUsers} Team Members`}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{maxInvoicesPerMonth === -1 ? 'Unlimited Invoices / Mo' : `${maxInvoicesPerMonth} Invoices / Mo`}</span>
                      </li>
                      {features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 truncate">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-3">
                    <div className="w-full py-2 rounded-xl bg-indigo-600/80 text-white text-xs font-semibold text-center">
                      Select Plan (Preview)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition cursor-pointer flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Plan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditMode ? 'Save Changes' : 'Create & Publish Plan'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
