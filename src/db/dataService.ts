// src/db/dataService.ts
import { db, COLLECTIONS, getNextSequenceId } from './index.ts';

// Activity Logger
export async function logActivity(
  userId: number,
  email: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: string
) {
  try {
    const logId = await getNextSequenceId('activity_log_id');
    const logDoc = {
      id: logId,
      userId,
      userEmail: email,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      details: details || null,
      createdAt: new Date().toISOString(),
    };
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).doc(String(logId)).set(logDoc);
  } catch (err) {
    console.error('Failed to log activity in Firestore:', err);
  }
}

export async function getActivityLogs(userId?: number, limit = 50) {
  try {
    const logsRef = db.collection(COLLECTIONS.ACTIVITY_LOGS);
    const snap = await logsRef.orderBy('id', 'desc').limit(limit).get();
    return snap.docs.map((doc) => doc.data());
  } catch (err) {
    console.error('Failed to fetch activity logs from Firestore:', err);
    return [];
  }
}

// Company Profile
export async function getCompanyProfile(userId?: number) {
  try {
    const profilesRef = db.collection(COLLECTIONS.COMPANY_PROFILES);
    const snap = await profilesRef.get();
    const list = snap.docs.map((doc) => doc.data());

    // Prioritize configured company profile (with GSTIN or non-empty business name)
    const configured = list.find(
      (p: any) => p.gstin || (p.businessName && p.businessName !== 'My Enterprise' && p.businessName !== 'Enterprise Billing')
    ) || list[0];

    if (configured) return configured;
  } catch (err) {
    console.error('Error getting company profile from Firestore:', err);
  }

  // return clean default company profile
  return {
    id: 1,
    businessName: 'T.M ELECTRICAL',
    tradeName: 'T.M ELECTRICAL',
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
  };
}

export async function upsertCompanyProfile(userId: number, data: any) {
  const profilesRef = db.collection(COLLECTIONS.COMPANY_PROFILES);
  const snap = await profilesRef.limit(1).get();

  const cleanData = {
    ...data,
    userId,
    updatedAt: new Date().toISOString(),
  };

  if (!snap.empty) {
    const existingDoc = snap.docs[0];
    const updated = { ...existingDoc.data(), ...cleanData };
    await existingDoc.ref.set(updated, { merge: true });
    return updated;
  } else {
    const profileId = await getNextSequenceId('company_profile_id');
    const newDoc = { id: profileId, ...cleanData };
    await profilesRef.doc(String(profileId)).set(newDoc);
    return newDoc;
  }
}

export function formatInvoiceNumber(prefix: string, counter: number, padding: number, suffix: string): string {
  const padded = String(Math.max(1, counter)).padStart(Math.max(1, padding), '0');
  return `${prefix || ''}${padded}${suffix || ''}`;
}

export async function getNextAvailableInvoiceNumber(userId: number, voucherType: 'sales' | 'purchase' = 'sales') {
  const company = await getCompanyProfile(userId);
  const isPurchase = voucherType === 'purchase';
  const mode = isPurchase
    ? (company.purchaseNumberingMode || 'automatic')
    : (company.invoiceNumberingMode || 'automatic');
  const prefix = isPurchase
    ? (company.purchasePrefix || 'PUR/2026-27/')
    : (company.invoicePrefix || 'INV/2026-27/');
  const suffix = isPurchase ? '' : (company.invoiceSuffix || '');
  const padding = isPurchase ? 3 : (company.invoicePadding || 3);
  let counter = isPurchase ? (company.nextPurchaseNumber || 1) : (company.nextInvoiceNumber || 1);

  // Fetch all existing invoice numbers for this voucherType
  const invoicesSnap = await db
    .collection(COLLECTIONS.INVOICES)
    .where('voucherType', '==', voucherType)
    .get();

  const existingNumbers = new Set(
    invoicesSnap.docs.map((doc) => (doc.data().invoiceNumber || '').trim().toLowerCase())
  );

  let candidate = formatInvoiceNumber(prefix, counter, padding, suffix);
  let safetyLoop = 0;
  while (existingNumbers.has(candidate.toLowerCase()) && safetyLoop < 1000) {
    counter++;
    candidate = formatInvoiceNumber(prefix, counter, padding, suffix);
    safetyLoop++;
  }

  return {
    mode,
    prefix,
    suffix,
    padding,
    counter,
    formattedNumber: candidate,
  };
}

