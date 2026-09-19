// src/components/FeatureBadgeManager.tsx
import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  FileText,
  Landmark,
  Zap,
  Receipt,
  BookOpen,
  Layers,
  Lock,
  Scale,
  Coins,
  FileCheck,
  Globe,
  Workflow,
  BarChart3,
  Database,
  Sparkles,
  Cpu,
  Fingerprint,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';
import { FeatureBadge } from '../types';
import {
  createFeatureBadge,
  updateFeatureBadge,
  deleteFeatureBadge,
  resetFeatureBadgesToDefault,
  moveFeatureBadgeOrder,
} from '../db/featureBadges';
import { useDialog } from '../context/DialogContext';

export const SUPPORTED_FEATURE_ICONS: { [key: string]: React.ComponentType<{ className?: string }> } = {
  ShieldCheck,
  Building2,
  FileText,
  Landmark,
  Zap,
  Receipt,
  BookOpen,
  Layers,
  Lock,
  Scale,
  Coins,
  FileCheck,
  Globe,
  Workflow,
  BarChart3,
  Database,
  Sparkles,
  Cpu,
  Fingerprint,
  CheckCircle2,
};

export const BADGE_COLOR_THEMES: {
  [key in FeatureBadge['colorTheme']]: {
    name: string;
    bgCard: string;
    borderCard: string;
    textIcon: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    accentHex: string;
  };
} = {
  emerald: {
    name: 'Emerald Green',
    bgCard: 'bg-emerald-500/5',
    borderCard: 'border-emerald-500/20',
    textIcon: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    accentHex: '#10b981',
  },
  indigo: {
    name: 'Indigo Blue',
    bgCard: 'bg-indigo-500/5',
    borderCard: 'border-indigo-500/20',
    textIcon: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-400',
    accentHex: '#6366f1',
  },
  purple: {
    name: 'Royal Purple',
    bgCard: 'bg-purple-500/5',
    borderCard: 'border-purple-500/20',
    textIcon: 'text-purple-400',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400',
    accentHex: '#a855f7',
  },
  teal: {
    name: 'Teal Cyan',
    bgCard: 'bg-teal-500/5',
    borderCard: 'border-teal-500/20',
    textIcon: 'text-teal-400',
    badgeBg: 'bg-teal-500/10',
    badgeBorder: 'border-teal-500/30',
    badgeText: 'text-teal-400',
    accentHex: '#14b8a6',
  },
  amber: {
    name: 'Amber Gold',
    bgCard: 'bg-amber-500/5',
    borderCard: 'border-amber-500/20',
    textIcon: 'text-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    accentHex: '#f59e0b',
  },
  blue: {
    name: 'Sky Blue',
    bgCard: 'bg-blue-500/5',
    borderCard: 'border-blue-500/20',
    textIcon: 'text-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    accentHex: '#3b82f6',
  },
  rose: {
    name: 'Rose Red',
    bgCard: 'bg-rose-500/5',
    borderCard: 'border-rose-500/20',
    textIcon: 'text-rose-400',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-400',
    accentHex: '#f43f5e',
  },
  cyan: {
    name: 'Electric Cyan',
    bgCard: 'bg-cyan-500/5',
    borderCard: 'border-cyan-500/20',
    textIcon: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-400',
    accentHex: '#06b6d4',
  },
};

export function renderFeatureBadgeIcon(iconName: string, className?: string) {
  const IconComp = SUPPORTED_FEATURE_ICONS[iconName] || ShieldCheck;
  return <IconComp className={className || 'w-4 h-4'} />;
}

interface FeatureBadgeManagerProps {
  badges: FeatureBadge[];
  onRefresh?: () => void;
}

