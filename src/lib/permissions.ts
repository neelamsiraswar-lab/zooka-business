// src/lib/permissions.ts

export type UserRole = 'super_admin' | 'admin' | 'accountant' | 'auditor' | 'billing_operator';

export type NavTabId =
  | 'dashboard'
  | 'super_admin'
  | 'sales'
  | 'purchases'
  | 'payments'
  | 'cheques'
  | 'banking'
  | 'accounting'
  | 'invoices'
  | 'expenses'
  | 'ledgers'
  | 'inventory'
  | 'reports'
  | 'settings';

export type PermissionAction =
  // Sales & Invoices
  | 'sales:view'
  | 'sales:create'
  | 'sales:edit'
  | 'sales:delete'
  // Purchases
  | 'purchases:view'
  | 'purchases:create'
  | 'purchases:edit'
  | 'purchases:delete'
  // Payments & Receipts
  | 'payments:view'
  | 'payments:create'
  | 'payments:delete'
  // Cheque Management
  | 'cheques:view'
  | 'cheques:create'
  | 'cheques:update_status'
  | 'cheques:delete'
  // Bank Reconciliation
  | 'banking:view'
  | 'banking:create'
  | 'banking:reconcile'
  | 'banking:delete'
  // Accounting & Journal
  | 'accounting:view'
  | 'accounting:create'
  | 'accounting:edit'
  | 'accounting:delete'
  // Expenses & ITC
  | 'expenses:view'
  | 'expenses:create'
  | 'expenses:edit'
  | 'expenses:delete'
  // Parties & Ledgers
  | 'parties:view'
  | 'parties:create'
  | 'parties:edit'
  | 'parties:delete'
  // Inventory & Stock
  | 'inventory:view'
  | 'inventory:create'
  | 'inventory:edit'
  | 'inventory:adjust'
  | 'inventory:delete'
  // Reports
  | 'reports:view'
  | 'reports:export'
  // Settings & Administration
  | 'settings:view'
  | 'settings:edit_company'
  | 'settings:clear_ledger'
  | 'settings:backup'
  | 'settings:restore'
  // User Management & RBAC
  | 'users:view'
  | 'users:manage_roles'
  | 'users:edit'
  | 'users:delete'
  // Audit Logs
  | 'audit:view';

export const ROLE_CONFIG: Record<
  UserRole,
  {
    title: string;
    badge: string;
    description: string;
    color: string;
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    allowedTabs: NavTabId[];
  }
> = {
  super_admin: {
    title: 'Super Administrator',
    badge: 'Super Admin',
    description: 'Supreme multi-workspace authority: provision workspaces, manage all tenant environments, global billing, security policies, and master ledger operations.',
    color: 'indigo',
    bgBadge: 'bg-indigo-500/15',
    textBadge: 'text-indigo-400',
    borderBadge: 'border-indigo-500/30',
    allowedTabs: [
      'dashboard',
      'super_admin',
      'sales',
      'purchases',
      'payments',
      'cheques',
      'banking',
      'accounting',
      'expenses',
      'ledgers',
      'inventory',
      'reports',
      'settings',
    ],
  },
  admin: {
    title: 'Administrator',
    badge: 'Admin',
    description: 'Full unconstrained system authority: financial books, user management, security roles, backups, and master data control.',
    color: 'emerald',
    bgBadge: 'bg-purple-500/10',
    textBadge: 'text-purple-400',
    borderBadge: 'border-purple-500/20',
    allowedTabs: [
      'dashboard',
      'sales',
      'purchases',
      'payments',
      'cheques',
      'banking',
      'accounting',
      'expenses',
      'ledgers',
      'inventory',
      'reports',
      'settings',
    ],
  },
  accountant: {
    title: 'Senior Accountant',
    badge: 'Accountant',
    description: 'Complete financial bookkeeping: day book, invoicing, vouchers, BRS, journals, ledgers, and statutory tax reporting.',
    color: 'emerald',
    bgBadge: 'bg-emerald-500/10',
    textBadge: 'text-emerald-400',
    borderBadge: 'border-emerald-500/20',
    allowedTabs: [
      'dashboard',
      'sales',
      'purchases',
      'payments',
      'cheques',
      'banking',
      'accounting',
      'expenses',
      'ledgers',
      'inventory',
      'reports',
      'settings',
    ],
  },
  billing_operator: {
    title: 'Billing Operator',
    badge: 'Billing Clerk',
    description: 'Front-counter billing & POS: creates sales bills, inwards purchase invoices, issues receipts, and views inventory.',
    color: 'blue',
    bgBadge: 'bg-blue-500/10',
    textBadge: 'text-blue-400',
    borderBadge: 'border-blue-500/20',
    allowedTabs: ['dashboard', 'sales', 'purchases', 'payments', 'ledgers', 'inventory'],
  },
  auditor: {
    title: 'Statutory Auditor',
    badge: 'Auditor (Read-Only)',
    description: 'Strict read-only inspection access: reviews general ledgers, bank reconciliation, tax credit claims, and audit trail.',
    color: 'amber',
    bgBadge: 'bg-amber-500/10',
    textBadge: 'text-amber-400',
    borderBadge: 'border-amber-500/20',
    allowedTabs: [
      'dashboard',
      'sales',
      'purchases',
      'payments',
      'cheques',
      'banking',
      'accounting',
      'expenses',
      'ledgers',
      'inventory',
      'reports',
    ],
  },
};

