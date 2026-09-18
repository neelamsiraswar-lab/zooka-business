import React, { useState, useEffect } from 'react';
import { FinancialSummary, ActivityLog, Invoice, Cheque, Workspace, CompanyProfile } from '../types';
import { SkeletonDashboardView } from './SkeletonLoaders';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  IndianRupee,
  Layers,
  CreditCard,
  BookOpen,
  Bell,
  AlertCircle,
  Calendar,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Database,
  Zap,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { QuotaGaugesWidget } from './QuotaGaugesWidget';
import { TenantSetupWizardModal } from './TenantSetupWizardModal';
import { BulkDataMigrationModal } from './BulkDataMigrationModal';
import { ProratedUpgradeModal } from './ProratedUpgradeModal';

interface DashboardViewProps {
  summary: FinancialSummary | null;
  activityLogs: ActivityLog[];
  invoices?: Invoice[];
  cheques?: Cheque[];
  workspace?: Workspace | null;
  companyProfile?: CompanyProfile | null;
  onWorkspaceUpdated?: (ws: Workspace) => void;
  onCompanyUpdated?: (comp: CompanyProfile) => void;
  onNavigateToConsolidatedReports?: () => void;
  onQuickInvoice: () => void;
  onQuickExpense: () => void;
  onQuickReceipt?: () => void;
  onQuickPayment?: () => void;
  onQuickAccounting?: () => void;
  onNavigateToInvoices?: () => void;
  onNavigateToPurchases?: () => void;
  onNavigateToCheques?: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  activityLogs,
  invoices,
  cheques,
  workspace,
  companyProfile,
  onWorkspaceUpdated,
  onCompanyUpdated,
  onNavigateToConsolidatedReports,
  onQuickInvoice,
  onQuickExpense,
  onQuickReceipt,
  onQuickPayment,
  onQuickAccounting,
  onNavigateToInvoices,
  onNavigateToPurchases,
  onNavigateToCheques,
  onRefresh,
  loading,
}) => {
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (loading && !summary) {
    return <SkeletonDashboardView />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Executive Accounting Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Firestore Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time double-entry ledgers, GST tax liability, receivables, and profit analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsMigrationModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            title="Import Masters from Tally Prime / ERP 9"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tally XML Import</span>
          </button>

          {onNavigateToConsolidatedReports && (
            <button
              type="button"
              onClick={onNavigateToConsolidatedReports}
              className="px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Consolidated P&amp;L</span>
            </button>
          )}

          {onQuickReceipt && (
            <button
              onClick={onQuickReceipt}
              className="px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Receipt (F6)</span>
            </button>
          )}
          {onQuickPayment && (
            <button
              onClick={onQuickPayment}
              className="px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              <span>+ Payment (F5)</span>
            </button>
          )}
          <button
            onClick={onQuickExpense}
            className="px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Expense</span>
          </button>
          {onQuickAccounting && (
            <button
              onClick={onQuickAccounting}
              className="px-3 py-2 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Day Book</span>
            </button>
          )}
          <button
            onClick={onQuickInvoice}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 font-bold" />
            <span>+ GST Invoice</span>
          </button>
        </div>
      </div>

      {/* Onboarding Checklist Banner for New Tenants */}
      {workspace && !workspace.setupCompleted && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/40 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Interactive Setup Checklist Pending</h3>
                <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  3-Step Onboarding
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Configure your statutory GSTIN, filing frequencies, settlement bank accounts, and custom invoice prefixes to start issuing legally compliant tax invoices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSetupWizardOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-md shadow-indigo-600/25 cursor-pointer self-start sm:self-auto"
          >
            <span>Launch Setup Checklist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real-Time Quota Gauges & Resource Utilization Meters */}
      {workspace && (
        <QuotaGaugesWidget
          workspace={workspace}
          onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
        />
      )}

      {/* Notification Badge & Actionable Alerts Center */}
      {(() => {
        const getDaysDiff = (dateStr?: string) => {
          if (!dateStr) return 999;
          const d1 = new Date(dateStr);
          const d2 = new Date();
          d2.setHours(0, 0, 0, 0);
          d1.setHours(0, 0, 0, 0);
          const diffTime = d1.getTime() - d2.getTime();
          return Math.round(diffTime / (1000 * 60 * 60 * 24));
        };

        const overdueInvoices = (invoices || []).filter((inv) => {
          if (inv.status !== 'active' || inv.paymentStatus === 'paid' || !inv.dueDate) return false;
          return getDaysDiff(inv.dueDate) < 0;
        });

        const upcomingInvoices = (invoices || []).filter((inv) => {
          if (inv.status !== 'active' || inv.paymentStatus === 'paid' || !inv.dueDate) return false;
          const diff = getDaysDiff(inv.dueDate);
          return diff >= 0 && diff <= 7;
        });

        const urgentCheques = (cheques || []).filter((ch) => {
          if (ch.status === 'cleared' || ch.status === 'bounced' || ch.status === 'cancelled' || ch.status === 'stopped' || !ch.chequeDate) return false;
          const diff = getDaysDiff(ch.chequeDate);
          return diff <= 7; // Overdue, due today, or due in next 7 days
        });

        const totalAlertsCount = overdueInvoices.length + upcomingInvoices.length + urgentCheques.length;
        if (totalAlertsCount === 0) {
          return (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-semibold text-slate-200">All Accounts & Collections Up to Date</span>
                  <p className="text-slate-400 text-[11px]">No overdue invoice payments or urgent cheque maturities pending.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Zero Pending Alerts
                </span>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-gradient-to-r from-amber-950/25 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg shadow-amber-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Bell className="w-4 h-4 animate-pulse" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">Actionable Reminders & Alerts</h3>
                    <span className="text-[11px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                      {totalAlertsCount} Urgent
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Flagging overdue invoice receivables and upcoming cheque maturity dates.</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {onNavigateToInvoices && (
                  <button
                    onClick={onNavigateToInvoices}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl font-medium text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View Invoices</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {onNavigateToCheques && (
                  <button
                    onClick={onNavigateToCheques}
                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-xl font-medium text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Manage Cheques</span>
                    <CreditCard className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Alert Items Grid / List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Overdue Invoices */}
              {overdueInvoices.map((inv) => {
                const diffDays = Math.abs(getDaysDiff(inv.dueDate));
                const balanceDue = parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount || '0');
                return (
                  <div key={`overdue-inv-${inv.id}`} className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                        <div>
                          <span className="text-xs font-bold text-rose-300">Overdue Invoice</span>
                          <h4 className="text-sm font-semibold text-white">{inv.invoiceNumber}</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                        {diffDays}d Overdue
                      </span>
                    </div>

                    <div className="text-xs space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Party:</span>
                        <span className="font-medium truncate max-w-[160px]">{inv.partyName}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Due Date:</span>
                        <span className="font-mono text-rose-400">{inv.dueDate}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                        <span>Balance Due:</span>
                        <span className="text-amber-300">₹{balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {onNavigateToInvoices && (
                      <button
                        onClick={onNavigateToInvoices}
                        className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Collect Payment / View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Upcoming Invoices */}
              {upcomingInvoices.map((inv) => {
                const diffDays = getDaysDiff(inv.dueDate);
                const balanceDue = parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount || '0');
                const isToday = diffDays === 0;
                return (
                  <div key={`upcoming-inv-${inv.id}`} className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                          <Clock className="w-4 h-4" />
                        </span>
                        <div>
                          <span className="text-xs font-bold text-amber-300">Upcoming Invoice Due</span>
                          <h4 className="text-sm font-semibold text-white">{inv.invoiceNumber}</h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        {isToday ? 'Due Today' : `Due in ${diffDays}d`}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Party:</span>
                        <span className="font-medium truncate max-w-[160px]">{inv.partyName}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Due Date:</span>
                        <span className="font-mono text-amber-400">{inv.dueDate}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                        <span>Balance Due:</span>
                        <span className="text-amber-300">₹{balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {onNavigateToInvoices && (
                      <button
                        onClick={onNavigateToInvoices}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>View Invoice Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Urgent Cheques */}
              {urgentCheques.map((ch) => {
                const diffDays = getDaysDiff(ch.chequeDate);
                const isOverdue = diffDays < 0;
                const isToday = diffDays === 0;
                return (
                  <div key={`urgent-cheque-${ch.id}`} className={`${isOverdue ? 'bg-rose-950/30 border-rose-900/50' : 'bg-blue-950/30 border-blue-900/50'} border rounded-xl p-3.5 flex flex-col justify-between gap-3`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`p-2 rounded-lg ${isOverdue ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'} shrink-0`}>
                          <CreditCard className="w-4 h-4" />
                        </span>
                        <div>
                          <span className={`text-xs font-bold ${isOverdue ? 'text-rose-300' : 'text-blue-300'}`}>
                            {ch.chequeType === 'inward' ? 'Customer Cheque' : 'Issued Cheque'} ({ch.isPdc ? 'PDC' : 'Standard'})
                          </span>
                          <h4 className="text-sm font-semibold text-white">Cheque #{ch.chequeNumber}</h4>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${isOverdue ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : isToday ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'} border px-2 py-0.5 rounded-full`}>
                        {isOverdue ? `${Math.abs(diffDays)}d Overdue` : isToday ? 'Matures Today' : `Matures in ${diffDays}d`}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">{ch.chequeType === 'inward' ? 'Drawer:' : 'Payee:'}</span>
                        <span className="font-medium truncate max-w-[160px]">{ch.payeeName}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Bank / Branch:</span>
                        <span className="truncate max-w-[150px]">{ch.bankName}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Date:</span>
                        <span className="font-mono text-cyan-400">{ch.chequeDate}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                        <span>Cheque Amount:</span>
                        <span className="text-emerald-300">₹{parseFloat(ch.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {onNavigateToCheques && (
                      <button
                        onClick={onNavigateToCheques}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Deposit / Clear Cheque</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden transition-colors hover:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-400">Total Revenue (Sales)</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatINR(summary?.totalSales)}
            </span>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{summary?.totalInvoicesCount || 0} Invoices</span> issued
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden transition-colors hover:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-400">Operating Expenses</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight font-mono">
              {formatINR(summary?.totalExpenses)}
            </span>
            <p className="text-xs text-slate-400 mt-1.5">
              Salaries, rent, utilities &amp; freight
            </p>
          </div>
        </div>

        {/* Net Profit (P&L) */}
        <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden transition-colors hover:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-400">Net Profit / (Loss)</span>
            <span className={`p-1.5 rounded-lg border ${(summary?.netProfit || 0) >= 0 ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold tracking-tight font-mono ${(summary?.netProfit || 0) >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>
              {formatINR(summary?.netProfit)}
            </span>
            <p className="text-xs text-slate-400 mt-1.5">
              Gross Margin: <span className="font-mono text-slate-300">{formatINR(summary?.grossProfit)}</span>
            </p>
          </div>
        </div>

        {/* Net GST Payable */}
        <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden transition-colors hover:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-400">Net GST Liability</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-purple-300 tracking-tight font-mono">
              {formatINR(summary?.netGstPayable)}
            </span>
            <p className="text-xs text-slate-400 mt-1.5">
              Output GST − Input Tax Credit (ITC)
            </p>
          </div>
        </div>
      </div>

      {/* Middle Row: GST Tax Summary & Working Capital */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GST 3B / Tax Compliance Breakdown */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">GST Tax Compliance & GSTR-3B Summary</h2>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">Current Period</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-xs text-slate-400">Output Tax Collected (Sales)</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {formatINR(summary?.totalTaxCollected)}
              </p>
              <span className="text-[11px] text-slate-500">From customer invoices</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-xs text-slate-400">Input Tax Credit (ITC)</span>
              <p className="text-lg font-bold text-teal-400 mt-1">
                {formatINR(summary?.totalTaxPaidOnExpenses)}
              </p>
              <span className="text-[11px] text-slate-500">Paid on bills & purchases</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-xs text-slate-400">Net GST Due for Portal</span>
              <p className="text-lg font-bold text-purple-400 mt-1">
                {formatINR(summary?.netGstPayable)}
              </p>
              <span className="text-[11px] text-slate-500">Payable via Challan PMT-06</span>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/70 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span>Automatic HSN/SAC & Place of Supply Split</span>
              <span className="text-emerald-400">Automated</span>
            </div>
            <p className="leading-relaxed">
              In-state transactions automatically split into equal 50% <strong>CGST + SGST</strong> portions.
              Inter-state transactions apply full <strong>IGST</strong> to comply with Indian GST rules.
            </p>
          </div>
        </div>

        {/* Working Capital & Assets */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-semibold text-white">Ledger Receivables & Inventory</h2>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div>
                  <span className="text-xs text-slate-400">Sundry Debtors (Receivables)</span>
                  <p className="text-base font-bold text-amber-300">{formatINR(summary?.totalReceivables)}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Pending Due
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div>
                  <span className="text-xs text-slate-400">Sundry Creditors (Payables)</span>
                  <p className="text-base font-bold text-rose-300">{formatINR(summary?.totalPayables)}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Vendor Bills
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div>
                  <span className="text-xs text-slate-400">Total Receipts Received</span>
                  <p className="text-base font-bold text-emerald-400">{formatINR(summary?.totalReceipts)}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Cash & Bank Inflow
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div>
                  <span className="text-xs text-slate-400">Total Payments Made</span>
                  <p className="text-base font-bold text-rose-400">{formatINR(summary?.totalPaymentsMade)}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Cash & Bank Outflow
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div>
                  <span className="text-xs text-slate-400">Closing Stock Valuation</span>
                  <p className="text-base font-bold text-emerald-300">{formatINR(summary?.totalStockValuation)}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {summary?.inventoryCount || 0} Products
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Real-time Multi-User Activity Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Real-Time Team Synchronization Log</h3>
          </div>
          <span className="text-xs text-slate-400">Cross-device live audit</span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {activityLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No recent activity recorded yet. Invoices, bills, and expenses will stream here in real time.
            </div>
          ) : (
            activityLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <div>
                    <span className="font-semibold text-slate-200">{log.action.replace('_', ' ')}:</span>{' '}
                    <span className="text-slate-400">{log.details || 'Operation completed'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-slate-500">
                  <span className="hidden sm:inline-block font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {log.userEmail.split('@')[0]}
                  </span>
                  <span className="text-[11px]">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Interactive Tenant Setup Checklist Wizard Modal */}
      <TenantSetupWizardModal
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        workspace={workspace || null}
        companyProfile={companyProfile || null}
        onCompleted={(updatedWs, updatedComp) => {
          if (onWorkspaceUpdated) onWorkspaceUpdated(updatedWs);
          if (onCompanyUpdated) onCompanyUpdated(updatedComp);
        }}
      />

      {/* Bulk Data Migration & Tally XML Modal */}
      <BulkDataMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        workspace={workspace || null}
        onMigrationComplete={onRefresh}
      />

      {/* Prorated Upgrades / Downgrades Modal */}
      <ProratedUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        workspace={workspace || null}
        onUpgradeSuccess={(newPlan) => {
          if (workspace && onWorkspaceUpdated) {
            onWorkspaceUpdated({ ...workspace, plan: newPlan, subscriptionStatus: 'active' });
          }
          onRefresh();
        }}
      />
    </div>
  );
};
