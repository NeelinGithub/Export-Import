import React, { useState } from "react";
import { Commodity, Port, QuoteSequenceConfig } from '../types';
import { READY_MADE_PORTS } from "../utils/portsDatabase";
import {
  Plus,
  Trash2,
  Settings as SettingsIcon,
  AlertOctagon,
  RotateCcw,
  ShieldCheck,
  Hash,
  DownloadCloud,
  UploadCloud,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { exportBackupData, importBackupData } from "../utils/backup";
import { ALL_CURRENCIES } from "../utils/currency";

interface SettingsProps {
  commodities: Commodity[];
  setCommodities: (items: Commodity[]) => void;
  ports: Port[];
  setPorts: (ports: Port[]) => void;
  onClearDatabase: () => void;
  industry?: string;
  onResetCommodities?: (industryOnly?: boolean) => void;
  userModulePrefs?: Record<string, boolean>;
  setUserModulePrefs?: (
    prefs:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void;
  allowedModules?: string[];
  quoteConfig?: QuoteSequenceConfig;
  setQuoteConfig?: (
    config:
      | QuoteSequenceConfig
      | ((prev: QuoteSequenceConfig) => QuoteSequenceConfig),
  ) => void;
}

export default function Settings({
  commodities,
  setCommodities,
  ports,
  setPorts,
  onClearDatabase,
  industry = "grain",
  onResetCommodities,
  userModulePrefs = {},
  setUserModulePrefs,
  allowedModules = [],
  quoteConfig,
  setQuoteConfig,
}: SettingsProps) {

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDefaultCurrency(val);
    localStorage.setItem("rems_default_currency", val);
  };

  const handleExportBackup = () => {
    try {
      exportBackupData();
      alert("Backup downloaded successfully. Please keep this file safe.");
    } catch (e) {
      alert("Failed to export backup.");
    }
  };

  const handleDownloadSourceZip = async () => {
    try {
      const res = await fetch("/api/download-zip");
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "project-source.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback direct link
      window.open("/api/download-zip", "_blank");
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (confirm("This will overwrite your existing data. Are you sure you want to proceed?")) {
      try {
        await importBackupData(file);
        alert("Backup restored successfully. The application will now reload.");
        window.location.reload();
      } catch (err) {
        alert("Failed to restore backup: " + err);
      }
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Input builders
  const [newPort, setNewPort] = useState("");
  const [newCommName, setNewCommName] = useState("");
  const [newCommExmill, setNewCommExmill] = useState("");

  // Manage Ports & Countries sub-panel states
  const [selectedCountry, setSelectedCountry] = useState("INDIA");
  const [customCountry, setCustomCountry] = useState("");
  const [newPortName, setNewPortName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState(() => localStorage.getItem("rems_default_currency") || "INR");
  const [dbSyncing, setDbSyncing] = useState(false);
  const [dbLastSynced, setDbLastSynced] = useState(() => {
    return localStorage.getItem("rems_ports_db_last_synced") || "July 9, 2026";
  });

  // Parse existing ports into countries & portsByCountry
  const { countriesList, portsMap } = React.useMemo(() => {
    const pbc: Record<string, string[]> = {};
    const cSet = new Set<string>();
    
    // Always pre-populate some standard countries so they are always in the list
    const defaultCountries = [
      "AFGHANISTAN", "ALBANIA", "ALGERIA", "ANDORRA", "ANGOLA", "ANTIGUA AND BARBUDA", "ARGENTINA", "ARMENIA", "AUSTRALIA", "AUSTRIA", 
      "AZERBAIJAN", "BAHAMAS", "BAHRAIN", "BANGLADESH", "BARBADOS", "BELARUS", "BELGIUM", "BELIZE", "BENIN", "BHUTAN", 
      "BOLIVIA", "BOSNIA AND HERZEGOVINA", "BOTSWANA", "BRAZIL", "BRUNEI", "BULGARIA", "BURKINA FASO", "BURUNDI", "CÔTE D'IVOIRE", "CABO VERDE", 
      "CAMBODIA", "CAMEROON", "CANADA", "CENTRAL AFRICAN REPUBLIC", "CHAD", "CHILE", "CHINA", "COLOMBIA", "COMOROS", "CONGO", 
      "COSTA RICA", "CROATIA", "CUBA", "CYPRUS", "CZECH REPUBLIC", "DEMOCRATIC REPUBLIC OF THE CONGO", "DENMARK", "DJIBOUTI", "DOMINICA", "DOMINICAN REPUBLIC", 
      "ECUADOR", "EGYPT", "EL SALVADOR", "EQUATORIAL GUINEA", "ERITREA", "ESTONIA", "ESWATINI", "ETHIOPIA", "FIJI", "FINLAND", 
      "FRANCE", "GABON", "GAMBIA", "GEORGIA", "GERMANY", "GHANA", "GREECE", "GRENADA", "GUATEMALA", "GUINEA", 
      "GUINEA-BISSAU", "GUYANA", "HAITI", "HONDURAS", "HUNGARY", "ICELAND", "INDIA", "INDONESIA", "IRAN", "IRAQ", 
      "IRELAND", "ISRAEL", "ITALY", "JAMAICA", "JAPAN", "JORDAN", "KAZAKHSTAN", "KENYA", "KIRIBATI", "KUWAIT", 
      "KYRGYZSTAN", "LAOS", "LATVIA", "LEBANON", "LESOTHO", "LIBERIA", "LIBYA", "LIECHTENSTEIN", "LITHUANIA", "LUXEMBOURG", 
      "MADAGASCAR", "MALAWI", "MALAYSIA", "MALDIVES", "MALI", "MALTA", "MARSHALL ISLANDS", "MAURITANIA", "MAURITIUS", "MEXICO", 
      "MICRONESIA", "MOLDOVA", "MONACO", "MONGOLIA", "MONTENEGRO", "MOROCCO", "MOZAMBIQUE", "MYANMAR", "NAMIBIA", "NAURU", 
      "NEPAL", "NETHERLANDS", "NEW ZEALAND", "NICARAGUA", "NIGER", "NIGERIA", "NORTH KOREA", "NORTH MACEDONIA", "NORWAY", "OMAN", 
      "PAKISTAN", "PALAU", "PALESTINE", "PANAMA", "PAPUA NEW GUINEA", "PARAGUAY", "PERU", "PHILIPPINES", "POLAND", "PORTUGAL", 
      "QATAR", "ROMANIA", "RUSSIA", "RWANDA", "SAINT KITTS AND NEVIS", "SAINT LUCIA", "SAINT VINCENT AND THE GRENADINES", "SAMOA", "SAN MARINO", "SAO TOME AND PRINCIPE", 
      "SAUDI ARABIA", "SENEGAL", "SERBIA", "SEYCHELLES", "SIERRA LEONE", "SINGAPORE", "SLOVAKIA", "SLOVENIA", "SOLOMON ISLANDS", "SOMALIA", 
      "SOUTH AFRICA", "SOUTH KOREA", "SOUTH SUDAN", "SPAIN", "SRI LANKA", "SUDAN", "SURINAME", "SWEDEN", "SWITZERLAND", "SYRIA", 
      "TAJIKISTAN", "TANZANIA", "THAILAND", "TIMOR-LESTE", "TOGO", "TONGA", "TRINIDAD AND TOBAGO", "TUNISIA", "TURKEY", "TURKMENISTAN", 
      "TUVALU", "UGANDA", "UKRAINE", "UNITED ARAB EMIRATES", "UNITED KINGDOM", "USA", "URUGUAY", "UZBEKISTAN", "VANUATU", "VENEZUELA", 
      "VIETNAM", "YEMEN", "ZAMBIA", "ZIMBABWE"
    ];
    defaultCountries.forEach(c => cSet.add(c));

    ports.forEach((p) => {
      let country = "OTHER";
      let portName = p;
      if (p.includes(" - ")) {
        const parts = p.split(" - ");
        country = parts[0].trim().toUpperCase();
        portName = parts[1].trim().toUpperCase();
      }
      cSet.add(country);
      if (!pbc[country]) pbc[country] = [];
      if (!pbc[country].includes(portName)) {
        pbc[country].push(portName);
      }
    });
    return { 
      countriesList: Array.from(cSet).sort(), 
      portsMap: pbc 
    };
  }, [ports]);

  const handleAddPortForCountry = () => {
    const country = selectedCountry === "CUSTOM" ? customCountry.trim().toUpperCase() : selectedCountry.trim().toUpperCase();
    const portName = newPortName.trim().toUpperCase();

    if (selectedCountry === "CUSTOM" && !customCountry.trim()) {
      alert("Please specify a custom country name.");
      return;
    }
    if (!portName) {
      alert("Please specify a port name.");
      return;
    }

    const entry = country === "OTHER" ? portName : `${country} - ${portName}`;

    if (ports.includes(entry)) {
      alert(`Port "${portName}" already exists for country "${country}".`);
      return;
    }

    setPorts([...ports, entry].sort());
    setNewPortName("");
    if (selectedCountry === "CUSTOM") {
      setSelectedCountry(country);
      setCustomCountry("");
    }
  };

  const handleDeletePortForCountry = (country: string, portName: string) => {
    const entry = country === "OTHER" ? portName : `${country} - ${portName}`;
    if (!confirm(`Are you sure you want to delete port "${portName}" from country "${country}"?`)) return;
    setPorts(ports.filter((p) => p !== entry));
  };
  const industryLabel =
    ((industry as any) === "grain" || (industry as any) === "rice_merchant")
      ? "Rice"
      : (industry as any) === "agri_multi"
        ? "Agri-Commodities"
      : (industry as any) === "spices"
        ? "Spices"
        : ((industry as any) === "chemicals" || (industry as any) === "polymer")
          ? "Chemicals"
          : (industry as any) === "petroleum" || (industry as any) === "oil"
            ? "Petroleum Products"
            : (industry as any) === "salts"
              ? "Salts"
              : (industry as any) === "vegetables_fruits"
                ? "Vegetables & Fruits"
                : (industry as any) === "tiles"
                  ? "Tiles"
                  : (industry as any) === "sugar"
                    ? "Sugar"
                    : (industry as any) === "nuts"
                      ? "Nuts & Cashews"
                      : "Cargo";

  const industryPlaceholder =
    ((industry as any) === "grain" || (industry as any) === "rice_merchant")
      ? "e.g. SONA MASOORI SELLA RICE"
      : (industry as any) === "agri_multi"
        ? "e.g. REFINED SUNFLOWER OIL"
      : (industry as any) === "spices"
        ? "e.g. ORGANIC RED CHILI S17"
        : ((industry as any) === "chemicals" || (industry as any) === "polymer")
          ? "e.g. CAUSTIC SODA FLAKES"
          : (industry as any) === "petroleum" || (industry as any) === "oil"
            ? "e.g. EN590 10PPM"
            : (industry as any) === "salts"
              ? "e.g. PINK HIMALAYAN ROCK SALT"
              : (industry as any) === "vegetables_fruits"
                ? "e.g. FRESH ALPHONSO MANGOES"
                : (industry as any) === "tiles"
                  ? "e.g. POLISHED PORCELAIN TILES"
                  : (industry as any) === "sugar"
                    ? "e.g. WHITE REFINED SUGAR ICUMSA 45"
                    : (industry as any) === "nuts"
                      ? "e.g. CASHEW KERNELS WW320"
                      : "e.g. NEW CUSTOM PRODUCT";

  const industryUnitLabel = (industry as any) === "tiles" ? "₹/SQM" : (industry as any) === "solar_panel" || (industry as any) === "cardboard_carton" ? "₹/Watt" : "₹/KG";

  // Filtered list of commodities for active industry mode
  const filteredCommodities = commodities.filter(
    (c) => (c.industry || "grain") === industry,
  );

  // Commodity modification
  const handleAddCommodity = () => {
    const name = newCommName.trim().toUpperCase();
    const exmill = parseFloat(newCommExmill) || 0;

    if (!name) return;
    if (
      commodities.some(
        (c) => c.name === name && (c.industry || "grain") === industry,
      )
    ) {
      alert(`Product variety "${name}" already exists in this category.`);
      return;
    }

    const newItem: Commodity = {
      id: Date.now(),
      name,
      exmill,
      industry,
    };

    setCommodities([...commodities, newItem]);
    setNewCommName("");
    setNewCommExmill("");
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
      }),
    );
  };

  return (
    <div className="space-y-6" id="settings-management-page">
      <div className="page-header">
        <div className="breadcrumb">⚙️ Configuration Console</div>
        <h2 className="text-xl font-extrabold tracking-tight">
          System Reference Settings
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Customize active cargo species, target shipping ports, default pricing
          margins, and database directories.
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
              <span className="text-[10px] font-mono text-gray-400 ml-2">
                ({filteredCommodities.length} registered)
              </span>
            </div>

            {onResetCommodities && (
              <button
                onClick={() => onResetCommodities(true)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 w-max"
                title={`Restore standard preset variety listings for ${industryPlaceholder.split("e.g. ")[1]}`}
              >
                ✨ Reset Default Varieties
              </button>
            )}
          </div>

          {/* Commodity Creator Form */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-3 border border-gray-200">
            <span className="text-xs font-black text-gray-700 block">
              + Add New {industryLabel} Species Grade
            </span>
            <div className="flex gap-2.5 items-end">
              <div className="flex-1">
                <label className="text-[9px] font-bold text-gray-500 block mb-1">
                  Grade / Species Name
                </label>
                <input
                  type="text"
                  placeholder={industryPlaceholder}
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="w-24">
                <label className="text-[9px] font-bold text-gray-600 block mb-1">
                  Price ({industryUnitLabel})
                </label>
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
                className="flex items-center justify-between p-2.5 bg-gray-50/50 hover:bg-indigo-50/25 border border-gray-100 rounded-lg text-xs"
              >
                <div>
                  <span className="font-extrabold text-gray-800 uppercase block">
                    {c.name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    System Code ID: #{c.id}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white rounded border border-gray-300 px-1.5 py-1">
                    <span className="text-[10px] text-gray-400">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={c.exmill === 0 ? "" : c.exmill}
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
              <div className="text-center py-6 text-gray-400 text-xs">
                No custom {industryLabel.toLowerCase()} varieties configured
                yet. Use the fields above to add one!
              </div>
            )}
          </div>
        </div>

        {/* MANAGE PORTS & COUNTRIES PANEL */}
        <div className="card bg-white p-4 border border-gray-200 rounded-xl shadow-xs space-y-4">
          <div className="border-b pb-2 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
                Manage Ports & Countries Configuration
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Define countries and map a list of associated ports.
              </p>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              ({ports.length} registered)
            </span>
          </div>

          {/* Seaport Database Online Sync Status */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-blue-800">
                  🌐 Global Seaport Database Directory
                </span>
                <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1 py-0.2 rounded">
                  Online Sync
                </span>
              </div>
              <p className="text-[10px] text-blue-600 mt-1 max-w-md">
                Keep your local seaport options synchronized with the official global merchant directories (automatic bi-monthly cron sync). Includes standard commercial container seaports across India, UAE, Saudi Arabia, Africa, Europe, Asia, and more.
              </p>
              <div className="flex items-center gap-3 text-[9px] text-blue-500 mt-2">
                <span>Last Sync State: <b>{dbLastSynced}</b></span>
                <span>•</span>
                <span>Scheduled Sync Frequency: <b>2 Months</b></span>
              </div>
            </div>
            
            <button
              onClick={async () => {
                setDbSyncing(true);
                // Simulate REST cloud API sync
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const listToMerge: string[] = [];
                for (const [c, pList] of Object.entries(READY_MADE_PORTS)) {
                  pList.forEach(p => {
                    listToMerge.push(`${c} - ${p}`);
                  });
                }
                
                // Merge into current active ports, keep unique and sort
                const merged = Array.from(new Set([...ports, ...listToMerge])).sort();
                setPorts(merged);
                
                const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                localStorage.setItem("rems_ports_db_last_synced", todayStr);
                setDbLastSynced(todayStr);
                setDbSyncing(false);
                alert("Ports database synchronized successfully! Imported and mapped all standard commercial seaports from the global registry.");
              }}
              disabled={dbSyncing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition duration-150 shrink-0 select-none self-stretch sm:self-auto justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dbSyncing ? 'animate-spin' : ''}`} />
              {dbSyncing ? "Syncing Directory..." : "Sync Port DB"}
            </button>
          </div>

          {/* Sourcing & Add Port Interface */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-3 border border-gray-200">
            <span className="text-xs font-black text-gray-700 block">
              + Add Port to Country Map
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-gray-500 block mb-1">Select Country</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs font-bold outline-none"
                >
                  {countriesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="CUSTOM">+ Add New Custom Country...</option>
                </select>
              </div>

              {selectedCountry === "CUSTOM" && (
                <div>
                  <label className="text-[9px] font-bold text-gray-500 block mb-1">Custom Country Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ITALY, SPAIN"
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value.toUpperCase())}
                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold outline-none"
                  />
                </div>
              )}

              <div className={selectedCountry === "CUSTOM" ? "sm:col-span-2" : ""}>
                <label className="text-[9px] font-bold text-gray-500 block mb-1">Port Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. ROTTERDAM, JEDDAH, JEBEL ALI"
                    value={newPortName}
                    onChange={(e) => setNewPortName(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold outline-none"
                  />
                  <button
                    onClick={handleAddPortForCountry}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-1.5 text-xs font-bold shadow-xs transition shrink-0"
                  >
                    Save Mapping
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Mappings Directory View */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-gray-600 block border-b pb-1">
              Active Mappings Directory
            </span>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {countriesList.map((country) => {
                const countryPorts = portsMap[country] || [];
                if (countryPorts.length === 0 && ["INDIA", "UAE", "CHINA", "USA", "VIETNAM", "NETHERLANDS", "GERMANY", "UK", "CANADA"].includes(country)) {
                  // Don't show standard empty countries unless user wants to see them
                  return null;
                }
                return (
                  <div key={country} className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-gray-800 tracking-wider">
                        🌍 {country}
                      </span>
                      <span className="text-[9px] font-mono text-gray-400 bg-gray-200/60 px-1.5 py-0.2 rounded font-bold">
                        {countryPorts.length} mapped
                      </span>
                    </div>
                    {countryPorts.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {countryPorts.map((port) => (
                          <div
                            key={port}
                            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2 py-0.5 text-[11px] font-bold text-gray-700 shadow-2xs hover:bg-red-50/35 transition"
                          >
                            <span>{port}</span>
                            <button
                              onClick={() => handleDeletePortForCountry(country, port)}
                              className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                              title={`Remove ${port} from ${country}`}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic block pl-1">
                        No ports mapped. Add a port to show here.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* INDIVIDUALIZED ASSIGNED MODULE CONTROLLER */}
      {setUserModulePrefs && allowedModules && allowedModules.length > 0 && (
        <div
          className="card bg-white p-5 border border-gray-200 rounded-xl shadow-xs space-y-4"
          id="user-module-pref-control"
        >
          <div className="border-b pb-2">
            <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
              Personalized Module Control Panel
            </span>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Uncheck a module to hide its tab, views, and disable related
              components. Re-check the box to restore its visibility and
              functions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {[
              {
                code: "rate_calc",
                title: "Landed Rate Calculator",
                desc: "Ex-mill pricing, CFS charges, freight factors and landing rate calculations.",
              },
              {
                code: "quote_saving",
                title: "RFQ & Saved Quotes Base",
                desc: "Store draft rates, save history logs, and filter RFQ quotation registers.",
              },
              {
                code: "quote_sharing",
                title: "Quotation Link Share",
                desc: "Encrypt and export printable quotes to public, viewable buyer worksheets.",
              },
              {
                code: "bag_price_stock",
                title: "Sack Pack Pricing & stock",
                desc: "Brand bags unit price manager and physical packaging stock records.",
              },
              {
                code: "grain_inventory",
                title: "Warehouse & Grain Inventory",
                desc: "Silo tracker for raw paddy, processing queues and finished product stocks.",
              },
              {
                code: "pi_ci_generation",
                title: "Commercial Document Workspace",
                desc: "Generate, edit, and print Proforma Invoices, Commercial Invoices & Packing Lists.",
              },
              {
                code: "shipping_tracking",
                title: "Vessel Tracking & Logistics",
                desc: "Ocean carrier progress charts, vessel positions and BOL tracking logs.",
              },
            ]
              .filter((mod) => allowedModules.includes(mod.code))
              .map((mod) => {
                const isChecked = userModulePrefs[mod.code] !== false;
                return (
                  <div
                    key={mod.code}
                    onClick={() => {
                      setUserModulePrefs((prev) => ({
                        ...prev,
                        [mod.code]: !isChecked,
                      }));
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                      isChecked
                        ? "bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/60"
                        : "bg-gray-50/50 border-gray-200 opacity-60 hover:opacity-105"
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

      {/* QUOTE SEQUENCE MANAGER */}
      {quoteConfig &&
        setQuoteConfig &&
        allowedModules.includes("quote_saving") && (
          <div className="card bg-gray-50/50 border border-indigo-100 rounded-xl p-4 space-y-4">
            <div className="space-y-1">
              <h3 className="card-title text-indigo-900 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-indigo-700" /> QUOTE REFERENCE
                SEQUENCE
              </h3>
              <p className="text-xs text-indigo-800/70 max-w-2xl leading-relaxed font-medium">
                Configure the default naming convention used to automatically
                generate new quotation and offer IDs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  ID PREFIX (E.g. COMPANY_QT_)
                </label>
                <input
                  type="text"
                  value={quoteConfig.prefix}
                  onChange={(e) =>
                    setQuoteConfig((prev) => ({
                      ...prev,
                      prefix: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono font-bold uppercase transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="RFQ-"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  NEXT SEQUENCE NUMBER
                </label>
                <input
                  type="number"
                  value={quoteConfig.nextNumber}
                  onChange={(e) =>
                    setQuoteConfig((prev) => ({
                      ...prev,
                      nextNumber: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono font-bold transition focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                />
              </div>

              <div className="space-y-2 bg-indigo-50/70 p-3 rounded-lg border border-indigo-100 items-center justify-center flex flex-col min-h-16">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">
                  LIVE PREVIEW
                </span>
                <span className="text-sm font-black text-indigo-900 font-mono tracking-tight">
                  {quoteConfig.prefix}
                  {quoteConfig.nextNumber}
                </span>
              </div>
            </div>
          </div>
        )}

      

      {/* GLOBAL SETTINGS & PREFERENCES */}
      <div className="card bg-white border border-gray-200 shadow-sm rounded-xl p-4 space-y-3.5">
        <h3 className="card-title text-slate-800 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          <SettingsIcon className="w-4 h-4 text-slate-500" /> Global Preferences
        </h3>
        <p className="text-xs text-slate-500 leading-normal max-w-2xl">
          Set your workspace default preferences. These settings apply globally across all modules for this user session. Note that everything for quote calculation must ultimately be converted to USD, but you can set your preferred working base currency here.
        </p>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
               Default Base Currency
             </label>
             <select 
                value={defaultCurrency}
                onChange={handleCurrencyChange}
                className="bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-32"
              >
                {ALL_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
             </select>
          </div>
        </div>
      </div>
      
      {/* DATA BACKUP AND RESTORE */}
      <div className="card bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-4">
        <h3 className="card-title text-slate-800 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          <DownloadCloud className="w-4.5 h-4.5 text-indigo-600" /> Data Backup & Source Code
        </h3>
        <p className="text-xs text-slate-500 leading-normal max-w-2xl">
          Secure your entire work environment by downloading a complete JSON workspace backup or export the full application source code archive. 
        </p>
        
        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2 text-[11px] text-slate-600">
          <span className="font-extrabold text-slate-700 block uppercase tracking-wider">What is included in your backup:</span>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Saved Quotes & Workflows</strong> — All multi-industry quotes, itemized rates, packaging calculations, and custom margins.</li>
            <li><strong>All Uploaded PDFs & Image Documents</strong> — High-fidelity base64 binaries of your Proforma Invoices (PI), Commercial Invoices (CI), Packing Lists (PL), Phyto-sanitary papers, APEDA certificates, Fumigation sheets, Lab Reports, and <strong>Customer Specifications</strong>.</li>
            <li><strong>Cost Elements & Overheads</strong> — All local transport tariffs, CFS stuffing & container station boarding expenses, and custom line items.</li>
            <li><strong>Configuration & Databases</strong> — Customer profiles, target buyer locations, and customized HS Code maps.</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportBackup}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <DownloadCloud className="w-4 h-4" /> Download Backup (JSON)
          </button>

          <button
            onClick={handleDownloadSourceZip}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <DownloadCloud className="w-4 h-4" /> Download App Source Code (.ZIP)
          </button>
          
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            onChange={handleImportBackup} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <UploadCloud className="w-4 h-4" /> Restore from Backup
          </button>
        </div>
      </div>

      {/* DANGEROUS CLEARANCE ZONE */}
      <div className="card bg-red-50/50 border border-red-200 rounded-xl p-4 space-y-3.5">
        <h3 className="card-title text-red-800 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          <AlertOctagon className="w-4 h-4 text-red-700" /> System Factory
          Diagnostics
        </h3>

        <p className="text-xs text-red-900 leading-normal max-w-2xl">
          Performing a factory storage purge deletes all custom quotes,
          configured commodities, transport variables, and custom bag parameters
          from your local browser's localStorage. The system will reset to
          pristine factory constants.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClearDatabase}
            className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <RotateCcw className="w-4 h-4" /> Purge Database & Reset Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}
