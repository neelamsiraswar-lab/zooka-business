// src/components/SubscriptionBanner.tsx
import React from 'react';
import { Workspace } from '../types';
import { evaluateSubscription } from '../lib/subscriptionEnforcement';
import { AlertTriangle, Clock, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

interface SubscriptionBannerProps {
  workspace: Workspace | null;
  onNavigateToSubscription: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  workspace,
  onNavigateToSubscription,
}) => {
  if (!workspace) return null;

  const evaluation = evaluateSubscription(workspace);

  // If active and has plenty of days, or enterprise full tier without expiry issues, don't show
  if (evaluation.isActive && evaluation.status === 'active' && evaluation.daysRemaining > 14) {
    return null;
  }

  // If trial with more than 5 days left, keep unobtrusive
  if (evaluation.status === 'trial' && evaluation.daysRemaining > 5) {
    return null;
  }

  // Determine styles based on urgency
  const isDanger = evaluation.isBlocked;
  const isGrace = evaluation.isGracePeriod;
  const isExpiringSoon = evaluation.daysRemaining <= 5 && !evaluation.isBlocked;

  let bgClasses = 'bg-indigo-950/80 border-indigo-500/30 text-indigo-200';
  let icon = <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />;

  if (isDanger) {
    bgClasses = 'bg-rose-950/80 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/40';
    icon = <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />;
  } else if (isGrace) {
    bgClasses = 'bg-amber-950/80 border-amber-500/40 text-amber-200 shadow-lg shadow-amber-950/40';
    icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
  } else if (isExpiringSoon) {
    bgClasses = 'bg-amber-950/70 border-amber-500/30 text-amber-200';
    icon = <Clock className="w-4 h-4 text-amber-400 shrink-0" />;
  }

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3">
      <div className={`border rounded-2xl p-3.5 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-sm ${bgClasses}`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-black/30 shrink-0 mt-0.5 sm:mt-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 font-bold">
              <span>{evaluation.title}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-black/40 font-mono font-semibold">
                {evaluation.planTier}
              </span>
              {evaluation.daysRemaining > 0 && evaluation.daysRemaining <= 14 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-medium">
                  {evaluation.daysRemaining} days left
                </span>
              )}
            </div>
            <p className="opacity-90 mt-0.5 text-[11px] leading-relaxed max-w-3xl">
              {evaluation.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center shrink-0">
          <button
            onClick={onNavigateToSubscription}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow cursor-pointer text-xs ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <span>{isDanger ? 'Renew Subscription' : 'Manage Plan & Billing'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
