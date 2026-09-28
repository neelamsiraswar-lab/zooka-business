// src/lib/subscriptionEnforcement.ts
import { Workspace, SubscriptionPlanTier, SubscriptionBillingCycle } from '../types';
import { SUBSCRIPTION_PLANS, getPlanConfig, calculateSubscriptionCost } from '../data/subscriptionPlans';

export interface RenewalReminderEvaluation {
  shouldShowReminder: boolean;
  isYearly: boolean;
  daysRemaining: number;
  urgency: 'critical' | 'urgent' | 'warning' | 'notice' | 'normal';
  title: string;
  message: string;
  renewalDateStr: string;
  renewalAmount: number;
  annualSavings: number;
  planName: string;
  planTier: SubscriptionPlanTier;
  billingCycle: SubscriptionBillingCycle;
}

export interface SubscriptionEnforcementResult {
  /** True if the workspace is in an unrestricted good standing (active or unexpired trial) */
  isActive: boolean;
  /** True if mutations (create invoice, record expense, add party/item) are blocked */
  isBlocked: boolean;
  /** True if in past_due grace period (warning banner, but allows emergency edits) */
  isGracePeriod: boolean;
  /** Status category */
  status: 'active' | 'trial' | 'past_due' | 'expired' | 'suspended' | 'canceled' | 'cancelled';
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

  const rawStatus = (workspace.subscriptionStatus || workspace.status || 'active').toLowerCase().trim();
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

  // 2. Explicitly Canceled or Cancelled
  if (rawStatus === 'canceled' || rawStatus === 'cancelled') {
    return {
      isActive: false,
      isBlocked: true,
      isGracePeriod: false,
      status: 'cancelled',
      title: 'Workspace Subscription Canceled',
      message: 'This workspace subscription plan has ended. All historical data and GST records remain preserved for statutory compliance. Reactivate or renew your subscription to resume billing and voucher creation.',
      planTier,
      canCreateInvoices: false,
      canExportReports: true,
      canManageTeam: false,
      daysRemaining: 0,
    };
  }

  // 3. Free Plan (Never time-expires, constrained by quota)
  if (planTier === 'free') {
    return {
      isActive: true,
      isBlocked: false,
      isGracePeriod: false,
      status: 'active',
      title: 'Free Forever Plan Active',
      message: 'You are on the Free Tier (25 invoices/mo, 1 user seat). Upgrade anytime for unlimited invoices and multi-seat access.',
      planTier,
      canCreateInvoices: true,
      canExportReports: true,
      canManageTeam: false,
      daysRemaining: 9999,
    };
  }

  // 4. Expired Date
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

  // 5. Past Due (Grace Period: allow writes for 3 days, but show urgent notice)
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

  // 6. Active Trial
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

