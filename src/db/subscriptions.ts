// src/db/subscriptions.ts
import { db, COLLECTIONS, getNextSequenceId } from './index';
import {
  Workspace,
  SubscriptionPlanTier,
  SubscriptionBillingCycle,
  SubscriptionStatus,
  SubscriptionInvoice,
} from '../types';
import { logActivity } from './dataService';
import { getPlanConfig, calculateSubscriptionCost } from '../data/subscriptionPlans';

/**
 * Update the subscription tier and billing cycle for a workspace
 */
export async function updateSubscriptionPlan(
  workspaceId: string,
  plan: SubscriptionPlanTier,
  billingCycle: SubscriptionBillingCycle,
  updaterEmail: string = 'nawarkuldeep@gmail.com'
): Promise<Workspace> {
  const wsRef = db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId);
  const snap = await wsRef.get();

  if (!snap.exists) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  const existing = snap.data() as Workspace;
  const planConfig = getPlanConfig(plan);
  const now = new Date();
  
  // Calculate new period end based on cycle
  const currentPeriodStart = now.toISOString();
  const periodEnd = new Date(now);
  if (billingCycle === 'annual') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  const currentPeriodEnd = periodEnd.toISOString();

  const updatedFields: Partial<Workspace> = {
    plan,
    billingCycle,
    subscriptionStatus: 'active',
    status: 'active',
    currentPeriodStart,
    currentPeriodEnd,
    maxUsers: planConfig.maxUsers,
    maxInvoicesPerMonth: planConfig.maxInvoicesPerMonth,
    updatedAt: now.toISOString(),
  };

  await wsRef.update(updatedFields);

  const updated: Workspace = {
    ...existing,
    ...updatedFields,
  };

  await logActivity(
    1,
    updaterEmail,
    'UPDATE_SUBSCRIPTION_PLAN',
    'workspace',
    workspaceId,
    `Updated workspace "${existing.name}" plan to ${plan.toUpperCase()} (${billingCycle.toUpperCase()}) through ${periodEnd.toLocaleDateString('en-IN')}`
  );

  return updated;
}

/**
 * Extend the subscription or trial validity period by N days
 */
export async function extendSubscriptionPeriod(
  workspaceId: string,
  additionalDays: number,
  updaterEmail: string = 'nawarkuldeep@gmail.com'
): Promise<Workspace> {
  const wsRef = db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId);
  const snap = await wsRef.get();

  if (!snap.exists) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  const existing = snap.data() as Workspace;
  const currentEnd = existing.currentPeriodEnd || existing.trialEndsAt;
  const baseDate = currentEnd && new Date(currentEnd).getTime() > Date.now()
    ? new Date(currentEnd)
    : new Date();

  baseDate.setDate(baseDate.getDate() + additionalDays);
  const newPeriodEnd = baseDate.toISOString();

  const updatedFields: Partial<Workspace> = {
    currentPeriodEnd: newPeriodEnd,
    subscriptionStatus: 'active',
    status: 'active',
    updatedAt: new Date().toISOString(),
  };

  await wsRef.update(updatedFields);

  await logActivity(
    1,
    updaterEmail,
    'EXTEND_SUBSCRIPTION',
    'workspace',
    workspaceId,
    `Extended subscription for "${existing.name}" by +${additionalDays} days (New expiry: ${baseDate.toLocaleDateString('en-IN')})`
  );

  return {
    ...existing,
    ...updatedFields,
  };
}

/**
 * Change workspace subscription status (active, trial, past_due, suspended, cancelled)
 */
export async function updateSubscriptionStatus(
  workspaceId: string,
  status: SubscriptionStatus,
  updaterEmail: string = 'nawarkuldeep@gmail.com'
): Promise<Workspace> {
  const wsRef = db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId);
  const snap = await wsRef.get();

  if (!snap.exists) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  const existing = snap.data() as Workspace;
  const now = new Date().toISOString();

  const updatedFields: Partial<Workspace> = {
    subscriptionStatus: status,
    status: status === 'suspended' ? 'suspended' : 'active',
    updatedAt: now,
  };

  await wsRef.update(updatedFields);

  await logActivity(
    1,
    updaterEmail,
    'UPDATE_SUBSCRIPTION_STATUS',
    'workspace',
    workspaceId,
    `Changed subscription status for "${existing.name}" to ${status.toUpperCase()}`
  );

  return {
    ...existing,
    ...updatedFields,
  };
}

/**
 * Record a subscription payment and issue a GST Tax Invoice receipt
 */
