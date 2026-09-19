// src/db/featureBadges.ts
import { db, COLLECTIONS } from './index';
import { FeatureBadge } from '../types';
import { logActivity } from './dataService';

export const DEFAULT_FEATURE_BADGES: FeatureBadge[] = [
  {
    id: 'badge-gst-compliance',
    title: 'Statutory GST Compliance',
    description: 'Intra/Inter-State dual tax engine, HSN auto-lookup & real-time GSTR-1/3B.',
    icon: 'ShieldCheck',
    colorTheme: 'emerald',
    badgeText: 'Statutory',
    order: 1,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'badge-multi-tenant',
    title: 'Multi-Tenant Workspaces',
    description: 'Isolated company databases, multiple branches & secure session tokens.',
    icon: 'Building2',
    colorTheme: 'indigo',
    badgeText: 'Enterprise',
    order: 2,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'badge-double-entry',
    title: 'Double-Entry Bookkeeping',
    description: 'Day books, general ledgers, trial balance, and automatic P&L / balance sheet.',
    icon: 'FileText',
    colorTheme: 'purple',
    badgeText: 'Core Ledger',
    order: 3,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'badge-bank-brs',
    title: 'Automated Bank BRS',
    description: 'Instant CSV/Excel bank statement parsing & smart voucher auto-matching.',
    icon: 'Landmark',
    colorTheme: 'teal',
    badgeText: 'Fintech',
    order: 4,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_CACHE_KEY = 'apex_feature_badges_cache';

/**
 * Fetch all Feature Badges from Google Cloud Firestore.
 * Automatically seeds default feature badges if the collection is unpopulated.
 */
export async function getAllFeatureBadges(): Promise<FeatureBadge[]> {
  try {
    const colRef = db.collection(COLLECTIONS.FEATURE_BADGES);
    const snap = await colRef.get();

    if (!snap.empty) {
      const items: FeatureBadge[] = [];
      snap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          icon: data.icon || 'ShieldCheck',
          colorTheme: data.colorTheme || 'emerald',
          badgeText: data.badgeText || '',
          order: typeof data.order === 'number' ? data.order : 99,
          isActive: data.isActive !== false,
          isBuiltIn: !!data.isBuiltIn,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      items.sort((a, b) => a.order - b.order);

      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(items));
      }
      return items;
    }

    // Collection is empty, seed standard default feature badges
    const seededList: FeatureBadge[] = [];
    for (const b of DEFAULT_FEATURE_BADGES) {
      const docRef = colRef.doc(b.id);
      await docRef.set(b);
      seededList.push(b);
    }

    seededList.sort((a, b) => a.order - b.order);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seededList));
    }
    return seededList;
  } catch (err) {
    console.warn('Could not read feature_badges from Firestore, falling back to cache/defaults:', err);
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (parseErr) {
        // Benign parse error
      }
    }
    return DEFAULT_FEATURE_BADGES;
  }
}

/**
 * Add a new Feature Badge to Firestore.
 */
