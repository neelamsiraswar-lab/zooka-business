import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Invoice, InventoryItem } from '../types';
import {
  PRODUCT_CATEGORIES,
  ProductCategory,
  inferCategoryFromItem,
  getHsnSuggestionsForCategory,
  HsnSuggestion,
} from '../data/hsnCategories';
import {
  Sparkles,
  ChevronDown,
  Check,
  Search,
  Tag,
  Hash,
  Star,
  Clock,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react';

interface HsnAutoSuggestSelectorProps {
  value: string;
  onChange: (hsnCode: string, suggestedGstRate?: number) => void;
  itemName?: string;
  itemDescription?: string;
  category?: string;
  onCategoryChange?: (newCat: string) => void;
  invoices?: Invoice[];
  inventory?: InventoryItem[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const HsnAutoSuggestSelector: React.FC<HsnAutoSuggestSelectorProps> = ({
  value,
  onChange,
  itemName = '',
  itemDescription = '',
  category,
  onCategoryChange,
  invoices = [],
  inventory = [],
  placeholder = '8536',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(() => {
    return inferCategoryFromItem(itemName, itemDescription, value, category);
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Automatically update inferred category if item name or explicit category changes and user hasn't manually overridden
  useEffect(() => {
    if (category && PRODUCT_CATEGORIES.includes(category as ProductCategory)) {
      setSelectedCategory(category as ProductCategory);
    } else if (itemName) {
      const inferred = inferCategoryFromItem(itemName, itemDescription, value, category);
      setSelectedCategory(inferred);
    }
  }, [itemName, itemDescription, category]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Compute suggestions based on active category, invoices history, and inventory
  const suggestions = useMemo(() => {
    return getHsnSuggestionsForCategory(selectedCategory, invoices, inventory, searchFilter);
  }, [selectedCategory, invoices, inventory, searchFilter]);

  // Top frequent suggestion highlight
  const topSuggestion = suggestions.find((s) => s.isHistorical) || suggestions[0];

  const handleSelectCode = (item: HsnSuggestion) => {
    onChange(item.code, item.defaultGstRate);
    if (onCategoryChange && item.category) {
      onCategoryChange(item.category);
    }
    setIsOpen(false);
    setSearchFilter('');
  };

  const handleCategorySelect = (newCat: ProductCategory) => {
    setSelectedCategory(newCat);
    if (onCategoryChange) {
      onCategoryChange(newCat);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field with Quick Suggestion Action */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearchFilter(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-2 pr-7 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />

        {/* Suggestion Sparkle Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={disabled}
          title={`HSN/SAC Auto-Suggestions for ${selectedCategory}`}
          className={`absolute right-1 p-1 rounded hover:bg-slate-800 transition cursor-pointer ${
            isOpen ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-emerald-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Auto-Suggestion Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden text-xs animate-fade-in font-sans">
          {/* Header & Product Category Switcher */}
          <div className="p-2.5 bg-slate-950 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>HSN/SAC Code Suggestions</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category Selector Bar */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] text-slate-400 shrink-0">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategorySelect(e.target.value as ProductCategory)}
                className="bg-transparent text-emerald-300 font-semibold text-[11px] focus:outline-none w-full cursor-pointer truncate"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Inline Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search code or description..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-700"
              />
            </div>
          </div>

          {/* Suggestions List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60 p-1">
            {suggestions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                No matching HSN codes found for "{searchFilter}".
              </div>
            ) : (
              suggestions.map((item) => {
                const isSelected = value.trim() === item.code;

                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelectCode(item)}
                    className={`w-full text-left p-2 rounded-lg transition flex items-start justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* HSN Code */}
                        <span className="font-mono font-bold text-white text-xs px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 text-emerald-400">
                          {item.code}
                        </span>

                        {/* Standard GST Rate */}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                          {item.defaultGstRate}% GST
                        </span>

                        {/* Frequency Badge */}
                        {item.frequencyBadge === 'Most Frequent' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            <span>Most Used ({item.usageCount}x)</span>
                          </span>
                        )}
                        {item.frequencyBadge === 'Frequent' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-medium">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Frequent ({item.usageCount}x)</span>
                          </span>
                        )}
                        {item.frequencyBadge === 'Recommended' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 font-medium">
                            Recommended
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Checkmark if selected */}
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="truncate">Ranked by frequency in your sales & purchase vouchers</span>
            <span className="text-emerald-400 font-medium shrink-0 ml-1">Auto-applies GST rate</span>
          </div>
        </div>
      )}
    </div>
  );
};
