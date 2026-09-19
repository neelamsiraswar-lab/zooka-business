// src/db/customerReviews.ts
import { db, COLLECTIONS } from './index';
import { CustomerReview } from '../types';
import { logActivity } from './dataService';

export const DEFAULT_CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    id: 'review-rajesh-sharma',
    authorName: 'CA Rajesh Sharma',
    roleOrTitle: 'Senior Partner & Tax Specialist',
    companyName: 'Sharma & Associates LLP',
    location: 'Mumbai, Maharashtra',
    rating: 5,
    reviewText: 'Apex TallyGST cut our month-end statutory closing time from 4 days to 4 hours. Automated 2B reconciliation and one-click GSTR-1 JSON export make it the most reliable accounting system for Indian practitioners.',
    badge: 'Verified CA',
    avatarBgColor: 'indigo',
    order: 1,
    isFeatured: true,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'review-priya-sundaram',
    authorName: 'Priya Sundaram',
    roleOrTitle: 'Chief Financial Officer',
    companyName: 'TexFab Exports Pvt Ltd',
    location: 'Coimbatore, Tamil Nadu',
    rating: 5,
    reviewText: 'Multi-branch GST accounting was a nightmare until we migrated. The automated BRS with AI statement matching clears hundreds of vendor cheques effortlessly. Zero discrepancies in statutory audits.',
    badge: 'Enterprise Exporter',
    avatarBgColor: 'emerald',
    order: 2,
    isFeatured: true,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'review-vikram-singhania',
    authorName: 'Vikramaditya Singhania',
    roleOrTitle: 'Managing Director',
    companyName: 'Singhania Industrial Supplies',
    location: 'Ahmedabad, Gujarat',
    rating: 5,
    reviewText: 'The dual CGST/SGST vs IGST calculation is completely fail-safe. Our billing team generates 200+ GST invoices daily with instant thermal and A4 print formats, custom e-way bill ready.',
    badge: 'SME Manufacturer',
    avatarBgColor: 'amber',
    order: 3,
    isFeatured: false,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'review-ananya-deshmukh',
    authorName: 'Ananya Deshmukh',
    roleOrTitle: 'Tax Auditor & Insolvency Professional',
    companyName: 'Deshmukh & Associates',
    location: 'Pune, Maharashtra',
    rating: 5,
    reviewText: 'The immutable SHA-256 audit trail gives our auditors 100% confidence. Every journal voucher, ledger modification, and user permission change is cryptographically tracked.',
    badge: 'Tax Auditor',
    avatarBgColor: 'purple',
    order: 4,
    isFeatured: false,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'review-karthik-narayanan',
    authorName: 'Karthik Narayanan',
    roleOrTitle: 'Co-Founder & COO',
    companyName: 'NexGen Retail Tech',
    location: 'Bengaluru, Karnataka',
    rating: 5,
    reviewText: 'Role-based security PINs for billing staff combined with multi-tenant cloud synchronization allow our retail outlets across 5 cities to work off a single real-time ledger.',
    badge: 'Retail Enterprise',
    avatarBgColor: 'teal',
    order: 5,
    isFeatured: false,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'review-manoj-agarwal',
    authorName: 'Manoj Agarwal',
    roleOrTitle: 'Proprietor',
    companyName: 'Shree Balaji Agro Traders',
    location: 'Indore, Madhya Pradesh',
    rating: 5,
    reviewText: 'Migrating from traditional desktop Tally to Apex cloud was instant. The Day Book, Trial Balance, and Profit & Loss update in real-time on both desktop and mobile without server lag.',
    badge: 'Trading Client',
    avatarBgColor: 'blue',
    order: 6,
    isFeatured: false,
    isActive: true,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_CACHE_KEY = 'apex_customer_reviews_cache';

/**
 * Fetch all Customer Reviews from Google Cloud Firestore.
 * Automatically seeds default reviews if the collection is unpopulated.
 */
export async function getAllCustomerReviews(): Promise<CustomerReview[]> {
  try {
    const colRef = db.collection(COLLECTIONS.REVIEWS);
    const snap = await colRef.get();

    if (!snap.empty) {
      const items: CustomerReview[] = [];
      snap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          authorName: data.authorName || '',
          roleOrTitle: data.roleOrTitle || '',
          companyName: data.companyName || '',
          location: data.location || '',
          rating: typeof data.rating === 'number' ? data.rating : 5,
          reviewText: data.reviewText || '',
          badge: data.badge || '',
          avatarUrl: data.avatarUrl || '',
          avatarBgColor: data.avatarBgColor || 'indigo',
          order: typeof data.order === 'number' ? data.order : 99,
          isFeatured: !!data.isFeatured,
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

    // Collection is empty, seed standard default customer reviews
    const seededList: CustomerReview[] = [];
    for (const r of DEFAULT_CUSTOMER_REVIEWS) {
      const docRef = colRef.doc(r.id);
      await docRef.set(r);
      seededList.push(r);
    }

    seededList.sort((a, b) => a.order - b.order);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seededList));
    }
    return seededList;
  } catch (err) {
    console.warn('Could not read reviews from Firestore, falling back to cache/defaults:', err);
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
    return DEFAULT_CUSTOMER_REVIEWS;
  }
}

