// src/lib/subscriptionEnforcement.ts
import { Workspace, SubscriptionPlanTier } from '../types';
import { SUBSCRIPTION_PLANS, getPlanConfig } from '../data/subscriptionPlans';

export interface SubscriptionEnforcementResult {
  /** True if the workspace is in an unrestricted good standing (active or unexpired trial) */
  isActive: boolean;
  /** True if mutations (create invoice, record expense, add party/item) are blocked */
  isBlocked: boolean;
  /** True if in past_due grace period (warning banner, but allows emergency edits) */
  isGracePeriod: boolean;
  /** Status category */
  status: 'active' | 'trial' | 'past_due' | 'expired' | 'suspended' | 'canceled';
  /** Human friendly headline */
  title: string;
  /** Explanation and resolution guidance */
  message: string;
  /** Plan tier config */
  planTier: SubscriptionPlanTier;
  /** Can create new sales & purchase invoices */
  canCreateInvoices: boolean;
  /** Can export GST returns and audit balance sheets */
  canExportReports: boolean;
  /** Can invite new team members */
  canManageTeam: boolean;
  /** Days remaining until expiry / renewal */
  daysRemaining: number;
}

/**
 * Evaluates the full subscription access permissions for a given workspace.
 */
export function evaluateSubscription(workspace: Workspace | null | undefined): SubscriptionEnforcementResult {
  // If workspace is null or undefined (e.g. initial load before db responds), allow safe reading
  if (!workspace) {
    return {
      isActive: true,
      isBlocked: false,
      isGracePeriod: false,
      status: 'active',
      title: 'Workspace Active',
      message: 'Workspace in good standing.',
      planTier: 'professional',
      canCreateInvoices: true,
      canExportReports: true,
      canManageTeam: true,
      daysRemaining: 365,
    };
  }

  const rawStatus = (workspace.subscriptionStatus || workspace.status || 'active').toLowerCase();
  const planTier: SubscriptionPlanTier = workspace.plan || 'professional';

  // Expiry timestamp check
  const expiryTimestamp = workspace.currentPeriodEnd || workspace.trialEndsAt;
  let isDateExpired = false;
  let daysRemaining = 999;

  if (expiryTimestamp) {
    const endMs = new Date(expiryTimestamp).getTime();
    const nowMs = Date.now();
    const diffMs = endMs - nowMs;
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffMs <= 0) {
      isDateExpired = true;
    }
  }

  // 1. Explicitly Suspended
  if (rawStatus === 'suspended' || workspace.status === 'suspended') {
    return {
      isActive: false,
      isBlocked: true,
      isGracePeriod: false,
      status: 'suspended',
      title: 'Workspace Subscription Suspended',
      message: 'This corporate workspace has been suspended by the platform administrator or due to unresolved payment issues. Creation of new vouchers, expenses, and inventory items is locked. Historical books remain readable.',
      planTier,
      canCreateInvoices: false,
      canExportReports: true,
      canManageTeam: false,
      daysRemaining: 0,
    };
  }

  // 2. Explicitly Canceled
  if (rawStatus === 'canceled') {
    return {
      isActive: false,
      isBlocked: true,
      isGracePeriod: false,
      status: 'canceled',
      title: 'Workspace Subscription Canceled',
      message: 'This workspace subscription plan has ended. All historical data and GST records remain preserved for statutory compliance. Reactivate or renew your subscription to resume billing and voucher creation.',
      planTier,
      canCreateInvoices: false,
      canExportReports: true,
      canManageTeam: false,
      daysRemaining: 0,
    };
  }

  // 3. Expired Date
  if (isDateExpired) {
    return {
      isActive: false,
      isBlocked: true,
      isGracePeriod: false,
      status: 'expired',
      title: 'Subscription Period Expired',
      message: `Your ${planTier.toUpperCase()} subscription validity expired ${Math.abs(daysRemaining)} day(s) ago. To continue issuing invoices and managing books, please renew your subscription in Company Settings.`,
      planTier,
      canCreateInvoices: false,
      canExportReports: true,
      canManageTeam: false,
      daysRemaining,
    };
  }

  // 4. Past Due (Grace Period: allow writes for 3 days, but show urgent notice)
  if (rawStatus === 'past_due') {
    return {
      isActive: false,
      isBlocked: false, // Still in grace period
      isGracePeriod: true,
      status: 'past_due',
      title: 'Payment Past Due (Grace Period Active)',
      message: 'Payment for your subscription renewal is pending. Your workspace remains functional during the 3-day grace period. Please settle the outstanding invoice to avoid service interruption.',
      planTier,
      canCreateInvoices: true,
      canExportReports: true,
      canManageTeam: true,
      daysRemaining: Math.max(0, daysRemaining),
    };
  }

  // 5. Active Trial
  if (rawStatus === 'trial' || workspace.status === 'trial') {
    return {
      isActive: true,
      isBlocked: false,
      isGracePeriod: false,
      status: 'trial',
      title: 'Complimentary Trial Active',
      message: `You are on an all-inclusive Enterprise evaluation trial with ${daysRemaining} day(s) remaining. Upgrade before trial expiry to retain uninterrupted service.`,
      planTier,
      canCreateInvoices: true,
      canExportReports: true,
      canManageTeam: true,
      daysRemaining,
    };
  }

  // 6. Active Subscription
  return {
    isActive: true,
    isBlocked: false,
    isGracePeriod: false,
    status: 'active',
    title: 'Subscription Active',
    message: `Workspace subscription is active under the ${planTier.toUpperCase()} tier.`,
    planTier,
    canCreateInvoices: true,
    canExportReports: true,
    canManageTeam: true,
    daysRemaining,
  };
}

/**
 * Checks if a specific action is permitted under the workspace's subscription state and limits.
 */
export function canPerformTransactionalAction(
  workspace: Workspace | null | undefined,
  actionName: 'create_invoice' | 'create_expense' | 'create_payment' | 'clear_ledger' | 'invite_member'
): { allowed: boolean; message?: string; restrictionType?: 'blocked' | 'quota_exceeded' } {
  const evaluation = evaluateSubscription(workspace);

  if (evaluation.isBlocked) {
    return {
      allowed: false,
      restrictionType: 'blocked',
      message: `${evaluation.title}: ${evaluation.message}`,
    };
  }

  // Quota enforcement: Starter plan voucher limits
  if (actionName === 'create_invoice' && evaluation.planTier === 'starter') {
    const starterConfig = SUBSCRIPTION_PLANS.starter;
    const currentInvoicesCount = workspace?.invoicesCount || 0;
    if (starterConfig.maxInvoicesPerMonth > 0 && currentInvoicesCount >= starterConfig.maxInvoicesPerMonth) {
      return {
        allowed: false,
        restrictionType: 'quota_exceeded',
        message: `Monthly Voucher Limit Reached: The Starter plan allows up to ${starterConfig.maxInvoicesPerMonth} vouchers per month. Upgrade to Professional or Enterprise for unlimited GST billing.`,
      };
    }
  }

  return { allowed: true };
}
