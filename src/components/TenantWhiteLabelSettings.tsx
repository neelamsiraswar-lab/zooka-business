// src/components/TenantWhiteLabelSettings.tsx
import React, { useState, useEffect } from 'react';
import { Workspace, CompanyProfile } from '../types';
import {
  Palette,
  Globe,
  Upload,
  CheckCircle,
  Save,
  Eye,
  Sparkles,
  ShieldCheck,
  Building2,
  FileText,
  FileCheck,
  Stamp,
  RefreshCw,
} from 'lucide-react';
import { LocalImageUploader } from './LocalImageUploader';
import { updateWorkspace } from '../db/workspaces';
import { saveCompanyProfile } from '../db/dataService';

interface TenantWhiteLabelSettingsProps {
  workspace: Workspace | null;
  companyProfile: CompanyProfile | null;
  onSaveSuccess?: (updatedWorkspace: Workspace, updatedCompany: CompanyProfile) => void;
}

const BRAND_PALETTES = [
  { id: 'indigo', name: 'Royal Indigo', hex: '#6366f1', bg: 'bg-indigo-600', text: 'text-indigo-400' },
  { id: 'emerald', name: 'Emerald Growth', hex: '#10b981', bg: 'bg-emerald-600', text: 'text-emerald-400' },
  { id: 'blue', name: 'Sapphire Corporate', hex: '#3b82f6', bg: 'bg-blue-600', text: 'text-blue-400' },
  { id: 'teal', name: 'Cyber Teal', hex: '#14b8a6', bg: 'bg-teal-600', text: 'text-teal-400' },
  { id: 'amber', name: 'Amber Gold', hex: '#f59e0b', bg: 'bg-amber-600', text: 'text-amber-400' },
  { id: 'rose', name: 'Crimson Rose', hex: '#f43f5e', bg: 'bg-rose-600', text: 'text-rose-400' },
  { id: 'violet', name: 'Amethyst Violet', hex: '#8b5cf6', bg: 'bg-violet-600', text: 'text-violet-400' },
  { id: 'slate', name: 'Charcoal Slate', hex: '#64748b', bg: 'bg-slate-600', text: 'text-slate-400' },
];

