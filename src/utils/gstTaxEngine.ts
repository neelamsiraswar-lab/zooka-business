import { Invoice, Expense, Party, CompanyProfile, InvoiceItem } from '../types';
import { INDIAN_STATES, IndianState } from '../data/indianStates';

// Helper to normalize any state input (code or name) to a 2-digit state code
export function normalizeStateCode(input?: string): string {
  if (!input) return '27'; // Default Maharashtra
  const trimmed = input.trim();
  
  // If it's already a 2-digit number (or starts with 2 digits like "27 - Maharashtra" or "27")
  const leadingDigits = trimmed.match(/^(\d{2})/);
  if (leadingDigits) {
    const code = leadingDigits[1];
    const exists = INDIAN_STATES.some((s) => s.code === code);
    if (exists) return code;
  }

  // Try matching by state name (case-insensitive)
  const lower = trimmed.toLowerCase();
  const found = INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === lower || lower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lower)
  );
  if (found) return found.code;

  return '27';
}

export function getStateName(codeOrName?: string): string {
  const code = normalizeStateCode(codeOrName);
  const found = INDIAN_STATES.find((s) => s.code === code);
  return found ? found.name : 'Maharashtra';
}

export function getCompanyGstProfile(company?: CompanyProfile | null): {
  stateCode: string;
  stateName: string;
  gstin: string;
  legalName: string;
  tradeName: string;
} {
  let stateCode = company?.stateCode;
  if (!stateCode && company?.gstin && company.gstin.length >= 2) {
    stateCode = company.gstin.slice(0, 2);
  }
  stateCode = normalizeStateCode(stateCode || '27');
  const stateName = company?.stateName || getStateName(stateCode);
  const gstin = company?.gstin || `${stateCode}AAACB1234F1Z5`;
  const legalName = company?.businessName || 'Business Enterprise';
  const tradeName = company?.tradeName || legalName;

  return { stateCode, stateName, gstin, legalName, tradeName };
}

// Check whether supply is interstate based on company state vs POS
export function isInterstateSupply(
  pos: string | undefined,
  companyStateCode: string,
  explicitIsInterstate?: boolean,
  saleType?: string
): boolean {
  if (saleType === 'export_with_tax' || saleType === 'export_without_tax' || saleType === 'sez') {
    return true;
  }
  if (explicitIsInterstate !== undefined) {
    return explicitIsInterstate;
  }
  const posCode = normalizeStateCode(pos);
  const cmpCode = normalizeStateCode(companyStateCode);
  return posCode !== cmpCode;
}

export interface Gstr1InvoiceSummary {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  partyName: string;
  partyGstin?: string;
  isRegisteredParty: boolean;
  placeOfSupply: string;
  placeOfSupplyName: string;
  isInterstate: boolean;
  saleType: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  grandTotal: number;
  tableCategory: '4_B2B' | '5_B2CL' | '7_B2CS' | '6_EXP' | '8_NIL';
  items?: InvoiceItem[];
}

