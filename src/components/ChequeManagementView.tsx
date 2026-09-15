import React, { useState, useMemo } from 'react';
import {
  Cheque,
  ChequeBook,
  Party,
  Invoice,
  PaymentVoucher,
  CompanyProfile,
} from '../types';
import { numberToIndianWords } from '../lib/numberToWords';
import { useDialog } from '../context/DialogContext';
import { SkeletonMetricGrid, SkeletonTable } from './SkeletonLoaders';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Printer,
  Calendar,
  Building2,
  Eye,
  Trash2,
  Edit3,
  Layers,
  FileCheck2,
  ChevronRight,
  ShieldCheck,
  Download,
  DollarSign,
  Info,
  Check,
  Ban,
} from 'lucide-react';

interface ChequeManagementViewProps {
  cheques: Cheque[];
  chequeBooks: ChequeBook[];
  parties: Party[];
  invoices: Invoice[];
  payments: PaymentVoucher[];
  company: CompanyProfile | null;
  onSaveCheque: (chequeData: Partial<Cheque>, chequeId?: number) => Promise<void>;
  onUpdateChequeStatus: (chequeId: number, statusData: any) => Promise<void>;
  onDeleteCheque: (chequeId: number) => Promise<void>;
  onSaveChequeBook: (bookData: Partial<ChequeBook>, bookId?: number) => Promise<void>;
  onDeleteChequeBook: (bookId: number) => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
  onNavigateToInvoice?: (invoiceId: number) => void;
  onNavigateToParty?: (partyId: number) => void;
}

type TabMode = 'register' | 'pdc' | 'cheque_books' | 'preview';
type ChequeTypeFilter = 'all' | 'inward' | 'outward';
type ChequeStatusFilter = 'all' | 'in_hand' | 'deposited' | 'cleared' | 'bounced' | 'cancelled';

const POPULAR_BANKS = [
  'State Bank of India',
  'HDFC Bank Ltd',
  'ICICI Bank Ltd',
  'Axis Bank Ltd',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'IndusInd Bank',
  'Federal Bank',
  'IDFC First Bank',
  'Yes Bank',
];

const BOUNCE_REASONS = [
  'Funds Insufficient (Return Code: 01)',
  'Signature Differs / Incomplete (Return Code: 02)',
  'Account Closed / Transferred (Return Code: 04)',
  'Payment Stopped by Drawer (Return Code: 05)',
  'Refer to Drawer (Return Code: 06)',
  'Cheque Stale / Post-Dated (Return Code: 07)',
  'Instrument Outdated / Invalid Date (Return Code: 08)',
  'Amount in Words & Figures Differ (Return Code: 10)',
  'Alteration on Instrument without Initials (Return Code: 12)',
  'Drawer Signature Not on File (Return Code: 15)',
];

