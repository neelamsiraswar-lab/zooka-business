// src/components/BankReconciliationView.tsx
import React, { useState, useMemo, useRef } from 'react';
import {
  Landmark,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  FileCheck2,
  RefreshCw,
  Search,
  Sparkles,
  Link2,
  Unlink,
  Plus,
  Trash2,
  Download,
  Printer,
  ChevronDown,
  Building2,
  Info,
  Calendar,
  Check,
  X,
  CreditCard,
  Receipt,
  FileText,
  Scale,
  DollarSign,
  Layers,
  ChevronRight,
  Eye,
  BadgePercent,
  CheckSquare,
} from 'lucide-react';
import {
  BankStatement,
  BankTransaction,
  CompanyProfile,
  PaymentVoucher,
  Cheque,
  Expense,
  Party,
  Invoice,
} from '../types';
import {
  parseBankStatementFile,
  autoMatchTransactions,
  BANK_PROFILES,
} from '../utils/bankReconciliation';
import { useDialog } from '../context/DialogContext';

interface BankReconciliationViewProps {
  bankStatements: BankStatement[];
  payments: PaymentVoucher[];
  cheques: Cheque[];
  expenses: Expense[];
  parties: Party[];
  invoices: Invoice[];
  company: CompanyProfile | null;
  onSaveStatement: (statementPayload: any, statementId?: number) => Promise<BankStatement | null>;
  onDeleteStatement: (statementId: number) => Promise<void>;
  onReconcileTransaction: (
    statementId: number,
    transactionId: string,
    matchData: any
  ) => Promise<void>;
  onUnreconcileTransaction: (statementId: number, transactionId: string) => Promise<void>;
  onCreatePayment: (voucher: any) => Promise<PaymentVoucher | null>;
  onCreateExpense: (expense: any) => Promise<Expense | null>;
  onRefresh: () => void;
  loading?: boolean;
}

