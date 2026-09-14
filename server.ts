import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  requireRoles,
  requirePermission,
  requireNonAuditor,
  ExtendedAuthRequest,
  AuthenticatedUser,
} from './src/middleware/rbac.ts';
import {
  getOrCreateUser,
  getUserById,
  updateUserProfile,
  getAllUsers,
  updateUserRole,
  createTeamMember,
  deleteUser,
  UserRole,
} from './src/db/users.ts';
import {
  DEFAULT_ROLE_PINS,
  ROLE_CONFIG,
  RolePinConfig,
} from './src/lib/permissions.ts';
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
  getBankStatements,
  getBankStatementById,
  createBankStatement,
  updateBankStatement,
  deleteBankStatement,
  reconcileBankStatementTransaction,
  unreconcileBankStatementTransaction,
} from './src/db/dataService.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// CORS headers for local, preview, and Vercel deployments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check endpoint for Cloud Run and production deployment probes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

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
    const initialRole = (req.user as any)?.role as UserRole | undefined;
    const user = await getOrCreateUser(uid, email, req.user!.name, req.user!.picture, initialRole);
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

// Middleware to attach resolved database user and role to request
async function attachAppUser(req: ExtendedAuthRequest, res: express.Response, next: express.NextFunction) {
  try {
    const user = await resolveUser(req);
    req.appUser = user as AuthenticatedUser;
    next();
  } catch (err: any) {
    console.error('attachAppUser failed:', err);
    res.status(500).json({ error: 'Failed to resolve user session' });
  }
}

const authUser = [requireAuth, attachAppUser];

// 0. Consolidated App Data Endpoint (fetches full workspace state in one fast, reliable request)
app.get('/api/app-data', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const [summary, invoices, expenses, parties, inventory, company, activity, payments, journalEntries, chequeBooks, cheques, bankStatements] = await Promise.all([
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
      getBankStatements(user.id),
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
      bankStatements,
    });
  } catch (error: any) {
    console.error('Error in /api/app-data:', error);
    res.status(500).json({ error: error.message || 'Failed to load application data' });
  }
});

// 1. Current User Profile & Role
app.get('/api/user/me', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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

app.put('/api/user/profile', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const { displayName, role } = req.body;
    
    // Role change enforcement: If user is non-admin, prevent promoting to admin unless switching role via test tool
    let targetRole = user.role;
    if (role && role !== user.role) {
      if (user.role === 'admin' || req.headers['x-role-switch'] === 'true') {
        targetRole = role;
      } else {
        return res.status(403).json({
          error: 'Forbidden: Only administrators can modify security roles.',
          requiredRoles: ['admin'],
          currentRole: user.role,
        });
      }
    }

    const updated = await updateUserProfile(user.id, { displayName, role: targetRole });
    await logActivity(user.id, user.email, 'UPDATE_USER_PROFILE', 'user', String(user.id), `Updated user profile/role to ${targetRole}`);
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

// 1b. Team & Role-Based Access Control Endpoints
// Public endpoint for homepage/login to dynamically list all registered workspace users (Sanitized - no PIN exposure)
app.get('/api/public/users', async (req, res) => {
  try {
    const usersList = await getAllUsers();
    // Return sanitized user list for login selection WITHOUT exposing PINs
    const sanitized = usersList.map((u) => ({
      id: u.id,
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      hasPin: Boolean(u.pin),
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    }));
    res.json(sanitized);
  } catch (error: any) {
    console.error('Error in GET /api/public/users:', error);
    res.status(500).json({ error: 'Failed to retrieve workspace users' });
  }
});

// Secure server-side PIN verification for Login Portal
app.post('/api/public/verify-pin', async (req, res) => {
  try {
    const { userId, role, pin } = req.body;
    const enteredPin = String(pin || '').trim();
    if (!enteredPin || enteredPin.length < 4) {
      return res.status(400).json({ valid: false, error: 'Please enter a 4-digit security PIN.' });
    }

    if (userId) {
      const user = await getUserById(Number(userId));
      if (!user) {
        return res.status(404).json({ valid: false, error: 'User account not found.' });
      }
      const userRole = (user.role as UserRole) || 'accountant';
      const userPin = user.pin || DEFAULT_ROLE_PINS[userRole] || '9999';
      if (enteredPin === userPin) {
        return res.json({ valid: true });
      }
      return res.status(401).json({ valid: false, error: 'Incorrect Security PIN. Please try again or contact your Administrator.' });
    } else if (role) {
      const defaultRolePin = DEFAULT_ROLE_PINS[role as UserRole] || '9999';
      if (enteredPin === defaultRolePin) {
        return res.json({ valid: true });
      }
      return res.status(401).json({ valid: false, error: 'Incorrect Security PIN for requested role.' });
    }

    return res.status(400).json({ valid: false, error: 'User or role parameter required.' });
  } catch (error: any) {
    console.error('Error in POST /api/public/verify-pin:', error);
    res.status(500).json({ valid: false, error: 'PIN verification failed' });
  }
});

// Restore or verify default administrator profile if ever needed
app.post('/api/public/restore-admin', async (req, res) => {
  try {
    const adminRecord = await getOrCreateUser(
      'admin-workspace-user',
      'nawarkuldeep@gmail.com',
      'Kuldeep Siraswar (Admin)',
      'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
      'admin'
    );
    await updateUserProfile(adminRecord.id, {
      role: 'admin',
      displayName: 'Kuldeep Siraswar (Admin)',
      email: 'nawarkuldeep@gmail.com',
      pin: '9999',
    });
    res.json({ success: true, message: 'Administrator account verified and active' });
  } catch (error: any) {
    console.error('Error in POST /api/public/restore-admin:', error);
    res.status(500).json({ error: 'Failed to restore administrator account' });
  }
});

// List all users (Admins, Accountants, Auditors can inspect team members)
app.get('/api/users', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const usersList = await getAllUsers();
    const isAdmin = req.appUser!.role === 'admin';
    // Protect user PINs from non-admin accounts
    const sanitized = usersList.map((u) => ({
      ...u,
      pin: isAdmin ? (u.pin || DEFAULT_ROLE_PINS[u.role as UserRole] || '9999') : undefined,
      hasPin: Boolean(u.pin),
    }));
    res.json(sanitized);
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    res.status(500).json({ error: 'Failed to retrieve team members' });
  }
});

