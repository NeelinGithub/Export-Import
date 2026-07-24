import React, { useState, useEffect, useRef } from "react";
import { Share2, Download, Plus, Trash2, CheckCircle2, Image as ImageIcon, Copy, RefreshCw, Maximize2, Minimize2, Edit, Layout, Columns, FileSpreadsheet } from "lucide-react";
import { Commodity } from "../types";
import { toPng, toBlob } from "html-to-image";

interface DailyRate {
  id: string;
  name: string; // Used as generic name or variety name
  type?: string;    
  cropYear?: string; 
  length?: string;  
  priceInr?: number; // Total INR (Ex Mill + CFS)
  exMillInr?: number; 
  cfsInr?: number;
  fobPrice: number;
  customValues?: Record<string, string>;
}

interface DestinationFreight {
  id: string;
  region: string;
  port: string;
  freightAmount: number;
}

interface SocialRateBoardProps {
  commodities: Commodity[];
  licenceMetadata?: any;
  industry?: string;
}

export default function SocialRateBoard({ commodities, licenceMetadata, industry = "grain" }: SocialRateBoardProps) {
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split("T")[0]);
  const [exchangeRate, setExchangeRate] = useState(() => {
    try {
      const savedStr = sessionStorage.getItem("rems_calc_state_active_v2");
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (saved.exrate) return parseFloat(saved.exrate);
      }
    } catch (e) {
      console.error(e);
    }
    return 83.50;
  });
  const [rates, setRates] = useState<DailyRate[]>([]);
  const [destinations, setDestinations] = useState<DestinationFreight[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [isEditorMinimized, setIsEditorMinimized] = useState(true);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(() => {
    try {
      const savedStr = localStorage.getItem("rems_social_board_state");
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (saved.orientation) return saved.orientation;
      }
    } catch (e) {
      console.error(e);
    }
    return "portrait";
  });
  const [customColumns, setCustomColumns] = useState<{ id: string; name: string }[]>(() => {
    try {
      const savedStr = localStorage.getItem("rems_social_board_state");
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (saved.customColumns) return saved.customColumns;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const boardRef = useRef<HTMLDivElement>(null);

  // Initialize with some default / mock data
  useEffect(() => {
    if (industry === "metal") {
      setRates([
        { id: "1", name: "HMS 1/2 (80:20)", fobPrice: 380 },
        { id: "2", name: "Shredded Steel 211", fobPrice: 410 },
      ]);
      setDestinations([
        { id: "1", region: "Asia", port: "Nhava Sheva", freightAmount: 1200 },
      ]);
    } else if (industry === "sugar") {
      setRates([
        { id: "1", name: "ICUMSA 45", fobPrice: 580 },
        { id: "2", name: "VHP Raw Sugar", fobPrice: 520 },
      ]);
      setDestinations([
        { id: "1", region: "Africa", port: "Mombasa", freightAmount: 1100 },
      ]);
    } else if (industry === "spice") {
      setRates([
        { id: "1", name: "Black Pepper 500 GL", fobPrice: 4500 },
      ]);
      setDestinations([
        { id: "1", region: "Europe", port: "Rotterdam", freightAmount: 1500 },
      ]);
    } else if (industry === "produce") {
      setRates([
        { id: "1", name: "Fresh Cavendish Bananas", fobPrice: 400 },
      ]);
      setDestinations([
        { id: "1", region: "Middle East", port: "Jebel Ali", freightAmount: 2800 },
      ]);
    } else { // default to grain / rice
      setRates([
        { id: "1", name: "BASMATI", type: "RAW", cropYear: "2024-25", length: "7.30 MM", exMillInr: 108000, cfsInr: 6000, priceInr: 114000, fobPrice: 1365 },
        { id: "2", name: "1121", type: "STEAM", cropYear: "2025-26", length: "8.35 MM", exMillInr: 96000, cfsInr: 5000, priceInr: 101000, fobPrice: 1210 },
        { id: "3", name: "1509", type: "WHITE", cropYear: "2025-26", length: "8.40 MM", exMillInr: 81000, cfsInr: 5000, priceInr: 86000, fobPrice: 1030 },
        { id: "4", name: "SUGANDHA", type: "GOLDEN", cropYear: "2025-26", length: "7.75 MM", exMillInr: 72000, cfsInr: 5000, priceInr: 77000, fobPrice: 922 },
        { id: "5", name: "PR-14", type: "STEAM", cropYear: "2025-26", length: "6.80 MM", exMillInr: 41000, cfsInr: 5000, priceInr: 46000, fobPrice: 551 },
      ]);
      setDestinations([
        { id: "1", region: "Middle East", port: "Jebel Ali", freightAmount: 600 },
        { id: "2", region: "Europe", port: "Felixstowe", freightAmount: 1200 },
      ]);
    }
  }, [industry]);

  useEffect(() => {
    try {
      const savedStr = localStorage.getItem("rems_social_board_state");
      const saved = savedStr ? JSON.parse(savedStr) : {};
      saved.orientation = orientation;
      saved.customColumns = customColumns;
      localStorage.setItem("rems_social_board_state", JSON.stringify(saved));
    } catch (e) {
      console.error("Failed to save social board state", e);
    }
  }, [orientation, customColumns]);

  useEffect(() => {
    try {
      const savedStr = sessionStorage.getItem("rems_calc_state_active_v2");
      const saved = savedStr ? JSON.parse(savedStr) : {};
      saved.exrate = String(exchangeRate);
      sessionStorage.setItem("rems_calc_state_active_v2", JSON.stringify(saved));
    } catch (e) {
      console.error(e);
    }
    
    setRates(prev => prev.map(r => {
      const exMill = r.exMillInr || 0;
      const cfs = r.cfsInr || 0;
      if (exMill > 0 || cfs > 0) {
        return {
           ...r,
           fobPrice: Math.round((exMill + cfs) / exchangeRate)
        };
      }
      return r;
    }));
  }, [exchangeRate]);

  const addRate = () => {
    setRates([...rates, { 
      id: Date.now().toString(), 
      name: `New ${industry === 'metal' ? 'Metal' : industry === 'sugar' ? 'Sugar' : industry === 'spice' ? 'Spice' : 'Variety'}`, 
      type: "RAW",
      cropYear: "2025-26",
      length: "0.00 MM",
      exMillInr: 0,
      cfsInr: 0,
      priceInr: 0,
      fobPrice: 0 
    }]);
  };

  const removeRate = (id: string) => {
    setRates(rates.filter((r) => r.id !== id));
  };

  const updateRate = (id: string, field: keyof DailyRate, value: any) => {
    setRates(rates.map((r) => {
      if (r.id === id) {
         const newRate = { ...r, [field]: value };
         if (field === 'exMillInr' || field === 'cfsInr') {
           const total = (newRate.exMillInr || 0) + (newRate.cfsInr || 0);
           newRate.priceInr = total;
           newRate.fobPrice = Math.round(total / exchangeRate);
         }
         return newRate;
      }
      return r;
    }));
  };

  const addDestination = () => {
    setDestinations([...destinations, { id: Date.now().toString(), region: "Region", port: "Port Name", freightAmount: 0 }]);
  };

  const removeDestination = (id: string) => {
    setDestinations(destinations.filter((d) => d.id !== id));
  };

  const updateDestination = (id: string, field: keyof DestinationFreight, value: any) => {
    setDestinations(destinations.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const handleDownloadImage = async () => {
    if (!boardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(boardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `RateBoard-${publishDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!boardRef.current) return;
    setCopying(true);
    try {
      const blob = await toBlob(boardRef.current, { cacheBust: true, pixelRatio: 2 });
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        alert("Image copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to copy image", err);
      alert("Failed to copy image to clipboard.");
    } finally {
      setCopying(false);
    }
  };

  const isGrain = industry === "grain";

  return (
    <div className="space-y-6 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="page-header">
        <div className="breadcrumb">📢 Marketing & Social</div>
        <h2 className="text-xl font-extrabold tracking-tight">Formal Rate List Board</h2>
        <p className="text-sm text-gray-500 mt-1">
          Generate formal letterhead price lists for {industry}. Ready to be shared on LinkedIn, WhatsApp, or Email.
        </p>
      </div>

      <div className={`grid grid-cols-1 ${isEditorMinimized ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-6`}>
        {/* Editor Side */}
        {!isEditorMinimized && (
          <div className="lg:col-span-4 space-y-6">
          <div className="card bg-white p-5 border border-gray-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Publish Date</h3>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-sm font-semibold rounded p-1.5 outline-none"
              />
            </div>

            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Orientation</h3>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setOrientation("portrait")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${orientation === "portrait" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Portrait
                </button>
                <button
                  onClick={() => setOrientation("landscape")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${orientation === "landscape" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Landscape
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">USD to INR Rate</h3>
              <div className="relative w-24">
                <span className="absolute left-2 top-1.5 text-xs text-gray-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 83.5)}
                  className="w-full pl-5 pr-2 py-1.5 bg-gray-50 border border-gray-200 text-sm font-semibold rounded outline-none"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-sm text-gray-800">Custom Columns</h4>
                  <button onClick={() => setCustomColumns([...customColumns, { id: Date.now().toString(), name: "New Column" }])} className="text-xs flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800">
                    <Columns className="w-3.5 h-3.5" /> Add Column
                  </button>
                </div>
                {customColumns.length > 0 && (
                  <div className="space-y-2 mb-4 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                    {customColumns.map(col => (
                      <div key={col.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => setCustomColumns(customColumns.map(c => c.id === col.id ? { ...c, name: e.target.value } : c))}
                          placeholder="Column Name"
                          className="flex-1 bg-white border border-gray-300 rounded p-1.5 text-xs font-semibold"
                        />
                        <button onClick={() => setCustomColumns(customColumns.filter(c => c.id !== col.id))} className="p-1.5 text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-sm text-gray-800">1. Rate List</h4>
                  <button onClick={addRate} className="text-xs flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800">
                    <Plus className="w-3.5 h-3.5" /> Add Rate
                  </button>
                </div>
                <div className="space-y-3">
                  {rates.map((rate) => (
                    <div key={rate.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rate.name}
                          onChange={(e) => updateRate(rate.id, "name", e.target.value)}
                          placeholder={isGrain ? "Variety Name" : "Commodity"}
                          className="flex-1 bg-white border border-gray-300 rounded p-1.5 text-xs font-semibold"
                        />
                        <button onClick={() => removeRate(rate.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {isGrain && (
                        <div className="grid grid-cols-3 gap-2">
                          <input type="text" value={rate.type || ""} onChange={(e) => updateRate(rate.id, "type", e.target.value)} placeholder="Type" className="w-full bg-white border border-gray-300 rounded p-1.5 text-[10px] font-semibold" />
                          <input type="text" value={rate.cropYear || ""} onChange={(e) => updateRate(rate.id, "cropYear", e.target.value)} placeholder="Crop Year" className="w-full bg-white border border-gray-300 rounded p-1.5 text-[10px] font-semibold" />
                          <input type="text" value={rate.length || ""} onChange={(e) => updateRate(rate.id, "length", e.target.value)} placeholder="Length" className="w-full bg-white border border-gray-300 rounded p-1.5 text-[10px] font-semibold" />
                        </div>
                      )}
                      
                      {isGrain ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="relative">
                              <span className="absolute left-2 top-1 text-[10px] text-gray-500 font-bold">₹</span>
                              <input
                                type="number"
                                value={rate.exMillInr || 0}
                                onChange={(e) => updateRate(rate.id, "exMillInr", parseFloat(e.target.value) || 0)}
                                placeholder="Ex-Mill"
                                className="w-full pl-5 pr-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold font-mono"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2 top-1 text-[10px] text-gray-500 font-bold">₹</span>
                              <input
                                type="number"
                                value={rate.cfsInr || 0}
                                onChange={(e) => updateRate(rate.id, "cfsInr", parseFloat(e.target.value) || 0)}
                                placeholder="CFS & Transp."
                                className="w-full pl-5 pr-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold font-mono"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="relative">
                              <span className="absolute left-2 top-1 text-[10px] text-gray-400 font-bold">₹</span>
                              <input
                                type="number"
                                value={rate.priceInr || 0}
                                readOnly
                                title="Total INR (Auto-calculated)"
                                className="w-full pl-5 pr-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-bold font-mono text-gray-500 cursor-not-allowed"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2 top-1 text-[10px] text-blue-600 font-bold">$</span>
                              <input
                                type="number"
                                value={rate.fobPrice}
                                onChange={(e) => updateRate(rate.id, "fobPrice", parseFloat(e.target.value) || 0)}
                                placeholder="FOB"
                                title="FOB USD (Auto-calculated but editable)"
                                className="w-full pl-5 pr-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs font-bold font-mono text-blue-800"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-[10px] text-blue-600 font-bold">$</span>
                          <input
                            type="number"
                            value={rate.fobPrice}
                            onChange={(e) => updateRate(rate.id, "fobPrice", parseFloat(e.target.value) || 0)}
                            placeholder="FOB"
                            className="w-full pl-5 pr-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs font-bold font-mono text-blue-800"
                          />
                        </div>
                      )}

                      {customColumns.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200">
                          {customColumns.map(col => (
                            <input
                              key={col.id}
                              type="text"
                              value={rate.customValues?.[col.id] || ""}
                              onChange={(e) => updateRate(rate.id, "customValues", { ...(rate.customValues || {}), [col.id]: e.target.value })}
                              placeholder={col.name}
                              className="w-full bg-white border border-gray-300 rounded p-1.5 text-[10px] font-semibold"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {rates.length === 0 && <p className="text-xs text-gray-400 italic">No rates added.</p>}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-extrabold text-sm text-gray-800">2. Destination & Freight (Optional CIF)</h4>
                  <button onClick={addDestination} className="text-xs flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800">
                    <Plus className="w-3.5 h-3.5" /> Add CIF Port
                  </button>
                </div>
                <div className="space-y-2">
                  {destinations.map((dest) => (
                    <div key={dest.id} className="flex flex-col gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={dest.port}
                          onChange={(e) => updateDestination(dest.id, "port", e.target.value)}
                          placeholder="Port Name"
                          className="flex-1 bg-white border border-gray-300 rounded p-1.5 text-xs font-semibold"
                        />
                         <button onClick={() => removeDestination(dest.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="relative w-full">
                        <span className="absolute left-2 top-1.5 text-xs text-gray-500 font-bold">$</span>
                        <input
                          type="number"
                          value={dest.freightAmount}
                          onChange={(e) => updateDestination(dest.id, "freightAmount", parseFloat(e.target.value) || 0)}
                          placeholder="FCL Freight Amount"
                          className="w-full pl-5 pr-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Preview Side */}
        <div className={`${isEditorMinimized ? 'lg:col-span-1' : 'lg:col-span-8'} flex flex-col h-full space-y-4 w-full`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <ImageIcon className="w-4 h-4 text-blue-500" /> Letterhead Preview
              </h3>
              <button 
                onClick={() => setIsEditorMinimized(!isEditorMinimized)}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${isEditorMinimized ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                title={isEditorMinimized ? "Edit Rates" : "Maximize Preview"}
              >
                {isEditorMinimized ? <><Edit className="w-3.5 h-3.5" /> Edit Rates</> : <><Maximize2 className="w-3.5 h-3.5" /> Full Width</>}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyImage}
                disabled={copying}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  copying ? "bg-gray-100 text-gray-400" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                }`}
              >
                {copying ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Copying...</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Image</>
                )}
              </button>
              <button
                onClick={() => {
                  const headers = ["Commodity", "Type/Variety", "Crop Year", "Length", "FOB Price", ...destinations.map(d => d.port)];
                  const rows = rates.map(rate => {
                    const rowData = [
                      `"${rate.name.replace(/"/g, '""')}"`,
                      `"${rate.type?.replace(/"/g, '""') || ''}"`,
                      `"${rate.cropYear?.replace(/"/g, '""') || ''}"`,
                      `"${rate.length?.replace(/"/g, '""') || ''}"`,
                      rate.fobPrice
                    ];
                    destinations.forEach(dest => {
                      const perMtFreight = parseFloat((dest.freightAmount / 26).toFixed(2));
                      rowData.push(rate.fobPrice + perMtFreight);
                    });
                    return rowData.join(",");
                  });
                  
                  const csvContent = [headers.join(","), ...rows].join("\n");
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement("a");
                  if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", `RateBoard_Export_${publishDate}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export CSV
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={downloading}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  downloading ? "bg-gray-100 text-gray-400" : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                }`}
              >
                {downloading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4" /> Download</>
                )}
              </button>
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-xl overflow-auto border border-gray-200 shadow-inner w-full flex items-start justify-center">
            {/* The Actual Rendered Board (A4 Proportion) */}
            <div
              ref={boardRef}
              className="bg-white mx-auto shadow-xl overflow-hidden relative"
              style={{
                width: orientation === "portrait" ? "1050px" : "1400px",
                minHeight: orientation === "portrait" ? "1350px" : "990px",
                maxWidth: "100%", // Don't overflow small screens
                background: "#ffffff",
                fontFamily: "Arial, sans-serif"
              }}
            >
              <div className="p-10 border-[3px] border-gray-200 m-4 h-[calc(100%-32px)] relative flex flex-col">
                {/* Header Letterhead */}
                <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-green-700">
                  <div className="w-40 flex flex-col items-center">
                    {licenceMetadata?.logoBase64 ? (
                      <img src={licenceMetadata.logoBase64} alt="Logo" className="w-32 h-auto object-contain" />
                    ) : (
                      <div className="w-32 h-32 bg-green-50 rounded-full border-4 border-green-600 flex items-center justify-center">
                        <span className="font-bold text-3xl text-green-700 text-center uppercase">{industry}</span>
                      </div>
                    )}
                    <p className="text-[10px] font-bold text-gray-600 mt-2 italic text-center uppercase">Established 2012</p>
                  </div>
                  
                  <div className="flex-1 pl-8 text-right">
                    <h1 className="text-2xl font-black text-green-700 uppercase tracking-wide mb-1">
                      {licenceMetadata?.logoText || licenceMetadata?.name || `${industry.toUpperCase()} EXPORT PVT. LTD.`}
                    </h1>
                    <p className="text-xs font-bold text-gray-800 mb-2 uppercase">
                      A Premier {industry.charAt(0).toUpperCase() + industry.slice(1)} Inspection and International Brokerage Company
                    </p>
                    <div className="text-[10px] text-gray-800 space-y-0.5 font-medium">
                      <p><span className="font-bold text-gray-900">Address:</span> Export House, Trade Center, Central Business District</p>
                      <p><span className="font-bold text-gray-900">Website:</span> www.exportportal.com</p>
                      <p><span className="font-bold text-gray-900">Email:</span> export@{(licenceMetadata?.logoText || licenceMetadata?.name || 'company').toLowerCase().replace(/\s/g, '')}.com</p>
                      <p><span className="font-bold text-gray-900">Contact:</span> +1 800 555 0199, +1 800 555 0198</p>
                    </div>
                  </div>
                </div>

                {/* Table Header Info */}
                <div className="grid grid-cols-2 border-2 border-black mb-4">
                  <div className="p-2 border-r-2 border-black font-bold text-center uppercase">
                    Variety of {industry}
                  </div>
                  <div className="p-2 font-bold text-center uppercase">
                    Date: {new Date(publishDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Rate Table */}
                <table className="w-full border-collapse border-2 border-black text-[10px] text-center mb-8">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="border-r border-black p-2 font-bold uppercase">S.No.</th>
                      <th className="border-r border-black p-2 font-bold uppercase">Name of Variety</th>
                      {isGrain && (
                        <>
                          <th className="border-r border-black p-2 font-bold uppercase">Type</th>
                          <th className="border-r border-black p-2 font-bold uppercase">Crop Year</th>
                          <th className="border-r border-black p-2 font-bold uppercase">Avg.<br/>Length</th>
                          <th className="border-r border-black p-2 font-bold uppercase text-red-800">Price in INR<br/>(PMT)<br/>X Mill Loose</th>
                        </>
                      )}
                      <th className="border-r border-black p-2 font-bold uppercase text-blue-900">Price in USD<br/>(PMT)<br/>FOB</th>
                      {customColumns.map(col => (
                        <th key={col.id} className="border-r border-black p-2 font-bold uppercase">{col.name}</th>
                      ))}
                      {destinations.map(dest => (
                         <th key={dest.id} className="border-r border-black p-2 font-bold uppercase text-green-900 bg-green-50">
                           CIF<br/>{dest.port}<br/>(+${Math.round(dest.freightAmount/26)})
                         </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate, idx) => (
                      <tr key={rate.id} className="border-b border-black">
                        <td className="border-r border-black p-1.5 font-bold">{idx + 1}.</td>
                        <td className="border-r border-black p-1.5 font-bold uppercase">{rate.name}</td>
                        {isGrain && (
                          <>
                            <td className="border-r border-black p-1.5 font-bold uppercase">{rate.type}</td>
                            <td className="border-r border-black p-1.5 font-bold uppercase">{rate.cropYear}</td>
                            <td className="border-r border-black p-1.5 font-bold uppercase">{rate.length}</td>
                            <td className="border-r border-black p-1.5 font-bold text-red-800">{rate.exMillInr ? rate.exMillInr.toLocaleString('en-IN') : '-'}</td>
                          </>
                        )}
                        <td className="border-r border-black p-1.5 font-bold text-blue-900 text-sm">{rate.fobPrice}</td>
                        {customColumns.map(col => (
                          <td key={col.id} className="border-r border-black p-1.5 font-bold uppercase">{rate.customValues?.[col.id] || '-'}</td>
                        ))}
                        {destinations.map(dest => {
                          const perMtFreight = Math.round(dest.freightAmount / 26);
                          return (
                            <td key={dest.id} className="border-r border-black p-1.5 font-bold text-green-900 bg-green-50/50 text-sm">
                              {rate.fobPrice + perMtFreight}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer Info */}
                <div className="mt-auto space-y-4">
                  <p className="text-xs font-bold text-gray-900">
                    <span className="underline">Note:</span> Our prices are subject to current market trends. Therefore, we kindly request you to reconfirm our latest price list before placing any booking or sending an inquiry.
                  </p>
                  
                  <div className="flex justify-between items-end mt-8">
                    <div className="text-xs text-gray-800 space-y-1">
                      <p>All prices are quoted for standard export packaging.</p>
                      <p>After receiving your inquiry, we will provide the exact CIF price accordingly.</p>
                      <p className="font-bold mt-2">With Best Regards,</p>
                      <p className="font-bold text-sm">Sales Director</p>
                      <p className="italic">(Business Executive Manager)</p>
                    </div>

                    <div className="w-32 h-32 flex flex-col items-center justify-center text-center opacity-60 mix-blend-multiply mr-12 rotate-[-15deg]">
                       <div className="w-24 h-24 rounded-full border-4 border-blue-900 flex items-center justify-center text-blue-900">
                         <div className="text-center font-bold text-[10px] leading-tight">
                           <p>{licenceMetadata?.logoText || licenceMetadata?.name || 'EXPORT CO.'}</p>
                           <p className="border-y border-blue-900 my-1 py-1">VERIFIED</p>
                           <p>INDIA</p>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-center font-bold text-green-800 pt-4 mt-4 border-t-2 border-green-700 uppercase tracking-wide">
                    {licenceMetadata?.logoText || licenceMetadata?.name || 'Export Trading'} • Trade Certified • www.export-market.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
