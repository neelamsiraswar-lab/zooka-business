import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  BookOpen,
  ChevronDown,
  Check,
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  X,
  Filter,
  Plus,
} from 'lucide-react';

export interface LedgerAccountItem {
  accountName: string;
  groupName: string;
  closingDebit?: number;
  closingCredit?: number;
  closingBalance?: number;
  closingBalanceType?: 'Dr' | 'Cr' | string;
  code?: string;
}

export interface AccountMatchSelectorProps {
  accounts: LedgerAccountItem[];
  selectedAccount: string;
  onSelectAccount: (accountName: string) => void;
  className?: string;
  label?: string;
  placeholder?: string;
  allowCustom?: boolean;
}

export const AccountMatchSelector: React.FC<AccountMatchSelectorProps> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
  className = '',
  label,
  placeholder = 'Select account ledger...',
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Identify Current Selected Object
  const currentItem = useMemo(() => {
    return accounts.find((a) => a.accountName.toLowerCase() === selectedAccount.toLowerCase());
  }, [accounts, selectedAccount]);

  // Extract Distinct Groups for Quick Filters
  const distinctGroups = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.groupName) set.add(a.groupName);
    });
    return Array.from(set).sort();
  }, [accounts]);

  // Filter Accounts by Group and Search Query
  const filteredAccounts = useMemo(() => {
    return accounts.filter((item) => {
      if (groupFilter !== 'all' && item.groupName !== groupFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.accountName.toLowerCase().includes(q);
        const matchesGroup = item.groupName?.toLowerCase().includes(q);
        const matchesCode = item.code?.toLowerCase().includes(q);
        if (!matchesName && !matchesGroup && !matchesCode) return false;
      }
      return true;
    });
  }, [accounts, groupFilter, searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredAccounts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredAccounts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredAccounts.length) {
        handleSelect(filteredAccounts[highlightedIndex].accountName);
      }
    }
  };

  const handleSelect = (accountName: string) => {
    onSelectAccount(accountName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getGroupIcon = (group: string) => {
    const g = group.toLowerCase();
    if (g.includes('cash') || g.includes('bank')) return <Wallet className="w-4 h-4 text-emerald-400" />;
    if (g.includes('debtor') || g.includes('customer') || g.includes('party'))
      return <Users className="w-4 h-4 text-cyan-400" />;
    if (g.includes('creditor') || g.includes('supplier') || g.includes('liability'))
      return <Building2 className="w-4 h-4 text-amber-400" />;
    if (g.includes('income') || g.includes('sale') || g.includes('revenue'))
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (g.includes('expense') || g.includes('purchase'))
      return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Scale className="w-4 h-4 text-slate-400" />;
  };

  const getGroupBadgeStyle = (group: string) => {
    const g = group.toLowerCase();
    if (g.includes('asset') || g.includes('bank') || g.includes('cash'))
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (g.includes('liability') || g.includes('creditor'))
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (g.includes('income') || g.includes('sale'))
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (g.includes('expense'))
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left w-full sm:w-auto ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full sm:min-w-[320px] flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl text-white transition shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
            {currentItem ? getGroupIcon(currentItem.groupName) : <BookOpen className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="text-left truncate">
            <div className="text-sm font-bold text-slate-100 truncate">
              {currentItem ? currentItem.accountName : placeholder}
            </div>
            {currentItem?.groupName && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>{currentItem.groupName}</span>
                {currentItem.closingBalance !== undefined && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-emerald-400">
                      ₹{currentItem.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                      {currentItem.closingBalanceType}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 hidden sm:inline-block">
            Match Selector
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {/* In-App Floating Match Selector Modal Popover */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-full sm:w-[460px] max-w-[90vw] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-950/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Search & Filter Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-950 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search account name, group, balance..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Group Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() => setGroupFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                  groupFilter === 'all'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Accounts ({accounts.length})
              </button>
              {distinctGroups.map((group) => {
                const count = accounts.filter((a) => a.groupName === group).length;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setGroupFilter(group)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                      groupFilter === group
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {group} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Rows List */}
          <div
            ref={listRef}
            className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40"
          >
            {searchQuery.trim() && allowCustom && !accounts.some((a) => a.accountName.toLowerCase() === searchQuery.trim().toLowerCase()) && (
              <div className="p-1 mb-1">
                <button
                  type="button"
                  onClick={() => handleSelect(searchQuery.trim())}
                  className="w-full flex items-center gap-2.5 p-2.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-xl text-left text-xs font-semibold text-emerald-300 transition cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span>Use ledger: </span>
                    <strong className="text-white font-bold underline decoration-emerald-400">"{searchQuery.trim()}"</strong>
                  </div>
                </button>
              </div>
            )}

            {filteredAccounts.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No accounts match your query</p>
                <p className="text-[11px] text-slate-500">
                  {allowCustom && searchQuery.trim()
                    ? `Click the button above to use "${searchQuery.trim()}"`
                    : 'Try changing the search term or category filter'}
                </p>
              </div>
            ) : (
              filteredAccounts.map((item, idx) => {
                const isSelected =
                  item.accountName.toLowerCase() === selectedAccount.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={item.accountName}
                    type="button"
                    onClick={() => handleSelect(item.accountName)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-white'
                        : isHighlighted
                        ? 'bg-slate-800/90 text-white border border-slate-700/60'
                        : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                        {getGroupIcon(item.groupName)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-100 truncate flex items-center gap-2">
                          <span className="truncate">{item.accountName}</span>
                          {isSelected && (
                            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/40">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getGroupBadgeStyle(
                              item.groupName
                            )}`}
                          >
                            {item.groupName}
                          </span>
                          {item.code && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              #{item.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {item.closingBalance !== undefined ? (
                        <div>
                          <div className="text-xs font-mono font-bold text-slate-100">
                            ₹{item.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <span
                            className={`text-[10px] font-bold ${
                              item.closingBalanceType === 'Dr' ? 'text-emerald-400' : 'text-cyan-400'
                            }`}
                          >
                            {item.closingBalanceType} Balance
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">-</div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              Showing <strong className="text-white">{filteredAccounts.length}</strong> of {accounts.length} ledgers
            </span>
            <span className="text-slate-500">Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300">↑</kbd> <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300">↓</kbd> <kbd className="bg-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300">↵</kbd></span>
          </div>
        </div>
      )}
    </div>
  );
};
