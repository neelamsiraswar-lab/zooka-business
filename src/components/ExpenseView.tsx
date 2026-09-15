import React, { useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { AppSelect } from './AppSelect';
import { Expense } from '../types';
import { SkeletonMetricGrid, SkeletonTable } from './SkeletonLoaders';
import {
  TrendingDown,
  Plus,
  Receipt,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  X,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Building,
  CreditCard,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission, UserRole } from '../lib/permissions';

interface ExpenseViewProps {
  expenses: Expense[];
  onSaveExpense: (exp: any, expenseId?: number) => Promise<void>;
  onDeleteExpense?: (expenseId: number) => Promise<void>;
  loading: boolean;
}

const EXPENSE_CATEGORIES = [
  'Rent & Warehouse',
  'Salaries & Staff',
  'Utilities & Internet',
  'Transport/Freight',
  'Office Supplies',
  'Marketing & Ads',
  'Repairs & Maintenance',
  'Professional Fees',
  'Software & Cloud',
  'Raw Materials / Consumables',
  'Travel & Lodging',
  'Other Expenses',
];

export const ExpenseView: React.FC<ExpenseViewProps> = ({
  expenses,
  onSaveExpense,
  onDeleteExpense,
  loading,
}) => {
  const { profile } = useAuth();
  const currentUserRole: UserRole = (profile?.role as UserRole) || 'accountant';

  const canCreate = hasPermission(currentUserRole, 'expenses:create');
  const canEdit = hasPermission(currentUserRole, 'expenses:edit');
  const canDelete = hasPermission(currentUserRole, 'expenses:delete');

  const dialog = useDialog();
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Deletion modal state
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [itcFilter, setItcFilter] = useState<'ALL' | 'ELIGIBLE' | 'INELIGIBLE'>('ALL');

  // Form states
  const [category, setCategory] = useState('Office Supplies');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [vendorName, setVendorName] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstPaid, setGstPaid] = useState('0.00');
  const [itcEligible, setItcEligible] = useState(true);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');

  // Open modal for new expense
  const handleOpenNewModal = () => {
    setEditingExpense(null);
    setCategory('Office Supplies');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('bank_transfer');
    setVendorName('');
    setGstin('');
    setGstPaid('0.00');
    setItcEligible(true);
    setReferenceNumber('');
    setDescription('');
    setShowModal(true);
  };

  // Open modal for editing existing expense
  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setCategory(exp.category || 'Office Supplies');
    setAmount(String(exp.amount || ''));
    setDate(exp.date || new Date().toISOString().split('T')[0]);
    setPaymentMode(exp.paymentMode || 'bank_transfer');
    setVendorName(exp.vendorName || '');
    setGstin(exp.gstin || '');
    setGstPaid(String(exp.gstPaid || '0.00'));
    setItcEligible(exp.itcEligible !== undefined ? !!exp.itcEligible : true);
    setReferenceNumber(exp.referenceNumber || '');
    setDescription(exp.description || '');
    setShowModal(true);
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      dialog.alert({
        title: 'Invalid Amount',
        message: 'Please enter a valid expense amount greater than zero.',
        variant: 'warning',
      });
      return;
    }

    const payload = {
      category,
      amount,
      date,
      paymentMode,
      vendorName: vendorName.trim() || null,
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      gstPaid: gstPaid ? String(gstPaid) : '0.00',
      itcEligible,
      referenceNumber: referenceNumber.trim() || null,
      description: description.trim() || null,
    };

    await onSaveExpense(payload, editingExpense ? editingExpense.id : undefined);

    setShowModal(false);
    setEditingExpense(null);
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (!deletingExpense || !onDeleteExpense) return;
    setIsDeleting(true);
    try {
      await onDeleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    } catch (err) {
      console.error('Delete expense failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered expenses calculation
  const filteredExpenses = expenses.filter((exp) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchVendor = (exp.vendorName || '').toLowerCase().includes(q);
      const matchCategory = (exp.category || '').toLowerCase().includes(q);
      const matchDesc = (exp.description || '').toLowerCase().includes(q);
      const matchGstin = (exp.gstin || '').toLowerCase().includes(q);
      const matchRef = (exp.referenceNumber || '').toLowerCase().includes(q);
      if (!matchVendor && !matchCategory && !matchDesc && !matchGstin && !matchRef) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) {
      return false;
    }

    // ITC filter
    if (itcFilter === 'ELIGIBLE' && !exp.itcEligible) return false;
    if (itcFilter === 'INELIGIBLE' && exp.itcEligible) return false;

    return true;
  });

  // KPIs
  const totalExpenseSum = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const totalItcClaimable = expenses
    .filter((e) => e.itcEligible)
    .reduce((acc, curr) => acc + (parseFloat(curr.gstPaid) || 0), 0);
  const totalIneligible = expenses
    .filter((e) => !e.itcEligible)
    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  if (loading && expenses.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="space-y-2">
            <div className="h-6 w-52 bg-slate-800 rounded-lg animate-pulse animate-shimmer" />
            <div className="h-3.5 w-80 bg-slate-800/60 rounded animate-pulse animate-shimmer" />
          </div>
          <div className="h-10 w-36 bg-slate-800 rounded-xl animate-pulse animate-shimmer" />
        </div>
        <SkeletonMetricGrid count={3} cols="grid-cols-1 sm:grid-cols-3" />
        <SkeletonTable columns={8} rows={6} hasHeader={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-400" />
            Intuitive Expense Tracking & Input Tax Credit (ITC)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Categorize operational overheads, claim eligible GST Input Tax Credits (ITC), and manage records with full edit and delete controls.
          </p>
        </div>

        {canCreate ? (
          <button
            type="button"
            id="record-expense-btn"
            onClick={handleOpenNewModal}
            className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-rose-500/20 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700/60 text-xs shrink-0">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Read-Only Mode</span>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Total Recorded Overheads</span>
          <p className="text-xl font-bold text-white mt-1">
            ₹{totalExpenseSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">{expenses.length} voucher records</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Eligible Input Tax Credit (ITC)</span>
          <p className="text-xl font-bold text-teal-400 mt-1">
            ₹{totalItcClaimable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Offsets GSTR-3B tax liability</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Non-ITC Overheads</span>
          <p className="text-xl font-bold text-slate-300 mt-1">
            ₹{totalIneligible.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Exempt / Unregistered / Direct</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vendor, category, memo, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* ITC Filter Tabs */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setItcFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition ${
                itcFilter === 'ALL'
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setItcFilter('ELIGIBLE')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                itcFilter === 'ELIGIBLE'
                  ? 'bg-teal-500/20 text-teal-300 font-medium'
                  : 'text-slate-400 hover:text-teal-300'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              ITC Eligible
            </button>
            <button
              type="button"
              onClick={() => setItcFilter('INELIGIBLE')}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                itcFilter === 'INELIGIBLE'
                  ? 'bg-rose-500/20 text-rose-300 font-medium'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <XCircle className="w-3 h-3" />
              Non-ITC
            </button>
          </div>

          {/* Category Dropdown */}
          <AppSelect
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            size="sm"
            searchable={true}
            searchPlaceholder="Filter category..."
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Vendor & Details</th>
                <th className="py-3.5 px-4">Payment Mode</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4 text-right">GST Paid (₹)</th>
                <th className="py-3.5 px-4 text-center">ITC Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && filteredExpenses.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse animate-shimmer">
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-slate-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-36 bg-slate-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-800/70 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-slate-800 ml-auto rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-slate-800 ml-auto rounded" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-5 w-20 bg-slate-800 mx-auto rounded-full" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-6 w-16 bg-slate-800 mx-auto rounded" /></td>
                  </tr>
                ))
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-slate-400">No expense records found</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {searchQuery || categoryFilter !== 'ALL' || itcFilter !== 'ALL'
                        ? 'Try adjusting your search or filter options.'
                        : 'Click "Record Expense" above to record business overheads and claim ITC.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition group">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap font-mono">{exp.date}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] whitespace-nowrap">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{exp.vendorName || 'Direct Expense'}</div>
                      {exp.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1">{exp.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {exp.gstin && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            GSTIN: {exp.gstin}
                          </span>
                        )}
                        {exp.referenceNumber && (
                          <span className="text-[10px] text-slate-500">Ref: {exp.referenceNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-slate-400 text-[11px] whitespace-nowrap">
                      {exp.paymentMode.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                      ₹{parseFloat(exp.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-teal-300 whitespace-nowrap">
                      ₹{parseFloat(exp.gstPaid).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {exp.itcEligible ? (
                        <span className="inline-flex items-center gap-1 text-teal-400 text-[11px] font-medium bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          <CheckCircle className="w-3 h-3" /> Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] bg-slate-800/60 px-2 py-0.5 rounded">
                          <XCircle className="w-3 h-3" /> Ineligible
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit Button */}
                        {canEdit && (
                          <button
                            type="button"
                            id={`edit-expense-btn-${exp.id}`}
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                            title="Edit expense & ITC details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Button */}
                        {onDeleteExpense && canDelete && (
                          <button
                            type="button"
                            id={`delete-expense-btn-${exp.id}`}
                            onClick={() => setDeletingExpense(exp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete expense voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!canEdit && !canDelete && (
                          <span className="text-[11px] text-slate-500 italic">Read-only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD / EDIT EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                <Receipt className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="truncate">{editingExpense ? 'Edit Expense & ITC Claim' : 'Record Business Expense'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingExpense(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Expense Category</label>
                  <AppSelect
                    value={category}
                    onChange={(val) => setCategory(val)}
                    size="sm"
                    className="w-full"
                    buttonClassName="w-full bg-slate-950"
                    searchable={true}
                    options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Total Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Payment Mode</label>
                  <AppSelect
                    value={paymentMode}
                    onChange={(val) => setPaymentMode(val)}
                    size="sm"
                    className="w-full"
                    buttonClassName="w-full bg-slate-950"
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer (NEFT/RTGS/IMPS)' },
                      { value: 'upi', label: 'UPI / Scanner' },
                      { value: 'cash', label: 'Cash' },
                      { value: 'credit_card', label: 'Corporate Card' },
                      { value: 'cheque', label: 'Cheque' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Vendor / Payee Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Electric Board / Landlord"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Invoice / Reference No.</label>
                  <input
                    type="text"
                    placeholder="Bill or voucher number"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Vendor GSTIN (Required for ITC Claim)
                </label>
                <input
                  type="text"
                  placeholder="15-digit GSTIN (e.g., 27AABCT3518Q1ZV)"
                  value={gstin}
                  maxLength={15}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* GST & ITC Section */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">Input Tax Credit (ITC) Configuration</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itcEligible}
                      onChange={(e) => setItcEligible(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-teal-400 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-teal-400 font-medium">Eligible for ITC</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">GST Component Paid (₹)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={gstPaid}
                      onChange={(e) => setGstPaid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-col justify-center">
                    {itcEligible ? (
                      <span className="text-teal-400">
                        ✓ Will credit against output sales tax in GSTR-3B monthly filing.
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        ✕ Treated as direct expense with no tax credit claimed.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Description / Memo</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes about this expense voucher..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpense(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/20 transition cursor-pointer text-center"
                >
                  {loading
                    ? 'Saving...'
                    : editingExpense
                    ? 'Update Expense & ITC'
                    : 'Post Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">Delete Expense Voucher?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to delete this expense of{' '}
                  <span className="text-white font-semibold font-mono">
                    ₹{parseFloat(deletingExpense.amount).toFixed(2)}
                  </span>{' '}
                  under <span className="text-white font-medium">{deletingExpense.category}</span>
                  {deletingExpense.vendorName ? ` from ${deletingExpense.vendorName}` : ''}?
                </p>
              </div>
            </div>

            {deletingExpense.itcEligible && parseFloat(deletingExpense.gstPaid) > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                ⚠️ <span className="font-semibold">ITC Warning:</span> Deleting this expense will also remove{' '}
                <span className="font-mono font-bold">
                  ₹{parseFloat(deletingExpense.gstPaid).toFixed(2)}
                </span>{' '}
                from your eligible Input Tax Credit pool in GSTR-3B calculations.
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingExpense(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:bg-slate-800 transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-expense-btn"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Expense'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