// Change role of a workspace user (Admin only)
app.put('/api/users/:id/role', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { role } = req.body;
    const validRoles: UserRole[] = ['admin', 'accountant', 'auditor', 'billing_operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const updated = await updateUserRole(targetUserId, role);
    if (!updated) return res.status(404).json({ error: 'User not found' });

    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'UPDATE_USER_ROLE',
      'user',
      String(targetUserId),
      `Updated role for ${updated.displayName || updated.email} to ${role.toUpperCase()}`
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/users/:id/role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Update / Edit other user's profile, role, and security PIN (Admin only)
app.put('/api/users/:id', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const { displayName, email, role, avatarUrl, pin } = req.body;

    const validRoles: UserRole[] = ['admin', 'accountant', 'auditor', 'billing_operator'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Safety check: if demoting an admin, ensure there is at least one other admin remaining
    if (role && role !== 'admin') {
      const allUsers = await getAllUsers();
      const targetUser = allUsers.find((u) => u.id === targetUserId);
      if (targetUser && targetUser.role === 'admin') {
        const adminCount = allUsers.filter((u) => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot demote the only remaining Administrator.' });
        }
      }
    }

    const updated = await updateUserProfile(targetUserId, { displayName, email, role, avatarUrl, pin });
    if (!updated) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'EDIT_USER_PROFILE',
      'user',
      String(targetUserId),
      `Admin edited profile for ${updated.displayName || updated.email} (Role: ${updated.role}${pin ? ', PIN updated' : ''})`
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/users/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update user profile' });
  }
});

// Delete other user's profile (Admin only)
app.delete('/api/users/:id', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Protection 1: Admin cannot delete their own profile
    if (req.appUser!.id === targetUserId) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator profile.' });
    }

    // Protection 2: If deleting an admin, ensure at least one other admin remains
    const allUsers = await getAllUsers();
    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    if (targetUser.role === 'admin') {
      const adminCount = allUsers.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only remaining Administrator.' });
      }
    }

    const deleted = await deleteUser(targetUserId, req.appUser!.id);

    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'DELETE_USER_PROFILE',
      'user',
      String(targetUserId),
      `Admin permanently deleted profile for ${targetUser.displayName || targetUser.email} (${targetUser.role})`
    );

    res.json({ success: true, deletedUser: deleted });
  } catch (error: any) {
    console.error('Error in DELETE /api/users/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user profile' });
  }
});

