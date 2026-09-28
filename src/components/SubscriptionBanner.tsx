// src/components/SubscriptionBanner.tsx
import React, { useState } from 'react';
import { Workspace } from '../types';
import { evaluateSubscription, getRenewalReminderEvaluation } from '../lib/subscriptionEnforcement';
import { formatINR } from '../data/subscriptionPlans';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  BellRing,
  CheckCircle,
  X,
  Calendar,
} from 'lucide-react';

interface SubscriptionBannerProps {
  workspace: Workspace | null;
  onNavigateToSubscription: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  workspace,
  onNavigateToSubscription,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (!workspace || dismissed) return null;

  const evaluation = evaluateSubscription(workspace);
  const reminder = getRenewalReminderEvaluation(workspace);

  // If no reminder is due and the evaluation is unrestricted and has plenty of days, hide banner
  if (!reminder.shouldShowReminder && evaluation.isActive && evaluation.status === 'active' && evaluation.daysRemaining > 14) {
    return null;
  }

  // If trial with plenty of days, keep unobtrusive
  if (evaluation.status === 'trial' && evaluation.daysRemaining > 7) {
    return null;
  }

  const isDanger = evaluation.isBlocked || reminder.urgency === 'critical';
  const isGrace = evaluation.isGracePeriod;
  const isUrgent = reminder.urgency === 'urgent';
  const isYearly = reminder.isYearly;

  let bgClasses = 'bg-indigo-950/85 border-indigo-500/35 text-indigo-200';
  let icon = <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />;

  if (isDanger) {
    bgClasses = 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/40';
    icon = <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />;
  } else if (isGrace) {
    bgClasses = 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-lg shadow-amber-950/40';
    icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
  } else if (isUrgent) {
    bgClasses = 'bg-amber-950/80 border-amber-500/35 text-amber-200 shadow-md shadow-amber-950/30';
    icon = <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
  } else if (reminder.shouldShowReminder && isYearly) {
    bgClasses = 'bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-900 border-indigo-500/40 text-indigo-200 shadow-lg shadow-indigo-950/30';
    icon = <BellRing className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />;
  }

  const displayTitle = reminder.shouldShowReminder ? reminder.title : evaluation.title;
  const displayMessage = reminder.shouldShowReminder ? reminder.message : evaluation.message;
  const daysLeft = reminder.shouldShowReminder ? reminder.daysRemaining : evaluation.daysRemaining;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3">
      <div
        className={`border rounded-2xl p-3.5 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm transition-all ${bgClasses}`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-black/35 shrink-0 mt-0.5 sm:mt-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap font-bold">
              <span>{displayTitle}</span>

              {/* Cadence Badge */}
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-black/40 font-mono font-semibold text-slate-300 border border-slate-700/50">
                {isYearly ? 'Annual Billing' : 'Monthly Billing'}
              </span>

              {/* Plan Tier Badge */}
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-indigo-500/20 text-indigo-300 font-mono font-semibold border border-indigo-500/30">
                {evaluation.planTier}
              </span>

              {/* Auto Reminder Notice Tag */}
              {reminder.shouldShowReminder && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Auto-Reminder Active</span>
                </span>
              )}

              {/* Days left badge */}
              {daysLeft > 0 && daysLeft <= (isYearly ? 30 : 14) && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    daysLeft <= 3
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : daysLeft <= 7
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {daysLeft} day{daysLeft === 1 ? '' : 's'} left
                </span>
              )}
            </div>

            <p className="opacity-90 mt-1 text-[11px] leading-relaxed max-w-3xl">
              {displayMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center shrink-0">
          <button
            onClick={onNavigateToSubscription}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow cursor-pointer text-xs ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : isYearly && reminder.shouldShowReminder
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <span>
              {isDanger
                ? 'Renew Subscription'
                : reminder.shouldShowReminder
                ? `Renew ${isYearly ? 'Yearly' : 'Monthly'} Plan (${formatINR(reminder.renewalAmount)})`
                : 'Manage Plan & Billing'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {!isDanger && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-black/20 transition cursor-pointer"
              title="Dismiss notification for this session"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

