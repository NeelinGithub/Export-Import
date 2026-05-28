import React, { useState } from 'react';
import { Commodity, Port } from '../types';
import { Plus, Trash2, Settings as SettingsIcon, AlertOctagon, RotateCcw, ShieldCheck } from 'lucide-react';

interface SettingsProps {
  commodities: Commodity[];
  setCommodities: (items: Commodity[]) => void;
  ports: Port[];
  setPorts: (ports: Port[]) => void;
  onClearDatabase: () => void;
  industry?: string;
  onResetCommodities?: (industryOnly?: boolean) => void;
  userModulePrefs?: Record<string, boolean>;
  setUserModulePrefs?: (prefs: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  allowedModules?: string[];
}

export default function Settings({
  commodities,
  setCommodities,
  ports,
  setPorts,
  onClearDatabase,
  industry = 'grain',
  onResetCommodities,
  userModulePrefs = {},
  setUserModulePrefs,
  allowedModules = []
}: SettingsProps) {
  // Input builders
  const [newPort, setNewPort] = useState('');
  const [newCommName, setNewCommName] = useState('');
  const [newCommExmill, setNewCommExmill] = useState('');

  // Dynamic Industry Labeling
  const industryLabel = 
    industry === 'grain' ? 'Rice' :
    industry === 'spices' ? 'Spices' :
    industry === 'chemicals' ? 'Chemicals' :
    industry === 'salts' ? 'Salts' :
    industry === 'vegetables_fruits' ? 'Vegetables & Fruits' :
    industry === 'tiles' ? 'Tiles' :
    'Cargo';

  const industryPlaceholder = 
    industry === 'grain' ? 'e.g. SONA MASOORI SELLA RICE' :
    industry === 'spices' ? 'e.g. ORGANIC RED CHILI S17' :
    industry === 'chemicals' ? 'e.g. CAUSTIC SODA FLAKES' :
    industry === 'salts' ? 'e.g. PINK HIMALAYAN ROCK SALT' :
    industry === 'vegetables_fruits' ? 'e.g. FRESH ALPHONSO MANGOES' :
    industry === 'tiles' ? 'e.g. POLISHED PORCELAIN TILES' :
    'e.g. NEW CUSTOM PRODUCT';

  const industryUnitLabel = 
    industry === 'tiles' ? '₹/SQM' : '₹/KG';

  // Filtered list of commodities for active industry mode
  const filteredCommodities = commodities.filter(
    (c) => (c.industry || 'grain') === industry
  );

  // Port modification
  const handleAddPort = () => {
    const raw = newPort.trim().toUpperCase();
    if (!raw) return;
    if (ports.includes(raw)) {
      alert(`Port "${raw}" already exists in reference database.`);
      return;
    }
    setPorts([...ports, raw].sort());
    setNewPort('');
  };

  const handleDeletePort = (portName: string) => {
    if (!confirm(`Are you sure you want to delete port ${portName}?`)) return;
    setPorts(ports.filter((p) => p !== portName));
  };

  // Commodity modification
  const handleAddCommodity = () => {
    const name = newCommName.trim().toUpperCase();
    const exmill = parseFloat(newCommExmill) || 0;

    if (!name) return;
    if (commodities.some((c) => c.name === name && (c.industry || 'grain') === industry)) {
      alert(`Product variety "${name}" already exists in this category.`);
      return;
    }

    const newItem: Commodity = {
      id: Date.now(),
      name,
      exmill,
      industry
    };

    setCommodities([...commodities, newItem]);
    setNewCommName('');
    setNewCommExmill('');
  };

  const handleDeleteCommodity = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    setCommodities(commodities.filter((c) => c.id !== id));
  };

  const handleUpdateExmill = (id: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setCommodities(
      commodities.map((c) => {
        if (c.id === id) {
          return { ...c, exmill: val };
        }
        return c;
      })
    );
  };

  return (
    <div className="space-y-6" id="settings-management-page">
      <div className="page-header">
        <div className="breadcrumb">⚙️ Configuration Console</div>
        <h2 className="text-xl font-extrabold tracking-tight">System Reference Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Customize active cargo species, target shipping ports, default pricing margins, and database directories.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COMMODITIES GRADES BOARD */}
        <div className="card bg-white p-4 border border-gray-200 rounded-xl shadow-xs space-y-4">
          <div className="border-b pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
                {industryLabel} Commodities & Specifications
              </span>
              <span className="text-[10px] font-mono text-gray-400 ml-2">({filteredCommodities.length} registered)</span>
            </div>
            
