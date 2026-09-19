// src/components/HomepageCustomizationManager.tsx
import React, { useState } from 'react';
import {
  Sparkles,
  Calculator,
  Layers,
  BarChart3,
  CreditCard,
  MessageSquareQuote,
  ShieldCheck,
  HelpCircle,
  Zap,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MoveVertical,
  X,
  Check,
  LayoutTemplate,
  Sliders,
  Info,
} from 'lucide-react';
import { HomepageSection, HomepageSectionKey } from '../types';
import {
  updateHomepageSection,
  toggleHomepageSectionVisibility,
  moveHomepageSectionOrder,
  reorderAllHomepageSections,
  createHomepageSection,
  deleteHomepageSection,
  resetHomepageSectionsToDefault,
} from '../db/homepageSections';

export function renderSectionIcon(iconName: string, className = 'w-4 h-4') {
  switch (iconName) {
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'BarChart3':
      return <BarChart3 className={className} />;
    case 'CreditCard':
      return <CreditCard className={className} />;
    case 'MessageSquareQuote':
      return <MessageSquareQuote className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'HelpCircle':
      return <HelpCircle className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Sliders':
      return <Sliders className={className} />;
    default:
      return <LayoutTemplate className={className} />;
  }
}

const CATEGORY_STYLES: Record<
  HomepageSection['category'],
  { label: string; badge: string; iconBg: string; textIcon: string }
> = {
  core: {
    label: 'Core Framework',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    iconBg: 'bg-emerald-500/10 border-emerald-500/30',
    textIcon: 'text-emerald-400',
  },
  tools: {
    label: 'Interactive Tool',
    badge: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
    iconBg: 'bg-teal-500/10 border-teal-500/30',
    textIcon: 'text-teal-300',
  },
  social_proof: {
    label: 'Social Proof',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    iconBg: 'bg-amber-500/10 border-amber-500/30',
    textIcon: 'text-amber-400',
  },
  commercial: {
    label: 'Commercial & Plans',
    badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    iconBg: 'bg-indigo-500/10 border-indigo-500/30',
    textIcon: 'text-indigo-400',
  },
  compliance: {
    label: 'Trust & Compliance',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    iconBg: 'bg-blue-500/10 border-blue-500/30',
    textIcon: 'text-blue-400',
  },
};

interface HomepageCustomizationManagerProps {
  sections: HomepageSection[];
  onRefresh: () => Promise<void>;
  onNavigateToLandingPage?: () => void;
}

