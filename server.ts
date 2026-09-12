import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, updateUserProfile } from './src/db/users.ts';
import { seedDemoDataForUser } from './src/db/seed.ts';
import {
  getCompanyProfile,
  upsertCompanyProfile,
  getParties,
  createParty,
  editParty,
  deleteParty,
  getInventory,
  createInventoryItem,
  editInventoryItem,
  adjustInventoryStock,
  deleteInventoryItem,
  getInvoices,
  getInvoiceDetails,
  getNextAvailableInvoiceNumber,
  checkInvoiceNumberDuplicate,
  createInvoiceWithItems,
  editInvoiceWithItems,
  deleteInvoice,
  getExpenses,
  createExpense,
  editExpense,
  deleteExpense,
  getFinancialSummary,
  getActivityLogs,
  logActivity,
  getPayments,
  getNextPaymentVoucherNumber,
  createPaymentVoucher,
  deletePaymentVoucher,
  getJournalEntries,
  getNextJournalVoucherNumber,
  createJournalEntry,
  editJournalEntry,
  deleteJournalEntry,
  getChequeBooks,
  createChequeBook,
  editChequeBook,
  deleteChequeBook,
  getCheques,
  createCheque,
  editCheque,
  updateChequeStatus,
  deleteCheque,
  clearMasterLedger,
  getFullDataBackup,
  restoreDataFromBackup,
} from './src/db/dataService.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// API Routes

// In-flight deduplication to prevent concurrent duplicate user initialization
const resolvingUsers = new Map<string, Promise<any>>();

// Helper to resolve app user record from authenticated Firebase Token
async function resolveUser(req: AuthRequest) {
  if (!req.user || !req.user.uid) {
    throw new Error('Unauthenticated user');
  }
  const uid = req.user.uid;
  if (resolvingUsers.has(uid)) {
    return resolvingUsers.get(uid);
  }

  const resolveTask = (async () => {
    const email = req.user!.email || `${uid}@gstuser.local`;
    const user = await getOrCreateUser(uid, email, req.user!.name, req.user!.picture);
    // seed initial demo records if new user (seedDemoDataForUser is also protected by mutex)
    await seedDemoDataForUser(user);
    return user;
  })();

  resolvingUsers.set(uid, resolveTask);
  try {
    return await resolveTask;
  } finally {
    resolvingUsers.delete(uid);
  }
}

// 0. Consolidated App Data Endpoint (fetches full workspace state in one fast, reliable request)
app.get('/api/app-data', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const [summary, invoices, expenses, parties, inventory, company, activity, payments, journalEntries, chequeBooks, cheques] = await Promise.all([
      getFinancialSummary(user.id),
      getInvoices(user.id),
      getExpenses(user.id),
      getParties(user.id),
      getInventory(user.id),
      getCompanyProfile(user.id),
      getActivityLogs(user.id),
      getPayments(user.id),
      getJournalEntries(user.id),
      getChequeBooks(user.id),
      getCheques(user.id),
    ]);

    res.json({
      summary,
      invoices,
      expenses,
      parties,
      inventory,
      company,
      activity,
      payments,
      journalEntries,
      chequeBooks,
      cheques,
    });
  } catch (error: any) {
    console.error('Error in /api/app-data:', error);
    res.status(500).json({ error: error.message || 'Failed to load application data' });
  }
});

// 1. Current User Profile & Role
app.get('/api/user/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    res.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });
  } catch (error: any) {
    console.error('Error in /api/user/me:', error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

app.put('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const { displayName, role } = req.body;
    const updated = await updateUserProfile(user.id, { displayName, role });
    await logActivity(user.id, user.email, 'UPDATE_USER_PROFILE', 'user', String(user.id), `Updated user profile/role to ${role || user.role}`);
    res.json({
      id: updated.id,
      uid: updated.uid,
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
    });
  } catch (error: any) {
    console.error('Error in PUT /api/user/profile:', error);
    res.status(500).json({ error: error.message || 'Failed to update user profile' });
  }
});

