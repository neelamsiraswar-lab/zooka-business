// src/db/initSchema.ts
import { Pool } from 'pg';

/**
 * Idempotently creates all required tables and indexes if they do not already exist.
 * This ensures that when deploying to a fresh Supabase PostgreSQL database,
 * the application bootstraps its full relational schema automatically.
 */
export async function ensureDatabaseTablesExist(pool: Pool): Promise<{
  success: boolean;
  tablesCreated: string[];
  error?: string;
}> {
  const ddlStatements = [
    // 1. Users table
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'accountant',
      pin TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 2. Company Profiles table
    `CREATE TABLE IF NOT EXISTS company_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      business_name TEXT NOT NULL,
      trade_name TEXT,
      gstin TEXT NOT NULL,
      state_code TEXT NOT NULL,
      state_name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      bank_name TEXT,
      account_number TEXT,
      ifsc_code TEXT,
      upi_id TEXT,
      invoice_numbering_mode TEXT NOT NULL DEFAULT 'automatic',
      invoice_prefix TEXT NOT NULL DEFAULT 'INV/2026-27/',
      invoice_suffix TEXT NOT NULL DEFAULT '',
      next_invoice_number INTEGER NOT NULL DEFAULT 1,
      invoice_padding INTEGER NOT NULL DEFAULT 3,
      prevent_duplicate_invoice_no BOOLEAN NOT NULL DEFAULT TRUE,
      purchase_numbering_mode TEXT NOT NULL DEFAULT 'automatic',
      purchase_prefix TEXT NOT NULL DEFAULT 'PUR/2026-27/',
      next_purchase_number INTEGER NOT NULL DEFAULT 1,
      receipt_prefix TEXT NOT NULL DEFAULT 'REC/2026-27/',
      next_receipt_number INTEGER NOT NULL DEFAULT 1,
      payment_prefix TEXT NOT NULL DEFAULT 'PAY/2026-27/',
      next_payment_number INTEGER NOT NULL DEFAULT 1,
      journal_prefix TEXT NOT NULL DEFAULT 'JV/2026-27/',
      next_journal_number INTEGER NOT NULL DEFAULT 1,
      contra_prefix TEXT NOT NULL DEFAULT 'CONTRA/2026-27/',
      next_contra_number INTEGER NOT NULL DEFAULT 1,
      invoice_design_template TEXT NOT NULL DEFAULT 'modern',
      invoice_color_theme TEXT NOT NULL DEFAULT 'emerald',
      invoice_header_title TEXT NOT NULL DEFAULT 'TAX INVOICE',
      invoice_subtitle TEXT NOT NULL DEFAULT 'ORIGINAL FOR RECIPIENT',
      invoice_show_logo BOOLEAN NOT NULL DEFAULT TRUE,
      invoice_logo_url TEXT,
      invoice_show_bank_details BOOLEAN NOT NULL DEFAULT TRUE,
      invoice_show_upi_qr BOOLEAN NOT NULL DEFAULT TRUE,
      invoice_show_authorized_signatory BOOLEAN NOT NULL DEFAULT TRUE,
      invoice_signatory_label TEXT NOT NULL DEFAULT 'Authorized Signatory',
      invoice_signature_url TEXT,
      invoice_show_hsn_summary BOOLEAN NOT NULL DEFAULT TRUE,
      invoice_show_terms BOOLEAN NOT NULL DEFAULT TRUE,
      default_terms TEXT,
      default_notes TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 3. Parties (Ledgers) table
    `CREATE TABLE IF NOT EXISTS parties (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      party_type TEXT NOT NULL,
      name TEXT NOT NULL,
      gstin TEXT,
      state_code TEXT,
      state_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      balance_type TEXT NOT NULL DEFAULT 'dr',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 4. Inventory Items table
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      sku TEXT,
      hsn_code TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'PCS',
      selling_price NUMERIC(12, 2) NOT NULL,
      purchase_price NUMERIC(12, 2) NOT NULL,
      gst_rate NUMERIC(5, 2) NOT NULL,
      opening_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
      current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
      min_stock_alert NUMERIC(10, 2) NOT NULL DEFAULT 5,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 5. Invoices table
    `CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      party_id INTEGER REFERENCES parties(id),
      voucher_type TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      due_date TEXT,
      party_name TEXT NOT NULL,
      party_gstin TEXT,
      place_of_supply TEXT NOT NULL,
      is_interstate BOOLEAN NOT NULL DEFAULT FALSE,
      subtotal NUMERIC(12, 2) NOT NULL,
      cgst_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      sgst_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      igst_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      tax_total NUMERIC(12, 2) NOT NULL,
      discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      grand_total NUMERIC(12, 2) NOT NULL,
      paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_mode TEXT NOT NULL DEFAULT 'cash',
      notes TEXT,
      terms_and_conditions TEXT,
      eway_bill_number TEXT,
      sale_type TEXT NOT NULL DEFAULT 'regular',
      tax_mode TEXT NOT NULL DEFAULT 'exclusive',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 6. Invoice Line Items table
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES inventory_items(id),
      item_name TEXT NOT NULL,
      hsn_code TEXT NOT NULL,
      quantity NUMERIC(10, 2) NOT NULL,
      unit TEXT NOT NULL DEFAULT 'PCS',
      rate NUMERIC(12, 2) NOT NULL,
      is_tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
      discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      taxable_value NUMERIC(12, 2) NOT NULL,
      gst_rate NUMERIC(5, 2) NOT NULL,
      cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      total NUMERIC(12, 2) NOT NULL
    );`,

    // 7. Expenses table
    `CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      date TEXT NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'bank_transfer',
      reference_number TEXT,
      vendor_name TEXT,
      gstin TEXT,
      gst_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      itc_eligible BOOLEAN NOT NULL DEFAULT TRUE,
      receipt_url TEXT,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 8. Activity Logs table
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 9. Payments (Vouchers) table
    `CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      voucher_type TEXT NOT NULL,
      voucher_number TEXT NOT NULL,
      date TEXT NOT NULL,
      party_id INTEGER REFERENCES parties(id),
      party_name TEXT NOT NULL,
      party_type TEXT NOT NULL DEFAULT 'customer',
      amount NUMERIC(12, 2) NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'bank_transfer',
      account_type TEXT NOT NULL DEFAULT 'bank',
      bank_name TEXT,
      reference_number TEXT,
      invoice_id INTEGER REFERENCES invoices(id),
      invoice_number TEXT,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 10. Journal Entries table
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      entry_type TEXT NOT NULL,
      voucher_number TEXT NOT NULL,
      date TEXT NOT NULL,
      reference_number TEXT,
      debit_account TEXT NOT NULL,
      credit_account TEXT NOT NULL,
      debit_party_id INTEGER REFERENCES parties(id),
      credit_party_id INTEGER REFERENCES parties(id),
      amount NUMERIC(12, 2) NOT NULL,
      narration TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 11. Cheque Books table
    `CREATE TABLE IF NOT EXISTS cheque_books (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      bank_name TEXT NOT NULL,
      account_number TEXT,
      book_name TEXT NOT NULL,
      series_prefix TEXT,
      start_number INTEGER NOT NULL,
      end_number INTEGER NOT NULL,
      total_leaves INTEGER NOT NULL,
      used_leaves INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 12. Cheques Register table
    `CREATE TABLE IF NOT EXISTS cheques (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      cheque_book_id INTEGER REFERENCES cheque_books(id),
      cheque_type TEXT NOT NULL,
      cheque_number TEXT NOT NULL,
      cheque_date TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      party_id INTEGER REFERENCES parties(id),
      payee_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      branch_name TEXT,
      ifsc_code TEXT,
      deposit_bank TEXT,
      status TEXT NOT NULL DEFAULT 'in_hand',
      is_pdc BOOLEAN NOT NULL DEFAULT FALSE,
      is_account_payee BOOLEAN NOT NULL DEFAULT TRUE,
      deposit_date TEXT,
      clearance_date TEXT,
      bounce_date TEXT,
      bounce_reason TEXT,
      bounce_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      voucher_id INTEGER REFERENCES payments(id),
      invoice_id INTEGER REFERENCES invoices(id),
      reference_number TEXT,
      remarks TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // 13. Bank Statements table
    `CREATE TABLE IF NOT EXISTS bank_statements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      bank_name TEXT NOT NULL,
      account_number TEXT,
      file_name TEXT NOT NULL,
      statement_start_date TEXT,
      statement_end_date TEXT,
      opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      closing_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      total_credits NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      total_debits NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      transactions_count INTEGER NOT NULL DEFAULT 0,
      reconciled_count INTEGER NOT NULL DEFAULT 0,
      transactions JSONB,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );`,

    // Missing columns migrations (for existing tables)
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin TEXT;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS prevent_duplicate_invoice_no BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS purchase_numbering_mode TEXT DEFAULT 'automatic';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS purchase_prefix TEXT DEFAULT 'PUR/2026-27/';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS next_purchase_number INTEGER DEFAULT 1;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS receipt_prefix TEXT DEFAULT 'REC/2026-27/';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS next_receipt_number INTEGER DEFAULT 1;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS payment_prefix TEXT DEFAULT 'PAY/2026-27/';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS next_payment_number INTEGER DEFAULT 1;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS journal_prefix TEXT DEFAULT 'JV/2026-27/';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS next_journal_number INTEGER DEFAULT 1;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS contra_prefix TEXT DEFAULT 'CONTRA/2026-27/';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS next_contra_number INTEGER DEFAULT 1;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_design_template TEXT DEFAULT 'modern';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_color_theme TEXT DEFAULT 'emerald';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_header_title TEXT DEFAULT 'TAX INVOICE';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_subtitle TEXT DEFAULT 'ORIGINAL FOR RECIPIENT';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_show_logo BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_logo_url TEXT;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_show_bank_details BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_show_upi_qr BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_show_authorized_signatory BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_signatory_label TEXT DEFAULT 'Authorized Signatory';`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_signature_url TEXT;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_show_hsn_summary BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS invoice_show_terms BOOLEAN DEFAULT TRUE;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS default_terms TEXT;`,
    `ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS default_notes TEXT;`,

    // Helpful indexes for performant queries
    `CREATE INDEX IF NOT EXISTS idx_invoices_user_date ON invoices(user_id, invoice_date);`,
    `CREATE INDEX IF NOT EXISTS idx_parties_user_type ON parties(user_id, party_type);`,
    `CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);`,
    `CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, date);`,
    `CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date);`,
    `CREATE INDEX IF NOT EXISTS idx_cheques_user_status ON cheques(user_id, status);`,
  ];

  const client = await pool.connect();
  try {
    for (const statement of ddlStatements) {
      await client.query(statement);
    }
    return {
      success: true,
      tablesCreated: [
        'users',
        'company_profiles',
        'parties',
        'inventory_items',
        'invoices',
        'invoice_items',
        'expenses',
        'activity_logs',
        'payments',
        'journal_entries',
        'cheque_books',
        'cheques',
        'bank_statements',
      ],
    };
  } catch (err: any) {
    console.error('ensureDatabaseTablesExist error:', err);
    return {
      success: false,
      tablesCreated: [],
      error: err?.message || String(err),
    };
  } finally {
    client.release();
  }
}
