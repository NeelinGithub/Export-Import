import React, { useState } from 'react';
import { Search, MapPin, Globe, ArrowRight, ArrowDownToLine, Users, Building, ShieldCheck, Mail, Phone, ChevronRight, Activity, TrendingUp, CheckCircle2, Database, FileJson, FileText, Link2, Key, Info } from 'lucide-react';

interface TradeIntelligenceProps {
  industry?: string;
  allowedModules?: string[];
}

export default function TradeIntelligence({ industry = 'grain', allowedModules = [] }: TradeIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<'importers'|'exporters'|'connectors'>('importers');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApiSetup, setShowApiSetup] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  
  type CompanyData = {
    id: number;
    name: string;
    country: string;
    port: string;
    volume: string;
    avgPrice: string;
    contacts: string;
    email: string;
    lastShipment: string;
    status: string;
    blRecords?: { bl: string; date: string; description: string; origin: string; carrier: string; value: string; }[];
  };

  // Mock Data mimicking a platform like Dollar Business
  const mockImporters: CompanyData[] = [
    { id: 1, name: "Global Grain Corp LLC", country: "United Arab Emirates", port: "Jebel Ali", volume: "42,500 MT", avgPrice: "$850/MT", contacts: "采购部 / Purchasing Head", email: "procurement@globalgrain.ae", lastShipment: "12 Days Ago", status: "Verified Buyer" },
    { id: 2, name: "Saif AL-Sultan Trading", country: "Saudi Arabia", port: "Dammam", volume: "18,200 MT", avgPrice: "$1,040/MT", contacts: "Ahmed Al-Sultan", email: "ahmed@sultantrading.sa", lastShipment: "3 Days Ago", status: "Premium Importer" },
    { id: 5, name: "National Food Company", country: "Qatar", port: "Hamad", volume: "9,600 MT", avgPrice: "$1,120/MT", contacts: "Hassan Ali", email: "imports@nationalfood.qa", lastShipment: "1 Week Ago", status: "Verified Buyer",
      blRecords: [
        { bl: "HLCU13359012", date: "2026-06-03", description: "112 MT INDIAN SELLA BASMATI RICE", origin: "MUNDRA (IN)", carrier: "Hapag-Lloyd", value: "$125,440" },
        { bl: "MEDU89212455", date: "2026-05-18", description: "56 MT NON-BASMATI LONG GRAIN", origin: "KANDLA (IN)", carrier: "MSC", value: "$48,160" }
      ]
    },
    { id: 6, name: "Gulf Rice Traders", country: "Saudi Arabia", port: "Jeddah", volume: "22,400 MT", avgPrice: "$1,080/MT", contacts: "Omar Farooq", email: "omar@gulfrice.sa", lastShipment: "2 Days Ago", status: "Verified Buyer" },
    { id: 7, name: "Al Meera Consumer", country: "Qatar", port: "Hamad", volume: "15,000 MT", avgPrice: "$1,000/MT", contacts: "Procurement Desk", email: "rice@almeera.qa", lastShipment: "5 Days Ago", status: "Top Importer",
      blRecords: [
        { bl: "MAEU589134", date: "2026-06-06", description: "250 MT PREMIUM 1121 BASMATI RICE", origin: "MUNDRA (IN)", carrier: "Maersk", value: "$250,000" },
        { bl: "CMDU881240", date: "2026-05-22", description: "125 MT PARBOILED RICE (5% BROKEN)", origin: "KARACHI (PK)", carrier: "CMA CGM", value: "$95,000" }
      ]
    },
    { id: 8, name: "Oman Flour Mills", country: "Oman", port: "Sohar", volume: "5,500 MT", avgPrice: "$950/MT", contacts: "Salem Said", email: "salem@omanflour.om", lastShipment: "2 Weeks Ago", status: "Standard" },
    { id: 3, name: "Pacific Rice Imports Ltd", country: "Singapore", port: "Singapore", volume: "7,800 MT", avgPrice: "$620/MT", contacts: "Lee Wei", email: "imports@pacificrice.sg", lastShipment: "45 Days Ago", status: "Standard" },
    { id: 4, name: "EuroFoods GmbH", country: "Germany", port: "Hamburg", volume: "12,000 MT", avgPrice: "$980/MT", contacts: "Klaus Weber", email: "k.weber@eurofoods.de", lastShipment: "8 Days Ago", status: "Verified Buyer" }
  ];

  const mockExporters: CompanyData[] = [
    { id: 1, name: "Punjab Rice Mills", country: "India", port: "Mundra", volume: "115,000 MT", avgPrice: "$820/MT", contacts: "Sales Desk", email: "export@punjabrice.in", lastShipment: "2 Days Ago", status: "Top Exporter" },
    { id: 4, name: "Kandla Grain Exports", country: "India", port: "Kandla", volume: "85,000 MT", avgPrice: "$805/MT", contacts: "Jignesh P.", email: "info@kandlagrain.in", lastShipment: "1 Day Ago", status: "Verified Exporter" },
    { id: 5, name: "Karachi Rice Corp", country: "Pakistan", port: "Karachi", volume: "92,000 MT", avgPrice: "$790/MT", contacts: "Tariq Mahmood", email: "export@karachirice.pk", lastShipment: "3 Days Ago", status: "Premium Exporter" },
    { id: 2, name: "Siam Grain Exporters", country: "Thailand", port: "Laem Chabang", volume: "210,000 MT", avgPrice: "$580/MT", contacts: "Sompong C.", email: "sales@siamgrain.th", lastShipment: "1 Day Ago", status: "Top Exporter" },
    { id: 3, name: "VietRice Cong Ty", country: "Vietnam", port: "Ho Chi Minh", volume: "85,000 MT", avgPrice: "$550/MT", contacts: "Tran Van", email: "export@vietrice.vn", lastShipment: "5 Days Ago", status: "Standard" },
  ];

  // Global APIs for Trade Data
  const dataConnectors = [
    {
      id: "un_comtrade",
      name: "UN Comtrade",
      type: "Global Trade Stats",
      isFree: true,
      pricing: "Free Tier Available. Premium tier for bulk data.",
      subscription: "Register at uncomtrade.org. Subscribe to the 'API Free' product. Premium subscriptions start at $1k+ depending on org type.",
      capabilities: ["JSON/CSV Data Ingestion", "HS Code Mapping", "Bilateral Trade Flows"],
      integrationSteps: "1. Get Primary Key. 2. Pass 'Ocp-Apim-Subscription-Key' in headers. 3. Query /api/get with HS Codes and reporter/partner codes."
    },
    {
      id: "wto",
      name: "WTO Data Portal",
      type: "Global Trade & Tariffs",
      isFree: true,
      pricing: "100% Free (Open Data)",
      subscription: "No strict API key required for public OData endpoints, though registration is recommended for larger quotas.",
      capabilities: ["JSON/CSV Data Ingestion", "Tariff & HS Code Lookup"],
      integrationSteps: "1. Use standard OData v4 queries on api.wto.org. 2. Filter by indicator codes (e.g. HS codes or macroeconomic indicators)."
    },
    {
      id: "wits",
      name: "WITS (World Bank)",
      type: "Trade & Tariff Analytics",
      isFree: true,
      pricing: "Free, Registration Required",
      subscription: "Register an account on wits.worldbank.org. Access API using credentials.",
      capabilities: ["JSON/CSV Ingestion", "HS Code Mapping", "Non-Tariff Measures"],
      integrationSteps: "1. Authenticate to establish a session. 2. Call specialized endpoints for TradeStats, Tariff, and NTMs formatting via JSON or XML."
    },
    {
      id: "itc",
      name: "ITC Trade Map",
      type: "Company & Market Data",
      isFree: false,
      pricing: "Free for developing countries. Premium otherwise.",
      subscription: "Register at trademap.org. API access is B2B and requires a commercial agreement or institutional subscription.",
      capabilities: ["JSON/CSV Data Ingestion", "Company Lookup", "HS Code Mapping"],
      integrationSteps: "1. Contact ITC for API licensing. 2. Receive OAuth credentials. 3. Access endpoints to retrieve importer/exporter company data by HS6."
    },
    {
      id: "eurostat",
      name: "Eurostat APIs",
      type: "European Trade Data",
      isFree: true,
      pricing: "100% Free (Open Data)",
      subscription: "No API key required for public SDMX/JSON web services.",
      capabilities: ["JSON/CSV Data Ingestion", "HS & CN Code Mapping"],
      integrationSteps: "1. Use the API SDMX 2.1 entry point. 2. Query dataset COMEXT for European intra/extra trade flows."
    },
    {
      id: "world_port",
      name: "Worldwide Port Dataset",
      type: "Logistics & Ports",
      isFree: true,
      pricing: "Free Dataset. Third-party APIs (Seaports API) Freemium.",
      subscription: "Download NGA World Port Index as GeoJSON, or register via RapidAPI for Seaports API (Freemium up to 100 req/day).",
      capabilities: ["JSON/CSV Ingestion", "Port Lookup", "Geocoding"],
      integrationSteps: "1. Pass API Key via X-RapidAPI-Key header (if via RapidAPI) or ingest raw GeoJSON to a local spatial DB. 2. Query by port name or UN/LOCODE."
    },
    {
      id: "gcc_ports",
      name: "GCC Port Authorities (Mawani, Mwani)",
      type: "Middle East Customs & Ports",
      isFree: false,
      pricing: "Public vessel schedules are free; direct automated EDI requires business registration. Aggregated APIs (SeaRates) are premium.",
      subscription: "For direct automated access (Qatar/Saudi), you must register as a licensed freight forwarder or use third-party APIs (e.g. SeaRates, Portcast).",
      capabilities: ["JSON/XML Port Data", "Vessel Schedules", "Terminal Data"],
      integrationSteps: "To get Qatar (Hamad) & Saudi (Dammam/Jeddah) data: 1. Subscribe to a maritime aggregator API (e.g. MarineTraffic/SeaRates). 2. Make authenticated GET requests with GCC UN/LOCODEs (e.g., QA HMD for Hamad, SA DMM for Dammam)."
    }
  ];

  const activeData = activeTab === 'importers' ? mockImporters : mockExporters;
  const filteredData = activeData.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.port.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header section */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Globe className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-500/20 p-2.5 rounded-xl text-indigo-400">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                Trade Intelligence 
                <span className="text-indigo-400 font-mono font-bold text-lg bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">PRO</span>
              </h1>
              <p className="text-slate-400 text-sm font-medium mt-1">Real-time global EXIM data, buyer pipelines, and port analytics.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-6 mt-8">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 min-w-[200px]">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Global Shipments Tracked</div>
              <div className="text-3xl font-black font-mono text-emerald-400">2.4M+</div>
            </div>
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 min-w-[200px]">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Buyers ({industry})</div>
              <div className="text-3xl font-black font-mono text-indigo-400">14,520</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tools Container */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-gray-100 p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50/50 flex-wrap">
          <div className="flex flex-wrap bg-gray-100 p-1.5 rounded-xl self-start md:self-auto shrink-0 border border-gray-200">
            <button 
              onClick={() => setActiveTab('importers')}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'importers' 
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Search Buyers
            </button>
            <button 
              onClick={() => setActiveTab('exporters')}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'exporters' 
                  ? 'bg-white text-emerald-700 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Competitors
            </button>
            <button 
              onClick={() => setActiveTab('connectors')}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'connectors' 
                  ? 'bg-white text-blue-700 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database className="w-4 h-4" /> Data Connectors 
            </button>
          </div>
          
          {activeTab !== 'connectors' && (
            <div className="relative w-full md:w-96 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder={`Search ${activeTab} by name, country, or port...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-300 text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 shadow-xs"
              />
            </div>
          )}
        </div>
        
        {/* Data List or Connectors view */}
        <div className="overflow-x-auto min-h-[400px]">
          {activeTab !== 'connectors' ? (
            <div className="flex flex-col gap-8 p-4">
              {Array.from(new Set(filteredData.map(d => d.port))).map(portGroup => {
                const portData = filteredData.filter(d => d.port === portGroup);
                return (
                  <div key={portGroup} className="bg-white border text-left border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 border-b border-gray-200 px-6 py-3.5 flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-black text-slate-800 text-lg uppercase tracking-wide">PORT: {portGroup}</h3>
                      <span className="ml-auto bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-slate-200 shadow-xs">
                        {portData.length} records
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs font-black uppercase tracking-wider">
                            <th className="py-4 px-6 font-semibold">Entity Name</th>
                            <th className="py-4 px-6 font-semibold">Country</th>
                            <th className="py-4 px-6 font-semibold">Annual Est. Volume</th>
                            <th className="py-4 px-6 font-semibold">Contact Node</th>
                            <th className="py-4 px-6 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {portData.map((row) => (
                            <React.Fragment key={row.id}>
                              <tr className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${activeTab === 'importers' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                      <Building className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-gray-900 text-sm">{row.name}</div>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        {row.status.includes('Verified') || row.status.includes('Top') ? (
                                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : null}
                                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                          {row.status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                    <Globe className="w-4 h-4 text-gray-400" /> {row.country}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="font-mono font-bold text-slate-800 text-sm">
                                    {row.volume}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-gray-500">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Avg {row.avgPrice} 
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                    <Users className="w-4 h-4 text-gray-400" /> {row.contacts}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-gray-500">
                                    <Mail className="w-3.5 h-3.5" /> {row.email}
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  {row.blRecords ? (
                                    <button 
                                      onClick={() => setExpandedRowId(expandedRowId === row.id ? null : row.id)}
                                      className="bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-emerald-700 hover:text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 ml-auto">
                                      {expandedRowId === row.id ? 'Hide BLs' : 'View BL Records'} <ChevronRight className={`w-4 h-4 transition-transform ${expandedRowId === row.id ? 'rotate-90' : ''}`} />
                                    </button>
                                  ) : (
                                    <button className="bg-white border border-gray-200 hover:border-indigo-400 text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 ml-auto group-hover:bg-indigo-50">
                                      Unlock Data <ChevronRight className="w-4 h-4" />
                                    </button>
                                  )}
                                  <div className="text-[9px] text-gray-400 font-medium mt-1.5 uppercase tracking-wide flex justify-end items-center gap-1">
                                    <Activity className="w-3 h-3" /> Last Active: {row.lastShipment}
                                  </div>
                                </td>
                              </tr>
                              {expandedRowId === row.id && row.blRecords && (
                                <tr className="bg-slate-50 border-b border-indigo-100">
                                  <td colSpan={5} className="p-0">
                                    <div className="px-8 py-6 border-l-4 border-emerald-500">
                                      <div className="flex items-center gap-2 mb-4">
                                        <FileText className="w-5 h-5 text-emerald-600" />
                                        <h4 className="font-bold text-slate-800">Recent Bills of Lading (BL) Analytics</h4>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {row.blRecords.map((bl: any, b: number) => (
                                          <div key={b} className="bg-white border text-left border-gray-200 rounded-lg p-4 shadow-sm relative">
                                            <span className="absolute top-3 right-3 text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                              {bl.date}
                                            </span>
                                            <div className="font-mono font-bold text-sm text-indigo-700 mb-1">{bl.bl}</div>
                                            <div className="text-xs font-semibold text-slate-800 mb-3 pr-16">{bl.description}</div>
                                            <div className="flex justify-between items-end border-t border-gray-100 pt-3 mt-3">
                                              <div>
                                                <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mb-0.5">Carrier · Origin</div>
                                                <div className="text-xs font-semibold text-slate-700">{bl.carrier} <span className="text-gray-300">|</span> {bl.origin}</div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-[10px] text-emerald-600 font-bold tracking-wider uppercase mb-0.5">Assessed Value</div>
                                                <div className="text-sm font-black text-emerald-700">{bl.value}</div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {filteredData.length === 0 && (
                <div className="py-12 text-center text-gray-500 w-full border border-dashed border-gray-200 rounded-2xl">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">No records found for "{searchTerm}"</p>
                  <p className="text-sm mt-1">Try adjusting your search criteria or port filters.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-black text-slate-800">API Connectors / Market Intelligence</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-2xl">Integrate global free trade and port APIs for live data ingestion, HS code mapping, and buyer discovery. Configure your organization's API keys below to unlock these pipelines.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {dataConnectors.map((api) => (
                  <div key={api.id} className="border border-slate-200 rounded-2xl bg-white flex flex-col overflow-hidden shadow-sm hover:border-blue-400 transition-all group">
                    <div className="p-5 border-b border-slate-100 bg-slate-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="bg-blue-100 text-blue-700 p-2.5 rounded-xl">
                          <Database className="w-6 h-6" />
                        </div>
                        {api.isFree ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3"/> Free / Open View
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
                            <Key className="w-3 h-3"/> Premium Only
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-lg text-slate-800 group-hover:text-blue-700 transition-colors">{api.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{api.type}</p>
                    </div>

                    <div className="p-5 space-y-4 flex-1">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Info className="w-3.5 h-3.5"/> Pricing & Subscription</div>
                        <div className="text-sm text-slate-700 font-medium">{api.pricing}</div>
                        <div className="text-xs text-slate-500 mt-1">{api.subscription}</div>
                      </div>

                      <div className="border-t border-slate-100 pt-4">
                        <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Activity className="w-3.5 h-3.5"/> Capabilities</div>
                        <div className="flex flex-wrap gap-2">
                          {api.capabilities.map((cap, i) => (
                            <span key={i} className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 border border-slate-200">
                              {cap.includes('JSON') ? <FileJson className="w-3.5 h-3.5"/> : cap.includes('Port') ? <MapPin className="w-3.5 h-3.5"/> : <FileText className="w-3.5 h-3.5"/>}
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 p-4 border-t border-slate-100 flex gap-2">
                      <button 
                        onClick={() => setShowApiSetup(true)}
                        className="flex-1 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 text-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Link2 className="w-4 h-4"/> Integration Docs
                      </button>
                      <button 
                         onClick={() => setShowApiSetup(true)}
                         className="flex-1 bg-slate-900 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
                      >
                        <Key className="w-4 h-4"/> Add API Key
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Disclaimer / Integration Info */}
        {activeTab !== 'connectors' && (
          <div className="bg-indigo-900/5 border-t border-indigo-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-white p-2 rounded-full border border-indigo-100 shadow-sm shrink-0">
                <ArrowDownToLine className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Commercial API Integration Required</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                  This module connects to commercial customs datasets (like ImportYeti, Dollar Business, or Panjiva). 
                  The data illustrated above is simulated. To fetch live global buyer ledgers, please configure your API keys.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('connectors')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-md">
              View Data Connectors
            </button>
          </div>
        )}
      </div>

      {/* API Setup Modal */}
      {showApiSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowApiSetup(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                <Link2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">API Connector Configuration</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Database Integration Setup</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">Endpoint Credentials</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter Provider API Key or OAuth Token..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-sm font-mono text-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setApiKey('TEST-DEMO-API-KEY-12345')}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition shadow-sm border border-slate-300"
                  >
                    Use Demo Key
                  </button>
                  <button 
                    onClick={() => {
                      alert('API Key Saved (Development Simulation).');
                      setShowApiSetup(false);
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-md whitespace-nowrap"
                  >
                    Save & Test
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider">Integration Specs & Instructions</h4>
                <div className="space-y-4">
                  {dataConnectors.map(api => (
                    <div key={api.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-bold text-slate-800 text-sm">{api.name}</h5>
                        {api.isFree ? <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">FREE</span> : <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">PREMIUM</span>}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-mono bg-white p-3 border border-slate-200 rounded-lg">
                        <strong className="font-sans text-[10px] text-slate-400 tracking-wider uppercase block mb-1">Integration Flow:</strong>
                        {api.integrationSteps}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