// 2. Company Profile
app.get('/api/company', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const profile = await getCompanyProfile(user.id);
    res.json(profile);
  } catch (error: any) {
    console.error('Error in /api/company:', error);
    res.status(500).json({ error: error.message || 'Failed to get company profile' });
  }
});

app.post('/api/company', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const profile = await upsertCompanyProfile(user.id, req.body);
    await logActivity(user.id, user.email, 'UPDATE_COMPANY_PROFILE', 'company', String(profile.id), `Updated ${profile.businessName}`);
    res.json(profile);
  } catch (error: any) {
    console.error('Error saving /api/company:', error);
    res.status(500).json({ error: error.message || 'Failed to update company profile' });
  }
});

app.post('/api/settings/clear-ledger', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const result = await clearMasterLedger(user.id);
    await logActivity(
      user.id,
      user.email,
      'CLEAR_MASTER_LEDGER',
      'company',
      String(user.id),
      'Cleared all master ledgers, inventory, parties, and transactions.'
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/settings/clear-ledger:', error);
    res.status(500).json({ error: error.message || 'Failed to clear master ledger' });
  }
});

app.get('/api/settings/backup', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const backup = await getFullDataBackup(user.id);
    await logActivity(user.id, user.email, 'DOWNLOAD_DATA_BACKUP', 'company', String(user.id), 'Downloaded complete JSON data backup.');
    res.json(backup);
  } catch (error: any) {
    console.error('Error in GET /api/settings/backup:', error);
    res.status(500).json({ error: error.message || 'Failed to generate data backup' });
  }
});

app.post('/api/settings/restore', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const result = await restoreDataFromBackup(user.id, req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/settings/restore:', error);
    res.status(500).json({ error: error.message || 'Failed to restore data backup' });
  }
});

// 3. Financial Dashboard & Automated GST Reports
app.get('/api/dashboard/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const summary = await getFinancialSummary(user.id);
    res.json(summary);
  } catch (error: any) {
    console.error('Error in /api/dashboard/summary:', error);
    res.status(500).json({ error: error.message || 'Failed to get summary' });
  }
});

// 4. Invoices / Vouchers (Sales & Purchases)
app.get('/api/invoices', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const list = await getInvoices(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoices' });
  }
});

app.get('/api/invoices/next-number', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const voucherType = (req.query.type as string) === 'purchase' ? 'purchase' : 'sales';
    const result = await getNextAvailableInvoiceNumber(user.id, voucherType);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/invoices/next-number:', error);
    res.status(500).json({ error: error.message || 'Failed to get next invoice number' });
  }
});

app.get('/api/invoices/check-duplicate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const invoiceNumber = (req.query.number as string) || '';
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : undefined;
    const result = await checkInvoiceNumberDuplicate(user.id, invoiceNumber, excludeId);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/invoices/check-duplicate:', error);
    res.status(500).json({ error: error.message || 'Failed to check duplicate' });
  }
});

app.get('/api/invoices/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const invoice = await getInvoiceDetails(parseInt(req.params.id));
    if (!invoice || invoice.userId !== user.id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error: any) {
    console.error('Error in /api/invoices/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoice' });
  }
});

app.post('/api/invoices', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const invoice = await createInvoiceWithItems(user.id, req.body);
    await logActivity(
      user.id,
      user.email,
      'CREATE_INVOICE',
      'invoice',
      String(invoice?.id),
      `Created ${invoice?.voucherType.toUpperCase()} Invoice ${invoice?.invoiceNumber} for ₹${invoice?.grandTotal}`
    );
    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Error in POST /api/invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to create invoice' });
  }
});

