// src/components/HomepageFaqManager.tsx
import React, { useState } from 'react';
import {
  HelpCircle,
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
  CheckCircle2,
  MessageCircle,
  Layers,
  Sparkles,
  Filter,
} from 'lucide-react';
import { HomepageFaq } from '../types';
import {
  createHomepageFaq,
  updateHomepageFaq,
  deleteHomepageFaq,
  resetHomepageFaqsToDefault,
  moveHomepageFaqOrder,
} from '../db/homepageFaqs';
import { useDialog } from '../context/DialogContext';

interface HomepageFaqManagerProps {
  faqs: HomepageFaq[];
  onRefresh: () => Promise<void>;
}

export const HomepageFaqManager: React.FC<HomepageFaqManagerProps> = ({ faqs, onRefresh }) => {
  const dialog = useDialog();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<HomepageFaq | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('General');
  const [order, setOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Categories list
  const categories = Array.from(new Set(faqs.map((f) => f.category || 'General')));

  const handleOpenCreateModal = () => {
    setEditingFaq(null);
    setQuestion('');
    setAnswer('');
    setCategory('General');
    setOrder(faqs.length + 1);
    setIsActive(true);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (faq: HomepageFaq) => {
    setEditingFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category || 'General');
    setOrder(faq.order);
    setIsActive(faq.isActive);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setErrorMessage('Question cannot be empty');
      return;
    }
    if (!answer.trim()) {
      setErrorMessage('Answer cannot be empty');
      return;
    }

    setLoadingAction('save');
    try {
      if (editingFaq) {
        await updateHomepageFaq(editingFaq.id, {
          question: question.trim(),
          answer: answer.trim(),
          category: category.trim() || 'General',
          order,
          isActive,
        });
      } else {
        await createHomepageFaq({
          question: question.trim(),
          answer: answer.trim(),
          category: category.trim() || 'General',
          order,
          isActive,
        });
      }
      setIsModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save FAQ');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleActive = async (faq: HomepageFaq) => {
    setLoadingAction(`toggle-${faq.id}`);
    try {
      await updateHomepageFaq(faq.id, { isActive: !faq.isActive });
      await onRefresh();
    } catch (err) {
      console.error('Failed to toggle FAQ active status:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMoveOrder = async (faq: HomepageFaq, direction: 'up' | 'down') => {
    setLoadingAction(`move-${faq.id}`);
    try {
      await moveHomepageFaqOrder(faq.id, direction);
      await onRefresh();
    } catch (err) {
      console.error('Failed to move FAQ order:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = (faq: HomepageFaq) => {
    dialog.confirm({
      title: 'Delete FAQ Question',
      message: `Are you sure you want to delete "${faq.question}"? This will remove it from the public landing page.`,
      confirmLabel: 'Delete FAQ',
      cancelLabel: 'Keep',
      isDestructive: true,
      onConfirm: async () => {
        setLoadingAction(`delete-${faq.id}`);
        try {
          await deleteHomepageFaq(faq.id);
          await onRefresh();
        } catch (err) {
          console.error('Failed to delete FAQ:', err);
        } finally {
          setLoadingAction(null);
        }
      },
    });
  };

  const handleResetDefaults = () => {
    dialog.confirm({
      title: 'Reset FAQs to Defaults',
      message: 'This will revert all landing page FAQs back to the standard statutory & enterprise accounting questions. Any custom questions will be overwritten.',
      confirmLabel: 'Reset Defaults',
      cancelLabel: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setLoadingAction('reset');
        try {
          await resetHomepageFaqsToDefault();
          await onRefresh();
        } catch (err) {
          console.error('Failed to reset FAQs:', err);
        } finally {
          setLoadingAction(null);
        }
      },
    });
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faq.category && faq.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeCount = faqs.filter((f) => f.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Public Landing Page Q&amp;A</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Frequently Asked Questions (FAQ Governance)
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Manage statutory compliance, invoicing, multi-tenant security, and banking questions shown to prospective clients on the landing page.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Reset FAQs to standard system defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-[11px] text-slate-400 font-medium">Total Questions</div>
            <div className="text-xl font-bold text-white mt-0.5 font-mono">{faqs.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>Active on Landing Page</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">{activeCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hidden Questions</span>
            </div>
            <div className="text-xl font-bold text-amber-400 mt-0.5 font-mono">{faqs.length - activeCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="text-[11px] text-blue-400 font-medium">Unique Categories</div>
            <div className="text-xl font-bold text-blue-400 mt-0.5 font-mono">{categories.length}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search FAQs by question or answer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-slate-500" />
            <span>Category:</span>
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
              categoryFilter === 'all'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({faqs.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition ${
                categoryFilter === cat
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat} ({faqs.filter((f) => (f.category || 'General') === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Cards List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-300">No FAQ questions match your criteria</div>
            <p className="text-xs text-slate-500 mt-1">Try changing your search term or click "Add FAQ" to create one.</p>
          </div>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isFirst = index === 0;
            const isLast = index === filteredFaqs.length - 1;
            return (
              <div
                key={faq.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  faq.isActive
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs font-mono shrink-0 border border-slate-700">
                      {faq.order}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                          {faq.category || 'General'}
                        </span>
                        {faq.isBuiltIn && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Built-in
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            faq.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {faq.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        {faq.question}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">
                        {faq.answer}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(faq, 'up')}
                      disabled={isFirst || loadingAction !== null}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition cursor-pointer"
                      title="Move Question Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(faq, 'down')}
                      disabled={isLast || loadingAction !== null}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition cursor-pointer"
                      title="Move Question Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(faq)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        faq.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title={faq.isActive ? 'Hide FAQ from landing page' : 'Show FAQ on landing page'}
                    >
                      {faq.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(faq)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
                      title="Edit Question and Answer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(faq)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingFaq ? 'Edit FAQ Question' : 'Create New FAQ Question'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live updates to the public homepage Q&amp;A section
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Does the software support Multi-State GSTIN branches?"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Tag
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. GST & Compliance, Security, Banking"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Detailed Answer <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Explain the answer thoroughly with compliance standards, features, or workflows..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Visibility
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isActive ? 'Active on Live Page' : 'Hidden'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction !== null}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingFaq ? 'Save Changes' : 'Create FAQ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
