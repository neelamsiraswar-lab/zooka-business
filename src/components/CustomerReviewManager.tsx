// src/components/CustomerReviewManager.tsx
import React, { useState, useMemo } from 'react';
import {
  MessageSquareQuote,
  Star,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  MapPin,
  Building2,
  X,
  AlertTriangle,
  Award,
  ChevronRight,
} from 'lucide-react';
import { CustomerReview } from '../types';
import {
  createCustomerReview,
  updateCustomerReview,
  deleteCustomerReview,
  resetCustomerReviewsToDefault,
} from '../db/customerReviews';

export const REVIEW_COLOR_THEMES: Record<
  NonNullable<CustomerReview['avatarBgColor']>,
  {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
  },
  indigo: {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-400',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-400',
  },
  teal: {
    bg: 'bg-teal-500/20',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    badgeBg: 'bg-teal-500/10',
    badgeText: 'text-teal-400',
  },
  amber: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
  },
  rose: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-400',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
  },
};

interface CustomerReviewManagerProps {
  reviews: CustomerReview[];
  onRefresh: () => void;
}

export const CustomerReviewManager: React.FC<CustomerReviewManagerProps> = ({
  reviews,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'hidden' | 'featured'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3'>('all');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<CustomerReview | null>(null);
  const [deleteConfirmReview, setDeleteConfirmReview] = useState<CustomerReview | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [authorName, setAuthorName] = useState('');
  const [roleOrTitle, setRoleOrTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState('');
  const [badge, setBadge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarBgColor, setAvatarBgColor] = useState<NonNullable<CustomerReview['avatarBgColor']>>('indigo');
  const [order, setOrder] = useState<number>(1);
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingReview(null);
    setAuthorName('');
    setRoleOrTitle('');
    setCompanyName('');
    setLocation('');
    setRating(5);
    setReviewText('');
    setBadge('Verified Client');
    setAvatarUrl('');
    setAvatarBgColor('indigo');
    setOrder((reviews.length > 0 ? Math.max(...reviews.map((r) => r.order)) : 0) + 1);
    setIsFeatured(false);
    setIsActive(true);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (review: CustomerReview) => {
    setEditingReview(review);
    setAuthorName(review.authorName);
    setRoleOrTitle(review.roleOrTitle);
    setCompanyName(review.companyName);
    setLocation(review.location || '');
    setRating(review.rating);
    setReviewText(review.reviewText);
    setBadge(review.badge || '');
    setAvatarUrl(review.avatarUrl || '');
    setAvatarBgColor(review.avatarBgColor || 'indigo');
    setOrder(review.order);
    setIsFeatured(review.isFeatured);
    setIsActive(review.isActive);
    setModalOpen(true);
  };

  // 1-Click Toggle Active
  const handleToggleActive = async (review: CustomerReview) => {
    try {
      const nextState = !review.isActive;
      await updateCustomerReview(review.id, { isActive: nextState });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle review visibility:', err);
    }
  };

  // 1-Click Toggle Featured
  const handleToggleFeatured = async (review: CustomerReview) => {
    try {
      const nextState = !review.isFeatured;
      await updateCustomerReview(review.id, { isFeatured: nextState });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle review featured status:', err);
    }
  };

  // Save Form (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !companyName.trim() || !reviewText.trim()) {
      alert('Please provide Author Name, Company, and Review statement.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingReview) {
        await updateCustomerReview(editingReview.id, {
          authorName: authorName.trim(),
          roleOrTitle: roleOrTitle.trim(),
          companyName: companyName.trim(),
          location: location.trim(),
          rating,
          reviewText: reviewText.trim(),
          badge: badge.trim(),
          avatarUrl: avatarUrl.trim(),
          avatarBgColor,
          order,
          isFeatured,
          isActive,
        });
      } else {
        await createCustomerReview({
          authorName: authorName.trim(),
          roleOrTitle: roleOrTitle.trim(),
          companyName: companyName.trim(),
          location: location.trim(),
          rating,
          reviewText: reviewText.trim(),
          badge: badge.trim(),
          avatarUrl: avatarUrl.trim(),
          avatarBgColor,
          order,
          isFeatured,
          isActive,
        });
      }
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save review:', err);
      alert('Failed to save review. Please check the network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmReview) return;
    setSubmitting(true);
    try {
      await deleteCustomerReview(deleteConfirmReview.id);
      setDeleteConfirmReview(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete review:', err);
      alert('Failed to delete review.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset to Factory Defaults
  const handleResetConfirm = async () => {
    setSubmitting(true);
    try {
      await resetCustomerReviewsToDefault();
      setResetConfirmOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to reset reviews:', err);
      alert('Failed to reset reviews.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAuthor = r.authorName.toLowerCase().includes(q);
        const matchesCompany = r.companyName.toLowerCase().includes(q);
        const matchesRole = r.roleOrTitle.toLowerCase().includes(q);
        const matchesText = r.reviewText.toLowerCase().includes(q);
        const matchesLocation = (r.location || '').toLowerCase().includes(q);
        const matchesBadge = (r.badge || '').toLowerCase().includes(q);
        if (!matchesAuthor && !matchesCompany && !matchesRole && !matchesText && !matchesLocation && !matchesBadge) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'published' && !r.isActive) return false;
      if (statusFilter === 'hidden' && r.isActive) return false;
      if (statusFilter === 'featured' && !r.isFeatured) return false;

      // Rating
      if (ratingFilter !== 'all' && r.rating !== parseInt(ratingFilter, 10)) return false;

      return true;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter]);

  // Aggregate Metrics
  const publishedCount = reviews.filter((r) => r.isActive).length;
  const featuredCount = reviews.filter((r) => r.isFeatured).length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <div className="space-y-6">
      {/* ================= HEADER & STATS ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Public Social Proof Governance</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Customer Reviews &amp; Testimonials
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Manage verified client reviews and ratings displayed on the public landing page. Add real testimonials from Chartered Accountants, tax auditors, and enterprise clients.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            title="Reset to statutory verified factory reviews"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Review</span>
          </button>
        </div>
      </div>

      {/* ================= METRICS TILES ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-400" />
            <span>Total Reviews</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {reviews.length}
          </div>
          <div className="text-[11px] text-slate-500">Stored in Cloud Firestore</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live on Landing</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {publishedCount}
          </div>
          <div className="text-[11px] text-slate-500">Visible to public visitors</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Featured Hero</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
            {featuredCount}
          </div>
          <div className="text-[11px] text-slate-500">Highlighted badges &amp; priority</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Average Rating</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-center gap-1.5">
            <span>{avgRating}</span>
            <span className="text-xs font-normal text-amber-400 flex items-center">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" /> / 5.0
            </span>
          </div>
          <div className="text-[11px] text-slate-500">Client satisfaction metric</div>
        </div>
      </div>

      {/* ================= SEARCH & FILTER CONTROLS ================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reviewer, firm, or review text..."
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3.5 py-2 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
          <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'published'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Live ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('featured')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'featured'
                  ? 'bg-amber-500/20 text-amber-400 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Featured ({featuredCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('hidden')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'hidden'
                  ? 'bg-slate-800 text-slate-300 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hidden ({reviews.length - publishedCount})
            </button>
          </div>

          <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setRatingFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                ratingFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ★
            </button>
            <button
              type="button"
              onClick={() => setRatingFilter('5')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                ratingFilter === '5' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>5</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= REVIEWS GRID ================= */}
      {filteredReviews.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No reviews found</h3>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? `No reviews matched "${searchQuery}". Try clearing search filters.`
                : 'No reviews match your current filters. Add a new review to get started.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Review</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReviews.map((review) => {
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
                className={`rounded-2xl p-5 bg-slate-900 border transition flex flex-col justify-between space-y-4 relative ${
                  review.isFeatured
                    ? 'border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : review.isActive
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/60 opacity-60 bg-slate-950/60'
                }`}
              >
                {/* Card Top: Order index, Badges, Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                        #{review.order}
                      </span>
                      {review.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.border}`}
                        >
                          {review.badge}
                        </span>
                      )}
                      {review.isFeatured && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 inline-flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>Featured</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          review.isActive
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {review.isActive ? 'Live' : 'Hidden'}
                      </span>
                    </div>
                  </div>

                  {/* Rating Stars */}
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
                    <span className="text-xs font-mono font-bold text-slate-300 ml-1.5">
                      {review.rating}.0
                    </span>
                  </div>

                  {/* Testimonial Quote */}
                  <p className="text-xs text-slate-300 leading-relaxed italic relative">
                    &ldquo;{review.reviewText}&rdquo;
                  </p>
                </div>

                {/* Card Bottom: Author Bio & Management Controls */}
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-3">
                    {review.avatarUrl ? (
                      <img
                        src={review.avatarUrl}
                        alt={review.authorName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full ${theme.bg} ${theme.border} ${theme.text} border flex items-center justify-center font-bold text-xs shrink-0`}
                      >
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                        <span>{review.authorName}</span>
                        {review.isBuiltIn && (
                          <span className="text-[9px] text-slate-500" title="Built-in Standard Review">
                            • Standard
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {review.roleOrTitle}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-2.5 h-2.5 shrink-0" />
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

                  {/* Quick Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(review)}
                        className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                          review.isActive
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-slate-400 hover:bg-slate-800'
                        }`}
                        title={review.isActive ? 'Hide from landing page' : 'Publish live to landing page'}
                      >
                        {review.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="text-[10px]">{review.isActive ? 'Hide' : 'Publish'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(review)}
                        className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                          review.isFeatured
                            ? 'text-amber-400 hover:bg-amber-500/10'
                            : 'text-slate-400 hover:bg-slate-800'
                        }`}
                        title={review.isFeatured ? 'Unmark from featured' : 'Mark as featured hero testimonial'}
                      >
                        <Star className={`w-3.5 h-3.5 ${review.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                        <span className="text-[10px]">{review.isFeatured ? 'Featured' : 'Feature'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(review)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Edit Review Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmReview(review)}
                        className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete Review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD / EDIT REVIEW MODAL ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <MessageSquareQuote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingReview ? 'Edit Customer Review' : 'Add Customer Review'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure reviewer details, rating, badge, and statutory quote for the public landing page.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form & Live Preview Split */}
            <form onSubmit={handleSaveForm} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 cols: Inputs */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Author Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Reviewer Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g. CA Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Role / Title */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Designation / Role
                      </label>
                      <input
                        type="text"
                        value={roleOrTitle}
                        onChange={(e) => setRoleOrTitle(e.target.value)}
                        placeholder="e.g. Senior Partner & GST Lead"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Company / Firm <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Sharma & Associates LLP"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Location */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        City / Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Mumbai, Maharashtra"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Badge */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Verification Badge
                      </label>
                      <input
                        type="text"
                        value={badge}
                        onChange={(e) => setBadge(e.target.value)}
                        placeholder="e.g. Verified CA, SME Client"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Rating Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Star Rating ({rating} of 5 Stars)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((starNum) => (
                        <button
                          key={starNum}
                          type="button"
                          onClick={() => setRating(starNum)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500 transition cursor-pointer"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              starNum <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs text-amber-400 font-semibold ml-2">
                        {rating === 5
                          ? '5.0 - Exceptional'
                          : rating === 4
                          ? '4.0 - Great'
                          : `${rating}.0 Stars`}
                      </span>
                    </div>
                  </div>

                  {/* Review Quote Text */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Review / Testimonial Statement <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Detail how Apex TallyGST improved accounting, simplified GSTR filing, or automated bank reconciliation..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>Recommend 100-250 characters for best landing page layout.</span>
                      <span>{reviewText.length} chars</span>
                    </div>
                  </div>

                  {/* Color Accent Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Avatar Color Accent
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(Object.keys(REVIEW_COLOR_THEMES) as NonNullable<CustomerReview['avatarBgColor']>[]).map(
                        (themeKey) => {
                          const t = REVIEW_COLOR_THEMES[themeKey];
                          const isSelected = avatarBgColor === themeKey;
                          return (
                            <button
                              key={themeKey}
                              type="button"
                              onClick={() => setAvatarBgColor(themeKey)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer capitalize flex items-center gap-1.5 ${
                                isSelected
                                  ? `${t.bg} ${t.text} ${t.border} ring-2 ring-amber-500/50`
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${t.bg} ${t.border} border`} />
                              <span>{themeKey}</span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Sequence Order & Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Display Order
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={order}
                        onChange={(e) => setOrder(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                        />
                        <span className="text-xs font-semibold text-slate-300">Live on Landing</span>
                      </label>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={(e) => setIsFeatured(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                        />
                        <span className="text-xs font-semibold text-slate-300">Featured Hero</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right 5 cols: Live Card Preview */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Live Public Card Preview</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="text-[11px] text-slate-500">
                      As it will render in the verified testimonials grid:
                    </div>

                    <div
                      className={`p-5 rounded-2xl bg-slate-900 border transition flex flex-col justify-between space-y-4 shadow-xl ${
                        isFeatured ? 'border-amber-500/50' : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                              #{order}
                            </span>
                            {badge && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  REVIEW_COLOR_THEMES[avatarBgColor].badgeBg
                                } ${REVIEW_COLOR_THEMES[avatarBgColor].badgeText} ${
                                  REVIEW_COLOR_THEMES[avatarBgColor].border
                                }`}
                              >
                                {badge}
                              </span>
                            )}
                            {isFeatured && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 inline-flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span>Featured</span>
                              </span>
                            )}
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {isActive ? 'Live' : 'Hidden'}
                          </span>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-mono font-bold text-slate-300 ml-1.5">
                            {rating}.0
                          </span>
                        </div>

                        {/* Quote */}
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                          &ldquo;{reviewText || 'Review quote preview text will appear here...'}&rdquo;
                        </p>
                      </div>

                      {/* Author */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${REVIEW_COLOR_THEMES[avatarBgColor].bg} ${REVIEW_COLOR_THEMES[avatarBgColor].border} ${REVIEW_COLOR_THEMES[avatarBgColor].text} border flex items-center justify-center font-bold text-xs shrink-0`}
                        >
                          {(authorName || 'User')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {authorName || 'Reviewer Full Name'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {roleOrTitle || 'Designation'}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5 shrink-0" />
                            <span>{companyName || 'Company Name'}</span>
                            {location && (
                              <>
                                <span>•</span>
                                <span>{location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  {submitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingReview ? 'Save Changes' : 'Create Review'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteConfirmReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Delete Customer Review?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete the review from{' '}
                <span className="text-white font-semibold">{deleteConfirmReview.authorName}</span> (
                {deleteConfirmReview.companyName})? This action will remove it from the public landing page.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmReview(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESET DEFAULTS CONFIRMATION MODAL ================= */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Reset to Standard Factory Reviews?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will reset all customer reviews to standard statutory default verified testimonials (CA Rajesh Sharma, Priya Sundaram, etc.). Any custom reviews will be replaced.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{submitting ? 'Resetting...' : 'Confirm Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