export interface Gstr1HsnSummary {
  hsnCode: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalTaxable: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface Gstr1PosSummary {
  stateCode: string;
  stateName: string;
  isInterstate: boolean;
  invoiceCount: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface Gstr1ReportData {
  companyStateCode: string;
  companyStateName: string;
  companyGstin: string;
  periodLabel: string;
  totalInvoicesCount: number;
  totalTaxableValue: number;
  totalIgst: number;
  totalCgst: number;
  totalSgst: number;
  totalTax: number;
  totalInvoiceValue: number;
  b2bInvoices: Gstr1InvoiceSummary[];
  b2clInvoices: Gstr1InvoiceSummary[];
  b2csInvoices: Gstr1InvoiceSummary[];
  exportInvoices: Gstr1InvoiceSummary[];
  nilExemptInvoices: Gstr1InvoiceSummary[];
  allSalesInvoices: Gstr1InvoiceSummary[];
  hsnSummary: Gstr1HsnSummary[];
  posSummary: Gstr1PosSummary[];
}

// Compute GSTR-1 aggregated dataset
export function generateGstr1Report(
  invoices: Invoice[],
  company?: CompanyProfile | null,
  periodFilter?: { startDate?: string; endDate?: string; label?: string }
): Gstr1ReportData {
  const { stateCode: companyStateCode, stateName: companyStateName, gstin: companyGstin } =
    getCompanyGstProfile(company);

  // Filter sales invoices within date range
  let salesInvoices = invoices.filter((i) => i.voucherType === 'sales' && i.status !== 'cancelled');

  if (periodFilter?.startDate && periodFilter?.endDate) {
    salesInvoices = salesInvoices.filter((i) => {
      const d = i.invoiceDate;
      return d >= periodFilter.startDate! && d <= periodFilter.endDate!;
    });
  }

  const processedList: Gstr1InvoiceSummary[] = [];
  const posMap: Record<string, Gstr1PosSummary> = {};
  const hsnMap: Record<string, Gstr1HsnSummary> = {};

  let totalTaxableValue = 0;
  let totalIgst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalTax = 0;
  let totalInvoiceValue = 0;

  salesInvoices.forEach((inv) => {
    const rawTaxable = parseFloat(inv.subtotal) || 0;
    const rawGrand = parseFloat(inv.grandTotal) || rawTaxable;
    const rawIgst = parseFloat(inv.igstTotal) || 0;
    const rawCgst = parseFloat(inv.cgstTotal) || 0;
    const rawSgst = parseFloat(inv.sgstTotal) || 0;
    const rawTotalTax = parseFloat(inv.taxTotal) || (rawIgst + rawCgst + rawSgst);

    const posCode = normalizeStateCode(inv.placeOfSupply || companyStateCode);
    const posName = getStateName(posCode);
    const isInter = isInterstateSupply(posCode, companyStateCode, inv.isInterstate, inv.saleType);

    // Compute taxes accurately separated by IGST vs CGST/SGST based on POS and company state
    let calculatedIgst = 0;
    let calculatedCgst = 0;
    let calculatedSgst = 0;

    if (rawTotalTax > 0) {
      if (isInter) {
        // Inter-State: Entire GST is IGST
        calculatedIgst = rawIgst > 0 ? rawIgst : rawTotalTax;
        calculatedCgst = 0;
        calculatedSgst = 0;
      } else {
        // Intra-State: Split into CGST and SGST
        calculatedIgst = 0;
        if (rawCgst > 0 && rawSgst > 0) {
          calculatedCgst = rawCgst;
          calculatedSgst = rawSgst;
        } else {
          calculatedCgst = rawTotalTax / 2;
          calculatedSgst = rawTotalTax / 2;
        }
      }
    }

    const calculatedTotalTax = calculatedIgst + calculatedCgst + calculatedSgst;

    // Check party GSTIN registration
    const partyGstin = (inv.partyGstin || '').trim().toUpperCase();
    const isRegisteredParty = Boolean(partyGstin && partyGstin.length >= 15 && partyGstin !== 'URP');

    // Categorize into GSTR-1 tables
    let tableCategory: Gstr1InvoiceSummary['tableCategory'] = '7_B2CS';

    if (inv.saleType === 'export_with_tax' || inv.saleType === 'export_without_tax' || inv.saleType === 'sez') {
      tableCategory = '6_EXP';
    } else if (inv.saleType === 'bill_of_supply' || calculatedTotalTax === 0) {
      tableCategory = '8_NIL';
    } else if (isRegisteredParty) {
      tableCategory = '4_B2B';
    } else {
      // Unregistered buyer (B2C)
      // If Interstate and invoice value > 2,50,000 (or 1,00,000 per recent notification) -> B2CL
      if (isInter && rawGrand > 250000) {
        tableCategory = '5_B2CL';
      } else {
        tableCategory = '7_B2CS';
      }
    }

    const itemSummary: Gstr1InvoiceSummary = {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      partyName: inv.partyName,
      partyGstin: isRegisteredParty ? partyGstin : undefined,
      isRegisteredParty,
      placeOfSupply: posCode,
      placeOfSupplyName: posName,
      isInterstate: isInter,
      saleType: inv.saleType || 'regular',
      taxableValue: rawTaxable,
      igst: calculatedIgst,
      cgst: calculatedCgst,
      sgst: calculatedSgst,
      totalTax: calculatedTotalTax,
      grandTotal: rawGrand,
      tableCategory,
      items: inv.items,
    };

    processedList.push(itemSummary);

    // Sum overall
    totalTaxableValue += rawTaxable;
    totalIgst += calculatedIgst;
    totalCgst += calculatedCgst;
    totalSgst += calculatedSgst;
    totalTax += calculatedTotalTax;
    totalInvoiceValue += rawGrand;

    // POS Summary Accumulation
    if (!posMap[posCode]) {
      posMap[posCode] = {
        stateCode: posCode,
        stateName: posName,
        isInterstate: isInter,
        invoiceCount: 0,
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        totalTax: 0,
      };
    }
    posMap[posCode].invoiceCount += 1;
    posMap[posCode].taxableValue += rawTaxable;
    posMap[posCode].igst += calculatedIgst;
    posMap[posCode].cgst += calculatedCgst;
    posMap[posCode].sgst += calculatedSgst;
    posMap[posCode].totalTax += calculatedTotalTax;

    // HSN Summary Accumulation
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach((it) => {
        const hsn = (it.hsnCode || '9999').trim();
        const lineTaxable = parseFloat(it.taxableValue) || 0;
        const lineTax = (parseFloat(it.cgstAmount) || 0) + (parseFloat(it.sgstAmount) || 0) + (parseFloat(it.igstAmount) || 0);
        let itIgst = 0;
        let itCgst = 0;
        let itSgst = 0;

        if (isInter) {
          itIgst = lineTax;
        } else {
          itCgst = lineTax / 2;
          itSgst = lineTax / 2;
        }

        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsnCode: hsn,
            description: it.itemName || 'Goods / Services',
            uqc: it.unit || 'NOS',
            totalQuantity: 0,
            totalTaxable: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            totalTax: 0,
          };
        }
        hsnMap[hsn].totalQuantity += parseFloat(it.quantity) || 1;
        hsnMap[hsn].totalTaxable += lineTaxable;
        hsnMap[hsn].igst += itIgst;
        hsnMap[hsn].cgst += itCgst;
        hsnMap[hsn].sgst += itSgst;
        hsnMap[hsn].totalTax += lineTax;
      });
    }
  });

  const b2bInvoices = processedList.filter((i) => i.tableCategory === '4_B2B');
  const b2clInvoices = processedList.filter((i) => i.tableCategory === '5_B2CL');
  const b2csInvoices = processedList.filter((i) => i.tableCategory === '7_B2CS');
  const exportInvoices = processedList.filter((i) => i.tableCategory === '6_EXP');
  const nilExemptInvoices = processedList.filter((i) => i.tableCategory === '8_NIL');

  return {
    companyStateCode,
    companyStateName,
    companyGstin,
    periodLabel: periodFilter?.label || 'All Time',
    totalInvoicesCount: salesInvoices.length,
    totalTaxableValue,
    totalIgst,
    totalCgst,
    totalSgst,
    totalTax,
    totalInvoiceValue,
    b2bInvoices,
    b2clInvoices,
    b2csInvoices,
    exportInvoices,
    nilExemptInvoices,
    allSalesInvoices: processedList,
    hsnSummary: Object.values(hsnMap),
    posSummary: Object.values(posMap).sort((a, b) => b.taxableValue - a.taxableValue),
  };
}

