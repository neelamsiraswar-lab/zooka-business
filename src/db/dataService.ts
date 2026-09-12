import { db } from './index.ts';
import {
  companyProfiles,
  parties,
  inventoryItems,
  invoices,
  invoiceItems,
  payments,
  journalEntries,
  expenses,
  activityLogs,
  users,
  chequeBooks,
  cheques,
} from './schema.ts';
import { eq, desc, and, sql, gte, lte, inArray } from 'drizzle-orm';

// Activity Logger
export async function logActivity(userId: number, email: string, action: string, entityType: string, entityId?: string, details?: string) {
  try {
    await db.insert(activityLogs).values({
      userId,
      userEmail: email,
      action,
      entityType,
      entityId,
      details,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Company Profile
export async function getCompanyProfile(userId: number) {
  const list = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.userId, userId))
    .orderBy(desc(companyProfiles.updatedAt), desc(companyProfiles.id))
    .limit(1);

  if (list.length > 0) return list[0];
  // return default company profile
  return {
    businessName: 'Apex Enterprise & Trading Co.',
    tradeName: 'Apex GST Billing',
    gstin: '27AABCU9603R1ZM',
    stateCode: '27',
    stateName: 'Maharashtra',
    address: 'Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093',
    phone: '+91 98200 12345',
    email: 'accounts@apexenterprise.in',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200049281729',
    ifscCode: 'HDFC0000123',
    upiId: 'apexenterprise@hdfcbank',
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
    invoiceDesignTemplate: 'modern',
    invoiceColorTheme: 'emerald',
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
    defaultTerms: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed beyond due date.\n3. Subject to local state jurisdiction.',
    defaultNotes: 'Thank you for your business!',
  };
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

  // Fetch all existing invoice numbers for this user and voucherType
  const userInvoices = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.voucherType, voucherType)));

  const existingNumbers = new Set(userInvoices.map((i) => i.invoiceNumber.trim().toLowerCase()));

  // Find next sequential number that doesn't conflict
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

  const matches = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      voucherType: invoices.voucherType,
      partyName: invoices.partyName,
      invoiceDate: invoices.invoiceDate,
      grandTotal: invoices.grandTotal,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        sql`lower(trim(${invoices.invoiceNumber})) = ${trimmed}`,
        excludeInvoiceId ? sql`${invoices.id} != ${excludeInvoiceId}` : sql`1=1`
      )
    );

  if (matches.length > 0) {
    return {
      isDuplicate: true,
      existing: matches[0],
    };
  }

  return { isDuplicate: false };
}

export async function upsertCompanyProfile(userId: number, data: any) {
  const existing = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.userId, userId))
    .orderBy(desc(companyProfiles.updatedAt), desc(companyProfiles.id));

  let profileRecord: any;
  if (existing.length > 0) {
    const primaryId = existing[0].id;
    const updated = await db
      .update(companyProfiles)
      .set({
        businessName: data.businessName,
        tradeName: data.tradeName,
        gstin: data.gstin,
        stateCode: data.stateCode,
        stateName: data.stateName,
        address: data.address,
        phone: data.phone,
        email: data.email,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        upiId: data.upiId,
        invoiceNumberingMode: data.invoiceNumberingMode || 'automatic',
        invoicePrefix: data.invoicePrefix !== undefined ? data.invoicePrefix : 'INV/2026-27/',
        invoiceSuffix: data.invoiceSuffix !== undefined ? data.invoiceSuffix : '',
        nextInvoiceNumber: parseInt(data.nextInvoiceNumber) || 1,
        invoicePadding: parseInt(data.invoicePadding) || 3,
        preventDuplicateInvoiceNo: data.preventDuplicateInvoiceNo !== undefined ? Boolean(data.preventDuplicateInvoiceNo) : true,
        purchaseNumberingMode: data.purchaseNumberingMode || 'automatic',
        purchasePrefix: data.purchasePrefix !== undefined ? data.purchasePrefix : 'PUR/2026-27/',
        nextPurchaseNumber: parseInt(data.nextPurchaseNumber) || 1,
        receiptPrefix: data.receiptPrefix !== undefined ? data.receiptPrefix : 'REC/2026-27/',
        nextReceiptNumber: parseInt(data.nextReceiptNumber) || 1,
        paymentPrefix: data.paymentPrefix !== undefined ? data.paymentPrefix : 'PAY/2026-27/',
        nextPaymentNumber: parseInt(data.nextPaymentNumber) || 1,
        journalPrefix: data.journalPrefix !== undefined ? data.journalPrefix : 'JV/2026-27/',
        nextJournalNumber: parseInt(data.nextJournalNumber) || 1,
        contraPrefix: data.contraPrefix !== undefined ? data.contraPrefix : 'CONTRA/2026-27/',
        nextContraNumber: parseInt(data.nextContraNumber) || 1,
        invoiceDesignTemplate: data.invoiceDesignTemplate || 'modern',
        invoiceColorTheme: data.invoiceColorTheme || 'emerald',
        invoiceHeaderTitle: data.invoiceHeaderTitle || 'TAX INVOICE',
        invoiceSubtitle: data.invoiceSubtitle || 'ORIGINAL FOR RECIPIENT',
        invoiceShowLogo: data.invoiceShowLogo !== undefined ? Boolean(data.invoiceShowLogo) : true,
        invoiceLogoUrl: data.invoiceLogoUrl !== undefined ? data.invoiceLogoUrl : null,
        invoiceShowBankDetails: data.invoiceShowBankDetails !== undefined ? Boolean(data.invoiceShowBankDetails) : true,
        invoiceShowUpiQr: data.invoiceShowUpiQr !== undefined ? Boolean(data.invoiceShowUpiQr) : true,
        invoiceShowAuthorizedSignatory: data.invoiceShowAuthorizedSignatory !== undefined ? Boolean(data.invoiceShowAuthorizedSignatory) : true,
        invoiceSignatoryLabel: data.invoiceSignatoryLabel || 'Authorized Signatory',
        invoiceSignatureUrl: data.invoiceSignatureUrl !== undefined ? data.invoiceSignatureUrl : null,
        invoiceShowHsnSummary: data.invoiceShowHsnSummary !== undefined ? Boolean(data.invoiceShowHsnSummary) : true,
        invoiceShowTerms: data.invoiceShowTerms !== undefined ? Boolean(data.invoiceShowTerms) : true,
        defaultTerms: data.defaultTerms !== undefined ? data.defaultTerms : null,
        defaultNotes: data.defaultNotes !== undefined ? data.defaultNotes : null,
        updatedAt: new Date(),
      })
      .where(eq(companyProfiles.id, primaryId))
      .returning();

    profileRecord = updated[0];

    // Clean up any stale duplicate company profiles
    if (existing.length > 1) {
      const duplicateIds = existing.slice(1).map((e) => e.id);
      await db.delete(companyProfiles).where(inArray(companyProfiles.id, duplicateIds));
    }
  } else {
    const created = await db
      .insert(companyProfiles)
      .values({
        userId,
        businessName: data.businessName,
        tradeName: data.tradeName,
        gstin: data.gstin,
        stateCode: data.stateCode,
        stateName: data.stateName,
        address: data.address,
        phone: data.phone,
        email: data.email,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        upiId: data.upiId,
        invoiceNumberingMode: data.invoiceNumberingMode || 'automatic',
        invoicePrefix: data.invoicePrefix !== undefined ? data.invoicePrefix : 'INV/2026-27/',
        invoiceSuffix: data.invoiceSuffix !== undefined ? data.invoiceSuffix : '',
        nextInvoiceNumber: parseInt(data.nextInvoiceNumber) || 1,
        invoicePadding: parseInt(data.invoicePadding) || 3,
        preventDuplicateInvoiceNo: data.preventDuplicateInvoiceNo !== undefined ? Boolean(data.preventDuplicateInvoiceNo) : true,
        purchaseNumberingMode: data.purchaseNumberingMode || 'automatic',
        purchasePrefix: data.purchasePrefix !== undefined ? data.purchasePrefix : 'PUR/2026-27/',
        nextPurchaseNumber: parseInt(data.nextPurchaseNumber) || 1,
        receiptPrefix: data.receiptPrefix !== undefined ? data.receiptPrefix : 'REC/2026-27/',
        nextReceiptNumber: parseInt(data.nextReceiptNumber) || 1,
        paymentPrefix: data.paymentPrefix !== undefined ? data.paymentPrefix : 'PAY/2026-27/',
        nextPaymentNumber: parseInt(data.nextPaymentNumber) || 1,
        journalPrefix: data.journalPrefix !== undefined ? data.journalPrefix : 'JV/2026-27/',
        nextJournalNumber: parseInt(data.nextJournalNumber) || 1,
        contraPrefix: data.contraPrefix !== undefined ? data.contraPrefix : 'CONTRA/2026-27/',
        nextContraNumber: parseInt(data.nextContraNumber) || 1,
        invoiceDesignTemplate: data.invoiceDesignTemplate || 'modern',
        invoiceColorTheme: data.invoiceColorTheme || 'emerald',
        invoiceHeaderTitle: data.invoiceHeaderTitle || 'TAX INVOICE',
        invoiceSubtitle: data.invoiceSubtitle || 'ORIGINAL FOR RECIPIENT',
        invoiceShowLogo: data.invoiceShowLogo !== undefined ? Boolean(data.invoiceShowLogo) : true,
        invoiceLogoUrl: data.invoiceLogoUrl !== undefined ? data.invoiceLogoUrl : null,
        invoiceShowBankDetails: data.invoiceShowBankDetails !== undefined ? Boolean(data.invoiceShowBankDetails) : true,
        invoiceShowUpiQr: data.invoiceShowUpiQr !== undefined ? Boolean(data.invoiceShowUpiQr) : true,
        invoiceShowAuthorizedSignatory: data.invoiceShowAuthorizedSignatory !== undefined ? Boolean(data.invoiceShowAuthorizedSignatory) : true,
        invoiceSignatoryLabel: data.invoiceSignatoryLabel || 'Authorized Signatory',
        invoiceSignatureUrl: data.invoiceSignatureUrl !== undefined ? data.invoiceSignatureUrl : null,
        invoiceShowHsnSummary: data.invoiceShowHsnSummary !== undefined ? Boolean(data.invoiceShowHsnSummary) : true,
        invoiceShowTerms: data.invoiceShowTerms !== undefined ? Boolean(data.invoiceShowTerms) : true,
        defaultTerms: data.defaultTerms !== undefined ? data.defaultTerms : null,
        defaultNotes: data.defaultNotes !== undefined ? data.defaultNotes : null,
        updatedAt: new Date(),
      })
      .returning();

    profileRecord = created[0];
  }
  return profileRecord;
}

