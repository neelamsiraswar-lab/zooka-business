import React, { useState, useEffect } from 'react';
import { useDialog } from '../context/DialogContext';
import { AppSelect } from './AppSelect';
import { PartyMatchSelector } from './PartyMatchSelector';
import { SkeletonMetricGrid, SkeletonTable } from './SkeletonLoaders';
import {
  PaymentVoucher,
  Party,
  Invoice,
  CompanyProfile,
} from '../types';
import { getNextPaymentVoucherNumber } from '../db/dataService';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Printer,
  Trash2,
  X,
  Building,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Wallet,
  Landmark,
  Hash,
  Filter,
  Eye,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission, UserRole } from '../lib/permissions';

interface ReceiptPaymentViewProps {
  payments: PaymentVoucher[];
  parties: Party[];
  invoices: Invoice[];
  company: CompanyProfile | null;
  onSavePayment: (data: any) => Promise<void>;
  onDeletePayment: (id: number) => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
  initialType?: 'receipt' | 'payment';
  initialPartyId?: number;
  initialInvoiceId?: number;
  onNavigateToInvoices?: (invoiceId?: number) => void;
}

export const ReceiptPaymentView: React.FC<ReceiptPaymentViewProps> = ({
  payments = [],
  parties = [],
  invoices = [],
  company,
  onSavePayment,
  onDeletePayment,
  onRefresh,
  loading,
  initialType,
  initialPartyId,
  initialInvoiceId,
  onNavigateToInvoices,
}) => {
  const { profile, getToken } = useAuth();
  const currentUserRole: UserRole = (profile?.role as UserRole) || 'accountant';

  const canCreate = hasPermission(currentUserRole, 'payments:create');
  const canDelete = hasPermission(currentUserRole, 'payments:delete');

  const dialog = useDialog();
  // Navigation & Filter State
  const [activeFilter, setActiveFilter] = useState<'all' | 'receipt' | 'payment'>(
    initialType || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');

  // Modal State
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [modalType, setModalType] = useState<'receipt' | 'payment'>(
    initialType || 'receipt'
  );
  const [selectedPartyId, setSelectedPartyId] = useState<string>(
    initialPartyId ? String(initialPartyId) : ''
  );
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [voucherDate, setVoucherDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState<
    'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'neft_rtgs'
  >('bank_transfer');
  const [accountType, setAccountType] = useState<'bank' | 'cash'>('bank');
  const [bankName, setBankName] = useState(company?.bankName || 'HDFC Bank Ltd');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    initialInvoiceId ? String(initialInvoiceId) : ''
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Voucher Print / View Modal
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] =
    useState<PaymentVoucher | null>(null);

  // Auto-fetch next voucher number when opening modal or switching type
  const fetchNextNumber = async (type: 'receipt' | 'payment') => {
    try {
      const data = await getNextPaymentVoucherNumber(profile?.id || 1, type);
      if (data && data.formattedNumber) {
        setVoucherNumber(data.formattedNumber);
      }
    } catch (err) {
      console.warn('Failed to get next voucher number directly from Cloud Firestore:', err);
      const prefix = type === 'receipt' ? 'REC/2026-27/' : 'PAY/2026-27/';
      setVoucherNumber(`${prefix}001`);
    }
  };

  const openNewVoucherModal = (type: 'receipt' | 'payment', prePartyId?: number, preInvoiceId?: number) => {
    setModalType(type);
    setFormError(null);
    setVoucherDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('bank_transfer');
    setAccountType('bank');
    setBankName(company?.bankName || 'HDFC Bank Ltd');
    setReferenceNumber('');
    setNotes('');
    setAmount('');

    if (prePartyId) {
      setSelectedPartyId(String(prePartyId));
      const p = parties.find((item) => item.id === prePartyId);
      if (p) setPartyName(p.name);
    } else {
      setSelectedPartyId('');
      setPartyName('');
    }

    if (preInvoiceId) {
      setSelectedInvoiceId(String(preInvoiceId));
      const inv = invoices.find((i) => i.id === preInvoiceId);
      if (inv) {
        setSelectedPartyId(String(inv.partyId || ''));
        setPartyName(inv.partyName);
        const remaining = Math.max(
          0,
          parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount)
        );
        setAmount(remaining > 0 ? remaining.toFixed(2) : inv.grandTotal);
        setNotes(`Payment against Invoice #${inv.invoiceNumber}`);
      }
    } else {
      setSelectedInvoiceId('');
    }

    fetchNextNumber(type);
    setShowVoucherModal(true);
  };

  // When party selection changes, update partyName and reset linked invoice if needed
  const handlePartyChange = (id: string) => {
    setSelectedPartyId(id);
    setSelectedInvoiceId('');
    if (!id) {
      setPartyName('');
      return;
    }
    const found = parties.find((p) => p.id === parseInt(id));
    if (found) {
      setPartyName(found.name);
    }
  };

  // Handle selecting an invoice to settle
  const handleSelectInvoice = (inv: Invoice) => {
    setSelectedInvoiceId(String(inv.id));
    setSelectedPartyId(String(inv.partyId || ''));
    setPartyName(inv.partyName);
    const unpaid = Math.max(
      0,
      parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount)
    );
    setAmount(unpaid > 0 ? unpaid.toFixed(2) : inv.grandTotal);
    setNotes(`Settlement for ${inv.voucherType === 'purchase' ? 'Purchase Bill' : 'Sale Invoice'} #${inv.invoiceNumber}`);
  };

  // Submit Voucher
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Please enter a valid amount greater than ₹0.00');
      return;
    }

    if (!partyName.trim()) {
      setFormError('Please select or specify a party name');
      return;
    }

    setSubmitting(true);
    try {
      await onSavePayment({
        voucherType: modalType,
        voucherNumber: voucherNumber.trim(),
        date: voucherDate,
        partyId: selectedPartyId ? parseInt(selectedPartyId) : null,
        partyName: partyName.trim(),
        amount: numericAmount.toFixed(2),
        paymentMode,
        accountType,
        bankName: accountType === 'cash' ? 'Cash in Hand' : bankName,
        referenceNumber: referenceNumber.trim() || null,
        invoiceId: selectedInvoiceId ? parseInt(selectedInvoiceId) : null,
        notes: notes.trim() || null,
      });

      setShowVoucherModal(false);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to create voucher:', err);
      setFormError(err.message || 'Failed to save voucher');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics calculations
  const totalReceiptsAmount = payments
    .filter((p) => p.voucherType === 'receipt')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const totalPaymentsAmount = payments
    .filter((p) => p.voucherType === 'payment')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const receiptsCount = payments.filter((p) => p.voucherType === 'receipt').length;
  const paymentsCount = payments.filter((p) => p.voucherType === 'payment').length;
  const netCashFlow = totalReceiptsAmount - totalPaymentsAmount;

  // Filtered Payments list
  const filteredPayments = payments.filter((p) => {
    if (activeFilter !== 'all' && p.voucherType !== activeFilter) {
      return false;
    }
    if (paymentModeFilter !== 'all' && p.paymentMode !== paymentModeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchVoucher = p.voucherNumber?.toLowerCase().includes(q);
      const matchParty = p.partyName?.toLowerCase().includes(q);
      const matchBank = p.bankName?.toLowerCase().includes(q);
      const matchRef = p.referenceNumber?.toLowerCase().includes(q);
      const matchInv = p.invoiceNumber?.toLowerCase().includes(q);
      return matchVoucher || matchParty || matchBank || matchRef || matchInv;
    }
    return true;
  });

  // Eligible invoices for the current party & modal type
  const targetPartyInvoices = invoices.filter((inv) => {
    // Receipts settle sales invoices, Payments settle purchase bills
    const expectedType = modalType === 'receipt' ? 'sales' : 'purchase';
    if (inv.voucherType !== expectedType) return false;
    if (inv.paymentStatus === 'paid') return false;

    if (selectedPartyId) {
      return inv.partyId === parseInt(selectedPartyId);
    }
    if (partyName.trim()) {
      return inv.partyName.toLowerCase() === partyName.trim().toLowerCase();
    }
    return true;
  });

  // Selected party object for displaying current balance
  const currentPartyObj = parties.find(
    (p) =>
      p.id === parseInt(selectedPartyId) ||
      p.name.trim().toLowerCase() === partyName.trim().toLowerCase()
  );

  if (loading && payments.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="space-y-2">
            <div className="h-6 w-52 bg-slate-800 rounded-lg animate-pulse animate-shimmer" />
            <div className="h-3.5 w-80 bg-slate-800/60 rounded animate-pulse animate-shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-36 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
            <div className="h-10 w-36 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
          </div>
        </div>
        <SkeletonMetricGrid count={4} />
        <SkeletonTable columns={8} rows={6} hasHeader={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Receipts & Payments (Vouchers)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Record money received from customers (Debtors) and disbursements made to vendors (Creditors).
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canCreate ? (
            <>
              <button
                onClick={() => openNewVoucherModal('receipt')}
                className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition"
              >
                <ArrowDownLeft className="w-4 h-4 font-bold" />
                <span>+ Record Receipt (F6)</span>
              </button>
              <button
                onClick={() => openNewVoucherModal('payment')}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer transition"
              >
                <ArrowUpRight className="w-4 h-4 font-bold" />
                <span>+ Record Payment (F5)</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700/60 text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Read-Only Mode</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receipts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Total Receipts (Inflow)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-400 mt-2 font-mono">
            ₹{totalReceiptsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {receiptsCount} receipt voucher{receiptsCount === 1 ? '' : 's'} recorded
          </span>
        </div>

        {/* Total Payments */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Total Payments (Outflow)
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-rose-400 mt-2 font-mono">
            ₹{totalPaymentsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {paymentsCount} payment voucher{paymentsCount === 1 ? '' : 's'} recorded
          </span>
        </div>

        {/* Net Flow */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Net Cash & Bank Flow
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl font-bold mt-2 font-mono ${
              netCashFlow >= 0 ? 'text-teal-400' : 'text-rose-400'
            }`}
          >
            {netCashFlow >= 0 ? '+' : ''}₹
            {netCashFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {netCashFlow >= 0 ? 'Net positive liquidity' : 'Net negative liquidity'}
          </span>
        </div>

        {/* Total Vouchers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Settled Vouchers
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-white mt-2 font-mono">
            {payments.length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            All vouchers in general ledger
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Type Toggle Tabs matching InvoiceView chips */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full p-1 text-xs w-full sm:w-auto overflow-x-auto no-scrollbar shadow-inner">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer flex-1 sm:flex-initial text-center whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Vouchers ({payments.length})
          </button>
          <button
            onClick={() => setActiveFilter('receipt')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap ${
              activeFilter === 'receipt'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                : 'text-slate-400 hover:text-teal-300'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Receipts ({receiptsCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('payment')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap ${
              activeFilter === 'payment'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Payments ({paymentsCount})</span>
          </button>
        </div>

        {/* Search & Mode Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search party, voucher #, UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>

          <AppSelect
            value={paymentModeFilter}
            onChange={(val) => setPaymentModeFilter(val)}
            size="sm"
            options={[
              { value: 'all', label: 'All Modes' },
              { value: 'bank_transfer', label: 'Bank Transfer / NEFT' },
              { value: 'upi', label: 'UPI' },
              { value: 'cash', label: 'Cash' },
              { value: 'cheque', label: 'Cheque' },
              { value: 'neft_rtgs', label: 'RTGS' },
            ]}
          />

          <button
            onClick={onRefresh}
            title="Refresh list"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Voucher No.</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Party Name</th>
                <th className="py-3.5 px-4">Account & Mode</th>
                <th className="py-3.5 px-4">Ref / Cheque #</th>
                <th className="py-3.5 px-4">Linked Invoice</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && filteredPayments.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse animate-shimmer">
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-24 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-5 w-20 bg-slate-800 mx-auto rounded-full" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-36 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-24 bg-slate-800/70 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-slate-800/60 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-24 bg-slate-800/50 rounded" /></td>
                    <td className="py-3 px-4 text-right"><div className="h-4 w-24 bg-slate-800/90 ml-auto rounded" /></td>
                    <td className="py-3 px-4 text-center"><div className="h-6 w-16 bg-slate-800 mx-auto rounded" /></td>
                  </tr>
                ))
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-400">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-200">
                        No {activeFilter === 'all' ? '' : activeFilter} vouchers found
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {searchQuery
                          ? 'Try modifying your search keywords or clearing filters.'
                          : 'Record a receipt from a customer or a payment to a supplier to start tracking cash flow.'}
                      </p>
                      {canCreate && (
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => openNewVoucherModal('receipt')}
                            className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold rounded-xl text-xs transition cursor-pointer"
                          >
                            + Record Receipt
                          </button>
                          <button
                            onClick={() => openNewVoucherModal('payment')}
                            className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                          >
                            + Record Payment
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((voucher) => {
                  const isReceipt = voucher.voucherType === 'receipt';
                  const formattedDate = new Date(voucher.date).toLocaleDateString(
                    'en-IN',
                    { day: '2-digit', month: 'short', year: 'numeric' }
                  );

                  return (
                    <tr
                      key={voucher.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-300 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      <td className="py-3 px-4 font-mono font-medium whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-200 text-[11px] border border-slate-700/60">
                          {voucher.voucherNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isReceipt ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ArrowDownLeft className="w-3 h-3" />
                            Receipt (Inflow)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <ArrowUpRight className="w-3 h-3" />
                            Payment (Outflow)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {voucher.partyName}
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {voucher.partyType || (isReceipt ? 'Customer' : 'Vendor')}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-200 font-medium capitalize">
                          {voucher.paymentMode.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {voucher.bankName || (voucher.accountType === 'cash' ? 'Cash in Hand' : 'Bank Account')}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {voucher.referenceNumber || '—'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {voucher.invoiceNumber ? (
                          <button
                            onClick={() =>
                              onNavigateToInvoices &&
                              onNavigateToInvoices(voucher.invoiceId)
                            }
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium hover:underline cursor-pointer"
                            title="View settled invoice"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{voucher.invoiceNumber}</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
                            On Account / Advance
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`text-sm font-bold font-mono ${
                            isReceipt ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isReceipt ? '+' : '-'}₹
                          {parseFloat(voucher.amount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedVoucherForPrint(voucher)}
                            title="View & Print Voucher Slip"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={async () => {
                                const ok = await dialog.confirm({
                                  title: `Delete ${voucher.voucherType === 'receipt' ? 'Receipt' : 'Payment'} Voucher`,
                                  message: `Are you sure you want to delete voucher #${voucher.voucherNumber}? This will automatically revert any linked invoice paid amount and recalculate balances.`,
                                  confirmText: 'Delete Voucher',
                                  variant: 'danger',
                                  icon: 'trash',
                                });
                                if (ok) {
                                  onDeletePayment(voucher.id);
                                }
                              }}
                              title="Delete Voucher"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VOUCHER CREATION MODAL */}
      {/* ======================================================== */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                    modalType === 'receipt'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {modalType === 'receipt' ? (
                    <ArrowDownLeft className="w-5 h-5 font-bold" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 font-bold" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">
                    {modalType === 'receipt'
                      ? 'Record Receipt Voucher (Money In)'
                      : 'Record Payment Voucher (Money Out)'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    {modalType === 'receipt'
                      ? 'Record funds received from customer into Cash or Bank ledger'
                      : 'Record funds disbursed to vendor from Cash or Bank ledger'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-slate-900 flex flex-col justify-between">
              <div className="space-y-4 sm:space-y-5">
              {formError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Type Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setModalType('receipt');
                    fetchNextNumber('receipt');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                    modalType === 'receipt'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Receipt (From Customer)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalType('payment');
                    fetchNextNumber('payment');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                    modalType === 'payment'
                      ? 'bg-rose-500 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Payment (To Vendor)</span>
                </button>
              </div>

              {/* Row: Voucher Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Voucher Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={voucherNumber}
                      onChange={(e) => setVoucherNumber(e.target.value)}
                      placeholder={
                        modalType === 'receipt' ? 'REC/2026-27/001' : 'PAY/2026-27/001'
                      }
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-medium text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Voucher Date <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      value={voucherDate}
                      onChange={(e) => setVoucherDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Party Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {modalType === 'receipt' ? 'Received From (Customer / Debtor)' : 'Paid To (Vendor / Creditor)'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <PartyMatchSelector
                  parties={parties}
                  partyTypeFilter={modalType === 'receipt' ? 'customer' : 'vendor'}
                  selectedPartyId={selectedPartyId ? parseInt(selectedPartyId) : undefined}
                  partyName={partyName}
                  onSelectParty={(party) => {
                    if (party) {
                      setSelectedPartyId(String(party.id));
                      setPartyName(party.name);
                    } else {
                      setSelectedPartyId('');
                    }
                  }}
                  onCustomNameChange={(name) => {
                    setPartyName(name);
                    setSelectedPartyId('');
                  }}
                  placeholder={
                    modalType === 'receipt'
                      ? 'Search customer by name, GSTIN, phone...'
                      : 'Search vendor by name, GSTIN, phone...'
                  }
                  allowCustom={true}
                  required={true}
                />
              </div>

              {/* Pending Invoices / Bills for Party (if any) */}
              {targetPartyInvoices.length > 0 && (
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Pending {modalType === 'receipt' ? 'Sales Invoices' : 'Purchase Bills'} for this party:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Click any invoice to settle
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {targetPartyInvoices.map((inv) => {
                      const unpaid = Math.max(
                        0,
                        parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount)
                      );
                      const isSelected = selectedInvoiceId === String(inv.id);

                      return (
                        <div
                          key={inv.id}
                          onClick={() => handleSelectInvoice(inv)}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-white">
                              #{inv.invoiceNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {inv.invoiceDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-[11px]">
                              Total: ₹{inv.grandTotal}
                            </span>
                            <span className="font-bold text-rose-400 font-mono">
                              Due: ₹{unpaid.toFixed(2)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isSelected
                                  ? 'bg-emerald-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amount and Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white font-mono placeholder-slate-600 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Mode <span className="text-rose-400">*</span>
                  </label>
                  <AppSelect
                    value={paymentMode}
                    onChange={(val: any) => {
                      setPaymentMode(val);
                      if (val === 'cash') {
                        setAccountType('cash');
                        setBankName('Cash in Hand');
                      } else {
                        setAccountType('bank');
                        setBankName(company?.bankName || 'HDFC Bank Ltd');
                      }
                    }}
                    size="sm"
                    className="w-full"
                    buttonClassName="w-full bg-slate-950"
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer / NEFT' },
                      { value: 'upi', label: 'UPI (Instant Payment)' },
                      { value: 'cash', label: 'Cash' },
                      { value: 'cheque', label: 'Cheque' },
                      { value: 'neft_rtgs', label: 'RTGS' },
                    ]}
                  />
                </div>
              </div>

              {/* Bank Name & Reference / UTR Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bank / Ledger Account
                  </label>
                  <div className="relative">
                    <Landmark className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, SBI, Cash in Hand"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. UTR192849182 / Chq #482910"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs py-2 px-3 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>

              {/* Narration / Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received full and final settlement for invoice #INV/2026-27/001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs py-2 px-3 text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
                />
              </div>

              </div>

              {/* Modal Footer */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    modalType === 'receipt'
                      ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Save {modalType === 'receipt' ? 'Receipt' : 'Payment'} Voucher
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PRINTABLE VOUCHER SLIP MODAL */}
      {/* ======================================================== */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden my-auto print:shadow-none print:m-0 print:w-full print:max-h-none">
            {/* Modal Controls Bar */}
            <div className="bg-slate-950 text-white px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-xs sm:text-sm">
                  {selectedVoucherForPrint.voucherType === 'receipt'
                    ? 'Official Receipt Voucher Slip'
                    : 'Official Payment Voucher Slip'}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Voucher Printable Layout */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 text-slate-900 space-y-4 sm:space-y-6 print:p-0 print:overflow-visible">
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                    {company?.tradeName || company?.businessName || 'Bharat Tech ERP'}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mt-1">
                    {company?.address || 'Mumbai, Maharashtra'}
                  </p>
                  <p className="text-xs font-mono font-semibold text-slate-700 mt-1">
                    GSTIN: {company?.gstin || '27AAECB9382M1ZR'}
                  </p>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <div
                    className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      selectedVoucherForPrint.voucherType === 'receipt'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    {selectedVoucherForPrint.voucherType === 'receipt'
                      ? 'RECEIPT VOUCHER'
                      : 'PAYMENT VOUCHER'}
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-900 mt-2">
                    No: {selectedVoucherForPrint.voucherNumber}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Date:{' '}
                    {new Date(selectedVoucherForPrint.date).toLocaleDateString(
                      'en-IN',
                      { day: '2-digit', month: 'short', year: 'numeric' }
                    )}
                  </p>
                </div>
              </div>

              {/* Body Details */}
              <div className="space-y-3 sm:space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-slate-200 pb-2 gap-0.5 sm:gap-2">
                  <span className="w-auto sm:w-36 text-slate-500 font-medium shrink-0">
                    {selectedVoucherForPrint.voucherType === 'receipt'
                      ? 'Received with thanks from:'
                      : 'Paid to Account of:'}
                  </span>
                  <span className="flex-1 font-bold text-slate-900 text-sm">
                    {selectedVoucherForPrint.partyName}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-slate-200 pb-2 gap-0.5 sm:gap-2">
                  <span className="w-auto sm:w-36 text-slate-500 font-medium shrink-0">
                    The Sum of:
                  </span>
                  <span className="flex-1 font-bold text-emerald-800 text-base font-mono">
                    ₹
                    {parseFloat(selectedVoucherForPrint.amount).toLocaleString(
                      'en-IN',
                      { minimumFractionDigits: 2 }
                    )}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-slate-200 pb-2 gap-0.5 sm:gap-2">
                  <span className="w-auto sm:w-36 text-slate-500 font-medium shrink-0">
                    Payment Mode:
                  </span>
                  <span className="flex-1 font-semibold text-slate-800 capitalize">
                    {selectedVoucherForPrint.paymentMode.replace('_', ' ')} (
                    {selectedVoucherForPrint.bankName || 'Bank Account'})
                  </span>
                </div>

                {selectedVoucherForPrint.referenceNumber && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-slate-200 pb-2 gap-0.5 sm:gap-2">
                    <span className="w-auto sm:w-36 text-slate-500 font-medium shrink-0">
                      Cheque / UTR Ref #:
                    </span>
                    <span className="flex-1 font-mono font-medium text-slate-800">
                      {selectedVoucherForPrint.referenceNumber}
                    </span>
                  </div>
                )}

                {selectedVoucherForPrint.invoiceNumber && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-slate-200 pb-2 gap-0.5 sm:gap-2">
                    <span className="w-auto sm:w-36 text-slate-500 font-medium shrink-0">
                      Against Invoice #:
                    </span>
                    <span className="flex-1 font-mono font-bold text-slate-800">
                      {selectedVoucherForPrint.invoiceNumber}
                    </span>
                  </div>
                )}

                {selectedVoucherForPrint.notes && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline border-b border-slate-200 pb-2 gap-0.5 sm:gap-2">
                    <span className="w-auto sm:w-36 text-slate-500 font-medium shrink-0">
                      Narration:
                    </span>
                    <span className="flex-1 text-slate-700 italic">
                      "{selectedVoucherForPrint.notes}"
                    </span>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 text-xs text-slate-500">
                <div className="text-center w-full sm:w-auto">
                  <div className="w-full sm:w-36 border-t border-slate-400 pt-1">
                    Receiver's Signature
                  </div>
                </div>
                <div className="text-center w-full sm:w-auto">
                  <div className="w-full sm:w-44 border-t border-slate-400 pt-1">
                    <p className="font-semibold text-slate-800">
                      For {company?.tradeName || company?.businessName || 'Bharat Tech ERP'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Authorized Signatory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