export const ROLE_PERMISSIONS: Record<UserRole, Record<PermissionAction, boolean>> = {
  super_admin: {
    'sales:view': true,
    'sales:create': true,
    'sales:edit': true,
    'sales:delete': true,
    'purchases:view': true,
    'purchases:create': true,
    'purchases:edit': true,
    'purchases:delete': true,
    'payments:view': true,
    'payments:create': true,
    'payments:delete': true,
    'cheques:view': true,
    'cheques:create': true,
    'cheques:update_status': true,
    'cheques:delete': true,
    'banking:view': true,
    'banking:create': true,
    'banking:reconcile': true,
    'banking:delete': true,
    'accounting:view': true,
    'accounting:create': true,
    'accounting:edit': true,
    'accounting:delete': true,
    'expenses:view': true,
    'expenses:create': true,
    'expenses:edit': true,
    'expenses:delete': true,
    'parties:view': true,
    'parties:create': true,
    'parties:edit': true,
    'parties:delete': true,
    'inventory:view': true,
    'inventory:create': true,
    'inventory:edit': true,
    'inventory:adjust': true,
    'inventory:delete': true,
    'reports:view': true,
    'reports:export': true,
    'settings:view': true,
    'settings:edit_company': true,
    'settings:clear_ledger': true,
    'settings:backup': true,
    'settings:restore': true,
    'users:view': true,
    'users:manage_roles': true,
    'users:edit': true,
    'users:delete': true,
    'audit:view': true,
  },
  admin: {
    'sales:view': true,
    'sales:create': true,
    'sales:edit': true,
    'sales:delete': true,
    'purchases:view': true,
    'purchases:create': true,
    'purchases:edit': true,
    'purchases:delete': true,
    'payments:view': true,
    'payments:create': true,
    'payments:delete': true,
    'cheques:view': true,
    'cheques:create': true,
    'cheques:update_status': true,
    'cheques:delete': true,
    'banking:view': true,
    'banking:create': true,
    'banking:reconcile': true,
    'banking:delete': true,
    'accounting:view': true,
    'accounting:create': true,
    'accounting:edit': true,
    'accounting:delete': true,
    'expenses:view': true,
    'expenses:create': true,
    'expenses:edit': true,
    'expenses:delete': true,
    'parties:view': true,
    'parties:create': true,
    'parties:edit': true,
    'parties:delete': true,
    'inventory:view': true,
    'inventory:create': true,
    'inventory:edit': true,
    'inventory:adjust': true,
    'inventory:delete': true,
    'reports:view': true,
    'reports:export': true,
    'settings:view': true,
    'settings:edit_company': true,
    'settings:clear_ledger': true,
    'settings:backup': true,
    'settings:restore': true,
    'users:view': true,
    'users:manage_roles': true,
    'users:edit': true,
    'users:delete': true,
    'audit:view': true,
  },
  accountant: {
    'sales:view': true,
    'sales:create': true,
    'sales:edit': true,
    'sales:delete': true,
    'purchases:view': true,
    'purchases:create': true,
    'purchases:edit': true,
    'purchases:delete': true,
    'payments:view': true,
    'payments:create': true,
    'payments:delete': true,
    'cheques:view': true,
    'cheques:create': true,
    'cheques:update_status': true,
    'cheques:delete': true,
    'banking:view': true,
    'banking:create': true,
    'banking:reconcile': true,
    'banking:delete': true,
    'accounting:view': true,
    'accounting:create': true,
    'accounting:edit': true,
    'accounting:delete': true,
    'expenses:view': true,
    'expenses:create': true,
    'expenses:edit': true,
    'expenses:delete': true,
    'parties:view': true,
    'parties:create': true,
    'parties:edit': true,
    'parties:delete': true,
    'inventory:view': true,
    'inventory:create': true,
    'inventory:edit': true,
    'inventory:adjust': true,
    'inventory:delete': true,
    'reports:view': true,
    'reports:export': true,
    'settings:view': true,
    'settings:edit_company': true,
    'settings:clear_ledger': false, // Only Admin can wipe ledger
    'settings:backup': true,
    'settings:restore': false, // Only Admin can overwrite database from backup
    'users:view': true,
    'users:manage_roles': false, // Only Admin can alter security roles
    'users:edit': false,
    'users:delete': false,
    'audit:view': true,
  },
  billing_operator: {
    'sales:view': true,
    'sales:create': true,
    'sales:edit': true,
    'sales:delete': false, // Billing operator cannot delete invoices
    'purchases:view': true,
    'purchases:create': true,
    'purchases:edit': true,
    'purchases:delete': false,
    'payments:view': true,
    'payments:create': true, // Can record receipt payments
    'payments:delete': false,
    'cheques:view': false,
    'cheques:create': false,
    'cheques:update_status': false,
    'cheques:delete': false,
    'banking:view': false,
    'banking:create': false,
    'banking:reconcile': false,
    'banking:delete': false,
    'accounting:view': false,
    'accounting:create': false,
    'accounting:edit': false,
    'accounting:delete': false,
    'expenses:view': false,
    'expenses:create': false,
    'expenses:edit': false,
    'expenses:delete': false,
    'parties:view': true,
    'parties:create': true,
    'parties:edit': true,
    'parties:delete': false,
    'inventory:view': true,
    'inventory:create': false,
    'inventory:edit': false,
    'inventory:adjust': false,
    'inventory:delete': false,
    'reports:view': false,
    'reports:export': false,
    'settings:view': false,
    'settings:edit_company': false,
    'settings:clear_ledger': false,
    'settings:backup': false,
    'settings:restore': false,
    'users:view': false,
    'users:manage_roles': false,
    'users:edit': false,
    'users:delete': false,
    'audit:view': false,
  },
  auditor: {
    'sales:view': true,
    'sales:create': false,
    'sales:edit': false,
    'sales:delete': false,
    'purchases:view': true,
    'purchases:create': false,
    'purchases:edit': false,
    'purchases:delete': false,
    'payments:view': true,
    'payments:create': false,
    'payments:delete': false,
    'cheques:view': true,
    'cheques:create': false,
    'cheques:update_status': false,
    'cheques:delete': false,
    'banking:view': true,
    'banking:create': false,
    'banking:reconcile': false,
    'banking:delete': false,
    'accounting:view': true,
    'accounting:create': false,
    'accounting:edit': false,
    'accounting:delete': false,
    'expenses:view': true,
    'expenses:create': false,
    'expenses:edit': false,
    'expenses:delete': false,
    'parties:view': true,
    'parties:create': false,
    'parties:edit': false,
    'parties:delete': false,
    'inventory:view': true,
    'inventory:create': false,
    'inventory:edit': false,
    'inventory:adjust': false,
    'inventory:delete': false,
    'reports:view': true,
    'reports:export': true,
    'settings:view': false,
    'settings:edit_company': false,
    'settings:clear_ledger': false,
    'settings:backup': false,
    'settings:restore': false,
    'users:view': true,
    'users:manage_roles': false,
    'users:edit': false,
    'users:delete': false,
    'audit:view': true,
  },
};

