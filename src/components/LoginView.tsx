import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ShieldCheck,
  Zap,
  Users,
  FileSpreadsheet,
  Lock,
  ArrowRight,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  X,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, signInDemoAccountant, loading, error, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
            <Building2 className="w-5 h-5 font-bold" />
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
              Apex TallyGST <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Enterprise Cloud</span>
            </span>
            <p className="text-xs text-slate-400">GST-Ready Multi-User Small Business Accounting</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Cloud SQL & Real-Time Sync Active
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Feature Highlights */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full GST Compliance (CGST, SGST, IGST & ITC)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Next-Gen Accounting & Billing for Modern Businesses.
            </h1>

            <p className="text-slate-400 text-base leading-relaxed max-w-xl">
              Inspired by Tally simplicity, upgraded with multi-user cloud synchronization,
              automated GSTR-1/GSTR-3B tax calculations, real-time inventory adjustments, and expense tracking.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3">
                <Users className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Multi-User Sync</h4>
                  <p className="text-xs text-slate-400">Concurrent access for accountants, cashiers, and managers.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Automated Reports</h4>
                  <p className="text-xs text-slate-400">Instant Profit & Loss, Balance Sheet, and GST filing ledgers.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">PostgreSQL Cloud</h4>
                  <p className="text-xs text-slate-400">High availability, ACID transactions, and automated backups.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Enterprise Security</h4>
                  <p className="text-xs text-slate-400">Encrypted token authentication with strict role-based audit logs.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="space-y-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Sign In to Your Workspace</h3>
                <p className="text-xs text-slate-400">
                  Select your sign-in method to access live company accounts and ledger balances.
                </p>
              </div>

              {/* Informative Notification banner if user cancelled or popup failed in iframe */}
              {error && (
                <div className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 relative animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="flex-1 pr-4">
                    <p className="font-semibold text-amber-200">Notice:</p>
                    <p className="text-[11px] text-amber-300/90 mt-0.5">{error}</p>
                  </div>
                  <button
                    onClick={clearError}
                    className="absolute top-2 right-2 text-amber-400/60 hover:text-amber-300 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {/* 1. Google Sign-In Button */}
                <button
                  onClick={signInWithGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-slate-900 bg-white hover:bg-slate-100 transition shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                    />
                  </svg>
                  <span className="text-xs font-semibold">
                    {loading ? 'Authenticating...' : 'Sign in with Google'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 ml-auto" />
                </button>

                {/* 2. Instant Workspace Access (Prevents popup blocking issues) */}
                <button
                  onClick={signInDemoAccountant}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="text-xs font-semibold">
                    Instant Workspace Access (No Popups)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500/60 ml-auto" />
                </button>

                <div className="pt-4 border-t border-slate-800/80 text-center">
                  <p className="text-[11px] text-slate-500">
                    Compliant with Indian Goods and Services Tax (GST) Act, 2017. E-Way bill & ITC Ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-600">
        © 2026 Apex TallyGST Accounting Platform. Multi-device real-time ledger & automated tax compliance.
      </footer>
    </div>
  );
};
