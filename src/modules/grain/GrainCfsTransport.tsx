import React from 'react';
import { ExpenseItem } from '../../types';
import { Truck, RotateCcw, Save, Layers, Plus, Trash2, Send } from 'lucide-react';

interface CfsTransportProps {
  lineItems: ExpenseItem[];
  setLineItems: (items: ExpenseItem[]) => void;
  cfsItems: ExpenseItem[];
  setCfsItems: (items: ExpenseItem[]) => void;
  fclCount: number;
  setFclCount: (count: number) => void;
  weightPerContainer: number;
  setWeightPerContainer: (wt: number) => void;
  onSaveExpenses: () => void;
  onResetExpenses: () => void;
  onPushToCalculator: (transportKg: number, cfsKg: number, numFcl: number, containerWt: number) => void;
}

export default function GrainCfsTransport({
  lineItems,
  setLineItems,
  cfsItems,
  setCfsItems,
  fclCount,
  setFclCount,
  weightPerContainer,
  setWeightPerContainer,
  onSaveExpenses,
  onResetExpenses,
  onPushToCalculator
}: CfsTransportProps) {
  // Sync state values
  const containers = Math.max(fclCount, 1);
  const wtPerCont = Math.max(weightPerContainer, 1);
  const totalWeight = containers * wtPerCont;

  // Calculators
  const calcEffQty = (item: ExpenseItem) => {
    return item.apply === 'fcl' ? item.qty * containers : item.qty;
  };

  const calcRowTotal = (item: ExpenseItem) => {
    const qty = calcEffQty(item);
    const cost = qty * item.rate;
    return cost * (1 + item.gst / 100);
  };

  // 1. Line Charges totals
  const totalLineInr = lineItems.reduce((sum, item) => sum + calcRowTotal(item), 0);

  // 2. CFS/Transport totals, splitting transport vs standard port cfs
  const cfsTotal = cfsItems.reduce((sum, item) => sum + calcRowTotal(item), 0);
  const transportTotal = cfsItems.filter(item => item.isTransport).reduce((sum, item) => sum + calcRowTotal(item), 0);
  const cfsNoTransportTotal = cfsItems.filter(item => !item.isTransport).reduce((sum, item) => sum + calcRowTotal(item), 0);

  const grandTotalAll = totalLineInr + cfsTotal;

  // 3. Compute metric stats (expressed in INR per KG)
  const transportKg = totalWeight > 0 ? transportTotal / totalWeight : 0;
  // Line charges + standard CFS fees go to CFS & Port charges category
  const cfsKg = totalWeight > 0 ? (totalLineInr + cfsNoTransportTotal) / totalWeight : 0;
  const totalExpensesKg = transportKg + cfsKg;
  const grandTotalPerQtl = totalWeight > 0 ? (grandTotalAll / (totalWeight / 100)) : 0;

  // Update inline expense rows
  const handleUpdateItem = (type: 'line' | 'cfs', index: number, field: keyof ExpenseItem, val: any) => {
    const targetList = type === 'line' ? [...lineItems] : [...cfsItems];
    const setTarget = type === 'line' ? setLineItems : setCfsItems;

    if (field === 'apply') {
      targetList[index] = { 
        ...targetList[index], 
        apply: val, 
        qty: targetList[index].qty // preserve qty
      };
    } else {
      targetList[index] = { ...targetList[index], [field]: val };
    }

    setTarget(targetList);
  };

  // Add customized extra charges
  const handleAddNewItem = (type: 'line' | 'cfs') => {
    const targetList = type === 'line' ? [...lineItems] : [...cfsItems];
    const setTarget = type === 'line' ? setLineItems : setCfsItems;
    const label = type === 'line' ? 'Additional Line Charge' : 'Additional CFS Charge';

    const newItem: ExpenseItem = {
      id: `${type}_custom_${Date.now()}`,
      name: `${label} ${targetList.length + 1}`,
      qty: 1,
      rate: 0,
      gst: 18,
      isTransport: false,
      apply: type === 'line' ? 'fcl' : 'shipment',
      isCustom: true
    };

    setTarget([...targetList, newItem]);
  };

  // Delete charge rows
  const handleDeleteItem = (type: 'line' | 'cfs', index: number) => {
    if (!confirm('Are you sure you want to remove this charge row?')) return;
    const targetList = type === 'line' ? [...lineItems] : [...cfsItems];
    const setTarget = type === 'line' ? setLineItems : setCfsItems;
    targetList.splice(index, 1);
    setTarget(targetList);
  };

  // Push values to calculator state
  const handlePushToCalculator = () => {
    onPushToCalculator(transportKg, cfsKg, containers, wtPerCont);
    showToast(`Pushed ₹${transportKg.toFixed(4)}/kg transport and ₹${cfsKg.toFixed(4)}/kg CFS to calculator!`);
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
    <div className="space-y-4" id="cfs-transport-expenses-page">
      <div className="page-header">
        <div className="breadcrumb">🚛 Freight Terminals</div>
        <h2 className="text-xl font-extrabold tracking-tight">CHA, CFS & Transport Costing Sheets</h2>
        <p className="text-sm text-gray-500 mt-1">
          Perform line-charge assessments and internal logistics planning. Rates will calculate the cost per KG.
        </p>
      </div>

      {/* Synchronized dynamic pricing strip */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 flex flex-wrap gap-5 items-center justify-between shadow-xs select-none">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 min-w-[280px]">
          <div>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-0.5">Calculated Transport</span>
            <div className="text-lg font-black font-mono text-gray-800">
              ₹ {transportKg.toFixed(4)} <span className="text-xs text-gray-500 font-bold lowercase">/ kg</span>
            </div>
            <span className="text-[10px] text-gray-400">Total Transport: ₹{transportTotal.toLocaleString()}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-0.5">Calculated CFS & Port Fees</span>
            <div className="text-lg font-black font-mono text-gray-800">
              ₹ {cfsKg.toFixed(4)} <span className="text-xs text-gray-500 font-bold lowercase">/ kg</span>
            </div>
            <span className="text-[10px] text-gray-400">Total CFS/Handling: ₹{(totalLineInr + cfsNoTransportTotal).toLocaleString()}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Sum Logistic Expenses</span>
            <div className="text-lg font-black font-mono text-gray-900">
              ₹ {totalExpensesKg.toFixed(4)} <span className="text-xs text-gray-500 font-bold lowercase">/ kg</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">₹{grandTotalPerQtl.toFixed(2)} / Quintal</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handlePushToCalculator}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition"
          >
            <Send className="w-4 h-4" /> Push to Calculator
          </button>
          <button
            onClick={onSaveExpenses}
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-bold transition"
          >
            Save Costs
          </button>
        </div>

      </div>

      {/* Container configurations */}
      <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <h3 className="card-title text-[10px] uppercase font-bold text-gray-700 mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-700" /> Shipment Parameters Setup
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="field">
            <label>No. of FCL Containers</label>
            <input 
              type="number" 
              min="1" 
              step="1"
              value={containers}
              onChange={(e) => setFclCount(Math.max(parseInt(e.target.value) || 1, 1))}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-blue-500"
            />
            <span className="fc info">Synced with calculator containers count</span>
          </div>

          <div className="field">
            <label>Cargo Net Mass Payload / Container (KGS)</label>
            <input 
              type="number" 
              min="100" 
              step="10"
              value={wtPerCont}
              onChange={(e) => setWeightPerContainer(Math.max(parseInt(e.target.value) || 26000, 100))}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-blue-500"
            />
            <span className="fc info">Average stuffed weight per FCL cargo holds</span>
          </div>

          <div className="field">
            <label>Calculated Net Consignment Mass</label>
            <div className="bg-gray-100 border border-gray-200 rounded px-3 py-1.5 text-xs font-mono font-extrabold text-blue-900">
              {totalWeight.toLocaleString()} Kilograms ({ (totalWeight/1000).toFixed(2) } MT)
            </div>
            <span className="fc ok">Total weight across all container builds.</span>
          </div>
        </div>
      </div>

      {/* Multi-grid detailing Table Charges */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        
        {/* LINE CHARGES */}
        <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">
              Section A: Line Charges
            </span>
            <button
              onClick={() => handleAddNewItem('line')}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition"
            >
              + Add Line Charge
            </button>
          </div>
          
          <div className="table-wrap rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 uppercase tracking-widest font-extrabold text-[9px] text-gray-500 border-b border-gray-200">
                  <th className="p-2">Item</th>
                  <th className="p-2" style={{ width: '100px' }}>Apply Rule</th>
                  <th className="p-2 text-center" style={{ width: '70px' }}>Qty</th>
                  <th className="p-2 text-center" style={{ width: '70px' }}>Total Qty</th>
                  <th className="p-2 text-right" style={{ width: '90px' }}>Cost INR</th>
                  <th className="p-2 text-center" style={{ width: '50px' }}>Gst%</th>
                  <th className="p-2 text-right">Total INR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item, idx) => {
                  const total = calcRowTotal(item);
                  const effQty = calcEffQty(item);
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/20">
                      <td className="p-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteItem('line', idx)}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded shrink-0"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem('line', idx, 'name', e.target.value)}
                            className="w-full bg-transparent p-1 border border-transparent font-medium hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none w-28 text-gray-800"
                          />
                        </div>
                      </td>
                      <td className="p-1">
                        <select
                          value={item.apply}
                          onChange={(e) => handleUpdateItem('line', idx, 'apply', e.target.value)}
                          className="w-full bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                        >
                          <option value="fcl">Per FCL</option>
                          <option value="bl">Per BL</option>
                          <option value="shipment">Shipment</option>
                        </select>
                      </td>
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) => handleUpdateItem('line', idx, 'qty', parseFloat(e.target.value) || 0)}
                          className={`w-12 bg-transparent text-center font-mono font-bold p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none ${
                            item.apply === 'fcl' ? 'text-blue-700 bg-blue-50/50' : ''
                          }`}
                        />
                      </td>
                      <td className="p-1 text-center font-mono font-semibold text-gray-500">
                        {effQty.toFixed(item.qty % 1 ? 2 : 0)}
                      </td>
                      <td className="p-1 text-right">
                        <input
                          type="number"
                          step="1"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem('line', idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-transparent text-right font-mono text-gray-800 p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          step="1"
                          value={item.gst}
                          onChange={(e) => handleUpdateItem('line', idx, 'gst', parseInt(e.target.value) || 0)}
                          className="w-10 bg-transparent text-center font-mono text-gray-600 p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                        />
                      </td>
                      <td className="p-1 text-right font-mono font-bold text-gray-800 pr-2">
                        ₹ {Math.round(total).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 text-blue-950 font-bold border-t border-blue-200">
                  <td colSpan={6} className="p-2 text-right">SUBTOTAL LINE CHARGES:</td>
                  <td className="p-2 text-right font-mono font-black pr-2">₹ {Math.round(totalLineInr).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* CHA, CFS & TRANSPORT CHARGES */}
        <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase">
              Section B: Handling & Logistics
            </span>
            <button
              onClick={() => handleAddNewItem('cfs')}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded transition"
            >
              + Add CFS Charge
            </button>
          </div>

          <div className="table-wrap rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 uppercase tracking-widest font-extrabold text-[9px] text-gray-500 border-b border-gray-200">
                  <th className="p-2">Item</th>
                  <th className="p-2" style={{ width: '100px' }}>Apply Rule</th>
                  <th className="p-2 text-center" style={{ width: '70px' }}>Qty</th>
                  <th className="p-2 text-center" style={{ width: '70px' }}>Total Qty</th>
                  <th className="p-2 text-right" style={{ width: '90px' }}>Cost INR</th>
                  <th className="p-2 text-center" style={{ width: '50px' }}>Gst%</th>
                  <th className="p-2 text-right">Total INR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cfsItems.map((item, idx) => {
                  const total = calcRowTotal(item);
                  const effQty = calcEffQty(item);
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/20">
                      <td className="p-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteItem('cfs', idx)}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded shrink-0"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem('cfs', idx, 'name', e.target.value)}
                            className="w-full bg-transparent p-1 border border-transparent font-medium hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none w-28 text-gray-800"
                          />
                        </div>
                      </td>
                      <td className="p-1">
                        <select
                          value={item.apply}
                          onChange={(e) => handleUpdateItem('cfs', idx, 'apply', e.target.value)}
                          className="w-full bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                        >
                          <option value="fcl">Per FCL</option>
                          <option value="bl">Per BL</option>
                          <option value="shipment">Shipment</option>
                        </select>
                      </td>
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) => handleUpdateItem('cfs', idx, 'qty', parseFloat(e.target.value) || 0)}
                          className={`w-12 bg-transparent text-center font-mono font-bold p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none ${
                            item.apply === 'fcl' ? 'text-blue-700 bg-blue-50/50' : ''
                          }`}
                        />
                      </td>
                      <td className="p-1 text-center font-mono font-semibold text-gray-500">
                        {effQty.toFixed(item.qty % 1 ? 2 : 0)}
                      </td>
                      <td className="p-1 text-right">
                        <input
                          type="number"
                          step="1"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem('cfs', idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-transparent text-right font-mono text-gray-800 p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          step="1"
                          value={item.gst}
                          onChange={(e) => handleUpdateItem('cfs', idx, 'gst', parseInt(e.target.value) || 0)}
                          className="w-10 bg-transparent text-center font-mono text-gray-600 p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                        />
                      </td>
                      <td className="p-1 text-right font-mono font-bold text-gray-800 pr-2">
                        ₹ {Math.round(total).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50 text-emerald-950 font-bold border-t border-emerald-200 whitespace-nowrap">
                  <td colSpan={6} className="p-2 text-right">SUBTOTAL LOGISTICAL CHARGES:</td>
                  <td className="p-2 text-right font-mono font-black pr-2">₹ {Math.round(cfsTotal).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      {/* GRAND OVERALL SUMMARY ACCENT PANEL */}
      <div className="card bg-gradient-to-br from-blue-700 to-indigo-950 text-white rounded-xl p-5 shadow-lg select-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block mb-1">
              GRAND TOTAL ALL EXPENSES (INR)
            </span>
            <div className="text-3xl font-black font-mono tracking-tight text-white">
              ₹ {Math.round(grandTotalAll).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-blue-200 italic mt-0.5">
              Refers to ₹{grandTotalPerQtl.toFixed(2)} per Cargo Quintal (100 KGS) across {containers} container(s).
            </p>
          </div>

          <div className="flex gap-6 divide-x divide-white/20">
            <div className="pl-0 text-center sm:text-left">
              <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest block">Transport Portion</span>
              <span className="text-xl font-bold font-mono">₹ {transportKg.toFixed(4)} / kg</span>
            </div>
            <div className="pl-6 text-center sm:text-left">
              <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest block">Port CFS & CHA Portion</span>
              <span className="text-xl font-bold font-mono">₹ {cfsKg.toFixed(4)} / kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
