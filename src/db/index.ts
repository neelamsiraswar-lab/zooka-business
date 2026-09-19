// src/db/index.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
  WhereFilterOp,
  OrderByDirection,
  QueryConstraint,
  enableNetwork,
  disableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const rawFirestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
setLogLevel('error');

// Suppress benign Firestore offline connection warnings in sandbox containers
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: any[]) => {
    const str = args.join(' ');
    if (str.includes('@firebase/firestore') || str.includes('Could not reach Cloud Firestore backend')) {
      return;
    }
    originalWarn(...args);
  };
  console.error = (...args: any[]) => {
    const str = args.join(' ');
    if (str.includes('@firebase/firestore') || str.includes('Could not reach Cloud Firestore backend')) {
      return;
    }
    originalError(...args);
  };
}

// Collection names constants
export const COLLECTIONS = {
  USERS: 'users',
  WORKSPACES: 'workspaces',
  COMPANY_PROFILES: 'company_profiles',
  PARTIES: 'parties',
  INVENTORY_ITEMS: 'inventory_items',
  INVOICES: 'invoices',
  EXPENSES: 'expenses',
  PAYMENTS: 'payments',
  JOURNAL_ENTRIES: 'journal_entries',
  CHEQUE_BOOKS: 'cheque_books',
  CHEQUES: 'cheques',
  BANK_STATEMENTS: 'bank_statements',
  ACTIVITY_LOGS: 'activity_logs',
  COUNTERS: 'counters',
  SUBSCRIPTION_PLANS: 'subscription_plans',
  SUBSCRIPTION_INVOICES: 'subscription_invoices',
  PLATFORM_SETTINGS: 'platform_settings',
  SYSTEM_PERSONAS: 'system_personas',
  ARCHITECTURAL_PILLARS: 'architectural_pillars',
  REVIEWS: 'reviews',
  FEATURE_BADGES: 'feature_badges',
  HOMEPAGE_SECTIONS: 'homepage_sections',
  HOMEPAGE_FAQS: 'homepage_faqs',
} as const;

// Compatible wrapper around Firebase Web SDK
class QueryBuilder {
  private colName: string;
  private constraints: QueryConstraint[] = [];

  constructor(colName: string, constraints: QueryConstraint[] = []) {
    this.colName = colName;
    this.constraints = [...constraints];
  }

  where(field: string, op: WhereFilterOp, value: any) {
    return new QueryBuilder(this.colName, [...this.constraints, where(field, op, value)]);
  }

  orderBy(field: string, direction: OrderByDirection = 'asc') {
    return new QueryBuilder(this.colName, [...this.constraints, orderBy(field, direction)]);
  }

  limit(count: number) {
    return new QueryBuilder(this.colName, [...this.constraints, limit(count)]);
  }

  async get() {
    const colRef = collection(rawFirestore, this.colName);
    const q = this.constraints.length > 0 ? query(colRef, ...this.constraints) : colRef;
    const snap = await getDocs(q);
    return {
      empty: snap.empty,
      size: snap.size,
      docs: snap.docs.map((d) => ({
        id: d.id,
        exists: d.exists(),
        data: () => d.data(),
        ref: new DocRefWrapper(this.colName, d.id),
      })),
    };
  }
}

export function sanitizeFirestoreData(data: any, isMerge = false): any {
  if (data === undefined) return isMerge ? undefined : null;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFirestoreData(item, isMerge));
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      if (!isMerge) {
        clean[key] = null;
      }
    } else {
      const sanitized = sanitizeFirestoreData(value, isMerge);
      if (sanitized !== undefined) {
        clean[key] = sanitized;
      }
    }
  }
  return clean;
}

export function sanitizeFirestoreUpdate(data: any): any {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFirestoreData(item, true));
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const sanitized = sanitizeFirestoreData(value, true);
      if (sanitized !== undefined) {
        clean[key] = sanitized;
      }
    }
  }
  return clean;
}

export class DocRefWrapper {
  public colName: string;
  public docId: string;

  constructor(colName: string, docId: string) {
    this.colName = colName;
    this.docId = String(docId);
  }

  get id() {
    return this.docId;
  }

  get rawRef() {
    return doc(rawFirestore, this.colName, this.docId);
  }

  get ref() {
    return this;
  }

  async get() {
    const snap = await getDoc(this.rawRef);
    return {
      id: snap.id,
      exists: snap.exists(),
      data: () => snap.data(),
      ref: this,
    };
  }

  async set(data: any, options?: { merge?: boolean }) {
    const isMerge = !!options?.merge;
    const cleanData = sanitizeFirestoreData(data, isMerge);
    await setDoc(this.rawRef, cleanData, options || {});
    return this;
  }

  async update(data: any) {
    const cleanData = sanitizeFirestoreUpdate(data);
    await updateDoc(this.rawRef, cleanData);
    return this;
  }

  async delete() {
    await deleteDoc(this.rawRef);
  }
}

class BatchWrapper {
  private batch = writeBatch(rawFirestore);