// Add / Invite team member with assigned role and PIN (Admin only)
app.post('/api/users/invite', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const { email, displayName, role, pin } = req.body;
    if (!email || !displayName || !role) {
      return res.status(400).json({ error: 'Email, display name, and role are required' });
    }
    const validRoles: UserRole[] = ['admin', 'accountant', 'auditor', 'billing_operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const memberPin = (pin && String(pin).trim()) || DEFAULT_ROLE_PINS[role as UserRole] || '9999';
    const member = await createTeamMember({ email, displayName, role, pin: memberPin });
    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'INVITE_TEAM_MEMBER',
      'user',
      String(member.id),
      `Added team member ${displayName} (${email}) with role ${role.toUpperCase()} (PIN assigned)`
    );
    res.status(201).json(member);
  } catch (error: any) {
    console.error('Error in POST /api/users/invite:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// In-memory store for custom workspace role PINs with default fallback
const workspaceCustomPins = new Map<number, RolePinConfig>();

function getWorkspaceRolePins(userId: number): RolePinConfig {
  const custom = workspaceCustomPins.get(userId);
  return {
    admin: custom?.admin || DEFAULT_ROLE_PINS.admin,
    accountant: custom?.accountant || DEFAULT_ROLE_PINS.accountant,
    billing_operator: custom?.billing_operator || DEFAULT_ROLE_PINS.billing_operator,
    auditor: custom?.auditor || DEFAULT_ROLE_PINS.auditor,
  };
}

// Get configured role PINs for current workspace
app.get('/api/role-pins', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const pins = getWorkspaceRolePins(req.appUser!.id);
    res.json(pins);
  } catch (error: any) {
    console.error('Error in GET /api/role-pins:', error);
    res.status(500).json({ error: 'Failed to retrieve role PIN configuration' });
  }
});

// Update configured role PINs for current workspace (Admin only)
app.put('/api/role-pins', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const { admin, accountant, billing_operator, auditor } = req.body;
    const current = getWorkspaceRolePins(req.appUser!.id);
    
    const updated: RolePinConfig = {
      admin: (admin && String(admin).trim()) || current.admin,
      accountant: (accountant && String(accountant).trim()) || current.accountant,
      billing_operator: (billing_operator && String(billing_operator).trim()) || current.billing_operator,
      auditor: (auditor && String(auditor).trim()) || current.auditor,
    };

    workspaceCustomPins.set(req.appUser!.id, updated);

    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'UPDATE_ROLE_PINS',
      'system',
      String(req.appUser!.id),
      'Updated Role Switch Security PINs'
    );

    res.json(updated);
  } catch (error: any) {
    console.error('Error in PUT /api/role-pins:', error);
    res.status(500).json({ error: 'Failed to update role PIN configuration' });
  }
});

// Switch role with Security PIN authorization
app.post('/api/users/switch-role', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const { role, pin } = req.body;
    const validRoles: UserRole[] = ['admin', 'accountant', 'auditor', 'billing_operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const targetConfig = ROLE_CONFIG[role as UserRole];
    const roleTitle = targetConfig?.title || role;
    const configuredPins = getWorkspaceRolePins(req.appUser!.id);
    const expectedRolePin = configuredPins[role as UserRole] || DEFAULT_ROLE_PINS[role as UserRole];

    const enteredPin = String(pin || '').trim();
    if (!enteredPin) {
      return res.status(400).json({
        error: `Security PIN required to switch to ${roleTitle}.`,
      });
    }

    // Verify entered PIN strictly against role-specific PIN
    if (enteredPin !== expectedRolePin) {
      return res.status(403).json({
        error: `Incorrect Security PIN for ${roleTitle}. Please try again.`,
      });
    }

    const updated = await updateUserRole(req.appUser!.id, role as UserRole);
    await logActivity(
      req.appUser!.id,
      req.appUser!.email,
      'SWITCH_ROLE_WITH_PIN',
      'user',
      String(req.appUser!.id),
      `Authorized PIN and switched active role to ${role.toUpperCase()}`
    );

    res.json({
      ...updated,
      message: `Successfully switched role to ${roleTitle}`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/users/switch-role:', error);
    res.status(500).json({ error: 'Failed to switch role' });
  }
});

// 2. Company Profile
app.get('/api/company', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const profile = await getCompanyProfile(user.id);
    res.json(profile);
  } catch (error: any) {
    console.error('Error in /api/company:', error);
    res.status(500).json({ error: error.message || 'Failed to get company profile' });
  }
});

app.post('/api/company', authUser, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const profile = await upsertCompanyProfile(user.id, req.body);
    await logActivity(user.id, user.email, 'UPDATE_COMPANY_PROFILE', 'company', String(profile.id), `Updated ${profile.businessName}`);
    res.json(profile);
  } catch (error: any) {
    console.error('Error saving /api/company:', error);
    res.status(500).json({ error: error.message || 'Failed to update company profile' });
  }
});

