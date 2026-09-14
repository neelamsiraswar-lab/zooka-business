import { Router } from 'express';
import { requireRoles, requireNonAuditor, ExtendedAuthRequest } from '../middleware/rbac.ts';
import { authUser } from './auth.ts';
import {
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
  getBankStatements,
  getBankStatementById,
  createBankStatement,
  updateBankStatement,
  reconcileBankStatementTransaction,
  unreconcileBankStatementTransaction,
  deleteBankStatement,
  logActivity,
} from '../db/dataService.ts';

export const bankingRouter = Router();

// Receipts & Payments (Vouchers)
bankingRouter.get('/api/payments', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const voucherType = req.query.type as ('receipt' | 'payment') | undefined;
    const list = await getPayments(user.id, voucherType);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/payments:', error);
    res.status(500).json({ error: error.message || 'Failed to get payments' });
  }
});

bankingRouter.get('/api/payments/next-number', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const voucherType = (req.query.type as 'receipt' | 'payment') || 'receipt';
    const nextInfo = await getNextPaymentVoucherNumber(user.id, voucherType);
    res.json(nextInfo);
  } catch (error: any) {
    console.error('Error in /api/payments/next-number:', error);
    res.status(500).json({ error: error.message || 'Failed to get next voucher number' });
  }
});

// Create Payment Voucher: Admin, Accountant, Billing Operator
bankingRouter.post(
  '/api/payments',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant', 'billing_operator'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

// Delete Payment Voucher: Admin & Accountant only
bankingRouter.delete(
  '/api/payments/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

// Journal Entries & Double-Entry Accounting
bankingRouter.get(
  '/api/journal-entries',
  authUser,
  requireRoles('admin', 'accountant', 'auditor'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const list = await getJournalEntries(user.id);
      res.json(list);
    } catch (error: any) {
      console.error('Error in /api/journal-entries:', error);
      res.status(500).json({ error: error.message || 'Failed to get journal entries' });
    }
  }
);

bankingRouter.get(
  '/api/journal-entries/next-number',
  authUser,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const entryType = (req.query.type as any) || 'journal';
      const nextInfo = await getNextJournalVoucherNumber(user.id, entryType);
      res.json(nextInfo);
    } catch (error: any) {
      console.error('Error in /api/journal-entries/next-number:', error);
      res.status(500).json({ error: error.message || 'Failed to get next voucher number' });
    }
  }
);

bankingRouter.post(
  '/api/journal-entries',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

bankingRouter.put(
  '/api/journal-entries/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

bankingRouter.delete(
  '/api/journal-entries/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

// Cheques and Cheque Books Management
bankingRouter.get(
  '/api/cheque-books',
  authUser,
  requireRoles('admin', 'accountant', 'auditor'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const books = await getChequeBooks(user.id);
      res.json(books);
    } catch (error: any) {
      console.error('Error in GET /api/cheque-books:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch cheque books' });
    }
  }
);

bankingRouter.post(
  '/api/cheque-books',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

bankingRouter.put(
  '/api/cheque-books/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

bankingRouter.delete(
  '/api/cheque-books/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

bankingRouter.get(
  '/api/cheques',
  authUser,
  requireRoles('admin', 'accountant', 'auditor'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const list = await getCheques(user.id);
      res.json(list);
    } catch (error: any) {
      console.error('Error in GET /api/cheques:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch cheques' });
    }
  }
);

bankingRouter.post(
  '/api/cheques',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

bankingRouter.put(
  '/api/cheques/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

bankingRouter.patch(
  '/api/cheques/:id/status',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

bankingRouter.delete(
  '/api/cheques/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
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
  }
);

// Bank Statements & Auto-Reconciliation
bankingRouter.get(
  '/api/bank-statements',
  authUser,
  requireRoles('admin', 'accountant', 'auditor'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const list = await getBankStatements(user.id);
      res.json(list);
    } catch (error: any) {
      console.error('Error in GET /api/bank-statements:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch bank statements' });
    }
  }
);

bankingRouter.get(
  '/api/bank-statements/:id',
  authUser,
  requireRoles('admin', 'accountant', 'auditor'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const statementId = parseInt(req.params.id);
      const statement = await getBankStatementById(statementId, user.id);
      if (!statement) return res.status(404).json({ error: 'Statement not found' });
      res.json(statement);
    } catch (error: any) {
      console.error('Error in GET /api/bank-statements/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch bank statement' });
    }
  }
);

