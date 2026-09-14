// src/db/index.ts
import {
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
} from 'firebase/firestore';
import { db as sharedFirestore } from '../lib/firebase';

export const rawFirestore = sharedFirestore;


// Collection names constants
export const COLLECTIONS = {
  USERS: 'users',
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
