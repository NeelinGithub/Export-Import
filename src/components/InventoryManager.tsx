import React, { useState, useEffect } from 'react';
import { 
  GrainInventoryItem, InventoryOrder, Commodity, SavedQuote, BagStockItem 
} from '../types';
import { 
  Layers, Package, Sliders, Clock, Truck, Plus, Trash2, CheckCircle, 
  AlertTriangle, RotateCcw, Save, Calendar, Eye, Activity, Filter, RefreshCw
} from 'lucide-react';

interface InventoryManagerProps {
  commodities: Commodity[];
  grainInventory: GrainInventoryItem[];
  setGrainInventory: (inv: GrainInventoryItem[]) => void;
  inventoryOrders: InventoryOrder[];
  setInventoryOrders: (orders: InventoryOrder[]) => void;
  savedQuotes: SavedQuote[];
  onSaveInventory: () => void;
  onResetInventory: () => void;
  showToast: (message: string, type?: 'success' | 'warn' | 'error') => void;
}

// Helper utilities for grain variety milling process types and lead recommendations
function getProcessTypeFromName(name: string): 'steam' | 'parboiled' | 'sella_basmati' | 'golden_sella' | 'creamy_sella' | 'other' {
  const norm = name.trim().toLowerCase();
  if (norm.includes('basmati') && norm.includes('sella')) return 'sella_basmati';
  if (norm.includes('golden sella') || norm.includes('golden_sella')) return 'golden_sella';
  if (norm.includes('creamy sella') || norm.includes('creamy_sella')) return 'creamy_sella';
  if (norm.includes('steam')) return 'steam';
  if (norm.includes('parboiled') || norm.includes('parboil')) return 'parboiled';
  if (norm.includes('sella')) return 'sella_basmati';
  return 'other';
}

function getRecommendedMillingDays(processType: string): number {
  switch (processType) {
    case 'steam': return 3;
    case 'parboiled': return 5;
    case 'sella_basmati': return 8;
    case 'golden_sella': return 7;
    case 'creamy_sella': return 7;
    default: return 3;
  }
}

function getProcessTypeName(type: string): string {
  switch (type) {
    case 'steam': return 'Steam Rice';
    case 'parboiled': return 'Parboiled Rice';
    case 'sella_basmati': return 'Sella Basmati';
    case 'golden_sella': return 'Golden Sella';
    case 'creamy_sella': return 'Creamy Sella';
    default: return 'Standard Process';
  }
}

