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
import { Sidebar, NavTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
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
} from './types';
import { RefreshCw, AlertCircle, Menu } from 'lucide-react';

export default function App() {
  const { user, profile, token, loading: authLoading, logout, getToken } = useAuth();
  const dialog = useDialog();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

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
  const [parties, setParties] = useState<Party[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
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

    const idToken = await getToken();
    if (!idToken) return;

    isFetchingDataRef.current = true;
    if (!isSilent) setDataLoading(true);

    try {
      const headers = { Authorization: `Bearer ${idToken}` };

      // Primary strategy: Consolidated single HTTP request (fast, atomic, zero race conditions)
      try {
        const appDataRes = await fetch('/api/app-data', { headers });
        if (appDataRes.ok) {
          const data = await appDataRes.json();
          if (data.summary) setSummary(data.summary);
          if (Array.isArray(data.invoices)) setInvoices(data.invoices);
          if (Array.isArray(data.payments)) setPayments(data.payments);
          if (Array.isArray(data.cheques)) setCheques(data.cheques);
          if (Array.isArray(data.chequeBooks)) setChequeBooks(data.chequeBooks);
          if (Array.isArray(data.journalEntries)) setJournalEntries(data.journalEntries);
          if (Array.isArray(data.expenses)) setExpenses(data.expenses);
          if (Array.isArray(data.parties)) setParties(data.parties);
          if (Array.isArray(data.inventory)) setInventory(data.inventory);
          if (data.company) setCompany(data.company);
          if (Array.isArray(data.activity)) setActivityLogs(data.activity);
          setSyncError(null);
          return;
        }
      } catch (singleReqErr) {
        console.warn('Consolidated /api/app-data call encountered error, trying fallback endpoints:', singleReqErr);
      }

      // Secondary fallback strategy: Individual endpoints with Promise.allSettled
      // Prevents 1 failed endpoint from failing the entire application
      const results = await Promise.allSettled([
        fetch('/api/dashboard/summary', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/invoices', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/payments', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/cheques', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/cheque-books', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/journal-entries', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/expenses', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/parties', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/inventory', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/company', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/activity', { headers }).then(r => r.ok ? r.json() : null),
      ]);

      const [sumVal, invVal, payVal, chqVal, chqBkVal, jvVal, expVal, parVal, itmVal, comVal, actVal] = results;

      if (sumVal.status === 'fulfilled' && sumVal.value) {
        setSummary((prev) => (JSON.stringify(prev) === JSON.stringify(sumVal.value) ? prev : sumVal.value));
      }
      if (invVal.status === 'fulfilled' && invVal.value) {
        setInvoices((prev) => (JSON.stringify(prev) === JSON.stringify(invVal.value) ? prev : invVal.value));
      }
      if (payVal.status === 'fulfilled' && payVal.value) {
        setPayments((prev) => (JSON.stringify(prev) === JSON.stringify(payVal.value) ? prev : payVal.value));
      }
      if (chqVal.status === 'fulfilled' && chqVal.value) {
        setCheques((prev) => (JSON.stringify(prev) === JSON.stringify(chqVal.value) ? prev : chqVal.value));
      }
      if (chqBkVal.status === 'fulfilled' && chqBkVal.value) {
        setChequeBooks((prev) => (JSON.stringify(prev) === JSON.stringify(chqBkVal.value) ? prev : chqBkVal.value));
      }
      if (jvVal.status === 'fulfilled' && jvVal.value) {
        setJournalEntries((prev) => (JSON.stringify(prev) === JSON.stringify(jvVal.value) ? prev : jvVal.value));
      }
      if (expVal.status === 'fulfilled' && expVal.value) {
        setExpenses((prev) => (JSON.stringify(prev) === JSON.stringify(expVal.value) ? prev : expVal.value));
      }
      if (parVal.status === 'fulfilled' && parVal.value) {
        setParties((prev) => (JSON.stringify(prev) === JSON.stringify(parVal.value) ? prev : parVal.value));
      }
      if (itmVal.status === 'fulfilled' && itmVal.value) {
        setInventory((prev) => (JSON.stringify(prev) === JSON.stringify(itmVal.value) ? prev : itmVal.value));
      }
      if (comVal.status === 'fulfilled' && comVal.value) {
        setCompany((prev) => (JSON.stringify(prev) === JSON.stringify(comVal.value) ? prev : comVal.value));
      }
      if (actVal.status === 'fulfilled' && actVal.value) {
        setActivityLogs((prev) => (JSON.stringify(prev) === JSON.stringify(actVal.value) ? prev : actVal.value));
      }

      setSyncError(null);
    } catch (err: any) {
      console.error('Failed to load application data:', err);
      // Keep existing loaded data, only mark error banner if no data loaded at all
      setSyncError(err?.message || 'Network connection issue');
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
      loadData();
    }
  }, [user?.uid]);

  // Periodic background polling for multi-user synchronization across devices
  useEffect(() => {
    if (!user?.uid) return;
    const interval = setInterval(() => {
      loadData(true); // silent background refresh without flickering loader
    }, 15000); // 15 seconds live sync
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Handler: Save Invoice (Create or Edit)
  const handleSaveInvoice = async (invoicePayload: any, invoiceId?: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const url = invoiceId ? `/api/invoices/${invoiceId}` : '/api/invoices';
      const method = invoiceId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(invoicePayload),
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success(invoiceId ? 'Voucher updated successfully' : 'Voucher created successfully');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Voucher Error',
          message: `Failed to ${invoiceId ? 'update' : 'create'} voucher: ` + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Save invoice error:', err);
      dialog.alert({ title: 'Error', message: 'An unexpected error occurred while saving voucher.', variant: 'danger' });
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Invoice / Voucher
  const handleDeleteInvoice = async (invoiceId: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Voucher deleted successfully');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Delete Failed',
          message: 'Failed to delete voucher: ' + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Delete invoice error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Expense (Create or Edit)
  const handleSaveExpense = async (expensePayload: any, expenseId?: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const url = expenseId ? `/api/expenses/${expenseId}` : '/api/expenses';
      const method = expenseId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(expensePayload),
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success(expenseId ? 'Expense updated' : 'Expense recorded');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Expense Error',
          message: `Failed to ${expenseId ? 'update' : 'save'} expense: ` + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Save expense error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Expense
  const handleDeleteExpense = async (expenseId: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Expense deleted');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Delete Failed',
          message: 'Failed to delete expense: ' + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Delete expense error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Payment / Receipt Voucher
  const handleSavePayment = async (paymentData: any) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Payment voucher recorded successfully');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Voucher Error',
          message: 'Failed to save voucher: ' + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Save payment voucher error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Payment / Receipt Voucher
  const handleDeletePayment = async (paymentId: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Voucher deleted');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Delete Error',
          message: 'Failed to delete voucher: ' + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Delete payment voucher error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Journal Voucher / Contra / Adjusting Entry
  const handleSaveJournalEntry = async (entryPayload: any, entryId?: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const url = entryId ? `/api/journal-entries/${entryId}` : '/api/journal-entries';
      const method = entryId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(entryPayload),
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success(entryId ? 'Journal voucher updated successfully' : 'Journal entry recorded');
        return await res.json();
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to save journal voucher (${res.status})`);
      }
    } catch (err: any) {
      console.error('Save journal entry error:', err);
      throw err;
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Journal Voucher
  const handleDeleteJournalEntry = async (entryId: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/journal-entries/${entryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Journal voucher deleted');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Delete Failed',
          message: 'Failed to delete journal entry: ' + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Delete journal entry error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Add Party
  const handleAddParty = async (partyPayload: any) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(partyPayload),
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Party added successfully');
      }
    } catch (err) {
      console.error('Party create error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Edit Party
  const handleEditParty = async (partyId: number, partyPayload: any) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/parties/${partyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(partyPayload),
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Party updated');
      }
    } catch (err) {
      console.error('Party edit error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Party
  const handleDeleteParty = async (partyId: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/parties/${partyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Party deleted successfully');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Delete Failed',
          message: 'Failed to delete party: ' + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Delete party error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Add Stock Item
  const handleAddItem = async (itemPayload: any) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(itemPayload),
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Product/Item added');
      }
    } catch (err) {
      console.error('Item create error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Edit Stock Item
  const handleEditItem = async (itemId: number, itemPayload: any) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(itemPayload),
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Item updated');
      }
    } catch (err) {
      console.error('Item update error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Stock Item
  const handleDeleteItem = async (itemId: number) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        await loadData();
        dialog.toast.success('Item deleted');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Delete Failed',
          message: 'Failed to delete item: ' + (err?.error || `Server returned ${res.status}`),
          variant: 'danger',
        });
      }
    } catch (err) {
      console.error('Item delete error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Adjust / Audit Stock
  const handleAdjustStock = async (itemId: number, newStock: number, reason: string) => {
    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ currentStock: newStock, reason }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Stock adjust error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Company Settings
  const handleSaveCompany = async (companyPayload: any) => {
    const idToken = await getToken();
    if (!idToken) {
      throw new Error('Authentication token not available. Please sign in again.');
    }

    setDataLoading(true);
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(companyPayload),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Server returned an invalid response. Please try again.');
        }
        const savedCompany = await res.json();
        setCompany(savedCompany);
        await loadData(true);
        return savedCompany;
      } else {
        const contentType = res.headers.get('content-type') || '';
        let errorMessage = `Failed to update company settings (${res.status})`;
        if (contentType.includes('application/json')) {
          const errJson = await res.json().catch(() => ({}));
          if (errJson?.error) errorMessage = errJson.error;
        }
        throw new Error(errorMessage);
      }
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

    const idToken = await getToken();
    if (!idToken) return;

    setDataLoading(true);
    try {
      const res = await fetch('/api/settings/clear-ledger', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        await loadData(true);
        dialog.toast.success('All master ledgers and transactions cleared successfully');
      } else {
        const err = await res.json().catch(() => ({}));
        dialog.alert({
          title: 'Error',
          message: err?.error || 'Failed to clear master ledger',
          variant: 'danger',
        });
      }
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
    const idToken = await getToken();
    if (!idToken) throw new Error('Authentication required');

    setDataLoading(true);
    try {
      const url = chequeId ? `/api/cheques/${chequeId}` : '/api/cheques';
      const method = chequeId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(chequeData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to save cheque (${res.status})`);
      }
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Update Cheque Status (Deposit / Clear / Bounce)
  const handleUpdateChequeStatus = async (chequeId: number, statusData: any) => {
    const idToken = await getToken();
    if (!idToken) throw new Error('Authentication required');

    setDataLoading(true);
    try {
      const res = await fetch(`/api/cheques/${chequeId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(statusData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to update cheque status (${res.status})`);
      }
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Cheque
  const handleDeleteCheque = async (chequeId: number) => {
    const idToken = await getToken();
    if (!idToken) throw new Error('Authentication required');

    setDataLoading(true);
    try {
      const res = await fetch(`/api/cheques/${chequeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to delete cheque (${res.status})`);
      }
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Save Cheque Book (Create / Edit)
  const handleSaveChequeBook = async (bookData: Partial<ChequeBook>, bookId?: number) => {
    const idToken = await getToken();
    if (!idToken) throw new Error('Authentication required');

    setDataLoading(true);
    try {
      const url = bookId ? `/api/cheque-books/${bookId}` : '/api/cheque-books';
      const method = bookId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(bookData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to save cheque book (${res.status})`);
      }
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  // Handler: Delete Cheque Book
  const handleDeleteChequeBook = async (bookId: number) => {
    const idToken = await getToken();
    if (!idToken) throw new Error('Authentication required');

    setDataLoading(true);
    try {
      const res = await fetch(`/api/cheque-books/${bookId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to delete cheque book (${res.status})`);
      }
      await loadData(true);
    } finally {
      setDataLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span className="text-sm font-medium">Securing Cloud SQL & Firebase Connection...</span>
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
        journalEntriesCount={journalEntries.length}
        expensesCount={expenses.length}
        partiesCount={parties.length}
        inventoryCount={inventory.length}
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
        />

        {/* Network / Sync Warning Banner if present */}
        {syncError && (
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

        {/* Main Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
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

          {activeTab === 'accounting' && (
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

          {(activeTab === 'sales' || activeTab === 'invoices') && (
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

          {activeTab === 'purchases' && (
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

          {activeTab === 'payments' && (
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

          {activeTab === 'cheques' && (
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

          {activeTab === 'expenses' && (
            <ExpenseView
              expenses={expenses}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              loading={dataLoading}
            />
          )}

          {activeTab === 'ledgers' && (
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

          {activeTab === 'inventory' && (
            <InventoryView
              inventory={inventory}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onAdjustStock={handleAdjustStock}
              loading={dataLoading}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              summary={summary}
              invoices={invoices}
              expenses={expenses}
              parties={parties}
              company={company}
            />
          )}

          {activeTab === 'settings' && (
            <CompanySettingsView
              company={company}
              onSaveCompany={handleSaveCompany}
              onClearMasterLedger={handleClearMasterLedger}
              loading={dataLoading}
            />
          )}
        </main>

        {/* Bottom Sticky Status Bar (Tally-inspired) */}
        <footer className="bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 px-4 py-2.5 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                PostgreSQL Cloud Connected
              </span>
              <span>|</span>
              <span>Place of Supply: {company?.stateName || 'Maharashtra'} ({company?.stateCode || '27'})</span>
              <span className="hidden md:inline">|</span>
              <span className="hidden md:inline">Logged in as: {user.email}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-500">
              <span>GST Act 2017 & ITC Section 16 Compliant</span>
              <span>•</span>
              <span>Real-time Multi-Device Sync</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
