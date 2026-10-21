import React, { useState, useMemo } from 'react';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { hasPermission, UserRole, isReadOnlyRole } from '../lib/permissions';
import { AppSelect } from './AppSelect';
import { AccountMatchSelector } from './AccountMatchSelector';
import { SkeletonAccountingView } from './SkeletonLoaders';
import {
  getAvailableMonths,
  getBoundsForYm,
  getMonthBounds,
  formatLocalDate,
} from '../utils/datePeriodUtils';
import { FullScreenButton } from './FullScreenButton';
import {
  BookOpen,
  Plus,
  Scale,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Trash2,
  FileText,
  PieChart,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  X,
  IndianRupee,
  ShieldCheck,
  Check,
  Pencil,
} from 'lucide-react';
import {
  Invoice,
  PaymentVoucher,
  Expense,
  Party,
  InventoryItem,
  CompanyProfile,
  FinancialSummary,
  JournalEntry,
  Cheque,
} from '../types';

interface AccountingViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  payments: PaymentVoucher[];
  cheques?: Cheque[];
  parties: Party[];
  inventory: InventoryItem[];
  company: CompanyProfile | null;
  summary: FinancialSummary | null;
  journalEntries: JournalEntry[];
  onSaveJournalEntry: (entry: Partial<JournalEntry>, entryId?: number) => Promise<any>;
  onDeleteJournalEntry: (id: number) => Promise<any>;
  onRefresh: () => void;
  loading?: boolean;
  onNavigateToInvoice?: (invoice: Invoice) => void;
  onNavigateToParty?: (partyId: number) => void;
}

type AccountingTab =
  | 'daybook'
  | 'trial_balance'
  | 'trading_pnl'
  | 'balance_sheet'
  | 'general_ledger'
  | 'cash_bank'
  | 'journal_vouchers'
  | 'chart_of_accounts';

type DateFilterPreset =
  | 'all'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'prev_month'
  | 'month'
  | 'this_quarter'
  | 'fy_2026_27'
  | 'custom';