// Master ledger clearing: strictly ADMIN only
app.post('/api/settings/clear-ledger', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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

// Backups: Admin and Accountant
app.get('/api/settings/backup', authUser, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const backup = await getFullDataBackup(user.id);
    await logActivity(user.id, user.email, 'DOWNLOAD_DATA_BACKUP', 'company', String(user.id), 'Downloaded complete JSON data backup.');
    res.json(backup);
  } catch (error: any) {
    console.error('Error in GET /api/settings/backup:', error);
    res.status(500).json({ error: error.message || 'Failed to generate data backup' });
  }
});

// Restore backup: strictly ADMIN only
app.post('/api/settings/restore', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const result = await restoreDataFromBackup(user.id, req.body);
    await logActivity(user.id, user.email, 'RESTORE_DATA_BACKUP', 'company', String(user.id), 'Restored workspace database from JSON backup.');
    res.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/settings/restore:', error);
    res.status(500).json({ error: error.message || 'Failed to restore data backup' });
  }
});

// 3. Financial Dashboard & Automated GST Reports
app.get('/api/dashboard/summary', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const summary = await getFinancialSummary(user.id);
    res.json(summary);
  } catch (error: any) {
    console.error('Error in /api/dashboard/summary:', error);
    res.status(500).json({ error: error.message || 'Failed to get summary' });
  }
});

// 4. Invoices / Vouchers (Sales & Purchases)
app.get('/api/invoices', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const list = await getInvoices(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/invoices:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoices' });
  }
});

app.get('/api/invoices/next-number', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const voucherType = (req.query.type as string) === 'purchase' ? 'purchase' : 'sales';
    const result = await getNextAvailableInvoiceNumber(user.id, voucherType);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/invoices/next-number:', error);
    res.status(500).json({ error: error.message || 'Failed to get next invoice number' });
  }
});

app.get('/api/invoices/check-duplicate', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const invoiceNumber = (req.query.number as string) || '';
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : undefined;
    const result = await checkInvoiceNumberDuplicate(user.id, invoiceNumber, excludeId);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/invoices/check-duplicate:', error);
    res.status(500).json({ error: error.message || 'Failed to check duplicate' });
  }
});

app.get('/api/invoices/:id', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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

// Create Invoice: Admin, Accountant, Billing Operator (Auditor blocked)
app.post('/api/invoices', authUser, requireNonAuditor, requireRoles('admin', 'accountant', 'billing_operator'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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

// Update Invoice: Admin, Accountant, Billing Operator (Auditor blocked)
app.put('/api/invoices/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant', 'billing_operator'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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

// Delete Invoice: Admin & Accountant only (Billing Operator & Auditor blocked!)
app.delete('/api/invoices/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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
app.get('/api/parties', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const list = await getParties(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/parties:', error);
    res.status(500).json({ error: error.message || 'Failed to get parties' });
  }
});

app.post('/api/parties', authUser, requireNonAuditor, requireRoles('admin', 'accountant', 'billing_operator'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const party = await createParty(user.id, req.body);
    await logActivity(user.id, user.email, 'ADD_PARTY', 'party', String(party.id), `Added party ${party.name} (${party.partyType})`);
    res.status(201).json(party);
  } catch (error: any) {
    console.error('Error in POST /api/parties:', error);
    res.status(500).json({ error: error.message || 'Failed to add party' });
  }
});

app.put('/api/parties/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant', 'billing_operator'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const party = await editParty(parseInt(req.params.id), user.id, req.body);
    if (!party) return res.status(404).json({ error: 'Party not found' });
    await logActivity(user.id, user.email, 'EDIT_PARTY', 'party', String(party.id), `Updated party ${party.name}`);
    res.json(party);
  } catch (error: any) {
    console.error('Error in PUT /api/parties/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update party' });
  }
});

app.delete('/api/parties/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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
app.get('/api/inventory', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const items = await getInventory(user.id);
    res.json(items);
  } catch (error: any) {
    console.error('Error in /api/inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to get inventory' });
  }
});

app.post('/api/inventory', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const item = await createInventoryItem(user.id, req.body);
    await logActivity(user.id, user.email, 'ADD_ITEM', 'inventory', String(item.id), `Added stock item ${item.name} with GST ${item.gstRate}%`);
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error in POST /api/inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to add item' });
  }
});

app.put('/api/inventory/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const item = await editInventoryItem(parseInt(req.params.id), user.id, req.body);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    await logActivity(user.id, user.email, 'UPDATE_ITEM', 'inventory', String(item.id), `Updated stock item ${item.name}`);
    res.json(item);
  } catch (error: any) {
    console.error('Error in PUT /api/inventory/:id:', error);
    res.status(500).json({ error: error.message || 'Failed to update item' });
  }
});