// Indian State Codes mapping
const STATE_MAP: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

export function getStateNameFromCode(code?: string | null): string {
  if (!code) return 'Maharashtra';
  const clean = code.trim();
  const padded = clean.length === 1 ? '0' + clean : clean;
  return STATE_MAP[padded] || 'Maharashtra';
}

// Parties (Ledger accounts)
export async function getParties(userId: number) {
  const partyList = await db
    .select()
    .from(parties)
    .where(eq(parties.userId, userId))
    .orderBy(desc(parties.id));

  if (partyList.length === 0) return [];

  // Query invoices and payments to calculate real-time ledger balances and voucher totals
  const userInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId));

  const userPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId));

  return partyList.map((p) => {
    // Match invoices linked to this party by id, or by identical partyName
    const matchedInvoices = userInvoices.filter(
      (inv) =>
        inv.partyId === p.id ||
        (inv.partyName && inv.partyName.trim().toLowerCase() === p.name.trim().toLowerCase())
    );

    const matchedPayments = userPayments.filter(
      (pay) =>
        pay.partyId === p.id ||
        (pay.partyName && pay.partyName.trim().toLowerCase() === p.name.trim().toLowerCase())
    );

    let totalInvoiced = 0;
    const linkedInvoiceIdsWithVoucher = new Set(
      matchedPayments.filter((pay) => pay.invoiceId).map((pay) => pay.invoiceId)
    );

    let directInvoicePaid = 0;
    for (const inv of matchedInvoices) {
      totalInvoiced += parseFloat(inv.grandTotal) || 0;
      if (!linkedInvoiceIdsWithVoucher.has(inv.id)) {
        directInvoicePaid += parseFloat(inv.paidAmount) || 0;
      }
    }

    let voucherPaid = 0;
    for (const pay of matchedPayments) {
      voucherPaid += parseFloat(pay.amount) || 0;
    }

    const totalPaid = directInvoicePaid + voucherPaid;
    const openBal = parseFloat(p.openingBalance) || 0;
    const isCustomer = p.partyType === 'customer';
    const unpaidInvoices = Math.max(0, totalInvoiced - totalPaid);

    let netBalance = 0;
    let currentBalanceType: 'dr' | 'cr' = p.balanceType as 'dr' | 'cr';

    if (isCustomer) {
      // Customer: Dr is receivable. Invoices add to Dr, payments/receipts reduce Dr.
      const openNet = p.balanceType === 'dr' ? openBal : -openBal;
      const totalDr = openNet + (totalInvoiced - totalPaid);
      if (totalDr >= 0) {
        netBalance = totalDr;
        currentBalanceType = 'dr';
      } else {
        netBalance = Math.abs(totalDr);
        currentBalanceType = 'cr';
      }
    } else {
      // Vendor: Cr is payable. Purchase bills add to Cr, payments reduce Cr.
      const openNet = p.balanceType === 'cr' ? openBal : -openBal;
      const totalCr = openNet + (totalInvoiced - totalPaid);
      if (totalCr >= 0) {
        netBalance = totalCr;
        currentBalanceType = 'cr';
      } else {
        netBalance = Math.abs(totalCr);
        currentBalanceType = 'dr';
      }
    }

    return {
      ...p,
      totalInvoiced: totalInvoiced.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      currentBalance: netBalance.toFixed(2),
      currentBalanceType,
      voucherCount: matchedInvoices.length + matchedPayments.length,
    };
  });
}

export async function createParty(userId: number, data: any) {
  const stateCode = data.stateCode || null;
  const stateName = data.stateName || (stateCode ? getStateNameFromCode(stateCode) : null);

  const res = await db.insert(parties).values({
    userId,
    partyType: data.partyType || 'customer',
    name: data.name.trim(),
    gstin: data.gstin ? data.gstin.trim().toUpperCase() : null,
    stateCode,
    stateName,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    openingBalance: String(data.openingBalance || '0.00'),
    balanceType: data.balanceType || 'dr',
  }).returning();
  return res[0];
}

export async function editParty(partyId: number, userId: number, data: any) {
  const stateCode = data.stateCode || undefined;
  const stateName = data.stateName || (stateCode ? getStateNameFromCode(stateCode) : undefined);

  const res = await db
    .update(parties)
    .set({
      partyType: data.partyType || undefined,
      name: data.name ? data.name.trim() : undefined,
      gstin: data.gstin !== undefined ? (data.gstin ? data.gstin.trim().toUpperCase() : null) : undefined,
      stateCode,
      stateName,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
      email: data.email !== undefined ? (data.email ? data.email.trim() : null) : undefined,
      address: data.address !== undefined ? (data.address ? data.address.trim() : null) : undefined,
      openingBalance: data.openingBalance !== undefined ? String(data.openingBalance) : undefined,
      balanceType: data.balanceType || undefined,
    })
    .where(and(eq(parties.id, partyId), eq(parties.userId, userId)))
    .returning();

  return res[0];
}

export async function deleteParty(partyId: number, userId: number) {
  const existing = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.userId, userId)));

  if (existing.length === 0) return null;
  const party = existing[0];

  // Nullify foreign-key links in invoices, payments, and journal entries
  await db
    .update(invoices)
    .set({ partyId: null })
    .where(and(eq(invoices.partyId, partyId), eq(invoices.userId, userId)));

  await db
    .update(payments)
    .set({ partyId: null })
    .where(and(eq(payments.partyId, partyId), eq(payments.userId, userId)));

  await db
    .update(journalEntries)
    .set({ debitPartyId: null })
    .where(and(eq(journalEntries.debitPartyId, partyId), eq(journalEntries.userId, userId)));

  await db
    .update(journalEntries)
    .set({ creditPartyId: null })
    .where(and(eq(journalEntries.creditPartyId, partyId), eq(journalEntries.userId, userId)));

  await db
    .update(cheques)
    .set({ partyId: null })
    .where(and(eq(cheques.partyId, partyId), eq(cheques.userId, userId)));

  await db
    .delete(parties)
    .where(and(eq(parties.id, partyId), eq(parties.userId, userId)));

  return party;
}

// Helper to auto-find or auto-create party by name
export async function autoFindOrCreateParty(
  userId: number,
  partyName: string,
  partyType: 'customer' | 'vendor' = 'customer'
): Promise<number | null> {
  const cleanName = partyName.trim();
  if (!cleanName) return null;

  const userParties = await db.select().from(parties).where(eq(parties.userId, userId));
  const matched = userParties.find(
    (p) => p.name.trim().toLowerCase() === cleanName.toLowerCase()
  );

  if (matched) {
    return matched.id;
  }

  const created = await db
    .insert(parties)
    .values({
      userId,
      partyType,
      name: cleanName,
      stateCode: '27',
      stateName: 'Maharashtra',
      openingBalance: '0.00',
      balanceType: partyType === 'vendor' ? 'cr' : 'dr',
    })
    .returning();

  return created[0].id;
}

