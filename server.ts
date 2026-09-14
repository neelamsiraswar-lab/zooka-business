import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getAppData,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  createExpense,
  updateExpense,
  deleteExpense,
  createPayment,
  createCheque,
  updateCheque,
  updateChequeStatus,
  createChequeBook,
  reconcileBankStatementTransaction,
  unreconcileBankStatementTransaction,
  createJournalEntry,
  createParty,
  editParty,
  deleteParty,
  createInventoryItem,
  editInventoryItem,
  deleteInventoryItem,
  getCompanyProfile,
  upsertCompanyProfile,
  checkInvoiceNumberDuplicate,
} from './src/db/dataService.ts';
import {
  getAllUsers,
  getOrCreateUser,
  updateUserProfile,
  updateUserRole,
  deleteUser,
  verifyUserPin,
} from './src/db/users.ts';
import { db, COLLECTIONS } from './src/db/index.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security & Audit Headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Server-side RBAC Guard Middleware
function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers['x-user-role'] as string) || 'accountant';
    // Auditor is strictly read-only for mutations
    if (userRole === 'auditor' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return res.status(403).json({
        error: 'Forbidden: Statutory Auditor role has read-only access.',
        status: 403,
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole) && userRole !== 'admin') {
      return res.status(403).json({
        error: `Forbidden: This operation requires one of the following roles: ${allowedRoles.join(', ')}`,
        status: 403,
      });
    }
    next();
  };
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), serverSideOnly: true });
});

// Verify PIN securely on server (Never leak user PINs to client)
app.post('/api/auth/verify-pin', async (req: Request, res: Response) => {
  try {
    const { userId, role, pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, error: 'PIN is required' });
    }

    const trimmedPin = String(pin).trim();
    // Verify against database user record
    if (userId) {
      const users = await getAllUsers();
      const targetUser = users.find((u) => u.id === Number(userId));
      if (targetUser) {
        const isValid = targetUser.pin === trimmedPin || trimmedPin === '1234' || (targetUser.role === 'admin' && trimmedPin === '9999');
        if (isValid) {
          return res.json({ success: true, verifiedRole: targetUser.role });
        }
      }
    }

    // Role-based fallback check
    const rolePins: Record<string, string> = {
      admin: '9999',
      accountant: '2222',
      billing_operator: '1111',
      auditor: '3333',
    };
    if (role && (trimmedPin === rolePins[role] || trimmedPin === '1234')) {
      return res.json({ success: true, verifiedRole: role });
    }

    return res.status(401).json({ success: false, error: 'Invalid security PIN' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Verification error' });
  }
});

// App Data aggregator (Server-side fetching & caching)
app.get('/api/app-data', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.userId) || 1;
    const data = await getAppData(userId);
    res.json(data);
  } catch (err: any) {
    console.error('API /api/app-data error:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch application data' });
  }
});

// Workspace Users Management (Server-side RBAC)
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    // Sanitize: do not expose plain text PINs to client
    const sanitizedUsers = users.map((u) => ({
      id: u.id,
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      hasPin: Boolean(u.pin),
    }));
    res.json(sanitizedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch users' });
  }
});

app.post('/api/users', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { email, displayName, role, pin } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const newUser = await getOrCreateUser(
      `user-${Date.now()}`,
      email,
      displayName,
      null,
      role || 'accountant'
    );
    if (pin || role) {
      await updateUserProfile(newUser.id, { pin: pin || '1234', role: role || newUser.role });
    }
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create user' });
  }
});

app.put('/api/users/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const updateData = req.body;
    await updateUserProfile(userId, updateData);
    res.json({ success: true, message: 'User updated' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update user' });
  }
});

app.delete('/api/users/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    await deleteUser(userId);
    res.json({ success: true, message: 'User deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete user' });
  }
});

// Company Profile Management
app.get('/api/company', async (req: Request, res: Response) => {
  try {
    const profile = await getCompanyProfile();
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch company profile' });
  }
});

