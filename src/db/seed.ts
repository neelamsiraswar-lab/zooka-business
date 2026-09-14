// src/db/seed.ts
import { db, COLLECTIONS } from './index.ts';
import { DbUser } from './users.ts';

const activeSeedPromises = new Map<number, Promise<void>>();
const alreadySeededUserIds = new Set<number>();

/**
 * Ensures workspace is clean and has no mock default demo data.
 * Does NOT inject fake businesses, fake GSTINs, or dummy transactions.
 */
export async function seedDemoDataForUser(userRecord: DbUser) {
  if (alreadySeededUserIds.has(userRecord.id)) {
    return;
  }
  if (activeSeedPromises.has(userRecord.id)) {
    return activeSeedPromises.get(userRecord.id);
  }

  const seedTask = (async () => {
    try {
      // Check if legacy default profile exists and sanitize it
      const companyRef = db.collection(COLLECTIONS.COMPANY_PROFILES);
      const snap = await companyRef.get();
      for (const doc of snap.docs) {
        const data = doc.data() as any;
        if (data.businessName === 'T.M ELECTRICAL' || data.gstin === '08IRRPZ8566K1ZD') {
          // Clean up legacy mock data
          await doc.ref.delete();
          console.log('Removed legacy default company profile:', doc.id);
        }
      }
      alreadySeededUserIds.add(userRecord.id);
    } catch (err) {
      console.warn('Workspace data cleanup check:', err);
    }
  })();

  activeSeedPromises.set(userRecord.id, seedTask);
  try {
    await seedTask;
  } finally {
    activeSeedPromises.delete(userRecord.id);
  }
}