// Automatic synchronization of Customer / Vendor into party ledger when invoice is created/updated
export async function syncPartyForInvoice(
  userId: number,
  data: any,
  voucherType: string
): Promise<number | null> {
  const partyName = (data.partyName || '').trim();
  if (!partyName) return null;

  const targetType: 'customer' | 'vendor' = voucherType === 'purchase' ? 'vendor' : 'customer';
  const gstin = data.partyGstin ? data.partyGstin.trim().toUpperCase() : null;
  const stateCode = data.placeOfSupply ? data.placeOfSupply.trim() : null;
  const stateName = stateCode ? getStateNameFromCode(stateCode) : null;
  const phone = data.partyPhone ? data.partyPhone.trim() : null;
  const email = data.partyEmail ? data.partyEmail.trim() : null;
  const address = data.partyAddress ? data.partyAddress.trim() : null;

  const partyId = data.partyId ? parseInt(data.partyId) : null;

  // 1. If explicit partyId provided, verify and sync latest contact/gst info if updated
  if (partyId) {
    const existing = await db
      .select()
      .from(parties)
      .where(and(eq(parties.id, partyId), eq(parties.userId, userId)));

    if (existing.length > 0) {
      const p = existing[0];
      const updates: any = {};
      if (!p.gstin && gstin) updates.gstin = gstin;
      if ((!p.stateCode || p.stateCode === '27') && stateCode) {
        updates.stateCode = stateCode;
        updates.stateName = stateName;
      }
      if (!p.phone && phone) updates.phone = phone;
      if (!p.email && email) updates.email = email;
      if (!p.address && address) updates.address = address;

      if (Object.keys(updates).length > 0) {
        await db.update(parties).set(updates).where(eq(parties.id, partyId));
      }
      return partyId;
    }
  }

  // 2. Search for existing party by name (case-insensitive) or GSTIN for this user
  const userParties = await db.select().from(parties).where(eq(parties.userId, userId));
  const matched = userParties.find(
    (p) =>
      p.name.trim().toLowerCase() === partyName.toLowerCase() ||
      (gstin && p.gstin && p.gstin.trim().toUpperCase() === gstin)
  );

  if (matched) {
    const updates: any = {};
    if (!matched.gstin && gstin) updates.gstin = gstin;
    if ((!matched.stateCode || matched.stateCode === '27') && stateCode) {
      updates.stateCode = stateCode;
      updates.stateName = stateName;
    }
    if (!matched.phone && phone) updates.phone = phone;
    if (!matched.email && email) updates.email = email;
    if (!matched.address && address) updates.address = address;

    if (Object.keys(updates).length > 0) {
      await db.update(parties).set(updates).where(eq(parties.id, matched.id));
    }
    return matched.id;
  }

  // 3. New party: automatically register customer / vendor in parties ledger master!
  const created = await db
    .insert(parties)
    .values({
      userId,
      partyType: targetType,
      name: partyName,
      gstin,
      stateCode: stateCode || '27',
      stateName: stateName || 'Maharashtra',
      phone,
      email,
      address,
      openingBalance: '0.00',
      balanceType: targetType === 'vendor' ? 'cr' : 'dr',
    })
    .returning();

  return created[0].id;
}

// Inventory Items
export async function getInventory(userId: number) {
  return await db.select().from(inventoryItems).where(eq(inventoryItems.userId, userId)).orderBy(inventoryItems.name);
}

export async function createInventoryItem(userId: number, data: any) {
  const res = await db.insert(inventoryItems).values({
    userId,
    name: data.name,
    sku: data.sku || null,
    hsnCode: data.hsnCode,
    unit: data.unit || 'PCS',
    sellingPrice: String(data.sellingPrice || '0.00'),
    purchasePrice: String(data.purchasePrice || '0.00'),
    gstRate: String(data.gstRate || '18.00'),
    openingStock: String(data.openingStock || '0'),
    currentStock: String(data.currentStock || data.openingStock || '0'),
    minStockAlert: String(data.minStockAlert || '5'),
  }).returning();
  return res[0];
}

export async function updateInventoryStock(itemId: number, qtyDelta: number) {
  const items = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
  if (items.length > 0) {
    const current = parseFloat(items[0].currentStock);
    const updated = Math.max(0, current + qtyDelta);
    await db.update(inventoryItems).set({ currentStock: String(updated) }).where(eq(inventoryItems.id, itemId));
  }
}

export async function editInventoryItem(itemId: number, userId: number, data: any) {
  const res = await db.update(inventoryItems).set({
    name: data.name,
    sku: data.sku || null,
    hsnCode: data.hsnCode,
    unit: data.unit || 'PCS',
    sellingPrice: String(data.sellingPrice || '0.00'),
    purchasePrice: String(data.purchasePrice || '0.00'),
    gstRate: String(data.gstRate || '18.00'),
    minStockAlert: String(data.minStockAlert || '5'),
    currentStock: data.currentStock !== undefined ? String(data.currentStock) : undefined,
  }).where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.userId, userId))).returning();
  return res[0];
}

export async function adjustInventoryStock(itemId: number, userId: number, newStock: number) {
  const res = await db.update(inventoryItems).set({
    currentStock: String(Math.max(0, newStock)),
  }).where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.userId, userId))).returning();
  return res[0];
}

export async function deleteInventoryItem(itemId: number, userId: number) {
  const existing = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.userId, userId)));
  if (existing.length === 0) return null;
  const item = existing[0];

  // Disconnect foreign key references in invoice_items so past invoices/vouchers stay intact
  await db
    .update(invoiceItems)
    .set({ itemId: null })
    .where(eq(invoiceItems.itemId, itemId));

  // Delete item record from inventoryItems
  await db
    .delete(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.userId, userId)));

  return item;
}

// Invoices & Billing
export async function getInvoices(userId: number) {
  const list = await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.id));
  if (list.length === 0) return [];

  const invoiceIds = list.map((inv) => inv.id);
  const items = await db.select().from(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds));

  return list.map((inv) => ({
    ...inv,
    items: items.filter((item) => item.invoiceId === inv.id),
  }));
}

export async function getInvoiceDetails(invoiceId: number) {
  const inv = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (inv.length === 0) return null;
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  return { ...inv[0], items };
}

export async function createInvoiceWithItems(userId: number, data: any) {
  // calculate totals
  const items = data.items || [];
  const voucherTaxMode = data.taxMode === 'inclusive' ? 'inclusive' : 'exclusive';
  const voucherSaleType = data.saleType || 'regular';

  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let taxTotal = 0;

  // If export with tax or SEZ with tax, force interstate IGST
  const isInterstate = voucherSaleType === 'export_with_tax' ? true : !!data.isInterstate;

  const processedItems = items.map((it: any) => {
    const qty = parseFloat(it.quantity) || 1;
    const inputRate = parseFloat(it.rate) || 0;
    const discountPercent = parseFloat(it.discountPercent) || 0;
    const isItemTaxInclusive = it.isTaxInclusive !== undefined ? !!it.isTaxInclusive : voucherTaxMode === 'inclusive';
    
    // Check if tax is exempt under Bill of Supply or Export under LUT (without tax)
    const isTaxExempt = voucherSaleType === 'bill_of_supply' || voucherSaleType === 'export_without_tax';
    const rawGstRate = parseFloat(it.gstRate) || 0;
    const gstRate = isTaxExempt ? 0 : rawGstRate;

    let taxableValue = 0;
    let gstAmount = 0;
    let lineTotal = 0;

    if (isItemTaxInclusive && gstRate > 0) {
      // Rate entered already includes GST
      const grossInclTax = qty * inputRate;
      const discountedGross = grossInclTax * (1 - discountPercent / 100);
      taxableValue = discountedGross / (1 + gstRate / 100);
      gstAmount = discountedGross - taxableValue;
      lineTotal = discountedGross;
    } else {
      // Rate entered is base price exclusive of GST
      const grossBase = qty * inputRate;
      taxableValue = grossBase * (1 - discountPercent / 100);
      gstAmount = (taxableValue * gstRate) / 100;
      lineTotal = taxableValue + gstAmount;
    }

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (gstAmount > 0) {
      if (isInterstate) {
        igst = gstAmount;
      } else {
        cgst = gstAmount / 2;
        sgst = gstAmount / 2;
      }
    }

    subtotal += taxableValue;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;
    taxTotal += gstAmount;

    return {
      itemId: it.itemId ? parseInt(it.itemId) : null,
      itemName: it.itemName,
      hsnCode: it.hsnCode || '9983',
      quantity: String(qty),
      unit: it.unit || 'PCS',
      rate: String(inputRate.toFixed(2)),
      isTaxInclusive: isItemTaxInclusive,
      discountPercent: String(discountPercent.toFixed(2)),
      taxableValue: String(taxableValue.toFixed(2)),
      gstRate: String(gstRate.toFixed(2)),
      cgstAmount: String(cgst.toFixed(2)),
      sgstAmount: String(sgst.toFixed(2)),
      igstAmount: String(igst.toFixed(2)),
      total: String(lineTotal.toFixed(2)),
    };
  });

  const grandTotal = subtotal + taxTotal;
  const paidAmount = parseFloat(data.paidAmount) || 0;
  let paymentStatus = 'unpaid';
  if (paidAmount >= grandTotal) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'partial';
  }

  // Auto-sync customer / vendor in parties ledger table
  const syncedPartyId = await syncPartyForInvoice(userId, data, data.voucherType || 'sales');

  // Duplicity check based on company policy
  const company = await getCompanyProfile(userId);
  const targetInvoiceNumber = (data.invoiceNumber || '').trim();
  const shouldPreventDuplicate = company?.preventDuplicateInvoiceNo !== false;

  if (targetInvoiceNumber && shouldPreventDuplicate) {
    const dupeCheck = await checkInvoiceNumberDuplicate(userId, targetInvoiceNumber);
    if (dupeCheck.isDuplicate && dupeCheck.existing) {
      throw new Error(
        `Duplicate Invoice Number: Voucher "${targetInvoiceNumber}" already exists in your records (issued to ${dupeCheck.existing.partyName} on ${dupeCheck.existing.invoiceDate}, Total: ₹${dupeCheck.existing.grandTotal}). Duplicate voucher numbers are restricted to maintain GST compliance.`
      );
    }
  }

  // insert invoice
  const invRes = await db.insert(invoices).values({
    userId,
    partyId: syncedPartyId,
    voucherType: data.voucherType || 'sales',
    saleType: voucherSaleType,
    taxMode: voucherTaxMode,
    invoiceNumber: targetInvoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: data.dueDate || null,
    partyName: data.partyName,
    partyGstin: data.partyGstin || null,
    placeOfSupply: data.placeOfSupply || '27',
    isInterstate,
    subtotal: String(subtotal.toFixed(2)),
    cgstTotal: String(cgstTotal.toFixed(2)),
    sgstTotal: String(sgstTotal.toFixed(2)),
    igstTotal: String(igstTotal.toFixed(2)),
    taxTotal: String(taxTotal.toFixed(2)),
    discountTotal: '0.00',
    grandTotal: String(grandTotal.toFixed(2)),
    paidAmount: String(paidAmount.toFixed(2)),
    paymentStatus,
    paymentMode: data.paymentMode || 'bank_transfer',
    notes: data.notes || (voucherSaleType === 'rcm' ? 'Tax payable under Reverse Charge: YES' : 'Thank you for your business!'),
    termsAndConditions: data.termsAndConditions || (voucherSaleType === 'export_without_tax' ? 'Supply meant for export under Bond/Letter of Undertaking without payment of integrated tax.' : 'Payment due within 15 days. Subject to Mumbai jurisdiction.'),
    eWayBillNumber: data.ewayBillNumber || null,
    status: 'active',
  }).returning();

  const newInvoice = invRes[0];

  // Auto-increment company counter if in automatic mode
  try {
    const isPurchase = (data.voucherType || 'sales') === 'purchase';
    const activeMode = isPurchase ? company.purchaseNumberingMode : company.invoiceNumberingMode;
    if (activeMode !== 'manual') {
      const companyRows = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userId)).limit(1);
      if (companyRows.length > 0) {
        if (isPurchase) {
          const currentCount = companyRows[0].nextPurchaseNumber || 1;
          await db
            .update(companyProfiles)
            .set({ nextPurchaseNumber: currentCount + 1, updatedAt: new Date() })
            .where(eq(companyProfiles.id, companyRows[0].id));
        } else {
          const currentCount = companyRows[0].nextInvoiceNumber || 1;
          await db
            .update(companyProfiles)
            .set({ nextInvoiceNumber: currentCount + 1, updatedAt: new Date() })
            .where(eq(companyProfiles.id, companyRows[0].id));
        }
      }
    }
  } catch (countErr) {
    console.warn('Could not auto-increment company invoice counter:', countErr);
  }

  // insert items & adjust stock if sales or purchase
  for (const item of processedItems) {
    await db.insert(invoiceItems).values({
      invoiceId: newInvoice.id,
      ...item,
    });

    if (item.itemId) {
      const delta = data.voucherType === 'purchase' ? parseFloat(item.quantity) : -parseFloat(item.quantity);
      await updateInventoryStock(item.itemId, delta);
    }
  }

  return await getInvoiceDetails(newInvoice.id);
}

