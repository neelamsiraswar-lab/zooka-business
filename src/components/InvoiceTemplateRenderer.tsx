import React from 'react';
import { CompanyProfile, Invoice } from '../types.ts';
import {
  QrCode,
  ShieldCheck,
  Building,
  CheckCircle2,
  Truck,
  Globe,
  ShoppingBag,
  Landmark,
  Award,
  Clock,
  FileText,
  Check,
} from 'lucide-react';

export interface InvoiceTemplateProps {
  invoice: Invoice;
  company: CompanyProfile | null;
  designOverrides?: Partial<CompanyProfile>;
  className?: string;
  isPrintMode?: boolean;
}

export const COLOR_THEMES: Record<
  string,
  {
    name: string;
    hex: string;
    badgeBg: string;
    badgeText: string;
    tableHeaderBg: string;
    tableHeaderText: string;
    borderAccent: string;
    accentBg: string;
    accentText: string;
    ringColor: string;
  }
> = {
  emerald: {
    name: 'Emerald Green',
    hex: '#059669',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    tableHeaderBg: 'bg-emerald-800',
    tableHeaderText: 'text-white',
    borderAccent: 'border-emerald-600',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-700',
    ringColor: 'ring-emerald-500',
  },
  blue: {
    name: 'Royal Blue',
    hex: '#2563eb',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    tableHeaderBg: 'bg-blue-900',
    tableHeaderText: 'text-white',
    borderAccent: 'border-blue-600',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-700',
    ringColor: 'ring-blue-500',
  },
  indigo: {
    name: 'Deep Indigo',
    hex: '#4f46e5',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    tableHeaderBg: 'bg-indigo-900',
    tableHeaderText: 'text-white',
    borderAccent: 'border-indigo-600',
    accentBg: 'bg-indigo-600',
    accentText: 'text-indigo-700',
    ringColor: 'ring-indigo-500',
  },
  slate: {
    name: 'Executive Slate',
    hex: '#334155',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-900',
    tableHeaderBg: 'bg-slate-900',
    tableHeaderText: 'text-white',
    borderAccent: 'border-slate-700',
    accentBg: 'bg-slate-800',
    accentText: 'text-slate-800',
    ringColor: 'ring-slate-500',
  },
  amber: {
    name: 'Warm Amber',
    hex: '#d97706',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    tableHeaderBg: 'bg-amber-800',
    tableHeaderText: 'text-white',
    borderAccent: 'border-amber-600',
    accentBg: 'bg-amber-600',
    accentText: 'text-amber-800',
    ringColor: 'ring-amber-500',
  },
  rose: {
    name: 'Crimson Ruby',
    hex: '#e11d48',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-900',
    tableHeaderBg: 'bg-rose-900',
    tableHeaderText: 'text-white',
    borderAccent: 'border-rose-600',
    accentBg: 'bg-rose-600',
    accentText: 'text-rose-700',
    ringColor: 'ring-rose-500',
  },
  teal: {
    name: 'Ocean Teal',
    hex: '#0d9488',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-900',
    tableHeaderBg: 'bg-teal-900',
    tableHeaderText: 'text-white',
    borderAccent: 'border-teal-600',
    accentBg: 'bg-teal-600',
    accentText: 'text-teal-700',
    ringColor: 'ring-teal-500',
  },
  violet: {
    name: 'Royal Violet',
    hex: '#7c3aed',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-900',
    tableHeaderBg: 'bg-violet-900',
    tableHeaderText: 'text-white',
    borderAccent: 'border-violet-600',
    accentBg: 'bg-violet-600',
    accentText: 'text-violet-700',
    ringColor: 'ring-violet-500',
  },
  cyan: {
    name: 'Cool Cyan',
    hex: '#0891b2',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-900',
    tableHeaderBg: 'bg-cyan-900',
    tableHeaderText: 'text-white',
    borderAccent: 'border-cyan-600',
    accentBg: 'bg-cyan-600',
    accentText: 'text-cyan-700',
    ringColor: 'ring-cyan-500',
  },
};

