import React, { useState, useMemo } from 'react';
import { useDialog } from '../context/DialogContext';
import { Invoice, CompanyProfile, Party, InventoryItem, InvoiceItem, PurchaseGstType } from '../types';
import { InvoiceTemplateRenderer } from './InvoiceTemplateRenderer';
import { PartyMatchSelector } from './PartyMatchSelector';
import { AppSelect } from './AppSelect';
import { SkeletonInvoiceView } from './SkeletonLoaders';
import { HsnAutoSuggestSelector } from './HsnAutoSuggestSelector';
import { inferCategoryFromItem } from '../data/hsnCategories';
import { getAvailableMonths, getMonthBounds } from '../utils/datePeriodUtils';
import { FullScreenButton } from './FullScreenButton';
import { INDIAN_STATES } from '../data/indianStates';
import {
  normalizePartyAddresses,
  getDefaultBillingAddress,
  getDefaultShippingAddress,
  formatPartyAddressBlock,
  extractStateFromGstin,
  getStateNameByCode,
} from '../utils/partyAddressUtils';
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
  Lock,
  Truck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission, UserRole } from '../lib/permissions';

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
  const { profile } = useAuth();
  const currentUserRole: UserRole = (profile?.role as UserRole) || 'accountant';

  const dialog = useDialog();
  const targetVoucherType: 'sales' | 'purchase' = mode === 'purchase' ? 'purchase' : 'sales';
  const isSales = targetVoucherType === 'sales';

  const canCreate = isSales
    ? hasPermission(currentUserRole, 'sales:create')
    : hasPermission(currentUserRole, 'purchases:create');
  const canEdit = isSales
    ? hasPermission(currentUserRole, 'sales:edit')
    : hasPermission(currentUserRole, 'purchases:edit');
  const canDelete = isSales
    ? hasPermission(currentUserRole, 'sales:delete')
    : hasPermission(currentUserRole, 'purchases:delete');
  const canRecordPayment = hasPermission(currentUserRole, 'payments:create');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CompanyProfile['invoiceDesignTemplate'] | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [voucherType, setVoucherType] = useState<'sales' | 'purchase'>(targetVoucherType);
  const [purchaseGstType, setPurchaseGstType] = useState<PurchaseGstType>('b2b_itc');
  const [partyFilterMode, setPartyFilterMode] = useState<'smart' | 'all'>('smart');
  const [saleType, setSaleType] = useState<string>('regular');
  const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [partyId, setPartyId] = useState<string>('');
  const [partyName, setPartyName] = useState('');
  const [partyGstin, setPartyGstin] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyEmail, setPartyEmail] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  // Tally Multiple Addresses: Buyer (Bill-To) & Consignee (Ship-To) states
  const [billingAddressId, setBillingAddressId] = useState<string>('');
  const [billingAddressType, setBillingAddressType] = useState<string>('Primary');
  const [billingMailingName, setBillingMailingName] = useState<string>('');
  const [billingPincode, setBillingPincode] = useState<string>('');
  const [isSameAsBillingAddress, setIsSameAsBillingAddress] = useState<boolean>(true);
  const [shippingAddressId, setShippingAddressId] = useState<string>('');
  const [shippingAddressType, setShippingAddressType] = useState<string>('Primary');
  const [consigneeName, setConsigneeName] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [consigneeGstin, setConsigneeGstin] = useState<string>('');
  const [consigneeStateCode, setConsigneeStateCode] = useState<string>('27');
  const [consigneePincode, setConsigneePincode] = useState<string>('');
  const [consigneeContact, setConsigneeContact] = useState<string>('');
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
    category?: string;
    description?: string;
    serialNumber?: string;
    warranty?: string;
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
      category: 'Electronics & Electricals',
      description: '',
      serialNumber: '',
      warranty: '',
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
    (voucherType === 'purchase' && (purchaseGstType === 'exempt_nil' || saleType === 'exempt_nil'));

  const isForceInterstateSupply =
    (voucherType === 'sales' && (saleType === 'export_with_tax' || saleType === 'sez')) ||
    (voucherType === 'purchase' && (purchaseGstType === 'import_goods' || purchaseGstType === 'import_services' || saleType === 'import_overseas'));

  const isInterstate = isForceInterstateSupply ? true : placeOfSupply !== companyState;

  // Dedicated filtering: Robust check for purchase vs sales vouchers across existing & new records
  const allTypeInvoices = invoices.filter((inv) => {
    const isInvPurchase = inv.voucherType === 'purchase' || inv.invoiceType === 'purchase_bill';
    return targetVoucherType === 'purchase' ? isInvPurchase : !isInvPurchase;
  });

  const availableMonths = useMemo(
    () => getAvailableMonths(allTypeInvoices.map((i) => i.invoiceDate)),
    [allTypeInvoices]
  );

  const pageInvoices = allTypeInvoices.filter((inv) => {
    if (monthFilter === 'all') return true;
    const now = new Date();
    if (monthFilter === 'this_month') {
      const b = getMonthBounds(now.getFullYear(), now.getMonth());
      return inv.invoiceDate >= b.startDate && inv.invoiceDate <= b.endDate;
    }
    if (monthFilter === 'prev_month') {
      const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const b = getMonthBounds(prevY, prevM);
      return inv.invoiceDate >= b.startDate && inv.invoiceDate <= b.endDate;
    }
    return inv.invoiceDate && inv.invoiceDate.startsWith(monthFilter);
  });

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
      const normalized = normalizePartyAddresses(found);
      const defaultBill = getDefaultBillingAddress(found);
      const defaultShip = getDefaultShippingAddress(found);

      setPartyName(found.name);
      setPartyGstin(defaultBill.gstin || found.gstin || '');
      if (defaultBill.stateCode || found.stateCode) {
        setPlaceOfSupply(defaultBill.stateCode || found.stateCode);
      }
      setPartyPhone(defaultBill.phone || found.phone || '');
      setPartyEmail(defaultBill.email || found.email || '');
      setPartyAddress(formatPartyAddressBlock(defaultBill) || found.address || '');

      // Set Buyer (Bill-To)
      setBillingAddressId(defaultBill.id);
      setBillingAddressType(defaultBill.addressType || 'Primary');
      setBillingMailingName(defaultBill.mailingName || found.name);
      setBillingPincode(defaultBill.pincode || '');

      // Set Consignee (Ship-To)
      const isDiffShip = defaultShip.id !== defaultBill.id;
      setIsSameAsBillingAddress(!isDiffShip);
      setShippingAddressId(defaultShip.id);
      setShippingAddressType(defaultShip.addressType || 'Primary');
      setConsigneeName(defaultShip.mailingName || found.name);
      setShippingAddress(formatPartyAddressBlock(defaultShip) || found.address || '');
      setConsigneeGstin(defaultShip.gstin || found.gstin || '');
      setConsigneeStateCode(defaultShip.stateCode || found.stateCode || company?.stateCode || '27');
      setConsigneePincode(defaultShip.pincode || '');
      setConsigneeContact(
        [defaultShip.contactPerson, defaultShip.phone].filter(Boolean).join(' • ') || found.phone || ''
      );

      if (found.phone || found.email || found.address || normalized.length > 1) {
        setShowPartyContactDetails(true);
      }
    }
  };

  const handleSelectBillingAddressSlot = (party: Party, addressId: string) => {
    const normalized = normalizePartyAddresses(party);
    const slot = normalized.find((a) => a.id === addressId);
    if (!slot) return;

    setBillingAddressId(slot.id);
    setBillingAddressType(slot.addressType);
    setBillingMailingName(slot.mailingName || party.name);
    setPartyAddress(formatPartyAddressBlock(slot));
    setBillingPincode(slot.pincode || '');
    if (slot.gstin) {
      setPartyGstin(slot.gstin);
    }
    if (slot.stateCode) {
      setPlaceOfSupply(slot.stateCode);
    }
    if (slot.phone) {
      setPartyPhone(slot.phone);
    }
    if (slot.email) {
      setPartyEmail(slot.email);
    }

    if (isSameAsBillingAddress) {
      setShippingAddressId(slot.id);
      setShippingAddressType(slot.addressType);
      setConsigneeName(slot.mailingName || party.name);
      setShippingAddress(formatPartyAddressBlock(slot));
      setConsigneeGstin(slot.gstin || partyGstin);
      setConsigneeStateCode(slot.stateCode || placeOfSupply);
      setConsigneePincode(slot.pincode || '');
      setConsigneeContact([slot.contactPerson, slot.phone].filter(Boolean).join(' • ') || partyPhone);
    }
  };

  const handleSelectShippingAddressSlot = (party: Party, addressId: string) => {
    const normalized = normalizePartyAddresses(party);
    const slot = normalized.find((a) => a.id === addressId);
    if (!slot) return;

    setIsSameAsBillingAddress(slot.id === billingAddressId);
    setShippingAddressId(slot.id);
    setShippingAddressType(slot.addressType);
    setConsigneeName(slot.mailingName || party.name);
    setShippingAddress(formatPartyAddressBlock(slot));
    setConsigneeGstin(slot.gstin || party.gstin || '');
    setConsigneeStateCode(slot.stateCode || party.stateCode || placeOfSupply);
    setConsigneePincode(slot.pincode || '');
    setConsigneeContact([slot.contactPerson, slot.phone].filter(Boolean).join(' • ') || party.phone || '');
  };

  const handleItemSelect = (index: number, selectedItemId: string) => {
    const item = inventory.find((i) => String(i.id) === selectedItemId);
    const updated = [...items];
    if (item) {
      const itemCategory = item.category || inferCategoryFromItem(item.name, item.description, item.hsnCode);
      updated[index] = {
        ...updated[index],
        itemId: selectedItemId,
        itemName: item.name,
        category: itemCategory,
        description: item.description || updated[index].description || '',
        warranty: item.defaultWarranty || updated[index].warranty || '',
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
        category: 'Electronics & Electricals',
        description: '',
        serialNumber: '',
        warranty: '',
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
    setPurchaseGstType('b2b_itc');
    setPartyFilterMode('smart');
    setSaleType('regular');
    setTaxMode('exclusive');
    setPartyId('');
    setPartyName('');
    setPartyGstin('');
    setPartyPhone('');
    setPartyEmail('');
    setPartyAddress('');
    setBillingAddressId('');
    setBillingAddressType('Primary');
    setBillingMailingName('');
    setBillingPincode('');
    setIsSameAsBillingAddress(true);
    setShippingAddressId('');
    setShippingAddressType('Primary');
    setConsigneeName('');
    setShippingAddress('');
    setConsigneeGstin('');
    setConsigneeStateCode(company?.stateCode || '27');
    setConsigneePincode('');
    setConsigneeContact('');
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
        category: 'Electronics & Electricals',
        description: '',
        serialNumber: '',
        warranty: '',
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
    const isPur = inv.voucherType === 'purchase' || inv.invoiceType === 'purchase_bill';
    setVoucherType(isPur ? 'purchase' : 'sales');
    setPurchaseGstType(
      inv.purchaseType ||
      (inv.saleType === 'rcm'
        ? 'rcm'
        : inv.saleType === 'import_overseas'
        ? 'import_goods'
        : inv.saleType === 'exempt_nil'
        ? 'exempt_nil'
        : 'b2b_itc')
    );
    setPartyFilterMode('smart');
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
    const billAddr = inv.billingAddress || inv.partyAddress || matchedParty?.address || '';
    setPartyPhone(inv.partyPhone || matchedParty?.phone || '');
    setPartyEmail(inv.partyEmail || matchedParty?.email || '');
    setPartyAddress(billAddr);

    setBillingAddressId(inv.billingAddressId || '');
    setBillingAddressType(inv.billingAddressType || 'Primary');
    setBillingMailingName(inv.billingMailingName || inv.partyName || '');
    setBillingPincode(inv.billingPincode || '');

    const sameShip = inv.isSameAsBillingAddress !== undefined
      ? inv.isSameAsBillingAddress
      : (!inv.shippingAddress || inv.shippingAddress === billAddr);
    setIsSameAsBillingAddress(sameShip);
    setShippingAddressId(inv.shippingAddressId || '');
    setShippingAddressType(inv.shippingAddressType || 'Primary');
    setConsigneeName(inv.consigneeName || inv.partyName || '');
    setShippingAddress(inv.shippingAddress || billAddr);
    setConsigneeGstin(inv.consigneeGstin || inv.partyGstin || '');
    setConsigneeStateCode(inv.consigneeStateCode || inv.placeOfSupply || company?.stateCode || '27');
    setConsigneePincode(inv.consigneePincode || '');
    setConsigneeContact(inv.consigneeContact || inv.partyPhone || matchedParty?.phone || '');

    setShowPartyContactDetails(
      Boolean(
        matchedParty?.phone ||
        matchedParty?.email ||
        matchedParty?.address ||
        (matchedParty?.addresses && matchedParty.addresses.length > 1) ||
        !sameShip
      )
    );

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
          category: it.category || inferCategoryFromItem(it.itemName, it.description, it.hsnCode),
          description: it.description || '',
          serialNumber: it.serialNumber || '',
          warranty: it.warranty || '',
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
          category: 'IT & Software Services (SAC)',
          description: '',
          serialNumber: '',
          warranty: '',
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

    let computedDiscountTotal = 0;
    const mappedItems = items.map((it, idx) => {
      const comp = computedItems[idx];
      const isItemTaxInclusive = it.isTaxInclusive !== undefined ? it.isTaxInclusive : taxMode === 'inclusive';
      const gross = (it.quantity || 0) * (it.rate || 0);
      const discAmt = gross * ((it.discountPercent || 0) / 100);
      computedDiscountTotal += discAmt;

      return {
        itemId: it.itemId ? parseInt(it.itemId) : undefined,
        itemName: it.itemName,
        category: it.category || inferCategoryFromItem(it.itemName, it.description, it.hsnCode),
        description: it.description || '',
        serialNumber: it.serialNumber || '',
        warranty: it.warranty || '',
        hsnCode: it.hsnCode || '8536',
        quantity: String(it.quantity || 1),
        unit: it.unit || 'PCS',
        rate: String(it.rate || 0),
        isTaxInclusive: isItemTaxInclusive,
        discountPercent: String(it.discountPercent || 0),
        discountAmount: discAmt.toFixed(2),
        taxableValue: comp.lineTaxable.toFixed(2),
        gstRate: String(comp.effectiveGstRate),
        cgstAmount: comp.cgst.toFixed(2),
        sgstAmount: comp.sgst.toFixed(2),
        igstAmount: comp.igst.toFixed(2),
        taxAmount: comp.lineTax.toFixed(2),
        total: comp.lineTotal.toFixed(2),
      };
    });

    const parsedPaid = parseFloat(paidAmount) || 0;
    const paymentStatus: 'paid' | 'partial' | 'unpaid' =
      parsedPaid >= grandTotal && grandTotal > 0
        ? 'paid'
        : parsedPaid > 0
        ? 'partial'
        : 'unpaid';

    const isPur = voucherType === 'purchase';
    const computedSaleType = isPur
      ? (purchaseGstType === 'rcm'
          ? 'rcm'
          : purchaseGstType === 'import_goods' || purchaseGstType === 'import_services'
          ? 'import_overseas'
          : purchaseGstType === 'exempt_nil'
          ? 'exempt_nil'
          : 'regular')
      : saleType;

    const effectiveBillAddr = partyAddress.trim() || null;
    const effectiveShipAddr = isSameAsBillingAddress
      ? effectiveBillAddr
      : (shippingAddress.trim() || effectiveBillAddr);
    const effectiveConsigneeName = isSameAsBillingAddress
      ? (billingMailingName.trim() || partyName.trim())
      : (consigneeName.trim() || partyName.trim());
    const effectiveConsigneeGstin = isSameAsBillingAddress
      ? (partyGstin.trim().toUpperCase() || null)
      : (consigneeGstin.trim().toUpperCase() || partyGstin.trim().toUpperCase() || null);
    const effectiveConsigneeStateCode = isSameAsBillingAddress
      ? placeOfSupply
      : (consigneeStateCode || placeOfSupply);

    const payload = {
      voucherType,
      invoiceType: isPur ? 'purchase_bill' : (saleType === 'bill_of_supply' ? 'bill_of_supply' : 'tax_invoice'),
      purchaseType: isPur ? purchaseGstType : undefined,
      saleType: computedSaleType,
      taxMode,
      partyId: partyId ? parseInt(partyId) : null,
      partyName,
      partyGstin: partyGstin.trim().toUpperCase() || null,
      partyPhone: partyPhone.trim() || null,
      partyEmail: partyEmail.trim() || null,
      partyAddress: effectiveBillAddr,
      partyStateCode: placeOfSupply,
      partyStateName: getStateNameByCode(placeOfSupply),
      // Buyer (Bill-To) Tally Address fields
      billingAddressId: billingAddressId || null,
      billingAddressType: billingAddressType || 'Primary',
      billingMailingName: billingMailingName.trim() || partyName.trim(),
      billingAddress: effectiveBillAddr,
      billingStateCode: placeOfSupply,
      billingStateName: getStateNameByCode(placeOfSupply),
      billingPincode: billingPincode.trim() || null,
      billingGstin: partyGstin.trim().toUpperCase() || null,
      // Consignee (Ship-To / Delivery) Tally Address fields
      isSameAsBillingAddress,
      shippingAddressId: isSameAsBillingAddress ? (billingAddressId || null) : (shippingAddressId || null),
      shippingAddressType: isSameAsBillingAddress ? (billingAddressType || 'Primary') : (shippingAddressType || 'Ship-To / Delivery'),
      consigneeName: effectiveConsigneeName,
      shippingAddress: effectiveShipAddr,
      consigneeGstin: effectiveConsigneeGstin,
      consigneeStateCode: effectiveConsigneeStateCode,
      consigneeStateName: getStateNameByCode(effectiveConsigneeStateCode),
      consigneePincode: isSameAsBillingAddress ? (billingPincode.trim() || null) : (consigneePincode.trim() || null),
      consigneeContact: isSameAsBillingAddress ? (partyPhone.trim() || null) : (consigneeContact.trim() || partyPhone.trim() || null),
      placeOfSupply,
      isInterstate,
      invoiceNumber,
      invoiceDate,
      dueDate: dueDate || null,
      subtotal: subtotal.toFixed(2),
      cgstTotal: cgstTotal.toFixed(2),
      sgstTotal: sgstTotal.toFixed(2),
      igstTotal: igstTotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      discountTotal: computedDiscountTotal.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      paidAmount: parsedPaid.toFixed(2),
      paymentStatus,
      paymentMode,
      notes: notes || (saleType === 'rcm' ? 'Tax payable under Reverse Charge: YES' : 'Thank you for your business!'),
      items: mappedItems,
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

  if (loading && pageInvoices.length === 0) {
    return <SkeletonInvoiceView isSales={isSales} />;
  }

  return (
    <div className={`space-y-6 ${selectedInvoice ? 'has-active-invoice-modal' : ''}`}>
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
          <FullScreenButton mode="component" showLabel />
          {canCreate ? (
            isSales ? (
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
            )
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700/60 text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Read-Only Mode</span>
            </div>
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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className={`w-3.5 h-3.5 ${isSales ? 'text-emerald-400' : 'text-blue-400'}`} />
            <select
              aria-label="Filter Invoices by Month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Months</option>
              <option value="this_month" className="bg-slate-900 text-white">This Month</option>
              <option value="prev_month" className="bg-slate-900 text-white">Previous Month</option>
              {availableMonths.map((m) => (
                <option key={m.ym} value={m.ym} className="bg-slate-900 text-white">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:w-72">
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
              {loading && filteredInvoices.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse animate-shimmer">
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-36 bg-slate-800 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-800/70 rounded" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-800/60 rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-slate-800 ml-auto rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-slate-800 ml-auto rounded" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-24 bg-slate-800/90 ml-auto rounded" /></td>
                    <td className="py-3.5 px-4 text-center"><div className="h-5 w-16 bg-slate-800 mx-auto rounded-full" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 w-16 bg-slate-800 ml-auto rounded" /></td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
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
                        {targetVoucherType === 'purchase' ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              inv.purchaseType === 'rcm' || inv.saleType === 'rcm'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : inv.purchaseType === 'import_goods'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : inv.purchaseType === 'import_services'
                                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                : inv.purchaseType === 'ineligible_17_5'
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                : inv.purchaseType === 'exempt_nil'
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {inv.purchaseType === 'rcm' || inv.saleType === 'rcm'
                              ? 'Table 4(A)(3) RCM'
                              : inv.purchaseType === 'import_goods'
                              ? 'Table 4(A)(1) Import Goods'
                              : inv.purchaseType === 'import_services'
                              ? 'Table 4(A)(2) Import Services'
                              : inv.purchaseType === 'ineligible_17_5'
                              ? 'Table 4(B) Ineligible 17(5)'
                              : inv.purchaseType === 'exempt_nil'
                              ? 'Table 5 Exempt / Nil'
                              : 'Table 4(A)(5) B2B ITC'}
                          </span>
                        ) : (
                          inv.saleType && (
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
                          )
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
                        {onRecordVoucher && canRecordPayment && inv.paymentStatus !== 'paid' && (
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
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setTimeout(() => {
                              window.print();
                            }, 150);
                          }}
                          title="Direct Print Tax Invoice"
                          className="px-2 py-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="hidden lg:inline">Print</span>
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(inv)}
                            title="Edit Voucher Details & Items"
                            className="px-2.5 py-1 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden md:inline">Edit</span>
                          </button>
                        )}
                        {onDeleteInvoice && canDelete && (
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
              <div className="flex items-center gap-2 shrink-0">
                <FullScreenButton mode="modal" showLabel />
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
                      {voucherType === 'sales' ? 'Sale Type / GST Category' : 'Statutory GST Purchase Classification'}
                    </label>
                    {voucherType === 'sales' ? (
                      <select
                        value={saleType}
                        onChange={(e) => setSaleType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="regular">Regular Taxable (B2B / B2C Outward)</option>
                        <option value="bill_of_supply">Bill of Supply (Exempt / Nil-Rated)</option>
                        <option value="export_with_tax">Export with Payment of IGST</option>
                        <option value="export_without_tax">Export under LUT / Bond (Zero-Rated)</option>
                        <option value="rcm">Reverse Charge (Tax by Recipient u/s 9(3))</option>
                        <option value="sez">SEZ Unit Supply (IGST)</option>
                      </select>
                    ) : (
                      <select
                        value={purchaseGstType}
                        onChange={(e) => {
                          const val = e.target.value as PurchaseGstType;
                          setPurchaseGstType(val);
                          if (val === 'rcm') setSaleType('rcm');
                          else if (val === 'import_goods' || val === 'import_services') setSaleType('import_overseas');
                          else if (val === 'exempt_nil') setSaleType('exempt_nil');
                          else setSaleType('regular');
                        }}
                        className="w-full bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400 font-medium"
                      >
                        <option value="b2b_itc">Table 4(A)(5) — Standard B2B Inward Supply (All Other ITC)</option>
                        <option value="rcm">Table 4(A)(3) + 3.1(d) — Reverse Charge (RCM u/s 9(3) / 9(4))</option>
                        <option value="import_goods">Table 4(A)(1) — Import of Goods (Bill of Entry IGST)</option>
                        <option value="import_services">Table 4(A)(2) — Import of Services (Cross-border)</option>
                        <option value="ineligible_17_5">Table 4(B) — Ineligible ITC as per Section 17(5) Blocked</option>
                        <option value="exempt_nil">Table 5 — Exempt, Nil-Rated or Non-GST Supply</option>
                      </select>
                    )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-400">
                      {voucherType === 'sales' ? 'Party / Customer Name (Sundry Debtor)' : 'Party / Vendor Name (Sundry Creditor)'}{' '}
                      <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">
                        {partyFilterMode === 'smart'
                          ? (voucherType === 'sales' ? 'Filter: Customers only' : 'Filter: Vendors only')
                          : 'Showing all parties'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPartyFilterMode(partyFilterMode === 'smart' ? 'all' : 'smart')}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer font-medium"
                      >
                        {partyFilterMode === 'smart' ? 'Show All Parties' : 'Smart Filter'}
                      </button>
                    </div>
                  </div>
                  <PartyMatchSelector
                    parties={parties}
                    partyType={voucherType === 'sales' ? 'customer' : 'vendor'}
                    partyTypeFilter={partyFilterMode === 'smart' ? (voucherType === 'sales' ? 'customer' : 'vendor') : 'all'}
                    selectedPartyId={partyId ? parseInt(partyId) : undefined}
                    partyName={partyName}
                    onSelectParty={(p, customName) => {
                      if (p) {
                        handlePartySelect(String(p.id));
                      } else {
                        setPartyId('');
                        if (customName !== undefined) {
                          setPartyName(customName);
                        }
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
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setPartyGstin(val);
                      const detected = extractStateFromGstin(val);
                      if (detected) {
                        setPlaceOfSupply(detected.stateCode);
                      }
                    }}
                    placeholder="e.g. 27AABCU9603R1ZM"
                    maxLength={15}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Auto-Sync to Ledger Status Banner + Tally Multiple Address Quick Bar */}
                <div className="sm:col-span-3 space-y-2">
                  {(() => {
                    const matched = parties.find(
                      (p) =>
                        (partyId && String(p.id) === partyId) ||
                        (partyName.trim() && p.name.trim().toLowerCase() === partyName.trim().toLowerCase()) ||
                        (partyGstin.trim() && p.gstin && p.gstin.trim().toUpperCase() === partyGstin.trim().toUpperCase())
                    );

                    if (matched) {
                      const curBal = matched.currentBalance ? parseFloat(matched.currentBalance) : 0;
                      const partyAddrs = normalizePartyAddresses(matched);
                      return (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>
                                <strong>Linked to Ledger:</strong> {matched.name} ({matched.partyType === 'customer' ? 'Customer / Debtor' : 'Vendor / Creditor'})
                                <span className="ml-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono font-semibold">
                                  Current Bal: ₹{curBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {(matched.currentBalanceType || 'dr').toUpperCase()}
                                </span>
                              </span>
                              {partyAddrs.length > 1 && (
                                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-[10px] font-semibold flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-cyan-400" />
                                  {partyAddrs.length} Saved Addresses (Tally Multi-Address)
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-emerald-400/80 font-medium">
                              ⚡ Ledger balances & statements auto-update on save
                            </span>
                          </div>

                          {/* Quick Tally Address Type Selector Strip when party has saved addresses */}
                          {partyAddrs.length > 1 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 shrink-0 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {voucherType === 'purchase' ? 'Supplier Bill-From:' : 'Buyer (Bill-To):'}
                                </span>
                                <select
                                  value={billingAddressId || partyAddrs[0].id}
                                  onChange={(e) => handleSelectBillingAddressSlot(matched, e.target.value)}
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                                >
                                  {partyAddrs.map((addr) => (
                                    <option key={addr.id} value={addr.id}>
                                      [{addr.addressType}] {addr.mailingName} — {addr.stateName} ({addr.stateCode}) {addr.gstin ? `• ${addr.gstin}` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 shrink-0 flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  Consignee (Ship-To):
                                </span>
                                <select
                                  value={isSameAsBillingAddress ? (billingAddressId || partyAddrs[0].id) : (shippingAddressId || partyAddrs[0].id)}
                                  onChange={(e) => handleSelectShippingAddressSlot(matched, e.target.value)}
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                                >
                                  {partyAddrs.map((addr) => (
                                    <option key={addr.id} value={addr.id}>
                                      [{addr.addressType}] {addr.mailingName} — {addr.address ? addr.address.slice(0, 32) : addr.stateName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
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

                {/* Tally-Style Buyer (Bill-To) & Consignee (Ship-To) Multiple Address & Contact Details */}
                <div className="sm:col-span-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPartyContactDetails(!showPartyContactDetails)}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer font-medium"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {showPartyContactDetails ? 'Hide' : 'Configure'} Buyer (Bill-To) & Consignee (Ship-To) Mailing Details
                      </span>
                      {!isSameAsBillingAddress && (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold">
                          Separate Consignee / Ship-To Active
                        </span>
                      )}
                    </button>

                    <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!isSameAsBillingAddress}
                        onChange={(e) => {
                          const separate = e.target.checked;
                          setIsSameAsBillingAddress(!separate);
                          if (separate) {
                            setShowPartyContactDetails(true);
                            if (!consigneeName) setConsigneeName(billingMailingName || partyName);
                            if (!shippingAddress) setShippingAddress(partyAddress);
                            if (!consigneeGstin) setConsigneeGstin(partyGstin);
                            if (!consigneeStateCode) setConsigneeStateCode(placeOfSupply);
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <Truck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ship to a different Consignee / Branch / Delivery Address</span>
                    </label>
                  </div>

                  {showPartyContactDetails && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* LEFT CARD: BUYER (BILL-TO) DETAILS */}
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {voucherType === 'purchase' ? 'Supplier (Bill-From) Address' : 'Buyer (Bill-To) Mailing Details'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                              {billingAddressType || 'Primary'}
                            </span>
                          </div>

                          {(() => {
                            const matched = parties.find(
                              (p) =>
                                (partyId && String(p.id) === partyId) ||
                                (partyName.trim() && p.name.trim().toLowerCase() === partyName.trim().toLowerCase())
                            );
                            const savedAddrs = matched ? normalizePartyAddresses(matched) : [];
                            if (matched && savedAddrs.length > 0) {
                              return (
                                <div>
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    Select Saved Address Type from Party Master
                                  </label>
                                  <select
                                    value={billingAddressId || savedAddrs[0].id}
                                    onChange={(e) => handleSelectBillingAddressSlot(matched, e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                  >
                                    {savedAddrs.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.addressType} — {a.mailingName} ({a.stateName}) {a.address ? `• ${a.address.slice(0, 35)}` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                Buyer Mailing / Trade Name
                              </label>
                              <input
                                type="text"
                                value={billingMailingName || partyName}
                                onChange={(e) => setBillingMailingName(e.target.value)}
                                placeholder={partyName || 'Legal / Trade Name on Bill'}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                Address Label / Type
                              </label>
                              <input
                                type="text"
                                value={billingAddressType}
                                onChange={(e) => setBillingAddressType(e.target.value)}
                                placeholder="Primary / Head Office"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                Billing Street Address, Building, Area, City
                              </label>
                              <input
                                type="text"
                                value={partyAddress}
                                onChange={(e) => {
                                  setPartyAddress(e.target.value);
                                  if (isSameAsBillingAddress) {
                                    setShippingAddress(e.target.value);
                                  }
                                }}
                                placeholder="Plot 42, MIDC Industrial Area, Mumbai"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" /> Phone Number
                              </label>
                              <input
                                type="text"
                                value={partyPhone}
                                onChange={(e) => setPartyPhone(e.target.value)}
                                placeholder="+91 98765 43210"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" /> Email Address
                              </label>
                              <input
                                type="email"
                                value={partyEmail}
                                onChange={(e) => setPartyEmail(e.target.value)}
                                placeholder="accounts@company.com"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* RIGHT CARD: CONSIGNEE (SHIP-TO / DELIVERY) DETAILS */}
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" />
                              Consignee (Ship-To / Delivery) Details
                            </span>
                            <label className="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSameAsBillingAddress}
                                onChange={(e) => {
                                  const same = e.target.checked;
                                  setIsSameAsBillingAddress(same);
                                  if (same) {
                                    setConsigneeName(billingMailingName || partyName);
                                    setShippingAddress(partyAddress);
                                    setConsigneeGstin(partyGstin);
                                    setConsigneeStateCode(placeOfSupply);
                                  }
                                }}
                                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 cursor-pointer"
                              />
                              <span>Same as Buyer (Bill-To)</span>
                            </label>
                          </div>

                          {isSameAsBillingAddress ? (
                            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Consignee (Ship-To) is identical to Buyer (Bill-To)</span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {billingMailingName || partyName || 'Selected Party'} •{' '}
                                {partyAddress || 'Principal Place of Business'} ({getStateNameByCode(placeOfSupply)} - {placeOfSupply})
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSameAsBillingAddress(false);
                                  if (!consigneeName) setConsigneeName(billingMailingName || partyName);
                                  if (!shippingAddress) setShippingAddress(partyAddress);
                                  if (!consigneeGstin) setConsigneeGstin(partyGstin);
                                  if (!consigneeStateCode) setConsigneeStateCode(placeOfSupply);
                                }}
                                className="mt-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                              >
                                + Specify a different Consignee / Warehouse / Site Delivery Address
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {(() => {
                                const matched = parties.find(
                                  (p) =>
                                    (partyId && String(p.id) === partyId) ||
                                    (partyName.trim() && p.name.trim().toLowerCase() === partyName.trim().toLowerCase())
                                );
                                const savedAddrs = matched ? normalizePartyAddresses(matched) : [];
                                if (matched && savedAddrs.length > 0) {
                                  return (
                                    <div>
                                      <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                        Pick Consignee / Delivery Address from Party Master
                                      </label>
                                      <select
                                        value={shippingAddressId}
                                        onChange={(e) => handleSelectShippingAddressSlot(matched, e.target.value)}
                                        className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                      >
                                        <option value="">-- Custom / Manual Consignee Address --</option>
                                        {savedAddrs.map((a) => (
                                          <option key={a.id} value={a.id}>
                                            [{a.addressType}] {a.mailingName} — {a.address || a.stateName} ({a.stateCode})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    Consignee Name (Shipped To)
                                  </label>
                                  <input
                                    type="text"
                                    value={consigneeName}
                                    onChange={(e) => setConsigneeName(e.target.value)}
                                    placeholder={partyName || 'Site / Consignee Name'}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    Consignee GSTIN (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={15}
                                    value={consigneeGstin}
                                    onChange={(e) => {
                                      const val = e.target.value.toUpperCase();
                                      setConsigneeGstin(val);
                                      const det = extractStateFromGstin(val);
                                      if (det) setConsigneeStateCode(det.stateCode);
                                    }}
                                    placeholder={partyGstin || '15-digit Branch GSTIN'}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    Shipping / Delivery Address (Warehouse, Site, Branch)
                                  </label>
                                  <input
                                    type="text"
                                    value={shippingAddress}
                                    onChange={(e) => setShippingAddress(e.target.value)}
                                    placeholder="Warehouse Gate 4, Chakan Industrial Area, Pune - 410501"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    Destination State
                                  </label>
                                  <select
                                    value={consigneeStateCode}
                                    onChange={(e) => setConsigneeStateCode(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                  >
                                    {INDIAN_STATES.map((st) => (
                                      <option key={st.code} value={st.code}>
                                        {st.code} - {st.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    Site Contact / Phone
                                  </label>
                                  <input
                                    type="text"
                                    value={consigneeContact}
                                    onChange={(e) => setConsigneeContact(e.target.value)}
                                    placeholder="Site Incharge • +91 98765 43210"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-medium text-slate-400">Place of Supply (State):</label>
                    <select
                      value={placeOfSupply}
                      onChange={(e) => setPlaceOfSupply(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.code} - {st.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-500">
                      Company State: <strong className="text-slate-300">{getStateNameByCode(companyState)} ({companyState})</strong>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Invoice Line Items & Item-Wise GST
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      ({items.length} {items.length === 1 ? 'item' : 'items'})
                    </span>
                    <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      <span>HSN Auto-Suggestions Active</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition self-start sm:self-auto"
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

                          {/* HSN/SAC with Auto-Suggestions based on product category */}
                          <div className="col-span-6 sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Hash className="w-3 h-3 text-emerald-400" />
                                <span>HSN/SAC</span>
                              </label>
                              {it.category && (
                                <span
                                  className="text-[9px] text-emerald-400 font-semibold truncate max-w-[85px] px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20"
                                  title={`Category: ${it.category}`}
                                >
                                  {it.category.split('&')[0].trim()}
                                </span>
                              )}
                            </div>
                            <HsnAutoSuggestSelector
                              value={it.hsnCode}
                              onChange={(newCode, suggestedRate) => {
                                const updated = [...items];
                                updated[idx].hsnCode = newCode;
                                if (suggestedRate !== undefined && !isTaxExemptSupply) {
                                  if (updated[idx].gstRate === 18 || updated[idx].gstRate === 0) {
                                    updated[idx].gstRate = suggestedRate;
                                  }
                                }
                                setItems(updated);
                              }}
                              itemName={it.itemName}
                              itemDescription={it.description}
                              category={it.category}
                              onCategoryChange={(newCat) => {
                                const updated = [...items];
                                updated[idx].category = newCat;
                                setItems(updated);
                              }}
                              invoices={invoices}
                              inventory={inventory}
                              placeholder="8536"
                            />
                          </div>

                          {/* Qty & Unit */}
                          <div className="col-span-6 sm:col-span-1">
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

                        {/* Product Description, Sr. No. / IMEI & Pickable Warranty */}
                        <div className="pt-2 border-t border-slate-900 space-y-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            {/* Detailed Description */}
                            <div className="sm:col-span-6">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-emerald-400" />
                                  <span>Product Specification / Sub-Description</span>
                                </label>
                                {(it.serialNumber || it.warranty) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...items];
                                      const parts = [];
                                      if (it.description?.trim()) parts.push(it.description.trim());
                                      if (it.serialNumber?.trim() && !it.description?.includes(it.serialNumber.trim())) {
                                        parts.push(`Sr: ${it.serialNumber.trim()}`);
                                      }
                                      if (it.warranty?.trim() && !it.description?.includes(it.warranty.trim())) {
                                        parts.push(`[${it.warranty.trim()}]`);
                                      }
                                      updated[idx].description = parts.join(' • ');
                                      setItems(updated);
                                    }}
                                    className="text-[9px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                                    title="Append Sr. No. & Warranty into description line"
                                  >
                                    + Embed Sr & Warranty
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. 15.6'' FHD, Core i5, 16GB RAM, 512GB SSD"
                                value={it.description || ''}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].description = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                              />
                            </div>

                            {/* Serial Number / IMEI / Batch (Sr. No.) */}
                            <div className="sm:col-span-3">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                  <Tag className="w-3 h-3 text-cyan-400" />
                                  <span>Sr. No. / IMEI / Batch</span>
                                </label>
                                <div className="flex items-center gap-1">
                                  {['S/N:', 'IMEI:', 'Batch:', 'MAC:'].map((prefix) => (
                                    <button
                                      key={prefix}
                                      type="button"
                                      onClick={() => {
                                        const updated = [...items];
                                        const current = (updated[idx].serialNumber || '').trim();
                                        if (!current.includes(prefix)) {
                                          updated[idx].serialNumber = current ? `${prefix} ${current}` : `${prefix} `;
                                          setItems(updated);
                                        }
                                      }}
                                      className="text-[9px] text-cyan-400 hover:text-cyan-300 px-1 py-0.2 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 transition cursor-pointer"
                                      title={`Quick add ${prefix} prefix`}
                                    >
                                      +{prefix.replace(':', '')}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <input
                                type="text"
                                placeholder="e.g. S/N: 8947192841"
                                value={it.serialNumber || ''}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].serialNumber = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
                              />
                            </div>

                            {/* Warranty Input Field */}
                            <div className="sm:col-span-3">
                              <label className="text-[10px] font-medium text-slate-400 block mb-1 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>Warranty</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 1 Year Warranty"
                                value={it.warranty || ''}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].warranty = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                              />
                            </div>
                          </div>

                          {/* Quick Pickable Warranty Chips */}
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9.5px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              Pick Warranty:
                            </span>
                            {[
                              '6 Months Warranty',
                              '1 Year Warranty',
                              '2 Years Warranty',
                            ].map((wPreset) => {
                              const isSelected = it.warranty === wPreset;
                              return (
                                <button
                                  key={wPreset}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...items];
                                    updated[idx].warranty = isSelected ? '' : wPreset;
                                    setItems(updated);
                                  }}
                                  className={`text-[9.5px] px-2 py-0.5 rounded-full font-medium transition cursor-pointer border ${
                                    isSelected
                                      ? 'bg-emerald-400 text-slate-950 font-bold border-emerald-300 shadow-sm'
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {wPreset}
                                </button>
                              );
                            })}
                            {it.warranty && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...items];
                                  updated[idx].warranty = '';
                                  setItems(updated);
                                }}
                                className="text-[9px] text-slate-400 hover:text-rose-400 underline ml-1 cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
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
        <div className="printable-modal-backdrop fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:bg-white print:p-0 print:static print:overflow-visible print:inset-auto print:block print:w-full print:h-auto">
          <div className="printable-invoice-container bg-white text-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl relative my-auto print:shadow-none print:m-0 print:w-full print:max-h-none print:p-0 print:border-none print:rounded-none print:block print:space-y-0">
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
                    value={previewTemplate || company?.invoiceDesignTemplate || 'classic'}
                    onChange={(e) => setPreviewTemplate(e.target.value as any)}
                    className="text-xs bg-transparent border-0 font-bold text-slate-800 focus:ring-0 py-0.5 cursor-pointer"
                  >
                    <option value="classic">Classic GST (Standard Rule 46 - A4 Compact)</option>
                    <option value="modern">Modern Pro</option>
                    <option value="corporate">Corporate Executive</option>
                    <option value="compact">Compact Ledger</option>
                    <option value="stylish">Sidebar Prestige</option>
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
                <FullScreenButton mode="modal" showLabel />
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
            <div className="overflow-x-auto flex-1 overflow-y-auto pr-1 print:overflow-visible print:p-0 print-only-target">
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
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">Delete Voucher</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
              <FullScreenButton mode="modal" />
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
