// src/db/workspaces.ts
import { db, COLLECTIONS, getNextSequenceId } from './index';
import { Workspace } from '../types';
import { logActivity } from './dataService';

export const ACTIVE_WORKSPACE_KEY = 'apex_gst_active_workspace_id';

export const DEFAULT_WORKSPACE_DATA: Omit<Workspace, 'id' | 'createdAt'> = {
  numericId: 1,
  name: 'Apex Enterprises (Primary)',
  slug: 'apex-primary',
  businessName: 'Apex Enterprises Pvt Ltd',
  tradeName: 'Apex GST Accounting & Solutions',
  gstin: '27AAECB9382M1ZR',
  stateCode: '27',
  stateName: 'Maharashtra',
  address: 'Plot 42, Bandra-Kurla Complex, Bandra East, Mumbai, Maharashtra 400051',
  phone: '+91 98201 23456',
  email: 'accounts@apexenterprises.in',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200084920192',
  ifscCode: 'HDFC0000240',
  upiId: 'apexenterprises@hdfcbank',
  ownerEmail: 'nawarkuldeep@gmail.com',
  ownerName: 'Kuldeep Siraswar',
  plan: 'enterprise',
  status: 'active',
  isDefault: true,
  invoicePrefix: 'INV/2026-27/',
  purchasePrefix: 'PUR/2026-27/',
  receiptPrefix: 'REC/2026-27/',
  membersCount: 4,
  invoicesCount: 12,
  billingCycle: 'annual',
  subscriptionStatus: 'active',
  currentPeriodStart: '2026-04-01T00:00:00.000Z',
  currentPeriodEnd: '2027-03-31T23:59:59.000Z',
  maxUsers: -1,
  maxInvoicesPerMonth: -1,
};

export function getActiveWorkspaceId(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  return 'default-workspace';
}

export function setActiveWorkspaceId(workspaceId: string): void {
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  } catch {
    // ignore
  }
}

export async function getActiveWorkspace(): Promise<Workspace> {
  const activeId = getActiveWorkspaceId();
  const all = await getAllWorkspaces();
  const found = all.find((w) => w.id === activeId) || all.find((w) => w.isDefault) || all[0];
  return found;
}

