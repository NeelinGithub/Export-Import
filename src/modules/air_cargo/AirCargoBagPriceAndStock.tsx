import React, { useState, useEffect } from "react";
import { BagPrices, BagStockItem, BagSizePrice } from "../../types";
import {
  Trash2,
  Plus,
  RotateCcw,
  Save,
  Archive,
  ShoppingBag,
  Eye, } from "lucide-react";
import { INDUSTRY_PACKAGING } from "../../constants";

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
  licenceMetadata?: any;
}

export default function AirCargoBagPriceAndStock({
  bagPrices,
  setBagPrices,
  bagStock,
  setBagStock,
  onSavePrices,
  onResetPrices,
  onSaveStock,
  onResetStock,
  currentCalculatorBagUnit,
  industry = "air_cargo",
  licenceMetadata,
}: BagPriceAndStockProps) {
  const activeIndustry = industry;
  const industryConfig =
    INDUSTRY_PACKAGING[activeIndustry] || INDUSTRY_PACKAGING.grain;
  const categories = Array.from(new Set([...industryConfig.categories, ...Object.keys(bagPrices || {})])).filter(cat => !(bagPrices?.[cat]?.[0]?.id === "DELETED"));
  const defaultPack = categories[0] || "BOPP BAGS";
  const defaultKg =
    industryConfig.defaultSizes[defaultPack]?.[0]?.size?.toString() || "20";

  // Local state for dynamic forms for adding sizes
  const [newSizeKg, setNewSizeKg] = useState<{ [key: string]: string }>({});
  const [newSizePrice, setNewSizePrice] = useState<{ [key: string]: string }>(
    {},
  );

  // Dynamic state for adding a new stock item
  const [newStockBrand, setNewStockBrand] = useState("NOT-DEFINED");
  const [newStockPack, setNewStockPack] = useState(defaultPack);
  const [newStockKg, setNewStockKg] = useState(defaultKg);

  useEffect(() => {
    const config = INDUSTRY_PACKAGING[activeIndustry];
    if (config) {
      const firstCat = config.categories[0];
      setNewStockPack(firstCat);
      const firstSize =
        config.defaultSizes[firstCat]?.[0]?.size?.toString() || "20";
      setNewStockKg(firstSize);
    }
  }, [activeIndustry]);
  const [newStockQty, setNewStockQty] = useState("0");
  const [newStockSupplier, setNewStockSupplier] = useState("TBD Supplier");
  const [newStockLead, setNewStockLead] = useState("7-10 days");
  const [newStockNotes, setNewStockNotes] = useState("");

  // Handle adding a size to a bag category
      const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [selectedAiSuggestions, setSelectedAiSuggestions] = useState<number[]>([]);

  const applyAiSuggestions = () => {
    if (!aiSuggestions) return;
    const toAdd = aiSuggestions.filter((_, i) => selectedAiSuggestions.includes(i));
    setBagPrices((prev: any) => {
      const updated = { ...prev };
      toAdd.forEach((cat: any) => {
        if (cat.name && Array.isArray(cat.sizes)) {
          const sizesArray = cat.sizes.map((s: any, idx: number) => ({
            id: cat.name.replace(/\s+/g, "").toLowerCase() + Date.now() + idx,
            size: parseFloat(s.size) || 0,
            price: parseFloat(s.price) || 0,
          })).filter((b: any) => b.size > 0 && b.price >= 0);
          if (!updated[cat.name]) {
            updated[cat.name] = sizesArray;
          } else {
            updated[cat.name] = [...updated[cat.name], ...sizesArray].filter(
              (v: any, i: number, a: any) => a.findIndex((t: any) => (t.size === v.size)) === i
            ).sort((a: any, b: any) => b.size - a.size);
          }
        }
      });
      return updated;
    });
    setAiSuggestions(null);
  };

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showStandardPacksModal, setShowStandardPacksModal] = useState(false);
  const [selectedStandardPacks, setSelectedStandardPacks] = useState<string[]>([]);


  // Handle AI Packaging Suggestion
  const handleAISuggestPackaging = async () => {
    if (licenceMetadata && licenceMetadata.aiEnabled === false) {
      alert('AI Features are restricted for your workspace. Please contact Administrator to upgrade.');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "packaging_suggestions",
          payload: { industry: industryConfig.name },
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Parse JSON
      let resultText = data.result || "";
      const firstCurly = resultText.indexOf('{');
      const lastCurly = resultText.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1) {
        resultText = resultText.substring(firstCurly, lastCurly + 1);
      }
      
      const parsed = JSON.parse(resultText);
      if (parsed && Array.isArray(parsed.categories)) {
        setAiSuggestions(parsed.categories);
        setSelectedAiSuggestions(
          parsed.categories
            .map((cat: any, i: number) => (categories.includes(cat.name) ? -1 : i))
            .filter((i: number) => i !== -1)
        );
      }
    } catch (error) {
      console.error("AI Packaging Suggestion Error:", error);
      alert("Failed to generate AI packaging suggestions. Please try again later.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

      const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCustomCategory = () => {
    if (newCategoryName.trim()) {
      const catName = newCategoryName.trim().toUpperCase();
      setBagPrices((prev: any) => {
        if (prev[catName] && prev[catName][0]?.id !== "DELETED") return prev;
        return {
          ...prev,
          [catName]: []
        };
      });
      setNewCategoryName("");
      setShowCustomCategoryModal(false);
    }
  };

const handleDeleteCategory = (categoryToRemove: string) => {
    if (window.confirm(`Are you sure you want to delete the "${categoryToRemove}" packaging type?`)) {
      setBagPrices((prev: any) => {
        const updated = { ...prev };
        // Mark as deleted by using a special sentinal value
        updated[categoryToRemove] = [{ id: "DELETED", size: -1, price: -1 }];
        return updated;
      });
    }
  };

  const handleAddSize = (category: string) => {
    const sizeVal = parseFloat(newSizeKg[category] || "");
    const priceVal = parseFloat(newSizePrice[category] || "");

    if (isNaN(sizeVal) || sizeVal <= 0) {
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      return;
    }

    setBagPrices((prev) => {
      const currentList = prev[category] || [];
      // Avoid duplicate sizes
      if (currentList.some((b) => b.size === sizeVal)) {
        return prev;
      }
      const updatedItem: BagSizePrice = {
        id: category.replace(/\s+/g, "").toLowerCase() + Date.now(),
        size: sizeVal,
        price: priceVal,
      };

      const updatedList = [...currentList, updatedItem].sort(
        (a, b) => b.size - a.size,
      );
      return {
        ...prev,
        [category]: updatedList,
      };
    });

    // Clear local input states
    setNewSizeKg((prev) => ({ ...prev, [category]: "" }));
    setNewSizePrice((prev) => ({ ...prev, [category]: "" }));
  };

  // Delete a size from a category
  const handleDeleteSize = (category: string, id: string) => {
    setBagPrices((prev) => {
      const currentList = prev[category] || [];
      return {
        ...prev,
        [category]: currentList.filter((item) => item.id !== id),
      };
    });
  };

  // Edit inline price
  const handlePriceChange = (
    category: string,
    index: number,
    value: string,
  ) => {
    const freshVal = parseFloat(value) || 0;
    setBagPrices((prev) => {
      const currentList = [...(prev[category] || [])];
      if (currentList[index]) {
        currentList[index] = { ...currentList[index], price: freshVal };
      }
      return {
        ...prev,
        [category]: currentList,
      };
    });
  };

  // Add stock row
  const handleAddStockRow = () => {
    const kg = parseFloat(newStockKg) || 0;
    const qty = parseInt(newStockQty) || 0;
    if (kg <= 0) {
      // Just return if invalid to avoid blocking alerts
      return;
    }

    const newItem: BagStockItem = {
      id: "bs_" + Date.now(),
      brand: newStockBrand.trim().toUpperCase() || "NOT-DEFINED",
      pack: newStockPack,
      kg,
      stock: qty,
      supplier: newStockSupplier.trim(),
      leadTime: newStockLead.trim(),
      notes: newStockNotes.trim(),
    };

    setBagStock([newItem, ...bagStock]);

    // Reset fields
    setNewStockBrand("NOT-DEFINED");
    setNewStockQty("0");
    setNewStockNotes("");
  };

  // Delete stock row
  const handleDeleteStockRow = (id: string) => {
    setBagStock(bagStock.filter((item) => item.id !== id));
  };

  // Update inline stock details
  const handleStockRowUpdate = (
    id: string,
    field: keyof BagStockItem,
    value: any,
  ) => {
    setBagStock(
      bagStock.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    );
  };

  // Fill current calculator select into stock row creator helper
  const handleSeedFromCalculator = () => {
    if (currentCalculatorBagUnit) {
      setNewStockBrand(currentCalculatorBagUnit.brand || "NOT-DEFINED");
      setNewStockPack(currentCalculatorBagUnit.pack);
      setNewStockKg(String(currentCalculatorBagUnit.kg));
    }
  };

  return (
    <div className="space-y-6" id="bag-price-and-stock-page">
      <div className="page-header">
        <div className="breadcrumb">📦 Reference & Operations</div>
        <h2 className="text-xl font-extrabold tracking-tight">
          {industryConfig.title}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Add custom {industryConfig.packLabel.toLowerCase()}, live-edit pricing
          parameters, and keep the packaging inventory updated on a single page.
        </p>
      </div>

      {/* Grid of Shrunk Bag Reference Tables */}
      <div className="card bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-gradient-to-bl from-indigo-50/80 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">
                Bag Pricing Tables
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Values auto-populate target calculations in the rate builder.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 bg-white sm:bg-transparent p-1 sm:p-0 rounded-lg sm:rounded-none">
            <button
              onClick={() => setShowCustomCategoryModal(true)}
              className="px-3.5 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              Add Custom Pack
            </button>
            <button
              onClick={handleAISuggestPackaging}
              disabled={isGeneratingAI}
              className="px-3.5 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition"
            >
              {isGeneratingAI && <span className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />}
              Auto Suggest Packs
            </button>
            <button
              onClick={() => {
                setSelectedStandardPacks(categories);
                setShowStandardPacksModal(true);
              }}
              className="px-3.5 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
              Manage All Packs
            </button>
            <button
              onClick={onResetPrices}
              className="px-3.5 py-2 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Default
            </button>
            <button
              onClick={onSavePrices}
              className="px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> Save Prices
            </button>
          </div>
        </div>

        {/* Shrunk responsive grid layout (Aesthetic 4-column layout on huge, 2-col on mid, 1 on small) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {categories.map((category, idx) => {
            const list = bagPrices[category] || [];
            return (
              <div
                key={category + '-' + idx}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase border-b border-gray-200 pb-1.5 mb-2 flex justify-between items-center">
                    <span>{category}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-blue-600 lowercase font-medium">
                        {list.length} sizes
                      </span>
                      {true && (
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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
                          key={bag.id + '-' + idx}
                          className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-gray-100 group hover:border-blue-200 transition"
                        >
                          <span className="font-mono text-gray-700 font-bold">
                            {bag.size} KG
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-600 font-mono font-medium">
                              ₹{(bag.price / bag.size).toFixed(2)}/kg
                            </span>
                            <div className="flex items-center gap-1 bg-gray-50 rounded border border-gray-200 px-1">
                              <span className="text-[10px] text-gray-400">
                                ₹
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                value={bag.price === 0 ? "" : bag.price}
                                placeholder="0.00"
                                onChange={(e) =>
                                  handlePriceChange(
                                    category,
                                    idx,
                                    e.target.value,
                                  )
                                }
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
                        value={newSizeKg[category] || ""}
                        onChange={(e) =>
                          setNewSizeKg((prev) => ({
                            ...prev,
                            [category]: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-gray-300 rounded px-1.5 py-1 text-[11px] font-mono outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="number"
                        placeholder="Price ₹"
                        value={newSizePrice[category] || ""}
                        onChange={(e) =>
                          setNewSizePrice((prev) => ({
                            ...prev,
                            [category]: e.target.value,
                          }))
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
              Manage warehouse levels to monitor availability during quote
              generation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {currentCalculatorBagUnit && (
              <button
                onClick={handleSeedFromCalculator}
                className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 transition"
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
          <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-blue-800">
                Calculator Focus Model:{" "}
              </span>
              <span className="font-mono text-gray-700">
                {currentCalculatorBagUnit.brand} •{" "}
                {currentCalculatorBagUnit.pack} • {currentCalculatorBagUnit.kg}{" "}
                KG
              </span>
            </div>
            {(() => {
              const exact = bagStock.find(
                (item) =>
                  item.brand.toUpperCase() ===
                    currentCalculatorBagUnit.brand.toUpperCase() &&
                  item.pack === currentCalculatorBagUnit.pack &&
                  item.kg === currentCalculatorBagUnit.kg,
              );
              if (exact) {
                return (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-500">
                      Availability:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-extrabold font-mono text-xs ${
                        (exact.stock || 0) > 0
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {(exact.stock || 0).toLocaleString()}{" "}
                      {["tiles", "metal", "pharma", "oil"].includes(
                        activeIndustry,
                      )
                        ? "units"
                        : "bags"}
                    </span>
                    <span className="text-gray-400 font-mono text-[11px]">
                      ({exact.supplier})
                    </span>
                  </div>
                );
              }
              const generic = bagStock.find(
                (item) =>
                  ["", "ANY", "NOT-DEFINED"].includes(
                    item.brand.toUpperCase(),
                  ) &&
                  item.pack === currentCalculatorBagUnit.pack &&
                  item.kg === currentCalculatorBagUnit.kg,
              );
              if (generic) {
                return (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>
                      No branded match. Generic pack ({generic.kg}kg) level:
                    </span>
                    <span className="bg-gray-100 text-gray-800 border border-gray-300 px-2 py-0.5 rounded font-bold font-mono">
                      {generic.stock}{" "}
                      {["tiles", "metal", "pharma", "oil"].includes(
                        activeIndustry,
                      )
                        ? "units"
                        : "bags"}
                    </span>
                  </div>
                );
              }
              return (
                <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-medium">
                  ⚠️ No packaging record matching size{" "}
                  {currentCalculatorBagUnit.kg} KG. Add a stock row below to
                  avoid warnings.
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
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-blue-500"
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
                  const sizes =
                    industryConfig.defaultSizes[e.target.value] || [];
                  if ((sizes || []).length > 0) {
                    setNewStockKg(sizes[0].size.toString());
                  }
                }}
                className="w-full bg-white border border-gray-400 rounded px-2 py-1.5 text-xs font-semibold outline-none focus:border-blue-500"
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
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs font-mono font-bold outline-none focus:border-blue-500 text-center"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Initial Stock (
                {["tiles", "metal", "pharma", "oil"].includes(activeIndustry)
                  ? "Units"
                  : "Bags"}
                )
              </label>
              <input
                type="number"
                step="1"
                placeholder="4000"
                value={newStockQty}
                onChange={(e) => setNewStockQty(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-blue-500 text-center"
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
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
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
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
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
              <tr className="bg-gray-100 uppercase tracking-widest font-extrabold text-[10px] text-gray-600 border-b border-gray-200">
                <th className="p-2.5">Brand</th>
                <th className="p-2.5">{industryConfig.packLabel}</th>
                <th className="p-2.5 text-center">Size (KG)</th>
                <th className="p-2.5 text-center">
                  Stock (
                  {["tiles", "metal", "pharma", "oil"].includes(activeIndustry)
                    ? "Units"
                    : "Bags"}
                  )
                </th>
                <th className="p-2.5">Supplier</th>
                <th className="p-2.5">Lead Time if NA</th>
                <th className="p-2.5">Notes</th>
                <th
                  className="p-2.5 text-center"
                  style={{ width: "40px" }}
                ></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(() => {
                const filteredStock = bagStock.filter((item) =>
                  categories.includes(item.pack),
                );
                if (filteredStock.length === 0) {
                  return (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-gray-400 italic"
                      >
                        No active stock logs available for {industryConfig.name}{" "}
                        packaging. Create a row above.
                      </td>
                    </tr>
                  );
                }
                return filteredStock.map((item, idx) => (
                  <tr
                    key={item.id + '-' + idx}
                    className="hover:bg-blue-50/50 transition duration-150"
                  >
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.brand}
                        onChange={(e) =>
                          handleStockRowUpdate(
                            item.id,
                            "brand",
                            e.target.value.toUpperCase(),
                          )
                        }
                        className="w-full bg-transparent font-semibold text-gray-800 p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.pack}
                        onChange={(e) =>
                          handleStockRowUpdate(item.id, "pack", e.target.value)
                        }
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
                          handleStockRowUpdate(
                            item.id,
                            "kg",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-16 bg-transparent text-center font-mono font-bold p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2 text-center align-top relative group">
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          step="1"
                          value={item.stock}
                          onChange={(e) =>
                            handleStockRowUpdate(
                              item.id,
                              "stock",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className={`w-20 bg-transparent text-center font-mono font-extrabold p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none ${
                            item.stock > 0 ? "text-emerald-700" : "text-red-700"
                          }`}
                        />
                        {item.piDeductions &&
                          Object.keys(item.piDeductions).length > 0 && (
                            <div className="text-[9px] text-sky-600 font-bold bg-sky-50 mt-1 px-1 rounded cursor-pointer relative">
                              -{" "}
                              {Object.values(item.piDeductions).reduce(
                                (a, b) => a + b,
                                0,
                              )}{" "}
                              linked
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-slate-800 text-white p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-left">
                                <div className="mb-1 border-b border-slate-700 pb-1 text-slate-300">
                                  Allocated to PI:
                                </div>
                                {Object.entries(item.piDeductions).map(
                                  ([piId, qty]) => (
                                    <div
                                      key={piId}
                                      className="flex justify-between py-0.5"
                                    >
                                      <span className="truncate">
                                        {piId.replace("quote_", "REF-")}
                                      </span>
                                      <span className="font-mono text-sky-400">
                                        {qty}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.supplier}
                        onChange={(e) =>
                          handleStockRowUpdate(
                            item.id,
                            "supplier",
                            e.target.value,
                          )
                        }
                        className="w-full bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.leadTime}
                        onChange={(e) =>
                          handleStockRowUpdate(
                            item.id,
                            "leadTime",
                            e.target.value,
                          )
                        }
                        className="w-full bg-transparent p-1 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) =>
                          handleStockRowUpdate(item.id, "notes", e.target.value)
                        }
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

      

            {showStandardPacksModal && (() => {
        const allKnownPacks = Array.from(new Set([...industryConfig.categories, ...Object.keys(bagPrices || {})]));
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-black text-slate-800 mb-2">Configure All Packing Categories</h3>
            <p className="text-xs text-slate-500 mb-4">View and toggle all industry-standard, AI-suggested, and custom packs you have added.</p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto mb-6 pr-2">
              {allKnownPacks.map((catName) => {
                const isSelected = selectedStandardPacks.includes(catName);
                const isCustom = !industryConfig.categories.includes(catName);
                const sizes = industryConfig.defaultSizes?.[catName] || bagPrices?.[catName] || [];
                return (
                  <label key={catName} className={`flex items-start gap-3 p-3 border ${isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white opacity-70'} rounded-lg cursor-pointer transition`}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedStandardPacks(p => [...p, catName]);
                        else setSelectedStandardPacks(p => p.filter(c => c !== catName));
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                         <h4 className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{catName}</h4>
                         {isCustom && <span className="text-[10px] font-black tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">CUSTOM</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-[90%]">
                        Sizes: {(sizes || []).length > 0 ? (Array.isArray(sizes) ? (sizes || []).filter((s:any)=> s.size !== -1).map((s: any) => `${s.size}kg`).join(', ') : 'Custom config') : 'Empty'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button 
                onClick={() => setShowStandardPacksModal(false)} 
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg text-xs tracking-wide"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setBagPrices((prev: any) => {
                    const updated = { ...prev };
                    allKnownPacks.forEach(catName => {
                      if (selectedStandardPacks.includes(catName)) {
                        if (!updated[catName] || updated[catName][0]?.id === 'DELETED') {
                           if (updated[catName] && updated[catName].length > 1) {
                             // restore it
                             updated[catName] = updated[catName].filter((x:any) => x.id !== 'DELETED');
                           } else {
                             const defaultArr = industryConfig.defaultSizes?.[catName] || [{size: 50, price: 1.0}];
                             updated[catName] = defaultArr.map((s:any, idx:number) => ({...s, id: catName.replace(/\s+/g, "").toLowerCase() + Date.now() + idx}));
                           }
                        }
                      } else {
                        // Mark as deleted but preserve history
                        updated[catName] = [{ id: "DELETED", size: -1, price: -1 }];
                      }
                    });
                    return updated;
                  });
                  setShowStandardPacksModal(false);
                }}
                className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-black tracking-wide rounded-lg text-xs"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {aiSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-black text-slate-800 mb-2">Select Packing Types to Add</h3>
            <p className="text-xs text-slate-500 mb-4">The AI has evaluated the industry and suggests the following packing configurations:</p>
            
            <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
              {aiSuggestions.map((cat, idx) => { const uniqueKey = cat.name + '-' + idx;  
                const isExisting = categories.includes(cat.name);
                return (
                  <div key={uniqueKey} className={`flex items-start gap-3 p-3 border ${isExisting ? 'border-slate-100 bg-slate-50' : 'border-slate-200'} rounded-lg`}>
                    <input 
                      type="checkbox" 
                      checked={selectedAiSuggestions.includes(idx) && !isExisting}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedAiSuggestions(p => [...p, idx]);
                        else setSelectedAiSuggestions(p => p.filter(i => i !== idx));
                      }}
                      className="mt-1"
                      disabled={isExisting}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold text-sm ${isExisting ? 'text-slate-500' : 'text-slate-800'}`}>{cat.name}</h4>
                        {isExisting && <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Already Added</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Formats: {Array.isArray(cat.sizes) ? cat.sizes.map((s: any) => `${s.size}kg (@${s.price})`).join(', ') : 'None'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setAiSuggestions(null)} 
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={applyAiSuggestions}
                disabled={selectedAiSuggestions.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg text-sm disabled:opacity-50"
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      )}
    \n
      {showCustomCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-slate-800 mb-2">Add Custom Pack</h3>
            <p className="text-xs text-slate-500 mb-4">Enter a name for your custom packaging type.</p>
            
            <input 
                type="text" 
                value={newCategoryName} 
                onChange={(e: any) => setNewCategoryName(e.target.value)} 
                placeholder="e.g., PLASTIC CRATES" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-indigo-500"
                autoFocus
            />

            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowCustomCategoryModal(false)} 
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCustomCategory}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg text-sm disabled:opacity-50"
              >
                Add Pack Type
              </button>
            </div>
          </div>
        </div>
      )}\n</div>
  );
}