            {onResetCommodities && (
              <button
                onClick={() => onResetCommodities(true)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 w-max"
                title={`Restore standard preset variety listings for ${industryPlaceholder.split('e.g. ')[1]}`}
              >
                ✨ Reset Default Varieties
              </button>
            )}
          </div>

          {/* Commodity Creator Form */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-3 border border-gray-200">
            <span className="text-xs font-black text-gray-700 block">+ Add New {industryLabel} Species Grade</span>
            <div className="flex gap-2.5 items-end">
              <div className="flex-1">
                <label className="text-[9px] font-bold text-gray-550 block mb-1">Grade / Species Name</label>
                <input
                  type="text"
                  placeholder={industryPlaceholder}
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="w-24">
                <label className="text-[9px] font-bold text-gray-555 block mb-1">Price ({industryUnitLabel})</label>
                <input
                  type="number"
                  placeholder="e.g. 44.5"
                  value={newCommExmill}
                  onChange={(e) => setNewCommExmill(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-center outline-none"
                />
              </div>

              <button
                onClick={handleAddCommodity}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded p-2 transition outline-none h-8.5 w-9 flex items-center justify-center shrink-0"
                title="Add commodity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Commodities List */}
          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            {filteredCommodities.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 bg-gray-50/50 hover:bg-indigo-50/25 border border-gray-150 rounded-lg text-xs"
              >
                <div>
                  <span className="font-extrabold text-gray-800 uppercase block">{c.name}</span>
                  <span className="text-[10px] text-gray-400">System Code ID: #{c.id}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white rounded border border-gray-300 px-1.5 py-1">
                    <span className="text-[10px] text-gray-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={c.exmill === 0 ? '' : c.exmill}
                      placeholder="0.00"
                      onChange={(e) => handleUpdateExmill(c.id, e.target.value)}
                      className="w-12 text-right bg-transparent outline-none font-mono font-bold text-gray-800"
                    />
                  </div>

                  <button
                    onClick={() => handleDeleteCommodity(c.id, c.name)}
                    className="text-gray-400 hover:text-red-500 p-1"
                    title={`Remove ${industryLabel.toLowerCase()} grade`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filteredCommodities.length === 0 && (
              <div className="text-center py-6 text-gray-450 text-xs">
                No custom {industryLabel.toLowerCase()} varieties configured yet. Use the fields above to add one!
              </div>
            )}
          </div>
        </div>

        {/* DESTINATION PORTS LOGS */}
        <div className="card bg-white p-4 border border-gray-200 rounded-xl shadow-xs space-y-4">
          <div className="border-b pb-2 flex justify-between items-center">
            <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
              Target Clearance Destination Ports
            </span>
            <span className="text-[10px] font-mono text-gray-400">({ports.length} registered)</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg space-y-3 border border-gray-200">
            <span className="text-xs font-black text-gray-700 block">+ Register Shipping Port</span>
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="e.g. HAMAD PORT, JEDDAH SEAPORT, LOME"
                value={newPort}
                onChange={(e) => setNewPort(e.target.value)}
                className="flex-1 bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none"
              />
              <button
                onClick={handleAddPort}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 text-xs font-bold shadow-xs transition h-8.5 shrink-0"
              >
                Save Port
              </button>
            </div>
          </div>

          {/* Ports List */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
            {ports.map((port) => (
              <div
                key={port}
                className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
              >
                <span className="font-extrabold text-gray-750 uppercase tracking-wide truncate pr-2">
                  {port}
                </span>
                <button
                  onClick={() => handleDeletePort(port)}
                  className="text-gray-400 hover:text-red-500 p-0.5"
                  title="Unregister port"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* INDIVIDUALIZED ASSIGNED MODULE CONTROLLER */}
      {setUserModulePrefs && allowedModules && allowedModules.length > 0 && (
        <div className="card bg-white p-5 border border-gray-200 rounded-xl shadow-xs space-y-4" id="user-module-pref-control">
          <div className="border-b pb-2">
            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
              Personalized Module Control Panel
            </span>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Uncheck a module to hide its tab, views, and disable related components. Re-check the box to restore its visibility and functions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {[
              {
                code: 'rate_calc',
                title: 'Landed Rate Calculator',
                desc: 'Ex-mill pricing, CFS charges, freight factors and landing rate calculations.'
              },
              {
                code: 'quote_saving',
                title: 'RFQ & Saved Quotes Base',
                desc: 'Store draft rates, save history logs, and filter RFQ quotation registers.'
              },
              {
                code: 'quote_sharing',
                title: 'Quotation Link Share',
                desc: 'Encrypt and export printable quotes to public, viewable buyer worksheets.'
              },
              {
                code: 'bag_price_stock',
                title: 'Sack Pack Pricing & stock',
                desc: 'Brand bags unit price manager and physical packaging stock records.'
              },
              {
                code: 'grain_inventory',
                title: 'Warehouse & Grain Inventory',
                desc: 'Silo tracker for raw paddy, processing queues and finished product stocks.'
              },
              {
                code: 'pi_ci_generation',
                title: 'Commercial Document Workspace',
                desc: 'Generate, edit, and print Proforma Invoices, Commercial Invoices & Packing Lists.'
              },
              {
                code: 'shipping_tracking',
                title: 'Vessel Tracking & Logistics',
                desc: 'Ocean carrier progress charts, vessel positions and BOL tracking logs.'
              }
            ]
              .filter(mod => allowedModules.includes(mod.code))
              .map(mod => {
                const isChecked = userModulePrefs[mod.code] !== false;
                return (
                  <div 
                    key={mod.code} 
                    onClick={() => {
                      setUserModulePrefs(prev => ({
                        ...prev,
                        [mod.code]: !isChecked
                      }));
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                      isChecked 
                        ? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/60' 
                        : 'bg-gray-50/50 border-gray-200 opacity-60 hover:opacity-105'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-extrabold text-gray-800 uppercase block leading-tight">
                        {mod.title}
                      </span>
                      <span className="text-[10px] text-gray-500 leading-snug block">
                        {mod.desc}
                      </span>
                      <span className="text-[8px] font-mono bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-black inline-block uppercase mt-1">
                        CODE: {mod.code}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* DANGEROUS CLEARANCE ZONE */}
      <div className="card bg-red-50/50 border border-red-200 rounded-xl p-4 space-y-3.5">
        <h3 className="card-title text-red-800 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          <AlertOctagon className="w-4 h-4 text-red-700" /> System Factory Diagnostics
        </h3>
        
        <p className="text-xs text-red-900 leading-normal max-w-2xl">
          Performing a factory storage purge deletes all custom quotes, configured commodities, transport variables, and custom bag parameters from your local browser's localStorage. The system will reset to pristine factory constants.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClearDatabase}
            className="bg-red-650 hover:bg-red-750 text-white font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <RotateCcw className="w-4 h-4" /> Purge Database & Reset Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}