/**
 * Add a new Customer Review to Firestore.
 */
export async function createCustomerReview(
  reviewData: Omit<CustomerReview, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomerReview> {
  const colRef = db.collection(COLLECTIONS.REVIEWS);
  const id = `review-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newReview: CustomerReview = {
    ...reviewData,
    id,
    rating: reviewData.rating || 5,
    order: reviewData.order ?? 10,
    isActive: reviewData.isActive !== false,
    isFeatured: !!reviewData.isFeatured,
    createdAt: now,
    updatedAt: now,
  };

  await colRef.doc(id).set(newReview);

  // Update local cache
  try {
    const existing = await getAllCustomerReviews();
    const updated = [...existing.filter((r) => r.id !== id), newReview].sort((a, b) => a.order - b.order);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('customer_reviews_updated'));
  }

  // Log in workspace audit trail
  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'CREATE',
      'CUSTOMER_REVIEW',
      newReview.id,
      `Added Customer Review by "${newReview.authorName}" (${newReview.companyName}) - ${newReview.rating}★`
    );
  } catch (e) {
    console.warn('Failed to log review creation activity:', e);
  }

  return newReview;
}

/**
 * Edit / update an existing Customer Review.
 */
export async function updateCustomerReview(
  id: string,
  updates: Partial<CustomerReview>
): Promise<CustomerReview> {
  const colRef = db.collection(COLLECTIONS.REVIEWS);
  const docRef = colRef.doc(id);
  const now = new Date().toISOString();

  const payload = {
    ...updates,
    updatedAt: now,
  };

  await docRef.set(payload, { merge: true });

  const updatedSnap = await docRef.get();
  const data = updatedSnap.data();
  const updatedReview: CustomerReview = {
    id,
    authorName: data?.authorName || updates.authorName || '',
    roleOrTitle: data?.roleOrTitle || updates.roleOrTitle || '',
    companyName: data?.companyName || updates.companyName || '',
    location: data?.location || updates.location || '',
    rating: typeof data?.rating === 'number' ? data.rating : (updates.rating ?? 5),
    reviewText: data?.reviewText || updates.reviewText || '',
    badge: data?.badge ?? updates.badge,
    avatarUrl: data?.avatarUrl ?? updates.avatarUrl,
    avatarBgColor: data?.avatarBgColor || updates.avatarBgColor || 'indigo',
    order: typeof data?.order === 'number' ? data.order : (updates.order ?? 99),
    isFeatured: data?.isFeatured !== undefined ? data.isFeatured : !!updates.isFeatured,
    isActive: data?.isActive !== false,
    isBuiltIn: data?.isBuiltIn,
    createdAt: data?.createdAt,
    updatedAt: now,
  };

  // Update local cache
  try {
    const existing = await getAllCustomerReviews();
    const updated = existing.map((r) => (r.id === id ? updatedReview : r)).sort((a, b) => a.order - b.order);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('customer_reviews_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'UPDATE',
      'CUSTOMER_REVIEW',
      id,
      `Updated Customer Review for "${updatedReview.authorName}" (${updatedReview.companyName})`
    );
  } catch (e) {
    console.warn('Failed to log review update activity:', e);
  }

  return updatedReview;
}

/**
 * Delete a Customer Review from Firestore.
 */
export async function deleteCustomerReview(id: string): Promise<void> {
  const colRef = db.collection(COLLECTIONS.REVIEWS);
  await colRef.doc(id).delete();

  // Update local cache
  try {
    const existing = await getAllCustomerReviews();
    const updated = existing.filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore cache error
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('customer_reviews_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'DELETE',
      'CUSTOMER_REVIEW',
      id,
      `Deleted Customer Review ID: ${id}`
    );
  } catch (e) {
    console.warn('Failed to log review delete activity:', e);
  }
}

/**
 * Reset all customer reviews to platform factory defaults.
 */
export async function resetCustomerReviewsToDefault(): Promise<CustomerReview[]> {
  const colRef = db.collection(COLLECTIONS.REVIEWS);
  const snap = await colRef.get();

  for (const d of snap.docs) {
    await colRef.doc(d.id).delete();
  }

  const seeded: CustomerReview[] = [];
  for (const r of DEFAULT_CUSTOMER_REVIEWS) {
    await colRef.doc(r.id).set(r);
    seeded.push(r);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(seeded));
    window.dispatchEvent(new CustomEvent('customer_reviews_updated'));
  }

  try {
    await logActivity(
      1,
      'superadmin@apextally.com',
      'RESET',
      'CUSTOMER_REVIEW',
      'all',
      `Reset Customer Reviews to platform factory defaults`
    );
  } catch (e) {
    console.warn('Failed to log review reset activity:', e);
  }

  return seeded;
}