export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
  }

  function convertThreeDigits(n: number): string {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
    }
    const rem = n % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let num = integerPart;
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundredAndBelow = num;

  if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertThreeDigits(thousand) + ' Thousand ';
  if (hundredAndBelow > 0) words += convertThreeDigits(hundredAndBelow);

  words = words.trim() || 'Zero';
  let res = `${words} Rupees`;
  if (decimalPart > 0) {
    res += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }
  return `${res} Only`;
}

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateProps> = ({
  invoice,
  company,
  designOverrides,
  className = '',
}) => {
  // Merge company defaults with any real-time design overrides from settings
  const merged = {
    ...company,
    ...designOverrides,
  };

  const template = merged.invoiceDesignTemplate || 'modern';
  const colorKey = merged.invoiceColorTheme || 'emerald';
  const color = COLOR_THEMES[colorKey] || COLOR_THEMES.emerald;

  const headerTitle = merged.invoiceHeaderTitle || 'TAX INVOICE';
  const subtitle = merged.invoiceSubtitle || 'ORIGINAL FOR RECIPIENT';
  const showLogo = merged.invoiceShowLogo !== false;
  const logoUrl = merged.invoiceLogoUrl || '';
  const showBank = merged.invoiceShowBankDetails !== false;
  const showUpiQr = merged.invoiceShowUpiQr !== false;
  const showSignatory = merged.invoiceShowAuthorizedSignatory !== false;
  const signatoryLabel = merged.invoiceSignatoryLabel || 'Authorized Signatory';
  const signatureUrl = merged.invoiceSignatureUrl || '';
  const showHsnSummary = merged.invoiceShowHsnSummary !== false;
  const showTerms = merged.invoiceShowTerms !== false;

  const businessName = merged.businessName || 'Company Legal Name';
  const address = merged.address || 'Principal Place of Business, Maharashtra, India';
  const gstin = merged.gstin || '27AABCU9603R1ZM';
  const stateName = merged.stateName || 'Maharashtra';
  const stateCode = merged.stateCode || '27';
  const phone = merged.phone || '+91 98200 12345';
  const email = merged.email || 'billing@company.in';

  const bankName = merged.bankName || 'HDFC Bank Ltd';
  const accountNumber = merged.accountNumber || '50200049281729';
  const ifscCode = merged.ifscCode || 'HDFC0000123';
  const upiId = merged.upiId || 'company@upi';

  const defaultTerms =
    merged.defaultTerms ||
    '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be levied on overdue payments.\n3. Subject to local state jurisdiction.';
  const defaultNotes = merged.defaultNotes || 'Thank you for your business!';

  // Calculate UPI QR URL for instant scan
  const upiQrString = encodeURIComponent(
    `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${parseFloat(invoice.grandTotal || '0').toFixed(2)}&cu=INR&tn=Invoice_${invoice.invoiceNumber}`
  );
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${upiQrString}`;

  // Helper for voucher category label
  const getVoucherTitle = () => {
    if (invoice.voucherType === 'purchase') {
      if (invoice.saleType === 'unregistered_rcm') return 'PURCHASE VOUCHER (RCM U/S 9(4))';
      if (invoice.saleType === 'import_overseas') return 'BILL OF ENTRY / IMPORT INWARD';
      if (invoice.saleType === 'exempt_nil') return 'INWARD SUPPLY (EXEMPT / NIL)';
      return 'PURCHASE BILL (INWARD SUPPLY)';
    }

    if (invoice.saleType === 'bill_of_supply') return 'BILL OF SUPPLY (RULE 49 - EXEMPTED)';
    if (invoice.saleType === 'export_without_tax') return 'EXPORT INVOICE (SUPPLY UNDER LUT)';
    if (invoice.saleType === 'export_with_tax') return 'EXPORT INVOICE (WITH PAYMENT OF IGST)';
    if (invoice.saleType === 'rcm') return 'TAX INVOICE (REVERSE CHARGE U/S 9(3))';
    if (invoice.saleType === 'sez') return 'TAX INVOICE (SUPPLY TO SEZ)';
    return headerTitle;
  };

  // Render Based on Template
  return (
    <div className={`bg-white text-slate-900 font-sans text-xs select-text shadow-sm ${className}`}>
      {/* ========================================================================= */}
      {/* 1. MODERN TEMPLATE */}
      {/* ========================================================================= */}
      {template === 'modern' && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Top Decorative Accent Strip */}
          <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: color.hex }} />

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-3">
              {showLogo && (
                <div className="flex-shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={businessName}
                      className="w-14 h-14 object-contain rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    >
                      {businessName.charAt(0) || 'G'}
                    </div>
                  )}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{businessName}</h1>
                <p className="text-slate-600 max-w-sm mt-0.5 text-xs leading-relaxed">{address}</p>
                <div className="mt-2 text-[11px] font-mono text-slate-700 space-y-0.5">
                  <div>
                    GSTIN: <strong className="text-slate-900 font-bold">{gstin}</strong>
                  </div>
                  <div>
                    State: {stateName} (Code: {stateCode})
                  </div>
                  {(phone || email) && (
                    <div className="text-slate-500">
                      {phone && <span>Ph: {phone}</span>}
                      {phone && email && <span> • </span>}
                      {email && <span>{email}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:text-right flex-shrink-0">
              <div
                className="inline-block px-3 py-1 rounded-md text-white font-bold uppercase tracking-wider text-[11px] shadow-sm"
                style={{ backgroundColor: color.hex }}
              >
                {getVoucherTitle()}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">
                {subtitle}
              </div>

              <div className="mt-3 space-y-1 font-mono text-[11px] sm:text-right">
                <div>
                  <span className="text-slate-500">
                    {invoice.voucherType === 'purchase' ? 'Ref No:' : 'Invoice No:'}{' '}
                  </span>
                  <strong className="text-slate-900 font-bold text-xs">{invoice.invoiceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Date: </span>
                  <strong className="text-slate-800">{invoice.invoiceDate}</strong>
                </div>
                {invoice.dueDate && (
                  <div>
                    <span className="text-slate-500">Due Date: </span>
                    <strong className="text-slate-800">{invoice.dueDate}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Place of Supply: </span>
                  <strong className="text-slate-800">State {invoice.placeOfSupply}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To & Dispatch Details Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/90 border border-slate-200 rounded-xl">
            <div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: color.hex }}
              >
                {invoice.voucherType === 'purchase' ? 'Supplier (Vendor)' : 'Billed To (Customer)'}
              </span>
              <div className="font-bold text-sm text-slate-900 mt-1">{invoice.partyName}</div>
              {invoice.partyGstin ? (
                <div className="font-mono text-slate-700 text-[11px] mt-0.5">
                  GSTIN: <strong className="text-slate-900">{invoice.partyGstin}</strong>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic mt-0.5">
                  Unregistered Consumer / End-User
                </div>
              )}
            </div>

            <div className="sm:text-right font-mono text-[11px] space-y-1 self-center">
              <div>
                <span className="text-slate-500">Supply Type: </span>
                <strong className="text-slate-900">
                  {invoice.isInterstate ? 'Interstate (IGST)' : 'Intra-State (CGST + SGST)'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Reverse Charge (RCM): </span>
                <strong className="text-slate-900">
                  {invoice.saleType === 'rcm' || invoice.saleType === 'unregistered_rcm' ? 'YES' : 'NO'}
                </strong>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead style={{ backgroundColor: color.hex }} className="text-white uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 font-semibold">#</th>
                  <th className="p-2.5 font-semibold">Item & Description</th>
                  <th className="p-2.5 text-center font-semibold">HSN/SAC</th>
                  <th className="p-2.5 text-right font-semibold">Qty</th>
                  <th className="p-2.5 text-right font-semibold">Rate (₹)</th>
                  <th className="p-2.5 text-right font-semibold">Taxable (₹)</th>
                  <th className="p-2.5 text-right font-semibold">GST %</th>
                  <th className="p-2.5 text-right font-semibold">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((it, idx) => {
                    const itemTaxable = parseFloat(it.taxableValue || '0');
                    const itemTotal = parseFloat(it.total || '0');
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-2.5 font-medium text-slate-900">
                          {it.itemName}
                          {it.isTaxInclusive && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-normal">
                              Tax-Incl
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-600">{it.hsnCode || '—'}</td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          ₹{parseFloat(it.rate || '0').toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          ₹{itemTaxable.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">{it.gstRate}%</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          ₹{itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-slate-400">
                      No line items recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* HSN Tax Breakup (Optional) */}
          {showHsnSummary && invoice.items && invoice.items.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: color.hex }} />
                <span>Statutory HSN/SAC Tax Summary</span>
              </div>
              <table className="w-full border-collapse border border-slate-200 text-[10px] font-mono text-left rounded overflow-hidden">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="border border-slate-200 p-1.5">HSN/SAC</th>
                    <th className="border border-slate-200 p-1.5 text-right">Taxable Val (₹)</th>
                    {invoice.isInterstate ? (
                      <>
                        <th className="border border-slate-200 p-1.5 text-right">IGST %</th>
                        <th className="border border-slate-200 p-1.5 text-right">IGST (₹)</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-slate-200 p-1.5 text-right">CGST %</th>
                        <th className="border border-slate-200 p-1.5 text-right">CGST (₹)</th>
                        <th className="border border-slate-200 p-1.5 text-right">SGST %</th>
                        <th className="border border-slate-200 p-1.5 text-right">SGST (₹)</th>
                      </>
                    )}
                    <th className="border border-slate-200 p-1.5 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((it, i) => {
                    const taxVal = parseFloat(it.taxableValue || '0');
                    const rateNum = parseFloat(it.gstRate || '0');
                    const taxAmt = parseFloat(it.total || '0') - taxVal;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="border border-slate-200 p-1.5">{it.hsnCode || '—'}</td>
                        <td className="border border-slate-200 p-1.5 text-right">₹{taxVal.toFixed(2)}</td>
                        {invoice.isInterstate ? (
                          <>
                            <td className="border border-slate-200 p-1.5 text-right">{rateNum}%</td>
                            <td className="border border-slate-200 p-1.5 text-right">₹{taxAmt.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="border border-slate-200 p-1.5 text-right">
                              {(rateNum / 2).toFixed(1)}%
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right">
                              ₹{(taxAmt / 2).toFixed(2)}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right">
                              {(rateNum / 2).toFixed(1)}%
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right">
                              ₹{(taxAmt / 2).toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="border border-slate-200 p-1.5 text-right font-bold text-slate-900">
                          ₹{taxAmt.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Settlement & Financial Breakdown Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Left Box: Bank & UPI QR */}
            <div className="space-y-3">
              {showBank && (
                <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider block"
                    style={{ color: color.hex }}
                  >
                    Bank Settlement Details (NEFT / RTGS / IMPS)
                  </span>
                  <div className="font-mono text-slate-700 space-y-0.5">
                    <div>
                      Bank: <strong className="text-slate-900">{bankName}</strong>
                    </div>
                    <div>
                      A/C No: <strong className="text-slate-900">{accountNumber}</strong>
                    </div>
                    <div>
                      IFSC: <strong className="text-slate-900">{ifscCode}</strong>
                    </div>
                    {upiId && (
                      <div>
                        UPI ID: <strong className="text-slate-900">{upiId}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showUpiQr && upiId && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <img
                    src={qrCodeUrl}
                    alt="Scan to Pay via UPI"
                    className="w-16 h-16 rounded border border-slate-300 flex-shrink-0 bg-white p-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1 font-bold text-slate-900 text-xs">
                      <QrCode className="w-3.5 h-3.5" style={{ color: color.hex }} />
                      <span>Instant UPI Scan & Pay</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Scan using Google Pay, PhonePe, Paytm, or BHIM to pay instantly.
                    </p>
                    <div className="text-[10px] font-mono font-semibold mt-1 text-slate-700">
                      Amount: ₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Totals & Tax Calculation */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span className="font-semibold text-slate-900">
                  ₹{parseFloat(invoice.subtotal || '0').toFixed(2)}
                </span>
              </div>

              {invoice.isInterstate ? (
                <div className="flex justify-between text-purple-700">
                  <span>Integrated Tax (IGST):</span>
                  <span className="font-semibold">₹{parseFloat(invoice.igstTotal || '0').toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Central Tax (CGST):</span>
                    <span className="font-semibold text-slate-800">
                      ₹{parseFloat(invoice.cgstTotal || '0').toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>State Tax (SGST):</span>
                    <span className="font-semibold text-slate-800">
                      ₹{parseFloat(invoice.sgstTotal || '0').toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              <div
                className="flex justify-between text-sm font-bold pt-2 border-t border-slate-300"
                style={{ color: color.hex }}
              >
                <span>Grand Total:</span>
                <span className="text-base">₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 text-[11px] pt-1 border-t border-dashed border-slate-200">
                <span>Amount Paid:</span>
                <span>₹{parseFloat(invoice.paidAmount || '0').toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Terms & Signatory */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[10px] text-slate-500">
            {showTerms ? (
              <div className="max-w-md space-y-1">
                <p className="font-semibold text-slate-700">Terms & Conditions:</p>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed">{defaultTerms}</p>
                {invoice.notes && (
                  <p className="mt-1 text-slate-700 font-medium">Notes: {invoice.notes}</p>
                )}
                <p className="text-[9px] text-slate-400 mt-1">
                  Declaration: We declare that this invoice shows the actual price of the goods or services
                  described and that all particulars are true and correct.
                </p>
              </div>
            ) : (
              <div />
            )}

            {showSignatory && (
              <div className="text-center sm:text-right flex-shrink-0 self-end">
                {signatureUrl ? (
                  <div className="mb-1 flex justify-center sm:justify-end">
                    <img
                      src={signatureUrl}
                      alt="Authorized Signatory"
                      referrerPolicy="no-referrer"
                      className="h-12 max-w-[160px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-10"></div>
                )}
                <p className="font-bold text-slate-900 text-xs">For {businessName}</p>
                <p className="text-slate-500 font-medium text-[10px]">{signatoryLabel}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLASSIC GST CORPORATE (Rule 46 Boxed Grid) */}
      {/* ========================================================================= */}
      {template === 'classic' && (
        <div className="border-2 border-slate-800 p-0 text-slate-900">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-800 p-4 text-center bg-slate-50">
            <h1 className="text-lg font-black tracking-wider uppercase">{getVoucherTitle()}</h1>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{subtitle}</p>
          </div>

          {/* Company & Voucher Meta Grid */}
          <div className="grid grid-cols-2 border-b-2 border-slate-800">
            <div className="p-3 border-r-2 border-slate-800 space-y-1">
              <div className="font-bold text-sm text-slate-900">{businessName}</div>
              <div className="text-[11px] text-slate-600">{address}</div>
              <div className="font-mono text-[11px] mt-1">
                <div>GSTIN: <strong>{gstin}</strong></div>
                <div>State: {stateName} (Code: {stateCode})</div>
                <div>Contact: {phone} | {email}</div>
              </div>
            </div>

            <div className="p-3 font-mono text-[11px] space-y-1">
              <div>Invoice No: <strong>{invoice.invoiceNumber}</strong></div>
              <div>Invoice Date: <strong>{invoice.invoiceDate}</strong></div>
              {invoice.dueDate && <div>Due Date: {invoice.dueDate}</div>}
              <div>Place of Supply: State Code {invoice.placeOfSupply}</div>
              <div>Reverse Charge: {invoice.saleType === 'rcm' ? 'YES' : 'NO'}</div>
            </div>
          </div>

          {/* Consignee / Bill To Grid */}
          <div className="p-3 border-b-2 border-slate-800 bg-slate-50/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Details of Receiver / Billed To:
            </div>
            <div className="font-bold text-sm text-slate-900 mt-0.5">{invoice.partyName}</div>
            <div className="font-mono text-[11px] text-slate-700 mt-0.5">
              GSTIN / UIN: <strong>{invoice.partyGstin || 'Unregistered'}</strong>
            </div>
          </div>

          {/* Classic Bordered Table */}
          <table className="w-full border-collapse border-b-2 border-slate-800 text-left text-xs">
            <thead className="bg-slate-200 border-b-2 border-slate-800 text-slate-900 uppercase text-[10px] font-bold">
              <tr>
                <th className="border-r border-slate-800 p-2 text-center w-8">#</th>
                <th className="border-r border-slate-800 p-2">Description of Goods / Services</th>
                <th className="border-r border-slate-800 p-2 text-center">HSN/SAC</th>
                <th className="border-r border-slate-800 p-2 text-right">Qty</th>
                <th className="border-r border-slate-800 p-2 text-right">Rate (₹)</th>
                <th className="border-r border-slate-800 p-2 text-right">Taxable Value (₹)</th>
                <th className="border-r border-slate-800 p-2 text-right">GST %</th>
                <th className="p-2 text-right">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y border-slate-800">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="border-r border-slate-800 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border-r border-slate-800 p-2 font-medium">{it.itemName}</td>
                    <td className="border-r border-slate-800 p-2 text-center font-mono">{it.hsnCode}</td>
                    <td className="border-r border-slate-800 p-2 text-right font-mono">{it.quantity} {it.unit}</td>
                    <td className="border-r border-slate-800 p-2 text-right font-mono">₹{parseFloat(it.rate || '0').toFixed(2)}</td>
                    <td className="border-r border-slate-800 p-2 text-right font-mono">₹{parseFloat(it.taxableValue || '0').toFixed(2)}</td>
                    <td className="border-r border-slate-800 p-2 text-right font-mono">{it.gstRate}%</td>
                    <td className="p-2 text-right font-mono font-bold">₹{parseFloat(it.total || '0').toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-slate-400">No items</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Lower Grid: Bank & Totals */}
          <div className="grid grid-cols-2 border-b-2 border-slate-800">
            <div className="p-3 border-r-2 border-slate-800 space-y-1 text-[11px] font-mono">
              {showBank && (
                <>
                  <div className="font-bold font-sans text-[10px] uppercase text-slate-700">Bank Details for Wire Transfer:</div>
                  <div>Bank Name: {bankName}</div>
                  <div>A/C Number: {accountNumber}</div>
                  <div>IFSC Code: {ifscCode}</div>
                  <div>UPI ID: {upiId}</div>
                </>
              )}
            </div>

            <div className="p-3 font-mono text-xs space-y-1 text-right">
              <div className="flex justify-between">
                <span>Total Taxable:</span>
                <span>₹{parseFloat(invoice.subtotal || '0').toFixed(2)}</span>
              </div>
              {invoice.isInterstate ? (
                <div className="flex justify-between">
                  <span>IGST Total:</span>
                  <span>₹{parseFloat(invoice.igstTotal || '0').toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>CGST Total:</span>
                    <span>₹{parseFloat(invoice.cgstTotal || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST Total:</span>
                    <span>₹{parseFloat(invoice.sgstTotal || '0').toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-800">
                <span>Grand Total:</span>
                <span>₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Classic Bottom Signatory */}
          <div className="grid grid-cols-2 p-3 text-[10px]">
            <div>
              {showTerms && (
                <>
                  <p className="font-bold">Terms of Sale:</p>
                  <p className="whitespace-pre-line text-slate-600">{defaultTerms}</p>
                </>
              )}
            </div>
            {showSignatory && (
              <div className="text-right">
                {signatureUrl ? (
                  <div className="mb-1 flex justify-end">
                    <img
                      src={signatureUrl}
                      alt="Authorized Signatory"
                      referrerPolicy="no-referrer"
                      className="h-12 max-w-[160px] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-10"></div>
                )}
                <p className="font-bold">For {businessName}</p>
                <p>{signatoryLabel}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. COMPACT / TALLY DENSE LEDGER TEMPLATE */}
      {/* ========================================================================= */}
      {template === 'compact' && (
        <div className="p-4 border border-slate-400 font-mono text-[11px] space-y-3">
          <div className="flex justify-between border-b pb-2">
            <div>
              <div className="font-bold text-sm text-slate-900">{businessName}</div>
              <div className="text-slate-600 text-[10px]">{address}</div>
              <div className="text-[10px]">GSTIN: {gstin} | State: {stateName} ({stateCode})</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xs uppercase">{getVoucherTitle()}</div>
              <div>Voucher No: <strong>{invoice.invoiceNumber}</strong></div>
              <div>Date: {invoice.invoiceDate}</div>
            </div>
          </div>

          <div className="border-b pb-2 flex justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500">Party / Buyer:</span>
              <div className="font-bold text-slate-900">{invoice.partyName}</div>
              <div className="text-[10px]">GSTIN: {invoice.partyGstin || 'Unregistered'}</div>
            </div>
            <div className="text-right text-[10px]">
              <div>POS: State {invoice.placeOfSupply}</div>
              <div>Reverse Charge: {invoice.saleType === 'rcm' ? 'YES' : 'NO'}</div>
            </div>
          </div>

          {/* Dense Items Table */}
          <table className="w-full border-collapse text-left text-[10px]">
            <thead className="bg-slate-100 border-y border-slate-400 uppercase">
              <tr>
                <th className="p-1">#</th>
                <th className="p-1">Particulars</th>
                <th className="p-1 text-center">HSN</th>
                <th className="p-1 text-right">Qty</th>
                <th className="p-1 text-right">Rate</th>
                <th className="p-1 text-right">Taxable</th>
                <th className="p-1 text-right">GST</th>
                <th className="p-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items &&
                invoice.items.map((it, i) => (
                  <tr key={i}>
                    <td className="p-1">{i + 1}</td>
                    <td className="p-1 font-semibold">{it.itemName}</td>
                    <td className="p-1 text-center">{it.hsnCode}</td>
                    <td className="p-1 text-right">{it.quantity} {it.unit}</td>
                    <td className="p-1 text-right">{it.rate}</td>
                    <td className="p-1 text-right">{it.taxableValue}</td>
                    <td className="p-1 text-right">{it.gstRate}%</td>
                    <td className="p-1 text-right font-bold">{it.total}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Compact Totals & Bank & Signatory */}
          <div className="flex justify-between border-t border-slate-400 pt-2 text-[10px]">
            <div className="max-w-xs space-y-0.5">
              {showBank && (
                <div>Bank: {bankName} | A/C: {accountNumber} | IFSC: {ifscCode}</div>
              )}
              {showTerms && <div className="text-slate-500">{defaultNotes}</div>}
            </div>
            <div className="text-right space-y-0.5">
              <div className="font-bold">Subtotal: ₹{parseFloat(invoice.subtotal || '0').toFixed(2)}</div>
              <div className="font-bold">Tax Total: ₹{parseFloat(invoice.taxTotal || '0').toFixed(2)}</div>
              <div className="text-xs pt-1 border-t font-bold">Total: ₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}</div>
              {showSignatory && (
                <div className="pt-2 text-right">
                  {signatureUrl && (
                    <div className="flex justify-end mb-0.5">
                      <img
                        src={signatureUrl}
                        alt="Authorized Signatory"
                        referrerPolicy="no-referrer"
                        className="h-9 max-w-[130px] object-contain"
                      />
                    </div>
                  )}
                  <div className="font-bold">For {businessName}</div>
                  <div className="text-slate-500 text-[9px]">{signatoryLabel}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MINIMALIST MONOCHROME */}
      {/* ========================================================================= */}
      {template === 'minimal' && (
        <div className="p-8 space-y-8 text-slate-900">
          <div className="flex justify-between items-baseline border-b border-slate-900 pb-4">
            <div>
              <h1 className="text-2xl font-light tracking-tight">{businessName}</h1>
              <p className="text-slate-500 text-xs mt-1">{address}</p>
            </div>
            <div className="text-right">
              <span className="text-xs tracking-widest uppercase font-bold text-slate-900">
                {getVoucherTitle()}
              </span>
              <div className="font-mono text-xs mt-1">#{invoice.invoiceNumber}</div>
              <div className="text-slate-500 text-xs">{invoice.invoiceDate}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-1">
                Issued To
              </span>
              <div className="font-semibold text-sm">{invoice.partyName}</div>
              <div className="font-mono text-slate-600 mt-0.5">{invoice.partyGstin || 'Consumer'}</div>
            </div>
            <div className="text-right font-mono text-xs space-y-0.5">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-1">
                Supplier Registration
              </span>
              <div>GSTIN: {gstin}</div>
              <div>State: {stateName}</div>
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-900 text-[10px] uppercase tracking-wider text-slate-500 font-normal">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2 text-center">HSN</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items &&
                invoice.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-3 font-medium">{it.itemName}</td>
                    <td className="py-3 text-center font-mono text-slate-500">{it.hsnCode}</td>
                    <td className="py-3 text-right font-mono">{it.quantity} {it.unit}</td>
                    <td className="py-3 text-right font-mono">₹{parseFloat(it.rate || '0').toFixed(2)}</td>
                    <td className="py-3 text-right font-mono font-semibold">₹{parseFloat(it.total || '0').toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="flex justify-between items-end pt-4 border-t border-slate-900">
            <div className="text-[11px] text-slate-500 space-y-1">
              {showBank && <div>Payment: {bankName} (A/C: {accountNumber} • IFSC: {ifscCode})</div>}
              {showTerms && <div className="text-[10px]">{defaultTerms}</div>}
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs text-slate-500">Taxable: ₹{parseFloat(invoice.subtotal || '0').toFixed(2)}</div>
              <div className="text-xs text-slate-500">GST: ₹{parseFloat(invoice.taxTotal || '0').toFixed(2)}</div>
              <div className="text-lg font-light text-slate-900 pt-1">
                Total ₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}
              </div>
              {showSignatory && (
                <div className="pt-3 text-right">
                  {signatureUrl && (
                    <div className="flex justify-end mb-1">
                      <img
                        src={signatureUrl}
                        alt="Authorized Signatory"
                        referrerPolicy="no-referrer"
                        className="h-10 max-w-[140px] object-contain"
                      />
                    </div>
                  )}
                  <div className="text-xs font-medium text-slate-800">For {businessName}</div>
                  <div className="text-[10px] text-slate-500">{signatoryLabel}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CORPORATE EXECUTIVE TEMPLATE (Header Banner & Dual Signatory) */}
      {/* ========================================================================= */}
      {template === 'corporate' && (
        <div className="p-0 border border-slate-200 shadow-sm bg-white overflow-hidden">
          {/* Top Full-Width Color Banner */}
          <div style={{ backgroundColor: color.hex }} className="p-6 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                {showLogo && (
                  <div className="bg-white/15 backdrop-blur-xs p-2 rounded-xl border border-white/20">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={businessName}
                        className="w-14 h-14 object-contain rounded-lg bg-white p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center font-bold text-xl shadow-inner" style={{ color: color.hex }}>
                        {businessName.charAt(0) || 'C'}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">{businessName}</h1>
                  <p className="text-xs text-white/80 max-w-md mt-0.5 leading-relaxed">{address}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/90 font-mono">
                    <span>GSTIN: <strong>{gstin}</strong></span>
                    <span>State: {stateName} ({stateCode})</span>
                    {phone && <span>Tel: {phone}</span>}
                  </div>
                </div>
              </div>

              <div className="sm:text-right bg-black/20 p-3.5 rounded-xl border border-white/10 backdrop-blur-xs min-w-[200px]">
                <div className="text-xs uppercase tracking-widest font-bold text-white/90">
                  {getVoucherTitle()}
                </div>
                <div className="text-[10px] text-white/70 uppercase tracking-wider mt-0.5">
                  {subtitle}
                </div>
                <div className="mt-2 text-sm font-mono font-bold text-white">
                  #{invoice.invoiceNumber}
                </div>
                <div className="text-[11px] font-mono text-white/80 mt-0.5">
                  Date: {invoice.invoiceDate}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Seller & Buyer Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Consignor / Seller Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span>Billed By (Consignor)</span>
                  <span className="font-mono text-slate-700">PAN: {gstin ? gstin.slice(2, 12) : '—'}</span>
                </div>
                <div className="text-xs font-bold text-slate-900">{businessName}</div>
                <div className="text-slate-600 text-[11px] leading-relaxed">{address}</div>
                <div className="text-[11px] font-mono text-slate-700 pt-1 space-y-0.5">
                  <div>GSTIN: <strong>{gstin}</strong></div>
                  <div>State / Code: {stateName} - {stateCode}</div>
                </div>
              </div>

              {/* Consignee / Buyer Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200 flex items-center justify-between">
                  <span>Billed To (Consignee / Buyer)</span>
                  {invoice.dueDate && <span className="text-amber-700 font-semibold">Due: {invoice.dueDate}</span>}
                </div>
                <div className="text-xs font-bold text-slate-900">{invoice.partyName || 'Cash Customer'}</div>
                <div className="text-slate-600 text-[11px] leading-relaxed">
                  {invoice.partyAddress || 'Local State Address'}
                </div>
                <div className="text-[11px] font-mono text-slate-700 pt-1 space-y-0.5">
                  <div>GSTIN: <strong>{invoice.partyGstin || 'Unregistered Consumer (B2C)'}</strong></div>
                  <div>State / POS: {invoice.partyStateName || stateName} (Code: {invoice.partyStateCode || stateCode})</div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead style={{ backgroundColor: color.hex }} className="text-white uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-center w-10">#</th>
                    <th className="py-2.5 px-3 font-semibold">Description of Goods & Services</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-24">HSN/SAC</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-20">Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-24">Rate (₹)</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-24">Taxable (₹)</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-20">GST</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-28">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((it, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                          {it.itemName}
                          {it.isTaxInclusive && (
                            <span className="ml-1 text-[9px] px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded font-normal">
                              Incl
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{it.hsnCode || '—'}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{it.quantity} {it.unit}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">₹{parseFloat(it.rate || '0').toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">₹{parseFloat(it.taxableValue || '0').toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">{it.gstRate}%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{parseFloat(it.total || '0').toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 font-sans">No items available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* HSN Summary (if enabled) */}
            {showHsnSummary && invoice.items && invoice.items.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30">
                <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: color.hex }} />
                  <span>GST Tax Breakdown by HSN / SAC Code</span>
                </div>
                <table className="w-full text-[10px] font-mono text-left">
                  <thead className="text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-1">HSN/SAC</th>
                      <th className="py-1 text-right">Taxable Val</th>
                      <th className="py-1 text-right">CGST</th>
                      <th className="py-1 text-right">SGST</th>
                      <th className="py-1 text-right">IGST</th>
                      <th className="py-1 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {Array.from(new Set(invoice.items.map((i) => i.hsnCode || 'General'))).map((hsn, idx) => {
                      const hsnItems = invoice.items.filter((i) => (i.hsnCode || 'General') === hsn);
                      const taxVal = hsnItems.reduce((acc, i) => acc + parseFloat(i.taxableValue || '0'), 0);
                      const isInter = (invoice.partyStateCode || stateCode) !== stateCode;
                      const gstTotal = hsnItems.reduce((acc, i) => acc + parseFloat(i.taxAmount || '0'), 0);
                      return (
                        <tr key={idx}>
                          <td className="py-1 font-semibold text-slate-900">{hsn}</td>
                          <td className="py-1 text-right">₹{taxVal.toFixed(2)}</td>
                          <td className="py-1 text-right">{!isInter ? `₹${(gstTotal / 2).toFixed(2)}` : '—'}</td>
                          <td className="py-1 text-right">{!isInter ? `₹${(gstTotal / 2).toFixed(2)}` : '—'}</td>
                          <td className="py-1 text-right">{isInter ? `₹${gstTotal.toFixed(2)}` : '—'}</td>
                          <td className="py-1 text-right font-bold text-slate-900">₹{gstTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Grid: Words & Settlement (Left) + Totals (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Words & Payment Info */}
              <div className="md:col-span-7 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                    Amount in Words (INR):
                  </div>
                  <div className="text-xs font-semibold text-slate-900 italic">
                    {numberToWordsINR(parseFloat(invoice.grandTotal || '0'))}
                  </div>
                </div>

                {showBank && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5" style={{ color: color.hex }} />
                        Bank Settlement Details
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        Verified Account
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
                      <div>Bank: <strong className="text-slate-900">{bankName}</strong></div>
                      <div>A/C: <strong className="text-slate-900">{accountNumber}</strong></div>
                      <div>IFSC: <strong className="text-slate-900">{ifscCode}</strong></div>
                      <div>UPI ID: <strong className="text-slate-900">{upiId}</strong></div>
                    </div>
                  </div>
                )}

                {showTerms && (
                  <div className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed border-l-2 pl-3 border-slate-300">
                    <span className="font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                      Terms & Conditions:
                    </span>
                    {defaultTerms}
                  </div>
                )}
              </div>

              {/* Right Column: Totals & QR Code */}
              <div className="md:col-span-5 space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal</span>
                    <span className="font-mono">₹{parseFloat(invoice.subtotal || '0').toFixed(2)}</span>
                  </div>

                  {(invoice.partyStateCode || stateCode) === stateCode ? (
                    <>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>CGST (Central Tax)</span>
                        <span className="font-mono">₹{parseFloat(invoice.cgstTotal || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>SGST (State Tax)</span>
                        <span className="font-mono">₹{parseFloat(invoice.sgstTotal || '0').toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>IGST (Integrated Tax)</span>
                      <span className="font-mono">₹{parseFloat(invoice.igstTotal || '0').toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-sm">Grand Total (INR)</span>
                    <span className="text-lg font-mono font-bold" style={{ color: color.hex }}>
                      ₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}
                    </span>
                  </div>
                </div>

                {showUpiQr && upiId && (
                  <div className="p-3 border border-slate-200 rounded-xl bg-white flex items-center gap-3">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200 p-0.5"
                    />
                    <div className="text-[11px] leading-tight text-slate-600">
                      <div className="font-bold text-slate-900 text-xs">Scan & Pay via UPI</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{upiId}</div>
                      <div className="text-[9px] text-emerald-700 mt-1 font-medium">Instant Bank Settlement</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dual Signatures */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-center text-xs">
              <div className="w-56 pt-10 border-t border-slate-300 text-slate-500 text-[11px]">
                Customer's Acceptance & Seal
              </div>
              {showSignatory && (
                <div className="w-64 pt-4 border-t border-slate-300 text-slate-700 text-[11px] flex flex-col items-center">
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Authorized Signatory"
                      referrerPolicy="no-referrer"
                      className="h-11 max-w-[150px] object-contain mb-1"
                    />
                  ) : (
                    <div className="h-6"></div>
                  )}
                  <div className="font-bold text-slate-900">For {businessName}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{signatoryLabel}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STYLISH PRESTIGE SIDEBAR TEMPLATE (Modern SaaS / Split Layout) */}
      {/* ========================================================================= */}
      {template === 'stylish' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white flex flex-col md:flex-row">
          {/* Left Dark / Tinted Accent Sidebar */}
          <div className="w-full md:w-72 bg-slate-900 text-white p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {showLogo && (
                <div>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={businessName}
                      className="w-14 h-14 object-contain rounded-xl bg-white p-1"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg"
                      style={{ backgroundColor: color.hex }}
                    >
                      {businessName.charAt(0) || 'S'}
                    </div>
                  )}
                </div>
              )}

              <div>
                <h2 className="text-base font-bold text-white tracking-tight">{businessName}</h2>
                <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>GST Registered Supplier</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{address}</p>
                <div className="mt-2 text-[10px] font-mono text-slate-300 space-y-0.5">
                  <div>GSTIN: <span className="font-bold text-white">{gstin}</span></div>
                  <div>State: {stateName} ({stateCode})</div>
                </div>
              </div>

              {/* Payment Details in Sidebar */}
              {showBank && (
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2 text-[11px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Landmark className="w-3 h-3 text-white" />
                    <span>Bank Account</span>
                  </div>
                  <div className="space-y-1 font-mono text-[10px] text-slate-300">
                    <div className="text-white font-bold">{bankName}</div>
                    <div>A/C: {accountNumber}</div>
                    <div>IFSC: {ifscCode}</div>
                    {upiId && <div>UPI: {upiId}</div>}
                  </div>
                </div>
              )}

              {/* UPI QR in Sidebar */}
              {showUpiQr && upiId && (
                <div className="p-3 rounded-xl bg-white text-slate-900 flex items-center gap-3 shadow-md">
                  <img src={qrCodeUrl} alt="UPI QR" className="w-14 h-14 object-contain" />
                  <div className="text-[10px] leading-tight">
                    <div className="font-bold text-slate-900">Scan & Pay</div>
                    <div className="text-slate-500 font-mono text-[9px] truncate max-w-[100px]">{upiId}</div>
                    <div className="text-emerald-700 font-bold text-[9px] mt-1">Instant Settlement</div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-4">
              Generated via Tally GST Cloud
            </div>
          </div>

          {/* Right Main Content Canvas */}
          <div className="flex-1 p-6 md:p-8 space-y-6">
            {/* Header & Status */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wider uppercase mb-1"
                  style={{ backgroundColor: color.hex }}
                >
                  {getVoucherTitle()}
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {invoice.invoiceNumber}
                </h1>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Invoice Date: <strong className="text-slate-800">{invoice.invoiceDate}</strong>
                  {invoice.dueDate && (
                    <span className="ml-3">Due: <strong className="text-amber-700">{invoice.dueDate}</strong></span>
                  )}
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                  Place of Supply
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800 text-xs inline-block">
                  {invoice.partyStateName || stateName} ({invoice.partyStateCode || stateCode})
                </span>
              </div>
            </div>

            {/* Billed To Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Customer / Bill To
              </span>
              <div className="text-sm font-bold text-slate-900">{invoice.partyName || 'Cash Sale / Walk-in Customer'}</div>
              <div className="text-xs text-slate-600 leading-relaxed">{invoice.partyAddress || 'State jurisdiction'}</div>
              <div className="text-[11px] font-mono text-slate-700 pt-1">
                GSTIN: <strong>{invoice.partyGstin || 'Unregistered'}</strong>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="pb-2">Item Details</th>
                    <th className="pb-2 text-center">HSN</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Taxable</th>
                    <th className="pb-2 text-right">GST</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 font-sans font-medium text-slate-900">
                          {it.itemName}
                        </td>
                        <td className="py-3 text-center text-slate-500">{it.hsnCode || '—'}</td>
                        <td className="py-3 text-right text-slate-700">{it.quantity} {it.unit}</td>
                        <td className="py-3 text-right text-slate-700">₹{parseFloat(it.rate || '0').toFixed(2)}</td>
                        <td className="py-3 text-right text-slate-700">₹{parseFloat(it.taxableValue || '0').toFixed(2)}</td>
                        <td className="py-3 text-right text-slate-700">{it.gstRate}%</td>
                        <td className="py-3 text-right font-bold text-slate-900">₹{parseFloat(it.total || '0').toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400 font-sans">No items entered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t border-slate-200">
              <div className="space-y-2 text-[11px] text-slate-500 max-w-sm">
                <div>
                  <span className="font-semibold text-slate-700">In Words: </span>
                  <span className="italic">{numberToWordsINR(parseFloat(invoice.grandTotal || '0'))}</span>
                </div>
                {showTerms && <div className="text-[10px]">{defaultTerms}</div>}
              </div>

              <div className="w-full sm:w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Amount</span>
                  <span className="font-mono">₹{parseFloat(invoice.subtotal || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Taxes</span>
                  <span className="font-mono">₹{parseFloat(invoice.taxTotal || '0').toFixed(2)}</span>
                </div>
                <div
                  className="p-3 rounded-xl text-white flex justify-between items-baseline font-bold"
                  style={{ backgroundColor: color.hex }}
                >
                  <span className="text-xs uppercase tracking-wider">Total Payable</span>
                  <span className="text-base font-mono">₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}</span>
                </div>
              </div>
            </div>

            {showSignatory && (
              <div className="text-right pt-6 border-t border-slate-100">
                {signatureUrl && (
                  <div className="mb-1 flex justify-end">
                    <img
                      src={signatureUrl}
                      alt="Authorized Signatory"
                      referrerPolicy="no-referrer"
                      className="h-11 max-w-[150px] object-contain"
                    />
                  </div>
                )}
                <div className="text-xs font-bold text-slate-900">For {businessName}</div>
                <div className="text-[10px] text-slate-400 mt-1">{signatoryLabel}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. THERMAL POS RETAIL CASH MEMO TEMPLATE (80mm Slip) */}
      {/* ========================================================================= */}
      {template === 'thermal' && (
        <div className="max-w-[420px] mx-auto bg-white p-6 font-mono text-[11px] leading-tight border border-dashed border-slate-300 shadow-sm space-y-4">
          {/* Centered Receipt Header */}
          <div className="text-center space-y-1">
            {showLogo && logoUrl && (
              <img src={logoUrl} alt={businessName} className="w-12 h-12 object-contain mx-auto mb-1" />
            )}
            <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">{businessName}</h1>
            <p className="text-[10px] text-slate-600 max-w-xs mx-auto leading-relaxed">{address}</p>
            <div className="text-[10px] text-slate-800 space-y-0.5 pt-1">
              <div>GSTIN: <strong className="font-bold">{gstin}</strong></div>
              <div>State: {stateName} ({stateCode}) {phone && `• Tel: ${phone}`}</div>
            </div>
            <div className="pt-2 text-xs font-bold uppercase tracking-widest text-slate-900 border-y border-dashed border-slate-400 py-1 my-2">
              *** {getVoucherTitle()} ***
            </div>
          </div>

          {/* Receipt Metadata */}
          <div className="space-y-0.5 text-[10px] border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span>Bill No: <strong>{invoice.invoiceNumber}</strong></span>
              <span>Date: {invoice.invoiceDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer: <strong>{invoice.partyName || 'Walk-in Cash Customer'}</strong></span>
              <span>Pos: 01</span>
            </div>
            {invoice.partyGstin && (
              <div>Cust GSTIN: {invoice.partyGstin}</div>
            )}
          </div>

          {/* Line Items Table (Dense Monospace) */}
          <div className="space-y-2">
            <table className="w-full text-left text-[10px]">
              <thead className="border-b border-slate-900 uppercase">
                <tr>
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-200">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 font-bold text-slate-900">
                        {it.itemName}
                        <div className="text-[9px] text-slate-500 font-normal">HSN:{it.hsnCode || '—'} • GST:{it.gstRate}%</div>
                      </td>
                      <td className="py-1.5 text-center">{it.quantity}</td>
                      <td className="py-1.5 text-right">₹{parseFloat(it.rate || '0').toFixed(2)}</td>
                      <td className="py-1.5 text-right font-bold text-slate-900">₹{parseFloat(it.total || '0').toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-slate-400">No items</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Calculation Breakdown */}
          <div className="border-t-2 border-dashed border-slate-900 pt-2 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Total Items / Qty:</span>
              <span>
                {invoice.items?.length || 0} /{' '}
                {invoice.items?.reduce((acc, i) => acc + (parseFloat(String(i.quantity)) || 0), 0) || 0}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span>₹{parseFloat(invoice.subtotal || '0').toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST + SGST (or IGST):</span>
              <span>₹{parseFloat(invoice.taxTotal || '0').toFixed(2)}</span>
            </div>
            <div className="border-t border-b-2 border-slate-900 py-1.5 flex justify-between items-baseline font-black text-sm text-slate-900">
              <span>NET PAYABLE:</span>
              <span className="text-base">₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}</span>
            </div>
          </div>

          {/* Amount in words */}
          <div className="text-[10px] italic text-slate-600 text-center">
            {numberToWordsINR(parseFloat(invoice.grandTotal || '0'))}
          </div>

          {/* QR Code Scan To Pay */}
          {showUpiQr && upiId && (
            <div className="border border-dashed border-slate-300 p-2 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase">Scan & Pay (UPI)</div>
              <img src={qrCodeUrl} alt="UPI QR" className="w-20 h-20 mx-auto object-contain" />
              <div className="text-[9px] text-slate-500">{upiId}</div>
            </div>
          )}

          {/* Barcode representation */}
          <div className="text-center pt-2">
            <div className="flex justify-center items-end gap-0.5 h-8">
              {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 4, 1, 2].map((w, i) => (
                <div key={i} className="bg-slate-900 h-full" style={{ width: `${w * 1.5}px` }} />
              ))}
            </div>
            <div className="text-[9px] tracking-widest text-slate-600 mt-1">*{invoice.invoiceNumber}*</div>
          </div>

          {/* Thermal Footer */}
          <div className="text-center text-[10px] text-slate-500 space-y-1 pt-2 border-t border-dashed border-slate-300">
            <div className="font-bold text-slate-800">THANK YOU FOR YOUR VISIT!</div>
            <div>Exchange permitted within 7 days with bill.</div>
            <div className="text-[9px]">Goods once sold are not refundable.</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. INDUSTRIAL HEAVY MATRIX TEMPLATE (Manufacturing & Logistics Grid) */}
      {/* ========================================================================= */}
      {template === 'industrial' && (
        <div className="border-2 border-slate-900 bg-white p-0 text-slate-900">
          {/* Heavy Double Top Border Header */}
          <div className="border-b-2 border-slate-900 p-4 bg-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-xs uppercase font-mono font-bold tracking-widest text-slate-600">
                GST RULE 46 COMPLIANT TAX INVOICE
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">{businessName}</h1>
              <div className="text-xs text-slate-600">{address}</div>
            </div>
            <div className="sm:text-right border-l-2 sm:border-l sm:border-slate-300 pl-3 sm:pl-4 space-y-0.5 font-mono text-xs">
              <div className="text-sm font-bold text-slate-900">#{invoice.invoiceNumber}</div>
              <div>Date: <strong>{invoice.invoiceDate}</strong></div>
              <div>GSTIN: <strong className="font-bold">{gstin}</strong></div>
            </div>
          </div>

          {/* Transport, Vehicle & E-Way Bill Logistics Strip */}
          <div className="border-b-2 border-slate-900 grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-300 text-[10px] font-mono bg-slate-50">
            <div className="p-2 space-y-0.5">
              <span className="text-slate-400 uppercase tracking-wider block text-[9px]">Transport Mode</span>
              <strong className="text-slate-900">ROAD (SURFACE)</strong>
            </div>
            <div className="p-2 space-y-0.5">
              <span className="text-slate-400 uppercase tracking-wider block text-[9px]">Vehicle / LR No</span>
              <strong className="text-slate-900">MH-12-AB-9921</strong>
            </div>
            <div className="p-2 space-y-0.5">
              <span className="text-slate-400 uppercase tracking-wider block text-[9px]">E-Way Bill No</span>
              <strong className="text-slate-900">241098239102</strong>
            </div>
            <div className="p-2 space-y-0.5">
              <span className="text-slate-400 uppercase tracking-wider block text-[9px]">Place of Removal</span>
              <strong className="text-slate-900">{stateName} ({stateCode})</strong>
            </div>
          </div>

          {/* 3-Compartment Matrix: Consignor | Buyer (Bill To) | Consignee (Ship To) */}
          <div className="border-b-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 text-xs">
            <div className="p-3 space-y-1 bg-white">
              <div className="text-[10px] font-bold uppercase text-slate-500">1. Details of Consignor</div>
              <div className="font-bold text-slate-900">{businessName}</div>
              <div className="text-slate-600 text-[11px]">{address}</div>
              <div className="font-mono text-[11px] pt-1">GSTIN: {gstin}</div>
            </div>
            <div className="p-3 space-y-1 bg-white">
              <div className="text-[10px] font-bold uppercase text-slate-500">2. Details of Receiver (Bill To)</div>
              <div className="font-bold text-slate-900">{invoice.partyName || 'Cash Customer'}</div>
              <div className="text-slate-600 text-[11px]">{invoice.partyAddress || 'State address'}</div>
              <div className="font-mono text-[11px] pt-1">GSTIN: {invoice.partyGstin || 'Unregistered'}</div>
            </div>
            <div className="p-3 space-y-1 bg-white">
              <div className="text-[10px] font-bold uppercase text-slate-500">3. Details of Consignee (Ship To)</div>
              <div className="font-bold text-slate-900">{invoice.partyName || 'Same as Buyer'}</div>
              <div className="text-slate-600 text-[11px]">{invoice.partyAddress || 'Delivery at destination'}</div>
              <div className="font-mono text-[11px] pt-1">State: {invoice.partyStateName || stateName}</div>
            </div>
          </div>

          {/* Heavy Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-900 text-white uppercase text-[10px]">
                <tr className="divide-x divide-slate-700">
                  <th className="p-2 text-center w-10">Sr</th>
                  <th className="p-2 font-sans font-semibold">Description of Goods</th>
                  <th className="p-2 text-center">HSN/SAC</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Rate (₹)</th>
                  <th className="p-2 text-right">Taxable (₹)</th>
                  <th className="p-2 text-right">GST %</th>
                  <th className="p-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-[11px]">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((it, idx) => (
                    <tr key={idx} className="divide-x divide-slate-200 hover:bg-slate-50">
                      <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2 font-sans font-medium text-slate-900">{it.itemName}</td>
                      <td className="p-2 text-center text-slate-600">{it.hsnCode || '—'}</td>
                      <td className="p-2 text-right">{it.quantity} {it.unit}</td>
                      <td className="p-2 text-right">₹{parseFloat(it.rate || '0').toFixed(2)}</td>
                      <td className="p-2 text-right">₹{parseFloat(it.taxableValue || '0').toFixed(2)}</td>
                      <td className="p-2 text-right">{it.gstRate}%</td>
                      <td className="p-2 text-right font-bold text-slate-900">₹{parseFloat(it.total || '0').toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-slate-400 font-sans">No items available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Calculation & Compliance Matrix */}
          <div className="border-t-2 border-slate-900 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-900">
            <div className="md:col-span-7 p-4 space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Amount in Words:</span>
                <span className="text-xs font-bold text-slate-900 italic">
                  {numberToWordsINR(parseFloat(invoice.grandTotal || '0'))}
                </span>
              </div>

              {showBank && (
                <div className="p-2.5 bg-slate-50 border border-slate-300 rounded text-[11px] font-mono space-y-1">
                  <div className="font-bold text-slate-800 text-[10px] uppercase">Bank Account for Settlement</div>
                  <div>{bankName} • A/C: <strong>{accountNumber}</strong> • IFSC: <strong>{ifscCode}</strong></div>
                </div>
              )}

              {showTerms && (
                <div className="text-[10px] text-slate-600 leading-relaxed border-t border-slate-200 pt-2">
                  <strong>Industrial Conditions:</strong> Inspection to be completed within 48 hours of delivery. Interest @ 18% p.a. charged on delayed payments.
                </div>
              )}
            </div>

            <div className="md:col-span-5 p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span>₹{parseFloat(invoice.subtotal || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST Amount:</span>
                <span>₹{parseFloat(invoice.cgstTotal || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST Amount:</span>
                <span>₹{parseFloat(invoice.sgstTotal || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IGST Amount:</span>
                <span>₹{parseFloat(invoice.igstTotal || '0').toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline font-black text-sm text-slate-900">
                <span>NET TOTAL (INR):</span>
                <span className="text-base">₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Heavy Industrial Footer Signature Grid */}
          <div className="border-t-2 border-slate-900 grid grid-cols-2 divide-x divide-slate-900 text-center text-xs p-4 bg-slate-50">
            <div className="pt-8 text-slate-500 text-[11px]">
              Receiver's Signature & Material Inward Stamp
            </div>
            <div className="pt-4 text-slate-900 font-bold text-[11px] flex flex-col items-center">
              {signatureUrl && (
                <img
                  src={signatureUrl}
                  alt="Authorized Signatory"
                  referrerPolicy="no-referrer"
                  className="h-10 max-w-[140px] object-contain mb-1"
                />
              )}
              <div>For {businessName}</div>
              <div className="text-[10px] text-slate-500 font-normal">{signatoryLabel}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. GLOBAL EXPORT & SEZ TEMPLATE (LUT / Foreign Trade Invoicing) */}
      {/* ========================================================================= */}
      {template === 'export' && (
        <div className="border border-slate-300 rounded-xl bg-white shadow-sm overflow-hidden text-slate-900">
          {/* Statutory LUT Export Declaration Header Banner */}
          <div className="bg-slate-900 text-white p-4 text-center space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              GOVERNMENT OF INDIA • GOODS & SERVICES TAX DEPARTMENT
            </div>
            <h1 className="text-sm font-extrabold uppercase tracking-wide">
              {invoice.saleType === 'export_with_tax'
                ? 'SUPPLY MEANT FOR EXPORT ON PAYMENT OF INTEGRATED TAX'
                : 'SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF UNDERTAKING (LUT) WITHOUT PAYMENT OF INTEGRATED TAX'}
            </h1>
            <div className="text-[10px] text-slate-300 font-mono">
              Statutory Export Invoice under Section 16 of the IGST Act, 2017 & Rule 46(i) of CGST Rules
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Exporter & Invoice Meta */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="text-lg font-bold text-slate-900">{businessName}</div>
                <div className="text-xs text-slate-600 max-w-sm">{address}</div>
                <div className="text-xs font-mono text-slate-700 pt-1">
                  <span>GSTIN: <strong>{gstin}</strong></span> • <span>IEC Code: <strong>0319284710</strong></span>
                </div>
              </div>

              <div className="sm:text-right bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-xs space-y-1 min-w-[220px]">
                <div>Invoice No: <strong className="text-slate-900">{invoice.invoiceNumber}</strong></div>
                <div>Invoice Date: <strong>{invoice.invoiceDate}</strong></div>
                <div>LUT/ARN No: <strong>AD270324001928K</strong></div>
                <div>LUT Date: <strong>01-Apr-2026</strong></div>
              </div>
            </div>

            {/* Foreign Trade Logistics Compartment */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Port of Loading</span>
                <strong className="text-slate-900">Nhava Sheva (INNSA1)</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Port of Discharge</span>
                <strong className="text-slate-900">Port of Singapore (SGSIN)</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Final Destination</span>
                <strong className="text-slate-900">Singapore</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Delivery Terms</span>
                <strong className="text-slate-900">CIF / Sea Freight</strong>
              </div>
            </div>

            {/* Consignee (Buyer Overseas) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Overseas Buyer / Consignee (Bill To & Ship To)
              </div>
              <div className="text-sm font-bold text-slate-900">{invoice.partyName || 'Global Trading Pte Ltd'}</div>
              <div className="text-xs text-slate-600 leading-relaxed">
                {invoice.partyAddress || '8 Marina Boulevard, Marina Bay Financial Centre, Singapore 018981'}
              </div>
              <div className="text-xs font-mono text-slate-700">Country of Destination: Foreign / Non-Taxable Territory</div>
            </div>

            {/* Export Items Table with Currency Equivalent */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead style={{ backgroundColor: color.hex }} className="text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 text-center">#</th>
                    <th className="p-2.5">Export Commodity Description</th>
                    <th className="p-2.5 text-center">HSN/ITC-HS</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Rate (INR)</th>
                    <th className="p-2.5 text-right">Taxable (INR)</th>
                    <th className="p-2.5 text-right">IGST %</th>
                    <th className="p-2.5 text-right">Total (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-sans font-medium text-slate-900">{it.itemName}</td>
                        <td className="p-2.5 text-center text-slate-600">{it.hsnCode || '—'}</td>
                        <td className="p-2.5 text-right">{it.quantity} {it.unit}</td>
                        <td className="p-2.5 text-right">₹{parseFloat(it.rate || '0').toFixed(2)}</td>
                        <td className="p-2.5 text-right">₹{parseFloat(it.taxableValue || '0').toFixed(2)}</td>
                        <td className="p-2.5 text-right">{invoice.saleType === 'export_with_tax' ? `${it.gstRate}%` : '0% (LUT)'}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{parseFloat(it.total || '0').toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-slate-400 font-sans">No export items available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals & Export Certification Declaration */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-7 space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Total FOB/CIF Value in Words:</div>
                  <div className="text-xs font-bold text-slate-900 italic">
                    {numberToWordsINR(parseFloat(invoice.grandTotal || '0'))}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-[11px] text-emerald-950 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Statutory Export Compliance Certificate
                  </div>
                  <div>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Export undertaken under Letter of Undertaking in terms of Circular No. 125/44/2019-GST.
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Total Taxable Value</span>
                  <span>₹{parseFloat(invoice.subtotal || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Integrated Tax (IGST)</span>
                  <span>{invoice.saleType === 'export_with_tax' ? `₹${parseFloat(invoice.igstTotal || '0').toFixed(2)}` : 'Nil (Under LUT)'}</span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline font-bold text-sm text-slate-900">
                  <span>Total Invoice Value:</span>
                  <span className="text-base" style={{ color: color.hex }}>₹{parseFloat(invoice.grandTotal || '0').toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-slate-500 text-right pt-1">
                  Approx. USD Equivalent: ${(parseFloat(invoice.grandTotal || '0') / 87).toFixed(2)} @ 87.00
                </div>
              </div>
            </div>

            {/* Authorized Signatory for Exporter */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
              <div className="text-xs text-slate-500">
                AD Code: 0291823 • Swift / BIC: HDFCINBBXXX
              </div>
              <div className="text-right text-xs">
                {signatureUrl && (
                  <div className="mb-1 flex justify-end">
                    <img
                      src={signatureUrl}
                      alt="Authorized Signatory"
                      referrerPolicy="no-referrer"
                      className="h-12 max-w-[160px] object-contain"
                    />
                  </div>
                )}
                <div className="font-bold text-slate-900">For {businessName}</div>
                <div className="text-[10px] text-slate-500 mt-1">{signatoryLabel} (Authorized Signatory)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
