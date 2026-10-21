export interface UpiPaymentParams {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNumber?: string;
  transactionNote?: string;
}

/**
 * Validates a standard NPCI UPI ID (VPA) format: handle@bank
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId) return false;
  const trimmed = upiId.trim();
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(trimmed);
}

/**
 * Generates a standard NPCI-compliant UPI Deep Link URI (`upi://pay?...`)
 * based on the company's UPI ID, payee business name, and exact payable amount.
 */
export function buildUpiPaymentUri({
  upiId,
  payeeName,
  amount,
  invoiceNumber,
  transactionNote,
}: UpiPaymentParams): string {
  const cleanUpiId = (upiId || '').trim();
  const cleanName = (payeeName || 'Merchant').trim();
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const note =
    transactionNote?.trim() ||
    (invoiceNumber ? `Invoice ${invoiceNumber.trim()}` : 'Invoice Payment');

  const params = new URLSearchParams();
  params.set('pa', cleanUpiId);
  params.set('pn', cleanName);
  if (safeAmount > 0) {
    params.set('am', safeAmount.toFixed(2));
  }
  params.set('cu', 'INR');
  params.set('tn', note);

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates a high-contrast QR Code image URL for a given UPI payment configuration.
 */
export function getUpiQrCodeImageUrl(
  params: UpiPaymentParams,
  size: number = 220
): string {
  const upiUri = buildUpiPaymentUri(params);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&ecc=M&data=${encodeURIComponent(
    upiUri
  )}`;
}
