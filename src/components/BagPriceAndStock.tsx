import React, { useState, useEffect } from 'react';
import { BagPrices, BagStockItem, BagSizePrice } from '../types';
import { Trash2, Plus, RotateCcw, Save, Archive, ShoppingBag, Eye } from 'lucide-react';
import { INDUSTRY_PACKAGING } from '../constants';

interface BagPriceAndStockProps {
  bagPrices: BagPrices;
  setBagPrices: (prices: BagPrices | ((prev: BagPrices) => BagPrices)) => void;
  bagStock: BagStockItem[];
  setBagStock: (stock: BagStockItem[]) => void;
  onSavePrices: () => void;
  onResetPrices: () => void;
  onSaveStock: () => void;
  onResetStock: () => void;
  currentCalculatorBagUnit?: { brand: string; pack: string; kg: number };
  industry?: string;
}

export default function BagPriceAndStock({
  bagPrices,
  setBagPrices,
  bagStock,
  setBagStock,
  onSavePrices,
  onResetPrices,
  onSaveStock,
  onResetStock,
  currentCalculatorBagUnit,
  industry = 'grain'
}: BagPriceAndStockProps) {
  const activeIndustry = industry;
  const industryConfig = INDUSTRY_PACKAGING[activeIndustry] || INDUSTRY_PACKAGING.grain;
  const categories = industryConfig.categories;
  const defaultPack = categories[0] || 'BOPP BAGS';
  const defaultKg = industryConfig.defaultSizes[defaultPack]?.[0]?.size?.toString() || '20';

  // Local state for dynamic forms for adding sizes
  const [newSizeKg, setNewSizeKg] = useState<{ [key: string]: string }>({});
  const [newSizePrice, setNewSizePrice] = useState<{ [key: string]: string }>({});

  // Dynamic state for adding a new stock item
  const [newStockBrand, setNewStockBrand] = useState('NOT-DEFINED');
  const [newStockPack, setNewStockPack] = useState(defaultPack);
  const [newStockKg, setNewStockKg] = useState(defaultKg);

  useEffect(() => {
    const config = INDUSTRY_PACKAGING[activeIndustry];
    if (config) {
      const firstCat = config.categories[0];
      setNewStockPack(firstCat);
      const firstSize = config.defaultSizes[firstCat]?.[0]?.size?.toString() || '20';
      setNewStockKg(firstSize);
    }
  }, [activeIndustry]);
  const [newStockQty, setNewStockQty] = useState('0');
  const [newStockSupplier, setNewStockSupplier] = useState('TBD Supplier');
  const [newStockLead, setNewStockLead] = useState('7-10 days');
  const [newStockNotes, setNewStockNotes] = useState('');

  // Handle adding a size to a bag category
  const handleAddSize = (category: string) => {
    const sizeVal = parseFloat(newSizeKg[category] || '');
    const priceVal = parseFloat(newSizePrice[category] || '');

    if (isNaN(sizeVal) || sizeVal <= 0) {
      alert('Please enter a valid bag weight (KG) greater than 0.');
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      alert('Please enter a valid price >= 0.');
      return;
    }

    setBagPrices((prev) => {
      const currentList = prev[category] || [];
      // Avoid duplicate sizes
      if (currentList.some((b) => b.size === sizeVal)) {
        alert(`Size ${sizeVal} KG already exists in ${category}.`);
        return prev;
      }
      const updatedItem: BagSizePrice = {
        id: category.replace(/\s+/g, '').toLowerCase() + Date.now(),
        size: sizeVal,
        price: priceVal
      };
      
      const updatedList = [...currentList, updatedItem].sort((a, b) => b.size - a.size);
      return {
        ...prev,
        [category]: updatedList
      };
    });

    // Clear local input states
    setNewSizeKg(prev => ({ ...prev, [category]: '' }));
    setNewSizePrice(prev => ({ ...prev, [category]: '' }));
  };

  // Delete a size from a category
  const handleDeleteSize = (category: string, id: string) => {
    if (!confirm('Are you sure you want to delete this bag size reference?')) return;
    setBagPrices((prev) => {
      const currentList = prev[category] || [];
      return {
        ...prev,
        [category]: currentList.filter(item => item.id !== id)
      };
    });
  };

  // Edit inline price
  const handlePriceChange = (category: string, index: number, value: string) => {
    const freshVal = parseFloat(value) || 0;
    setBagPrices((prev) => {
      const currentList = [...(prev[category] || [])];
      if (currentList[index]) {
        currentList[index] = { ...currentList[index], price: freshVal };
      }
      return {
        ...prev,
        [category]: currentList
      };
    });
  };

  // Add stock row
  const handleAddStockRow = () => {
    const kg = parseFloat(newStockKg) || 0;
    const qty = parseInt(newStockQty) || 0;
    if (kg <= 0) {
      alert('Bag weight in KG must be greater than 0');
      return;
    }

    const newItem: BagStockItem = {
      id: 'bs_' + Date.now(),
      brand: newStockBrand.trim().toUpperCase() || 'NOT-DEFINED',
      pack: newStockPack,
      kg,
      stock: qty,
      supplier: newStockSupplier.trim(),
      leadTime: newStockLead.trim(),
      notes: newStockNotes.trim()
    };

    setBagStock([newItem, ...bagStock]);
    
    // Reset fields
    setNewStockBrand('NOT-DEFINED');
    setNewStockQty('0');
    setNewStockNotes('');
  };

  // Delete stock row
  const handleDeleteStockRow = (id: string) => {
    if (!confirm('Are you sure you want to delete this bag stock entry?')) return;
    setBagStock(bagStock.filter(item => item.id !== id));
  };

  // Update inline stock details
  const handleStockRowUpdate = (id: string, field: keyof BagStockItem, value: any) => {
    setBagStock(bagStock.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Fill current calculator select into stock row creator helper
  const handleSeedFromCalculator = () => {
    if (currentCalculatorBagUnit) {
      setNewStockBrand(currentCalculatorBagUnit.brand || 'NOT-DEFINED');
      setNewStockPack(currentCalculatorBagUnit.pack);
      setNewStockKg(String(currentCalculatorBagUnit.kg));
    } else {
      alert('Open the Rate Calculator first, or enter details manually.');
    }
  };

  return (
    <div className="space-y-6" id="bag-price-and-stock-page">
      <div className="page-header">
        <div className="breadcrumb">📦 Reference & Operations</div>
        <h2 className="text-xl font-extrabold tracking-tight">Bag Prices & Warehouse Stocks</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add custom bag sizes, live-edit pricing parameters, and keep the packaging inventory updated on a single page.
        </p>
      </div>

      {/* Grid of Shrunk Bag Reference Tables */}
      <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">
              Bag Pricing Tables
            </span>
          </div>
          <p className="text-xs text-gray-400 max-w-sm sm:text-right">
            Values auto-populate target calculations in the rate builder.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onResetPrices}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md text-xs font-semibold flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </button>
            <button
              onClick={onSavePrices}
              className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Prices
            </button>
          </div>
        </div>

        {/* Shrunk responsive grid layout (Aesthetic 4-column layout on huge, 2-col on mid, 1 on small) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {categories.map((category) => {
            const list = bagPrices[category] || [];
            return (
              <div
                key={category}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase border-b border-gray-200 pb-1.5 mb-2 flex justify-between items-center">
                    <span>{category}</span>
                    <span className="text-[10px] text-blue-600 lowercase font-medium">
                      {list.length} sizes
                    </span>
                  </h4>

                  {/* Shrunken compact list */}
                  <div className="space-y-1.5 max-h-56 overflow-y-auto mb-3">
                    {list.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic py-3 text-center">
                        No sizes referenced yet.
                      </p>
                    ) : (
                      list.map((bag, idx) => (
                        <div
                          key={bag.id}
                          className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-gray-100 group hover:border-blue-200 transition"
                        >
                          <span className="font-mono text-gray-700 font-bold">{bag.size} KG</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-600 font-mono font-medium">
                              ₹{(bag.price / bag.size).toFixed(2)}/kg
                            </span>
                            <div className="flex items-center gap-1 bg-gray-50 rounded border border-gray-200 px-1">
                              <span className="text-[10px] text-gray-400">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                value={bag.price === 0 ? '' : bag.price}
                                placeholder="0.00"
                                onChange={(e) => handlePriceChange(category, idx, e.target.value)}
                                className="w-12 bg-transparent text-right font-mono font-semibold text-gray-800 outline-none text-xs p-px"
                              />
                            </div>
                            <button
                              onClick={() => handleDeleteSize(category, bag.id)}
                              className="text-gray-400 hover:text-red-500 p-0.5 rounded transition"
                              title="Delete this size"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Shrink size manager addition form */}
                <div className="border-t border-gray-200/80 pt-2.5 mt-auto">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    + Add Custom Size
                  </span>
                  <div className="flex gap-1.5 items-center">
                    <div className="flex-1 min-w-0">
                      <input
                        type="number"
                        placeholder="KG"
                        value={newSizeKg[category] || ''}
                        onChange={(e) =>
                          setNewSizeKg((prev) => ({ ...prev, [category]: e.target.value }))
                        }
                        className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-[11px] font-mono outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="number"
                        placeholder="Price ₹"
                        value={newSizePrice[category] || ''}
                        onChange={(e) =>
                          setNewSizePrice((prev) => ({ ...prev, [category]: e.target.value }))
                        }
                        className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-[11px] font-mono outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                    <button
                      onClick={() => handleAddSize(category)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded p-1 flex items-center justify-center transition"
                      title="Add size"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bag Stock Management Table */}
      <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
                Bag Inventory & Warehouse Stocks
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Manage warehouse levels to monitor availability during quote generation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {currentCalculatorBagUnit && (
              <button
                onClick={handleSeedFromCalculator}
                className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-150 border border-blue-200 rounded flex items-center gap-1 transition"
                title={`Fetch packaging selected in calculator: ${currentCalculatorBagUnit.brand} ${currentCalculatorBagUnit.pack} ${currentCalculatorBagUnit.kg}kg`}
              >
                <Eye className="w-3.5 h-3.5" /> Pull Calculator Choice
              </button>
            )}
            <button
              onClick={onResetStock}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md text-xs font-semibold flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Stock
            </button>
            <button
              onClick={onSaveStock}
              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Stock
            </button>
          </div>
        </div>

        {/* Current stock status for calculator brand */}
        {currentCalculatorBagUnit && (
          <div className="bg-blue-50/50 border border-blue-150 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-blue-800">Calculator Focus Model: </span>
              <span className="font-mono text-gray-700">
                {currentCalculatorBagUnit.brand} • {currentCalculatorBagUnit.pack} • {currentCalculatorBagUnit.kg} KG
              </span>
            </div>
            {(() => {
              const exact = bagStock.find(
                (item) =>
                  item.brand.toUpperCase() === currentCalculatorBagUnit.brand.toUpperCase() &&
                  item.pack === currentCalculatorBagUnit.pack &&
                  item.kg === currentCalculatorBagUnit.kg
              );
              if (exact) {
                return (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-500">Availability:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-extrabold font-mono text-xs ${
                        exact.stock > 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      {exact.stock.toLocaleString()} bags
                    </span>
                    <span className="text-gray-400 font-mono text-[11px]">({exact.supplier})</span>
                  </div>
                );
              }
              const generic = bagStock.find(
                (item) =>
                  ['', 'ANY', 'NOT-DEFINED'].includes(item.brand.toUpperCase()) &&
                  item.pack === currentCalculatorBagUnit.pack &&
                  item.kg === currentCalculatorBagUnit.kg
              );
              if (generic) {
                return (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>No branded match. Generic pack ({generic.kg}kg) level:</span>
                    <span className="bg-gray-100 text-gray-800 border border-gray-300 px-2 py-0.5 rounded font-bold font-mono">
                      {generic.stock} bags
                    </span>
                  </div>
                );
              }
              return (
                <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-medium">
                  ⚠️ No packaging record matching size {currentCalculatorBagUnit.kg} KG. Add a stock row below to avoid warnings.
                </span>
              );
            })()}
          </div>
        )}

        {/* Form to add a stock record row */}
        <div className="bg-gray-50 p-3 border border-gray-200 rounded-lg space-y-3">
          <span className="text-xs font-extrabold text-gray-700 block">
            Add New Stock Item Row
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 items-end">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Brand Name
              </label>
              <input
                type="text"
                placeholder="e.g. PRAN, RETAJ"
                value={newStockBrand}
                onChange={(e) => setNewStockBrand(e.target.value)}
                className="w-full bg-white border border-gray-350 rounded px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Packaging Type
              </label>
              <select
                value={newStockPack}
                onChange={(e) => {
                  setNewStockPack(e.target.value);
                  const sizes = industryConfig.defaultSizes[e.target.value] || [];
                  if (sizes.length > 0) {
                    setNewStockKg(sizes[0].size.toString());
                  }
                }}
                className="w-full bg-white border border-gray-355 rounded px-2 py-1.5 text-xs font-semibold outline-none focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Bag Size (KG)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="20"
                value={newStockKg}
                onChange={(e) => setNewStockKg(e.target.value)}
                className="w-full bg-white border border-gray-350 rounded px-2 py-1.5 text-xs font-mono font-bold outline-none focus:border-blue-500 text-center"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Initial Stock (Bags)
              </label>
              <input
                type="number"
                step="1"
                placeholder="4000"
                value={newStockQty}
                onChange={(e) => setNewStockQty(e.target.value)}
                className="w-full bg-white border border-gray-350 rounded px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-blue-500 text-center"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Bag Manufacturer
              </label>
              <input
                type="text"
                placeholder="Calcutta Jute"
                value={newStockSupplier}
                onChange={(e) => setNewStockSupplier(e.target.value)}
                className="w-full bg-white border border-gray-350 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Lead Time (if 0 NA)
              </label>
              <input
                type="text"
                placeholder="7-10 days"
                value={newStockLead}
                onChange={(e) => setNewStockLead(e.target.value)}
                className="w-full bg-white border border-gray-350 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleAddStockRow}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs py-2 flex items-center justify-center gap-1 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Stock Row
              </button>
            </div>
          </div>
        </div>

        {/* Stock management rows */}
        <div className="table-wrap rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-150 uppercase tracking-widest font-extrabold text-[10px] text-gray-600 border-b border-gray-200">
                <th className="p-2.5">Brand</th>
                <th className="p-2.5">Bag Type</th>
                <th className="p-2.5 text-center">Size (KG)</th>
                <th className="p-2.5 text-center">Stock (Bags)</th>
                <th className="p-2.5">Supplier</th>
                <th className="p-2.5">Lead Time if NA</th>
                <th className="p-2.5">Notes</th>
                <th className="p-2.5 text-center" style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(() => {
                const filteredStock = bagStock.filter(item => categories.includes(item.pack));
                if (filteredStock.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-400 italic">
                        No active stock logs available for {industryConfig.name} packaging. Create a row above.
                      </td>
                    </tr>
                  );
                }
                return filteredStock.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/50 transition duration-150">
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.brand}
                        onChange={(e) => handleStockRowUpdate(item.id, 'brand', e.target.value.toUpperCase())}
                        className="w-full bg-transparent font-semibold text-gray-800 p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.pack}
                        onChange={(e) => handleStockRowUpdate(item.id, 'pack', e.target.value)}
                        className="w-full bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      >
                        {categories.map((pack) => (
                          <option key={pack} value={pack}>
                            {pack}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={item.kg}
                        onChange={(e) =>
                          handleStockRowUpdate(item.id, 'kg', parseFloat(e.target.value) || 0)
                        }
                        className="w-16 bg-transparent text-center font-mono font-bold p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        step="1"
                        value={item.stock}
                        onChange={(e) =>
                          handleStockRowUpdate(item.id, 'stock', parseInt(e.target.value) || 0)
                        }
                        className={`w-20 bg-transparent text-center font-mono font-extrabold p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none ${
                          item.stock > 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.supplier}
                        onChange={(e) => handleStockRowUpdate(item.id, 'supplier', e.target.value)}
                        className="w-full bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.leadTime}
                        onChange={(e) => handleStockRowUpdate(item.id, 'leadTime', e.target.value)}
                        className="w-full bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => handleStockRowUpdate(item.id, 'notes', e.target.value)}
                        className="w-full bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none text-gray-500"
                        placeholder="Add note..."
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDeleteStockRow(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded transition"
                        title="Delete packaging row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