export function hasPermission(role: UserRole | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  const roleRules = ROLE_PERMISSIONS[role];
  if (!roleRules) return false;
  return !!roleRules[action];
}

export function canAccessTab(role: UserRole | undefined, tabId: NavTabId): boolean {
  if (!role) return false;
  const config = ROLE_CONFIG[role];
  if (!config) return false;
  if (tabId === 'invoices') return config.allowedTabs.includes('sales');
  return config.allowedTabs.includes(tabId);
}

export function isReadOnlyRole(role: UserRole | undefined): boolean {
  return role === 'auditor';
}

export function isSuperAdmin(user: any, profile: any): boolean {
  const email = (user?.email || profile?.email || '').toLowerCase().trim();
  if (email === 'nawarkuldeep@gmail.com') return true;
  if (profile?.role === 'super_admin' || user?.role === 'super_admin') return true;
  return false;
}

export interface RolePinConfig {
  admin: string;
  accountant: string;
  billing_operator: string;
  auditor: string;
  master: string;
}

export const DEFAULT_ROLE_PINS: RolePinConfig = {
  admin: '9999',
  accountant: '2222',
  billing_operator: '1111',
  auditor: '3333',
  master: '1234',
};

export function getRoleDefaultPin(role: UserRole): string {
  return DEFAULT_ROLE_PINS[role] || DEFAULT_ROLE_PINS.master;
}

export interface PermissionMatrixCategory {
  category: string;
  features: {
    name: string;
    description: string;
    admin: boolean;
    accountant: boolean;
    billing_operator: boolean;
    auditor: boolean;
  }[];
}

