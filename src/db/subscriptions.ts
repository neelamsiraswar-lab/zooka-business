// src/db/subscriptions.ts
import { db, COLLECTIONS, getNextSequenceId } from './index';
import {
  Workspace,
  SubscriptionPlanTier,
  SubscriptionBillingCycle,
  SubscriptionStatus,
  SubscriptionInvoice,
  RenewalReminderLog,
} from '../types';
import { logActivity } from './dataService';
import {
  PlanTierConfig,
  getPlanConfig,
  calculateSubscriptionCost,
  getCachedSubscriptionPlans,
} from '../data/subscriptionPlans';
import { getAllSubscriptionPlans } from './subscriptionPlans';

/**
 * Helper to get available plans asynchronously with fallback
 */
async function getEffectivePlans(passedPlans?: PlanTierConfig[]): Promise<PlanTierConfig[]> {
  if (passedPlans && passedPlans.length > 0) return passedPlans;
  try {
    const fetched = await getAllSubscriptionPlans();
    if (fetched && fetched.length > 0) return fetched;
  } catch {
    // fallback
  }
  return getCachedSubscriptionPlans();
}

/**
 * Update the subscription tier and billing cycle for a workspace
 */
export async function updateSubscriptionPlan(
  workspaceId: string,
  plan: SubscriptionPlanTier,
  billingCycle: SubscriptionBillingCycle,
  updaterEmail: string = 'nawarkuldeep@gmail.com',
  availablePlans?: PlanTierConfig[]
): Promise<Workspace> {
  const wsRef = db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId);
  const snap = await wsRef.get();

  if (!snap.exists) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  const existing = snap.data() as Workspace;
  const plans = await getEffectivePlans(availablePlans);
  const planConfig = getPlanConfig(plan, plans);
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
  availablePlans?: PlanTierConfig[];
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
    availablePlans,
  } = params;

  const plans = await getEffectivePlans(availablePlans);
  const cost = calculateSubscriptionCost(plan, billingCycle, plans);
  const planConfig = getPlanConfig(plan, plans);
  const seq = await getNextSequenceId('sub_invoice_seq');
  const now = new Date();
  
  const prefix = localStorage.getItem('platform_sub_invoice_prefix') || 'SUB';
  const suffix = localStorage.getItem('platform_sub_invoice_suffix') || '2026-27';
  const padding = parseInt(localStorage.getItem('platform_sub_invoice_padding') || '4', 10);
  const nextNumStr = localStorage.getItem('platform_sub_invoice_next_num');

  const baseNum = nextNumStr && !isNaN(Number(nextNumStr)) ? Number(nextNumStr) : 42;
  const currentSeqNum = baseNum + (seq - 1);
  const invoiceNumber = `${prefix}/${suffix}/${String(currentSeqNum).padStart(padding, '0')}`;

  // Fetch workspace to determine intelligent date extension
  const wsRef = db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId);
  const snap = await wsRef.get();
  const existingWs = snap.exists ? (snap.data() as Workspace) : null;

  let baseDate = now;
  // If renewing current active plan before expiry, extend from existing currentPeriodEnd!
  if (existingWs?.currentPeriodEnd && (existingWs.plan === plan || !existingWs.plan)) {
    const existingEndMs = new Date(existingWs.currentPeriodEnd).getTime();
    if (existingEndMs > now.getTime()) {
      baseDate = new Date(existingEndMs);
    }
  }

  const periodStart = baseDate === now ? now.toISOString() : (existingWs?.currentPeriodStart || now.toISOString());
  const periodEnd = new Date(baseDate);
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
    notes: notes || `Subscription payment for ${planConfig.name} (${billingCycle === 'annual' ? 'Yearly' : 'Monthly'})`,
  };

  // Persist to subscription_invoices collection
  await db.collection('subscription_invoices').doc(newInvoice.id).set(newInvoice);

  // Update workspace subscription dates and push to local invoice list
  if (existingWs) {
    const currentInvoices = existingWs.subscriptionInvoices || [];
    const updatedInvoices = [newInvoice, ...currentInvoices].slice(0, 50);

    await wsRef.update({
      plan,
      billingCycle,
      subscriptionStatus: 'active',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd.toISOString(),
      maxUsers: planConfig.maxUsers,
      maxInvoicesPerMonth: planConfig.maxInvoicesPerMonth,
      subscriptionInvoices: updatedInvoices,
      autoRenewReminderEnabled: existingWs.autoRenewReminderEnabled ?? true,
      updatedAt: now.toISOString(),
    });
  }

  await logActivity(
    1,
    creatorEmail,
    'RECORD_SUBSCRIPTION_INVOICE',
    'subscription_invoice',
    newInvoice.id,
    `Generated Subscription Tax Invoice #${invoiceNumber} for ₹${finalTotalAmount.toLocaleString('en-IN')} (${plan.toUpperCase()} - ${billingCycle.toUpperCase()})`
  );

  return newInvoice;
}

