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
} from 'lucide-react';
import { Party } from '../types';

export interface PartyMatchSelectorProps {
  parties: Party[];
  selectedPartyId: string | number | undefined;
  partyName?: string;
  onSelectParty: (party: Party | null, customName?: string) => void;
  partyType?: 'customer' | 'vendor' | 'all';
  placeholder?: string;
  label?: string;
  className?: string;
  allowCustom?: boolean;
}

export const PartyMatchSelector: React.FC<PartyMatchSelectorProps> = ({
  parties,
  selectedPartyId,
  partyName = '',
  onSelectParty,
  partyType = 'all',
  placeholder = 'Select party (customer/vendor)...',
  label,
  className = '',
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected party object
  const selectedParty = useMemo(() => {
    if (selectedPartyId) {
      return parties.find((p) => String(p.id) === String(selectedPartyId));
    }
    if (partyName) {
      return parties.find((p) => p.name.toLowerCase() === partyName.toLowerCase());
    }
    return null;
  }, [parties, selectedPartyId, partyName]);

  // Filtered parties by type & search
  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (partyType !== 'all' && p.partyType !== partyType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
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
  }, [parties, partyType, searchQuery]);

  // Close on click outside
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
      setHighlightedIndex((prev) => (prev < filteredParties.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredParties.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredParties.length) {
        handleSelect(filteredParties[highlightedIndex]);
      } else if (allowCustom && searchQuery.trim()) {
        handleSelectCustom(searchQuery.trim());
      }
    }
  };

  const handleSelect = (party: Party) => {
    onSelectParty(party);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectCustom = (name: string) => {
    onSelectParty(null, name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const displayText = selectedParty ? selectedParty.name : partyName || placeholder;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-2.5 px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl text-white transition shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
            {selectedParty?.partyType === 'customer' ? (
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            ) : selectedParty?.partyType === 'vendor' ? (
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Users className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>

          <div className="text-left truncate min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-slate-100 truncate flex items-center gap-2">
              <span className="truncate">{displayText}</span>
              {selectedParty && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    selectedParty.partyType === 'customer'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {selectedParty.partyType === 'customer' ? 'Debtor' : 'Creditor'}
                </span>
              )}
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
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating In-App Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 w-full min-w-[320px] max-w-[95vw] sm:max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-950/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search party by name, GSTIN, phone, city..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
          </div>

          {/* List of matching parties */}
          <div ref={listRef} className="max-h-64 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-800/40">
            {/* Custom Entry Option */}
            {searchQuery.trim() &&
              allowCustom &&
              !filteredParties.some((p) => p.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => handleSelectCustom(searchQuery.trim())}
                    className="w-full flex items-center gap-2 p-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-xl text-left text-xs text-emerald-300 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span>Use manual entry: </span>
                      <strong className="text-white underline decoration-emerald-400">"{searchQuery.trim()}"</strong>
                    </div>
                  </button>
                </div>
              )}

            {filteredParties.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <Users className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No parties found</p>
                <p className="text-[11px] text-slate-500">
                  {allowCustom && searchQuery.trim()
                    ? `Click above to use "${searchQuery.trim()}" as a new party`
                    : 'Try another search term'}
                </p>
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
                    onClick={() => handleSelect(p)}
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
              <span>{filteredParties.length} parties available</span>
            </span>
            <span className="text-slate-500">Auto-syncs ledger</span>
          </div>
        </div>
      )}
    </div>
  );
};
