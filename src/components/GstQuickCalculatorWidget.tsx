import React, { useState } from 'react';
import { Calculator, ArrowRight, Percent, Building2, CheckCircle2, RefreshCw, HelpCircle } from 'lucide-react';
import { formatINR } from '../data/subscriptionPlans';

interface GstQuickCalculatorWidgetProps {
  onQuickInvoice?: (amount: number, gstRate: number, supplyType: 'intra' | 'inter') => void;
}

export const GstQuickCalculatorWidget: React.FC<GstQuickCalculatorWidgetProps> = ({ onQuickInvoice }) => {
  const [taxableAmount, setTaxableAmount] = useState<number>(50000);
  const [gstRate, setGstRate] = useState<number>(18);
  const [supplyType, setSupplyType] = useState<'intra' | 'inter'>('intra');
  const [cessRate, setCessRate] = useState<number>(0);
  const [isInclusive, setIsInclusive] = useState<boolean>(false);

  // Calculation Logic
  let calculatedTaxable = taxableAmount;
  let totalTax = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let cessAmount = 0;
  let finalGrandTotal = 0;

  if (isInclusive) {
    // Reverse tax calculation
    const effectiveRate = (gstRate + cessRate) / 100;
    calculatedTaxable = Math.round((taxableAmount / (1 + effectiveRate)) * 100) / 100;
    totalTax = taxableAmount - calculatedTaxable;
    cessAmount = (calculatedTaxable * cessRate) / 100;
    const standardTax = totalTax - cessAmount;
    if (supplyType === 'intra') {
      cgst = standardTax / 2;
      sgst = standardTax / 2;
    } else {
      igst = standardTax;
    }
    finalGrandTotal = taxableAmount;
  } else {
    // Forward tax calculation
    const baseGstTax = (taxableAmount * gstRate) / 100;
    cessAmount = (taxableAmount * cessRate) / 100;
    totalTax = baseGstTax + cessAmount;
    if (supplyType === 'intra') {
      cgst = baseGstTax / 2;
      sgst = baseGstTax / 2;
    } else {
      igst = baseGstTax;
    }
    finalGrandTotal = taxableAmount + totalTax;
  }

  const presetRates = [0, 5, 12, 18, 28];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Interactive GST Tax Engine</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold uppercase tracking-wider">
                Live Simulator
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Test GST splits, reverse-charge math &amp; ITC calculations instantly.
            </p>
          </div>
        </div>

        {/* Exclusive vs Inclusive Mode Toggle */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setIsInclusive(false)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              !isInclusive ? 'bg-slate-800 text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Exclusive (Base + Tax)
          </button>
          <button
            type="button"
            onClick={() => setIsInclusive(true)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
              isInclusive ? 'bg-slate-800 text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Inclusive (MRP Tax Split)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4">
        {/* Left Inputs */}
        <div className="md:col-span-6 space-y-4">
          {/* Base Amount */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">
                {isInclusive ? 'Total MRP / Inclusive Amount (₹)' : 'Base Taxable Value (₹)'}
              </label>
              <span className="font-mono text-emerald-400 font-semibold">
                {formatINR(taxableAmount)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-mono text-sm">₹</span>
              <input
                type="number"
                min={0}
                step={100}
                value={taxableAmount || ''}
                onChange={(e) => setTaxableAmount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-white font-mono text-sm font-semibold focus:outline-none focus:border-emerald-500 transition"
                placeholder="50000"
              />
            </div>
          </div>

          {/* GST Slabs Picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">GST Tax Slab</label>
            <div className="grid grid-cols-5 gap-1.5">
              {presetRates.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setGstRate(rate)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                    gstRate === rate
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Supply Type Toggle (Intra vs Inter) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Place of Supply Rule</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSupplyType('intra')}
                className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                  supplyType === 'intra'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">Intra-State Supply</div>
                <div className="text-[10px] text-slate-400 mt-0.5">CGST ({gstRate / 2}%) + SGST ({gstRate / 2}%)</div>
              </button>

              <button
                type="button"
                onClick={() => setSupplyType('inter')}
                className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                  supplyType === 'inter'
                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">Inter-State Supply</div>
                <div className="text-[10px] text-slate-400 mt-0.5">IGST ({gstRate}%) Full ITC</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Computation Summary Card */}
        <div className="md:col-span-6 bg-slate-950 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="text-slate-400">Tax Breakdown Type</span>
              <span className="font-semibold text-white">
                {supplyType === 'intra' ? 'State Dual-GST (Intra)' : 'Integrated IGST (Inter)'}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Net Taxable Base:</span>
                <span className="text-white font-semibold">{formatINR(calculatedTaxable)}</span>
              </div>

              {supplyType === 'intra' ? (
                <>
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="text-slate-400">CGST ({gstRate / 2}%):</span>
                    <span>+{formatINR(cgst)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="text-slate-400">SGST/UTGST ({gstRate / 2}%):</span>
                    <span>+{formatINR(sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-indigo-400">
                  <span className="text-slate-400">IGST ({gstRate}%):</span>
                  <span>+{formatINR(igst)}</span>
                </div>
              )}

              {cessAmount > 0 && (
                <div className="flex justify-between items-center text-amber-400">
                  <span className="text-slate-400">Statutory CESS ({cessRate}%):</span>
                  <span>+{formatINR(cessAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-sans">Total Tax Collected:</span>
                <span className="font-bold text-emerald-400">{formatINR(totalTax)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-800 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Invoice Total Amount
              </span>
              <span className="text-xl font-bold font-mono text-white text-emerald-400">
                {formatINR(finalGrandTotal)}
              </span>
            </div>

            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Complies with Section 31 of CGST Act &amp; Rule 46 Tax Invoice standards</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