// Inward Supplies & ITC aggregation for GSTR-3B
export interface Gstr3bInwardSummary {
  id: string;
  sourceType: 'purchase' | 'expense';
  supplierName: string;
  supplierGstin?: string;
  isRegisteredSupplier: boolean;
  invoiceNumber: string;
  date: string;
  placeOfSupply: string;
  isInterstate: boolean;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  itcEligible: boolean;
}

export interface Gstr3bReportData {
  companyStateCode: string;
  companyStateName: string;
  companyGstin: string;
  periodLabel: string;
  
  // Table 3.1: Outward Supplies & Reverse Charge
  table31: {
    // 3.1(a) Outward Taxable supplies (other than zero rated, nil rated, exempted)
    taxable: { taxableValue: number; igst: number; cgst: number; sgst: number; cess: number };
    // 3.1(b) Outward Taxable supplies (zero rated - exports/SEZ)
    zeroRated: { taxableValue: number; igst: number; cess: number };
    // 3.1(c) Other outward supplies (nil rated, exempted)
    nilExempt: { taxableValue: number };
    // 3.1(d) Inward supplies liable to reverse charge (RCM)
    rcm: { taxableValue: number; igst: number; cgst: number; sgst: number; cess: number };
    // 3.1(e) Non-GST outward supplies
    nonGst: { taxableValue: number };
    // Total Output Tax Liability
    totalLiability: { igst: number; cgst: number; sgst: number; total: number };
  };