export const TenantWhiteLabelSettings: React.FC<TenantWhiteLabelSettingsProps> = ({
  workspace,
  companyProfile,
  onSaveSuccess,
}) => {
  if (!workspace) return null;

  const [subdomain, setSubdomain] = useState(
    workspace.subdomain || companyProfile?.subdomain || workspace.slug || 'apex-corp'
  );
  const [customDomain, setCustomDomain] = useState(
    workspace.customDomain || companyProfile?.customDomain || ''
  );
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(
    workspace.brandPrimaryColor || companyProfile?.brandPrimaryColor || '#6366f1'
  );
  const [brandLogoUrl, setBrandLogoUrl] = useState(
    workspace.brandLogoUrl || companyProfile?.brandLogoUrl || companyProfile?.invoiceLogoUrl || ''
  );
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState(
    workspace.digitalSignatureUrl || companyProfile?.digitalSignatureUrl || companyProfile?.invoiceSignatureUrl || ''
  );
  const [watermarkText, setWatermarkText] = useState(
    workspace.watermarkText || companyProfile?.watermarkText || 'ORIGINAL FOR RECIPIENT'
  );
  const [invoiceHeaderTitle, setInvoiceHeaderTitle] = useState(
    companyProfile?.invoiceHeaderTitle || 'TAX INVOICE'
  );
  const [defaultTerms, setDefaultTerms] = useState(
    companyProfile?.defaultTerms || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed settlement beyond 30 days.'
  );

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    try {
      const cleanSubdomain = subdomain
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 32);

      // 1. Update Workspace in Firestore
      const wsUpdates: Partial<Workspace> = {
        subdomain: cleanSubdomain,
        customDomain: customDomain.trim(),
        brandPrimaryColor,
        brandLogoUrl,
        digitalSignatureUrl,
        watermarkText: watermarkText.trim(),
        updatedAt: new Date().toISOString(),
      };
      await updateWorkspace(workspace.id, wsUpdates);

      // 2. Update CompanyProfile in Firestore
      const companyUpdates: Partial<CompanyProfile> = {
        workspaceId: workspace.id,
        subdomain: cleanSubdomain,
        customDomain: customDomain.trim(),
        brandPrimaryColor,
        brandLogoUrl,
        invoiceLogoUrl: brandLogoUrl,
        digitalSignatureUrl,
        invoiceSignatureUrl: digitalSignatureUrl,
        watermarkText: watermarkText.trim(),
        invoiceHeaderTitle: invoiceHeaderTitle.trim(),
        defaultTerms,
      };
      const savedCompany = await saveCompanyProfile(companyUpdates, workspace.id);

      const mergedWs: Workspace = {
        ...workspace,
        ...wsUpdates,
      };

      setSavedSuccess(true);
      if (onSaveSuccess) {
        onSaveSuccess(mergedWs, savedCompany);
      }
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save white label settings:', err);
      setErrorMessage(err.message || 'Failed to update branding settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            Tenant White-Labeling &amp; Corporate Identity
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Customize client portal branding, custom subdomain, document color palettes, and digital authorized signature stamps.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer self-start sm:self-auto"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Applying Branding...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save &amp; Publish Branding</span>
            </>
          )}
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>White-label styling and domain configuration published to live Firestore!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Settings Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Subdomain & CNAME */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Dedicated Tenant Subdomain &amp; Portal Host</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Tenant Subdomain Slug
                </label>
                <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 overflow-hidden focus-within:border-indigo-500">
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="acme-books"
                    className="w-full px-3 py-2 bg-transparent text-white placeholder:text-slate-600 focus:outline-none font-mono text-xs"
                  />
                  <span className="px-2.5 text-[11px] text-slate-500 font-mono select-none bg-slate-900/60 border-l border-slate-800">
                    .apexaccounting.io
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Accessible by client accountants at https://{subdomain || 'yourbrand'}.apexaccounting.io
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Custom Domain CNAME (Enterprise)
                </label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="billing.yourdomain.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Point DNS CNAME record to cname.apexaccounting.io
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Color Palette & Typography */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Palette className="w-4 h-4 text-emerald-400" />
              <span>Corporate Brand Color Theme</span>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Primary Brand Accent
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BRAND_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setBrandPrimaryColor(pal.hex)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                      brandPrimaryColor === pal.hex
                        ? 'border-white bg-slate-800 shadow-md ring-1 ring-white/50'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${pal.bg} shrink-0`} />
                    <span className="text-xs font-medium text-white truncate">{pal.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={brandPrimaryColor}
                  onChange={(e) => setBrandPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Custom Hex Code:</span>
                  <input
                    type="text"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Logos, Stamps & Watermarks */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>Logos, Watermarks &amp; Digital Stamps</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Corporate Brand Logo</label>
                <LocalImageUploader
                  currentImageUrl={brandLogoUrl}
                  onImageSelected={(url) => setBrandLogoUrl(url)}
                  label="Upload High-Res Logo"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Authorized Signatory Stamp / Signature
                </label>
                <LocalImageUploader
                  currentImageUrl={digitalSignatureUrl}
                  onImageSelected={(url) => setDigitalSignatureUrl(url)}
                  label="Upload Stamp / Signature"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Document Watermark Text
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="ORIGINAL FOR RECIPIENT"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs uppercase"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Invoice Header Title
                </label>
                <input
                  type="text"
                  value={invoiceHeaderTitle}
                  onChange={(e) => setInvoiceHeaderTitle(e.target.value)}
                  placeholder="TAX INVOICE"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1 text-xs">
                Default Terms &amp; Conditions on Invoices
              </label>
              <textarea
                rows={3}
                value={defaultTerms}
                onChange={(e) => setDefaultTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Column: Live Branded Preview Card */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>Live White-Label Preview</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">PDF Voucher View</span>
            </div>

            {/* Mock Invoice Frame with Custom Theme Applied */}
            <div className="p-4 rounded-xl bg-white text-slate-900 shadow-md space-y-3 relative overflow-hidden font-sans text-[11px]">
              {/* Custom Watermark */}
              {watermarkText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-[-25deg]">
                  <span className="text-3xl font-extrabold uppercase font-mono tracking-widest text-slate-900">
                    {watermarkText}
                  </span>
                </div>
              )}

              {/* Header with Custom Accent */}
              <div
                className="p-2.5 rounded-lg text-white flex items-center justify-between"
                style={{ backgroundColor: brandPrimaryColor }}
              >
                <div className="flex items-center gap-2">
                  {brandLogoUrl ? (
                    <img
                      src={brandLogoUrl}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 object-contain rounded bg-white/20 p-0.5"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center font-bold text-xs">
                      {(workspace.businessName || 'A')[0]}
                    </div>
                  )}
                  <span className="font-bold text-xs">{workspace.businessName || 'Apex Solutions'}</span>
                </div>
                <span className="font-bold text-[10px] tracking-wider uppercase">
                  {invoiceHeaderTitle || 'TAX INVOICE'}
                </span>
              </div>

              {/* Sample Voucher Body */}
              <div className="space-y-1.5 text-[10px] text-slate-600">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span>Invoice No: <strong>INV/2026-27/001</strong></span>
                  <span>Date: <strong>18 Sep 2026</strong></span>
                </div>
                <div className="text-slate-800 font-semibold">
                  Billed To: Horizon Trading Enterprises (27AABCH1928K1Z3)
                </div>
                <div className="bg-slate-100 p-1.5 rounded flex justify-between font-mono text-[9px]">
                  <span>Cloud ERP Subscription (SAC 998315)</span>
                  <span className="font-bold text-slate-900">₹45,000.00</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1 border-t border-slate-200 font-bold text-slate-900">
                  <span>Grand Total (incl. 18% GST):</span>
                  <span style={{ color: brandPrimaryColor }}>₹53,100.00</span>
                </div>
              </div>

              {/* Footer with Stamp */}
              <div className="pt-2 border-t border-slate-200 flex items-end justify-between text-[9px] text-slate-500">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-700">Bank: {workspace.bankName || 'HDFC Bank'}</div>
                  <div>A/c: {workspace.accountNumber || '50200084920192'}</div>
                  <div>IFSC: {workspace.ifscCode || 'HDFC0000240'}</div>
                </div>

                <div className="text-center space-y-1">
                  {digitalSignatureUrl ? (
                    <img
                      src={digitalSignatureUrl}
                      alt="Signature"
                      referrerPolicy="no-referrer"
                      className="h-8 max-w-[70px] object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-16 h-7 border border-dashed border-slate-300 rounded flex items-center justify-center text-[8px] text-slate-400">
                      Sign / Stamp
                    </div>
                  )}
                  <div className="font-semibold text-slate-800 text-[8px]">Authorized Signatory</div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 leading-relaxed pt-1">
              Your customized brand colors, stamps, and layout will be dynamically rendered when printing or exporting sales vouchers to PDF for customers.
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
