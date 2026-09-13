// src/utils/bankReconciliation.ts
import * as XLSX from 'xlsx';
import { BankTransaction, PaymentVoucher, Cheque, Expense, Party, Invoice } from '../types';

export interface BankStatementProfile {
  id: string;
  name: string;
  bankName: string;
  description: string;
  dateColPattern: RegExp;
  narrationColPattern: RegExp;
  refColPattern?: RegExp;
  withdrawalColPattern: RegExp;
  depositColPattern: RegExp;
  balanceColPattern?: RegExp;
}

export const BANK_PROFILES: BankStatementProfile[] = [
  {
    id: 'hdfc',
    name: 'HDFC Bank Ltd',
    bankName: 'HDFC Bank',
    description: 'Supports standard HDFC Current & Savings account statements (Excel & CSV)',
    dateColPattern: /^(date|txn\s*date|transaction\s*date)/i,
    narrationColPattern: /^(narration|description|particulars)/i,
    refColPattern: /^(chq|ref|cheque|ref\s*no|utr)/i,
    withdrawalColPattern: /^(withdrawal|debit|dr|withdrawal\s*amt)/i,
    depositColPattern: /^(deposit|credit|cr|deposit\s*amt)/i,
    balanceColPattern: /^(closing\s*balance|balance|bal)/i,
  },
  {
    id: 'sbi',
    name: 'State Bank of India (SBI)',
    bankName: 'State Bank of India',
    description: 'Supports SBI Corporate & Retail accounts (Excel & CSV)',
    dateColPattern: /^(txn\s*date|date|value\s*date)/i,
    narrationColPattern: /^(description|narration|particulars)/i,
    refColPattern: /^(ref\s*no|cheque\s*no|chq\s*no|ref)/i,
    withdrawalColPattern: /^(debit|dr|withdrawal)/i,
    depositColPattern: /^(credit|cr|deposit)/i,
    balanceColPattern: /^(balance|closing\s*bal)/i,
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    bankName: 'ICICI Bank',
    description: 'Supports ICICI Corporate & Retail statements (Excel & CSV)',
    dateColPattern: /^(transaction\s*date|value\s*date|date)/i,
    narrationColPattern: /^(transaction\s*remarks|narration|remarks|description)/i,
    refColPattern: /^(cheque\s*number|chq\s*no|ref\s*no|reference)/i,
    withdrawalColPattern: /^(withdrawal\s*amount|debit|dr)/i,
    depositColPattern: /^(deposit\s*amount|credit|cr)/i,
    balanceColPattern: /^(balance|closing\s*bal)/i,
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    bankName: 'Axis Bank',
    description: 'Supports Axis Bank Current & Retail statements',
    dateColPattern: /^(tran\s*date|date|txndate)/i,
    narrationColPattern: /^(particulars|description|narration)/i,
    refColPattern: /^(chqno|chequeno|ref)/i,
    withdrawalColPattern: /^(dr|debit|withdrawal)/i,
    depositColPattern: /^(cr|credit|deposit)/i,
    balanceColPattern: /^(bal|balance)/i,
  },
  {
    id: 'generic',
    name: 'Generic Bank Statement',
    bankName: 'Generic Bank',
    description: 'Universal parser for Kotak, PNB, Bank of Baroda, IndusInd, and custom CSVs',
    dateColPattern: /(date|time)/i,
    narrationColPattern: /(narration|description|particular|remarks|details)/i,
    refColPattern: /(ref|chq|cheque|utr|txn\s*id)/i,
    withdrawalColPattern: /(withdrawal|debit|dr|outflow|paid|spent)/i,
    depositColPattern: /(deposit|credit|cr|inflow|received)/i,
    balanceColPattern: /(balance|bal)/i,
  },
];

// Clean and parse monetary amount from string or number
export function cleanAmount(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);

  const str = String(val)
    .replace(/[₹$,\s]/g, '')
    .replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