/**
 * Dispatch an auto-renewal reminder to the workspace
 */
export async function sendWorkspaceRenewalReminder(
  workspaceId: string,
  channel: 'in_app' | 'email' | 'whatsapp' = 'email',
  senderEmail: string = 'nawarkuldeep@gmail.com',
  availablePlans?: PlanTierConfig[]
): Promise<{ success: boolean; log: RenewalReminderLog; updatedWorkspace: Workspace }> {
  const wsRef = db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId);
  const snap = await wsRef.get();
  if (!snap.exists) throw new Error(`Workspace ${workspaceId} not found`);

  const ws = snap.data() as Workspace;
  const plans = await getEffectivePlans(availablePlans);
  const planConfig = getPlanConfig(ws.plan || 'professional', plans);
  const cost = calculateSubscriptionCost(ws.plan || 'professional', ws.billingCycle || 'annual', plans);
  const now = new Date();

  let daysRemaining = 30;
  if (ws.currentPeriodEnd) {
    const diff = new Date(ws.currentPeriodEnd).getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / 86400000));
  }

  const destination = ws.renewalReminderEmail || ws.ownerEmail || ws.email || 'workspace team';
  const cycleLabel = ws.billingCycle === 'annual' ? 'Annual (Yearly)' : 'Monthly';

  const log: RenewalReminderLog = {
    id: `rem-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    date: now.toISOString(),
    daysRemaining,
    channel,
    plan: ws.plan || 'professional',
    billingCycle: ws.billingCycle || 'annual',
    amount: cost.totalAmount,
    message: `Auto-Renewal Reminder: Your ${cycleLabel} ${planConfig.name} plan renews in ${daysRemaining} day(s) for ₹${cost.totalAmount.toLocaleString('en-IN')}. Sent to ${destination}.`,
  };

  const updatedLogs = [log, ...(ws.renewalReminderLogs || [])].slice(0, 20);
  const updatedFields: Partial<Workspace> = {
    lastRenewalReminderSentAt: now.toISOString(),
    renewalReminderLogs: updatedLogs,
    updatedAt: now.toISOString(),
  };

  await wsRef.update(updatedFields);
  await logActivity(
    1,
    senderEmail,
    'SEND_SUBSCRIPTION_RENEWAL_REMINDER',
    'workspace',
    workspaceId,
    `Dispatched ${cycleLabel} renewal reminder for "${ws.businessName || ws.name}" (${daysRemaining}d remaining, ₹${cost.totalAmount.toLocaleString('en-IN')}) via ${channel}`
  );

  const updatedWorkspace: Workspace = {
    ...ws,
    ...updatedFields,
  };

  return { success: true, log, updatedWorkspace };
}

/**
 * Update auto-renewal and reminder preferences for a workspace
 */
export async function updateWorkspaceRenewalPreferences(
  workspaceId: string,
  preferences: {
    autoRenew?: boolean;
    autoRenewReminderEnabled?: boolean;
    renewalReminderEmail?: string;
    renewalReminderDays?: number[];
  },
  updaterEmail: string = 'nawarkuldeep@gmail.com'
): Promise<Workspace> {
  const wsRef = db.collection(COLLECTIONS.WORKSPACES).doc(workspaceId);
  const snap = await wsRef.get();
  if (!snap.exists) throw new Error(`Workspace ${workspaceId} not found`);

  const ws = snap.data() as Workspace;
  const updatedFields: Partial<Workspace> = {
    ...preferences,
    updatedAt: new Date().toISOString(),
  };

  await wsRef.update(updatedFields);
  await logActivity(
    1,
    updaterEmail,
    'UPDATE_RENEWAL_PREFERENCES',
    'workspace',
    workspaceId,
    `Updated subscription auto-renewal and reminder preferences for "${ws.name}"`
  );

  return {
    ...ws,
    ...updatedFields,
  };
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
