import React, { useState, useMemo } from 'react';
import { Invoice, Expense, Party, CompanyProfile } from '../types';
import {
  generateGstr3bReport,
  Gstr3bReportData,
  getCompanyGstProfile,
} from '../utils/gstTaxEngine';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Globe2,
  ShieldCheck,
  Scale,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Wallet,
  Coins,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface GstrPreviousMonthComparisonViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  parties?: Party[];
  company?: CompanyProfile | null;
  onNavigateToGstr3b?: () => void;
  onNavigateToGstr1?: () => void;
  initialSelectedMonth?: string; // Format: "YYYY-MM"
}

interface ComparisonRow {
  id: string;
  category: 'collected' | 'paid' | 'net' | 'turnover';
  title: string;
  subtitle?: string;
  statutoryRef?: string;
  prevValue: number;
  currValue: number;
  diff: number;
  pctChange: number;
  favorableDirection: 'higher' | 'lower' | 'neutral';
  isTotalRow?: boolean;
  isSubtotal?: boolean;
  formatAsCurrency?: boolean;
}

export const GstrPreviousMonthComparisonView: React.FC<GstrPreviousMonthComparisonViewProps> = ({
  invoices,
  expenses,
  parties = [],
  company,
  onNavigateToGstr3b,
  onNavigateToGstr1,
  initialSelectedMonth,
}) => {
  // Discover available months from invoices, expenses, and current date
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    const now = new Date();
    const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentYm);

    // Also include past 6 months by default
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Include all months from invoices
    invoices.forEach((inv) => {
      if (inv.invoiceDate && inv.invoiceDate.length >= 7) {
        monthSet.add(inv.invoiceDate.slice(0, 7));
      }
    });

    // Include all months from expenses
    expenses.forEach((exp) => {
      if (exp.date && exp.date.length >= 7) {
        monthSet.add(exp.date.slice(0, 7));
      }
    });

    // Sort descending (most recent first)
    return Array.from(monthSet).sort().reverse();
  }, [invoices, expenses]);

  // Selected Current Month (defaults to initialSelectedMonth, or the first available month)
  const [selectedYm, setSelectedYm] = useState<string>(() => {
    if (initialSelectedMonth && availableMonths.includes(initialSelectedMonth)) {
      return initialSelectedMonth;
    }
    return availableMonths[0] || '2026-09';
  });

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'collected' | 'paid' | 'net'>('all');
  const [copied, setCopied] = useState(false);

  // Month names helper
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Derive Current Month & Previous Month date bounds
  const { currentPeriod, prevPeriod } = useMemo(() => {
    const [yStr, mStr] = selectedYm.split('-');
    const currYear = parseInt(yStr, 10);
    const currMonthIndex = parseInt(mStr, 10) - 1; // 0-indexed

    // Current month dates
    const currStart = `${currYear}-${String(currMonthIndex + 1).padStart(2, '0')}-01`;
    const currLastDay = new Date(currYear, currMonthIndex + 1, 0).getDate();
    const currEnd = `${currYear}-${String(currMonthIndex + 1).padStart(2, '0')}-${String(currLastDay).padStart(2, '0')}`;
    const currLabel = `${MONTH_NAMES[currMonthIndex]} ${currYear}`;

    // Previous month dates
    const prevMonthIndex = currMonthIndex === 0 ? 11 : currMonthIndex - 1;
    const prevYear = currMonthIndex === 0 ? currYear - 1 : currYear;
    const prevStart = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevYear, prevMonthIndex + 1, 0).getDate();
    const prevEnd = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;
    const prevLabel = `${MONTH_NAMES[prevMonthIndex]} ${prevYear}`;

    return {
      currentPeriod: { startDate: currStart, endDate: currEnd, label: currLabel },
      prevPeriod: { startDate: prevStart, endDate: prevEnd, label: prevLabel },
    };
  }, [selectedYm]);

  // Compute GSTR-3B data for Current Month and Previous Month
  const currentReport: Gstr3bReportData = useMemo(() => {
    return generateGstr3bReport(invoices, expenses, parties, company, currentPeriod);
  }, [invoices, expenses, parties, company, currentPeriod]);

  const prevReport: Gstr3bReportData = useMemo(() => {
    return generateGstr3bReport(invoices, expenses, parties, company, prevPeriod);
  }, [invoices, expenses, parties, company, prevPeriod]);

  // Counts of sales and inward records for both periods
  const currentCounts = useMemo(() => {
    const sales = invoices.filter(
      (i) =>
        i.voucherType === 'sales' &&
        i.status !== 'cancelled' &&
        i.invoiceDate >= currentPeriod.startDate &&
        i.invoiceDate <= currentPeriod.endDate
    ).length;
    const inward = currentReport.inwardSupplies.length;
    const inwardTaxable = currentReport.inwardSupplies.reduce((acc, curr) => acc + curr.taxableValue, 0);
    return { sales, inward, inwardTaxable };
  }, [invoices, currentPeriod, currentReport.inwardSupplies]);

  const prevCounts = useMemo(() => {
    const sales = invoices.filter(
      (i) =>
        i.voucherType === 'sales' &&
        i.status !== 'cancelled' &&
        i.invoiceDate >= prevPeriod.startDate &&
        i.invoiceDate <= prevPeriod.endDate
    ).length;
    const inward = prevReport.inwardSupplies.length;
    const inwardTaxable = prevReport.inwardSupplies.reduce((acc, curr) => acc + curr.taxableValue, 0);
    return { sales, inward, inwardTaxable };
  }, [invoices, prevPeriod, prevReport.inwardSupplies]);

  // Formatting helpers
  const formatINR = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const calculatePctChange = (curr: number, prev: number): number => {
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0 && curr > 0) return 100;
    if (prev === 0 && curr < 0) return -100;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  // Compile Comprehensive MoM Comparison Rows
  const comparisonRows: ComparisonRow[] = useMemo(() => {
    const rows: ComparisonRow[] = [];

    // Helper to push a row
    const addRow = (
      id: string,
      category: 'collected' | 'paid' | 'net' | 'turnover',
      title: string,
      subtitle: string,
      statutoryRef: string,
      currVal: number,
      prevVal: number,
      favorableDirection: 'higher' | 'lower' | 'neutral',
      isTotalRow = false,
      isSubtotal = false,
      formatAsCurrency = true
    ) => {
      const diff = currVal - prevVal;
      const pctChange = calculatePctChange(currVal, prevVal);
      rows.push({
        id,
        category,
        title,
        subtitle,
        statutoryRef,
        prevValue: prevVal,
        currValue: currVal,
        diff,
        pctChange,
        favorableDirection,
        isTotalRow,
        isSubtotal,
        formatAsCurrency,
      });
    };

    // --- 1. COLLECTED TAX LIABILITIES (OUTWARD SUPPLIES / SALES) ---
    const currOutwardTaxable =
      currentReport.table31.taxable.taxableValue +
      currentReport.table31.zeroRated.taxableValue +
      currentReport.table31.nilExempt.taxableValue;

    const prevOutwardTaxable =
      prevReport.table31.taxable.taxableValue +
      prevReport.table31.zeroRated.taxableValue +
      prevReport.table31.nilExempt.taxableValue;

    addRow(
      'outward_turnover',
      'collected',
      'Outward Gross Turnover (Taxable Sales)',
      'Total taxable value of outward supplies and zero-rated sales',
      'Table 3.1(a)(b)',
      currOutwardTaxable,
      prevOutwardTaxable,
      'higher',
      false,
      true
    );

    addRow(
      'collected_igst',
      'collected',
      'IGST Collected (Inter-State Outward)',
      'Integrated Goods and Services Tax collected on inter-state sales',
      'Table 3.1(a)+3.1(b)',
      currentReport.table31.totalLiability.igst,
      prevReport.table31.totalLiability.igst,
      'higher'
    );

    addRow(
      'collected_cgst',
      'collected',
      'CGST Collected (Intra-State Outward)',
      'Central GST collected on intra-state supplies within company state',
      'Table 3.1(a)',
      currentReport.table31.totalLiability.cgst,
      prevReport.table31.totalLiability.cgst,
      'higher'
    );

    addRow(
      'collected_sgst',
      'collected',
      'SGST Collected (Intra-State Outward)',
      'State/UT GST collected on intra-state supplies within company state',
      'Table 3.1(a)',
      currentReport.table31.totalLiability.sgst,
      prevReport.table31.totalLiability.sgst,
      'higher'
    );

    addRow(
      'collected_total',
      'collected',
      'Total Output GST Collected (Gross Liability)',
      'Total statutory outward tax liability to be paid / offset',
      'Table 3.1 Total',
      currentReport.table31.totalLiability.total,
      prevReport.table31.totalLiability.total,
      'neutral',
      true
    );

    addRow(
      'sales_count',
      'collected',
      'Outward Invoices Processed',
      'Number of sales invoices raised during the monthly return period',
      'Voucher Audit',
      currentCounts.sales,
      prevCounts.sales,
      'higher',
      false,
      false,
      false
    );

    // --- 2. PAID TAX LIABILITIES (INWARD PURCHASES & INPUT TAX CREDIT) ---
    addRow(
      'inward_turnover',
      'paid',
      'Inward Purchases & Overheads Value',
      'Taxable value of raw materials, trade goods, capital assets, and expenses',
      'Inward Ledger',
      currentCounts.inwardTaxable,
      prevCounts.inwardTaxable,
      'neutral',
      false,
      true
    );

    addRow(
      'paid_igst',
      'paid',
      'IGST Paid on Purchases (Inter-State)',
      'Input tax paid on inter-state supplies received from registered vendors',
      'Table 4(A)(5)',
      currentReport.table4.allOtherItc.igst,
      prevReport.table4.allOtherItc.igst,
      'higher'
    );

    addRow(
      'paid_cgst',
      'paid',
      'CGST Paid on Purchases (Intra-State)',
      'Central GST paid to local state vendors and service suppliers',
      'Table 4(A)(5)',
      currentReport.table4.allOtherItc.cgst,
      prevReport.table4.allOtherItc.cgst,
      'higher'
    );

    addRow(
      'paid_sgst',
      'paid',
      'SGST Paid on Purchases (Intra-State)',
      'State GST paid to local state vendors and service suppliers',
      'Table 4(A)(5)',
      currentReport.table4.allOtherItc.sgst,
      prevReport.table4.allOtherItc.sgst,
      'higher'
    );

    addRow(
      'paid_gross_itc',
      'paid',
      'Gross Input Tax Credit (ITC Available)',
      'Total input tax paid before statutory exclusions and reversals',
      'Table 4(A) Total',
      currentReport.table4.totalAvailableItc.total,
      prevReport.table4.totalAvailableItc.total,
      'higher',
      false,
      true
    );

    addRow(
      'ineligible_itc',
      'paid',
      'Ineligible ITC Reversal (Section 17(5))',
      'Blocked credits reversed (food, vehicles, personal expenses, etc.)',
      'Table 4(B)(2)',
      currentReport.table4.ineligibleItc.total,
      prevReport.table4.ineligibleItc.total,
      'lower'
    );

    addRow(
      'paid_net_itc',
      'paid',
      'Net Eligible Input Tax Credit (Tax Paid Claimed)',
      'Total net ITC available for offsetting monthly output liabilities',
      'Table 4(C) Net',
      currentReport.table4.netItcAvailable.total,
      prevReport.table4.netItcAvailable.total,
      'higher',
      true
    );

    addRow(
      'inward_count',
      'paid',
      'Inward Bills & Expense Vouchers Logged',
      'Number of purchase bills and expense items reconciled for ITC',
      'Voucher Audit',
      currentCounts.inward,
      prevCounts.inward,
      'higher',
      false,
      false,
      false
    );

    // --- 3. NET TAX LIABILITIES RECONCILIATION (COLLECTED VS. PAID) ---
    // Net IGST: Collected - Paid
    const currNetIgst = currentReport.table31.totalLiability.igst - currentReport.table4.netItcAvailable.igst;
    const prevNetIgst = prevReport.table31.totalLiability.igst - prevReport.table4.netItcAvailable.igst;
    addRow(
      'net_igst_pos',
      'net',
      'Net IGST Position (Collected - Paid ITC)',
      'Positive = Excess liability; Negative = ITC surplus carry forward',
      'Ledger Reconcile',
      currNetIgst,
      prevNetIgst,
      'lower'
    );

    // Net CGST: Collected - Paid
    const currNetCgst = currentReport.table31.totalLiability.cgst - currentReport.table4.netItcAvailable.cgst;
    const prevNetCgst = prevReport.table31.totalLiability.cgst - prevReport.table4.netItcAvailable.cgst;
    addRow(
      'net_cgst_pos',
      'net',
      'Net CGST Position (Collected - Paid ITC)',
      'Intra-state Central tax gap after direct input credit match',
      'Ledger Reconcile',
      currNetCgst,
      prevNetCgst,
      'lower'
    );

    // Net SGST: Collected - Paid
    const currNetSgst = currentReport.table31.totalLiability.sgst - currentReport.table4.netItcAvailable.sgst;
    const prevNetSgst = prevReport.table31.totalLiability.sgst - prevReport.table4.netItcAvailable.sgst;
    addRow(
      'net_sgst_pos',
      'net',
      'Net SGST Position (Collected - Paid ITC)',
      'Intra-state State tax gap after direct input credit match',
      'Ledger Reconcile',
      currNetSgst,
      prevNetSgst,
      'lower'
    );

    // Total Net Balance before cross-utilization
    const currNetTotal = currentReport.table31.totalLiability.total - currentReport.table4.netItcAvailable.total;
    const prevNetTotal = prevReport.table31.totalLiability.total - prevReport.table4.netItcAvailable.total;
    addRow(
      'net_gap_total',
      'net',
      'Total Net Tax Position (Collected - Paid)',
      'Gross Output GST collected minus Net Input Tax Credit claimed',
      'Balance Gap',
      currNetTotal,
      prevNetTotal,
      'lower',
      false,
      true
    );

    // ITC Utilized for Offset
    addRow(
      'itc_utilized',
      'net',
      'ITC Utilized for Tax Payment (Rule 88A)',
      'Statutory credit utilized from Electronic Credit Ledger to discharge liability',
      'Table 6.1 Set-off',
      currentReport.table61.paidByItc.totalPaidByItc,
      prevReport.table61.paidByItc.totalPaidByItc,
      'higher'
    );

    // Net Cash Tax Payable via Challan (Electronic Cash Ledger)
    addRow(
      'cash_payable',
      'net',
      'Net Cash Tax Payable via Challan',
      'Actual cash out of pocket paid via bank challan (Electronic Cash Ledger)',
      'Table 6.1 Cash',
      currentReport.table61.cashPayable.total,
      prevReport.table61.cashPayable.total,
      'lower',
      true
    );

    // Carried Forward ITC Balance (Electronic Credit Ledger Closing)
    addRow(
      'itc_carried_forward',
      'net',
      'Surplus ITC Balance Carried Forward',
      'Remaining unutilized input tax credit available for future periods',
      'Ledger Closing',
      currentReport.table61.closingItcBalance.total,
      prevReport.table61.closingItcBalance.total,
      'higher',
      false,
      true
    );

    return rows;
  }, [currentReport, prevReport, currentCounts, prevCounts]);

  // Filtered rows for the table
  const displayedRows = useMemo(() => {
    if (activeCategoryFilter === 'all') return comparisonRows;
    return comparisonRows.filter((r) => r.category === activeCategoryFilter);
  }, [comparisonRows, activeCategoryFilter]);

  // Executive KPI summary data
  const summaryKpis = useMemo(() => {
    const currCollected = currentReport.table31.totalLiability.total;
    const prevCollected = prevReport.table31.totalLiability.total;
    const collectedDiff = currCollected - prevCollected;
    const collectedPct = calculatePctChange(currCollected, prevCollected);

    const currPaid = currentReport.table4.netItcAvailable.total;
    const prevPaid = prevReport.table4.netItcAvailable.total;
    const paidDiff = currPaid - prevPaid;
    const paidPct = calculatePctChange(currPaid, prevPaid);

    const currCash = currentReport.table61.cashPayable.total;
    const prevCash = prevReport.table61.cashPayable.total;
    const cashDiff = currCash - prevCash;
    const cashPct = calculatePctChange(currCash, prevCash);

    const currClosingItc = currentReport.table61.closingItcBalance.total;
    const prevClosingItc = prevReport.table61.closingItcBalance.total;
    const closingItcDiff = currClosingItc - prevClosingItc;
    const closingItcPct = calculatePctChange(currClosingItc, prevClosingItc);

    // Efficiency: ITC offset ratio = (itc utilized / collected) * 100
    const currOffsetRatio = currCollected > 0 ? (currentReport.table61.paidByItc.totalPaidByItc / currCollected) * 100 : 100;
    const prevOffsetRatio = prevCollected > 0 ? (prevReport.table61.paidByItc.totalPaidByItc / prevCollected) * 100 : 100;
    const offsetRatioDiff = currOffsetRatio - prevOffsetRatio;

    return {
      collected: { curr: currCollected, prev: prevCollected, diff: collectedDiff, pct: collectedPct },
      paid: { curr: currPaid, prev: prevPaid, diff: paidDiff, pct: paidPct },
      cash: { curr: currCash, prev: prevCash, diff: cashDiff, pct: cashPct },
      closingItc: { curr: currClosingItc, prev: prevClosingItc, diff: closingItcDiff, pct: closingItcPct },
      offsetRatio: { curr: currOffsetRatio, prev: prevOffsetRatio, diff: offsetRatioDiff },
    };
  }, [currentReport, prevReport]);

  // Dynamic MoM Statutory Observations / Insights
  const complianceInsights = useMemo(() => {
    const list: { title: string; desc: string; type: 'success' | 'info' | 'warning' }[] = [];

    // 1. Output Tax Liability Insight
    if (summaryKpis.collected.pct > 5) {
      list.push({
        title: 'Output Tax Collections Grew',
        desc: `Tax collected rose by ${summaryKpis.collected.pct.toFixed(1)}% (+${formatINR(summaryKpis.collected.diff)}), indicating expanded business activity in ${currentPeriod.label}.`,
        type: 'success',
      });
    } else if (summaryKpis.collected.pct < -5) {
      list.push({
        title: 'Output Tax Collections Contracted',
        desc: `Tax collected decreased by ${Math.abs(summaryKpis.collected.pct).toFixed(1)}% (${formatINR(summaryKpis.collected.diff)}) compared to ${prevPeriod.label}.`,
        type: 'info',
      });
    } else {
      list.push({
        title: 'Stable Tax Collection Trajectory',
        desc: `Gross tax collection remained steady with a marginal variance of ${summaryKpis.collected.pct.toFixed(1)}%.`,
        type: 'info',
      });
    }

    // 2. Paid ITC Claim Expansion / Contraction
    if (summaryKpis.paid.pct > 10) {
      list.push({
        title: 'Input Tax Credit (ITC) Claims Expanded',
        desc: `Eligible input tax claims surged by ${summaryKpis.paid.pct.toFixed(1)}% (+${formatINR(summaryKpis.paid.diff)}), optimizing your tax shelter and lowering cash outflow.`,
        type: 'success',
      });
    } else if (summaryKpis.paid.pct < -10) {
      list.push({
        title: 'Lower Input Tax Credit Claimed',
        desc: `Net ITC claims dropped by ${Math.abs(summaryKpis.paid.pct).toFixed(1)}% (${formatINR(summaryKpis.paid.diff)}). Verify if vendor bills for ${currentPeriod.label} are fully uploaded and matched with GSTR-2B.`,
        type: 'warning',
      });
    }

    // 3. Cash Challan Impact
    if (summaryKpis.cash.curr === 0) {
      list.push({
        title: 'Zero Cash Challan Liability',
        desc: `100% of your output tax liabilities in ${currentPeriod.label} are satisfied through available Input Tax Credit with zero cash challan outflow required.`,
        type: 'success',
      });
    } else if (summaryKpis.cash.diff > 0) {
      list.push({
        title: 'Net Cash Challan Requirement Rose',
        desc: `Cash payable increased by +${formatINR(summaryKpis.cash.diff)} (+${summaryKpis.cash.pct.toFixed(1)}%). Ensure sufficient funds in your Electronic Cash Ledger before the 20th filing deadline.`,
        type: 'warning',
      });
    } else if (summaryKpis.cash.diff < 0) {
      list.push({
        title: 'Cash Tax Outflow Optimized',
        desc: `Cash payable decreased by ${formatINR(Math.abs(summaryKpis.cash.diff))} (${Math.abs(summaryKpis.cash.pct).toFixed(1)}% reduction), driven by higher credit utilization.`,
        type: 'success',
      });
    }

    // 4. Inter-state (IGST) Mix Shift
    const currIgstRatio =
      summaryKpis.collected.curr > 0
        ? (currentReport.table31.totalLiability.igst / summaryKpis.collected.curr) * 100
        : 0;
    const prevIgstRatio =
      summaryKpis.collected.prev > 0
        ? (prevReport.table31.totalLiability.igst / summaryKpis.collected.prev) * 100
        : 0;

    const igstShift = currIgstRatio - prevIgstRatio;
    if (Math.abs(igstShift) >= 5) {
      list.push({
        title: 'Inter-State Place of Supply (POS) Shift',
        desc: `Inter-state (IGST) supplies accounted for ${currIgstRatio.toFixed(1)}% of total output tax vs ${prevIgstRatio.toFixed(1)}% in the previous month (${igstShift > 0 ? '+' : ''}${igstShift.toFixed(1)}% shift).`,
        type: 'info',
      });
    }

    return list;
  }, [summaryKpis, currentPeriod, prevPeriod, currentReport, prevReport]);

  // Export to CSV
  const handleExportCsv = () => {
    let csv = `GSTR Month-over-Month Tax Liability Comparison\n`;
    csv += `Company:,"${company?.tradeName || company?.businessName || 'Business Entity'}"\n`;
    csv += `GSTIN:,"${currentReport.companyGstin}"\n`;
    csv += `Current Month:,"${currentPeriod.label} (${currentPeriod.startDate} to ${currentPeriod.endDate})"\n`;
    csv += `Previous Month:,"${prevPeriod.label} (${prevPeriod.startDate} to ${prevPeriod.endDate})"\n\n`;

    csv += `Category,Line Item,Statutory Reference,Previous Month (${prevPeriod.label}),Current Month (${currentPeriod.label}),Variance (Diff),MoM % Change\n`;

    comparisonRows.forEach((row) => {
      const prevStr = row.formatAsCurrency ? row.prevValue.toFixed(2) : row.prevValue.toString();
      const currStr = row.formatAsCurrency ? row.currValue.toFixed(2) : row.currValue.toString();
      const diffStr = row.formatAsCurrency ? row.diff.toFixed(2) : row.diff.toString();
      const pctStr = `${row.pctChange >= 0 ? '+' : ''}${row.pctChange.toFixed(2)}%`;
      csv += `"${row.category.toUpperCase()}","${row.title}","${row.statutoryRef || ''}",${prevStr},${currStr},${diffStr},"${pctStr}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `GSTR-MoM-Comparison-${selectedYm}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = `
GSTR MONTH-OVER-MONTH TAX COMPARISON
Period: ${currentPeriod.label} vs Previous Month (${prevPeriod.label})
Company: ${company?.tradeName || company?.businessName} (${currentReport.companyGstin})

1. TAX COLLECTED (OUTPUT LIABILITIES):
- Current Month: ${formatINR(summaryKpis.collected.curr)}
- Previous Month: ${formatINR(summaryKpis.collected.prev)}
- Variance: ${summaryKpis.collected.diff >= 0 ? '+' : ''}${formatINR(summaryKpis.collected.diff)} (${summaryKpis.collected.pct >= 0 ? '+' : ''}${summaryKpis.collected.pct.toFixed(1)}%)

2. TAX PAID (NET INPUT TAX CREDIT):
- Current Month: ${formatINR(summaryKpis.paid.curr)}
- Previous Month: ${formatINR(summaryKpis.paid.prev)}
- Variance: ${summaryKpis.paid.diff >= 0 ? '+' : ''}${formatINR(summaryKpis.paid.diff)} (${summaryKpis.paid.pct >= 0 ? '+' : ''}${summaryKpis.paid.pct.toFixed(1)}%)

3. NET CASH LIABILITY PAYABLE VIA CHALLAN:
- Current Month: ${formatINR(summaryKpis.cash.curr)}
- Previous Month: ${formatINR(summaryKpis.cash.prev)}
- Variance: ${summaryKpis.cash.diff >= 0 ? '+' : ''}${formatINR(summaryKpis.cash.diff)} (${summaryKpis.cash.pct >= 0 ? '+' : ''}${summaryKpis.cash.pct.toFixed(1)}%)

4. SURPLUS ITC CARRIED FORWARD:
- Current Month: ${formatINR(summaryKpis.closingItc.curr)}
- Previous Month: ${formatINR(summaryKpis.closingItc.prev)}
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Visual trend pill component
  const renderTrendBadge = (
    pctChange: number,
    favorableDirection: 'higher' | 'lower' | 'neutral',
    diff: number,
    formatAsCurrency = true
  ) => {
    const isZero = Math.abs(pctChange) < 0.01 && Math.abs(diff) < 0.01;
    if (isZero) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
          <Minus className="w-3 h-3 text-slate-500" />
          <span>0.0% (Stable)</span>
        </span>
      );
    }

    const isPositive = diff > 0;
    let isFavorable = true;

    if (favorableDirection === 'higher') {
      isFavorable = isPositive;
    } else if (favorableDirection === 'lower') {
      isFavorable = !isPositive;
    } else {
      // neutral
      isFavorable = true;
    }

    // Determine colors
    let colorClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (favorableDirection !== 'neutral') {
      if (!isFavorable) {
        colorClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      }
    } else {
      // Neutral trend color
      colorClass = isPositive
        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
        : 'bg-slate-800 text-slate-300 border-slate-700';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${colorClass}`}>
        {isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>
          {isPositive ? '+' : ''}
          {pctChange.toFixed(1)}%
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wide uppercase">
                GSTR Trend Intelligence
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">Month-over-Month (MoM)</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
              <Scale className="w-5 h-5 text-emerald-400" />
              Previous Month GSTR Tax Liability Comparison
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Compare Output Tax collected from sales against Input Tax Credit (ITC) paid on purchases and expenses, tracking monthly trends, liability set-offs, and net cash obligations.
            </p>
          </div>

          {/* Month Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Target Month Picker */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium leading-none">Compare Month</span>
                <select
                  value={selectedYm}
                  onChange={(e) => setSelectedYm(e.target.value)}
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pt-0.5"
                >
                  {availableMonths.map((ym) => {
                    const [y, m] = ym.split('-');
                    const label = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
                    return (
                      <option key={ym} value={ym} className="bg-slate-900 text-white">
                        {label} (vs {MONTH_NAMES[(parseInt(m, 10) - 2 + 12) % 12]} {parseInt(m, 10) === 1 ? parseInt(y, 10) - 1 : y})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Quick Export CSV */}
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Download detailed comparison CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Copy Summary */}
            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Copy formatted summary to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Summary'}</span>
            </button>
          </div>
        </div>

        {/* Company & Date Range Comparison Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          {/* Previous Month Card */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Previous Month Period
              </span>
              <div className="font-bold text-white text-sm">{prevPeriod.label}</div>
              <div className="text-[11px] font-mono text-slate-400">
                {prevPeriod.startDate} → {prevPeriod.endDate}
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              Baseline
            </span>
          </div>

          {/* Current Month Card */}
          <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-800/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Current Month Period
              </span>
              <div className="font-bold text-white text-sm">{currentPeriod.label}</div>
              <div className="text-[11px] font-mono text-emerald-300/80">
                {currentPeriod.startDate} → {currentPeriod.endDate}
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 font-bold">
              Active
            </span>
          </div>

          {/* Company GST Status */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between md:col-span-2 lg:col-span-1">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[180px]">{company?.tradeName || company?.businessName || 'Business Entity'}</span>
              </div>
              <div className="text-[11px] font-mono text-purple-400 font-semibold">
                GSTIN: {currentReport.companyGstin}
              </div>
              <div className="text-[11px] text-slate-400">
                Origin: {currentReport.companyStateName} ({currentReport.companyStateCode})
              </div>
            </div>
            {onNavigateToGstr3b && (
              <button
                onClick={onNavigateToGstr3b}
                className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <span>GSTR-3B</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 4 Executive KPI Trend Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Output Tax Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Gross Output Tax (Collected)</span>
            <span className="p-1 rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold font-mono text-white">
              {formatINR(summaryKpis.collected.curr)}
            </div>
            {renderTrendBadge(summaryKpis.collected.pct, 'neutral', summaryKpis.collected.diff)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Prev: {formatINR(summaryKpis.collected.prev)}</span>
            <span className={summaryKpis.collected.diff >= 0 ? 'text-blue-400' : 'text-slate-400'}>
              Δ {summaryKpis.collected.diff >= 0 ? '+' : ''}{formatINR(summaryKpis.collected.diff)}
            </span>
          </div>
        </div>

        {/* KPI 2: Net Input Tax Credit Paid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Net Input Tax (Paid / ITC)</span>
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatINR(summaryKpis.paid.curr)}
            </div>
            {renderTrendBadge(summaryKpis.paid.pct, 'higher', summaryKpis.paid.diff)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Prev: {formatINR(summaryKpis.paid.prev)}</span>
            <span className={summaryKpis.paid.diff >= 0 ? 'text-emerald-400' : 'text-slate-400'}>
              Δ {summaryKpis.paid.diff >= 0 ? '+' : ''}{formatINR(summaryKpis.paid.diff)}
            </span>
          </div>
        </div>

        {/* KPI 3: Net Cash Liability to Pay */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Cash Liability (Table 6.1)</span>
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
              <Coins className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className={`text-xl font-bold font-mono ${summaryKpis.cash.curr > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatINR(summaryKpis.cash.curr)}
            </div>
            {renderTrendBadge(summaryKpis.cash.pct, 'lower', summaryKpis.cash.diff)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Prev: {formatINR(summaryKpis.cash.prev)}</span>
            <span className={summaryKpis.cash.diff > 0 ? 'text-amber-400' : 'text-emerald-400'}>
              Δ {summaryKpis.cash.diff >= 0 ? '+' : ''}{formatINR(summaryKpis.cash.diff)}
            </span>
          </div>
        </div>

        {/* KPI 4: Surplus ITC Carried Forward */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Closing ITC Surplus</span>
            <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold font-mono text-purple-300">
              {formatINR(summaryKpis.closingItc.curr)}
            </div>
            {renderTrendBadge(summaryKpis.closingItc.pct, 'higher', summaryKpis.closingItc.diff)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Prev: {formatINR(summaryKpis.closingItc.prev)}</span>
            <span className={summaryKpis.closingItc.diff >= 0 ? 'text-purple-400' : 'text-slate-400'}>
              Δ {summaryKpis.closingItc.diff >= 0 ? '+' : ''}{formatINR(summaryKpis.closingItc.diff)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Collected vs Paid Comparison Progress & Mix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              Tax Absorption & Balance Trajectory (Collected vs Paid)
            </h3>
            <p className="text-xs text-slate-400">
              How much of your collected tax liability is absorbed by Input Tax Credit (ITC) before requiring cash payment
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500"></span>
              <span className="text-slate-300">Collected (Output)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span className="text-slate-300">Paid (ITC Claimed)</span>
            </div>
          </div>
        </div>

        {/* Side-by-side Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Previous Month Balance Bar */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Previous Month: {prevPeriod.label}</span>
              <span className="text-slate-400 font-mono text-[11px]">
                ITC Coverage: {summaryKpis.offsetRatio.prev.toFixed(1)}%
              </span>
            </div>
            
            {/* Visual ratio bar */}
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, summaryKpis.offsetRatio.prev))}%`,
                }}
                title={`ITC Covered: ${summaryKpis.offsetRatio.prev.toFixed(1)}%`}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, 100 - summaryKpis.offsetRatio.prev)}%`,
                }}
                title={`Cash / Gap: ${(100 - summaryKpis.offsetRatio.prev).toFixed(1)}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
              <div>
                <span className="text-slate-500 block">Output:</span>
                <span className="text-slate-200 font-semibold">{formatINR(summaryKpis.collected.prev)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Net ITC:</span>
                <span className="text-emerald-400 font-semibold">{formatINR(summaryKpis.paid.prev)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cash Paid:</span>
                <span className="text-amber-400 font-semibold">{formatINR(summaryKpis.cash.prev)}</span>
              </div>
            </div>
          </div>

          {/* Current Month Balance Bar */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-emerald-300">Current Month: {currentPeriod.label}</span>
              <span className="text-emerald-400 font-mono text-[11px] font-bold">
                ITC Coverage: {summaryKpis.offsetRatio.curr.toFixed(1)}%
                <span className="text-[10px] ml-1 text-slate-400">
                  ({summaryKpis.offsetRatio.diff >= 0 ? '+' : ''}{summaryKpis.offsetRatio.diff.toFixed(1)}% MoM)
                </span>
              </span>
            </div>

            {/* Visual ratio bar */}
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, summaryKpis.offsetRatio.curr))}%`,
                }}
                title={`ITC Covered: ${summaryKpis.offsetRatio.curr.toFixed(1)}%`}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, 100 - summaryKpis.offsetRatio.curr)}%`,
                }}
                title={`Cash / Gap: ${(100 - summaryKpis.offsetRatio.curr).toFixed(1)}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
              <div>
                <span className="text-slate-500 block">Output:</span>
                <span className="text-white font-semibold">{formatINR(summaryKpis.collected.curr)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Net ITC:</span>
                <span className="text-emerald-400 font-semibold">{formatINR(summaryKpis.paid.curr)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Cash Paid:</span>
                <span className="text-amber-400 font-semibold">{formatINR(summaryKpis.cash.curr)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Component-Wise Comparison Grid (IGST vs CGST vs SGST) */}
        <div className="pt-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Tax Component Breakdown (IGST vs CGST vs SGST)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            {/* IGST Box */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-slate-400 font-bold">
                <span className="text-indigo-400">Integrated Tax (IGST)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300">Inter-State</span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Collected (Sales):</span>
                <span>{formatINR(currentReport.table31.totalLiability.igst)}</span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Paid (ITC):</span>
                <span className="text-emerald-400">{formatINR(currentReport.table4.netItcAvailable.igst)}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white text-xs">
                <span>Net Cash Payable:</span>
                <span className={currentReport.table61.cashPayable.igst > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {formatINR(currentReport.table61.cashPayable.igst)}
                </span>
              </div>
            </div>

            {/* CGST Box */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-slate-400 font-bold">
                <span className="text-cyan-400">Central Tax (CGST)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">Intra-State</span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Collected (Sales):</span>
                <span>{formatINR(currentReport.table31.totalLiability.cgst)}</span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Paid (ITC):</span>
                <span className="text-emerald-400">{formatINR(currentReport.table4.netItcAvailable.cgst)}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white text-xs">
                <span>Net Cash Payable:</span>
                <span className={currentReport.table61.cashPayable.cgst > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {formatINR(currentReport.table61.cashPayable.cgst)}
                </span>
              </div>
            </div>

            {/* SGST Box */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-slate-400 font-bold">
                <span className="text-teal-400">State/UT Tax (SGST)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300">Intra-State</span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Collected (Sales):</span>
                <span>{formatINR(currentReport.table31.totalLiability.sgst)}</span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Paid (ITC):</span>
                <span className="text-emerald-400">{formatINR(currentReport.table4.netItcAvailable.sgst)}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white text-xs">
                <span>Net Cash Payable:</span>
                <span className={currentReport.table61.cashPayable.sgst > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {formatINR(currentReport.table61.cashPayable.sgst)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Month-over-Month Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Filter Tabs */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
                activeCategoryFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
              }`}
            >
              All Statutory Liabilities ({comparisonRows.length})
            </button>
            <button
              onClick={() => setActiveCategoryFilter('collected')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeCategoryFilter === 'collected'
                  ? 'bg-blue-500 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
              }`}
            >
              <span>Collected Liabilities (Sales)</span>
            </button>
            <button
              onClick={() => setActiveCategoryFilter('paid')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeCategoryFilter === 'paid'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
              }`}
            >
              <span>Paid Liabilities (Input Tax Credit)</span>
            </button>
            <button
              onClick={() => setActiveCategoryFilter('net')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeCategoryFilter === 'net'
                  ? 'bg-purple-500 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
              }`}
            >
              <span>Net Reconciliation (Cash & ITC)</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span>Comparing:</span>
            <span className="text-slate-300 font-semibold">{prevPeriod.label}</span>
            <span>vs</span>
            <span className="text-emerald-400 font-semibold">{currentPeriod.label}</span>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Statutory Line Item & Tax Head</th>
                <th className="py-3 px-3">Statutory Ref</th>
                <th className="py-3 px-4 text-right">
                  <div className="text-slate-400">Previous Month</div>
                  <div className="text-[10px] text-slate-500 font-normal lowercase">{prevPeriod.label}</div>
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="text-emerald-400 font-bold">Current Month</div>
                  <div className="text-[10px] text-emerald-400/70 font-normal lowercase">{currentPeriod.label}</div>
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="text-slate-300">Variance (Δ)</div>
                  <div className="text-[10px] text-slate-500 font-normal lowercase">curr - prev</div>
                </th>
                <th className="py-3 px-4 text-center">MoM Trend (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {displayedRows.map((row) => {
                const isPositiveDiff = row.diff > 0;
                const isZeroDiff = Math.abs(row.diff) < 0.01;

                // Row background styling
                let rowBgClass = 'hover:bg-slate-800/40 transition-colors';
                if (row.isTotalRow) {
                  rowBgClass = 'bg-slate-950/70 font-bold border-t-2 border-b-2 border-slate-800 hover:bg-slate-950';
                } else if (row.isSubtotal) {
                  rowBgClass = 'bg-slate-950/40 font-semibold hover:bg-slate-950/60';
                }

                return (
                  <tr key={row.id} className={rowBgClass}>
                    {/* Title & Description */}
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        {row.category === 'collected' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        )}
                        {row.category === 'paid' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        )}
                        {row.category === 'net' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        )}
                        <span className={`text-slate-200 ${row.isTotalRow ? 'text-white font-bold' : ''}`}>
                          {row.title}
                        </span>
                      </div>
                      {row.subtitle && (
                        <div className="text-[11px] text-slate-400 mt-0.5 pl-3.5">
                          {row.subtitle}
                        </div>
                      )}
                    </td>

                    {/* Statutory Reference Tag */}
                    <td className="py-3 px-3">
                      {row.statutoryRef && (
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-400 text-[10px] font-mono">
                          {row.statutoryRef}
                        </span>
                      )}
                    </td>

                    {/* Previous Month Value */}
                    <td className="py-3 px-4 text-right text-slate-300">
                      {row.formatAsCurrency ? formatINR(row.prevValue) : row.prevValue.toLocaleString('en-IN')}
                    </td>

                    {/* Current Month Value */}
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={row.isTotalRow ? 'text-emerald-400 text-sm' : 'text-white'}>
                        {row.formatAsCurrency ? formatINR(row.currValue) : row.currValue.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Variance (Diff) */}
                    <td className="py-3 px-4 text-right font-semibold">
                      {isZeroDiff ? (
                        <span className="text-slate-500">₹0.00</span>
                      ) : (
                        <span className={isPositiveDiff ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPositiveDiff ? '+' : ''}
                          {row.formatAsCurrency ? formatINR(row.diff) : row.diff.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>

                    {/* Trend & Change Badge */}
                    <td className="py-3 px-4 text-center">
                      {renderTrendBadge(row.pctChange, row.favorableDirection, row.diff, row.formatAsCurrency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary Note */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>All calculations strictly adhere to Indian GST Portal specifications and Rule 88A / Section 49 set-off order.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Rows: {displayedRows.length}</span>
            <span>•</span>
            <span>Generated: {new Date().toLocaleDateString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Statutory Compliance Observations & Audit Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Statutory MoM Trends & Compliance Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {complianceInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs flex gap-3 ${
                insight.type === 'success'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                  : insight.type === 'warning'
                  ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                  : 'bg-blue-950/20 border-blue-800/40 text-blue-200'
              }`}
            >
              <div className="mt-0.5">
                {insight.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : insight.type === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </div>
              <div>
                <div className="font-bold text-white text-[13px]">{insight.title}</div>
                <div className="text-slate-300 mt-0.5 leading-relaxed">{insight.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
