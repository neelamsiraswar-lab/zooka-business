// src/db/workspaces.ts
import { db, COLLECTIONS, getNextSequenceId } from './index';
import { Workspace } from '../types';
import { logActivity } from './dataService';
import { getPlatformSettings } from './platformSettings';

export const ACTIVE_WORKSPACE_KEY = 'apex_gst_active_workspace_id';

export function getActiveWorkspaceId(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  return '';
}

export function setActiveWorkspaceId(workspaceId: string): void {
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  } catch {
    // ignore
  }
}

export async function getActiveWorkspace(): Promise<Workspace | null> {
  const activeId = getActiveWorkspaceId();
  const all = await getAllWorkspaces();
  if (!all || all.length === 0) return null;
  const found = (activeId ? all.find((w) => w.id === activeId) : null) || all[0] || null;
  return found;
}

export async function getAllWorkspaces(): Promise<Workspace[]> {
  try {
    const workspacesRef = db.collection(COLLECTIONS.WORKSPACES);
    const snap = await workspacesRef.get();

    if (snap.empty) {
      return [];
    }

    const list: Workspace[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      // Skip any legacy default workspace
      if (d.id === 'default-workspace' || data.slug === 'primary-enterprise') {
        continue;
      }
      list.push({
        id: d.id,
        numericId: data.numericId || 1,
        name: data.name || data.businessName || 'Workspace',
        slug: data.slug || d.id,
        businessName: data.businessName || data.name || 'Business Entity',
        tradeName: data.tradeName || '',
        gstin: data.gstin || '',
        stateCode: data.stateCode || '27',
        stateName: data.stateName || 'Maharashtra',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        bankName: data.bankName || '',
        accountNumber: data.accountNumber || '',
        ifscCode: data.ifscCode || '',
        upiId: data.upiId || '',
        ownerEmail: data.ownerEmail || '',
        ownerName: data.ownerName || '',
        plan: data.plan || 'professional',
        status: data.status || 'active',
        isDefault: false,
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
      });
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to get all workspaces from Firestore:', err);
    return [];
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
