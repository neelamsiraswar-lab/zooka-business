export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'accountant' | 'auditor' | 'billing_operator';
  avatarUrl?: string;
}

export interface CompanyProfile {
  id?: number;
  businessName: string;
  tradeName?: string;
  gstin: string;
  stateCode: string;
  stateName: string;
  address: string;
  phone?: string;
  email?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  // Invoice Series & Duplicity Settings
  invoiceNumberingMode?: 'automatic' | 'manual';
  invoicePrefix?: string;
  invoiceSuffix?: string;
  nextInvoiceNumber?: number;
  invoicePadding?: number;
  preventDuplicateInvoiceNo?: boolean;
  purchaseNumberingMode?: 'automatic' | 'manual';
  purchasePrefix?: string;
  nextPurchaseNumber?: number;
  receiptPrefix?: string;
  nextReceiptNumber?: number;
  paymentPrefix?: string;
  nextPaymentNumber?: number;
  journalPrefix?: string;
  nextJournalNumber?: number;
  contraPrefix?: string;
  nextContraNumber?: number;
  // Sale Invoice Design & Layout Preferences
  invoiceDesignTemplate?:
    | 'modern'
    | 'classic'
    | 'compact'
    | 'minimal'
    | 'corporate'
    | 'stylish'
    | 'thermal'
    | 'industrial'
    | 'export';
  invoiceColorTheme?:
    | 'emerald'
    | 'blue'
    | 'indigo'
    | 'slate'
    | 'amber'
    | 'rose'
    | 'teal'
    | 'violet'
    | 'cyan';
  invoiceHeaderTitle?: string;
  invoiceSubtitle?: string;
  invoiceShowLogo?: boolean;
  invoiceLogoUrl?: string;
  invoiceShowBankDetails?: boolean;
  invoiceShowUpiQr?: boolean;
  invoiceShowAuthorizedSignatory?: boolean;
  invoiceSignatoryLabel?: string;
  invoiceSignatureUrl?: string;
  invoiceShowHsnSummary?: boolean;
  invoiceShowTerms?: boolean;
  defaultTerms?: string;
  defaultNotes?: string;
}

export interface Party {
  id: number;
  userId: number;
  partyType: 'customer' | 'vendor';
  name: string;
  gstin?: string;
  stateCode?: string;
  stateName?: string;
  phone?: string;
  email?: string;
  address?: string;
  openingBalance: string;
  balanceType: 'dr' | 'cr';
  totalInvoiced?: string;
  totalPaid?: string;
  currentBalance?: string;
  currentBalanceType?: 'dr' | 'cr';
  voucherCount?: number;
}

export interface InventoryItem {
  id: number;
  userId: number;
  name: string;
  sku?: string;
  hsnCode: string;
  unit: string;
  sellingPrice: string;
  purchasePrice: string;
  gstRate: string;
  openingStock: string;
  currentStock: string;
  minStockAlert: string;
}

export interface InvoiceItem {
  id?: number;
  itemId?: number;
  itemName: string;
  hsnCode: string;
  quantity: string;
  unit: string;
  rate: string;
  isTaxInclusive?: boolean;
  discountPercent: string;
  taxableValue: string;
  gstRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  total: string;
}

export interface Invoice {
  id: number;
  userId: number;
  partyId?: number;
  voucherType: 'sales' | 'purchase' | 'receipt' | 'payment';
  saleType?: 'regular' | 'bill_of_supply' | 'export_with_tax' | 'export_without_tax' | 'rcm' | 'sez';
  taxMode?: 'exclusive' | 'inclusive';
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  partyName: string;
  partyGstin?: string;
  placeOfSupply: string;
  isInterstate: boolean;
  subtotal: string;
  cgstTotal: string;
  sgstTotal: string;
  igstTotal: string;
  taxTotal: string;
  discountTotal: string;
  grandTotal: string;
  paidAmount: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMode: string;
  notes?: string;
  termsAndConditions?: string;
  ewayBillNumber?: string;
  status: 'active' | 'cancelled';
  createdAt: string;
  items?: InvoiceItem[];
}