export async function editInvoiceWithItems(invoiceId: number, userId: number, data: any) {
  const existingInv = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

  if (existingInv.length === 0) return null;
  const currentInvoice = existingInv[0];

  // Revert previous stock movements
  const previousItems = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  for (const prevItem of previousItems) {
    if (prevItem.itemId) {
      const revertDelta =
        currentInvoice.voucherType === 'purchase' ? -parseFloat(prevItem.quantity) : parseFloat(prevItem.quantity);
      await updateInventoryStock(prevItem.itemId, revertDelta);
    }
  }

  // Delete existing line items
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

  // Calculate new totals
  const items = data.items || [];
  const voucherTaxMode = data.taxMode === 'inclusive' ? 'inclusive' : 'exclusive';
  const voucherSaleType = data.saleType || 'regular';
  const newVoucherType = data.voucherType || currentInvoice.voucherType || 'sales';

  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let taxTotal = 0;

  const isForceInterstate =
    (newVoucherType === 'sales' && (voucherSaleType === 'export_with_tax' || voucherSaleType === 'sez')) ||
    (newVoucherType === 'purchase' && voucherSaleType === 'import_overseas');

  const isInterstate = isForceInterstate ? true : !!data.isInterstate;

  const isTaxExemptSupply =
    (newVoucherType === 'sales' &&
      (voucherSaleType === 'bill_of_supply' || voucherSaleType === 'export_without_tax')) ||
    (newVoucherType === 'purchase' && voucherSaleType === 'exempt_nil');

  const processedItems = items.map((it: any) => {
    const qty = parseFloat(it.quantity) || 1;
    const inputRate = parseFloat(it.rate) || 0;
    const discountPercent = parseFloat(it.discountPercent) || 0;
    const isItemTaxInclusive =
      it.isTaxInclusive !== undefined ? !!it.isTaxInclusive : voucherTaxMode === 'inclusive';

    const rawGstRate = parseFloat(it.gstRate) || 0;
    const gstRate = isTaxExemptSupply ? 0 : rawGstRate;

    let taxableValue = 0;
    let gstAmount = 0;
    let lineTotal = 0;

    if (isItemTaxInclusive && gstRate > 0) {
      const grossInclTax = qty * inputRate;
      const discountedGross = grossInclTax * (1 - discountPercent / 100);
      taxableValue = discountedGross / (1 + gstRate / 100);
      gstAmount = discountedGross - taxableValue;
      lineTotal = discountedGross;
    } else {
      const grossBase = qty * inputRate;
      taxableValue = grossBase * (1 - discountPercent / 100);
      gstAmount = (taxableValue * gstRate) / 100;
      lineTotal = taxableValue + gstAmount;
    }

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (gstAmount > 0) {
      if (isInterstate) {
        igst = gstAmount;
      } else {
        cgst = gstAmount / 2;
        sgst = gstAmount / 2;
      }
    }

    subtotal += taxableValue;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;
    taxTotal += gstAmount;

    return {
      itemId: it.itemId ? parseInt(it.itemId) : null,
      itemName: it.itemName,
      hsnCode: it.hsnCode || '9983',
      quantity: String(qty),
      unit: it.unit || 'PCS',
      rate: String(inputRate.toFixed(2)),
      isTaxInclusive: isItemTaxInclusive,
      discountPercent: String(discountPercent.toFixed(2)),
      taxableValue: String(taxableValue.toFixed(2)),
      gstRate: String(gstRate.toFixed(2)),
      cgstAmount: String(cgst.toFixed(2)),
      sgstAmount: String(sgst.toFixed(2)),
      igstAmount: String(igst.toFixed(2)),
      total: String(lineTotal.toFixed(2)),
    };
  });

  const grandTotal = subtotal + taxTotal;
  const paidAmount = parseFloat(data.paidAmount) || 0;
  let paymentStatus = 'unpaid';
  if (paidAmount >= grandTotal) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'partial';
  }

  // Auto-sync customer / vendor in parties ledger table
  const syncedPartyId = await syncPartyForInvoice(userId, data, newVoucherType);

  const company = await getCompanyProfile(userId);
  const targetInvoiceNumber = (data.invoiceNumber || currentInvoice.invoiceNumber || '').trim();
  const shouldPreventDuplicate = company?.preventDuplicateInvoiceNo !== false;

  if (targetInvoiceNumber && shouldPreventDuplicate) {
    const dupeCheck = await checkInvoiceNumberDuplicate(userId, targetInvoiceNumber, invoiceId);
    if (dupeCheck.isDuplicate && dupeCheck.existing) {
      throw new Error(
        `Duplicate Invoice Number: Voucher "${targetInvoiceNumber}" is already in use by invoice #${dupeCheck.existing.id} (issued to ${dupeCheck.existing.partyName} on ${dupeCheck.existing.invoiceDate}). Please choose a unique invoice number.`
      );
    }
  }

  await db
    .update(invoices)
    .set({
      partyId: syncedPartyId,
      voucherType: newVoucherType,
      saleType: voucherSaleType,
      taxMode: voucherTaxMode,
      invoiceNumber: targetInvoiceNumber || currentInvoice.invoiceNumber,
      invoiceDate: data.invoiceDate || currentInvoice.invoiceDate,
      dueDate: data.dueDate || null,
      partyName: data.partyName,
      partyGstin: data.partyGstin || null,
      placeOfSupply: data.placeOfSupply || currentInvoice.placeOfSupply || '27',
      isInterstate,
      subtotal: String(subtotal.toFixed(2)),
      cgstTotal: String(cgstTotal.toFixed(2)),
      sgstTotal: String(sgstTotal.toFixed(2)),
      igstTotal: String(igstTotal.toFixed(2)),
      taxTotal: String(taxTotal.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      paidAmount: String(paidAmount.toFixed(2)),
      paymentStatus,
      paymentMode: data.paymentMode || currentInvoice.paymentMode || 'bank_transfer',
      notes: data.notes !== undefined ? data.notes : currentInvoice.notes,
      termsAndConditions:
        data.termsAndConditions !== undefined
          ? data.termsAndConditions
          : currentInvoice.termsAndConditions,
      eWayBillNumber:
        data.ewayBillNumber !== undefined ? data.ewayBillNumber : currentInvoice.eWayBillNumber,
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

  // Insert updated line items and apply new stock adjustments
  for (const item of processedItems) {
    await db.insert(invoiceItems).values({
      invoiceId,
      ...item,
    });

    if (item.itemId) {
      const delta = newVoucherType === 'purchase' ? parseFloat(item.quantity) : -parseFloat(item.quantity);
      await updateInventoryStock(item.itemId, delta);
    }
  }

  return await getInvoiceDetails(invoiceId);
}

export async function deleteInvoice(invoiceId: number, userId: number) {
  const existingInv = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

  if (existingInv.length === 0) return null;
  const currentInvoice = existingInv[0];

  // Revert inventory stock
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  for (const item of items) {
    if (item.itemId) {
      const revertDelta =
        currentInvoice.voucherType === 'purchase' ? -parseFloat(item.quantity) : parseFloat(item.quantity);
      await updateInventoryStock(item.itemId, revertDelta);
    }
  }

  // Delete invoice items
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

  // Delete invoice
  await db.delete(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

  return {
    id: invoiceId,
    invoiceNumber: currentInvoice.invoiceNumber,
    voucherType: currentInvoice.voucherType,
  };
}

// Expenses
export async function getExpenses(userId: number) {
  return await db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.date));
}

export async function createExpense(userId: number, data: any) {
  const res = await db.insert(expenses).values({
    userId,
    category: data.category || 'Office Supplies',
    amount: String(data.amount),
    date: data.date || new Date().toISOString().split('T')[0],
    paymentMode: data.paymentMode || 'bank_transfer',
    referenceNumber: data.referenceNumber || null,
    vendorName: data.vendorName || null,
    gstin: data.gstin ? data.gstin.trim().toUpperCase() : null,
    gstPaid: String(data.gstPaid || '0.00'),
    itcEligible: data.itcEligible !== undefined ? !!data.itcEligible : true,
    receiptUrl: data.receiptUrl || null,
    description: data.description || null,
  }).returning();
  return res[0];
}

export async function editExpense(expenseId: number, userId: number, data: any) {
  const res = await db
    .update(expenses)
    .set({
      category: data.category !== undefined ? data.category : undefined,
      amount: data.amount !== undefined ? String(data.amount) : undefined,
      date: data.date !== undefined ? data.date : undefined,
      paymentMode: data.paymentMode !== undefined ? data.paymentMode : undefined,
      referenceNumber: data.referenceNumber !== undefined ? (data.referenceNumber || null) : undefined,
      vendorName: data.vendorName !== undefined ? (data.vendorName || null) : undefined,
      gstin: data.gstin !== undefined ? (data.gstin ? data.gstin.trim().toUpperCase() : null) : undefined,
      gstPaid: data.gstPaid !== undefined ? String(data.gstPaid || '0.00') : undefined,
      itcEligible: data.itcEligible !== undefined ? !!data.itcEligible : undefined,
      receiptUrl: data.receiptUrl !== undefined ? (data.receiptUrl || null) : undefined,
      description: data.description !== undefined ? (data.description || null) : undefined,
    })
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)))
    .returning();
  return res[0];
}