app.put('/api/invoices/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const invoiceId = parseInt(req.params.id);
    const updated = await editInvoiceWithItems(invoiceId, user.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Invoice not found' });
    await logActivity(
      user.id,
      user.email,
      'UPDATE_INVOICE',
      'invoice',
      String(updated.id),
      `Updated ${updated.voucherType.toUpperCase()} Voucher ${updated.invoiceNumber} (Total: ₹${updated.grandTotal})`
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/invoices/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update invoice' });
  }
});

app.delete('/api/invoices/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const invoiceId = parseInt(req.params.id);
    const result = await deleteInvoice(invoiceId, user.id);
    if (!result) return res.status(404).json({ error: 'Invoice not found' });
    await logActivity(
      user.id,
      user.email,
      'DELETE_INVOICE',
      'invoice',
      String(invoiceId),
      `Deleted ${result.voucherType?.toUpperCase() || ''} Voucher ${result.invoiceNumber}`
    );
    res.json({ success: true, message: `Voucher ${result.invoiceNumber} deleted successfully` });
  } catch (error: any) {
    console.error('Error in DELETE /api/invoices/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete invoice' });
  }
});

// 5. Parties (Customers / Vendors)
app.get('/api/parties', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const list = await getParties(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/parties:', error);
    res.status(500).json({ error: error.message || 'Failed to get parties' });
  }
});

app.post('/api/parties', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const party = await createParty(user.id, req.body);
    await logActivity(user.id, user.email, 'ADD_PARTY', 'party', String(party.id), `Added party ${party.name} (${party.partyType})`);
    res.status(201).json(party);
  } catch (error: any) {
    console.error('Error in POST /api/parties:', error);
    res.status(500).json({ error: error.message || 'Failed to add party' });
  }
});

app.put('/api/parties/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const party = await editParty(parseInt(req.params.id), user.id, req.body);
    if (!party) return res.status(404).json({ error: 'Party not found' });
    await logActivity(user.id, user.email, 'EDIT_PARTY', 'party', String(party.id), `Updated party ${party.name}`);
    res.json(party);
  } catch (error: any) {
    console.error('Error in PUT /api/parties/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update party' });
  }
});

app.delete('/api/parties/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const partyId = parseInt(req.params.id);
    const deleted = await deleteParty(partyId, user.id);
    if (!deleted) return res.status(404).json({ error: 'Party not found' });
    await logActivity(user.id, user.email, 'DELETE_PARTY', 'party', String(partyId), `Deleted party ${deleted.name}`);
    res.json({ success: true, message: `Party ${deleted.name} deleted successfully` });
  } catch (error: any) {
    console.error('Error in DELETE /api/parties/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete party' });
  }
});

// 6. Inventory Items
app.get('/api/inventory', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const items = await getInventory(user.id);
    res.json(items);
  } catch (error: any) {
    console.error('Error in /api/inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to get inventory' });
  }
});

app.post('/api/inventory', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const item = await createInventoryItem(user.id, req.body);
    await logActivity(user.id, user.email, 'ADD_ITEM', 'inventory', String(item.id), `Added stock item ${item.name} with GST ${item.gstRate}%`);
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error in POST /api/inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to add item' });
  }
});

app.put('/api/inventory/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const item = await editInventoryItem(parseInt(req.params.id), user.id, req.body);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await logActivity(user.id, user.email, 'UPDATE_ITEM', 'inventory', String(item.id), `Updated stock item ${item.name}`);
    res.json(item);
  } catch (error: any) {
    console.error('Error in PUT /api/inventory/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update item' });
  }
});

app.patch('/api/inventory/:id/stock', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const { currentStock, reason } = req.body;
    const item = await adjustInventoryStock(parseInt(req.params.id), user.id, parseFloat(currentStock));
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await logActivity(
      user.id,
      user.email,
      'ADJUST_STOCK',
      'inventory',
      String(item.id),
      `Adjusted stock of ${item.name} to ${item.currentStock} ${item.unit} (${reason || 'Physical verification'})`
    );
    res.json(item);
  } catch (error: any) {
    console.error('Error in PATCH /api/inventory/:id/stock:', error);
    res.status(500).json({ error: error.message || 'Failed to adjust stock' });
  }
});

