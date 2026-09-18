// src/components/SubscriptionReceiptModal.tsx
import React, { useRef } from 'react';
import { SubscriptionInvoice, Workspace } from '../types';
import { X, Printer, Download, CheckCircle, ShieldCheck, Building2, Calendar, CreditCard } from 'lucide-react';
import { formatINR, getPlanConfig } from '../data/subscriptionPlans';

interface SubscriptionReceiptModalProps {
  invoice: SubscriptionInvoice | null;
  workspace: Workspace | null;
  onClose: () => void;
}

export const SubscriptionReceiptModal: React.FC<SubscriptionReceiptModalProps> = ({
  invoice,
  workspace,
  onClose,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const invName = localStorage.getItem('platform_invoice_name') || 'Apex Cloud Technologies';
  const invGstin = localStorage.getItem('platform_invoice_gstin') || '27AAECB9382M1ZR';
  const invPan = localStorage.getItem('platform_invoice_pan') || 'AAECB9382M';
  const invSac = localStorage.getItem('platform_invoice_sac') || '998315';
  const invAddress = localStorage.getItem('platform_invoice_address') || 'BKC, Bandra East, Mumbai, MH - 400051';
  const invBank = localStorage.getItem('platform_invoice_bank') || 'HDFC Bank, A/C 50200012345678, IFSC HDFC0000001';
  const invTagline = localStorage.getItem('platform_app_tagline') || 'Cloud Accounting & GST Solutions (SaaS)';
  const invLogo = localStorage.getItem('platform_app_logo') || '';
  const invStateCode = localStorage.getItem('platform_invoice_state_code') || '27';
  const invStateName = localStorage.getItem('platform_invoice_state_name') || 'Maharashtra';

  const planConfig = getPlanConfig(invoice.plan);
  const isIntraState = !workspace?.stateCode || workspace?.stateCode === invStateCode;
  const cgst = isIntraState ? Math.round(invoice.taxAmount / 2) : 0;
  const sgst = isIntraState ? Math.round(invoice.taxAmount / 2) : 0;
  const igst = !isIntraState ? invoice.taxAmount : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Tax Invoice / Subscription Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div ref={printableRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-200 text-xs bg-slate-900">
          {/* Top Brand & Invoice Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                {invLogo ? (
                  <img src={invLogo} alt="Logo" className="w-6 h-6 object-contain rounded bg-slate-950 border border-slate-800" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                )}
                <span className="text-base font-bold text-white tracking-tight">{invName}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{invTagline}</p>
              <p className="text-[11px] text-slate-400">
                GSTIN: <span className="font-mono text-slate-300">{invGstin}</span> | PAN: <span className="font-mono text-slate-300">{invPan}</span> | SAC: <span className="font-mono text-slate-300">{invSac}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {invAddress} | <span className="text-indigo-300 font-medium">State: {invStateName} ({invStateCode})</span>
              </p>
              <p className="text-[11px] text-indigo-300 font-mono mt-0.5">Bank Details: {invBank}</p>
            </div>
            <div className="sm:text-right">
              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                PAID & VERIFIED
              </span>
              <h2 className="text-lg font-bold text-white">{invoice.invoiceNumber}</h2>
              <p className="text-[11px] text-slate-400">
                Date: {new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Billed To / Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Billed To (Customer Workspace)</span>
              <p className="text-sm font-bold text-white mt-1">{workspace?.businessName || workspace?.name || 'Workspace Customer'}</p>
              <p className="text-slate-300 mt-0.5">{workspace?.tradeName || ''}</p>
              <p className="text-slate-400 mt-0.5 font-mono text-[11px]">GSTIN: {workspace?.gstin || 'Unregistered'}</p>
              <p className="text-slate-400 mt-0.5">{workspace?.address || 'India'}</p>
            </div>
            <div className="sm:text-right flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Subscription Validity</span>
                <p className="text-slate-200 font-medium mt-1">
                  {new Date(invoice.periodStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} -{' '}
                  {new Date(invoice.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="mt-3 sm:mt-0">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Payment Details</span>
                <p className="text-slate-300 mt-0.5 font-medium">Method: {invoice.paymentMethod}</p>
                <p className="text-slate-400 font-mono text-[11px]">Ref: {invoice.transactionReference || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Line Item Table */}
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-3 text-center">SAC</th>
                  <th className="py-3 px-3 text-center">Cycle</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                <tr>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-white">{planConfig.name} Subscription</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{planConfig.tagline}</p>
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-400 font-mono">998315</td>
                  <td className="py-3.5 px-3 text-center capitalize text-slate-300">{invoice.billingCycle}</td>
                  <td className="py-3.5 px-4 text-right text-white font-mono">{formatINR(invoice.baseAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Grand Total */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="text-[11px] text-slate-400 max-w-xs space-y-1">
              <p className="font-medium text-slate-300">Terms of Cloud Service:</p>
              <p>This is a computer-generated GST tax invoice for cloud software access. Input tax credit is available as per GST rules.</p>
            </div>

            <div className="w-full sm:w-64 space-y-2 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Taxable Amount:</span>
                <span className="font-mono text-slate-200">{formatINR(invoice.baseAmount)}</span>
              </div>

              {isIntraState ? (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>CGST (9%):</span>
                    <span className="font-mono text-slate-200">{formatINR(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SGST (9%):</span>
                    <span className="font-mono text-slate-200">{formatINR(sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-400">
                  <span>IGST (18%):</span>
                  <span className="font-mono text-slate-200">{formatINR(igst)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline font-bold text-sm">
                <span className="text-white">Total Paid:</span>
                <span className="font-mono text-emerald-400 text-base">{formatINR(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-400 text-center flex items-center justify-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authorized Electronic Receipt • Apex GST Accounting Cloud Infrastructure</span>
          </div>
        </div>
      </div>
    </div>
  );
};