export async function createFeatureBadge(
  badgeData: Omit<FeatureBadge, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FeatureBadge> {
  const colRef = db.collection(COLLECTIONS.FEATURE_BADGES);
  const id = `badge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newBadge: FeatureBadge = {
    ...badgeData,
    id,
    order: badgeData.order ?? 10,
    isActive: badgeData.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  await colRef.doc(id).set(newBadge);

  // Update local cache
  try {
    const existing = await getAllFeatureBadges();
    const updated = [...existing.filter((b) => b.id !== id), newBadge].sort((a, b) => a.order - b.order);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('feature_badges_updated'));
  }

  // Log in workspace audit trail
  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'CREATE',
      'FEATURE_BADGE',
      newBadge.id,
      `Created Feature Badge "${newBadge.title}" (order ${newBadge.order})`
    );
  } catch (e) {
    console.warn('Failed to log badge creation activity:', e);
  }

  return newBadge;
}

/**
 * Edit / update an existing Feature Badge.
 */
export async function updateFeatureBadge(
  id: string,
  updates: Partial<FeatureBadge>
): Promise<FeatureBadge> {
  const colRef = db.collection(COLLECTIONS.FEATURE_BADGES);
  const docRef = colRef.doc(id);
  const now = new Date().toISOString();

  const payload = {
    ...updates,
    updatedAt: now,
  };

  await docRef.set(payload, { merge: true });

  // Update cache
  let updatedBadge: FeatureBadge = {
    id,
    title: '',
    description: '',
    icon: 'ShieldCheck',
    colorTheme: 'emerald',
    order: 99,
    isActive: true,
    ...updates,
    updatedAt: now,
  };

  try {
    const existing = await getAllFeatureBadges();
    const updated = existing
      .map((b) => {
        if (b.id === id) {
          updatedBadge = { ...b, ...updates, updatedAt: now };
          return updatedBadge;
        }
        return b;
      })
      .sort((a, b) => a.order - b.order);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('feature_badges_updated'));
  }

  // Log in audit trail
  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'UPDATE',
      'FEATURE_BADGE',
      id,
      `Updated Feature Badge "${updatedBadge.title || id}"`
    );
  } catch (e) {
    console.warn('Failed to log badge update activity:', e);
  }

  return updatedBadge;
}

/**
 * Delete a Feature Badge from Firestore.
 */
export async function deleteFeatureBadge(id: string): Promise<void> {
  const colRef = db.collection(COLLECTIONS.FEATURE_BADGES);
  await colRef.doc(id).delete();

  // Update cache
  try {
    const existing = await getAllFeatureBadges();
    const target = existing.find((b) => b.id === id);
    const updated = existing.filter((b) => b.id !== id);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));

    // Log in audit trail
    try {
      await logActivity(
        1,
        'superadmin@apextally.com',
        'DELETE',
        'FEATURE_BADGE',
        id,
        `Deleted Feature Badge "${target?.title || id}"`
      );
    } catch (e) {
      console.warn('Failed to log badge deletion activity:', e);
    }
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('feature_badges_updated'));
  }
}

/**
 * Reset all Feature Badges to platform defaults.
 */
export async function resetFeatureBadgesToDefault(): Promise<FeatureBadge[]> {
  const colRef = db.collection(COLLECTIONS.FEATURE_BADGES);

  try {
    const snap = await colRef.get();
    for (const docSnap of snap.docs) {
      await colRef.doc(docSnap.id).delete();
    }
  } catch (err) {
    console.warn('Could not clear feature_badges collection in Firestore:', err);
  }

  const seeded: FeatureBadge[] = [];
  for (const b of DEFAULT_FEATURE_BADGES) {
    const docRef = colRef.doc(b.id);
    await docRef.set(b);
    seeded.push(b);
  }

  seeded.sort((a, b) => a.order - b.order);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seeded));
    window.dispatchEvent(new CustomEvent('feature_badges_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'UPDATE',
      'FEATURE_BADGE',
      'reset-all',
      'Reset all Feature Badges to system default statutory values'
    );
  } catch (e) {
    console.warn('Failed to log reset activity:', e);
  }

  return seeded;
}

/**
 * Move a Feature Badge up or down in order sequence.
 */
export async function moveFeatureBadgeOrder(
  id: string,
  direction: 'up' | 'down'
): Promise<FeatureBadge[]> {
  const list = await getAllFeatureBadges();
  const currentIndex = list.findIndex((b) => b.id === id);
  if (currentIndex === -1) return list;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= list.length) return list;

  // Swap order values
  const currentItem = list[currentIndex];
  const targetItem = list[targetIndex];

  const currentOrder = currentItem.order;
  const targetOrder = targetItem.order === currentOrder
    ? (direction === 'up' ? currentOrder - 1 : currentOrder + 1)
    : targetItem.order;

  await updateFeatureBadge(currentItem.id, { order: targetOrder });
  await updateFeatureBadge(targetItem.id, { order: currentOrder });

  return getAllFeatureBadges();
}
