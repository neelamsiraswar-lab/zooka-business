// src/components/QuotaGaugesWidget.tsx
import React from 'react';
import { Workspace } from '../types';
import {
  FileText,
  Users,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { getPlanConfig } from '../data/subscriptionPlans';

interface QuotaGaugesWidgetProps {
  workspace: Workspace | null;
  onOpenUpgradeModal?: () => void;
  compact?: boolean;
}

export const QuotaGaugesWidget: React.FC<QuotaGaugesWidgetProps> = ({
  workspace,
  onOpenUpgradeModal,
  compact = false,
}) => {
  if (!workspace) return null;

  const planConfig = getPlanConfig(workspace.plan || 'starter');
  const invoicesCount = workspace.invoicesCount || 0;
  const maxInvoices =
    workspace.maxInvoicesPerMonth !== undefined
      ? workspace.maxInvoicesPerMonth
      : planConfig.maxInvoicesPerMonth;

  const membersCount = workspace.membersCount || 1;
  const maxUsers =
    workspace.maxUsers !== undefined ? workspace.maxUsers : planConfig.maxUsers;

  // Compute percentages
  const invoicePercent =
    maxInvoices === -1 || maxInvoices <= 0
      ? 0
      : Math.min(100, Math.round((invoicesCount / maxInvoices) * 100));

  const userPercent =
    maxUsers === -1 || maxUsers <= 0
      ? 0
      : Math.min(100, Math.round((membersCount / maxUsers) * 100));

  // Storage estimation based on documents
  const estimatedStorageDocs = invoicesCount * 12 + membersCount * 8 + 24; // in KB roughly
  const estimatedStorageMb = (estimatedStorageDocs / 1024).toFixed(1);
  const maxStorageMb = workspace.plan === 'enterprise' ? 10000 : workspace.plan === 'professional' ? 2000 : 500;
  const storagePercent = Math.min(100, Math.round((Number(estimatedStorageMb) / maxStorageMb) * 100));

  const getMeterColor = (percent: number, isUnlimited: boolean) => {
    if (isUnlimited) return 'bg-indigo-500';
    if (percent >= 90) return 'bg-rose-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (percent: number, isUnlimited: boolean) => {
    if (isUnlimited) return 'text-indigo-400';
    if (percent >= 90) return 'text-rose-400';
    if (percent >= 70) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const isNearLimit = (!maxInvoices || maxInvoices === -1 ? false : invoicePercent >= 85) ||
                      (!maxUsers || maxUsers === -1 ? false : userPercent >= 90);

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Invoices:</span>
          <span className="font-semibold font-mono text-white">
            {invoicesCount} / {maxInvoices === -1 ? '∞' : maxInvoices}
          </span>
        </div>
        <div className="w-px h-3 bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Seats:</span>
          <span className="font-semibold font-mono text-white">
            {membersCount} / {maxUsers === -1 ? '∞' : maxUsers}
          </span>
        </div>
        {onOpenUpgradeModal && (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className="ml-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Manage</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Real-Time Usage & Quota Meters</h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {planConfig.name} Tier
              </span>
            </div>
            <p className="text-xs text-slate-400">Live operational resource consumption in this billing cycle.</p>
          </div>
        </div>

        {onOpenUpgradeModal && (
          <button
            type="button"
            onClick={onOpenUpgradeModal}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
              isNearLimit
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{isNearLimit ? 'Quota Alert: Upgrade Plan' : 'Prorated Plan Upgrade'}</span>
          </button>
        )}
      </div>

      {isNearLimit && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You have reached over 80% of your plan entitlement. Upgrade to an Enterprise plan to prevent voucher creation throttling.
          </span>
        </div>
      )}

      {/* 3 Metric Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Metric 1: Monthly Invoices */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Invoices & Vouchers</span>
            </span>
            <span className={`font-mono font-bold ${getTextColor(invoicePercent, maxInvoices === -1)}`}>
              {maxInvoices === -1 ? 'Unlimited' : `${invoicePercent}%`}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-white font-mono">{invoicesCount}</span>
            <span className="text-xs text-slate-500 font-mono">
              / {maxInvoices === -1 ? 'Unlimited (Enterprise)' : `${maxInvoices} monthly`}
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getMeterColor(invoicePercent, maxInvoices === -1)}`}
              style={{ width: maxInvoices === -1 ? '100%' : `${invoicePercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">Resets on 1st of every month automatically.</p>
        </div>

        {/* Metric 2: Team Members & Seats */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Team Member Seats</span>
            </span>
            <span className={`font-mono font-bold ${getTextColor(userPercent, maxUsers === -1)}`}>
              {maxUsers === -1 ? 'Unlimited' : `${userPercent}%`}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-white font-mono">{membersCount}</span>
            <span className="text-xs text-slate-500 font-mono">
              / {maxUsers === -1 ? 'Unlimited' : `${maxUsers} allocated seats`}
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getMeterColor(userPercent, maxUsers === -1)}`}
              style={{ width: maxUsers === -1 ? '100%' : `${userPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">Accountants, Auditors & Billing Clerks with RBAC.</p>
        </div>

        {/* Metric 3: Document Cloud Storage */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud Storage Quota</span>
            </span>
            <span className={`font-mono font-bold ${getTextColor(storagePercent, false)}`}>
              {storagePercent}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-white font-mono">{estimatedStorageMb} MB</span>
            <span className="text-xs text-slate-500 font-mono">/ {maxStorageMb} MB</span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getMeterColor(storagePercent, false)}`}
              style={{ width: `${Math.max(4, storagePercent)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">Firestore document index, attachments & invoice PDFs.</p>
        </div>
      </div>
    </div>
  );
};
