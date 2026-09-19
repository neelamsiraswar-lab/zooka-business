// src/db/architecturalPillars.ts
import { db, COLLECTIONS } from './index';
import { ArchitecturalPillar } from '../types';
import { logActivity } from './dataService';

export const DEFAULT_ARCHITECTURAL_PILLARS: ArchitecturalPillar[] = [
  {
    id: 'pillar-gst-invoicing',
    title: 'Automated GST Invoicing',
    description: 'Smart HSN/SAC lookups, dual CGST+SGST vs IGST calculation, reverse-charge management, and printable thermal/A4 formats.',
    icon: 'Receipt',
    colorTheme: 'emerald',
    badge: 'Compliance',
    order: 1,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pillar-double-entry',
    title: 'Double-Entry Journals',
    description: 'Real-time Day Book, Balance Sheet, Profit & Loss, and auto-balancing Trial Balance synchronized instantly across books.',
    icon: 'BookOpen',
    colorTheme: 'indigo',
    badge: 'Core Ledger',
    order: 2,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pillar-brs-banking',
    title: 'Automated BRS & Banking',
    description: 'Direct PDF/Excel statement imports with heuristic auto-matching, cheque deposit clearing, and unpresented cheque tracking.',
    icon: 'Landmark',
    colorTheme: 'purple',
    badge: 'Fintech Engine',
    order: 3,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pillar-audit-trail',
    title: 'Immutable Audit Trail',
    description: 'Every modification, deletion, voucher print, and user login is cryptographically timestamped for flawless statutory audits.',
    icon: 'ShieldCheck',
    colorTheme: 'teal',
    badge: 'Audit Ready',
    order: 4,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_CACHE_KEY = 'apex_architectural_pillars_cache';

/**
 * Fetch all Core Architectural Pillars from Google Cloud Firestore.
 * Automatically seeds default pillars if the collection is unpopulated.
 */
export async function getAllArchitecturalPillars(): Promise<ArchitecturalPillar[]> {
  try {
    const colRef = db.collection(COLLECTIONS.ARCHITECTURAL_PILLARS);
    const snap = await colRef.get();

    if (!snap.empty) {
      const items: ArchitecturalPillar[] = [];
      snap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          title: data.title || '',
          description: data.description || '',
          icon: data.icon || 'Layers',
          colorTheme: data.colorTheme || 'emerald',
          badge: data.badge || '',
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

    // Collection is empty, seed standard default architectural pillars
    const seededList: ArchitecturalPillar[] = [];
    for (const p of DEFAULT_ARCHITECTURAL_PILLARS) {
      const docRef = colRef.doc(p.id);
      await docRef.set(p);
      seededList.push(p);
    }

    seededList.sort((a, b) => a.order - b.order);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seededList));
    }
    return seededList;
  } catch (err) {
    console.warn('Could not read architectural_pillars from Firestore, falling back to cache/defaults:', err);
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
    return DEFAULT_ARCHITECTURAL_PILLARS;
  }
}

/**
 * Add a new Core Architectural Pillar to Firestore.
 */
export async function createArchitecturalPillar(
  pillarData: Omit<ArchitecturalPillar, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ArchitecturalPillar> {
  const colRef = db.collection(COLLECTIONS.ARCHITECTURAL_PILLARS);
  const id = `pillar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newPillar: ArchitecturalPillar = {
    ...pillarData,
    id,
    order: pillarData.order ?? 10,
    isActive: pillarData.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  await colRef.doc(id).set(newPillar);

  // Update local cache
  try {
    const existing = await getAllArchitecturalPillars();
    const updated = [...existing.filter((p) => p.id !== id), newPillar].sort((a, b) => a.order - b.order);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('architectural_pillars_updated'));
  }

  // Log in workspace audit trail
  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'CREATE',
      'ARCHITECTURAL_PILLAR',
      newPillar.id,
      `Created Core Architectural Pillar "${newPillar.title}" (order ${newPillar.order})`
    );
  } catch (e) {
    console.warn('Failed to log pillar creation activity:', e);
  }

  return newPillar;
}

/**
 * Edit / update an existing Core Architectural Pillar.
 */
export async function updateArchitecturalPillar(
  id: string,
  updates: Partial<ArchitecturalPillar>
): Promise<ArchitecturalPillar> {
  const colRef = db.collection(COLLECTIONS.ARCHITECTURAL_PILLARS);
  const docRef = colRef.doc(id);
  const now = new Date().toISOString();

  const payload = {
    ...updates,
    updatedAt: now,
  };

  await docRef.set(payload, { merge: true });

  const updatedSnap = await docRef.get();
  const data = updatedSnap.data();
  const updatedPillar: ArchitecturalPillar = {
    id,
    title: data?.title || updates.title || '',
    description: data?.description || updates.description || '',
    icon: data?.icon || updates.icon || 'Layers',
    colorTheme: data?.colorTheme || updates.colorTheme || 'emerald',
    badge: data?.badge ?? updates.badge,
    order: typeof data?.order === 'number' ? data.order : (updates.order ?? 99),
    isActive: data?.isActive !== false,
    isBuiltIn: data?.isBuiltIn,
    createdAt: data?.createdAt,
    updatedAt: now,
  };

  // Update local cache
  try {
    const existing = await getAllArchitecturalPillars();
    const updated = existing.map((p) => (p.id === id ? updatedPillar : p)).sort((a, b) => a.order - b.order);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('architectural_pillars_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'UPDATE',
      'ARCHITECTURAL_PILLAR',
      id,
      `Updated Core Architectural Pillar "${updatedPillar.title}"`
    );
  } catch (e) {
    console.warn('Failed to log pillar update activity:', e);
  }

  return updatedPillar;
}

/**
 * Delete a Core Architectural Pillar from Firestore.
 */
export async function deleteArchitecturalPillar(id: string): Promise<void> {
  const colRef = db.collection(COLLECTIONS.ARCHITECTURAL_PILLARS);
  await colRef.doc(id).delete();

  // Update local cache
  try {
    const existing = await getAllArchitecturalPillars();
    const updated = existing.filter((p) => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('architectural_pillars_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'DELETE',
      'ARCHITECTURAL_PILLAR',
      id,
      `Deleted Core Architectural Pillar ID: ${id}`
    );
  } catch (e) {
    console.warn('Failed to log pillar delete activity:', e);
  }
}

/**
 * Reset all pillars to platform factory defaults.
 */
export async function resetArchitecturalPillarsToDefault(): Promise<ArchitecturalPillar[]> {
  const colRef = db.collection(COLLECTIONS.ARCHITECTURAL_PILLARS);
  const snap = await colRef.get();

  for (const d of snap.docs) {
    await colRef.doc(d.id).delete();
  }

  const seeded: ArchitecturalPillar[] = [];
  for (const p of DEFAULT_ARCHITECTURAL_PILLARS) {
    await colRef.doc(p.id).set(p);
    seeded.push(p);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seeded));
    window.dispatchEvent(new CustomEvent('architectural_pillars_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'RESET',
      'ARCHITECTURAL_PILLAR',
      'all',
      `Reset Core Architectural Pillars to standard factory defaults`
    );
  } catch (e) {
    console.warn('Failed to log pillar reset activity:', e);
  }

  return seeded;
}
