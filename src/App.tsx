import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useDialog } from './context/DialogContext';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { InvoiceView } from './components/InvoiceView';
import { ExpenseView } from './components/ExpenseView';
import { LedgersView } from './components/LedgersView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { CompanySettingsView } from './components/CompanySettingsView';
import { ReceiptPaymentView } from './components/ReceiptPaymentView';
import { AccountingView } from './components/AccountingView';
import { ChequeManagementView } from './components/ChequeManagementView';
import { BankReconciliationView } from './components/BankReconciliationView';
import { Sidebar, NavTab, SuperAdminSubTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { SuperAdminDashboardView } from './components/SuperAdminDashboardView';
import {
  FinancialSummary,
  Invoice,
  Expense,
  Party,
  InventoryItem,
  CompanyProfile,
  ActivityLog,
  PaymentVoucher,
  JournalEntry,
  Cheque,
  ChequeBook,
  BankStatement,
  Workspace,
} from './types';
import { RefreshCw, AlertCircle, Menu, ShieldAlert, Eye } from 'lucide-react';
import { SubscriptionBanner } from './components/SubscriptionBanner';
import { getActiveWorkspace } from './db/workspaces';
import { canPerformTransactionalAction } from './lib/subscriptionEnforcement';
import {
  canAccessTab,
  hasPermission,
  isReadOnlyRole,
  UserRole,
  ROLE_CONFIG,
  isSuperAdmin,
} from './lib/permissions';
import {
  getAppData,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  createExpense,
  updateExpense,
  deleteExpense,
  createPayment,
  deletePayment,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  createParty,
  updateParty,
  deleteParty,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
  saveCompanyProfile,
  clearAllMasterLedgers,
  createCheque,
  updateCheque,
  updateChequeStatus,
  deleteCheque,
  createChequeBook,
  updateChequeBook,
  deleteChequeBook,
  createBankStatement,
  updateBankStatement,
  deleteBankStatement,
  reconcileBankTransaction,
  unreconcileBankTransaction,
} from './db/dataService';

export default function App() {
  const { user, profile, token, loading: authLoading, logout, getToken } = useAuth();
  const dialog = useDialog();

  const userRole: UserRole = (profile?.role as UserRole) || 'accountant';
  const roleConfig = ROLE_CONFIG[userRole] || ROLE_CONFIG.accountant;

  const isUserSuperAdmin = isSuperAdmin(user, profile) || userRole === 'super_admin';
  const [hasEnteredWorkspace, setHasEnteredWorkspace] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    try {
      // If super admin, ALWAYS start directly on super_admin dashboard
      const savedDevUser = localStorage.getItem('apex_gst_dev_user');
      let isDevSuper = false;
      if (savedDevUser) {
        try {
          const parsed = JSON.parse(savedDevUser);
          if (parsed.email?.toLowerCase() === 'nawarkuldeep@gmail.com' || parsed.role === 'super_admin') {
            isDevSuper = true;
          }
        } catch {}
      }
      if (isDevSuper) return 'super_admin';

      const isSuper = (profile?.role === 'super_admin') || (user?.email && ['nawarkuldeep@gmail.com'].includes(user.email.toLowerCase()));
      if (isSuper) return 'super_admin';

      const savedTab = localStorage.getItem('last_active_tab') as NavTab;
      if (savedTab && canAccessTab(userRole, savedTab)) return savedTab;
    } catch {}
    return isUserSuperAdmin ? 'super_admin' : 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [superAdminSubTab, setSuperAdminSubTab] = useState<SuperAdminSubTab>('workspaces');

  // Direct Super Admin Tab: If user is super admin and hasn't explicitly entered a workspace, force super_admin
  const currentTab: NavTab = (isUserSuperAdmin && !hasEnteredWorkspace && (activeTab === 'dashboard' || !activeTab))
    ? 'super_admin'
    : activeTab;

  // Auto-persist active tab
  useEffect(() => {
    try {
      localStorage.setItem('last_active_tab', currentTab);
    } catch {}
  }, [currentTab]);

  // Direct redirection to super_admin when logging in as super admin or switching to super admin role
  const lastAuthUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (user?.uid) {
      const isSuper = isSuperAdmin(user, profile) || userRole === 'super_admin';
      if (isSuper && !hasEnteredWorkspace) {
        // Force direct navigation to super_admin on login or when super admin profile is active
        if (lastAuthUidRef.current !== user.uid) {
          lastAuthUidRef.current = user.uid;
          setActiveTab('super_admin');
        }
      }
    }
  }, [user?.uid, profile?.role, userRole, user, profile, hasEnteredWorkspace]);

  // Auto-redirect to super_admin or dashboard if user switches to a role that cannot access the current active tab
  useEffect(() => {
    if (profile?.role && !canAccessTab(userRole, currentTab)) {
      setActiveTab(userRole === 'super_admin' ? 'super_admin' : 'dashboard');
    }
  }, [profile?.role, currentTab, userRole]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [platformFooterCompliance, setPlatformFooterCompliance] = useState(() => localStorage.getItem('platform_footer_compliance') || 'GST Act 2017 & ITC Section 16 Compliant');
  const [platformFooterSupport, setPlatformFooterSupport] = useState(() => localStorage.getItem('platform_footer_support') || 'Support: support@apextally.com | +91 9876543210');

  useEffect(() => {
    const handleBrandingUpdate = () => {
      setPlatformFooterCompliance(localStorage.getItem('platform_footer_compliance') || 'GST Act 2017 & ITC Section 16 Compliant');
      setPlatformFooterSupport(localStorage.getItem('platform_footer_support') || 'Support: support@apextally.com | +91 9876543210');
    };
    window.addEventListener('platform_branding_updated', handleBrandingUpdate);
    return () => {
      window.removeEventListener('platform_branding_updated', handleBrandingUpdate);
    };
  }, []);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Core Data
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentVoucher[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [initialSettingsSubTab, setInitialSettingsSubTab] = useState<'general' | 'numbering' | 'design' | 'banking' | 'terms' | 'roles' | 'subscription'>('general');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Initial state for pre-populating a new voucher from another tab
  const [paymentInitialState, setPaymentInitialState] = useState<{
    type?: 'receipt' | 'payment';
    partyId?: number;
    invoiceId?: number;
  }>({});

  const handleOpenPaymentWithContext = (
    type: 'receipt' | 'payment',
    partyId?: number,
    invoiceId?: number
  ) => {
    setPaymentInitialState({ type, partyId, invoiceId });
    setActiveTab('payments');
  };

  // Ref to prevent duplicate simultaneous data fetches
  const isFetchingDataRef = useRef(false);

  // Fetch all data for the authenticated workspace
  const loadData = async (silent: boolean | any = false) => {
    const isSilent = typeof silent === 'boolean' ? silent : false;

    // If a request is already in-flight, avoid duplicate burst
    if (isFetchingDataRef.current) return;

    isFetchingDataRef.current = true;
    if (!isSilent) setDataLoading(true);

    try {
      const data = await getAppData(profile?.id || 1);
      if (data.summary) setSummary(data.summary);
      if (Array.isArray(data.invoices)) setInvoices(data.invoices);
      if (Array.isArray(data.payments)) setPayments(data.payments);
      if (Array.isArray(data.cheques)) setCheques(data.cheques);
      if (Array.isArray(data.chequeBooks)) setChequeBooks(data.chequeBooks);
      if (Array.isArray(data.journalEntries)) setJournalEntries(data.journalEntries);
      if (Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (Array.isArray(data.bankStatements)) setBankStatements(data.bankStatements);
      if (Array.isArray(data.parties)) setParties(data.parties);
      if (Array.isArray(data.inventory)) setInventory(data.inventory);
      if (data.company) setCompany(data.company);
      if (Array.isArray(data.activity)) setActivityLogs(data.activity);

      try {
        const ws = await getActiveWorkspace();
        if (ws) setActiveWorkspace(ws);
      } catch (wsErr) {
        console.warn('Could not fetch active workspace metadata:', wsErr);
      }

      setSyncError(null);
    } catch (err: any) {
      console.error('Failed to load application data from Firestore:', err);
      setSyncError(err?.message || 'Database connection issue');
    } finally {
      isFetchingDataRef.current = false;
      if (!isSilent) setDataLoading(false);
    }
  };

  // Manual trigger with instant UI toast feedback for books synchronization
  const handleManualSync = async () => {
    isFetchingDataRef.current = false;
    await loadData(false);
    dialog.toast.success('Double-Entry books & accounts synchronized with Cloud database');
  };

  // Initial load when authenticated user UID changes
  useEffect(() => {
    if (user?.uid) {
      const isSuper = isSuperAdmin(user, profile) || userRole === 'super_admin';
      // If super admin, do not load workspace data on login unless they enter a workspace
      if (!isSuper || hasEnteredWorkspace) {
        loadData();
      }
    }
  }, [user?.uid, hasEnteredWorkspace]);

  // Periodic background polling for multi-user synchronization across devices
  useEffect(() => {
    if (!user?.uid) return;
    const isSuper = isSuperAdmin(user, profile) || userRole === 'super_admin';
    if (isSuper && !hasEnteredWorkspace) return;

    const interval = setInterval(() => {
      loadData(true); // silent background refresh without flickering loader
    }, 15000); // 15 seconds live sync
    return () => clearInterval(interval);
  }, [user?.uid, hasEnteredWorkspace]);

  // Handler: Save Invoice (Create or Edit)
  const handleSaveInvoice = async (invoicePayload: any, invoiceId?: number) => {
    // Subscription enforcement check for new voucher creation
    if (!invoiceId) {
      const check = canPerformTransactionalAction(activeWorkspace, 'create_invoice');
      if (!check.allowed) {
        dialog.alert({
          title: 'Subscription Locked',
          message: check.message || 'Invoice creation is restricted under the current subscription status.',
          variant: 'warning',
        });
        return;
      }
    }

    setDataLoading(true);
    try {
      if (invoiceId) {
        await updateInvoice(invoiceId, invoicePayload, profile?.id || 1, profile?.name || 'User');
      } else {
        await createInvoice(invoicePayload, profile?.id || 1, profile?.name || 'User');
      }
      await loadData();
      dialog.toast.success(invoiceId ? 'Voucher updated successfully' : 'Voucher created successfully');
    } catch (err: any) {
      console.error('Save invoice error:', err);
      dialog.alert({ title: 'Voucher Error', message: `Failed to ${invoiceId ? 'update' : 'create'} voucher: ` + (err?.message || err), variant: 'danger' });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Invoice / Voucher
  const handleDeleteInvoice = async (invoiceId: number) => {
    setDataLoading(true);
    try {
      await deleteInvoice(invoiceId, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Voucher deleted successfully');
    } catch (err: any) {
      console.error('Delete invoice error:', err);
      dialog.alert({
        title: 'Delete Failed',
        message: 'Failed to delete voucher: ' + (err?.message || err),
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Expense (Create or Edit)
  const handleSaveExpense = async (expensePayload: any, expenseId?: number) => {
    // Subscription enforcement check for new expense voucher
    if (!expenseId) {
      const check = canPerformTransactionalAction(activeWorkspace, 'create_expense');
      if (!check.allowed) {
        dialog.alert({
          title: 'Subscription Locked',
          message: check.message || 'Expense voucher creation is restricted under current subscription status.',
          variant: 'warning',
        });
        return;
      }
    }

    setDataLoading(true);
    try {
      if (expenseId) {
        await updateExpense(expenseId, expensePayload, profile?.id || 1, profile?.name || 'User');
      } else {
        await createExpense(expensePayload, profile?.id || 1, profile?.name || 'User');
      }
      await loadData();
      dialog.toast.success(expenseId ? 'Expense updated' : 'Expense recorded');
    } catch (err: any) {
      console.error('Save expense error:', err);
      dialog.alert({
        title: 'Expense Error',
        message: `Failed to ${expenseId ? 'update' : 'save'} expense: ` + (err?.message || err),
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Expense
  const handleDeleteExpense = async (expenseId: number) => {
    setDataLoading(true);
    try {
      await deleteExpense(expenseId, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Expense deleted');
    } catch (err: any) {
      console.error('Delete expense error:', err);
      dialog.alert({
        title: 'Delete Failed',
        message: 'Failed to delete expense: ' + (err?.message || err),
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Payment / Receipt Voucher
  const handleSavePayment = async (paymentData: any) => {
    const check = canPerformTransactionalAction(activeWorkspace, 'create_payment');
    if (!check.allowed) {
      dialog.alert({
        title: 'Subscription Locked',
        message: check.message || 'Payment voucher recording is restricted under current subscription status.',
        variant: 'warning',
      });
      return;
    }

    setDataLoading(true);
    try {
      await createPayment(paymentData, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Payment voucher recorded successfully');
    } catch (err: any) {
      console.error('Save payment voucher error:', err);
      dialog.alert({
        title: 'Voucher Error',
        message: 'Failed to save voucher: ' + (err?.message || err),
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Payment / Receipt Voucher
  const handleDeletePayment = async (paymentId: number) => {
    setDataLoading(true);
    try {
      await deletePayment(paymentId, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Voucher deleted');
    } catch (err: any) {
      console.error('Delete payment voucher error:', err);
      dialog.alert({
        title: 'Delete Error',
        message: 'Failed to delete voucher: ' + (err?.message || err),
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Journal Voucher / Contra / Adjusting Entry
  const handleSaveJournalEntry = async (entryPayload: any, entryId?: number) => {
    setDataLoading(true);
    try {
      let result;
      if (entryId) {
        result = await updateJournalEntry(entryId, entryPayload, profile?.id || 1, profile?.name || 'User');
      } else {
        result = await createJournalEntry(entryPayload, profile?.id || 1, profile?.name || 'User');
      }
      await loadData();
      dialog.toast.success(entryId ? 'Journal voucher updated successfully' : 'Journal entry recorded');
      return result;
    } catch (err: any) {
      console.error('Save journal entry error:', err);
      throw err;
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Journal Voucher
  const handleDeleteJournalEntry = async (entryId: number) => {
    setDataLoading(true);
    try {
      await deleteJournalEntry(entryId, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Journal voucher deleted');
    } catch (err: any) {
      console.error('Delete journal entry error:', err);
      dialog.alert({
        title: 'Delete Failed',
        message: 'Failed to delete journal entry: ' + (err?.message || err),
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Add Party
  const handleAddParty = async (partyPayload: any) => {
    setDataLoading(true);
    try {
      await createParty(partyPayload, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Party added successfully');
    } catch (err) {
      console.error('Party create error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Edit Party
  const handleEditParty = async (partyId: number, partyPayload: any) => {
    setDataLoading(true);
    try {
      await updateParty(partyId, partyPayload, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Party updated');
    } catch (err) {
      console.error('Party edit error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Party
  const handleDeleteParty = async (partyId: number) => {
    setDataLoading(true);
    try {
      await deleteParty(partyId, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Party deleted successfully');
    } catch (err: any) {
      console.error('Delete party error:', err);
      dialog.alert({
        title: 'Delete Failed',
        message: 'Failed to delete party: ' + (err?.message || err),
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Add Stock Item
  const handleAddItem = async (itemPayload: any) => {
    setDataLoading(true);
    try {
      await createInventoryItem(itemPayload, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Product/Item added');
    } catch (err) {
      console.error('Item create error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Edit Stock Item
  const handleEditItem = async (itemId: number, itemPayload: any) => {
    setDataLoading(true);
    try {
      await updateInventoryItem(itemId, itemPayload, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Item updated');
    } catch (err) {
      console.error('Item update error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Stock Item
  const handleDeleteItem = async (itemId: number) => {
    setDataLoading(true);
    try {
      await deleteInventoryItem(itemId, profile?.id || 1, profile?.name || 'User');
      await loadData();
      dialog.toast.success('Item deleted');
    } catch (err: any) {
      console.error('Item delete error:', err);
      dialog.alert({
        title: 'Delete Failed',
        message: 'Failed to delete item: ' + (err?.message || err),
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Adjust / Audit Stock
  const handleAdjustStock = async (itemId: number, newStock: number, reason: string) => {
    setDataLoading(true);
    try {
      await adjustStock(itemId, newStock, reason, profile?.id || 1, profile?.name || 'User');
      await loadData();
    } catch (err) {
      console.error('Stock adjust error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Company Settings
  const handleSaveCompany = async (companyPayload: any) => {
    setDataLoading(true);
    try {
      const savedCompany = await saveCompanyProfile(companyPayload, profile?.id || 1, profile?.name || 'User');
      setCompany(savedCompany);
      await loadData(true);
      return savedCompany;
    } catch (err) {
      console.error('Company save error:', err);
      throw err;
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Clear All Master Ledgers & Transactions
  const handleClearMasterLedger = async () => {
    const confirmed = await dialog.confirm({
      title: 'Clear All Master Ledgers & Transactions',
      message: 'WARNING: This will permanently delete all parties, inventory items, sales invoices, purchase bills, expenses, payment vouchers, journal entries, and cheques. This action cannot be undone. Are you sure?',
      confirmText: 'Yes, Clear All Data',
      variant: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;

    setDataLoading(true);
    try {
      await clearAllMasterLedgers(profile?.id || 1, profile?.name || 'User');
      await loadData(true);
      dialog.toast.success('All master ledgers and transactions cleared successfully');
    } catch (err: any) {
      console.error('Clear ledger error:', err);
      dialog.alert({
        title: 'Error',
        message: err.message || 'Failed to clear master ledger',
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Cheque (Create / Edit)
  const handleSaveCheque = async (chequeData: Partial<Cheque>, chequeId?: number) => {
    setDataLoading(true);
    try {
      if (chequeId) {
        await updateCheque(chequeId, chequeData, profile?.id || 1, profile?.name || 'User');
      } else {
        await createCheque(chequeData, profile?.id || 1, profile?.name || 'User');
      }
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Update Cheque Status (Deposit / Clear / Bounce)
  const handleUpdateChequeStatus = async (chequeId: number, statusData: any) => {
    setDataLoading(true);
    try {
      await updateChequeStatus(chequeId, statusData, profile?.id || 1, profile?.name || 'User');
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Cheque
  const handleDeleteCheque = async (chequeId: number) => {
    setDataLoading(true);
    try {
      await deleteCheque(chequeId, profile?.id || 1, profile?.name || 'User');
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Cheque Book (Create / Edit)
  const handleSaveChequeBook = async (bookData: Partial<ChequeBook>, bookId?: number) => {
    setDataLoading(true);
    try {
      if (bookId) {
        await updateChequeBook(bookId, bookData, profile?.id || 1, profile?.name || 'User');
      } else {
        await createChequeBook(bookData, profile?.id || 1, profile?.name || 'User');
      }
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Cheque Book
  const handleDeleteChequeBook = async (bookId: number) => {
    setDataLoading(true);
    try {
      await deleteChequeBook(bookId, profile?.id || 1, profile?.name || 'User');
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Bank Statement (Create / Update)
  const handleSaveStatement = async (statementPayload: any, statementId?: number) => {
    setDataLoading(true);
    try {
      let saved;
      if (statementId) {
        saved = await updateBankStatement(statementId, statementPayload, profile?.id || 1, profile?.name || 'User');
      } else {
        saved = await createBankStatement(statementPayload, profile?.id || 1, profile?.name || 'User');
      }
      dialog.toast.success(statementId ? 'Bank statement updated' : 'Bank statement imported successfully');
      await loadData(true);
      return saved;
    } catch (err: any) {
      console.error('Statement save error:', err);
      dialog.alert({
        title: 'Statement Import Failed',
        message: err?.message || 'Failed to process bank statement',
        variant: 'danger',
      });
      return null;
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Bank Statement
  const handleDeleteStatement = async (statementId: number) => {
    setDataLoading(true);
    try {
      await deleteBankStatement(statementId, profile?.id || 1, profile?.name || 'User');
      dialog.toast.success('Bank statement removed');
      await loadData(true);
    } catch (err: any) {
      console.error('Statement delete error:', err);
      dialog.alert({
        title: 'Delete Failed',
        message: err?.message || 'Failed to delete bank statement',
        variant: 'danger',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Reconcile Single Transaction
  const handleReconcileTransaction = async (
    statementId: number,
    transactionId: string,
    matchData: any
  ) => {
    try {
      await reconcileBankTransaction(statementId, transactionId, matchData, profile?.id || 1, profile?.name || 'User');
      dialog.toast.success('Transaction matched & reconciled');
      await loadData(true);
    } catch (err: any) {
      console.error('Reconciliation error:', err);
      dialog.alert({
        title: 'Reconciliation Failed',
        message: err?.message || 'Failed to reconcile transaction',
        variant: 'danger',
      });
    }
  };

  // Handler: Unreconcile Single Transaction
  const handleUnreconcileTransaction = async (statementId: number, transactionId: string) => {
    try {
      await unreconcileBankTransaction(statementId, transactionId, profile?.id || 1, profile?.name || 'User');
      dialog.toast.success('Transaction unlinked');
      await loadData(true);
    } catch (err: any) {
      console.error('Unreconcile error:', err);
      dialog.alert({
        title: 'Unlink Failed',
        message: err?.message || 'Failed to unlink transaction',
        variant: 'danger',
      });
    }
  };

  // Handler: Switch Workspace
  const handleSwitchWorkspace = async (workspace: Workspace) => {
    setDataLoading(true);
    setHasEnteredWorkspace(true);
    setActiveWorkspace(workspace);
    try {
      // Update local company state to match active workspace profile
      setCompany((prev) => ({
        ...prev,
        workspaceId: workspace.id,
        businessName: workspace.businessName,
        tradeName: workspace.tradeName || '',
        gstin: workspace.gstin,
        stateCode: workspace.stateCode,
        stateName: workspace.stateName,
        address: workspace.address,
        phone: workspace.phone || '',
        email: workspace.email || '',
        bankName: workspace.bankName || '',
        accountNumber: workspace.accountNumber || '',
        ifscCode: workspace.ifscCode || '',
        upiId: workspace.upiId || '',
        invoicePrefix: workspace.invoicePrefix || 'INV/2026-27/',
        purchasePrefix: workspace.purchasePrefix || 'PUR/2026-27/',
      }));
      await loadData(false);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to switch workspace:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Return to Super Admin Master Hub
  const handleReturnToSuperAdmin = () => {
    setHasEnteredWorkspace(false);
    setActiveTab('super_admin');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span className="text-sm font-medium">Securing Google Cloud Firestore Connection...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Collapsible Side Navigation Bar */}
      <Sidebar
        activeTab={currentTab}
        setActiveTab={(tab) => {
          if (tab !== 'super_admin') {
            setHasEnteredWorkspace(true);
          } else {
            setHasEnteredWorkspace(false);
          }
          setActiveTab(tab);
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        company={company}
        user={user}
        profile={profile}
        logout={logout}
        invoicesCount={invoices.length}
        salesCount={invoices.filter((i) => i.voucherType === 'sales').length}
        purchasesCount={invoices.filter((i) => i.voucherType === 'purchase').length}
        paymentsCount={payments.length}
        chequesCount={cheques.length}
        bankStatementsCount={bankStatements.length}
        journalEntriesCount={journalEntries.length}
        expensesCount={expenses.length}
        partiesCount={parties.length}
        inventoryCount={inventory.length}
        superAdminSubTab={superAdminSubTab}
        onSelectSuperAdminSubTab={(subTab) => {
          setSuperAdminSubTab(subTab);
          setHasEnteredWorkspace(false);
          setActiveTab('super_admin');
        }}
        activeWorkspace={activeWorkspace}
        onSwitchWorkspace={handleSwitchWorkspace}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <TopHeader
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onOpenMobile={() => setMobileMenuOpen(true)}
          company={company}
          onRefresh={handleManualSync}
          dataLoading={dataLoading}
          user={user}
          profile={profile}
          activeTab={currentTab}
          onNavigateToSuperAdmin={isUserSuperAdmin ? handleReturnToSuperAdmin : undefined}
        />

        {/* Network / Sync Warning Banner if present (suppressed while on master super admin view) */}
        {syncError && currentTab !== 'super_admin' && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Could not refresh workspace data ({syncError}). Showing active workspace records.</span>
              </div>
              <button
                onClick={handleManualSync}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg font-medium transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Auditor Read-Only Inspection Banner */}
        {isReadOnlyRole(userRole) && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-amber-200">Statutory Auditor Mode Active (Read-Only)</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    You have complete read & audit visibility into books, ledgers, bank statements, and reports. Creation, editing, and deletion operations are locked.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-300 whitespace-nowrap hidden sm:inline-block">
                Read Only
              </span>
            </div>
          </div>
        )}

        {/* Subscription Plan & Status Notification Banner */}
        {currentTab !== 'super_admin' && (
          <SubscriptionBanner
            workspace={activeWorkspace}
            onNavigateToSubscription={() => {
              setInitialSettingsSubTab('subscription');
              setActiveTab('settings');
            }}
          />
        )}

        {/* Main Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {currentTab === 'super_admin' && (
            <SuperAdminDashboardView
              onSwitchWorkspace={handleSwitchWorkspace}
              onNavigateToTab={(tab) => {
                setHasEnteredWorkspace(true);
                setActiveTab(tab as any);
              }}
              hasEnteredWorkspace={hasEnteredWorkspace}
              activeViewTab={superAdminSubTab}
              onViewTabChange={setSuperAdminSubTab}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              activityLogs={activityLogs}
              invoices={invoices}
              cheques={cheques}
              onQuickInvoice={() => setActiveTab('sales')}
              onQuickExpense={() => setActiveTab('expenses')}
              onQuickReceipt={() => handleOpenPaymentWithContext('receipt')}
              onQuickPayment={() => handleOpenPaymentWithContext('payment')}
              onQuickAccounting={() => setActiveTab('accounting')}
              onNavigateToInvoices={() => setActiveTab('sales')}
              onNavigateToPurchases={() => setActiveTab('purchases')}
              onNavigateToCheques={() => setActiveTab('cheques')}
              onRefresh={handleManualSync}
              loading={dataLoading}
            />
          )}

          {currentTab === 'accounting' && (
            <AccountingView
              invoices={invoices}
              expenses={expenses}
              payments={payments}
              cheques={cheques}
              parties={parties}
              inventory={inventory}
              company={company}
              summary={summary}
              journalEntries={journalEntries}
              onSaveJournalEntry={handleSaveJournalEntry}
              onDeleteJournalEntry={handleDeleteJournalEntry}
              onRefresh={handleManualSync}
              loading={dataLoading}
              onNavigateToInvoice={(inv) => {
                if (inv.invoiceType === 'purchase_bill' || inv.voucherType === 'purchase') {
                  setActiveTab('purchases');
                } else {
                  setActiveTab('sales');
                }
              }}
              onNavigateToParty={() => setActiveTab('ledgers')}
            />
          )}

          {(currentTab === 'sales' || currentTab === 'invoices') && (
            <InvoiceView
              invoices={invoices}
              parties={parties}
              inventory={inventory}
              company={company}
              onSaveInvoice={handleSaveInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onRefresh={handleManualSync}
              loading={dataLoading}
              mode="sales"
              onRecordVoucher={handleOpenPaymentWithContext}
            />
          )}

          {currentTab === 'purchases' && (
            <InvoiceView
              invoices={invoices}
              parties={parties}
              inventory={inventory}
              company={company}
              onSaveInvoice={handleSaveInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onRefresh={handleManualSync}
              loading={dataLoading}
              mode="purchase"
              onRecordVoucher={handleOpenPaymentWithContext}
            />
          )}

          {currentTab === 'payments' && (
            <ReceiptPaymentView
              payments={payments}
              parties={parties}
              invoices={invoices}
              company={company}
              onSavePayment={handleSavePayment}
              onDeletePayment={handleDeletePayment}
              onRefresh={handleManualSync}
              loading={dataLoading}
              initialType={paymentInitialState.type}
              initialPartyId={paymentInitialState.partyId}
              initialInvoiceId={paymentInitialState.invoiceId}
              onNavigateToInvoices={(invId) => {
                const target = invoices.find((i) => i.id === invId);
                if (target?.voucherType === 'purchase') {
                  setActiveTab('purchases');
                } else {
                  setActiveTab('sales');
                }
              }}
            />
          )}

          {currentTab === 'cheques' && (
            <ChequeManagementView
              cheques={cheques}
              chequeBooks={chequeBooks}
              parties={parties}
              invoices={invoices}
              payments={payments}
              company={company}
              onSaveCheque={handleSaveCheque}
              onUpdateChequeStatus={handleUpdateChequeStatus}
              onDeleteCheque={handleDeleteCheque}
              onSaveChequeBook={handleSaveChequeBook}
              onDeleteChequeBook={handleDeleteChequeBook}
              onRefresh={handleManualSync}
              loading={dataLoading}
              onNavigateToInvoice={(invId) => {
                const target = invoices.find((i) => i.id === invId);
                if (target?.voucherType === 'purchase') {
                  setActiveTab('purchases');
                } else {
                  setActiveTab('sales');
                }
              }}
              onNavigateToParty={() => setActiveTab('ledgers')}
            />
          )}

          {currentTab === 'banking' && (
            <BankReconciliationView
              bankStatements={bankStatements}
              payments={payments}
              cheques={cheques}
              expenses={expenses}
              parties={parties}
              invoices={invoices}
              company={company}
              onSaveStatement={handleSaveStatement}
              onDeleteStatement={handleDeleteStatement}
              onReconcileTransaction={handleReconcileTransaction}
              onUnreconcileTransaction={handleUnreconcileTransaction}
              onCreatePayment={handleSavePayment}
              onCreateExpense={handleSaveExpense}
              onRefresh={handleManualSync}
              loading={dataLoading}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpenseView
              expenses={expenses}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              loading={dataLoading}
            />
          )}

          {currentTab === 'ledgers' && (
            <LedgersView
              parties={parties}
              invoices={invoices}
              payments={payments}
              cheques={cheques}
              onAddParty={handleAddParty}
              onEditParty={handleEditParty}
              onDeleteParty={handleDeleteParty}
              onNavigateToInvoices={() => setActiveTab('sales')}
              onNavigateToSales={() => setActiveTab('sales')}
              onNavigateToPurchases={() => setActiveTab('purchases')}
              onRecordPayment={(party, defaultType) =>
                handleOpenPaymentWithContext(defaultType, party.id)
              }
              loading={dataLoading}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onAdjustStock={handleAdjustStock}
              loading={dataLoading}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              summary={summary}
              invoices={invoices}
              expenses={expenses}
              parties={parties}
              company={company}
            />
          )}

          {currentTab === 'settings' && (
            <CompanySettingsView
              company={company}
              onSaveCompany={handleSaveCompany}
              onClearMasterLedger={handleClearMasterLedger}
              loading={dataLoading}
              initialSettingsTab={initialSettingsSubTab}
            />
          )}
        </main>

        {/* Bottom Sticky Status Bar (Tally-inspired) */}
        <footer className="bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 px-4 py-2.5 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Cloud Firestore Connected
              </span>
              <span>|</span>
              <span>Place of Supply: {company?.stateName || 'Maharashtra'} ({company?.stateCode || '27'})</span>
              <span className="hidden md:inline">|</span>
              <span className="hidden md:inline">Logged in as: {user.email}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-500">
              <span>{platformFooterCompliance}</span>
              <span>•</span>
              <span>{platformFooterSupport}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