export async function getAllWorkspaces(): Promise<Workspace[]> {
  try {
    const workspacesRef = db.collection(COLLECTIONS.WORKSPACES);
    const snap = await workspacesRef.get();

    if (snap.empty) {
      // Initialize default primary workspace in Firestore
      const now = new Date().toISOString();
      const defaultWorkspace: Workspace = {
        ...DEFAULT_WORKSPACE_DATA,
        id: 'default-workspace',
        createdAt: now,
        updatedAt: now,
      };

      await workspacesRef.doc('default-workspace').set(defaultWorkspace);
      return [defaultWorkspace];
    }

    const list: Workspace[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        numericId: data.numericId || 1,
        name: data.name || data.businessName || 'Workspace',
        slug: data.slug || d.id,
        businessName: data.businessName || data.name || 'Business Entity',
        tradeName: data.tradeName || '',
        gstin: data.gstin || '27AAECB9382M1ZR',
        stateCode: data.stateCode || '27',
        stateName: data.stateName || 'Maharashtra',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        ifscCode: data.ifscCode || '',
        upiId: data.upiId || '',
        ownerEmail: data.ownerEmail || 'nawarkuldeep@gmail.com',
        ownerName: data.ownerName || 'Admin',
        plan: data.plan || 'professional',
        status: data.status || 'active',
        isDefault: !!data.isDefault,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
        invoicePrefix: data.invoicePrefix || 'INV/2026-27/',
        purchasePrefix: data.purchasePrefix || 'PUR/2026-27/',
        receiptPrefix: data.receiptPrefix || 'REC/2026-27/',
        membersCount: typeof data.membersCount === 'number' ? data.membersCount : 1,
        invoicesCount: typeof data.invoicesCount === 'number' ? data.invoicesCount : 0,
        billingCycle: data.billingCycle || 'annual',
        subscriptionStatus: data.subscriptionStatus || (data.status === 'suspended' ? 'suspended' : 'active'),
        currentPeriodStart: data.currentPeriodStart || data.createdAt || new Date().toISOString(),
        currentPeriodEnd: data.currentPeriodEnd || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        trialEndsAt: data.trialEndsAt,
        cancelAtPeriodEnd: !!data.cancelAtPeriodEnd,
        autoRenew: data.autoRenew !== false,
        maxUsers: data.maxUsers,
        maxInvoicesPerMonth: data.maxInvoicesPerMonth,
        subscriptionInvoices: data.subscriptionInvoices || [],
      };
    });

    // Sort: Default first, then recently created
    return list.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (err) {
    console.error('Failed to get all workspaces from Firestore:', err);
    return [
      {
        ...DEFAULT_WORKSPACE_DATA,
        id: 'default-workspace',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  try {
    const docRef = db.collection(COLLECTIONS.WORKSPACES).doc(id);
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data() as Workspace;
    }
  } catch (err) {
    console.error(`Failed to get workspace ${id}:`, err);
  }
  return null;
}

export async function createWorkspace(
  data: Partial<Workspace>,
  creatorEmail: string = 'nawarkuldeep@gmail.com'
): Promise<Workspace> {
  const nextNumericId = await getNextSequenceId('workspace_id');
  const slug = (data.slug || data.name || `workspace-${nextNumericId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const id = `ws-${slug || nextNumericId}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const newWorkspace: Workspace = {
    id,
    numericId: nextNumericId,
    name: (data.name || data.businessName || 'New Workspace').trim(),
    slug,
    businessName: (data.businessName || data.name || 'New Enterprise').trim(),
    tradeName: (data.tradeName || '').trim(),
    gstin: (data.gstin || '').toUpperCase().trim(),
    stateCode: data.stateCode || (data.gstin ? data.gstin.substring(0, 2) : '27'),
    stateName: data.stateName || 'Maharashtra',
    address: (data.address || '').trim(),
    phone: (data.phone || '').trim(),
    email: (data.email || creatorEmail).trim(),
    bankName: (data.bankName || '').trim(),
    accountNumber: (data.accountNumber || '').trim(),
    ifscCode: (data.ifscCode || '').toUpperCase().trim(),
    upiId: (data.upiId || '').trim(),
    ownerEmail: (data.ownerEmail || creatorEmail).toLowerCase().trim(),
    ownerName: (data.ownerName || 'Workspace Owner').trim(),
    plan: data.plan || 'professional',
    status: data.status || 'active',
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    invoicePrefix: data.invoicePrefix || `${slug.substring(0, 4).toUpperCase()}/2026-27/`,
    purchasePrefix: data.purchasePrefix || `${slug.substring(0, 4).toUpperCase()}-PUR/2026-27/`,
    receiptPrefix: data.receiptPrefix || `${slug.substring(0, 4).toUpperCase()}-REC/2026-27/`,
    membersCount: 1,
    invoicesCount: 0,
    billingCycle: data.billingCycle || 'annual',
    subscriptionStatus: data.subscriptionStatus || (data.status === 'suspended' ? 'suspended' : 'active'),
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    trialEndsAt: data.trialEndsAt,
    cancelAtPeriodEnd: false,
    autoRenew: true,
    maxUsers: data.plan === 'starter' ? 2 : data.plan === 'enterprise' ? -1 : 10,
    maxInvoicesPerMonth: data.plan === 'starter' ? 150 : -1,
    subscriptionInvoices: [],
  };

  await db.collection(COLLECTIONS.WORKSPACES).doc(id).set(newWorkspace);

  // Also initialize a corresponding company profile doc for this workspace
  try {
    const profileId = await getNextSequenceId('company_profile_id');
    const companyProfileDoc = {
      id: profileId,
      workspaceId: id,
      businessName: newWorkspace.businessName,
      tradeName: newWorkspace.tradeName,
      gstin: newWorkspace.gstin,
      stateCode: newWorkspace.stateCode,
      stateName: newWorkspace.stateName,
      address: newWorkspace.address,
      phone: newWorkspace.phone,
      email: newWorkspace.email,
      bankName: newWorkspace.bankName,
      accountNumber: newWorkspace.accountNumber,
      ifscCode: newWorkspace.ifscCode,
      upiId: newWorkspace.upiId,
      invoiceNumberingMode: 'automatic',
      invoicePrefix: newWorkspace.invoicePrefix,
      nextInvoiceNumber: 1,
      invoicePadding: 3,
      purchaseNumberingMode: 'automatic',
      purchasePrefix: newWorkspace.purchasePrefix,
      nextPurchaseNumber: 1,
      receiptPrefix: newWorkspace.receiptPrefix,
      nextReceiptNumber: 1,
      invoiceDesignTemplate: 'modern',
      invoiceColorTheme: 'emerald',
      updatedAt: now,
    };
    await db.collection(COLLECTIONS.COMPANY_PROFILES).doc(String(profileId)).set(companyProfileDoc);
  } catch (err) {
    console.error('Failed to write company profile for new workspace:', err);
  }

  await logActivity(
    1,
    creatorEmail,
    'create_workspace',
    'workspace',
    id,
    `Super Admin created new workspace "${newWorkspace.name}" (GSTIN: ${newWorkspace.gstin || 'Unregistered'}, Plan: ${newWorkspace.plan.toUpperCase()})`
  );

  return newWorkspace;
}

export async function updateWorkspace(
  id: string,
  data: Partial<Workspace>,
  updaterEmail: string = 'nawarkuldeep@gmail.com'
): Promise<Workspace> {
  const workspacesRef = db.collection(COLLECTIONS.WORKSPACES);
  const docRef = workspacesRef.doc(id);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new Error(`Workspace with ID ${id} not found.`);
  }

  const existing = snap.data() as Workspace;
  const updated: Workspace = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(updated, { merge: true });

  await logActivity(
    1,
    updaterEmail,
    'update_workspace',
    'workspace',
    id,
    `Super Admin updated workspace "${updated.name}" settings and status: ${updated.status}`
  );

  return updated;
}

export async function deleteWorkspace(
  id: string,
  operatorEmail: string = 'nawarkuldeep@gmail.com'
): Promise<void> {
  const docRef = db.collection(COLLECTIONS.WORKSPACES).doc(id);
  const snap = await docRef.get();
  if (snap.exists) {
    const data = snap.data() as Workspace;
    if (data.isDefault) {
      throw new Error('The primary default workspace cannot be deleted.');
    }
  }

  await docRef.delete();

  await logActivity(
    1,
    operatorEmail,
    'delete_workspace',
    'workspace',
    id,
    `Super Admin deleted workspace ID ${id}`
  );
}
