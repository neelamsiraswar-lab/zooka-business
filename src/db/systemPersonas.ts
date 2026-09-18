// src/db/systemPersonas.ts
import { db, COLLECTIONS } from './index';
import { UserRole } from '../lib/permissions';

export interface SystemPersona {
  id: string; // e.g. 'super_admin', 'admin', 'accountant', 'billing_operator', 'auditor'
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  title: string;
  subtitle: string;
  passwords: string[];
  defaultPin: string;
  displayOrder: number;
  isBuiltIn: boolean;
  updatedAt?: string;
}

export const INITIAL_SYSTEM_PERSONAS: SystemPersona[] = [
  {
    id: 'super_admin',
    uid: 'super-admin-kuldeep',
    email: 'nawarkuldeep@gmail.com',
    displayName: 'Kuldeep Siraswar',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    role: 'super_admin',
    title: 'Super Administrator',
    subtitle: 'Supreme Multi-Tenant & Workspace Governance',
    passwords: ['Kuldeep@2785', '9999', 'admin', 'password', '123456'],
    defaultPin: '9999',
    displayOrder: 1,
    isBuiltIn: true,
  },
  {
    id: 'admin',
    uid: 'admin-workspace-user',
    email: 'admin.rohit@apexaccounting.com',
    displayName: 'Rohit Sharma',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
    role: 'admin',
    title: 'Administrator',
    subtitle: 'Full System & Security Management',
    passwords: ['Admin@2026', '9999', 'admin', 'password', '123456'],
    defaultPin: '9999',
    displayOrder: 2,
    isBuiltIn: true,
  },
  {
    id: 'accountant',
    uid: 'accountant-ca-kuldeep',
    email: 'ca.kuldeep@apexaccounting.com',
    displayName: 'CA Kuldeep Nawar',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    role: 'accountant',
    title: 'Senior Accountant',
    subtitle: 'Ledgers, Vouchers & Tax Filings',
    passwords: ['Accountant@2026', '2222', 'ca', 'password', '123456'],
    defaultPin: '2222',
    displayOrder: 3,
    isBuiltIn: true,
  },
  {
    id: 'billing_operator',
    uid: 'billing-operator-vikram',
    email: 'billing.vikram@apexaccounting.com',
    displayName: 'Vikram Patel',
    photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=faces',
    role: 'billing_operator',
    title: 'Billing Operator',
    subtitle: 'Point-of-Sale, Counter Invoices & Stock Check',
    passwords: ['Billing@2026', '1111', 'billing', 'password', '123456'],
    defaultPin: '1111',
    displayOrder: 4,
    isBuiltIn: true,
  },
  {
    id: 'auditor',
    uid: 'auditor-kavita',
    email: 'auditor.kavita@apexaccounting.com',
    displayName: 'CA Kavita Sharma',
    photoURL: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces',
    role: 'auditor',
    title: 'Statutory Auditor',
    subtitle: 'Read-Only Ledger & GSTR-2B Inspection',
    passwords: ['Auditor@2026', '3333', 'auditor', 'password', '123456'],
    defaultPin: '3333',
    displayOrder: 5,
    isBuiltIn: true,
  },
];

let personasMemoryCache: SystemPersona[] | null = null;
let personasCacheExpiry = 0;

/**
 * Fetch all system personas directly from Google Cloud Firestore.
 * Auto-seeds initial documents if collection is empty so cloud storage is the single source of truth.
 */
export async function getSystemPersonas(): Promise<SystemPersona[]> {
  if (personasMemoryCache && Date.now() < personasCacheExpiry) {
    return personasMemoryCache;
  }

  try {
    const colRef = db.collection(COLLECTIONS.SYSTEM_PERSONAS);
    const snap = await colRef.get();

    if (snap.empty) {
      // Seed to Firestore
      for (const p of INITIAL_SYSTEM_PERSONAS) {
        await colRef.doc(p.id).set({
          ...p,
          updatedAt: new Date().toISOString(),
        });
      }
      personasMemoryCache = INITIAL_SYSTEM_PERSONAS;
      personasCacheExpiry = Date.now() + 60 * 1000;
      return INITIAL_SYSTEM_PERSONAS;
    }

    const fetched: SystemPersona[] = snap.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: data.uid || `user-${docSnap.id}`,
        email: (data.email || '').toLowerCase().trim(),
        displayName: data.displayName || 'Demo User',
        photoURL: data.photoURL || '',
        role: data.role || 'accountant',
        title: data.title || 'Team Member',
        subtitle: data.subtitle || '',
        passwords: Array.isArray(data.passwords) ? data.passwords : ['123456'],
        defaultPin: data.defaultPin || '1234',
        displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 99,
        isBuiltIn: !!data.isBuiltIn,
        updatedAt: data.updatedAt,
      };
    });

    fetched.sort((a, b) => a.displayOrder - b.displayOrder);
    personasMemoryCache = fetched;
    personasCacheExpiry = Date.now() + 60 * 1000;
    return fetched;
  } catch (error) {
    console.warn('getSystemPersonas Firestore fetch warning:', error);
    return INITIAL_SYSTEM_PERSONAS;
  }
}

/**
 * Find persona matching an email from Google Cloud Firestore
 */
export async function getPersonaByEmail(email: string): Promise<SystemPersona | null> {
  const normalized = email.toLowerCase().trim();
  const all = await getSystemPersonas();
  return all.find((p) => p.email.toLowerCase() === normalized) || null;
}

/**
 * Find persona matching a role from Google Cloud Firestore
 */
export async function getPersonaByRole(role: UserRole): Promise<SystemPersona | null> {
  const all = await getSystemPersonas();
  return all.find((p) => p.role === role) || null;
}

/**
 * Invalidate in-memory cache to force a fresh pull from Cloud Firestore
 */
export function clearPersonasCache() {
  personasMemoryCache = null;
  personasCacheExpiry = 0;
}