app.delete('/api/inventory/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const itemId = parseInt(req.params.id);
    const deleted = await deleteInventoryItem(itemId, user.id);
    if (!deleted) return res.status(404).json({ error: 'Item not found' });
    await logActivity(
      user.id,
      user.email,
      'DELETE_ITEM',
      'inventory',
      String(deleted.id),
      `Deleted inventory item ${deleted.name} (HSN: ${deleted.hsnCode})`
    );
    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/inventory/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete inventory item' });
  }
});

// 7. Expenses
app.get('/api/expenses', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const list = await getExpenses(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/expenses:', error);
    res.status(500).json({ error: error.message || 'Failed to get expenses' });
  }
});

app.post('/api/expenses', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const exp = await createExpense(user.id, req.body);
    await logActivity(
      user.id,
      user.email,
      'ADD_EXPENSE',
      'expense',
      String(exp.id),
      `Logged expense ₹${exp.amount} under ${exp.category}`
    );
    res.status(201).json(exp);
  } catch (error: any) {
    console.error('Error in POST /api/expenses:', error);
    res.status(500).json({ error: error.message || 'Failed to add expense' });
  }
});

app.put('/api/expenses/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const expId = parseInt(req.params.id);
    const updated = await editExpense(expId, user.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    await logActivity(
      user.id,
      user.email,
      'UPDATE_EXPENSE',
      'expense',
      String(updated.id),
      `Updated expense ₹${updated.amount} under ${updated.category} (${updated.vendorName || 'Direct'})`
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/expenses/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const expId = parseInt(req.params.id);
    const deleted = await deleteExpense(expId, user.id);
    if (!deleted) return res.status(404).json({ error: 'Expense not found' });
    await logActivity(
      user.id,
      user.email,
      'DELETE_EXPENSE',
      'expense',
      String(deleted.id),
      `Deleted expense ₹${deleted.amount} (${deleted.category})`
    );
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/expenses/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete expense' });
  }
});

// 8. Receipts & Payments (Vouchers)
app.get('/api/payments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const voucherType = req.query.type as ('receipt' | 'payment') | undefined;
    const list = await getPayments(user.id, voucherType);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/payments:', error);
    res.status(500).json({ error: error.message || 'Failed to get payments' });
  }
});

app.get('/api/payments/next-number', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const voucherType = (req.query.type as 'receipt' | 'payment') || 'receipt';
    const nextInfo = await getNextPaymentVoucherNumber(user.id, voucherType);
    res.json(nextInfo);
  } catch (error: any) {
    console.error('Error in /api/payments/next-number:', error);
    res.status(500).json({ error: error.message || 'Failed to get next voucher number' });
  }
});

app.post('/api/payments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const voucher = await createPaymentVoucher(user.id, req.body);
    const actionType = voucher.voucherType === 'receipt' ? 'RECORD_RECEIPT' : 'RECORD_PAYMENT';
    const label = voucher.voucherType === 'receipt' ? 'Receipt' : 'Payment';
    await logActivity(
      user.id,
      user.email,
      actionType,
      'payment',
      String(voucher.id),
      `Recorded ${label} Voucher #${voucher.voucherNumber} of ₹${voucher.amount} (${voucher.partyName}) via ${voucher.paymentMode}`
    );
    res.status(201).json(voucher);
  } catch (error: any) {
    console.error('Error in POST /api/payments:', error);
    res.status(500).json({ error: error.message || 'Failed to record voucher' });
  }
});

