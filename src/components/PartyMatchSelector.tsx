import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Users,
  ChevronDown,
  Check,
  Building2,
  Phone,
  MapPin,
  X,
  Plus,
  Sparkles,
  Edit2,
  ListFilter,
  UserCheck,
} from 'lucide-react';
import { Party } from '../types';

export interface PartyMatchSelectorProps {
  parties: Party[];
  selectedPartyId?: string | number | null;
  partyName?: string;
  onSelectParty: (party: Party | null, customName?: string) => void;
  onCustomNameChange?: (name: string) => void;
  partyType?: 'customer' | 'vendor' | 'all';
  partyTypeFilter?: 'customer' | 'vendor' | 'all';
  placeholder?: string;
  label?: string;
  className?: string;
  allowCustom?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export const PartyMatchSelector: React.FC<PartyMatchSelectorProps> = ({
  parties,
  selectedPartyId,
  partyName = '',
  onSelectParty,
  onCustomNameChange,
  partyType = 'all',
  partyTypeFilter,
  placeholder = 'Select or enter customer/vendor...',
  label,
  className = '',
  allowCustom = true,
  required = false,
  disabled = false,
}) => {
  const effectivePartyType = partyTypeFilter || partyType || 'all';
  const isCustomerContext = effectivePartyType === 'customer';

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [isDirectInputMode, setIsDirectInputMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const directInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected party object from directory
  const selectedParty = useMemo(() => {
    if (selectedPartyId) {
      return parties.find((p) => String(p.id) === String(selectedPartyId)) || null;
    }
    if (partyName && partyName.trim()) {
      return parties.find((p) => p.name.trim().toLowerCase() === partyName.trim().toLowerCase()) || null;
    }
    return null;
  }, [parties, selectedPartyId, partyName]);

  const isCustomName = useMemo(() => {
    return Boolean(partyName && partyName.trim() && !selectedParty);
  }, [partyName, selectedParty]);

  // Filtered parties by type & search
  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (effectivePartyType !== 'all' && p.partyType !== effectivePartyType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesGstin = p.gstin?.toLowerCase().includes(q);
        const matchesPhone = p.phone?.includes(q);
        const matchesState = p.stateName?.toLowerCase().includes(q);
        if (!matchesName && !matchesGstin && !matchesPhone && !matchesState) {
          return false;
        }
      }
      return true;
    });
  }, [parties, effectivePartyType, searchQuery]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  useEffect(() => {
    if (isDirectInputMode) {
      setTimeout(() => {
        directInputRef.current?.focus();
      }, 50);
    }
  }, [isDirectInputMode]);

  const handleSelectPartyObj = (party: Party) => {
    onSelectParty(party, party.name);
    if (onCustomNameChange) {
      onCustomNameChange(party.name);
    }
    setIsOpen(false);
    setSearchQuery('');
    setIsDirectInputMode(false);
  };

  const handleSelectCustomName = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    onSelectParty(null, cleanName);
    if (onCustomNameChange) {
      onCustomNameChange(cleanName);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onSelectParty(null, '');
    if (onCustomNameChange) {
      onCustomNameChange('');
    }
    setSearchQuery('');
    setIsDirectInputMode(false);
  };

  // Keyboard navigation inside dropdown
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
      setHighlightedIndex((prev) => (prev < filteredParties.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredParties.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredParties.length) {
        handleSelectPartyObj(filteredParties[highlightedIndex]);
      } else if (allowCustom && searchQuery.trim()) {
        handleSelectCustomName(searchQuery.trim());
      }
    }
  };

  const displayText = selectedParty ? selectedParty.name : partyName || placeholder;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left w-full ${className}`}
      onKeyDown={!isDirectInputMode ? handleKeyDown : undefined}
    >
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      {/* DIRECT CUSTOM TEXT INPUT MODE */}
      {isDirectInputMode ? (
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <input
              ref={directInputRef}
              type="text"
              value={partyName}
              onChange={(e) => {
                const val = e.target.value;
                if (onCustomNameChange) onCustomNameChange(val);
                onSelectParty(null, val);
              }}
              placeholder={
                isCustomerContext
                  ? 'Type custom customer name...'
                  : 'Type custom vendor name...'
              }
              required={required}
              disabled={disabled}
              className="w-full pl-9 pr-24 py-2 bg-slate-950 border border-emerald-500/60 rounded-xl text-white text-xs sm:text-sm font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-inner"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="absolute right-2 flex items-center gap-1">
              {partyName && (
                <button
                  type="button"
                  onClick={() => handleClear()}
                  className="p-1 text-slate-400 hover:text-white rounded transition"
                  title="Clear name"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsDirectInputMode(false);
                  setIsOpen(true);
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer"
                title="Browse existing parties directory"
              >
                <ListFilter className="w-3 h-3 text-cyan-400" />
                <span className="hidden sm:inline">Directory</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] px-1 text-emerald-400">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 shrink-0" />
              Custom {isCustomerContext ? 'Customer' : 'Vendor'} entry active.
            </span>
            <button
              type="button"
              onClick={() => {
                setIsDirectInputMode(false);
                setIsOpen(true);
              }}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              Pick from existing list
            </button>
          </div>
        </div>
      ) : (
        /* STANDARD POPUP COMBOBOX TRIGGER */
        <div className="relative">
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setIsOpen(!isOpen);
              }
            }}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 bg-slate-950 hover:bg-slate-900 border rounded-xl text-white transition shadow-sm cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              isCustomName
                ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                : selectedParty
                ? 'border-slate-700 hover:border-slate-600'
                : 'border-slate-700 hover:border-slate-600'
            } ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <div className="flex items-center gap-2.5 truncate min-w-0">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                {isCustomName ? (
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                ) : selectedParty?.partyType === 'customer' ? (
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                ) : selectedParty?.partyType === 'vendor' ? (
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              <div className="text-left truncate min-w-0">
                <div className="text-xs sm:text-sm font-semibold text-slate-100 truncate flex items-center gap-2">
                  <span className={`truncate ${!selectedParty && !partyName ? 'text-slate-400 font-normal' : ''}`}>
                    {displayText}
                  </span>
                  {isCustomName ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 bg-teal-500/10 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Custom {isCustomerContext ? 'Customer' : 'Party'}</span>
                    </span>
                  ) : selectedParty ? (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        selectedParty.partyType === 'customer'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {selectedParty.partyType === 'customer' ? 'Debtor' : 'Creditor'}
                    </span>
                  ) : null}
                </div>

                {selectedParty && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                    {selectedParty.gstin && <span className="font-mono text-[10px]">{selectedParty.gstin}</span>}
                    {selectedParty.currentBalance && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">
                          Bal: ₹{parseFloat(selectedParty.currentBalance).toLocaleString('en-IN')}{' '}
                          {(selectedParty.currentBalanceType || 'dr').toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {(selectedParty || partyName) && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear(e);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      e.preventDefault();
                      handleClear();
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer inline-flex items-center justify-center"
                  title="Clear party"
                  aria-label="Clear party"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-emerald-400' : ''
                }`}
              />
            </div>
          </div>

          {/* Floating In-App Dropdown Popover */}
          {isOpen && !disabled && (
            <div className="absolute left-0 z-50 mt-1.5 w-full min-w-[320px] max-w-[95vw] sm:max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-950/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Search Header */}
              <div className="p-2.5 border-b border-slate-800 bg-slate-950 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={
                      isCustomerContext
                        ? 'Search or type customer name, phone, GSTIN...'
                        : 'Search or type vendor name, phone, GSTIN...'
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    className="w-full pl-8 pr-8 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Direct text input button */}
                {allowCustom && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-slate-400">Can't find the party in the list?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsDirectInputMode(true);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Type custom name directly</span>
                    </button>
                  </div>
                )}
              </div>

              {/* List of matching parties */}
              <div ref={listRef} className="max-h-64 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-800/40">
                {/* Prominent Custom Entry Button when user types in search */}
                {searchQuery.trim() && allowCustom && (
                  <div className="p-1 pb-2">
                    <button
                      type="button"
                      onClick={() => handleSelectCustomName(searchQuery.trim())}
                      className="w-full flex items-center gap-2 p-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 rounded-xl text-left text-xs text-emerald-200 transition cursor-pointer shadow-md group"
                    >
                      <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 shrink-0">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                          Use Custom {isCustomerContext ? 'Customer' : 'Vendor'} Name:
                        </div>
                        <div className="text-sm font-bold text-white truncate underline decoration-emerald-400 decoration-2">
                          "{searchQuery.trim()}"
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {filteredParties.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <Users className="w-6 h-6 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No existing parties match &quot;{searchQuery}&quot;</p>
                    {allowCustom && searchQuery.trim() ? (
                      <button
                        type="button"
                        onClick={() => handleSelectCustomName(searchQuery.trim())}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Use &quot;{searchQuery.trim()}&quot; as Customer Name</span>
                      </button>
                    ) : (
                      <p className="text-[11px] text-slate-500">Try typing a custom customer name</p>
                    )}
                  </div>
                ) : (
                  filteredParties.map((p, idx) => {
                    const isSelected =
                      String(p.id) === String(selectedPartyId) ||
                      p.name.toLowerCase() === partyName.toLowerCase();
                    const isHighlighted = idx === highlightedIndex;
                    const curBal = parseFloat(p.currentBalance || p.openingBalance) || 0;
                    const curType = (p.currentBalanceType || p.balanceType || 'dr').toUpperCase();

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPartyObj(p)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-white font-medium'
                            : isHighlighted
                            ? 'bg-slate-800 text-white border border-slate-700/60'
                            : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                            {p.partyType === 'customer' ? (
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-blue-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-100 truncate flex items-center gap-1.5">
                              <span className="truncate">{p.name}</span>
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded uppercase font-bold ${
                                  p.partyType === 'customer'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-blue-500/10 text-blue-400'
                                }`}
                              >
                                {p.partyType === 'customer' ? 'Customer' : 'Vendor'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                              {p.gstin && <span className="font-mono">{p.gstin}</span>}
                              {p.phone && <span>• {p.phone}</span>}
                              {p.stateName && <span>• {p.stateName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-bold text-slate-200">
                            ₹{curBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <span
                            className={`text-[10px] font-bold ${
                              curType === 'DR' ? 'text-emerald-400' : 'text-blue-400'
                            }`}
                          >
                            {curType}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer Info */}
              <div className="p-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  <span>{filteredParties.length} parties in directory</span>
                </span>
                <span className="text-slate-500">Auto-syncs ledger master</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