export const AccountingView: React.FC<AccountingViewProps> = ({
  invoices = [],
  expenses = [],
  payments = [],
  cheques = [],
  parties = [],
  inventory = [],
  company,
  summary,
  journalEntries = [],
  onSaveJournalEntry,
  onDeleteJournalEntry,
  onRefresh,
  loading = false,
}) => {
  const dialog = useDialog();
  const { profile } = useAuth();
  const currentUserRole: UserRole = (profile?.role as UserRole) || 'accountant';
  const canCreateJv = hasPermission(currentUserRole, 'accounting:create');
  const canEditJv = hasPermission(currentUserRole, 'accounting:edit');
  const canDeleteJv = hasPermission(currentUserRole, 'accounting:delete');
  const isReadOnly = isReadOnlyRole(currentUserRole);

  const [activeTab, setActiveTab] = useState<AccountingTab>('daybook');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('fy_2026_27');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => formatLocalDate(new Date()).slice(0, 7));
  const [customStartDate, setCustomStartDate] = useState('2026-04-01');
  const [customEndDate, setCustomEndDate] = useState('2027-03-31');
  const [searchQuery, setSearchQuery] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('all');
  const [cashBankFilter, setCashBankFilter] = useState<'all' | 'cash' | 'bank'>('all');
  const [coaCategoryFilter, setCoaCategoryFilter] = useState<'all' | 'assets' | 'liabilities' | 'capital' | 'pnl'>('all');

  const availableMonths = useMemo(
    () =>
      getAvailableMonths([
        ...invoices.map((i) => i.invoiceDate),
        ...expenses.map((e) => e.date),
        ...payments.map((p) => p.date),
        ...journalEntries.map((j) => j.date),
      ]),
    [invoices, expenses, payments, journalEntries]
  );

  // General Ledger state
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('Cash in Hand');

  // Modal states
  const [showJvModal, setShowJvModal] = useState(false);
  const [jvModalType, setJvModalType] = useState<'journal' | 'contra' | 'debit_note' | 'credit_note' | 'adjustment'>('journal');
  const [selectedEntryForSlip, setSelectedEntryForSlip] = useState<any | null>(null);
  const [editingJvId, setEditingJvId] = useState<number | null>(null);

  // Form State for Journal/Contra Voucher
  const [jvDate, setJvDate] = useState(() => formatLocalDate(new Date()));
  const [jvVoucherNumber, setJvVoucherNumber] = useState('');
  const [jvReferenceNumber, setJvReferenceNumber] = useState('');
  const [jvDebitAccount, setJvDebitAccount] = useState('');
  const [jvCreditAccount, setJvCreditAccount] = useState('');
  const [jvDebitPartyId, setJvDebitPartyId] = useState<number | undefined>(undefined);
  const [jvCreditPartyId, setJvCreditPartyId] = useState<number | undefined>(undefined);
  const [jvAmount, setJvAmount] = useState('');
  const [jvNarration, setJvNarration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Timezone-safe Date Range Calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (datePreset === 'today') {
      return { start: todayStr, end: todayStr, label: `Today (${todayStr})` };
    }
    if (datePreset === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const monday = formatLocalDate(d);
      return { start: monday, end: todayStr, label: `This Week (${monday} to ${todayStr})` };
    }
    if (datePreset === 'this_month') {
      const b = getMonthBounds(now.getFullYear(), now.getMonth());
      return { start: b.startDate, end: b.endDate, label: b.label };
    }
    if (datePreset === 'prev_month') {
      const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const b = getMonthBounds(prevY, prevM);
      return { start: b.startDate, end: b.endDate, label: b.label };
    }
    if (datePreset === 'month') {
      const b = getBoundsForYm(selectedMonth);
      return { start: b.startDate, end: b.endDate, label: b.label };
    }
    if (datePreset === 'this_quarter') {
      const q = Math.floor(now.getMonth() / 3);
      const startB = getMonthBounds(now.getFullYear(), q * 3);
      const endB = getMonthBounds(now.getFullYear(), q * 3 + 2);
      return {
        start: startB.startDate,
        end: endB.endDate,
        label: `Quarter (${startB.shortLabel} - ${endB.shortLabel})`,
      };
    }
    if (datePreset === 'fy_2026_27') {
      return { start: '2026-04-01', end: '2027-03-31', label: 'FY 2026-27 (Apr 2026 - Mar 2027)' };
    }
    if (datePreset === 'custom') {
      return { start: customStartDate, end: customEndDate, label: `${customStartDate} to ${customEndDate}` };
    }
    return { start: '2000-01-01', end: '2099-12-31', label: 'All Time' };
  }, [datePreset, selectedMonth, customStartDate, customEndDate]);

  // Unified Double-Entry Transaction Engine & Day Book
  const dayBookEntries = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      voucherType: 'sales' | 'purchase' | 'receipt' | 'payment' | 'expense' | 'journal' | 'contra' | 'debit_note' | 'credit_note';
      typeLabel: string;
      voucherNumber: string;
      debitAccount: string;
      creditAccount: string;
      partyName?: string;
      narration: string;
      amount: number;
      rawDate: string;
      source: any;
    }> = [];

    // 1. Sales Invoices: Dr Customer / Cr Sales Account, Cr Output CGST, Cr Output SGST, Cr Output IGST
    //    Purchase Bills: Dr Purchase Account, Dr Input CGST, Dr Input SGST, Dr Input IGST / Cr Vendor
    invoices.forEach((inv) => {
      const isPurchase = inv.voucherType === 'purchase' || inv.invoiceType === 'purchase_bill';
      const isSale = !isPurchase && (inv.voucherType === 'sales' || inv.invoiceType === 'tax_invoice' || inv.invoiceType === 'bill_of_supply' || !inv.invoiceType);
      const grandTotal = parseFloat(inv.grandTotal) || 0;
      if (grandTotal <= 0) return;

      const taxableAmount = parseFloat(inv.subtotal) || 0;
      const cgst = parseFloat(inv.cgstTotal) || 0;
      const sgst = parseFloat(inv.sgstTotal) || 0;
      const igst = parseFloat(inv.igstTotal) || 0;
      const taxSum = cgst + sgst + igst;
      // Taxable base value: use subtotal or back out tax
      const baseTaxable = taxableAmount > 0 ? taxableAmount : Math.max(0, grandTotal - taxSum);

      if (isSale) {
        const debtorAccount = inv.partyName || 'Sundry Debtors';

        // Leg 1: Sales Revenue (Taxable Value)
        list.push({
          id: `inv-${inv.id}-rev`,
          date: inv.invoiceDate,
          rawDate: inv.invoiceDate,
          voucherType: 'sales',
          typeLabel: 'Sales Invoice',
          voucherNumber: inv.invoiceNumber,
          debitAccount: debtorAccount,
          creditAccount: 'Sales Account',
          partyName: inv.partyName,
          narration: `Sales to ${debtorAccount} (Taxable ₹${baseTaxable.toFixed(2)})`,
          amount: baseTaxable,
          source: inv,
        });

        // Leg 2: Output CGST
        if (cgst > 0) {
          list.push({
            id: `inv-${inv.id}-cgst`,
            date: inv.invoiceDate,
            rawDate: inv.invoiceDate,
            voucherType: 'sales',
            typeLabel: 'Sales Invoice (CGST)',
            voucherNumber: inv.invoiceNumber,
            debitAccount: debtorAccount,
            creditAccount: 'Output CGST',
            partyName: inv.partyName,
            narration: `Output CGST on Inv #${inv.invoiceNumber}`,
            amount: cgst,
            source: inv,
          });
        }

        // Leg 3: Output SGST
        if (sgst > 0) {
          list.push({
            id: `inv-${inv.id}-sgst`,
            date: inv.invoiceDate,
            rawDate: inv.invoiceDate,
            voucherType: 'sales',
            typeLabel: 'Sales Invoice (SGST)',
            voucherNumber: inv.invoiceNumber,
            debitAccount: debtorAccount,
            creditAccount: 'Output SGST',
            partyName: inv.partyName,
            narration: `Output SGST on Inv #${inv.invoiceNumber}`,
            amount: sgst,
            source: inv,
          });
        }

        // Leg 4: Output IGST
        if (igst > 0) {
          list.push({
            id: `inv-${inv.id}-igst`,
            date: inv.invoiceDate,
            rawDate: inv.invoiceDate,
            voucherType: 'sales',
            typeLabel: 'Sales Invoice (IGST)',
            voucherNumber: inv.invoiceNumber,
            debitAccount: debtorAccount,
            creditAccount: 'Output IGST',
            partyName: inv.partyName,
            narration: `Output IGST on interstate Inv #${inv.invoiceNumber}`,
            amount: igst,
            source: inv,
          });
        }

        // Optional rounding adjustment if grandTotal !== baseTaxable + taxSum
        const roundDiff = grandTotal - (baseTaxable + taxSum);
        if (Math.abs(roundDiff) >= 0.01) {
          if (roundDiff > 0) {
            list.push({
              id: `inv-${inv.id}-rnd`,
              date: inv.invoiceDate,
              rawDate: inv.invoiceDate,
              voucherType: 'sales',
              typeLabel: 'Sales Invoice (Rounding)',
              voucherNumber: inv.invoiceNumber,
              debitAccount: debtorAccount,
              creditAccount: 'Round Off / Adjustments',
              partyName: inv.partyName,
              narration: `Round-off adjustment on Inv #${inv.invoiceNumber}`,
              amount: Math.abs(roundDiff),
              source: inv,
            });
          } else {
            list.push({
              id: `inv-${inv.id}-rnd`,
              date: inv.invoiceDate,
              rawDate: inv.invoiceDate,
              voucherType: 'sales',
              typeLabel: 'Sales Invoice (Rounding)',
              voucherNumber: inv.invoiceNumber,
              debitAccount: 'Round Off / Adjustments',
              creditAccount: debtorAccount,
              partyName: inv.partyName,
              narration: `Round-off discount on Inv #${inv.invoiceNumber}`,
              amount: Math.abs(roundDiff),
              source: inv,
            });
          }
        }
      } else if (isPurchase) {
        const creditorAccount = inv.partyName || 'Sundry Creditors';
        const purType = inv.purchaseType || (inv.saleType === 'rcm' ? 'rcm' : inv.saleType === 'exempt_nil' ? 'exempt_nil' : 'b2b_itc');
        const isIneligible = purType === 'ineligible_17_5';
        const isRcm = purType === 'rcm';

        // Leg 1: Purchase Account (Taxable Value)
        list.push({
          id: `pur-${inv.id}-cost`,
          date: inv.invoiceDate,
          rawDate: inv.invoiceDate,
          voucherType: 'purchase',
          typeLabel: 'Purchase Bill',
          voucherNumber: inv.invoiceNumber,
          debitAccount: 'Purchase Account',
          creditAccount: creditorAccount,
          partyName: inv.partyName,
          narration: `Purchase from ${creditorAccount} (Taxable ₹${baseTaxable.toFixed(2)})`,
          amount: baseTaxable,
          source: inv,
        });

        // Leg 2: Input CGST or Ineligible ITC
        if (cgst > 0) {
          const itcAccount = isIneligible ? 'Ineligible ITC Sec 17(5)' : 'Input CGST';
          list.push({
            id: `pur-${inv.id}-cgst`,
            date: inv.invoiceDate,
            rawDate: inv.invoiceDate,
            voucherType: 'purchase',
            typeLabel: isRcm ? 'Purchase Bill (CGST RCM)' : (isIneligible ? 'Purchase Bill (Ineligible CGST)' : 'Purchase Bill (Input CGST)'),
            voucherNumber: inv.invoiceNumber,
            debitAccount: itcAccount,
            creditAccount: isRcm ? 'Output CGST (RCM)' : creditorAccount,
            partyName: inv.partyName,
            narration: `${itcAccount} on bill #${inv.invoiceNumber}`,
            amount: cgst,
            source: inv,
          });
        }

        // Leg 3: Input SGST or Ineligible ITC
        if (sgst > 0) {
          const itcAccount = isIneligible ? 'Ineligible ITC Sec 17(5)' : 'Input SGST';
          list.push({
            id: `pur-${inv.id}-sgst`,
            date: inv.invoiceDate,
            rawDate: inv.invoiceDate,
            voucherType: 'purchase',
            typeLabel: isRcm ? 'Purchase Bill (SGST RCM)' : (isIneligible ? 'Purchase Bill (Ineligible SGST)' : 'Purchase Bill (Input SGST)'),
            voucherNumber: inv.invoiceNumber,
            debitAccount: itcAccount,
            creditAccount: isRcm ? 'Output SGST (RCM)' : creditorAccount,
            partyName: inv.partyName,
            narration: `${itcAccount} on bill #${inv.invoiceNumber}`,
            amount: sgst,
            source: inv,
          });
        }

        // Leg 4: Input IGST or Ineligible ITC
        if (igst > 0) {
          const itcAccount = isIneligible ? 'Ineligible ITC Sec 17(5)' : 'Input IGST';
          list.push({
            id: `pur-${inv.id}-igst`,
            date: inv.invoiceDate,
            rawDate: inv.invoiceDate,
            voucherType: 'purchase',
            typeLabel: isRcm ? 'Purchase Bill (IGST RCM)' : (isIneligible ? 'Purchase Bill (Ineligible IGST)' : 'Purchase Bill (Input IGST)'),
            voucherNumber: inv.invoiceNumber,
            debitAccount: itcAccount,
            creditAccount: isRcm ? 'Output IGST (RCM)' : creditorAccount,
            partyName: inv.partyName,
            narration: `${itcAccount} on bill #${inv.invoiceNumber}`,
            amount: igst,
            source: inv,
          });
        }

        // Optional rounding adjustment
        const roundDiff = grandTotal - (baseTaxable + taxSum);
        if (Math.abs(roundDiff) >= 0.01 && !isRcm) {
          if (roundDiff > 0) {
            list.push({
              id: `pur-${inv.id}-rnd`,
              date: inv.invoiceDate,
              rawDate: inv.invoiceDate,
              voucherType: 'purchase',
              typeLabel: 'Purchase Bill (Rounding)',
              voucherNumber: inv.invoiceNumber,
              debitAccount: 'Round Off / Adjustments',
              creditAccount: creditorAccount,
              partyName: inv.partyName,
              narration: `Round-off adjustment on bill #${inv.invoiceNumber}`,
              amount: Math.abs(roundDiff),
              source: inv,
            });
          } else {
            list.push({
              id: `pur-${inv.id}-rnd`,
              date: inv.invoiceDate,
              rawDate: inv.invoiceDate,
              voucherType: 'purchase',
              typeLabel: 'Purchase Bill (Rounding)',
              voucherNumber: inv.invoiceNumber,
              debitAccount: creditorAccount,
              creditAccount: 'Round Off / Adjustments',
              partyName: inv.partyName,
              narration: `Round-off discount on bill #${inv.invoiceNumber}`,
              amount: Math.abs(roundDiff),
              source: inv,
            });
          }
        }
      }
    });

    // 2. Receipt & Payment Vouchers
    payments.forEach((p) => {
      const amt = parseFloat(p.amount) || 0;
      if (amt <= 0) return;
      const isReceipt = p.voucherType === 'receipt';
      const bankOrCash = p.accountType === 'cash' ? 'Cash in Hand' : (p.bankName || 'Bank Account');

      if (isReceipt) {
        list.push({
          id: `pay-${p.id}`,
          date: p.date,
          rawDate: p.date,
          voucherType: 'receipt',
          typeLabel: 'Receipt Voucher',
          voucherNumber: p.voucherNumber,
          debitAccount: bankOrCash,
          creditAccount: p.partyName || 'Sundry Debtors',
          partyName: p.partyName,
          narration: `Money received via ${p.paymentMode.replace('_', ' ').toUpperCase()}${p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''}`,
          amount: amt,
          source: p,
        });
      } else {
        list.push({
          id: `pay-${p.id}`,
          date: p.date,
          rawDate: p.date,
          voucherType: 'payment',
          typeLabel: 'Payment Voucher',
          voucherNumber: p.voucherNumber,
          debitAccount: p.partyName || 'Sundry Creditors',
          creditAccount: bankOrCash,
          partyName: p.partyName,
          narration: `Payment made via ${p.paymentMode.replace('_', ' ').toUpperCase()}${p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''}`,
          amount: amt,
          source: p,
        });
      }
    });

    // 3. Operating Expenses: Dr Expense Category / Cr Cash or Bank
    expenses.forEach((exp) => {
      const amt = parseFloat(exp.amount) || 0;
      if (amt <= 0) return;
      const payAcc = exp.paymentMode === 'cash' ? 'Cash in Hand' : 'Bank Account';
      list.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        rawDate: exp.date,
        voucherType: 'expense',
        typeLabel: 'Expense Voucher',
        voucherNumber: exp.referenceNumber || `EXP-${exp.id}`,
        debitAccount: exp.category || 'General Expense',
        creditAccount: payAcc,
        partyName: exp.vendorName,
        narration: exp.description || `Operating expense under ${exp.category}`,
        amount: amt,
        source: exp,
      });
    });

    // 4. Journal Entries & Contra Vouchers
    journalEntries.forEach((jv) => {
      const amt = parseFloat(jv.amount) || 0;
      if (amt <= 0) return;
      const typeLabel =
        jv.entryType === 'contra'
          ? 'Contra Entry'
          : jv.entryType === 'debit_note'
          ? 'Debit Note'
          : jv.entryType === 'credit_note'
          ? 'Credit Note'
          : 'Journal Voucher';

      list.push({
        id: `jv-${jv.id}`,
        date: jv.date,
        rawDate: jv.date,
        voucherType: jv.entryType as any,
        typeLabel,
        voucherNumber: jv.voucherNumber,
        debitAccount: jv.debitAccount,
        creditAccount: jv.creditAccount,
        narration: jv.narration || `${typeLabel} posted`,
        amount: amt,
        source: jv,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  }, [invoices, payments, expenses, journalEntries]);

  // Entries scoped to active dateRange (for voucher-type chip counts)
  const periodDayBookEntries = useMemo(() => {
    return dayBookEntries.filter(
      (item) => item.rawDate >= dateRange.start && item.rawDate <= dateRange.end
    );
  }, [dayBookEntries, dateRange]);

  // Filtered Day Book Entries
  const filteredDayBook = useMemo(() => {
    return periodDayBookEntries.filter((item) => {
      if (voucherTypeFilter !== 'all' && item.voucherType !== voucherTypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.voucherNumber.toLowerCase().includes(q) ||
          item.debitAccount.toLowerCase().includes(q) ||
          item.creditAccount.toLowerCase().includes(q) ||
          item.narration.toLowerCase().includes(q) ||
          (item.partyName && item.partyName.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [periodDayBookEntries, voucherTypeFilter, searchQuery]);

  // Filtered Journal Vouchers for active dateRange
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter(
      (jv) => jv.date >= dateRange.start && jv.date <= dateRange.end
    );
  }, [journalEntries, dateRange]);

  // Comprehensive Trial Balance Calculation (with prior-period Opening Balance roll-forward)
  const trialBalance = useMemo(() => {
    const ledgerMap: Record<
      string,
      {
        accountName: string;
        groupName:
          | 'Current Assets'
          | 'Fixed Assets'
          | 'Current Liabilities'
          | 'Capital & Equity'
          | 'Direct Incomes'
          | 'Indirect Incomes'
          | 'Direct Expenses'
          | 'Indirect Expenses';
        openingDebit: number;
        openingCredit: number;
        debitMovement: number;
        creditMovement: number;
      }
    > = {};

    // Helper to ensure ledger exists
    const ensureLedger = (
      name: string,
      group:
        | 'Current Assets'
        | 'Fixed Assets'
        | 'Current Liabilities'
        | 'Capital & Equity'
        | 'Direct Incomes'
        | 'Indirect Incomes'
        | 'Direct Expenses'
        | 'Indirect Expenses',
      opDr = 0,
      opCr = 0
    ) => {
      const clean = name.trim();
      if (!ledgerMap[clean]) {
        ledgerMap[clean] = {
          accountName: clean,
          groupName: group,
          openingDebit: opDr,
          openingCredit: opCr,
          debitMovement: 0,
          creditMovement: 0,
        };
      }
      return ledgerMap[clean];
    };

    // 1. Initialize Standard Master Ledgers
    ensureLedger('Cash in Hand', 'Current Assets', 0, 0);
    ensureLedger(company?.bankName || 'Bank Account', 'Current Assets', 0, 0);
    ensureLedger('Sales Account', 'Direct Incomes', 0, 0);
    ensureLedger('Purchase Account', 'Direct Expenses', 0, 0);
    ensureLedger('Input CGST', 'Current Assets', 0, 0);
    ensureLedger('Input SGST', 'Current Assets', 0, 0);
    ensureLedger('Input IGST', 'Current Assets', 0, 0);
    ensureLedger('Output CGST', 'Current Liabilities', 0, 0);
    ensureLedger('Output SGST', 'Current Liabilities', 0, 0);
    ensureLedger('Output IGST', 'Current Liabilities', 0, 0);
    ensureLedger('Output CGST (RCM)', 'Current Liabilities', 0, 0);
    ensureLedger('Output SGST (RCM)', 'Current Liabilities', 0, 0);
    ensureLedger('Output IGST (RCM)', 'Current Liabilities', 0, 0);
    ensureLedger('Ineligible ITC Sec 17(5)', 'Direct Expenses', 0, 0);
    ensureLedger('Capital Account / Owner Equity', 'Capital & Equity', 0, 0);
    ensureLedger('Office Furniture & Equipment', 'Fixed Assets', 0, 0);

    // 2. Party Ledgers with opening balances
    parties.forEach((p) => {
      const op = parseFloat(p.openingBalance) || 0;
      if (p.partyType === 'customer') {
        ensureLedger(
          p.name,
          'Current Assets',
          p.balanceType === 'dr' ? op : 0,
          p.balanceType === 'cr' ? op : 0
        );
      } else {
        ensureLedger(
          p.name,
          'Current Liabilities',
          p.balanceType === 'dr' ? op : 0,
          p.balanceType === 'cr' ? op : 0
        );
      }
    });

    // Group classification guesser for dynamic accounts
    const getAccountGroup = (accName: string) => {
      const lower = accName.toLowerCase();
      if (
        lower.startsWith('input cgst') ||
        lower.startsWith('input sgst') ||
        lower.startsWith('input igst') ||
        lower.includes('input tax credit') ||
        lower.includes('input gst')
      ) {
        return 'Current Assets';
      }
      if (
        lower.startsWith('output cgst') ||
        lower.startsWith('output sgst') ||
        lower.startsWith('output igst') ||
        lower.includes('output gst')
      ) {
        return 'Current Liabilities';
      }
      if (lower.includes('ineligible itc')) return 'Direct Expenses';
      if (lower.includes('cash') || lower.includes('bank') || lower.includes('debtor') || lower.includes('asset') || lower.includes('deposit')) return 'Current Assets';
      if (lower.includes('creditor') || lower.includes('payable') || lower.includes('gst') || lower.includes('tax') || lower.includes('loan')) return 'Current Liabilities';
      if (lower.includes('capital') || lower.includes('equity') || lower.includes('drawing')) return 'Capital & Equity';
      if (lower.includes('sales') || lower.includes('revenue') || lower.includes('income') || lower.includes('discount received')) return 'Direct Incomes';
      if (lower.includes('purchase') || lower.includes('freight') || lower.includes('wage')) return 'Direct Expenses';
      return 'Indirect Expenses';
    };

    // 3. Post movements: transactions prior to dateRange.start roll into Opening Balance;
    //    transactions within [dateRange.start, dateRange.end] post to Period Movement.
    dayBookEntries.forEach((entry) => {
      if (entry.rawDate > dateRange.end) return;

      const drGroup = getAccountGroup(entry.debitAccount);
      const crGroup = getAccountGroup(entry.creditAccount);

      const drAcc = ensureLedger(entry.debitAccount, drGroup as any);
      const crAcc = ensureLedger(entry.creditAccount, crGroup as any);

      if (entry.rawDate < dateRange.start) {
        drAcc.openingDebit += entry.amount;
        crAcc.openingCredit += entry.amount;
      } else {
        drAcc.debitMovement += entry.amount;
        crAcc.creditMovement += entry.amount;
      }
    });

    // 4. Normalize Opening Balances (net Dr/Cr) and Calculate Closing Balances
    const rows = Object.values(ledgerMap).map((item) => {
      const rawOpNet = item.openingDebit - item.openingCredit;
      const openingDebit = rawOpNet > 0 ? rawOpNet : 0;
      const openingCredit = rawOpNet < 0 ? Math.abs(rawOpNet) : 0;

      const netDr = openingDebit + item.debitMovement;
      const netCr = openingCredit + item.creditMovement;

      let closingDebit = 0;
      let closingCredit = 0;

      if (netDr >= netCr) {
        closingDebit = netDr - netCr;
      } else {
        closingCredit = netCr - netDr;
      }

      return {
        ...item,
        openingDebit,
        openingCredit,
        closingDebit,
        closingCredit,
      };
    });

    // Filter out inactive zero accounts
    const activeRows = rows.filter(
      (r) =>
        r.openingDebit > 0 ||
        r.openingCredit > 0 ||
        r.debitMovement > 0 ||
        r.creditMovement > 0 ||
        r.closingDebit > 0 ||
        r.closingCredit > 0
    );

    const totalOpeningDebit = activeRows.reduce((sum, r) => sum + r.openingDebit, 0);
    const totalOpeningCredit = activeRows.reduce((sum, r) => sum + r.openingCredit, 0);
    const totalDebitMovement = activeRows.reduce((sum, r) => sum + r.debitMovement, 0);
    const totalCreditMovement = activeRows.reduce((sum, r) => sum + r.creditMovement, 0);
    const totalClosingDebit = activeRows.reduce((sum, r) => sum + r.closingDebit, 0);
    const totalClosingCredit = activeRows.reduce((sum, r) => sum + r.closingCredit, 0);

    const isBalanced = Math.abs(totalClosingDebit - totalClosingCredit) < 0.05;

    return {
      rows: activeRows.sort((a, b) => a.accountName.localeCompare(b.accountName)),
      totalOpeningDebit,
      totalOpeningCredit,
      totalDebitMovement,
      totalCreditMovement,
      totalClosingDebit,
      totalClosingCredit,
      isBalanced,
      difference: Math.abs(totalClosingDebit - totalClosingCredit),
    };
  }, [dayBookEntries, parties, company, dateRange]);

  // Trading and P&L Statement Engine (Period-scoped for selected month/period)
  const pnlStatement = useMemo(() => {
    // 1. Trading Account (Period Movement)
    const salesTotal = trialBalance.rows
      .filter((r) => r.groupName === 'Direct Incomes' || r.accountName.toLowerCase().includes('sales'))
      .reduce((sum, r) => sum + Math.max(0, r.creditMovement - r.debitMovement), 0);

    const purchasesTotal = trialBalance.rows
      .filter((r) => r.groupName === 'Direct Expenses' || r.accountName.toLowerCase().includes('purchase'))
      .reduce((sum, r) => sum + Math.max(0, r.debitMovement - r.creditMovement), 0);

    const openingStock = 0;
    const closingStock = summary?.totalStockValuation || 0;

    const grossProfit = Math.max(0, (salesTotal + closingStock) - (openingStock + purchasesTotal));
    const grossLoss = Math.max(0, (openingStock + purchasesTotal) - (salesTotal + closingStock));

    // 2. Profit & Loss Account (Period Movement)
    const indirectExpenses = trialBalance.rows
      .filter((r) => r.groupName === 'Indirect Expenses')
      .map((r) => ({
        name: r.accountName,
        amount: r.debitMovement - r.creditMovement,
      }))
      .filter((e) => e.amount > 0);

    const totalIndirectExpenses = indirectExpenses.reduce((sum, e) => sum + e.amount, 0);

    const indirectIncomes = trialBalance.rows
      .filter((r) => r.groupName === 'Indirect Incomes')
      .map((r) => ({
        name: r.accountName,
        amount: r.creditMovement - r.debitMovement,
      }))
      .filter((i) => i.amount > 0);

    const totalIndirectIncomes = indirectIncomes.reduce((sum, i) => sum + i.amount, 0);

    const netProfit = grossProfit + totalIndirectIncomes - grossLoss - totalIndirectExpenses;

    // Cumulative P&L as of dateRange.end for Balance Sheet Equity alignment
    const cumulativeIncomes = trialBalance.rows
      .filter((r) => r.groupName === 'Direct Incomes' || r.groupName === 'Indirect Incomes')
      .reduce((sum, r) => sum + (r.closingCredit - r.closingDebit), 0);
    const cumulativeExpenses = trialBalance.rows
      .filter((r) => r.groupName === 'Direct Expenses' || r.groupName === 'Indirect Expenses')
      .reduce((sum, r) => sum + (r.closingDebit - r.closingCredit), 0);
    const cumulativeNetProfit = cumulativeIncomes + closingStock - cumulativeExpenses;

    return {
      salesTotal,
      purchasesTotal,
      openingStock,
      closingStock,
      grossProfit,
      grossLoss,
      indirectExpenses,
      totalIndirectExpenses,
      indirectIncomes,
      totalIndirectIncomes,
      netProfit,
      cumulativeNetProfit,
    };
  }, [trialBalance, summary]);

  // Balance Sheet Statement Engine (as of dateRange.end)
  const balanceSheet = useMemo(() => {
    const assets = trialBalance.rows.filter(
      (r) => r.groupName === 'Current Assets' || r.groupName === 'Fixed Assets'
    );
    const liabilities = trialBalance.rows.filter(
      (r) => r.groupName === 'Current Liabilities' || r.groupName === 'Capital & Equity'
    );

    const fixedAssets = assets.filter((a) => a.groupName === 'Fixed Assets');
    const currentAssets = assets.filter((a) => a.groupName === 'Current Assets');

    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.closingDebit, 0);
    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.closingDebit, 0);
    const stockValuation = summary?.totalStockValuation || 0;
    const grandTotalAssets = totalFixedAssets + totalCurrentAssets + stockValuation;

    const capitalItems = liabilities.filter((l) => l.groupName === 'Capital & Equity');
    const currentLiabilities = liabilities.filter((l) => l.groupName === 'Current Liabilities');

    const totalCapital = capitalItems.reduce((sum, c) => sum + c.closingCredit, 0);
    const totalCurrentLiabilities = currentLiabilities.reduce((sum, c) => sum + c.closingCredit, 0);
    const netProfitAddition = pnlStatement.cumulativeNetProfit;

    const grandTotalLiabilities = totalCapital + netProfitAddition + totalCurrentLiabilities;

    return {
      fixedAssets,
      totalFixedAssets,
      currentAssets,
      totalCurrentAssets,
      stockValuation,
      grandTotalAssets,
      capitalItems,
      totalCapital,
      netProfitAddition,
      currentLiabilities,
      totalCurrentLiabilities,
      grandTotalLiabilities,
      isBalanced: Math.abs(grandTotalAssets - grandTotalLiabilities) < 50,
    };
  }, [trialBalance, summary, pnlStatement]);

  // General Ledger Statement for Selected Account
  const ledgerStatement = useMemo(() => {
    const matchingEntries: Array<{
      id: string;
      date: string;
      voucherType: string;
      voucherNumber: string;
      particulars: string;
      debit: number;
      credit: number;
      runningBalance: number;
      balanceType: 'Dr' | 'Cr';
    }> = [];

    let currentBalance = 0; // Positive for Debit, Negative for Credit

    // Opening Balance (already includes prior-period roll-forward from trialBalance)
    const tbRow = trialBalance.rows.find((r) => r.accountName.toLowerCase() === selectedLedgerAccount.toLowerCase());
    const opDr = tbRow ? tbRow.openingDebit : 0;
    const opCr = tbRow ? tbRow.openingCredit : 0;
    currentBalance = opDr - opCr;

    // Filter daybook entries matching this account within dateRange
    const sortedChronological = [...dayBookEntries].reverse();

    sortedChronological.forEach((entry) => {
      if (entry.rawDate < dateRange.start || entry.rawDate > dateRange.end) return;

      const isDebit = entry.debitAccount.toLowerCase() === selectedLedgerAccount.toLowerCase();
      const isCredit = entry.creditAccount.toLowerCase() === selectedLedgerAccount.toLowerCase();

      if (isDebit) {
        currentBalance += entry.amount;
        matchingEntries.push({
          id: entry.id,
          date: entry.date,
          voucherType: entry.typeLabel,
          voucherNumber: entry.voucherNumber,
          particulars: `To ${entry.creditAccount} - ${entry.narration}`,
          debit: entry.amount,
          credit: 0,
          runningBalance: Math.abs(currentBalance),
          balanceType: currentBalance >= 0 ? 'Dr' : 'Cr',
        });
      } else if (isCredit) {
        currentBalance -= entry.amount;
        matchingEntries.push({
          id: entry.id,
          date: entry.date,
          voucherType: entry.typeLabel,
          voucherNumber: entry.voucherNumber,
          particulars: `By ${entry.debitAccount} - ${entry.narration}`,
          debit: 0,
          credit: entry.amount,
          runningBalance: Math.abs(currentBalance),
          balanceType: currentBalance >= 0 ? 'Dr' : 'Cr',
        });
      }
    });

    const totalDebit = matchingEntries.reduce((sum, e) => sum + e.debit, 0) + opDr;
    const totalCredit = matchingEntries.reduce((sum, e) => sum + e.credit, 0) + opCr;
    const closingBalance = Math.abs(currentBalance);
    const closingBalanceType = currentBalance >= 0 ? 'Dr' : 'Cr';

    return {
      entries: matchingEntries,
      openingDebit: opDr,
      openingCredit: opCr,
      totalDebit,
      totalCredit,
      closingBalance,
      closingBalanceType,
    };
  }, [dayBookEntries, selectedLedgerAccount, dateRange, trialBalance]);

  // Cash & Bank Book Data (Period-scoped with Opening Balance roll-forward)
  const cashBankBook = useMemo(() => {
    let cashOpening = 0;
    let bankOpening = 0;

    dayBookEntries.forEach((e) => {
      if (e.rawDate >= dateRange.start) return;
      if (e.debitAccount.toLowerCase().includes('cash')) cashOpening += e.amount;
      if (e.creditAccount.toLowerCase().includes('cash')) cashOpening -= e.amount;
      if (e.debitAccount.toLowerCase().includes('bank')) bankOpening += e.amount;
      if (e.creditAccount.toLowerCase().includes('bank')) bankOpening -= e.amount;
    });

    const cashEntries = periodDayBookEntries.filter(
      (e) =>
        e.debitAccount.toLowerCase().includes('cash') ||
        e.creditAccount.toLowerCase().includes('cash')
    );
    const bankEntries = periodDayBookEntries.filter(
      (e) =>
        e.debitAccount.toLowerCase().includes('bank') ||
        e.creditAccount.toLowerCase().includes('bank')
    );

    const cashDr = cashEntries
      .filter((e) => e.debitAccount.toLowerCase().includes('cash'))
      .reduce((sum, e) => sum + e.amount, 0);
    const cashCr = cashEntries
      .filter((e) => e.creditAccount.toLowerCase().includes('cash'))
      .reduce((sum, e) => sum + e.amount, 0);
    const cashClosing = cashOpening + cashDr - cashCr;

    const bankDr = bankEntries
      .filter((e) => e.debitAccount.toLowerCase().includes('bank'))
      .reduce((sum, e) => sum + e.amount, 0);
    const bankCr = bankEntries
      .filter((e) => e.creditAccount.toLowerCase().includes('bank'))
      .reduce((sum, e) => sum + e.amount, 0);
    const bankClosing = bankOpening + bankDr - bankCr;

    return {
      cashEntries,
      bankEntries,
      cashOpening,
      cashDr,
      cashCr,
      cashClosing,
      bankOpening,
      bankDr,
      bankCr,
      bankClosing,
    };
  }, [dayBookEntries, periodDayBookEntries, dateRange]);

  // Handle Journal Voucher Submit
  const handleCreateJv = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(jvAmount);
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }
    if (!jvDebitAccount.trim() || !jvCreditAccount.trim()) {
      setFormError('Both Debit Account and Credit Account are mandatory for double-entry');
      return;
    }
    if (jvDebitAccount.trim().toLowerCase() === jvCreditAccount.trim().toLowerCase()) {
      setFormError('Debit Account and Credit Account cannot be the same');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSaveJournalEntry({
        entryType: jvModalType,
        voucherNumber: jvVoucherNumber.trim() || undefined,
        date: jvDate,
        referenceNumber: jvReferenceNumber.trim() || undefined,
        debitAccount: jvDebitAccount.trim(),
        creditAccount: jvCreditAccount.trim(),
        debitPartyId: jvDebitPartyId,
        creditPartyId: jvCreditPartyId,
        amount: String(amt.toFixed(2)),
        narration: jvNarration.trim() || `Being ${jvModalType} voucher posted from ${jvCreditAccount} to ${jvDebitAccount}`,
      }, editingJvId !== null ? editingJvId : undefined);

      setShowJvModal(false);
      resetJvForm();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record journal voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetJvForm = () => {
    setEditingJvId(null);
    setJvAmount('');
    setJvNarration('');
    setJvReferenceNumber('');
    setJvVoucherNumber('');
    setJvDebitAccount('');
    setJvCreditAccount('');
    setJvDebitPartyId(undefined);
    setJvCreditPartyId(undefined);
    setFormError(null);
  };

  const openNewVoucherModal = (type: 'journal' | 'contra' | 'debit_note' | 'credit_note' | 'adjustment', jvToEdit?: JournalEntry) => {
    setJvModalType(type);
    if (jvToEdit) {
      setEditingJvId(jvToEdit.id);
      setJvDate(jvToEdit.date);
      setJvVoucherNumber(jvToEdit.voucherNumber);
      setJvReferenceNumber(jvToEdit.referenceNumber || '');
      setJvDebitAccount(jvToEdit.debitAccount);
      setJvCreditAccount(jvToEdit.creditAccount);
      setJvDebitPartyId(jvToEdit.debitPartyId || undefined);
      setJvCreditPartyId(jvToEdit.creditPartyId || undefined);
      setJvAmount(String(jvToEdit.amount));
      setJvNarration(jvToEdit.narration || '');
    } else {
      resetJvForm();
      if (type === 'contra') {
        setJvDebitAccount('Cash in Hand');
        setJvCreditAccount(company?.bankName || 'HDFC Bank Ltd');
      }
    }
    setFormError(null);
    setShowJvModal(true);
  };

  // Export Daybook / Trial Balance to CSV
  const exportCsv = (filename: string, rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDayBook = () => {
    const header = ['Date', 'Voucher Type', 'Voucher Number', 'Debit Account', 'Credit Account', 'Particulars / Narration', 'Amount (INR)'];
    const rows = filteredDayBook.map((item) => [
      item.date,
      item.typeLabel,
      item.voucherNumber,
      item.debitAccount,
      item.creditAccount,
      item.narration,
      item.amount.toFixed(2),
    ]);
    exportCsv(`DayBook_${dateRange.start}_to_${dateRange.end}`, [header, ...rows]);
  };

  const handleExportTrialBalance = () => {
    const header = [
      'Account Name',
      'Group / Classification',
      'Opening Debit (INR)',
      'Opening Credit (INR)',
      'Debit Movement (INR)',
      'Credit Movement (INR)',
      'Closing Debit (INR)',
      'Closing Credit (INR)',
    ];
    const rows = trialBalance.rows.map((r) => [
      r.accountName,
      r.groupName,
      r.openingDebit.toFixed(2),
      r.openingCredit.toFixed(2),
      r.debitMovement.toFixed(2),
      r.creditMovement.toFixed(2),
      r.closingDebit.toFixed(2),
      r.closingCredit.toFixed(2),
    ]);
    rows.push([
      'TOTAL',
      '',
      trialBalance.totalOpeningDebit.toFixed(2),
      trialBalance.totalOpeningCredit.toFixed(2),
      trialBalance.totalDebitMovement.toFixed(2),
      trialBalance.totalCreditMovement.toFixed(2),
      trialBalance.totalClosingDebit.toFixed(2),
      trialBalance.totalClosingCredit.toFixed(2),
    ]);
    exportCsv(`TrialBalance_${dateRange.start}_to_${dateRange.end}`, [header, ...rows]);
  };

  if (loading && !summary && dayBookEntries.length === 0) {
    return <SkeletonAccountingView />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <BookOpen className="w-6 h-6" />
              </span>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                Double-Entry Accounting & Books
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Books in Sync
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openNewVoucherModal('contra')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-cyan-400" />
              Contra (Bank/Cash)
            </button>
            <button
              onClick={() => openNewVoucherModal('journal')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Journal Voucher (JV)
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
              title="Sync double-entry ledger & books with Cloud database"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
              <span>{loading ? 'Syncing...' : 'Sync Books'}</span>
            </button>
            <FullScreenButton mode="component" showLabel />
          </div>
        </div>

        {/* Live Accounting Health Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trial Balance</span>
              {trialBalance.isBalanced ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Balanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <AlertCircle className="w-3 h-3" /> Diff: ₹{trialBalance.difference.toFixed(2)}
                </span>
              )}
            </div>
            <div className="mt-2 text-lg font-bold text-white">
              ₹{trialBalance.totalClosingDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-slate-400">Total Dr = Total Cr</span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cash & Bank</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-emerald-400">
              ₹{(cashBankBook.cashClosing + cashBankBook.bankClosing).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-slate-400">
              Cash: ₹{cashBankBook.cashClosing.toLocaleString('en-IN', { maximumFractionDigits: 0 })} | Bank: ₹{cashBankBook.bankClosing.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gross Profit (GP)</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-cyan-400">
              ₹{pnlStatement.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-slate-400">Sales - Cost of Goods Sold</span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Operating Profit</span>
              <PieChart className="w-4 h-4 text-purple-400" />
            </div>
            <div className={`mt-2 text-lg font-bold ${pnlStatement.netProfit >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
              ₹{pnlStatement.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-slate-400">After operating overheads</span>
          </div>
        </div>
      </div>

      {/* Primary Sub-Tabs Chip Navigation Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-2 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            {
              id: 'daybook',
              label: 'Day Book (Roznamcha)',
              icon: Calendar,
              badge: `${periodDayBookEntries.length}`,
            },
            {
              id: 'trial_balance',
              label: 'Trial Balance',
              icon: Scale,
              badge: trialBalance.isBalanced ? 'Balanced' : 'Diff',
              badgeColor: trialBalance.isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300',
            },
            {
              id: 'trading_pnl',
              label: 'Trading & P&L',
              icon: TrendingUp,
              badge: `GP ₹${(pnlStatement.grossProfit / 1000).toFixed(0)}k`,
            },
            {
              id: 'balance_sheet',
              label: 'Balance Sheet',
              icon: Building2,
              badge: `₹${(balanceSheet.grandTotalAssets / 100000).toFixed(1)}L`,
            },
            {
              id: 'general_ledger',
              label: 'General Ledger',
              icon: BookOpen,
              badge: `${trialBalance.rows.length} A/Cs`,
            },
            {
              id: 'cash_bank',
              label: 'Cash & Bank Book',
              icon: Wallet,
              badge: `₹${((cashBankBook.cashClosing + cashBankBook.bankClosing) / 1000).toFixed(0)}k`,
            },
            {
              id: 'journal_vouchers',
              label: 'Journal Vouchers (JV)',
              icon: FileText,
              badge: `${filteredJournalEntries.length}`,
            },
            {
              id: 'chart_of_accounts',
              label: 'Chart of Accounts',
              icon: Layers,
              badge: `${trialBalance.rows.length}`,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AccountingTab)}
                id={`accounting-tab-chip-${tab.id}`}
                className={`group px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 font-bold'
                    : 'bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950'
                        : tab.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Universal Date Range & Month-Wise Chip Filter Bar */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            Period Filter:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'prev_month', label: 'Prev Month' },
            { id: 'this_quarter', label: 'Quarter' },
            { id: 'fy_2026_27', label: 'FY 2026-27' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom Range' },
          ].map((preset) => {
            const isActive = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id as DateFilterPreset)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                {preset.label}
              </button>
            );
          })}

          {/* Dedicated Month-Wise Selector */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="text-[11px] font-semibold text-emerald-400">Month-Wise:</span>
            <select
              aria-label="Select Month for Accounting Books"
              value={datePreset === 'month' ? selectedMonth : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setDatePreset('month');
                }
              }}
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer bg-slate-950 border focus:outline-none ${
                datePreset === 'month'
                  ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/15'
                  : 'border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <option value="" disabled>
                Pick Month...
              </option>
              {availableMonths.map((m) => (
                <option key={m.ym} value={m.ym} className="bg-slate-900 text-white">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono">
            Active Period: <strong className="text-emerald-400">{dateRange.label}</strong>
          </span>
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* ===================== TAB 1: DAY BOOK (ROZNAMCHA) ===================== */}
      {activeTab === 'daybook' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Day Book (Roznamcha) — <span className="text-emerald-400 text-sm">{dateRange.label}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Unified chronological transaction register of all sales, purchases, payments, receipts, expenses, and journal vouchers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search voucher, party, narration..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleExportDayBook}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Voucher Type Filter Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-500" />
                Voucher Type:
              </span>
              {[
                { id: 'all', label: 'All Vouchers', count: periodDayBookEntries.length },
                { id: 'sales', label: 'Sales (INV)', count: periodDayBookEntries.filter((d) => d.voucherType === 'sales').length, color: 'text-blue-400' },
                { id: 'purchase', label: 'Purchases (PUR)', count: periodDayBookEntries.filter((d) => d.voucherType === 'purchase').length, color: 'text-amber-400' },
                { id: 'receipt', label: 'Receipts (REC)', count: periodDayBookEntries.filter((d) => d.voucherType === 'receipt').length, color: 'text-emerald-400' },
                { id: 'payment', label: 'Payments (PAY)', count: periodDayBookEntries.filter((d) => d.voucherType === 'payment').length, color: 'text-rose-400' },
                { id: 'expense', label: 'Expenses (EXP)', count: periodDayBookEntries.filter((d) => d.voucherType === 'expense').length, color: 'text-orange-400' },
                { id: 'journal', label: 'Journal (JV)', count: periodDayBookEntries.filter((d) => d.voucherType === 'journal').length, color: 'text-purple-400' },
                { id: 'contra', label: 'Contra (CON)', count: periodDayBookEntries.filter((d) => d.voucherType === 'contra').length, color: 'text-cyan-400' },
              ].map((v) => {
                const isActive = voucherTypeFilter === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoucherTypeFilter(v.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap border shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <span>{v.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {v.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Voucher Type</th>
                  <th className="p-3.5">Voucher #</th>
                  <th className="p-3.5">Debit Account (Dr)</th>
                  <th className="p-3.5">Credit Account (Cr)</th>
                  <th className="p-3.5">Particulars / Narration</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredDayBook.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No daybook transactions recorded for this period.
                    </td>
                  </tr>
                ) : (
                  filteredDayBook.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-3.5 font-medium text-slate-300 whitespace-nowrap">{item.date}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.voucherType === 'sales'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : item.voucherType === 'purchase'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : item.voucherType === 'receipt'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.voucherType === 'payment'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : item.voucherType === 'contra'
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {item.typeLabel}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-white font-semibold">{item.voucherNumber}</td>
                      <td className="p-3.5 font-medium text-slate-200">{item.debitAccount}</td>
                      <td className="p-3.5 text-slate-400">{item.creditAccount}</td>
                      <td className="p-3.5 text-slate-400 max-w-xs truncate" title={item.narration}>
                        {item.narration}
                      </td>
                      <td className="p-3.5 text-right font-bold text-white">
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedEntryForSlip(item)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                          title="View Voucher Slip"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950 font-bold text-white border-t border-slate-700">
                  <td colSpan={6} className="p-3.5 text-right uppercase tracking-wider text-xs text-slate-300">
                    Total Transactions ({filteredDayBook.length}):
                  </td>
                  <td className="p-3.5 text-right text-emerald-400 text-sm">
                    ₹{filteredDayBook.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: TRIAL BALANCE ===================== */}
      {activeTab === 'trial_balance' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  Trial Balance (Double Entry Verification)
                </h2>
                {trialBalance.isBalanced ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <Check className="w-3.5 h-3.5" /> Perfectly Balanced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/30">
                    <AlertCircle className="w-3.5 h-3.5" /> Difference: ₹{trialBalance.difference.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Displays Opening, Period Transactions Dr/Cr movement, and Final Closing Balances for every ledger.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportTrialBalance}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                Export Trial Balance
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="p-3.5">Account Head / Ledger</th>
                  <th className="p-3.5">Account Group</th>
                  <th className="p-3.5 text-right">Opening Dr (₹)</th>
                  <th className="p-3.5 text-right">Opening Cr (₹)</th>
                  <th className="p-3.5 text-right">Debit Movement (₹)</th>
                  <th className="p-3.5 text-right">Credit Movement (₹)</th>
                  <th className="p-3.5 text-right bg-slate-950/80">Closing Dr (₹)</th>
                  <th className="p-3.5 text-right bg-slate-950/80">Closing Cr (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {trialBalance.rows.map((row) => (
                  <tr key={row.accountName} className="hover:bg-slate-800/50 transition">
                    <td className="p-3.5 font-bold text-white">
                      <button
                        onClick={() => {
                          setSelectedLedgerAccount(row.accountName);
                          setActiveTab('general_ledger');
                        }}
                        className="text-left hover:text-emerald-400 hover:underline"
                      >
                        {row.accountName}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {row.groupName}
                      </span>
                    </td>
                    <td className="p-3.5 text-right text-slate-400">
                      {row.openingDebit > 0 ? row.openingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="p-3.5 text-right text-slate-400">
                      {row.openingCredit > 0 ? row.openingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="p-3.5 text-right text-blue-400 font-medium">
                      {row.debitMovement > 0 ? row.debitMovement.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="p-3.5 text-right text-purple-400 font-medium">
                      {row.creditMovement > 0 ? row.creditMovement.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-400 bg-emerald-500/5">
                      {row.closingDebit > 0 ? row.closingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-400 bg-emerald-500/5">
                      {row.closingCredit > 0 ? row.closingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950 text-white font-bold text-xs border-t border-slate-700">
                  <td colSpan={2} className="p-3.5 uppercase tracking-wider text-slate-300">
                    GRAND TOTAL (TRIAL BALANCE)
                  </td>
                  <td className="p-3.5 text-right text-slate-300">
                    ₹{trialBalance.totalOpeningDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right text-slate-300">
                    ₹{trialBalance.totalOpeningCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right text-cyan-400">
                    ₹{trialBalance.totalDebitMovement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right text-purple-400">
                    ₹{trialBalance.totalCreditMovement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right text-emerald-400 bg-slate-900">
                    ₹{trialBalance.totalClosingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right text-emerald-400 bg-slate-900">
                    ₹{trialBalance.totalClosingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: TRADING & PROFIT & LOSS ===================== */}
      {activeTab === 'trading_pnl' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Trading and Profit & Loss Account
              </h2>
              <p className="text-xs text-slate-400">
                For the period {dateRange.start} to {dateRange.end} (Indian Accounting Standards)
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Print P&L
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Side: Trading & Expense Debits */}
            <div className="space-y-4">
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Trading Account (Debit / Direct Costs)
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">To Opening Stock:</span>
                    <span className="font-semibold text-white">₹{pnlStatement.openingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">To Gross Purchases:</span>
                    <span className="font-semibold text-white">₹{pnlStatement.purchasesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="text-emerald-400 font-bold">To Gross Profit c/d (Transferred to P&L):</span>
                    <span className="font-bold text-emerald-400">₹{pnlStatement.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Profit & Loss Account (Operating Overheads)
                </h3>
                <div className="space-y-2 text-xs">
                  {pnlStatement.indirectExpenses.length === 0 ? (
                    <div className="text-slate-500 italic">No indirect operating expenses recorded.</div>
                  ) : (
                    pnlStatement.indirectExpenses.map((exp) => (
                      <div key={exp.name} className="flex justify-between">
                        <span className="text-slate-400">To {exp.name}:</span>
                        <span className="font-medium text-white">₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-800 font-bold">
                    <span className="text-slate-300">Total Operating Expenses:</span>
                    <span className="text-white">₹{pnlStatement.totalIndirectExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-purple-400 font-bold text-sm">To Net Profit (Transferred to Capital):</span>
                    <span className="font-bold text-purple-400 text-sm">₹{pnlStatement.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Trading & Income Credits */}
            <div className="space-y-4">
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Trading Account (Credit / Revenue)
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">By Sales Revenue:</span>
                    <span className="font-semibold text-white">₹{pnlStatement.salesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">By Closing Stock Valuation:</span>
                    <span className="font-semibold text-white">₹{pnlStatement.closingStock.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-300 font-bold">Total Trading Credits:</span>
                    <span className="font-bold text-white">
                      ₹{(pnlStatement.salesTotal + pnlStatement.closingStock).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Profit & Loss Account (Credit / Incomes)
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">By Gross Profit b/d:</span>
                    <span className="font-semibold text-emerald-400">₹{pnlStatement.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {pnlStatement.indirectIncomes.map((inc) => (
                    <div key={inc.name} className="flex justify-between">
                      <span className="text-slate-400">By {inc.name}:</span>
                      <span className="font-medium text-white">₹{inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-slate-700 font-bold">
                    <span className="text-slate-300">Total P&L Credits:</span>
                    <span className="text-white">
                      ₹{(pnlStatement.grossProfit + pnlStatement.totalIndirectIncomes).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: BALANCE SHEET ===================== */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  Balance Sheet (Schedule III Format)
                </h2>
                {balanceSheet.isBalanced && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Liabilities = Assets
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">As on {dateRange.end}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Balance Sheet
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Capital & Liabilities */}
            <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>Capital & Liabilities</span>
                <span className="text-xs text-slate-400">Amount (₹)</span>
              </h3>

              {/* Capital Section */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">1. Equity & Capital Account:</div>
                <div className="pl-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Owner's Capital Opening:</span>
                    <span className="font-medium text-white">₹{balanceSheet.totalCapital.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Add: Net Profit for Period:</span>
                    <span className="font-semibold text-emerald-400">+ ₹{balanceSheet.netProfitAddition.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                    <span className="text-slate-200">Net Worth / Total Capital:</span>
                    <span className="text-white">₹{(balanceSheet.totalCapital + balanceSheet.netProfitAddition).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Current Liabilities */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300">2. Current Liabilities & Payables:</div>
                <div className="pl-3 space-y-1.5 text-xs text-slate-400">
                  {balanceSheet.currentLiabilities.map((l) => (
                    <div key={l.accountName} className="flex justify-between">
                      <span>{l.accountName}:</span>
                      <span className="font-medium text-white">₹{l.closingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                    <span className="text-slate-200">Total Current Liabilities:</span>
                    <span className="text-white">₹{balanceSheet.totalCurrentLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-3.5 flex justify-between items-center font-bold text-sm mt-4 border border-slate-800">
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span className="text-emerald-400">₹{balanceSheet.grandTotalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Right Column: Assets */}
            <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>Assets & Properties</span>
                <span className="text-xs text-slate-400">Amount (₹)</span>
              </h3>

              {/* Fixed Assets */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">1. Fixed Assets:</div>
                <div className="pl-3 space-y-1.5 text-xs text-slate-400">
                  {balanceSheet.fixedAssets.map((a) => (
                    <div key={a.accountName} className="flex justify-between">
                      <span>{a.accountName}:</span>
                      <span className="font-medium text-white">₹{a.closingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                    <span className="text-slate-200">Total Fixed Assets:</span>
                    <span className="text-white">₹{balanceSheet.totalFixedAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Current Assets */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300">2. Current Assets:</div>
                <div className="pl-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Closing Stock Valuation:</span>
                    <span className="font-semibold text-white">₹{balanceSheet.stockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {balanceSheet.currentAssets.map((a) => (
                    <div key={a.accountName} className="flex justify-between">
                      <span>{a.accountName}:</span>
                      <span className="font-medium text-white">₹{a.closingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                    <span className="text-slate-200">Total Current Assets:</span>
                    <span className="text-white">
                      ₹{(balanceSheet.totalCurrentAssets + balanceSheet.stockValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-3.5 flex justify-between items-center font-bold text-sm mt-4 border border-slate-800">
                <span>TOTAL ASSETS:</span>
                <span className="text-emerald-400">₹{balanceSheet.grandTotalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 5: GENERAL LEDGER ===================== */}
      {activeTab === 'general_ledger' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Account:</span>
              <AccountMatchSelector
                accounts={trialBalance.rows}
                selectedAccount={selectedLedgerAccount}
                onSelectAccount={(accountName) => setSelectedLedgerAccount(accountName)}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                Closing Balance:{' '}
                <span className="text-emerald-400 font-extrabold text-sm">
                  ₹{ledgerStatement.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerStatement.closingBalanceType}
                </span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Statement
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Voucher Type</th>
                  <th className="p-3.5">Voucher #</th>
                  <th className="p-3.5">Particulars / Narration</th>
                  <th className="p-3.5 text-right">Debit (Dr) ₹</th>
                  <th className="p-3.5 text-right">Credit (Cr) ₹</th>
                  <th className="p-3.5 text-right font-bold bg-slate-950">Running Balance ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {/* Opening Balance Row */}
                <tr className="bg-slate-950/40 italic font-semibold text-slate-300">
                  <td className="p-3.5">{dateRange.start}</td>
                  <td className="p-3.5">Opening</td>
                  <td className="p-3.5">-</td>
                  <td className="p-3.5">To/By Opening Balance b/f</td>
                  <td className="p-3.5 text-right">{ledgerStatement.openingDebit > 0 ? ledgerStatement.openingDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td className="p-3.5 text-right">{ledgerStatement.openingCredit > 0 ? ledgerStatement.openingCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td className="p-3.5 text-right font-bold bg-slate-950/60 text-white">
                    ₹{Math.abs(ledgerStatement.openingDebit - ledgerStatement.openingCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                    {ledgerStatement.openingDebit >= ledgerStatement.openingCredit ? 'Dr' : 'Cr'}
                  </td>
                </tr>

                {ledgerStatement.entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No transactions found for {selectedLedgerAccount} in this date range.
                    </td>
                  </tr>
                ) : (
                  ledgerStatement.entries.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-3.5 text-slate-300 font-medium whitespace-nowrap">{item.date}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.voucherType}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-white font-semibold">{item.voucherNumber}</td>
                      <td className="p-3.5 text-slate-300 max-w-sm truncate">{item.particulars}</td>
                      <td className="p-3.5 text-right text-blue-400 font-semibold">
                        {item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="p-3.5 text-right text-purple-400 font-semibold">
                        {item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-bold text-white bg-slate-950/60">
                        ₹{item.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {item.balanceType}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950 font-bold text-white border-t border-slate-700">
                  <td colSpan={4} className="p-3.5 text-right uppercase tracking-wider text-xs text-slate-300">
                    PERIOD TOTALS:
                  </td>
                  <td className="p-3.5 text-right text-blue-400">
                    ₹{ledgerStatement.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right text-purple-400">
                    ₹{ledgerStatement.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-right text-emerald-400 text-sm">
                    ₹{ledgerStatement.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerStatement.closingBalanceType}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 6: CASH & BANK BOOK ===================== */}
      {activeTab === 'cash_bank' && (
        <div className="space-y-6">
          {/* Cash & Bank View Switcher Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 px-2 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              View Mode:
            </span>
            {[
              { id: 'all', label: 'All (Cash + Bank)', count: cashBankBook.cashEntries.length + cashBankBook.bankEntries.length },
              { id: 'cash', label: 'Cash in Hand Only', count: cashBankBook.cashEntries.length },
              { id: 'bank', label: 'Bank Accounts Only', count: cashBankBook.bankEntries.length },
            ].map((chip) => {
              const isActive = cashBankFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setCashBankFilter(chip.id as 'all' | 'cash' | 'bank')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 border shrink-0 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={`grid gap-6 ${cashBankFilter === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Cash in Hand Card */}
            {(cashBankFilter === 'all' || cashBankFilter === 'cash') && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                      <Wallet className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-base">Cash in Hand</h3>
                      <p className="text-xs text-slate-400">Physical drawer & counter cash</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Closing Balance</div>
                    <div className="text-lg font-bold text-emerald-400">
                      ₹{cashBankBook.cashClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <div>
                    <div className="text-slate-400">Opening</div>
                    <div className="font-bold text-slate-200">₹{cashBankBook.cashOpening.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Receipts (Dr)</div>
                    <div className="font-bold text-emerald-400">+₹{cashBankBook.cashDr.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Payments (Cr)</div>
                    <div className="font-bold text-rose-400">-₹{cashBankBook.cashCr.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 max-h-48 overflow-y-auto divide-y divide-slate-800/80">
                  {cashBankBook.cashEntries.slice(0, 5).map((e) => (
                    <div key={e.id} className="py-2 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-200">{e.voucherNumber} - {e.typeLabel}</div>
                        <div className="text-[11px] text-slate-400">{e.date} | {e.narration}</div>
                      </div>
                      <span className="font-bold text-white">₹{e.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bank Account Card */}
            {(cashBankFilter === 'all' || cashBankFilter === 'bank') && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-white text-base">{company?.bankName || 'HDFC Bank Ltd'}</h3>
                      <p className="text-xs text-slate-400">A/C: {company?.accountNumber || 'Primary Current Account'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Closing Balance</div>
                    <div className="text-lg font-bold text-blue-400">
                      ₹{cashBankBook.bankClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <div>
                    <div className="text-slate-400">Opening</div>
                    <div className="font-bold text-slate-200">₹{cashBankBook.bankOpening.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Deposits (Dr)</div>
                    <div className="font-bold text-emerald-400">+₹{cashBankBook.bankDr.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Withdrawals (Cr)</div>
                    <div className="font-bold text-rose-400">-₹{cashBankBook.bankCr.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 max-h-48 overflow-y-auto divide-y divide-slate-800/80">
                  {cashBankBook.bankEntries.slice(0, 5).map((e) => (
                    <div key={e.id} className="py-2 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-200">{e.voucherNumber} - {e.typeLabel}</div>
                        <div className="text-[11px] text-slate-400">{e.date} | {e.narration}</div>
                      </div>
                      <span className="font-bold text-white">₹{e.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 7: JOURNAL VOUCHERS (JV) ===================== */}
      {activeTab === 'journal_vouchers' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Journal Vouchers (JV) & Adjustments Register
              </h2>
              <p className="text-xs text-slate-400">
                Manual double-entry adjusting entries, depreciation, contra deposits, debit/credit notes.
              </p>
            </div>

            {canCreateJv && (
              <button
                onClick={() => openNewVoucherModal('journal')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Create New JV
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Voucher Type</th>
                  <th className="p-3.5">Voucher #</th>
                  <th className="p-3.5">Debit Account (Dr)</th>
                  <th className="p-3.5">Credit Account (Cr)</th>
                  <th className="p-3.5">Narration</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredJournalEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No manual Journal Vouchers found for {dateRange.label}. Click "+ Create New JV" to post an adjustment or contra voucher.
                    </td>
                  </tr>
                ) : (
                  filteredJournalEntries.map((jv) => (
                    <tr key={jv.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-3.5 font-medium text-slate-300 whitespace-nowrap">{jv.date}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                          {jv.entryType}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-white font-semibold">{jv.voucherNumber}</td>
                      <td className="p-3.5 font-bold text-slate-200">{jv.debitAccount}</td>
                      <td className="p-3.5 font-bold text-slate-200">{jv.creditAccount}</td>
                      <td className="p-3.5 text-slate-400 max-w-sm truncate">{jv.narration}</td>
                      <td className="p-3.5 text-right font-bold text-white">
                        ₹{parseFloat(jv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEditJv && (
                            <button
                              onClick={() => openNewVoucherModal(jv.entryType as any, jv)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition cursor-pointer"
                              title="Edit Voucher"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteJv && (
                            <button
                              onClick={async () => {
                                const ok = await dialog.confirm({
                                  title: 'Delete Journal Voucher',
                                  message: `Are you sure you want to delete journal voucher #${jv.voucherNumber}? This will revert debit/credit ledger entries.`,
                                  confirmText: 'Delete Voucher',
                                  variant: 'danger',
                                  icon: 'trash',
                                });
                                if (ok) {
                                  await onDeleteJournalEntry(jv.id);
                                  onRefresh();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                              title="Delete Voucher"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {!canEditJv && !canDeleteJv && (
                            <span className="text-[11px] text-slate-400 font-medium italic">Read-only</span>
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
      )}

      {/* ===================== TAB 8: CHART OF ACCOUNTS ===================== */}
      {activeTab === 'chart_of_accounts' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Chart of Accounts (COA Hierarchy)
              </h2>
              <p className="text-xs text-slate-400">
                Structured ledger mapping and master classification for Indian statutory accounting.
              </p>
            </div>

            {/* COA Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Groups' },
                { id: 'assets', label: 'Assets' },
                { id: 'liabilities', label: 'Liabilities' },
                { id: 'capital', label: 'Capital & Equity' },
                { id: 'pnl', label: 'Incomes & Expenses' },
              ].map((chip) => {
                const isActive = coaCategoryFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setCoaCategoryFilter(chip.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border shrink-0 ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                id: 'assets',
                title: 'Assets',
                items: trialBalance.rows.filter((r) => r.groupName === 'Current Assets' || r.groupName === 'Fixed Assets'),
              },
              {
                id: 'liabilities',
                title: 'Liabilities',
                items: trialBalance.rows.filter((r) => r.groupName === 'Current Liabilities'),
              },
              {
                id: 'capital',
                title: 'Capital & Equity',
                items: trialBalance.rows.filter((r) => r.groupName === 'Capital & Equity'),
              },
              {
                id: 'pnl',
                title: 'Incomes & Expenses',
                items: trialBalance.rows.filter((r) => r.groupName === 'Direct Incomes' || r.groupName === 'Direct Expenses' || r.groupName === 'Indirect Expenses'),
              },
            ]
              .filter((col) => coaCategoryFilter === 'all' || coaCategoryFilter === col.id)
              .map((col) => (
              <div key={col.title} className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>{col.title}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                    {col.items.length} A/Cs
                  </span>
                </h3>
                <div className="space-y-2 text-xs">
                  {col.items.map((item) => (
                    <div
                      key={item.accountName}
                      onClick={() => {
                        setSelectedLedgerAccount(item.accountName);
                        setActiveTab('general_ledger');
                      }}
                      className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-emerald-500 cursor-pointer transition shadow-xs flex justify-between items-center group"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">{item.accountName}</div>
                        <div className="text-[10px] text-slate-400">{item.groupName}</div>
                      </div>
                      <div className="font-bold text-white text-right">
                        ₹{(item.closingDebit || item.closingCredit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== CREATE JOURNAL VOUCHER MODAL ===================== */}
      {showJvModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  {jvModalType === 'contra'
                    ? 'Record Contra Voucher (Bank / Cash Transfer)'
                    : jvModalType === 'debit_note'
                    ? 'Issue Debit Note'
                    : jvModalType === 'credit_note'
                    ? 'Issue Credit Note'
                    : 'Record Journal Voucher (JV)'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Double-entry posting ensures debits strictly equal credits.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <FullScreenButton mode="modal" showLabel />
                <button
                  onClick={() => setShowJvModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateJv} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={jvDate}
                    onChange={(e) => setJvDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reference / Cheque / UTR #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR19384930"
                    value={jvReferenceNumber}
                    onChange={(e) => setJvReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Debit Account Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Debit Account (Dr) * <span className="text-slate-400 font-normal">(Account receiving value)</span>
                </label>
                <AccountMatchSelector
                  className="w-full"
                  placeholder="Search & match Dr ledger account..."
                  accounts={trialBalance.rows}
                  selectedAccount={jvDebitAccount}
                  onSelectAccount={(acc) => setJvDebitAccount(acc)}
                  allowCustom={true}
                />
              </div>

              {/* Credit Account Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Credit Account (Cr) * <span className="text-slate-400 font-normal">(Account giving value)</span>
                </label>
                <AccountMatchSelector
                  className="w-full"
                  placeholder="Search & match Cr ledger account..."
                  accounts={trialBalance.rows}
                  selectedAccount={jvCreditAccount}
                  onSelectAccount={(acc) => setJvCreditAccount(acc)}
                  allowCustom={true}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹) *</label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={jvAmount}
                    onChange={(e) => setJvAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold bg-slate-950 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Narration */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Particulars / Narration</label>
                <textarea
                  rows={2}
                  placeholder="Being amount transferred / adjusted towards..."
                  value={jvNarration}
                  onChange={(e) => setJvNarration(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowJvModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Posting Entry...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Post Double Entry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== VOUCHER SLIP PREVIEW MODAL ===================== */}
      {selectedEntryForSlip && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full uppercase border border-emerald-500/30">
                  {selectedEntryForSlip.typeLabel} Slip
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Voucher #{selectedEntryForSlip.voucherNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <FullScreenButton mode="modal" showLabel />
                <button
                  onClick={() => setSelectedEntryForSlip(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-semibold text-slate-200">{selectedEntryForSlip.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Debit Account (Dr):</span>
                <span className="font-bold text-blue-400">{selectedEntryForSlip.debitAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credit Account (Cr):</span>
                <span className="font-bold text-purple-400">{selectedEntryForSlip.creditAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-extrabold text-white text-sm">
                  ₹{selectedEntryForSlip.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">Narration / Particulars:</span>
                <p className="text-slate-200 font-medium italic">{selectedEntryForSlip.narration}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Voucher Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
