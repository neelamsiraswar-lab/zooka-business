// src/db/schema.ts
import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users table linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('accountant').notNull(), // 'admin', 'accountant', 'auditor', 'billing_operator'
  pin: text('pin'), // 4-digit PIN / password set by Admin
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Company Settings (GSTIN, Address, Bank details, State code for IGST vs CGST/SGST)
export const companyProfiles = pgTable('company_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  businessName: text('business_name').notNull(),
  tradeName: text('trade_name'),
  gstin: text('gstin').notNull(),
  stateCode: text('state_code').notNull(), // e.g. '27' for Maharashtra, '07' for Delhi
  stateName: text('state_name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  email: text('email'),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  ifscCode: text('ifsc_code'),
  upiId: text('upi_id'),
  // Invoice Series, Serial Numbering & Duplicity Control
  invoiceNumberingMode: text('invoice_numbering_mode').default('automatic').notNull(), // 'automatic' | 'manual'
  invoicePrefix: text('invoice_prefix').default('INV/2026-27/').notNull(),
  invoiceSuffix: text('invoice_suffix').default('').notNull(),
  nextInvoiceNumber: integer('next_invoice_number').default(1).notNull(),
  invoicePadding: integer('invoice_padding').default(3).notNull(), // e.g. 3 -> 001
  preventDuplicateInvoiceNo: boolean('prevent_duplicate_invoice_no').default(true).notNull(),
  purchaseNumberingMode: text('purchase_numbering_mode').default('automatic').notNull(), // 'automatic' | 'manual'
  purchasePrefix: text('purchase_prefix').default('PUR/2026-27/').notNull(),
  nextPurchaseNumber: integer('next_purchase_number').default(1).notNull(),
  receiptPrefix: text('receipt_prefix').default('REC/2026-27/').notNull(),
  nextReceiptNumber: integer('next_receipt_number').default(1).notNull(),
  paymentPrefix: text('payment_prefix').default('PAY/2026-27/').notNull(),
  nextPaymentNumber: integer('next_payment_number').default(1).notNull(),
  journalPrefix: text('journal_prefix').default('JV/2026-27/').notNull(),
  nextJournalNumber: integer('next_journal_number').default(1).notNull(),
  contraPrefix: text('contra_prefix').default('CONTRA/2026-27/').notNull(),
  nextContraNumber: integer('next_contra_number').default(1).notNull(),
  // Sale Invoice Design & Print Layout Preferences
  invoiceDesignTemplate: text('invoice_design_template').default('modern').notNull(), // 'modern' | 'classic' | 'compact' | 'minimal'
  invoiceColorTheme: text('invoice_color_theme').default('emerald').notNull(), // 'emerald' | 'blue' | 'indigo' | 'slate' | 'amber' | 'rose'
  invoiceHeaderTitle: text('invoice_header_title').default('TAX INVOICE').notNull(),
  invoiceSubtitle: text('invoice_subtitle').default('ORIGINAL FOR RECIPIENT').notNull(),
  invoiceShowLogo: boolean('invoice_show_logo').default(true).notNull(),
  invoiceLogoUrl: text('invoice_logo_url'),
  invoiceShowBankDetails: boolean('invoice_show_bank_details').default(true).notNull(),
  invoiceShowUpiQr: boolean('invoice_show_upi_qr').default(true).notNull(),
  invoiceShowAuthorizedSignatory: boolean('invoice_show_authorized_signatory').default(true).notNull(),
  invoiceSignatoryLabel: text('invoice_signatory_label').default('Authorized Signatory').notNull(),
  invoiceSignatureUrl: text('invoice_signature_url'),
  invoiceShowHsnSummary: boolean('invoice_show_hsn_summary').default(true).notNull(),
  invoiceShowTerms: boolean('invoice_show_terms').default(true).notNull(),
  defaultTerms: text('default_terms'),
  defaultNotes: text('default_notes'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Customers & Vendors (Ledgers)
export const parties = pgTable('parties', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  partyType: text('party_type').notNull(), // 'customer', 'vendor'
  name: text('name').notNull(),
  gstin: text('gstin'),
  stateCode: text('state_code'),
  stateName: text('state_name'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  openingBalance: decimal('opening_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
  balanceType: text('balance_type').default('dr').notNull(), // 'dr' (debit - receivable) or 'cr' (credit - payable)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Inventory / Stock Items
export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  sku: text('sku'),
  hsnCode: text('hsn_code').notNull(), // HSN/SAC code
  unit: text('unit').default('PCS').notNull(), // PCS, KGS, BOX, NOS, MTR
  sellingPrice: decimal('selling_price', { precision: 12, scale: 2 }).notNull(),
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(), // 0, 5, 12, 18, 28
  openingStock: decimal('opening_stock', { precision: 10, scale: 2 }).default('0').notNull(),
  currentStock: decimal('current_stock', { precision: 10, scale: 2 }).default('0').notNull(),
  minStockAlert: decimal('min_stock_alert', { precision: 10, scale: 2 }).default('5').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Invoices / Vouchers (Sales Invoice, Purchase Bill, Credit Note, Debit Note, Receipt, Payment)
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  partyId: integer('party_id').references(() => parties.id),
  voucherType: text('voucher_type').notNull(), // 'sales', 'purchase', 'receipt', 'payment', 'journal'
  invoiceNumber: text('invoice_number').notNull(),
  invoiceDate: text('invoice_date').notNull(), // YYYY-MM-DD
  dueDate: text('due_date'),
  partyName: text('party_name').notNull(),
  partyGstin: text('party_gstin'),
  placeOfSupply: text('place_of_supply').notNull(), // State code
  isInterstate: boolean('is_interstate').default(false).notNull(), // true = IGST, false = CGST + SGST
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  cgstTotal: decimal('cgst_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
  sgstTotal: decimal('sgst_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
  igstTotal: decimal('igst_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
  taxTotal: decimal('tax_total', { precision: 12, scale: 2 }).notNull(),
  discountTotal: decimal('discount_total', { precision: 12, scale: 2 }).default('0.00').notNull(),
  grandTotal: decimal('grand_total', { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  paymentStatus: text('payment_status').default('unpaid').notNull(), // 'paid', 'partial', 'unpaid'
  paymentMode: text('payment_mode').default('cash').notNull(), // 'cash', 'bank_transfer', 'upi', 'cheque'
  notes: text('notes'),
  termsAndConditions: text('terms_and_conditions'),
  eWayBillNumber: text('eway_bill_number'),
  saleType: text('sale_type').default('regular').notNull(), // 'regular', 'bill_of_supply', 'export_with_tax', 'export_without_tax', 'rcm', 'sez'
  taxMode: text('tax_mode').default('exclusive').notNull(), // 'exclusive', 'inclusive'
  status: text('status').default('active').notNull(), // 'active', 'cancelled'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Line Items for Invoices
export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
  itemId: integer('item_id').references(() => inventoryItems.id),
  itemName: text('item_name').notNull(),
  hsnCode: text('hsn_code').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').default('PCS').notNull(),
  rate: decimal('rate', { precision: 12, scale: 2 }).notNull(),
  isTaxInclusive: boolean('is_tax_inclusive').default(false).notNull(),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0.00').notNull(),
  taxableValue: decimal('taxable_value', { precision: 12, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(),
  cgstAmount: decimal('cgst_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  sgstAmount: decimal('sgst_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  igstAmount: decimal('igst_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
});

// Expenses tracking
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  category: text('category').notNull(), // 'Rent', 'Utilities', 'Salaries', 'Transport/Freight', 'Office Supplies', 'Marketing', 'Repairs', 'Other'
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  paymentMode: text('payment_mode').default('bank_transfer').notNull(),
  referenceNumber: text('reference_number'),
  vendorName: text('vendor_name'),
  gstin: text('gstin'),
  gstPaid: decimal('gst_paid', { precision: 12, scale: 2 }).default('0.00').notNull(),
  itcEligible: boolean('itc_eligible').default(true).notNull(), // Input Tax Credit eligibility
  receiptUrl: text('receipt_url'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit Logs / Activity synchronization across team members
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(), // 'CREATE_INVOICE', 'RECORD_PAYMENT', 'ADD_EXPENSE', etc.
  entityType: text('entity_type').notNull(), // 'invoice', 'expense', 'party', 'inventory', 'payment'
  entityId: text('entity_id'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Receipts and Payments (Vouchers for cash/bank received or paid)
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  voucherType: text('voucher_type').notNull(), // 'receipt' (Money In) | 'payment' (Money Out)
  voucherNumber: text('voucher_number').notNull(), // e.g. REC/2026-27/001 or PAY/2026-27/001
  date: text('date').notNull(), // YYYY-MM-DD
  partyId: integer('party_id').references(() => parties.id),
  partyName: text('party_name').notNull(),
  partyType: text('party_type').default('customer').notNull(), // 'customer', 'vendor'
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMode: text('payment_mode').default('bank_transfer').notNull(), // 'cash', 'bank_transfer', 'upi', 'cheque', 'neft_rtgs'
  accountType: text('account_type').default('bank').notNull(), // 'bank', 'cash'
  bankName: text('bank_name'), // e.g. 'HDFC Bank Ltd', 'Cash in Hand', 'ICICI Bank'
  referenceNumber: text('reference_number'), // Cheque #, UTR #, Txn ID
  invoiceId: integer('invoice_id').references(() => invoices.id), // optional linked invoice/bill
  invoiceNumber: text('invoice_number'), // e.g. 'INV/2026-27/001'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Journal Vouchers, Contra Entries, Debit/Credit Notes and Adjustments (Double Entry Accounting)
export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  entryType: text('entry_type').notNull(), // 'journal', 'contra', 'debit_note', 'credit_note', 'adjustment', 'opening'
  voucherNumber: text('voucher_number').notNull(), // e.g. 'JV/2026-27/001', 'CONTRA/2026-27/001'
  date: text('date').notNull(), // YYYY-MM-DD
  referenceNumber: text('reference_number'),
  debitAccount: text('debit_account').notNull(), // e.g. 'Rent Expense', 'Cash in Hand', 'HDFC Bank', 'Sundry Debtors'
  creditAccount: text('credit_account').notNull(), // e.g. 'HDFC Bank', 'Sundry Creditors', 'Sales Return', 'Capital Account'
  debitPartyId: integer('debit_party_id').references(() => parties.id),
  creditPartyId: integer('credit_party_id').references(() => parties.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  narration: text('narration').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Cheque Books issued by company's bank accounts
export const chequeBooks = pgTable('cheque_books', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  bankName: text('bank_name').notNull(), // e.g. 'HDFC Bank Ltd'
  accountNumber: text('account_number'),
  bookName: text('book_name').notNull(), // e.g. 'HDFC Primary Current A/c - Book #1'
  seriesPrefix: text('series_prefix'), // e.g. 'HD' or ''
  startNumber: integer('start_number').notNull(), // e.g. 100101
  endNumber: integer('end_number').notNull(), // e.g. 100150
  totalLeaves: integer('total_leaves').notNull(), // e.g. 50
  usedLeaves: integer('used_leaves').default(0).notNull(),
  status: text('status').default('active').notNull(), // 'active', 'exhausted', 'surrendered'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Cheques Register (Inward & Outward Cheques with full clearing lifecycle)
export const cheques = pgTable('cheques', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  chequeBookId: integer('cheque_book_id').references(() => chequeBooks.id),
  chequeType: text('cheque_type').notNull(), // 'inward' (received from customer), 'outward' (issued to vendor/party)
  chequeNumber: text('cheque_number').notNull(), // e.g. '100101' (6 digits)
  chequeDate: text('cheque_date').notNull(), // YYYY-MM-DD
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  partyId: integer('party_id').references(() => parties.id),
  payeeName: text('payee_name').notNull(), // Drawer or Payee party name
  bankName: text('bank_name').notNull(), // Drawee / Issuing Bank name (e.g. 'State Bank of India')
  branchName: text('branch_name'),
  ifscCode: text('ifsc_code'),
  depositBank: text('deposit_bank'), // Company's bank where cheque deposited or drawn from
  status: text('status').default('in_hand').notNull(), // 'in_hand', 'deposited', 'cleared', 'bounced', 'cancelled', 'stopped'
  isPdc: boolean('is_pdc').default(false).notNull(), // Post Dated Cheque
  isAccountPayee: boolean('is_account_payee').default(true).notNull(),
  depositDate: text('deposit_date'), // YYYY-MM-DD
  clearanceDate: text('clearance_date'), // YYYY-MM-DD
  bounceDate: text('bounce_date'), // YYYY-MM-DD
  bounceReason: text('bounce_reason'), // e.g. 'Insufficient Funds', 'Signature Differs', etc.
  bounceCharges: decimal('bounce_charges', { precision: 12, scale: 2 }).default('0.00').notNull(),
  voucherId: integer('voucher_id').references(() => payments.id),
  invoiceId: integer('invoice_id').references(() => invoices.id),
  referenceNumber: text('reference_number'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Bank Statements uploaded for Auto-Reconciliation
export const bankStatements = pgTable('bank_statements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  bankName: text('bank_name').notNull(), // 'HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Other'
  accountNumber: text('account_number'),
  fileName: text('file_name').notNull(),
  statementStartDate: text('statement_start_date'),
  statementEndDate: text('statement_end_date'),
  openingBalance: decimal('opening_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
  closingBalance: decimal('closing_balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
  totalCredits: decimal('total_credits', { precision: 12, scale: 2 }).default('0.00').notNull(),
  totalDebits: decimal('total_debits', { precision: 12, scale: 2 }).default('0.00').notNull(),
  transactionsCount: integer('transactions_count').default(0).notNull(),
  reconciledCount: integer('reconciled_count').default(0).notNull(),
  transactions: jsonb('transactions'), // Array of bank statement lines with reconciliation metadata
  status: text('status').default('active').notNull(), // 'active', 'archived'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  companyProfile: one(companyProfiles),
  invoices: many(invoices),
  payments: many(payments),
  journalEntries: many(journalEntries),
  expenses: many(expenses),
  parties: many(parties),
  inventoryItems: many(inventoryItems),
  activityLogs: many(activityLogs),
  chequeBooks: many(chequeBooks),
  cheques: many(cheques),
  bankStatements: many(bankStatements),
}));

export const bankStatementsRelations = relations(bankStatements, ({ one }) => ({
  user: one(users, {
    fields: [bankStatements.userId],
    references: [users.id],
  }),
}));

export const companyProfilesRelations = relations(companyProfiles, ({ one }) => ({
  user: one(users, {
    fields: [companyProfiles.userId],
    references: [users.id],
  }),
}));

export const partiesRelations = relations(parties, ({ one, many }) => ({
  user: one(users, {
    fields: [parties.userId],
    references: [users.id],
  }),
  invoices: many(invoices),
  payments: many(payments),
  cheques: many(cheques),
  debitJournalEntries: many(journalEntries, { relationName: 'debitParty' }),
  creditJournalEntries: many(journalEntries, { relationName: 'creditParty' }),
}));

export const chequeBooksRelations = relations(chequeBooks, ({ one, many }) => ({
  user: one(users, {
    fields: [chequeBooks.userId],
    references: [users.id],
  }),
  cheques: many(cheques),
}));

export const chequesRelations = relations(cheques, ({ one }) => ({
  user: one(users, {
    fields: [cheques.userId],
    references: [users.id],
  }),
  chequeBook: one(chequeBooks, {
    fields: [cheques.chequeBookId],
    references: [chequeBooks.id],
  }),
  party: one(parties, {
    fields: [cheques.partyId],
    references: [parties.id],
  }),
  voucher: one(payments, {
    fields: [cheques.voucherId],
    references: [payments.id],
  }),
  invoice: one(invoices, {
    fields: [cheques.invoiceId],
    references: [invoices.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  user: one(users, {
    fields: [inventoryItems.userId],
    references: [users.id],
  }),
  invoiceItems: many(invoiceItems),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  party: one(parties, {
    fields: [invoices.partyId],
    references: [parties.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
  cheques: many(cheques),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  item: one(inventoryItems, {
    fields: [invoiceItems.itemId],
    references: [inventoryItems.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  party: one(parties, {
    fields: [payments.partyId],
    references: [parties.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  cheques: many(cheques),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
  debitParty: one(parties, {
    fields: [journalEntries.debitPartyId],
    references: [parties.id],
    relationName: 'debitParty',
  }),
  creditParty: one(parties, {
    fields: [journalEntries.creditPartyId],
    references: [parties.id],
    relationName: 'creditParty',
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
