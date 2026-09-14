import React, { useState, useMemo } from 'react';
import { Party, Invoice, PaymentVoucher, Cheque } from '../types';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { hasPermission, UserRole } from '../lib/permissions';
import { AppSelect } from './AppSelect';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  Printer,
  X,
  Sparkles,
  FileText,
  Phone,
  Mail,
  MapPin,
  Building2,
  CheckCircle2,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

interface LedgersViewProps {
  parties: Party[];
  invoices?: Invoice[];
  payments?: PaymentVoucher[];
  cheques?: Cheque[];
  onAddParty: (party: any) => Promise<void>;
  onEditParty?: (id: number, party: any) => Promise<void>;
  onDeleteParty?: (id: number) => Promise<void>;
  onNavigateToInvoices?: () => void;
  onNavigateToSales?: () => void;
  onNavigateToPurchases?: () => void;
  onRecordPayment?: (party: Party, defaultType: 'receipt' | 'payment') => void;
  loading: boolean;
}

export const LedgersView: React.FC<LedgersViewProps> = ({
  parties,
  invoices = [],
  payments = [],
  cheques = [],
  onAddParty,
  onEditParty,
  onDeleteParty,
  onNavigateToInvoices,
  onNavigateToSales,
  onNavigateToPurchases,
  onRecordPayment,
  loading,
}) => {
  const dialog = useDialog();
  const { profile } = useAuth();
  const currentUserRole: UserRole = (profile?.role as UserRole) || 'accountant';
  const canCreateParty = hasPermission(currentUserRole, 'parties:create');
  const canEditParty = hasPermission(currentUserRole, 'parties:edit');
  const canDeleteParty = hasPermission(currentUserRole, 'parties:delete');
  const canRecordPayment = hasPermission(currentUserRole, 'payments:create');
  const canCreateSalesInvoice = hasPermission(currentUserRole, 'sales:create');
  const canCreatePurchaseBill = hasPermission(currentUserRole, 'purchases:create');

  const [search, setSearch] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState<'all' | 'customer' | 'vendor'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'billed'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [statementParty, setStatementParty] = useState<Party | null>(null);

  // Party Form State
  const [partyType, setPartyType] = useState<'customer' | 'vendor'>('customer');
  const [partyName, setPartyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [stateName, setStateName] = useState('Maharashtra');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [balanceType, setBalanceType] = useState<'dr' | 'cr'>('dr');

  const customerList = parties.filter((p) => p.partyType === 'customer');
  const vendorList = parties.filter((p) => p.partyType === 'vendor');

  const totalReceivables = customerList.reduce((acc, p) => {
    const bal = parseFloat(p.currentBalance || p.openingBalance) || 0;
    const isDr = (p.currentBalanceType || p.balanceType) === 'dr';
    return acc + (isDr ? bal : -bal);
  }, 0);

  const totalPayables = vendorList.reduce((acc, p) => {
    const bal = parseFloat(p.currentBalance || p.openingBalance) || 0;
    const isCr = (p.currentBalanceType || p.balanceType) === 'cr';
    return acc + (isCr ? bal : -bal);
  }, 0);

  const filteredParties = useMemo(() => {
    const result = parties.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase())) ||
        (p.phone && p.phone.includes(search)) ||
        (p.stateName && p.stateName.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;
      if (partyTypeFilter === 'customer') return p.partyType === 'customer';
      if (partyTypeFilter === 'vendor') return p.partyType === 'vendor';
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortBy === 'balance') {
        const balA = parseFloat(a.currentBalance || a.openingBalance) || 0;
        const balB = parseFloat(b.currentBalance || b.openingBalance) || 0;
        return sortOrder === 'asc' ? balA - balB : balB - balA;
      }
      if (sortBy === 'billed') {
        const bA = parseFloat(a.totalInvoiced || '0') || 0;
        const bB = parseFloat(b.totalInvoiced || '0') || 0;
        return sortOrder === 'asc' ? bA - bB : bB - bA;
      }
      return 0;
    });

    return result;
  }, [parties, search, partyTypeFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'balance' | 'billed') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreatePartyModal = () => {
    setEditingParty(null);
    setPartyType('customer');
    setPartyName('');
    setGstin('');
    setStateCode('27');
    setStateName('Maharashtra');
    setPhone('');
    setEmail('');
    setAddress('');
    setOpeningBalance('0');
    setBalanceType('dr');
    setShowPartyModal(true);
  };

  const openEditPartyModal = (p: Party) => {
    setEditingParty(p);
    setPartyType(p.partyType);
    setPartyName(p.name);
    setGstin(p.gstin || '');
    setStateCode(p.stateCode || '27');
    setStateName(p.stateName || 'Maharashtra');
    setPhone(p.phone || '');
    setEmail(p.email || '');
    setAddress(p.address || '');
    setOpeningBalance(p.openingBalance || '0');
    setBalanceType(p.balanceType);
    setShowPartyModal(true);
  };

  const handleCreateOrEditParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;
    const payload = {
      partyType,
      name: partyName.trim(),
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      stateCode,
      stateName,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      openingBalance,
      balanceType,
    };

    if (editingParty && onEditParty) {
      await onEditParty(editingParty.id, payload);
    } else {
      await onAddParty(payload);
    }
    setShowPartyModal(false);
    setEditingParty(null);
  };

  const handleDeletePartyConfirm = async (p: Party) => {
    if (!onDeleteParty) return;
    const isCust = p.partyType === 'customer';
    const confirmed = await dialog.confirm({
      title: `Delete ${isCust ? 'Customer' : 'Vendor'} Account?`,
      message: (
        <div className="space-y-2">
          <p className="text-slate-300 text-sm">
            Are you sure you want to delete <strong className="text-white font-semibold">{p.name}</strong> ({isCust ? 'Sundry Debtor' : 'Sundry Creditor'})?
          </p>
          <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-300">Data Preservation Notice:</div>
            <p>All historic invoices, payments, vouchers, and transactions will remain securely in your financial books with party link set to unassigned.</p>
          </div>
        </div>
      ),
      confirmText: `Delete ${isCust ? 'Customer' : 'Vendor'}`,
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      if (statementParty?.id === p.id) {
        setStatementParty(null);
      }
      if (editingParty?.id === p.id) {
        setShowPartyModal(false);
        setEditingParty(null);
      }
      await onDeleteParty(p.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Customer & Vendor Ledgers</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tally-style debtor/creditor ledger accounts with GSTIN tracking, automated voucher sync, and running balance statements.
          </p>
        </div>

        {canCreateParty && (
          <button
            onClick={openCreatePartyModal}
            id="add-party-btn"
            className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 font-bold" />
            <span>Add Party (Debtor/Creditor)</span>
          </button>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Total Customers & Receivables</span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            ₹{Math.max(0, totalReceivables).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-emerald-300 font-sans font-medium">Dr</span>
          </p>
          <span className="text-[11px] text-slate-500">
            {customerList.length} Customer / Debtor accounts
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Total Vendors & Payables</span>
          <p className="text-xl font-bold font-mono text-blue-400 mt-1">
            ₹{Math.max(0, totalPayables).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
            <span className="text-xs text-blue-300 font-sans font-medium">Cr</span>
          </p>
          <span className="text-[11px] text-slate-500">
            {vendorList.length} Vendor / Creditor accounts
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Automatic Ledger Sync</span>
          <p className="text-base font-bold text-teal-300 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Invoices & Bills Synced</span>
          </p>
          <span className="text-[11px] text-slate-500">
            Parties & running ledger balances update instantly on voucher creation
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search party by name, phone, GSTIN, city or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Party Type Filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setPartyTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                partyTypeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({parties.length})
            </button>
            <button
              onClick={() => setPartyTypeFilter('customer')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                partyTypeFilter === 'customer'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Customers ({customerList.length})
            </button>
            <button
              onClick={() => setPartyTypeFilter('vendor')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                partyTypeFilter === 'vendor'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendors ({vendorList.length})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => toggleSort('name')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition ${
                sortBy === 'name' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Sort by Name"
            >
              <span>Name</span>
              {sortBy === 'name' && (
                <span className="text-[10px] text-emerald-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('balance')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition ${
                sortBy === 'balance' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Sort by Net Balance"
            >
              <span>Balance</span>
              {sortBy === 'balance' && (
                <span className="text-[10px] text-emerald-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleSort('billed')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition ${
                sortBy === 'billed' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
              title="Sort by Total Billed"
            >
              <span>Billed</span>
              {sortBy === 'billed' && (
                <span className="text-[10px] text-emerald-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Table List View"
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* PARTIES LIST OR GRID CONTENT */}
      {viewMode === 'list' ? (
        /* TABLE LIST UI */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Party & Ledger Account</th>
                  <th className="py-3 px-4">Group / Type</th>
                  <th className="py-3 px-4">GSTIN & State</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4 text-right">Opening Bal</th>
                  <th className="py-3 px-4 text-right">Total Billed</th>
                  <th className="py-3 px-4 text-right">Total Settled</th>
                  <th className="py-3 px-4 text-right">Net Closing Balance</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredParties.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-slate-500 bg-slate-900/50">
                      No parties found matching your search. Click &quot;Add Party&quot; above to create one.
                    </td>
                  </tr>
                ) : (
                  filteredParties.map((p) => {
                    const curBal = parseFloat(p.currentBalance || p.openingBalance) || 0;
                    const curType = (p.currentBalanceType || p.balanceType || 'dr').toUpperCase();
                    const isDr = curType === 'DR';
                    const totalInv = parseFloat(p.totalInvoiced || '0') || 0;
                    const totalPd = parseFloat(p.totalPaid || '0') || 0;
                    const isCustomer = p.partyType === 'customer';

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        {/* Party Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                              {isCustomer ? (
                                <Users className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                                <span className="truncate">{p.name}</span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-teal-300 font-normal">
                                  Auto-Synced
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Code: PTY-{String(p.id).padStart(4, '0')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Group / Type */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1 ${
                              isCustomer
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {isCustomer ? 'Sundry Debtor' : 'Sundry Creditor'}
                          </span>
                        </td>

                        {/* GSTIN & State */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {p.gstin ? (
                            <div className="font-mono text-slate-200 text-[11px] font-medium">
                              {p.gstin}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Unregistered</span>
                          )}
                          <div className="text-[10px] text-slate-400">
                            {p.stateName || 'Maharashtra'} ({p.stateCode || '27'})
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4 text-[11px] text-slate-300">
                          {p.phone && (
                            <div className="flex items-center gap-1 text-slate-300">
                              <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{p.phone}</span>
                            </div>
                          )}
                          {p.email && (
                            <div className="flex items-center gap-1 text-slate-400 text-[10px] truncate max-w-[150px]">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{p.email}</span>
                            </div>
                          )}
                          {!p.phone && !p.email && <span className="text-slate-600">-</span>}
                        </td>

                        {/* Opening Balance */}
                        <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                          ₹{parseFloat(p.openingBalance || '0').toLocaleString('en-IN')}{' '}
                          <span className="uppercase text-[10px]">{p.balanceType}</span>
                        </td>

                        {/* Total Billed */}
                        <td className="py-3 px-4 text-right font-mono text-slate-200 font-medium whitespace-nowrap">
                          {totalInv > 0 ? (
                            `₹${totalInv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-600">₹0.00</span>
                          )}
                        </td>

                        {/* Total Settled */}
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium whitespace-nowrap">
                          {totalPd > 0 ? (
                            `₹${totalPd.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-600">₹0.00</span>
                          )}
                        </td>

                        {/* Net Closing Balance */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div
                            className={`text-xs font-bold font-mono ${
                              isDr ? 'text-emerald-400' : 'text-blue-400'
                            }`}
                          >
                            ₹{curBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              isDr ? 'text-emerald-400' : 'text-blue-400'
                            }`}
                          >
                            {curType} {isDr ? '(Receivable)' : '(Payable)'}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setStatementParty(p)}
                              id={`view-statement-${p.id}`}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="View Running Ledger Statement"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Statement</span>
                            </button>

                            {canRecordPayment && onRecordPayment && (
                              <button
                                onClick={() =>
                                  onRecordPayment(
                                    p,
                                    isCustomer ? 'receipt' : 'payment'
                                  )
                                }
                                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer border ${
                                  isCustomer
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                                }`}
                                title={
                                  isCustomer
                                    ? 'Record Receipt from Customer'
                                    : 'Record Payment to Vendor'
                                }
                              >
                                {isCustomer ? (
                                  <>
                                    <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                                    <span>Receipt</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpRight className="w-3 h-3 text-rose-400" />
                                    <span>Payment</span>
                                  </>
                                )}
                              </button>
                            )}

                            {((isCustomer && canCreateSalesInvoice) || (!isCustomer && canCreatePurchaseBill)) && (onNavigateToSales || onNavigateToPurchases || onNavigateToInvoices) && (
                              <button
                                onClick={() => {
                                  if (isCustomer) {
                                    if (onNavigateToSales) onNavigateToSales();
                                    else if (onNavigateToInvoices) onNavigateToInvoices();
                                  } else {
                                    if (onNavigateToPurchases) onNavigateToPurchases();
                                    else if (onNavigateToInvoices) onNavigateToInvoices();
                                  }
                                }}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                                title={isCustomer ? 'Create Sales Invoice' : 'Create Purchase Bill'}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{isCustomer ? 'Invoice' : 'Bill'}</span>
                              </button>
                            )}

                            {canEditParty && (
                              <button
                                onClick={() => openEditPartyModal(p)}
                                id={`edit-party-${p.id}`}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                                title="Edit party details"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}

                            {canDeleteParty && onDeleteParty && (
                              <button
                                onClick={() => handleDeletePartyConfirm(p)}
                                id={`delete-party-${p.id}`}
                                className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-500/30"
                                title={`Delete ${isCustomer ? 'Customer' : 'Vendor'} account`}
                              >
                                <Trash2 className="w-3 h-3" />
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

          {/* List Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <strong className="text-white">{filteredParties.length}</strong> of{' '}
              <strong className="text-white">{parties.length}</strong> total parties
            </div>
            <div className="flex items-center gap-4">
              <span>
                Total Receivables (Dr):{' '}
                <strong className="text-emerald-400 font-mono">
                  ₹{Math.max(0, totalReceivables).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </span>
              <span>
                Total Payables (Cr):{' '}
                <strong className="text-blue-400 font-mono">
                  ₹{Math.max(0, totalPayables).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* CARD GRID UI */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParties.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              No parties found matching your search. Click &quot;Add Party&quot; above to create one.
            </div>
          ) : (
            filteredParties.map((p) => {
              const curBal = parseFloat(p.currentBalance || p.openingBalance) || 0;
              const curType = (p.currentBalanceType || p.balanceType || 'dr').toUpperCase();
              const isDr = curType === 'DR';
              const totalInv = parseFloat(p.totalInvoiced || '0') || 0;
              const totalPd = parseFloat(p.totalPaid || '0') || 0;

              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3.5 hover:border-slate-700 transition flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                          p.partyType === 'customer'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        {p.partyType === 'customer' ? 'Customer (Debtor)' : 'Vendor (Creditor)'}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 text-[10px] text-teal-300 flex items-center gap-1 font-medium">
                        <Sparkles className="w-2.5 h-2.5 text-teal-400" />
                        Auto-Synced
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-white mt-2 tracking-tight">{p.name}</h3>

                    {/* Net Ledger Balance Card */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          Current Net Balance
                        </span>
                        <span
                          className={`text-base font-bold font-mono ${
                            isDr ? 'text-emerald-400' : 'text-blue-400'
                          }`}
                        >
                          ₹{curBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                          <span className="text-xs font-semibold">{curType}</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Opening</span>
                        <span className="text-xs font-mono text-slate-400">
                          ₹{parseFloat(p.openingBalance).toLocaleString('en-IN')}{' '}
                          <span className="uppercase text-[10px]">{p.balanceType}</span>
                        </span>
                      </div>
                    </div>

                    {/* Billed vs Paid Summary */}
                    {(totalInv > 0 || totalPd > 0) && (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
                        <div>
                          <span className="text-slate-500 block">Total Billed:</span>
                          <span className="font-mono text-slate-200 font-semibold">
                            ₹{totalInv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block">Total Settled:</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            ₹{totalPd.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">State:</span>
                        <span className="font-medium text-slate-300">
                          {p.stateName || 'Maharashtra'} ({p.stateCode || '27'})
                        </span>
                      </div>

                      {p.gstin && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">GSTIN:</span>
                          <span className="font-mono text-slate-200 font-medium">{p.gstin}</span>
                        </div>
                      )}

                      {p.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Phone:</span>
                          <span className="text-slate-300">{p.phone}</span>
                        </div>
                      )}

                      {p.address && (
                        <div className="text-[11px] text-slate-400 truncate pt-1" title={p.address}>
                          {p.address}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setStatementParty(p)}
                      id={`view-statement-${p.id}`}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="View Ledger Statement"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Statement</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {canEditParty && (
                        <button
                          onClick={() => openEditPartyModal(p)}
                          id={`edit-party-${p.id}`}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                          title="Edit party details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canDeleteParty && onDeleteParty && (
                        <button
                          onClick={() => handleDeletePartyConfirm(p)}
                          id={`delete-party-card-${p.id}`}
                          className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-500/30"
                          title={`Delete ${p.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canRecordPayment && onRecordPayment && (
                        <button
                          onClick={() =>
                            onRecordPayment(
                              p,
                              p.partyType === 'customer' ? 'receipt' : 'payment'
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer border ${
                            p.partyType === 'customer'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                          title={
                            p.partyType === 'customer'
                              ? 'Record Receipt from Customer'
                              : 'Record Payment to Vendor'
                          }
                        >
                          {p.partyType === 'customer' ? (
                            <>
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Receipt</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                              <span>Payment</span>
                            </>
                          )}
                        </button>
                      )}

                      {(onNavigateToSales || onNavigateToPurchases || onNavigateToInvoices) && (
                        <button
                          onClick={() => {
                            if (p.partyType === 'customer') {
                              if (onNavigateToSales) onNavigateToSales();
                              else if (onNavigateToInvoices) onNavigateToInvoices();
                            } else {
                              if (onNavigateToPurchases) onNavigateToPurchases();
                              else if (onNavigateToInvoices) onNavigateToInvoices();
                            }
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                          title={p.partyType === 'customer' ? 'Create Sales Invoice' : 'Create Purchase Bill'}
                        >
                          <Plus className="w-3 h-3" />
                          <span>{p.partyType === 'customer' ? 'Invoice' : 'Bill'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CREATE / EDIT PARTY MODAL */}
      {showPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                <Users className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="truncate">{editingParty ? 'Edit Party Ledger Details' : 'Add Party (Customer or Vendor Ledger)'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowPartyModal(false);
                  setEditingParty(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrEditParty} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Party Type</label>
                  <AppSelect
                    value={partyType}
                    onChange={(val) => setPartyType(val as any)}
                    options={[
                      { value: 'customer', label: 'Customer (Sundry Debtor)' },
                      { value: 'vendor', label: 'Vendor (Sundry Creditor)' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Party / Business Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reliance Retail Ltd"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">GSTIN (15-digit)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AABCU9603R1ZM"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">State Code / Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Code (27)"
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="State Name"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9820012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. accounts@party.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Billing & Shipping Address</label>
                <textarea
                  rows={2}
                  placeholder="Plot 42, MIDC Industrial Area..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Balance Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceType('dr')}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        balanceType === 'dr'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      Debit (Dr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceType('cr')}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        balanceType === 'cr'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      Credit (Cr)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 pt-3 border-t border-slate-800 shrink-0">
                <div>
                  {editingParty && onDeleteParty && (
                    <button
                      type="button"
                      onClick={() => handleDeletePartyConfirm(editingParty)}
                      id={`delete-party-modal-${editingParty.id}`}
                      className="w-full sm:w-auto px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Party</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPartyModal(false);
                      setEditingParty(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer text-center"
                  >
                    {loading ? 'Saving...' : editingParty ? 'Update Party Ledger' : 'Save Party Ledger'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTY LEDGER STATEMENT MODAL */}
      {statementParty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      statementParty.partyType === 'customer'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {statementParty.partyType === 'customer' ? 'Customer Account' : 'Vendor Account'}
                  </span>
                  <span className="text-xs text-slate-500">ID #{statementParty.id}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1 flex items-center gap-2 truncate">
                  <BookOpen className="w-5 h-5 text-teal-400 shrink-0" />
                  <span className="truncate">{statementParty.name} — Ledger Statement</span>
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                  {statementParty.gstin && <span>GSTIN: <strong className="text-slate-200 font-mono">{statementParty.gstin}</strong></span>}
                  {statementParty.phone && <span>Phone: <strong className="text-slate-200">{statementParty.phone}</strong></span>}
                  {statementParty.email && <span>Email: <strong className="text-slate-200">{statementParty.email}</strong></span>}
                  {statementParty.address && <span className="line-clamp-1">Address: <strong className="text-slate-200">{statementParty.address}</strong></span>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onRecordPayment && (
                  <button
                    onClick={() => {
                      const type = statementParty.partyType === 'customer' ? 'receipt' : 'payment';
                      onRecordPayment(statementParty, type);
                      setStatementParty(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                      statementParty.partyType === 'customer'
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {statementParty.partyType === 'customer' ? (
                      <>
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+ Record Receipt</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                        <span>+ Record Payment</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  title="Print Statement"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>Print</span>
                </button>
                {onDeleteParty && (
                  <button
                    onClick={() => handleDeletePartyConfirm(statementParty)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    title={`Delete ${statementParty.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  onClick={() => setStatementParty(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Opening Balance</span>
                  <p className="font-mono text-base font-bold text-white mt-0.5">
                    ₹{parseFloat(statementParty.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs uppercase text-slate-400">{statementParty.balanceType}</span>
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Total Invoiced</span>
                  <p className="font-mono text-base font-bold text-slate-200 mt-0.5">
                    ₹{parseFloat(statementParty.totalInvoiced || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Total Paid / Settled</span>
                  <p className="font-mono text-base font-bold text-slate-200 mt-0.5">
                    ₹{parseFloat(statementParty.totalPaid || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-3 bg-slate-950/80 border border-emerald-500/30 rounded-xl">
                  <span className="text-emerald-400 block text-[11px] font-medium">Net Closing Balance</span>
                  <p className="font-mono text-base font-bold text-emerald-400 mt-0.5">
                    ₹{parseFloat(statementParty.currentBalance || statementParty.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs uppercase">{(statementParty.currentBalanceType || statementParty.balanceType)}</span>
                  </p>
                </div>
              </div>

              {/* Linked Transactions Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    Linked Transactions & Vouchers
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Auto-calculated from billing ledger
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
                {(() => {
                  const partyInvoices = invoices.filter(
                    (inv) =>
                      (inv.partyId && inv.partyId === statementParty.id) ||
                      (inv.partyName && inv.partyName.trim().toLowerCase() === statementParty.name.trim().toLowerCase()) ||
                      (statementParty.gstin && inv.partyGstin && inv.partyGstin.trim().toUpperCase() === statementParty.gstin.trim().toUpperCase())
                  );

                  const partyPayments = payments.filter(
                    (pm) =>
                      (pm.partyId && pm.partyId === statementParty.id) ||
                      (pm.partyName && pm.partyName.trim().toLowerCase() === statementParty.name.trim().toLowerCase())
                  );

                  const partyCheques = cheques.filter(
                    (c) =>
                      (c.partyId && c.partyId === statementParty.id) ||
                      (c.payeeName && c.payeeName.trim().toLowerCase() === statementParty.name.trim().toLowerCase())
                  );

                  if (partyInvoices.length === 0 && partyPayments.length === 0 && partyCheques.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No transactions, vouchers, or cheques recorded yet for this party. Creating an invoice, receipt, payment, or cheque will automatically reflect here.
                      </div>
                    );
                  }

                  // Unify transactions
                  type LedgerItem = {
                    id: string;
                    date: string;
                    voucherNumber: string;
                    type: string;
                    isVoucher: boolean;
                    amount: number;
                    settledOrMode: string;
                    balanceOrStatus: string;
                    badgeClass: string;
                  };

                  const items: LedgerItem[] = [
                    ...partyInvoices.map((inv) => {
                      const total = parseFloat(inv.grandTotal);
                      const paid = parseFloat(inv.paidAmount || '0');
                      const due = Math.max(0, total - paid);
                      return {
                        id: `inv-${inv.id}`,
                        date: inv.invoiceDate,
                        voucherNumber: inv.invoiceNumber,
                        type: inv.voucherType === 'sales' ? 'Sales Invoice' : 'Purchase Bill',
                        isVoucher: false,
                        amount: total,
                        settledOrMode: `₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} settled`,
                        balanceOrStatus: due > 0 ? `Due ₹${due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Settled',
                        badgeClass:
                          inv.voucherType === 'sales'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                      };
                    }),
                    ...partyPayments.map((pm) => {
                      const amt = parseFloat(pm.amount);
                      return {
                        id: `pm-${pm.id}`,
                        date: pm.paymentDate,
                        voucherNumber: pm.voucherNumber,
                        type: pm.voucherType === 'receipt' ? 'Receipt Voucher' : 'Payment Voucher',
                        isVoucher: true,
                        amount: amt,
                        settledOrMode: `${pm.paymentMode.toUpperCase()}${pm.referenceNumber ? ` (${pm.referenceNumber})` : ''}`,
                        balanceOrStatus: pm.againstInvoiceNumber ? `Ref: ${pm.againstInvoiceNumber}` : 'On Account',
                        badgeClass:
                          pm.voucherType === 'receipt'
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                      };
                    }),
                    ...partyCheques.map((c) => {
                      const amt = parseFloat(c.amount);
                      const statusMap: Record<string, string> = {
                        in_hand: 'In Hand',
                        deposited: 'Deposited',
                        cleared: 'Cleared',
                        bounced: 'Bounced',
                        cancelled: 'Cancelled',
                        stopped: 'Stopped',
                      };
                      return {
                        id: `chq-${c.id}`,
                        date: c.chequeDate,
                        voucherNumber: `CHQ #${c.chequeNumber}`,
                        type: c.chequeType === 'inward' ? 'Cheque Received' : 'Cheque Issued',
                        isVoucher: true,
                        amount: amt,
                        settledOrMode: `${c.bankName}${c.isPdc ? ' (PDC)' : ''}`,
                        balanceOrStatus: `Status: ${statusMap[c.status] || c.status}`,
                        badgeClass:
                          c.status === 'cleared'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : c.status === 'bounced'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                      };
                    }),
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  return (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Voucher #</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                          <th className="py-2.5 px-3">Settlement / Mode</th>
                          <th className="py-2.5 px-3 text-right">Balance / Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 text-slate-300 font-sans">{item.date}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{item.voucherNumber}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${item.badgeClass}`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-100 font-bold">
                              ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 font-sans">{item.settledOrMode}</td>
                            <td className="py-2.5 px-3 text-right font-sans">
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded ${
                                  item.balanceOrStatus.includes('Due')
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {item.balanceOrStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-800 text-xs text-slate-500 shrink-0 bg-slate-950/70">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Ledger entries synchronize seamlessly with real-time voucher accounting.</span>
              </span>
              <button
                onClick={() => setStatementParty(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition cursor-pointer text-center"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
