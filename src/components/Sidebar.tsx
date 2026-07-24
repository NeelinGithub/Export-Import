import React, { useState, useEffect } from "react";
import {
  Calculator,
  ListOrdered,
  ShoppingBag,
  Truck,
  Coins,
  LayoutDashboard,
  FileSpreadsheet,
  BookmarkCheck,
  Settings,
  Menu,
  LogOut,
  User,
  Key,
  Globe,
  Lock,
  Package,
  Play,
  Cloud,
  DollarSign,
  Share2,
} from "lucide-react";
import { getTenantGenerationLogs } from "../services/db";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  rateCount: number;
  savedQuotesCount: number;
  sidebarPinned: boolean;
  setSidebarPinned: (pinned: boolean) => void;
  userEmail?: string | null;
  onLogout?: () => void;
  allowedModules?: string[];
  activeIndustries?: string[];
  setActiveIndustry?: (ind: string) => void;
  industry?: string| string;
  activeTenantId?: string | null;
  licenceMetadata?: any;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  rateCount,
  savedQuotesCount,
  sidebarPinned,
  setSidebarPinned,
  userEmail,
  onLogout,
  allowedModules,
  industry = "grain",
  activeIndustries = ["grain"],
  setActiveIndustry,
  activeTenantId,
  licenceMetadata,
}: SidebarProps) {
  const isViren = userEmail?.toLowerCase() === "vnp.viren@gmail.com";

  const [docsCountThisMonth, setDocsCountThisMonth] = useState<number>(0);

  useEffect(() => {
    if (activeTenantId && (licenceMetadata?.planId === "free" || licenceMetadata?.approved === false)) {
      getTenantGenerationLogs(activeTenantId)
        .then((logs) => {
          const now = new Date();
          const monthStr = now.toISOString().substring(0, 7);
          const monthLogs = logs.filter((l) => l.timestamp.startsWith(monthStr));
          setDocsCountThisMonth(monthLogs.length);
        })
        .catch((err) => console.error("Could not fetch document logs in sidebar", err));
    }
  }, [activeTenantId, licenceMetadata]);

  
  const getIndustryTitle = (ind: string) => {
    switch (ind) {
      case 'grain': return '🌾 Grain & Rice';
      case 'spices': return '🌶️ Spices';
      case 'chemicals': return '🧪 Chemicals';
      case 'salts': return '🧂 Salts';
      case 'vegetables_fruits': return '🥦 Veg & Fruits';
      case 'tiles': return '🧱 Ceramic Tiles';
      case 'sugar': return '🍬 Sugar';
      case 'nuts': return '🌰 Nuts & Cashews';
      case 'rcn': return '🥜 Raw Cashew Nut (RCN)';
      case 'coffee_tea': return '☕ Coffee & Tea';
      case 'cotton_yarn': return '🧵 Cotton & Yarn';
      case 'timber': return '🪵 Timber & Wood';
      case 'generic': return '📦 Generic Cargo';
      case 'metal': return '⚙️ Metals & Ingots';
      case 'oil': return '🛢️ Palm & Edible Oil';
      case 'pharma': return '💊 Pharmaceuticals';
      case 'apparel': return '👕 Apparel & Textiles';
      case 'air_cargo': return '✈️ Air Cargo';
      case 'packaging': return '📦 BOPP & Jumbo Bags';
      default: return ind.toUpperCase();
    }
  };

  // Default to only rate calculator option active if not specified (e.g. newly created workspace presets)
  const activeModules = allowedModules || ["rate_calc"];

  // Industry brand settings
  let logoText = "GRAIN";
  let displayTitle = "Grain Export";
  let displaySubtitle = "Manager Workspace";

  let calcLabel = "Rate Calculator";
  let inventoryLabel = "Inventory Manager";
  let bagRefLabel = "Bag Price & Stock";

  if ((industry as any) === "tiles") {
    logoText = "TILES";
    displayTitle = "Ceramic Tiles";
    displaySubtitle = "Export Manager";
    calcLabel = "Tile Rate Calculator";
    inventoryLabel = "Tile Stock Board";
    bagRefLabel = "Pallet & Box Reference";
  } else if ((industry as any) === "generic") {
    logoText = "EXPORT";
    displayTitle = "Product Export";
    displaySubtitle = "Manager Workspace";
  } else if ((industry as any) === "spices") {
    logoText = "SPICES";
    displayTitle = "Spices Export";
    displaySubtitle = "Manager Workspace";
    calcLabel = "Spices Rate Calculator";
    inventoryLabel = "Spices Stock Room";
    bagRefLabel = "Bag Price & Stock";
  } else if ((industry as any) === "chemicals") {
    logoText = "CHEM";
    displayTitle = "Chemicals Export";
    displaySubtitle = "Manager Workspace";
    calcLabel = "Chemicals Calc";
    inventoryLabel = "Chemical Inventory";
    bagRefLabel = "Drum & Tote Reference";
  } else if ((industry as any) === "salts") {
    logoText = "SALTS";
    displayTitle = "Salts & Minerals";
    displaySubtitle = "Export Workspace";
    calcLabel = "Salt Rate Calculator";
    inventoryLabel = "Salt Stock Control";
    bagRefLabel = "Bag & Jumbo Reference";
  } else if ((industry as any) === "vegetables_fruits") {
    logoText = "FRESH";
    displayTitle = "Veg & Fruits";
    displaySubtitle = "Export Workspace";
    calcLabel = "Fresh Logistics Calc";
    inventoryLabel = "Cold Room Silo";
    bagRefLabel = "Crates & Carton Spec";
  } else if ((industry as any) === "sugar") {
    logoText = "SUGAR";
    displayTitle = "Sugar Export";
    displaySubtitle = "Manager Workspace";
    calcLabel = "Sugar Rate Calculator";
    inventoryLabel = "Sugar Silo Board";
    bagRefLabel = "Bag Price & Stock";
  } else if ((industry as any) === "metal") {
    logoText = "METAL";
    displayTitle = "Metal & Scrap";
    displaySubtitle = "Export Workspace";
    calcLabel = "Metal Rate Calculator";
    inventoryLabel = "Metal Ingot Stock";
    bagRefLabel = "Strapping & Pack Ref";
  } else if ((industry as any) === "nuts") {
    logoText = "NUTS";
    displayTitle = "Nuts & Cashews";
    displaySubtitle = "Export Workspace";
    calcLabel = "Nuts Rate Calculator";
    inventoryLabel = "Nuts Stock Board";
    bagRefLabel = "Pouches & Carton Ref";
  } else if ((industry as any) === "pharma") {
    logoText = "PHARMA";
    displayTitle = "Pharmaceuticals";
    displaySubtitle = "Export Workspace";
    calcLabel = "Pharma Rate Calculator";
    inventoryLabel = "Pharma Stock Board";
    bagRefLabel = "Packaging & Consumables Ref";
  } else if ((industry as any) === "oil") {
    logoText = "OIL";
    displayTitle = "Palm & Edible Oils";
    displaySubtitle = "Export Workspace";
    calcLabel = "Oil Rate Calculator";
    inventoryLabel = "Tank & Storage Board";
    bagRefLabel = "Packaging & Tanks Ref";
  }

  // Define potential menu items with module gates
  const baseMenuItems = [
    ...(isViren
      ? [
          {
            id: "dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            category: "Tools",
          },
        ]
      : []),
    {
      id: "calc",
      label: calcLabel,
      icon: Calculator,
      category: "Tools",
      requiredModule: "rate_calc",
    },
    {
      id: "rates",
      label: "Rate List Board",
      icon: ListOrdered,
      category: "Tools",
      badge: rateCount,
      requiredModule: "rate_calc",
    },
    {
      id: "social_board",
      label: "Social Rate Board",
      icon: Share2,
      category: "Tools",
      requiredModule: "social_rate_list",
    },
    {
      id: "inventory",
      label: inventoryLabel,
      icon: Package,
      category: "Tools",
      requiredModule: "grain_inventory",
    },
    {
      id: "trade_intel",
      label: "Trade Intelligence API",
      icon: Globe,
      category: "Tools",
      requiredModule: "trade_intelligence",
    },
    {
      id: "bags",
      label: bagRefLabel,
      icon: ShoppingBag,
      category: "Reference",
      requiredModule: "bag_price_stock",
    },
    {
      id: "expenses",
      label: "CFS & Transport",
      icon: Truck,
      category: "Reference",
    },
    ...(isViren
      ? [
          {
            id: "dohaimport",
            label: "Doha Import",
            icon: Coins,
            category: "Reference",
          },
        ]
      : []),
    ...(isViren
      ? [
          {
            id: "master_admin",
            label: "A to Z Master Config",
            icon: LayoutDashboard,
            category: "Config",
          },
          {
            id: "profit_loss",
            label: "Profit / Loss Metrics",
            icon: DollarSign,
            category: "Config",
          },
        ]
      : []),
    {
      id: "quote",
      label: "Quote Sheet",
      icon: FileSpreadsheet,
      category: "Export",
      requiredModule: "pi_ci_generation",
    },
    // { id: 'marketing', label: 'Pitch Deck & Video', icon: Play, category: 'Export' },
    {
      id: "savedquotes",
      label: "SHIP DOCS & SAVED QUOTES",
      icon: BookmarkCheck,
      category: "Export",
      badge: savedQuotesCount,
      requiredModule: "quote_saving",
    },
    {
      id: "payment_tracker",
      label: "Payment Tracking",
      icon: DollarSign,
      category: "Export",
    },
    // { id: 'tracker', label: 'Live Cargo Tracker', icon: Globe, category: 'Export', requiredModule: 'shipping_tracking' },
    {
      id: "docs_drive",
      label: "EXPORTPRODOCS Drive",
      icon: Cloud,
      category: "Export",
    },
    ...(isViren
      ? [
          {
            id: "training",
            label: "Training & Setup Guide",
            icon: Play,
            category: "Config",
          },
        ]
      : []),
    { id: "licence", label: "Licence & Teams", icon: Key, category: "Config" },
    ...(isViren
      ? [
          {
            id: "saas_preview",
            label: "SaaS Marketing Site",
            icon: Globe,
            category: "Config",
          },
        ]
      : []),
    { id: "settings", label: "Settings", icon: Settings, category: "Config" },
  ];

  // Filter based on admin permissions / user preference toggles
  const menuItems = baseMenuItems
    .filter((item) => {
      // If the module has been disabled by the user or is not in activeModules, completely hide it
      if (item.requiredModule) {
        return activeModules.includes(item.requiredModule);
      }
      return true;
    })
    .map((item) => {
      const isLocked = item.requiredModule
        ? !activeModules.includes(item.requiredModule)
        : false;
      return { ...item, isLocked };
    });

  // Group by categories
  const categories = ["Tools", "Reference", "Export", "Config"];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-gray-200 shadow-sm transition-all duration-300 z-30 select-none shrink-0 print:hidden ${
          sidebarPinned ? "w-64" : "w-16"
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-blue-700 to-blue-800 text-white overflow-hidden relative">
          <div className="flex items-center gap-3">
            {licenceMetadata?.logoBase64 ? (
              <img
                src={licenceMetadata.logoBase64}
                alt="Brand Logo"
                className="max-h-8 max-w-10 object-contain bg-white rounded p-0.5 shrink-0"
              />
            ) : (
              <span className="font-extrabold text-xs tracking-wider bg-white/20 px-2 py-1 rounded shrink-0">
                {logoText}
              </span>
            )}
            {sidebarPinned && (
              <div className="leading-tight">
                <div className="text-[9px] uppercase tracking-widest font-mono text-blue-200">
                  Cloud Control
                </div>
                <h1 className="text-sm font-black text-white">
                  {displayTitle}
                </h1>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarPinned(!sidebarPinned)}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded transition absolute right-2 top-3"
            title={sidebarPinned ? "Collapse sidebar" : "Pin sidebar open"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Core */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-4 px-2">
          {activeIndustries.map((ind) => {
            const isIndustryActive = (industry as any) === ind;
            return (
              <div key={ind} className="space-y-1">
                {sidebarPinned ? (
                  <div 
                    className={`flex items-center justify-between px-3 py-2 mb-1 rounded-lg cursor-pointer transition-colors ${isIndustryActive ? 'bg-gradient-to-r from-blue-700 to-blue-800 shadow text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    onClick={() => setActiveIndustry && setActiveIndustry(ind)}
                  >
                    <span className="text-[12px] font-black uppercase tracking-wider">{getIndustryTitle(ind)}</span>
                  </div>
                ) : (
                  <div 
                    className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center cursor-pointer ${isIndustryActive ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500'}`}
                    onClick={() => setActiveIndustry && setActiveIndustry(ind)}
                  >
                    <span className="text-sm">{getIndustryTitle(ind).split(' ')[0]}</span>
                  </div>
                )}
                
                {isIndustryActive && categories.map((cat) => {
                  const catItems = menuItems.filter((item) => item.category === cat);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-0.5 mt-2 mb-4">
                      {sidebarPinned && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 block mb-1">
                          {cat}
                        </span>
                      )}
                      {catItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (setActiveIndustry) setActiveIndustry(ind);
                              setActiveTab(item.id);
                            }}
                            className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-xs font-semibold transition-all relative ${
                              isActive
                                ? "bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600 pl-2"
                                : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 pl-3"
                            }`}
                            title={item.label}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-700" : "text-gray-400"}`}
                            />
                            {sidebarPinned && (
                              <span className="truncate flex-1 text-left flex items-center gap-1.5 justify-between">
                                <span>{item.label}</span>
                                {item.isLocked && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                              </span>
                            )}
                            {sidebarPinned && item.badge !== undefined && item.badge > 0 && !item.isLocked && (
                                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 font-mono font-bold rounded text-[10px] mr-2">
                                  {item.badge}
                                </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* FREE TIER USAGE INDICATOR */}
        {sidebarPinned && (licenceMetadata?.planId === "free" || licenceMetadata?.approved === false) && (
          <div className="mx-3 my-2 p-3 rounded-xl border bg-slate-50 border-gray-100 space-y-2 select-none animate-in fade-in duration-200">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-500">
              <span>Free Tier Limits</span>
              <span className="text-indigo-600 font-extrabold">Active</span>
            </div>
            
            <div className="space-y-1.5 text-[11px] font-sans font-medium text-gray-700">
              <div className="flex justify-between items-center">
                <span>Calculations:</span>
                <span className={`font-mono font-bold ${(licenceMetadata?.freeTierCalcsThisMonth || 0) >= 4 ? "text-rose-600 font-black" : (licenceMetadata?.freeTierCalcsThisMonth || 0) >= 3 ? "text-amber-600 font-black" : "text-gray-800"}`}>
                  {licenceMetadata?.freeTierCalcsThisMonth || 0} / 4
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    (licenceMetadata?.freeTierCalcsThisMonth || 0) >= 4 
                      ? "bg-rose-500" 
                      : (licenceMetadata?.freeTierCalcsThisMonth || 0) >= 3 
                      ? "bg-amber-500" 
                      : "bg-indigo-500"
                  }`} 
                  style={{ width: `${Math.min(100, ((licenceMetadata?.freeTierCalcsThisMonth || 0) / 4) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <span>Saved Quotes:</span>
                <span className={`font-mono font-bold ${savedQuotesCount >= 2 ? "text-rose-600 font-black" : "text-gray-800"}`}>
                  {savedQuotesCount} / 2
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${savedQuotesCount >= 2 ? "bg-rose-500" : "bg-indigo-500"}`} 
                  style={{ width: `${Math.min(100, (savedQuotesCount / 2) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <span>Documents Saved:</span>
                <span className={`font-mono font-bold ${docsCountThisMonth >= 4 ? "text-rose-600 font-black" : docsCountThisMonth >= 3 ? "text-amber-600 font-black" : "text-gray-800"}`}>
                  {docsCountThisMonth} / 4
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    docsCountThisMonth >= 4 
                      ? "bg-rose-500" 
                      : docsCountThisMonth >= 3 
                      ? "bg-amber-500" 
                      : "bg-indigo-500"
                  }`} 
                  style={{ width: `${Math.min(100, (docsCountThisMonth / 4) * 100)}%` }}
                />
              </div>
            </div>

            {((licenceMetadata?.freeTierCalcsThisMonth || 0) >= 3 || savedQuotesCount >= 2 || docsCountThisMonth >= 3) && (
              <button
                type="button"
                onClick={() => setActiveTab("licence")}
                className="w-full py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 text-amber-800 font-black text-[9px] uppercase tracking-wider rounded-lg text-center transition cursor-pointer"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        )}

        {/* Footer info in desktop */}
        <div className="p-3 border-t border-gray-100 text-[10px] text-gray-400 font-mono leading-tight space-y-2">
          {sidebarPinned ? (
            <>
              {userEmail && (
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[9px] uppercase tracking-wider text-gray-500 font-black">
                      Logged In
                    </p>
                    <p className="text-[10px] text-gray-700 truncate font-semibold leading-tight">
                      {userEmail}
                    </p>
                    {activeTenantId && (
                      <div className="mt-1">
                        <span className="text-[8px] bg-teal-50 text-teal-700 border border-teal-100 px-1 py-0.5 rounded font-mono font-bold font-black inline-block">
                          KEY: {activeTenantId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-emerald-600 font-black">
                  ● Live cloud
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5"
                    title="Sign out of workspace"
                  >
                    <LogOut className="w-3 h-3" /> Sign Out
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-emerald-500 font-bold">●</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-rose-500 hover:text-rose-700"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER & HORIZONTAL NAVIGATION BAR */}
      <div className="md:hidden sticky top-0 bg-white border-b border-gray-200 z-40 shadow-xs flex flex-col print:hidden">
        {/* Tiny top brand stripe */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-700 to-blue-800 text-white h-11">
          <div className="flex items-center gap-2">
            {licenceMetadata?.logoBase64 ? (
              <img
                src={licenceMetadata.logoBase64}
                alt="Brand"
                className="max-h-6 max-w-[40px] shrink-0 object-contain bg-white rounded p-px"
              />
            ) : (
              <span className="font-extrabold text-[9px] bg-white/20 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                {logoText}
              </span>
            )}
            <span className="text-xs font-bold leading-none">
              {displayTitle} {displaySubtitle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="flex flex-col text-right leading-none select-none">
                <span className="text-[9px] text-blue-100 italic max-w-28 truncate">
                  {userEmail}
                </span>
                {activeTenantId && (
                  <span className="text-[7.5px] text-emerald-300 font-mono scale-95 origin-right mt-0.5 font-bold">
                    ID: {activeTenantId}
                  </span>
                )}
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-rose-200 hover:text-white flex items-center gap-1 font-bold text-[10px] border border-white/20 px-1.5 py-0.5 rounded"
              >
                <LogOut className="w-3 h-3" /> Log Out
              </button>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Scroll Tab bar */}
        <div className="overflow-x-auto scrollbar-none flex items-center bg-white">
          <div className="flex divide-x divide-gray-100 shrink-0 min-w-full">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center py-2 px-3 text-center min-w-[76px] transition-all relative select-none ${
                    isActive
                      ? "text-blue-700 bg-blue-50/50 font-bold border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-blue-600"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mb-0.5 ${isActive ? "text-blue-700 font-bold" : "text-gray-400"}`}
                  />
                  <span className="text-[9.5px] tracking-tight leading-none truncate w-16 flex items-center justify-center gap-0.5">
                    <span>{item.label}</span>
                    {item.isLocked && (
                      <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    )}
                  </span>
                  {item.badge !== undefined &&
                    item.badge > 0 &&
                    !item.isLocked && (
                      <span className="absolute top-1.5 right-1.5 bg-blue-100 text-blue-800 text-[8px] font-extrabold px-1 rounded-full font-mono scale-90">
                        {item.badge}
                      </span>
                    )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
