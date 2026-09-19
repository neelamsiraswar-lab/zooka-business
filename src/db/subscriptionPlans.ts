// src/db/subscriptionPlans.ts
import { db, COLLECTIONS } from './index';
import { PlanTierConfig, DEFAULT_BUILTIN_PLANS, PLAN_COLOR_PRESETS } from '../data/subscriptionPlans';
import { logActivity } from './dataService';
import { auth } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
      tenantId: currentAuth?.tenantId,
      providerInfo: currentAuth?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error in subscription plans: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function getAllSubscriptionPlans(): Promise<PlanTierConfig[]> {
  const path = COLLECTIONS.SUBSCRIPTION_PLANS;
  try {
    const plansRef = db.collection(path);
    const snap = await plansRef.get();

    const plans: PlanTierConfig[] = [];
    snap.docs.forEach((d: any) => {
      const data = d.data();
      const defaultDef = DEFAULT_BUILTIN_PLANS.find((p) => p.id === d.id);
      plans.push({
        ...(defaultDef || {}),
        ...data,
        id: d.id,
        order: data.order !== undefined && data.order !== null ? Number(data.order) : (defaultDef?.order ?? 999),
        features: data.features && data.features.length > 0 ? data.features : (defaultDef?.features || []),
        color: data.color || defaultDef?.color || PLAN_COLOR_PRESETS.indigo,
      });
    });

    // Ensure all default built-in plans exist in Firestore and in returned list
    for (const def of DEFAULT_BUILTIN_PLANS) {
      if (!plans.some((p) => p.id === def.id)) {
        const docRef = db.collection(path).doc(def.id);
        const planWithMeta: PlanTierConfig = {
          ...def,
          isBuiltIn: true,
          status: 'active',
          order: def.order || 1,
          createdAt: def.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await docRef.set(planWithMeta, { merge: true });
        plans.push(planWithMeta);
      }
    }

    // Sort deterministically by explicit display order, fallback to monthly price
    plans.sort((a, b) => {
      const orderA = a.order !== undefined && a.order !== null ? a.order : 999;
      const orderB = b.order !== undefined && b.order !== null ? b.order : 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.monthlyPrice || 0) - (b.monthlyPrice || 0);
    });

    return plans;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return DEFAULT_BUILTIN_PLANS;
  }
}