export const ChequeManagementView: React.FC<ChequeManagementViewProps> = ({
  cheques,
  chequeBooks,
  parties,
  invoices,
  payments,
  company,
  onSaveCheque,
  onUpdateChequeStatus,
  onDeleteCheque,
  onSaveChequeBook,
  onDeleteChequeBook,
  onRefresh,
  loading,
  onNavigateToInvoice,
  onNavigateToParty,
}) => {
  const dialog = useDialog();

  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<TabMode>('register');
  const [typeFilter, setTypeFilter] = useState<ChequeTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ChequeStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'pdc_only'>('all');

  // Modals state
  const [isChequeModalOpen, setIsChequeModalOpen] = useState(false);
  const [editingCheque, setEditingCheque] = useState<Cheque | null>(null);
  const [defaultChequeType, setDefaultChequeType] = useState<'inward' | 'outward'>('inward');

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusActionCheque, setStatusActionCheque] = useState<Cheque | null>(null);
  const [targetStatus, setTargetStatus] = useState<'deposited' | 'cleared' | 'bounced' | 'cancelled'>('cleared');

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<ChequeBook | null>(null);

  const [previewCheque, setPreviewCheque] = useState<Cheque | null>(null);
  const [selectedBookForLeaves, setSelectedBookForLeaves] = useState<ChequeBook | null>(null);

  // Form State for Cheque creation/editing
  const [chequeForm, setChequeForm] = useState<{
    chequeType: 'inward' | 'outward';
    chequeNumber: string;
    chequeDate: string;
    amount: string;
    partyId: string;
    invoiceId: string;
    payeeName: string;
    bankName: string;
    branchName: string;
    ifscCode: string;
    depositBank: string;
    chequeBookId: string;
    isPdc: boolean;
    isAccountPayee: boolean;
    status: 'in_hand' | 'deposited' | 'cleared' | 'bounced' | 'cancelled';
    referenceNumber: string;
    remarks: string;
  }>({
    chequeType: 'inward',
    chequeNumber: '',
    chequeDate: new Date().toISOString().split('T')[0],
    amount: '',
    partyId: '',
    invoiceId: '',
    payeeName: '',
    bankName: 'HDFC Bank Ltd',
    branchName: '',
    ifscCode: '',
    depositBank: company?.bankName ? `${company.bankName} - Current A/c` : 'Main Bank Account',
    chequeBookId: '',
    isPdc: false,
    isAccountPayee: true,
    status: 'in_hand',
    referenceNumber: '',
    remarks: '',
  });

  // Form State for Status Update Modal
  const [statusForm, setStatusForm] = useState<{
    depositBank: string;
    depositDate: string;
    clearanceDate: string;
    bounceDate: string;
    bounceReason: string;
    bounceCharges: string;
    remarks: string;
  }>({
    depositBank: '',
    depositDate: new Date().toISOString().split('T')[0],
    clearanceDate: new Date().toISOString().split('T')[0],
    bounceDate: new Date().toISOString().split('T')[0],
    bounceReason: BOUNCE_REASONS[0],
    bounceCharges: '354.00', // Standard Indian bank bounce charge + 18% GST
    remarks: '',
  });

  // Form State for Cheque Book Modal
  const [bookForm, setBookForm] = useState<{
    bankName: string;
    accountNumber: string;
    bookName: string;
    seriesPrefix: string;
    startNumber: string;
    endNumber: string;
    totalLeaves: string;
  }>({
    bankName: company?.bankName || 'State Bank of India',
    accountNumber: company?.accountNumber || '',
    bookName: '',
    seriesPrefix: '',
    startNumber: '100101',
    endNumber: '100150',
    totalLeaves: '50',
  });

  // Format currency in Indian numbering system
  const formatINR = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to check if a cheque is stale (> 90 days from date) or PDC (future date)
  const getChequeDateStatus = (dateStr: string) => {
    if (!dateStr) return { type: 'normal', text: '' };
    const chqDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    chqDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((chqDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return {
        type: 'pdc',
        text: `PDC due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
        days: diffDays,
      };
    } else if (diffDays === 0) {
      return {
        type: 'today',
        text: 'Due Today',
        days: 0,
      };
    } else if (Math.abs(diffDays) > 90) {
      return {
        type: 'stale',
        text: `Stale Cheque (>90d old)`,
        days: diffDays,
      };
    } else {
      return {
        type: 'current',
        text: `${Math.abs(diffDays)} days ago`,
        days: diffDays,
      };
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    let inHandCount = 0;
    let inHandAmount = 0;
    let pdcCount = 0;
    let pdcAmount = 0;
    let depositedCount = 0;
    let depositedAmount = 0;
    let clearedCount = 0;
    let clearedAmount = 0;
    let bouncedCount = 0;
    let bouncedAmount = 0;
    let totalBounceCharges = 0;
    let inwardTotal = 0;
    let outwardTotal = 0;

    cheques.forEach((c) => {
      const amt = parseFloat(c.amount) || 0;
      const isFuture = c.chequeDate > todayStr || c.isPdc;

      if (c.chequeType === 'inward') {
        inwardTotal += amt;
      } else {
        outwardTotal += amt;
      }

      if (c.status === 'in_hand') {
        inHandCount++;
        inHandAmount += amt;
      } else if (c.status === 'deposited') {
        depositedCount++;
        depositedAmount += amt;
      } else if (c.status === 'cleared') {
        clearedCount++;
        clearedAmount += amt;
      } else if (c.status === 'bounced') {
        bouncedCount++;
        bouncedAmount += amt;
        totalBounceCharges += parseFloat(c.bounceCharges || '0') || 0;
      }

      if (isFuture && c.status !== 'cleared' && c.status !== 'cancelled') {
        pdcCount++;
        pdcAmount += amt;
      }
    });

    return {
      inHandCount,
      inHandAmount,
      pdcCount,
      pdcAmount,
      depositedCount,
      depositedAmount,
      clearedCount,
      clearedAmount,
      bouncedCount,
      bouncedAmount,
      totalBounceCharges,
      inwardTotal,
      outwardTotal,
      totalCount: cheques.length,
    };
  }, [cheques, todayStr]);

  // Filtered Cheques list
  const filteredCheques = useMemo(() => {
    return cheques.filter((c) => {
      // Type filter
      if (typeFilter !== 'all' && c.chequeType !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      // Bank filter
      if (selectedBankFilter !== 'all' && c.bankName !== selectedBankFilter && c.depositBank !== selectedBankFilter) {
        return false;
      }

      // Date / PDC filter
      if (activeTab === 'pdc' || dateRange === 'pdc_only') {
        const isFuture = c.chequeDate > todayStr || c.isPdc;
        if (!isFuture) return false;
      } else if (dateRange === 'today') {
        if (c.chequeDate !== todayStr) return false;
      } else if (dateRange === 'this_month') {
        const currentMonth = todayStr.substring(0, 7);
        if (!c.chequeDate.startsWith(currentMonth)) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = (c.chequeNumber || '').toLowerCase().includes(q);
        const payeeMatch = (c.payeeName || '').toLowerCase().includes(q);
        const bankMatch = (c.bankName || '').toLowerCase().includes(q);
        const remarksMatch = (c.remarks || '').toLowerCase().includes(q);
        const refMatch = (c.referenceNumber || '').toLowerCase().includes(q);
        if (!numMatch && !payeeMatch && !bankMatch && !remarksMatch && !refMatch) {
          return false;
        }
      }

      return true;
    });
  }, [cheques, typeFilter, statusFilter, selectedBankFilter, activeTab, dateRange, searchQuery, todayStr]);

  // Open New Cheque Modal
  const handleOpenAddCheque = (type: 'inward' | 'outward' = 'inward') => {
    setDefaultChequeType(type);
    setEditingCheque(null);

    let nextChequeNum = '';
    let defaultBookId = '';
    if (type === 'outward' && chequeBooks.length > 0) {
      const activeBook = chequeBooks.find((b) => b.status === 'active' && b.usedLeaves < b.totalLeaves) || chequeBooks[0];
      if (activeBook) {
        defaultBookId = String(activeBook.id);
        const nextNum = activeBook.startNumber + (activeBook.usedLeaves || 0);
        nextChequeNum = String(nextNum).padStart(6, '0');
      }
    }

    setChequeForm({
      chequeType: type,
      chequeNumber: nextChequeNum,
      chequeDate: new Date().toISOString().split('T')[0],
      amount: '',
      partyId: '',
      invoiceId: '',
      payeeName: '',
      bankName: type === 'outward' ? (company?.bankName || 'State Bank of India') : 'HDFC Bank Ltd',
      branchName: '',
      ifscCode: type === 'outward' ? (company?.ifscCode || '') : '',
      depositBank: company?.bankName ? `${company.bankName} - Current A/c` : 'Main Bank Account',
      chequeBookId: defaultBookId,
      isPdc: false,
      isAccountPayee: true,
      status: 'in_hand',
      referenceNumber: '',
      remarks: '',
    });
    setIsChequeModalOpen(true);
  };

  // Open Edit Cheque Modal
  const handleOpenEditCheque = (cheque: Cheque) => {
    setEditingCheque(cheque);
    setChequeForm({
      chequeType: cheque.chequeType,
      chequeNumber: cheque.chequeNumber,
      chequeDate: cheque.chequeDate,
      amount: cheque.amount,
      partyId: cheque.partyId ? String(cheque.partyId) : '',
      invoiceId: cheque.invoiceId ? String(cheque.invoiceId) : '',
      payeeName: cheque.payeeName,
      bankName: cheque.bankName,
      branchName: cheque.branchName || '',
      ifscCode: cheque.ifscCode || '',
      depositBank: cheque.depositBank || '',
      chequeBookId: cheque.chequeBookId ? String(cheque.chequeBookId) : '',
      isPdc: cheque.isPdc,
      isAccountPayee: cheque.isAccountPayee,
      status: cheque.status as any,
      referenceNumber: cheque.referenceNumber || '',
      remarks: cheque.remarks || '',
    });
    setIsChequeModalOpen(true);
  };

  // Save Cheque (Create or Update)
  const handleSubmitCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chequeForm.chequeNumber.trim()) {
      dialog.toast.error('Please enter a valid Cheque Number');
      return;
    }
    if (!chequeForm.payeeName.trim()) {
      dialog.toast.error('Please enter Payee / Party Name');
      return;
    }
    const amt = parseFloat(chequeForm.amount);
    if (isNaN(amt) || amt <= 0) {
      dialog.toast.error('Please enter a valid amount greater than ₹0');
      return;
    }

    try {
      await onSaveCheque(
        {
          ...chequeForm,
          amount: String(amt),
          partyId: chequeForm.partyId ? parseInt(chequeForm.partyId, 10) : undefined,
          invoiceId: chequeForm.invoiceId ? parseInt(chequeForm.invoiceId, 10) : undefined,
          chequeBookId: chequeForm.chequeBookId ? parseInt(chequeForm.chequeBookId, 10) : undefined,
        },
        editingCheque ? editingCheque.id : undefined
      );
      setIsChequeModalOpen(false);
      dialog.toast.success(
        editingCheque
          ? `Cheque #${chequeForm.chequeNumber} updated successfully`
          : `Recorded ${chequeForm.chequeType === 'inward' ? 'Inward' : 'Outward'} Cheque #${chequeForm.chequeNumber} for ${formatINR(amt)}`
      );
    } catch (err: any) {
      dialog.toast.error(err.message || 'Failed to save cheque');
    }
  };

  // Open Status Update Modal (Deposit / Clear / Bounce)
  const handleOpenStatusModal = (cheque: Cheque, status: 'deposited' | 'cleared' | 'bounced' | 'cancelled') => {
    setStatusActionCheque(cheque);
    setTargetStatus(status);
    setStatusForm({
      depositBank: cheque.depositBank || (company?.bankName ? `${company.bankName} - Current A/c` : 'Main Bank Account'),
      depositDate: cheque.depositDate || todayStr,
      clearanceDate: cheque.clearanceDate || todayStr,
      bounceDate: cheque.bounceDate || todayStr,
      bounceReason: cheque.bounceReason || BOUNCE_REASONS[0],
      bounceCharges: cheque.bounceCharges || '354.00',
      remarks: cheque.remarks || '',
    });
    setIsStatusModalOpen(true);
  };

  // Submit Status Update
  const handleSubmitStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusActionCheque) return;

    try {
      await onUpdateChequeStatus(statusActionCheque.id, {
        status: targetStatus,
        ...statusForm,
      });
      setIsStatusModalOpen(false);
      const statusLabels = {
        deposited: 'Deposited for Clearing',
        cleared: 'Cleared & Realized',
        bounced: 'Marked as Bounced / Dishonoured',
        cancelled: 'Cancelled / Voided',
      };
      dialog.toast.success(`Cheque #${statusActionCheque.chequeNumber} ${statusLabels[targetStatus]}`);
    } catch (err: any) {
      dialog.toast.error(err.message || 'Failed to update cheque status');
    }
  };

  // Delete Cheque Confirm
  const handleDeleteChequeClick = async (cheque: Cheque) => {
    const ok = await dialog.confirm({
      title: `Delete Cheque #${cheque.chequeNumber}?`,
      message: `Are you sure you want to permanently delete this ${cheque.chequeType === 'inward' ? 'inward' : 'outward'} cheque record for ${formatINR(cheque.amount)} (${cheque.payeeName})? This action cannot be undone.`,
      confirmText: 'Delete Cheque',
      variant: 'danger',
      icon: 'trash',
    });
    if (ok) {
      try {
        await onDeleteCheque(cheque.id);
        dialog.toast.success(`Cheque #${cheque.chequeNumber} deleted`);
      } catch (err: any) {
        dialog.toast.error(err.message || 'Failed to delete cheque');
      }
    }
  };

  // Open Cheque Book Modal
  const handleOpenAddBook = () => {
    setEditingBook(null);
    setBookForm({
      bankName: company?.bankName || 'State Bank of India',
      accountNumber: company?.accountNumber || '',
      bookName: `${company?.bankName || 'SBI'} Current A/c Cheque Book`,
      seriesPrefix: '',
      startNumber: '100101',
      endNumber: '100150',
      totalLeaves: '50',
    });
    setIsBookModalOpen(true);
  };

  // Save Cheque Book
  const handleSubmitBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(bookForm.startNumber, 10);
    const end = parseInt(bookForm.endNumber, 10);
    if (isNaN(start) || isNaN(end) || end < start) {
      dialog.toast.error('Invalid leaf numbering: End Cheque No. must be greater than or equal to Start Cheque No.');
      return;
    }

    try {
      await onSaveChequeBook(
        {
          bankName: bookForm.bankName,
          accountNumber: bookForm.accountNumber,
          bookName: bookForm.bookName || `${bookForm.bankName} (${start}-${end})`,
          seriesPrefix: bookForm.seriesPrefix,
          startNumber: start,
          endNumber: end,
          totalLeaves: (end - start) + 1,
        },
        editingBook ? editingBook.id : undefined
      );
      setIsBookModalOpen(false);
      dialog.toast.success(editingBook ? 'Cheque book updated' : 'New Cheque Book series registered successfully');
    } catch (err: any) {
      dialog.toast.error(err.message || 'Failed to save cheque book');
    }
  };

  // Delete Cheque Book Confirm
  const handleDeleteBookClick = async (book: ChequeBook) => {
    const ok = await dialog.confirm({
      title: `Delete Cheque Book "${book.bookName}"?`,
      message: `Are you sure you want to delete this cheque book (${book.startNumber} - ${book.endNumber})? Cheques already issued will be unlinked but preserved.`,
      confirmText: 'Delete Book',
      variant: 'danger',
      icon: 'trash',
    });
    if (ok) {
      try {
        await onDeleteChequeBook(book.id);
        dialog.toast.success(`Cheque book deleted`);
      } catch (err: any) {
        dialog.toast.error(err.message || 'Failed to delete cheque book');
      }
    }
  };

  // Live auto-calculation for book form total leaves
  const handleStartEndChange = (start: string, end: string) => {
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    let total = '0';
    if (!isNaN(s) && !isNaN(e) && e >= s) {
      total = String(e - s + 1);
    }
    setBookForm((prev) => ({
      ...prev,
      startNumber: start,
      endNumber: end,
      totalLeaves: total,
    }));
  };

  if (loading && cheques.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-64 bg-slate-800 rounded-lg animate-pulse animate-shimmer" />
            <div className="h-3.5 w-80 bg-slate-800/60 rounded animate-pulse animate-shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-36 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
            <div className="h-10 w-36 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
          </div>
        </div>
        <SkeletonMetricGrid count={5} cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-5" />
        <SkeletonTable columns={8} rows={6} hasHeader={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Quick Action Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start sm:items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Cheque Management & PDC Register</h1>
              <span className="text-[11px] font-semibold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                CTS-2010 Ready
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Track Inward/Outward cheques, Post-Dated Cheques (PDC), bank clearings, returns & cheque book leaves.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Cheques Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => handleOpenAddCheque('inward')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>+ Record Inward (Received)</span>
          </button>

          <button
            onClick={() => handleOpenAddCheque('outward')}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 font-bold" />
            <span>+ Issue Outward Cheque</span>
          </button>

          <button
            onClick={handleOpenAddBook}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span className="hidden md:inline">Cheque Book Master</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* In Hand / Pending */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-400">In Hand (Pending)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-white">{formatINR(metrics.inHandAmount)}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-amber-400">{metrics.inHandCount}</span> cheque{metrics.inHandCount === 1 ? '' : 's'} in hand
          </div>
        </div>

        {/* Post-Dated Cheques (PDC) */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-indigo-500/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-400">PDC (Post-Dated)</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-white">{formatINR(metrics.pdcAmount)}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-indigo-400">{metrics.pdcCount}</span> future maturity cheque{metrics.pdcCount === 1 ? '' : 's'}
          </div>
        </div>

        {/* Deposited / In Clearing */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-blue-500/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-blue-400">In Clearing</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-white">{formatINR(metrics.depositedAmount)}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-blue-400">{metrics.depositedCount}</span> awaiting bank realization
          </div>
        </div>

        {/* Cleared / Realized */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-colors shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">Cleared / Realized</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">{formatINR(metrics.clearedAmount)}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-emerald-400">{metrics.clearedCount}</span> realized successfully
          </div>
        </div>

        {/* Bounced / Returned */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-rose-500/40 transition-colors shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-rose-400">Bounced / Returned</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold font-mono text-rose-400">{formatINR(metrics.bouncedAmount)}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-rose-400">{metrics.bouncedCount}</span> returned | Penalty: {formatINR(metrics.totalBounceCharges)}
          </div>
        </div>
      </div>

      {/* 3. Navigation Chip Switcher */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-2 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('register')}
            className={`group px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 border ${
              activeTab === 'register'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 font-bold'
                : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <CreditCard className={`w-4 h-4 shrink-0 ${activeTab === 'register' ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400'}`} />
            <span>Cheques Register</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${activeTab === 'register' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
              {cheques.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pdc')}
            className={`group px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 border ${
              activeTab === 'pdc'
                ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/25 font-bold'
                : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'pdc' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
            <span>PDC Maturity Schedule</span>
            {metrics.pdcCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${activeTab === 'pdc' ? 'bg-indigo-950/40 text-white' : 'bg-indigo-500/20 text-indigo-300'}`}>
                {metrics.pdcCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('cheque_books')}
            className={`group px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 border ${
              activeTab === 'cheque_books'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 font-bold'
                : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800/90 hover:border-slate-700'
            }`}
          >
            <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === 'cheque_books' ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400'}`} />
            <span>Cheque Books Master</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${activeTab === 'cheque_books' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
              {chequeBooks.length}
            </span>
          </button>
        </div>
      </div>

      {/* 4. MAIN VIEW CONTENT BASED ON TAB */}
      {(activeTab === 'register' || activeTab === 'pdc') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Cheque #, Party / Payee, Bank, Remarks..."
                className="w-full pl-9.5 pr-8 py-2 text-xs text-white bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-slate-700 transition-all placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Type Filter */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${typeFilter === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setTypeFilter('inward')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${typeFilter === 'inward' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  Inward (Received)
                </button>
                <button
                  onClick={() => setTypeFilter('outward')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${typeFilter === 'outward' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                  Outward (Issued)
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl font-medium text-slate-300 focus:outline-none focus:border-slate-700 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="in_hand">In Hand (Pending)</option>
                <option value="deposited">Deposited in Bank</option>
                <option value="cleared">Cleared / Realized</option>
                <option value="bounced">Bounced / Returned</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Date / Maturity Filter */}
              {activeTab !== 'pdc' && (
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl font-medium text-slate-300 focus:outline-none focus:border-slate-700 cursor-pointer"
                >
                  <option value="all">All Dates</option>
                  <option value="pdc_only">PDC Only (Future)</option>
                  <option value="today">Due Today</option>
                  <option value="this_month">This Month</option>
                </select>
              )}
            </div>
          </div>

          {/* Cheques Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            {filteredCheques.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white">No cheques found</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters to see matching cheque records.'
                    : 'Start by recording an inward cheque received from a customer or issuing an outward cheque.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleOpenAddCheque('inward')}
                    className="px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-colors cursor-pointer"
                  >
                    + Record Inward Cheque
                  </button>
                  <button
                    onClick={() => handleOpenAddCheque('outward')}
                    className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer"
                  >
                    + Issue Outward Cheque
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4">Cheque Details</th>
                      <th className="py-3.5 px-4">Cheque Date & PDC</th>
                      <th className="py-3.5 px-4">Party / Payee</th>
                      <th className="py-3.5 px-4">Drawee Bank / Deposit A/c</th>
                      <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredCheques.map((c) => {
                      const dateStatus = getChequeDateStatus(c.chequeDate);
                      const isOutward = c.chequeType === 'outward';

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                          {/* Cheque Details */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isOutward
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                                title={isOutward ? 'Outward (Issued)' : 'Inward (Received)'}
                              >
                                {isOutward ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-mono font-bold text-white flex items-center gap-1.5">
                                  <span>#{c.chequeNumber}</span>
                                  {c.isAccountPayee && (
                                    <span className="text-[10px] font-sans font-bold bg-slate-800 text-slate-300 px-1 py-0.2 rounded border border-slate-700" title="A/C Payee Only">
                                      A/C PAYEE
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {isOutward ? 'Outward (Issued)' : 'Inward (Received)'}
                                  {c.referenceNumber ? ` • Ref: ${c.referenceNumber}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cheque Date & Maturity */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-200">{c.chequeDate}</div>
                            {dateStatus.type === 'pdc' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-md mt-0.5">
                                <Clock className="w-3 h-3 text-indigo-400" />
                                {dateStatus.text}
                              </span>
                            )}
                            {dateStatus.type === 'today' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md mt-0.5 animate-pulse">
                                Due Today
                              </span>
                            )}
                            {dateStatus.type === 'stale' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-md mt-0.5">
                                Stale Cheque
                              </span>
                            )}
                          </td>

                          {/* Party / Payee */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{c.payeeName}</div>
                            {c.remarks && (
                              <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{c.remarks}</div>
                            )}
                          </td>

                          {/* Drawee Bank / Deposit A/c */}
                          <td className="py-3.5 px-4">
                            <div className="text-slate-200 font-medium">{c.bankName}</div>
                            <div className="text-xs text-slate-400">
                              {c.branchName ? `${c.branchName} ` : ''}
                              {c.depositBank ? `→ ${c.depositBank}` : ''}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className={`font-bold font-mono text-base ${isOutward ? 'text-white' : 'text-emerald-400'}`}>
                              {formatINR(c.amount)}
                            </div>
                            {c.status === 'bounced' && parseFloat(c.bounceCharges || '0') > 0 && (
                              <div className="text-[11px] text-rose-400 font-medium">
                                +{formatINR(c.bounceCharges)} penalty
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {c.status === 'in_hand' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                <Clock className="w-3 h-3 text-amber-400" />
                                In Hand
                              </span>
                            )}
                            {c.status === 'deposited' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                                <Building2 className="w-3 h-3 text-blue-400" />
                                Deposited
                              </span>
                            )}
                            {c.status === 'cleared' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Cleared ({c.clearanceDate || 'Realized'})
                              </span>
                            )}
                            {c.status === 'bounced' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30" title={c.bounceReason || 'Dishonoured'}>
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                Bounced
                              </span>
                            )}
                            {c.status === 'cancelled' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                <Ban className="w-3 h-3" />
                                Cancelled
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Deposit button if in hand */}
                              {c.status === 'in_hand' && (
                                <button
                                  onClick={() => handleOpenStatusModal(c, 'deposited')}
                                  className="px-2.5 py-1 text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors cursor-pointer"
                                  title="Deposit in Bank for Clearing"
                                >
                                  Deposit
                                </button>
                              )}

                              {/* Clear button if in hand or deposited */}
                              {(c.status === 'in_hand' || c.status === 'deposited') && (
                                <button
                                  onClick={() => handleOpenStatusModal(c, 'cleared')}
                                  className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                                  title="Mark Cleared & Realized"
                                >
                                  Clear
                                </button>
                              )}

                              {/* Bounce button */}
                              {c.status !== 'cleared' && c.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleOpenStatusModal(c, 'bounced')}
                                  className="px-2 py-1 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
                                  title="Record Cheque Bounce / Return"
                                >
                                  Bounce
                                </button>
                              )}

                              {/* View / Print Preview */}
                              <button
                                onClick={() => setPreviewCheque(c)}
                                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Print / Visual Cheque Voucher"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => handleOpenEditCheque(c)}
                                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Cheque"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteChequeClick(c)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
                                title="Delete Cheque"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. CHEQUE BOOKS MASTER TAB */}
      {activeTab === 'cheque_books' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-100">Registered Cheque Books</h2>
              <p className="text-xs text-slate-400">Manage physical bank cheque series, leaf consumption, and active books.</p>
            </div>
            <button
              onClick={handleOpenAddBook}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Cheque Book</span>
            </button>
          </div>

          {chequeBooks.length === 0 ? (
            <div className="bg-slate-900/80 p-12 text-center rounded-2xl border border-slate-800">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-200">No Cheque Books Registered</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                Add your company bank cheque series (e.g. leaves 100101 to 100150) for automated leaf auto-incrementing and tracking.
              </p>
              <button
                onClick={handleOpenAddBook}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors"
              >
                + Register First Cheque Book
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chequeBooks.map((book) => {
                const used = book.usedLeaves || 0;
                const total = book.totalLeaves || 50;
                const remaining = Math.max(0, total - used);
                const percent = Math.min(100, Math.round((used / total) * 100));

                return (
                  <div
                    key={book.id}
                    className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                            {book.bankName}
                          </span>
                          <h3 className="text-base font-bold text-slate-100 mt-2">{book.bookName}</h3>
                          {book.accountNumber && (
                            <p className="text-xs text-slate-400 font-mono mt-0.5">A/c: {book.accountNumber}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteBookClick(book)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Delete Cheque Book"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Leaf Series Range */}
                      <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-750 flex items-center justify-between font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Start Leaf</span>
                          <span className="font-bold text-slate-200">{String(book.startNumber).padStart(6, '0')}</span>
                        </div>
                        <div className="text-slate-500">→</div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">End Leaf</span>
                          <span className="font-bold text-slate-200">{String(book.endNumber).padStart(6, '0')}</span>
                        </div>
                        <div className="text-slate-600">|</div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block">Total</span>
                          <span className="font-bold text-slate-200">{total} Leaves</span>
                        </div>
                      </div>

                      {/* Usage Progress Bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Leaves Consumed</span>
                          <span className="font-semibold text-slate-200">
                            {used} / {total} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent > 85 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{remaining} leaves available</span>
                          <span className={`font-semibold ${book.status === 'active' ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {book.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedBookForLeaves(book)}
                        className="w-full py-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>View Leaf Matrix</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: RECORD / EDIT CHEQUE */}
      {isChequeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto my-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${chequeForm.chequeType === 'inward' ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-400' : 'bg-blue-950/60 border border-blue-700/60 text-blue-400'}`}>
                  {chequeForm.chequeType === 'inward' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    {editingCheque
                      ? `Edit Cheque #${chequeForm.chequeNumber}`
                      : chequeForm.chequeType === 'inward'
                      ? 'Record Inward Cheque (Customer Receipt)'
                      : 'Issue Outward Cheque (Vendor Payment)'}
                  </h2>
                  <p className="text-xs text-slate-400">CTS-2010 Standard Indian Banking Cheque Record</p>
                </div>
              </div>
              <button
                onClick={() => setIsChequeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCheque} className="space-y-4 mt-4">
              {/* Type Switcher if creating new */}
              {!editingCheque && (
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setChequeForm((p) => ({
                        ...p,
                        chequeType: 'inward',
                        bankName: 'HDFC Bank Ltd',
                        depositBank: company?.bankName ? `${company.bankName} - Current A/c` : 'Main Bank Account',
                      }));
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      chequeForm.chequeType === 'inward' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Inward (Received from Customer)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChequeForm((p) => ({
                        ...p,
                        chequeType: 'outward',
                        bankName: company?.bankName || 'State Bank of India',
                        depositBank: company?.bankName ? `${company.bankName} - Current A/c` : 'Company Bank A/c',
                      }));
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      chequeForm.chequeType === 'outward' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Outward (Issued to Vendor/Expense)</span>
                  </button>
                </div>
              )}

              {/* Cheque Book Selector for Outward Cheques */}
              {chequeForm.chequeType === 'outward' && chequeBooks.length > 0 && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Select Cheque Book Series (Auto-Allocates Leaf)
                  </label>
                  <select
                    value={chequeForm.chequeBookId}
                    onChange={(e) => {
                      const bookId = e.target.value;
                      const selectedBook = chequeBooks.find((b) => String(b.id) === bookId);
                      if (selectedBook) {
                        const nextLeaf = selectedBook.startNumber + (selectedBook.usedLeaves || 0);
                        setChequeForm({
                          ...chequeForm,
                          chequeBookId: bookId,
                          bankName: selectedBook.bankName || chequeForm.bankName,
                          chequeNumber: String(nextLeaf).padStart(6, '0'),
                        });
                      } else {
                        setChequeForm({
                          ...chequeForm,
                          chequeBookId: '',
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-850 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- Select Registered Cheque Book --</option>
                    {chequeBooks
                      .filter((b) => b.status === 'active')
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} • {b.bookName} ({b.seriesPrefix || ''}{String(b.startNumber).padStart(6, '0')}-{String(b.endNumber).padStart(6, '0')} • {b.totalLeaves - b.usedLeaves} left)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Cheque No & Cheque Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Cheque Number (6 Digits) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={chequeForm.chequeNumber}
                    onChange={(e) => setChequeForm({ ...chequeForm, chequeNumber: e.target.value })}
                    placeholder="e.g. 100101"
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Cheque Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={chequeForm.chequeDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const isFuture = newDate > todayStr;
                      setChequeForm({ ...chequeForm, chequeDate: newDate, isPdc: isFuture });
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {chequeForm.chequeDate > todayStr && (
                    <span className="text-[11px] font-semibold text-emerald-400 mt-1 block">
                      ★ Detected as Post-Dated Cheque (PDC)
                    </span>
                  )}
                </div>
              </div>

              {/* Amount & In Words Live Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Cheque Amount (₹ INR) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={chequeForm.amount}
                    onChange={(e) => setChequeForm({ ...chequeForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 text-base font-mono font-bold bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                {parseFloat(chequeForm.amount) > 0 && (
                  <div className="mt-1.5 p-2 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-xs font-medium text-emerald-300">
                    <span className="font-bold text-emerald-400">In Words:</span> {numberToIndianWords(chequeForm.amount)}
                  </div>
                )}
              </div>

              {/* Party / Payee Name & Quick Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  {chequeForm.chequeType === 'inward' ? 'Drawer / Customer Name' : 'Payee / Vendor Name'} <span className="text-rose-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={chequeForm.payeeName}
                    onChange={(e) => setChequeForm({ ...chequeForm, payeeName: e.target.value })}
                    placeholder="e.g. Tata Consultancy & Infra Projects"
                    className="flex-1 px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                  {parties.length > 0 && (
                    <select
                      value={chequeForm.partyId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const p = parties.find((item) => String(item.id) === pid);
                        if (p) {
                          setChequeForm({
                            ...chequeForm,
                            partyId: pid,
                            payeeName: p.name,
                            invoiceId: '',
                          });
                        } else {
                          setChequeForm({
                            ...chequeForm,
                            partyId: '',
                            invoiceId: '',
                          });
                        }
                      }}
                      className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-300 font-medium max-w-[150px]"
                    >
                      <option value="">Auto-Fill Party</option>
                      {parties
                        .filter((p) =>
                          chequeForm.chequeType === 'inward' ? p.partyType === 'customer' : p.partyType === 'vendor'
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {/* Optional Linked Invoice Dropdown */}
                {chequeForm.partyId && invoices.length > 0 && (() => {
                  const partyInvs = invoices.filter(
                    (inv) =>
                      (inv.partyId && String(inv.partyId) === chequeForm.partyId) ||
                      (inv.partyName && inv.partyName.trim().toLowerCase() === chequeForm.payeeName.trim().toLowerCase())
                  );
                  if (partyInvs.length === 0) return null;

                  return (
                    <div className="mt-2 p-2 bg-slate-950/60 border border-slate-800 rounded-lg">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Link to Invoice / Bill (Optional):
                      </label>
                      <select
                        value={chequeForm.invoiceId}
                        onChange={(e) => {
                          const invId = e.target.value;
                          const chosenInv = partyInvs.find((i) => String(i.id) === invId);
                          if (chosenInv) {
                            const due = Math.max(0, parseFloat(chosenInv.grandTotal) - parseFloat(chosenInv.paidAmount || '0'));
                            setChequeForm({
                              ...chequeForm,
                              invoiceId: invId,
                              amount: due > 0 && (!chequeForm.amount || parseFloat(chequeForm.amount) === 0) ? String(due) : chequeForm.amount,
                              referenceNumber: `Against ${chosenInv.invoiceNumber}`,
                            });
                          } else {
                            setChequeForm({
                              ...chequeForm,
                              invoiceId: '',
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200"
                      >
                        <option value="">-- No linked invoice (General / On Account) --</option>
                        {partyInvs.map((inv) => {
                          const due = Math.max(0, parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount || '0'));
                          return (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} ({inv.invoiceDate}) • Total: ₹{parseFloat(inv.grandTotal).toLocaleString('en-IN')} (Due: ₹{due.toLocaleString('en-IN')})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })()}
              </div>

              {/* Bank Name, Branch, IFSC */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {chequeForm.chequeType === 'inward' ? 'Issuing (Drawee) Bank' : 'Company Bank'}
                  </label>
                  <input
                    type="text"
                    value={chequeForm.bankName}
                    onChange={(e) => setChequeForm({ ...chequeForm, bankName: e.target.value })}
                    placeholder="e.g. State Bank of India"
                    className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    list="bank-list"
                  />
                  <datalist id="bank-list">
                    {POPULAR_BANKS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={chequeForm.branchName}
                    onChange={(e) => setChequeForm({ ...chequeForm, branchName: e.target.value })}
                    placeholder="e.g. Lower Parel Branch"
                    className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={chequeForm.ifscCode}
                    onChange={(e) => setChequeForm({ ...chequeForm, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001824"
                    className="w-full px-3 py-2 text-sm font-mono uppercase bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Deposit Bank / Clearing Account */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Company Deposit / Drawing Account
                </label>
                <input
                  type="text"
                  value={chequeForm.depositBank}
                  onChange={(e) => setChequeForm({ ...chequeForm, depositBank: e.target.value })}
                  placeholder="e.g. State Bank of India - Current A/c (39485019284)"
                  className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Flags: A/C Payee Only */}
              <div className="flex items-center gap-6 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={chequeForm.isAccountPayee}
                    onChange={(e) => setChequeForm({ ...chequeForm, isAccountPayee: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <span>Account Payee Only ("A/C PAYEE" Crossing)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={chequeForm.isPdc}
                    onChange={(e) => setChequeForm({ ...chequeForm, isPdc: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                  />
                  <span>Mark as Post-Dated Cheque (PDC)</span>
                </label>
              </div>

              {/* Remarks / Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Reference / Bill #
                  </label>
                  <input
                    type="text"
                    value={chequeForm.referenceNumber}
                    onChange={(e) => setChequeForm({ ...chequeForm, referenceNumber: e.target.value })}
                    placeholder="e.g. Against INV/2026-27/001"
                    className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Remarks / Purpose
                  </label>
                  <input
                    type="text"
                    value={chequeForm.remarks}
                    onChange={(e) => setChequeForm({ ...chequeForm, remarks: e.target.value })}
                    placeholder="e.g. Part-payment material supply"
                    className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChequeModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm"
                >
                  {editingCheque ? 'Update Cheque Record' : 'Save & Record Cheque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: CHEQUE STATUS UPDATE (DEPOSIT, CLEAR, BOUNCE) */}
      {isStatusModalOpen && statusActionCheque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    targetStatus === 'deposited'
                      ? 'bg-blue-950/60 border border-blue-700/60 text-blue-400'
                      : targetStatus === 'cleared'
                      ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-400'
                      : 'bg-rose-950/60 border border-rose-700/60 text-rose-400'
                  }`}
                >
                  {targetStatus === 'deposited' && <Building2 className="w-5 h-5" />}
                  {targetStatus === 'cleared' && <CheckCircle2 className="w-5 h-5" />}
                  {targetStatus === 'bounced' && <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    {targetStatus === 'deposited' && 'Deposit Cheque in Bank'}
                    {targetStatus === 'cleared' && 'Mark Cheque as Cleared / Realized'}
                    {targetStatus === 'bounced' && 'Record Dishonoured / Bounced Cheque'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cheque #{statusActionCheque.chequeNumber} • {formatINR(statusActionCheque.amount)} ({statusActionCheque.payeeName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitStatusUpdate} className="space-y-4 mt-4">
              {/* Deposit Bank */}
              {(targetStatus === 'deposited' || targetStatus === 'cleared') && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Deposit Bank Account
                  </label>
                  <input
                    type="text"
                    required
                    value={statusForm.depositBank}
                    onChange={(e) => setStatusForm({ ...statusForm, depositBank: e.target.value })}
                    placeholder="e.g. State Bank of India - Current A/c"
                    className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {/* Dates */}
              {targetStatus === 'deposited' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Deposit Date
                  </label>
                  <input
                    type="date"
                    required
                    value={statusForm.depositDate}
                    onChange={(e) => setStatusForm({ ...statusForm, depositDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {targetStatus === 'cleared' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Clearance / Bank Realization Date
                  </label>
                  <input
                    type="date"
                    required
                    value={statusForm.clearanceDate}
                    onChange={(e) => setStatusForm({ ...statusForm, clearanceDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              )}

              {targetStatus === 'bounced' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Bank Return Date
                    </label>
                    <input
                      type="date"
                      required
                      value={statusForm.bounceDate}
                      onChange={(e) => setStatusForm({ ...statusForm, bounceDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Bank Return / Dishonour Reason <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={statusForm.bounceReason}
                      onChange={(e) => setStatusForm({ ...statusForm, bounceReason: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                    >
                      {BOUNCE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Bank Bounce Penalty Charges (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={statusForm.bounceCharges}
                        onChange={(e) => setStatusForm({ ...statusForm, bounceCharges: e.target.value })}
                        placeholder="354.00"
                        className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Standard bank return fee charged to party account.</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Notes / Audit Remarks
                </label>
                <input
                  type="text"
                  value={statusForm.remarks}
                  onChange={(e) => setStatusForm({ ...statusForm, remarks: e.target.value })}
                  placeholder="Optional audit notes"
                  className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors shadow-sm ${
                    targetStatus === 'cleared'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : targetStatus === 'deposited'
                      ? 'bg-blue-600 hover:bg-blue-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirm & Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: REGISTER CHEQUE BOOK */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Register Cheque Book</h2>
                  <p className="text-xs text-slate-400">Configure bank leaves range and numbering</p>
                </div>
              </div>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBook} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Bank Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.bankName}
                  onChange={(e) => setBookForm({ ...bookForm, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bookForm.accountNumber}
                  onChange={(e) => setBookForm({ ...bookForm, accountNumber: e.target.value })}
                  placeholder="e.g. 39485019284"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Book Name / Description
                </label>
                <input
                  type="text"
                  value={bookForm.bookName}
                  onChange={(e) => setBookForm({ ...bookForm, bookName: e.target.value })}
                  placeholder="e.g. SBI Main Current A/c (100101 - 100150)"
                  className="w-full px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Start Leaf # <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={bookForm.startNumber}
                    onChange={(e) => handleStartEndChange(e.target.value, bookForm.endNumber)}
                    placeholder="100101"
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    End Leaf # <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={bookForm.endNumber}
                    onChange={(e) => handleStartEndChange(bookForm.startNumber, e.target.value)}
                    placeholder="100150"
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-400">Total Leaves Calculated:</span>
                <span className="font-bold text-slate-200 font-mono text-sm">{bookForm.totalLeaves} Leaves</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm"
                >
                  Register Cheque Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: LEAF MATRIX REGISTER (VIEW EVERY LEAF IN BOOK) */}
      {selectedBookForLeaves && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{selectedBookForLeaves.bookName}</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Series: {selectedBookForLeaves.startNumber} - {selectedBookForLeaves.endNumber} ({selectedBookForLeaves.totalLeaves} leaves)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBookForLeaves(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Matrix legend */}
            <div className="flex flex-wrap items-center gap-3 py-3 text-xs border-b border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-600"></span> Available
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-blue-950 border border-blue-500"></span> Issued / In Hand
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-emerald-600"></span> Cleared
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded bg-rose-950 border border-rose-600"></span> Bounced
              </span>
            </div>

            {/* Leaf Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 mt-4 max-h-96 overflow-y-auto p-1">
              {Array.from({ length: selectedBookForLeaves.totalLeaves }).map((_, idx) => {
                const leafNum = selectedBookForLeaves.startNumber + idx;
                const leafStr = String(leafNum).padStart(6, '0');
                const matchedCheque = cheques.find(
                  (c) => c.chequeType === 'outward' && parseInt(c.chequeNumber, 10) === leafNum
                );

                let badgeColor = 'bg-slate-800/80 border-slate-700 text-emerald-400 hover:bg-slate-750';
                let statusLabel = 'Available';

                if (matchedCheque) {
                  if (matchedCheque.status === 'cleared') {
                    badgeColor = 'bg-emerald-600 border-emerald-500 text-white';
                    statusLabel = 'Cleared';
                  } else if (matchedCheque.status === 'bounced') {
                    badgeColor = 'bg-rose-950/60 border-rose-700 text-rose-300';
                    statusLabel = 'Bounced';
                  } else if (matchedCheque.status === 'cancelled') {
                    badgeColor = 'bg-slate-800 border-slate-750 text-slate-400';
                    statusLabel = 'Cancelled';
                  } else {
                    badgeColor = 'bg-blue-950/60 border-blue-700 text-blue-300';
                    statusLabel = 'Issued';
                  }
                }

                return (
                  <div
                    key={leafNum}
                    onClick={() => {
                      if (matchedCheque) {
                        setPreviewCheque(matchedCheque);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      matchedCheque ? 'cursor-pointer' : ''
                    } ${badgeColor}`}
                    title={
                      matchedCheque
                        ? `Cheque #${leafStr}: ${formatINR(matchedCheque.amount)} (${matchedCheque.payeeName}) - ${statusLabel}`
                        : `Leaf #${leafStr}: Available to issue`
                    }
                  >
                    <div className="font-mono font-bold text-xs">{leafStr}</div>
                    <div className="text-[10px] mt-0.5 opacity-80 truncate">{statusLabel}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBookForLeaves(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 rounded-xl transition-colors"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: HIGH-FIDELITY INDIAN BANK CHEQUE PRINT & PREVIEW */}
      {previewCheque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-slate-100">
                  Cheque Voucher #{previewCheque.chequeNumber}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Cheque</span>
                </button>
                <button
                  onClick={() => {
                    const c = previewCheque;
                    setPreviewCheque(null);
                    handleDeleteChequeClick(c);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors cursor-pointer"
                  title="Delete Cheque"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setPreviewCheque(null)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Indian CTS-2010 Bank Cheque Graphic Template */}
            <div className="mt-6 p-6 bg-linear-to-br from-amber-50/95 via-teal-50/80 to-sky-50/90 rounded-2xl border-2 border-slate-300 shadow-inner relative overflow-hidden text-slate-900 font-sans">
              {/* CTS-2010 Watermark Background & Cheque Heading */}
              <div className="flex items-start justify-between border-b border-slate-300/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    {previewCheque.bankName ? previewCheque.bankName.charAt(0) : 'B'}
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-wide text-slate-900 uppercase">
                      {previewCheque.bankName}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      {previewCheque.branchName || 'Main Commercial Branch'}, IFSC: {previewCheque.ifscCode || 'SBIN0001824'}
                    </p>
                  </div>
                </div>

                {/* Date Boxes (DD-MM-YYYY) */}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">Date</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-sm">
                    {previewCheque.chequeDate ? (
                      (() => {
                        const [y, m, d] = previewCheque.chequeDate.split('-');
                        const str = `${d || '00'}${m || '00'}${y || '0000'}`;
                        return str.split('').map((char, i) => (
                          <span
                            key={i}
                            className={`w-6 h-7 bg-white border border-slate-400 rounded flex items-center justify-center shadow-2xs ${
                              i === 1 || i === 3 ? 'mr-1' : ''
                            }`}
                          >
                            {char}
                          </span>
                        ));
                      })()
                    ) : (
                      <span className="text-xs">DD MM YYYY</span>
                    )}
                  </div>
                </div>
              </div>

              {/* A/C Payee Only Crossing */}
              {previewCheque.isAccountPayee && (
                <div className="absolute top-2 left-6 -rotate-12 border-y-2 border-slate-800 text-[11px] font-black tracking-widest px-3 py-0.5 uppercase bg-white/80">
                  // A/C PAYEE ONLY //
                </div>
              )}

              {/* Payee Line */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-400 pb-1">
                  <span className="text-xs font-bold uppercase text-slate-600 shrink-0">Pay</span>
                  <span className="font-bold text-base text-slate-900 flex-1">{previewCheque.payeeName}</span>
                  <span className="text-xs text-slate-400 shrink-0">OR BEARER</span>
                </div>

                {/* Rupees in Words Line */}
                <div className="border-b border-slate-400 pb-1 flex items-start gap-2">
                  <span className="text-xs font-bold uppercase text-slate-600 shrink-0 mt-0.5">Rupees</span>
                  <span className="font-serif italic font-bold text-sm text-slate-800 flex-1 leading-relaxed">
                    {numberToIndianWords(previewCheque.amount)}
                  </span>
                </div>

                {/* Amount Box */}
                <div className="flex items-end justify-between pt-2">
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>
                      <span className="font-semibold text-slate-700">A/c No:</span>{' '}
                      <span className="font-mono">{company?.accountNumber || '50200049281729'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Type:</span>{' '}
                      {previewCheque.chequeType === 'inward' ? 'Inward Customer Cheque' : 'Outward Issued Cheque'}
                    </div>
                  </div>

                  {/* Decorative ₹ Amount Box */}
                  <div className="p-2.5 bg-white border-2 border-slate-900 rounded-xl flex items-center gap-2 shadow-xs">
                    <span className="text-lg font-black text-slate-900">₹</span>
                    <span className="font-mono font-black text-xl tracking-wide text-slate-900">
                      {formatINR(previewCheque.amount).replace('₹', '')}
                    </span>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="mt-6 flex justify-end pt-4">
                  <div className="text-center w-52 border-t border-slate-500 pt-1 text-xs">
                    <div className="font-bold text-slate-800">
                      For {company?.businessName || 'Apex Enterprise & Trading Co.'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-6">Authorized Signatory</div>
                  </div>
                </div>

                {/* MICR Band Bottom Line */}
                <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-center gap-6 font-mono text-sm tracking-widest text-slate-700">
                  <span>⑈ {String(previewCheque.chequeNumber).padStart(6, '0')} ⑈</span>
                  <span>400002012 ⑆</span>
                  <span>000000 ⑈</span>
                  <span>29</span>
                </div>
              </div>
            </div>

            {/* Audit & Clearing Info Footer */}
            <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Status</span>
                <span className="font-bold text-slate-200 uppercase">{previewCheque.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Deposit Bank</span>
                <span className="font-semibold text-slate-200">{previewCheque.depositBank || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Clearance Date</span>
                <span className="font-semibold text-slate-200">{previewCheque.clearanceDate || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Post-Dated Cheque</span>
                <span className="font-semibold text-slate-200">{previewCheque.isPdc ? 'Yes (PDC)' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
