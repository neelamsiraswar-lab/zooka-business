import { Router } from 'express';
import { requireRoles, ExtendedAuthRequest } from '../middleware/rbac.ts';
import { authUser } from './auth.ts';
import {
  getCompanyProfile,
  upsertCompanyProfile,
  getFinancialSummary,
  getActivityLogs,
  logActivity,
  getInvoices,
  getExpenses,
  getParties,
  getInventory,
  getPayments,
  getJournalEntries,
  getChequeBooks,
  getCheques,
  getBankStatements,
  clearMasterLedger,
  getFullDataBackup,
  restoreDataFromBackup,
} from '../db/dataService.ts';

export const companyRouter = Router();

// Consolidated App Data Endpoint (fetches full workspace state in one fast, reliable request)
companyRouter.get('/api/app-data', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const [
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
    ] = await Promise.all([
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

// Company Profile
companyRouter.get('/api/company', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const profile = await getCompanyProfile(user.id);
    res.json(profile);
  } catch (error: any) {
    console.error('Error in /api/company:', error);
    res.status(500).json({ error: error.message || 'Failed to get company profile' });
  }
});

companyRouter.post('/api/company', authUser, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
companyRouter.post('/api/settings/clear-ledger', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
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
companyRouter.get('/api/settings/backup', authUser, requireRoles('admin', 'accountant'), async (req: ExtendedAuthRequest, res) => {
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
companyRouter.post('/api/settings/restore', authUser, requireRoles('admin'), async (req: ExtendedAuthRequest, res) => {
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

// Financial Dashboard Summary
companyRouter.get('/api/dashboard/summary', authUser, async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const summary = await getFinancialSummary(user.id);
    res.json(summary);
  } catch (error: any) {
    console.error('Error in /api/dashboard/summary:', error);
    res.status(500).json({ error: error.message || 'Failed to get summary' });
  }
});

// Real-time Team Activity Logs
companyRouter.get('/api/activity', authUser, requireRoles('admin', 'accountant', 'auditor'), async (req: ExtendedAuthRequest, res) => {
  try {
    const user = req.appUser!;
    const logs = await getActivityLogs(user.id);
    res.json(logs);
  } catch (error: any) {
    console.error('Error in /api/activity:', error);
    res.status(500).json({ error: error.message || 'Failed to get activity logs' });
  }
});
