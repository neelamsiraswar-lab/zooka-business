import React, { useState, useMemo } from 'react';
import { Invoice, CompanyProfile } from '../types';
import {
  generateGstr1Report,
  Gstr1ReportData,
  Gstr1InvoiceSummary,
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
} from 'lucide-react';

interface Gstr1ReportViewProps {
  invoices: Invoice[];
  company?: CompanyProfile | null;
}

export const Gstr1ReportView: React.FC<Gstr1ReportViewProps> = ({ invoices, company }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'b2b' | 'b2c' | 'exports' | 'hsn' | 'pos'>('all');
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
    const currentMonth = now.getMonth(); // 0-indexed

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
      // Q2: July to September
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

  // Aggregate Report Data
  const reportData: Gstr1ReportData = useMemo(() => {
    return generateGstr1Report(invoices, company, periodFilter);
  }, [invoices, company, periodFilter]);

  // Filtered Invoices based on search
  const filteredAllSales = useMemo(() => {
    if (!searchTerm.trim()) return reportData.allSalesInvoices;
    const q = searchTerm.toLowerCase();
    return reportData.allSalesInvoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.partyName.toLowerCase().includes(q) ||
        (inv.partyGstin && inv.partyGstin.toLowerCase().includes(q)) ||
        inv.placeOfSupplyName.toLowerCase().includes(q) ||
        inv.placeOfSupply.includes(q)
    );
  }, [reportData.allSalesInvoices, searchTerm]);

  // Export CSV
  const handleExportCsv = () => {
    let csv =
      'Invoice Number,Invoice Date,Party Name,Party GSTIN,Recipient Type,Place of Supply,Supply Type,Taxable Value (INR),Integrated Tax IGST (INR),Central Tax CGST (INR),State Tax SGST (INR),Total Tax (INR),Invoice Grand Total (INR)\n';

    reportData.allSalesInvoices.forEach((inv) => {
      csv += `"${inv.invoiceNumber}","${inv.invoiceDate}","${inv.partyName}","${inv.partyGstin || ''}","${inv.isRegisteredParty ? 'B2B Registered' : 'B2C Consumer'}","${inv.placeOfSupply} - ${inv.placeOfSupplyName}","${inv.isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}",${inv.taxableValue.toFixed(2)},${inv.igst.toFixed(2)},${inv.cgst.toFixed(2)},${inv.sgst.toFixed(2)},${inv.totalTax.toFixed(2)},${inv.grandTotal.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `GSTR-1_${reportData.companyGstin}_${reportData.periodLabel.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Official GST Portal JSON format
  const handleExportJson = () => {
    const portalJson = {
      gstin: reportData.companyGstin,
      fp: periodFilter.startDate ? periodFilter.startDate.slice(5, 7) + periodFilter.startDate.slice(0, 4) : '092026',
      cur_gt: reportData.totalInvoiceValue,
      b2b: reportData.b2bInvoices.map((i) => ({
        ctin: i.partyGstin,
        inv: [
          {
            inum: i.invoiceNumber,
            idt: i.invoiceDate.split('-').reverse().join('-'), // DD-MM-YYYY
            val: i.grandTotal,
            pos: i.placeOfSupply,
            rchrg: 'N',
            inv_typ: 'R',
            itms: [
              {
                num: 1,
                itm_det: {
                  txval: i.taxableValue,
                  iamt: i.igst,
                  camt: i.cgst,
                  samt: i.sgst,
                  csamt: 0,
                },
              },
            ],
          },
        ],
      })),
      b2cl: reportData.b2clInvoices.map((i) => ({
        pos: i.placeOfSupply,
        inv: [
          {
            inum: i.invoiceNumber,
            idt: i.invoiceDate.split('-').reverse().join('-'),
            val: i.grandTotal,
            txval: i.taxableValue,
            iamt: i.igst,
          },
        ],
      })),
      b2cs: reportData.b2csInvoices.map((i) => ({
        sply_ty: i.isInterstate ? 'INTER' : 'INTRA',
        pos: i.placeOfSupply,
        txval: i.taxableValue,
        iamt: i.igst,
        camt: i.cgst,
        samt: i.sgst,
      })),
      exp: reportData.exportInvoices.map((i) => ({
        exp_typ: i.saleType === 'export_with_tax' ? 'WPAY' : 'WOPAY',
        inv: [
          {
            inum: i.invoiceNumber,
            idt: i.invoiceDate.split('-').reverse().join('-'),
            val: i.grandTotal,
            txval: i.taxableValue,
            iamt: i.igst,
          },
        ],
      })),
      hsn: {
        data: reportData.hsnSummary.map((h, idx) => ({
          num: idx + 1,
          hsn_sc: h.hsnCode,
          desc: h.description,
          uqc: h.uqc,
          qty: h.totalQuantity,
          txval: h.totalTaxable,
          iamt: h.igst,
          camt: h.cgst,
          samt: h.sgst,
          csamt: 0,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(portalJson, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `GSTR1_${reportData.companyGstin}_${portalJson.fp}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySummary = () => {
    const text = `GSTR-1 OUTWARD SUPPLIES SUMMARY
Period: ${reportData.periodLabel}
GSTIN: ${reportData.companyGstin} (State: ${reportData.companyStateCode} - ${reportData.companyStateName})
-----------------------------------------
Total Invoices: ${reportData.totalInvoicesCount}
Total Invoice Value: ${formatINR(reportData.totalInvoiceValue)}
Total Taxable Value: ${formatINR(reportData.totalTaxableValue)}
-----------------------------------------
TAX LIABILITIES (Separated by Supply State & POS):
• Integrated Tax (IGST - Inter-State): ${formatINR(reportData.totalIgst)}
• Central Tax (CGST - Intra-State):   ${formatINR(reportData.totalCgst)}
• State Tax (SGST - Intra-State):     ${formatINR(reportData.totalSgst)}
TOTAL TAX LIABILITY: ${formatINR(reportData.totalTax)}
-----------------------------------------
Table Breakdown:
• Table 4 (B2B Registered): ${reportData.b2bInvoices.length} invoices (Taxable: ${formatINR(reportData.b2bInvoices.reduce((a, b) => a + b.taxableValue, 0))})
• Table 5 (B2C Large): ${reportData.b2clInvoices.length} invoices
• Table 7 (B2C Small): ${reportData.b2csInvoices.length} invoices
• Table 6 (Exports & SEZ): ${reportData.exportInvoices.length} invoices
• Table 12 (HSN Items): ${reportData.hsnSummary.length} codes mapped`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Profile Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">GSTR-1 Outward Supplies Return</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold font-mono">
                  GST Portal Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated schedule of sales invoices with intelligent Place of Supply (POS) separation of IGST vs CGST/SGST.
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
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
              title="Official GST Portal offline tool JSON format"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Portal JSON</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
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
              <span className="text-slate-400">Supplier:</span>
              <span className="font-semibold text-white">{company?.tradeName || company?.businessName || 'Business Entity'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">GSTIN:</span>
              <span className="font-mono font-semibold text-emerald-400">{reportData.companyGstin}</span>
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

      {/* 6 Metric KPI Cards Separating Taxes by IGST, CGST, and SGST */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Gross Invoiced Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Gross Turnover</span>
          <div className="text-lg font-bold font-mono text-white">{formatINR(reportData.totalInvoiceValue)}</div>
          <span className="text-[10px] text-slate-400 block">{reportData.totalInvoicesCount} invoices issued</span>
        </div>

        {/* 2. Taxable Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Taxable Value</span>
          <div className="text-lg font-bold font-mono text-slate-200">{formatINR(reportData.totalTaxableValue)}</div>
          <span className="text-[10px] text-slate-400 block">Base taxable turnover</span>
        </div>

        {/* 3. IGST (Inter-State) */}
        <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-3.5 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-purple-300 uppercase tracking-wider">IGST (Inter-State)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">POS ≠ State</span>
          </div>
          <div className="text-lg font-bold font-mono text-purple-400">{formatINR(reportData.totalIgst)}</div>
          <span className="text-[10px] text-slate-400 block">
            {reportData.allSalesInvoices.filter((i) => i.isInterstate).length} inter-state supplies
          </span>
        </div>

        {/* 4. CGST (Intra-State Central) */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-3.5 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-blue-300 uppercase tracking-wider">CGST (Central)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">POS = State</span>
          </div>
          <div className="text-lg font-bold font-mono text-blue-400">{formatINR(reportData.totalCgst)}</div>
          <span className="text-[10px] text-slate-400 block">Central tax portion</span>
        </div>

        {/* 5. SGST (Intra-State State/UT) */}
        <div className="bg-slate-900 border border-teal-500/30 rounded-xl p-3.5 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-teal-300 uppercase tracking-wider">SGST (State)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">{reportData.companyStateCode}</span>
          </div>
          <div className="text-lg font-bold font-mono text-teal-400">{formatINR(reportData.totalSgst)}</div>
          <span className="text-[10px] text-slate-400 block">State/UT tax portion</span>
        </div>

        {/* 6. Total Tax Liability */}
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">Total Tax Liability</span>
          <div className="text-lg font-bold font-mono text-emerald-400">{formatINR(reportData.totalTax)}</div>
          <span className="text-[10px] text-emerald-400/80 block">IGST + CGST + SGST</span>
        </div>
      </div>

      {/* Place of Supply Rule Callout Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 text-xs">
        <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5 shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <span>Place of Supply (POS) Engine Active</span>
            <span className="text-[10px] text-slate-400 font-normal">Section 10 & 12 of IGST Act</span>
          </div>
          <p className="text-slate-400">
            Supplies with Place of Supply matching company state (<strong className="text-slate-300">{reportData.companyStateName} [{reportData.companyStateCode}]</strong>) are classified as <strong className="text-blue-300">Intra-State</strong> and split equally into <strong className="text-blue-300">CGST</strong> & <strong className="text-teal-300">SGST</strong>. Outward supplies destined for any other State, Union Territory, or Export are classified as <strong className="text-purple-300">Inter-State</strong> and attract <strong className="text-purple-300">Integrated GST (IGST)</strong>.
          </p>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          All Invoices ({reportData.allSalesInvoices.length})
        </button>

        <button
          onClick={() => setActiveTab('b2b')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'b2b'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span>Table 4: B2B Regular</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/40 text-current font-mono">
            {reportData.b2bInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('b2c')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'b2c'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span>Table 5 & 7: B2C Supplies</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/40 text-current font-mono">
            {reportData.b2clInvoices.length + reportData.b2csInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('exports')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'exports'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <span>Table 6: Exports & SEZ</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/40 text-current font-mono">
            {reportData.exportInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pos'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>Place of Supply Analysis ({reportData.posSummary.length} States)</span>
        </button>

        <button
          onClick={() => setActiveTab('hsn')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'hsn'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Table 12: HSN Summary ({reportData.hsnSummary.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL INVOICES */}
      {activeTab === 'all' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search invoice #, customer name, GSTIN, or State..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Showing {filteredAllSales.length} of {reportData.allSalesInvoices.length} invoices
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer / Party</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Place of Supply</th>
                  <th className="p-3 text-center">Supply Type</th>
                  <th className="p-3 text-right">Taxable Value</th>
                  <th className="p-3 text-right text-purple-400">IGST</th>
                  <th className="p-3 text-right text-blue-400">CGST</th>
                  <th className="p-3 text-right text-teal-400">SGST</th>
                  <th className="p-3 text-right font-bold text-white">Invoice Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {filteredAllSales.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500 font-sans">
                      No sales invoices found for the selected period or search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAllSales.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 text-white font-semibold">{inv.invoiceNumber}</td>
                      <td className="p-3 text-slate-400 font-sans">{inv.invoiceDate}</td>
                      <td className="p-3 font-sans text-slate-200">
                        <div className="font-medium">{inv.partyName}</div>
                        <span className="text-[10px] text-slate-500">{inv.tableCategory.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {inv.partyGstin ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                            {inv.partyGstin}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-sans text-[10px]">Unregistered (B2C)</span>
                        )}
                      </td>
                      <td className="p-3 font-sans">
                        <div className="text-slate-300 font-medium">{inv.placeOfSupplyName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Code {inv.placeOfSupply}</div>
                      </td>
                      <td className="p-3 text-center font-sans">
                        {inv.isInterstate ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            Inter-State (IGST)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            Intra-State (CGST+SGST)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">₹{inv.taxableValue.toFixed(2)}</td>
                      <td className="p-3 text-right text-purple-400">
                        {inv.igst > 0 ? `₹${inv.igst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right text-blue-400">
                        {inv.cgst > 0 ? `₹${inv.cgst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right text-teal-400">
                        {inv.sgst > 0 ? `₹${inv.sgst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-white">₹{inv.grandTotal.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredAllSales.length > 0 && (
                <tfoot className="bg-slate-950 font-mono font-bold text-xs text-white border-t border-slate-800">
                  <tr>
                    <td colSpan={6} className="p-3 text-right font-sans uppercase tracking-wider text-slate-400">
                      Total ({filteredAllSales.length} Invoices):
                    </td>
                    <td className="p-3 text-right">
                      ₹{filteredAllSales.reduce((a, b) => a + b.taxableValue, 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-purple-400">
                      ₹{filteredAllSales.reduce((a, b) => a + b.igst, 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-blue-400">
                      ₹{filteredAllSales.reduce((a, b) => a + b.cgst, 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-teal-400">
                      ₹{filteredAllSales.reduce((a, b) => a + b.sgst, 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-emerald-400">
                      ₹{filteredAllSales.reduce((a, b) => a + b.grandTotal, 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TABLE 4 B2B INVOICES */}
      {activeTab === 'b2b' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-base">Table 4: Taxable Outward Supplies to Registered Persons (B2B)</h4>
              <p className="text-xs text-slate-400">
                Invoices issued to buyers possessing a valid 15-digit GSTIN. Separated into Inter-State (IGST) & Intra-State (CGST + SGST).
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {reportData.b2bInvoices.length} B2B Records
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3">GSTIN of Recipient</th>
                  <th className="p-3">Receiver Name</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Invoice Date</th>
                  <th className="p-3">Place of Supply</th>
                  <th className="p-3 text-center">Supply Mode</th>
                  <th className="p-3 text-right">Taxable (₹)</th>
                  <th className="p-3 text-right text-purple-400">IGST (₹)</th>
                  <th className="p-3 text-right text-blue-400">CGST (₹)</th>
                  <th className="p-3 text-right text-teal-400">SGST (₹)</th>
                  <th className="p-3 text-right text-white">Invoice Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {reportData.b2bInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500 font-sans">
                      No B2B invoices recorded in this period.
                    </td>
                  </tr>
                ) : (
                  reportData.b2bInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30">
                      <td className="p-3 text-emerald-400 font-semibold">{inv.partyGstin}</td>
                      <td className="p-3 font-sans text-white">{inv.partyName}</td>
                      <td className="p-3 text-slate-200">{inv.invoiceNumber}</td>
                      <td className="p-3 font-sans text-slate-400">{inv.invoiceDate}</td>
                      <td className="p-3 font-sans">
                        {inv.placeOfSupply} - {inv.placeOfSupplyName}
                      </td>
                      <td className="p-3 text-center font-sans">
                        {inv.isInterstate ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                            Interstate (IGST)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                            Intrastate (CGST+SGST)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">₹{inv.taxableValue.toFixed(2)}</td>
                      <td className="p-3 text-right text-purple-400">
                        {inv.igst > 0 ? `₹${inv.igst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right text-blue-400">
                        {inv.cgst > 0 ? `₹${inv.cgst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right text-teal-400">
                        {inv.sgst > 0 ? `₹${inv.sgst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-white">₹{inv.grandTotal.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: B2C SUPPLIES */}
      {activeTab === 'b2c' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
          {/* Table 5: B2CL (Interstate > 2.5 Lakhs) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-base">Table 5: B2C (Large) Invoices</h4>
                <p className="text-xs text-slate-400">
                  Inter-State supplies made to unregistered persons where invoice value exceeds ₹2,50,000.
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {reportData.b2clInvoices.length} Large Invoices
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Consumer Name</th>
                    <th className="p-3">Place of Supply (POS)</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right text-purple-400">IGST</th>
                    <th className="p-3 text-right text-white">Invoice Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {reportData.b2clInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 font-sans">
                        No B2C Large invoices (&gt; ₹2.5 Lakhs interstate) in this period.
                      </td>
                    </tr>
                  ) : (
                    reportData.b2clInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30">
                        <td className="p-3 text-white font-semibold">{inv.invoiceNumber}</td>
                        <td className="p-3 text-slate-400 font-sans">{inv.invoiceDate}</td>
                        <td className="p-3 font-sans text-slate-200">{inv.partyName}</td>
                        <td className="p-3 font-sans">
                          {inv.placeOfSupply} - {inv.placeOfSupplyName}
                        </td>
                        <td className="p-3 text-right">₹{inv.taxableValue.toFixed(2)}</td>
                        <td className="p-3 text-right text-purple-400">₹{inv.igst.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-white">₹{inv.grandTotal.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 7: B2CS (Small & Intrastate B2C) */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-base">Table 7: B2C (Small) Supplies</h4>
                <p className="text-xs text-slate-400">
                  Intra-State supplies to unregistered consumers (CGST + SGST) and Inter-State supplies ≤ ₹2.5 Lakhs.
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {reportData.b2csInvoices.length} Invoices
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Place of Supply</th>
                    <th className="p-3 text-center">Type</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right text-purple-400">IGST</th>
                    <th className="p-3 text-right text-blue-400">CGST</th>
                    <th className="p-3 text-right text-teal-400">SGST</th>
                    <th className="p-3 text-right text-white">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {reportData.b2csInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-slate-500 font-sans">
                        No B2C small invoices found.
                      </td>
                    </tr>
                  ) : (
                    reportData.b2csInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30">
                        <td className="p-3 text-white font-semibold">{inv.invoiceNumber}</td>
                        <td className="p-3 font-sans text-slate-200">{inv.partyName}</td>
                        <td className="p-3 font-sans">
                          {inv.placeOfSupply} - {inv.placeOfSupplyName}
                        </td>
                        <td className="p-3 text-center font-sans">
                          {inv.isInterstate ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                              Interstate
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                              Intrastate
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">₹{inv.taxableValue.toFixed(2)}</td>
                        <td className="p-3 text-right text-purple-400">
                          {inv.igst > 0 ? `₹${inv.igst.toFixed(2)}` : '—'}
                        </td>
                        <td className="p-3 text-right text-blue-400">
                          {inv.cgst > 0 ? `₹${inv.cgst.toFixed(2)}` : '—'}
                        </td>
                        <td className="p-3 text-right text-teal-400">
                          {inv.sgst > 0 ? `₹${inv.sgst.toFixed(2)}` : '—'}
                        </td>
                        <td className="p-3 text-right font-bold text-white">₹{inv.grandTotal.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TABLE 6 EXPORTS & SEZ */}
      {activeTab === 'exports' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-base">Table 6: Exports and SEZ Supplies</h4>
              <p className="text-xs text-slate-400">
                Zero-rated supplies including export with payment of tax (WPAY) and export under LUT without tax (WOPAY).
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              {reportData.exportInvoices.length} Exports
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Overseas Buyer / SEZ</th>
                  <th className="p-3">Export Type</th>
                  <th className="p-3 text-right">Taxable Value (₹)</th>
                  <th className="p-3 text-right text-purple-400">IGST (₹)</th>
                  <th className="p-3 text-right text-white">Invoice Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {reportData.exportInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      No export or SEZ invoices recorded in this period.
                    </td>
                  </tr>
                ) : (
                  reportData.exportInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30">
                      <td className="p-3 text-white font-semibold">{inv.invoiceNumber}</td>
                      <td className="p-3 text-slate-400 font-sans">{inv.invoiceDate}</td>
                      <td className="p-3 font-sans text-slate-200">{inv.partyName}</td>
                      <td className="p-3 font-sans">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold text-[10px]">
                          {inv.saleType.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right">₹{inv.taxableValue.toFixed(2)}</td>
                      <td className="p-3 text-right text-purple-400">₹{inv.igst.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-white">₹{inv.grandTotal.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PLACE OF SUPPLY MATRIX */}
      {activeTab === 'pos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-base">Place of Supply (POS) State-Wise Matrix</h4>
              <p className="text-xs text-slate-400">
                Detailed audit showing tax breakdown into IGST vs CGST/SGST based on destination State code vs Company Origin State ({reportData.companyStateName} [{reportData.companyStateCode}]).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                Different State = 100% IGST
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                Same State = 50% CGST + 50% SGST
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3">State Code</th>
                  <th className="p-3">Place of Supply (State)</th>
                  <th className="p-3 text-center">Supply Classification</th>
                  <th className="p-3 text-center">Invoices</th>
                  <th className="p-3 text-right">Taxable Turnover</th>
                  <th className="p-3 text-right text-purple-400">Integrated Tax (IGST)</th>
                  <th className="p-3 text-right text-blue-400">Central Tax (CGST)</th>
                  <th className="p-3 text-right text-teal-400">State Tax (SGST)</th>
                  <th className="p-3 text-right text-emerald-400 font-bold">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {reportData.posSummary.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">
                      No sales data available.
                    </td>
                  </tr>
                ) : (
                  reportData.posSummary.map((pos) => {
                    const isOriginState = pos.stateCode === reportData.companyStateCode;
                    return (
                      <tr key={pos.stateCode} className="hover:bg-slate-800/30">
                        <td className="p-3 text-white font-bold">{pos.stateCode}</td>
                        <td className="p-3 font-sans text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{pos.stateName}</span>
                            {isOriginState && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                HOME STATE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-sans">
                          {pos.isInterstate ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              Inter-State Supply
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              Intra-State Supply
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center text-slate-400">{pos.invoiceCount}</td>
                        <td className="p-3 text-right">₹{pos.taxableValue.toFixed(2)}</td>
                        <td className="p-3 text-right text-purple-400">
                          {pos.igst > 0 ? `₹${pos.igst.toFixed(2)}` : '—'}
                        </td>
                        <td className="p-3 text-right text-blue-400">
                          {pos.cgst > 0 ? `₹${pos.cgst.toFixed(2)}` : '—'}
                        </td>
                        <td className="p-3 text-right text-teal-400">
                          {pos.sgst > 0 ? `₹${pos.sgst.toFixed(2)}` : '—'}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">₹{pos.totalTax.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: TABLE 12 HSN SUMMARY */}
      {activeTab === 'hsn' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-white text-base">Table 12: HSN-Wise Summary of Outward Supplies</h4>
              <p className="text-xs text-slate-400">
                HSN / SAC code level summary of goods and services supplied with quantity, taxable value, and tax head breakdown.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
              {reportData.hsnSummary.length} HSN Codes
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3">HSN / SAC</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">UQC</th>
                  <th className="p-3 text-right">Total Qty</th>
                  <th className="p-3 text-right">Total Taxable Value (₹)</th>
                  <th className="p-3 text-right text-purple-400">IGST (₹)</th>
                  <th className="p-3 text-right text-blue-400">CGST (₹)</th>
                  <th className="p-3 text-right text-teal-400">SGST (₹)</th>
                  <th className="p-3 text-right text-emerald-400 font-bold">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {reportData.hsnSummary.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-sans">
                      No HSN item data available in sales invoices.
                    </td>
                  </tr>
                ) : (
                  reportData.hsnSummary.map((hsn) => (
                    <tr key={hsn.hsnCode} className="hover:bg-slate-800/30">
                      <td className="p-3 text-white font-bold">{hsn.hsnCode}</td>
                      <td className="p-3 font-sans text-slate-200">{hsn.description}</td>
                      <td className="p-3 text-center text-slate-400">{hsn.uqc}</td>
                      <td className="p-3 text-right">{hsn.totalQuantity}</td>
                      <td className="p-3 text-right">₹{hsn.totalTaxable.toFixed(2)}</td>
                      <td className="p-3 text-right text-purple-400">
                        {hsn.igst > 0 ? `₹${hsn.igst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right text-blue-400">
                        {hsn.cgst > 0 ? `₹${hsn.cgst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right text-teal-400">
                        {hsn.sgst > 0 ? `₹${hsn.sgst.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">₹{hsn.totalTax.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