app.delete('/api/payments/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const voucherId = parseInt(req.params.id);
    const deleted = await deletePaymentVoucher(voucherId, user.id);
    if (!deleted) return res.status(404).json({ error: 'Voucher not found' });
    await logActivity(
      user.id,
      user.email,
      'DELETE_VOUCHER',
      'payment',
      String(deleted.id),
      `Deleted ${deleted.voucherType} voucher #${deleted.voucherNumber} (₹${deleted.amount})`
    );
    res.json({ success: true, message: 'Voucher deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/payments/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete voucher' });
  }
});

// 8b. Journal Entries & Double-Entry Accounting
app.get('/api/journal-entries', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const list = await getJournalEntries(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/journal-entries:', error);
    res.status(500).json({ error: error.message || 'Failed to get journal entries' });
  }
});

app.get('/api/journal-entries/next-number', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const entryType = (req.query.type as any) || 'journal';
    const nextInfo = await getNextJournalVoucherNumber(user.id, entryType);
    res.json(nextInfo);
  } catch (error: any) {
    console.error('Error in /api/journal-entries/next-number:', error);
    res.status(500).json({ error: error.message || 'Failed to get next voucher number' });
  }
});

app.post('/api/journal-entries', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const entry = await createJournalEntry(user.id, req.body);
    await logActivity(
      user.id,
      user.email,
      'RECORD_JOURNAL_VOUCHER',
      'journal',
      String(entry.id),
      `Posted ${entry.entryType.toUpperCase()} #${entry.voucherNumber}: Dr ${entry.debitAccount} / Cr ${entry.creditAccount} (₹${entry.amount})`
    );
    res.status(201).json(entry);
  } catch (error: any) {
    console.error('Error in POST /api/journal-entries:', error);
    res.status(500).json({ error: error.message || 'Failed to create journal entry' });
  }
});

app.put('/api/journal-entries/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const entryId = parseInt(req.params.id);
    const entry = await editJournalEntry(entryId, user.id, req.body);
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    await logActivity(
      user.id,
      user.email,
      'EDIT_JOURNAL_VOUCHER',
      'journal',
      String(entry.id),
      `Updated ${entry.entryType} #${entry.voucherNumber}: Dr ${entry.debitAccount} / Cr ${entry.creditAccount} (₹${entry.amount})`
    );
    res.json(entry);
  } catch (error: any) {
    console.error('Error in PUT /api/journal-entries/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update journal entry' });
  }
});

app.delete('/api/journal-entries/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const entryId = parseInt(req.params.id);
    const deleted = await deleteJournalEntry(entryId, user.id);
    if (!deleted) return res.status(404).json({ error: 'Journal entry not found' });
    await logActivity(
      user.id,
      user.email,
      'DELETE_JOURNAL_VOUCHER',
      'journal',
      String(deleted.id),
      `Deleted ${deleted.entryType} #${deleted.voucherNumber} (₹${deleted.amount})`
    );
    res.json({ success: true, message: 'Journal entry deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/journal-entries/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete journal entry' });
  }
});

// 9. Cheques and Cheque Books Management
app.get('/api/cheque-books', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const books = await getChequeBooks(user.id);
    res.json(books);
  } catch (error: any) {
    console.error('Error in GET /api/cheque-books:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch cheque books' });
  }
});

app.post('/api/cheque-books', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const book = await createChequeBook(user.id, req.body);
    await logActivity(
      user.id,
      user.email,
      'CREATE_CHEQUE_BOOK',
      'cheque_book',
      String(book.id),
      `Registered Cheque Book "${book.bookName}" (${book.startNumber}-${book.endNumber}, ${book.totalLeaves} leaves) for ${book.bankName}`
    );
    res.status(201).json(book);
  } catch (error: any) {
    console.error('Error in POST /api/cheque-books:', error);
    res.status(400).json({ error: error.message || 'Failed to create cheque book' });
  }
});

