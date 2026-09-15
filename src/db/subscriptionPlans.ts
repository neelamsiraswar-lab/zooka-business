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

    if (snap.empty) {
      // Seed default built-in plans into Firestore
      const seededPlans: PlanTierConfig[] = [];
      for (const p of DEFAULT_BUILTIN_PLANS) {
        const docRef = db.collection(path).doc(p.id);
        const planWithMeta: PlanTierConfig = {
          ...p,
          isBuiltIn: true,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await docRef.set(planWithMeta);
        seededPlans.push(planWithMeta);
      }
      return seededPlans;
    }

    const plans: PlanTierConfig[] = [];
    snap.docs.forEach((d: any) => {
      plans.push({ ...d.data(), id: d.id });
    });

    // Ensure built-in plans are present even if not in DB yet
    for (const def of DEFAULT_BUILTIN_PLANS) {
      if (!plans.some((p) => p.id === def.id)) {
        plans.unshift(def);
      }
    }

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
    const annualPrice = Number(planInput.annualPrice) || Math.round(monthlyPrice * 10);
    const monthlyEquivalentAnnual = Math.round(annualPrice / 12);

    const colorConfig = planInput.color || PLAN_COLOR_PRESETS.indigo;

    const newPlan: PlanTierConfig = {
      id: planId,
      name: planInput.name.trim(),
      tagline: planInput.tagline?.trim() || 'Custom curated accounting suite for enterprise tenants.',
      badge: planInput.badge?.trim() || 'Custom Plan',
      popular: !!planInput.popular,
      isBuiltIn: false,
      status: planInput.status || 'active',
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
  const path = `${COLLECTIONS.SUBSCRIPTION_PLANS}/${planId}`;
  try {
    const docRef = db.collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc(planId);
    const existingSnap = await docRef.get();
    const existing = existingSnap.exists ? existingSnap.data() : null;

    const monthlyPrice = updates.monthlyPrice !== undefined ? Number(updates.monthlyPrice) : (existing?.monthlyPrice ?? 0);
    const annualPrice = updates.annualPrice !== undefined ? Number(updates.annualPrice) : (existing?.annualPrice ?? 0);
    const monthlyEquivalentAnnual = Math.round(annualPrice / 12);

    const cleanUpdates: Partial<PlanTierConfig> = {
      ...updates,
      monthlyPrice,
      annualPrice,
      monthlyEquivalentAnnual,
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(cleanUpdates, { merge: true });

    try {
      await logActivity(
        adminUserId,
        adminUserEmail,
        'UPDATE',
        'SUBSCRIPTION_PLAN',
        planId,
        `Updated subscription plan parameters for ${planId}`
      );
    } catch (e) {
      console.warn('Failed to log activity:', e);
    }

    return { ...(existing || {}), ...cleanUpdates, id: planId } as PlanTierConfig;
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
  const path = `${COLLECTIONS.SUBSCRIPTION_PLANS}/${planId}`;
  try {
    // Prevent deletion of built-in starter, professional, enterprise
    if (['starter', 'professional', 'enterprise'].includes(planId)) {
      throw new Error('Built-in system plans (Starter, Professional, Enterprise) cannot be deleted.');
    }

    const docRef = db.collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc(planId);
    await docRef.delete();

    try {
      await logActivity(
        adminUserId,
        adminUserEmail,
        'DELETE',
        'SUBSCRIPTION_PLAN',
        planId,
        `Deleted custom subscription plan ${planId}`
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
