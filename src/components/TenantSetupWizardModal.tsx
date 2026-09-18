// src/components/TenantSetupWizardModal.tsx
import React, { useState, useEffect } from 'react';
import { Workspace, CompanyProfile } from '../types';
import {
  CheckCircle2,
  Building2,
  CreditCard,
  Hash,
  ArrowRight,
  ArrowLeft,
  Save,
  X,
  Sparkles,
  QrCode,
  ShieldCheck,
  FileText,
  Calendar,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react';
import { updateWorkspace } from '../db/workspaces';
import { saveCompanyProfile } from '../db/dataService';
import { ALL_INDIAN_STATES } from './CompanySettingsView';

interface TenantSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  companyProfile: CompanyProfile | null;
  onCompleted: (updatedWorkspace: Workspace, updatedCompany: CompanyProfile) => void;
}

export const TenantSetupWizardModal: React.FC<TenantSetupWizardModalProps> = ({
  isOpen,
  onClose,
  workspace,
  companyProfile,
  onCompleted,
}) => {
  if (!isOpen || !workspace) return null;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Business & GST
  const [businessName, setBusinessName] = useState(
    companyProfile?.businessName || workspace.businessName || ''
  );
  const [tradeName, setTradeName] = useState(
    companyProfile?.tradeName || workspace.tradeName || ''
  );
  const [gstin, setGstin] = useState(companyProfile?.gstin || workspace.gstin || '');
  const [stateCode, setStateCode] = useState(
    companyProfile?.stateCode || workspace.stateCode || '27'
  );
  const [filingFrequency, setFilingFrequency] = useState<'monthly' | 'quarterly'>(
    workspace.filingFrequency || companyProfile?.filingFrequency || 'monthly'
  );
  const [financialYearStart, setFinancialYearStart] = useState(
    workspace.financialYearStart || companyProfile?.financialYearStart || '2026-04-01'
  );
  const [address, setAddress] = useState(
    companyProfile?.address || workspace.address || ''
  );

  // Step 2: Bank & UPI
  const [bankName, setBankName] = useState(
    companyProfile?.bankName || workspace.bankName || 'HDFC Bank Ltd'
  );
  const [accountNumber, setAccountNumber] = useState(
    companyProfile?.accountNumber || workspace.accountNumber || ''
  );
  const [ifscCode, setIfscCode] = useState(
    companyProfile?.ifscCode || workspace.ifscCode || 'HDFC0000240'
  );
  const [upiId, setUpiId] = useState(
    companyProfile?.upiId || workspace.upiId || ''
  );

  // Step 3: Document Series & Prefixes
  const [invoicePrefix, setInvoicePrefix] = useState(
    companyProfile?.invoicePrefix || workspace.invoicePrefix || 'INV/2026-27/'
  );
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(
    companyProfile?.nextInvoiceNumber || 1
  );
  const [purchasePrefix, setPurchasePrefix] = useState(
    companyProfile?.purchasePrefix || workspace.purchasePrefix || 'PUR/2026-27/'
  );
  const [receiptPrefix, setReceiptPrefix] = useState(
    companyProfile?.receiptPrefix || workspace.receiptPrefix || 'REC/2026-27/'
  );

  // Auto derive state from GSTIN
  useEffect(() => {
    if (gstin && gstin.length >= 2) {
      const code = gstin.substring(0, 2);
      const matched = ALL_INDIAN_STATES.find((s) => s.code === code);
      if (matched) {
        setStateCode(matched.code);
      }
    }
  }, [gstin]);

  const selectedState = ALL_INDIAN_STATES.find((s) => s.code === stateCode);

  const handleQuickFill = () => {
    setBusinessName(workspace.businessName || 'Apex Technologies Pvt Ltd');
    setTradeName('Apex Cloud Books');
    setGstin('27AAECB9382M1ZR');
    setStateCode('27');
    setAddress('Plot 42, Bandra-Kurla Complex, Bandra East, Mumbai, Maharashtra 400051');
    setBankName('HDFC Bank Ltd');
    setAccountNumber('50200084920192');
    setIfscCode('HDFC0000240');
    setUpiId('apexcloud@okhdfcbank');
    setInvoicePrefix('INV/2026-27/');
    setPurchasePrefix('PUR/2026-27/');
    setReceiptPrefix('REC/2026-27/');
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!businessName.trim()) {
        setError('Legal Business Name is required.');
        return;
      }
      if (gstin.trim() && gstin.trim().length !== 15) {
        setError('GSTIN must be exactly 15 alphanumeric characters.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!bankName.trim() || !accountNumber.trim()) {
        setError('Bank Name and Account Number are required for settlement.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleCompleteSetup = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const stateObj = ALL_INDIAN_STATES.find((s) => s.code === stateCode);
      const stateName = stateObj ? stateObj.name : 'Maharashtra';

      // 1. Update Workspace document in Firestore
      const wsUpdates: Partial<Workspace> = {
        businessName: businessName.trim(),
        tradeName: tradeName.trim(),
        gstin: gstin.trim().toUpperCase(),
        stateCode,
        stateName,
        address: address.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        upiId: upiId.trim(),
        invoicePrefix: invoicePrefix.trim(),
        purchasePrefix: purchasePrefix.trim(),
        receiptPrefix: receiptPrefix.trim(),
        filingFrequency,
        financialYearStart,
        setupCompleted: true,
        onboardingStep: 3,
        updatedAt: new Date().toISOString(),
      };

      await updateWorkspace(workspace.id, wsUpdates);

      // 2. Update CompanyProfile in Firestore
      const profileData: Partial<CompanyProfile> = {
        workspaceId: workspace.id,
        businessName: businessName.trim(),
        tradeName: tradeName.trim(),
        gstin: gstin.trim().toUpperCase(),
        stateCode,
        stateName,
        address: address.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        upiId: upiId.trim(),
        invoicePrefix: invoicePrefix.trim(),
        nextInvoiceNumber: Number(nextInvoiceNumber) || 1,
        purchasePrefix: purchasePrefix.trim(),
        receiptPrefix: receiptPrefix.trim(),
        filingFrequency,
        financialYearStart,
      };

      const savedCompany = await saveCompanyProfile(profileData, workspace.id);

      const mergedWorkspace: Workspace = {
        ...workspace,
        ...wsUpdates,
      };

      onCompleted(mergedWorkspace, savedCompany);
      onClose();
    } catch (err: any) {
      console.error('Failed to complete onboarding setup:', err);
      setError(err.message || 'Failed to save setup wizard. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Interactive Workspace Onboarding
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Configure your statutory GST compliance, banking settlements, and invoice series in 3 steps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              Demo Auto-Fill
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Step Breadcrumbs */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { step: 1, title: 'GSTIN & Legal Profile', icon: Building2 },
            { step: 2, title: 'Banking & UPI', icon: CreditCard },
            { step: 3, title: 'Voucher Series', icon: Hash },
          ].map((item) => {
            const isCurrent = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <div
                key={item.step}
                className={`p-3 rounded-2xl border transition text-left flex items-center gap-2.5 ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : isCompleted
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-950/30 text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.step}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Step 0{item.step}</div>
                  <div className="text-xs font-semibold truncate text-white">{item.title}</div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* STEP 1: GST & Statutory Profile */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Legal Business Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Technologies Pvt Ltd"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Trade Name / Brand</label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="e.g. Apex Cloud Solutions"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  GSTIN (15 Characters) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AAECB9382M1ZR"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">State Jurisdiction</label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  {ALL_INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">GST Filing Frequency</label>
                <select
                  value={filingFrequency}
                  onChange={(e) => setFilingFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="monthly">Monthly Filing (GSTR-1 & GSTR-3B)</option>
                  <option value="quarterly">Quarterly QRMP Scheme</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Financial Year Start</label>
                <div className="relative">
                  <input
                    type="date"
                    value={financialYearStart}
                    onChange={(e) => setFinancialYearStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Principal Place of Business</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full street address, district, state & PIN code"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Banking & Settlement UPI */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Bank Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank Ltd"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Bank Account Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50200084920192"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  IFSC Code (11 Chars) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0000240"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  UPI VPA ID (For Instant Dynamic QR)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. apexsolutions@okhdfcbank"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <QrCode className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                Settlement details will be automatically printed on all generated PDF invoices alongside a dynamic
                UPI QR code for friction-free client payouts directly into your bank account.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Voucher Series Configuration */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Sales Invoice Series Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="e.g. INV/2026-27/"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Example: {invoicePrefix}001
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Starting Invoice Sequence #
                </label>
                <input
                  type="number"
                  min={1}
                  value={nextInvoiceNumber}
                  onChange={(e) => setNextInvoiceNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Purchase Order / Voucher Prefix
                </label>
                <input
                  type="text"
                  value={purchasePrefix}
                  onChange={(e) => setPurchasePrefix(e.target.value)}
                  placeholder="e.g. PUR/2026-27/"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Payment & Receipt Series Prefix
                </label>
                <input
                  type="text"
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value)}
                  placeholder="e.g. REC/2026-27/"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[11px] font-semibold text-slate-300">Statutory Audit Compliance Notice:</div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Rule 46(b) of CGST Rules specifies that tax invoice numbers must be consecutive, unique, and not exceed 16 characters for the financial year.
              </p>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition cursor-pointer"
            >
              Skip for Later
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/20"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteSetup}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Setup & Launch Books</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
