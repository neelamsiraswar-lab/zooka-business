// src/components/BulkDataMigrationModal.tsx
import React, { useState } from 'react';
import { Workspace, Party, InventoryItem } from '../types';
import {
  X,
  Upload,
  FileCode,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Database,
  Layers,
  Users,
  Package,
  BookOpen,
  ArrowRight,
  Download,
  RefreshCw,
  Sparkles,
  Check,
} from 'lucide-react';
import { db, COLLECTIONS } from '../db/index';
import { logActivity, createParty, createInventoryItem } from '../db/dataService';

interface BulkDataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  onMigrationComplete?: () => void;
}

interface ParsedLedger {
  name: string;
  parent: string;
  type: 'customer' | 'vendor' | 'bank' | 'income' | 'expense' | 'capital' | 'liability';
  gstin?: string;
  stateCode?: string;
  openingBalance: number;
  balanceType: 'dr' | 'cr';
  selected: boolean;
}

interface ParsedItem {
  name: string;
  hsnCode: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  openingStock: number;
  selected: boolean;
}

export const BulkDataMigrationModal: React.FC<BulkDataMigrationModalProps> = ({
  isOpen,
  onClose,
  workspace,
  onMigrationComplete,
}) => {
  if (!isOpen || !workspace) return null;

  const [activeTab, setActiveTab] = useState<'upload' | 'parties' | 'ledgers' | 'inventory'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Parsed Collections
  const [parsedLedgers, setParsedLedgers] = useState<ParsedLedger[]>([]);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

  // Sample Tally XML snippet for instant 1-click test
  const sampleTallyXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <LEDGER NAME="Apex Infotech Pvt Ltd" RESERVEDNAME="">
          <PARENT>Sundry Debtors</PARENT>
          <PARTYGSTIN>27AAECB9382M1ZR</PARTYGSTIN>
          <OPENINGBALANCE>-45000</OPENINGBALANCE>
          <LEDGERPHONE>9820123456</LEDGERPHONE>
        </LEDGER>
        <LEDGER NAME="Zenith Electronics Corp" RESERVEDNAME="">
          <PARENT>Sundry Debtors</PARENT>
          <PARTYGSTIN>29AABCZ1234K1Z5</PARTYGSTIN>
          <OPENINGBALANCE>-125000</OPENINGBALANCE>
          <LEDGERPHONE>9845011223</LEDGERPHONE>
        </LEDGER>
        <LEDGER NAME="National Paper Mills Ltd" RESERVEDNAME="">
          <PARENT>Sundry Creditors</PARENT>
          <PARTYGSTIN>27AAACN5432B1ZM</PARTYGSTIN>
          <OPENINGBALANCE>68000</OPENINGBALANCE>
          <LEDGERPHONE>9811099887</LEDGERPHONE>
        </LEDGER>
        <LEDGER NAME="HDFC Bank Current A/c" RESERVEDNAME="">
          <PARENT>Bank Accounts</PARENT>
          <OPENINGBALANCE>-850000</OPENINGBALANCE>
        </LEDGER>
        <LEDGER NAME="Sales Revenue A/c" RESERVEDNAME="">
          <PARENT>Sales Accounts</PARENT>
          <OPENINGBALANCE>0</OPENINGBALANCE>
        </LEDGER>
        <STOCKITEM NAME="Industrial Laser Sensor Mark IV" RESERVEDNAME="">
          <BASEUNITS>PCS</BASEUNITS>
          <HSNCODE>84713010</HSNCODE>
          <OPENINGBALANCE>25 PCS</OPENINGBALANCE>
          <OPENINGRATE>14500</OPENINGRATE>
          <OPENINGVALUE>362500</OPENINGVALUE>
        </STOCKITEM>
        <STOCKITEM NAME="Cat6 High-Density Copper Cable" RESERVEDNAME="">
          <BASEUNITS>MTR</BASEUNITS>
          <HSNCODE>85444990</HSNCODE>
          <OPENINGBALANCE>500 MTR</OPENINGBALANCE>
          <OPENINGRATE>35</OPENINGRATE>
          <OPENINGVALUE>17500</OPENINGVALUE>
        </STOCKITEM>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;

  const parseXmlContent = (content: string, sourceName: string) => {
    setParsing(true);
    setStatusMessage(null);
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');

      // Check parse errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid XML format: Unable to parse document.');
      }

      const ledgers: ParsedLedger[] = [];
      const items: ParsedItem[] = [];

      // Parse <LEDGER> tags
      const ledgerNodes = xmlDoc.querySelectorAll('LEDGER');
      ledgerNodes.forEach((node) => {
        const name = node.getAttribute('NAME') || node.querySelector('NAME')?.textContent || '';
        if (!name) return;

        const parent = node.querySelector('PARENT')?.textContent?.trim() || 'General';
        const gstin = node.querySelector('PARTYGSTIN')?.textContent?.trim() || '';
        const rawBal = parseFloat(node.querySelector('OPENINGBALANCE')?.textContent || '0');

        let type: ParsedLedger['type'] = 'liability';
        const parentLower = parent.toLowerCase();
        if (parentLower.includes('debtor') || parentLower.includes('customer')) {
          type = 'customer';
        } else if (parentLower.includes('creditor') || parentLower.includes('vendor') || parentLower.includes('supplier')) {
          type = 'vendor';
        } else if (parentLower.includes('bank') || parentLower.includes('cash')) {
          type = 'bank';
        } else if (parentLower.includes('sale') || parentLower.includes('income')) {
          type = 'income';
        } else if (parentLower.includes('expense') || parentLower.includes('purchase')) {
          type = 'expense';
        } else if (parentLower.includes('capital')) {
          type = 'capital';
        }

        // In Tally XML, negative opening balance for debtors represents Debit
        const absBal = Math.abs(rawBal);
        const balanceType: 'dr' | 'cr' = rawBal < 0 ? 'dr' : 'cr';

        ledgers.push({
          name,
          parent,
          type,
          gstin,
          stateCode: gstin.length >= 2 ? gstin.substring(0, 2) : '27',
          openingBalance: absBal,
          balanceType,
          selected: true,
        });
      });

      // Parse <STOCKITEM> tags
      const itemNodes = xmlDoc.querySelectorAll('STOCKITEM');
      itemNodes.forEach((node) => {
        const name = node.getAttribute('NAME') || node.querySelector('NAME')?.textContent || '';
        if (!name) return;

        const unit = node.querySelector('BASEUNITS')?.textContent?.trim() || 'PCS';
        const hsnCode = node.querySelector('HSNCODE')?.textContent?.trim() || '8471';
        const rawRate = parseFloat(node.querySelector('OPENINGRATE')?.textContent || '100');
        const rawBalStr = node.querySelector('OPENINGBALANCE')?.textContent || '0';
        const openingStock = parseFloat(rawBalStr.replace(/[^\d.-]/g, '')) || 0;

        items.push({
          name,
          hsnCode,
          unit,
          purchasePrice: rawRate > 0 ? rawRate : 100,
          sellingPrice: rawRate > 0 ? Math.round(rawRate * 1.2) : 120,
          openingStock,
          selected: true,
        });
      });

      setFileName(sourceName);
      setParsedLedgers(ledgers);
      setParsedItems(items);

      if (ledgers.length > 0 || items.length > 0) {
        setActiveTab(ledgers.some((l) => l.type === 'customer' || l.type === 'vendor') ? 'parties' : 'inventory');
        setStatusMessage(`Successfully parsed ${ledgers.length} Ledgers and ${items.length} Stock Masters!`);
      } else {
        setStatusMessage('No supported <LEDGER> or <STOCKITEM> tags found in XML file.');
      }
    } catch (err: any) {
      console.error('XML Parse Error:', err);
      setStatusMessage(err.message || 'Failed to parse XML file.');
    } finally {
      setParsing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleProcessFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseXmlContent(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    parseXmlContent(sampleTallyXml, 'Sample_Tally_Prime_Export.xml');
  };

  // Commit imported records to Firestore
  const handleCommitMigration = async () => {
    setImporting(true);
    try {
      const selectedParties = parsedLedgers.filter(
        (l) => (l.type === 'customer' || l.type === 'vendor') && l.selected
      );
      const selectedGeneralLedgers = parsedLedgers.filter(
        (l) => l.type !== 'customer' && l.type !== 'vendor' && l.selected
      );
      const selectedStockItems = parsedItems.filter((i) => i.selected);

      // 1. Batch write Parties
      for (const p of selectedParties) {
        await createParty(1, {
          name: p.name,
          partyType: p.type === 'vendor' ? 'vendor' : 'customer',
          gstin: p.gstin || '',
          stateCode: p.stateCode || '27',
          openingBalance: p.openingBalance.toString(),
          balanceType: p.balanceType,
        });
      }

      // 2. Batch write Inventory Items
      for (const item of selectedStockItems) {
        await createInventoryItem(1, {
          name: item.name,
          hsnCode: item.hsnCode,
          unit: item.unit,
          purchasePrice: item.purchasePrice.toString(),
          sellingPrice: item.sellingPrice.toString(),
          gstRate: '18',
          openingStock: item.openingStock.toString(),
          minStockAlert: '5',
        });
      }

      // 3. Write Activity Log
      try {
        await logActivity(
          1,
          workspace.ownerEmail,
          'MIGRATE_TALLY_DATA',
          'workspace',
          workspace.id,
          `Bulk imported ${selectedParties.length} parties, ${selectedStockItems.length} inventory items, and ${selectedGeneralLedgers.length} ledgers from ${fileName || 'Tally XML'}`
        );
      } catch (logErr) {
        console.warn('Could not write activity log:', logErr);
      }

      if (onMigrationComplete) {
        onMigrationComplete();
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to commit migration:', err);
      setStatusMessage(err.message || 'Failed to write imported data to Firestore.');
    } finally {
      setImporting(false);
    }
  };

  const customersVendors = parsedLedgers.filter((l) => l.type === 'customer' || l.type === 'vendor');
  const generalLedgers = parsedLedgers.filter((l) => l.type !== 'customer' && l.type !== 'vendor');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Bulk Data Migration & Tally XML Import
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Drag-and-drop Tally Prime or ERP 9 XML masters into {workspace.businessName} with live preview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Tally Masters</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* View Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload XML File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('parties')}
            disabled={customersVendors.length === 0}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 ${
              activeTab === 'parties'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Parties ({customersVendors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledgers')}
            disabled={generalLedgers.length === 0}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 ${
              activeTab === 'ledgers'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chart of Accounts ({generalLedgers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            disabled={parsedItems.length === 0}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventory Items ({parsedItems.length})</span>
          </button>
        </div>

        {/* TAB 1: UPLOAD ZONE */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`p-10 border-2 border-dashed rounded-3xl text-center transition flex flex-col items-center justify-center gap-3 cursor-pointer ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-950/30 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
              onClick={() => {
                const el = document.getElementById('tally-file-input');
                if (el) el.click();
              }}
            >
              <input
                id="tally-file-input"
                type="file"
                accept=".xml,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileCode className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Drop Tally XML Master File Here
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Supports Tally Prime & ERP 9 masters exported in XML format (Chart of Accounts, Debtors, Creditors & Stock).
                </p>
              </div>
              <span className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold mt-2 inline-flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                <span>Browse Files on Computer</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>How to export from Tally Prime / ERP 9:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
                <li>Open Tally and navigate to <strong>Chart of Accounts &gt; Ledgers</strong></li>
                <li>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Alt + E</kbd> to open Export Menu</li>
                <li>Choose <strong>XML (Data Interchange)</strong> format and export masters</li>
                <li>Upload or drag the resulting XML file directly into this importer window.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 2: PARTIES (DEBTORS & CREDITORS) */}
        {activeTab === 'parties' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{customersVendors.length} Parties parsed from Tally masters</span>
              <button
                type="button"
                onClick={() => {
                  const allSelected = customersVendors.every((c) => c.selected);
                  setParsedLedgers((prev) =>
                    prev.map((l) =>
                      l.type === 'customer' || l.type === 'vendor'
                        ? { ...l, selected: !allSelected }
                        : l
                    )
                  );
                }}
                className="text-indigo-400 hover:underline cursor-pointer"
              >
                Toggle Select All
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Party Name</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3">GSTIN</th>
                    <th className="p-3 text-right">Opening Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {customersVendors.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={p.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setParsedLedgers((prev) =>
                              prev.map((l) => (l.name === p.name ? { ...l, selected: checked } : l))
                            );
                          }}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                        />
                      </td>
                      <td className="p-3 font-semibold text-white">{p.name}</td>
                      <td className="p-3 capitalize">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.type === 'customer'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                          }`}
                        >
                          {p.type} ({p.parent})
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{p.gstin || '—'}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-200">
                        ₹{p.openingBalance.toLocaleString('en-IN')} {p.balanceType.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: GENERAL LEDGERS */}
        {activeTab === 'ledgers' && (
          <div className="space-y-4">
            <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Ledger Head</th>
                    <th className="p-3">Tally Group (Parent)</th>
                    <th className="p-3 text-right">Opening Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {generalLedgers.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={l.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setParsedLedgers((prev) =>
                              prev.map((item) => (item.name === l.name ? { ...item, selected: checked } : item))
                            );
                          }}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                        />
                      </td>
                      <td className="p-3 font-semibold text-white">{l.name}</td>
                      <td className="p-3 text-slate-400">{l.parent}</td>
                      <td className="p-3 text-right font-mono text-slate-300">
                        ₹{l.openingBalance.toLocaleString('en-IN')} {l.balanceType.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INVENTORY ITEMS */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Stock Item Name</th>
                    <th className="p-3">HSN / SAC</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3 text-right">Selling Rate</th>
                    <th className="p-3 text-right">Opening Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parsedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setParsedItems((prev) =>
                              prev.map((i) => (i.name === item.name ? { ...i, selected: checked } : i))
                            );
                          }}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                        />
                      </td>
                      <td className="p-3 font-semibold text-white">{item.name}</td>
                      <td className="p-3 font-mono text-slate-300">{item.hsnCode}</td>
                      <td className="p-3 font-mono uppercase text-slate-400">{item.unit}</td>
                      <td className="p-3 text-right font-mono text-slate-300">
                        ₹{item.sellingPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                        {item.openingStock} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {parsedLedgers.length > 0 || parsedItems.length > 0 ? (
              <span>
                Ready to import:{' '}
                <strong className="text-white">
                  {parsedLedgers.filter((l) => l.selected).length} Ledgers &amp;{' '}
                  {parsedItems.filter((i) => i.selected).length} Stock Items
                </strong>
              </span>
            ) : (
              <span>Select an XML file or click "Load Sample Tally Masters" above.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitMigration}
              disabled={importing || (parsedLedgers.length === 0 && parsedItems.length === 0)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Committing to Firestore...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>Commit &amp; Import Masters</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