export interface PaymentVoucher {
  id: number;
  userId: number;
  voucherType: 'receipt' | 'payment';
  voucherNumber: string;
  date: string;
  partyId?: number;
  partyName: string;
  partyType: 'customer' | 'vendor';
  amount: string;
  paymentMode: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'neft_rtgs';
  accountType: 'bank' | 'cash';
  bankName?: string;
  referenceNumber?: string;
  invoiceId?: number;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: number;
  userId: number;
  entryType: 'journal' | 'contra' | 'debit_note' | 'credit_note' | 'adjustment' | 'opening';
  voucherNumber: string;
  date: string;
  referenceNumber?: string;
  debitAccount: string;
  creditAccount: string;
  debitPartyId?: number;
  creditPartyId?: number;
  amount: string;
  narration: string;
  createdAt: string;
}

export interface DayBookEntry {
  id: string;
  date: string;
  voucherType: 'sales' | 'purchase' | 'receipt' | 'payment' | 'expense' | 'journal' | 'contra' | 'debit_note' | 'credit_note';
  voucherNumber: string;
  account: string;
  oppositeAccount?: string;
  narration: string;
  debitAmount: number;
  creditAmount: number;
  sourceId: number;
}

export interface TrialBalanceItem {
  accountName: string;
  groupName: 'Current Assets' | 'Fixed Assets' | 'Current Liabilities' | 'Capital & Equity' | 'Direct Incomes' | 'Indirect Incomes' | 'Direct Expenses' | 'Indirect Expenses';
  openingDebit: number;
  openingCredit: number;
  debitMovement: number;
  creditMovement: number;
  closingDebit: number;
  closingCredit: number;
}

export interface Expense {
  id: number;
  userId: number;
  category: string;
  amount: string;
  date: string;
  paymentMode: string;
  referenceNumber?: string;
  vendorName?: string;
  gstin?: string;
  gstPaid: string;
  itcEligible: boolean;
  receiptUrl?: string;
  description?: string;
}

export interface FinancialSummary {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  totalTaxCollected: number;
  totalTaxPaidOnExpenses: number;
  netGstPayable: number;
  totalReceivables: number;
  totalPayables: number;
  totalStockValuation: number;
  totalInvoicesCount: number;
  partiesCount: number;
  inventoryCount: number;
  chequesCount?: number;
  chequesInHandAmount?: number;
}

export interface ActivityLog {
  id: number;
  userId: number;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export interface ChequeBook {
  id: number;
  userId: number;
  bankName: string;
  accountNumber?: string;
  bookName: string;
  seriesPrefix?: string;
  startNumber: number;
  endNumber: number;
  totalLeaves: number;
  usedLeaves: number;
  status: 'active' | 'exhausted' | 'surrendered';
  createdAt: string;
}

export interface Cheque {
  id: number;
  userId: number;
  chequeBookId?: number;
  chequeType: 'inward' | 'outward'; // inward = received (customer), outward = issued (vendor/expense)
  chequeNumber: string; // e.g. "000101"
  chequeDate: string; // YYYY-MM-DD
  amount: string;
  partyId?: number;
  payeeName: string; // Drawer or Payee
  bankName: string; // Drawee / Issuing Bank
  branchName?: string;
  ifscCode?: string;
  depositBank?: string; // Company bank where deposited or drawn from
  status: 'in_hand' | 'deposited' | 'cleared' | 'bounced' | 'cancelled' | 'stopped';
  isPdc: boolean; // Post-Dated Cheque
  isAccountPayee: boolean;
  depositDate?: string;
  clearanceDate?: string;
  bounceDate?: string;
  bounceReason?: string;
  bounceCharges?: string;
  voucherId?: number;
  invoiceId?: number;
  referenceNumber?: string;
  remarks?: string;
  createdAt: string;
}
