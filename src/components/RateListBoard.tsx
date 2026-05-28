import React, { useState } from 'react';
import { RateRow, Commodity, Port, GrainInventoryItem } from '../types';
import { 
  Search, Trash2, Edit2, FileText, BadgePlus, Download, 
  HelpCircle, CheckSquare, Square, X, AlertTriangle, CheckCircle2, AlertCircle
} from 'lucide-react';

interface RateListBoardProps {
  rateList: RateRow[];
  setRateList: (rows: RateRow[]) => void;
  commodities: Commodity[];
  ports: Port[];
  onTriggerQuoteSheetSetup: (rateIds: number[]) => void;
  grainInventory?: GrainInventoryItem[];
  isInventoryEnabled?: boolean;
}

export default function RateListBoard({
  rateList,
  setRateList,
  commodities,
  ports,
  onTriggerQuoteSheetSetup,
  grainInventory = [],
  isInventoryEnabled = true
}: RateListBoardProps) {
  const [search, setSearch] = useState('');
  const [destFilter, setDestFilter] = useState('');

  // Multiselect state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Manual Add Rate Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Add/Edit Form states
  const [mBuyer, setMBuyer] = useState('');
  const [mDest, setMDest] = useState('');
  const [mComm, setMComm] = useState('');
  const [mBrand, setMBrand] = useState('NOT-DEFINED');
  const [mPacked, setMPacked] = useState('JUTE BAGS');
  const [mSize, setMSize] = useState('20');
  const [mMaster, setMMaster] = useState('NO');
  const [mCrop, setMCrop] = useState<'NEW' | 'OLD'>('NEW');
  const [mYear, setMYear] = useState('2025');
  const [mRate, setMRate] = useState('');
  const [mCond, setMCond] = useState('CIF');
  const [mPayment, setMPayment] = useState('LC at Sight');

  // Filter list rows
  const visibleRates = rateList.filter(row => {
    const term = search.toLowerCase();
    const portMatch = !destFilter || row.dest === destFilter;
    const searchMatch = !search || 
      `${row.dest} ${row.commodity} ${row.brand} ${row.packed} ${row.condition} ${row.buyer || ''}`
        .toLowerCase()
        .includes(term);
    return portMatch && searchMatch;
  });

  // Extract unique ports present in list to build filter chips
  const activePorts = Array.from(new Set(rateList.map(r => r.dest))).sort();

  // Selection toggle
  const handleToggleRow = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === visibleRates.length && visibleRates.length > 0) {
      // Clear visible ones
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleRates.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      // Add all visible ones
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleRates.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Mass action: send rows to Quote Sheet
  const handleBatchSendToQuote = () => {
    if (selectedIds.size === 0) return;
    onTriggerQuoteSheetSetup(Array.from(selectedIds));
    showToast(`${selectedIds.size} quote item(s) pushed to active Quote Sheet`);
  };

  // CSV export
  const handleExportCSV = (exportSelected = false) => {
    const listToExport = exportSelected 
      ? rateList.filter(r => selectedIds.has(r.id))
      : rateList;

    if (listToExport.length === 0) {
      alert('No rate entries available to export');
      return;
    }

    const headers = [
      'Buyer / Consignee', 'Destination Port', 'Commodity', 'Brand', 'Packaging Material', 
      'Bag Weight', 'Outer Master Bag', 'Crop Quality', 'Crop Year', 
      'Calculated Rate USD/MT', 'FOB/CIF Condition', 'Payment Terms', 'Storable Date'
    ];

    const rows = listToExport.map(r => [
      r.buyer || '-', r.dest, r.commodity, r.brand, r.packed, r.size, r.master, 
      r.crop, r.year, r.rate, r.condition, r.paymentTerms, r.date
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(row => row.map(v => `"${v}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rice_export_rates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAllBoard = () => {
    if (rateList.length === 0) return;
    if (!confirm('Warning: Are you sure you want to clear EVERY rate from the board? This cannot be undone.')) return;
    setRateList([]);
    setSelectedIds(new Set());
  };

  const handleDeleteRow = (id: number) => {
    if (!confirm('Are you sure you want to delete this rate log from the board?')) return;
    setRateList(rateList.filter(r => r.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Add/Edit manual row save
  const handleOpenAddModal = (rowToEdit?: RateRow) => {
    if (ports.length === 0 || commodities.length === 0) {
      alert('Setup at least one port and one commodity first.');
      return;
    }

    if (rowToEdit) {
      setEditId(rowToEdit.id);
      setMBuyer(rowToEdit.buyer || '');
      setMDest(rowToEdit.dest);
      setMComm(rowToEdit.commodity);
      setMBrand(rowToEdit.brand);
      setMPacked(rowToEdit.packed);
      // clean weight label "RICE 20 KG" => "20"
      const wtMatch = rowToEdit.size.match(/(\d+(?:\.\d+)?)/);
      setMSize(wtMatch ? wtMatch[1] : '20');
      setMMaster(rowToEdit.master);
      setMCrop(rowToEdit.crop);
      setMYear(rowToEdit.year);
      setMRate(String(rowToEdit.rate));
      setMCond(rowToEdit.condition);
      setMPayment(rowToEdit.paymentTerms);
    } else {
      setEditId(null);
      setMBuyer('');
      setMDest(ports[0] || '');
      setMComm(commodities[0]?.name || '');
      setMBrand('NOT-DEFINED');
      setMPacked('BOPP BAGS');
      setMSize('20');
      setMMaster('NO');
      setMCrop('NEW');
      setMYear('2025');
      setMRate('');
      setMCond('CIF');
      setMPayment('LC at Sight');
    }
    setShowAddModal(true);
  };

  const handleSaveModalValue = () => {
    const rateVal = parseFloat(mRate);
    if (!mDest || !mComm || isNaN(rateVal) || rateVal <= 0) {
      alert('Please fill out all required parameters. Rate must be greater than 0');
      return;
    }

    const compiledRow: RateRow = {
      id: editId || Date.now(),
      dest: mDest,
      commodity: mComm,
      brand: mBrand.trim().toUpperCase() || 'NOT-DEFINED',
      packed: mPacked,
      size: `RICE ${mSize} KG`,
      master: mMaster,
      crop: mCrop,
      year: mYear || '2025',
      rate: Math.round(rateVal),
      condition: mCond,
      paymentTerms: mPayment,
      buyer: mBuyer.trim(),
      numFCL: editId ? (rateList.find(r => r.id === editId)?.numFCL || 1) : 1,
      weightPerContainerKg: editId ? (rateList.find(r => r.id === editId)?.weightPerContainerKg || 26000) : 26000,
      totalWeightKg: editId ? (rateList.find(r => r.id === editId)?.totalWeightKg || 26000) : 26000,
      date: editId ? (rateList.find(r => r.id === editId)?.date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0]
    };

    if (editId) {
      setRateList(rateList.map(r => r.id === editId ? compiledRow : r));
    } else {
      setRateList([compiledRow, ...rateList]);
    }
    setShowAddModal(false);
  };

  const showToast = (msg: string) => {
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }
  };

  return (
    <div className="space-y-4" id="board-rates-view">
      <div className="page-header">
        <div className="breadcrumb">📈 Pricing Terminal</div>
        <h2 className="text-xl font-extrabold tracking-tight">Export Rate List Board</h2>
        <p className="text-sm text-gray-500 mt-1">
          Review, select and group stored prices. Use checkboxes on various grades to forge multi-port printable catalogs.
        </p>
      </div>

      {/* Filter and control Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 border border-gray-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap gap-2.5 items-center flex-1">
          
          {/* Keyword Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search specs, ports, brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 outline-none text-xs text-gray-800 font-semibold border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 transition"
            />
          </div>

          {/* Port Dropdown filter */}
          <select
            value={destFilter}
            onChange={(e) => setDestFilter(e.target.value)}
            className="bg-gray-50 text-xs font-semibold text-gray-700 rounded-lg p-1.5 border border-gray-200 outline-none focus:bg-white"
          >
            <option value="">All Destinations</option>
            {ports.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

        </div>

        {/* Toolbar action logs */}
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => handleToggleAll()}
            className="px-3 py-1.5 text-xs font-bold border border-gray-200 hover:bg-gray-50 bg-white rounded-lg flex items-center gap-1.5 transition text-gray-700"
          >
            Select All Visible
          </button>
          <button
            onClick={() => handleExportCSV(false)}
            className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" /> Export CSV
          </button>
          <button
            onClick={handleClearAllBoard}
            className="px-3 py-1.5 text-xs font-bold border border-red-200 text-red-700 hover:bg-red-50 bg-white rounded-lg flex items-center gap-1 transition"
          >
            Clear Board
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-3.5 py-1.5 text-xs font-black bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <BadgePlus className="w-4 h-4" /> Add Rate Row
          </button>
        </div>
      </div>

      {/* Destination Port scroll chips */}
      {activePorts.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setDestFilter('')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition shrink-0 border ${
              !destFilter 
                ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-500'
            }`}
          >
            All Port Zones ({rateList.length})
          </button>
          {activePorts.map(portCode => {
            const count = rateList.filter(row => row.dest === portCode).length;
            return (
              <button
                key={portCode}
                onClick={() => setDestFilter(portCode)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition shrink-0 border ${
                  destFilter === portCode 
                    ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-500'
                }`}
              >
                {portCode} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Main Prices Datatable Grid */}
      <div className="card bg-white p-2 rounded-xl border border-gray-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-gray-50 uppercase tracking-widest font-extrabold text-[9px] text-gray-500 border-b border-gray-250">
                <th className="p-3" style={{ width: '40px' }}>
                  <button 
                    type="button" 
                    onClick={handleToggleAll} 
                    className="text-gray-400 hover:text-blue-600 transition"
                  >
                    {selectedIds.size === visibleRates.length && visibleRates.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Buyer / Consignee</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Commodity Spec</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Packaging Type</th>
                <th className="p-3">Weight Size</th>
                <th className="p-3 text-center">Double Master</th>
                <th className="p-3">Crop Quality</th>
                <th className="p-3 text-right">Landed USD/MT</th>
                <th className="p-3 text-center">Incoterm</th>
                <th className="p-3">Payment Term Limit</th>
                <th className="p-3" style={{ width: '70px' }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {visibleRates.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-gray-400 italic">
                    {rateList.length === 0 
                      ? 'No items saved. Use the Rate Calculator input tool, or add a raw entry above.'
                      : 'No matches found corresponding to this filters query.'}
                  </td>
                </tr>
              ) : (
                visibleRates.map((row) => {
                  const isChecked = selectedIds.has(row.id);
                  return (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-blue-50/50 transition cursor-pointer ${isChecked ? 'bg-blue-50/70' : ''}`}
                      onClick={() => handleToggleRow(row.id)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleToggleRow(row.id)}
                          className="text-gray-400 hover:text-blue-600 transition"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-extrabold text-blue-900 bg-amber-50/20 max-w-[150px] truncate uppercase font-sans select-all" title={row.buyer || 'Not Specified'}>
                        {row.buyer || <span className="text-gray-300 italic font-normal text-[10px]">not specified</span>}
                      </td>
                      <td className="p-3 font-bold text-gray-900">{row.dest}</td>
                      <td className="p-3 font-semibold text-gray-800 break-words max-w-[200px] leading-tight">
                        <div className="font-bold">{row.commodity}</div>
                        {(() => {
                          const requiredTons = (row.totalWeightKg || ((row.numFCL || 1) * (row.weightPerContainerKg || 26055))) / 1000;
                          const match = grainInventory.find(item => item.grainName.toLowerCase().trim() === row.commodity.toLowerCase().trim());
                          if (!isInventoryEnabled || !match) return null;

                          const processedAvailable = match.processedRiceTons || 0;
                          const paddyAvailable = match.paddyStockTons || 0;
                          const shortfall = Math.max(0, requiredTons - processedAvailable);
                          const paddyNeeded = shortfall / 0.65;

                          if (processedAvailable >= requiredTons) {
                            return (
                              <span className="inline-flex items-center gap-1 mt-1 bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider" title={`Sufficient processed stock is available. ${processedAvailable.toFixed(1)} MT in stock.`}>
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Stock Active ({processedAvailable.toFixed(0)} MT)
                              </span>
                            );
                          } else if (paddyAvailable >= paddyNeeded) {
                            return (
                              <span className="inline-flex items-center gap-1 mt-1 bg-amber-50 text-amber-750 border border-amber-250 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider" title={`Short processed stock by ${shortfall.toFixed(1)} MT. Silo has ${paddyAvailable.toFixed(1)} MT Paddy. Click to order milling.`}>
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600 font-bold" />
                                Milling Needed (Short {shortfall.toFixed(0)} MT)
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center gap-1 mt-1 bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider animate-pulse font-bold" title={`Critical shortfall by ${shortfall.toFixed(1)} MT. Silo Raw Paddy too low (${paddyAvailable.toFixed(1)} MT). Order more paddy.`}>
                                <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                                Stock N/A (Order Paddy)
                              </span>
                            );
                          }
                        })()}
                      </td>
                      <td className="p-3 font-mono text-gray-600 uppercase">{row.brand}</td>
                      <td className="p-3 text-gray-600">{row.packed}</td>
                      <td className="p-3 font-mono font-bold text-gray-700">{row.size}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.master === 'YES' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {row.master}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 font-semibold text-[11px]">
                        {row.crop} crop ({row.year})
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-[13px] text-blue-700">
                        $ {row.rate.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase border ${
                          row.condition === 'CIF' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          row.condition === 'FOB' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-250'
                        }`}>
                          {row.condition}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 max-w-[150px] truncate" title={row.paymentTerms}>
                        {row.paymentTerms || '-'}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleOpenAddModal(row)}
                            className="bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded p-1 text-gray-600 transition"
                            title="Edit row details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 rounded p-1 text-red-600 transition"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Floating multiselect action panel */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-900 border border-blue-800 text-white rounded-full px-5 py-3 shadow-2xl flex items-center gap-4 z-40 animate-slideUp font-semibold text-xs select-none">
          <span className="bg-blue-800/80 border border-blue-700 px-3 py-1 rounded-full font-bold">
            {selectedIds.size} grade(s) selected
          </span>
          <span className="text-blue-300">|</span>
          <button
            onClick={handleBatchSendToQuote}
            className="bg-white text-blue-900 hover:bg-blue-50 px-4 py-1.5 rounded-full font-black flex items-center gap-1 transition"
          >
            <FileText className="w-4 h-4 text-blue-900" /> Send to Quote Sheet
          </button>
          <button
            onClick={() => handleExportCSV(true)}
            className="text-white hover:text-blue-200 transition font-bold"
          >
            Export Selected
          </button>
          <button
            onClick={handleClearSelection}
            className="text-blue-300 hover:text-white transition p-1"
            title="Cancel selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Rate Manual Modal overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-zoomIn flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-4 py-3.5 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">{editId ? 'Modify Rate Row' : 'Add Manual Export price'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/80 p-0.5 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
              <div className="field">
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Buyer / Consignee</label>
                <input 
                  type="text" 
                  placeholder="e.g. Al-Mahmood General Trading"
                  value={mBuyer} 
                  onChange={(e) => setMBuyer(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded p-1.5 font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Destination Port</label>
                  <select 
                    value={mDest} 
                    onChange={(e) => setMDest(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 font-bold"
                  >
                    {ports.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Commodity Rice Select</label>
                  <select 
                    value={mComm} 
                    onChange={(e) => setMComm(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 font-bold"
                  >
                    {commodities.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Export Brand</label>
                  <input 
                    type="text" 
                    value={mBrand} 
                    onChange={(e) => setMBrand(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5"
                  />
                </div>

                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Material Packed In</label>
                  <select 
                    value={mPacked} 
                    onChange={(e) => setMPacked(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5"
                  >
                    <option value="JUTE BAGS">JUTE BAGS</option>
                    <option value="BOPP BAGS">BOPP BAGS</option>
                    <option value="NON WOVEN BAGS">NON WOVEN BAGS</option>
                    <option value="HDPE POUCH PACK">HDPE POUCH PACK</option>
                    <option value="WHITE PP BAGS">WHITE PP BAGS</option>
                    <option value="DOUBLE BROWN JUTE BAGS">DOUBLE BROWN JUTE BAGS</option>
                    <option value="LDPE BAGS">LDPE BAGS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Net KG Size</label>
                  <input 
                    type="number" 
                    value={mSize} 
                    onChange={(e) => setMSize(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 font-mono text-center"
                  />
                </div>

                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Master Outer</label>
                  <select 
                    value={mMaster} 
                    onChange={(e) => setMMaster(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5"
                  >
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </div>

                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Crop Age</label>
                  <select 
                    value={mCrop} 
                    onChange={(e) => setMCrop(e.target.value as 'NEW' | 'OLD')}
                    className="w-full bg-white border border-gray-300 rounded p-1.5"
                  >
                    <option value="NEW">New</option>
                    <option value="OLD">Old</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Crop year</label>
                  <input 
                    type="number" 
                    value={mYear} 
                    onChange={(e) => setMYear(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 font-mono text-center font-bold"
                  />
                </div>

                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Export Selling Rate (USD / MT)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 625"
                    value={mRate} 
                    onChange={(e) => setMRate(e.target.value)}
                    className="w-full bg-blue-50 border border-blue-200 text-blue-900 font-extrabold rounded p-1.5 font-mono text-center text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Incoterm Condition</label>
                  <select 
                    value={mCond} 
                    onChange={(e) => setMCond(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5"
                  >
                    <option value="CIF">CIF</option>
                    <option value="FOB">FOB</option>
                    <option value="CF">C&F</option>
                  </select>
                </div>

                <div className="field">
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Payment rule</label>
                  <input 
                    type="text" 
                    value={mPayment} 
                    placeholder="LC at Sight, TT Advance"
                    onChange={(e) => setMPayment(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-bold rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveModalValue}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow-sm transition"
              >
                {editId ? 'Save Edits' : 'Add Rate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
