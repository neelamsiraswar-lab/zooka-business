// src/components/ArchitecturalPillarManager.tsx
import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Check,
  X,
  Receipt,
  BookOpen,
  Landmark,
  ShieldCheck,
  Zap,
  Database,
  Scale,
  Sparkles,
  Lock,
  BarChart3,
  Building2,
  Coins,
  FileCheck,
  Globe,
  Workflow,
  FileSpreadsheet,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { ArchitecturalPillar } from '../types';
import {
  createArchitecturalPillar,
  updateArchitecturalPillar,
  deleteArchitecturalPillar,
  resetArchitecturalPillarsToDefault,
} from '../db/architecturalPillars';
import { useDialog } from '../context/DialogContext';

export const SUPPORTED_PILLAR_ICONS: { [key: string]: React.ComponentType<{ className?: string }> } = {
  Receipt,
  BookOpen,
  Landmark,
  ShieldCheck,
  Layers,
  Zap,
  Database,
  Scale,
  Sparkles,
  Lock,
  BarChart3,
  Building2,
  Coins,
  FileCheck,
  Globe,
  Workflow,
  FileSpreadsheet,
};

export const COLOR_THEMES: {
  [key in ArchitecturalPillar['colorTheme']]: {
    name: string;
    bgIcon: string;
    borderIcon: string;
    textIcon: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    accentHex: string;
  };
} = {
  emerald: {
    name: 'Emerald Green',
    bgIcon: 'bg-emerald-500/10',
    borderIcon: 'border-emerald-500/20',
    textIcon: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    accentHex: '#10b981',
  },
  indigo: {
    name: 'Indigo Blue',
    bgIcon: 'bg-indigo-500/10',
    borderIcon: 'border-indigo-500/20',
    textIcon: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-400',
    accentHex: '#6366f1',
  },
  purple: {
    name: 'Royal Purple',
    bgIcon: 'bg-purple-500/10',
    borderIcon: 'border-purple-500/20',
    textIcon: 'text-purple-400',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400',
    accentHex: '#a855f7',
  },
  teal: {
    name: 'Teal Cyan',
    bgIcon: 'bg-teal-500/10',
    borderIcon: 'border-teal-500/20',
    textIcon: 'text-teal-400',
    badgeBg: 'bg-teal-500/10',
    badgeBorder: 'border-teal-500/30',
    badgeText: 'text-teal-400',
    accentHex: '#14b8a6',
  },
  amber: {
    name: 'Amber Gold',
    bgIcon: 'bg-amber-500/10',
    borderIcon: 'border-amber-500/20',
    textIcon: 'text-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    accentHex: '#f59e0b',
  },
  blue: {
    name: 'Sky Blue',
    bgIcon: 'bg-blue-500/10',
    borderIcon: 'border-blue-500/20',
    textIcon: 'text-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400',
    accentHex: '#3b82f6',
  },
  rose: {
    name: 'Rose Red',
    bgIcon: 'bg-rose-500/10',
    borderIcon: 'border-rose-500/20',
    textIcon: 'text-rose-400',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-400',
    accentHex: '#f43f5e',
  },
  cyan: {
    name: 'Electric Cyan',
    bgIcon: 'bg-cyan-500/10',
    borderIcon: 'border-cyan-500/20',
    textIcon: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-400',
    accentHex: '#06b6d4',
  },
};

export function renderPillarIcon(iconName: string, className?: string) {
  const IconComponent = SUPPORTED_PILLAR_ICONS[iconName] || Layers;
  return <IconComponent className={className || 'w-5 h-5'} />;
}

interface ArchitecturalPillarManagerProps {
  pillars: ArchitecturalPillar[];
  onRefresh: () => Promise<void> | void;
}

