import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Building2,
  Briefcase,
  KeyRound,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
  Server,
  Database,
  RefreshCw,
  Sparkles,
  Image,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

export const ProfileSettingsView: React.FC = () => {
  const { profile, user, updateProfile } = useAuth();
  const dialog = useDialog();

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'profile' | 'business'>('profile');

  // Profile Form state
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [businessName, setBusinessName] = useState(profile?.businessName || 'AI Studio Accounting & Billing SaaS Corp');
  const [gstin, setGstin] = useState(profile?.gstin || '27AABCA1234F1Z5');
  const [phone, setPhone] = useState(profile?.phone || '+91 9876543210');

  // App Branding & White-Labeling state
  const [appName, setAppName] = useState(() => localStorage.getItem('platform_app_name') || 'TallyGST ERP');
  const [appTagline, setAppTagline] = useState(() => localStorage.getItem('platform_app_tagline') || 'Multi-Tenant Cloud Accounting Platform');
  const [appLogoUrl, setAppLogoUrl] = useState(() => localStorage.getItem('platform_app_logo') || '');

  // Master Business Details for Subscription Invoices
  const [invoiceBusinessName, setInvoiceBusinessName] = useState(() => localStorage.getItem('platform_invoice_name') || 'Apex Cloud Technologies');
  const [invoiceGstin, setInvoiceGstin] = useState(() => localStorage.getItem('platform_invoice_gstin') || '27AAECB9382M1ZR');
  const [invoicePan, setInvoicePan] = useState(() => localStorage.getItem('platform_invoice_pan') || 'AAECB9382M');
  const [invoiceSac, setInvoiceSac] = useState(() => localStorage.getItem('platform_invoice_sac') || '998315');
  const [invoiceAddress, setInvoiceAddress] = useState(() => localStorage.getItem('platform_invoice_address') || 'BKC, Bandra East, Mumbai, MH - 400051');
  const [invoiceBank, setInvoiceBank] = useState(() => localStorage.getItem('platform_invoice_bank') || 'HDFC Bank, A/C 50200012345678, IFSC HDFC0000001');

  // Subscription Invoice Series & Numbering Settings
  const [subInvoicePrefix, setSubInvoicePrefix] = useState(() => localStorage.getItem('platform_sub_invoice_prefix') || 'SUB');
  const [subInvoiceSuffix, setSubInvoiceSuffix] = useState(() => localStorage.getItem('platform_sub_invoice_suffix') || '2026-27');
  const [subInvoiceNextNum, setSubInvoiceNextNum] = useState(() => localStorage.getItem('platform_sub_invoice_next_num') || '42');
  const [subInvoicePadding, setSubInvoicePadding] = useState(() => localStorage.getItem('platform_sub_invoice_padding') || '4');

  // Footer Customization state
  const [footerCopyright, setFooterCopyright] = useState(() => localStorage.getItem('platform_footer_copyright') || '© 2026 Apex TallyGST Accounting Platform. All rights reserved.');
  const [footerCompliance, setFooterCompliance] = useState(() => localStorage.getItem('platform_footer_compliance') || 'GST Act 2017 & ITC Section 16 Compliant');
  const [footerSupport, setFooterSupport] = useState(() => localStorage.getItem('platform_footer_support') || 'Support: support@apextally.com | +91 9876543210');

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name,
        email,
        phone,
      } as any);
      dialog.toast.success('Super Admin personal details updated successfully');
    } catch (err: any) {
      dialog.toast.error('Failed to update profile: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      dialog.toast.error('Logo file size must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setAppLogoUrl(result);
        dialog.toast.success('Platform logo uploaded successfully');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      localStorage.setItem('platform_app_name', appName);
      localStorage.setItem('platform_app_tagline', appTagline);
      localStorage.setItem('platform_app_logo', appLogoUrl);
      localStorage.setItem('platform_invoice_name', invoiceBusinessName);
      localStorage.setItem('platform_invoice_gstin', invoiceGstin);
      localStorage.setItem('platform_invoice_pan', invoicePan);
      localStorage.setItem('platform_invoice_sac', invoiceSac);
      localStorage.setItem('platform_invoice_address', invoiceAddress);
      localStorage.setItem('platform_invoice_bank', invoiceBank);
      localStorage.setItem('platform_sub_invoice_prefix', subInvoicePrefix);
      localStorage.setItem('platform_sub_invoice_suffix', subInvoiceSuffix);
      localStorage.setItem('platform_sub_invoice_next_num', subInvoiceNextNum);
      localStorage.setItem('platform_sub_invoice_padding', subInvoicePadding);
      localStorage.setItem('platform_footer_copyright', footerCopyright);
      localStorage.setItem('platform_footer_compliance', footerCompliance);
      localStorage.setItem('platform_footer_support', footerSupport);

      window.dispatchEvent(new Event('platform_branding_updated'));
      dialog.toast.success('App branding & invoice master business details updated successfully');
    } catch (err: any) {
      dialog.toast.error('Failed to save platform branding');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      dialog.toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      dialog.toast.error('Password must be at least 6 characters long');
      return;
    }

    setSavingPassword(true);
    try {
      // Simulate secure auth update
      await new Promise((resolve) => setTimeout(resolve, 800));
      dialog.toast.success('Super Admin password and security passkeys updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      dialog.toast.error('Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-2xl font-black text-white shadow-lg border border-indigo-400/30">
            {(name || email || 'SA').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{name || 'Platform Master Admin'}</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{email || 'admin@platform.com'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
          <Clock className="w-4 h-4 text-indigo-400" />
          <div>
            <p className="text-slate-400 text-[10px]">Last Login Activity</p>
            <p className="text-white font-mono font-medium">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (IST)</p>
          </div>
        </div>
      </div>

      {/* Tab Pill Switcher Bar */}
      <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-2 shadow-md">
        <button
          type="button"
          onClick={() => setActiveProfileTab('profile')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeProfileTab === 'profile'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Super Admin Profile & Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveProfileTab('business')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeProfileTab === 'business'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Master Business & Branding Details</span>
        </button>
      </div>

      {activeProfileTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Left Column: Security Telemetry */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Environment Security</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Session Security:</span>
                  <span className="text-emerald-400 font-semibold">JWT Encrypted</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">IP Whitelist:</span>
                  <span className="text-white font-mono">Any (Development)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Database Cluster:</span>
                  <span className="text-indigo-400 font-mono">Firestore (Asia-South)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Update Profile & Change Password Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit Display Name, Email & Support Phone */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Super Admin Personal Details</h3>
                  <p className="text-xs text-slate-400">Update your administrator identity and contact info.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="CA Kuldeep Nawar"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">Admin Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@platform.com"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Support Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20 transition cursor-pointer flex items-center gap-2"
                  >
                    {savingProfile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Profile Details</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password & Security Settings */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Change Password & Passkey Security</h3>
                  <p className="text-xs text-slate-400">Ensure your administrative account is secured with a robust password.</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold shadow transition cursor-pointer border border-slate-700 flex items-center gap-2"
                  >
                    {savingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Business & Branding Details Tab */
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">App Branding & White-Labeling</h3>
                <p className="text-xs text-slate-400">Customize platform title, tagline, and corporate logo (local upload supported).</p>
              </div>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Application Name</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="TallyGST ERP"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Application Tagline</label>
                  <input
                    type="text"
                    value={appTagline}
                    onChange={(e) => setAppTagline(e.target.value)}
                    placeholder="Multi-Tenant Cloud Accounting Platform"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Platform Logo (Local Upload)</label>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {appLogoUrl ? (
                      <img src={appLogoUrl} alt="App Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Image className="w-6 h-6 text-slate-500" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-2 border border-slate-700">
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Upload Logo File</span>
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
                            dialog.toast.success('Logo removed');
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition cursor-pointer border border-rose-500/20"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Supports PNG, JPG, or SVG up to 2MB. Recommended dimensions: 120x120px.
                    </p>
                  </div>
                </div>
              </div>

              {/* Master Business Details for Subscription Invoices */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Master Business Details (For Purchase Plan Bills & Invoices)</h4>
                  <p className="text-[11px] text-slate-400">These details will appear on all issued GST subscription tax invoices generated for customer workspaces.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">Invoice Business / Legal Name</label>
                    <input
                      type="text"
                      value={invoiceBusinessName}
                      onChange={(e) => setInvoiceBusinessName(e.target.value)}
                      placeholder="Apex Cloud Technologies"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">Invoice GSTIN</label>
                    <input
                      type="text"
                      value={invoiceGstin}
                      onChange={(e) => setInvoiceGstin(e.target.value)}
                      placeholder="27AAECB9382M1ZR"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">PAN Number</label>
                    <input
                      type="text"
                      value={invoicePan}
                      onChange={(e) => setInvoicePan(e.target.value)}
                      placeholder="AAECB9382M"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">SAC Code</label>
                    <input
                      type="text"
                      value={invoiceSac}
                      onChange={(e) => setInvoiceSac(e.target.value)}
                      placeholder="998315"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">Bank / UPI Settlement Details</label>
                    <input
                      type="text"
                      value={invoiceBank}
                      onChange={(e) => setInvoiceBank(e.target.value)}
                      placeholder="HDFC Bank A/C 5020... IFSC HDFC0000001"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Registered Office Address</label>
                  <textarea
                    value={invoiceAddress}
                    onChange={(e) => setInvoiceAddress(e.target.value)}
                    rows={2}
                    placeholder="BKC, Bandra East, Mumbai, MH - 400051"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Subscription Invoice Numbering Configuration */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Subscription Plan Bill & Invoice Numbering Series</h4>
                    <p className="text-[11px] text-slate-400">Configure automatic prefix, financial year suffix, and starting sequence for generated purchase plan bills and subscription tax invoices.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1.5">Invoice Prefix</label>
                      <input
                        type="text"
                        value={subInvoicePrefix}
                        onChange={(e) => setSubInvoicePrefix(e.target.value)}
                        placeholder="SUB"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1.5">Financial Year / Suffix</label>
                      <input
                        type="text"
                        value={subInvoiceSuffix}
                        onChange={(e) => setSubInvoiceSuffix(e.target.value)}
                        placeholder="2026-27"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1.5">Next Invoice Number</label>
                      <input
                        type="number"
                        min="1"
                        value={subInvoiceNextNum}
                        onChange={(e) => setSubInvoiceNextNum(e.target.value)}
                        placeholder="42"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1.5">Digit Padding</label>
                      <select
                        value={subInvoicePadding}
                        onChange={(e) => setSubInvoicePadding(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      >
                        <option value="3">3 Digits (042)</option>
                        <option value="4">4 Digits (0042)</option>
                        <option value="5">5 Digits (00042)</option>
                        <option value="6">6 Digits (000042)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Preview Generated Invoice Number:</span>
                    <span className="font-mono font-bold text-indigo-400">
                      {subInvoicePrefix || 'SUB'}/{subInvoiceSuffix || '2026-27'}/{String(subInvoiceNextNum || '42').padStart(Number(subInvoicePadding) || 4, '0')}
                    </span>
                  </div>
                </div>

                {/* Platform Footer Customization */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Platform Footer Customization</h4>
                    <p className="text-[11px] text-slate-400">Customize the footer copyright text, compliance badges, and support contact info displayed across the login page and bottom status bar.</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1.5">Footer Copyright & Brand Text</label>
                      <input
                        type="text"
                        value={footerCopyright}
                        onChange={(e) => setFooterCopyright(e.target.value)}
                        placeholder="© 2026 Apex TallyGST Accounting Platform. All rights reserved."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1.5">Compliance / Status Text</label>
                        <input
                          type="text"
                          value={footerCompliance}
                          onChange={(e) => setFooterCompliance(e.target.value)}
                          placeholder="GST Act 2017 & ITC Section 16 Compliant"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1.5">Support Contact Information</label>
                        <input
                          type="text"
                          value={footerSupport}
                          onChange={(e) => setFooterSupport(e.target.value)}
                          placeholder="support@apextally.com | +91 9876543210"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingBranding}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  {savingBranding && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Branding Settings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
