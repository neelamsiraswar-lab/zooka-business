import React, { useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { Invoice, CompanyProfile, Party, InventoryItem, InvoiceItem } from '../types';
import { InvoiceTemplateRenderer } from './InvoiceTemplateRenderer';
import { PartyMatchSelector } from './PartyMatchSelector';
import { AppSelect } from './AppSelect';
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  Calendar,
  Building,
  User,
  IndianRupee,
  Receipt,
  X,
  Search,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  Tag,
  Info,
  ShieldCheck,
  Layers,
  SlidersHorizontal,
  Edit2,
  Eye,
  AlertTriangle,
  Sparkles,
  Hash,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  LayoutTemplate,
  Clock,
} from 'lucide-react';

interface InvoiceViewProps {
  invoices: Invoice[];
  parties: Party[];
  inventory: InventoryItem[];
  company: CompanyProfile | null;
  onSaveInvoice: (inv: any, id?: number) => Promise<void>;
  onDeleteInvoice?: (id: number) => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
  mode?: 'sales' | 'purchase';
  onRecordVoucher?: (type: 'receipt' | 'payment', partyId?: number, invoiceId?: number) => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoices,
  parties,
  inventory,
  company,
  onSaveInvoice,
  onDeleteInvoice,
  onRefresh,
  loading,
  mode = 'sales',
  onRecordVoucher,
}) => {
  const dialog = useDialog();
  const targetVoucherType: 'sales' | 'purchase' = mode === 'purchase' ? 'purchase' : 'sales';
  const isSales = targetVoucherType === 'sales';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CompanyProfile['invoiceDesignTemplate'] | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [voucherType, setVoucherType] = useState<'sales' | 'purchase'>(targetVoucherType);
  const [saleType, setSaleType] = useState<string>('regular');
  const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [partyId, setPartyId] = useState<string>('');
  const [partyName, setPartyName] = useState('');
  const [partyGstin, setPartyGstin] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyEmail, setPartyEmail] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [showPartyContactDetails, setShowPartyContactDetails] = useState(false);
  const [placeOfSupply, setPlaceOfSupply] = useState('27');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-5)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [notes, setNotes] = useState('Thank you for your business!');

  const [items, setItems] = useState<Array<{
    itemId?: string;
    itemName: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    rate: number;
    isTaxInclusive: boolean;
    discountPercent: number;
    gstRate: number;
  }>>([
    {
      itemName: '',
      hsnCode: '8536',
      quantity: 1,
      unit: 'PCS',
      rate: 0,
      isTaxInclusive: false,
      discountPercent: 0,
      gstRate: 18,
    },
  ]);

  const companyState = company?.stateCode || '27';

  // Tax rules based on Sale/Purchase Type
  const isTaxExemptSupply =
    (voucherType === 'sales' && (saleType === 'bill_of_supply' || saleType === 'export_without_tax')) ||
    (voucherType === 'purchase' && saleType === 'exempt_nil');

  const isForceInterstateSupply =
    (voucherType === 'sales' && (saleType === 'export_with_tax' || saleType === 'sez')) ||
    (voucherType === 'purchase' && saleType === 'import_overseas');

  const isInterstate = isForceInterstateSupply ? true : placeOfSupply !== companyState;

  // Dedicated filtering: Never show purchase on sales page, nor sales on purchase page!
  const pageInvoices = invoices.filter((inv) => inv.voucherType === targetVoucherType);

  const filteredInvoices = pageInvoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.paymentStatus !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
      const matchParty = inv.partyName.toLowerCase().includes(q);
      const matchGstin = inv.partyGstin?.toLowerCase().includes(q);
      const matchSaleType = inv.saleType?.toLowerCase().includes(q);
      return matchNumber || matchParty || matchGstin || !!matchSaleType;
    }
    return true;
  });

  // Summary Metrics for this dedicated view
  const totalAmount = pageInvoices.reduce((acc, inv) => acc + (parseFloat(inv.grandTotal) || 0), 0);
  const totalTax = pageInvoices.reduce((acc, inv) => acc + (parseFloat(inv.taxTotal) || 0), 0);
  const totalSettled = pageInvoices.reduce((acc, inv) => acc + (parseFloat(inv.paidAmount) || 0), 0);
  const totalDue = pageInvoices.reduce((acc, inv) => {
    const bal = (parseFloat(inv.grandTotal) || 0) - (parseFloat(inv.paidAmount) || 0);
    return acc + (bal > 0 ? bal : 0);
  }, 0);
  const paidCount = pageInvoices.filter((i) => i.paymentStatus === 'paid').length;
  const unpaidCount = pageInvoices.filter((i) => i.paymentStatus === 'unpaid').length;
  const partialCount = pageInvoices.filter((i) => i.paymentStatus === 'partial').length;

  // Calculate live form totals and item-wise GST rate breakdown
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let taxTotal = 0;

  // Slabs breakdown map
  const gstBreakdownMap: Record<number, { taxable: number; tax: number; cgst: number; sgst: number; igst: number }> = {};

  const computedItems = items.map((it) => {
    const qty = it.quantity || 0;
    const inputRate = it.rate || 0;
    const disc = it.discountPercent || 0;
    const isItemTaxInclusive = it.isTaxInclusive !== undefined ? it.isTaxInclusive : (taxMode === 'inclusive');
    const rawGstRate = it.gstRate || 0;
    const effectiveGstRate = isTaxExemptSupply ? 0 : rawGstRate;

    let lineTaxable = 0;
    let lineTax = 0;
    let lineTotal = 0;
    let baseUnitRate = inputRate;

    if (isItemTaxInclusive && effectiveGstRate > 0) {
      const grossIncl = qty * inputRate;
      const discGross = grossIncl * (1 - disc / 100);
      lineTaxable = discGross / (1 + effectiveGstRate / 100);
      lineTax = discGross - lineTaxable;
      lineTotal = discGross;
      baseUnitRate = inputRate / (1 + effectiveGstRate / 100);
    } else {
      const grossBase = qty * inputRate;
      lineTaxable = grossBase * (1 - disc / 100);
      lineTax = (lineTaxable * effectiveGstRate) / 100;
      lineTotal = lineTaxable + lineTax;
      baseUnitRate = inputRate;
    }

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (lineTax > 0) {
      if (isInterstate) {
        igst = lineTax;
      } else {
        cgst = lineTax / 2;
        sgst = lineTax / 2;
      }
    }

    subtotal += lineTaxable;
    taxTotal += lineTax;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;

    if (!gstBreakdownMap[effectiveGstRate]) {
      gstBreakdownMap[effectiveGstRate] = { taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 };
    }
    gstBreakdownMap[effectiveGstRate].taxable += lineTaxable;
    gstBreakdownMap[effectiveGstRate].tax += lineTax;
    gstBreakdownMap[effectiveGstRate].cgst += cgst;
    gstBreakdownMap[effectiveGstRate].sgst += sgst;
    gstBreakdownMap[effectiveGstRate].igst += igst;

    return {
      ...it,
      isItemTaxInclusive,
      effectiveGstRate,
      baseUnitRate,
      lineTaxable,
      lineTax,
      cgst,
      sgst,
      igst,
      lineTotal,
    };
  });

  const grandTotal = subtotal + taxTotal;

  const handlePartySelect = (selectedId: string) => {
    setPartyId(selectedId);
    const found = parties.find((p) => String(p.id) === selectedId);
    if (found) {
      setPartyName(found.name);
      setPartyGstin(found.gstin || '');
      if (found.stateCode) {
        setPlaceOfSupply(found.stateCode);
      }
      setPartyPhone(found.phone || '');
      setPartyEmail(found.email || '');
      setPartyAddress(found.address || '');
      if (found.phone || found.email || found.address) {
        setShowPartyContactDetails(true);
      }
    }
  };

  const handleItemSelect = (index: number, selectedItemId: string) => {
    const item = inventory.find((i) => String(i.id) === selectedItemId);
    const updated = [...items];
    if (item) {
      updated[index] = {
        ...updated[index],
        itemId: selectedItemId,
        itemName: item.name,
        hsnCode: item.hsnCode,
        unit: item.unit,
        rate: voucherType === 'sales' ? parseFloat(item.sellingPrice) : parseFloat(item.purchasePrice),
        gstRate: parseFloat(item.gstRate),
        isTaxInclusive: taxMode === 'inclusive',
      };
    }
    setItems(updated);
  };

  const handleTaxModeChange = (newMode: 'exclusive' | 'inclusive') => {
    setTaxMode(newMode);
    // synchronize existing item rows to the new default tax mode
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        isTaxInclusive: newMode === 'inclusive',
      }))
    );
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        itemName: '',
        hsnCode: '8536',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        isTaxInclusive: taxMode === 'inclusive',
        discountPercent: 0,
        gstRate: 18,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  // Helper to compute next sequential number according to company preferences and avoiding collision
  const generateNextNumber = (type: 'sales' | 'purchase'): string => {
    const isPurchase = type === 'purchase';
    const mode = isPurchase
      ? (company?.purchaseNumberingMode || 'automatic')
      : (company?.invoiceNumberingMode || 'automatic');

    if (mode === 'manual') {
      return '';
    }

    const prefix = isPurchase
      ? (company?.purchasePrefix !== undefined ? company.purchasePrefix : 'PUR/2026-27/')
      : (company?.invoicePrefix !== undefined ? company.invoicePrefix : 'INV/2026-27/');
    const suffix = isPurchase ? '' : (company?.invoiceSuffix || '');
    const padding = isPurchase ? 3 : (company?.invoicePadding !== undefined ? company.invoicePadding : 3);
    let counter = isPurchase ? (company?.nextPurchaseNumber || 1) : (company?.nextInvoiceNumber || 1);

    const existingNumbers = new Set(
      invoices.map((i) => i.invoiceNumber.trim().toLowerCase())
    );

    let candidate = `${prefix}${String(Math.max(1, counter)).padStart(Math.max(1, padding), '0')}${suffix}`;
    let safety = 0;
    while (existingNumbers.has(candidate.toLowerCase()) && safety < 1000) {
      counter++;
      candidate = `${prefix}${String(Math.max(1, counter)).padStart(Math.max(1, padding), '0')}${suffix}`;
      safety++;
    }
    return candidate;
  };

  const openCreateModal = (type: 'sales' | 'purchase') => {
    setEditingInvoiceId(null);
    setVoucherType(type);
    setSaleType('regular');
    setTaxMode('exclusive');
    setPartyId('');
    setPartyName('');
    setPartyGstin('');
    setPartyPhone('');
    setPartyEmail('');
    setPartyAddress('');
    setShowPartyContactDetails(false);
    setPlaceOfSupply(company?.stateCode || '27');
    
    // Auto-compute invoice/bill serial number based on company configuration
    const computedNum = generateNextNumber(type);
    setInvoiceNumber(computedNum || `${type === 'purchase' ? 'PUR' : 'INV'}-${Date.now().toString().slice(-5)}`);

    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setPaidAmount('0');
    setPaymentMode('bank_transfer');
    setNotes(
      type === 'purchase'
        ? 'Goods/services received in good condition.'
        : company?.defaultNotes || 'Thank you for your business!'
    );
    setItems([
      {
        itemName: '',
        hsnCode: '8536',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        isTaxInclusive: false,
        discountPercent: 0,
        gstRate: 18,
      },
    ]);
    setShowCreateModal(true);
  };

  const openEditModal = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setVoucherType(inv.voucherType === 'purchase' ? 'purchase' : 'sales');
    setSaleType(inv.saleType || 'regular');
    setTaxMode((inv.taxMode as 'exclusive' | 'inclusive') || 'exclusive');
    setPartyId(inv.partyId ? String(inv.partyId) : '');
    setPartyName(inv.partyName || '');
    setPartyGstin(inv.partyGstin || '');

    const matchedParty = parties.find(
      (p) =>
        (inv.partyId && p.id === inv.partyId) ||
        (inv.partyName && p.name.trim().toLowerCase() === inv.partyName.trim().toLowerCase())
    );
    setPartyPhone(matchedParty?.phone || '');
    setPartyEmail(matchedParty?.email || '');
    setPartyAddress(matchedParty?.address || '');
    setShowPartyContactDetails(Boolean(matchedParty?.phone || matchedParty?.email || matchedParty?.address));

    setPlaceOfSupply(inv.placeOfSupply || company?.stateCode || '27');
    setInvoiceNumber(inv.invoiceNumber);
    setInvoiceDate(inv.invoiceDate || new Date().toISOString().split('T')[0]);
    setDueDate(inv.dueDate || '');
    setPaidAmount(inv.paidAmount || '0');
    setPaymentMode(inv.paymentMode || 'bank_transfer');
    setNotes(inv.notes || '');

    if (inv.items && inv.items.length > 0) {
      setItems(
        inv.items.map((it) => ({
          itemId: it.itemId ? String(it.itemId) : undefined,
          itemName: it.itemName,
          hsnCode: it.hsnCode || '8536',
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit || 'PCS',
          rate: parseFloat(it.rate) || 0,
          isTaxInclusive: it.isTaxInclusive !== undefined ? it.isTaxInclusive : (inv.taxMode === 'inclusive'),
          discountPercent: parseFloat(it.discountPercent) || 0,
          gstRate: parseFloat(it.gstRate) || 0,
        }))
      );
    } else {
      setItems([
        {
          itemName: 'Standard Supply / Goods',
          hsnCode: '9983',
          quantity: 1,
          unit: 'LOT',
          rate: parseFloat(inv.subtotal) || 0,
          isTaxInclusive: false,
          discountPercent: 0,
          gstRate: parseFloat(inv.subtotal) > 0 ? Math.round((parseFloat(inv.taxTotal) / parseFloat(inv.subtotal)) * 100) : 18,
        },
      ]);
    }

    setShowCreateModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingInvoice || !onDeleteInvoice) return;
    setIsDeleting(true);
    try {
      await onDeleteInvoice(deletingInvoice.id);
      if (selectedInvoice?.id === deletingInvoice.id) {
        setSelectedInvoice(null);
      }
      setDeletingInvoice(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      dialog.alert({
        title: 'Party Required',
        message: 'Please enter a party name or pick one from your customer/vendor list.',
        variant: 'warning',
      });
      return;
    }

    const cleanInvoiceNumber = invoiceNumber.trim();
    if (!cleanInvoiceNumber) {
      dialog.alert({
        title: 'Voucher Number Required',
        message: 'Please enter a valid invoice / voucher serial number.',
        variant: 'warning',
      });
      return;
    }

    // Check for duplicity across active vouchers
    const duplicateMatch = invoices.find(
      (inv) =>
        inv.invoiceNumber.trim().toLowerCase() === cleanInvoiceNumber.toLowerCase() &&
        inv.id !== editingInvoiceId
    );

    if (duplicateMatch && company?.preventDuplicateInvoiceNo !== false) {
      dialog.alert({
        title: 'Duplicate Invoice Number Blocked',
        message: `Voucher "${cleanInvoiceNumber}" is already in use by invoice #${duplicateMatch.id} (issued to ${duplicateMatch.partyName} on ${duplicateMatch.invoiceDate}). Under company GST duplicity prevention policy, duplicate numbers are not allowed.`,
        variant: 'danger',
      });
      return;
    }

    const payload = {
      voucherType,
      saleType,
      taxMode,
      partyId: partyId ? parseInt(partyId) : null,
      partyName,
      partyGstin: partyGstin.trim().toUpperCase() || null,
      partyPhone: partyPhone.trim() || null,
      partyEmail: partyEmail.trim() || null,
      partyAddress: partyAddress.trim() || null,
      placeOfSupply,
      isInterstate,
      invoiceNumber,
      invoiceDate,
      dueDate: dueDate || null,
      paidAmount,
      paymentMode,
      notes: notes || (saleType === 'rcm' ? 'Tax payable under Reverse Charge: YES' : 'Thank you for your business!'),
      items: items.map((it) => ({
        ...it,
        isTaxInclusive: it.isTaxInclusive !== undefined ? it.isTaxInclusive : taxMode === 'inclusive',
      })),
    };

    await onSaveInvoice(payload, editingInvoiceId || undefined);
    setShowCreateModal(false);
    setEditingInvoiceId(null);
    if (selectedInvoice && editingInvoiceId && selectedInvoice.id === editingInvoiceId) {
      setSelectedInvoice(null);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {isSales ? (
              <FileText className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            )}
            {isSales ? 'Sales Invoices & Outward Supplies' : 'Purchase Bills & Inward Supplies'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSales
              ? 'Generate compliant GST Sales Invoices, bills of supply, delivery challans, and track customer receivables.'
              : 'Record vendor purchase bills, claim Input Tax Credit (ITC), manage trade payables and inward inventory.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSales ? (
            <button
              onClick={() => openCreateModal('sales')}
              id="create-sales-invoice-btn"
              className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition"
            >
              <ArrowUpRight className="w-4 h-4 font-bold" />
              <span>+ Create Sales Invoice</span>
            </button>
          ) : (
            <button
              onClick={() => openCreateModal('purchase')}
              id="record-purchase-bill-btn"
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 cursor-pointer transition"
            >
              <ArrowDownLeft className="w-4 h-4 font-bold" />
              <span>+ Record Purchase Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">
            {isSales ? 'Total Sales Revenue' : 'Total Purchases (Cost)'}
          </span>
          <p className="text-xl font-bold text-white mt-1">
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {pageInvoices.length} {isSales ? 'Sales Invoices' : 'Purchase Bills'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">
            {isSales ? 'Output GST Collected' : 'Input Tax Credit (ITC)'}
          </span>
          <p className="text-xl font-bold text-purple-300 mt-1">
            ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {isSales ? 'Liable on outward supplies' : 'Eligible tax credit claim'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">
            {isSales ? 'Collected / Paid' : 'Settled with Vendors'}
          </span>
          <p className="text-xl font-bold text-teal-400 mt-1">
            ₹{totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-teal-400/70 mt-1 block">
            {paidCount} fully settled vouchers
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">
            {isSales ? 'Pending Receivables (Dr)' : 'Pending Payables (Cr)'}
          </span>
          <p className={`text-xl font-bold mt-1 ${totalDue > 0 ? (isSales ? 'text-amber-400' : 'text-rose-400') : 'text-slate-300'}`}>
            ₹{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {unpaidCount} unpaid / {partialCount} partial
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Chips Bar */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full p-1 text-xs w-full sm:w-auto overflow-x-auto no-scrollbar shadow-inner">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer flex-1 sm:flex-initial text-center whitespace-nowrap ${
              statusFilter === 'all'
                ? isSales
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'bg-blue-500 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All {isSales ? 'Sales' : 'Bills'} ({pageInvoices.length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap ${
              statusFilter === 'paid'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold'
                : 'text-slate-400 hover:text-teal-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>{isSales ? 'Paid / Settled' : 'Fully Settled'} ({paidCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap ${
              statusFilter === 'unpaid'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{isSales ? 'Unpaid / Pending' : 'Due to Vendor'} ({unpaidCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('partial')}
            className={`px-3.5 py-1.5 rounded-full font-medium transition cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-initial whitespace-nowrap ${
              statusFilter === 'partial'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Partially Paid ({partialCount})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              isSales
                ? 'Search sales by invoice #, customer, GSTIN...'
                : 'Search bills by bill #, supplier, GSTIN...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
          />
        </div>
      </div>

      {/* Invoice List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">{isSales ? 'Invoice #' : 'Bill / Ref #'}</th>
                <th className="py-3.5 px-4">{isSales ? 'Customer (Billed To)' : 'Supplier (Vendor)'}</th>
                <th className="py-3.5 px-4">{isSales ? 'Invoice Date' : 'Bill Date'}</th>
                <th className="py-3.5 px-4">{isSales ? 'Supply Category' : 'Inward Category'}</th>
                <th className="py-3.5 px-4 text-right">Taxable Value</th>
                <th className="py-3.5 px-4 text-right">{isSales ? 'Output GST' : 'ITC (GST)'}</th>
                <th className="py-3.5 px-4 text-right">{isSales ? 'Invoice Total' : 'Bill Total'}</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No {isSales ? 'sales invoices' : 'purchase bills'} found matching your filter or search.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-medium text-white">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div>{inv.partyName}</div>
                      {inv.partyGstin && (
                        <div className="text-[11px] font-mono text-slate-500">GST: {inv.partyGstin}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{inv.invoiceDate}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {inv.saleType && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {inv.saleType === 'bill_of_supply'
                              ? 'Bill of Supply'
                              : inv.saleType === 'export_without_tax'
                              ? 'Export (LUT)'
                              : inv.saleType === 'export_with_tax'
                              ? 'Export (IGST)'
                              : inv.saleType === 'rcm' || inv.saleType === 'unregistered_rcm'
                              ? 'Reverse Charge'
                              : inv.saleType === 'sez' || inv.saleType === 'sez_inward'
                              ? 'SEZ Supply'
                              : 'Regular Taxable'}
                          </span>
                        )}
                        {inv.taxMode && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider ${
                              inv.taxMode === 'inclusive'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                            }`}
                          >
                            {inv.taxMode === 'inclusive' ? 'Tax Incl.' : 'Tax Excl.'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">₹{parseFloat(inv.subtotal).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-purple-300">
                      ₹{parseFloat(inv.taxTotal).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ₹{parseFloat(inv.grandTotal).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          inv.paymentStatus === 'paid'
                            ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                            : inv.paymentStatus === 'partial'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onRecordVoucher && inv.paymentStatus !== 'paid' && (
                          <button
                            onClick={() =>
                              onRecordVoucher(
                                inv.voucherType === 'sales' ? 'receipt' : 'payment',
                                inv.partyId,
                                inv.id
                              )
                            }
                            title={
                              inv.voucherType === 'sales'
                                ? 'Record Receipt Voucher against this invoice'
                                : 'Record Payment Voucher against this purchase bill'
                            }
                            className={`px-2 py-1 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 border font-medium ${
                              inv.voucherType === 'sales'
                                ? 'text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
                                : 'text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30'
                            }`}
                          >
                            {inv.voucherType === 'sales' ? (
                              <>
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden sm:inline">Receipt</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                                <span className="hidden sm:inline">Pay</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          title="View / Print Voucher"
                          className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span className="hidden md:inline">View</span>
                        </button>
                        <button
                          onClick={() => openEditModal(inv)}
                          title="Edit Voucher Details & Items"
                          className="px-2.5 py-1 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden md:inline">Edit</span>
                        </button>
                        {onDeleteInvoice && (
                          <button
                            onClick={() => setDeletingInvoice(inv)}
                            title="Delete Voucher"
                            className="p-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span className="hidden md:inline pr-1">Delete</span>
                          </button>
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

      {/* CREATE / EDIT INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950">
              <div className="min-w-0 pr-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                  <Receipt className={`w-5 h-5 shrink-0 ${voucherType === 'sales' ? 'text-emerald-400' : 'text-blue-400'}`} />
                  <span className="truncate">
                    {editingInvoiceId
                      ? voucherType === 'sales'
                        ? `Edit Sales Invoice — ${invoiceNumber}`
                        : `Edit Purchase Bill — ${invoiceNumber}`
                      : voucherType === 'sales'
                      ? 'Create GST Sales Invoice (Outward)'
                      : 'Record Purchase Bill (Inward)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {voucherType === 'sales'
                    ? 'Outward supply invoice to customer with automated CGST/SGST/IGST calculation'
                    : 'Inward supply bill from vendor with Input Tax Credit (ITC) tracking'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingInvoiceId(null);
                }}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Voucher Top Controls: Voucher Type, Sale Type, Tax Mode, Invoice No, Dates */}
              <div className="space-y-3 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Voucher Category</label>
                    <div
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 ${
                        voucherType === 'sales'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {voucherType === 'sales' ? (
                        <>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Sales Invoice (Outward)</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Purchase Bill (Inward)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {voucherType === 'sales' ? 'Sale Type / GST Category' : 'Purchase / Inward Type'}
                    </label>
                    <select
                      value={saleType}
                      onChange={(e) => setSaleType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {voucherType === 'sales' ? (
                        <>
                          <option value="regular">Regular Taxable (B2B / B2C)</option>
                          <option value="bill_of_supply">Bill of Supply (Exempt / Nil-Rated)</option>
                          <option value="export_with_tax">Export with Payment of IGST</option>
                          <option value="export_without_tax">Export under LUT / Bond (Zero-Rated)</option>
                          <option value="rcm">Reverse Charge (Tax by Recipient u/s 9(3))</option>
                          <option value="sez">SEZ Unit Supply (IGST)</option>
                        </>
                      ) : (
                        <>
                          <option value="regular">Regular Taxable (ITC Eligible)</option>
                          <option value="unregistered_rcm">Purchase from Unregistered (RCM u/s 9(4))</option>
                          <option value="import_overseas">Import of Goods / Services</option>
                          <option value="exempt_nil">Exempted / Nil-Rated Inward</option>
                          <option value="sez_inward">SEZ Inward Supply</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-400">
                        {voucherType === 'sales' ? 'Invoice Number' : 'Bill / Supplier Ref #'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                          {voucherType === 'sales'
                            ? company?.invoiceNumberingMode === 'manual'
                              ? 'Manual'
                              : 'Auto Series'
                            : company?.purchaseNumberingMode === 'manual'
                            ? 'Manual'
                            : 'Auto Series'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextNum = generateNextNumber(voucherType);
                            if (nextNum) setInvoiceNumber(nextNum);
                          }}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer font-medium"
                          title="Generate Next Serial Number"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Next</span>
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                      placeholder="e.g. INV/2026-27/001"
                      className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none ${
                        (() => {
                          const dup = invoices.find(
                            (i) =>
                              i.invoiceNumber.trim().toLowerCase() === invoiceNumber.trim().toLowerCase() &&
                              i.id !== editingInvoiceId
                          );
                          return dup
                            ? 'border-rose-500 focus:border-rose-400'
                            : 'border-slate-800 focus:border-emerald-500';
                        })()
                      }`}
                    />
                    {/* Live Duplicity Warning Message */}
                    {(() => {
                      const cleanNum = invoiceNumber.trim();
                      if (!cleanNum) return null;
                      const dup = invoices.find(
                        (i) =>
                          i.invoiceNumber.trim().toLowerCase() === cleanNum.toLowerCase() &&
                          i.id !== editingInvoiceId
                      );
                      if (!dup) return null;
                      return (
                        <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                            <span>Duplicate Number Detected</span>
                          </div>
                          <p className="text-[10px] text-rose-300/90 leading-tight">
                            Voucher &quot;{cleanNum}&quot; already issued to <strong>{dup.partyName}</strong> on{' '}
                            {dup.invoiceDate} (₹{dup.grandTotal}).
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const autoNum = generateNextNumber(voucherType);
                              if (autoNum) setInvoiceNumber(autoNum);
                            }}
                            className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer pt-0.5"
                          >
                            <Sparkles className="w-3 h-3" />
                            Switch to next available number ({generateNextNumber(voucherType)})
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Invoice / Bill Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Tax Mode Pill Selector & Details */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                      Tax Rate Mode:
                    </span>
                    <div className="inline-flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleTaxModeChange('exclusive')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                          taxMode === 'exclusive'
                            ? 'bg-slate-800 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Tax Exclusive (Rate + GST)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTaxModeChange('inclusive')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer flex items-center gap-1 ${
                          taxMode === 'inclusive'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Percent className="w-3 h-3" />
                        <span>Tax Inclusive (Rate includes GST / MRP)</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>
                      {taxMode === 'inclusive'
                        ? 'Entered rates include GST. Taxable value = Rate / (1 + GST%).'
                        : 'Entered rates are pre-tax. GST is added on top.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer / Party details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {voucherType === 'sales' ? 'Party / Customer Name (Sundry Debtor)' : 'Party / Vendor Name (Sundry Creditor)'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <PartyMatchSelector
                    parties={parties}
                    partyTypeFilter={voucherType === 'sales' ? 'customer' : 'vendor'}
                    selectedPartyId={partyId ? parseInt(partyId) : undefined}
                    partyName={partyName}
                    onSelectParty={(p) => {
                      if (p) {
                        handlePartySelect(String(p.id));
                      } else {
                        setPartyId('');
                      }
                    }}
                    onCustomNameChange={(name) => {
                      setPartyName(name);
                      setPartyId('');
                    }}
                    placeholder={
                      voucherType === 'sales'
                        ? 'Search or enter customer name, phone, GSTIN...'
                        : 'Search or enter vendor name, phone, GSTIN...'
                    }
                    allowCustom={true}
                    required={true}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Party GSTIN (15-digit)</label>
                  <input
                    type="text"
                    value={partyGstin}
                    onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AABCU9603R1ZM"
                    maxLength={15}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Auto-Sync to Ledger Status Banner */}
                <div className="sm:col-span-3">
                  {(() => {
                    const matched = parties.find(
                      (p) =>
                        (partyId && String(p.id) === partyId) ||
                        (partyName.trim() && p.name.trim().toLowerCase() === partyName.trim().toLowerCase()) ||
                        (partyGstin.trim() && p.gstin && p.gstin.trim().toUpperCase() === partyGstin.trim().toUpperCase())
                    );

                    if (matched) {
                      const curBal = matched.currentBalance ? parseFloat(matched.currentBalance) : 0;
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              <strong>Linked to Ledger:</strong> {matched.name} ({matched.partyType === 'customer' ? 'Customer / Debtor' : 'Vendor / Creditor'})
                              <span className="ml-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono font-semibold">
                                Current Bal: ₹{curBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {(matched.currentBalanceType || 'dr').toUpperCase()}
                              </span>
                            </span>
                          </div>
                          <span className="text-[11px] text-emerald-400/80 font-medium">
                            ⚡ Ledger balances & statements auto-update on save
                          </span>
                        </div>
                      );
                    } else if (partyName.trim()) {
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>
                              <strong>Automatic Ledger Sync:</strong> "{partyName}" will be automatically registered as a new{' '}
                              <span className="font-semibold underline underline-offset-2">
                                {voucherType === 'purchase' ? 'Vendor (Creditor)' : 'Customer (Debtor)'}
                              </span>{' '}
                              in your Party Ledgers.
                            </span>
                          </div>
                          <span className="text-[11px] text-teal-400/80 font-medium">Auto-creates party master</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400">
                          <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Select an existing party or type a new party name — Customer/Vendor ledgers are synced automatically.</span>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Optional Contact & Address Details (Auto-Synced to Party Ledger Master) */}
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={() => setShowPartyContactDetails(!showPartyContactDetails)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer font-medium"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>{showPartyContactDetails ? 'Hide' : 'Add / View'} Party Contact & Address Details (Auto-Synced to Ledger Master)</span>
                  </button>

                  {showPartyContactDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800/60">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> Phone Number
                        </label>
                        <input
                          type="text"
                          value={partyPhone}
                          onChange={(e) => setPartyPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" /> Email Address
                        </label>
                        <input
                          type="email"
                          value={partyEmail}
                          onChange={(e) => setPartyEmail(e.target.value)}
                          placeholder="accounts@company.com"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" /> Billing / Shipping Address
                        </label>
                        <input
                          type="text"
                          value={partyAddress}
                          onChange={(e) => setPartyAddress(e.target.value)}
                          placeholder="Plot 42, MIDC Industrial Area"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-slate-400">Place of Supply (State Code):</label>
                    <input
                      type="text"
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                    />
                    <span className="text-[11px] text-slate-500">
                      Company State: <strong className="text-slate-300">{companyState}</strong>
                    </span>
                  </div>

                  <div className="text-xs">
                    Tax Rule Applied:{' '}
                    <span className={`font-semibold ${isInterstate ? 'text-purple-400' : 'text-emerald-400'}`}>
                      {isTaxExemptSupply
                        ? 'Exempt / Nil-Rated (0% GST)'
                        : isInterstate
                        ? 'Inter-State (IGST 100%)'
                        : 'Intra-State (CGST 50% + SGST 50%)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Invoice Line Items & Item-Wise GST
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      ({items.length} {items.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {items.map((it, idx) => {
                    const computed = computedItems[idx];
                    const isRowTaxIncl = it.isTaxInclusive !== undefined ? it.isTaxInclusive : (taxMode === 'inclusive');

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800/90 text-xs space-y-2"
                      >
                        <div className="grid grid-cols-12 gap-2 items-start">
                          {/* Item Select & Name */}
                          <div className="col-span-12 sm:col-span-4">
                            <select
                              value={it.itemId || ''}
                              onChange={(e) => handleItemSelect(idx, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white mb-1.5 focus:outline-none focus:border-slate-700"
                            >
                              <option value="">-- Choose Stock Item or Type Custom --</option>
                              {inventory.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name} (Stock: {inv.currentStock} {inv.unit})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Item Description / Specification"
                              value={it.itemName}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].itemName = e.target.value;
                                setItems(updated);
                              }}
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-slate-700"
                            />
                          </div>

                          {/* HSN/SAC */}
                          <div className="col-span-4 sm:col-span-2">
                            <label className="text-[10px] text-slate-500 block mb-1">HSN/SAC</label>
                            <input
                              type="text"
                              value={it.hsnCode}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].hsnCode = e.target.value;
                                setItems(updated);
                              }}
                              placeholder="8536"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>

                          {/* Qty & Unit */}
                          <div className="col-span-4 sm:col-span-1">
                            <label className="text-[10px] text-slate-500 block mb-1">Qty</label>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={it.quantity}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].quantity = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>

                          {/* Rate (₹) */}
                          <div className="col-span-4 sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] text-slate-500">
                                Rate (₹) {isRowTaxIncl ? '(Incl)' : '(Excl)'}
                              </label>
                            </div>
                            <input
                              type="number"
                              step="any"
                              value={it.rate}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].rate = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>

                          {/* GST % */}
                          <div className="col-span-6 sm:col-span-2">
                            <label className="text-[10px] text-slate-500 block mb-1">Item GST %</label>
                            <select
                              value={it.gstRate}
                              disabled={isTaxExemptSupply}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].gstRate = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white disabled:opacity-50"
                            >
                              <option value="0">0% (Nil / Exempt)</option>
                              <option value="5">5% GST</option>
                              <option value="12">12% GST</option>
                              <option value="18">18% GST (Standard)</option>
                              <option value="28">28% GST</option>
                            </select>
                          </div>

                          {/* Remove Action */}
                          <div className="col-span-6 sm:col-span-1 text-right pt-4">
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              title="Delete Item Row"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4 ml-auto" />
                            </button>
                          </div>
                        </div>

                        {/* Item Row Secondary Bar: Item-wise Tax Inclusive Toggle + Live Computations */}
                        <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isRowTaxIncl}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].isTaxInclusive = e.target.checked;
                                setItems(updated);
                              }}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5 bg-slate-900"
                            />
                            <span className={isRowTaxIncl ? 'text-amber-300 font-medium' : 'text-slate-400'}>
                              Rate is Tax-Inclusive (MRP)
                            </span>
                          </label>

                          <div className="flex items-center gap-3 font-mono">
                            {isRowTaxIncl && (
                              <span className="text-slate-500">
                                Base Rate: <strong className="text-slate-300">₹{computed?.baseUnitRate.toFixed(2)}</strong>
                              </span>
                            )}
                            <span>
                              Taxable: <strong className="text-slate-200">₹{computed?.lineTaxable.toFixed(2)}</strong>
                            </span>
                            <span>
                              GST ({computed?.effectiveGstRate}%):{' '}
                              <strong className="text-purple-300">₹{computed?.lineTax.toFixed(2)}</strong>
                            </span>
                            <span className="font-semibold text-white">
                              Line Total: ₹{computed?.lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GST Slabs Breakdown Card */}
              {Object.keys(gstBreakdownMap).length > 0 && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      Item-Wise GST Slabs Breakdown
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {isInterstate ? 'IGST Applicable' : 'CGST + SGST (50% Each)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {Object.entries(gstBreakdownMap).map(([rateStr, slab]) => (
                      <div
                        key={rateStr}
                        className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
                          <span className="font-bold text-white">{rateStr}% Slab</span>
                          <span>Taxable: ₹{slab.taxable.toFixed(2)}</span>
                        </div>
                        {isInterstate ? (
                          <div className="flex justify-between text-purple-400 text-[11px]">
                            <span>IGST ({rateStr}%):</span>
                            <span>₹{slab.igst.toFixed(2)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-emerald-400 text-[11px]">
                              <span>CGST ({parseFloat(rateStr) / 2}%):</span>
                              <span>₹{slab.cgst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 text-[11px]">
                              <span>SGST ({parseFloat(rateStr) / 2}%):</span>
                              <span>₹{slab.sgst.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between text-slate-300 font-semibold text-[11px] pt-1 border-t border-slate-800">
                          <span>Total Tax:</span>
                          <span>₹{slab.tax.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals & Payment Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Paid / Advance Amount (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Payment Mode</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="upi">UPI / QR Code</option>
                      <option value="cash">Cash in Hand</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Terms</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Tax payable under Reverse Charge: YES"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                  </div>

                  {isTaxExemptSupply ? (
                    <div className="flex justify-between text-slate-400">
                      <span>GST (Nil / Exempted):</span>
                      <span className="font-mono">₹0.00</span>
                    </div>
                  ) : isInterstate ? (
                    <div className="flex justify-between text-purple-400">
                      <span>Total IGST:</span>
                      <span className="font-mono">₹{taxTotal.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-emerald-400">
                        <span>Total CGST:</span>
                        <span className="font-mono">₹{cgstTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Total SGST:</span>
                        <span className="font-mono">₹{sgstTotal.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-slate-200 font-bold text-sm pt-2 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-400">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingInvoiceId(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading
                    ? editingInvoiceId
                      ? 'Updating...'
                      : 'Creating...'
                    : editingInvoiceId
                    ? 'Update & Recalculate Voucher'
                    : 'Save & Sync Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL / VIEW */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl relative my-auto print:shadow-none print:m-0 print:w-full print:max-h-none print:p-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 print:hidden shrink-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-sm">Tax Invoice Preview</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-200 transition">
                  <LayoutTemplate className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-medium text-slate-500">Design:</span>
                  <select
                    value={previewTemplate || company?.invoiceDesignTemplate || 'modern'}
                    onChange={(e) => setPreviewTemplate(e.target.value as any)}
                    className="text-xs bg-transparent border-0 font-bold text-slate-800 focus:ring-0 py-0.5 cursor-pointer"
                  >
                    <option value="modern">Modern Pro</option>
                    <option value="classic">Classic GST</option>
                    <option value="corporate">Corporate Executive</option>
                    <option value="stylish">Sidebar Prestige</option>
                    <option value="compact">Compact Ledger</option>
                    <option value="thermal">POS Retail Slip (80mm)</option>
                    <option value="industrial">Heavy Industry</option>
                    <option value="export">Global Export / LUT</option>
                    <option value="minimal">Minimalist</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const invToEdit = selectedInvoice;
                    setSelectedInvoice(null);
                    setPreviewTemplate(null);
                    openEditModal(invToEdit);
                  }}
                  className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Edit</span>
                </button>
                {onDeleteInvoice && (
                  <button
                    onClick={() => setDeletingInvoice(selectedInvoice)}
                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border border-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  onClick={printInvoice}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / PDF</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedInvoice(null);
                    setPreviewTemplate(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Tax Invoice Layout configured with Sale Invoice Design */}
            <div className="overflow-x-auto flex-1 overflow-y-auto pr-1">
              <InvoiceTemplateRenderer
                invoice={selectedInvoice}
                company={previewTemplate ? { ...(company || {}), invoiceDesignTemplate: previewTemplate } as any : company}
                isPrintMode={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl relative my-auto">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Voucher</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Voucher #:</span>
                <span className="font-mono font-semibold text-white">{deletingInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Voucher Type:</span>
                <span className="uppercase font-semibold text-emerald-400">{deletingInvoice.voucherType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Party Name:</span>
                <span className="text-slate-200">{deletingInvoice.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-mono font-bold text-white">₹{parseFloat(deletingInvoice.grandTotal).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-amber-400/90 leading-relaxed">
                Deleting will automatically revert inventory stock adjustments for all line items in this voucher and update ledgers.
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingInvoice(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm & Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