export async function checkInvoiceNumberDuplicate(
  userId: number,
  invoiceNumber: string,
  excludeInvoiceId?: number
) {
  const trimmed = (invoiceNumber || '').trim().toLowerCase();
  if (!trimmed) {
    return { isDuplicate: false };
  }

  const snap = await db.collection(COLLECTIONS.INVOICES).get();
  const duplicate = snap.docs.some((doc) => {
    const data = doc.data();
    if (excludeInvoiceId && data.id === excludeInvoiceId) return false;
    return (data.invoiceNumber || '').trim().toLowerCase() === trimmed;
  });

  return { isDuplicate: duplicate };
}

// Parties (Customers & Vendors)
export async function getParties(userId?: number) {
  const partiesSnap = await db.collection(COLLECTIONS.PARTIES).get();
  const invoicesSnap = await db.collection(COLLECTIONS.INVOICES).get();
  const paymentsSnap = await db.collection(COLLECTIONS.PAYMENTS).get();

  const allInvoices = invoicesSnap.docs.map((d) => d.data());
  const allPayments = paymentsSnap.docs.map((d) => d.data());

  return partiesSnap.docs.map((doc) => {
    const party = doc.data() as any;
    const partyId = party.id;

    const partyInvoices = allInvoices.filter((inv: any) => inv.partyId === partyId && inv.status !== 'cancelled');
    const partyPayments = allPayments.filter((pm: any) => pm.partyId === partyId);

    const totalSales = partyInvoices
      .filter((i: any) => i.voucherType === 'sales')
      .reduce((sum: number, i: any) => sum + (parseFloat(i.grandTotal) || 0), 0);
    const totalPurchases = partyInvoices
      .filter((i: any) => i.voucherType === 'purchase')
      .reduce((sum: number, i: any) => sum + (parseFloat(i.grandTotal) || 0), 0);

    const receipts = partyPayments
      .filter((p: any) => p.voucherType === 'receipt')
      .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
    const paymentsOut = partyPayments
      .filter((p: any) => p.voucherType === 'payment')
      .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

    const opening = parseFloat(party.openingBalance) || 0;
    const isOpeningDr = party.balanceType === 'dr';

    let netBalance = isOpeningDr ? opening : -opening;
    if (party.partyType === 'customer') {
      netBalance += totalSales - receipts;
    } else {
      netBalance += totalPurchases - paymentsOut;
    }

    const currentBalance = Math.abs(netBalance).toFixed(2);
    const currentBalanceType = netBalance >= 0 ? 'dr' : 'cr';

    return {
      ...party,
      totalInvoiced: (party.partyType === 'customer' ? totalSales : totalPurchases).toFixed(2),
      totalPaid: (party.partyType === 'customer' ? receipts : paymentsOut).toFixed(2),
      currentBalance,
      currentBalanceType,
      voucherCount: partyInvoices.length + partyPayments.length,
    };
  });
}

export async function createParty(userId: number, data: any) {
  const partyId = await getNextSequenceId('party_id');
  const party = {
    id: partyId,
    userId,
    partyType: data.partyType || 'customer',
    name: data.name,
    gstin: data.gstin || null,
    stateCode: data.stateCode || '08',
    stateName: data.stateName || 'Rajasthan',
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    openingBalance: data.openingBalance || '0.00',
    balanceType: data.balanceType || 'dr',
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.PARTIES).doc(String(partyId)).set(party);
  return party;
}