export async function recordSubscriptionInvoice(params: {
  workspaceId: string;
  plan: SubscriptionPlanTier;
  billingCycle: SubscriptionBillingCycle;
  paymentMethod: SubscriptionInvoice['paymentMethod'];
  transactionReference?: string;
  notes?: string;
  creatorEmail?: string;
  baseAmountOverride?: number;
  taxAmountOverride?: number;
  totalAmountOverride?: number;
}): Promise<SubscriptionInvoice> {
  const {
    workspaceId,
    plan,
    billingCycle,
    paymentMethod,
    transactionReference = `TXN-${Date.now().toString(36).toUpperCase()}`,
    notes = '',
    creatorEmail = 'nawarkuldeep@gmail.com',
    baseAmountOverride,
    taxAmountOverride,
    totalAmountOverride,
  } = params;

  const cost = calculateSubscriptionCost(plan, billingCycle);
  const seq = await getNextSequenceId('sub_invoice_seq');
  const now = new Date();
  
  const prefix = localStorage.getItem('platform_sub_invoice_prefix') || 'SUB';
  const suffix = localStorage.getItem('platform_sub_invoice_suffix') || '2026-27';
  const padding = parseInt(localStorage.getItem('platform_sub_invoice_padding') || '4', 10);
  const nextNumStr = localStorage.getItem('platform_sub_invoice_next_num');

  const baseNum = nextNumStr && !isNaN(Number(nextNumStr)) ? Number(nextNumStr) : 42;
  const currentSeqNum = baseNum + (seq - 1);
  const invoiceNumber = `${prefix}/${suffix}/${String(currentSeqNum).padStart(padding, '0')}`;

  const periodStart = now.toISOString();
  const periodEnd = new Date(now);
  if (billingCycle === 'annual') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const finalBaseAmount = baseAmountOverride !== undefined ? baseAmountOverride : cost.baseAmount;
  const finalTaxAmount = taxAmountOverride !== undefined ? taxAmountOverride : cost.gstAmount;
  const finalTotalAmount = totalAmountOverride !== undefined ? totalAmountOverride : cost.totalAmount;

  const newInvoice: SubscriptionInvoice = {
    id: `sub-inv-${seq}-${Date.now().toString(36)}`,
    workspaceId,
    invoiceNumber,
    date: now.toISOString(),
    plan,
    billingCycle,
    baseAmount: finalBaseAmount,
    gstRate: cost.gstRate,
    taxAmount: finalTaxAmount,
    totalAmount: finalTotalAmount,
    status: 'paid',
    paymentMethod,
    transactionReference,
    periodStart,
    periodEnd: periodEnd.toISOString(),
    notes: notes || `Subscription renewal for ${getPlanConfig(plan).name} (${billingCycle})`,
  };

  // Persist to subscription_invoices collection
  await db.collection('subscription_invoices').doc(newInvoice.id).set(newInvoice);

  // Update workspace subscription dates and push to local invoice list
  const wsRef = db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId);
  const snap = await wsRef.get();
  if (snap.exists) {
    const ws = snap.data() as Workspace;
    const currentInvoices = ws.subscriptionInvoices || [];
    const updatedInvoices = [newInvoice, ...currentInvoices].slice(0, 50);

    await wsRef.update({
      plan,
      billingCycle,
      subscriptionStatus: 'active',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd.toISOString(),
      subscriptionInvoices: updatedInvoices,
      updatedAt: now.toISOString(),
    });
  }

  await logActivity(
    1,
    creatorEmail,
    'RECORD_SUBSCRIPTION_INVOICE',
    'subscription_invoice',
    newInvoice.id,
    `Generated Subscription Tax Invoice #${invoiceNumber} for ₹${cost.totalAmount.toLocaleString('en-IN')} (Plan: ${plan.toUpperCase()})`
  );

  return newInvoice;
}

/**
 * Fetch all subscription invoices for a workspace or platform-wide
 */
export async function getSubscriptionInvoices(workspaceId?: string): Promise<SubscriptionInvoice[]> {
  try {
    const ref = db.collection('subscription_invoices');
    const snap = await ref.get();
    
    let list: SubscriptionInvoice[] = snap.docs.map((d) => d.data() as SubscriptionInvoice);
    
    if (workspaceId) {
      list = list.filter((inv) => inv.workspaceId === workspaceId);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    console.error('Failed to get subscription invoices from Firestore:', err);
    return [];
  }
}

/**
 * Seed initial sample invoices if a workspace has none
 */
export function getSampleSubscriptionInvoices(workspace: Workspace): SubscriptionInvoice[] {
  if (workspace.subscriptionInvoices && workspace.subscriptionInvoices.length > 0) {
    return workspace.subscriptionInvoices;
  }

  const cost = calculateSubscriptionCost(workspace.plan || 'professional', workspace.billingCycle || 'annual');
  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setMonth(pastDate.getMonth() - 2);

  return [
    {
      id: `sub-init-${workspace.id}-1`,
      workspaceId: workspace.id,
      invoiceNumber: `SUB/2026-27/0042`,
      date: pastDate.toISOString(),
      plan: workspace.plan || 'professional',
      billingCycle: workspace.billingCycle || 'annual',
      baseAmount: cost.baseAmount,
      gstRate: 18,
      taxAmount: cost.gstAmount,
      totalAmount: cost.totalAmount,
      status: 'paid',
      paymentMethod: 'UPI',
      transactionReference: 'UPI/619284019284',
      periodStart: pastDate.toISOString(),
      periodEnd: new Date(pastDate.getTime() + 365 * 24 * 3600 * 1000).toISOString(),
      notes: `Annual subscription renewal for ${workspace.businessName}`,
    },
  ];
}