export async function deleteExpense(expenseId: number, userId: number) {
  const existing = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)));
  if (existing.length === 0) return null;
  const current = existing[0];
  await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)));
  return current;
}

// Reports & Financial Metrics (P&L, Balance Sheet, GST Summary, GSTR-1, GSTR-3B)
export async function getFinancialSummary(userId: number) {
  const invList = await db.select().from(invoices).where(and(eq(invoices.userId, userId), eq(invoices.status, 'active')));
  const expList = await db.select().from(expenses).where(eq(expenses.userId, userId));
  const partyList = await db.select().from(parties).where(eq(parties.userId, userId));
  const stockList = await db.select().from(inventoryItems).where(eq(inventoryItems.userId, userId));
  const payList = await db.select().from(payments).where(eq(payments.userId, userId));

  let totalSales = 0;
  let totalPurchases = 0;
  let totalTaxCollected = 0; // Output GST (Sales)
  let totalTaxPaidOnExpenses = 0; // Input Tax Credit (ITC)
  let totalReceivables = 0;
  let totalPayables = 0;
  let totalExpenses = 0;
  let totalReceipts = 0;
  let totalPaymentsMade = 0;

  for (const pay of payList) {
    const val = parseFloat(pay.amount) || 0;
    if (pay.voucherType === 'receipt') {
      totalReceipts += val;
    } else if (pay.voucherType === 'payment') {
      totalPaymentsMade += val;
    }
  }

  for (const inv of invList) {
    const grand = parseFloat(inv.grandTotal) || 0;
    const paid = parseFloat(inv.paidAmount) || 0;
    const tax = parseFloat(inv.taxTotal) || 0;

    if (inv.voucherType === 'sales') {
      totalSales += parseFloat(inv.subtotal) || 0;
      totalTaxCollected += tax;
      totalReceivables += Math.max(0, grand - paid);
    } else if (inv.voucherType === 'purchase') {
      totalPurchases += parseFloat(inv.subtotal) || 0;
      totalTaxPaidOnExpenses += tax;
      totalPayables += Math.max(0, grand - paid);
    }
  }

  for (const exp of expList) {
    const amt = parseFloat(exp.amount) || 0;
    const gstPaid = parseFloat(exp.gstPaid) || 0;
    totalExpenses += amt;
    if (exp.itcEligible) {
      totalTaxPaidOnExpenses += gstPaid;
    }
  }

  // Stock valuation
  let totalStockValuation = 0;
  for (const item of stockList) {
    const curStock = parseFloat(item.currentStock) || 0;
    const buyPrice = parseFloat(item.purchasePrice) || 0;
    totalStockValuation += curStock * buyPrice;
  }

  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const netGstPayable = Math.max(0, totalTaxCollected - totalTaxPaidOnExpenses);

  return {
    totalSales,
    totalPurchases,
    totalExpenses,
    grossProfit,
    netProfit,
    totalTaxCollected, // Output GST
    totalTaxPaidOnExpenses, // Input Tax Credit (ITC)
    netGstPayable,
    totalReceivables,
    totalPayables,
    totalStockValuation,
    totalReceipts,
    totalPaymentsMade,
    totalInvoicesCount: invList.length,
    partiesCount: partyList.length,
    inventoryCount: stockList.length,
  };
}

// ==========================================
// RECEIPTS & PAYMENTS (VOUCHER TRANSACTIONS)
// ==========================================

export async function getPayments(userId: number, voucherType?: 'receipt' | 'payment') {
  const query = db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        voucherType ? eq(payments.voucherType, voucherType) : sql`1=1`
      )
    )
    .orderBy(desc(payments.date), desc(payments.id));

  return await query;
}

export async function getNextPaymentVoucherNumber(userId: number, voucherType: 'receipt' | 'payment') {
  const company = await getCompanyProfile(userId);
  const isReceipt = voucherType === 'receipt';
  const prefix = isReceipt
    ? (company.receiptPrefix || 'REC/2026-27/')
    : (company.paymentPrefix || 'PAY/2026-27/');
  let counter = isReceipt
    ? (company.nextReceiptNumber || 1)
    : (company.nextPaymentNumber || 1);

  const existingPayments = await db
    .select({ voucherNumber: payments.voucherNumber })
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.voucherType, voucherType)));

  const existingNumbers = new Set(existingPayments.map((p) => p.voucherNumber.trim().toLowerCase()));

  const padding = 3;
  let candidate = formatInvoiceNumber(prefix, counter, padding, '');
  let safetyLoop = 0;
  while (existingNumbers.has(candidate.toLowerCase()) && safetyLoop < 1000) {
    counter++;
    candidate = formatInvoiceNumber(prefix, counter, padding, '');
    safetyLoop++;
  }

  return {
    prefix,
    counter,
    formattedNumber: candidate,
  };
}