export const HomepageCustomizationManager: React.FC<HomepageCustomizationManagerProps> = ({
  sections,
  onRefresh,
  onNavigateToLandingPage,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCustomBadge, setEditCustomBadge] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState<HomepageSectionKey>('trust-metrics');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newCategory, setNewCategory] = useState<HomepageSection['category']>('compliance');
  const [newIcon, setNewIcon] = useState('ShieldCheck');
  const [newBadge, setNewBadge] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [deleteConfirmSection, setDeleteConfirmSection] = useState<HomepageSection | null>(null);

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const visibleCount = sortedSections.filter((s) => s.isVisible).length;
  const hiddenCount = sortedSections.length - visibleCount;

  // Show notification
  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Toggle Visibility
  const handleToggleVisibility = async (section: HomepageSection) => {
    setLoadingAction(`toggle-${section.id}`);
    try {
      const nextVisible = !section.isVisible;
      await toggleHomepageSectionVisibility(section.id, nextVisible);
      await onRefresh();
      notify(
        'success',
        `"${section.title}" is now ${nextVisible ? 'VISIBLE' : 'HIDDEN'} on the public landing page.`
      );
    } catch (err: any) {
      notify('error', `Failed to update visibility: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Move Order
  const handleMoveOrder = async (sectionId: string, direction: 'up' | 'down') => {
    setLoadingAction(`move-${sectionId}-${direction}`);
    try {
      await moveHomepageSectionOrder(sectionId, direction);
      await onRefresh();
      notify('success', `Updated component arrangement order.`);
    } catch (err: any) {
      notify('error', `Failed to change order: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (section: HomepageSection) => {
    setEditingSection(section);
    setEditTitle(section.title);
    setEditSubtitle(section.subtitle || '');
    setEditDescription(section.description || '');
    setEditCustomBadge(section.customBadge || '');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    if (!editTitle.trim()) {
      notify('error', 'Section title cannot be blank.');
      return;
    }

    setLoadingAction('saving-edit');
    try {
      await updateHomepageSection(editingSection.id, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        description: editDescription.trim(),
        customBadge: editCustomBadge.trim(),
      });
      await onRefresh();
      setEditingSection(null);
      notify('success', `Saved customizations for "${editTitle.trim()}".`);
    } catch (err: any) {
      notify('error', `Failed to save changes: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Create New Custom Component
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      notify('error', 'Please enter a component title.');
      return;
    }

    setLoadingAction('creating-section');
    try {
      const nextOrder = sortedSections.length > 0 ? Math.max(...sortedSections.map((s) => s.order)) + 1 : 1;
      await createHomepageSection({
        key: newKey,
        title: newTitle.trim(),
        subtitle: newSubtitle.trim(),
        category: newCategory,
        icon: newIcon,
        order: nextOrder,
        isVisible: true,
        customBadge: newBadge.trim(),
        description: newDescription.trim() || 'Custom landing page section.',
      });
      await onRefresh();
      setShowAddModal(false);
      setNewTitle('');
      setNewSubtitle('');
      setNewBadge('');
      setNewDescription('');
      notify('success', `Added new component to landing page sequence!`);
    } catch (err: any) {
      notify('error', `Failed to create component: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Delete Custom Section
  const handleDeleteSection = async () => {
    if (!deleteConfirmSection) return;
    setLoadingAction(`delete-${deleteConfirmSection.id}`);
    try {
      await deleteHomepageSection(deleteConfirmSection.id);
      await onRefresh();
      setDeleteConfirmSection(null);
      notify('success', `Removed section from landing page.`);
    } catch (err: any) {
      notify('error', `Failed to remove section: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Reset to Factory Default
  const handleResetToDefault = async () => {
    setLoadingAction('resetting');
    try {
      await resetHomepageSectionsToDefault();
      await onRefresh();
      setConfirmResetOpen(false);
      notify('success', 'Reset all homepage components to standard default order and visibility.');
    } catch (err: any) {
      notify('error', `Failed to reset homepage sections: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Landing Page Customisation &amp; Component Arrangement</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Homepage Layout &amp; Visibility Governance
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Arrange the exact display sequence of landing page components, toggle visibility on/off for any module, and customize section titles for live visitors.
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
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Component</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Reset layout order and visibility back to standard defaults"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-[11px] text-slate-400 font-medium">Total Registered Sections</div>
            <div className="text-xl font-bold text-white mt-0.5 font-mono">{sortedSections.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>Active &amp; Visible</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">{visibleCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hidden Sections</span>
            </div>
            <div className="text-xl font-bold text-amber-400 mt-0.5 font-mono">{hiddenCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-[11px] text-indigo-400 font-medium">Ordering Mode</div>
            <div className="text-xs font-bold text-indigo-300 mt-1">Real-Time Sequence Sync</div>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* Live Visual Pipeline / Sequence Strip */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
            <MoveVertical className="w-3.5 h-3.5 text-emerald-400" />
            <span>Landing Page Visual Order Pipeline</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Top-to-bottom order rendered on public homepage
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          {sortedSections.map((sec, idx) => {
            const cat = CATEGORY_STYLES[sec.category] || CATEGORY_STYLES.core;
            return (
              <React.Fragment key={sec.id}>
                <div
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                    sec.isVisible
                      ? 'bg-slate-950 border-slate-700 text-white shadow-xs'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-500 line-through opacity-60'
                  }`}
                  title={`${sec.title} (${sec.isVisible ? 'Visible' : 'Hidden'})`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className={sec.isVisible ? cat.textIcon : 'text-slate-600'}>
                    {renderSectionIcon(sec.icon, 'w-3.5 h-3.5')}
                  </span>
                  <span className="truncate max-w-[120px] font-semibold">{sec.title}</span>
                  {!sec.isVisible && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 no-underline">
                      Hidden
                    </span>
                  )}
                </div>
                {idx < sortedSections.length - 1 && (
                  <span className="text-slate-600 shrink-0 text-xs">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Component Reordering & Visibility Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-bold text-white">
              Component Sequence &amp; Visibility Controls
            </h3>
            <p className="text-xs text-slate-400">
              Use the arrow buttons to arrange order. Toggle the switch to instantly show or hide a section from visitors.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Changes reflect instantly</span>
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {sortedSections.map((section, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedSections.length - 1;
            const cat = CATEGORY_STYLES[section.category] || CATEGORY_STYLES.core;
            const isToggling = loadingAction === `toggle-${section.id}`;
            const isMovingUp = loadingAction === `move-${section.id}-up`;
            const isMovingDown = loadingAction === `move-${section.id}-down`;

            return (
              <div
                key={section.id}
                className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                  section.isVisible
                    ? 'bg-slate-900/90 hover:bg-slate-800/40'
                    : 'bg-slate-950/40 hover:bg-slate-950/70 border-l-4 border-l-amber-500/40 opacity-80'
                }`}
              >
                {/* Left: Position Number & Order Controls */}
                <div className="flex items-center gap-3">
                  {/* Order Rank Badge */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                    <span className="text-[10px] text-slate-500 uppercase font-bold leading-none">Pos</span>
                    <span className="text-sm font-extrabold text-white font-mono mt-0.5">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Move Up / Down Buttons */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isFirst || Boolean(loadingAction)}
                      onClick={() => handleMoveOrder(section.id, 'up')}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isFirst
                          ? 'bg-slate-950 border-slate-800/60 text-slate-700 cursor-not-allowed'
                          : 'bg-slate-800 hover:bg-emerald-500/20 border-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400'
                      }`}
                      title={isFirst ? 'Already at top' : 'Move Up in landing page sequence'}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast || Boolean(loadingAction)}
                      onClick={() => handleMoveOrder(section.id, 'down')}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isLast
                          ? 'bg-slate-950 border-slate-800/60 text-slate-700 cursor-not-allowed'
                          : 'bg-slate-800 hover:bg-emerald-500/20 border-slate-700 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400'
                      }`}
                      title={isLast ? 'Already at bottom' : 'Move Down in landing page sequence'}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cat.iconBg} ${cat.textIcon}`}
                  >
                    {renderSectionIcon(section.icon, 'w-5 h-5')}
                  </div>

                  {/* Section Title & Description */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                        <span>{section.title}</span>
                      </h4>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${cat.badge}`}
                      >
                        {cat.label}
                      </span>

                      {section.customBadge && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {section.customBadge}
                        </span>
                      )}

                      {!section.isVisible && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                          Hidden
                        </span>
                      )}
                    </div>

                    {section.subtitle && (
                      <p className="text-xs text-slate-300 font-medium line-clamp-1">
                        {section.subtitle}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>

                {/* Right: Visibility Switch & Edit/Delete Actions */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center pt-2 md:pt-0">
                  {/* Show / Hide Toggle Control */}
                  <button
                    type="button"
                    disabled={Boolean(loadingAction)}
                    onClick={() => handleToggleVisibility(section)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                      section.isVisible
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                    title={section.isVisible ? 'Click to hide from landing page' : 'Click to show on landing page'}
                  >
                    {section.isVisible ? (
                      <>
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 text-slate-500" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>

                  {/* Edit Meta Details */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(section)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Edit section titles and display text"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete (only for custom added sections) */}
                  {!section.isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmSection(section)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                      title="Remove this custom section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Customize Component Text</h3>
                  <p className="text-[11px] text-slate-400">
                    Modifying display headers for key: <span className="font-mono text-emerald-400">{editingSection.key}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">Component Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">Badge Text (Optional)</label>
                <input
                  type="text"
                  value={editCustomBadge}
                  onChange={(e) => setEditCustomBadge(e.target.value)}
                  placeholder="e.g. Most Popular, Statutory, New"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'saving-edit'}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{loadingAction === 'saving-edit' ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Component Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Homepage Component</h3>
                  <p className="text-[11px] text-slate-400">
                    Register a new customizable component into your landing page sequence
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSection} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-300">Component Template *</label>
                  <select
                    value={newKey}
                    onChange={(e) => {
                      const k = e.target.value as HomepageSectionKey;
                      setNewKey(k);
                      if (k === 'trust-metrics') {
                        setNewTitle('Enterprise Scale & Trust Metrics');
                        setNewSubtitle('Real-time statistics on invoices and compliance');
                        setNewCategory('compliance');
                        setNewIcon('BarChart3');
                      } else if (k === 'security-compliance') {
                        setNewTitle('Security, Encryption & Statutory Standards');
                        setNewSubtitle('GSTN sandboxing and ISO 27001 certifications');
                        setNewCategory('compliance');
                        setNewIcon('ShieldCheck');
                      } else if (k === 'cta-banner') {
                        setNewTitle('Enterprise Call To Action');
                        setNewSubtitle('Prompt visitors to register or schedule a demo');
                        setNewCategory('commercial');
                        setNewIcon('Zap');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="trust-metrics">Live Trust &amp; Scale Metrics</option>
                    <option value="security-compliance">Security &amp; GSTN Compliance</option>
                    <option value="cta-banner">Enterprise CTA Conversion Banner</option>
                    <option value="gst-calculator">Interactive GST Calculator</option>
                    <option value="pillars">Core Architectural Pillars</option>
                    <option value="pricing">Transparent Subscription Plans</option>
                    <option value="reviews">Verified Customer Testimonials</option>
                    <option value="faqs">Frequently Asked Questions</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-300">Category Tag *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as HomepageSection['category'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="core">Core Framework</option>
                    <option value="tools">Interactive Tool</option>
                    <option value="compliance">Trust &amp; Compliance</option>
                    <option value="commercial">Commercial &amp; Plans</option>
                    <option value="social_proof">Social Proof</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Enterprise Security & Statutory Standards"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="e.g. 256-Bit TLS Ledgers and ISO 27001 readiness"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-300">Custom Badge</label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="e.g. Statutory, Verified"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-medium text-slate-300">Icon</label>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ShieldCheck">ShieldCheck</option>
                    <option value="BarChart3">BarChart3</option>
                    <option value="Zap">Zap</option>
                    <option value="Sparkles">Sparkles</option>
                    <option value="Calculator">Calculator</option>
                    <option value="Layers">Layers</option>
                    <option value="CreditCard">CreditCard</option>
                    <option value="MessageSquareQuote">MessageSquareQuote</option>
                    <option value="HelpCircle">HelpCircle</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Summary for administrators and audit logs"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'creating-section'}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{loadingAction === 'creating-section' ? 'Adding...' : 'Add Component'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Remove Component?</h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to remove "{deleteConfirmSection.title}"?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              This will permanently delete this custom module from the landing page arrangement list.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmSection(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(loadingAction)}
                onClick={handleDeleteSection}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition"
              >
                {loadingAction?.startsWith('delete') ? 'Deleting...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reset Landing Page Layout?</h3>
                <p className="text-xs text-slate-400">
                  Restore standard default order and enable all 9 components.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              All 9 standard components will be reset to their factory positions (#1 Hero through #9 CTA Banner) with full public visibility.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingAction === 'resetting'}
                onClick={handleResetToDefault}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                {loadingAction === 'resetting' ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