  // Table 3.2: Inter-state supplies to unregistered, composition, UIN holders
  table32: Array<{
    posCode: string;
    posName: string;
    taxableValue: number;
    igst: number;
  }>;

  // Table 4: Eligible Input Tax Credit (ITC)
  table4: {
    // 4(A)(1) Import of Goods
    importGoods: { igst: number; cess: number };
    // 4(A)(2) Import of Services
    importServices: { igst: number; cess: number };
    // 4(A)(3) Inward supplies liable to reverse charge
    rcmItc: { igst: number; cgst: number; sgst: number; cess: number };
    // 4(A)(5) All other ITC (Purchases & eligible expenses)
    allOtherItc: { igst: number; cgst: number; sgst: number; total: number };
    // Total Available ITC (A)
    totalAvailableItc: { igst: number; cgst: number; sgst: number; total: number };
    // 4(B) ITC Reversed / Ineligible (Sec 17(5))
    ineligibleItc: { igst: number; cgst: number; sgst: number; total: number };
    // 4(C) Net ITC Available = (A) - (B)
    netItcAvailable: { igst: number; cgst: number; sgst: number; total: number };
  };

  // Table 5: Inward supplies exempt/nil
  table5: {
    interstate: number;
    intrastate: number;
  };

  // Table 6.1: Payment of Tax & Liability Set-off (Electronic Cash Ledger payment)
  table61: {
    liability: { igst: number; cgst: number; sgst: number; total: number };
    paidByItc: {
      igstPaidByIgstItc: number;
      igstPaidByCgstItc: number;
      igstPaidBySgstItc: number;
      cgstPaidByCgstItc: number;
      cgstPaidByIgstItc: number;
      sgstPaidBySgstItc: number;
      sgstPaidByIgstItc: number;
      totalPaidByItc: number;
    };
    cashPayable: {
      igst: number;
      cgst: number;
      sgst: number;
      total: number;
    };
    closingItcBalance: {
      igst: number;
      cgst: number;
      sgst: number;
      total: number;
    };
  };

  // Raw details
  inwardSupplies: Gstr3bInwardSummary[];
}

