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
      // Check if ANY workspace company profile already exists in the database
      const existingProfiles = await db
        .select()
        .from(companyProfiles)
        .limit(1);

      if (existingProfiles.length > 0) {
        alreadySeededUserIds.add(userRecord.id);
        return;
      }

      // Initialize clean workspace company profile if completely empty
      const initialBusinessName = 'T.M ELECTRICAL';
      await db.insert(companyProfiles).values({
        userId: userRecord.id,
        businessName: initialBusinessName,
        tradeName: initialBusinessName,
        gstin: '08IRRPZ8566K1ZD',
        stateCode: '08',
        stateName: 'Rajasthan',
        address: 'INFRONT OF BIJLI GHAR, NH21 HALENA',
        phone: '+91 8005594714',
        email: 'sonusaini5500@gmail.com',
        bankName: 'State Bank of India',
        accountNumber: '39485019284',
        ifscCode: 'SBIN0001824',
        upiId: '8005594714@pthdfc',
        invoiceDesignTemplate: 'classic',
        invoiceColorTheme: 'rose',
        defaultTerms: '1. Goods once sold will not be accepted back.\n2. Interest @ 18% p.a. will be levied if payment not made within due date.\n3. Subject to local state jurisdiction.',
        defaultNotes: 'Thank you for your business!',
        nextInvoiceNumber: 1,
        nextPurchaseNumber: 1,
        nextReceiptNumber: 1,
        nextPaymentNumber: 1,
        nextJournalNumber: 1,
        nextContraNumber: 1,
      });

      console.log(`Initialized workspace company profile for user ${userRecord.email}`);
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