app.put('/api/cheque-books/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const bookId = parseInt(req.params.id);
    const updated = await editChequeBook(bookId, user.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Cheque book not found' });
    await logActivity(
      user.id,
      user.email,
      'EDIT_CHEQUE_BOOK',
      'cheque_book',
      String(updated.id),
      `Updated Cheque Book "${updated.bookName}" (${updated.startNumber}-${updated.endNumber})`
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/cheque-books/:id:', error);
    res.status(400).json({ error: error.message || 'Failed to update cheque book' });
  }
});

app.delete('/api/cheque-books/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const bookId = parseInt(req.params.id);
    const deleted = await deleteChequeBook(bookId, user.id);
    if (!deleted) return res.status(404).json({ error: 'Cheque book not found' });
    await logActivity(
      user.id,
      user.email,
      'DELETE_CHEQUE_BOOK',
      'cheque_book',
      String(deleted.id),
      `Deleted Cheque Book "${deleted.bookName}"`
    );
    res.json({ success: true, message: 'Cheque book deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/cheque-books/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete cheque book' });
  }
});

app.get('/api/cheques', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const list = await getCheques(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in GET /api/cheques:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch cheques' });
  }
});

app.post('/api/cheques', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const cheque = await createCheque(user.id, req.body);
    const typeLabel = cheque.chequeType === 'inward' ? 'Inward (Received)' : 'Outward (Issued)';
    await logActivity(
      user.id,
      user.email,
      'RECORD_CHEQUE',
      'cheque',
      String(cheque.id),
      `Recorded ${typeLabel} Cheque #${cheque.chequeNumber} for ₹${cheque.amount} (${cheque.payeeName}) - Status: ${cheque.status.toUpperCase()}`
    );
    res.status(201).json(cheque);
  } catch (error: any) {
    console.error('Error in POST /api/cheques:', error);
    res.status(400).json({ error: error.message || 'Failed to record cheque' });
  }
});

app.put('/api/cheques/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const chequeId = parseInt(req.params.id);
    const updated = await editCheque(chequeId, user.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Cheque not found' });
    await logActivity(
      user.id,
      user.email,
      'EDIT_CHEQUE',
      'cheque',
      String(updated.id),
      `Updated Cheque #${updated.chequeNumber} (₹${updated.amount} - ${updated.payeeName})`
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/cheques/:id:', error);
    res.status(400).json({ error: error.message || 'Failed to update cheque' });
  }
});

app.patch('/api/cheques/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const chequeId = parseInt(req.params.id);
    const updated = await updateChequeStatus(chequeId, user.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Cheque not found' });
    const statusUpper = (updated.status || '').toUpperCase();
    await logActivity(
      user.id,
      user.email,
      `CHEQUE_${statusUpper}`,
      'cheque',
      String(updated.id),
      `Cheque #${updated.chequeNumber} (₹${updated.amount} - ${updated.payeeName}) status updated to ${statusUpper}${updated.bounceReason ? ` [Reason: ${updated.bounceReason}]` : ''}`
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Error in PATCH /api/cheques/:id/status:', error);
    res.status(400).json({ error: error.message || 'Failed to update cheque status' });
  }
});

app.delete('/api/cheques/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const chequeId = parseInt(req.params.id);
    const deleted = await deleteCheque(chequeId, user.id);
    if (!deleted) return res.status(404).json({ error: 'Cheque not found' });
    await logActivity(
      user.id,
      user.email,
      'DELETE_CHEQUE',
      'cheque',
      String(deleted.id),
      `Deleted Cheque #${deleted.chequeNumber} (₹${deleted.amount} - ${deleted.payeeName})`
    );
    res.json({ success: true, message: 'Cheque deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/cheques/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete cheque' });
  }
});

// 10. Real-time Team Activity Logs (Sync across team devices)
app.get('/api/activity', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await resolveUser(req);
    const logs = await getActivityLogs(user.id);
    res.json(logs);
  } catch (error: any) {
    console.error('Error in /api/activity:', error);
    res.status(500).json({ error: error.message || 'Failed to get activity logs' });
  }
});

// Vite Middleware for development & static file serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tally GST Accounting Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
