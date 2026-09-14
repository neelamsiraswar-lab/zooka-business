// src/services/api.ts
// Secure client-to-server API bridge. All database and persistence operations execute server-side.

export interface ApiUser {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  hasPin: boolean;
}

function getAuthHeaders(user?: { id?: number; role?: string; displayName?: string | null }) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user?.role) headers['x-user-role'] = user.role;
  if (user?.id) headers['x-user-id'] = String(user.id);
  if (user?.displayName) headers['x-user-name'] = user.displayName;
  return headers;
}

export const api = {
  // App Data
  async getAppData(userId: number = 1, userContext?: any) {
    const res = await fetch(`/api/app-data?userId=${userId}`, {
      headers: getAuthHeaders(userContext),
    });
    if (!res.ok) {
      throw new Error(`Failed to load app data: ${res.statusText}`);
    }
    return res.json();
  },

  // Auth / PIN Verification
  async verifyPin(pin: string, userId?: number, role?: string) {
    const res = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, userId, role }),
    });
    return res.json();
  },

  // Users
  async getUsers(userContext?: any): Promise<ApiUser[]> {
    const res = await fetch('/api/users', {
      headers: getAuthHeaders(userContext),
    });
    if (!res.ok) throw new Error('Failed to load users');
    return res.json();
  },

  async createUser(data: { email: string; displayName: string; role: string; pin?: string }, userContext?: any) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  async updateUser(id: number, data: any, userContext?: any) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update user');
    }
    return res.json();
  },

  async deleteUser(id: number, userContext?: any) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(userContext),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete user');
    }
    return res.json();
  },

  // Company Profile
  async getCompanyProfile() {
    const res = await fetch('/api/company');
    if (!res.ok) throw new Error('Failed to fetch company profile');
    return res.json();
  },

  async updateCompanyProfile(data: any, userContext?: any) {
    const res = await fetch('/api/company', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update company');
    }
    return res.json();
  },

  // Invoices
  async createInvoice(data: any, userContext?: any) {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save invoice');
    }
    return res.json();
  },

  async updateInvoice(id: number, data: any, userContext?: any) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update invoice');
    }
    return res.json();
  },

  async deleteInvoice(id: number, userContext?: any) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(userContext),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete invoice');
    }
    return res.json();
  },

  async checkInvoiceDuplicate(invoiceNo: string, currentId?: number, type: string = 'sales') {
    const url = `/api/invoices/check-duplicate?invoiceNo=${encodeURIComponent(invoiceNo)}&type=${type}${currentId ? `&currentId=${currentId}` : ''}`;
    const res = await fetch(url);
    return res.json();
  },

  // Expenses
  async createExpense(data: any, userContext?: any) {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save expense');
    }
    return res.json();
  },

  async updateExpense(id: number, data: any, userContext?: any) {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update expense');
    }
    return res.json();
  },

  async deleteExpense(id: number, userContext?: any) {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(userContext),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete expense');
    }
    return res.json();
  },

  // Payments
  async createPayment(data: any, userContext?: any) {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save payment');
    }
    return res.json();
  },

  // Parties
  async createParty(data: any, userContext?: any) {
    const res = await fetch('/api/parties', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create party');
    }
    return res.json();
  },

  async updateParty(id: number, data: any, userContext?: any) {
    const res = await fetch(`/api/parties/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update party');
    }
    return res.json();
  },

  async deleteParty(id: number, userContext?: any) {
    const res = await fetch(`/api/parties/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(userContext),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete party');
    }
    return res.json();
  },

  // Inventory
  async createInventory(data: any, userContext?: any) {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create inventory item');
    }
    return res.json();
  },

  async updateInventory(id: number, data: any, userContext?: any) {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update item');
    }
    return res.json();
  },

  async deleteInventory(id: number, userContext?: any) {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(userContext),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete item');
    }
    return res.json();
  },

  // Cheques & Banking
  async createCheque(data: any, userContext?: any) {
    const res = await fetch('/api/cheques', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateCheque(id: number, data: any, userContext?: any) {
    const res = await fetch(`/api/cheques/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async performChequeAction(id: number, action: string, date?: string, reason?: string, userContext?: any) {
    const res = await fetch(`/api/cheques/${id}/action`, {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify({ action, date, reason }),
    });
    return res.json();
  },

  async createChequeBook(data: any, userContext?: any) {
    const res = await fetch('/api/cheque-books', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async reconcileBankStatement(statementId: number, paymentId: number, userContext?: any) {
    const res = await fetch('/api/bank-statements/reconcile', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify({ statementId, paymentId }),
    });
    return res.json();
  },

  async createJournalEntry(data: any, userContext?: any) {
    const res = await fetch('/api/journal-entries', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Admin Data Management
  async purgeDemoData(userContext?: any) {
    const res = await fetch('/api/admin/purge-demo-data', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
    });
    return res.json();
  },

  async clearLedger(userContext?: any) {
    const res = await fetch('/api/admin/clear-ledger', {
      method: 'POST',
      headers: getAuthHeaders(userContext),
    });
    return res.json();
  },
};
