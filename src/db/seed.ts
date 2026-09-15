// src/db/seed.ts
import { db, COLLECTIONS, getNextSequenceId } from './index.ts';
import { DbUser } from './users.ts';

const activeSeedPromises = new Map<number, Promise<void>>();
const alreadySeededUserIds = new Set<number>();

export async function seedDemoDataForUser(userRecord: DbUser) {
  if (alreadySeededUserIds.has(userRecord.id)) {
    return;
  }
  if (activeSeedPromises.has(userRecord.id)) {
    return activeSeedPromises.get(userRecord.id);
  }

  const seedTask = (async () => {
    try {
      // Check if ANY workspace company profile already exists in Firestore
      const companyRef = db.collection(COLLECTIONS.COMPANY_PROFILES);
      const existingProfilesSnap = await companyRef.limit(1).get();

      if (!existingProfilesSnap.empty) {
        alreadySeededUserIds.add(userRecord.id);
        return;
      }

      // Initialize clean workspace company profile if completely empty
      const initialBusinessName = 'T.M ELECTRICAL';
      const profileId = await getNextSequenceId('company_profile_id');
      const defaultProfile = {
        id: profileId,
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
        invoiceNumberingMode: 'automatic',
        invoicePrefix: 'INV/2026-27/',
        invoiceSuffix: '',
        nextInvoiceNumber: 1,
        invoicePadding: 3,
        preventDuplicateInvoiceNo: true,
        purchaseNumberingMode: 'automatic',
        purchasePrefix: 'PUR/2026-27/',
        nextPurchaseNumber: 1,
        receiptPrefix: 'REC/2026-27/',
        nextReceiptNumber: 1,
        paymentPrefix: 'PAY/2026-27/',
        nextPaymentNumber: 1,
        journalPrefix: 'JV/2026-27/',
        nextJournalNumber: 1,
        contraPrefix: 'CONTRA/2026-27/',
        nextContraNumber: 1,
        invoiceDesignTemplate: 'classic',
        invoiceColorTheme: 'rose',
        invoiceHeaderTitle: 'TAX INVOICE',
        invoiceSubtitle: 'ORIGINAL FOR RECIPIENT',
        invoiceShowLogo: true,
        invoiceLogoUrl: '',
        invoiceShowBankDetails: true,
        invoiceShowUpiQr: true,
        invoiceShowAuthorizedSignatory: true,
        invoiceSignatoryLabel: 'Authorized Signatory',
        invoiceSignatureUrl: '',
        invoiceShowHsnSummary: true,
        invoiceShowTerms: true,
        defaultTerms: '1. Goods once sold will not be accepted back.\n2. Interest @ 18% p.a. will be levied if payment not made within due date.\n3. Subject to local state jurisdiction.',
        defaultNotes: 'Thank you for your business!',
        updatedAt: new Date().toISOString(),
      };

      await companyRef.doc(String(profileId)).set(defaultProfile);
      console.log(`Initialized workspace company profile in Firestore for user ${userRecord.email}`);
      alreadySeededUserIds.add(userRecord.id);
    } catch (err) {
      console.error(`Error in seedDemoDataForUser in Firestore for user ${userRecord.id}:`, err);
    }
  })();

  activeSeedPromises.set(userRecord.id, seedTask);
  try {
    await seedTask;
  } finally {
    activeSeedPromises.delete(userRecord.id);
  }
}