export const ArchitecturalPillarManager: React.FC<ArchitecturalPillarManagerProps> = ({
  pillars,
  onRefresh,
}) => {
  const dialog = useDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPillar, setEditingPillar] = useState<ArchitecturalPillar | null>(null);
  const [deleteConfirmPillar, setDeleteConfirmPillar] = useState<ArchitecturalPillar | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Receipt');
  const [colorTheme, setColorTheme] = useState<ArchitecturalPillar['colorTheme']>('emerald');
  const [badge, setBadge] = useState('');
  const [order, setOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  const handleOpenAddModal = () => {
    setEditingPillar(null);
    setTitle('');
    setDescription('');
    setIcon('Receipt');
    setColorTheme('emerald');
    setBadge('Compliance');
    setOrder((pillars.length > 0 ? Math.max(...pillars.map((p) => p.order || 0)) : 0) + 1);
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (pillar: ArchitecturalPillar) => {
    setEditingPillar(pillar);
    setTitle(pillar.title);
    setDescription(pillar.description);
    setIcon(pillar.icon || 'Layers');
    setColorTheme(pillar.colorTheme || 'emerald');
    setBadge(pillar.badge || '');
    setOrder(pillar.order);
    setIsActive(pillar.isActive !== false);
    setModalOpen(true);
  };

  const handleToggleActive = async (pillar: ArchitecturalPillar) => {
    try {
      const nextState = !pillar.isActive;
      await updateArchitecturalPillar(pillar.id, { isActive: nextState });
      dialog.toast.success(`"${pillar.title}" is now ${nextState ? 'published' : 'hidden'}`);
      await onRefresh();
    } catch (err: any) {
      dialog.toast.error(err?.message || 'Failed to toggle status');
    }
  };

  const handleSavePillar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      dialog.toast.error('Pillar title is required');
      return;
    }
    if (!description.trim()) {
      dialog.toast.error('Pillar description is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPillar) {
        await updateArchitecturalPillar(editingPillar.id, {
          title: title.trim(),
          description: description.trim(),
          icon,
          colorTheme,
          badge: badge.trim() || undefined,
          order: Number(order) || 1,
          isActive,
        });
        dialog.toast.success(`Pillar "${title.trim()}" updated successfully`);
      } else {
        await createArchitecturalPillar({
          title: title.trim(),
          description: description.trim(),
          icon,
          colorTheme,
          badge: badge.trim() || undefined,
          order: Number(order) || 1,
          isActive,
        });
        dialog.toast.success(`Pillar "${title.trim()}" added to architecture`);
      }

      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      dialog.toast.error(err?.message || 'Failed to save architectural pillar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePillar = async () => {
    if (!deleteConfirmPillar) return;
    setIsSaving(true);
    try {
      await deleteArchitecturalPillar(deleteConfirmPillar.id);
      dialog.toast.success(`Pillar "${deleteConfirmPillar.title}" deleted`);
      setDeleteConfirmPillar(null);
      await onRefresh();
    } catch (err: any) {
      dialog.toast.error(err?.message || 'Failed to delete pillar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    const confirmed = await dialog.confirm({
      title: 'Reset Core Architectural Pillars?',
      message: 'This will restore the 4 statutory platform defaults (Automated GST Invoicing, Double-Entry Journals, Automated BRS & Banking, Immutable Audit Trail). Custom pillars will be replaced.',
      confirmText: 'Reset to Factory Defaults',
      confirmColor: 'amber',
    });

    if (confirmed) {
      try {
        await resetArchitecturalPillarsToDefault();
        dialog.toast.success('Core Architectural Pillars restored to factory defaults');
        await onRefresh();
      } catch (err: any) {
        dialog.toast.error(err?.message || 'Failed to reset defaults');
      }
    }
  };

  const activeTheme = COLOR_THEMES[colorTheme] || COLOR_THEMES.emerald;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Core Architectural Pillars</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {pillars.length} Pillars
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage the core technological pillars displayed on the public landing page and platform governance overview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Architectural Pillar</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Pillars</div>
          <div className="text-2xl font-black text-white mt-1">{pillars.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Configured in Firestore</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Live on Landing</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {pillars.filter((p) => p.isActive).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Visible to visitors</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hidden / Draft</div>
          <div className="text-2xl font-black text-slate-400 mt-1">
            {pillars.filter((p) => !p.isActive).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Unpublished</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Built-In Statutory</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">
            {pillars.filter((p) => p.isBuiltIn).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Factory defaults</div>
        </div>
      </div>

      {/* Pillars Grid */}
      {pillars.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No Architectural Pillars Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add custom technical capabilities or click "Reset Defaults" to load standard GST accounting pillars.
          </p>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            Load Factory Defaults
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((pillar) => {
            const theme = COLOR_THEMES[pillar.colorTheme] || COLOR_THEMES.emerald;
            return (
              <div
                key={pillar.id}
                className={`relative p-5 rounded-2xl bg-slate-900/90 border transition flex flex-col justify-between space-y-4 shadow-lg ${
                  pillar.isActive
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/50 opacity-60 bg-slate-950/40'
                }`}
              >
                {/* Top Row: Icon + Sequence Order + Badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl ${theme.bgIcon} ${theme.borderIcon} ${theme.textIcon} border flex items-center justify-center shrink-0`}
                      >
                        {renderPillarIcon(pillar.icon, 'w-5 h-5')}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                          Sequence #{pillar.order}
                        </span>
                        {pillar.badge && (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
                          >
                            {pillar.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(pillar)}
                      title={pillar.isActive ? 'Pillar is published. Click to hide.' : 'Pillar is hidden. Click to publish.'}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        pillar.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {pillar.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{pillar.title}</span>
                      {pillar.isBuiltIn && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          Built-In
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1.5 line-clamp-3">
                      {pillar.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Actions: Edit & Delete */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Theme: {theme.name.split(' ')[0]}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(pillar)}
                      title="Edit Pillar details"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-indigo-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmPillar(pillar)}
                      title="Delete Pillar"
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD / EDIT PILLAR MODAL ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingPillar ? 'Edit Core Architectural Pillar' : 'Add Core Architectural Pillar'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure technical capability details, icon, and accent color scheme.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePillar} className="space-y-4 text-xs">
              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-300">Pillar Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Automated GST Invoicing"
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Tag / Badge</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. Statutory"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the architectural significance, compliance benefit, and feature mechanics..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              {/* Icon Picker */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Select Icon ({icon})</label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {Object.keys(SUPPORTED_PILLAR_ICONS).map((iconKey) => {
                    const isSelected = icon === iconKey;
                    const IconComp = SUPPORTED_PILLAR_ICONS[iconKey];
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setIcon(iconKey)}
                        title={iconKey}
                        className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                            : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[8px] truncate max-w-[42px]">{iconKey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Theme & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Color Theme Accent</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.keys(COLOR_THEMES) as ArchitecturalPillar['colorTheme'][]).map((themeKey) => {
                      const t = COLOR_THEMES[themeKey];
                      const isSelected = colorTheme === themeKey;
                      return (
                        <button
                          key={themeKey}
                          type="button"
                          onClick={() => setColorTheme(themeKey)}
                          className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 text-white border-white'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.accentHex }}
                          />
                          <span className="capitalize">{themeKey}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Sequence Display Order</label>
                    <input
                      type="number"
                      value={order}
                      onChange={(e) => setOrder(Number(e.target.value))}
                      min={1}
                      max={99}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="pillar-active-checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="pillar-active-checkbox" className="text-slate-300 font-semibold cursor-pointer">
                      Publish Live on Landing Page
                    </label>
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Live Public Preview
                </span>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-9 h-9 rounded-xl ${activeTheme.bgIcon} ${activeTheme.borderIcon} ${activeTheme.textIcon} border flex items-center justify-center`}
                    >
                      {renderPillarIcon(icon, 'w-5 h-5')}
                    </div>
                    {badge && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${activeTheme.badgeBg} ${activeTheme.badgeBorder} ${activeTheme.badgeText}`}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">{title || 'Pillar Title Preview'}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {description || 'Pillar technical description will appear here as formatted in the public landing page section.'}
                  </p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : editingPillar ? 'Save Changes' : 'Create Pillar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deleteConfirmPillar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Delete Architectural Pillar?</h3>
                <p className="text-xs text-slate-400">This action will remove the pillar from the platform.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
              <div className="font-bold text-white">{deleteConfirmPillar.title}</div>
              <p className="text-slate-400 line-clamp-2">{deleteConfirmPillar.description}</p>
            </div>

            <p className="text-xs text-slate-400">
              Are you sure you want to permanently purge this pillar from Google Cloud Firestore?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPillar(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePillar}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