export const FeatureBadgeManager: React.FC<FeatureBadgeManagerProps> = ({
  badges,
  onRefresh,
}) => {
  const dialog = useDialog();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Editor Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<FeatureBadge | null>(null);
  const [deleteConfirmBadge, setDeleteConfirmBadge] = useState<FeatureBadge | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('ShieldCheck');
  const [colorTheme, setColorTheme] = useState<FeatureBadge['colorTheme']>('emerald');
  const [badgeText, setBadgeText] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingBadge(null);
    setTitle('');
    setDescription('');
    setIcon('ShieldCheck');
    setColorTheme('emerald');
    setBadgeText('');
    setOrder(badges.length + 1);
    setIsActive(true);
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (badge: FeatureBadge) => {
    setEditingBadge(badge);
    setTitle(badge.title);
    setDescription(badge.description);
    setIcon(badge.icon);
    setColorTheme(badge.colorTheme);
    setBadgeText(badge.badgeText || '');
    setOrder(badge.order);
    setIsActive(badge.isActive);
    setIsEditorOpen(true);
  };

  // Toggle Visibility Active State
  const handleToggleActive = async (badge: FeatureBadge) => {
    try {
      const nextState = !badge.isActive;
      await updateFeatureBadge(badge.id, { isActive: nextState });
      dialog.toast.success(
        nextState
          ? `Feature badge "${badge.title}" is now visible on landing page`
          : `Feature badge "${badge.title}" is now hidden from landing page`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to toggle badge status:', err);
      dialog.toast.error(err.message || 'Failed to update feature badge visibility');
    }
  };

  // Quick move order
  const handleMoveOrder = async (badgeId: string, direction: 'up' | 'down') => {
    try {
      await moveFeatureBadgeOrder(badgeId, direction);
      dialog.toast.success('Feature badge sequence updated');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to reorder badge:', err);
      dialog.toast.error('Failed to update badge sequence');
    }
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      dialog.toast.error('Please enter a feature badge title');
      return;
    }
    if (!description.trim()) {
      dialog.toast.error('Please enter a short description');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBadge) {
        await updateFeatureBadge(editingBadge.id, {
          title: title.trim(),
          description: description.trim(),
          icon,
          colorTheme,
          badgeText: badgeText.trim() || undefined,
          order: Number(order) || 1,
          isActive,
        });
        dialog.toast.success(`Feature badge "${title}" updated successfully!`);
      } else {
        await createFeatureBadge({
          title: title.trim(),
          description: description.trim(),
          icon,
          colorTheme,
          badgeText: badgeText.trim() || undefined,
          order: Number(order) || 1,
          isActive,
          isBuiltIn: false,
        });
        dialog.toast.success(`New feature badge "${title}" created successfully!`);
      }

      setIsEditorOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to save feature badge:', err);
      dialog.toast.error(err.message || 'Failed to save feature badge');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmBadge) return;
    setSubmitting(true);
    try {
      await deleteFeatureBadge(deleteConfirmBadge.id);
      dialog.toast.success(`Feature badge "${deleteConfirmBadge.title}" deleted.`);
      setDeleteConfirmBadge(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to delete badge:', err);
      dialog.toast.error(err.message || 'Failed to delete feature badge');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset to Defaults
  const handleResetToDefaults = async () => {
    const confirmed = await dialog.confirm({
      title: 'Reset Feature Badges to Defaults?',
      message:
        'This will reset the landing page hero feature badges back to the 4 standard items: Statutory GST Compliance, Multi-Tenant Workspaces, Double-Entry Bookkeeping, and Automated Bank BRS. Any custom badges will be removed.',
      confirmText: 'Reset to Defaults',
      cancelText: 'Keep Current',
      isDestructive: true,
    });

    if (confirmed) {
      setSubmitting(true);
      try {
        await resetFeatureBadgesToDefault();
        dialog.toast.success('Feature badges reset to standard statutory defaults.');
        if (onRefresh) onRefresh();
      } catch (err: any) {
        console.error('Failed to reset badges:', err);
        dialog.toast.error('Failed to reset feature badges');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const filteredBadges = badges.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q) ||
      (b.badgeText && b.badgeText.toLowerCase().includes(q))
    );
  });

  const activeCount = badges.filter((b) => b.isActive).length;

  return (
    <div className="space-y-6">
      {/* ---------------- SECTION HEADER ---------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Hero Feature Badges Governance
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Landing Page Hero
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Add, edit, re-order, or delete the core enterprise feature badges highlighted on the public landing page hero.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={submitting}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Reset to the 4 standard statutory feature badges"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            id="btn-create-feature-badge"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Feature Badge</span>
          </button>
        </div>
      </div>

      {/* ---------------- STATS & QUICK FILTER BAR ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total Badges</span>
            <span className="text-2xl font-black text-white">{badges.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Active on Landing Page</span>
            <span className="text-2xl font-black text-emerald-400">{activeCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">System Built-In</span>
            <span className="text-2xl font-black text-indigo-400">
              {badges.filter((b) => b.isBuiltIn).length}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ---------------- SEARCH & CONTROLS ---------------- */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search feature badges by title or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{filteredBadges.length}</span> of {badges.length} badges
        </span>
      </div>

      {/* ---------------- FEATURE BADGES GRID ---------------- */}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 space-y-4">
          <div className="p-4 rounded-full bg-slate-800/80 text-slate-400 w-16 h-16 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No feature badges found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {searchTerm ? 'No badges match your search filter.' : 'No feature badges exist yet. Click "Add Feature Badge" or "Reset Defaults".'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
              >
                Seed 4 Default Badges
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBadges.map((badge, idx) => {
            const theme = BADGE_COLOR_THEMES[badge.colorTheme] || BADGE_COLOR_THEMES.emerald;

            return (
              <div
                key={badge.id}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all duration-200 space-y-3.5 relative group ${
                  badge.isActive
                    ? 'border-slate-800 hover:border-slate-700 shadow-md'
                    : 'border-slate-800/50 opacity-60 bg-slate-950'
                }`}
              >
                {/* Top Row: Sequence Badge, Pill, Status & Order Controls */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      Position #{badge.order ?? idx + 1}
                    </span>
                    {badge.badgeText && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText} border`}
                      >
                        {badge.badgeText}
                      </span>
                    )}
                    {badge.isBuiltIn && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Default
                      </span>
                    )}
                  </div>

                  {/* Order arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(badge.id, 'up')}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition"
                      title="Move badge earlier in display sequence"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === filteredBadges.length - 1}
                      onClick={() => handleMoveOrder(badge.id, 'down')}
                      className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition"
                      title="Move badge later in display sequence"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badge Visual Card Preview as rendered on Landing Page */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <div className={theme.textIcon}>
                      {renderFeatureBadgeIcon(badge.icon, 'w-4 h-4')}
                    </div>
                    <span>{badge.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {badge.description}
                  </p>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  {/* Active / Hidden toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(badge)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      badge.isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {badge.isActive ? (
                      <>
                        <Eye className="w-3 h-3 text-emerald-400" />
                        <span>Visible on Landing</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-slate-400" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>

                  {/* Edit and Delete Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id={`btn-edit-feature-badge-${badge.id}`}
                      onClick={() => handleOpenEditModal(badge)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Edit this feature badge"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      id={`btn-delete-feature-badge-${badge.id}`}
                      onClick={() => setDeleteConfirmBadge(badge)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Delete this feature badge"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- CREATE / EDIT MODAL ---------------- */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {editingBadge ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingBadge ? 'Edit Feature Badge' : 'Create New Feature Badge'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure the badge content, icon, and visual style for the landing page hero.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="space-y-5">
              {/* Badge Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span>Feature Title</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Statutory GST Compliance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                />
              </div>

              {/* Subtitle / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span>Description / Subtitle</span>
                  <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Intra/Inter-State dual tax engine, HSN auto-lookup & real-time GSTR-1/3B."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
                />
              </div>

              {/* Row: Category Pill & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Category Tag / Pill (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Statutory, Enterprise, Fintech"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Display Sequence Order #
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Select Icon Component
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 max-h-36 overflow-y-auto">
                  {Object.keys(SUPPORTED_FEATURE_ICONS).map((iconKey) => {
                    const isSelected = icon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setIcon(iconKey)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                        title={iconKey}
                      >
                        {renderFeatureBadgeIcon(iconKey, 'w-4 h-4')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Accent Color Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(Object.keys(BADGE_COLOR_THEMES) as FeatureBadge['colorTheme'][]).map((themeKey) => {
                    const t = BADGE_COLOR_THEMES[themeKey];
                    const isSelected = colorTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => setColorTheme(themeKey)}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.accentHex }}
                        />
                        <span className="text-[11px] font-semibold truncate">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Show on Public Landing Page
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Immediately displays in the hero section below the value proposition.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    isActive ? 'bg-emerald-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Live Preview Box */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Live Landing Page Card Preview
                </span>
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs">
                    <div className={BADGE_COLOR_THEMES[colorTheme]?.textIcon || 'text-emerald-400'}>
                      {renderFeatureBadgeIcon(icon, 'w-4 h-4')}
                    </div>
                    <span>{title.trim() || 'Feature Badge Title'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {description.trim() || 'Feature badge explanatory subtitle or description here.'}
                  </p>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingBadge ? 'Save Changes' : 'Create Badge'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- DELETE CONFIRMATION MODAL ---------------- */}
      {deleteConfirmBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Feature Badge?</h3>
                <p className="text-xs text-slate-400">
                  This action will permanently remove the badge from the public landing page.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                {renderFeatureBadgeIcon(deleteConfirmBadge.icon, 'w-4 h-4 text-rose-400')}
                <span>{deleteConfirmBadge.title}</span>
              </div>
              <p className="text-[11px] text-slate-400">{deleteConfirmBadge.description}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBadge(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Badge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
