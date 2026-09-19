// src/components/CustomerReviewsSection.tsx
import React, { useState } from 'react';
import {
  MessageSquareQuote,
  Star,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Sparkles,
  Award,
} from 'lucide-react';
import { CustomerReview } from '../types';
import { REVIEW_COLOR_THEMES } from './CustomerReviewManager';

interface CustomerReviewsSectionProps {
  reviews: CustomerReview[];
  loading?: boolean;
}

export const CustomerReviewsSection: React.FC<CustomerReviewsSectionProps> = ({
  reviews,
  loading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'ca' | 'enterprise' | 'featured'>('all');

  // Filter only active (published) reviews for the public landing page
  const activeReviews = reviews.filter((r) => r.isActive);

  // Apply tab filter
  const displayedReviews = activeReviews.filter((r) => {
    if (filter === 'featured') return r.isFeatured;
    if (filter === 'ca') {
      const q = (r.badge + ' ' + r.roleOrTitle + ' ' + r.authorName).toLowerCase();
      return q.includes('ca') || q.includes('auditor') || q.includes('chartered') || q.includes('tax');
    }
    if (filter === 'enterprise') {
      const q = (r.badge + ' ' + r.roleOrTitle + ' ' + r.companyName).toLowerCase();
      return (
        q.includes('enterprise') ||
        q.includes('exporter') ||
        q.includes('manufacturer') ||
        q.includes('sme') ||
        q.includes('ltd') ||
        q.includes('retail')
      );
    }
    return true;
  });

  const avgRating =
    activeReviews.length > 0
      ? (activeReviews.reduce((acc, curr) => acc + curr.rating, 0) / activeReviews.length).toFixed(1)
      : '5.0';

  return (
    <section id="reviews-section" className="pt-8 border-t border-slate-800/80 space-y-8 scroll-mt-20">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>Verified Client Social Proof</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Trusted by Chartered Accountants &amp; Enterprise Leaders Across India
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          See why accounting firms, CFOs, and business owners choose Apex TallyGST for bulletproof GST statutory compliance, multi-branch bookkeeping, and real-time bank reconciliation.
        </p>

        {/* Rating Summary Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-bold text-white font-mono text-sm">{avgRating} / 5.0</span>
            <span className="text-slate-500">({activeReviews.length} Verified Reviews)</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Verified Statutory Feedback</span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="pt-2 flex items-center justify-center">
          <div className="inline-flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Reviews ({activeReviews.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ca')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === 'ca'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CAs &amp; Tax Auditors
            </button>
            <button
              type="button"
              onClick={() => setFilter('enterprise')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === 'enterprise'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Enterprises &amp; SMEs
            </button>
            <button
              type="button"
              onClick={() => setFilter('featured')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filter === 'featured'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Featured</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-6" />
          ))}
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="p-10 text-center bg-slate-900/50 border border-slate-800 rounded-2xl max-w-md mx-auto space-y-2">
          <MessageSquareQuote className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-slate-300">No reviews found in this category</div>
          <div className="text-xs text-slate-500">Switch categories or check back soon for updated testimonials.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedReviews.map((review) => {
            const theme = REVIEW_COLOR_THEMES[review.avatarBgColor || 'indigo'] || REVIEW_COLOR_THEMES.indigo;
            const initials = review.authorName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={review.id}
                className={`bg-slate-900/90 rounded-2xl p-6 border transition flex flex-col justify-between shadow-xl relative ${
                  review.isFeatured
                    ? 'border-amber-500/40 shadow-amber-500/5 ring-1 ring-amber-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Top: Stars & Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {review.badge && (
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.border}`}
                        >
                          {review.badge}
                        </span>
                      )}
                      {review.isFeatured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                          <span>Featured</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quote Text */}
                  <blockquote className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                    &ldquo;{review.reviewText}&rdquo;
                  </blockquote>
                </div>

                {/* Author Info */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center gap-3.5">
                  {review.avatarUrl ? (
                    <img
                      src={review.avatarUrl}
                      alt={review.authorName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-full ${theme.bg} ${theme.border} ${theme.text} border flex items-center justify-center font-bold text-sm shrink-0 shadow-inner`}
                    >
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span className="truncate">{review.authorName}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Customer" />
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {review.roleOrTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 shrink-0 text-slate-500" />
                      <span className="truncate">{review.companyName}</span>
                      {review.location && (
                        <>
                          <span>•</span>
                          <span className="truncate">{review.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