export const PERMISSION_MATRIX_DATA: PermissionMatrixCategory[] = [
  {
    category: 'Sales & Invoicing',
    features: [
      {
        name: 'View Invoices & Sales Ledger',
        description: 'Browse outward sales, customer GST invoices, and debtors',
        admin: true,
        accountant: true,
        billing_operator: true,
        auditor: true,
      },
      {
        name: 'Generate / Print Invoices',
        description: 'Create compliant GST sales invoices and share thermal/PDF prints',
        admin: true,
        accountant: true,
        billing_operator: true,
        auditor: false,
      },
      {
        name: 'Delete / Cancel Invoices',
        description: 'Permanently remove or cancel posted sales bills',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: false,
      },
    ],
  },
  {
    category: 'Purchases & Inward Bills',
    features: [
      {
        name: 'View Purchase Invoices',
        description: 'Inspect inward bills, vendor credit, and purchase vouchers',
        admin: true,
        accountant: true,
        billing_operator: true,
        auditor: true,
      },
      {
        name: 'Record Inward Bills',
        description: 'Post supplier invoices and claim input tax credits',
        admin: true,
        accountant: true,
        billing_operator: true,
        auditor: false,
      },
      {
        name: 'Delete Purchase Records',
        description: 'Remove supplier bills from the purchase register',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: false,
      },
    ],
  },
  {
    category: 'Receipts, Payments & Vouchers',
    features: [
      {
        name: 'View Vouchers & Cash/Bank Flow',
        description: 'Monitor payment transactions and receipts',
        admin: true,
        accountant: true,
        billing_operator: true,
        auditor: true,
      },
      {
        name: 'Record Payment Receipts',
        description: 'Acknowledge customer payments against pending invoices',
        admin: true,
        accountant: true,
        billing_operator: true,
        auditor: false,
      },
      {
        name: 'Delete Payment Vouchers',
        description: 'Void cash or bank transaction entries',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: false,
      },
    ],
  },
  {
    category: 'Banking & Cheque Management',
    features: [
      {
        name: 'Cheque Register & PDC Clearing',
        description: 'Issue cheque books, track post-dated cheques, and mark clearing',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: true,
      },
      {
        name: 'Bank Reconciliation (BRS)',
        description: 'Import bank statements and match with accounting ledger entries',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: true,
      },
      {
        name: 'Reconcile Transactions',
        description: 'Confirm and link bank transactions with ledger payments',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: false,
      },
    ],
  },
  {
    category: 'Accounting & Bookkeeping',
    features: [
      {
        name: 'Journal Vouchers (JV)',
        description: 'Create multi-party debit/credit journal entries',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: false,
      },
      {
        name: 'Day Book & Trial Balance',
        description: 'Real-time debits and credits ledger balance verification',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: true,
      },
      {
        name: 'Expenses & ITC Claims',
        description: 'Track operational expenses and qualify tax credits',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: true,
      },
    ],
  },
  {
    category: 'Financial Reports & Tax',
    features: [
      {
        name: 'GSTR-1 & GSTR-3B Computation',
        description: 'Automated GST filing summaries and tax breakdowns',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: true,
      },
      {
        name: 'Profit & Loss & Balance Sheet',
        description: 'Executive financial statements and net margins',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: true,
      },
    ],
  },
  {
    category: 'Administration & Security',
    features: [
      {
        name: 'Company Profile & Bank Setup',
        description: 'Update business GSTIN, trade name, and authorized signatory',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: false,
      },
      {
        name: 'User Management & Role Assignment',
        description: 'Assign Admin, Accountant, Auditor, and Billing Operator roles',
        admin: true,
        accountant: false,
        billing_operator: false,
        auditor: false,
      },
      {
        name: 'Edit Team Profiles & Credentials',
        description: 'Edit full names, login emails, and RBAC roles of other workspace users',
        admin: true,
        accountant: false,
        billing_operator: false,
        auditor: false,
      },
      {
        name: 'Delete User Profiles',
        description: 'Permanently remove other user accounts and revoke workspace access',
        admin: true,
        accountant: false,
        billing_operator: false,
        auditor: false,
      },
      {
        name: 'Data Backup & Restore',
        description: 'Download JSON snapshots and restore historical backups',
        admin: true,
        accountant: false,
        billing_operator: false,
        auditor: false,
      },
      {
        name: 'Clear Master Ledger',
        description: 'Purge all master ledgers, inventory, and historical vouchers',
        admin: true,
        accountant: false,
        billing_operator: false,
        auditor: false,
      },
      {
        name: 'Audit Trail & Activity Logs',
        description: 'Inspect timestamped audit log of all system changes',
        admin: true,
        accountant: true,
        billing_operator: false,
        auditor: true,
      },
    ],
  },
];
