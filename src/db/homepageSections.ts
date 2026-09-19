// src/db/homepageSections.ts
import { db, COLLECTIONS } from './index';
import { HomepageSection, HomepageSectionKey } from '../types';
import { logActivity } from './dataService';

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: 'sec-hero',
    key: 'hero',
    title: 'Hero & User Authentication',
    subtitle: 'Dual sign-in / company registration & statutory value proposition',
    category: 'core',
    icon: 'Sparkles',
    order: 1,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Core Entrance',
    description: 'The primary greeting, headline, active hero feature badges, and registration/login form.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-gst-calculator',
    key: 'gst-calculator',
    title: 'Interactive GST Tax Simulator',
    subtitle: 'Real-time forward & reverse GST tax computations with HSN lookup',
    category: 'tools',
    icon: 'Calculator',
    order: 2,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Interactive Tool',
    description: 'Instant interactive GST calculator allowing prospects to calculate CGST, SGST, IGST, and cess.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-pillars',
    key: 'pillars',
    title: 'Core Architectural Pillars',
    subtitle: 'Built specifically for India statutory accounting standards',
    category: 'core',
    icon: 'Layers',
    order: 3,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Platform Tech',
    description: 'Showcases double-entry general ledgers, multi-tenant databases, bank statement auto-reconciliation, and multi-branch.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-trust-metrics',
    key: 'trust-metrics',
    title: 'Enterprise Scale & Trust Metrics',
    subtitle: '₹1,400+ Cr invoices processed, 99.98% uptime SLA, zero-loss ITC tax tracking',
    category: 'compliance',
    icon: 'BarChart3',
    order: 4,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Live Performance',
    description: 'High-visibility trust indicators showcasing volume, uptime, invoice throughput, and statutory accuracy.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-pricing',
    key: 'pricing',
    title: 'Transparent Pricing & Subscription Plans',
    subtitle: 'Monthly and annual billing tiers tailored for Indian businesses',
    category: 'commercial',
    icon: 'CreditCard',
    order: 5,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Commercial Tiers',
    description: 'The plan catalog matrix with monthly/annual savings, feature allowances, and one-click signup links.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-reviews',
    key: 'reviews',
    title: 'Customer Reviews & Social Proof',
    subtitle: 'Verified testimonials from Chartered Accountants, Tax Consultants & SMEs',
    category: 'social_proof',
    icon: 'MessageSquareQuote',
    order: 6,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Social Proof',
    description: 'Curated reviews and 5-star ratings from verified practitioners and business owners across India.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-security-compliance',
    key: 'security-compliance',
    title: 'Security, Encryption & Statutory GSTN Standards',
    subtitle: 'GSTN sandboxing, 256-Bit TLS encryption, and ISO 27001 readiness',
    category: 'compliance',
    icon: 'ShieldCheck',
    order: 7,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Zero-Trust Security',
    description: 'Highlights bank-grade security protocols, Indian data sovereignty, and tamper-evident SHA-256 audit trails.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-faqs',
    key: 'faqs',
    title: 'Frequently Asked Questions (FAQs)',
    subtitle: 'Interactive accordion addressing common inquiries regarding GST filing & migration',
    category: 'core',
    icon: 'HelpCircle',
    order: 8,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Help & FAQ',
    description: 'Answers for prospective users on data portability, Tally interoperability, multiple branch GSTINs, and e-invoicing.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sec-cta-banner',
    key: 'cta-banner',
    title: 'Enterprise Call To Action (CTA) Banner',
    subtitle: 'High-conversion banner inviting companies to start a 14-day free trial',
    category: 'commercial',
    icon: 'Zap',
    order: 9,
    isVisible: true,
    isBuiltIn: true,
    customBadge: 'Conversion Booster',
    description: 'Engaging closing banner at the bottom of the page prompting users to register their company or schedule a demo.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_CACHE_KEY = 'apex_homepage_sections_cache';

/**
 * Fetch all Homepage Sections from Google Cloud Firestore.
 * Automatically seeds default sections if the collection is unpopulated.
 */
export async function getAllHomepageSections(): Promise<HomepageSection[]> {
  try {
    const colRef = db.collection(COLLECTIONS.HOMEPAGE_SECTIONS);
    const snap = await colRef.get();

    if (!snap.empty) {
      const items: HomepageSection[] = [];
      snap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          key: (data.key || 'hero') as HomepageSectionKey,
          title: data.title || '',
          subtitle: data.subtitle || '',
          category: data.category || 'core',
          icon: data.icon || 'Sparkles',
          order: typeof data.order === 'number' ? data.order : 99,
          isVisible: data.isVisible !== false,
          isBuiltIn: data.isBuiltIn !== false,
          customBadge: data.customBadge || '',
          description: data.description || '',
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

    // Collection is empty, seed standard default homepage sections
    const seededList: HomepageSection[] = [];
    for (const item of DEFAULT_HOMEPAGE_SECTIONS) {
      await colRef.doc(item.id).set(item);
      seededList.push(item);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seededList));
    }
    return seededList;
  } catch (err) {
    console.warn('Could not read homepage_sections from Firestore, falling back to cache/defaults:', err);
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Benign parse error
      }
    }
    return DEFAULT_HOMEPAGE_SECTIONS;
  }
}

/**
 * Update an existing Homepage Section (e.g. title, subtitle, visibility, order).
 */
