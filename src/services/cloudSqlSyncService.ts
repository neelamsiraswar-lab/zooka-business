import { db, COLLECTIONS } from '../db/index';
import { CompanyProfile, Party, InventoryItem, Invoice, Expense, PaymentVoucher, JournalEntry, Cheque, ChequeBook, BankStatement } from '../types';

export interface CloudSqlInstanceStatus {
  instanceName: string;
  projectId: string;
  region: string;
  database: string;
  user: string;
  engine: string;
  isConnected: boolean;
  lastChecked: string;
  tableStats: {
    users: number;
    company_profiles: number;
    parties: number;
    inventory_items: number;
    invoices: number;
    expenses: number;
    payments: number;
    journal_entries: number;
    cheques: number;
    bank_statements: number;
  };
}

export const CLOUD_SQL_CONFIG = {
  instanceName: 'ai-studio-535483e3',
  projectId: 'soy-bond-rx4wp',
  region: 'us-west1',
  database: 'cloud_sql_development_database',
  user: 'ai_studio_admin',
  engine: 'PostgreSQL 18.6 (64-bit)',
};

/**
 * Reads all active records from Cloud Firestore across key business collections
 * so they can be reviewed and synced into Cloud SQL PostgreSQL.
 */
export async function getFirestoreExportPayload(workspaceId?: string) {
  const getCol = async (col: string) => {
    try {
      let q = db.collection(col);
      if (workspaceId) {
        q = q.where('workspaceId', '==', workspaceId);
      }
      const snap = await q.get();
      return snap.docs.map((d) => d.data());
    } catch (err) {
      console.warn(`Error reading collection ${col}:`, err);
      return [];
    }
  };

  const [
    parties,
    inventory,
    invoices,
    expenses,
    payments,
    journalEntries,
    cheques,
    chequeBooks,
    bankStatements,
  ] = await Promise.all([
    getCol(COLLECTIONS.PARTIES),
    getCol(COLLECTIONS.INVENTORY_ITEMS),
    getCol(COLLECTIONS.INVOICES),
    getCol(COLLECTIONS.EXPENSES),
    getCol(COLLECTIONS.PAYMENTS),
    getCol(COLLECTIONS.JOURNAL_ENTRIES),
    getCol(COLLECTIONS.CHEQUES),
    getCol(COLLECTIONS.CHEQUE_BOOKS),
    getCol(COLLECTIONS.BANK_STATEMENTS),
  ]);

  return {
    parties,
    inventory,
    invoices,
    expenses,
    payments,
    journalEntries,
    cheques,
    chequeBooks,
    bankStatements,
    totalRecords:
      parties.length +
      inventory.length +
      invoices.length +
      expenses.length +
      payments.length +
      journalEntries.length +
      cheques.length +
      chequeBooks.length +
      bankStatements.length,
  };
}