export async function editParty(partyId: number, userId: number, data: any) {
  const docRef = db.collection(COLLECTIONS.PARTIES).doc(String(partyId));
  const snap = await docRef.get();
  if (!snap.exists) {
    return null;
  }
  const updated = { ...snap.data(), ...data, id: partyId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteParty(partyId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.PARTIES).doc(String(partyId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await docRef.delete();
  return data;
}

// Inventory Items
export async function getInventory(userId?: number) {
  const snap = await db.collection(COLLECTIONS.INVENTORY_ITEMS).get();
  return snap.docs.map((doc) => doc.data());
}

export async function createInventoryItem(userId: number, data: any) {
  const itemId = await getNextSequenceId('inventory_item_id');
  const item = {
    id: itemId,
    userId,
    name: data.name,
    sku: data.sku || null,
    hsnCode: data.hsnCode,
    unit: data.unit || 'PCS',
    sellingPrice: data.sellingPrice || '0.00',
    purchasePrice: data.purchasePrice || '0.00',
    gstRate: data.gstRate || '18',
    openingStock: data.openingStock || '0',
    currentStock: data.currentStock || data.openingStock || '0',
    minStockAlert: data.minStockAlert || '5',
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.INVENTORY_ITEMS).doc(String(itemId)).set(item);
  return item;
}

export async function editInventoryItem(itemId: number, userId: number, data: any) {
  const docRef = db.collection(COLLECTIONS.INVENTORY_ITEMS).doc(String(itemId));
  const snap = await docRef.get();
  if (!snap.exists) {
    return null;
  }
  const updated = { ...snap.data(), ...data, id: itemId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function adjustInventoryStock(itemId: number, userIdOrDelta: number, deltaQuantityOrCurrentStock?: number) {
  const docRef = db.collection(COLLECTIONS.INVENTORY_ITEMS).doc(String(itemId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const itemData = snap.data() as any;

  let newStockStr = '0';
  if (typeof deltaQuantityOrCurrentStock === 'number') {
    // If called as (itemId, userId, deltaOrStock)
    const current = parseFloat(itemData.currentStock || '0') || 0;
    newStockStr = String(Math.max(0, deltaQuantityOrCurrentStock));
  } else {
    // If called as (itemId, deltaQuantity)
    const current = parseFloat(itemData.currentStock || '0') || 0;
    newStockStr = String(Math.max(0, current + userIdOrDelta));
  }

  await docRef.update({ currentStock: newStockStr });
  return { ...itemData, currentStock: newStockStr, id: itemId };
}

export async function deleteInventoryItem(itemId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.INVENTORY_ITEMS).doc(String(itemId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await docRef.delete();
  return data;
}

// Invoices (Sales & Purchases)
export async function getInvoices(userId?: number, voucherType?: string) {
  const invoicesSnap = await db.collection(COLLECTIONS.INVOICES).get();
  let list = invoicesSnap.docs.map((doc) => doc.data());

  if (voucherType) {
    list = list.filter((inv: any) => inv.voucherType === voucherType);
  }

  // Sort descending by id
  return list.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function getInvoiceDetails(invoiceId: number) {
  const docRef = db.collection(COLLECTIONS.INVOICES).doc(String(invoiceId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return snap.data();
}

export async function createInvoiceWithItems(userId: number, invoiceData: any, itemsInput?: any[]) {
  const invoiceId = await getNextSequenceId('invoice_id');
  const rawItems = itemsInput || invoiceData.items || [];
  const invoiceDoc = {
    id: invoiceId,
    userId,
    partyId: invoiceData.partyId ? Number(invoiceData.partyId) : null,
    voucherType: invoiceData.voucherType || 'sales',
    saleType: invoiceData.saleType || 'regular',
    taxMode: invoiceData.taxMode || 'exclusive',
    invoiceNumber: invoiceData.invoiceNumber,
    invoiceDate: invoiceData.invoiceDate,
    dueDate: invoiceData.dueDate || null,
    partyName: invoiceData.partyName,
    partyGstin: invoiceData.partyGstin || null,
    placeOfSupply: invoiceData.placeOfSupply || '08',
    isInterstate: !!invoiceData.isInterstate,
    subtotal: String(invoiceData.subtotal || '0.00'),
    cgstTotal: String(invoiceData.cgstTotal || '0.00'),
    sgstTotal: String(invoiceData.sgstTotal || '0.00'),
    igstTotal: String(invoiceData.igstTotal || '0.00'),
    taxTotal: String(invoiceData.taxTotal || '0.00'),
    discountTotal: String(invoiceData.discountTotal || '0.00'),
    grandTotal: String(invoiceData.grandTotal || '0.00'),
    paidAmount: String(invoiceData.paidAmount || '0.00'),
    paymentStatus: invoiceData.paymentStatus || 'unpaid',
    paymentMode: invoiceData.paymentMode || 'cash',
    notes: invoiceData.notes || null,
    termsAndConditions: invoiceData.termsAndConditions || null,
    ewayBillNumber: invoiceData.ewayBillNumber || null,
    status: invoiceData.status || 'active',
    createdAt: new Date().toISOString(),
    items: rawItems.map((it: any, idx: number) => ({
      ...it,
      id: idx + 1,
      invoiceId,
    })),
  };

  await db.collection(COLLECTIONS.INVOICES).doc(String(invoiceId)).set(invoiceDoc);

  // Update sequential number in company profile if automatic
  try {
    const isPurchase = invoiceDoc.voucherType === 'purchase';
    const profile = await getCompanyProfile(userId);
    const counterKey = isPurchase ? 'nextPurchaseNumber' : 'nextInvoiceNumber';
    const currentCounter = (profile as any)[counterKey] || 1;
    await upsertCompanyProfile(userId, {
      [counterKey]: currentCounter + 1,
    });
  } catch (err) {
    console.warn('Failed to bump invoice counter in company profile:', err);
  }

  // Deduct / add stock for inventory items
  for (const item of rawItems) {
    if (item.itemId) {
      const qty = parseFloat(item.quantity) || 0;
      const delta = invoiceDoc.voucherType === 'sales' ? -qty : qty;
      await adjustInventoryStock(Number(item.itemId), delta);
    }
  }

  return invoiceDoc;
}

export async function editInvoiceWithItems(invoiceId: number, userId: number, invoiceData: any, itemsInput?: any[]) {
  const docRef = db.collection(COLLECTIONS.INVOICES).doc(String(invoiceId));
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const prevInvoice = snap.data() as any;
  const rawItems = itemsInput || invoiceData.items || prevInvoice.items || [];

  const updatedInvoice = {
    ...prevInvoice,
    ...invoiceData,
    id: invoiceId,
    items: rawItems.map((it: any, idx: number) => ({
      ...it,
      id: idx + 1,
      invoiceId,
    })),
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(updatedInvoice, { merge: true });
  return updatedInvoice;
}

export async function deleteInvoice(invoiceId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.INVOICES).doc(String(invoiceId));
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const inv = snap.data() as any;
  // Reverse stock effect
  for (const item of inv?.items || []) {
    if (item.itemId) {
      const qty = parseFloat(item.quantity) || 0;
      const reverseDelta = inv.voucherType === 'sales' ? qty : -qty;
      await adjustInventoryStock(Number(item.itemId), reverseDelta);
    }
  }
  await docRef.delete();
  return inv;
}

// Expenses
export async function getExpenses(userId?: number) {
  const snap = await db.collection(COLLECTIONS.EXPENSES).get();
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function createExpense(userId: number, data: any) {
  const expenseId = await getNextSequenceId('expense_id');
  const expense = {
    id: expenseId,
    userId,
    category: data.category,
    amount: String(data.amount),
    date: data.date,
    paymentMode: data.paymentMode || 'cash',
    referenceNumber: data.referenceNumber || null,
    vendorName: data.vendorName || null,
    gstin: data.gstin || null,
    gstPaid: String(data.gstPaid || '0.00'),
    itcEligible: !!data.itcEligible,
    receiptUrl: data.receiptUrl || null,
    description: data.description || null,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.EXPENSES).doc(String(expenseId)).set(expense);
  return expense;
}

export async function editExpense(expenseId: number, userId: number, data: any) {
  const docRef = db.collection(COLLECTIONS.EXPENSES).doc(String(expenseId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), ...data, id: expenseId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteExpense(expenseId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.EXPENSES).doc(String(expenseId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await docRef.delete();
  return data;
}

// Payment Vouchers (Receipts & Payments)
export async function getPayments(userId?: number, voucherType?: string) {
  const snap = await db.collection(COLLECTIONS.PAYMENTS).get();
  let list = snap.docs.map((doc) => doc.data());
  if (voucherType) {
    list = list.filter((p: any) => p.voucherType === voucherType);
  }
  return list.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function getNextPaymentVoucherNumber(userId: number, voucherType: 'receipt' | 'payment') {
  const company = await getCompanyProfile(userId);
  const prefix = voucherType === 'receipt' ? (company.receiptPrefix || 'REC/2026-27/') : (company.paymentPrefix || 'PAY/2026-27/');
  const counterKey = voucherType === 'receipt' ? 'nextReceiptNumber' : 'nextPaymentNumber';
  let counter = (company as any)[counterKey] || 1;

  const snap = await db.collection(COLLECTIONS.PAYMENTS).where('voucherType', '==', voucherType).get();
  const existingNumbers = new Set(snap.docs.map((d) => (d.data().voucherNumber || '').trim().toLowerCase()));

  let candidate = formatInvoiceNumber(prefix, counter, 3, '');
  while (existingNumbers.has(candidate.toLowerCase())) {
    counter++;
    candidate = formatInvoiceNumber(prefix, counter, 3, '');
  }

  return { prefix, counter, formattedNumber: candidate };
}

export async function createPaymentVoucher(userId: number, data: any) {
  const paymentId = await getNextSequenceId('payment_id');
  const payment = {
    id: paymentId,
    userId,
    voucherType: data.voucherType || 'receipt',
    voucherNumber: data.voucherNumber,
    date: data.date,
    partyId: data.partyId ? Number(data.partyId) : null,
    partyName: data.partyName,
    partyType: data.partyType || 'customer',
    amount: String(data.amount),
    paymentMode: data.paymentMode || 'cash',
    accountType: data.accountType || 'cash',
    bankName: data.bankName || null,
    referenceNumber: data.referenceNumber || null,
    invoiceId: data.invoiceId ? Number(data.invoiceId) : null,
    invoiceNumber: data.invoiceNumber || null,
    notes: data.notes || null,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.PAYMENTS).doc(String(paymentId)).set(payment);

  // Bump next receipt/payment counter in company profile
  try {
    const counterKey = payment.voucherType === 'receipt' ? 'nextReceiptNumber' : 'nextPaymentNumber';
    const profile = await getCompanyProfile(userId);
    await upsertCompanyProfile(userId, {
      [counterKey]: ((profile as any)[counterKey] || 1) + 1,
    });
  } catch (e) {
    console.warn('Failed to bump payment counter:', e);
  }

  return payment;
}

export async function deletePaymentVoucher(paymentId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.PAYMENTS).doc(String(paymentId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await docRef.delete();
  return data;
}

// Journal Entries & Contras
export async function getJournalEntries(userId?: number) {
  const snap = await db.collection(COLLECTIONS.JOURNAL_ENTRIES).get();
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function getNextJournalVoucherNumber(userId: number, entryType: string) {
  const company = await getCompanyProfile(userId);
  const isContra = entryType === 'contra';
  const prefix = isContra ? (company.contraPrefix || 'CONTRA/2026-27/') : (company.journalPrefix || 'JV/2026-27/');
  const counterKey = isContra ? 'nextContraNumber' : 'nextJournalNumber';
  let counter = (company as any)[counterKey] || 1;

  const snap = await db.collection(COLLECTIONS.JOURNAL_ENTRIES).get();
  const existingNumbers = new Set(snap.docs.map((d) => (d.data().voucherNumber || '').trim().toLowerCase()));

  let candidate = formatInvoiceNumber(prefix, counter, 3, '');
  while (existingNumbers.has(candidate.toLowerCase())) {
    counter++;
    candidate = formatInvoiceNumber(prefix, counter, 3, '');
  }

  return { prefix, counter, formattedNumber: candidate };
}

export async function createJournalEntry(userId: number, data: any) {
  const entryId = await getNextSequenceId('journal_entry_id');
  const entry = {
    id: entryId,
    userId,
    entryType: data.entryType || 'journal',
    voucherNumber: data.voucherNumber,
    date: data.date,
    referenceNumber: data.referenceNumber || null,
    debitAccount: data.debitAccount,
    creditAccount: data.creditAccount,
    debitPartyId: data.debitPartyId ? Number(data.debitPartyId) : null,
    creditPartyId: data.creditPartyId ? Number(data.creditPartyId) : null,
    amount: String(data.amount),
    narration: data.narration,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.JOURNAL_ENTRIES).doc(String(entryId)).set(entry);
  return entry;
}

export async function editJournalEntry(entryId: number, userId: number, data: any) {
  const docRef = db.collection(COLLECTIONS.JOURNAL_ENTRIES).doc(String(entryId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), ...data, id: entryId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteJournalEntry(entryId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.JOURNAL_ENTRIES).doc(String(entryId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await docRef.delete();
  return data;
}

// Cheque Books
export async function getChequeBooks(userId?: number) {
  const snap = await db.collection(COLLECTIONS.CHEQUE_BOOKS).get();
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function createChequeBook(userId: number, data: any) {
  const bookId = await getNextSequenceId('cheque_book_id');
  const startNum = Number(data.startNumber);
  const endNum = Number(data.endNumber);
  const total = Math.max(1, endNum - startNum + 1);

  const book = {
    id: bookId,
    userId,
    bankName: data.bankName,
    accountNumber: data.accountNumber || null,
    bookName: data.bookName,
    seriesPrefix: data.seriesPrefix || null,
    startNumber: startNum,
    endNumber: endNum,
    totalLeaves: total,
    usedLeaves: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.CHEQUE_BOOKS).doc(String(bookId)).set(book);
  return book;
}

export async function editChequeBook(bookId: number, userId: number, data: any) {
  const docRef = db.collection(COLLECTIONS.CHEQUE_BOOKS).doc(String(bookId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), ...data, id: bookId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteChequeBook(bookId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.CHEQUE_BOOKS).doc(String(bookId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await docRef.delete();
  return data;
}

// Cheques
export async function getCheques(userId?: number) {
  const snap = await db.collection(COLLECTIONS.CHEQUES).get();
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function createCheque(userId: number, data: any) {
  const chequeId = await getNextSequenceId('cheque_id');
  const cheque = {
    id: chequeId,
    userId,
    chequeBookId: data.chequeBookId ? Number(data.chequeBookId) : null,
    chequeType: data.chequeType || 'inward',
    chequeNumber: data.chequeNumber,
    chequeDate: data.chequeDate,
    amount: String(data.amount),
    partyId: data.partyId ? Number(data.partyId) : null,
    payeeName: data.payeeName,
    bankName: data.bankName,
    branchName: data.branchName || null,
    ifscCode: data.ifscCode || null,
    depositBank: data.depositBank || null,
    status: data.status || 'in_hand',
    isPdc: !!data.isPdc,
    isAccountPayee: data.isAccountPayee !== undefined ? !!data.isAccountPayee : true,
    depositDate: data.depositDate || null,
    clearanceDate: data.clearanceDate || null,
    bounceDate: data.bounceDate || null,
    bounceReason: data.bounceReason || null,
    bounceCharges: data.bounceCharges || null,
    voucherId: data.voucherId ? Number(data.voucherId) : null,
    invoiceId: data.invoiceId ? Number(data.invoiceId) : null,
    referenceNumber: data.referenceNumber || null,
    remarks: data.remarks || null,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.CHEQUES).doc(String(chequeId)).set(cheque);
  return cheque;
}

export async function editCheque(chequeId: number, userId: number, data: any) {
  const docRef = db.collection(COLLECTIONS.CHEQUES).doc(String(chequeId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), ...data, id: chequeId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function updateChequeStatus(chequeId: number, userId: number, statusData: any) {
  const docRef = db.collection(COLLECTIONS.CHEQUES).doc(String(chequeId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), ...statusData, id: chequeId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteCheque(chequeId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.CHEQUES).doc(String(chequeId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await docRef.delete();
  return data;
}

// Bank Statements & Automated Reconciliation
export async function getBankStatements(userId?: number) {
  const snap = await db.collection(COLLECTIONS.BANK_STATEMENTS).get();
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function getBankStatementById(statementId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return snap.data();
}

export async function createBankStatement(userId: number, data: any) {
  const statementId = await getNextSequenceId('bank_statement_id');
  const transactions = (data.transactions || []).map((t: any, idx: number) => ({
    ...t,
    id: t.id || `tx-${Date.now()}-${idx + 1}`,
    reconciled: !!t.reconciled,
  }));

  const statement = {
    id: statementId,
    userId,
    bankName: data.bankName,
    accountNumber: data.accountNumber || null,
    fileName: data.fileName,
    statementStartDate: data.statementStartDate || null,
    statementEndDate: data.statementEndDate || null,
    openingBalance: String(data.openingBalance || '0.00'),
    closingBalance: String(data.closingBalance || '0.00'),
    totalCredits: String(data.totalCredits || '0.00'),
    totalDebits: String(data.totalDebits || '0.00'),
    transactionsCount: transactions.length,
    reconciledCount: transactions.filter((t: any) => t.reconciled).length,
    transactions,
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId)).set(statement);
  return statement;
}

export async function updateBankStatement(statementId: number, userId: number, data: any) {
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), ...data, id: statementId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteBankStatement(statementId: number, userId?: number) {
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await docRef.delete();
  return data;
}

export async function reconcileBankStatementTransaction(
  statementId: number,
  transactionId: string,
  userId: number,
  matchData: {
    matchedVoucherType: 'receipt' | 'payment' | 'cheque' | 'expense' | 'journal';
    matchedVoucherId: number;
    matchedVoucherNumber?: string;
    matchedPartyName?: string;
    matchedAmount?: number;
    matchConfidence?: number;
    matchReason?: string;
    notes?: string;
  }
) {
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const stmt = snap.data() as any;
  const transactions = (stmt.transactions || []).map((t: any) => {
    if (t.id === transactionId) {
      return {
        ...t,
        reconciled: true,
        reconciledAt: new Date().toISOString(),
        ...matchData,
      };
    }
    return t;
  });

  const reconciledCount = transactions.filter((t: any) => t.reconciled).length;
  await docRef.update({
    transactions,
    reconciledCount,
  });

  return { ...stmt, transactions, reconciledCount };
}

export async function unreconcileBankStatementTransaction(statementId: number, transactionId: string, userId?: number) {
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const stmt = snap.data() as any;
  const transactions = (stmt.transactions || []).map((t: any) => {
    if (t.id === transactionId) {
      return {
        ...t,
        reconciled: false,
        reconciledAt: null,
        matchedVoucherType: null,
        matchedVoucherId: null,
        matchedVoucherNumber: null,
        matchedPartyName: null,
        matchedAmount: null,
        matchConfidence: null,
        matchReason: null,
        notes: null,
      };
    }
    return t;
  });

  const reconciledCount = transactions.filter((t: any) => t.reconciled).length;
  await docRef.update({
    transactions,
    reconciledCount,
  });

  return { ...stmt, transactions, reconciledCount };
}

// Financial Dashboard Summary
export async function getFinancialSummary(userId?: number) {
  const invoicesSnap = await db.collection(COLLECTIONS.INVOICES).get();
  const expensesSnap = await db.collection(COLLECTIONS.EXPENSES).get();
  const inventorySnap = await db.collection(COLLECTIONS.INVENTORY_ITEMS).get();
  const chequesSnap = await db.collection(COLLECTIONS.CHEQUES).get();

  const invoicesList = invoicesSnap.docs.map((d) => d.data() as any);
  const expensesList = expensesSnap.docs.map((d) => d.data() as any);
  const inventoryList = inventorySnap.docs.map((d) => d.data() as any);
  const chequesList = chequesSnap.docs.map((d) => d.data() as any);

  let totalSales = 0;
  let totalPurchases = 0;
  let totalTaxCollected = 0;

  for (const inv of invoicesList) {
    if (inv.status === 'cancelled') continue;
    const gTotal = parseFloat(inv.grandTotal) || 0;
    const tax = parseFloat(inv.taxTotal) || 0;
    if (inv.voucherType === 'sales') {
      totalSales += gTotal;
      totalTaxCollected += tax;
    } else if (inv.voucherType === 'purchase') {
      totalPurchases += gTotal;
    }
  }

  let totalExpenses = 0;
  let totalTaxPaidOnExpenses = 0;
  for (const exp of expensesList) {
    totalExpenses += parseFloat(exp.amount) || 0;
    totalTaxPaidOnExpenses += parseFloat(exp.gstPaid) || 0;
  }

  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const netGstPayable = Math.max(0, totalTaxCollected - totalTaxPaidOnExpenses);

  const partiesWithBalance = await getParties(userId);
  let totalReceivables = 0;
  let totalPayables = 0;

  for (const p of partiesWithBalance as any[]) {
    const bal = parseFloat(p.currentBalance || '0') || 0;
    if (p.partyType === 'customer') {
      if (p.currentBalanceType === 'dr') totalReceivables += bal;
      else totalReceivables -= bal;
    } else {
      if (p.currentBalanceType === 'cr') totalPayables += bal;
      else totalPayables -= bal;
    }
  }

  let totalStockValuation = 0;
  for (const item of inventoryList) {
    const qty = parseFloat(item.currentStock) || 0;
    const price = parseFloat(item.purchasePrice) || parseFloat(item.sellingPrice) || 0;
    totalStockValuation += qty * price;
  }

  const inHandCheques = chequesList.filter((c: any) => c.status === 'in_hand');
  const chequesInHandAmount = inHandCheques.reduce((sum: number, c: any) => sum + (parseFloat(c.amount) || 0), 0);

  return {
    totalSales,
    totalPurchases,
    totalExpenses,
    grossProfit,
    netProfit,
    totalTaxCollected,
    totalTaxPaidOnExpenses,
    netGstPayable,
    totalReceivables: Math.max(0, totalReceivables),
    totalPayables: Math.max(0, totalPayables),
    totalStockValuation,
    totalInvoicesCount: invoicesList.length,
    partiesCount: partiesWithBalance.length,
    inventoryCount: inventoryList.length,
    chequesCount: chequesList.length,
    chequesInHandAmount,
  };
}

// Backup & Restore
export async function getFullDataBackup(userId?: number) {
  const [
    companyProfile,
    parties,
    inventory,
    invoices,
    expenses,
    payments,
    journalEntries,
    chequeBooks,
    cheques,
    bankStatements,
    activityLogs,
  ] = await Promise.all([
    getCompanyProfile(userId),
    db.collection(COLLECTIONS.PARTIES).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.INVENTORY_ITEMS).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.INVOICES).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.EXPENSES).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.PAYMENTS).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.JOURNAL_ENTRIES).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.CHEQUE_BOOKS).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.CHEQUES).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.BANK_STATEMENTS).get().then((s) => s.docs.map((d) => d.data())),
    db.collection(COLLECTIONS.ACTIVITY_LOGS).get().then((s) => s.docs.map((d) => d.data())),
  ]);

  return {
    version: '2.0.0-firestore',
    databaseEngine: 'Google Cloud Firestore',
    exportTimestamp: new Date().toISOString(),
    companyProfile,
    parties,
    inventory,
    invoices,
    expenses,
    payments,
    journalEntries,
    chequeBooks,
    cheques,
    bankStatements,
    activityLogs,
  };
}

export async function restoreDataFromBackup(backupData: any, userId: number) {
  if (!backupData || typeof backupData !== 'object') {
    throw new Error('Invalid backup JSON payload');
  }

  // Restore company profile
  if (backupData.companyProfile) {
    await upsertCompanyProfile(userId, backupData.companyProfile);
  }

  // Helper to batch insert docs
  const restoreCollection = async (collectionName: string, items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const batch = db.batch();
    for (const item of items) {
      const docRef = db.collection(collectionName).doc(String(item.id || Date.now()));
      batch.set(docRef, { ...item, userId }, { merge: true });
    }
    await batch.commit();
  };

  await Promise.all([
    restoreCollection(COLLECTIONS.PARTIES, backupData.parties),
    restoreCollection(COLLECTIONS.INVENTORY_ITEMS, backupData.inventory),
    restoreCollection(COLLECTIONS.INVOICES, backupData.invoices),
    restoreCollection(COLLECTIONS.EXPENSES, backupData.expenses),
    restoreCollection(COLLECTIONS.PAYMENTS, backupData.payments),
    restoreCollection(COLLECTIONS.JOURNAL_ENTRIES, backupData.journalEntries),
    restoreCollection(COLLECTIONS.CHEQUE_BOOKS, backupData.chequeBooks),
    restoreCollection(COLLECTIONS.CHEQUES, backupData.cheques),
    restoreCollection(COLLECTIONS.BANK_STATEMENTS, backupData.bankStatements),
  ]);

  return { success: true };
}

export async function clearMasterLedger(userId: number) {
  const collectionsToClear = [
    COLLECTIONS.INVOICES,
    COLLECTIONS.EXPENSES,
    COLLECTIONS.PAYMENTS,
    COLLECTIONS.JOURNAL_ENTRIES,
    COLLECTIONS.CHEQUES,
    COLLECTIONS.BANK_STATEMENTS,
  ];

  for (const col of collectionsToClear) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Reset inventory item current stock back to opening stock
  const invSnap = await db.collection(COLLECTIONS.INVENTORY_ITEMS).get();
  const invBatch = db.batch();
  invSnap.docs.forEach((d) => {
    const data = d.data();
    invBatch.update(d.ref, { currentStock: data.openingStock || '0' });
  });
  await invBatch.commit();

  return { success: true };
}