export async function createPaymentVoucher(userId: number, data: any) {
  const voucherType = data.voucherType === 'payment' ? 'payment' : 'receipt';
  const amount = parseFloat(data.amount) || 0;
  if (amount <= 0) {
    throw new Error('Voucher amount must be greater than zero');
  }

  const partyName = (data.partyName || '').trim();
  if (!partyName) {
    throw new Error('Party name is required');
  }

  // Find or verify party
  let partyId = data.partyId ? parseInt(data.partyId) : null;
  if (!partyId) {
    const allParties = await db.select().from(parties).where(eq(parties.userId, userId));
    const found = allParties.find((p) => p.name.trim().toLowerCase() === partyName.toLowerCase());
    if (found) {
      partyId = found.id;
    } else {
      const newParty = await createParty(userId, {
        name: partyName,
        partyType: voucherType === 'receipt' ? 'customer' : 'vendor',
        openingBalance: '0.00',
        balanceType: voucherType === 'receipt' ? 'dr' : 'cr',
      });
      partyId = newParty.id;
    }
  }

  const company = await getCompanyProfile(userId);
  let voucherNumber = (data.voucherNumber || '').trim();
  if (!voucherNumber) {
    const nextInfo = await getNextPaymentVoucherNumber(userId, voucherType);
    voucherNumber = nextInfo.formattedNumber;
  }

  // Optional invoice / bill linkage
  let invoiceId = data.invoiceId ? parseInt(data.invoiceId) : null;
  let invoiceNumber = data.invoiceNumber || null;

  if (invoiceId) {
    const inv = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));
    if (inv.length > 0) {
      invoiceNumber = inv[0].invoiceNumber;
      const currentPaid = parseFloat(inv[0].paidAmount) || 0;
      const grandTotal = parseFloat(inv[0].grandTotal) || 0;
      const newPaid = Math.min(grandTotal, currentPaid + amount);
      const newStatus = newPaid >= grandTotal ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

      await db
        .update(invoices)
        .set({
          paidAmount: String(newPaid.toFixed(2)),
          paymentStatus: newStatus,
          paymentMode: data.paymentMode || inv[0].paymentMode,
        })
        .where(eq(invoices.id, invoiceId));
    } else {
      invoiceId = null;
      invoiceNumber = null;
    }
  }

  const inserted = await db
    .insert(payments)
    .values({
      userId,
      voucherType,
      voucherNumber,
      date: data.date || new Date().toISOString().split('T')[0],
      partyId,
      partyName,
      partyType: voucherType === 'receipt' ? 'customer' : 'vendor',
      amount: String(amount.toFixed(2)),
      paymentMode: data.paymentMode || 'bank_transfer',
      accountType: data.accountType || (data.paymentMode === 'cash' ? 'cash' : 'bank'),
      bankName: data.bankName || company.bankName || (data.paymentMode === 'cash' ? 'Cash in Hand' : 'Bank Account'),
      referenceNumber: data.referenceNumber || null,
      invoiceId,
      invoiceNumber,
      notes: data.notes || null,
    })
    .returning();

  // Auto-increment voucher counter in company profile
  try {
    const isReceipt = voucherType === 'receipt';
    const compRows = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userId)).limit(1);
    if (compRows.length > 0) {
      if (isReceipt) {
        const cur = compRows[0].nextReceiptNumber || 1;
        await db.update(companyProfiles).set({ nextReceiptNumber: cur + 1, updatedAt: new Date() }).where(eq(companyProfiles.id, compRows[0].id));
      } else {
        const cur = compRows[0].nextPaymentNumber || 1;
        await db.update(companyProfiles).set({ nextPaymentNumber: cur + 1, updatedAt: new Date() }).where(eq(companyProfiles.id, compRows[0].id));
      }
    }
  } catch (err) {
    console.warn('Failed to increment voucher counter:', err);
  }

  return inserted[0];
}

export async function deletePaymentVoucher(voucherId: number, userId: number) {
  const existing = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, voucherId), eq(payments.userId, userId)));

  if (existing.length === 0) return null;
  const voucher = existing[0];

  // If this payment was linked to an invoice, revert paidAmount on invoice
  if (voucher.invoiceId) {
    const inv = await db.select().from(invoices).where(eq(invoices.id, voucher.invoiceId));
    if (inv.length > 0) {
      const currentPaid = parseFloat(inv[0].paidAmount) || 0;
      const voucherAmount = parseFloat(voucher.amount) || 0;
      const newPaid = Math.max(0, currentPaid - voucherAmount);
      const grandTotal = parseFloat(inv[0].grandTotal) || 0;
      const newStatus = newPaid >= grandTotal ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

      await db
        .update(invoices)
        .set({
          paidAmount: String(newPaid.toFixed(2)),
          paymentStatus: newStatus,
        })
        .where(eq(invoices.id, voucher.invoiceId));
    }
  }

  await db.delete(payments).where(and(eq(payments.id, voucherId), eq(payments.userId, userId)));
  return voucher;
}

// Activity logs
export async function getActivityLogs(userId: number) {
  return await db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt)).limit(30);
}

// ==================== JOURNAL ENTRIES & DOUBLE-ENTRY ACCOUNTING ====================

export async function getJournalEntries(userId: number) {
  return await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.date), desc(journalEntries.id));
}

export async function getNextJournalVoucherNumber(userId: number, entryType: 'journal' | 'contra' | 'debit_note' | 'credit_note' | 'adjustment' | 'opening' = 'journal') {
  const company = await getCompanyProfile(userId);
  let prefix = 'JV/2026-27/';
  let counter = 1;

  if (entryType === 'contra') {
    prefix = company.contraPrefix || 'CONTRA/2026-27/';
    counter = company.nextContraNumber || 1;
  } else if (entryType === 'debit_note') {
    prefix = 'DN/2026-27/';
  } else if (entryType === 'credit_note') {
    prefix = 'CN/2026-27/';
  } else {
    prefix = company.journalPrefix || 'JV/2026-27/';
    counter = company.nextJournalNumber || 1;
  }

  const existingEntries = await db
    .select({ voucherNumber: journalEntries.voucherNumber })
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.entryType, entryType)));

  const existingNumbers = new Set(existingEntries.map((e) => e.voucherNumber.trim().toLowerCase()));

  const padding = 3;
  let candidate = formatInvoiceNumber(prefix, counter, padding, '');
  let safetyLoop = 0;
  while (existingNumbers.has(candidate.toLowerCase()) && safetyLoop < 1000) {
    counter++;
    candidate = formatInvoiceNumber(prefix, counter, padding, '');
    safetyLoop++;
  }

  return {
    prefix,
    counter,
    formattedNumber: candidate,
  };
}

export async function createJournalEntry(userId: number, data: any) {
  const entryType = data.entryType || 'journal';
  const amount = parseFloat(data.amount) || 0;
  if (amount <= 0) {
    throw new Error('Journal voucher amount must be greater than zero');
  }

  const debitAccount = (data.debitAccount || '').trim();
  const creditAccount = (data.creditAccount || '').trim();

  if (!debitAccount || !creditAccount) {
    throw new Error('Both Debit Account and Credit Account are required for double-entry posting');
  }

  if (debitAccount.toLowerCase() === creditAccount.toLowerCase()) {
    throw new Error('Debit and Credit accounts cannot be the same');
  }

  const company = await getCompanyProfile(userId);
  let voucherNumber = (data.voucherNumber || '').trim();
  if (!voucherNumber) {
    const nextInfo = await getNextJournalVoucherNumber(userId, entryType);
    voucherNumber = nextInfo.formattedNumber;
  }

  const inserted = await db
    .insert(journalEntries)
    .values({
      userId,
      entryType,
      voucherNumber,
      date: data.date || new Date().toISOString().split('T')[0],
      referenceNumber: data.referenceNumber || null,
      debitAccount,
      creditAccount,
      debitPartyId: data.debitPartyId ? parseInt(data.debitPartyId) : null,
      creditPartyId: data.creditPartyId ? parseInt(data.creditPartyId) : null,
      amount: String(amount.toFixed(2)),
      narration: (data.narration || '').trim() || `Being ${entryType} posted from ${creditAccount} to ${debitAccount}`,
    })
    .returning();

  // Auto-increment voucher counter in company profile
  try {
    const compRows = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userId)).limit(1);
    if (compRows.length > 0) {
      if (entryType === 'contra') {
        const cur = compRows[0].nextContraNumber || 1;
        await db.update(companyProfiles).set({ nextContraNumber: cur + 1, updatedAt: new Date() }).where(eq(companyProfiles.id, compRows[0].id));
      } else if (entryType === 'journal') {
        const cur = compRows[0].nextJournalNumber || 1;
        await db.update(companyProfiles).set({ nextJournalNumber: cur + 1, updatedAt: new Date() }).where(eq(companyProfiles.id, compRows[0].id));
      }
    }
  } catch (err) {
    console.warn('Failed to increment journal voucher counter:', err);
  }

  return inserted[0];
}

export async function deleteJournalEntry(entryId: number, userId: number) {
  const existing = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, userId)));

  if (existing.length === 0) return null;
  const entry = existing[0];

  await db.delete(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, userId)));
  return entry;
}

export async function editJournalEntry(entryId: number, userId: number, data: any) {
  const existing = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, userId)));

  if (existing.length === 0) return null;

  const amount = data.amount !== undefined ? parseFloat(data.amount) : parseFloat(existing[0].amount);
  if (amount <= 0) {
    throw new Error('Journal voucher amount must be greater than zero');
  }

  const debitAccount = data.debitAccount !== undefined ? data.debitAccount.trim() : existing[0].debitAccount;
  const creditAccount = data.creditAccount !== undefined ? data.creditAccount.trim() : existing[0].creditAccount;

  if (!debitAccount || !creditAccount) {
    throw new Error('Both Debit Account and Credit Account are required for double-entry posting');
  }

  if (debitAccount.toLowerCase() === creditAccount.toLowerCase()) {
    throw new Error('Debit and Credit accounts cannot be the same');
  }

  const updated = await db
    .update(journalEntries)
    .set({
      date: data.date !== undefined ? data.date : existing[0].date,
      referenceNumber: data.referenceNumber !== undefined ? data.referenceNumber : existing[0].referenceNumber,
      debitAccount,
      creditAccount,
      debitPartyId: data.debitPartyId !== undefined ? (data.debitPartyId ? parseInt(data.debitPartyId) : null) : existing[0].debitPartyId,
      creditPartyId: data.creditPartyId !== undefined ? (data.creditPartyId ? parseInt(data.creditPartyId) : null) : existing[0].creditPartyId,
      amount: String(amount.toFixed(2)),
      narration: data.narration !== undefined ? data.narration.trim() : existing[0].narration,
    })
    .where(and(eq(journalEntries.id, entryId), eq(journalEntries.userId, userId)))
    .returning();

  return updated[0];
}

