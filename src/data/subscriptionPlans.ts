// src/data/subscriptionPlans.ts
import { SubscriptionPlanTier, SubscriptionBillingCycle, SubscriptionStatus, Workspace } from '../types';

export interface PlanFeature {
  name: string;
  free?: boolean | string;
  starter: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
  tooltip?: string;
}

export interface PlanTierConfig {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  popular?: boolean;
  isBuiltIn?: boolean;
  status?: 'active' | 'archived' | 'draft';
  monthlyPrice: number;
  annualPrice: number; // total for the year
  monthlyEquivalentAnnual: number;
  maxUsers: number; // -1 for unlimited
  maxInvoicesPerMonth: number; // -1 for unlimited
  maxLedgers: number;
  maxBranches: number;
  features: string[];
  color: {
    badge: string;
    border: string;
    gradient: string;
    text: string;
    accent: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const PLAN_COLOR_PRESETS: Record<string, {
  name: string;
  badge: string;
  border: string;
  gradient: string;
  text: string;
  accent: string;
}> = {
  indigo: {
    name: 'Royal Indigo',
    badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    border: 'border-indigo-500/40 hover:border-indigo-500/60 shadow-lg shadow-indigo-500/10',
    gradient: 'from-slate-900 via-indigo-950/30 to-slate-900',
    text: 'text-indigo-400',
    accent: 'text-indigo-300',
  },
  emerald: {
    name: 'Emerald Growth',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    border: 'border-emerald-500/40 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/10',
    gradient: 'from-slate-900 via-emerald-950/20 to-slate-900',
    text: 'text-emerald-400',
    accent: 'text-emerald-300',
  },
  purple: {
    name: 'Purple Premium',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    border: 'border-purple-500/40 hover:border-purple-500/60 shadow-lg shadow-purple-500/10',
    gradient: 'from-slate-900 via-purple-950/25 to-slate-900',
    text: 'text-purple-400',
    accent: 'text-purple-300',
  },
  sky: {
    name: 'Sky Dynamic',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    border: 'border-sky-500/40 hover:border-sky-500/60 shadow-lg shadow-sky-500/10',
    gradient: 'from-slate-900 via-sky-950/20 to-slate-900',
    text: 'text-sky-400',
    accent: 'text-sky-300',
  },
  amber: {
    name: 'Amber Elite',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    border: 'border-amber-500/40 hover:border-amber-500/60 shadow-lg shadow-amber-500/10',
    gradient: 'from-slate-900 via-amber-950/20 to-slate-900',
    text: 'text-amber-400',
    accent: 'text-amber-300',
  },
  rose: {
    name: 'Rose Enterprise',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    border: 'border-rose-500/40 hover:border-rose-500/60 shadow-lg shadow-rose-500/10',
    gradient: 'from-slate-900 via-rose-950/20 to-slate-900',
    text: 'text-rose-400',
    accent: 'text-rose-300',
  },
  slate: {
    name: 'Slate Minimal',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    border: 'border-slate-800 hover:border-slate-700',
    gradient: 'from-slate-900 to-slate-950',
    text: 'text-slate-300',
    accent: 'text-slate-400',
  },
};

export const SUBSCRIPTION_PLANS: Record<string, PlanTierConfig> = {
  free: {
    id: 'free',
    name: 'Free Forever',
    tagline: 'For individual freelancers, hobbyists & testing basic GST billing.',
    badge: 'Free Tier',
    isBuiltIn: true,
    status: 'active',
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyEquivalentAnnual: 0,
    maxUsers: 1,
    maxInvoicesPerMonth: 25,
    maxLedgers: 50,
    maxBranches: 1,
    features: [
      '1 User Seat',
      '25 GST Tax Invoices & Vouchers / month',
      'Basic Sales & Purchase Invoicing',
      'Standard Ledgers & Trial Balance',
      'GSTR-1 Summary',
      'Community Email Support',
    ],
    color: PLAN_COLOR_PRESETS.slate,
  },
  starter: {
    id: 'starter',
    name: 'Starter Solo',
    tagline: 'Ideal for proprietorships, solo accountants & early-stage micro firms.',
    badge: 'Essential',
    isBuiltIn: true,
    status: 'active',
    monthlyPrice: 999,
    annualPrice: 11988,
    monthlyEquivalentAnnual: 999,
    maxUsers: 2,
    maxInvoicesPerMonth: 150,
    maxLedgers: 250,
    maxBranches: 1,
    features: [
      'Up to 2 User Accounts (Admin + Accountant)',
      '150 GST Tax Invoices & Bills / month',
      'Standard Invoicing & Thermal POS Print',
      'Basic Double-Entry Ledgers & Trial Balance',
      'GSTR-1 & GSTR-3B Summary Reports',
      'Single Branch / GSTIN Management',
      'Standard Cloud Backup & 24hr Email Support',
    ],
    color: PLAN_COLOR_PRESETS.slate,
  },
  professional: {
    id: 'professional',
    name: 'Business Pro',
    tagline: 'Best for growing businesses, retail traders, wholesalers & SME firms.',
    badge: 'Most Popular',
    popular: true,
    isBuiltIn: true,
    status: 'active',
    monthlyPrice: 2499,
    annualPrice: 29988,
    monthlyEquivalentAnnual: 2499,
    maxUsers: 10,
    maxInvoicesPerMonth: -1, // Unlimited
    maxLedgers: 5000,
    maxBranches: 3,
    features: [
      'Up to 10 Team Members with Dynamic RBAC',
      'Unlimited GST Sales & Purchase Invoices',
      'Cheque Management & PDC Tracker',
      'Automated Bank Reconciliation (CSV/Excel/PDF)',
      'Direct WhatsApp & Email PDF Dispatch',
      'Multi-Branch & Warehousing Stock Control',
      'E-Way Bill & E-Invoice Portal Readiness',
      'Priority Support (Phone & Fast WhatsApp SLA)',
    ],
    color: PLAN_COLOR_PRESETS.emerald,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Matrix',
    tagline: 'Designed for large multi-state corporations, CA firms & high-volume enterprises.',
    badge: 'Maximum Power',
    isBuiltIn: true,
    status: 'active',
    monthlyPrice: 5999,
    annualPrice: 71988,
    monthlyEquivalentAnnual: 5999,
    maxUsers: -1, // Unlimited
    maxInvoicesPerMonth: -1, // Unlimited
    maxLedgers: -1,
    maxBranches: -1,
    features: [
      'Unlimited Users, Auditors & Billing Staff',
      'Unlimited Invoices, Vouchers & Records',
      'Multi-State GSTIN Consolidation & Filing',
      'Statutory Auditor Read-Only Mode & Audit Lock',
      'Complete Immutable Audit Trail & Activity Logs',
      'Automated Recurring Invoices & Payment Reminders',
      'Dedicated Account Manager & 99.9% Uptime SLA',
      'Custom ERP Connectors & Priority Feature Requests',
    ],
    color: PLAN_COLOR_PRESETS.indigo,
  },
};

export const DEFAULT_BUILTIN_PLANS: PlanTierConfig[] = Object.values(SUBSCRIPTION_PLANS);

export const COMPARISON_FEATURES: PlanFeature[] = [
  {
    name: 'User Accounts / Seats',
    free: '1 Seat',
    starter: 'Up to 2',
    professional: 'Up to 10',
    enterprise: 'Unlimited',
    tooltip: 'Number of active team logins permitted simultaneously.',
  },
  {
    name: 'Monthly Invoices & Bills',
    free: '25 / mo',
    starter: '150 / mo',
    professional: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    name: 'Multi-Role Permissions (RBAC)',
    free: 'Admin only',
    starter: 'Admin & Accountant only',
    professional: 'All 5 Roles',
    enterprise: 'Custom Granular + Auditor Lock',
  },
  {
    name: 'Automated Bank Reconciliation',
    free: false,
    starter: false,
    professional: true,
    enterprise: true,
    tooltip: 'Parse statements, auto-match invoices and reconcile ledger accounts.',
  },
  {
    name: 'Cheque Book & PDC Lifecycle',
    free: false,
    starter: false,
    professional: true,
    enterprise: true,
  },
  {
    name: 'Multi-State GSTINs',
    free: 'Single GSTIN',
    starter: 'Single GSTIN',
    professional: 'Up to 3 Branches',
    enterprise: 'Unlimited Multi-State',
  },
  {
    name: 'Statutory Auditor Access',
    free: false,
    starter: false,
    professional: 'Standard',
    enterprise: 'Dedicated Read-Only & Audit Lock',
  },
  {
    name: 'Comprehensive Audit Logs',
    free: 'Last 7 days',
    starter: 'Last 30 days',
    professional: '1 Year',
    enterprise: 'Permanent Immutable Trail',
  },
  {
    name: 'Customer Support SLA',
    free: 'Community Email',
    starter: 'Email (48h)',
    professional: 'Priority Phone & WhatsApp (4h)',
    enterprise: 'Dedicated Account Manager (Instant)',
  },
];

export function getPlanConfig(tier: string, customPlans?: PlanTierConfig[]): PlanTierConfig {
  if (customPlans && customPlans.length > 0) {
    const found = customPlans.find((p) => p.id === tier);
    if (found) return found;
  }
  return SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.professional;
}

export function calculateSubscriptionCost(
  planTier: string,
  cycle: SubscriptionBillingCycle,
  customPlans?: PlanTierConfig[]
): {
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  monthlyEquivalent: number;
  annualSavings: number;
} {
  const plan = getPlanConfig(planTier, customPlans);
  const isAnnual = cycle === 'annual';
  const baseAmount = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const gstRate = 18; // 18% standard GST for B2B SaaS
  const gstAmount = Math.round((baseAmount * gstRate) / 100);
  const totalAmount = baseAmount + gstAmount;
  const monthlyEquivalent = isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
  const annualSavings = isAnnual ? (plan.monthlyPrice * 12) - plan.annualPrice : 0;

  return {
    baseAmount,
    gstRate,
    gstAmount,
    totalAmount,
    monthlyEquivalent,
    annualSavings,
  };
}

export function getDaysRemaining(targetDateStr?: string): {
  days: number;
  isExpired: boolean;
  label: string;
} {
  if (!targetDateStr) {
    return { days: 30, isExpired: false, label: '30 days remaining' };
  }
  const target = new Date(targetDateStr).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return { days: 0, isExpired: true, label: 'Expired' };
  }
  if (days === 1) {
    return { days: 1, isExpired: false, label: '1 day remaining' };
  }
  return { days, isExpired: false, label: `${days} days remaining` };
}

export function getSubscriptionStatusMeta(status: SubscriptionStatus | string): {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
} {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dotClass: 'bg-emerald-400',
        description: 'Fully active with live Firestore cloud synchronization.',
      };
    case 'trial':
      return {
        label: 'Free Trial',
        badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        dotClass: 'bg-blue-400 animate-pulse',
        description: 'Trial period active with full feature evaluation access.',
      };
    case 'past_due':
      return {
        label: 'Past Due',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dotClass: 'bg-amber-400',
        description: 'Subscription payment renewal is overdue.',
      };
    case 'suspended':
      return {
        label: 'Suspended',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        dotClass: 'bg-rose-400',
        description: 'Workspace is suspended by Super Admin.',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        dotClass: 'bg-slate-400',
        description: 'Cancelled. Access active until end of billing cycle.',
      };
    case 'expired':
      return {
        label: 'Expired',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        dotClass: 'bg-rose-400',
        description: 'Subscription has expired. Renewal required to unlock books.',
      };
    default:
      return {
        label: 'Active',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dotClass: 'bg-emerald-400',
        description: 'Active subscription tier.',
      };
  }
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}