export default function InventoryManager({
  commodities,
  grainInventory,
  setGrainInventory,
  inventoryOrders,
  setInventoryOrders,
  savedQuotes,
  onSaveInventory,
  onResetInventory,
  showToast
}: InventoryManagerProps) {
  // Current active sub-tab: 'sheets' or 'orders' or 'rfq'
  const [subTab, setSubTab] = useState<'balance' | 'orders' | 'analyzer'>('balance');

  // Option to add Silo column for rice and paddy both (off by default)
  const [showSiloColumns, setShowSiloColumns] = useState(false);

  // Supplier Purchase order placing state
  const [orderGrainName, setOrderGrainName] = useState('');
  const [orderQty, setOrderQty] = useState('15');
  const [orderSupplier, setOrderSupplier] = useState('');
  const [orderType, setOrderType] = useState<'Paddy' | 'Processed Grain'>('Paddy');
  const [orderLeadDays, setOrderLeadDays] = useState('7');

  // RFQ Tester simulation selection
  const [testerQuoteId, setTesterQuoteId] = useState<string>('custom');
  const [testerCommodity, setTesterCommodity] = useState('');
  const [testerWeightTons, setTesterWeightTons] = useState('20');
  const [testerBagSize, setTesterBagSize] = useState('20'); // in KG
  
  // Initialize default inventory rows if empty or out of sync with commodities
  useEffect(() => {
    if (commodities.length > 0 && grainInventory.length === 0) {
      const initialInv = commodities.map((c, idx) => {
        const processType = getProcessTypeFromName(c.name);
        const millLead = getRecommendedMillingDays(processType);
        const basePaddyTons = 35 + (idx * 5);
        const baseRiceTons = 12 + idx;
        const pBags = Math.round(basePaddyTons * 1000 / 60);
        const rBags = Math.round(baseRiceTons * 1000 / 50);

        return {
          id: 'grain_' + c.id + '_' + idx,
          grainName: c.name,
          paddyStockTons: basePaddyTons,
          processedRiceTons: baseRiceTons,
          readyBagsCount: 150 + (idx * 50),
          paddySupplierName: 'Vellore Agri Farm Co.',
          supplierLeadTimeDays: 5 + (idx % 3),
          millingLeadTimeDays: millLead,
          packingLeadTimeDays: 2,
          bagSizeKg: 20,
          paddyBagsCount: pBags,
          processedRiceBagsCount: rBags,
          paddySiloTons: 0,
          processedSiloTons: 0,
          millingProcessType: processType
        };
      });
      setGrainInventory(initialInv);
    }
  }, [commodities, grainInventory]);

  // Set default tester commodity
  useEffect(() => {
    if (commodities.length > 0 && !testerCommodity) {
      setTesterCommodity(commodities[0].name);
    }
    if (commodities.length > 0 && !orderGrainName) {
      setOrderGrainName(commodities[0].name);
    }
  }, [commodities]);

  // Handle adding a customized grain inventory row if they want to track another line
  const [newGrainName, setNewGrainName] = useState('');
  const handleAddGrainRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrainName.trim()) {
      showToast("Please enter a grain name", "warn");
      return;
    }
    const alreadyExists = grainInventory.some(g => g.grainName.toLowerCase() === newGrainName.toLowerCase());
    if (alreadyExists) {
      showToast("This grain selection is already configured in inventory.", "warn");
      return;
    }

    const processType = getProcessTypeFromName(newGrainName);
    const millLead = getRecommendedMillingDays(processType);

    const newRow: GrainInventoryItem = {
      id: 'grain_custom_' + Date.now(),
      grainName: newGrainName.trim(),
      paddyStockTons: 10,
      processedRiceTons: 2,
      readyBagsCount: 50,
      paddySupplierName: 'Direct AP Mandis',
      supplierLeadTimeDays: 6,
      millingLeadTimeDays: millLead,
      packingLeadTimeDays: 2,
      bagSizeKg: 20,
      paddyBagsCount: Math.round(10 * 1000 / 60),
      processedRiceBagsCount: Math.round(2 * 1000 / 50),
      paddySiloTons: 0,
      processedSiloTons: 0,
      millingProcessType: processType
    };

    setGrainInventory([...grainInventory, newRow]);
    setNewGrainName('');
    showToast(`Added ${newRow.grainName} (${getProcessTypeName(processType)}) to mill inventory rosters.`);
  };

  // Inline value adjustment with synchronized calculation mechanics
  const handleUpdateItem = (id: string, key: keyof GrainInventoryItem, value: any) => {
    setGrainInventory(
      grainInventory.map(item => {
        if (item.id === id) {
          const updated = { ...item, [key]: value };

          // Field-specific synchronization workflows
          if (key === 'paddyBagsCount') {
            const bags = parseInt(value) || 0;
            const siloT = item.paddySiloTons || 0;
            updated.paddyStockTons = Number(((bags * 60) / 1000 + siloT).toFixed(3));
          } else if (key === 'paddySiloTons') {
            const siloT = parseFloat(value) || 0;
            const bags = item.paddyBagsCount || 0;
            updated.paddyStockTons = Number(((bags * 60) / 1000 + siloT).toFixed(3));
          } else if (key === 'paddyStockTons') {
            const tons = parseFloat(value) || 0;
            const siloT = item.paddySiloTons || 0;
            updated.paddyBagsCount = Math.max(0, Math.round(((tons - siloT) * 1000) / 60));
          } else if (key === 'processedRiceBagsCount') {
            const bags = parseInt(value) || 0;
            const siloT = item.processedSiloTons || 0;
            updated.processedRiceTons = Number(((bags * 50) / 1000 + siloT).toFixed(3));
          } else if (key === 'processedSiloTons') {
            const siloT = parseFloat(value) || 0;
            const bags = item.processedRiceBagsCount || 0;
            updated.processedRiceTons = Number(((bags * 50) / 1000 + siloT).toFixed(3));
          } else if (key === 'processedRiceTons') {
            const tons = parseFloat(value) || 0;
            const siloT = item.processedSiloTons || 0;
            updated.processedRiceBagsCount = Math.max(0, Math.round(((tons - siloT) * 1000) / 50));
          } else if (key === 'millingProcessType') {
            updated.millingLeadTimeDays = getRecommendedMillingDays(value);
          }

          return updated;
        }
        return item;
      })
    );
  };

  // Remove tracking row
  const handleRemoveItem = (id: string) => {
    if (!confirm("Are you sure you want to stop tracking inventory for this item?")) return;
    setGrainInventory(grainInventory.filter(item => item.id !== id));
    showToast("Tracking line suspended.");
  };

  // Purchase paddy/pulp from agricultural supplier
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderGrainName) {
      showToast("Please select a target variety.", "warn");
      return;
    }
    const qtyTons = parseFloat(orderQty);
    if (isNaN(qtyTons) || qtyTons <= 0) {
      showToast("Quantity must be greater than 0 Tons", "warn");
      return;
    }
    const lead = parseInt(orderLeadDays) || 5;
    const supplier = orderSupplier.trim() || 'Cooperative Rythu Mandi';

    const orderDate = new Date();
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(orderDate.getDate() + lead);

    const newOrder: InventoryOrder = {
      id: 'po_' + Date.now(),
      grainName: orderGrainName,
      orderQtyTons: qtyTons,
      supplier,
      orderDate: orderDate.toISOString().split('T')[0],
      expectedDelivery: expectedDeliveryDate.toISOString().split('T')[0],
      status: 'Pending',
      type: orderType
    };

    setInventoryOrders([newOrder, ...inventoryOrders]);
    showToast(`Placed order for ${qtyTons} Tons of ${orderGrainName}! Expected delivery in ${lead} days.`, "success");
    setOrderSupplier('');
  };

  // Delete inventory order history log
  const handleDeleteOrder = (id: string) => {
    setInventoryOrders(inventoryOrders.filter(o => o.id !== id));
  };

  // Mark order as received: automatically increments the stock at the mill!
  const handleMarkReceived = (order: InventoryOrder) => {
    setGrainInventory(
      grainInventory.map(item => {
        if (item.grainName.trim().toUpperCase() === order.grainName.trim().toUpperCase()) {
          if (order.type === 'Paddy') {
            const nextTons = item.paddyStockTons + order.orderQtyTons;
            const siloT = item.paddySiloTons || 0;
            const nextBags = Math.max(0, Math.round(((nextTons - siloT) * 1000) / 60));
            return { 
              ...item, 
              paddyStockTons: nextTons,
              paddyBagsCount: nextBags
            };
          } else {
            const nextTons = item.processedRiceTons + order.orderQtyTons;
            const siloT = item.processedSiloTons || 0;
            const nextBags = Math.max(0, Math.round(((nextTons - siloT) * 1000) / 50));
            return { 
              ...item,
              processedRiceTons: nextTons,
              processedRiceBagsCount: nextBags
            };
          }
        }
        return item;
      })
    );

    setInventoryOrders(
      inventoryOrders.map(o => {
        if (o.id === order.id) {
          return { ...o, status: 'Received' };
        }
        return o;
      })
    );

    showToast(`Successfully received ${order.orderQtyTons} Tons of ${order.grainName}. Mill balances adjusted.`, "success");
  };

  // Real-time automatic analytical evaluations
  // Look at the active tester state, analyze and build step directions
  const analyzeAvailability = () => {
    let commodityName = testerCommodity;
    let targetTons = parseFloat(testerWeightTons) || 0;
    let bagSize = parseFloat(testerBagSize) || 20;

    // If a saved quote was selected, pull parameters directly from it!
    if (testerQuoteId !== 'custom') {
      const selectedQuote = savedQuotes.find(q => String(q.id) === testerQuoteId);
      if (selectedQuote && selectedQuote.items.length > 0) {
        // Use first line item for simulation
        const item = selectedQuote.items[0];
        commodityName = item.commodity;
        targetTons = item.totalWeightKg / 1000;
        
        // Try to parse bag weight
        const parsedBagWeight = parseFloat(item.size.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedBagWeight) && parsedBagWeight > 0) {
          bagSize = parsedBagWeight;
        }
      }
    }

    if (!commodityName || targetTons <= 0) {
      return {
        status: 'error',
        message: 'Enter a valid commodity and weight target to start simulation'
      };
    }

    // Find the corresponding inventory configuration
    // matching by standard substring or equality
    const info = grainInventory.find(g => 
      g.grainName.trim().toUpperCase() === commodityName.trim().toUpperCase() ||
      commodityName.trim().toUpperCase().includes(g.grainName.trim().toUpperCase()) ||
      g.grainName.trim().toUpperCase().includes(commodityName.trim().toUpperCase())
    ) || grainInventory[0];

    if (!info) {
      return {
        status: 'warning',
        message: 'No exact inventory profile details found for this variety. Simulating using generic fallbacks.'
      };
    }

    // Standard metric calculations
    const requiredBags = Math.ceil((targetTons * 1000) / bagSize);
    
    // Recovery yield calculation (standard milling paddy turns ~65% into polished processed rice)
    const millingYield = 0.65; 

    // Readiness levels:
    // 1. Packed Ready Bags Check
    const bagsInStock = info.readyBagsCount;
    const bagsShort = Math.max(0, requiredBags - bagsInStock);
    const tonsShort = (bagsShort * bagSize) / 1000;

    // 2. Processed Rice check (to bag up the deficit)
    const availableProcessedRiceTons = info.processedRiceTons;
    const riceNeededForDeficit = tonsShort;
    const processedRiceDeficit = Math.max(0, riceNeededForDeficit - availableProcessedRiceTons);

    // 3. Raw Paddy check (to mill the processed rice deficit)
    const paddyNeededForDeficit = (processedRiceDeficit > 0) ? (processedRiceDeficit / millingYield) : 0;
    const availableRawPaddyTons = info.paddyStockTons;
    const paddyDeficit = Math.max(0, paddyNeededForDeficit - availableRawPaddyTons);

    // Determine fulfillment strategy & step by step lead times
    let isInstantReady = bagsShort <= 0;
    let isProcessedRiceFitted = !isInstantReady && processedRiceDeficit <= 0;
    let isPaddyFitted = !isInstantReady && !isProcessedRiceFitted && paddyDeficit <= 0;
    let needsSupplierOrder = paddyDeficit > 0;

    let steps = [];
    let cumulativeDays = 0;

    if (isInstantReady) {
      steps.push({
        title: 'Ready Packed Inventory Dispense',
        days: 0,
        desc: `All ${requiredBags} bags (${targetTons} Tons) are already stitched, branded, and stacked in the warehouse. Ready for container loading immediately!`,
        status: 'ready'
      });
    } else {
      // 1. If supplier order is needed
      if (needsSupplierOrder) {
        cumulativeDays += info.supplierLeadTimeDays;
        steps.push({
          title: 'Procure Raw Paddy from Supplier',
          days: info.supplierLeadTimeDays,
          desc: `Short on paddy by ${paddyDeficit.toFixed(2)} Tons. Buy raw paddy from agricultural supplier "${info.paddySupplierName || 'Primary Agrimarkets'}".`,
          status: 'pending'
        });
      }

      // 2. Milling phase (if milling needed)
      if (processedRiceDeficit > 0) {
        cumulativeDays += info.millingLeadTimeDays;
        steps.push({
          title: 'Mill, Clean & Process Paddy',
          days: info.millingLeadTimeDays,
          desc: `Process ${paddyNeededForDeficit.toFixed(2)} Tons of raw paddy into polished grain using standard ${millingYield * 100}% recovery. Outflow yields ${processedRiceDeficit.toFixed(2)} Tons of finished grain.`,
          status: 'pending'
        });
      }

      // 3. Packaging & stitching phase
      cumulativeDays += info.packingLeadTimeDays;
      steps.push({
        title: 'Bagging, Labeling & Container Packaging',
        days: info.packingLeadTimeDays,
        desc: `Fill and stitch the remaining ${bagsShort} bags (${bagSize} KG pack size) and load into standard FCL shipping containers.`,
        status: 'pending'
      });
    }

    return {
      status: isInstantReady ? 'ready' : (needsSupplierOrder ? 'critical' : 'warning'),
      info,
      requiredBags,
      bagsInStock,
      bagsShort,
      tonsShort,
      processedRiceDeficit,
      paddyDeficit,
      cumulativeDays,
      steps,
      commodityName,
      targetTons,
      millingYield: 0.65
    };
  };

  const analysis = analyzeAvailability();

  return (
    <div className="space-y-6" id="grain_inventory_workspace">
      
      {/* Visual Dynamic Header Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-indigo-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10">
          <Layers className="w-56 h-56" />
        </div>
        
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wide uppercase">
            <Activity className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>Mill Core Activity Center</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight font-sans">Grain Inventory & Production Control</h2>
          <p className="text-xs text-emerald-150 leading-relaxed font-sans max-w-sm">
            Control raw paddy silos, milled stocks, and packaging lead times. Evaluate your actual capacity against active global client RFQs in real-time.
          </p>
        </div>

        {/* Action Controls for Persisting */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/10">
          <button
            onClick={onSaveInventory}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Commit Inventory Balances</span>
          </button>
          <button
            onClick={() => {
              if (confirm("Reset inventory volumes back to baseline values?")) {
                onResetInventory();
              }
            }}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard Changes</span>
          </button>
        </div>
      </div>

      {/* Workspace Sheet Sub-Tabs Switcher */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setSubTab('balance')}
          className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 hover:text-slate-900 cursor-pointer ${
            subTab === 'balance' ? 'border-emerald-600 text-emerald-600 font-sans font-black' : 'border-transparent text-gray-500 font-sans font-semibold'
          }`}
        >
          Grain Stock Balances
        </button>
        <button
          onClick={() => setSubTab('orders')}
          className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 hover:text-slate-900 cursor-pointer ${
            subTab === 'orders' ? 'border-emerald-600 text-emerald-600 font-sans font-black' : 'border-transparent text-gray-500 font-sans font-semibold'
          }`}
        >
          Paddy Purchase Orders ({inventoryOrders.length})
        </button>
        <button
          onClick={() => setSubTab('analyzer')}
          className={`pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 hover:text-slate-900 cursor-pointer ${
            subTab === 'analyzer' ? 'border-emerald-600 text-emerald-600 font-sans font-black' : 'border-transparent text-gray-500 font-sans font-semibold'
          }`}
        >
          RFQ Availability & Milling Lead Times
        </button>
      </div>

      {subTab === 'balance' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Quick Informative Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-gray-150 rounded-2xl flex items-center gap-3 shadow-xs">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">Silo Paddy Stock</span>
                <span className="text-lg font-black font-sans text-gray-950">
                  {grainInventory.reduce((acc, curr) => acc + (Number(curr.paddyStockTons) || 0), 0).toFixed(0)} Tons
                </span>
              </div>
            </div>

            <div className="p-4 bg-white border border-gray-150 rounded-2xl flex items-center gap-3 shadow-xs">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">Finished Grain Stock</span>
                <span className="text-lg font-black font-sans text-gray-950">
                  {grainInventory.reduce((acc, curr) => acc + (Number(curr.processedRiceTons) || 0), 0).toFixed(0)} Tons
                </span>
              </div>
            </div>

            <div className="p-4 bg-white border border-gray-150 rounded-2xl flex items-center gap-3 shadow-xs">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-700 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-widest block">Stitched Bag Inventory</span>
                <span className="text-lg font-black font-sans text-gray-950">
                  {grainInventory.reduce((acc, curr) => acc + (Number(curr.readyBagsCount) || 0), 0).toLocaleString()} Bags
                </span>
              </div>
            </div>
          </div>

          {/* Master Roster Sheet */}
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-gray-900">Active Silo Stock & Lead Time Configurations</h3>
                <p className="text-[10px] text-gray-500 font-sans">
                  Directly modify stock amounts (Paddy, Polished Rice, Bags) and the supplier/milling lead time limits.
                </p>
              </div>

              {/* Add Custom Row Form */}
              <form onSubmit={handleAddGrainRow} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New rice name... (eg. Sona Steam)"
                  value={newGrainName}
                  onChange={(e) => setNewGrainName(e.target.value)}
                  className="bg-white border border-gray-300 text-xs text-gray-900 px-3 py-1.5 rounded-xl font-bold font-sans outline-none focus:border-emerald-500 w-52"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Configure Line</span>
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[9px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="py-3 px-4">Rice Variety & Sella/Steam Process</th>
                    <th className="py-3 px-4 text-center">Paddy Stock (60 kg Jute Bags)</th>
                    {showSiloColumns && (
                      <th className="py-3 px-4 text-center text-indigo-850 bg-indigo-50/50">Paddy Silo (Bulk Tons)</th>
                    )}
                    <th className="py-3 px-4 text-center">Rice Stock (50 kg PP Bags)</th>
                    {showSiloColumns && (
                      <th className="py-3 px-4 text-center text-emerald-850 bg-emerald-50/50">Rice Silo (Bulk Tons)</th>
                    )}
                    <th className="py-3 px-4 text-center">Custom Order Stitched Bags</th>
                    <th className="py-3 px-4">Preferred Supplier</th>
                    <th className="py-3 px-4 text-center">Lead Days (Get/Mill/Pack)</th>
                    <th className="py-3 px-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs">
                  {grainInventory.length === 0 ? (
                    <tr>
                      <td colSpan={showSiloColumns ? 9 : 7} className="py-8 text-center text-gray-400 font-semibold italic">
                        No grain lines configured yet. Enter a custom grain name above or load default commodities.
                      </td>
                    </tr>
                  ) : (
                    grainInventory.map((item) => {
                      const paddyBags = item.paddyBagsCount !== undefined ? item.paddyBagsCount : Math.max(0, Math.round((item.paddyStockTons * 1000) / 60));
                      const processedBags = item.processedRiceBagsCount !== undefined ? item.processedRiceBagsCount : Math.max(0, Math.round((item.processedRiceTons * 1000) / 50));
                      const paddySilo = item.paddySiloTons !== undefined ? item.paddySiloTons : 0;
                      const processedSilo = item.processedSiloTons !== undefined ? item.processedSiloTons : 0;
                      const processType = item.millingProcessType || getProcessTypeFromName(item.grainName);

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-2.5 px-3 min-w-56">
                            <div className="font-semibold text-slate-800 font-mono text-[11px]">{item.grainName}</div>
                            <div className="mt-1 flex items-center gap-1 leading-none">
                              <span className="text-[8px] uppercase text-gray-400 font-mono">Process:</span>
                              <select
                                value={processType}
                                onChange={(e) => handleUpdateItem(item.id, 'millingProcessType', e.target.value)}
                                className="bg-gray-100 border border-gray-250 text-[10px] text-slate-705 font-bold px-1.5 py-0.5 rounded cursor-pointer max-w-min focus:outline-none"
                              >
                                <option value="steam">Steam Rice (3d)</option>
                                <option value="parboiled">Parboiled (5d)</option>
                                <option value="sella_basmati">Sella Basmati (8d)</option>
                                <option value="golden_sella">Golden Sella (7d)</option>
                                <option value="creamy_sella">Creamy Sella (7d)</option>
                                <option value="other">Standard/Direct (3d)</option>
                              </select>
                            </div>
                          </td>
                          
                          {/* Paddy Stock (60 kg jute bag) */}
                          <td className="py-2.5 px-3 text-center w-36">
                            <div className="flex flex-col items-center gap-1 justify-center">
                              <input
                                type="number"
                                value={paddyBags}
                                onChange={(e) => handleUpdateItem(item.id, 'paddyBagsCount', parseInt(e.target.value) || 0)}
                                className="w-24 bg-gray-50 border border-gray-250 text-center py-1 rounded text-xs text-amber-950 font-black outline-none focus:bg-white focus:border-amber-500 font-mono"
                              />
                              <span className="text-[9px] text-amber-800 font-bold font-mono">
                                {item.paddyStockTons.toFixed(2)} Tons total
                              </span>
                            </div>
                          </td>

                          {/* Paddy Silo (Bulk Tons) - Conditional */}
                          {showSiloColumns && (
                            <td className="py-2.5 px-3 text-center w-28 bg-indigo-50/20">
                              <input
                                type="number"
                                step="0.1"
                                value={paddySilo}
                                onChange={(e) => handleUpdateItem(item.id, 'paddySiloTons', parseFloat(e.target.value) || 0)}
                                className="w-20 bg-gray-50 border border-indigo-200 text-center py-1 rounded text-xs text-indigo-950 font-bold outline-none focus:bg-white focus:border-indigo-500 font-mono"
                              />
                            </td>
                          )}

                          {/* Rice Stock (50 kg white PP bag) */}
                          <td className="py-2.5 px-3 text-center w-36">
                            <div className="flex flex-col items-center gap-1 justify-center">
                              <input
                                type="number"
                                value={processedBags}
                                onChange={(e) => handleUpdateItem(item.id, 'processedRiceBagsCount', parseInt(e.target.value) || 0)}
                                className="w-24 bg-gray-50 border border-gray-250 text-center py-1 rounded text-xs text-emerald-950 font-black outline-none focus:bg-white focus:border-emerald-500 font-mono"
                              />
                              <span className="text-[9px] text-emerald-800 font-bold font-mono">
                                {item.processedRiceTons.toFixed(2)} Tons total
                              </span>
                            </div>
                          </td>

                          {/* Rice Silo (Bulk Tons) - Conditional */}
                          {showSiloColumns && (
                            <td className="py-2.5 px-3 text-center w-28 bg-emerald-50/20">
                              <input
                                type="number"
                                step="0.1"
                                value={processedSilo}
                                onChange={(e) => handleUpdateItem(item.id, 'processedSiloTons', parseFloat(e.target.value) || 0)}
                                className="w-20 bg-gray-50 border border-emerald-250 text-center py-1 rounded text-xs text-emerald-950 font-bold outline-none focus:bg-white focus:border-emerald-500 font-mono"
                              />
                            </td>
                          )}

                          {/* Custom Order Bags */}
                          <td className="py-2.5 px-3 text-center w-36">
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                value={item.readyBagsCount}
                                onChange={(e) => handleUpdateItem(item.id, 'readyBagsCount', parseInt(e.target.value) || 0)}
                                className="w-16 bg-gray-50 border border-gray-250 text-center py-1 rounded text-xs text-gray-950 font-extrabold outline-none focus:bg-white focus:border-indigo-500 font-mono"
                              />
                              <span className="text-[9px] text-gray-400 pr-1">pcs</span>
                              <div className="flex flex-col text-[8px] leading-none text-left font-mono">
                                <span className="text-gray-400">Bag Kg:</span>
                                <input
                                  type="number"
                                  value={item.bagSizeKg}
                                  onChange={(e) => handleUpdateItem(item.id, 'bagSizeKg', parseFloat(e.target.value) || 20)}
                                  className="w-8 border-b border-gray-300 bg-transparent text-[9px] font-bold text-gray-700 focus:outline-none"
                                />
                              </div>
                            </div>
                          </td>

                          {/* Supplier */}
                          <td className="py-2.5 px-3 min-w-44">
                            <input
                              type="text"
                              value={item.paddySupplierName || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'paddySupplierName', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-250 px-2 py-1 rounded text-[11px] text-gray-800 outline-none focus:bg-white"
                            />
                          </td>

                          {/* Lead Times */}
                          <td className="py-2.5 px-3 text-center w-40">
                            <div className="flex items-center gap-1.5 justify-center font-mono text-[10px]">
                              <div className="flex flex-col items-center">
                                <span className="text-[7px] text-gray-400 uppercase font-black">Get</span>
                                <input
                                  type="number"
                                  value={item.supplierLeadTimeDays}
                                  onChange={(e) => handleUpdateItem(item.id, 'supplierLeadTimeDays', parseInt(e.target.value) || 0)}
                                  className="w-8 bg-gray-50 border border-gray-250 text-center rounded text-xs text-amber-700 font-black outline-none focus:bg-white"
                                />
                              </div>
                              <span className="text-gray-300">/</span>
                              <div className="flex flex-col items-center">
                                <span className="text-[7px] text-gray-400 uppercase font-black">Mill</span>
                                <input
                                  type="number"
                                  value={item.millingLeadTimeDays}
                                  onChange={(e) => handleUpdateItem(item.id, 'millingLeadTimeDays', parseInt(e.target.value) || 0)}
                                  className="w-8 bg-gray-50 border border-gray-250 text-center rounded text-xs text-emerald-700 font-black outline-none focus:bg-white font-mono"
                                />
                              </div>
                              <span className="text-gray-300">/</span>
                              <div className="flex flex-col items-center">
                                <span className="text-[7px] text-gray-400 uppercase font-black">Pack</span>
                                <input
                                  type="number"
                                  value={item.packingLeadTimeDays}
                                  onChange={(e) => handleUpdateItem(item.id, 'packingLeadTimeDays', parseInt(e.target.value) || 0)}
                                  className="w-8 bg-gray-50 border border-gray-250 text-center rounded text-xs text-indigo-700 font-black outline-none focus:bg-white"
                                />
                              </div>
                              <span className="text-gray-400">Days</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-4 text-right font-mono">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition cursor-pointer"
                              title="Remove tracking row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                        
                        





              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-gray-900">
          
          {/* Ordering form */}
          <div className="bg-white border border-gray-200 p-5 rounded-3xl space-y-4 shadow-xs h-fit">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Place Paddy/Grain Supply Order</span>
              </h3>
              <p className="text-[10px] text-gray-500 leading-snug">
                Restock raw paddy silo volumes or processed grain by issuing orders directly to agriculture agents or farms.
              </p>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Target Variety</label>
                <select
                  value={orderGrainName}
                  onChange={(e) => setOrderGrainName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-xs text-gray-900 px-3 py-2.5 rounded-xl font-bold font-sans tracking-wide outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {commodities.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {grainInventory.filter(g => !commodities.some(c => c.name === g.grainName)).map(g => (
                    <option key={g.id} value={g.grainName}>{g.grainName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Qty in Tons</label>
                  <input
                    type="number"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-xs text-gray-900 px-3 py-2.5 rounded-xl font-bold font-sans outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Delivery Delay (Days)</label>
                  <input
                    type="number"
                    value={orderLeadDays}
                    onChange={(e) => setOrderLeadDays(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-xs text-gray-900 px-3 py-2.5 rounded-xl font-bold font-sans outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Order Content Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-750 cursor-pointer">
                    <input
                      type="radio"
                      name="orderType"
                      checked={orderType === 'Paddy'}
                      onChange={() => setOrderType('Paddy')}
                      className="accent-emerald-600 scale-105"
                    />
                    <span>Unmilled Paddy (Silo Restock)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-750 cursor-pointer">
                    <input
                      type="radio"
                      name="orderType"
                      checked={orderType === 'Processed Grain'}
                      onChange={() => setOrderType('Processed Grain')}
                      className="accent-emerald-600 scale-105"
                    />
                    <span>Processed Finished Rice</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Supplier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cooperative Agri Mandi"
                  value={orderSupplier}
                  onChange={(e) => setOrderSupplier(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 text-xs text-gray-900 px-3 py-2.5 rounded-xl font-bold font-sans outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Place Purchase Order
              </button>
            </form>
          </div>

          {/* Core Purchase Order List */}
          <div className="bg-white border border-gray-200 p-5 rounded-3xl lg:col-span-2 space-y-4 shadow-xs">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-slate-800">Supply Pipeline Orders Tracker</h3>
              <p className="text-[10px] text-gray-500 font-sans">
                Review and update custom orders. Once products arrive physically, click "Receive Inventory" to sync balances automatically.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[8.5px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-200">
                    <th className="py-2.5 px-3">PO Code</th>
                    <th className="py-2.5 px-3">Paddy / Grain Variety</th>
                    <th className="py-2.5 px-3 text-center">Tonnage</th>
                    <th className="py-2.5 px-3">Source Supplier</th>
                    <th className="py-2.5 px-3 text-center">Dates (Order / ETA)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-[11px]">
                  {inventoryOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold italic">
                        No active purchase orders in pipeline. Initiate an order from the supplier desk.
                      </td>
                    </tr>
                  ) : (
                    inventoryOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-gray-550 uppercase">
                          #{ord.id.substring(3, 9)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-800">{ord.grainName}</div>
                          <div className="text-[9px] text-gray-400 font-mono">{ord.type}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-950 font-mono">
                          {ord.orderQtyTons} T
                        </td>
                        <td className="py-3 px-3 max-w-28 truncate text-gray-600 font-semibold">
                          {ord.supplier}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="font-mono text-[9.5px] text-gray-650">Out: {ord.orderDate}</div>
                          <div className="font-mono text-[9.5px] text-indigo-700 font-bold">ETA: {ord.expectedDelivery}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {ord.status === 'Pending' ? (
                            <span className="inline-block px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[9px] font-extrabold uppercase rounded-full border border-yellow-250 animate-pulse">
                              Pending
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 text-[9px] font-extrabold uppercase rounded-full border border-green-250">
                              Received
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {ord.status === 'Pending' && (
                              <button
                                onClick={() => handleMarkReceived(ord)}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-[9px] font-bold text-slate-950 rounded uppercase tracking-wider flex items-center gap-1 shrink-0 transition cursor-pointer"
                                title="Receive goods and adjust mill stocks"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Receive</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="text-gray-400 hover:text-red-650 p-1 rounded hover:bg-red-50 cursor-pointer"
                              title="Delete PO record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'analyzer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-gray-900">
          
          {/* RFQ Inputs Left Container */}
          <div className="bg-white border border-gray-200 p-5 rounded-3xl space-y-4 shadow-xs h-fit">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>RFQ Lead Time Simulator</span>
              </h3>
              <p className="text-[10px] text-gray-500 leading-snug">
                Configure a customer's requested quote. The simulator checks grain silo status and computes the exact milling packaging cycle duration.
              </p>
            </div>

            <div className="space-y-3.5">
              
              {/* Option to load from saved Quotes! */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Analyze Saved Quote / RFQ Folder</label>
                <select
                  value={testerQuoteId}
                  onChange={(e) => setTesterQuoteId(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-xs text-gray-900 px-3 py-2.5 rounded-xl font-bold font-sans tracking-wide outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="custom">-- CUSTOM DEMAND GRID --</option>
                  {savedQuotes.filter(q => q.items && q.items.length > 0).map((q) => (
                    <option key={q.id} value={String(q.id)}>
                      {q.ref || `RFQ-${q.id}`} ({q.company || 'Direct Buyer'} - {q.items[0]?.commodity})
                    </option>
                  ))}
                </select>
              </div>

              {testerQuoteId === 'custom' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Select Rice Commodity</label>
                    <select
                      value={testerCommodity}
                      onChange={(e) => setTesterCommodity(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 text-xs text-gray-900 px-3 py-2.5 rounded-xl font-bold font-sans outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {commodities.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      {grainInventory.filter(g => !commodities.some(c => c.name === g.grainName)).map(g => (
                        <option key={g.id} value={g.grainName}>{g.grainName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Order Volume (Tons)</label>
                      <input
                        type="number"
                        value={testerWeightTons}
                        onChange={(e) => setTesterWeightTons(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 text-xs text-slate-900 px-3 py-2.5 rounded-xl font-bold font-sans outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Bag Pack Size (KG)</label>
                      <select
                        value={testerBagSize}
                        onChange={(e) => setTesterBagSize(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 text-xs text-slate-900 px-3 py-2.5 rounded-xl font-bold font-sans outline-none focus:border-emerald-500 cursor-pointer font-mono"
                      >
                        <option value="10">10 KG Small Bags</option>
                        <option value="20">20 KG BOPP Bags</option>
                        <option value="25">25 KG Standard Jute</option>
                        <option value="50">50 KG Heavy Jute Bags</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-2xl text-[11px] text-indigo-900 leading-relaxed font-sans">
                  <span className="font-extrabold uppercase text-[9px] text-indigo-950 block mb-1">✔ Auto-Extracted Parameters</span>
                  {(() => {
                    const q = savedQuotes.find(x => String(x.id) === testerQuoteId);
                    const item = q?.items[0];
                    if (!item) return <p>No lines found</p>;
                    return (
                      <div className="space-y-1 font-mono text-[10.5px]">
                        <p><strong className="font-sans">Client:</strong> {q?.company}</p>
                        <p><strong className="font-sans">Target variety:</strong> {item.commodity}</p>
                        <p><strong className="font-sans">Demand Volume:</strong> {(item.totalWeightKg / 1000).toFixed(2)} Tons</p>
                        <p><strong className="font-sans">Packaging Specification:</strong> {item.size} ({item.packed})</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[10px] space-y-1 leading-relaxed">
                <span className="font-extrabold uppercase text-[8.5px] tracking-widest text-amber-955 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Milling Recovery Yield Alert
                </span>
                <p>
                  Calculated based on standard industrial yield ratios representing <strong className="font-black">65% usable recovery</strong> from raw un-dehusked paddy.
                </p>
              </div>

            </div>
          </div>

          {/* Availability Results Right Panel */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Simulation Scoreboard */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-800">Operational Feasibility Matrix</h3>
                  <p className="text-[10px] text-gray-500 font-sans">Real-time gap index check on warehouse stock lines.</p>
                </div>
                
                {analysis.status === 'ready' && (
                  <span className="px-3 py-1 bg-green-500 text-slate-950 text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
                    <CheckCircle className="w-3.5 h-3.5" /> Fulfillable Immediately (0 Days)
                  </span>
                )}
                {analysis.status === 'warning' && (
                  <span className="px-3 py-1 bg-yellow-500 text-slate-950 text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1 shadow animate-pulse">
                    <Clock className="w-3.5 h-3.5" /> Delay Expected ({analysis.cumulativeDays} Days)
                  </span>
                )}
                {analysis.status === 'critical' && (
                  <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1 shadow animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" /> Supply Wait Order Needed ({analysis.cumulativeDays} Days)
                  </span>
                )}
              </div>

              {/* Quick Metrics of shortages */}
              {(() => {
                if (analysis.status === 'error') return <p className="text-xs text-red-500 font-semibold">{analysis.message}</p>;
                return (
                  <div className="space-y-5">
                    
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-mono">Total Bags Needed</span>
                        <span className="text-base font-black text-gray-900 font-sans">{analysis.requiredBags?.toLocaleString()}</span>
                        <span className="text-[9px] text-gray-400 block font-mono">({analysis.targetTons} T total)</span>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-mono">Active Ready Bags</span>
                        <span className="text-base font-black text-green-700 font-sans">{analysis.bagsInStock?.toLocaleString()}</span>
                        <span className="text-[9px] text-gray-400 block font-mono">Bags stacked</span>
                      </div>
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="text-[8px] uppercase tracking-wider text-gray-400 block font-mono">Net Bag Shortage</span>
                        <span className="text-base font-black text-rose-600 font-sans">
                          {analysis.bagsShort > 0 ? `-${analysis.bagsShort.toLocaleString()}` : '0'}
                        </span>
                        <span className="text-[9px] text-gray-400 block font-mono">Missing pieces</span>
                      </div>
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
                        <span className="text-[8px] uppercase tracking-wider text-indigo-400 block font-mono">Final Cycle Time</span>
                        <span className="text-base font-black text-indigo-850 font-sans">{analysis.cumulativeDays} Days</span>
                        <span className="text-[9px] text-indigo-600 block font-mono">Wait production</span>
                      </div>
                    </div>

                    {/* Stock Layer Breakdown Bars */}
                    <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3.5">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block font-sans">Silo & Pile Feasibility Breakdown</span>
                      
                      {/* 1. Bags */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-gray-700 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-indigo-500" /> Layer 1: Stitched Ready Bags Stock Level
                          </span>
                          <span className={analysis.bagsShort === 0 ? "text-green-700 font-black" : "text-slate-900"}>
                            {analysis.bagsInStock} / {analysis.requiredBags} Bags ({analysis.bagsShort === 0 ? "100%" : `${((analysis.bagsInStock / analysis.requiredBags)*100).toFixed(0)}%`})
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full" 
                            style={{ width: `${Math.min(100, (analysis.bagsInStock / (analysis.requiredBags || 1)) * 100)}%` }} 
                          />
                        </div>
                      </div>

                      {/* 2. Processed Rice */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-gray-700 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-emerald-500" /> Layer 2: Milled Polished Rice Stack Level
                          </span>
                          <span className={analysis.processedRiceDeficit === 0 ? "text-green-700 font-black" : "text-amber-700 font-extrabold"}>
                            {analysis.info?.processedRiceTons?.toFixed(2)} T Stock vs {analysis.tonsShort?.toFixed(2)} T Shortage
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (analysis.tonsShort <= 0 ? 100 : (analysis.info?.processedRiceTons / (analysis.tonsShort || 1)) * 100))}%` 
                            }} 
                          />
                        </div>
                      </div>

                      {/* 3. Raw Paddy in Silo */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-gray-700 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-amber-500" /> Layer 3: Undehusked Paddy Silo Stocks
                          </span>
                          <span className={analysis.paddyDeficit === 0 ? "text-green-700 font-black" : "text-rose-600 font-extrabold"}>
                            {analysis.info?.paddyStockTons?.toFixed(2)} T Paddy vs {((analysis.processedRiceDeficit > 0) ? (analysis.processedRiceDeficit / (analysis.millingYield || 0.65)) : 0).toFixed(2)} T Needed
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (analysis.processedRiceDeficit <= 0 ? 100 : (analysis.info?.paddyStockTons / ((analysis.processedRiceDeficit / (analysis.millingYield || 0.65)) || 1)) * 100))}%` 
                            }} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step - by - step delivery timeline representation */}
                    <div className="space-y-3.5">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block font-sans">
                        Calculated Milling & Packaging Schedule Timelines
                      </span>
                      
                      <div className="relative border-l-2 border-indigo-200 ml-3.5 pl-5 space-y-5">
                        {analysis.steps?.map((step: any, idx: number) => (
                          <div key={idx} className="relative">
                            {/* Bullet icon indicator */}
                            <span className={`absolute -left-[29px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              step.days === 0 ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-indigo-500 text-indigo-705'
                            } text-[9px] font-black`}>
                              {idx + 1}
                            </span>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-800">{step.title}</span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  step.days === 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                                }`}>
                                  {step.days === 0 ? 'Ready immediately' : `+ ${step.days} Days`}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-550 leading-relaxed font-sans">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

            {/* General RFQ Monitoring Dashboard */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>Real-time Saved Quotes Stock Audits</span>
                </h3>
                <p className="text-[10px] text-gray-500 leading-snug">
                  The system scans your whole quotation history to detect inventory gaps so you never promise quantities you cannot produce or ship.
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedQuotes.filter(q => q.items && q.items.length > 0).length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 italic font-semibold">
                    No generated quotes to evaluate in active system. Use Quote Sheet tab to lock prices.
                  </div>
                ) : (
                  savedQuotes.filter(q => q.items && q.items.length > 0).map((quote) => {
                    const item = quote.items[0];
                    const invRef = grainInventory.find(g => 
                      g.grainName.trim().toUpperCase() === item.commodity.trim().toUpperCase() ||
                      item.commodity.trim().toUpperCase().includes(g.grainName.trim().toUpperCase()) ||
                      g.grainName.trim().toUpperCase().includes(item.commodity.trim().toUpperCase())
                    );

                    const weightTons = item.totalWeightKg / 1000;
                    const bSize = parseFloat(item.size.replace(/[^0-9.]/g, '')) || 20;
                    const reqBags = Math.ceil(item.totalWeightKg / bSize);
                    
                    const hasBags = invRef ? invRef.readyBagsCount >= reqBags : true;
                    const hasGrain = invRef ? (invRef.readyBagsCount * bSize / 1000 + invRef.processedRiceTons) >= weightTons : true;

                    return (
                      <div 
                        key={quote.id} 
                        className={`p-3 rounded-2xl border text-xs flex justify-between items-center transition hover:border-gray-300 ${
                          hasBags ? 'bg-green-50/50 border-green-150' : (hasGrain ? 'bg-amber-50/50 border-amber-150' : 'bg-rose-50/30 border-rose-150')
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-mono text-[10.5px]">
                            <strong className="text-slate-900 font-extrabold">{quote.ref || `RFQ-${quote.id}`}</strong>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-550 font-sans font-bold">{quote.company || 'Private Importer'}</span>
                          </div>
                          <p className="text-[11px] text-gray-750 font-semibold font-sans">
                            {item.commodity} &middot; <strong className="font-bold text-slate-800">{weightTons.toFixed(1)} Tons</strong> ({reqBags.toLocaleString()} bags of {bSize} kg)
                          </p>
                        </div>

                        <div className="text-right">
                          {hasBags ? (
                            <span className="text-[9.5px] uppercase font-black text-green-700 flex items-center justify-end gap-0.5">
                              Ready Stack Sync
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className={`text-[9.5px] uppercase font-black block ${hasGrain ? 'text-amber-750' : 'text-red-700'}`}>
                                {hasGrain ? 'Needs packaging stitching' : 'Deficit: Requires supplier order'}
                              </span>
                              <span className="text-[9px] text-gray-400 block font-mono">
                                Missing {invRef ? Math.max(0, reqBags - invRef.readyBagsCount) : 0} bags
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