  // 7. Active Subscription
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
  actionName: 'create_invoice' | 'create_expense' | 'create_payment' | 'clear_ledger' | 'invite_member',
  currentUsage?: { invoicesCount?: number; membersCount?: number }
): { allowed: boolean; message?: string; restrictionType?: 'blocked' | 'quota_exceeded' } {
  const evaluation = evaluateSubscription(workspace);

  if (evaluation.isBlocked) {
    return {
      allowed: false,
      restrictionType: 'blocked',
      message: `${evaluation.title}: ${evaluation.message}`,
    };
  }

  const planConfig = SUBSCRIPTION_PLANS[evaluation.planTier] || getPlanConfig(evaluation.planTier);

  // Quota enforcement: Invoice limits for tiers with maxInvoicesPerMonth > 0
  if (actionName === 'create_invoice') {
    const maxAllowedInvoices =
      workspace?.maxInvoicesPerMonth !== undefined && workspace.maxInvoicesPerMonth !== 0
        ? workspace.maxInvoicesPerMonth
        : planConfig.maxInvoicesPerMonth;

    const currentInvoicesCount = currentUsage?.invoicesCount ?? workspace?.invoicesCount ?? 0;
    if (maxAllowedInvoices > 0 && currentInvoicesCount >= maxAllowedInvoices) {
      return {
        allowed: false,
        restrictionType: 'quota_exceeded',
        message: `Monthly Voucher Limit Reached: The ${planConfig.name} allows up to ${maxAllowedInvoices} vouchers per month. Upgrade to Professional or Enterprise for unlimited GST billing.`,
      };
    }
  }

  // Quota enforcement: User seat limits for tiers with maxUsers > 0
  if (actionName === 'invite_member') {
    const maxAllowedUsers =
      workspace?.maxUsers !== undefined && workspace.maxUsers !== 0
        ? workspace.maxUsers
        : planConfig.maxUsers;

    const currentMembers = currentUsage?.membersCount ?? workspace?.membersCount ?? 1;
    if (maxAllowedUsers > 0 && currentMembers >= maxAllowedUsers) {
      return {
        allowed: false,
        restrictionType: 'quota_exceeded',
        message: `User Seat Limit Reached: The ${planConfig.name} allows up to ${maxAllowedUsers} team seat(s). Upgrade to Professional or Enterprise to add more team members.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Evaluates whether an automated renewal reminder is due for the workspace,
 * particularly for yearly subscriptions (30-day early alert) and monthly renewals.
 */
export function getRenewalReminderEvaluation(
  workspace: Workspace | null | undefined
): RenewalReminderEvaluation {
  if (!workspace) {
    return {
      shouldShowReminder: false,
      isYearly: false,
      daysRemaining: 999,
      urgency: 'normal',
      title: '',
      message: '',
      renewalDateStr: '',
      renewalAmount: 0,
      annualSavings: 0,
      planName: 'Professional',
      planTier: 'professional',
      billingCycle: 'annual',
    };
  }

  const planTier = workspace.plan || 'professional';
  const billingCycle = workspace.billingCycle || 'annual';
  const isYearly = billingCycle === 'annual';

  if (planTier === 'free') {
    return {
      shouldShowReminder: false,
      isYearly: false,
      daysRemaining: 9999,
      urgency: 'normal',
      title: '',
      message: '',
      renewalDateStr: '',
      renewalAmount: 0,
      annualSavings: 0,
      planName: 'Free Forever',
      planTier: 'free',
      billingCycle,
    };
  }

  const rawStatus = (workspace.subscriptionStatus || workspace.status || 'active').toLowerCase().trim();
  if (rawStatus === 'suspended' || rawStatus === 'canceled' || rawStatus === 'cancelled') {
    return {
      shouldShowReminder: false,
      isYearly,
      daysRemaining: 0,
      urgency: 'normal',
      title: '',
      message: '',
      renewalDateStr: '',
      renewalAmount: 0,
      annualSavings: 0,
      planName: getPlanConfig(planTier).name,
      planTier,
      billingCycle,
    };
  }

  const planConfig = SUBSCRIPTION_PLANS[planTier] || getPlanConfig(planTier);
  const cost = calculateSubscriptionCost(planTier, billingCycle);
  const renewalAmount = cost.totalAmount;
  const annualSavings = cost.annualSavings;

  const expiryTimestamp = workspace.currentPeriodEnd || workspace.trialEndsAt;
  let daysRemaining = 365;
  let renewalDateStr = 'Current Term End';

  if (expiryTimestamp) {
    const endMs = new Date(expiryTimestamp).getTime();
    const nowMs = Date.now();
    const diffMs = endMs - nowMs;
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    renewalDateStr = new Date(expiryTimestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // Renewal reminder thresholds:
  // For yearly plans: remind when <= 30 days remaining! (Auto-reminder for yearly renewal)
  // For monthly plans: remind when <= 7 days remaining
  // If expired or past_due, always remind.
  const thresholdDays = isYearly ? 30 : 7;
  const isExpiringSoon = daysRemaining <= thresholdDays;
  const isExpired = daysRemaining <= 0;

  if (!isExpiringSoon && !isExpired && rawStatus !== 'past_due') {
    return {
      shouldShowReminder: false,
      isYearly,
      daysRemaining,
      urgency: 'normal',
      title: `${isYearly ? 'Annual' : 'Monthly'} Subscription Active`,
      message: `Your ${isYearly ? 'annual' : 'monthly'} subscription is active until ${renewalDateStr}.`,
      renewalDateStr,
      renewalAmount,
      annualSavings,
      planName: planConfig.name,
      planTier,
      billingCycle,
    };
  }

  let urgency: 'critical' | 'urgent' | 'warning' | 'notice' = 'notice';
  if (isExpired) {
    urgency = 'critical';
  } else if (daysRemaining <= 1) {
    urgency = 'critical';
  } else if (daysRemaining <= (isYearly ? 7 : 3)) {
    urgency = 'urgent';
  } else if (daysRemaining <= (isYearly ? 14 : 5)) {
    urgency = 'warning';
  } else {
    urgency = 'notice';
  }

  let title = '';
  let message = '';

  if (isYearly) {
    if (isExpired) {
      title = 'Annual Subscription Expired - Immediate Renewal Required';
      message = `Your Annual ${planConfig.name} plan for ${workspace.businessName} expired ${Math.abs(daysRemaining)} day(s) ago on ${renewalDateStr}. Renew now to restore full GST billing, team access, and cloud sync.`;
    } else if (daysRemaining <= 1) {
      title = 'Annual Subscription Renews Tomorrow';
      message = `Final Auto-Reminder: Your 1-Year ${planConfig.name} subscription renews on ${renewalDateStr}. Settle ₹${renewalAmount.toLocaleString('en-IN')} to prevent service interruption.`;
    } else if (daysRemaining <= 7) {
      title = `Annual Subscription Renewal Notice (${daysRemaining} Days Left)`;
      message = `Auto-Reminder: Your Annual ${planConfig.name} subscription for ${workspace.businessName} expires in ${daysRemaining} days on ${renewalDateStr}. Renew your yearly plan now (Save ₹${annualSavings.toLocaleString('en-IN')} with annual rate).`;
    } else {
      title = `Upcoming Annual Renewal in ${daysRemaining} Days`;
      message = `Auto-Reminder to Workspace: Your yearly ${planConfig.name} subscription is scheduled for renewal on ${renewalDateStr}. Renew early to lock in your discounted annual pricing of ₹${renewalAmount.toLocaleString('en-IN')}/year.`;
    }
  } else {
    // Monthly
    if (isExpired) {
      title = 'Monthly Subscription Expired';
      message = `Your Monthly ${planConfig.name} subscription expired ${Math.abs(daysRemaining)} day(s) ago. Please pay ₹${renewalAmount.toLocaleString('en-IN')} to renew your monthly plan.`;
    } else if (daysRemaining <= 1) {
      title = 'Monthly Subscription Renews Tomorrow';
      message = `Auto-Reminder: Your Monthly ${planConfig.name} subscription is due tomorrow (${renewalDateStr}). Pay monthly subscription of ₹${renewalAmount.toLocaleString('en-IN')} or switch to Yearly to save 17%.`;
    } else {
      title = `Monthly Subscription Renewal in ${daysRemaining} Days`;
      message = `Auto-Reminder: Your monthly billing period ends in ${daysRemaining} days on ${renewalDateStr}. Pay ₹${renewalAmount.toLocaleString('en-IN')} to continue or switch to Yearly for auto-reminders and savings.`;
    }
  }

  return {
    shouldShowReminder: true,
    isYearly,
    daysRemaining,
    urgency,
    title,
    message,
    renewalDateStr,
    renewalAmount,
    annualSavings,
    planName: planConfig.name,
    planTier,
    billingCycle,
  };
}