export async function updateHomepageSection(
  id: string,
  updates: Partial<HomepageSection>
): Promise<HomepageSection> {
  const colRef = db.collection(COLLECTIONS.HOMEPAGE_SECTIONS);
  const now = new Date().toISOString();
  const patchData = {
    ...updates,
    updatedAt: now,
  };

  await colRef.doc(id).update(patchData);

  let updatedSection: HomepageSection = {
    id,
    key: 'hero',
    title: '',
    category: 'core',
    icon: 'Sparkles',
    order: 1,
    isVisible: true,
    description: '',
    ...updates,
    updatedAt: now,
  };

  // Update local storage cache
  try {
    const existing = await getAllHomepageSections();
    const updatedList = existing.map((sec) => {
      if (sec.id === id) {
        updatedSection = { ...sec, ...updates, updatedAt: now };
        return updatedSection;
      }
      return sec;
    });
    updatedList.sort((a, b) => a.order - b.order);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updatedList));
  } catch {
    // Ignore cache error
  }

  // Notify active components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('homepage_sections_updated'));
  }

  // Log in workspace audit trail
  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'UPDATE',
      'HOMEPAGE_SECTION',
      id,
      `Updated Homepage Section "${updatedSection.title}" (visible: ${updatedSection.isVisible}, order: ${updatedSection.order})`
    );
  } catch (e) {
    console.warn('Failed to log homepage section update:', e);
  }

  return updatedSection;
}

/**
 * Toggle visibility of a Homepage Section.
 */
export async function toggleHomepageSectionVisibility(
  id: string,
  isVisible: boolean
): Promise<HomepageSection> {
  return updateHomepageSection(id, { isVisible });
}

/**
 * Move a section's order relative to neighboring items.
 */
export async function moveHomepageSectionOrder(
  sectionId: string,
  direction: 'up' | 'down'
): Promise<HomepageSection[]> {
  const list = await getAllHomepageSections();
  const sorted = [...list].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((s) => s.id === sectionId);

  if (index === -1) return sorted;
  if (direction === 'up' && index === 0) return sorted;
  if (direction === 'down' && index === sorted.length - 1) return sorted;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  const currentItem = sorted[index];
  const targetItem = sorted[targetIndex];

  const currentOrder = currentItem.order;
  const targetOrder = targetItem.order;

  // Swap orders
  await updateHomepageSection(currentItem.id, { order: targetOrder });
  await updateHomepageSection(targetItem.id, { order: currentOrder });

  return getAllHomepageSections();
}

/**
 * Reorder all Homepage Sections according to an array of section IDs in desired order.
 */
export async function reorderAllHomepageSections(orderedIds: string[]): Promise<HomepageSection[]> {
  const list = await getAllHomepageSections();
  const colRef = db.collection(COLLECTIONS.HOMEPAGE_SECTIONS);
  const now = new Date().toISOString();

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const newOrder = i + 1;
    await colRef.doc(id).update({
      order: newOrder,
      updatedAt: now,
    });
  }

  const updatedList = list.map((sec) => {
    const idx = orderedIds.indexOf(sec.id);
    if (idx !== -1) {
      return { ...sec, order: idx + 1, updatedAt: now };
    }
    return sec;
  });
  updatedList.sort((a, b) => a.order - b.order);

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('homepage_sections_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'UPDATE',
      'HOMEPAGE_SECTIONS_REORDER',
      'all',
      `Rearranged landing page component order for ${orderedIds.length} sections`
    );
  } catch (e) {
    console.warn('Failed to log reorder activity:', e);
  }

  return updatedList;
}

/**
 * Add a new custom section.
 */
export async function createHomepageSection(
  sectionData: Omit<HomepageSection, 'id' | 'createdAt' | 'updatedAt'>
): Promise<HomepageSection> {
  const colRef = db.collection(COLLECTIONS.HOMEPAGE_SECTIONS);
  const id = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newSection: HomepageSection = {
    ...sectionData,
    id,
    order: sectionData.order ?? 99,
    isVisible: sectionData.isVisible !== false,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  };

  await colRef.doc(id).set(newSection);

  try {
    const existing = await getAllHomepageSections();
    const updated = [...existing.filter((s) => s.id !== id), newSection].sort((a, b) => a.order - b.order);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('homepage_sections_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'CREATE',
      'HOMEPAGE_SECTION',
      newSection.id,
      `Created Homepage Section "${newSection.title}" (order: ${newSection.order})`
    );
  } catch (e) {
    console.warn('Failed to log section creation:', e);
  }

  return newSection;
}

/**
 * Delete a custom section.
 */
export async function deleteHomepageSection(id: string): Promise<void> {
  const colRef = db.collection(COLLECTIONS.HOMEPAGE_SECTIONS);
  await colRef.doc(id).delete();

  try {
    const existing = await getAllHomepageSections();
    const updated = existing.filter((s) => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('homepage_sections_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'DELETE',
      'HOMEPAGE_SECTION',
      id,
      `Deleted Homepage Section "${id}"`
    );
  } catch (e) {
    console.warn('Failed to log section deletion:', e);
  }
}

/**
 * Reset all homepage sections back to standard default order and visibility.
 */
export async function resetHomepageSectionsToDefault(): Promise<HomepageSection[]> {
  const colRef = db.collection(COLLECTIONS.HOMEPAGE_SECTIONS);

  // Clear existing
  try {
    const snap = await colRef.get();
    for (const docSnap of snap.docs) {
      await colRef.doc(docSnap.id).delete();
    }
  } catch (err) {
    console.warn('Failed to delete existing homepage sections during reset:', err);
  }

  // Seed defaults
  const seeded: HomepageSection[] = [];
  for (const item of DEFAULT_HOMEPAGE_SECTIONS) {
    await colRef.doc(item.id).set(item);
    seeded.push(item);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seeded));
    window.dispatchEvent(new CustomEvent('homepage_sections_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'UPDATE',
      'HOMEPAGE_SECTIONS_RESET',
      'all',
      'Reset all Homepage Sections to factory default order and full visibility'
    );
  } catch (e) {
    console.warn('Failed to log reset activity:', e);
  }

  return seeded;
}