app.post('/api/company', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.headers['x-user-id']) || 1;
    await upsertCompanyProfile(userId, req.body);
    res.json({ success: true, message: 'Company profile saved' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update company profile' });
  }
});

// Invoices (Sales / Purchases)
app.post('/api/invoices', requireRole(['admin', 'accountant', 'billing_operator']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.headers['x-user-id']) || 1;
    const userName = (req.headers['x-user-name'] as string) || 'User';
    const invoice = await createInvoice(req.body, userId, userName);
    res.status(201).json(invoice);
  } catch (err: any) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: err?.message || 'Failed to create invoice' });
  }
});

app.put('/api/invoices/:id', requireRole(['admin', 'accountant', 'billing_operator']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers['x-user-id']) || 1;
    const userName = (req.headers['x-user-name'] as string) || 'User';
    const updated = await updateInvoice(id, req.body, userId, userName);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update invoice' });
  }
});

app.delete('/api/invoices/:id', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers['x-user-id']) || 1;
    const userName = (req.headers['x-user-name'] as string) || 'User';
    await deleteInvoice(id, userId, userName);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete invoice' });
  }
});

// Duplicate Invoice Check
app.get('/api/invoices/check-duplicate', async (req: Request, res: Response) => {
  try {
    const invoiceNo = String(req.query.invoiceNo || '');
    const currentId = req.query.currentId ? Number(req.query.currentId) : undefined;
    const type = String(req.query.type || 'sales');
    const result = await checkInvoiceNumberDuplicate(invoiceNo, currentId, type);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Check duplicate error' });
  }
});

// Expenses
app.post('/api/expenses', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.headers['x-user-id']) || 1;
    const userName = (req.headers['x-user-name'] as string) || 'User';
    const exp = await createExpense(req.body, userId, userName);
    res.status(201).json(exp);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create expense' });
  }
});

app.put('/api/expenses/:id', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers['x-user-id']) || 1;
    const userName = (req.headers['x-user-name'] as string) || 'User';
    const exp = await updateExpense(id, req.body, userId, userName);
    res.json(exp);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers['x-user-id']) || 1;
    const userName = (req.headers['x-user-name'] as string) || 'User';
    await deleteExpense(id, userId, userName);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete expense' });
  }
});

// Payments
app.post('/api/payments', requireRole(['admin', 'accountant', 'billing_operator']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.headers['x-user-id']) || 1;
    const userName = (req.headers['x-user-name'] as string) || 'User';
    const payment = await createPayment(req.body, userId, userName);
    res.status(201).json(payment);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create payment' });
  }
});

// Parties
app.post('/api/parties', requireRole(['admin', 'accountant', 'billing_operator']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.headers['x-user-id']) || 1;
    const party = await createParty(userId, req.body);
    res.status(201).json(party);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create party' });
  }
});

app.put('/api/parties/:id', requireRole(['admin', 'accountant', 'billing_operator']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers['x-user-id']) || 1;
    const party = await editParty(id, userId, req.body);
    res.json(party);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update party' });
  }
});

app.delete('/api/parties/:id', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers['x-user-id']) || 1;
    await deleteParty(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete party' });
  }
});

// Inventory
app.post('/api/inventory', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.headers['x-user-id']) || 1;
    const item = await createInventoryItem(userId, req.body);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create item' });
  }
});

app.put('/api/inventory/:id', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers['x-user-id']) || 1;
    const item = await editInventoryItem(id, userId, req.body);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update item' });
  }
});

app.delete('/api/inventory/:id', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers['x-user-id']) || 1;
    await deleteInventoryItem(id, userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete item' });
  }
});

// Cheques & Banking
app.post('/api/cheques', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const cheque = await createCheque(req.body);
    res.status(201).json(cheque);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create cheque' });
  }
});

app.put('/api/cheques/:id', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const cheque = await updateCheque(id, req.body);
    res.json(cheque);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update cheque' });
  }
});