export async function createSubscriptionPlan(
  planInput: Partial<PlanTierConfig> & { name: string; monthlyPrice: number; annualPrice: number },
  adminUserId: number = 1,
  adminUserEmail: string = 'admin@platform.com'
): Promise<PlanTierConfig> {
  const path = COLLECTIONS.SUBSCRIPTION_PLANS;
  try {
    // Generate clean slug ID
    const rawSlug = (planInput.id || planInput.name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 32);
    const planId = rawSlug || `plan_${Date.now()}`;

    const monthlyPrice = Number(planInput.monthlyPrice) || 0;
    const annualPrice = Number(planInput.annualPrice) || Math.round(monthlyPrice * 12);
    const monthlyEquivalentAnnual = Math.round(annualPrice / 12);

    const colorConfig = planInput.color || PLAN_COLOR_PRESETS.indigo;

    let targetOrder = planInput.order !== undefined ? Number(planInput.order) : undefined;
    if (targetOrder === undefined || isNaN(targetOrder)) {
      // Find highest existing order to append to the end of the catalog
      try {
        const existingPlansSnap = await db.collection(path).get();
        let maxOrder = 0;
        existingPlansSnap.docs.forEach((doc: any) => {
          const o = Number(doc.data()?.order);
          if (!isNaN(o) && o > maxOrder) maxOrder = o;
        });
        targetOrder = maxOrder + 1;
      } catch {
        targetOrder = 1;
      }
    }

    const newPlan: PlanTierConfig = {
      id: planId,
      name: planInput.name.trim(),
      tagline: planInput.tagline?.trim() || 'Custom curated accounting suite for enterprise tenants.',
      badge: planInput.badge?.trim() || 'Custom Plan',
      popular: !!planInput.popular,
      isBuiltIn: false,
      status: planInput.status || 'active',
      order: targetOrder,
      monthlyPrice,
      annualPrice,
      monthlyEquivalentAnnual,
      maxUsers: planInput.maxUsers !== undefined ? Number(planInput.maxUsers) : -1,
      maxInvoicesPerMonth: planInput.maxInvoicesPerMonth !== undefined ? Number(planInput.maxInvoicesPerMonth) : -1,
      maxLedgers: planInput.maxLedgers !== undefined ? Number(planInput.maxLedgers) : -1,
      maxBranches: planInput.maxBranches !== undefined ? Number(planInput.maxBranches) : 1,
      features: planInput.features && planInput.features.length > 0
        ? planInput.features
        : [
            `Up to ${planInput.maxUsers === -1 ? 'Unlimited' : planInput.maxUsers || 5} User Seats with Role Governance`,
            `${planInput.maxInvoicesPerMonth === -1 ? 'Unlimited' : planInput.maxInvoicesPerMonth || 500} Invoices & Vouchers / mo`,
            'GST Billing & Compliant Tax Calculations',
            'Double-Entry General Ledger & Trial Balance',
            'Multi-format Data Export & Cloud Backup',
          ],
      color: colorConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = db.collection(path).doc(planId);
    await docRef.set(newPlan);

    try {
      await logActivity(
        adminUserId,
        adminUserEmail,
        'CREATE',
        'SUBSCRIPTION_PLAN',
        planId,
        `Created new plan tier: "${newPlan.name}" (₹${newPlan.monthlyPrice}/mo, ₹${newPlan.annualPrice}/yr)`
      );
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }

    return newPlan;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function updateSubscriptionPlan(
  planId: string,
  updates: Partial<PlanTierConfig>,
  adminUserId: number = 1,
  adminUserEmail: string = 'admin@platform.com'
): Promise<PlanTierConfig> {
  const trimmedPlanId = planId?.trim().toLowerCase();
  
  // 1. Validation of Plan ID before triggering any Firestore write
  if (!trimmedPlanId) {
    throw new Error('Validation Error: Valid subscription plan ID (slug) is required before updating.');
  }

  // Ensure slug format is valid (alphanumeric, underscore, hyphen, 2 to 64 chars)
  const slugRegex = /^[a-z0-9_-]{2,64}$/;
  if (!slugRegex.test(trimmedPlanId)) {
    throw new Error(`Validation Error: Invalid plan identifier "${trimmedPlanId}". Plan ID must be 2-64 characters long and contain only alphanumeric characters, dashes, or underscores.`);
  }

  const path = `${COLLECTIONS.SUBSCRIPTION_PLANS}/${trimmedPlanId}`;
  try {
    const docRef = db.collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc(trimmedPlanId);
    const existingSnap = await docRef.get();
    const defaultBuiltIn = DEFAULT_BUILTIN_PLANS.find((p) => p.id === trimmedPlanId);
    
    const existing = existingSnap.exists ? existingSnap.data() : (defaultBuiltIn || {
      id: trimmedPlanId,
      name: updates.name || trimmedPlanId,
      status: 'active',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [],
    });

    const isBuiltIn =
      ['free', 'starter', 'professional', 'enterprise'].includes(trimmedPlanId) ||
      Boolean(existing?.isBuiltIn);

    // Validate and sanitize pricing
    const rawMonthly = updates.monthlyPrice !== undefined ? Number(updates.monthlyPrice) : (existing?.monthlyPrice ?? 0);
    const rawAnnual = updates.annualPrice !== undefined ? Number(updates.annualPrice) : (existing?.annualPrice ?? 0);

    const monthlyPrice = isNaN(rawMonthly) || rawMonthly < 0 ? 0 : Math.round(rawMonthly);
    const annualPrice = isNaN(rawAnnual) || rawAnnual < 0 ? 0 : Math.round(rawAnnual);
    const monthlyEquivalentAnnual = Math.round(annualPrice / 12);

    // Validate and sanitize resource limits
    const maxUsers = updates.maxUsers !== undefined ? Number(updates.maxUsers) : (existing?.maxUsers ?? 5);
    const maxInvoices = updates.maxInvoicesPerMonth !== undefined ? Number(updates.maxInvoicesPerMonth) : (existing?.maxInvoicesPerMonth ?? -1);
    const maxLedgers = updates.maxLedgers !== undefined ? Number(updates.maxLedgers) : (existing?.maxLedgers ?? 1000);
    const maxBranches = updates.maxBranches !== undefined ? Number(updates.maxBranches) : (existing?.maxBranches ?? 1);

    const rawOrder = updates.order !== undefined ? Number(updates.order) : (existing?.order ?? (defaultBuiltIn?.order || 999));
    const order = isNaN(rawOrder) ? 1 : rawOrder;

    const cleanUpdates: PlanTierConfig = {
      ...(existing || {}),
      ...updates,
      id: trimmedPlanId, // ID is permanently immutable to protect relational integrity
      isBuiltIn: isBuiltIn, // Built-in lock cannot be stripped
      order,
      monthlyPrice,
      annualPrice,
      monthlyEquivalentAnnual,
      maxUsers: isNaN(maxUsers) ? -1 : maxUsers,
      maxInvoicesPerMonth: isNaN(maxInvoices) ? -1 : maxInvoices,
      maxLedgers: isNaN(maxLedgers) ? -1 : maxLedgers,
      maxBranches: isNaN(maxBranches) ? 1 : maxBranches,
      features: updates.features && updates.features.length > 0 ? updates.features : (existing?.features || []),
      updatedAt: new Date().toISOString(),
    } as PlanTierConfig;

    // Trigger atomic Firestore write
    await docRef.set(cleanUpdates, { merge: true });

    try {
      await logActivity(
        adminUserId,
        adminUserEmail,
        'UPDATE',
        'SUBSCRIPTION_PLAN',
        trimmedPlanId,
        `Updated subscription plan: ${cleanUpdates.name || trimmedPlanId} (₹${monthlyPrice}/mo, ₹${annualPrice}/yr)${
          isBuiltIn ? ' [Built-in System Tier]' : ''
        }`
      );
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }

    return cleanUpdates;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
    throw err;
  }
}

export async function deleteSubscriptionPlan(
  planId: string,
  adminUserId: number = 1,
  adminUserEmail: string = 'admin@platform.com'
): Promise<boolean> {
  const trimmedPlanId = planId?.trim().toLowerCase();
  if (!trimmedPlanId) {
    throw new Error('Valid subscription plan ID is required.');
  }

  const path = `${COLLECTIONS.SUBSCRIPTION_PLANS}/${trimmedPlanId}`;
  try {
    // 1. Prevent deletion of built-in free, starter, professional, enterprise
    if (['free', 'starter', 'professional', 'enterprise'].includes(trimmedPlanId)) {
      throw new Error(
        `Protection Violation: Built-in system tier "${trimmedPlanId}" is a foundational platform requirement and cannot be deleted.`
      );
    }

    const docRef = db.collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc(trimmedPlanId);
    const existingSnap = await docRef.get();
    if (existingSnap.exists && existingSnap.data()?.isBuiltIn) {
      throw new Error(
        `Protection Violation: Plan "${trimmedPlanId}" is designated as a protected built-in system plan and cannot be deleted.`
      );
    }

    // 2. Prevent deletion if any workspaces are currently assigned to this plan
    const wsSnap = await db.collection(COLLECTIONS.WORKSPACES).where('plan', '==', trimmedPlanId).get();
    if (!wsSnap.empty) {
      throw new Error(
        `Protection Violation: Cannot delete plan "${trimmedPlanId}". ${wsSnap.size} active workspace(s) are currently enrolled in this tier. Reassign or migrate them to another plan first.`
      );
    }

    await docRef.delete();

    try {
      await logActivity(
        adminUserId,
        adminUserEmail,
        'DELETE',
        'SUBSCRIPTION_PLAN',
        trimmedPlanId,
        `Permanently deleted custom subscription plan tier "${trimmedPlanId}" (0 assigned workspaces verified)`
      );
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }
}

/**
 * Persists an explicit display order sequence across all subscription plans
 */
export async function reorderSubscriptionPlans(
  orderedPlanIds: string[],
  adminUserId: number = 1,
  adminUserEmail: string = 'admin@platform.com'
): Promise<PlanTierConfig[]> {
  const path = COLLECTIONS.SUBSCRIPTION_PLANS;
  try {
    const batch = db.batch();
    orderedPlanIds.forEach((id, index) => {
      const docRef = db.collection(path).doc(id);
      batch.set(
        docRef,
        {
          order: index + 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    try {
      await logActivity(
        adminUserId,
        adminUserEmail,
        'UPDATE',
        'SUBSCRIPTION_PLAN',
        'reorder',
        `Reordered ${orderedPlanIds.length} subscription plan tiers (${orderedPlanIds.join(' → ')})`
      );
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }

    return await getAllSubscriptionPlans();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

/**
 * Moves a plan tier up or down by 1 position in display order
 */
export async function moveSubscriptionPlanOrder(
  planId: string,
  direction: 'up' | 'down',
  adminUserId: number = 1,
  adminUserEmail: string = 'admin@platform.com'
): Promise<PlanTierConfig[]> {
  const allPlans = await getAllSubscriptionPlans();
  const currentIndex = allPlans.findIndex((p) => p.id === planId);
  if (currentIndex === -1) return allPlans;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= allPlans.length) {
    return allPlans; // Already at boundary
  }

  // Swap positions in list
  const updatedList = [...allPlans];
  const temp = updatedList[currentIndex];
  updatedList[currentIndex] = updatedList[targetIndex];
  updatedList[targetIndex] = temp;

  const orderedIds = updatedList.map((p) => p.id);
  return await reorderSubscriptionPlans(orderedIds, adminUserId, adminUserEmail);
}

/**
 * Resets plan sequence to canonical default order:
 * Free (1) -> Starter (2) -> Professional (3) -> Enterprise (4) -> Custom Plans
 */
export async function resetSubscriptionPlansOrder(
  adminUserId: number = 1,
  adminUserEmail: string = 'admin@platform.com'
): Promise<PlanTierConfig[]> {
  const allPlans = await getAllSubscriptionPlans();
  const builtInIds = ['free', 'starter', 'professional', 'enterprise'];
  const customPlans = allPlans.filter((p) => !builtInIds.includes(p.id));

  const orderedIds = [
    ...builtInIds.filter((id) => allPlans.some((p) => p.id === id)),
    ...customPlans.map((p) => p.id),
  ];

  return await reorderSubscriptionPlans(orderedIds, adminUserId, adminUserEmail);
}