// ==========================================
// CHEQUE BOOKS & CHEQUES MANAGEMENT
// ==========================================

export async function getChequeBooks(userId: number) {
  const books = await db
    .select()
    .from(chequeBooks)
    .where(eq(chequeBooks.userId, userId))
    .orderBy(desc(chequeBooks.createdAt));

  // Compute used leaves based on recorded cheques
  const userCheques = await db
    .select()
    .from(cheques)
    .where(eq(cheques.userId, userId));

  return books.map((b) => {
    const matchingCheques = userCheques.filter(
      (c) => c.chequeBookId === b.id || (
        c.chequeType === 'outward' &&
        parseInt(c.chequeNumber, 10) >= b.startNumber &&
        parseInt(c.chequeNumber, 10) <= b.endNumber
      )
    );
    const usedCount = matchingCheques.length;
    return {
      ...b,
      usedLeaves: Math.max(b.usedLeaves || 0, usedCount),
    };
  });
}

export async function createChequeBook(userId: number, data: any) {
  const startNum = parseInt(data.startNumber, 10);
  const endNum = parseInt(data.endNumber, 10);
  if (isNaN(startNum) || isNaN(endNum) || endNum < startNum) {
    throw new Error('Invalid cheque leaf number range: Ending number must be greater than or equal to Starting number');
  }

  const calculatedLeaves = (endNum - startNum) + 1;
  const totalLeaves = data.totalLeaves ? parseInt(data.totalLeaves, 10) : calculatedLeaves;

  const inserted = await db
    .insert(chequeBooks)
    .values({
      userId,
      bankName: (data.bankName || 'HDFC Bank Ltd').trim(),
      accountNumber: data.accountNumber ? data.accountNumber.trim() : null,
      bookName: (data.bookName || `${data.bankName} Cheque Book (${startNum}-${endNum})`).trim(),
      seriesPrefix: data.seriesPrefix ? data.seriesPrefix.trim() : null,
      startNumber: startNum,
      endNumber: endNum,
      totalLeaves,
      usedLeaves: 0,
      status: 'active',
    })
    .returning();

  return inserted[0];
}

export async function editChequeBook(bookId: number, userId: number, data: any) {
  const existing = await db
    .select()
    .from(chequeBooks)
    .where(and(eq(chequeBooks.id, bookId), eq(chequeBooks.userId, userId)));

  if (existing.length === 0) return null;

  const updates: any = {};
  if (data.bankName) updates.bankName = data.bankName.trim();
  if (data.accountNumber !== undefined) updates.accountNumber = data.accountNumber ? data.accountNumber.trim() : null;
  if (data.bookName) updates.bookName = data.bookName.trim();
  if (data.seriesPrefix !== undefined) updates.seriesPrefix = data.seriesPrefix ? data.seriesPrefix.trim() : null;
  if (data.status) updates.status = data.status;

  if (data.startNumber && data.endNumber) {
    const startNum = parseInt(data.startNumber, 10);
    const endNum = parseInt(data.endNumber, 10);
    if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
      updates.startNumber = startNum;
      updates.endNumber = endNum;
      updates.totalLeaves = (endNum - startNum) + 1;
    }
  }

  const updated = await db
    .update(chequeBooks)
    .set(updates)
    .where(and(eq(chequeBooks.id, bookId), eq(chequeBooks.userId, userId)))
    .returning();

  return updated[0];
}

export async function deleteChequeBook(bookId: number, userId: number) {
  const existing = await db
    .select()
    .from(chequeBooks)
    .where(and(eq(chequeBooks.id, bookId), eq(chequeBooks.userId, userId)));

  if (existing.length === 0) return null;

  // Unlink cheques pointing to this cheque book
  await db
    .update(cheques)
    .set({ chequeBookId: null })
    .where(and(eq(cheques.chequeBookId, bookId), eq(cheques.userId, userId)));

  await db
    .delete(chequeBooks)
    .where(and(eq(chequeBooks.id, bookId), eq(chequeBooks.userId, userId)));

  return existing[0];
}

export async function getCheques(userId: number) {
  return await db
    .select()
    .from(cheques)
    .where(eq(cheques.userId, userId))
    .orderBy(desc(cheques.chequeDate), desc(cheques.id));
}

export async function createCheque(userId: number, data: any) {
  const amount = parseFloat(data.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Valid cheque amount greater than ₹0 is required');
  }

  const chequeNumber = String(data.chequeNumber || '').trim();
  if (!chequeNumber) {
    throw new Error('Cheque Number is required');
  }

  const payeeName = (data.payeeName || data.partyName || '').trim();
  if (!payeeName) {
    throw new Error('Payee / Drawer Party Name is required');
  }

  const chequeDate = data.chequeDate || new Date().toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const isPdc = data.isPdc !== undefined ? Boolean(data.isPdc) : (chequeDate > todayStr);

  const chequeType = (data.chequeType === 'outward' ? 'outward' : 'inward') as 'inward' | 'outward';
  const status = (data.status || 'in_hand') as 'in_hand' | 'deposited' | 'cleared' | 'bounced' | 'cancelled' | 'stopped';

  // Auto match or link party
  let partyId = data.partyId ? parseInt(data.partyId, 10) : null;
  if (!partyId && payeeName) {
    const targetType = chequeType === 'inward' ? 'customer' : 'vendor';
    partyId = await autoFindOrCreateParty(userId, payeeName, targetType);
  }

  let chequeBookId = data.chequeBookId ? parseInt(data.chequeBookId, 10) : null;
  if (!chequeBookId && chequeType === 'outward') {
    // Attempt to auto-match with active cheque book by bank or leaf number
    const num = parseInt(chequeNumber, 10);
    if (!isNaN(num)) {
      const books = await db.select().from(chequeBooks).where(eq(chequeBooks.userId, userId));
      const matched = books.find((b) => num >= b.startNumber && num <= b.endNumber && b.status === 'active');
      if (matched) {
        chequeBookId = matched.id;
      }
    }
  }

  const inserted = await db
    .insert(cheques)
    .values({
      userId,
      chequeBookId,
      chequeType,
      chequeNumber,
      chequeDate,
      amount: String(amount.toFixed(2)),
      partyId,
      payeeName,
      bankName: (data.bankName || (chequeType === 'outward' ? 'Company Bank A/c' : 'Customer Bank')).trim(),
      branchName: data.branchName ? data.branchName.trim() : null,
      ifscCode: data.ifscCode ? data.ifscCode.trim().toUpperCase() : null,
      depositBank: data.depositBank ? data.depositBank.trim() : null,
      status,
      isPdc,
      isAccountPayee: data.isAccountPayee !== undefined ? Boolean(data.isAccountPayee) : true,
      depositDate: data.depositDate || null,
      clearanceDate: data.clearanceDate || null,
      bounceDate: data.bounceDate || null,
      bounceReason: data.bounceReason || null,
      bounceCharges: data.bounceCharges ? String(parseFloat(data.bounceCharges).toFixed(2)) : '0.00',
      voucherId: data.voucherId ? parseInt(data.voucherId, 10) : null,
      invoiceId: data.invoiceId ? parseInt(data.invoiceId, 10) : null,
      referenceNumber: data.referenceNumber ? data.referenceNumber.trim() : null,
      remarks: data.remarks ? data.remarks.trim() : null,
    })
    .returning();

  return inserted[0];
}

export async function editCheque(chequeId: number, userId: number, data: any) {
  const existing = await db
    .select()
    .from(cheques)
    .where(and(eq(cheques.id, chequeId), eq(cheques.userId, userId)));

  if (existing.length === 0) return null;

  const updates: any = {};
  if (data.chequeNumber) updates.chequeNumber = String(data.chequeNumber).trim();
  if (data.chequeDate) updates.chequeDate = data.chequeDate;
  if (data.amount !== undefined) updates.amount = String(parseFloat(data.amount).toFixed(2));
  if (data.payeeName) updates.payeeName = data.payeeName.trim();
  if (data.bankName) updates.bankName = data.bankName.trim();
  if (data.branchName !== undefined) updates.branchName = data.branchName ? data.branchName.trim() : null;
  if (data.ifscCode !== undefined) updates.ifscCode = data.ifscCode ? data.ifscCode.trim().toUpperCase() : null;
  if (data.depositBank !== undefined) updates.depositBank = data.depositBank ? data.depositBank.trim() : null;
  if (data.chequeType) updates.chequeType = data.chequeType;
  if (data.status) updates.status = data.status;
  if (data.isPdc !== undefined) updates.isPdc = Boolean(data.isPdc);
  if (data.isAccountPayee !== undefined) updates.isAccountPayee = Boolean(data.isAccountPayee);
  if (data.depositDate !== undefined) updates.depositDate = data.depositDate || null;
  if (data.clearanceDate !== undefined) updates.clearanceDate = data.clearanceDate || null;
  if (data.bounceDate !== undefined) updates.bounceDate = data.bounceDate || null;
  if (data.bounceReason !== undefined) updates.bounceReason = data.bounceReason || null;
  if (data.bounceCharges !== undefined) updates.bounceCharges = String(parseFloat(data.bounceCharges || '0').toFixed(2));
  if (data.partyId !== undefined) updates.partyId = data.partyId ? parseInt(data.partyId, 10) : null;
  if (data.chequeBookId !== undefined) updates.chequeBookId = data.chequeBookId ? parseInt(data.chequeBookId, 10) : null;
  if (data.referenceNumber !== undefined) updates.referenceNumber = data.referenceNumber ? data.referenceNumber.trim() : null;
  if (data.remarks !== undefined) updates.remarks = data.remarks ? data.remarks.trim() : null;

  const updated = await db
    .update(cheques)
    .set(updates)
    .where(and(eq(cheques.id, chequeId), eq(cheques.userId, userId)))
    .returning();

  return updated[0];
}