type SubTab = 'workbench' | 'brs_statement' | 'statements_list';

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  bankStatements,
  payments,
  cheques,
  expenses,
  parties,
  invoices,
  company,
  onSaveStatement,
  onDeleteStatement,
  onReconcileTransaction,
  onUnreconcileTransaction,
  onCreatePayment,
  onCreateExpense,
  onRefresh,
  loading = false,
}) => {
  const dialog = useDialog();

  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState<SubTab>('workbench');

  // Selected bank statement
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(() => {
    return bankStatements.length > 0 ? bankStatements[0].id : null;
  });

  const activeStatement = useMemo(() => {
    if (!selectedStatementId) return bankStatements[0] || null;
    return bankStatements.find((s) => s.id === selectedStatementId) || bankStatements[0] || null;
  }, [selectedStatementId, bankStatements]);

  // Tab & Filters
  const [filterTab, setFilterTab] = useState<'all' | 'reconciled' | 'unreconciled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'deposits' | 'withdrawals'>('all');

  // File Upload Modal & State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedBankProfile, setSelectedBankProfile] = useState<string>('hdfc');
  const [uploadBankName, setUploadBankName] = useState(company?.bankName || 'HDFC Bank Ltd');
  const [uploadAccountNo, setUploadAccountNo] = useState(company?.accountNumber || '');
  const [isParsing, setIsParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Match Modal State
  const [matchingTxn, setMatchingTxn] = useState<BankTransaction | null>(null);
  const [manualMatchSearch, setManualMatchSearch] = useState('');
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null);

  // Quick Create Voucher Modal State
  const [quickCreateTxn, setQuickCreateTxn] = useState<BankTransaction | null>(null);
  const [quickCreateType, setQuickCreateType] = useState<'receipt' | 'payment' | 'expense'>('receipt');
  const [quickPartyId, setQuickPartyId] = useState<number | ''>('');
  const [quickCategory, setQuickCategory] = useState('Bank Charges');
  const [quickNotes, setQuickNotes] = useState('');

  // Currency Formatter
  const formatINR = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Print BRS Report
  const handlePrintBrs = () => {
    window.print();
  };

  // Export BRS to CSV
  const handleExportBrsCsv = () => {
    if (!activeStatement) return;
    const lines = [
      ['BANK RECONCILIATION STATEMENT (BRS)'],
      [`Company: ${company?.name || 'My Business'}`],
      [`Bank: ${activeStatement.bankName}`],
      [`Account Number: ${activeStatement.accountNumber || company?.accountNumber || 'N/A'}`],
      [`Statement Period: ${activeStatement.statementStartDate || ''} to ${activeStatement.statementEndDate || ''}`],
      [`Generated On: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      ['Particulars', 'Amount (INR)'],
      ['Balance as per Company Cash / Bank Book', brsCalculations.bookBalance.toFixed(2)],
      ['ADD: Cheques issued but not presented in bank (Outward)', brsCalculations.unpresentedTotal.toFixed(2)],
      ['LESS: Cheques deposited but not cleared by bank (Inward)', (-brsCalculations.uncollectedTotal).toFixed(2)],
      ['ADD: Direct credits in bank not entered in books', brsCalculations.unreconciledBankCredits.toFixed(2)],
      ['LESS: Direct debits in bank not entered in books', (-brsCalculations.unreconciledBankDebits).toFixed(2)],
      ['Calculated Balance as per Bank Statement', brsCalculations.calculatedStatementBalance.toFixed(2)],
      ['Actual Balance as per Bank Statement', brsCalculations.stmtClosing.toFixed(2)],
      ['Net Reconciliation Variance', brsCalculations.variance.toFixed(2)],
      [],
      ['Unpresented Cheques Detail:'],
      ['Date', 'Cheque #', 'Payee', 'Amount'],
      ...cheques
        .filter((c) => c.chequeType === 'outward' && c.status !== 'cleared' && c.status !== 'cancelled')
        .map((c) => [c.chequeDate, c.chequeNumber, c.payeeName, c.amount]),
      [],
      ['Uncollected Cheques Detail:'],
      ['Date', 'Cheque #', 'Drawee / Drawer', 'Amount'],
      ...cheques
        .filter((c) => c.chequeType === 'inward' && c.status !== 'cleared' && c.status !== 'cancelled')
        .map((c) => [c.chequeDate, c.chequeNumber, c.payeeName, c.amount]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      lines.map((e) => e.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BRS_${activeStatement.bankName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Upload
  const handleProcessFile = async (file: File) => {
    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseBankStatementFile(buffer, file.name, selectedBankProfile);

      const newStatementPayload = {
        bankName: uploadBankName || parsed.detectedBank,
        accountNumber: uploadAccountNo || null,
        fileName: file.name,
        statementStartDate: parsed.startDate,
        statementEndDate: parsed.endDate,
        openingBalance: parsed.openingBalance.toFixed(2),
        closingBalance: parsed.closingBalance.toFixed(2),
        totalCredits: parsed.totalCredits.toFixed(2),
        totalDebits: parsed.totalDebits.toFixed(2),
        transactions: parsed.transactions,
      };

      const saved = await onSaveStatement(newStatementPayload);
      if (saved) {
        setSelectedStatementId(saved.id);
        setShowUploadModal(false);
        dialog.toast.success(`Parsed and imported ${parsed.transactions.length} transactions from ${file.name}`);
      }
    } catch (err: any) {
      dialog.alert({
        title: 'Statement Import Failed',
        message: err.message || 'Please check the file format (Excel or CSV).',
        variant: 'danger',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Auto-Match All in active statement
  const handleAutoMatchAll = async () => {
    if (!activeStatement || !activeStatement.transactions) return;

    const result = autoMatchTransactions(
      activeStatement.transactions,
      payments,
      cheques,
      expenses,
      parties,
      invoices
    );

    const updatedPayload = {
      ...activeStatement,
      transactions: result.matchedTransactions,
      reconciledCount: result.stats.matched,
    };

    await onSaveStatement(updatedPayload, activeStatement.id);
    dialog.toast.success(
      `Auto-reconciliation complete: ${result.stats.matched} matched (${result.stats.unmatched} pending)`
    );
  };

  // Filtered transactions for the active statement
  const filteredTransactions = useMemo(() => {
    if (!activeStatement || !Array.isArray(activeStatement.transactions)) return [];

    return activeStatement.transactions.filter((t) => {
      if (filterTab === 'reconciled' && !t.reconciled) return false;
      if (filterTab === 'unreconciled' && t.reconciled) return false;

      if (directionFilter === 'deposits' && t.deposit <= 0) return false;
      if (directionFilter === 'withdrawals' && t.withdrawal <= 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNarration = t.narration.toLowerCase().includes(q);
        const matchRef = t.refNumber?.toLowerCase().includes(q);
        const matchAmount =
          t.deposit.toString().includes(q) || t.withdrawal.toString().includes(q);
        const matchParty = t.matchedPartyName?.toLowerCase().includes(q);
        const matchVoucher = t.matchedVoucherNumber?.toLowerCase().includes(q);
        return matchNarration || matchRef || matchAmount || matchParty || matchVoucher;
      }

      return true;
    });
  }, [activeStatement, filterTab, directionFilter, searchQuery]);

  // Bank Reconciliation Statement (BRS) calculations
  const brsCalculations = useMemo(() => {
    // 1. Balance as per Books (calculated from Payments, Receipts, Cheques, Expenses linked to bank)
    const bankReceipts = payments
      .filter((p) => p.voucherType === 'receipt' && p.accountType === 'bank')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const bankPayments = payments
      .filter((p) => p.voucherType === 'payment' && p.accountType === 'bank')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const bankExpenses = expenses
      .filter((e) => ['bank_transfer', 'cheque', 'upi', 'neft_rtgs'].includes(e.paymentMode))
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const bookBalance = bankReceipts - bankPayments - bankExpenses; // baseline book balance from bank movements

    // 2. Unpresented Cheques (Outward cheques issued in books not yet cleared in bank)
    const unpresentedCheques = cheques.filter(
      (c) => c.chequeType === 'outward' && c.status !== 'cleared' && c.status !== 'cancelled'
    );
    const unpresentedTotal = unpresentedCheques.reduce(
      (sum, c) => sum + (parseFloat(c.amount) || 0),
      0
    );

    // 3. Uncollected Cheques (Inward cheques deposited in books not yet cleared in bank)
    const uncollectedCheques = cheques.filter(
      (c) => c.chequeType === 'inward' && c.status !== 'cleared' && c.status !== 'cancelled'
    );
    const uncollectedTotal = uncollectedCheques.reduce(
      (sum, c) => sum + (parseFloat(c.amount) || 0),
      0
    );

    // 4. Statement stats
    const stmtOpening = activeStatement ? parseFloat(activeStatement.openingBalance) || 0 : 0;
    const stmtClosing = activeStatement ? parseFloat(activeStatement.closingBalance) || 0 : 0;
    const stmtCredits = activeStatement ? parseFloat(activeStatement.totalCredits) || 0 : 0;
    const stmtDebits = activeStatement ? parseFloat(activeStatement.totalDebits) || 0 : 0;

    const totalTxns = activeStatement?.transactions?.length || 0;
    const reconciledCount = activeStatement?.transactions?.filter((t) => t.reconciled).length || 0;
    const unreconciledCount = totalTxns - reconciledCount;

    // Unreconciled bank debits (e.g. Bank charges debited by bank not yet in books)
    const unreconciledBankDebits = (activeStatement?.transactions || [])
      .filter((t) => !t.reconciled && t.withdrawal > 0)
      .reduce((sum, t) => sum + t.withdrawal, 0);

    // Unreconciled bank credits (e.g. Direct customer deposit in bank not yet in books)
    const unreconciledBankCredits = (activeStatement?.transactions || [])
      .filter((t) => !t.reconciled && t.deposit > 0)
      .reduce((sum, t) => sum + t.deposit, 0);

    // Calculated Statement Balance = Book Balance + Unpresented Cheques - Uncollected Cheques + Direct Credits - Direct Debits
    const calculatedStatementBalance =
      bookBalance + unpresentedTotal - uncollectedTotal + unreconciledBankCredits - unreconciledBankDebits;

    const variance = Math.abs(stmtClosing - calculatedStatementBalance);

    return {
      bookBalance,
      unpresentedChequesCount: unpresentedCheques.length,
      unpresentedTotal,
      uncollectedChequesCount: uncollectedCheques.length,
      uncollectedTotal,
      unreconciledBankDebits,
      unreconciledBankCredits,
      stmtOpening,
      stmtClosing,
      stmtCredits,
      stmtDebits,
      totalTxns,
      reconciledCount,
      unreconciledCount,
      calculatedStatementBalance,
      variance,
      isFullyReconciled: unreconciledCount === 0 || variance < 1,
    };
  }, [activeStatement, payments, cheques, expenses]);

  // Candidates for manual match modal
  const matchCandidates = useMemo(() => {
    if (!matchingTxn) return [];

    const isDeposit = matchingTxn.deposit > 0;
    const targetAmt = isDeposit ? matchingTxn.deposit : matchingTxn.withdrawal;
    const q = manualMatchSearch.toLowerCase().trim();

    const list: Array<{
      key: string;
      type: 'receipt' | 'payment' | 'cheque' | 'expense';
      id: number;
      voucherNumber: string;
      date: string;
      partyName: string;
      amount: number;
      refNumber?: string;
      notes?: string;
      isExactAmt: boolean;
      score: number;
    }> = [];

    // Cheques
    cheques.forEach((ch) => {
      if (ch.status === 'cleared' || ch.status === 'cancelled') return;
      if (isDeposit && ch.chequeType !== 'inward') return;
      if (!isDeposit && ch.chequeType !== 'outward') return;

      const amt = parseFloat(ch.amount) || 0;
      const isExactAmt = Math.abs(amt - targetAmt) < 0.01;
      let score = isExactAmt ? 100 : 50;

      if (matchingTxn.refNumber && ch.chequeNumber.includes(matchingTxn.refNumber)) {
        score += 50;
      }
      if (ch.chequeDate === matchingTxn.date) {
        score += 20;
      }

      list.push({
        key: `cheque_${ch.id}`,
        type: 'cheque',
        id: ch.id,
        voucherNumber: `CHQ #${ch.chequeNumber}`,
        date: ch.chequeDate,
        partyName: ch.payeeName,
        amount: amt,
        refNumber: ch.chequeNumber,
        notes: ch.bankName,
        isExactAmt,
        score,
      });
    });

    // Payments
    payments.forEach((p) => {
      if (isDeposit && p.voucherType !== 'receipt') return;
      if (!isDeposit && p.voucherType !== 'payment') return;

      const amt = parseFloat(p.amount) || 0;
      const isExactAmt = Math.abs(amt - targetAmt) < 0.01;
      let score = isExactAmt ? 100 : 50;

      if (p.referenceNumber && matchingTxn.refNumber && p.referenceNumber.includes(matchingTxn.refNumber)) {
        score += 50;
      }
      if (p.date === matchingTxn.date) {
        score += 20;
      }

      list.push({
        key: `payment_${p.id}`,
        type: p.voucherType === 'receipt' ? 'receipt' : 'payment',
        id: p.id,
        voucherNumber: p.voucherNumber,
        date: p.date,
        partyName: p.partyName,
        amount: amt,
        refNumber: p.referenceNumber || undefined,
        notes: p.notes || p.paymentMode,
        isExactAmt,
        score,
      });
    });

    // Expenses (for withdrawals only)
    if (!isDeposit) {
      expenses.forEach((exp) => {
        const amt = parseFloat(exp.amount) || 0;
        const isExactAmt = Math.abs(amt - targetAmt) < 0.01;
        let score = isExactAmt ? 90 : 40;

        if (exp.date === matchingTxn.date) score += 20;

        list.push({
          key: `expense_${exp.id}`,
          type: 'expense',
          id: exp.id,
          voucherNumber: `EXP #${exp.id}`,
          date: exp.date,
          partyName: exp.vendorName || exp.category,
          amount: amt,
          refNumber: exp.referenceNumber || undefined,
          notes: exp.category,
          isExactAmt,
          score,
        });
      });
    }

    // Filter by search query if any
    return list
      .filter((item) => {
        if (!q) return true;
        return (
          item.partyName.toLowerCase().includes(q) ||
          item.voucherNumber.toLowerCase().includes(q) ||
          (item.refNumber && item.refNumber.toLowerCase().includes(q)) ||
          item.amount.toString().includes(q)
        );
      })
      .sort((a, b) => b.score - a.score);
  }, [matchingTxn, manualMatchSearch, cheques, payments, expenses]);

  // Execute manual match
  const handleConfirmManualMatch = async () => {
    if (!selectedCandidateKey || !matchingTxn || !activeStatement) return;

    const candidate = matchCandidates.find((c) => c.key === selectedCandidateKey);
    if (!candidate) return;

    await onReconcileTransaction(activeStatement.id, matchingTxn.id, {
      matchedVoucherType: candidate.type,
      matchedVoucherId: candidate.id,
      matchedVoucherNumber: candidate.voucherNumber,
      matchedPartyName: candidate.partyName,
      matchedAmount: candidate.amount,
      matchConfidence: 100,
      matchReason: 'Manually verified and matched with books',
    });

    dialog.toast.success(`Matched transaction with ${candidate.voucherNumber}`);
    setMatchingTxn(null);
    setSelectedCandidateKey(null);
  };

  // Open Quick Create Voucher Dialog
  const handleOpenQuickCreate = (txn: BankTransaction) => {
    setQuickCreateTxn(txn);
    if (txn.deposit > 0) {
      setQuickCreateType('receipt');
    } else {
      setQuickCreateType(txn.narration.toLowerCase().includes('charge') ? 'expense' : 'payment');
    }
    setQuickPartyId(parties.length > 0 ? parties[0].id : '');
    setQuickCategory('Bank Charges');
    setQuickNotes(txn.narration);
  };

  // Execute Quick Create Voucher
  const handleSaveQuickVoucher = async () => {
    if (!quickCreateTxn || !activeStatement) return;

    const targetAmt = quickCreateTxn.deposit > 0 ? quickCreateTxn.deposit : quickCreateTxn.withdrawal;

    if (quickCreateType === 'expense') {
      const newExpense = await onCreateExpense({
        category: quickCategory,
        amount: targetAmt.toFixed(2),
        date: quickCreateTxn.date,
        paymentMode: 'bank_transfer',
        referenceNumber: quickCreateTxn.refNumber || 'BANK-DIRECT',
        description: quickNotes || quickCreateTxn.narration,
        gstPaid: '0.00',
        itcEligible: false,
      });

      if (newExpense) {
        await onReconcileTransaction(activeStatement.id, quickCreateTxn.id, {
          matchedVoucherType: 'expense',
          matchedVoucherId: newExpense.id,
          matchedVoucherNumber: `EXP #${newExpense.id}`,
          matchedPartyName: newExpense.category,
          matchedAmount: targetAmt,
          matchConfidence: 100,
          matchReason: 'Auto-created & reconciled Bank Expense',
        });
        dialog.toast.success('Recorded Bank Expense & reconciled with statement');
      }
    } else {
      const selectedParty = parties.find((p) => p.id === Number(quickPartyId));
      const partyName = selectedParty ? selectedParty.name : 'Sundry Direct Account';

      const newVoucher = await onCreatePayment({
        voucherType: quickCreateType,
        date: quickCreateTxn.date,
        partyId: selectedParty ? selectedParty.id : null,
        partyName,
        partyType: quickCreateType === 'receipt' ? 'customer' : 'vendor',
        amount: targetAmt.toFixed(2),
        paymentMode: 'bank_transfer',
        accountType: 'bank',
        bankName: activeStatement.bankName,
        referenceNumber: quickCreateTxn.refNumber || 'BANK-DIRECT',
        notes: quickNotes || quickCreateTxn.narration,
      });

      if (newVoucher) {
        await onReconcileTransaction(activeStatement.id, quickCreateTxn.id, {
          matchedVoucherType: quickCreateType,
          matchedVoucherId: newVoucher.id,
          matchedVoucherNumber: newVoucher.voucherNumber,
          matchedPartyName: newVoucher.partyName,
          matchedAmount: targetAmt,
          matchConfidence: 100,
          matchReason: `Auto-created & reconciled ${quickCreateType === 'receipt' ? 'Receipt' : 'Payment'} Voucher`,
        });
        dialog.toast.success(`Created ${quickCreateType === 'receipt' ? 'Receipt' : 'Payment'} & reconciled`);
      }
    }

    setQuickCreateTxn(null);
  };

  // Delete Statement with confirmation
  const handleDeleteStatementClick = async (stmt: BankStatement) => {
    const ok = await dialog.confirm({
      title: `Delete Statement "${stmt.fileName}"?`,
      message: `Are you sure you want to delete this bank statement (${stmt.bankName})? The ${stmt.transactionsCount || 0} parsed lines will be removed. Associated payments and cheques recorded in your books will not be deleted.`,
      confirmText: 'Delete Statement',
      variant: 'danger',
      icon: 'trash',
    });

    if (ok) {
      await onDeleteStatement(stmt.id);
      dialog.toast.success('Bank statement deleted');
      if (selectedStatementId === stmt.id) {
        const remaining = bankStatements.filter((s) => s.id !== stmt.id);
        setSelectedStatementId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Primary Action Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start sm:items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Bank Statement Import & Auto-Reconciliation
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Bank Reconciliation Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={handlePrintBrs}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Print Bank Reconciliation Statement"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Print BRS</span>
          </button>

          <button
            onClick={handleExportBrsCsv}
            disabled={!activeStatement}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            title="Export BRS to CSV"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 font-bold" />
            <span>Upload Statement</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Book Balance */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Bank Balance (Books)
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {formatINR(brsCalculations.bookBalance)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>Per company ledger & vouchers</span>
          </div>
        </div>

        {/* Bank Statement Balance */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
              Bank Statement Balance
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {formatINR(brsCalculations.stmtClosing)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>Closing balance from uploaded statement</span>
          </div>
        </div>

        {/* Unpresented Cheques & Movements */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-400">
              Unpresented Cheques
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {formatINR(brsCalculations.unpresentedTotal)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-amber-400">
              {brsCalculations.unpresentedChequesCount}
            </span>{' '}
            issued cheque{brsCalculations.unpresentedChequesCount === 1 ? '' : 's'} awaiting clearing
          </div>
        </div>

        {/* BRS Variance / Status */}
        <div
          className={`bg-slate-900 p-4 rounded-xl border shadow-sm transition-colors ${
            brsCalculations.isFullyReconciled
              ? 'border-emerald-500/40 hover:border-emerald-400'
              : 'border-amber-500/40 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span
              className={`text-xs font-medium uppercase tracking-wider ${
                brsCalculations.isFullyReconciled ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              BRS Variance / Status
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                brsCalculations.isFullyReconciled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {brsCalculations.isFullyReconciled ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-lg font-bold font-mono ${
              brsCalculations.isFullyReconciled ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {brsCalculations.isFullyReconciled
              ? '₹0.00 (Balanced)'
              : formatINR(brsCalculations.variance)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {brsCalculations.isFullyReconciled
              ? 'Books and bank statement in balance'
              : `${brsCalculations.unreconciledCount} transactions require matching`}
          </div>
        </div>
      </div>

      {/* 3. Navigation Chip Switcher */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-2 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('workbench')}
            className={`group px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 border ${
              activeTab === 'workbench'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 font-bold'
                : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <Landmark
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'workbench' ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400'
              }`}
            />
            <span>Reconciliation Workbench</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                activeTab === 'workbench'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {activeStatement?.transactions?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('brs_statement')}
            className={`group px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 border ${
              activeTab === 'brs_statement'
                ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/25 font-bold'
                : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <Scale
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'brs_statement' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
              }`}
            />
            <span>BRS Statement (Formal)</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                activeTab === 'brs_statement'
                  ? 'bg-indigo-950/40 text-white'
                  : brsCalculations.isFullyReconciled
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {brsCalculations.isFullyReconciled ? 'Balanced' : 'Diff'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('statements_list')}
            className={`group px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 border ${
              activeTab === 'statements_list'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 font-bold'
                : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <FileSpreadsheet
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'statements_list'
                  ? 'text-slate-950'
                  : 'text-slate-400 group-hover:text-emerald-400'
              }`}
            />
            <span>Imported Statements</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                activeTab === 'statements_list'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {bankStatements.length}
            </span>
          </button>
        </div>

        {/* Auto-Match All quick button in tab bar */}
        {activeTab === 'workbench' && (
          <button
            onClick={handleAutoMatchAll}
            disabled={loading || !activeStatement || brsCalculations.unreconciledCount === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Match All</span>
          </button>
        )}
      </div>

      {/* 4. Statement Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Active Statement:
          </label>
          {bankStatements.length > 0 ? (
            <div className="relative">
              <select
                value={activeStatement?.id || ''}
                onChange={(e) => setSelectedStatementId(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-slate-700 shadow-xs cursor-pointer"
              >
                {bankStatements.map((stmt) => (
                  <option key={stmt.id} value={stmt.id}>
                    {stmt.bankName} - {stmt.fileName} ({stmt.transactionsCount || 0} txns,{' '}
                    {stmt.reconciledCount || 0} reconciled)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">No bank statements uploaded yet</span>
          )}

          {activeStatement && (
            <button
              onClick={() => handleDeleteStatementClick(activeStatement)}
              className="text-xs text-slate-400 hover:text-rose-400 inline-flex items-center gap-1 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="Delete active statement"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>

        {activeStatement && (
          <div className="text-xs text-slate-400 font-medium">
            Period:{' '}
            <span className="text-slate-300 font-mono">
              {activeStatement.statementStartDate || 'N/A'}
            </span>{' '}
            to{' '}
            <span className="text-slate-300 font-mono">
              {activeStatement.statementEndDate || 'N/A'}
            </span>
          </div>
        )}
      </div>

      {/* 5. SUB-VIEW: WORKBENCH (Interactive Statement Table) */}
      {activeTab === 'workbench' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Status Tabs Filter Pills */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-slate-800 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({activeStatement?.transactions?.length || 0})
              </button>
              <button
                onClick={() => setFilterTab('reconciled')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  filterTab === 'reconciled'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Check className="w-3 h-3 text-emerald-400" />
                Reconciled ({brsCalculations.reconciledCount})
              </button>
              <button
                onClick={() => setFilterTab('unreconciled')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  filterTab === 'unreconciled'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertCircle className="w-3 h-3 text-amber-400" />
                Unmatched ({brsCalculations.unreconciledCount})
              </button>
            </div>

            {/* Search & Movement Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search narration, ref, party..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs text-white bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-700 placeholder:text-slate-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white bg-slate-800 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={directionFilter}
                onChange={(e: any) => setDirectionFilter(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 font-medium text-slate-300 focus:outline-none focus:border-slate-700 cursor-pointer"
              >
                <option value="all">All Movements</option>
                <option value="deposits">Deposits (Credits)</option>
                <option value="withdrawals">Withdrawals (Debits)</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">Date</th>
                    <th className="py-3 px-4 min-w-[260px]">Narration / Bank Description</th>
                    <th className="py-3 px-4 w-32">Ref / Cheque #</th>
                    <th className="py-3 px-4 w-32 text-right">Debit (Withdrawal)</th>
                    <th className="py-3 px-4 w-32 text-right">Credit (Deposit)</th>
                    <th className="py-3 px-4 min-w-[230px]">Matched Voucher / Status</th>
                    <th className="py-3 px-4 w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400">
                        <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 mb-2.5" />
                        <p className="font-semibold text-slate-300">No bank transactions to display</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Upload a bank statement in Excel or CSV format using the button above to begin automatic and manual reconciliation.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((txn) => {
                      const isDeposit = txn.deposit > 0;
                      return (
                        <tr
                          key={txn.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            txn.reconciled ? 'bg-emerald-500/[0.02]' : ''
                          }`}
                        >
                          {/* Date */}
                          <td className="py-3 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {txn.date}
                            </div>
                          </td>

                          {/* Narration */}
                          <td className="py-3 px-4 text-xs font-medium text-white">
                            <div className="line-clamp-2 leading-relaxed">{txn.narration}</div>
                            {txn.balance !== undefined && (
                              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                Run Bal: {formatINR(txn.balance)}
                              </div>
                            )}
                          </td>

                          {/* Reference / Cheque */}
                          <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                            {txn.refNumber ? (
                              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-300 font-semibold">
                                {txn.refNumber}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Debit (Withdrawal) */}
                          <td className="py-3 px-4 text-right font-mono text-xs font-semibold whitespace-nowrap text-rose-400">
                            {txn.withdrawal > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
                                {formatINR(txn.withdrawal)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Credit (Deposit) */}
                          <td className="py-3 px-4 text-right font-mono text-xs font-semibold whitespace-nowrap text-emerald-400">
                            {txn.deposit > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                                {formatINR(txn.deposit)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Matched Voucher / Status */}
                          <td className="py-3 px-4 text-xs">
                            {txn.reconciled ? (
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span className="truncate max-w-[190px]">
                                    {txn.matchedVoucherNumber || txn.matchedVoucherType?.toUpperCase()}
                                    {txn.matchedPartyName ? ` (${txn.matchedPartyName})` : ''}
                                  </span>
                                </div>
                                {txn.matchConfidence && (
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <span className="font-semibold text-emerald-400">
                                      {txn.matchConfidence}% confidence
                                    </span>
                                    {txn.matchReason && `• ${txn.matchReason}`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                Unreconciled
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap text-xs">
                            {txn.reconciled ? (
                              <button
                                onClick={() => onUnreconcileTransaction(activeStatement.id, txn.id)}
                                className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                                title="Unlink and return to unreconciled status"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                                <span>Unlink</span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setMatchingTxn(txn);
                                    setSelectedCandidateKey(null);
                                    setManualMatchSearch('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl transition-colors cursor-pointer"
                                  title="Link to existing voucher or cheque"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                  <span>Match</span>
                                </button>

                                <button
                                  onClick={() => handleOpenQuickCreate(txn)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-colors cursor-pointer"
                                  title="Create new voucher and reconcile instantly"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                Showing <span className="font-semibold text-white">{filteredTransactions.length}</span> of{' '}
                <span className="font-semibold text-white">{activeStatement?.transactions?.length || 0}</span>{' '}
                transactions
              </div>

              <div className="flex items-center gap-5 font-mono font-semibold flex-wrap">
                <div className="text-rose-400">
                  Debits: <span>{formatINR(brsCalculations.stmtDebits)}</span>
                </div>
                <div className="text-emerald-400">
                  Credits: <span>{formatINR(brsCalculations.stmtCredits)}</span>
                </div>
                <div className="text-white">
                  Closing Bal: <span>{formatINR(brsCalculations.stmtClosing)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-VIEW: BRS STATEMENT (Formal Schedule III Format) */}
      {activeTab === 'brs_statement' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
            {/* Formal Statement Header */}
            <div className="text-center border-b border-slate-800 pb-6 mb-6">
              <h2 className="text-xl font-bold tracking-tight text-white uppercase">
                {company?.name || 'Company Name'}
              </h2>
              <div className="text-sm font-semibold text-emerald-400 mt-1 uppercase tracking-wider">
                Bank Reconciliation Statement (BRS)
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-4 flex-wrap">
                <span>Bank: <strong className="text-white">{activeStatement?.bankName || company?.bankName || 'HDFC Bank'}</strong></span>
                <span>Account No: <strong className="text-white">{activeStatement?.accountNumber || company?.accountNumber || 'Current A/c'}</strong></span>
                <span>
                  Statement Period: <strong className="text-white">{activeStatement?.statementStartDate || 'N/A'}</strong> to{' '}
                  <strong className="text-white">{activeStatement?.statementEndDate || 'N/A'}</strong>
                </span>
              </div>
            </div>

            {/* Reconciliation Rows */}
            <div className="space-y-3 font-mono text-sm max-w-3xl mx-auto">
              {/* Row 1: Balance as per Books */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-sans font-medium text-slate-200">
                  Balance as per Cash / Bank Book (Ledger)
                </span>
                <span className="font-bold text-white text-base">
                  {formatINR(brsCalculations.bookBalance)}
                </span>
              </div>

              {/* Row 2: Add: Cheques issued but not presented */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-sans">
                    <span className="font-bold text-emerald-400 mr-2">ADD:</span>
                    <span className="text-slate-200">
                      Cheques issued to suppliers but not yet presented in bank (Outward cheques)
                    </span>
                    <span className="text-xs font-sans text-slate-400 block mt-0.5">
                      ({brsCalculations.unpresentedChequesCount} cheques awaiting clearance)
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400 text-base">
                    +{formatINR(brsCalculations.unpresentedTotal)}
                  </span>
                </div>
              </div>

              {/* Row 3: Less: Cheques deposited but not cleared */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-sans">
                    <span className="font-bold text-rose-400 mr-2">LESS:</span>
                    <span className="text-slate-200">
                      Cheques deposited in bank but not yet credited / cleared by bank (Inward cheques)
                    </span>
                    <span className="text-xs font-sans text-slate-400 block mt-0.5">
                      ({brsCalculations.uncollectedChequesCount} cheques in clearing)
                    </span>
                  </div>
                  <span className="font-bold text-rose-400 text-base">
                    -{formatINR(brsCalculations.uncollectedTotal)}
                  </span>
                </div>
              </div>

              {/* Row 4: Add: Direct bank credits */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-sans">
                    <span className="font-bold text-emerald-400 mr-2">ADD:</span>
                    <span className="text-slate-200">
                      Direct credits in bank not yet recorded in books (Customer transfers, interest)
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400 text-base">
                    +{formatINR(brsCalculations.unreconciledBankCredits)}
                  </span>
                </div>
              </div>

              {/* Row 5: Less: Direct bank debits */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="font-sans">
                    <span className="font-bold text-rose-400 mr-2">LESS:</span>
                    <span className="text-slate-200">
                      Direct debits / charges in bank not yet recorded in books (SMS fees, bank charges)
                    </span>
                  </div>
                  <span className="font-bold text-rose-400 text-base">
                    -{formatINR(brsCalculations.unreconciledBankDebits)}
                  </span>
                </div>
              </div>

              {/* Calculated Balance as per Bank Statement */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/40 mt-4">
                <span className="font-sans font-semibold text-indigo-200">
                  Calculated Balance as per Bank Statement
                </span>
                <span className="font-bold text-indigo-300 text-lg">
                  {formatINR(brsCalculations.calculatedStatementBalance)}
                </span>
              </div>

              {/* Actual Balance as per Bank Statement */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                <span className="font-sans font-semibold text-emerald-200">
                  Actual Balance as per Bank Statement
                </span>
                <span className="font-bold text-emerald-400 text-lg">
                  {formatINR(brsCalculations.stmtClosing)}
                </span>
              </div>

              {/* Variance / Verification result */}
              <div
                className={`flex items-center justify-between p-4 rounded-xl border mt-2 ${
                  brsCalculations.isFullyReconciled
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 font-sans">
                  {brsCalculations.isFullyReconciled ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {brsCalculations.isFullyReconciled
                        ? 'Reconciliation Status: Verified & Balanced'
                        : 'Reconciliation Status: Unreconciled Variance'}
                    </span>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">
                      {brsCalculations.isFullyReconciled
                        ? 'All ledger entries and bank movements are fully aligned with zero discrepancy.'
                        : 'Review pending unreconciled transactions on the workbench to achieve zero variance.'}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-lg font-mono">
                  {formatINR(brsCalculations.variance)}
                </span>
              </div>
            </div>

            {/* Signature & Certification Footer for Print / Audit */}
            <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-2 md:grid-cols-3 gap-8 text-center text-xs text-slate-400">
              <div>
                <div className="h-12 border-b border-dashed border-slate-700 mb-2" />
                <span>Prepared By (Accountant)</span>
              </div>
              <div>
                <div className="h-12 border-b border-dashed border-slate-700 mb-2" />
                <span>Verified By (Finance Manager)</span>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="h-12 border-b border-dashed border-slate-700 mb-2" />
                <span>Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. SUB-VIEW: STATEMENTS LIST */}
      {activeTab === 'statements_list' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Imported Bank Statements Repository
              </h3>
              <div className="flex items-center gap-2">
                {bankStatements.length > 0 && (
                  <button
                    onClick={async () => {
                      const confirmed = await dialog.confirm({
                        title: 'Clear All Bank Statements?',
                        message: `This will permanently delete all ${bankStatements.length} statement records and their parsed transactions.`,
                        confirmText: 'Yes, Clear All Statements',
                        variant: 'danger',
                        icon: 'trash',
                      });
                      if (confirmed) {
                        for (const stmt of bankStatements) {
                          await onDeleteStatement(stmt.id);
                        }
                        dialog.toast.success('All bank statements cleared successfully');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Statements</span>
                  </button>
                )}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 font-bold" />
                  <span>Import Statement</span>
                </button>
              </div>
            </div>

            {bankStatements.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <UploadCloud className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-white">No statements uploaded yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload an Excel or CSV statement from HDFC, SBI, ICICI, or Axis Bank to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankStatements.map((stmt) => {
                  const isSelected = activeStatement?.id === stmt.id;
                  const total = stmt.transactionsCount || 0;
                  const reconciled = stmt.reconciledCount || 0;
                  const pct = total > 0 ? Math.round((reconciled / total) * 100) : 0;

                  return (
                    <div
                      key={stmt.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-slate-950 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{stmt.bankName}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{stmt.fileName}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedStatementId(stmt.id);
                              setActiveTab('workbench');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            onClick={() => handleDeleteStatementClick(stmt)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete statement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80 font-mono">
                        <div>
                          Opening: <span className="text-white">{formatINR(stmt.openingBalance)}</span>
                        </div>
                        <div>
                          Closing: <span className="text-white">{formatINR(stmt.closingBalance)}</span>
                        </div>
                        <div>
                          Credits: <span className="text-emerald-400">+{formatINR(stmt.totalCredits)}</span>
                        </div>
                        <div>
                          Debits: <span className="text-rose-400">-{formatINR(stmt.totalDebits)}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400">Reconciliation Progress</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {reconciled}/{total} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Upload Statement Modal (Dark Slate Theme) */}
      {/* ------------------------------------------------------------- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Bank Statement</h3>
                  <p className="text-xs text-slate-400">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV statement formats
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bank Template Preset
                  </label>
                  <select
                    value={selectedBankProfile}
                    onChange={(e) => {
                      setSelectedBankProfile(e.target.value);
                      const profile = BANK_PROFILES.find((p) => p.id === e.target.value);
                      if (profile) setUploadBankName(profile.bankName);
                    }}
                    className="w-full text-xs border border-slate-800 rounded-xl px-3 py-2 bg-slate-950 text-white focus:outline-none focus:border-slate-700"
                  >
                    {BANK_PROFILES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bank Account Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadAccountNo}
                    onChange={(e) => setUploadAccountNo(e.target.value)}
                    placeholder="e.g. 50200012345678"
                    className="w-full text-xs border border-slate-800 rounded-xl px-3 py-2 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/50 hover:bg-slate-950'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessFile(e.target.files[0]);
                    }
                  }}
                />
                <FileSpreadsheet className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                <p className="text-sm font-semibold text-white">
                  Click to browse or drag & drop bank statement file
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: Microsoft Excel (.xlsx, .xls), Comma-Separated Values (.csv)
                </p>
                {isParsing && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-emerald-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Parsing bank columns and transactions...
                  </div>
                )}
              </div>

              {/* Statement import guidelines tip */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Statement Import Tip:</span>{' '}
                  Ensure your Excel (.xlsx, .xls) or CSV file includes transaction date, narration/description, reference/cheque number, and withdrawal/deposit amount columns.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Manual Match Modal (Dark Slate Theme) */}
      {/* ------------------------------------------------------------- */}
      {matchingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 text-white flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-indigo-400" />
                  Match Bank Transaction to Books
                </h3>
                <p className="text-xs text-slate-400">
                  Select an existing payment voucher, receipt, cheque, or expense to reconcile with this bank entry
                </p>
              </div>
              <button
                onClick={() => setMatchingTxn(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Bank Transaction Card */}
            <div className="my-4 p-3.5 bg-slate-950 border border-slate-800 rounded-xl shrink-0">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Bank Statement Entry:
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-white">{matchingTxn.narration}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Date: <span className="font-mono text-slate-300">{matchingTxn.date}</span>
                    {matchingTxn.refNumber && (
                      <span>
                        {' '}
                        • Ref: <span className="font-mono font-semibold text-slate-300">{matchingTxn.refNumber}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-base font-bold font-mono ${
                      matchingTxn.deposit > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {matchingTxn.deposit > 0 ? '+' : '-'}
                    {formatINR(matchingTxn.deposit > 0 ? matchingTxn.deposit : matchingTxn.withdrawal)}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    {matchingTxn.deposit > 0 ? 'Credit (Deposit)' : 'Debit (Withdrawal)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Search */}
            <div className="mb-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualMatchSearch}
                  onChange={(e) => setManualMatchSearch(e.target.value)}
                  placeholder="Filter by voucher number, party name, amount..."
                  className="w-full pl-9 pr-3 py-2 text-xs text-white bg-slate-950 border border-slate-800 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Candidate List */}
            <div className="overflow-y-auto space-y-2 pr-1 grow min-h-48">
              {matchCandidates.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-300">No matching book records found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    You can close this dialog and use "Add" to create a new voucher for this bank entry instantly.
                  </p>
                </div>
              ) : (
                matchCandidates.map((candidate) => {
                  const isSelected = selectedCandidateKey === candidate.key;
                  return (
                    <div
                      key={candidate.key}
                      onClick={() => setSelectedCandidateKey(candidate.key)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500 text-white'
                          : 'border-slate-800 bg-slate-950/60 hover:border-indigo-500/40 hover:bg-slate-950 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500 text-slate-950'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {candidate.voucherNumber}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 rounded font-semibold bg-slate-800 text-slate-300 uppercase">
                              {candidate.type}
                            </span>
                            {candidate.isExactAmt && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                Exact Amount
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {candidate.partyName} • Date: {candidate.date}
                            {candidate.refNumber && ` • Ref: ${candidate.refNumber}`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-white">
                          {formatINR(candidate.amount)}
                        </div>
                        <div className="text-[10px] text-indigo-400">Match score: {candidate.score}%</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0 mt-4">
              <button
                type="button"
                onClick={() => setMatchingTxn(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!selectedCandidateKey}
                onClick={handleConfirmManualMatch}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Reconcile Match</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Quick Create Voucher & Reconcile Modal (Dark Slate Theme) */}
      {/* ------------------------------------------------------------- */}
      {quickCreateTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Voucher & Reconcile</h3>
                  <p className="text-xs text-slate-400">
                    Record this transaction directly into books and reconcile simultaneously
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickCreateTxn(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="font-semibold text-slate-400 uppercase tracking-wider mb-1 text-[11px]">
                  Bank Line Item
                </div>
                <div className="font-bold text-white">{quickCreateTxn.narration}</div>
                <div className="flex items-center justify-between mt-1 text-slate-400">
                  <span>Date: {quickCreateTxn.date}</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatINR(quickCreateTxn.deposit > 0 ? quickCreateTxn.deposit : quickCreateTxn.withdrawal)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Voucher Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCreateType('receipt')}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                      quickCreateType === 'receipt'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-xs'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Receipt (Money In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCreateType('payment')}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                      quickCreateType === 'payment'
                        ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-xs'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Payment (Money Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCreateType('expense')}
                    className={`py-2 px-3 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                      quickCreateType === 'expense'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-xs'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    Bank Charge / Expense
                  </button>
                </div>
              </div>

              {quickCreateType === 'expense' ? (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Expense Category</label>
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full border border-slate-800 rounded-xl px-3 py-2 bg-slate-950 text-white focus:outline-none focus:border-slate-700 cursor-pointer"
                  >
                    <option value="Bank Charges">Bank Charges & SMS Alert Fees</option>
                    <option value="Interest Expense">Interest & Loan Charges</option>
                    <option value="Utilities">Utilities & Office Bill</option>
                    <option value="Repairs">Repairs & Maintenance</option>
                    <option value="Other">Other Operating Expense</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Select Party ({quickCreateType === 'receipt' ? 'Customer' : 'Vendor'})
                  </label>
                  <select
                    value={quickPartyId}
                    onChange={(e) => setQuickPartyId(Number(e.target.value))}
                    className="w-full border border-slate-800 rounded-xl px-3 py-2 bg-slate-950 text-white focus:outline-none focus:border-slate-700 cursor-pointer"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.partyType === 'customer' ? 'Customer' : 'Vendor'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Narration / Remarks</label>
                <input
                  type="text"
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  className="w-full border border-slate-800 rounded-xl px-3 py-2 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setQuickCreateTxn(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickVoucher}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Reconcile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
