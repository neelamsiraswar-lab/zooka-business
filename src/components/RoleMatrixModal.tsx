import React from 'react';
import { X, ShieldCheck, Check, Minus, Crown, Building2, Users, FileText, Landmark, Shield } from 'lucide-react';
import { UserRole } from '../lib/permissions';

interface RoleMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole?: (role: UserRole) => void;
}

export const RoleMatrixModal: React.FC<RoleMatrixModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
}) => {
  if (!isOpen) return null;

  const permissionsList = [
    { module: 'Sales & Invoices', name: 'Create / Edit GST Tax Invoices', super_admin: true, admin: true, accountant: true, billing: true, auditor: false },
    { module: 'Sales & Invoices', name: 'Delete / Cancel Invoices & Credit Notes', super_admin: true, admin: true, accountant: true, billing: false, auditor: false },
    { module: 'Purchase & Bills', name: 'Inward Bills & Supplier Credit Tracking', super_admin: true, admin: true, accountant: true, billing: true, auditor: false },
    { module: 'Banking & BRS', name: 'Bank Statement Import & Automated BRS', super_admin: true, admin: true, accountant: true, billing: false, auditor: false },
    { module: 'Accounting', name: 'Double-Entry Journal & Day Book Entries', super_admin: true, admin: true, accountant: true, billing: false, auditor: false },
    { module: 'Tax Returns', name: 'GSTR-1, GSTR-3B & GSTR-2B ITC Reconciliation', super_admin: true, admin: true, accountant: true, billing: false, auditor: true },
    { module: 'Ledgers & Balance Sheet', name: 'Balance Sheet, P&L, Trial Balance Inspection', super_admin: true, admin: true, accountant: true, billing: false, auditor: true },
    { module: 'Administration', name: 'Invite Team Members & Assign Roles', super_admin: true, admin: true, accountant: false, billing: false, auditor: false },
    { module: 'Platform & Multi-Tenant', name: 'Workspace Provisioning & Super Admin Console', super_admin: true, admin: false, accountant: false, billing: false, auditor: false },
    { module: 'Audit Logs', name: 'Immutable Audit Trail & Cryptographic Logs', super_admin: true, admin: true, accountant: true, billing: false, auditor: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Enterprise Role-Based Access Control (RBAC) Matrix</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold uppercase">
                  Verified Security
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Segregation of duties across five granular permission hierarchies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matrix Table */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Feature / Operation</th>
                  <th className="py-3 px-3 text-center text-amber-400 bg-amber-500/5">
                    Super Admin
                  </th>
                  <th className="py-3 px-3 text-center text-purple-400">
                    Admin
                  </th>
                  <th className="py-3 px-3 text-center text-emerald-400">
                    Accountant
                  </th>
                  <th className="py-3 px-3 text-center text-blue-400">
                    Billing Clerk
                  </th>
                  <th className="py-3 px-3 text-center text-teal-400">
                    Auditor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {permissionsList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-4 font-medium text-white">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.module}</div>
                    </td>

                    {/* Super Admin */}
                    <td className="py-2.5 px-3 text-center bg-amber-500/5">
                      {item.super_admin ? (
                        <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                      )}
                    </td>

                    {/* Admin */}
                    <td className="py-2.5 px-3 text-center">
                      {item.admin ? (
                        <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                      )}
                    </td>

                    {/* Accountant */}
                    <td className="py-2.5 px-3 text-center">
                      {item.accountant ? (
                        <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                      )}
                    </td>

                    {/* Billing Operator */}
                    <td className="py-2.5 px-3 text-center">
                      {item.billing ? (
                        <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                      )}
                    </td>

                    {/* Auditor */}
                    <td className="py-2.5 px-3 text-center">
                      {item.auditor ? (
                        <span className="inline-flex p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Compliant with Indian statutory audit compliance &amp; internal control norms</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
