import React, { useState, useMemo } from 'react';
import { FinancialSummary, Invoice, Expense, Party, CompanyProfile } from '../types';
import {
  getAvailableMonths,
  resolveGstPeriodFilter,
  GstPeriodPreset,
  formatLocalDate,
} from '../utils/datePeriodUtils';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle,
  FileCheck,
  TrendingUp,
  Percent,
  Layers,
  FileText,
  ShieldCheck,
  Building2,
  Sparkles,
  Scale,
  Coins,
  CalendarCheck2,
  Clock,
} from 'lucide-react';
import { Gstr2bReportView } from './Gstr2bReportView';
import { Gstr1ReportView } from './Gstr1ReportView';
import { Gstr3bReportView } from './Gstr3bReportView';
import { GstrPreviousMonthComparisonView } from './GstrPreviousMonthComparisonView';
import { GstrFilingDeadlineTracker } from './GstrFilingDeadlineTracker';
import { ConsolidatedFinancialReportsView } from './ConsolidatedFinancialReportsView';
import { FullScreenButton } from './FullScreenButton';

interface ReportsViewProps {
  summary: FinancialSummary | null;
  invoices: Invoice[];
  expenses: Expense[];
  parties?: Party[];
  company?: CompanyProfile | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  summary,
  invoices,
  expenses,
  parties = [],
  company,
}) => {
  const [reportType, setReportType] = useState<
    'pnl' | 'gstr1' | 'gstr2b' | 'gstr3b' | 'gstrCompare' | 'deadlines' | 'balanceSheet' | 'consolidated'
  >('pnl');
  const [periodPreset, setPeriodPreset] = useState<GstPeriodPreset>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => formatLocalDate(new Date()).slice(0, 7));

  const availableMonths = useMemo(
    () =>
      getAvailableMonths([
        ...invoices.map((i) => i.invoiceDate),
        ...expenses.map((e) => e.date),
      ]),
    [invoices, expenses]
  );

  const periodFilter = useMemo(() => {
    return resolveGstPeriodFilter(periodPreset, selectedMonth);
  }, [periodPreset, selectedMonth]);

  // Period-filtered Financial Summary for Trading & P&L and Balance Sheet Schedule
  const periodSummary = useMemo(() => {
    if (periodPreset === 'all' && summary) {
      return summary;
    }

    const activeInvoices = invoices.filter((inv) => {
      if (inv.status === 'cancelled') return false;
      if (periodFilter.startDate && inv.invoiceDate < periodFilter.startDate) return false;
      if (periodFilter.endDate && inv.invoiceDate > periodFilter.endDate) return false;
      return true;
    });

    const activeExpenses = expenses.filter((exp) => {
      if (periodFilter.startDate && exp.date < periodFilter.startDate) return false;
      if (periodFilter.endDate && exp.date > periodFilter.endDate) return false;
      return true;
    });

    let totalSales = 0;
    let totalPurchases = 0;
    let totalTaxCollected = 0;
    let totalPurchaseItc = 0;
    let totalReceivables = 0;
    let totalPayables = 0;

    activeInvoices.forEach((inv) => {
      const isPurchase = inv.voucherType === 'purchase' || inv.invoiceType === 'purchase_bill';
      const taxable = parseFloat(inv.subtotal) || 0;
      const tax = parseFloat(inv.taxTotal) || 0;
      const grand = parseFloat(inv.grandTotal) || 0;
      const paid = parseFloat(inv.paidAmount) || 0;
      const unpaid = Math.max(0, grand - paid);

      if (isPurchase) {
        totalPurchases += taxable > 0 ? taxable : Math.max(0, grand - tax);
        if (inv.purchaseType !== 'ineligible_17_5') {
          totalPurchaseItc += tax;
        }
        totalPayables += unpaid;
      } else {
        totalSales += taxable > 0 ? taxable : Math.max(0, grand - tax);
        totalTaxCollected += tax;
        totalReceivables += unpaid;
      }
    });

    let totalExpenses = 0;
    let totalExpenseItc = 0;
    activeExpenses.forEach((exp) => {
      const amt = parseFloat(exp.amount) || 0;
      const gst = parseFloat(exp.gstPaid) || 0;
      totalExpenses += exp.itcEligible ? Math.max(0, amt - gst) : amt;
      if (exp.itcEligible) {
        totalExpenseItc += gst;
      }
    });

    const totalTaxPaidOnExpenses = totalPurchaseItc + totalExpenseItc;
    const totalStockValuation = summary?.totalStockValuation || 0;
    const netProfit = totalSales - totalPurchases - totalExpenses;

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      totalReceivables: periodPreset === 'all' ? summary?.totalReceivables || totalReceivables : totalReceivables,
      totalPayables: periodPreset === 'all' ? summary?.totalPayables || totalPayables : totalPayables,
      totalTaxCollected,
      totalTaxPaidOnExpenses,
      netGstLiability: Math.max(0, totalTaxCollected - totalTaxPaidOnExpenses),
      netProfit,
      totalStockValuation,
    };
  }, [periodPreset, periodFilter, invoices, expenses, summary]);

  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const exportCSV = (dataStr: string, fileName: string) => {
    const blob = new Blob([dataStr], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGstr1 = () => {
    let csv = 'Invoice Number,Invoice Date,Party Name,Party GSTIN,Place of Supply,Subtotal,CGST,SGST,IGST,Grand Total\n';
    invoices
      .filter((i) => {
        const isPurchase = i.voucherType === 'purchase' || i.invoiceType === 'purchase_bill';
        if (isPurchase || i.status === 'cancelled') return false;
        if (periodFilter.startDate && i.invoiceDate < periodFilter.startDate) return false;
        if (periodFilter.endDate && i.invoiceDate > periodFilter.endDate) return false;
        return true;
      })
      .forEach((i) => {
        csv += `"${i.invoiceNumber}","${i.invoiceDate}","${i.partyName}","${i.partyGstin || ''}","${i.placeOfSupply}",${i.subtotal},${i.cgstTotal},${i.sgstTotal},${i.igstTotal},${i.grandTotal}\n`;
      });
    exportCSV(csv, `GSTR-1-Outward-Supplies-${periodFilter.label.replace(/\s+/g, '-')}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            Automated Financial & GST Audit Reports
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate one-click Profit & Loss statements, GSTR-1, GSTR-2B Auto-drafted ITC, and GSTR-3B filings compatible with GST portal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {reportType === 'gstr1' ? (
            <button
              onClick={handleExportGstr1}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GSTR-1 CSV</span>
            </button>
          ) : reportType === 'gstr2b' ? (
            <button
              onClick={() => {
                const el = document.getElementById('gstr2b-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>GSTR-2B Active Statement</span>
            </button>
          ) : reportType === 'gstrCompare' ? (
            <button
              onClick={() => setReportType('gstr3b')}
              className="px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Go to GSTR-3B Return</span>
            </button>
          ) : reportType === 'deadlines' ? (
            <button
              onClick={() => setReportType('gstr1')}
              className="px-3.5 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Go to GSTR-1</span>
            </button>
          ) : (
            <button
              onClick={handleExportGstr1}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GSTR-1 CSV</span>
            </button>
          )}
          <FullScreenButton mode="component" showLabel />
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setReportType('pnl')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            reportType === 'pnl'
              ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          Trading & Profit & Loss
        </button>

        <button
          onClick={() => setReportType('deadlines')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            reportType === 'deadlines'
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-amber-400 hover:text-white bg-slate-900 border border-amber-500/30'
          }`}
        >
          <CalendarCheck2 className="w-3.5 h-3.5" />
          <span>Filing Deadlines</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
            Tracker
          </span>
        </button>

        <button
          onClick={() => setReportType('gstr1')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            reportType === 'gstr1'
              ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          GSTR-1 (Outward Supplies)
        </button>

        <button
          onClick={() => setReportType('gstr2b')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            reportType === 'gstr2b'
              ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          GSTR-2B (Auto-Drafted ITC)
        </button>

        <button
          onClick={() => setReportType('gstr3b')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            reportType === 'gstr3b'
              ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          GSTR-3B (Monthly Return)
        </button>

        <button
          onClick={() => setReportType('gstrCompare')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            reportType === 'gstrCompare'
              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
              : 'text-emerald-400 hover:text-white bg-slate-900 border border-emerald-500/30'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>GSTR MoM Comparison</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
            Trends
          </span>
        </button>

        <button
          onClick={() => setReportType('balanceSheet')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
            reportType === 'balanceSheet'
              ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          Balance Sheet Schedule
        </button>

        <button
          onClick={() => setReportType('consolidated')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            reportType === 'consolidated'
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-500/30'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Consolidated Reports (Multi-Entity)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
            SAAS
          </span>
        </button>
      </div>

      {/* GST Filing Deadline Tracker Ambient Spotlight on GSTR Reports */}
      {['gstr1', 'gstr2b', 'gstr3b', 'gstrCompare'].includes(reportType) && (
        <GstrFilingDeadlineTracker
          company={company}
          onNavigateToTab={(tab) => setReportType(tab)}
          defaultExpanded={false}
        />
      )}

      {/* 1. DEDICATED GST FILING DEADLINES & STATUTORY CALENDAR VIEW */}
      {reportType === 'deadlines' && (
        <div className="animate-fade-in space-y-4">
          <GstrFilingDeadlineTracker
            company={company}
            onNavigateToTab={(tab) => setReportType(tab)}
            defaultExpanded={true}
          />
        </div>
      )}

      {/* 2. TRADING & PROFIT & LOSS VIEW */}
      {reportType === 'pnl' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Statement of Profit & Loss (Income Statement)</h3>
              <p className="text-xs text-slate-400">Reporting Period: <span className="text-emerald-400 font-semibold">{periodFilter.label}</span></p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs gap-1">
                <button
                  onClick={() => setPeriodPreset('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    periodPreset === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setPeriodPreset('this_month')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    periodPreset === 'this_month' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setPeriodPreset('prev_month')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    periodPreset === 'prev_month' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Prev Month
                </button>
                <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 ml-1" />
                  <select
                    aria-label="Select Month for P&L"
                    value={periodPreset === 'month' ? selectedMonth : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedMonth(e.target.value);
                        setPeriodPreset('month');
                      }
                    }}
                    className={`px-2 py-1.5 rounded-lg font-semibold transition cursor-pointer bg-slate-900 border text-xs focus:outline-none ${
                      periodPreset === 'month'
                        ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                        : 'border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <option value="" disabled>
                      Month-Wise...
                    </option>
                    {availableMonths.map((m) => (
                      <option key={m.ym} value={m.ym} className="bg-slate-900 text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setPeriodPreset('q2')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    periodPreset === 'q2' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Q2
                </button>
                <button
                  onClick={() => setPeriodPreset('fy')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    periodPreset === 'fy' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Full FY
                </button>
              </div>
              <span className="text-xs px-2.5 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-mono">
                Accrual Basis
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            {/* Debit Side (Expenses / Cost of Goods) */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Expenditures & Outflows (Dr) — {periodFilter.label}
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Cost of Goods Purchased (Purchases):</span>
                <span>{formatINR(periodSummary?.totalPurchases)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Operating Overheads (Salaries, Rent, Utilities):</span>
                <span>{formatINR(periodSummary?.totalExpenses)}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total Costs:</span>
                <span>{formatINR((periodSummary?.totalPurchases || 0) + (periodSummary?.totalExpenses || 0))}</span>
              </div>
            </div>

            {/* Credit Side (Revenue & Inflows) */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Revenue & Inflows (Cr) — {periodFilter.label}
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Gross Revenue from Sales:</span>
                <span className="text-emerald-400 font-bold">{formatINR(periodSummary?.totalSales)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Closing Stock Valuation:</span>
                <span>{formatINR(periodSummary?.totalStockValuation)}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total Operating Value:</span>
                <span className="text-emerald-400">
                  {formatINR((periodSummary?.totalSales || 0) + (periodSummary?.totalStockValuation || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Net Margin */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-800/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-300 uppercase tracking-wider font-semibold">
                Net Operating Profit ({periodFilter.label})
              </span>
              <p className="text-xs text-slate-400 mt-0.5">Calculated as (Sales - Purchases - Operating Expenses)</p>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatINR(periodSummary?.netProfit)}
            </div>
          </div>
        </div>
      )}

      {/* 2. GSTR-1 REPORT GENERATOR */}
      {reportType === 'gstr1' && (
        <div className="animate-fade-in">
          <Gstr1ReportView
            invoices={invoices}
            company={company}
            onNavigateToComparison={() => setReportType('gstrCompare')}
          />
        </div>
      )}

      {/* 3. GSTR-2B AUTO-DRAFTED ITC REPORT */}
      {reportType === 'gstr2b' && (
        <div id="gstr2b-section" className="animate-fade-in">
          <Gstr2bReportView
            summary={summary}
            invoices={invoices}
            expenses={expenses}
            parties={parties}
            company={company}
          />
        </div>
      )}

      {/* 4. GSTR-3B REPORT GENERATOR */}
      {reportType === 'gstr3b' && (
        <div className="animate-fade-in">
          <Gstr3bReportView
            invoices={invoices}
            expenses={expenses}
            parties={parties}
            company={company}
            onNavigateToGstr2b={() => setReportType('gstr2b')}
          />
        </div>
      )}

      {/* 5. GSTR PREVIOUS MONTH COMPARISON VIEW */}
      {reportType === 'gstrCompare' && (
        <div className="animate-fade-in">
          <GstrPreviousMonthComparisonView
            invoices={invoices}
            expenses={expenses}
            parties={parties}
            company={company}
            onNavigateToGstr3b={() => setReportType('gstr3b')}
            onNavigateToGstr1={() => setReportType('gstr1')}
          />
        </div>
      )}

      {/* 6. BALANCE SHEET REPORT */}
      {reportType === 'balanceSheet' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white text-base">Statement of Financial Position (Balance Sheet)</h3>
              <p className="text-xs text-slate-400">Assets vs Liabilities & Capital overview — <span className="text-emerald-400 font-semibold">{periodFilter.label}</span></p>
            </div>
            <div className="flex flex-wrap items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs gap-1">
              <button
                onClick={() => setPeriodPreset('all')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setPeriodPreset('this_month')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'this_month' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setPeriodPreset('prev_month')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'prev_month' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Prev Month
              </button>
              <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 ml-1" />
                <select
                  aria-label="Select Month for Balance Sheet"
                  value={periodPreset === 'month' ? selectedMonth : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedMonth(e.target.value);
                      setPeriodPreset('month');
                    }
                  }}
                  className={`px-2 py-1.5 rounded-lg font-semibold transition cursor-pointer bg-slate-900 border text-xs focus:outline-none ${
                    periodPreset === 'month'
                      ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                      : 'border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <option value="" disabled>
                    Month-Wise...
                  </option>
                  {availableMonths.map((m) => (
                    <option key={m.ym} value={m.ym} className="bg-slate-900 text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setPeriodPreset('fy')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'fy' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full FY
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            {/* Assets */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Assets (Current & Non-Current) — {periodFilter.label}
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Sundry Debtors (Customer Receivables):</span>
                <span className="text-amber-300 font-bold">{formatINR(periodSummary?.totalReceivables)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Closing Stock / Inventory Asset:</span>
                <span>{formatINR(periodSummary?.totalStockValuation)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Input Tax Credit (ITC Asset):</span>
                <span>{formatINR(periodSummary?.totalTaxPaidOnExpenses)}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-bold text-emerald-400">
                <span>Total Assets:</span>
                <span>
                  {formatINR(
                    (periodSummary?.totalReceivables || 0) +
                      (periodSummary?.totalStockValuation || 0) +
                      (periodSummary?.totalTaxPaidOnExpenses || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Liabilities */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Liabilities & Net Capital — {periodFilter.label}
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Sundry Creditors (Vendor Payables):</span>
                <span className="text-rose-400 font-bold">{formatINR(periodSummary?.totalPayables)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Output GST Payable:</span>
                <span>{formatINR(periodSummary?.totalTaxCollected)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Retained Earnings / Period Profit:</span>
                <span className="text-teal-300 font-bold">{formatINR(periodSummary?.netProfit)}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total Liabilities & Equity:</span>
                <span>
                  {formatINR(
                    (periodSummary?.totalPayables || 0) +
                      (periodSummary?.totalTaxCollected || 0) +
                      (periodSummary?.netProfit || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONSOLIDATED FINANCIAL REPORTS (MULTI-ENTITY / MULTI-TENANT) */}
      {reportType === 'consolidated' && (
        <div className="animate-fade-in">
          <ConsolidatedFinancialReportsView />
        </div>
      )}
    </div>
  );
};