export async function updateChequeStatus(chequeId: number, userId: number, statusData: any) {
  const existing = await db
    .select()
    .from(cheques)
    .where(and(eq(cheques.id, chequeId), eq(cheques.userId, userId)));

  if (existing.length === 0) return null;
  const current = existing[0];

  const updates: any = {
    status: statusData.status,
  };

  const todayStr = new Date().toISOString().split('T')[0];

  if (statusData.status === 'deposited') {
    updates.depositBank = statusData.depositBank || current.depositBank || 'Main Bank Account';
    updates.depositDate = statusData.depositDate || todayStr;
  } else if (statusData.status === 'cleared') {
    updates.clearanceDate = statusData.clearanceDate || todayStr;
    if (statusData.depositBank) updates.depositBank = statusData.depositBank;
  } else if (statusData.status === 'bounced') {
    updates.bounceDate = statusData.bounceDate || todayStr;
    updates.bounceReason = statusData.bounceReason || 'Funds Insufficient';
    updates.bounceCharges = statusData.bounceCharges ? String(parseFloat(statusData.bounceCharges).toFixed(2)) : (current.bounceCharges || '0.00');
  } else if (statusData.status === 'in_hand') {
    updates.depositDate = null;
    updates.clearanceDate = null;
    updates.bounceDate = null;
  } else if (statusData.status === 'cancelled') {
    updates.clearanceDate = null;
  }

  if (statusData.remarks) {
    updates.remarks = statusData.remarks;
  }

  const updated = await db
    .update(cheques)
    .set(updates)
    .where(and(eq(cheques.id, chequeId), eq(cheques.userId, userId)))
    .returning();

  return updated[0];
}

export async function deleteCheque(chequeId: number, userId: number) {
  const existing = await db
    .select()
    .from(cheques)
    .where(and(eq(cheques.id, chequeId), eq(cheques.userId, userId)));

  if (existing.length === 0) return null;

  await db
    .delete(cheques)
    .where(and(eq(cheques.id, chequeId), eq(cheques.userId, userId)));

  return existing[0];
}

export async function clearMasterLedger(userId: number) {
  const userInvoices = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.userId, userId));
  const invoiceIds = userInvoices.map((inv) => inv.id);

  if (invoiceIds.length > 0) {
    await db.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds));
  }

  await db.delete(invoices).where(eq(invoices.userId, userId));
  await db.delete(expenses).where(eq(expenses.userId, userId));
  await db.delete(payments).where(eq(payments.userId, userId));
  await db.delete(journalEntries).where(eq(journalEntries.userId, userId));
  await db.delete(cheques).where(eq(cheques.userId, userId));
  await db.delete(chequeBooks).where(eq(chequeBooks.userId, userId));
  await db.delete(inventoryItems).where(eq(inventoryItems.userId, userId));
  await db.delete(parties).where(eq(parties.userId, userId));

  await db
    .update(companyProfiles)
    .set({
      nextInvoiceNumber: 1,
      nextPurchaseNumber: 1,
      nextReceiptNumber: 1,
      nextPaymentNumber: 1,
      nextJournalNumber: 1,
      nextContraNumber: 1,
      updatedAt: new Date(),
    })
    .where(eq(companyProfiles.userId, userId));

  return { success: true, message: 'All master ledgers and transactions cleared successfully' };
}

export async function getFullDataBackup(userId: number) {
  const companyProfile = await getCompanyProfile(userId);
  const partiesList = await getParties(userId);
  const inventoryList = await getInventory(userId);
  const invoicesList = await getInvoices(userId);
  const expensesList = await getExpenses(userId);
  const paymentsList = await getPayments(userId);
  const journalList = await getJournalEntries(userId);
  const chequeBooksList = await getChequeBooks(userId);
  const chequesList = await getCheques(userId);
  const logsList = await getActivityLogs(userId);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      companyProfile,
      parties: partiesList,
      inventoryItems: inventoryList,
      invoices: invoicesList,
      expenses: expensesList,
      payments: paymentsList,
      journalEntries: journalList,
      chequeBooks: chequeBooksList,
      cheques: chequesList,
      activityLogs: logsList,
    },
  };
}

export async function restoreDataFromBackup(userId: number, backupPayload: any) {
  const data = backupPayload?.data || backupPayload;
  if (!data) {
    throw new Error('Invalid backup JSON format. Missing data payload.');
  }

  // 1. Clear existing data
  await clearMasterLedger(userId);

  // 2. Restore company profile
  if (data.companyProfile) {
    const { id: _, userId: __, ...profileData } = data.companyProfile;
    await upsertCompanyProfile(userId, profileData);
  }

  // 3. Restore parties
  const partyIdMap = new Map<number, number>();
  if (Array.isArray(data.parties)) {
    for (const p of data.parties) {
      const { id: oldId, userId: _, ...pData } = p;
      const inserted = await db.insert(parties).values({ ...pData, userId }).returning({ id: parties.id });
      if (oldId && inserted[0]) {
        partyIdMap.set(oldId, inserted[0].id);
      }
    }
  }

  // 4. Restore inventory items
  const itemIdMap = new Map<number, number>();
  if (Array.isArray(data.inventoryItems)) {
    for (const item of data.inventoryItems) {
      const { id: oldId, userId: _, ...itemData } = item;
      const inserted = await db.insert(inventoryItems).values({ ...itemData, userId }).returning({ id: inventoryItems.id });
      if (oldId && inserted[0]) {
        itemIdMap.set(oldId, inserted[0].id);
      }
    }
  }

  // 5. Restore invoices & items
  if (Array.isArray(data.invoices)) {
    for (const inv of data.invoices) {
      const { id: _, userId: __, items, partyId, ...invData } = inv;
      const newPartyId = partyId && partyIdMap.has(partyId) ? partyIdMap.get(partyId) : null;
      const insertedInv = await db
        .insert(invoices)
        .values({ ...invData, userId, partyId: newPartyId })
        .returning({ id: invoices.id });

      const newInvId = insertedInv[0]?.id;
      if (newInvId && Array.isArray(items)) {
        for (const item of items) {
          const { id: _, invoiceId: __, itemId, ...itemData } = item;
          const newItemId = itemId && itemIdMap.has(itemId) ? itemIdMap.get(itemId) : null;
          await db.insert(invoiceItems).values({
            ...itemData,
            invoiceId: newInvId,
            itemId: newItemId,
          });
        }
      }
    }
  }

  // 6. Restore expenses
  if (Array.isArray(data.expenses)) {
    for (const exp of data.expenses) {
      const { id: _, userId: __, ...expData } = exp;
      await db.insert(expenses).values({ ...expData, userId });
    }
  }

  // 7. Restore payments
  if (Array.isArray(data.payments)) {
    for (const pay of data.payments) {
      const { id: _, userId: __, partyId, ...payData } = pay;
      const newPartyId = partyId && partyIdMap.has(partyId) ? partyIdMap.get(partyId) : null;
      await db.insert(payments).values({ ...payData, userId, partyId: newPartyId });
    }
  }

  // 8. Restore journal entries
  if (Array.isArray(data.journalEntries)) {
    for (const je of data.journalEntries) {
      const { id: _, userId: __, debitPartyId, creditPartyId, ...jeData } = je;
      const newDebit = debitPartyId && partyIdMap.has(debitPartyId) ? partyIdMap.get(debitPartyId) : null;
      const newCredit = creditPartyId && partyIdMap.has(creditPartyId) ? partyIdMap.get(creditPartyId) : null;
      await db.insert(journalEntries).values({ ...jeData, userId, debitPartyId: newDebit, creditPartyId: newCredit });
    }
  }

  // 9. Restore cheque books & cheques
  const bookIdMap = new Map<number, number>();
  if (Array.isArray(data.chequeBooks)) {
    for (const cb of data.chequeBooks) {
      const { id: oldId, userId: _, ...cbData } = cb;
      const inserted = await db.insert(chequeBooks).values({ ...cbData, userId }).returning({ id: chequeBooks.id });
      if (oldId && inserted[0]) {
        bookIdMap.set(oldId, inserted[0].id);
      }
    }
  }

  if (Array.isArray(data.cheques)) {
    for (const ch of data.cheques) {
      const { id: _, userId: __, partyId, chequeBookId, ...chData } = ch;
      const newPartyId = partyId && partyIdMap.has(partyId) ? partyIdMap.get(partyId) : null;
      const newBookId = chequeBookId && bookIdMap.has(chequeBookId) ? bookIdMap.get(chequeBookId) : null;
      await db.insert(cheques).values({ ...chData, userId, partyId: newPartyId, chequeBookId: newBookId });
    }
  }

  await logActivity(userId, 'system@backup.restore', 'RESTORE_DATA_BACKUP', 'company', String(userId), 'Restored application state from JSON backup file.');
  return { success: true, message: 'Data restored successfully from backup' };
}

