import React, { useState, useMemo, useEffect } from 'react';
import { CompanyProfile } from '../types';
import {
  calculateFilingDeadlines,
  generateGstCalendarIcs,
  GstDeadlineItem,
  GstFilingCycle,
} from '../utils/gstDeadlineCalculator';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Coins,
  Scale,
  Building2,
  CalendarCheck2,
  Info,
  ExternalLink,
  Check,
  Sparkles,
} from 'lucide-react';

interface GstrFilingDeadlineTrackerProps {
  company?: CompanyProfile | null;
  onNavigateToTab?: (tab: 'gstr1' | 'gstr2b' | 'gstr3b' | 'gstrCompare') => void;
  className?: string;
  defaultExpanded?: boolean;
}

export const GstrFilingDeadlineTracker: React.FC<GstrFilingDeadlineTrackerProps> = ({
  company,
  onNavigateToTab,
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [filingScheme, setFilingScheme] = useState<'monthly' | 'qrmp'>('monthly');
  const [activeCycleTab, setActiveCycleTab] = useState<'current' | 'previous' | 'upcoming'>('current');
  
  // Persistent or in-memory filed statuses
  const [filedStatusMap, setFiledStatusMap] = useState<Record<string, { filedDate?: string; arn?: string }>>(() => {
    try {
      const stored = localStorage.getItem('gstr_filed_statuses');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Modal for marking a return as filed
  const [markingItem, setMarkingItem] = useState<GstDeadlineItem | null>(null);
  const [arnInput, setArnInput] = useState('');
  const [filingDateInput, setFilingDateInput] = useState(new Date().toISOString().split('T')[0]);

  // Persist filedStatusMap
  useEffect(() => {
    try {
      localStorage.setItem('gstr_filed_statuses', JSON.stringify(filedStatusMap));
    } catch {
      // Ignore
    }
  }, [filedStatusMap]);

  // Calculate deadlines
  const deadlineData = useMemo(() => {
    const now = new Date();
    return calculateFilingDeadlines(
      now,
      company?.stateCode || company?.stateName || company?.gstin,
      filingScheme,
      filedStatusMap
    );
  }, [company, filingScheme, filedStatusMap]);

  const { nextImmediateDeadline, currentCycle, previousCycle, upcomingCycle, qrmpInfo, companyStateName } = deadlineData;

  const activeCycle: GstFilingCycle =
    activeCycleTab === 'current'
      ? currentCycle
      : activeCycleTab === 'previous'
      ? previousCycle
      : upcomingCycle;

  // Handle Mark as Filed
  const handleConfirmFiled = () => {
    if (!markingItem) return;
    setFiledStatusMap((prev) => ({
      ...prev,
      [markingItem.id]: {
        filedDate: filingDateInput || new Date().toISOString().split('T')[0],
        arn: arnInput.trim() || `ARN-${Date.now().toString().slice(-8)}`,
      },
    }));
    setMarkingItem(null);
    setArnInput('');
  };

  const handleToggleUnfile = (itemId: string) => {
    setFiledStatusMap((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  // Download iCal (.ics)
  const handleDownloadCalendar = () => {
    const icsContent = generateGstCalendarIcs(
      deadlineData.allDeadlines,
      company?.tradeName || company?.businessName || 'Business'
    );
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `GST-Filing-Deadlines-${new Date().getFullYear()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Urgency styling helper
  const getUrgencyBadge = (item: GstDeadlineItem) => {
    if (item.status === 'filed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Filed & Compliant</span>
        </span>
      );
    }

    if (item.status === 'due_today') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <span>DUE TODAY (by 23:59 IST)</span>
        </span>
      );
    }

    if (item.status === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Overdue by {Math.abs(item.daysRemaining)} day{Math.abs(item.daysRemaining) > 1 ? 's' : ''}</span>
        </span>
      );
    }

    if (item.daysRemaining <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Critical: {item.daysRemaining} day{item.daysRemaining > 1 ? 's' : ''} left</span>
        </span>
      );
    }

    if (item.daysRemaining <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Due in {item.daysRemaining} days</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>{item.daysRemaining} days remaining</span>
      </span>
    );
  };

  return (
    <div className={`bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all ${className}`}>
      {/* Top Banner / Header (Always Visible) */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Next Imminent Deadline Spotlight */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 text-amber-400 shrink-0">
            <CalendarCheck2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                GST Statutory Filing Deadline Tracker
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-mono">
                {companyStateName} (State {company?.stateCode || '27'})
              </span>
            </div>

            {nextImmediateDeadline ? (
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Next Due:{' '}
                  <span className="text-amber-300 font-mono">{nextImmediateDeadline.formType}</span> ({nextImmediateDeadline.taxPeriod})
                </span>
                <span className="text-xs text-slate-400">
                  due on <strong className="text-slate-200">{nextImmediateDeadline.dueDateFormatted}</strong>
                </span>
                {getUrgencyBadge(nextImmediateDeadline)}
              </div>
            ) : (
              <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>All upcoming statutory filing deadlines are up to date!</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Actions & Expand Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {nextImmediateDeadline?.actionTab && onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab(nextImmediateDeadline.actionTab!)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <span>Prepare {nextImmediateDeadline.formType}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleDownloadCalendar}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Download .ics calendar file with all GST due dates"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sync iCal</span>
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            title={isExpanded ? 'Collapse Deadline Tracker' : 'Expand Deadline Tracker'}
          >
            {isExpanded ? (
              <>
                <span className="text-[11px] hidden sm:inline">Minimize</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="text-[11px] hidden sm:inline">View Deadlines</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Filing Schedule & Calendar Details */}
      {isExpanded && (
        <div className="border-t border-slate-800 p-4 sm:p-5 space-y-5 animate-fade-in bg-slate-950/40">
          {/* Controls: Scheme Selector & Return Period Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            {/* Cycle Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setActiveCycleTab('current')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeCycleTab === 'current'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <span>Current Cycle ({currentCycle.taxPeriod})</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </button>

              <button
                onClick={() => setActiveCycleTab('previous')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeCycleTab === 'previous'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <span>Previous Cycle ({previousCycle.taxPeriod})</span>
              </button>

              <button
                onClick={() => setActiveCycleTab('upcoming')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeCycleTab === 'upcoming'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <span>Next Cycle ({upcomingCycle.taxPeriod})</span>
              </button>
            </div>

            {/* Filing Scheme Switcher */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Scheme:</span>
              <div className="bg-slate-900 p-0.5 rounded-xl border border-slate-800 flex">
                <button
                  onClick={() => setFilingScheme('monthly')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    filingScheme === 'monthly'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Monthly Regular
                </button>
                <button
                  onClick={() => setFilingScheme('qrmp')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                    filingScheme === 'qrmp'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>QRMP (Quarterly)</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-400/20 text-indigo-300 font-bold">
                    ≤ 5 Cr
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Deadlines Grid for Active Return Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCycle.deadlines.map((item) => {
              const isFiled = Boolean(filedStatusMap[item.id]);
              const filedInfo = filedStatusMap[item.id];

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                    isFiled
                      ? 'bg-slate-900/60 border-emerald-500/30'
                      : item.urgency === 'critical'
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-md shadow-rose-950/20'
                      : item.urgency === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-md shadow-amber-950/20'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {/* Decorative glowing gradient for critical items */}
                  {item.urgency === 'critical' && !isFiled && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                  )}

                  {/* Header Row: Form Badge & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs tracking-wider ${
                            item.formType === 'GSTR-1'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : item.formType === 'GSTR-3B'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : item.formType === 'GSTR-2B'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {item.formType}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{item.applicableCategory}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">{item.title}</h4>
                    </div>

                    <div className="shrink-0">{getUrgencyBadge(item)}</div>
                  </div>

                  {/* Date & Countdown Block */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1 font-mono text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Statutory Due Date:</span>
                      <span className="text-white font-bold text-sm">{item.dueDateFormatted}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Filing Cut-off:</span>
                      <span>{item.cutoffTime}</span>
                    </div>
                    {isFiled && filedInfo && (
                      <div className="pt-1.5 border-t border-slate-800 text-[11px] text-emerald-400 space-y-0.5 font-sans">
                        <div className="flex justify-between">
                          <span>Filed Date:</span>
                          <span className="font-mono">{filedInfo.filedDate}</span>
                        </div>
                        {filedInfo.arn && (
                          <div className="flex justify-between">
                            <span>ARN Reference:</span>
                            <span className="font-mono text-slate-300">{filedInfo.arn}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Statutory Description & Rule */}
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400 text-[11px] line-clamp-2">{item.description}</p>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Info className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{item.statutoryRule}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {/* Mark as Filed Toggle */}
                    {isFiled ? (
                      <button
                        onClick={() => handleToggleUnfile(item.id)}
                        className="text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      >
                        Undo Filed
                      </button>
                    ) : item.formType !== 'GSTR-2B' ? (
                      <button
                        onClick={() => {
                          setMarkingItem(item);
                          setArnInput('');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Mark as Filed</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Auto-generated</span>
                    )}

                    {/* Go to Report Tab Button */}
                    {item.actionTab && onNavigateToTab && (
                      <button
                        onClick={() => onNavigateToTab(item.actionTab!)}
                        className="px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>Open {item.formType}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Statutory Compliance Footer Strip */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  <strong>Late Fee (Sec 47)</strong>: ₹50/day (₹25 CGST + ₹25 SGST) or ₹20/day for Nil return.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  <strong>Interest (Sec 50)</strong>: 18% p.a. on delayed net cash payment.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-500">QRMP Filing Category:</span>
              <span className="text-emerald-400 font-semibold">{qrmpInfo.groupName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mark Return as Filed */}
      {markingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Record Return Filing</h3>
                  <p className="text-xs text-slate-400">{markingItem.title}</p>
                </div>
              </div>
              <button
                onClick={() => setMarkingItem(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Application Reference Number (ARN) (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AA2709260123456"
                  value={arnInput}
                  onChange={(e) => setArnInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Date of Filing</label>
                <input
                  type="date"
                  value={filingDateInput}
                  onChange={(e) => setFilingDateInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300 leading-relaxed">
                Marking this return as filed will update your compliance status and cancel any overdue alerts for {markingItem.taxPeriod}.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMarkingItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFiled}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Filed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