// Generate GSTR-3B report with complete Rule 88A / Section 49 set-off engine
export function generateGstr3bReport(
  invoices: Invoice[],
  expenses: Expense[],
  parties: Party[] = [],
  company?: CompanyProfile | null,
  periodFilter?: { startDate?: string; endDate?: string; label?: string }
): Gstr3bReportData {
  const { stateCode: companyStateCode, stateName: companyStateName, gstin: companyGstin } =
    getCompanyGstProfile(company);

  // 1. Process Outward Supplies (GSTR-1 data for period)
  const gstr1 = generateGstr1Report(invoices, company, periodFilter);

  // Table 3.1(a) Outward Taxable (B2B + B2CL + B2CS)
  let normalTaxable = 0;
  let normalIgst = 0;
  let normalCgst = 0;
  let normalSgst = 0;

  [...gstr1.b2bInvoices, ...gstr1.b2clInvoices, ...gstr1.b2csInvoices].forEach((inv) => {
    normalTaxable += inv.taxableValue;
    normalIgst += inv.igst;
    normalCgst += inv.cgst;
    normalSgst += inv.sgst;
  });

  // 3.1(b) Zero Rated (Exports / SEZ)
  let exportTaxable = 0;
  let exportIgst = 0;
  gstr1.exportInvoices.forEach((inv) => {
    exportTaxable += inv.taxableValue;
    exportIgst += inv.igst;
  });

  // 3.1(c) Nil / Exempt
  let nilTaxable = 0;
  gstr1.nilExemptInvoices.forEach((inv) => {
    nilTaxable += inv.taxableValue;
  });

  // Total Output Liability
  const liabilityIgst = normalIgst + exportIgst;
  const liabilityCgst = normalCgst;
  const liabilitySgst = normalSgst;
  const totalLiabilityAmount = liabilityIgst + liabilityCgst + liabilitySgst;

  // Table 3.2: Inter-State supplies to unregistered consumers (B2CL + Interstate B2CS)
  const table32Map: Record<string, { posCode: string; posName: string; taxableValue: number; igst: number }> = {};
  [...gstr1.b2clInvoices, ...gstr1.b2csInvoices].forEach((inv) => {
    if (inv.isInterstate) {
      if (!table32Map[inv.placeOfSupply]) {
        table32Map[inv.placeOfSupply] = {
          posCode: inv.placeOfSupply,
          posName: inv.placeOfSupplyName,
          taxableValue: 0,
          igst: 0,
        };
      }
      table32Map[inv.placeOfSupply].taxableValue += inv.taxableValue;
      table32Map[inv.placeOfSupply].igst += inv.igst;
    }
  });

  // 2. Process Inward Supplies & ITC (Purchases & Expenses)
  let purchaseInvoices = invoices.filter((i) => i.voucherType === 'purchase' && i.status !== 'cancelled');
  let filteredExpenses = [...expenses];

  if (periodFilter?.startDate && periodFilter?.endDate) {
    purchaseInvoices = purchaseInvoices.filter((i) => {
      const d = i.invoiceDate;
      return d >= periodFilter.startDate! && d <= periodFilter.endDate!;
    });
    filteredExpenses = filteredExpenses.filter((e) => {
      const d = e.date;
      return d >= periodFilter.startDate! && d <= periodFilter.endDate!;
    });
  }

  const inwardList: Gstr3bInwardSummary[] = [];

  let itcIgst = 0;
  let itcCgst = 0;
  let itcSgst = 0;

  let ineligibleIgst = 0;
  let ineligibleCgst = 0;
  let ineligibleSgst = 0;

  // 2a. Purchase Bills
  purchaseInvoices.forEach((inv) => {
    const party = parties.find((p) => p.id === inv.partyId);
    const partyGstin = (inv.partyGstin || party?.gstin || '').trim().toUpperCase();
    const isRegistered = Boolean(partyGstin && partyGstin.length >= 15 && partyGstin !== 'URP');

    const rawTaxable = parseFloat(inv.subtotal) || 0;
    const rawIgst = parseFloat(inv.igstTotal) || 0;
    const rawCgst = parseFloat(inv.cgstTotal) || 0;
    const rawSgst = parseFloat(inv.sgstTotal) || 0;
    const rawTax = parseFloat(inv.taxTotal) || (rawIgst + rawCgst + rawSgst);

    // Supplier state from GSTIN or POS
    const supplierState = partyGstin.length >= 2 ? partyGstin.slice(0, 2) : inv.placeOfSupply || companyStateCode;
    const isInter = isInterstateSupply(supplierState, companyStateCode, inv.isInterstate);

    let calcIgst = 0;
    let calcCgst = 0;
    let calcSgst = 0;

    if (rawTax > 0) {
      if (isInter) {
        calcIgst = rawIgst > 0 ? rawIgst : rawTax;
      } else {
        if (rawCgst > 0 && rawSgst > 0) {
          calcCgst = rawCgst;
          calcSgst = rawSgst;
        } else {
          calcCgst = rawTax / 2;
          calcSgst = rawTax / 2;
        }
      }
    }

    const itcEligible = isRegistered;

    inwardList.push({
      id: `PUR-${inv.id}`,
      sourceType: 'purchase',
      supplierName: inv.partyName || party?.name || 'Vendor',
      supplierGstin: isRegistered ? partyGstin : undefined,
      isRegisteredSupplier: isRegistered,
      invoiceNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      placeOfSupply: normalizeStateCode(supplierState),
      isInterstate: isInter,
      taxableValue: rawTaxable,
      igst: calcIgst,
      cgst: calcCgst,
      sgst: calcSgst,
      totalTax: calcIgst + calcCgst + calcSgst,
      itcEligible,
    });

    if (itcEligible) {
      itcIgst += calcIgst;
      itcCgst += calcCgst;
      itcSgst += calcSgst;
    } else {
      ineligibleIgst += calcIgst;
      ineligibleCgst += calcCgst;
      ineligibleSgst += calcSgst;
    }
  });

  // 2b. Operating Expenses with GST
  filteredExpenses.forEach((exp) => {
    const tax = parseFloat(exp.gstPaid) || 0;
    const total = parseFloat(exp.amount) || 0;
    const taxable = Math.max(0, total - tax);
    const gstin = (exp.gstin || '').trim().toUpperCase();
    const isRegistered = Boolean(gstin && gstin.length >= 15 && gstin !== 'URP');
    const isInter = Boolean(isRegistered && !gstin.startsWith(companyStateCode));

    let expIgst = 0;
    let expCgst = 0;
    let expSgst = 0;

    if (tax > 0) {
      if (isInter) {
        expIgst = tax;
      } else {
        expCgst = tax / 2;
        expSgst = tax / 2;
      }
    }

    const itcEligible = Boolean(exp.itcEligible && tax > 0);

    inwardList.push({
      id: `EXP-${exp.id}`,
      sourceType: 'expense',
      supplierName: exp.vendorName || exp.category || 'Business Expense',
      supplierGstin: isRegistered ? gstin : undefined,
      isRegisteredSupplier: isRegistered,
      invoiceNumber: exp.referenceNumber || `EXP-${exp.id}`,
      date: exp.date,
      placeOfSupply: isInter ? gstin.slice(0, 2) : companyStateCode,
      isInterstate: isInter,
      taxableValue: taxable,
      igst: expIgst,
      cgst: expCgst,
      sgst: expSgst,
      totalTax: tax,
      itcEligible,
    });

    if (itcEligible) {
      itcIgst += expIgst;
      itcCgst += expCgst;
      itcSgst += expSgst;
    } else {
      ineligibleIgst += expIgst;
      ineligibleCgst += expCgst;
      ineligibleSgst += expSgst;
    }
  });

  // Table 4: Eligible ITC Totals
  const allOtherItc = {
    igst: itcIgst,
    cgst: itcCgst,
    sgst: itcSgst,
    total: itcIgst + itcCgst + itcSgst,
  };

  const ineligibleItc = {
    igst: ineligibleIgst,
    cgst: ineligibleCgst,
    sgst: ineligibleSgst,
    total: ineligibleIgst + ineligibleCgst + ineligibleSgst,
  };

  const netItcAvailable = {
    igst: Math.max(0, itcIgst),
    cgst: Math.max(0, itcCgst),
    sgst: Math.max(0, itcSgst),
    total: Math.max(0, itcIgst) + Math.max(0, itcCgst) + Math.max(0, itcSgst),
  };

  // 3. Table 6.1 Tax Liability Offset Engine (Section 49 & Rule 88A)
  // Step 1: Use IGST ITC to pay IGST liability first
  let remLiabilityIgst = liabilityIgst;
  let remLiabilityCgst = liabilityCgst;
  let remLiabilitySgst = liabilitySgst;

  let remItcIgst = netItcAvailable.igst;
  let remItcCgst = netItcAvailable.cgst;
  let remItcSgst = netItcAvailable.sgst;

  // (1) IGST ITC used for IGST liability
  const igstPaidByIgstItc = Math.min(remLiabilityIgst, remItcIgst);
  remLiabilityIgst -= igstPaidByIgstItc;
  remItcIgst -= igstPaidByIgstItc;

  // (2) Remaining IGST ITC used for CGST liability first, then SGST liability
  let cgstPaidByIgstItc = 0;
  let sgstPaidByIgstItc = 0;
  if (remItcIgst > 0 && remLiabilityCgst > 0) {
    cgstPaidByIgstItc = Math.min(remLiabilityCgst, remItcIgst);
    remLiabilityCgst -= cgstPaidByIgstItc;
    remItcIgst -= cgstPaidByIgstItc;
  }
  if (remItcIgst > 0 && remLiabilitySgst > 0) {
    sgstPaidByIgstItc = Math.min(remLiabilitySgst, remItcIgst);
    remLiabilitySgst -= sgstPaidByIgstItc;
    remItcIgst -= sgstPaidByIgstItc;
  }

  // (3) CGST ITC used for remaining CGST liability
  const cgstPaidByCgstItc = Math.min(remLiabilityCgst, remItcCgst);
  remLiabilityCgst -= cgstPaidByCgstItc;
  remItcCgst -= cgstPaidByCgstItc;

  // (4) SGST ITC used for remaining SGST liability
  const sgstPaidBySgstItc = Math.min(remLiabilitySgst, remItcSgst);
  remLiabilitySgst -= sgstPaidBySgstItc;
  remItcSgst -= sgstPaidBySgstItc;

  // (5) If any IGST liability remains, CGST ITC or SGST ITC cannot cross-utilize,
  // but under Rule 88A IGST liability had to be fully set off before IGST credit is used for others.
  // Can CGST ITC be used for IGST? Yes, if IGST liability remained after exhausting IGST ITC:
  let igstPaidByCgstItc = 0;
  let igstPaidBySgstItc = 0;
  if (remLiabilityIgst > 0 && remItcCgst > 0) {
    igstPaidByCgstItc = Math.min(remLiabilityIgst, remItcCgst);
    remLiabilityIgst -= igstPaidByCgstItc;
    remItcCgst -= igstPaidByCgstItc;
  }
  if (remLiabilityIgst > 0 && remItcSgst > 0) {
    igstPaidBySgstItc = Math.min(remLiabilityIgst, remItcSgst);
    remLiabilityIgst -= igstPaidBySgstItc;
    remItcSgst -= igstPaidBySgstItc;
  }

  const totalPaidByItc =
    igstPaidByIgstItc +
    igstPaidByCgstItc +
    igstPaidBySgstItc +
    cgstPaidByCgstItc +
    cgstPaidByIgstItc +
    sgstPaidBySgstItc +
    sgstPaidByIgstItc;

  const cashPayableIgst = Math.max(0, remLiabilityIgst);
  const cashPayableCgst = Math.max(0, remLiabilityCgst);
  const cashPayableSgst = Math.max(0, remLiabilitySgst);
  const totalCashPayable = cashPayableIgst + cashPayableCgst + cashPayableSgst;

  return {
    companyStateCode,
    companyStateName,
    companyGstin,
    periodLabel: periodFilter?.label || 'All Time',
    table31: {
      taxable: { taxableValue: normalTaxable, igst: normalIgst, cgst: normalCgst, sgst: normalSgst, cess: 0 },
      zeroRated: { taxableValue: exportTaxable, igst: exportIgst, cess: 0 },
      nilExempt: { taxableValue: nilTaxable },
      rcm: { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
      nonGst: { taxableValue: 0 },
      totalLiability: {
        igst: liabilityIgst,
        cgst: liabilityCgst,
        sgst: liabilitySgst,
        total: totalLiabilityAmount,
      },
    },
    table32: Object.values(table32Map),
    table4: {
      importGoods: { igst: 0, cess: 0 },
      importServices: { igst: 0, cess: 0 },
      rcmItc: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
      allOtherItc,
      totalAvailableItc: allOtherItc,
      ineligibleItc,
      netItcAvailable,
    },
    table5: {
      interstate: 0,
      intrastate: 0,
    },
    table61: {
      liability: {
        igst: liabilityIgst,
        cgst: liabilityCgst,
        sgst: liabilitySgst,
        total: totalLiabilityAmount,
      },
      paidByItc: {
        igstPaidByIgstItc,
        igstPaidByCgstItc,
        igstPaidBySgstItc,
        cgstPaidByCgstItc,
        cgstPaidByIgstItc,
        sgstPaidBySgstItc,
        sgstPaidByIgstItc,
        totalPaidByItc,
      },
      cashPayable: {
        igst: cashPayableIgst,
        cgst: cashPayableCgst,
        sgst: cashPayableSgst,
        total: totalCashPayable,
      },
      closingItcBalance: {
        igst: Math.max(0, remItcIgst),
        cgst: Math.max(0, remItcCgst),
        sgst: Math.max(0, remItcSgst),
        total: Math.max(0, remItcIgst) + Math.max(0, remItcCgst) + Math.max(0, remItcSgst),
      },
    },
    inwardSupplies: inwardList,
  };
}
