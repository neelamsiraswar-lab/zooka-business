// src/db/dataService.ts
import { db, COLLECTIONS, getNextSequenceId } from './index.ts';
import { CompanyProfile } from '../types.ts';
import { getActiveWorkspaceId } from './workspaces.ts';

export function resolveWorkspaceId(providedWorkspaceId?: string): string {
  if (providedWorkspaceId && typeof providedWorkspaceId === 'string' && providedWorkspaceId.trim()) {
    return providedWorkspaceId.trim();
  }
  return getActiveWorkspaceId();
}

export function assertWorkspaceDocument(docData: any, expectedWorkspaceId: string, entityType: string) {
  if (!docData) return;
  const docWs = docData.workspaceId;
  if (docWs && expectedWorkspaceId && docWs !== expectedWorkspaceId) {
    throw new Error(`Access Denied: ${entityType} belongs to another workspace (IDOR prevented).`);
  }
}

// Activity Logger
export async function logActivity(
  userId: number,
  email: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: string,
  optionalWorkspaceId?: string
) {
  try {
    const wsId = resolveWorkspaceId(optionalWorkspaceId);
    const logId = await getNextSequenceId('activity_log_id');
    const logDoc = {
      id: logId,
      userId,
      workspaceId: wsId || null,
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

export async function getActivityLogs(userIdOrWsId?: any, limit = 50, optionalWorkspaceId?: string) {
  try {
    const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
    const logsRef = db.collection(COLLECTIONS.ACTIVITY_LOGS);
    let snap;
    if (wsId) {
      snap = await logsRef.where('workspaceId', '==', wsId).orderBy('id', 'desc').limit(limit).get();
    } else {
      snap = await logsRef.orderBy('id', 'desc').limit(limit).get();
    }
    return snap.docs.map((doc) => doc.data());
  } catch (err) {
    console.error('Failed to fetch activity logs from Firestore:', err);
    return [];
  }
}

// Company Profile
export async function getCompanyProfile(userIdOrWsId?: any, optionalWorkspaceId?: string): Promise<CompanyProfile | null> {
  try {
    const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
    const profilesRef = db.collection(COLLECTIONS.COMPANY_PROFILES);
    let snap;
    if (wsId) {
      snap = await profilesRef.where('workspaceId', '==', wsId).limit(1).get();
    } else {
      snap = await profilesRef.limit(1).get();
    }

    if (snap && !snap.empty) {
      return snap.docs[0].data() as CompanyProfile;
    }
  } catch (err) {
    console.error('Error getting company profile from Firestore:', err);
  }

  return null;
}

export async function upsertCompanyProfile(userIdOrData: any, dataOrWsId?: any, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  let wsId = '';

  if (typeof userIdOrData === 'object' && userIdOrData !== null) {
    data = userIdOrData;
    userId = Number(data.userId) || 1;
    wsId = resolveWorkspaceId(typeof dataOrWsId === 'string' ? dataOrWsId : (data.workspaceId || optionalWorkspaceId));
  } else {
    userId = Number(userIdOrData) || 1;
    data = (typeof dataOrWsId === 'object' && dataOrWsId !== null) ? dataOrWsId : {};
    wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  }

  const profilesRef = db.collection(COLLECTIONS.COMPANY_PROFILES);
  let snap;
  if (wsId) {
    snap = await profilesRef.where('workspaceId', '==', wsId).limit(1).get();
  } else {
    snap = await profilesRef.limit(1).get();
  }

  const cleanData = {
    ...data,
    userId,
    workspaceId: wsId || data.workspaceId || null,
    updatedAt: new Date().toISOString(),
  };

  if (snap && !snap.empty) {
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

export async function getNextAvailableInvoiceNumber(userId: number, voucherType: 'sales' | 'purchase' = 'sales', optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const company = await getCompanyProfile(wsId);
  const isPurchase = voucherType === 'purchase';
  const mode = isPurchase
    ? (company?.purchaseNumberingMode || 'automatic')
    : (company?.invoiceNumberingMode || 'automatic');
  const prefix = isPurchase
    ? (company?.purchasePrefix || 'PUR/2026-27/')
    : (company?.invoicePrefix || 'INV/2026-27/');
  const suffix = isPurchase ? '' : (company?.invoiceSuffix || '');
  const padding = isPurchase ? 3 : (company?.invoicePadding || 3);
  let counter = isPurchase ? (company?.nextPurchaseNumber || 1) : (company?.nextInvoiceNumber || 1);

  // Fetch existing invoice numbers for this voucherType within the active workspace
  let invoicesQuery = db.collection(COLLECTIONS.INVOICES).where('voucherType', '==', voucherType);
  if (wsId) {
    invoicesQuery = invoicesQuery.where('workspaceId', '==', wsId);
  }
  const invoicesSnap = await invoicesQuery.get();

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
  excludeInvoiceId?: number,
  optionalWorkspaceId?: string
) {
  const trimmed = (invoiceNumber || '').trim().toLowerCase();
  if (!trimmed) {
    return { isDuplicate: false, existing: null };
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  let query = db.collection(COLLECTIONS.INVOICES);
  let snap;
  if (wsId) {
    snap = await query.where('workspaceId', '==', wsId).get();
  } else {
    snap = await query.get();
  }

  const duplicateDoc = snap.docs.find((doc) => {
    const data = doc.data();
    if (excludeInvoiceId && data.id === excludeInvoiceId) return false;
    return (data.invoiceNumber || '').trim().toLowerCase() === trimmed;
  });

  return {
    isDuplicate: Boolean(duplicateDoc),
    existing: duplicateDoc ? duplicateDoc.data() : null,
  };
}

// Parties (Customers & Vendors)
export async function getParties(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
  if (!wsId) {
    return [];
  }
  const partiesRef = db.collection(COLLECTIONS.PARTIES);
  const invoicesRef = db.collection(COLLECTIONS.INVOICES);
  const paymentsRef = db.collection(COLLECTIONS.PAYMENTS);

  let [partiesSnap, invoicesSnap, paymentsSnap] = await Promise.all([
    partiesRef.where('workspaceId', '==', wsId).get().catch((err) => {
      console.warn(`[getParties] Error querying root parties for workspace ${wsId}:`, err);
      return { docs: [], empty: true, size: 0 };
    }),
    invoicesRef.where('workspaceId', '==', wsId).get().catch((err) => {
      console.warn(`[getParties] Error querying invoices for workspace ${wsId}:`, err);
      return { docs: [], empty: true, size: 0 };
    }),
    paymentsRef.where('workspaceId', '==', wsId).get().catch((err) => {
      console.warn(`[getParties] Error querying payments for workspace ${wsId}:`, err);
      return { docs: [], empty: true, size: 0 };
    }),
  ]);

  // Also check workspace subcollection /workspaces/{wsId}/parties
  try {
    const wsSubSnap = await db.collection(`workspaces/${wsId}/parties`).get();
    if (!wsSubSnap.empty) {
      const existingIds = new Set(partiesSnap.docs.map((d: any) => String(d.id)));
      const combinedDocs = [...partiesSnap.docs];
      for (const d of wsSubSnap.docs) {
        if (!existingIds.has(String(d.id))) {
          combinedDocs.push(d);
          existingIds.add(String(d.id));
        }
      }
      partiesSnap = { docs: combinedDocs, empty: combinedDocs.length === 0, size: combinedDocs.length } as any;
    }
  } catch (subErr) {
    // Non-fatal subcollection fallback
  }

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

export async function createParty(dataOrUserId: any, userIdOrData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
    data = dataOrUserId;
    userId = Number(userIdOrData) || 1;
  } else {
    userId = Number(dataOrUserId) || 1;
    data = userIdOrData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  if (!wsId) {
    throw new Error('Active workspace ID is required to scope customer ledger records.');
  }
  const partyId = await getNextSequenceId('party_id');
  const party = {
    id: partyId,
    userId,
    workspaceId: wsId,
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

  // 1. Root collection partitioned by workspaceId
  await db.collection(COLLECTIONS.PARTIES).doc(String(partyId)).set(party);

  // 2. Direct workspace subcollection /workspaces/{wsId}/parties/{partyId}
  try {
    await db.collection(`workspaces/${wsId}/parties`).doc(String(partyId)).set(party);
  } catch (subErr) {
    console.warn(`[createParty] Could not sync party to workspace subcollection:`, subErr);
  }

  if (userName) {
    await logActivity(userId, userName, 'CREATE', 'PARTY', String(partyId), `Created ledger account for ${party.name} (${party.partyType})`, wsId);
  }

  return party;
}

export async function editParty(partyId: number, userId: number, data: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || data?.workspaceId);
  const docRef = db.collection(COLLECTIONS.PARTIES).doc(String(partyId));
  const snap = await docRef.get();
  let existing: any = null;
  if (snap.exists) {
    existing = snap.data();
    assertWorkspaceDocument(existing, wsId, 'Party');
  } else if (wsId) {
    const subDocRef = db.collection(`workspaces/${wsId}/parties`).doc(String(partyId));
    const subSnap = await subDocRef.get();
    if (subSnap.exists) {
      existing = subSnap.data();
    }
  }

  if (!existing) {
    return null;
  }

  const targetWsId = existing.workspaceId || wsId;
  const updated = { ...existing, ...data, id: partyId, workspaceId: targetWsId };
  await docRef.set(updated, { merge: true });

  if (targetWsId) {
    try {
      await db.collection(`workspaces/${targetWsId}/parties`).doc(String(partyId)).set(updated, { merge: true });
    } catch (subErr) {
      console.warn(`[editParty] Could not sync updated party to workspace subcollection:`, subErr);
    }
  }
  return updated;
}

export async function deleteParty(partyId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.PARTIES).doc(String(partyId));
  const snap = await docRef.get();
  let data: any = null;
  if (snap.exists) {
    data = snap.data();
    assertWorkspaceDocument(data, wsId, 'Party');
    await docRef.delete();
  } else if (wsId) {
    const subDocRef = db.collection(`workspaces/${wsId}/parties`).doc(String(partyId));
    const subSnap = await subDocRef.get();
    if (subSnap.exists) {
      data = subSnap.data();
      await subDocRef.delete();
    }
  }

  if (!data) return null;

  const targetWsId = data.workspaceId || wsId;
  if (targetWsId) {
    try {
      await db.collection(`workspaces/${targetWsId}/parties`).doc(String(partyId)).delete();
    } catch (subErr) {
      console.warn(`[deleteParty] Could not delete party from workspace subcollection:`, subErr);
    }
  }

  if (userName) {
    await logActivity(Number(userId) || 1, userName, 'DELETE', 'PARTY', String(partyId), `Deleted ledger for ${data.name || partyId}`, targetWsId);
  }

  return data;
}

// Inventory Items
export async function getInventory(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
  if (!wsId) {
    return [];
  }
  let query = db.collection(COLLECTIONS.INVENTORY_ITEMS).where('workspaceId', '==', wsId);
  const snap = await query.get().catch((err) => {
    console.warn(`[getInventory] Failed for workspace ${wsId}:`, err);
    return { docs: [] };
  });
  return snap.docs.map((doc) => doc.data());
}

export async function createInventoryItem(dataOrUserId: any, userIdOrData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
    data = dataOrUserId;
    userId = Number(userIdOrData) || 1;
  } else {
    userId = Number(dataOrUserId) || 1;
    data = userIdOrData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  if (!wsId) {
    throw new Error('Active workspace ID is required to create inventory items.');
  }
  const itemId = await getNextSequenceId('inventory_item_id');
  const item = {
    id: itemId,
    userId,
    workspaceId: wsId,
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

export async function editInventoryItem(itemId: number, userId: number, data: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || data?.workspaceId);
  const docRef = db.collection(COLLECTIONS.INVENTORY_ITEMS).doc(String(itemId));
  const snap = await docRef.get();
  if (!snap.exists) {
    return null;
  }
  const existing = snap.data();
  assertWorkspaceDocument(existing, wsId, 'Inventory Item');
  const updated = { ...existing, ...data, id: itemId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function adjustInventoryStock(itemId: number, userIdOrDelta: number, deltaQuantityOrCurrentStock?: number, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.INVENTORY_ITEMS).doc(String(itemId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const itemData = snap.data() as any;
  assertWorkspaceDocument(itemData, wsId, 'Inventory Item');

  let newStockStr = '0';
  if (typeof deltaQuantityOrCurrentStock === 'number') {
    newStockStr = String(Math.max(0, deltaQuantityOrCurrentStock));
  } else {
    const current = parseFloat(itemData.currentStock || '0') || 0;
    newStockStr = String(Math.max(0, current + userIdOrDelta));
  }

  await docRef.update({ currentStock: newStockStr });
  return { ...itemData, currentStock: newStockStr, id: itemId };
}

export async function deleteInventoryItem(itemId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.INVENTORY_ITEMS).doc(String(itemId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  assertWorkspaceDocument(data, wsId, 'Inventory Item');
  await docRef.delete();
  return data;
}

// Invoices (Sales & Purchases)
export async function getInvoices(userIdOrWsId?: any, voucherType?: string, optionalWorkspaceId?: string) {
  let wsId = '';
  let vType = voucherType;
  if (typeof userIdOrWsId === 'string') {
    wsId = userIdOrWsId;
  } else if (optionalWorkspaceId) {
    wsId = optionalWorkspaceId;
  } else {
    wsId = getActiveWorkspaceId();
  }

  if (!wsId) {
    return [];
  }

  let query = db.collection(COLLECTIONS.INVOICES).where('workspaceId', '==', wsId);
  if (vType) {
    query = query.where('voucherType', '==', vType);
  }
  let invoicesSnap = await query.get().catch((err) => {
    console.warn(`[getInvoices] Failed to query root invoices for ${wsId}:`, err);
    return { docs: [] };
  });

  let docs = [...invoicesSnap.docs];
  try {
    let subQuery = db.collection(`workspaces/${wsId}/invoices`);
    if (vType) {
      subQuery = subQuery.where('voucherType', '==', vType);
    }
    const subSnap = await subQuery.get();
    if (!subSnap.empty) {
      const existingIds = new Set(docs.map((d: any) => String(d.id)));
      for (const d of subSnap.docs) {
        if (!existingIds.has(String(d.id))) {
          docs.push(d);
          existingIds.add(String(d.id));
        }
      }
    }
  } catch (subErr) {
    // Non-fatal subcollection fallback
  }

  let list = docs.map((doc) => doc.data());
  return list.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function getInvoiceDetails(invoiceId: number, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.INVOICES).doc(String(invoiceId));
  const snap = await docRef.get();
  if (!snap.exists) {
    if (wsId) {
      const subRef = db.collection(`workspaces/${wsId}/invoices`).doc(String(invoiceId));
      const subSnap = await subRef.get();
      if (subSnap.exists) {
        return subSnap.data();
      }
    }
    return null;
  }
  const data = snap.data();
  assertWorkspaceDocument(data, wsId, 'Invoice');
  return data;
}

export async function createInvoiceWithItems(userId: number, invoiceData: any, itemsInput?: any[], optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || invoiceData.workspaceId);
  if (!wsId) {
    throw new Error('Active workspace ID is required to create invoice records.');
  }
  const invoiceId = await getNextSequenceId('invoice_id');
  const rawItems = itemsInput || invoiceData.items || [];
  const invoiceDoc = {
    id: invoiceId,
    userId,
    workspaceId: wsId,
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
  try {
    await db.collection(`workspaces/${wsId}/invoices`).doc(String(invoiceId)).set(invoiceDoc);
  } catch (subErr) {
    console.warn(`[createInvoiceWithItems] Subcollection mirror error:`, subErr);
  }

  // Update sequential number in company profile if automatic
  try {
    const isPurchase = invoiceDoc.voucherType === 'purchase';
    const profile = await getCompanyProfile(wsId);
    const counterKey = isPurchase ? 'nextPurchaseNumber' : 'nextInvoiceNumber';
    const currentCounter = (profile as any)?.[counterKey] || 1;
    await upsertCompanyProfile(userId, {
      [counterKey]: currentCounter + 1,
    }, wsId);
  } catch (err) {
    console.warn('Failed to bump invoice counter in company profile:', err);
  }

  // Deduct / add stock for inventory items
  for (const item of rawItems) {
    if (item.itemId) {
      const qty = parseFloat(item.quantity) || 0;
      const delta = invoiceDoc.voucherType === 'sales' ? -qty : qty;
      await adjustInventoryStock(Number(item.itemId), delta, undefined, wsId);
    }
  }

  return invoiceDoc;
}

export async function editInvoiceWithItems(invoiceId: number, userId: number, invoiceData: any, itemsInput?: any[], optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || invoiceData?.workspaceId);
  const docRef = db.collection(COLLECTIONS.INVOICES).doc(String(invoiceId));
  const snap = await docRef.get();
  let prevInvoice: any = null;
  if (snap.exists) {
    prevInvoice = snap.data() as any;
    assertWorkspaceDocument(prevInvoice, wsId, 'Invoice');
  } else if (wsId) {
    const subRef = db.collection(`workspaces/${wsId}/invoices`).doc(String(invoiceId));
    const subSnap = await subRef.get();
    if (subSnap.exists) {
      prevInvoice = subSnap.data() as any;
    }
  }

  if (!prevInvoice) return null;

  const targetWsId = prevInvoice.workspaceId || wsId;
  const rawItems = itemsInput || invoiceData.items || prevInvoice.items || [];

  const updatedInvoice = {
    ...prevInvoice,
    ...invoiceData,
    id: invoiceId,
    workspaceId: targetWsId,
    items: rawItems.map((it: any, idx: number) => ({
      ...it,
      id: idx + 1,
      invoiceId,
    })),
    updatedAt: new Date().toISOString(),
  };

  await docRef.set(updatedInvoice, { merge: true });
  if (targetWsId) {
    try {
      await db.collection(`workspaces/${targetWsId}/invoices`).doc(String(invoiceId)).set(updatedInvoice, { merge: true });
    } catch (subErr) {
      console.warn(`[editInvoiceWithItems] Subcollection mirror error:`, subErr);
    }
  }
  return updatedInvoice;
}

export async function deleteInvoice(invoiceId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.INVOICES).doc(String(invoiceId));
  const snap = await docRef.get();
  let inv: any = null;
  if (snap.exists) {
    inv = snap.data() as any;
    assertWorkspaceDocument(inv, wsId, 'Invoice');
    await docRef.delete();
  } else if (wsId) {
    const subRef = db.collection(`workspaces/${wsId}/invoices`).doc(String(invoiceId));
    const subSnap = await subRef.get();
    if (subSnap.exists) {
      inv = subSnap.data() as any;
      await subRef.delete();
    }
  }

  if (!inv) return null;

  const targetWsId = inv.workspaceId || wsId;
  if (targetWsId) {
    try {
      await db.collection(`workspaces/${targetWsId}/invoices`).doc(String(invoiceId)).delete();
    } catch (subErr) {
      console.warn(`[deleteInvoice] Subcollection delete error:`, subErr);
    }
  }

  // Reverse stock effect
  for (const item of inv?.items || []) {
    if (item.itemId) {
      const qty = parseFloat(item.quantity) || 0;
      const reverseDelta = inv.voucherType === 'sales' ? qty : -qty;
      await adjustInventoryStock(Number(item.itemId), reverseDelta, undefined, targetWsId);
    }
  }

  if (userName) {
    await logActivity(Number(userId) || 1, userName, 'DELETE', 'INVOICE', String(invoiceId), `Deleted voucher ${inv?.invoiceNumber || ''}`, targetWsId);
  }
  return inv;
}

// Expenses
export async function getExpenses(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
  if (!wsId) {
    return [];
  }
  let query = db.collection(COLLECTIONS.EXPENSES).where('workspaceId', '==', wsId);
  const snap = await query.get().catch((err) => {
    console.warn(`[getExpenses] Failed for workspace ${wsId}:`, err);
    return { docs: [] };
  });
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function createExpense(dataOrUserId: any, userIdOrData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
    data = dataOrUserId;
    userId = Number(userIdOrData) || 1;
  } else {
    userId = Number(dataOrUserId) || 1;
    data = userIdOrData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  if (!wsId) {
    throw new Error('Active workspace ID is required to create expense records.');
  }
  const expenseId = await getNextSequenceId('expense_id');
  const expense = {
    id: expenseId,
    userId,
    workspaceId: wsId,
    category: data.category || 'Other Expenses',
    amount: String(data.amount || '0.00'),
    date: data.date || data.expenseDate || new Date().toISOString().split('T')[0],
    paymentMode: data.paymentMode || 'cash',
    referenceNumber: data.referenceNumber || null,
    vendorName: data.vendorName || null,
    gstin: data.gstin || null,
    gstPaid: String(data.gstPaid || '0.00'),
    itcEligible: !!data.itcEligible,
    receiptUrl: data.receiptUrl || null,
    description: data.description || data.notes || null,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.EXPENSES).doc(String(expenseId)).set(expense);
  if (userName) {
    await logActivity(userId, userName, 'CREATE', 'EXPENSE', String(expenseId), `Recorded expense of ₹${expense.amount} for ${expense.category}`, wsId);
  }
  return expense;
}

export async function editExpense(expenseId: number, userId: number, data: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || data?.workspaceId);
  const docRef = db.collection(COLLECTIONS.EXPENSES).doc(String(expenseId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const existing = snap.data();
  assertWorkspaceDocument(existing, wsId, 'Expense');
  const updated = { ...existing, ...data, id: expenseId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteExpense(expenseId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.EXPENSES).doc(String(expenseId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  assertWorkspaceDocument(data, wsId, 'Expense');
  await docRef.delete();
  return data;
}

// Payment Vouchers (Receipts & Payments)
export async function getPayments(userIdOrWsId?: any, voucherType?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
  if (!wsId) {
    return [];
  }

  let query = db.collection(COLLECTIONS.PAYMENTS).where('workspaceId', '==', wsId);
  if (voucherType) {
    query = query.where('voucherType', '==', voucherType);
  }
  const snap = await query.get().catch((err) => {
    console.warn(`[getPayments] Failed to query root payments for workspace ${wsId}:`, err);
    return { docs: [] };
  });

  let docs = [...snap.docs];
  try {
    let subQuery = db.collection(`workspaces/${wsId}/payments`);
    if (voucherType) {
      subQuery = subQuery.where('voucherType', '==', voucherType);
    }
    const subSnap = await subQuery.get();
    if (!subSnap.empty) {
      const existingIds = new Set(docs.map((d: any) => String(d.id)));
      for (const d of subSnap.docs) {
        if (!existingIds.has(String(d.id))) {
          docs.push(d);
          existingIds.add(String(d.id));
        }
      }
    }
  } catch (subErr) {
    // Non-fatal subcollection fallback
  }

  let list = docs.map((doc) => doc.data());
  return list.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function getNextPaymentVoucherNumber(userId: number, voucherType: 'receipt' | 'payment', optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const company = await getCompanyProfile(wsId);
  const prefix = voucherType === 'receipt' ? (company?.receiptPrefix || 'REC/2026-27/') : (company?.paymentPrefix || 'PAY/2026-27/');
  const counterKey = voucherType === 'receipt' ? 'nextReceiptNumber' : 'nextPaymentNumber';
  let counter = (company as any)?.[counterKey] || 1;

  let query = db.collection(COLLECTIONS.PAYMENTS).where('voucherType', '==', voucherType);
  if (wsId) {
    query = query.where('workspaceId', '==', wsId);
  }
  const snap = await query.get();
  const existingNumbers = new Set(snap.docs.map((d) => (d.data().voucherNumber || '').trim().toLowerCase()));

  let candidate = formatInvoiceNumber(prefix, counter, 3, '');
  while (existingNumbers.has(candidate.toLowerCase())) {
    counter++;
    candidate = formatInvoiceNumber(prefix, counter, 3, '');
  }

  return { prefix, counter, formattedNumber: candidate };
}

export async function createPaymentVoucher(userId: number, data: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  if (!wsId) {
    throw new Error('Active workspace ID is required to create payment vouchers.');
  }
  const paymentId = await getNextSequenceId('payment_id');
  const payment = {
    id: paymentId,
    userId,
    workspaceId: wsId,
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
  try {
    await db.collection(`workspaces/${wsId}/payments`).doc(String(paymentId)).set(payment);
  } catch (subErr) {
    console.warn(`[createPaymentVoucher] Subcollection mirror error:`, subErr);
  }

  // Bump next receipt/payment counter in company profile
  try {
    const counterKey = payment.voucherType === 'receipt' ? 'nextReceiptNumber' : 'nextPaymentNumber';
    const profile = await getCompanyProfile(wsId);
    await upsertCompanyProfile(userId, {
      [counterKey]: ((profile as any)?.[counterKey] || 1) + 1,
    }, wsId);
  } catch (e) {
    console.warn('Failed to bump payment counter:', e);
  }

  return payment;
}

export async function deletePaymentVoucher(paymentId: number, userId?: number, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.PAYMENTS).doc(String(paymentId));
  const snap = await docRef.get();
  let data: any = null;
  if (snap.exists) {
    data = snap.data();
    assertWorkspaceDocument(data, wsId, 'Payment Voucher');
    await docRef.delete();
  } else if (wsId) {
    const subRef = db.collection(`workspaces/${wsId}/payments`).doc(String(paymentId));
    const subSnap = await subRef.get();
    if (subSnap.exists) {
      data = subSnap.data();
      await subRef.delete();
    }
  }

  if (!data) return null;

  const targetWsId = data.workspaceId || wsId;
  if (targetWsId) {
    try {
      await db.collection(`workspaces/${targetWsId}/payments`).doc(String(paymentId)).delete();
    } catch (subErr) {
      console.warn(`[deletePaymentVoucher] Subcollection delete error:`, subErr);
    }
  }
  return data;
}

// Journal Entries & Contras
export async function getJournalEntries(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
  if (!wsId) {
    return [];
  }
  let query = db.collection(COLLECTIONS.JOURNAL_ENTRIES).where('workspaceId', '==', wsId);
  const snap = await query.get().catch((err) => {
    console.warn(`[getJournalEntries] Failed for workspace ${wsId}:`, err);
    return { docs: [] };
  });
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function getNextJournalVoucherNumber(userId: number, entryType: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const company = await getCompanyProfile(wsId);
  const isContra = entryType === 'contra';
  const prefix = isContra ? (company?.contraPrefix || 'CONTRA/2026-27/') : (company?.journalPrefix || 'JV/2026-27/');
  const counterKey = isContra ? 'nextContraNumber' : 'nextJournalNumber';
  let counter = (company as any)?.[counterKey] || 1;

  let query = db.collection(COLLECTIONS.JOURNAL_ENTRIES);
  if (wsId) {
    query = query.where('workspaceId', '==', wsId);
  }
  const snap = await query.get();
  const existingNumbers = new Set(snap.docs.map((d) => (d.data().voucherNumber || '').trim().toLowerCase()));

  let candidate = formatInvoiceNumber(prefix, counter, 3, '');
  while (existingNumbers.has(candidate.toLowerCase())) {
    counter++;
    candidate = formatInvoiceNumber(prefix, counter, 3, '');
  }

  return { prefix, counter, formattedNumber: candidate };
}

export async function createJournalEntry(dataOrUserId: any, userIdOrData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
    data = dataOrUserId;
    userId = Number(userIdOrData) || 1;
  } else {
    userId = Number(dataOrUserId) || 1;
    data = userIdOrData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  if (!wsId) {
    throw new Error('Active workspace ID is required to create journal entries.');
  }
  const entryId = await getNextSequenceId('journal_entry_id');
  const entry = {
    id: entryId,
    userId,
    workspaceId: wsId,
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
  if (userName) {
    await logActivity(userId, userName, 'CREATE', 'JOURNAL', String(entryId), `Created journal voucher ${entry.voucherNumber}`, wsId);
  }
  return entry;
}

export async function editJournalEntry(entryId: number, userId: number, data: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || data?.workspaceId);
  const docRef = db.collection(COLLECTIONS.JOURNAL_ENTRIES).doc(String(entryId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const existing = snap.data();
  assertWorkspaceDocument(existing, wsId, 'Journal Entry');
  const updated = { ...existing, ...data, id: entryId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteJournalEntry(entryId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.JOURNAL_ENTRIES).doc(String(entryId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  assertWorkspaceDocument(data, wsId, 'Journal Entry');
  await docRef.delete();
  return data;
}

// Cheque Books
export async function getChequeBooks(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
  let query = db.collection(COLLECTIONS.CHEQUE_BOOKS);
  let snap;
  if (wsId) {
    snap = await query.where('workspaceId', '==', wsId).get();
  } else {
    snap = await query.get();
  }
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function createChequeBook(dataOrUserId: any, userIdOrData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
    data = dataOrUserId;
    userId = Number(userIdOrData) || 1;
  } else {
    userId = Number(dataOrUserId) || 1;
    data = userIdOrData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  const bookId = await getNextSequenceId('cheque_book_id');
  const startNum = Number(data.startNumber);
  const endNum = Number(data.endNumber);
  const total = Math.max(1, endNum - startNum + 1);

  const book = {
    id: bookId,
    userId,
    workspaceId: wsId || null,
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

export async function editChequeBook(bookId: number, userId: number, data: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || data?.workspaceId);
  const docRef = db.collection(COLLECTIONS.CHEQUE_BOOKS).doc(String(bookId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const existing = snap.data();
  assertWorkspaceDocument(existing, wsId, 'Cheque Book');
  const updated = { ...existing, ...data, id: bookId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteChequeBook(bookId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.CHEQUE_BOOKS).doc(String(bookId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  assertWorkspaceDocument(data, wsId, 'Cheque Book');
  await docRef.delete();
  return data;
}

// Cheques
export async function getCheques(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
  let query = db.collection(COLLECTIONS.CHEQUES);
  let snap;
  if (wsId) {
    snap = await query.where('workspaceId', '==', wsId).get();
  } else {
    snap = await query.get();
  }
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function createCheque(dataOrUserId: any, userIdOrData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
    data = dataOrUserId;
    userId = Number(userIdOrData) || 1;
  } else {
    userId = Number(dataOrUserId) || 1;
    data = userIdOrData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  const chequeId = await getNextSequenceId('cheque_id');
  const cheque = {
    id: chequeId,
    userId,
    workspaceId: wsId || null,
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

export async function editCheque(chequeId: number, userId: number, data: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId || data?.workspaceId);
  const docRef = db.collection(COLLECTIONS.CHEQUES).doc(String(chequeId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const existing = snap.data();
  assertWorkspaceDocument(existing, wsId, 'Cheque');
  const updated = { ...existing, ...data, id: chequeId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function updateChequeStatus(chequeId: number, statusDataOrUserId: any, userIdOrStatusData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let statusData: any = {};
  if (typeof statusDataOrUserId === 'object' && statusDataOrUserId !== null) {
    statusData = statusDataOrUserId;
    userId = Number(userIdOrStatusData) || 1;
  } else {
    userId = Number(statusDataOrUserId) || 1;
    statusData = userIdOrStatusData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.CHEQUES).doc(String(chequeId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const existing = snap.data();
  assertWorkspaceDocument(existing, wsId, 'Cheque');
  const updated = { ...existing, ...statusData, id: chequeId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteCheque(chequeId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.CHEQUES).doc(String(chequeId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  assertWorkspaceDocument(data, wsId, 'Cheque');
  await docRef.delete();
  return data;
}

// Bank Statements & Automated Reconciliation
export async function getBankStatements(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);
  let query = db.collection(COLLECTIONS.BANK_STATEMENTS);
  let snap;
  if (wsId) {
    snap = await query.where('workspaceId', '==', wsId).get();
  } else {
    snap = await query.get();
  }
  return snap.docs.map((doc) => doc.data()).sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
}

export async function getBankStatementById(statementId: number, userId?: number, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  assertWorkspaceDocument(data, wsId, 'Bank Statement');
  return data;
}

export async function createBankStatement(dataOrUserId: any, userIdOrData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
    data = dataOrUserId;
    userId = Number(userIdOrData) || 1;
  } else {
    userId = Number(dataOrUserId) || 1;
    data = userIdOrData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || data.workspaceId);
  const statementId = await getNextSequenceId('bank_statement_id');
  const transactions = (data.transactions || []).map((t: any, idx: number) => ({
    ...t,
    id: t.id || `tx-${Date.now()}-${idx + 1}`,
    reconciled: !!t.reconciled,
  }));

  const statement = {
    id: statementId,
    userId,
    workspaceId: wsId || null,
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

export async function updateBankStatement(statementId: number, dataOrUserId: any, userIdOrData?: any, userName?: string, optionalWorkspaceId?: string) {
  let userId = 1;
  let data: any = {};
  if (typeof dataOrUserId === 'object' && dataOrUserId !== null) {
    data = dataOrUserId;
    userId = Number(userIdOrData) || 1;
  } else {
    userId = Number(dataOrUserId) || 1;
    data = userIdOrData || {};
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || data?.workspaceId);
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const existing = snap.data();
  assertWorkspaceDocument(existing, wsId, 'Bank Statement');
  const updated = { ...existing, ...data, id: statementId };
  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteBankStatement(statementId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;
  const data = snap.data();
  assertWorkspaceDocument(data, wsId, 'Bank Statement');
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
  },
  optionalWorkspaceId?: string
) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const stmt = snap.data() as any;
  assertWorkspaceDocument(stmt, wsId, 'Bank Statement');
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

export async function unreconcileBankStatementTransaction(statementId: number, transactionId: string, userId?: number, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.BANK_STATEMENTS).doc(String(statementId));
  const snap = await docRef.get();
  if (!snap.exists) return null;

  const stmt = snap.data() as any;
  assertWorkspaceDocument(stmt, wsId, 'Bank Statement');
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
export async function getFinancialSummary(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);

  const [invoicesList, expensesList, inventoryList, chequesList, partiesWithBalance] = await Promise.all([
    getInvoices(wsId),
    getExpenses(wsId),
    getInventory(wsId),
    getCheques(wsId),
    getParties(wsId),
  ]);

  let totalSales = 0;
  let totalPurchases = 0;
  let totalTaxCollected = 0;

  for (const inv of invoicesList as any[]) {
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
  for (const exp of expensesList as any[]) {
    totalExpenses += parseFloat(exp.amount) || 0;
    totalTaxPaidOnExpenses += parseFloat(exp.gstPaid) || 0;
  }

  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const netGstPayable = Math.max(0, totalTaxCollected - totalTaxPaidOnExpenses);

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
  for (const item of inventoryList as any[]) {
    const qty = parseFloat(item.currentStock) || 0;
    const price = parseFloat(item.purchasePrice) || parseFloat(item.sellingPrice) || 0;
    totalStockValuation += qty * price;
  }

  const inHandCheques = (chequesList as any[]).filter((c: any) => c.status === 'in_hand');
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
export async function getFullDataBackup(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);

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
    getCompanyProfile(wsId),
    getParties(wsId),
    getInventory(wsId),
    getInvoices(wsId),
    getExpenses(wsId),
    getPayments(wsId),
    getJournalEntries(wsId),
    getChequeBooks(wsId),
    getCheques(wsId),
    getBankStatements(wsId),
    getActivityLogs(wsId, 500),
  ]);

  return {
    version: '2.0.0-firestore',
    databaseEngine: 'Google Cloud Firestore',
    workspaceId: wsId || null,
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

export async function restoreDataFromBackup(backupDataOrUserId: any, userIdOrBackupData: any, optionalWorkspaceId?: string) {
  let backupData: any;
  let userId: number;

  if (typeof backupDataOrUserId === 'object' && backupDataOrUserId !== null) {
    backupData = backupDataOrUserId;
    userId = Number(userIdOrBackupData) || 1;
  } else {
    userId = Number(backupDataOrUserId) || 1;
    backupData = userIdOrBackupData;
  }

  if (!backupData || typeof backupData !== 'object') {
    throw new Error('Invalid backup JSON payload');
  }

  const wsId = resolveWorkspaceId(optionalWorkspaceId || backupData.workspaceId);

  // Restore company profile
  if (backupData.companyProfile) {
    await upsertCompanyProfile(userId, backupData.companyProfile, wsId);
  }

  // Helper to batch insert docs
  const restoreCollection = async (collectionName: string, items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const batch = db.batch();
    for (const item of items) {
      const docRef = db.collection(collectionName).doc(String(item.id || Date.now()));
      batch.set(docRef, { ...item, userId, workspaceId: wsId || null }, { merge: true });
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

export async function clearMasterLedger(userId: number, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const collectionsToClear = [
    COLLECTIONS.INVOICES,
    COLLECTIONS.EXPENSES,
    COLLECTIONS.PAYMENTS,
    COLLECTIONS.JOURNAL_ENTRIES,
    COLLECTIONS.CHEQUES,
    COLLECTIONS.BANK_STATEMENTS,
  ];

  for (const col of collectionsToClear) {
    let query = db.collection(col);
    if (wsId) {
      query = query.where('workspaceId', '==', wsId);
    }
    const snap = await query.get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Reset inventory item current stock back to opening stock
  let invQuery = db.collection(COLLECTIONS.INVENTORY_ITEMS);
  if (wsId) {
    invQuery = invQuery.where('workspaceId', '==', wsId);
  }
  const invSnap = await invQuery.get();
  const invBatch = db.batch();
  invSnap.docs.forEach((d) => {
    const data = d.data();
    invBatch.update(d.ref, { currentStock: data.openingStock || '0' });
  });
  await invBatch.commit();

  return { success: true };
}

// ==========================================
// SPA Client Convenience Wrappers & Aggregators
// ==========================================

export async function getAppData(userIdOrWsId?: any, optionalWorkspaceId?: string) {
  const wsId = resolveWorkspaceId(typeof userIdOrWsId === 'string' ? userIdOrWsId : optionalWorkspaceId);

  const [
    company,
    parties,
    inventory,
    invoices,
    expenses,
    payments,
    journalEntries,
    cheques,
    chequeBooks,
    bankStatements,
    summary,
    activityLogs,
  ] = await Promise.all([
    getCompanyProfile(wsId),
    getParties(wsId),
    getInventory(wsId),
    getInvoices(wsId),
    getExpenses(wsId),
    getPayments(wsId),
    getJournalEntries(wsId),
    getCheques(wsId),
    getChequeBooks(wsId),
    getBankStatements(wsId),
    getFinancialSummary(wsId),
    getActivityLogs(wsId, 50),
  ]);

  return {
    company,
    parties,
    inventory,
    invoices,
    expenses,
    payments,
    journalEntries,
    cheques,
    chequeBooks,
    bankStatements,
    summary,
    activityLogs,
    activity: activityLogs,
  };
}

export async function createInvoice(payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  const wsId = resolveWorkspaceId(optionalWorkspaceId || payload?.workspaceId);
  const res = await createInvoiceWithItems(uid, payload, payload?.items || [], wsId);
  if (userName) {
    await logActivity(uid, userName, 'CREATE', 'INVOICE', String(res?.id || ''), `Created invoice ${payload?.invoiceNumber || ''}`, wsId);
  }
  return res;
}

export async function updateInvoice(invoiceId: number, payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  const wsId = resolveWorkspaceId(optionalWorkspaceId || payload?.workspaceId);
  const res = await editInvoiceWithItems(invoiceId, uid, payload, payload?.items || [], wsId);
  if (userName) {
    await logActivity(uid, userName, 'UPDATE', 'INVOICE', String(invoiceId), `Updated invoice ${payload?.invoiceNumber || ''}`, wsId);
  }
  return res;
}

export async function updateExpense(expenseId: number, payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return editExpense(expenseId, uid, payload, optionalWorkspaceId);
}

export async function createPayment(payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return createPaymentVoucher(uid, payload, optionalWorkspaceId);
}

export async function deletePayment(paymentId: number, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return deletePaymentVoucher(paymentId, uid, optionalWorkspaceId);
}

export async function updateJournalEntry(entryId: number, payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return editJournalEntry(entryId, uid, payload, optionalWorkspaceId);
}

export async function updateParty(partyId: number, payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return editParty(partyId, uid, payload, optionalWorkspaceId);
}

export async function updateInventoryItem(itemId: number, payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return editInventoryItem(itemId, uid, payload, optionalWorkspaceId);
}

export async function adjustStock(itemId: number, newStock: number, reason: string, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  const wsId = resolveWorkspaceId(optionalWorkspaceId);
  const docRef = db.collection(COLLECTIONS.INVENTORY_ITEMS).doc(String(itemId));
  const snap = await docRef.get();
  if (snap.exists) {
    const data = snap.data();
    assertWorkspaceDocument(data, wsId, 'Inventory Item');
    await docRef.update({
      currentStock: String(newStock),
      updatedAt: new Date().toISOString(),
    });
    await logActivity(uid, userName || 'User', 'ADJUST_STOCK', 'INVENTORY', String(itemId), `Stock adjusted to ${newStock}. Reason: ${reason}`, wsId);
  }
}

export async function saveCompanyProfile(payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return upsertCompanyProfile(uid, payload, optionalWorkspaceId);
}

export async function clearAllMasterLedgers(userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return clearMasterLedger(uid, optionalWorkspaceId);
}

export async function updateCheque(chequeId: number, payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return editCheque(chequeId, uid, payload, optionalWorkspaceId);
}

export async function updateChequeBook(bookId: number, payload: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return editChequeBook(bookId, uid, payload, optionalWorkspaceId);
}

export async function reconcileBankTransaction(statementId: number, transactionId: string, matchData: any, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return reconcileBankStatementTransaction(statementId, transactionId, uid, matchData, optionalWorkspaceId);
}

export async function unreconcileBankTransaction(statementId: number, transactionId: string, userId?: number, userName?: string, optionalWorkspaceId?: string) {
  const uid = Number(userId) || 1;
  return unreconcileBankStatementTransaction(statementId, transactionId, uid, optionalWorkspaceId);
}