bankingRouter.post(
  '/api/bank-statements',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const statement = await createBankStatement(user.id, req.body);
      await logActivity(
        user.id,
        user.email,
        'UPLOAD_BANK_STATEMENT',
        'bank_statement',
        String(statement.id),
        `Uploaded bank statement "${statement.fileName}" for ${statement.bankName} (${statement.transactionsCount} transactions)`
      );
      res.status(201).json(statement);
    } catch (error: any) {
      console.error('Error in POST /api/bank-statements:', error);
      res.status(400).json({ error: error.message || 'Failed to create bank statement' });
    }
  }
);

bankingRouter.put(
  '/api/bank-statements/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const statementId = parseInt(req.params.id);
      const updated = await updateBankStatement(statementId, user.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Statement not found' });
      res.json(updated);
    } catch (error: any) {
      console.error('Error in PUT /api/bank-statements/:id:', error);
      res.status(400).json({ error: error.message || 'Failed to update bank statement' });
    }
  }
);

bankingRouter.post(
  '/api/bank-statements/:id/reconcile',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const statementId = parseInt(req.params.id);
      const { transactionId, matchData } = req.body;
      if (!transactionId || !matchData) {
        return res.status(400).json({ error: 'transactionId and matchData are required' });
      }

      const updated = await reconcileBankStatementTransaction(statementId, transactionId, user.id, matchData);
      if (!updated) return res.status(404).json({ error: 'Statement or transaction not found' });

      await logActivity(
        user.id,
        user.email,
        'RECONCILE_TRANSACTION',
        'bank_statement',
        String(statementId),
        `Reconciled bank transaction ${transactionId} with ${matchData.matchedVoucherType} #${matchData.matchedVoucherNumber || matchData.matchedVoucherId}`
      );
      res.json(updated);
    } catch (error: any) {
      console.error('Error in POST /api/bank-statements/:id/reconcile:', error);
      res.status(400).json({ error: error.message || 'Failed to reconcile transaction' });
    }
  }
);

bankingRouter.post(
  '/api/bank-statements/:id/unreconcile',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const statementId = parseInt(req.params.id);
      const { transactionId } = req.body;
      if (!transactionId) {
        return res.status(400).json({ error: 'transactionId is required' });
      }

      const updated = await unreconcileBankStatementTransaction(statementId, transactionId, user.id);
      if (!updated) return res.status(404).json({ error: 'Statement or transaction not found' });

      await logActivity(
        user.id,
        user.email,
        'UNRECONCILE_TRANSACTION',
        'bank_statement',
        String(statementId),
        `Unlinked/unreconciled bank transaction ${transactionId}`
      );
      res.json(updated);
    } catch (error: any) {
      console.error('Error in POST /api/bank-statements/:id/unreconcile:', error);
      res.status(400).json({ error: error.message || 'Failed to unreconcile transaction' });
    }
  }
);

bankingRouter.delete(
  '/api/bank-statements/:id',
  authUser,
  requireNonAuditor,
  requireRoles('admin', 'accountant'),
  async (req: ExtendedAuthRequest, res) => {
    try {
      const user = req.appUser!;
      const statementId = parseInt(req.params.id);
      const deleted = await deleteBankStatement(statementId, user.id);
      if (!deleted) return res.status(404).json({ error: 'Statement not found' });

      await logActivity(
        user.id,
        user.email,
        'DELETE_BANK_STATEMENT',
        'bank_statement',
        String(deleted.id),
        `Deleted bank statement "${deleted.fileName}"`
      );
      res.json({ success: true, message: 'Bank statement deleted successfully' });
    } catch (error: any) {
      console.error('Error in DELETE /api/bank-statements/:id:', error);
      res.status(500).json({ error: error.message || 'Failed to delete bank statement' });
    }
  }
);
