// src/lib/prorationCalculator.ts
import { Workspace, SubscriptionPlanTier, SubscriptionBillingCycle } from '../types';
import { PlanTierConfig, calculateSubscriptionCost } from '../data/subscriptionPlans';

export interface ProrationDetails {
  currentTier: string;
  targetTier: string;
  currentCycle: SubscriptionBillingCycle;
  targetCycle: SubscriptionBillingCycle;
  totalPeriodDays: number;
  daysElapsed: number;
  daysRemaining: number;
  currentPlanBaseCost: number;
  currentDailyRate: number;
  unusedPlanCredit: number;
  targetPlanBaseCost: number;
  targetDailyRate: number;
  targetRemainingCost: number;
  netProratedBase: number;
  gstAmount: number;
  totalNetPayable: number;
  creditRollOver: number;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isSameTier: boolean;
  periodEndDate: string;
}

export function calculateProratedSubscription(
  workspace: Workspace | null | undefined,
  targetTier: SubscriptionPlanTier | string,
  targetCycle: SubscriptionBillingCycle,
  allPlans: PlanTierConfig[]
): ProrationDetails {
  const currentTier = (workspace?.plan || 'starter') as SubscriptionPlanTier;
  const currentCycle = (workspace?.billingCycle || 'annual') as SubscriptionBillingCycle;

  // Standard period calculations
  let totalPeriodDays = currentCycle === 'annual' ? 365 : 30;
  let daysRemaining = currentCycle === 'annual' ? 240 : 18; // Sensible defaults
  let daysElapsed = totalPeriodDays - daysRemaining;

  const now = Date.now();
  if (workspace?.currentPeriodStart && workspace?.currentPeriodEnd) {
    const startMs = new Date(workspace.currentPeriodStart).getTime();
    const endMs = new Date(workspace.currentPeriodEnd).getTime();
    if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
      totalPeriodDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
      daysRemaining = Math.max(0, Math.min(totalPeriodDays, Math.round((endMs - now) / 86400000)));
      daysElapsed = Math.max(0, totalPeriodDays - daysRemaining);
    }
  }

  // Calculate pricing for both tiers
  const currentCost = calculateSubscriptionCost(currentTier, currentCycle, allPlans);
  const targetCost = calculateSubscriptionCost(targetTier as SubscriptionPlanTier, targetCycle, allPlans);

  const currentDailyRate = currentCost.baseAmount > 0 ? currentCost.baseAmount / totalPeriodDays : 0;
  const unusedPlanCredit = Math.max(0, Math.round(currentDailyRate * daysRemaining));

  const targetDailyRate = targetCost.baseAmount > 0 ? targetCost.baseAmount / (targetCycle === 'annual' ? 365 : 30) : 0;
  const targetRemainingCost = Math.round(targetDailyRate * daysRemaining);

  const rawDifference = targetRemainingCost - unusedPlanCredit;
  const isUpgrade = targetCost.baseAmount > currentCost.baseAmount;
  const isDowngrade = targetCost.baseAmount < currentCost.baseAmount;
  const isSameTier = targetTier === currentTier && targetCycle === currentCycle;

  let netProratedBase = 0;
  let creditRollOver = 0;

  if (rawDifference > 0) {
    netProratedBase = Math.round(rawDifference);
  } else if (rawDifference < 0) {
    creditRollOver = Math.round(Math.abs(rawDifference));
    netProratedBase = 0;
  }

  // 18% GST (SAC 998315)
  const gstAmount = Math.round(netProratedBase * 0.18);
  const totalNetPayable = netProratedBase + gstAmount;

  // Compute end date for target period
  const periodEndDate = workspace?.currentPeriodEnd
    ? new Date(workspace.currentPeriodEnd).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date(Date.now() + (targetCycle === 'annual' ? 365 : 30) * 86400000).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  return {
    currentTier,
    targetTier,
    currentCycle,
    targetCycle,
    totalPeriodDays,
    daysElapsed,
    daysRemaining,
    currentPlanBaseCost: currentCost.baseAmount,
    currentDailyRate: Number(currentDailyRate.toFixed(2)),
    unusedPlanCredit,
    targetPlanBaseCost: targetCost.baseAmount,
    targetDailyRate: Number(targetDailyRate.toFixed(2)),
    targetRemainingCost,
    netProratedBase,
    gstAmount,
    totalNetPayable,
    creditRollOver,
    isUpgrade,
    isDowngrade,
    isSameTier,
    periodEndDate,
  };
}