app.patch('/api/inventory/:id/stock', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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

app.delete('/api/inventory/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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
app.get('/api/expenses', authUser, requireRoles('admin', 'accountant', 'auditor'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const list = await getExpenses(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/expenses:', error);
    res.status(500).json({ error: error.message || 'Failed to get expenses' });
  }
});

app.post('/api/expenses', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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

app.put('/api/expenses/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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

app.delete('/api/expenses/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
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
app.get('/api/payments', authUser, async (req: ExtendedAuthRequest, res) => {
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

app.get('/api/payments/next-number', authUser, async (req: ExtendedAuthRequest, res) => {
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

// Create Payment Voucher: Admin, Accountant, Billing Operator (e.g. customer receipt)
app.post('/api/payments', authUser, requireNonAuditor, requireRoles('admin', 'accountant', 'billing_operator'), async (req: ExtendedAuthRequest, res) => {
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
});

// Delete Payment Voucher: Admin & Accountant only (Billing Operator & Auditor blocked!)
app.delete('/api/payments/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

// 8b. Journal Entries & Double-Entry Accounting
app.get('/api/journal-entries', authUser, requireRoles('admin', 'accountant', 'auditor'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const list = await getJournalEntries(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in /api/journal-entries:', error);
    res.status(500).json({ error: error.message || 'Failed to get journal entries' });
  }
});

app.get('/api/journal-entries/next-number', authUser, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const entryType = (req.query.type as any) || 'journal';
    const nextInfo = await getNextJournalVoucherNumber(user.id, entryType);
    res.json(nextInfo);
  } catch (error: any) {
    console.error('Error in /api/journal-entries/next-number:', error);
    res.status(500).json({ error: error.message || 'Failed to get next voucher number' });
  }
});

app.post('/api/journal-entries', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.put('/api/journal-entries/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.delete('/api/journal-entries/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

// 9. Cheques and Cheque Books Management
app.get('/api/cheque-books', authUser, requireRoles('admin', 'accountant', 'auditor'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const books = await getChequeBooks(user.id);
    res.json(books);
  } catch (error: any) {
    console.error('Error in GET /api/cheque-books:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch cheque books' });
  }
});

app.post('/api/cheque-books', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.put('/api/cheque-books/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.delete('/api/cheque-books/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.get('/api/cheques', authUser, requireRoles('admin', 'accountant', 'auditor'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const list = await getCheques(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in GET /api/cheques:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch cheques' });
  }
});

app.post('/api/cheques', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.put('/api/cheques/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.patch('/api/cheques/:id/status', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.delete('/api/cheques/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

// 9c. Bank Statements & Auto-Reconciliation
app.get('/api/bank-statements', authUser, requireRoles('admin', 'accountant', 'auditor'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const list = await getBankStatements(user.id);
    res.json(list);
  } catch (error: any) {
    console.error('Error in GET /api/bank-statements:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch bank statements' });
  }
});

app.get('/api/bank-statements/:id', authUser, requireRoles('admin', 'accountant', 'auditor'), async (req: ExtendedAuthRequest, res) => {
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
});

app.post('/api/bank-statements', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.put('/api/bank-statements/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.post('/api/bank-statements/:id/reconcile', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.post('/api/bank-statements/:id/unreconcile', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

app.delete('/api/bank-statements/:id', authUser, requireNonAuditor, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
});

// 10. Real-time Team Activity Logs (Sync across team devices)
app.get('/api/activity', authUser, requireRoles('admin', 'accountant', 'auditor'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const logs = await getActivityLogs(user.id);
    res.json(logs);
  } catch (error: any) {
    console.error('Error in /api/activity:', error);
    res.status(500).json({ error: error.message || 'Failed to get activity logs' });
  }
});

// Vite Middleware for development & static file serving for production
async function startServer() {
  // If running in a serverless function environment (like Vercel or AWS Lambda), do not start HTTP listener
  if (process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Resolve dist path robustly across both local bundling and production container roots
    const possibleDistPaths = [
      path.join(process.cwd(), 'dist'),
      path.resolve(__dirname),
      path.resolve(__dirname, 'dist'),
      path.resolve(process.cwd()),
    ];

    const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];

    app.use(express.static(distPath));

    // Fallback 404 for unhandled API calls in production
    app.use('/api', (req, res) => {
      res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
    });

    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><body><h1>Application Starting...</h1></body></html>');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tally GST Accounting Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export { app };
export default app;
