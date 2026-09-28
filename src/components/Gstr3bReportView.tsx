import React, { useState, useMemo } from 'react';
import { Invoice, Expense, Party, CompanyProfile } from '../types';
import {
  generateGstr3bReport,
  Gstr3bReportData,
  Gstr3bInwardSummary,
} from '../utils/gstTaxEngine';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Search,
  FileCheck,
  TrendingUp,
  Percent,
  Copy,
  Check,
  Globe2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  FileText,
  Calculator,
  ArrowDownRight,
  Wallet,
  Coins,
  Scale,
} from 'lucide-react';
import { GstrPreviousMonthComparisonView } from './GstrPreviousMonthComparisonView';

interface Gstr3bReportViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  parties?: Party[];
  company?: CompanyProfile | null;
  onNavigateToGstr2b?: () => void;
}

export const Gstr3bReportView: React.FC<Gstr3bReportViewProps> = ({
  invoices,
  expenses,
  parties = [],
  company,
  onNavigateToGstr2b,
}) => {
  const [activeTab, setActiveTab] = useState<'offset' | 'table31' | 'table32' | 'table4' | 'inward' | 'comparison'>('offset');
  const [periodPreset, setPeriodPreset] = useState<'all' | 'this_month' | 'prev_month' | 'q2' | 'fy'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Derive date bounds from periodPreset
  const periodFilter = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (periodPreset === 'this_month') {
      const start = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const end = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return { startDate: start, endDate: end, label: `${monthNames[currentMonth]} ${currentYear}` };
    }

    if (periodPreset === 'prev_month') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const start = new Date(prevYear, prevMonth, 1).toISOString().split('T')[0];
      const end = new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return { startDate: start, endDate: end, label: `${monthNames[prevMonth]} ${prevYear}` };
    }

    if (periodPreset === 'q2') {
      return {
        startDate: `${currentYear}-07-01`,
        endDate: `${currentYear}-09-30`,
        label: `Q2 (Jul - Sep ${currentYear})`,
      };
    }

    if (periodPreset === 'fy') {
      return {
        startDate: `${currentYear}-04-01`,
        endDate: `${currentYear + 1}-03-31`,
        label: `FY ${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
      };
    }

    return { label: 'All Transactions' };
  }, [periodPreset]);

  // Generate Report
  const reportData: Gstr3bReportData = useMemo(() => {
    return generateGstr3bReport(invoices, expenses, parties, company, periodFilter);
  }, [invoices, expenses, parties, company, periodFilter]);

  // Filtered Inward records
  const filteredInward = useMemo(() => {
    if (!searchTerm.trim()) return reportData.inwardSupplies;
    const q = searchTerm.toLowerCase();
    return reportData.inwardSupplies.filter(
      (r) =>
        r.supplierName.toLowerCase().includes(q) ||
        (r.supplierGstin && r.supplierGstin.toLowerCase().includes(q)) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.placeOfSupply.includes(q)
    );
  }, [reportData.inwardSupplies, searchTerm]);

  // Export CSV
  const handleExportCsv = () => {
    let csv = `GSTR-3B MONTHLY RETURN SUMMARY\n`;
    csv += `Filing Period: ${reportData.periodLabel}\n`;
    csv += `GSTIN: ${reportData.companyGstin}\n`;
    csv += `State Code: ${reportData.companyStateCode} (${reportData.companyStateName})\n\n`;

    csv += `TABLE 3.1: DETAILS OF OUTWARD SUPPLIES\n`;
    csv += `Nature of Supplies,Total Taxable Value,Integrated Tax (IGST),Central Tax (CGST),State/UT Tax (SGST),Cess\n`;
    csv += `"(a) Outward Taxable Supplies (Normal)",${reportData.table31.taxable.taxableValue.toFixed(2)},${reportData.table31.taxable.igst.toFixed(2)},${reportData.table31.taxable.cgst.toFixed(2)},${reportData.table31.taxable.sgst.toFixed(2)},0.00\n`;
    csv += `"(b) Outward Taxable Supplies (Zero Rated)",${reportData.table31.zeroRated.taxableValue.toFixed(2)},${reportData.table31.zeroRated.igst.toFixed(2)},0.00,0.00,0.00\n`;
    csv += `"(c) Other Outward Supplies (Nil/Exempt)",${reportData.table31.nilExempt.taxableValue.toFixed(2)},0.00,0.00,0.00,0.00\n`;
    csv += `"(d) Inward Supplies (Reverse Charge)",${reportData.table31.rcm.taxableValue.toFixed(2)},0.00,0.00,0.00,0.00\n`;
    csv += `"Total Output Tax Liability",,${reportData.table31.totalLiability.igst.toFixed(2)},${reportData.table31.totalLiability.cgst.toFixed(2)},${reportData.table31.totalLiability.sgst.toFixed(2)},0.00\n\n`;

    csv += `TABLE 4: ELIGIBLE INPUT TAX CREDIT (ITC)\n`;
    csv += `Details,Integrated Tax (IGST),Central Tax (CGST),State/UT Tax (SGST),Cess\n`;
    csv += `"(A)(5) All Other ITC (Purchases & Expenses)",${reportData.table4.allOtherItc.igst.toFixed(2)},${reportData.table4.allOtherItc.cgst.toFixed(2)},${reportData.table4.allOtherItc.sgst.toFixed(2)},0.00\n`;
    csv += `"(B) Ineligible ITC (Section 17(5))",${reportData.table4.ineligibleItc.igst.toFixed(2)},${reportData.table4.ineligibleItc.cgst.toFixed(2)},${reportData.table4.ineligibleItc.sgst.toFixed(2)},0.00\n`;
    csv += `"(C) Net ITC Available",${reportData.table4.netItcAvailable.igst.toFixed(2)},${reportData.table4.netItcAvailable.cgst.toFixed(2)},${reportData.table4.netItcAvailable.sgst.toFixed(2)},0.00\n\n`;

    csv += `TABLE 6.1: PAYMENT OF TAX (NET TAX PAYABLE IN CASH)\n`;
    csv += `Tax Head,Total Liability,Paid via IGST Credit,Paid via CGST Credit,Paid via SGST Credit,Net Cash Payable (Ledger)\n`;
    csv += `"Integrated Tax (IGST)",${reportData.table61.liability.igst.toFixed(2)},${reportData.table61.paidByItc.igstPaidByIgstItc.toFixed(2)},${reportData.table61.paidByItc.igstPaidByCgstItc.toFixed(2)},${reportData.table61.paidByItc.igstPaidBySgstItc.toFixed(2)},${reportData.table61.cashPayable.igst.toFixed(2)}\n`;
    csv += `"Central Tax (CGST)",${reportData.table61.liability.cgst.toFixed(2)},${reportData.table61.paidByItc.cgstPaidByIgstItc.toFixed(2)},${reportData.table61.paidByItc.cgstPaidByCgstItc.toFixed(2)},0.00,${reportData.table61.cashPayable.cgst.toFixed(2)}\n`;
    csv += `"State Tax (SGST)",${reportData.table61.liability.sgst.toFixed(2)},${reportData.table61.paidByItc.sgstPaidByIgstItc.toFixed(2)},0.00,${reportData.table61.paidByItc.sgstPaidBySgstItc.toFixed(2)},${reportData.table61.cashPayable.sgst.toFixed(2)}\n`;
    csv += `"Total Cash to Pay",,,,,${reportData.table61.cashPayable.total.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `GSTR-3B_${reportData.companyGstin}_${reportData.periodLabel.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON (GST Portal format)
  const handleExportJson = () => {
    const portalJson = {
      gstin: reportData.companyGstin,
      ret_period: periodFilter.startDate ? periodFilter.startDate.slice(5, 7) + periodFilter.startDate.slice(0, 4) : '092026',
      filing_typ: 'GSTR3B',
      sup_details: {
        osup_det: {
          txval: reportData.table31.taxable.taxableValue,
          iamt: reportData.table31.taxable.igst,
          camt: reportData.table31.taxable.cgst,
          samt: reportData.table31.taxable.sgst,
          csamt: 0,
        },
        osup_zero: {
          txval: reportData.table31.zeroRated.taxableValue,
          iamt: reportData.table31.zeroRated.igst,
          csamt: 0,
        },
        osup_nil_exmp: {
          txval: reportData.table31.nilExempt.taxableValue,
        },
        isup_rev: {
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        },
        osup_nongst: {
          txval: 0,
        },
      },
      inter_sup: {
        unreg_details: reportData.table32.map((s) => ({
          pos: s.posCode,
          txval: s.taxableValue,
          iamt: s.igst,
        })),
      },
      itc_elg: {
        itc_avl: [
          {
            ty: 'OTH',
            iamt: reportData.table4.allOtherItc.igst,
            camt: reportData.table4.allOtherItc.cgst,
            samt: reportData.table4.allOtherItc.sgst,
            csamt: 0,
          },
        ],
        itc_rev: [
          {
            ty: 'OTH',
            iamt: reportData.table4.ineligibleItc.igst,
            camt: reportData.table4.ineligibleItc.cgst,
            samt: reportData.table4.ineligibleItc.sgst,
            csamt: 0,
          },
        ],
        itc_net: {
          iamt: reportData.table4.netItcAvailable.igst,
          camt: reportData.table4.netItcAvailable.cgst,
          samt: reportData.table4.netItcAvailable.sgst,
          csamt: 0,
        },
      },
      tax_pmt: {
        trans: [
          {
            liab_id: 1,
            tran_desc: 'Integrated Tax',
            tx_py: reportData.table61.liability.igst,
            iamt: reportData.table61.paidByItc.igstPaidByIgstItc,
            camt: reportData.table61.paidByItc.igstPaidByCgstItc,
            samt: reportData.table61.paidByItc.igstPaidBySgstItc,
            csamt: 0,
            paid_cash: reportData.table61.cashPayable.igst,
          },
          {
            liab_id: 2,
            tran_desc: 'Central Tax',
            tx_py: reportData.table61.liability.cgst,
            iamt: reportData.table61.paidByItc.cgstPaidByIgstItc,
            camt: reportData.table61.paidByItc.cgstPaidByCgstItc,
            samt: 0,
            csamt: 0,
            paid_cash: reportData.table61.cashPayable.cgst,
          },
          {
            liab_id: 3,
            tran_desc: 'State/UT Tax',
            tx_py: reportData.table61.liability.sgst,
            iamt: reportData.table61.paidByItc.sgstPaidByIgstItc,
            camt: 0,
            samt: reportData.table61.paidByItc.sgstPaidBySgstItc,
            csamt: 0,
            paid_cash: reportData.table61.cashPayable.sgst,
          },
        ],
      },
    };

    const blob = new Blob([JSON.stringify(portalJson, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `GSTR3B_${reportData.companyGstin}_${portalJson.ret_period}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    const text = `GSTR-3B MONTHLY RETURN SUMMARY & PAYMENT OF TAX
Period: ${reportData.periodLabel}
GSTIN: ${reportData.companyGstin} (Origin State: ${reportData.companyStateCode} - ${reportData.companyStateName})
-----------------------------------------
1. OUTPUT TAX LIABILITIES:
• Integrated Tax (IGST): ${formatINR(reportData.table61.liability.igst)}
• Central Tax (CGST):   ${formatINR(reportData.table61.liability.cgst)}
• State Tax (SGST):     ${formatINR(reportData.table61.liability.sgst)}
TOTAL OUTPUT LIABILITY: ${formatINR(reportData.table61.liability.total)}
-----------------------------------------
2. INPUT TAX CREDIT (ITC CLAIMED):
• IGST ITC (Purchases/Expenses): ${formatINR(reportData.table4.netItcAvailable.igst)}
• CGST ITC (Purchases/Expenses): ${formatINR(reportData.table4.netItcAvailable.cgst)}
• SGST ITC (Purchases/Expenses): ${formatINR(reportData.table4.netItcAvailable.sgst)}
TOTAL NET ITC: ${formatINR(reportData.table4.netItcAvailable.total)}
-----------------------------------------
3. SET-OFF & PAYMENT THROUGH ELECTRONIC CASH LEDGER:
• Total Paid via ITC: ${formatINR(reportData.table61.paidByItc.totalPaidByItc)}
• NET CASH PAYABLE (CHALLAN): ${formatINR(reportData.table61.cashPayable.total)}
  - Cash IGST: ${formatINR(reportData.table61.cashPayable.igst)}
  - Cash CGST: ${formatINR(reportData.table61.cashPayable.cgst)}
  - Cash SGST: ${formatINR(reportData.table61.cashPayable.sgst)}
• Closing ITC Carried Forward: ${formatINR(reportData.table61.closingItcBalance.total)}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">GSTR-3B Summary Return & Tax Liability Engine</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold font-mono">
                  Rule 88A Set-off
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregates outward sales and inward purchases/expenses to calculate total tax liabilities, input tax credits, and exact net cash challans.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setPeriodPreset('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setPeriodPreset('this_month')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'this_month' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setPeriodPreset('prev_month')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'prev_month' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Prev Month
              </button>
              <button
                onClick={() => setPeriodPreset('q2')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'q2' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Q2 Return
              </button>
              <button
                onClick={() => setPeriodPreset('fy')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  periodPreset === 'fy' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full FY
              </button>
            </div>

            {/* Actions */}
            <button
              onClick={handleExportJson}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition cursor-pointer"
              title="Official GST Portal offline tool JSON format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Portal JSON</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleCopySummary}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Copy Summary to Clipboard"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Company GST Status Context Line */}
        <div className="flex flex-wrap items-center justify-between text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 gap-3">
          <div className="flex flex-wrap items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Entity:</span>
              <span className="font-semibold text-white">{company?.tradeName || company?.businessName || 'Business Entity'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">GSTIN:</span>
              <span className="font-mono font-semibold text-purple-400">{reportData.companyGstin}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Origin State:</span>
              <span className="font-semibold text-white">
                {reportData.companyStateName} ({reportData.companyStateCode})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Tax Period:</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-200 font-semibold font-mono text-[11px]">
              {reportData.periodLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Top 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Output Tax Liability */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Output Tax Liability</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
              Table 3.1
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {formatINR(reportData.table61.liability.total)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>IGST: {formatINR(reportData.table61.liability.igst)}</span>
            <span>CGST+SGST: {formatINR(reportData.table61.liability.cgst + reportData.table61.liability.sgst)}</span>
          </div>
        </div>

        {/* 2. Eligible Input Tax Credit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Eligible ITC Claimed</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
              Table 4(C)
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-teal-400">
            {formatINR(reportData.table4.netItcAvailable.total)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>IGST: {formatINR(reportData.table4.netItcAvailable.igst)}</span>
            <span>CGST+SGST: {formatINR(reportData.table4.netItcAvailable.cgst + reportData.table4.netItcAvailable.sgst)}</span>
          </div>
        </div>

        {/* 3. Net Tax Payable in Cash */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Cash Tax to Pay</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
              Challan PMT-06
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {formatINR(reportData.table61.cashPayable.total)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Cash Ledger Payment Required</span>
          </div>
        </div>

        {/* 4. Carried Forward Credit Balance */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Credit Ledger Balance</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              Carry Forward
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatINR(reportData.table61.closingItcBalance.total)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Available for Next Month</span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('offset')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'offset'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-md shadow-purple-500/25'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Payment of Tax & Offset Matrix (Table 6.1)</span>
        </button>

        <button
          onClick={() => setActiveTab('table31')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'table31'
              ? 'bg-purple-500 text-white font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Table 3.1: Outward Supplies & Reverse Charge</span>
        </button>

        <button
          onClick={() => setActiveTab('table32')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'table32'
              ? 'bg-purple-500 text-white font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>Table 3.2: Inter-State B2C (POS)</span>
        </button>

        <button
          onClick={() => setActiveTab('table4')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'table4'
              ? 'bg-purple-500 text-white font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Table 4: Eligible Input Tax Credit (ITC)</span>
        </button>

        <button
          onClick={() => setActiveTab('inward')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'inward'
              ? 'bg-purple-500 text-white font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Inward Purchases & Expenses Ledger ({reportData.inwardSupplies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'comparison'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md shadow-emerald-500/25'
              : 'text-emerald-400 hover:text-emerald-300 bg-slate-900 border border-emerald-500/30'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>MoM Comparison (Previous Month)</span>
        </button>
      </div>

      {/* TAB 1: TABLE 6.1 TAX OFFSET ENGINE & CASH CHALLAN */}
      {activeTab === 'offset' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-400" />
                Table 6.1: Payment of Tax & Electronic Ledger Utilization Matrix
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact statutory set-off hierarchy governed by Section 49, 49A, 49B of the CGST Act & Rule 88A.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Total Cash to Pay</span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {formatINR(reportData.table61.cashPayable.total)}
              </span>
            </div>
          </div>

          {/* Master Set-off Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3.5">Tax Head (Liability)</th>
                  <th className="p-3.5 text-right">Total Liability (₹)</th>
                  <th className="p-3.5 text-right text-purple-300">Paid by IGST Credit</th>
                  <th className="p-3.5 text-right text-blue-300">Paid by CGST Credit</th>
                  <th className="p-3.5 text-right text-teal-300">Paid by SGST Credit</th>
                  <th className="p-3.5 text-right text-slate-400">Total Credit Used</th>
                  <th className="p-3.5 text-right text-amber-400 font-bold">Net Cash Payable (Ledger)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {/* IGST Row */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Integrated Tax (IGST)</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-purple-400">
                    ₹{reportData.table61.liability.igst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-purple-300">
                    ₹{reportData.table61.paidByItc.igstPaidByIgstItc.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-blue-300">
                    {reportData.table61.paidByItc.igstPaidByCgstItc > 0
                      ? `₹${reportData.table61.paidByItc.igstPaidByCgstItc.toFixed(2)}`
                      : '₹0.00'}
                  </td>
                  <td className="p-3.5 text-right text-teal-300">
                    {reportData.table61.paidByItc.igstPaidBySgstItc > 0
                      ? `₹${reportData.table61.paidByItc.igstPaidBySgstItc.toFixed(2)}`
                      : '₹0.00'}
                  </td>
                  <td className="p-3.5 text-right text-slate-300">
                    ₹
                    {(
                      reportData.table61.paidByItc.igstPaidByIgstItc +
                      reportData.table61.paidByItc.igstPaidByCgstItc +
                      reportData.table61.paidByItc.igstPaidBySgstItc
                    ).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-bold text-amber-400">
                    ₹{reportData.table61.cashPayable.igst.toFixed(2)}
                  </td>
                </tr>

                {/* CGST Row */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Central Tax (CGST)</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-blue-400">
                    ₹{reportData.table61.liability.cgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-purple-300">
                    {reportData.table61.paidByItc.cgstPaidByIgstItc > 0
                      ? `₹${reportData.table61.paidByItc.cgstPaidByIgstItc.toFixed(2)}`
                      : '₹0.00'}
                  </td>
                  <td className="p-3.5 text-right text-blue-300">
                    ₹{reportData.table61.paidByItc.cgstPaidByCgstItc.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-slate-500 italic">Not Permitted</td>
                  <td className="p-3.5 text-right text-slate-300">
                    ₹
                    {(
                      reportData.table61.paidByItc.cgstPaidByIgstItc +
                      reportData.table61.paidByItc.cgstPaidByCgstItc
                    ).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-bold text-amber-400">
                    ₹{reportData.table61.cashPayable.cgst.toFixed(2)}
                  </td>
                </tr>

                {/* SGST Row */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span>State/UT Tax (SGST)</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-teal-400">
                    ₹{reportData.table61.liability.sgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-purple-300">
                    {reportData.table61.paidByItc.sgstPaidByIgstItc > 0
                      ? `₹${reportData.table61.paidByItc.sgstPaidByIgstItc.toFixed(2)}`
                      : '₹0.00'}
                  </td>
                  <td className="p-3.5 text-right text-slate-500 italic">Not Permitted</td>
                  <td className="p-3.5 text-right text-teal-300">
                    ₹{reportData.table61.paidByItc.sgstPaidBySgstItc.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-slate-300">
                    ₹
                    {(
                      reportData.table61.paidByItc.sgstPaidByIgstItc +
                      reportData.table61.paidByItc.sgstPaidBySgstItc
                    ).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-bold text-amber-400">
                    ₹{reportData.table61.cashPayable.sgst.toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-950 font-mono font-bold text-xs text-white border-t-2 border-slate-800">
                <tr>
                  <td className="p-3.5 font-sans uppercase tracking-wider text-slate-300">Grand Total</td>
                  <td className="p-3.5 text-right text-white">₹{reportData.table61.liability.total.toFixed(2)}</td>
                  <td colSpan={3} className="p-3.5 text-center font-sans font-normal text-slate-400">
                    Total Input Tax Credit Utilized:
                  </td>
                  <td className="p-3.5 text-right text-emerald-400">
                    ₹{reportData.table61.paidByItc.totalPaidByItc.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-amber-400 text-sm">
                    ₹{reportData.table61.cashPayable.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Electronic Credit Ledger Closing Balances */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block">Closing IGST Credit Balance</span>
              <div className="text-base font-bold font-mono text-purple-400">
                {formatINR(reportData.table61.closingItcBalance.igst)}
              </div>
              <span className="text-[10px] text-slate-500 block">Available for future IGST/CGST/SGST</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block">Closing CGST Credit Balance</span>
              <div className="text-base font-bold font-mono text-blue-400">
                {formatINR(reportData.table61.closingItcBalance.cgst)}
              </div>
              <span className="text-[10px] text-slate-500 block">Carried forward in Electronic Credit Ledger</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-400 block">Closing SGST Credit Balance</span>
              <div className="text-base font-bold font-mono text-teal-400">
                {formatINR(reportData.table61.closingItcBalance.sgst)}
              </div>
              <span className="text-[10px] text-slate-500 block">Carried forward for state liabilities</span>
            </div>
          </div>

          {/* Statutory Explanatory Note on Rule 88A */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Statutory Rule 88A & Section 49 Order of Utilization</span>
            </div>
            <p>
              1. <strong>Integrated Tax (IGST) credit</strong> must be completely exhausted first against IGST liability, and any remaining balance is utilized against Central Tax (CGST) and State Tax (SGST) liabilities in any order and in such proportion as the taxpayer desires.
            </p>
            <p>
              2. <strong>Central Tax (CGST) credit</strong> is utilized against CGST liability first, and then against IGST liability. Cross-utilization of CGST credit against SGST liability is strictly prohibited.
            </p>
            <p>
              3. <strong>State Tax (SGST) credit</strong> is utilized against SGST liability first, and then against IGST liability. Cross-utilization of SGST credit against CGST liability is strictly prohibited.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: TABLE 3.1 OUTWARD SUPPLIES */}
      {activeTab === 'table31' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-white text-base">
                Table 3.1: Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
              </h4>
              <p className="text-xs text-slate-400">
                Aggregate values of all taxable, zero-rated, and exempted supplies made during the period.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3.5">Nature of Supplies</th>
                  <th className="p-3.5 text-right">Total Taxable Value (₹)</th>
                  <th className="p-3.5 text-right text-purple-400">Integrated Tax (IGST)</th>
                  <th className="p-3.5 text-right text-blue-400">Central Tax (CGST)</th>
                  <th className="p-3.5 text-right text-teal-400">State/UT Tax (SGST)</th>
                  <th className="p-3.5 text-right text-slate-400">Cess (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {/* 3.1(a) */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-slate-200">
                    <div className="font-semibold text-white">
                      (a) Outward Taxable Supplies (other than zero rated, nil rated and exempted)
                    </div>
                    <span className="text-[10px] text-slate-400">Standard domestic sales (B2B, B2CL, B2CS)</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-200">
                    ₹{reportData.table31.taxable.taxableValue.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-purple-400">
                    ₹{reportData.table31.taxable.igst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-blue-400">
                    ₹{reportData.table31.taxable.cgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-teal-400">
                    ₹{reportData.table31.taxable.sgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-slate-500">0.00</td>
                </tr>

                {/* 3.1(b) */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-slate-200">
                    <div className="font-semibold text-white">(b) Outward Taxable Supplies (zero rated)</div>
                    <span className="text-[10px] text-slate-400">Exports of goods/services & supplies to SEZ</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-200">
                    ₹{reportData.table31.zeroRated.taxableValue.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-purple-400">
                    ₹{reportData.table31.zeroRated.igst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">0.00</td>
                </tr>

                {/* 3.1(c) */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-slate-200">
                    <div className="font-semibold text-white">
                      (c) Other Outward Supplies (nil rated, exempted)
                    </div>
                    <span className="text-[10px] text-slate-400">Bill of supply & non-taxable products</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-200">
                    ₹{reportData.table31.nilExempt.taxableValue.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                </tr>

                {/* 3.1(d) */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-slate-200">
                    <div className="font-semibold text-white">
                      (d) Inward Supplies Liable to Reverse Charge (RCM)
                    </div>
                    <span className="text-[10px] text-slate-400">GTA, legal services, security, director fees</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-200">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">0.00</td>
                </tr>

                {/* 3.1(e) */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-slate-200">
                    <div className="font-semibold text-white">(e) Non-GST Outward Supplies</div>
                    <span className="text-[10px] text-slate-400">Petroleum products, alcohol, outside GST scope</span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-200">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-950 font-mono font-bold text-xs text-white border-t border-slate-800">
                <tr>
                  <td className="p-3.5 font-sans uppercase tracking-wider text-slate-400">Total Output Tax Liability</td>
                  <td className="p-3.5 text-right">
                    ₹
                    {(
                      reportData.table31.taxable.taxableValue +
                      reportData.table31.zeroRated.taxableValue +
                      reportData.table31.nilExempt.taxableValue
                    ).toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-purple-400">
                    ₹{reportData.table31.totalLiability.igst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-blue-400">
                    ₹{reportData.table31.totalLiability.cgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-teal-400">
                    ₹{reportData.table31.totalLiability.sgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-slate-500">0.00</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TABLE 3.2 INTER-STATE B2C POS */}
      {activeTab === 'table32' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-base">
                Table 3.2: Inter-State Supplies to Unregistered Persons, Composition & UIN
              </h4>
              <p className="text-xs text-slate-400">
                Subset of Table 3.1(a) showing Place of Supply (POS) breakdown for interstate B2C sales liable to IGST.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
              {reportData.table32.length} Target States
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3.5">Place of Supply (State / UT)</th>
                  <th className="p-3.5 text-center">State Code</th>
                  <th className="p-3.5 text-right">Total Taxable Value (₹)</th>
                  <th className="p-3.5 text-right text-purple-400 font-bold">Amount of Integrated Tax IGST (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {reportData.table32.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-sans">
                      No interstate supplies made to unregistered consumers in this period.
                    </td>
                  </tr>
                ) : (
                  reportData.table32.map((s) => (
                    <tr key={s.posCode} className="hover:bg-slate-800/30">
                      <td className="p-3.5 font-sans font-medium text-white">{s.posName}</td>
                      <td className="p-3.5 text-center font-bold text-purple-400">{s.posCode}</td>
                      <td className="p-3.5 text-right">₹{s.taxableValue.toFixed(2)}</td>
                      <td className="p-3.5 text-right text-purple-400 font-bold">₹{s.igst.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {reportData.table32.length > 0 && (
                <tfoot className="bg-slate-950 font-mono font-bold text-xs text-white border-t border-slate-800">
                  <tr>
                    <td colSpan={2} className="p-3.5 text-right font-sans uppercase tracking-wider text-slate-400">
                      Total Inter-State B2C:
                    </td>
                    <td className="p-3.5 text-right">
                      ₹{reportData.table32.reduce((a, b) => a + b.taxableValue, 0).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right text-purple-400">
                      ₹{reportData.table32.reduce((a, b) => a + b.igst, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TABLE 4 ELIGIBLE ITC */}
      {activeTab === 'table4' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-base">Table 4: Eligible Input Tax Credit (ITC)</h4>
              <p className="text-xs text-slate-400">
                Detailed schedule of tax credits claimable on purchases and business expenses, separating IGST, CGST, and SGST.
              </p>
            </div>
            {onNavigateToGstr2b && (
              <button
                onClick={onNavigateToGstr2b}
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer font-sans"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Reconcile with GSTR-2B Statement</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3.5">Details of Input Tax Credit</th>
                  <th className="p-3.5 text-right text-purple-400">Integrated Tax (IGST)</th>
                  <th className="p-3.5 text-right text-blue-400">Central Tax (CGST)</th>
                  <th className="p-3.5 text-right text-teal-400">State/UT Tax (SGST)</th>
                  <th className="p-3.5 text-right text-emerald-400 font-bold">Total ITC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {/* 4(A)(1) */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-slate-300">
                    <span className="font-semibold text-white">(A)(1) Import of Goods</span>
                  </td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                </tr>

                {/* 4(A)(2) */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-slate-300">
                    <span className="font-semibold text-white">(A)(2) Import of Services</span>
                  </td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">—</td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                </tr>

                {/* 4(A)(3) */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-slate-300">
                    <span className="font-semibold text-white">(A)(3) Inward supplies liable to reverse charge</span>
                  </td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                  <td className="p-3.5 text-right text-slate-500">₹0.00</td>
                </tr>

                {/* 4(A)(5) ALL OTHER ITC */}
                <tr className="bg-emerald-950/20 hover:bg-emerald-950/30">
                  <td className="p-3.5 font-sans text-white">
                    <div className="font-bold text-emerald-300">(A)(5) All Other ITC (Purchases & Expenses)</div>
                    <span className="text-[10px] text-slate-400">
                      Standard inward bills from registered vendors matching GSTR-2B
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-bold text-purple-400">
                    ₹{reportData.table4.allOtherItc.igst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-bold text-blue-400">
                    ₹{reportData.table4.allOtherItc.cgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-bold text-teal-400">
                    ₹{reportData.table4.allOtherItc.sgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right font-bold text-emerald-400">
                    ₹{reportData.table4.allOtherItc.total.toFixed(2)}
                  </td>
                </tr>

                {/* 4(B) INELIGIBLE ITC */}
                <tr className="hover:bg-slate-800/30">
                  <td className="p-3.5 font-sans text-rose-300">
                    <div className="font-semibold">(B) ITC Reversed / Ineligible under Section 17(5)</div>
                    <span className="text-[10px] text-slate-400">Blocked credits, personal expenses & unregistered purchases</span>
                  </td>
                  <td className="p-3.5 text-right text-rose-400">
                    ₹{reportData.table4.ineligibleItc.igst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-rose-400">
                    ₹{reportData.table4.ineligibleItc.cgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-rose-400">
                    ₹{reportData.table4.ineligibleItc.sgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-rose-400">
                    ₹{reportData.table4.ineligibleItc.total.toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-950 font-mono font-bold text-xs text-white border-t-2 border-emerald-500/40">
                <tr>
                  <td className="p-3.5 font-sans uppercase tracking-wider text-emerald-300">
                    (C) Net ITC Available (A) - (B)
                  </td>
                  <td className="p-3.5 text-right text-purple-400 text-sm">
                    ₹{reportData.table4.netItcAvailable.igst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-blue-400 text-sm">
                    ₹{reportData.table4.netItcAvailable.cgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-teal-400 text-sm">
                    ₹{reportData.table4.netItcAvailable.sgst.toFixed(2)}
                  </td>
                  <td className="p-3.5 text-right text-emerald-400 text-sm">
                    ₹{reportData.table4.netItcAvailable.total.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: INWARD PURCHASES & EXPENSES LEDGER */}
      {activeTab === 'inward' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-base">Inward Purchase Bills & Business Expenses</h4>
              <p className="text-xs text-slate-400">
                Audit list of inward transactions used to derive GSTR-3B Table 4 Input Tax Credit (ITC).
              </p>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vendor, invoice #, or GSTIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3">Source</th>
                  <th className="p-3">Ref / Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Supplier GSTIN</th>
                  <th className="p-3 text-center">Supply Type</th>
                  <th className="p-3 text-right">Taxable (₹)</th>
                  <th className="p-3 text-right text-purple-400">IGST</th>
                  <th className="p-3 text-right text-blue-400">CGST</th>
                  <th className="p-3 text-right text-teal-400">SGST</th>
                  <th className="p-3 text-center">ITC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {filteredInward.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500 font-sans">
                      No inward purchases or expenses found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredInward.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-sans">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            rec.sourceType === 'purchase'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {rec.sourceType === 'purchase' ? 'Purchase Bill' : 'Expense'}
                        </span>
                      </td>
                      <td className="p-3 text-white font-semibold">{rec.invoiceNumber}</td>
                      <td className="p-3 text-slate-400 font-sans">{rec.date}</td>
                      <td className="p-3 font-sans text-slate-200">{rec.supplierName}</td>
                      <td className="p-3 text-slate-400">
                        {rec.supplierGstin ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                            {rec.supplierGstin}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-sans text-[10px]">Unregistered</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-sans">
                        {rec.isInterstate ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                            Inter-State (IGST)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                            Intra-State (CGST+SGST)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">₹{rec.taxableValue.toFixed(2)}</td>
                      <td className="p-3 text-right text-purple-400">
                        {rec.igst > 0 ? `₹${rec.igst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right text-blue-400">
                        {rec.cgst > 0 ? `₹${rec.cgst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right text-teal-400">
                        {rec.sgst > 0 ? `₹${rec.sgst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-center font-sans">
                        {rec.itcEligible ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Eligible Table 4(A)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>Ineligible Sec 17(5)</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: PREVIOUS MONTH COMPARISON VIEW */}
      {activeTab === 'comparison' && (
        <div className="animate-fade-in">
          <GstrPreviousMonthComparisonView
            invoices={invoices}
            expenses={expenses}
            parties={parties}
            company={company}
            onNavigateToGstr3b={() => setActiveTab('offset')}
          />
        </div>
      )}
    </div>
  );
};
