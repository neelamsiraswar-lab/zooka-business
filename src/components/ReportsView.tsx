import React, { useState } from 'react';
import { FinancialSummary, Invoice, Expense, Party, CompanyProfile } from '../types';
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
} from 'lucide-react';
import { Gstr2bReportView } from './Gstr2bReportView';
import { ConsolidatedFinancialReportsView } from './ConsolidatedFinancialReportsView';

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
  const [reportType, setReportType] = useState<'pnl' | 'gstr1' | 'gstr2b' | 'gstr3b' | 'balanceSheet' | 'consolidated'>('pnl');

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
      .filter((i) => i.voucherType === 'sales')
      .forEach((i) => {
        csv += `"${i.invoiceNumber}","${i.invoiceDate}","${i.partyName}","${i.partyGstin || ''}","${i.placeOfSupply}",${i.subtotal},${i.cgstTotal},${i.sgstTotal},${i.igstTotal},${i.grandTotal}\n`;
      });
    exportCSV(csv, `GSTR-1-Outward-Supplies-${new Date().toISOString().split('T')[0]}.csv`);
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
          ) : (
            <button
              onClick={handleExportGstr1}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GSTR-1 CSV</span>
            </button>
          )}
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

      {/* 1. TRADING & PROFIT & LOSS VIEW */}
      {reportType === 'pnl' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white text-base">Statement of Profit & Loss (Income Statement)</h3>
              <p className="text-xs text-slate-400">For the period ending today</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-mono">
              Accrual Basis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            {/* Debit Side (Expenses / Cost of Goods) */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Expenditures & Outflows (Dr)
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Cost of Goods Purchased (Purchases):</span>
                <span>{formatINR(summary?.totalPurchases)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Operating Overheads (Salaries, Rent, Utilities):</span>
                <span>{formatINR(summary?.totalExpenses)}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total Costs:</span>
                <span>{formatINR((summary?.totalPurchases || 0) + (summary?.totalExpenses || 0))}</span>
              </div>
            </div>

            {/* Credit Side (Revenue & Inflows) */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Revenue & Inflows (Cr)
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Gross Revenue from Sales:</span>
                <span className="text-emerald-400 font-bold">{formatINR(summary?.totalSales)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Closing Stock Valuation:</span>
                <span>{formatINR(summary?.totalStockValuation)}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total Operating Value:</span>
                <span className="text-emerald-400">
                  {formatINR((summary?.totalSales || 0) + (summary?.totalStockValuation || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Net Margin */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-800/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-300 uppercase tracking-wider font-semibold">
                Net Operating Profit
              </span>
              <p className="text-xs text-slate-400 mt-0.5">Calculated as (Sales - Purchases - Operating Expenses)</p>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatINR(summary?.netProfit)}
            </div>
          </div>
        </div>
      )}

      {/* 2. GSTR-1 REPORT */}
      {reportType === 'gstr1' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">GSTR-1 Outward Supplies Schedule (Sales)</h3>
              <p className="text-xs text-slate-400">Details of sales invoices issued to registered and unregistered persons</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Supply State</th>
                  <th className="p-3 text-right">Taxable Value</th>
                  <th className="p-3 text-right">CGST</th>
                  <th className="p-3 text-right">SGST</th>
                  <th className="p-3 text-right">IGST</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invoices
                  .filter((i) => i.voucherType === 'sales')
                  .map((i) => (
                    <tr key={i.id} className="hover:bg-slate-800/30 font-mono">
                      <td className="p-3 text-white font-semibold">{i.invoiceNumber}</td>
                      <td className="p-3 font-sans text-slate-400">{i.invoiceDate}</td>
                      <td className="p-3 font-sans text-slate-200">{i.partyName}</td>
                      <td className="p-3 text-slate-400">{i.partyGstin || 'B2C / Unreg'}</td>
                      <td className="p-3 font-sans">{i.placeOfSupply}</td>
                      <td className="p-3 text-right">₹{parseFloat(i.subtotal).toFixed(2)}</td>
                      <td className="p-3 text-right">₹{parseFloat(i.cgstTotal).toFixed(2)}</td>
                      <td className="p-3 text-right">₹{parseFloat(i.sgstTotal).toFixed(2)}</td>
                      <td className="p-3 text-right">₹{parseFloat(i.igstTotal).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-white">₹{parseFloat(i.grandTotal).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. GSTR-2B AUTO-DRAFTED ITC REPORT */}
      {reportType === 'gstr2b' && (
        <div id="gstr2b-section">
          <Gstr2bReportView
            summary={summary}
            invoices={invoices}
            expenses={expenses}
            parties={parties}
            company={company}
          />
        </div>
      )}

      {/* 4. GSTR-3B REPORT */}
      {reportType === 'gstr3b' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white text-base">GSTR-3B Monthly Return Summary</h3>
              <p className="text-xs text-slate-400">Self-assessed summary of outward supplies, input tax credit, and tax dues</p>
            </div>
            <button
              onClick={() => setReportType('gstr2b')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer font-sans"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify with GSTR-2B Statement</span>
            </button>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-sans font-bold text-slate-200 text-sm">
                Table 3.1: Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                <span>(a) Outward taxable supplies (other than zero rated, nil rated and exempted):</span>
                <span className="font-bold text-white font-mono">{formatINR(summary?.totalSales)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Total Output Tax Liability (CGST + SGST + IGST):</span>
                <span className="font-bold text-purple-400 font-mono">{formatINR(summary?.totalTaxCollected)}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-sans font-bold text-slate-200 text-sm">
                  Table 4: Eligible Input Tax Credit (ITC)
                </div>
                <span className="text-[11px] font-sans px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Auto-Drafted from GSTR-2B Table 4(A)(5)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                <span>(A) ITC Available (whether in full or part) - All other ITC (Purchases & Overheads):</span>
                <span className="font-bold text-teal-400 font-mono">{formatINR(summary?.totalTaxPaidOnExpenses)}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-sans font-bold text-slate-200 text-sm">
                Table 6.1: Payment of Tax (Net Tax Payable in Cash)
              </div>
              <div className="flex justify-between py-1 text-slate-200 font-bold text-sm">
                <span>Net Tax to be paid through Electronic Cash Ledger:</span>
                <span className="text-emerald-400 font-mono">{formatINR(summary?.netGstPayable)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. BALANCE SHEET REPORT */}
      {reportType === 'balanceSheet' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base">Statement of Financial Position (Balance Sheet)</h3>
            <p className="text-xs text-slate-400">Assets vs Liabilities & Capital overview</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            {/* Assets */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Assets (Current & Non-Current)
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Sundry Debtors (Customer Receivables):</span>
                <span className="text-amber-300 font-bold">{formatINR(summary?.totalReceivables)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Closing Stock / Inventory Asset:</span>
                <span>{formatINR(summary?.totalStockValuation)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Input Tax Credit (ITC Asset):</span>
                <span>{formatINR(summary?.totalTaxPaidOnExpenses)}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-bold text-emerald-400">
                <span>Total Assets:</span>
                <span>
                  {formatINR(
                    (summary?.totalReceivables || 0) +
                      (summary?.totalStockValuation || 0) +
                      (summary?.totalTaxPaidOnExpenses || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Liabilities */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Liabilities & Net Capital
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Sundry Creditors (Vendor Payables):</span>
                <span className="text-rose-400 font-bold">{formatINR(summary?.totalPayables)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Output GST Payable:</span>
                <span>{formatINR(summary?.totalTaxCollected)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Retained Earnings / Current Period Profit:</span>
                <span className="text-teal-300 font-bold">{formatINR(summary?.netProfit)}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total Liabilities & Equity:</span>
                <span>
                  {formatINR(
                    (summary?.totalPayables || 0) +
                      (summary?.totalTaxCollected || 0) +
                      (summary?.netProfit || 0)
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
