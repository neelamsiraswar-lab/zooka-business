import { db } from './index.ts';
import {
  users,
  companyProfiles,
} from './schema.ts';
import { eq } from 'drizzle-orm';

const activeSeedPromises = new Map<number, Promise<void>>();
const alreadySeededUserIds = new Set<number>();

export async function seedDemoDataForUser(userRecord: typeof users.$inferSelect) {
  if (alreadySeededUserIds.has(userRecord.id)) {
    return;
  }
  if (activeSeedPromises.has(userRecord.id)) {
    return activeSeedPromises.get(userRecord.id);
  }

  const seedTask = (async () => {
    try {
      // Check if user already has a company profile initialized
      const existingProfiles = await db
        .select()
        .from(companyProfiles)
        .where(eq(companyProfiles.userId, userRecord.id));

      if (existingProfiles.length > 0) {
        alreadySeededUserIds.add(userRecord.id);
        return;
      }

      // Initialize clean workspace company profile (no dummy transactions or ledgers)
      const initialBusinessName = userRecord.displayName || 'My Business Enterprise';
      await db.insert(companyProfiles).values({
        userId: userRecord.id,
        businessName: initialBusinessName,
        tradeName: initialBusinessName,
        gstin: '',
        stateCode: '27',
        stateName: 'Maharashtra',
        address: '',
        phone: '',
        email: userRecord.email,
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        nextInvoiceNumber: 1,
        nextPurchaseNumber: 1,
        nextReceiptNumber: 1,
        nextPaymentNumber: 1,
        nextJournalNumber: 1,
        nextContraNumber: 1,
      });

      console.log(`Initialized fresh empty accounting workspace for user ${userRecord.email}`);
      alreadySeededUserIds.add(userRecord.id);
    } catch (err) {
      console.error(`Error in seedDemoDataForUser for user ${userRecord.id}:`, err);
    }
  })();

  activeSeedPromises.set(userRecord.id, seedTask);
  try {
    await seedTask;
  } finally {
    activeSeedPromises.delete(userRecord.id);
  }
}
