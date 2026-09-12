import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
}

export const AppSelect: React.FC<AppSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  searchable = false,
  searchPlaceholder = 'Search...',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  size = 'md',
  icon,
  align = 'left',
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Selected Option Object
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Filtered options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.group && opt.group.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  // Grouped options if any have group field
  const hasGroups = React.useMemo(() => {
    return filteredOptions.some((opt) => Boolean(opt.group));
  }, [filteredOptions]);

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

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      if (searchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

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
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-xs sm:text-sm',
    lg: 'px-4 py-2.5 text-sm',
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left w-full sm:w-auto ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl text-white font-medium transition shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
          sizeClasses[size]
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon || selectedOption?.icon}
          {selectedOption ? (
            <span className="truncate text-slate-100">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOption?.badge && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                selectedOption.badgeColor || 'bg-slate-800 text-slate-300'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating In-App Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[200px] w-full sm:w-max max-w-xs sm:max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-slate-950/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${dropdownClassName}`}
        >
          {/* Search Box if enabled or if many options */}
          {(searchable || normalizedOptions.length > 7) && (
            <div className="p-2 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div ref={listRef} className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 focus:outline-none">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No matching options found
              </div>
            ) : hasGroups ? (
              // Grouped Render
              (() => {
                const groups: Record<string, SelectOption[]> = {};
                filteredOptions.forEach((opt) => {
                  const g = opt.group || 'General';
                  if (!groups[g]) groups[g] = [];
                  groups[g].push(opt);
                });

                return Object.entries(groups).map(([groupName, groupOpts]) => (
                  <div key={groupName} className="space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {groupName}
                    </div>
                    {groupOpts.map((option) => {
                      const isSelected = option.value === value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSelect(option.value)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs text-left transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {option.icon}
                            <div>
                              <div className="truncate font-medium">{option.label}</div>
                              {option.description && (
                                <div className="text-[11px] text-slate-400 truncate">{option.description}</div>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ));
              })()
            ) : (
              // Flat Render
              filteredOptions.map((option, idx) => {
                const isSelected = option.value === value;
                const isHighlighted = idx === highlightedIndex;

                if (renderOption) {
                  return (
                    <div
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className="cursor-pointer"
                    >
                      {renderOption(option, isSelected)}
                    </div>
                  );
                }

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                        : isHighlighted
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon}
                      <div>
                        <div className="truncate font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-[11px] text-slate-400 truncate">{option.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {option.badge && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            option.badgeColor || 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
