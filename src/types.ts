export type SubscriptionPlanTier = 'starter' | 'professional' | 'enterprise' | string;
export type SubscriptionBillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled' | 'expired';

export interface ArchitecturalPillar {
  id: string;
  title: string;
  description: string;
  icon: string;
  colorTheme: 'emerald' | 'indigo' | 'purple' | 'teal' | 'amber' | 'blue' | 'rose' | 'cyan';
  badge?: string;
  order: number;
  isActive: boolean;
  isBuiltIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerReview {
  id: string;
  authorName: string;
  roleOrTitle: string;
  companyName: string;
  location?: string;
  rating: number; // 1 to 5
  reviewText: string;
  badge?: string; // e.g. "Verified CA", "SME Owner", "Tax Consultant", "Enterprise Client"
  avatarUrl?: string;
  avatarBgColor?: 'emerald' | 'indigo' | 'purple' | 'teal' | 'amber' | 'blue' | 'rose' | 'cyan';
  order: number;
  isFeatured: boolean;
  isActive: boolean;
  isBuiltIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  colorTheme: 'emerald' | 'indigo' | 'purple' | 'teal' | 'amber' | 'blue' | 'rose' | 'cyan';
  badgeText?: string;
  order: number;
  isActive: boolean;
  isBuiltIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  popular?: boolean;
  isBuiltIn?: boolean;
  status: 'active' | 'archived' | 'draft';
  monthlyPrice: number;
  annualPrice: number;
  monthlyEquivalentAnnual: number;
  maxUsers: number; // -1 for unlimited
  maxInvoicesPerMonth: number; // -1 for unlimited
  maxLedgers: number; // -1 for unlimited
  maxBranches: number; // -1 for unlimited
  features: string[];
  color: {
    badge: string;
    border: string;
    gradient: string;
    text: string;
    accent: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionInvoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  date: string;
  plan: SubscriptionPlanTier;
  billingCycle: SubscriptionBillingCycle;
  baseAmount: number;
  gstRate: number; // usually 18%
  taxAmount: number;
  totalAmount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentMethod: 'UPI' | 'Razorpay' | 'Bank Transfer' | 'Card' | 'Admin Grant';
  transactionReference?: string;
  periodStart: string;
  periodEnd: string;
  notes?: string;
  pdfUrl?: string;
}

export interface Workspace {
  id: string;
  numericId?: number;
  name: string;
  slug?: string;
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
  ownerEmail: string;
  ownerName?: string;
  plan: SubscriptionPlanTier;
  status: 'active' | 'suspended' | 'trial';
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
  invoicePrefix?: string;
  purchasePrefix?: string;
  receiptPrefix?: string;
  membersCount?: number;
  invoicesCount?: number;
  // Multi-tenant onboarding & setup wizard
  setupCompleted?: boolean;
  onboardingStep?: number;
  filingFrequency?: 'monthly' | 'quarterly';
  financialYearStart?: string;
  // White-labeling & branding
  subdomain?: string;
  customDomain?: string;
  brandPrimaryColor?: string;
  brandLogoUrl?: string;
  digitalSignatureUrl?: string;
  watermarkText?: string;
  // Subscription fields
  billingCycle?: SubscriptionBillingCycle;
  subscriptionStatus?: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  autoRenew?: boolean;
  maxUsers?: number;
  maxInvoicesPerMonth?: number;
  subscriptionInvoices?: SubscriptionInvoice[];
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'accountant' | 'auditor' | 'billing_operator';
  avatarUrl?: string;
}

export interface CompanyProfile {
  id?: number;
  workspaceId?: string;
  businessName: string;
  tradeName?: string;
  gstin: string;
  stateCode: string;
  stateName: string;
  address: string;
  phone?: string;
  email?: string;
  panNumber?: string;
  compositeScheme?: boolean;
  msmeNumber?: string;
  cinNumber?: string;
  website?: string;
  financialYear?: string;
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
  // White-labeling & branding
  subdomain?: string;
  customDomain?: string;
  brandPrimaryColor?: string;
  brandLogoUrl?: string;
  digitalSignatureUrl?: string;
  watermarkText?: string;
  filingFrequency?: 'monthly' | 'quarterly';
  financialYearStart?: string;
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

export interface BankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  valueDate?: string;
  narration: string;
  refNumber?: string;
  withdrawal: number; // Debit / Outflow
  deposit: number; // Credit / Inflow
  balance?: number;
  reconciled: boolean;
  matchedVoucherType?: 'receipt' | 'payment' | 'cheque' | 'expense' | 'journal' | null;
  matchedVoucherId?: number | null;
  matchedVoucherNumber?: string | null;
  matchedPartyName?: string | null;
  matchedAmount?: number | null;
  matchConfidence?: number; // 0 - 100%
  matchReason?: string;
  reconciledAt?: string | null;
  notes?: string | null;
}

export interface BankStatement {
  id: number;
  userId: number;
  bankName: string;
  accountNumber?: string;
  fileName: string;
  statementStartDate?: string;
  statementEndDate?: string;
  openingBalance: string;
  closingBalance: string;
  totalCredits: string;
  totalDebits: string;
  transactionsCount: number;
  reconciledCount: number;
  transactions: BankTransaction[];
  status: 'active' | 'archived';
  createdAt: string;
}

export type SettingsTab =
  | 'general'
  | 'numbering'
  | 'design'
  | 'banking'
  | 'terms'
  | 'roles'
  | 'subscription'
  | 'whitelabel'
  | 'migration';

export type HomepageSectionKey =
  | 'hero'
  | 'gst-calculator'
  | 'pillars'
  | 'trust-metrics'
  | 'pricing'
  | 'reviews'
  | 'security-compliance'
  | 'faqs'
  | 'cta-banner'
  | string;

export interface HomepageSection {
  id: string;
  key: HomepageSectionKey;
  title: string;
  subtitle?: string;
  category: 'core' | 'tools' | 'social_proof' | 'commercial' | 'compliance';
  icon: string;
  order: number;
  isVisible: boolean;
  isBuiltIn?: boolean;
  customBadge?: string;
  badgeText?: string;
  customHtml?: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomepageFaq {
  id: string;
  question: string;
  answer: string;
  category?: string;
  order: number;
  isActive: boolean;
  isBuiltIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
