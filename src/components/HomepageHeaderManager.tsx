// src/components/HomepageHeaderManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  PhoneCall,
  Mail,
  Crown,
  Sparkles,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image,
  ExternalLink,
  Eye,
  Sliders,
  Check,
  AlertTriangle,
  Landmark,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import {
  PlatformSettings,
  getPlatformSettings,
  updatePlatformSettings,
  FALLBACK_PLATFORM_SETTINGS,
} from '../db/platformSettings';
import { INDIAN_STATES } from '../data/indianStates';

interface HomepageHeaderManagerProps {
  onNavigateToLandingPage?: () => void;
}

export const HomepageHeaderManager: React.FC<HomepageHeaderManagerProps> = ({
  onNavigateToLandingPage,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Platform Header & Business Profile State
  const [appName, setAppName] = useState(FALLBACK_PLATFORM_SETTINGS.appName);
  const [appShortName, setAppShortName] = useState(FALLBACK_PLATFORM_SETTINGS.appShortName);
  const [tagline, setTagline] = useState(FALLBACK_PLATFORM_SETTINGS.tagline);
  const [appLogoUrl, setAppLogoUrl] = useState(FALLBACK_PLATFORM_SETTINGS.appLogoUrl || '');
  const [headerBadgeText, setHeaderBadgeText] = useState(FALLBACK_PLATFORM_SETTINGS.headerBadgeText || 'Enterprise Cloud');
  const [headerShowContact, setHeaderShowContact] = useState(FALLBACK_PLATFORM_SETTINGS.headerShowContact !== false);
  const [headerShowGstin, setHeaderShowGstin] = useState(FALLBACK_PLATFORM_SETTINGS.headerShowGstin !== false);

  // Master Business & Statutory Profile
  const [invoiceBusinessName, setInvoiceBusinessName] = useState(FALLBACK_PLATFORM_SETTINGS.invoiceBusinessName || '');
  const [invoiceGstin, setInvoiceGstin] = useState(FALLBACK_PLATFORM_SETTINGS.invoiceGstin || '');
  const [invoiceStateCode, setInvoiceStateCode] = useState(FALLBACK_PLATFORM_SETTINGS.invoiceStateCode || '27');
  const [invoiceStateName, setInvoiceStateName] = useState(FALLBACK_PLATFORM_SETTINGS.invoiceStateName || 'Maharashtra');
  const [supportPhone, setSupportPhone] = useState(FALLBACK_PLATFORM_SETTINGS.supportPhone || '');
  const [supportEmail, setSupportEmail] = useState(FALLBACK_PLATFORM_SETTINGS.supportEmail || '');
  const [supportHours, setSupportHours] = useState(FALLBACK_PLATFORM_SETTINGS.supportHours || 'Mon - Sat: 9:00 AM - 7:00 PM IST');
  const [invoiceAddress, setInvoiceAddress] = useState(FALLBACK_PLATFORM_SETTINGS.invoiceAddress || '');

  // Load from Firestore
  const loadData = async () => {
    setLoading(true);
    try {
      const settings = await getPlatformSettings();
      if (settings) {
        if (settings.appName) setAppName(settings.appName);
        if (settings.appShortName) setAppShortName(settings.appShortName);
        if (settings.tagline) setTagline(settings.tagline);
        if (settings.appLogoUrl !== undefined) setAppLogoUrl(settings.appLogoUrl);
        if (settings.headerBadgeText) setHeaderBadgeText(settings.headerBadgeText);
        if (settings.headerShowContact !== undefined) setHeaderShowContact(settings.headerShowContact);
        if (settings.headerShowGstin !== undefined) setHeaderShowGstin(settings.headerShowGstin);
        if (settings.invoiceBusinessName) setInvoiceBusinessName(settings.invoiceBusinessName);
        if (settings.invoiceGstin) setInvoiceGstin(settings.invoiceGstin);
        if (settings.invoiceStateCode) setInvoiceStateCode(settings.invoiceStateCode);
        if (settings.invoiceStateName) setInvoiceStateName(settings.invoiceStateName);
        if (settings.supportPhone) setSupportPhone(settings.supportPhone);
        if (settings.supportEmail) setSupportEmail(settings.supportEmail);
        if (settings.supportHours) setSupportHours(settings.supportHours);
        if (settings.invoiceAddress) setInvoiceAddress(settings.invoiceAddress);
      }
    } catch (err: any) {
      console.error('Failed to load header platform settings:', err);
      notify('error', 'Could not fetch header configuration from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // State Change Handler
  const handleStateChange = (code: string) => {
    setInvoiceStateCode(code);
    const found = INDIAN_STATES.find((s) => s.code === code);
    if (found) {
      setInvoiceStateName(found.name);
    }
  };

  // Align GSTIN Prefix with State
  const handleAlignGstinPrefix = () => {
    if (invoiceGstin.length >= 2) {
      const remaining = invoiceGstin.slice(2);
      setInvoiceGstin(invoiceStateCode + remaining);
      notify('success', `GSTIN aligned to state code ${invoiceStateCode}.`);
    } else {
      setInvoiceGstin(invoiceStateCode);
    }
  };

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notify('error', 'Logo image size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAppLogoUrl(reader.result);
        notify('success', 'Logo image loaded successfully.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      notify('error', 'App Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<PlatformSettings> = {
        appName: appName.trim(),
        appShortName: appShortName.trim() || appName.trim(),
        tagline: tagline.trim(),
        appLogoUrl: appLogoUrl.trim(),
        headerBadgeText: headerBadgeText.trim() || 'Enterprise Cloud',
        headerShowContact,
        headerShowGstin,
        invoiceBusinessName: invoiceBusinessName.trim(),
        invoiceGstin: invoiceGstin.trim().toUpperCase(),
        invoiceStateCode,
        invoiceStateName,
        supportPhone: supportPhone.trim(),
        supportEmail: supportEmail.trim(),
        supportHours: supportHours.trim(),
        invoiceAddress: invoiceAddress.trim(),
      };

      await updatePlatformSettings(payload);
      notify('success', 'Landing page header & business details updated successfully!');
    } catch (err: any) {
      notify('error', `Failed to update header settings: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Public Landing Page Top Header &amp; Business Details</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Header Branding &amp; Business Details Governance
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Control platform branding, company legal name, registered GSTIN, official phone lines, and support emails displayed at the top navigation bar of the landing page on desktop and mobile.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToLandingPage && (
              <button
                type="button"
                onClick={onNavigateToLandingPage}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Preview public landing page"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>View Landing Page</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Reload settings from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ---------------- LIVE DESKTOP HEADER PREVIEW ---------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Desktop Landing Header Preview</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Real-time visual preview of desktop viewport
          </span>
        </div>

        {/* Header Preview Container */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-inner">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Brand & Business */}
            <div className="flex items-center gap-3 min-w-0">
              {appLogoUrl ? (
                <img
                  src={appLogoUrl}
                  alt="Preview Logo"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-contain bg-slate-900 border border-slate-800 p-1 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-sm font-bold shrink-0">
                  <Building2 className="w-5 h-5 text-slate-950" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base tracking-tight text-white truncate max-w-[200px]">
                    {appName || 'Apex TallyGST Cloud'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {headerBadgeText || 'Enterprise Cloud'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 leading-none mt-0.5">
                  <p className="truncate max-w-[220px]">
                    {tagline || 'Enterprise GST Billing & Multi-Tenant Cloud Accounting'}
                  </p>
                  {invoiceBusinessName && (
                    <span className="hidden xl:inline-flex items-center gap-1 text-[10px] text-slate-500 border-l border-slate-800 pl-2 whitespace-nowrap">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span className="truncate max-w-[140px]">{invoiceBusinessName}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Contact Details & Links */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {headerShowContact && (invoiceGstin || supportPhone || supportEmail) && (
                <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 shadow-sm">
                  {headerShowGstin && invoiceGstin && (
                    <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <span className="text-slate-400 font-sans font-bold text-[9px] uppercase">GSTIN</span>
                      <span className="font-bold">{invoiceGstin}</span>
                    </div>
                  )}
                  {supportPhone && (
                    <div className="flex items-center gap-1 text-slate-300">
                      <PhoneCall className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="font-medium whitespace-nowrap">{supportPhone}</span>
                    </div>
                  )}
                  {supportEmail && (
                    <div className="hidden xl:flex items-center gap-1 text-slate-400">
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[150px]">{supportEmail}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
                <span className="hover:text-white transition">Features</span>
                <span className="hover:text-emerald-400 transition">GST Simulator</span>
                <span className="hover:text-white transition">Pricing</span>
                <span className="hover:text-amber-400 transition">Reviews</span>
                <span className="hover:text-white transition">FAQs</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Super Admin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- GOVERNANCE FORM ---------------- */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Section 1: Platform Brand Identity */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>1. Platform Brand &amp; Header Identity</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Configure the primary application title, headline tagline, brand logo, and header pill badge.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Platform App Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Apex TallyGST Cloud"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Short Name / Acronym
              </label>
              <input
                type="text"
                value={appShortName}
                onChange={(e) => setAppShortName(e.target.value)}
                placeholder="TallyGST"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Header Badge Pill Text
              </label>
              <input
                type="text"
                value={headerBadgeText}
                onChange={(e) => setHeaderBadgeText(e.target.value)}
                placeholder="Enterprise Cloud"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Platform Headline / Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Enterprise GST Billing, Banking Reconciliation & Cloud Accounting Platform"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Logo Management */}
          <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Brand Logo (Public Landing Page Header &amp; Invoices)
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {appLogoUrl ? (
                  <img
                    src={appLogoUrl}
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  <Image className="w-6 h-6 text-slate-600" />
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer flex items-center gap-2 border border-slate-700">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {appLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppLogoUrl('');
                        notify('success', 'Logo removed. Fallback icon will be used.');
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition cursor-pointer border border-rose-500/20"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Or enter image URL:</span>
                  <input
                    type="url"
                    value={appLogoUrl}
                    onChange={(e) => setAppLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Master Business Details & Statutory GSTIN */}
        <div className="pt-6 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>2. Master Business Details &amp; Statutory GSTIN</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Registered corporate legal identity shown in the header business pill and subscription tax invoices.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Business / Legal Entity Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={invoiceBusinessName}
                onChange={(e) => setInvoiceBusinessName(e.target.value)}
                placeholder="Apex Cloud Technologies"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered GSTIN (15 Characters) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                maxLength={15}
                value={invoiceGstin}
                onChange={(e) => setInvoiceGstin(e.target.value.toUpperCase())}
                placeholder="27AAECB9382M1ZR"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono tracking-wider font-bold uppercase"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>State Jurisdiction</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Code: {invoiceStateCode}
                </span>
              </label>
              <select
                value={invoiceStateCode}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
              >
                {INDIAN_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code} - {state.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GSTIN & State Code Validation Banner */}
          <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              {invoiceGstin.length >= 2 && invoiceGstin.slice(0, 2) === invoiceStateCode ? (
                <>
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-300">GSTIN State Code Validated</p>
                    <p className="text-[11px] text-slate-400">
                      GSTIN prefix <span className="font-mono font-bold text-white">{invoiceStateCode}</span> matches <span className="text-slate-200 font-semibold">{invoiceStateName}</span> jurisdiction.
                    </p>
                  </div>
                </>
              ) : invoiceGstin.length >= 2 ? (
                <>
                  <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300">GSTIN Prefix &amp; State Mismatch</p>
                    <p className="text-[11px] text-slate-400">
                      GSTIN starts with <span className="font-mono font-bold text-amber-400">{invoiceGstin.slice(0, 2)}</span> but selected state is <span className="text-white font-semibold">{invoiceStateName} ({invoiceStateCode})</span>.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-300">Registered State Jurisdiction: {invoiceStateName}</p>
                    <p className="text-[11px] text-slate-400">
                      State code <span className="font-mono font-bold text-white">{invoiceStateCode}</span>.
                    </p>
                  </div>
                </>
              )}
            </div>

            {invoiceGstin.slice(0, 2) !== invoiceStateCode && (
              <button
                type="button"
                onClick={handleAlignGstinPrefix}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 font-semibold text-[11px] transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sync GSTIN Prefix to {invoiceStateCode}</span>
              </button>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Registered Office Address
            </label>
            <input
              type="text"
              value={invoiceAddress}
              onChange={(e) => setInvoiceAddress(e.target.value)}
              placeholder="BKC, Bandra East, Mumbai, MH - 400051"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Section 3: Official Support & Desktop Contact Pills */}
        <div className="pt-6 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <span>3. Official Support Contacts &amp; Header Visibility</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Configure the customer contact channels and toggle their appearance on the desktop landing page header.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Support Phone Line <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="+91 98201 23456"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Support Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@apextally.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Support Operating Hours
              </label>
              <input
                type="text"
                value={supportHours}
                onChange={(e) => setSupportHours(e.target.value)}
                placeholder="Mon - Sat: 9:00 AM - 7:00 PM IST"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800/80">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Show Contact Details in Desktop Header</p>
                <p className="text-[11px] text-slate-400">
                  Renders clickable phone and email links in the desktop navigation bar.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={headerShowContact}
                  onChange={(e) => setHeaderShowContact(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Show Registered GSTIN in Header</p>
                <p className="text-[11px] text-slate-400">
                  Renders the official GSTIN badge in the desktop navigation bar.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={headerShowGstin}
                  onChange={(e) => setHeaderShowGstin(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Updates are persisted to Firestore and broadcast in real-time.</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Firestore...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Header &amp; Business Details</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