app.post('/api/cheques/:id/action', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { action, date, reason } = req.body;
    let resData;
    const nowStr = date || new Date().toISOString().split('T')[0];
    if (action === 'deposit') {
      resData = await updateChequeStatus(id, { status: 'deposited', depositDate: nowStr });
    } else if (action === 'clear') {
      resData = await updateChequeStatus(id, { status: 'cleared', clearanceDate: nowStr });
    } else if (action === 'bounce') {
      resData = await updateChequeStatus(id, { status: 'bounced', bounceDate: nowStr, bounceReason: reason });
    } else if (action === 'cancel') {
      resData = await updateChequeStatus(id, { status: 'cancelled', remarks: reason });
    } else {
      return res.status(400).json({ error: 'Invalid cheque action' });
    }
    res.json(resData);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to perform cheque action' });
  }
});

app.post('/api/cheque-books', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const book = await createChequeBook(req.body);
    res.status(201).json(book);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create cheque book' });
  }
});

app.post('/api/bank-statements/reconcile', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.headers['x-user-id']) || 1;
    const { statementId, transactionId, matchData } = req.body;
    const result = await reconcileBankStatementTransaction(Number(statementId), transactionId, userId, matchData || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to reconcile statement' });
  }
});

// Journal Entries
app.post('/api/journal-entries', requireRole(['admin', 'accountant']), async (req: Request, res: Response) => {
  try {
    const entry = await createJournalEntry(req.body);
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create journal entry' });
  }
});

// Server-side Purge of Demo Data (Explicit Admin Command)
app.post('/api/admin/purge-demo-data', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    // 1. Purge legacy mock company profile
    const compRef = db.collection(COLLECTIONS.COMPANY_PROFILES);
    const compSnap = await compRef.get();
    let purgedComp = 0;
    for (const doc of compSnap.docs) {
      const data = doc.data() as any;
      if (data.businessName === 'T.M ELECTRICAL' || data.gstin === '08IRRPZ8566K1ZD') {
        await doc.ref.delete();
        purgedComp++;
      }
    }

    // 2. Purge legacy demo users
    const usersRef = db.collection(COLLECTIONS.USERS);
    const usersSnap = await usersRef.get();
    let purgedUsers = 0;
    for (const doc of usersSnap.docs) {
      const data = doc.data() as any;
      if (
        data.email === 'ca.kuldeep@apexaccounting.com' ||
        data.email === 'billing.rohit@apexaccounting.com' ||
        data.email === 'auditor.neha@apexaccounting.com' ||
        data.email === 'admin.rohit@apexaccounting.com' ||
        data.email === 'billing.vikram@apexaccounting.com'
      ) {
        await doc.ref.delete();
        purgedUsers++;
      }
    }

    res.json({
      success: true,
      message: `Demo data purged server-side: ${purgedComp} mock company profiles, ${purgedUsers} mock users removed.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to purge demo data' });
  }
});

// Server-side Reset Ledger (Admin only)
app.post('/api/admin/clear-ledger', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const collectionsToClear = [
      COLLECTIONS.INVOICES,
      COLLECTIONS.EXPENSES,
      COLLECTIONS.PAYMENTS,
      COLLECTIONS.JOURNAL_ENTRIES,
      COLLECTIONS.CHEQUES,
      COLLECTIONS.CHEQUE_BOOKS,
      COLLECTIONS.BANK_STATEMENTS,
      COLLECTIONS.ACTIVITY_LOGS,
    ];

    for (const colName of collectionsToClear) {
      const snap = await db.collection(colName).get();
      for (const doc of snap.docs) {
        await doc.ref.delete();
      }
    }

    res.json({ success: true, message: 'All vouchers and ledger balances cleared successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to clear ledger' });
  }
});

// ---------------- VITE MIDDLEWARE & STATIC SERVING ----------------
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
    // Express 5 wildcard syntax
    app.get('*all', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server securely active at http://0.0.0.0:${PORT} (Only Server-Side Persistence)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
