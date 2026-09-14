import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { hasPermission, UserRole } from '../lib/permissions';
import {
  Boxes,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Edit2,
  SlidersHorizontal,
  X,
  Trash2,
  AlertTriangle,
  Tag,
  Hash,
  Package,
} from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onAddItem: (item: any) => Promise<void>;
  onEditItem?: (id: number, item: any) => Promise<void>;
  onDeleteItem?: (id: number) => Promise<void>;
  onAdjustStock?: (id: number, newStock: number, reason: string) => Promise<void>;
  loading: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAdjustStock,
  loading,
}) => {
  const { profile } = useAuth();
  const currentUserRole: UserRole = (profile?.role as UserRole) || 'accountant';
  const canCreate = hasPermission(currentUserRole, 'inventory:create');
  const canEdit = hasPermission(currentUserRole, 'inventory:edit');
  const canAdjust = hasPermission(currentUserRole, 'inventory:adjust');
  const canDelete = hasPermission(currentUserRole, 'inventory:delete');

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'in_stock'>('all');
  const [showItemModal, setShowItemModal] = useState(false);

  // Edit / Adjust Stock state
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('Physical audit');

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Delete Item state
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Inventory Form State (New or Edit)
  const [itemName, setItemName] = useState('');
  const [sku, setSku] = useState('');
  const [hsnCode, setHsnCode] = useState('8536');
  const [unit, setUnit] = useState('PCS');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [openingStock, setOpeningStock] = useState('0');
  const [minStockAlert, setMinStockAlert] = useState('5');

  // Calculate inventory metrics
  const totalStockValuation = inventory.reduce(
    (acc, curr) => acc + (parseFloat(curr.currentStock) || 0) * (parseFloat(curr.purchasePrice) || 0),
    0
  );
  const lowStockCount = inventory.filter(
    (i) => (parseFloat(i.currentStock) || 0) <= (parseFloat(i.minStockAlert) || 5)
  ).length;

  const filteredItems = inventory.filter((i) => {
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.hsnCode.includes(search) ||
      (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()));

    const current = parseFloat(i.currentStock) || 0;
    const min = parseFloat(i.minStockAlert) || 5;

    if (!matchSearch) return false;
    if (stockFilter === 'low') return current <= min;
    if (stockFilter === 'in_stock') return current > min;
    return true;
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setItemName('');
    setSku('');
    setHsnCode('8536');
    setUnit('PCS');
    setSellingPrice('');
    setPurchasePrice('');
    setGstRate('18');
    setOpeningStock('0');
    setMinStockAlert('5');
    setShowItemModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setSku(item.sku || '');
    setHsnCode(item.hsnCode);
    setUnit(item.unit);
    setSellingPrice(item.sellingPrice);
    setPurchasePrice(item.purchasePrice);
    setGstRate(item.gstRate);
    setMinStockAlert(item.minStockAlert || '5');
    setShowItemModal(true);
  };

  const handleCreateOrEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    if (editingItem && onEditItem) {
      await onEditItem(editingItem.id, {
        name: itemName,
        sku,
        hsnCode,
        unit,
        sellingPrice,
        purchasePrice,
        gstRate,
        minStockAlert,
      });
      setEditingItem(null);
    } else {
      await onAddItem({
        name: itemName,
        sku,
        hsnCode,
        unit,
        sellingPrice,
        purchasePrice,
        gstRate,
        openingStock,
        minStockAlert,
      });
    }

    setShowItemModal(false);
    setItemName('');
    setSku('');
    setSellingPrice('');
    setPurchasePrice('');
    setOpeningStock('0');
  };

  const handleOpenAdjustStock = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustmentQty(item.currentStock || '0');
    setAdjustmentReason('Physical count audit');
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !onAdjustStock) return;
    const qty = parseFloat(adjustmentQty);
    if (isNaN(qty)) return;

    await onAdjustStock(adjustingItem.id, qty, adjustmentReason);
    setAdjustingItem(null);
    setAdjustmentQty('');
  };

  const handleConfirmDeleteItem = async () => {
    if (!deletingItem || !onDeleteItem) return;
    setIsDeletingItem(true);
    try {
      await onDeleteItem(deletingItem.id);
      setDeletingItem(null);
      if (editingItem && editingItem.id === deletingItem.id) {
        setEditingItem(null);
        setShowItemModal(false);
      }
    } catch (err) {
      console.error('Delete item error:', err);
    } finally {
      setIsDeletingItem(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-teal-400" />
            <span>Stock Inventory & HSN Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock tracking with auto-deduction on Sales Invoices, replenishment on Purchase Bills, manual audits, and deletion controls.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={openCreateModal}
            id="add-stock-item-btn"
            className="px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 font-bold" />
            <span>Add Stock Item</span>
          </button>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Total Stock Value (Cost Price)</span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            ₹{totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-500">Asset value across {inventory.length} SKUs</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Low Stock Reorder Alerts</span>
          <p className="text-xl font-bold text-rose-400 mt-1 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{lowStockCount} items low</span>
          </p>
          <span className="text-[11px] text-slate-500">Below minimum safety threshold</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400">Auto Inventory Sync</span>
          <p className="text-base font-bold text-teal-300 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Purchase + Sales Synced</span>
          </p>
          <span className="text-[11px] text-slate-500">Real-time stock increment & reduction</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search stock items by name, HSN, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              stockFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Items ({inventory.length})
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
              stockFilter === 'low' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Low Stock ({lowStockCount})</span>
          </button>
          <button
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              stockFilter === 'in_stock' ? 'bg-slate-800 text-teal-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Adequate Stock
          </button>
        </div>
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Item Name & SKU</th>
                <th className="py-3.5 px-4 text-center">HSN Code</th>
                <th className="py-3.5 px-4 text-center">GST Slab</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-right">Cost (Purchase)</th>
                <th className="py-3.5 px-4 text-center">Current Stock</th>
                <th className="py-3.5 px-4 text-right">Total Valuation</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                    No stock inventory items found. Click &quot;Add Stock Item&quot; to build your product catalog.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => {
                  const stockNum = parseFloat(it.currentStock) || 0;
                  const minAlert = parseFloat(it.minStockAlert) || 5;
                  const isLow = stockNum <= minAlert;
                  const isOut = stockNum <= 0;
                  const val = stockNum * (parseFloat(it.purchasePrice) || 0);

                  return (
                    <tr key={it.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-white text-xs">{it.name}</div>
                        {it.sku ? (
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <span className="text-slate-500">SKU:</span> {it.sku}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic">No SKU code</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                        {it.hsnCode}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-teal-300 font-medium">
                          {it.gstRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-white font-medium">
                        ₹{parseFloat(it.sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        ₹{parseFloat(it.purchasePrice || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="font-mono font-bold text-white flex items-center justify-center gap-1.5">
                          <span>{stockNum}</span>
                          <span className="text-xs text-slate-400 font-normal">{it.unit}</span>
                          {isLow && (
                            <span
                              title={`Below safety alert (${minAlert} ${it.unit})`}
                              className="text-rose-400 cursor-help"
                            >
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                        ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold">
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            IN STOCK
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {canAdjust && onAdjustStock && (
                            <button
                              onClick={() => handleOpenAdjustStock(it)}
                              id={`adjust-stock-${it.id}`}
                              title="Audit / Adjust physical count"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 transition cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(it)}
                              id={`edit-stock-item-${it.id}`}
                              title="Edit item properties"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && onDeleteItem && (
                            <button
                              onClick={() => setDeletingItem(it)}
                              id={`delete-stock-item-${it.id}`}
                              title="Delete stock item"
                              className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!canAdjust && !canEdit && !canDelete && (
                            <span className="text-[11px] text-slate-400 font-medium italic">Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT STOCK ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                <Boxes className="w-5 h-5 text-teal-400 shrink-0" />
                <span className="truncate">{editingItem ? 'Edit Stock Item Details' : 'Add Stock Item & HSN Code'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowItemModal(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrEditItem} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Product / Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3-Phase Smart Power Relay"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    placeholder="e.g. REL-3P-415V"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">HSN / SAC Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8536"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              {/* Quick Presets for HSN Codes */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                <span className="text-slate-500">Popular HSN:</span>
                {[
                  { label: '8536 (Electrical)', code: '8536' },
                  { label: '8471 (Computers)', code: '8471' },
                  { label: '9983 (IT Services)', code: '9983' },
                  { label: '3004 (Pharma)', code: '3004' },
                ].map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setHsnCode(p.code)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 font-mono cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="NOS">NOS (Numbers)</option>
                    <option value="KGS">KGS (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="BOX">BOX (Boxes)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="PKT">PKT (Packets)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Applicable GST Slab</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% (Concessional)</option>
                    <option value="12">12% (Standard 1)</option>
                    <option value="18">18% (Standard 2)</option>
                    <option value="28">28% (Luxury / De-merit)</option>
                  </select>
                </div>

                {!editingItem ? (
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Opening Stock ({unit})</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={openingStock}
                      onChange={(e) => setOpeningStock(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Current Stock Level</label>
                    <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono flex items-center justify-between">
                      <span className="font-bold text-white">{editingItem.currentStock}</span>
                      <span className="text-[11px] text-slate-400">{editingItem.unit}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Low Stock Safety Alert Threshold ({unit})
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    className="w-full sm:w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-400"
                  />
                  <span className="text-[11px] text-slate-400">
                    System triggers a visual reorder warning when inventory drops to or below this level.
                  </span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800 shrink-0">
                {editingItem && onDeleteItem ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingItem(editingItem);
                    }}
                    className="w-full sm:w-auto px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-xs font-medium border border-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Item</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex flex-col-reverse sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowItemModal(false);
                      setEditingItem(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold rounded-xl shadow-lg shadow-teal-500/20 transition cursor-pointer text-center"
                  >
                    {loading ? 'Saving...' : editingItem ? 'Update Stock Item' : 'Save Stock Item'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT / ADJUST STOCK MODAL */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-950">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                  <SlidersHorizontal className="w-5 h-5 text-teal-400 shrink-0" />
                  <span className="truncate">Stock Audit & Adjustment</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{adjustingItem.name}</p>
              </div>
              <button
                onClick={() => setAdjustingItem(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center font-mono">
                <span className="text-slate-400">Current Ledger Stock:</span>
                <span className="font-bold text-white">
                  {adjustingItem.currentStock} {adjustingItem.unit}
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Actual Verified Physical Stock ({adjustingItem.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-base font-bold focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Adjustment Reason / Memo</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-teal-400 focus:outline-none"
                >
                  <option value="Physical count audit">Physical count audit</option>
                  <option value="Damaged / Broken goods written off">Damaged / Broken goods written off</option>
                  <option value="Stock received without purchase invoice">Stock received without invoice</option>
                  <option value="Internal warehouse transfer">Internal warehouse transfer</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold rounded-xl shadow-lg shadow-teal-500/20 transition cursor-pointer text-center"
                >
                  Confirm Stock Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE INVENTORY ITEM MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">Delete Stock Inventory Item?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to permanently delete{' '}
                  <span className="text-white font-semibold break-words">{deletingItem.name}</span>?
                </p>
              </div>
            </div>

            {/* Item details card */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">HSN / SAC Code:</span>
                <span className="font-mono text-slate-200 font-medium">{deletingItem.hsnCode}</span>
              </div>
              {deletingItem.sku && (
                <div className="flex justify-between">
                  <span className="text-slate-400">SKU / Code:</span>
                  <span className="font-mono text-slate-200">{deletingItem.sku}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Current Stock on Hand:</span>
                <span className="font-mono font-bold text-white">
                  {deletingItem.currentStock} {deletingItem.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stock Valuation:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  ₹{(parseFloat(deletingItem.currentStock || '0') * parseFloat(deletingItem.purchasePrice || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
              ℹ️ <span className="font-semibold">Audit Integrity:</span> This item will be removed from your catalog and stock ledger. Any past invoices or purchase bills referencing this product will remain completely intact with original line descriptions, HSN codes, and tax figures.
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setDeletingItem(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:bg-slate-800 transition cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-inventory-item-btn"
                disabled={isDeletingItem}
                onClick={handleConfirmDeleteItem}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingItem ? 'Deleting...' : 'Delete Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