// Parse date into YYYY-MM-DD
export function parseDateToIso(raw: any): string {
  if (!raw) return new Date().toISOString().split('T')[0];

  // If already YYYY-MM-DD
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim();
  }

  // Handle Excel serial date numbers (e.g. 45321)
  if (typeof raw === 'number' || (!isNaN(Number(raw)) && Number(raw) > 30000 && Number(raw) < 70000)) {
    const serial = Number(raw);
    const date = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const str = String(raw).trim();

  // Try parsing DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Try parsing DD-MMM-YYYY (e.g. 15-Jan-2026 or 15/Jan/2026)
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const ddmmmyyyy = str.match(/^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{4})/);
  if (ddmmmyyyy) {
    const day = ddmmmyyyy[1].padStart(2, '0');
    const mStr = ddmmmyyyy[2].toLowerCase();
    const month = monthNames[mStr] || '01';
    const year = ddmmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Native Date parsing fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
}

// Parse Bank Statement File (CSV, XLS, XLSX)
export function parseBankStatementFile(
  fileData: ArrayBuffer | Uint8Array,
  fileName: string,
  targetProfileId?: string
): {
  detectedBank: string;
  transactions: BankTransaction[];
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  startDate: string;
  endDate: string;
} {
  const workbook = XLSX.read(fileData, { type: 'array', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to array of arrays (rows)
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('Bank statement spreadsheet is empty or unreadable.');
  }

  // Find the header row (look for row with date and description/narration)
  let headerRowIndex = -1;
  let dateCol = -1;
  let narrationCol = -1;
  let refCol = -1;
  let withdrawalCol = -1;
  let depositCol = -1;
  let balanceCol = -1;

  const profile =
    BANK_PROFILES.find((p) => p.id === targetProfileId) ||
    BANK_PROFILES.find((p) => fileName.toLowerCase().includes(p.id)) ||
    BANK_PROFILES.find((p) => p.id === 'generic')!;

  for (let r = 0; r < Math.min(25, rawRows.length); r++) {
    const row = rawRows[r].map((cell) => String(cell || '').trim());
    let dCol = -1;
    let nCol = -1;
    let wCol = -1;
    let depCol = -1;

    for (let c = 0; c < row.length; c++) {
      const cellText = row[c].toLowerCase();
      if (!cellText) continue;

      if (dCol === -1 && profile.dateColPattern.test(cellText)) dCol = c;
      if (nCol === -1 && profile.narrationColPattern.test(cellText)) nCol = c;
      if (wCol === -1 && profile.withdrawalColPattern.test(cellText)) wCol = c;
      if (depCol === -1 && profile.depositColPattern.test(cellText)) depCol = c;
    }

    if (dCol !== -1 && (nCol !== -1 || (wCol !== -1 && depCol !== -1))) {
      headerRowIndex = r;
      dateCol = dCol;
      narrationCol = nCol !== -1 ? nCol : 1;
      withdrawalCol = wCol;
      depositCol = depCol;

      // Find other columns
      for (let c = 0; c < row.length; c++) {
        const cellText = row[c].toLowerCase();
        if (c !== dateCol && c !== narrationCol && c !== withdrawalCol && c !== depositCol) {
          if (refCol === -1 && profile.refColPattern && profile.refColPattern.test(cellText)) {
            refCol = c;
          }
          if (balanceCol === -1 && profile.balanceColPattern && profile.balanceColPattern.test(cellText)) {
            balanceCol = c;
          }
        }
      }
      break;
    }
  }

  // Fallback: If no recognized header found, assume standard 0:Date, 1:Narration, 2:Ref, 3:Debit, 4:Credit, 5:Balance
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    dateCol = 0;
    narrationCol = 1;
    refCol = 2;
    withdrawalCol = 3;
    depositCol = 4;
    balanceCol = 5;
  }

  const transactions: BankTransaction[] = [];
  let totalCredits = 0;
  let totalDebits = 0;
  let firstDate = '';
  let lastDate = '';
  let openingBalance = 0;
  let closingBalance = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawDate = row[dateCol];
    const rawNarration = row[narrationCol];
    if (!rawDate && !rawNarration) continue;

    const date = parseDateToIso(rawDate);
    const narration = String(rawNarration || '').trim();
    if (!narration && !row[withdrawalCol] && !row[depositCol]) continue;

    const refNumber = refCol !== -1 && row[refCol] ? String(row[refCol]).trim() : extractRefFromNarration(narration);
    const withdrawal = withdrawalCol !== -1 ? cleanAmount(row[withdrawalCol]) : 0;
    const deposit = depositCol !== -1 ? cleanAmount(row[depositCol]) : 0;
    const balance = balanceCol !== -1 && row[balanceCol] ? cleanAmount(row[balanceCol]) : undefined;

    // Skip zero amount rows (like summary footers or empty spacing)
    if (withdrawal === 0 && deposit === 0) continue;

    if (!firstDate) firstDate = date;
    lastDate = date;

    if (deposit > 0) totalCredits += deposit;
    if (withdrawal > 0) totalDebits += withdrawal;

    if (balance !== undefined) {
      if (transactions.length === 0) {
        openingBalance = deposit > 0 ? balance - deposit : balance + withdrawal;
      }
      closingBalance = balance;
    }

    transactions.push({
      id: `stmt_txn_${Date.now()}_${r}`,
      date,
      narration,
      refNumber: refNumber || undefined,
      withdrawal,
      deposit,
      balance,
      reconciled: false,
    });
  }

  if (closingBalance === 0 && openingBalance === 0) {
    openingBalance = 0;
    closingBalance = totalCredits - totalDebits;
  }

  return {
    detectedBank: profile.bankName,
    transactions,
    openingBalance,
    closingBalance,
    totalCredits,
    totalDebits,
    startDate: firstDate || new Date().toISOString().split('T')[0],
    endDate: lastDate || new Date().toISOString().split('T')[0],
  };
}

