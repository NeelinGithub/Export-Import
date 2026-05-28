import React, { useState, useEffect } from 'react';
import { DohaImportData, DohaExpenseRow, SavedQuote } from '../types';
import { 
  Coins, Plus, Trash2, RotateCcw, Save, ShieldAlert, TrendingUp, RefreshCw,
  FolderOpen, Search, X, Check, ArrowRight, Layers, DollarSign, Calculator
} from 'lucide-react';

interface DohaImportProps {
  dohaImport: DohaImportData;
  setDohaImport: (data: DohaImportData | ((prev: DohaImportData) => DohaImportData)) => void;
  onSaveDoha: () => void;
  onResetDoha: () => void;
  savedQuotes?: SavedQuote[];
}

export default function DohaImport({
  dohaImport,
  setDohaImport,
  onSaveDoha,
  onResetDoha,
  savedQuotes = []
}: DohaImportProps) {
  const [newRowName, setNewRowName] = useState('');
  const [newRowRate, setNewRowRate] = useState('');
  const [newRowApply, setNewRowApply] = useState<'fcl' | 'shipment'>('fcl');

  // Popups & Filter states
  const [showQuoteSelector, setShowQuoteSelector] = useState(false);
  const [popSearch, setPopSearch] = useState('');
  const [popPortFilter, setPopPortFilter] = useState('all');

  // Exchange rate config helper
  const [qarUsdRate, setQarUsdRate] = useState('3.64');
  const [isSyncingQar, setIsSyncingQar] = useState(false);
  const [qarStatus, setQarStatus] = useState<'success' | 'error' | 'manual' | 'idle'>('idle');
  const [lastSyncedQar, setLastSyncedQar] = useState<number | null>(null);

  // Load custom CIF variables from dohaImport state, with typical defaults if not yet present
  const cifRateUsd = dohaImport.cifRateUsd !== undefined ? dohaImport.cifRateUsd : 650;
  const containerWeightKg = dohaImport.containerWeightKg !== undefined ? dohaImport.containerWeightKg : 26050;
  const bagSizeKg = dohaImport.bagSizeKg !== undefined ? dohaImport.bagSizeKg : 35;
  const cargoName = dohaImport.cargoName !== undefined ? dohaImport.cargoName : "PREMIUM STEAM RICE";
  const selectedQuoteRef = dohaImport.selectedQuoteRef !== undefined ? dohaImport.selectedQuoteRef : "";
  const bagsManual = dohaImport.bagsManual !== undefined ? dohaImport.bagsManual : false;

  // Auto calculated bags per container based on weight and bag size
  const calculatedBagsPerFcl = Math.max(Math.round(containerWeightKg / (bagSizeKg || 1)), 1);
  const bagsPerFcl = bagsManual ? Math.max(dohaImport.bagsPerFcl, 1) : calculatedBagsPerFcl;

  // Synchronize calculated bagsPerFcl back to dohaImport parent state iff of "Auto Math" config
  useEffect(() => {
    if (!bagsManual && dohaImport.bagsPerFcl !== calculatedBagsPerFcl) {
      setDohaImport((prev) => ({
        ...prev,
        bagsPerFcl: calculatedBagsPerFcl
      }));
    }
  }, [bagsManual, calculatedBagsPerFcl, dohaImport.bagsPerFcl, setDohaImport]);

  const fetchOnlineQarRate = async (showNotification = false) => {
    setIsSyncingQar(true);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch QAR rate');
      const data = await response.json();
      if (data && data.rates && data.rates.QAR) {
        const liveQar = data.rates.QAR;
        const roundedRate = (Math.round(liveQar * 10000) / 10000).toFixed(4);
        setQarUsdRate(roundedRate);
        setLastSyncedQar(liveQar);
        setQarStatus('success');
        if (showNotification) {
          const toast = document.getElementById('toast');
          if (toast) {
            toast.textContent = `QAR Exchange rate synced: ${roundedRate} QAR / USD`;
            toast.style.borderColor = '#34d399';
            toast.style.color = '#a7f3d0';
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3550);
          }
        }
      } else {
        throw new Error('QAR rate not found in response');
      }
    } catch (err) {
      console.error('QAR Exchange rate fetch error:', err);
      setQarStatus('error');
    } finally {
      setIsSyncingQar(false);
    }
  };

  useEffect(() => {
    fetchOnlineQarRate(false);
  }, []);

  const handleQarChange = (val: string) => {
    setQarUsdRate(val);
    const parsedVal = parseFloat(val);
    if (!isNaN(parsedVal) && lastSyncedQar && Math.abs(parsedVal - lastSyncedQar) < 0.005) {
      setQarStatus('success');
    } else {
      setQarStatus('manual');
    }
  };

  const fcl = Math.max(dohaImport.fcl, 1);
  const totalBags = fcl * bagsPerFcl;
  const dutyPct = dohaImport.dutyPct || 0;
  const dutyBase = dohaImport.dutyBase || 0;
  const exchangeQarUsd = parseFloat(qarUsdRate) || 3.64;

  // CIF calculations
  const cifMtQar = cifRateUsd * exchangeQarUsd;
  const cifBagUsd = (cifRateUsd / 1000) * bagSizeKg;
  const cifBagQar = cifBagUsd * exchangeQarUsd;

  // Calculate row cost
  const getRowCost = (row: DohaExpenseRow) => {
    return row.apply === 'fcl' ? row.rate * fcl : row.rate;
  };

  // Subtotal in QAR
  const chargesSubtotalQar = dohaImport.rows.reduce((sum, row) => sum + getRowCost(row), 0);

  // Duty calculation: duty rests on dutyPct % of (dutyBase of CIF value) per bag
  const dutyTotalQar = (dutyBase * totalBags) * (dutyPct / 100);

  // Total landing cost in QAR
  const grandTotalQar = chargesSubtotalQar + dutyTotalQar;

  // Unit costs
  const costPerBagQar = totalBags > 0 ? grandTotalQar / totalBags : 0;
  const costPerBagUsd = costPerBagQar / exchangeQarUsd;

  // Inline rows editor
  const handleUpdateRow = (id: string, field: keyof DohaExpenseRow, value: any) => {
    setDohaImport((prev) => {
      const updatedRows = prev.rows.map((row) => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      });
      return { ...prev, rows: updatedRows };
    });
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    if (!confirm('Are you sure you want to delete this Doha customs/clearance charge?')) return;
    setDohaImport((prev) => ({
      ...prev,
      rows: prev.rows.filter((row) => row.id !== id)
    }));
  };

  // Add row
  const handleAddRow = () => {
    const rate = parseFloat(newRowRate);
    if (!newRowName.trim() || isNaN(rate) || rate < 0) {
      alert('Enter a valid name and price rate (QAR) >= 0');
      return;
    }
    const newRow: DohaExpenseRow = {
      id: 'doh_' + Date.now(),
      name: newRowName.trim().toUpperCase(),
      rate,
      apply: newRowApply
    };

    setDohaImport((prev) => ({
      ...prev,
      rows: [...prev.rows, newRow]
    }));

    setNewRowName('');
    setNewRowRate('');
  };

  // Handle direct header inputs
  const handleMetaChange = (field: keyof DohaImportData, value: any) => {
    setDohaImport((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Select quote from pop-up and import it
  const handleSelectQuoteAndItem = (quote: SavedQuote, item: any) => {
    let parsedBagSize = 35;
    if (item.size) {
      const parsed = parseFloat(item.size);
      if (!isNaN(parsed) && parsed > 0) {
        parsedBagSize = parsed;
      }
    }

    const payloadWeight = item.weightPerContainerKg || 26050;
    const computedBags = Math.max(Math.round(payloadWeight / parsedBagSize), 1);
    const exchange = parseFloat(qarUsdRate) || 3.64;
    const computedCifBagQar = (item.rate / 1000) * parsedBagSize * exchange;

    setDohaImport((prev) => ({
      ...prev,
      fcl: item.numFCL || prev.fcl || 1,
      bagsPerFcl: computedBags,
      bagsManual: false,
      cifRateUsd: item.rate,
      containerWeightKg: payloadWeight,
      bagSizeKg: parsedBagSize,
      cargoName: item.commodity,
      selectedQuoteRef: quote.ref,
      dutyBase: parseFloat(computedCifBagQar.toFixed(2)) // Auto-set customs duty assessment base to CIF Bag Cost
    }));

    setShowQuoteSelector(false);
    
    // Fire off temporary beautiful notification
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `Imported Quote #${quote.ref} for ${item.commodity} into Doha Import Costing!`;
      toast.style.borderColor = '#14b8a6';
      toast.style.color = '#ccfbf1';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3550);
    }
  };

  return (
    <div className="space-y-6" id="doha-customs-landing-page">
      <div className="page-header">
        <div className="breadcrumb">🇶🇦 GCC Operations</div>
        <h2 className="text-xl font-extrabold tracking-tight">Doha, Hamad Import Costing Sheet</h2>
        <p className="text-sm text-gray-500 mt-1">
          Perform Qatari Riyal (QAR) clearance assessments, local port logistics, legalization, Bayan duties, and local delivery simulations.
        </p>
      </div>

      {/* Main Dynamic Statistics Grid */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4 flex flex-wrap gap-5 items-center justify-between shadow-xs select-none">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 min-w-[280px]">
          <div>
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest block mb-0.5">Port Clearing Outlays / Bag</span>
            <div className="text-2xl font-black font-mono text-teal-800">
              QAR {costPerBagQar.toFixed(3)}
            </div>
            <span className="text-[10px] text-gray-400 font-bold">$ {costPerBagUsd.toFixed(3)} USD / bag</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest block mb-0.5">Total Clearing Outlay</span>
            <div className="text-xl font-black font-mono text-gray-800">
              QAR {grandTotalQar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-gray-400">Customs and clearing charges</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-550 uppercase tracking-widest block mb-0.5">Consignment Volume</span>
            <div className="text-lg font-black font-mono text-gray-900">
              {totalBags.toLocaleString()} <span className="text-xs text-gray-500 font-bold">Bags Total</span>
            </div>
            <span className="text-[10px] text-teal-600 font-bold">{fcl} Containers • {bagsPerFcl} Bags per container</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={onResetDoha}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default
          </button>
          <button
            onClick={onSaveDoha}
            className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Save className="w-3.5 h-3.5" /> Save Overheads
          </button>
        </div>
      </div>

      {/* Section A: Shipment Specs and Duties config block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Logistics metrics inputs */}
        <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4 lg:col-span-2">
          
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="card-title text-[10px] uppercase font-bold text-teal-700 flex items-center gap-1.5 m-0">
              <TrendingUp className="w-4 h-4" /> Section A: Commodity CIF & Cargo Parameters
            </h3>
            <button
              type="button"
              onClick={() => setShowQuoteSelector(true)}
              className="bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-850 border border-teal-200 rounded-lg px-2.5 py-1 text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              title="Click to search and import from saved quote references"
            >
              <FolderOpen className="w-3.5 h-3.5 text-teal-600" />
              <span>Load Saved Quote Broker</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left inputs */}
            <div className="space-y-3">
              <div className="field">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">Commodity Description</label>
                <input
                  type="text"
                  value={cargoName}
                  onChange={(e) => handleMetaChange('cargoName', e.target.value.toUpperCase())}
                  className="w-full bg-gray-50 border border-gray-305 rounded px-2.5 py-1.5 text-xs text-teal-950 font-bold outline-none focus:border-teal-500 focus:bg-white"
                  placeholder="e.g. SONA MASOORI SELLA RICE"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">CIF Rate (USD/MT)</label>
                  <div className="flex items-center bg-gray-50 border border-gray-305 rounded px-2.5 py-1.5 focus-within:border-teal-500 focus-within:bg-white transition">
                    <span className="text-[10px] text-gray-400 font-bold mr-1">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={cifRateUsd}
                      onChange={(e) => handleMetaChange('cifRateUsd', Math.max(parseFloat(e.target.value) || 0, 0))}
                      className="w-full bg-transparent outline-none text-xs font-mono font-bold text-gray-800"
                    />
                    <span className="text-[10px] text-gray-400 ml-1 font-bold">/MT</span>
                  </div>
                </div>

                <div className="field">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">Reference Quote</label>
                  <input
                    type="text"
                    value={selectedQuoteRef}
                    className="w-full bg-gray-100 border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-500 font-mono font-extrabold outline-none"
                    placeholder="No active quote"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Right inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">Container Payload (KG)</label>
                  <div className="flex items-center bg-gray-50 border border-gray-305 rounded px-2.5 py-1.5 focus-within:border-teal-500 focus-within:bg-white transition">
                    <input
                      type="number"
                      min="1000"
                      step="50"
                      value={containerWeightKg}
                      onChange={(e) => handleMetaChange('containerWeightKg', Math.max(parseInt(e.target.value) || 26050, 1000))}
                      className="w-full bg-transparent outline-none text-xs font-mono font-bold text-gray-800"
                    />
                    <span className="text-[10px] text-gray-400 font-bold">KG</span>
                  </div>
                  <span className="text-[9px] text-gray-400 block mt-0.5">e.g. 26050 kg (26 tons)</span>
                </div>

                <div className="field">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">Package Bag Size (KG)</label>
                  <div className="flex items-center bg-gray-50 border border-gray-350 rounded px-2.5 py-1.5 focus-within:border-teal-500 focus-within:bg-white transition">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={bagSizeKg}
                      onChange={(e) => handleMetaChange('bagSizeKg', Math.max(parseInt(e.target.value) || 35, 1))}
                      className="w-full bg-transparent outline-none text-xs font-mono font-bold text-gray-800"
                    />
                    <span className="text-[10px] text-gray-400 font-bold">KG</span>
                  </div>
                  <span className="text-[9px] text-teal-600 block mt-0.5 font-semibold">Bags Per FCL: {calculatedBagsPerFcl}</span>
                </div>
              </div>

              {/* Containers and bags load state */}
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">No. of Containers (FCL)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={fcl}
                    onChange={(e) => handleMetaChange('fcl', Math.max(parseInt(e.target.value) || 1, 1))}
                    className="w-full bg-gray-50 border border-gray-305 rounded px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-teal-500 focus:bg-white text-center"
                  />
                </div>

                <div className="field">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">Bags loaded / FCL</label>
                    <button
                      type="button"
                      onClick={() => handleMetaChange('bagsManual', !bagsManual)}
                      className={`text-[8px] font-black uppercase px-1 rounded transition select-none cursor-pointer ${
                        bagsManual 
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                          : 'bg-teal-100 text-teal-800 hover:bg-teal-200'
                      }`}
                      title="Switch between automatic bag calculation vs custom override"
                    >
                      {bagsManual ? 'Override' : 'Auto Math'}
                    </button>
                  </div>
                  
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={!bagsManual}
                    value={bagsPerFcl}
                    onChange={(e) => handleMetaChange('bagsPerFcl', Math.max(parseInt(e.target.value) || 1, 1))}
                    className={`w-full border rounded px-2.5 py-1.5 text-xs font-mono font-bold text-center outline-none ${
                      bagsManual 
                        ? 'bg-white border-amber-300 text-amber-950 focus:border-amber-500' 
                        : 'bg-gray-100 border-gray-200 text-gray-450 cursor-not-allowed font-semibold'
                    }`}
                    title={bagsManual ? "Manually edit the bag amount per FCL" : `Calculated mathematically: ${containerWeightKg} kg / ${bagSizeKg} kg = ${calculatedBagsPerFcl} bags.`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Duties settings nested within section A */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
            <div className="field">
              <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">Customs Duty Rate (% CIF Val)</label>
              <div className="flex items-center bg-gray-50 border border-gray-305 rounded px-2.5 py-1.5 focus-within:border-teal-500 focus-within:bg-white transition">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={dutyPct}
                  onChange={(e) => handleMetaChange('dutyPct', Math.max(parseFloat(e.target.value) || 0, 0))}
                  className="w-full bg-transparent outline-none text-xs font-mono font-bold text-gray-800 text-center"
                />
                <span className="text-[10px] text-gray-400 font-bold">%</span>
              </div>
              <span className="text-[9px] text-gray-400 block mt-0.5">GCC standard tariff benchmark duty is 5.0% ad-valorem</span>
            </div>

            <div className="field">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">Customs Duty Assess Base / Bag</label>
                <button
                  type="button"
                  onClick={() => {
                    handleMetaChange('dutyBase', parseFloat(cifBagQar.toFixed(2)));
                    const toast = document.getElementById('toast');
                    if (toast) {
                      toast.textContent = `Duty Assessment Base synced with CIF product cost: QAR ${cifBagQar.toFixed(2)}`;
                      toast.style.borderColor = '#0d9488';
                      toast.style.color = '#ccfbf1';
                      toast.classList.add('show');
                      setTimeout(() => toast.classList.remove('show'), 2000);
                    }
                  }}
                  className="text-[8px] font-black uppercase text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-1 rounded transition select-none cursor-pointer"
                  title="Overlays the parsed CIF QAR valuation as customs benchmark base"
                >
                  Sync with CIF cost ({cifBagQar.toFixed(2)} QAR)
                </button>
              </div>
              <div className="flex items-center bg-gray-50 border border-gray-305 rounded px-2.5 py-1.5 focus-within:border-teal-500 focus-within:bg-white transition">
                <span className="text-[10px] text-gray-400 mr-1 font-bold">QAR</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dutyBase}
                  onChange={(e) => handleMetaChange('dutyBase', Math.max(parseFloat(e.target.value) || 0, 0))}
                  className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-right text-gray-850"
                />
              </div>
              <span className="text-[9px] text-gray-450 block mt-0.5">Customs valuation benchmark ad-valorem base</span>
            </div>
          </div>

        </div>

        {/* Currency config block */}
        <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="card-title text-[10px] uppercase font-bold text-gray-500 m-0">Forex Conversion Settings</h3>
            <button
              type="button"
              onClick={() => fetchOnlineQarRate(true)}
              disabled={isSyncingQar}
              className="text-[9px] font-bold text-teal-600 hover:text-teal-850 disabled:text-gray-400 flex items-center gap-1 bg-teal-55/10 hover:bg-teal-55/20 rounded px-1.5 py-0.5 transition cursor-pointer"
              title="Click to fetch real-time exchange rates"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isSyncingQar ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
          
          <div className="field">
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">USD to QAR Exchange Multiplier</label>
            <div className="flex items-center bg-white border border-gray-300 rounded px-3 py-1.5 focus-within:border-teal-500 transition">
              <Coins className="w-4 h-4 text-teal-600 mr-2 shrink-0" />
              <input
                type="number"
                step="0.0001"
                value={qarUsdRate}
                onChange={(e) => handleQarChange(e.target.value)}
                className="w-full bg-transparent outline-none text-xs font-mono font-extrabold text-blue-900"
              />
              <span className="text-[10px] text-gray-450 ml-2 font-bold shrink-0">QAR = $1 USD</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9px] min-h-[14px]">
              {qarStatus === 'success' && (
                <span className="text-emerald-600 font-bold flex items-center gap-1 font-sans">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Live Online (Synced)
                </span>
              )}
              {qarStatus === 'manual' && (
                <span className="text-amber-600 font-semibold flex items-center gap-0.5 font-sans">
                  <span>⚠️ Manual Override</span>
                </span>
              )}
              {qarStatus === 'error' && (
                <span className="text-rose-500 font-semibold flex items-center gap-0.5 font-sans animate-pulse">
                  <span>⚠️ Sync offline</span>
                </span>
              )}
              {qarStatus === 'idle' && (
                <span className="text-gray-400">Pegged. Click sync for live.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {dutyPct > 0 && dutyBase > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded-lg text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Active Customs Assess Mode:</span> Under <span className="font-bold">{dutyPct}%</span> ad-valorem GCC code with assessment base value of <span className="font-mono font-bold">QAR {dutyBase.toFixed(2)}</span> per bag. Calculated Duty is <span className="font-mono font-bold">QAR {dutyTotalQar.toFixed(2)}</span> total.
          </div>
        </div>
      )}

      {/* Dynamic Landed Cost Analysis Board */}
      <div className="card bg-gradient-to-br from-teal-900 to-slate-900 text-white p-5 rounded-xl border border-teal-950/40 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-800/60 pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] text-teal-400 uppercase tracking-widest font-black block">Active Import Projection</span>
            <h3 className="text-sm font-black text-white uppercase flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-teal-400" /> Integrated Landed Cost Analysis: {cargoName}
            </h3>
          </div>
          <span className="text-[10px] bg-teal-950/80 font-mono text-teal-300 border border-teal-800 px-2.5 py-1 rounded font-bold uppercase shrink-0">
            {selectedQuoteRef ? `Source Quote: ${selectedQuoteRef}` : "Manual Projections Mode"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-teal-800/50">
          {/* Column 1: CIF Product Cost */}
          <div className="space-y-1 md:pr-4 pt-3 md:pt-0 border-0">
            <span className="text-[9px] font-black text-teal-400 uppercase tracking-wider block">1. CIF Base Valuation</span>
            <div className="space-y-0.5">
              <span className="text-xl font-black font-mono block text-white select-all">
                $ {cifRateUsd.toLocaleString()} <span className="text-xs font-bold text-gray-400">USD/MT</span>
              </span>
              <span className="text-[10.5px] font-medium text-gray-300 block font-sans">
                Equivalent to <strong className="font-bold text-teal-300">QAR {cifMtQar.toLocaleString(undefined, { maximumFractionDigits: 2 })} / MT</strong>
              </span>
              <p className="text-[10px] text-gray-400 pt-1 leading-relaxed">
                Raw CIF product cargo expense from port of origin to Hamad, Doha.
              </p>
            </div>
          </div>

          {/* Column 2: Pack Unit Costs */}
          <div className="space-y-1 md:px-4 pt-3 md:pt-0">
            <span className="text-[9px] font-black text-teal-400 uppercase tracking-wider block">2. Packaging CIF Unit rate</span>
            <div className="space-y-0.5">
              <span className="text-xl font-black font-mono block text-white select-all">
                QAR {cifBagQar.toFixed(3)} <span className="text-xs font-bold text-gray-400">/ Bag</span>
              </span>
              <span className="text-[10.5px] font-medium text-gray-300 block">
                Equivalent to <strong className="font-bold text-teal-300">$ {cifBagUsd.toFixed(3)} USD / bag</strong>
              </span>
              <p className="text-[10px] text-gray-400 pt-1 leading-relaxed">
                Calculated product CIF cost per bag of <strong className="text-white font-bold">{bagSizeKg} KG</strong>.
              </p>
            </div>
          </div>

          {/* Column 3: Logistics Overheads */}
          <div className="space-y-1 md:px-4 pt-3 md:pt-0">
            <span className="text-[9px] font-black text-teal-400 uppercase tracking-wider block">3. Doha Import Overheads</span>
            <div className="space-y-0.5">
              <span className="text-xl font-black font-mono block text-white select-all">
                QAR {costPerBagQar.toFixed(3)} <span className="text-xs font-bold text-gray-400">/ Bag</span>
              </span>
              <span className="text-[10.5px] font-medium text-gray-300 block">
                Total Overlays: <strong className="font-mono text-teal-300 font-bold">QAR {grandTotalQar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
              <p className="text-[10px] text-gray-400 pt-1 leading-relaxed">
                Clearance, customs duties, local storage, testing, and delivery buffers.
              </p>
            </div>
          </div>

          {/* Column 4: Total Landed Cost */}
          <div className="space-y-1 md:pl-4 pt-3 md:pt-0">
            <span className="text-[9px] font-black text-teal-405 uppercase tracking-wider block">4. Final Doha Landed Cost</span>
            <div className="space-y-0.5">
              <span className="text-2xl font-black font-mono block text-teal-300 select-all">
                QAR {(cifBagQar + costPerBagQar).toFixed(3)} <span className="text-xs font-black text-white bg-teal-850 px-1.5 py-0.5 rounded ml-1">/ Bag</span>
              </span>
              <span className="text-[11px] font-bold text-teal-50 block uppercase tracking-wide">
                MT rate: QAR {((cifBagQar + costPerBagQar) / (bagSizeKg || 1) * 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / MT
              </span>
              <span className="text-[10px] text-teal-200 block font-mono font-bold">
                USD rate: $ {(((cifBagQar + costPerBagQar) / (bagSizeKg || 1) * 1000) / exchangeQarUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD / MT
              </span>
            </div>
          </div>
        </div>

        <div className="bg-teal-950/60 p-3 rounded-lg border border-teal-850 text-[11px] text-teal-100 flex flex-wrap gap-x-6 gap-y-1 justify-between items-center font-mono select-none">
          <div>
            Consignment Payload: <strong className="text-white font-black">{(totalBags * bagSizeKg / 1000).toFixed(2)} MT</strong> ({totalBags.toLocaleString()} bags of {bagSizeKg} kg)
          </div>
          <div>
            Duty Component per Bag: <strong className="text-white font-black">QAR {(dutyTotalQar / (totalBags || 1)).toFixed(3)}</strong> ({dutyPct}% on QAR {dutyBase.toFixed(2)})
          </div>
          <div>
            Forex Peg: <strong className="text-white font-black">{exchangeQarUsd.toFixed(4)} QAR / USD</strong>
          </div>
        </div>
      </div>

      {/* Landing fee logs list */}
      <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold tracking-widest text-teal-600 uppercase animate-in fade-in">
                Section B: Port Clearance Overheads
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Receipted cargo expenses, storage buffers, legalization rates, and terminal handling fees.
            </p>
          </div>
          <span className="bg-gray-100 text-gray-700 text-[10px] px-2.5 py-1.5 rounded-md font-mono font-bold block sm:inline">
            Subtotal: QAR {chargesSubtotalQar.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Simple additive form */}
        <div className="bg-gray-50 p-3 border border-gray-200 rounded-lg space-y-3">
          <span className="text-xs font-black text-gray-705 block">+ Append Custom Clearance Fee Row</span>
          <div className="flex flex-col sm:flex-row gap-2.5 items-end">
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fee Description</label>
              <input
                type="text"
                placeholder="e.g. BALADIYA LAB TESTING FEES"
                value={newRowName}
                onChange={(e) => setNewRowName(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold outline-none focus:border-teal-500"
              />
            </div>

            <div className="w-full sm:w-32">
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Cost Rate (QAR)</label>
              <input
                type="number"
                placeholder="450"
                value={newRowRate}
                onChange={(e) => setNewRowRate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-extrabold outline-none focus:border-teal-500 text-center"
              />
            </div>

            <div className="w-full sm:w-36">
              <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Apply Unit Rule</label>
              <select
                value={newRowApply}
                onChange={(e) => setNewRowApply(e.target.value as 'fcl' | 'shipment')}
                className="w-full bg-white border border-gray-305 rounded px-2 py-1.5 text-xs outline-none focus:border-teal-500 font-semibold"
              >
                <option value="fcl">Per Container (FCL)</option>
                <option value="shipment">Per Shipment (Bl/Bill)</option>
              </select>
            </div>

            <button
              onClick={handleAddRow}
              className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-4 py-2 rounded shadow-xs flex items-center gap-1 transition-all w-full sm:w-auto shrink-0 justify-center h-9 cursor-pointer select-none"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>
        </div>

        {/* Clearing list table */}
        <div className="table-wrap rounded-lg border border-gray-205 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 uppercase tracking-widest font-extrabold text-[9px] text-gray-600 border-b border-gray-200">
                <th className="p-2.5">Expense Item</th>
                <th className="p-2.5">Application Metric</th>
                <th className="p-2.5 text-center" style={{ width: '100px' }}>Charge Rate</th>
                <th className="p-2.5 text-center" style={{ width: '120px' }}>Charges Multip.</th>
                <th className="p-2.5 text-right" style={{ width: '150px' }}>Total Outlay (QAR)</th>
                <th className="p-2.5 text-end" style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dohaImport.rows.map((row) => {
                const cost = getRowCost(row);
                return (
                  <tr key={row.id} className="hover:bg-teal-55/10 transition duration-150">
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleUpdateRow(row.id, 'name', e.target.value.toUpperCase())}
                        className="w-full bg-transparent font-bold text-gray-800 p-1 border border-transparent hover:border-gray-200 focus:border-teal-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={row.apply}
                        onChange={(e) => handleUpdateRow(row.id, 'apply', e.target.value)}
                        className="bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-teal-500 focus:bg-white rounded outline-none w-full"
                      >
                        <option value="fcl">Per Container (FCL)</option>
                        <option value="shipment">Per Shipment</option>
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={row.rate}
                        onChange={(e) => handleUpdateRow(row.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-20 bg-transparent text-center font-mono font-bold p-1 border border-transparent hover:border-gray-200 focus:border-teal-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2 text-center text-gray-500 font-mono font-bold">
                      {row.apply === 'fcl' ? `${fcl} cont(s)` : '1 bill'}
                    </td>
                    <td className="p-2 text-right font-mono font-black text-teal-800">
                      QAR {cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-gray-400 hover:text-red-650 p-1 rounded transition close-btn"
                        title="Delete overhead row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saved Quote Selection Modal */}
      {showQuoteSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-subtle flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5 m-0">
                  <FolderOpen className="w-4 h-4 text-teal-600" /> Choose Saved Quote Reference
                </h3>
                <p className="text-[11px] text-gray-500 mt-1">
                  Load product CIF price, packaging brand, bags payload and container specs into Doha Import costing sheet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuoteSelector(false)}
                className="text-gray-400 hover:text-gray-650 p-1 rounded-lg hover:bg-gray-105 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search and Filters */}
            <div className="p-3 border-b border-gray-150 bg-gray-50/50 flex flex-col sm:flex-row gap-2.5 items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by quote ref, buyer name, or commodity..."
                  value={popSearch}
                  onChange={(e) => setPopSearch(e.target.value)}
                  className="w-full bg-white pl-9 pr-3 py-1.5 text-xs text-gray-800 font-semibold border border-gray-300 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-505"
                />
              </div>

              <div className="w-full sm:w-48 shrink-0 flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0">Port:</span>
                <select
                  value={popPortFilter}
                  onChange={(e) => setPopPortFilter(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg p-1 text-[11px] font-bold text-gray-700 outline-none focus:border-teal-500"
                >
                  <option value="all">All Ports</option>
                  <option value="HAMAD">Hamad Port (QA)</option>
                  <option value="JEBEL">Jebel Ali (AE)</option>
                  <option value="MUNDRA">Mundra (IN)</option>
                </select>
              </div>
            </div>

            {/* Modal List Area */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-100 max-h-[50vh] space-y-2.5">
              {(() => {
                const term = popSearch.toLowerCase();
                const filtered = savedQuotes.filter((quote) => {
                  const basicMatches = !term || 
                    `${quote.ref} ${quote.buyer || ''} ${quote.company || ''} ${quote.dest || ''}`
                      .toLowerCase()
                      .includes(term);

                  const itemMatches = !term || (quote.items && quote.items.some(item => 
                    `${item.commodity || ''} ${item.brand || ''} ${item.size || ''}`
                      .toLowerCase()
                      .includes(term)
                  ));

                  const portMatches = popPortFilter === 'all' || 
                    (quote.dest && quote.dest.toUpperCase().includes(popPortFilter.toUpperCase())) ||
                    (quote.portOfDischarge && quote.portOfDischarge.toUpperCase().includes(popPortFilter.toUpperCase()));

                  return (basicMatches || itemMatches) && portMatches;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-gray-400 text-xs italic">
                      {savedQuotes.length === 0 
                        ? "No saved quotes exist in your system. Create one in the Quote Sheet tab!" 
                        : "No saved quotes matched your search filters."}
                    </div>
                  );
                }

                return filtered.map((quote) => (
                  <div key={quote.id} className="pt-3 first:pt-0 pb-3 last:pb-0 block">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <span className="font-mono text-xs font-black text-gray-900 bg-gray-100 border rounded px-1.5 py-0.5">
                          {quote.ref}
                        </span>
                        <strong className="text-xs font-bold text-gray-800 ml-2 block sm:inline uppercase">{quote.buyer}</strong>
                        <span className="text-[10px] text-gray-450 block font-semibold mt-0.5">
                          {quote.company} • Destination: {quote.dest || "Doha, Hamad"}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400 font-mono font-bold shrink-0">
                        {quote.date}
                      </span>
                    </div>

                    {/* Render separate items so users can choose which commodity cargo in that quote they want to load */}
                    <div className="grid grid-cols-1 gap-2 pl-3 border-l-2 border-slate-200 mt-2">
                      {quote.items && quote.items.length > 0 ? (
                        quote.items.map((item, idx) => (
                          <div key={idx} className="bg-gray-50 hover:bg-teal-50/40 p-2.5 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                            <div className="space-y-0.5">
                              <span className="text-xs font-black text-teal-950 uppercase block">
                                🌾 {item.commodity}
                              </span>
                              <div className="flex flex-wrap text-[10px] text-gray-500 font-medium gap-x-2.5">
                                <span>Brand: <strong className="font-bold text-gray-700">{item.brand || "N/A"}</strong></span>
                                <span>Size: <strong className="font-bold text-gray-700">{item.size || "35 KG"}</strong></span>
                                <span>FCL: <strong className="font-bold text-gray-700">{item.numFCL || 1} Containers</strong></span>
                              </div>
                              <div className="text-[9.5px] font-mono text-teal-800 font-bold mt-0.5">
                                CIF Price: <strong className="text-teal-900">${item.rate.toLocaleString()} USD/MT</strong> ({item.weightPerContainerKg?.toLocaleString() || "26,050"} kg / container)
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectQuoteAndItem(quote, item)}
                              className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded flex items-center gap-1 self-start sm:self-center transition-all cursor-pointer select-none"
                            >
                              Import Cargo <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-gray-400 italic">No cargo items in this quote sheet.</p>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-150 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQuoteSelector(false)}
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-55 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
