// src/db/homepageFaqs.ts
import { db, COLLECTIONS } from './index';
import { HomepageFaq } from '../types';
import { logActivity } from './dataService';

export const DEFAULT_HOMEPAGE_FAQS: HomepageFaq[] = [
  {
    id: 'faq-multi-tenant-isolation',
    question: 'How does multi-tenant isolation work for our financial records?',
    answer: 'Each organization operates in its own isolated Firestore workspace context with distinct company settings, chart of accounts, vouchers, and audit logs. Data is encrypted in transit via TLS 1.3 and partitioned with strict role-based authorization rules.',
    category: 'Security & Architecture',
    order: 1,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'faq-gst-splits-hsn',
    question: 'Does Apex TallyGST support automated HSN codes and GST splits?',
    answer: 'Yes. The system automatically computes Intra-State (CGST + SGST) vs Inter-State (IGST) calculations based on Place of Supply rules, generates compliant e-invoice formats, day books, and prepares real-time GSTR-1, GSTR-3B, and GSTR-2B reconciliations.',
    category: 'GST & Compliance',
    order: 2,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'faq-import-bank-ledgers',
    question: 'Can we import existing party ledgers and bank statements?',
    answer: 'Absolutely. The platform includes smart PDF/Excel/CSV parsers for ICICI, HDFC, SBI, and Axis Bank statements with automated BRS voucher matching, as well as bulk party ledger and inventory imports.',
    category: 'Banking & Migration',
    order: 3,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'faq-roles-auditor-access',
    question: 'What roles are supported for internal control and statutory audits?',
    answer: 'Five distinct privilege tiers: Super Administrator (platform governance), Workspace Admin (full company control), Senior Accountant (vouchers, journals & taxes), Billing Operator (sales & inventory), and Statutory Auditor (read-only compliance inspection).',
    category: 'Roles & Audit',
    order: 4,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'faq-data-export-backup',
    question: 'Can we export financial statements for Income Tax and Annual Filings?',
    answer: 'Yes. Export Balance Sheets, P&L statements, Trial Balances, Ledger Books, and GST returns into Excel/PDF formats adhering strictly to ICAI accounting standards and statutory schedules.',
    category: 'Reporting & Compliance',
    order: 5,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_CACHE_KEY = 'apex_homepage_faqs_cache';

/**
 * Fetch all Homepage FAQs from Firestore or local cache.
 */
export async function getAllHomepageFaqs(): Promise<HomepageFaq[]> {
  try {
    const colRef = db.collection(COLLECTIONS.HOMEPAGE_FAQS);
    const snap = await colRef.get();

    if (!snap.empty) {
      const items: HomepageFaq[] = [];
      snap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          question: data.question || '',
          answer: data.answer || '',
          category: data.category || 'General',
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

    // Collection is empty, seed defaults
    const seededList: HomepageFaq[] = [];
    for (const faq of DEFAULT_HOMEPAGE_FAQS) {
      try {
        await colRef.doc(faq.id).set(faq);
        seededList.push(faq);
      } catch (seedErr) {
        console.warn(`Could not seed FAQ ${faq.id} to Firestore:`, seedErr);
        seededList.push(faq);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seededList));
    }
    return seededList.sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error('Failed to get homepage FAQs from Firestore, falling back to local cache:', err);

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.sort((a: HomepageFaq, b: HomepageFaq) => a.order - b.order);
          }
        }
      } catch (storageErr) {
        console.warn('Failed to parse cached homepage FAQs:', storageErr);
      }
    }

    return DEFAULT_HOMEPAGE_FAQS;
  }
}

/**
 * Create a new Homepage FAQ
 */
