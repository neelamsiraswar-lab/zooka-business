import { db } from './index.ts';
import {
  users,
  companyProfiles,
  parties,
  inventoryItems,
  invoices,
  invoiceItems,
  expenses,
  chequeBooks,
  cheques,
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
      // Check if user already has data
      const existingProfiles = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userRecord.id));
      if (existingProfiles.length > 0) {
        alreadySeededUserIds.add(userRecord.id);
        return;
      }

      console.log(`Seeding initial accounting ledgers & inventory for user ${userRecord.email}...`);

  // 1. Company Profile
  await db.insert(companyProfiles).values({
    userId: userRecord.id,
    businessName: 'Bharat Electronics & Industrial Supplies',
    tradeName: 'Bharat Tech ERP',
    gstin: '27AAECB9382M1ZR',
    stateCode: '27',
    stateName: 'Maharashtra',
    address: 'Unit 402, Trade Link Tower, Lower Parel, Mumbai - 400013',
    phone: '+91 98201 54321',
    email: userRecord.email,
    bankName: 'State Bank of India',
    accountNumber: '39485019284',
    ifscCode: 'SBIN0001824',
    upiId: 'bharatelec@sbi',
  });

  // 2. Parties
  const partyRows = await db.insert(parties).values([
    {
      userId: userRecord.id,
      partyType: 'customer',
      name: 'Tata Consultancy & Infra Projects',
      gstin: '27AAACT2727Q1ZW',
      stateCode: '27',
      stateName: 'Maharashtra',
      phone: '+91 98220 99881',
      email: 'procurement@tatainfra.com',
      address: 'Nariman Point, Marine Drive, Mumbai',
      openingBalance: '45000.00',
      balanceType: 'dr',
    },
    {
      userId: userRecord.id,
      partyType: 'customer',
      name: 'Bangalore Smart Grid Corp (Interstate)',
      gstin: '29AABCB1029K1Z4',
      stateCode: '29',
      stateName: 'Karnataka',
      phone: '+91 80220 11223',
      email: 'finance@bangaloresmartgrid.org',
      address: 'Whitefield Tech Park, Bengaluru 560066',
      openingBalance: '82000.00',
      balanceType: 'dr',
    },
    {
      userId: userRecord.id,
      partyType: 'vendor',
      name: 'Schneider Industrial Components Ltd',
      gstin: '27AAACS1482E1ZE',
      stateCode: '27',
      stateName: 'Maharashtra',
      phone: '+91 22 6677 8899',
      email: 'orders@schneider-ind.com',
      address: 'Chakan Industrial Estate, Pune',
      openingBalance: '32000.00',
      balanceType: 'cr',
    },
  ]).returning();

  // 3. Inventory Items
  const stockRows = await db.insert(inventoryItems).values([
    {
      userId: userRecord.id,
      name: '3-Phase Smart Power Relay Switch',
      sku: 'REL-3PH-40A',
      hsnCode: '8536',
      unit: 'NOS',
      sellingPrice: '4850.00',
      purchasePrice: '3600.00',
      gstRate: '18.00',
      openingStock: '45',
      currentStock: '40',
      minStockAlert: '10',
    },
    {
      userId: userRecord.id,
      name: 'Industrial Fiber Optic Patch Cord 10m',
      sku: 'FIB-COR-10M',
      hsnCode: '8544',
      unit: 'MTR',
      sellingPrice: '850.00',
      purchasePrice: '520.00',
      gstRate: '18.00',
      openingStock: '120',
      currentStock: '95',
      minStockAlert: '25',
    },
    {
      userId: userRecord.id,
      name: 'Digital Surge Protection Device (SPD 40kA)',
      sku: 'SPD-40KA-DIG',
      hsnCode: '8535',
      unit: 'NOS',
      sellingPrice: '3200.00',
      purchasePrice: '2250.00',
      gstRate: '18.00',
      openingStock: '30',
      currentStock: '18',
      minStockAlert: '8',
    },
    {
      userId: userRecord.id,
      name: 'Precision Multimeter Calibration Unit',
      sku: 'CAL-UNI-990',
      hsnCode: '9030',
      unit: 'NOS',
      sellingPrice: '12500.00',
      purchasePrice: '9500.00',
      gstRate: '18.00',
      openingStock: '10',
      currentStock: '7',
      minStockAlert: '3',
    },
  ]).returning();

  // 4. Sample Invoices
  const inv1 = await db.insert(invoices).values({
    userId: userRecord.id,
    partyId: partyRows[0].id,
    voucherType: 'sales',
    invoiceNumber: 'INV-2026-001',
    invoiceDate: '2026-09-02',
    dueDate: '2026-09-17',
    partyName: partyRows[0].name,
    partyGstin: partyRows[0].gstin,
    placeOfSupply: '27',
    isInterstate: false,
    subtotal: '24250.00',
    cgstTotal: '2182.50',
    sgstTotal: '2182.50',
    igstTotal: '0.00',
    taxTotal: '4365.00',
    discountTotal: '0.00',
    grandTotal: '28615.00',
    paidAmount: '28615.00',
    paymentStatus: 'paid',
    paymentMode: 'bank_transfer',
    notes: 'Payment received in full via NEFT. Reference SBI/049281.',
    termsAndConditions: 'Warranty as per manufacturer terms.',
    status: 'active',
  }).returning();

  await db.insert(invoiceItems).values({
    invoiceId: inv1[0].id,
    itemId: stockRows[0].id,
    itemName: stockRows[0].name,
    hsnCode: stockRows[0].hsnCode,
    quantity: '5',
    unit: stockRows[0].unit,
    rate: '4850.00',
    discountPercent: '0.00',
    taxableValue: '24250.00',
    gstRate: '18.00',
    cgstAmount: '2182.50',
    sgstAmount: '2182.50',
    igstAmount: '0.00',
    total: '28615.00',
  });

  const inv2 = await db.insert(invoices).values({
    userId: userRecord.id,
    partyId: partyRows[1].id,
    voucherType: 'sales',
    invoiceNumber: 'INV-2026-002',
    invoiceDate: '2026-09-08',
    dueDate: '2026-09-23',
    partyName: partyRows[1].name,
    partyGstin: partyRows[1].gstin,
    placeOfSupply: '29',
    isInterstate: true,
    subtotal: '37500.00',
    cgstTotal: '0.00',
    sgstTotal: '0.00',
    igstTotal: '6750.00',
    taxTotal: '6750.00',
    discountTotal: '0.00',
    grandTotal: '44250.00',
    paidAmount: '20000.00',
    paymentStatus: 'partial',
    paymentMode: 'bank_transfer',
    notes: 'Partial payment of 20,000 received. Balance 24,250 due next week.',
    termsAndConditions: 'Inter-state IGST billing as per GST Act section 7.',
    status: 'active',
  }).returning();

  await db.insert(invoiceItems).values({
    invoiceId: inv2[0].id,
    itemId: stockRows[3].id,
    itemName: stockRows[3].name,
    hsnCode: stockRows[3].hsnCode,
    quantity: '3',
    unit: stockRows[3].unit,
    rate: '12500.00',
    discountPercent: '0.00',
    taxableValue: '37500.00',
    gstRate: '18.00',
    cgstAmount: '0.00',
    sgstAmount: '0.00',
    igstAmount: '6750.00',
    total: '44250.00',
  });

  // 5. Sample Expenses
  await db.insert(expenses).values([
    {
      userId: userRecord.id,
      category: 'Salaries & Staff',
      amount: '35000.00',
      date: '2026-09-01',
      paymentMode: 'bank_transfer',
      referenceNumber: 'SAL-SEP-26',
      description: 'Accountant and warehouse supervisor monthly stipend',
      gstPaid: '0.00',
      itcEligible: false,
    },
    {
      userId: userRecord.id,
      category: 'Rent & Warehouse',
      amount: '22000.00',
      date: '2026-09-03',
      paymentMode: 'bank_transfer',
      vendorName: 'MIDC Premises Estate LLC',
      gstin: '27AAECM5544N1ZR',
      description: 'Commercial godown lease for September',
      gstPaid: '3960.00',
      itcEligible: true,
    },
    {
      userId: userRecord.id,
      category: 'Transport/Freight',
      amount: '4200.00',
      date: '2026-09-06',
      paymentMode: 'upi',
      vendorName: 'Blue Dart Logistics Express',
      gstin: '27AAACB0998Q1ZV',
      description: 'Expedited dispatch of relays to Bangalore site',
      gstPaid: '756.00',
      itcEligible: true,
    },
    {
      userId: userRecord.id,
      category: 'Utilities & Internet',
      amount: '2850.00',
      date: '2026-09-07',
      paymentMode: 'bank_transfer',
      vendorName: 'Tata Tele Business Services',
      gstin: '27AAACT9900L1ZS',
      description: 'Fiber internet 300mbps leased line',
      gstPaid: '513.00',
      itcEligible: true,
    },
  ]);

  // 6. Cheque Books
  const books = await db.insert(chequeBooks).values([
    {
      userId: userRecord.id,
      bankName: 'State Bank of India',
      accountNumber: '39485019284',
      bookName: 'SBI Current A/c (100101 - 100150)',
      seriesPrefix: 'SBI',
      startNumber: 100101,
      endNumber: 100150,
      totalLeaves: 50,
      usedLeaves: 4,
      status: 'active',
    },
    {
      userId: userRecord.id,
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200049281729',
      bookName: 'HDFC Primary Business (000201 - 000250)',
      seriesPrefix: 'HD',
      startNumber: 201,
      endNumber: 250,
      totalLeaves: 50,
      usedLeaves: 2,
      status: 'active',
    },
  ]).returning();

  // 7. Cheques Register (Inward & Outward with different statuses)
  await db.insert(cheques).values([
    {
      userId: userRecord.id,
      chequeType: 'inward',
      chequeNumber: '448102',
      chequeDate: '2026-09-10',
      amount: '45000.00',
      partyId: partyRows[0]?.id,
      payeeName: 'Tata Consultancy & Infra Projects',
      bankName: 'HDFC Bank Ltd',
      branchName: 'Nariman Point, Mumbai',
      ifscCode: 'HDFC0000240',
      depositBank: 'State Bank of India - Current A/c',
      status: 'deposited',
      isPdc: false,
      isAccountPayee: true,
      depositDate: '2026-09-11',
      remarks: 'Payment towards Invoice #INV/2026-27/001 Part-1',
    },
    {
      userId: userRecord.id,
      chequeType: 'inward',
      chequeNumber: '782910',
      chequeDate: '2026-09-25', // Future date PDC
      amount: '82000.00',
      partyId: partyRows[1]?.id,
      payeeName: 'Bangalore Smart Grid Corp (Interstate)',
      bankName: 'Canara Bank',
      branchName: 'Whitefield Branch, Bengaluru',
      ifscCode: 'CNRB0002819',
      depositBank: 'State Bank of India - Current A/c',
      status: 'in_hand',
      isPdc: true,
      isAccountPayee: true,
      remarks: 'Post-dated cheque against supply order #BGS-902',
    },
    {
      userId: userRecord.id,
      chequeBookId: books[0]?.id,
      chequeType: 'outward',
      chequeNumber: '100101',
      chequeDate: '2026-09-02',
      amount: '32000.00',
      partyId: partyRows[2]?.id,
      payeeName: 'Schneider Industrial Components Ltd',
      bankName: 'State Bank of India',
      branchName: 'Lower Parel, Mumbai',
      ifscCode: 'SBIN0001824',
      depositBank: 'State Bank of India - Current A/c',
      status: 'cleared',
      isPdc: false,
      isAccountPayee: true,
      depositDate: '2026-09-02',
      clearanceDate: '2026-09-04',
      remarks: 'Issued for purchase order materials clearance',
    },
    {
      userId: userRecord.id,
      chequeType: 'inward',
      chequeNumber: '990124',
      chequeDate: '2026-09-01',
      amount: '15000.00',
      payeeName: 'Global Electrical Distributors',
      bankName: 'Punjab National Bank',
      branchName: 'Andheri East',
      ifscCode: 'PUNB0123400',
      depositBank: 'State Bank of India - Current A/c',
      status: 'bounced',
      isPdc: false,
      isAccountPayee: true,
      depositDate: '2026-09-03',
      bounceDate: '2026-09-05',
      bounceReason: 'Funds Insufficient (Code: 01)',
      bounceCharges: '354.00',
      remarks: 'Bank return memo received; customer notified for replacement RTGS',
    },
    {
      userId: userRecord.id,
      chequeBookId: books[0]?.id,
      chequeType: 'outward',
      chequeNumber: '100102',
      chequeDate: '2026-09-18',
      amount: '22000.00',
      payeeName: 'MIDC Premises Estate LLC',
      bankName: 'State Bank of India',
      branchName: 'Lower Parel, Mumbai',
      ifscCode: 'SBIN0001824',
      depositBank: 'State Bank of India - Current A/c',
      status: 'in_hand',
      isPdc: true,
      isAccountPayee: true,
      remarks: 'Advance godown rent for October 2026',
    },
  ]);

  console.log('Sample accounting and cheque management data seeded successfully.');
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