  private getRef(target: any) {
    if (target?.rawRef) return target.rawRef;
    if (target?.ref?.rawRef) return target.ref.rawRef;
    if (target?.ref?.id && target?.ref?.colName) {
      return doc(rawFirestore, target.ref.colName, String(target.ref.id));
    }
    if (target?.id && target?.colName) {
      return doc(rawFirestore, target.colName, String(target.id));
    }
    return target;
  }

  set(docWrapper: any, data: any, options?: { merge?: boolean }) {
    const targetRef = this.getRef(docWrapper);
    const isMerge = !!options?.merge;
    const cleanData = sanitizeFirestoreData(data, isMerge);
    this.batch.set(targetRef, cleanData, options || {});
    return this;
  }

  update(docWrapper: any, data: any) {
    const targetRef = this.getRef(docWrapper);
    const cleanData = sanitizeFirestoreUpdate(data);
    this.batch.update(targetRef, cleanData);
    return this;
  }

  delete(docWrapper: any) {
    const targetRef = this.getRef(docWrapper);
    this.batch.delete(targetRef);
    return this;
  }

  async commit() {
    await this.batch.commit();
  }
}

export const db = {
  collection(name: string) {
    return {
      doc(id: string | number) {
        return new DocRefWrapper(name, String(id));
      },
      where(field: string, op: WhereFilterOp, value: any) {
        return new QueryBuilder(name).where(field, op, value);
      },
      orderBy(field: string, direction?: OrderByDirection) {
        return new QueryBuilder(name).orderBy(field, direction);
      },
      limit(count: number) {
        return new QueryBuilder(name).limit(count);
      },
      async get() {
        return new QueryBuilder(name).get();
      },
    };
  },

  batch() {
    return new BatchWrapper();
  },

  async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    return await runTransaction(rawFirestore, async (txn) => {
      const txnWrapper = {
        async get(docWrapper: any) {
          const rawRef = docWrapper?.rawRef || docWrapper?.ref?.rawRef || docWrapper;
          const snap = await txn.get(rawRef);
          return {
            id: snap.id,
            exists: snap.exists(),
            data: () => snap.data(),
          };
        },
        set(docWrapper: any, data: any, options?: { merge?: boolean }) {
          const rawRef = docWrapper?.rawRef || docWrapper?.ref?.rawRef || docWrapper;
          const isMerge = !!options?.merge;
          const cleanData = sanitizeFirestoreData(data, isMerge);
          txn.set(rawRef, cleanData, options || {});
          return this;
        },
        update(docWrapper: any, data: any) {
          const rawRef = docWrapper?.rawRef || docWrapper?.ref?.rawRef || docWrapper;
          const cleanData = sanitizeFirestoreUpdate(data);
          txn.update(rawRef, cleanData);
          return this;
        },
        delete(docWrapper: any) {
          const rawRef = docWrapper?.rawRef || docWrapper?.ref?.rawRef || docWrapper;
          txn.delete(rawRef);
          return this;
        },
      };
      return await updateFunction(txnWrapper);
    });
  },
};

// Helper to get next sequential integer ID atomically for any entity in Firestore
export async function getNextSequenceId(sequenceName: string): Promise<number> {
  try {
    const counterRef = db.collection(COLLECTIONS.COUNTERS).doc(sequenceName);
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(counterRef);
      let nextVal = 1;
      if (snapshot.exists) {
        nextVal = ((snapshot.data()?.currentValue as number) || 0) + 1;
      }
      transaction.set(counterRef, { currentValue: nextVal, updatedAt: new Date().toISOString() }, { merge: true });
      return nextVal;
    });
    return result;
  } catch (err) {
    // Fallback if transaction fails
    return Date.now() + Math.floor(Math.random() * 1000);
  }
}

export interface FirestoreConnectionStatus {
  status: 'connected' | 'error' | 'connecting';
  latencyMs: number;
  projectId: string;
  databaseId: string;
  authDomain: string;
  error?: string;
  timestamp: string;
  documentCountSample?: number;
}

export async function testFirestoreConnection(): Promise<FirestoreConnectionStatus> {
  const startTime = performance.now();
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const authDomain = firebaseConfig.authDomain;

  try {
    // Test live Firestore connectivity with sample query
    const sampleRef = collection(rawFirestore, COLLECTIONS.WORKSPACES);
    const q = query(sampleRef, limit(1));
    const snapshot = await getDocs(q);
    const latencyMs = Math.round(performance.now() - startTime);

    return {
      status: 'connected',
      latencyMs,
      projectId,
      databaseId,
      authDomain,
      documentCountSample: snapshot.size,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      status: 'error',
      latencyMs,
      projectId,
      databaseId,
      authDomain,
      error: err?.message || 'Failed to communicate with Cloud Firestore backend',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function reconnectFirestore(): Promise<FirestoreConnectionStatus> {
  try {
    await enableNetwork(rawFirestore).catch(() => {});
  } catch (e) {
    // ignore
  }
  return await testFirestoreConnection();
}