export async function createHomepageFaq(
  faq: Omit<HomepageFaq, 'id' | 'createdAt' | 'updatedAt'>
): Promise<HomepageFaq> {
  const customId = `faq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newDoc: HomepageFaq = {
    ...faq,
    id: customId,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const colRef = db.collection(COLLECTIONS.HOMEPAGE_FAQS);
    await colRef.doc(customId).set(newDoc);
  } catch (err) {
    console.error(`Failed to create FAQ ${customId} in Firestore:`, err);
  }

  // Update Local Cache
  if (typeof window !== 'undefined') {
    try {
      const existing = await getAllHomepageFaqs();
      const updated = [...existing, newDoc].sort((a, b) => a.order - b.order);
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('homepage_faqs_updated', { detail: { id: customId } }));
    } catch (cacheErr) {
      console.warn('Failed to update local storage after creating FAQ:', cacheErr);
    }
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'CREATE',
      'HOMEPAGE_FAQ',
      customId,
      `Created Homepage FAQ "${newDoc.question}"`
    );
  } catch (e) {
    console.warn('Failed to log FAQ creation activity:', e);
  }

  return newDoc;
}

/**
 * Update an existing Homepage FAQ
 */
export async function updateHomepageFaq(
  id: string,
  updates: Partial<Omit<HomepageFaq, 'id' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    ...updates,
    updatedAt: now,
  };

  try {
    const colRef = db.collection(COLLECTIONS.HOMEPAGE_FAQS);
    await colRef.doc(id).update(payload);
  } catch (err) {
    console.error(`Failed to update FAQ ${id} in Firestore:`, err);
  }

  // Update Local Cache
  if (typeof window !== 'undefined') {
    try {
      const existing = await getAllHomepageFaqs();
      const updated = existing.map((item) =>
        item.id === id ? { ...item, ...payload } : item
      ).sort((a, b) => a.order - b.order);

      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('homepage_faqs_updated', { detail: { id, updates } }));
    } catch (cacheErr) {
      console.warn('Failed to update local storage after updating FAQ:', cacheErr);
    }
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'UPDATE',
      'HOMEPAGE_FAQ',
      id,
      `Updated Homepage FAQ ${id}`
    );
  } catch (e) {
    console.warn('Failed to log FAQ update activity:', e);
  }
}

/**
 * Toggle FAQ active status
 */
export async function toggleHomepageFaqActive(id: string, isActive: boolean): Promise<void> {
  await updateHomepageFaq(id, { isActive });
}

/**
 * Delete a Homepage FAQ
 */
export async function deleteHomepageFaq(id: string): Promise<void> {
  try {
    const colRef = db.collection(COLLECTIONS.HOMEPAGE_FAQS);
    await colRef.doc(id).delete();
  } catch (err) {
    console.error(`Failed to delete FAQ ${id} in Firestore:`, err);
  }

  // Update Local Cache
  if (typeof window !== 'undefined') {
    try {
      const existing = await getAllHomepageFaqs();
      const updated = existing.filter((item) => item.id !== id);
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('homepage_faqs_updated', { detail: { id, deleted: true } }));
    } catch (cacheErr) {
      console.warn('Failed to update local storage after deleting FAQ:', cacheErr);
    }
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'DELETE',
      'HOMEPAGE_FAQ',
      id,
      `Deleted Homepage FAQ ${id}`
    );
  } catch (e) {
    console.warn('Failed to log FAQ deletion activity:', e);
  }
}

/**
 * Move FAQ order up or down
 */
export async function moveHomepageFaqOrder(id: string, direction: 'up' | 'down'): Promise<void> {
  const faqs = await getAllHomepageFaqs();
  const currentIndex = faqs.findIndex((f) => f.id === id);
  if (currentIndex === -1) return;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= faqs.length) return;

  const currentFaq = faqs[currentIndex];
  const targetFaq = faqs[targetIndex];

  const tempOrder = currentFaq.order;
  currentFaq.order = targetFaq.order;
  targetFaq.order = tempOrder;

  if (currentFaq.order === targetFaq.order) {
    currentFaq.order = direction === 'up' ? targetIndex + 1 : targetIndex + 1;
    targetFaq.order = direction === 'up' ? currentIndex + 1 : currentIndex + 1;
  }

  await updateHomepageFaq(currentFaq.id, { order: currentFaq.order });
  await updateHomepageFaq(targetFaq.id, { order: targetFaq.order });
}

/**
 * Reset FAQs to standard defaults
 */
export async function resetHomepageFaqsToDefault(): Promise<void> {
  try {
    const colRef = db.collection(COLLECTIONS.HOMEPAGE_FAQS);
    const snap = await colRef.get();
    for (const d of snap.docs) {
      await d.ref.delete();
    }
    for (const faq of DEFAULT_HOMEPAGE_FAQS) {
      await colRef.doc(faq.id).set(faq);
    }
  } catch (err) {
    console.warn('Error resetting FAQs in Firestore:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(DEFAULT_HOMEPAGE_FAQS));
    window.dispatchEvent(new CustomEvent('homepage_faqs_updated', { detail: { reset: true } }));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'RESET',
      'HOMEPAGE_FAQ',
      'all',
      'Reset all Homepage FAQs to standard defaults'
    );
  } catch (e) {
    console.warn('Failed to log FAQ reset activity:', e);
  }
}