// Extract cheque / UTR / txn ref from description if separate col is absent
export function extractRefFromNarration(narration: string): string | undefined {
  if (!narration) return undefined;
  // Match 6-digit cheque number: CHQ 123456 or CLG 123456
  const chqMatch = narration.match(/(?:chq|cheque|clg|no)[:.\s-]*([0-9]{6})\b/i);
  if (chqMatch) return chqMatch[1];

  // Match UTR or NEFT/RTGS / IMPS reference e.g. CMS12345678 or UTR12345
  const utrMatch = narration.match(/\b([A-Z]{4}[0-9]{8,14}|[0-9]{10,14})\b/i);
  if (utrMatch) return utrMatch[1];

  // Match UPI reference e.g. UPI/1234567890/
  const upiMatch = narration.match(/upi\/[A-Za-z0-9]+\/([0-9]{8,12})/i);
  if (upiMatch) return upiMatch[1];

  return undefined;
}

// Smart Auto-Reconciliation Engine
export function autoMatchTransactions(
  transactions: BankTransaction[],
  payments: PaymentVoucher[],
  cheques: Cheque[],
  expenses: Expense[],
  parties: Party[] = [],
  invoices: Invoice[] = []
): {
  matchedTransactions: BankTransaction[];
  stats: {
    total: number;
    matched: number;
    unmatched: number;
    highConfidence: number;
    mediumConfidence: number;
  };
} {
  const usedVoucherKeys = new Set<string>();

  let highConfidence = 0;
  let mediumConfidence = 0;

  const matched = transactions.map((txn) => {
    // If already reconciled, preserve existing match
    if (txn.reconciled) {
      if (txn.matchedVoucherType && txn.matchedVoucherId) {
        usedVoucherKeys.add(`${txn.matchedVoucherType}_${txn.matchedVoucherId}`);
      }
      return txn;
    }

    const isDeposit = txn.deposit > 0;
    const targetAmount = isDeposit ? txn.deposit : txn.withdrawal;
    const txnRef = (txn.refNumber || '').trim().toLowerCase();
    const narrationLower = txn.narration.toLowerCase();

    // -------------------------------------------------------------
    // Tier 1: Exact Match with Cheque Register (100% confidence)
    // -------------------------------------------------------------
    const matchingCheque = cheques.find((ch) => {
      const key = `cheque_${ch.id}`;
      if (usedVoucherKeys.has(key)) return false;

      const chAmount = parseFloat(ch.amount) || 0;
      if (Math.abs(chAmount - targetAmount) > 0.01) return false;

      // Inward cheque = Deposit, Outward cheque = Withdrawal
      if (isDeposit && ch.chequeType !== 'inward') return false;
      if (!isDeposit && ch.chequeType !== 'outward') return false;

      // Match cheque number
      const chNum = (ch.chequeNumber || '').trim().toLowerCase();
      if (chNum && (chNum === txnRef || narrationLower.includes(chNum))) {
        return true;
      }
      return false;
    });

    if (matchingCheque) {
      usedVoucherKeys.add(`cheque_${matchingCheque.id}`);
      highConfidence++;
      return {
        ...txn,
        reconciled: true,
        matchedVoucherType: 'cheque' as const,
        matchedVoucherId: matchingCheque.id,
        matchedVoucherNumber: `CHQ #${matchingCheque.chequeNumber}`,
        matchedPartyName: matchingCheque.payeeName,
        matchedAmount: parseFloat(matchingCheque.amount),
        matchConfidence: 100,
        matchReason: `Exact Cheque #${matchingCheque.chequeNumber} and Amount Match`,
        reconciledAt: new Date().toISOString(),
      };
    }

    // -------------------------------------------------------------
    // Tier 2: Exact Reference / UTR Match with Payment Voucher (98% confidence)
    // -------------------------------------------------------------
    const matchingPaymentByRef = payments.find((p) => {
      const key = `payment_${p.id}`;
      if (usedVoucherKeys.has(key)) return false;

      const pAmount = parseFloat(p.amount) || 0;
      if (Math.abs(pAmount - targetAmount) > 0.01) return false;

      // Receipt = Deposit, Payment = Withdrawal
      if (isDeposit && p.voucherType !== 'receipt') return false;
      if (!isDeposit && p.voucherType !== 'payment') return false;

      const pRef = (p.referenceNumber || '').trim().toLowerCase();
      if (pRef && txnRef && (pRef === txnRef || narrationLower.includes(pRef))) {
        return true;
      }
      return false;
    });

    if (matchingPaymentByRef) {
      usedVoucherKeys.add(`payment_${matchingPaymentByRef.id}`);
      highConfidence++;
      return {
        ...txn,
        reconciled: true,
        matchedVoucherType: matchingPaymentByRef.voucherType === 'receipt' ? ('receipt' as const) : ('payment' as const),
        matchedVoucherId: matchingPaymentByRef.id,
        matchedVoucherNumber: matchingPaymentByRef.voucherNumber,
        matchedPartyName: matchingPaymentByRef.partyName,
        matchedAmount: parseFloat(matchingPaymentByRef.amount),
        matchConfidence: 98,
        matchReason: `Matched Reference/UTR #${matchingPaymentByRef.referenceNumber} and Amount`,
        reconciledAt: new Date().toISOString(),
      };
    }

    // -------------------------------------------------------------
    // Tier 3: Same Date & Exact Amount Match (92% confidence)
    // -------------------------------------------------------------
    const matchingPaymentByDateAndAmt = payments.find((p) => {
      const key = `payment_${p.id}`;
      if (usedVoucherKeys.has(key)) return false;

      const pAmount = parseFloat(p.amount) || 0;
      if (Math.abs(pAmount - targetAmount) > 0.01) return false;

      if (isDeposit && p.voucherType !== 'receipt') return false;
      if (!isDeposit && p.voucherType !== 'payment') return false;

      // Date match (same day)
      return p.date === txn.date;
    });

    if (matchingPaymentByDateAndAmt) {
      usedVoucherKeys.add(`payment_${matchingPaymentByDateAndAmt.id}`);
      highConfidence++;
      return {
        ...txn,
        reconciled: true,
        matchedVoucherType: matchingPaymentByDateAndAmt.voucherType === 'receipt' ? ('receipt' as const) : ('payment' as const),
        matchedVoucherId: matchingPaymentByDateAndAmt.id,
        matchedVoucherNumber: matchingPaymentByDateAndAmt.voucherNumber,
        matchedPartyName: matchingPaymentByDateAndAmt.partyName,
        matchedAmount: parseFloat(matchingPaymentByDateAndAmt.amount),
        matchConfidence: 92,
        matchReason: `Exact Date (${txn.date}) & Amount (₹${targetAmount}) Match`,
        reconciledAt: new Date().toISOString(),
      };
    }

    // -------------------------------------------------------------
    // Tier 4: Exact Amount & Narration contains Party Name or Invoice No (85% confidence)
    // -------------------------------------------------------------
    const matchingPartyPayment = payments.find((p) => {
      const key = `payment_${p.id}`;
      if (usedVoucherKeys.has(key)) return false;

      const pAmount = parseFloat(p.amount) || 0;
      if (Math.abs(pAmount - targetAmount) > 0.01) return false;

      if (isDeposit && p.voucherType !== 'receipt') return false;
      if (!isDeposit && p.voucherType !== 'payment') return false;

      const partyNameLower = (p.partyName || '').toLowerCase();
      if (partyNameLower.length > 3 && narrationLower.includes(partyNameLower)) {
        return true;
      }
      return false;
    });

    if (matchingPartyPayment) {
      usedVoucherKeys.add(`payment_${matchingPartyPayment.id}`);
      mediumConfidence++;
      return {
        ...txn,
        reconciled: true,
        matchedVoucherType: matchingPartyPayment.voucherType === 'receipt' ? ('receipt' as const) : ('payment' as const),
        matchedVoucherId: matchingPartyPayment.id,
        matchedVoucherNumber: matchingPartyPayment.voucherNumber,
        matchedPartyName: matchingPartyPayment.partyName,
        matchedAmount: parseFloat(matchingPartyPayment.amount),
        matchConfidence: 85,
        matchReason: `Party Name "${matchingPartyPayment.partyName}" detected in bank narration`,
        reconciledAt: new Date().toISOString(),
      };
    }

    // -------------------------------------------------------------
    // Tier 5: Date Window (±3 days) & Exact Amount Match (80% confidence)
    // -------------------------------------------------------------
    const txnTime = new Date(txn.date).getTime();
    const matchingPaymentWindow = payments.find((p) => {
      const key = `payment_${p.id}`;
      if (usedVoucherKeys.has(key)) return false;

      const pAmount = parseFloat(p.amount) || 0;
      if (Math.abs(pAmount - targetAmount) > 0.01) return false;

      if (isDeposit && p.voucherType !== 'receipt') return false;
      if (!isDeposit && p.voucherType !== 'payment') return false;

      const pTime = new Date(p.date).getTime();
      const diffDays = Math.abs(txnTime - pTime) / (1000 * 60 * 60 * 24);
      return diffDays <= 3;
    });

    if (matchingPaymentWindow) {
      usedVoucherKeys.add(`payment_${matchingPaymentWindow.id}`);
      mediumConfidence++;
      return {
        ...txn,
        reconciled: true,
        matchedVoucherType: matchingPaymentWindow.voucherType === 'receipt' ? ('receipt' as const) : ('payment' as const),
        matchedVoucherId: matchingPaymentWindow.id,
        matchedVoucherNumber: matchingPaymentWindow.voucherNumber,
        matchedPartyName: matchingPaymentWindow.partyName,
        matchedAmount: parseFloat(matchingPaymentWindow.amount),
        matchConfidence: 80,
        matchReason: `Voucher within ±3 days (${matchingPaymentWindow.date}) & Amount (₹${targetAmount})`,
        reconciledAt: new Date().toISOString(),
      };
    }

    // -------------------------------------------------------------
    // Tier 6: Bank Expense Match (Withdrawals matching recorded Expenses) (80% confidence)
    // -------------------------------------------------------------
    if (!isDeposit) {
      const matchingExpense = expenses.find((exp) => {
        const key = `expense_${exp.id}`;
        if (usedVoucherKeys.has(key)) return false;

        const expAmount = parseFloat(exp.amount) || 0;
        if (Math.abs(expAmount - targetAmount) > 0.01) return false;

        const expTime = new Date(exp.date).getTime();
        const diffDays = Math.abs(txnTime - expTime) / (1000 * 60 * 60 * 24);
        return diffDays <= 3;
      });

      if (matchingExpense) {
        usedVoucherKeys.add(`expense_${matchingExpense.id}`);
        mediumConfidence++;
        return {
          ...txn,
          reconciled: true,
          matchedVoucherType: 'expense' as const,
          matchedVoucherId: matchingExpense.id,
          matchedVoucherNumber: `EXP #${matchingExpense.id}`,
          matchedPartyName: matchingExpense.vendorName || matchingExpense.category,
          matchedAmount: parseFloat(matchingExpense.amount),
          matchConfidence: 80,
          matchReason: `Matched Expense: ${matchingExpense.category} (₹${targetAmount})`,
          reconciledAt: new Date().toISOString(),
        };
      }
    }

    return txn;
  });

  const matchedCount = matched.filter((t) => t.reconciled).length;

  return {
    matchedTransactions: matched,
    stats: {
      total: transactions.length,
      matched: matchedCount,
      unmatched: transactions.length - matchedCount,
      highConfidence,
      mediumConfidence,
    },
  };
}

