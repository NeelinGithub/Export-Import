import React, { useState, useEffect, useRef } from 'react';
import { 
  Ship, Anchor, Navigation, ShieldCheck, Thermometer, Droplets, 
  Activity, Landmark, Search, Play, Pause, RotateCcw, Copy, Check, Info, Radio, MapPin, Map, Compass
} from 'lucide-react';
import { APIProvider, Map as GMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

// Define known port Coordinates
interface PortCord {
  name: string;
  lat: number;
  lng: number;
  country: string;
}

const PORT_COORDINATES: Record<string, PortCord> = {
  mundra: { name: 'Mundra Port Terminal (INMUN)', lat: 22.75, lng: 69.70, country: 'India' },
  chennai: { name: 'Chennai Port Trust (INMAA)', lat: 13.09, lng: 80.30, country: 'India' },
  mumbai: { name: 'Nhava Sheva JNPT (INNSA)', lat: 18.95, lng: 72.95, country: 'India' },
  doha: { name: 'Hamad Port Terminal (QAHMD)', lat: 25.26, lng: 51.61, country: 'Qatar' },
  dubai: { name: 'Jebel Ali Port (AEJEA)', lat: 24.99, lng: 55.06, country: 'United Arab Emirates' },
  singapore: { name: 'Port of Singapore (SGSIN)', lat: 1.27, lng: 103.80, country: 'Singapore' },
  portsaid: { name: 'Port Said Terminal (EGPSD)', lat: 31.26, lng: 32.31, country: 'Egypt' }
};

interface ShipmentTrack {
  id: string;
  quoteRef: string;
  companyName: string;
  containerId: string;
  sealNo: string;
  vesselName: string;
  commodity: string;
  quantityTons: number;
  originPortKey: string;
  destPortKey: string;
  progressPercent: number; // 0 - 100
  statusText: string;
  temperature: number; // IoT
  humidity: number; // IoT
  vibration: number; // IoT
  etaDays: number;
}

// Pre-seeded high quality maritime container shipments
const INITIAL_TRACKS: ShipmentTrack[] = [
  {
    id: 'TRK-901',
    quoteRef: 'RFQ-701A',
    companyName: 'AL-MEERA CONSUMER GOODS QPSC',
    containerId: 'MSCU6290812',
    sealNo: 'A-90184422',
    vesselName: 'M.V. INDIAN COVE V-102N',
    commodity: 'PR-11 Long Grain Rice',
    quantityTons: 260,
    originPortKey: 'mundra',
    destPortKey: 'doha',
    progressPercent: 62,
    statusText: 'In Transit - Steaming through Gulf of Oman',
    temperature: 25.4,
    humidity: 12.1,
    vibration: 0.04,
    etaDays: 3
  },
  {
    id: 'TRK-902',
    quoteRef: 'RFQ-844B',
    companyName: 'QATAR FOOD IMPORTS WLL',
    containerId: 'MAEU9812401',
    sealNo: 'M-48194410',
    vesselName: 'M.V. GULF FALCON V-09C',
    commodity: 'Basmati Rice Premium Extra Long',
    quantityTons: 125,
    originPortKey: 'mumbai',
    destPortKey: 'doha',
    progressPercent: 15,
    statusText: 'Departed Nhava Sheva Terminal. Navigating Arabian Sea.',
    temperature: 26.1,
    humidity: 11.8,
    vibration: 0.08,
    etaDays: 6
  },
  {
    id: 'TRK-903',
    quoteRef: 'RFQ-392F',
    companyName: 'DOHA IMPORT CENTER CO.',
    containerId: 'EMCU4012984',
    sealNo: 'E-00124892',
    vesselName: 'M.V. TAIPEI MAJESTY V-55S',
    commodity: '1121 Steam Rice Golden Sella',
    quantityTons: 500,
    originPortKey: 'chennai',
    destPortKey: 'doha',
    progressPercent: 95,
    statusText: 'At Anchor - Preparing for Hamad Port Custom Quay Entry',
    temperature: 24.8,
    humidity: 12.9,
    vibration: 0.01,
    etaDays: 1
  }
];

export default function ContainerTracker() {
  const [tracks, setTracks] = useState<ShipmentTrack[]>(INITIAL_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('TRK-901');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Simulation Controller States
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [copiedText, setCopiedText] = useState<string>('');
  const [customKeyWarning, setCustomKeyWarning] = useState<boolean>(false);
  const [mapInterface, setMapInterface] = useState<'vector' | 'google'>('vector');

  // Google Maps API integration setup
  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    '';
  const hasValidMapsKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

  const activeTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];

  // Load custom quotes from localStorage to seed extra tracking if available
  useEffect(() => {
    const rawQuotes = localStorage.getItem('rems_saved_quotes_v2');
    if (rawQuotes) {
      try {
        const parsed = JSON.parse(rawQuotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loadedTracks: ShipmentTrack[] = [...INITIAL_TRACKS];
          parsed.forEach((q: any, index: number) => {
            const trackId = `TRK-L${100 + index}`;
            // Avoid duplicates
            if (!loadedTracks.some(t => t.quoteRef === q.ref)) {
              // Map ports
              const dPortLower = (q.dest || '').toLowerCase();
              let dPortKey = 'doha';
              if (dPortLower.includes('dubai') || dPortLower.includes('ali')) dPortKey = 'dubai';
              else if (dPortLower.includes('singa')) dPortKey = 'singapore';
              else if (dPortLower.includes('said')) dPortKey = 'portsaid';

              loadedTracks.push({
                id: trackId,
                quoteRef: q.ref || `RFQ-${q.id || index}`,
                companyName: (q.buyer || 'PRIVATE GLOBAL IMPORTER').toUpperCase(),
                containerId: q.containerNoManual || `HLCU${3040000 + index}`,
                sealNo: q.sealNoManual || `ML-SA${5000 + index}`,
                vesselName: q.vesselNameManual || 'M.V. EXPEDITIOUS TRADER',
                commodity: q.items?.[0]?.commodity || 'Premium Sorted Agri Grains',
                quantityTons: q.items?.reduce((sum: number, it: any) => sum + (Number(it.qtyTons) || 0), 0) || 54,
                originPortKey: 'mundra', // default
                destPortKey: dPortKey,
                progressPercent: 35 + (index * 12) % 60,
                statusText: 'In Transit - Steaming through Arabian shipping lanes',
                temperature: 25.1 + (index % 5) * 0.3,
                humidity: 12.0 + (index % 3) * 0.2,
                vibration: 0.05,
                etaDays: Math.max(2, 8 - (index % 5))
              });
            }
          });
          setTracks(loadedTracks);
        }
      } catch(_) {}
    }
  }, []);

  // Live simulation coordinate tick loops
  useEffect(() => {
    let timer: any = null;
    if (isSimulating) {
      timer = setInterval(() => {
        setTracks(prev => prev.map(t => {
          let nextProgress = t.progressPercent + (0.2 * simulationSpeed);
          if (nextProgress >= 100) {
            nextProgress = 0; // wrap around
          }

          // Randomize safe agricultural IoT sensor metrics slightly
          const tempDelta = (Math.random() - 0.5) * 0.1;
          const humDelta = (Math.random() - 0.5) * 0.08;
          const vibDelta = (Math.random() - 0.5) * 0.005;

          // Determine simulation text
          let statusStr = t.statusText;
          if (nextProgress < 15) {
            statusStr = `Departing Origin Terminal port. Maneuvering localized channels.`;
          } else if (nextProgress >= 15 && nextProgress < 45) {
            statusStr = `In Transit - Deep-sea high-speed lane steaming. Normal wave height.`;
          } else if (nextProgress >= 45 && nextProgress < 85) {
            statusStr = `In Transit - Cruising maritime checkpoint buffer sectors.`;
          } else if (nextProgress >= 85 && nextProgress < 98) {
            statusStr = `Approaching Discharge Harbor Outer Anchorage. Custom manifest queue established.`;
          } else if (nextProgress >= 98) {
            statusStr = `Docked at Terminal. Port Quay crane discharge commenced. Standard cargo split.`;
          }

          return {
            ...t,
            progressPercent: parseFloat(nextProgress.toFixed(2)),
            temperature: parseFloat(Math.min(30, Math.max(18, t.temperature + tempDelta)).toFixed(2)),
            humidity: parseFloat(Math.min(15, Math.max(9, t.humidity + humDelta)).toFixed(2)),
            vibration: parseFloat(Math.min(0.2, Math.max(0.01, t.vibration + vibDelta)).toFixed(3)),
            statusText: statusStr,
            etaDays: Math.max(0, Math.ceil(7 * (1 - (nextProgress / 100))))
          };
        }));
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isSimulating, simulationSpeed]);

  const handleCopyText = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedText(key);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Safe coordinate lookups
  const originPort = PORT_COORDINATES[activeTrack.originPortKey] || PORT_COORDINATES.mundra;
  const destPort = PORT_COORDINATES[activeTrack.destPortKey] || PORT_COORDINATES.doha;

  // Linear interpolation for current physical vessel position
  const getSimulatedLocation = () => {
    const fraction = activeTrack.progressPercent / 100;
    const lat = originPort.lat + (destPort.lat - originPort.lat) * fraction;
    const lng = originPort.lng + (destPort.lng - originPort.lng) * fraction;
    return { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) };
  };

  const currentPos = getSimulatedLocation();

  // Filter track listing based on query inputs
  const filteredTracks = tracks.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.containerId.toLowerCase().includes(q) ||
      t.companyName.toLowerCase().includes(q) ||
      t.quoteRef.toLowerCase().includes(q) ||
      t.commodity.toLowerCase().includes(q)
    );
  });

  const handleFindContainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const found = tracks.find(t => t.containerId.toLowerCase().includes(searchQuery.toLowerCase()));
    if (found) {
      setSelectedTrackId(found.id);
    } else {
      // Generate a dynamic tracking log on the spot to fulfill custom search intent
      const mockContainer = searchQuery.trim().toUpperCase();
      const newTrack: ShipmentTrack = {
        id: `TRK-${Math.floor(100 + Math.random() * 900)}`,
        quoteRef: `RFQ-MOCK-${Math.floor(100 + Math.random() * 900)}`,
        companyName: 'INTERNATIONAL BUYER ACQUISITION',
        containerId: mockContainer,
        sealNo: `SL-GPS-${Math.floor(1000 + Math.random() * 9000)}`,
        vesselName: 'M.V. EXPORT CHALLENGER',
        commodity: 'Pre-Packaged Premium Grains Cargo',
        quantityTons: 108,
        originPortKey: 'mundra',
        destPortKey: 'doha',
        progressPercent: 42,
        statusText: 'In Transit - Steaming through direct Arabian trade channels',
        temperature: 24.5,
        humidity: 12.3,
        vibration: 0.02,
        etaDays: 4
      };
      setTracks(p => [newTrack, ...p]);
      setSelectedTrackId(newTrack.id);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-350">
      {/* HEADER CONTRIB */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 px-2.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 rounded-md font-sans font-black uppercase text-[10px] tracking-wider">
              Maritime Control Deck
            </div>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <Compass className="w-3 h-3 animate-spin duration-5000" /> Live Shipments Tracking
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Active Container Locators & Sea Lane Radar</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Correlate export Proforma Invoices, ocean bill of lading records, and physical cargo containers against real-time coordinate coordinates and container temperature limits.
          </p>
        </div>

        {/* Live Simulation Controls */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex items-center gap-3 shrink-0">
          <div className="text-left font-mono">
            <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-widest">Global IoT Sync</span>
            <span className="text-xs font-bold text-slate-200 block">
              {isSimulating ? "🛰️ POLLING SENSORS" : "⏸️ LOGS PAUSED"}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-850" />
          <div className="flex gap-1">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              title={isSimulating ? "Pause real-time coordinate updates" : "Resume container coordinate feed simulation"}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg hover:text-white transition cursor-pointer"
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setTracks(INITIAL_TRACKS.map(t => ({ ...t, progressPercent: t.progressPercent })))}
              title="Reset metrics to sea lane origin points"
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="h-8 w-px bg-slate-850" />
          {/* Speed scaler */}
          <div className="flex flex-col gap-0.5 select-none">
            <span className="text-[7.5px] text-slate-500 uppercase font-black font-sans leading-none">Sim Velocity</span>
            <select
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[10px] font-bold text-slate-200 focus:outline-none"
            >
              <option value="1">1x Normal</option>
              <option value="5">5x Warp</option>
              <option value="20">20x Hyper</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* SIDE BAR SEARCH & TRACKS LISTING */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <form onSubmit={handleFindContainer} className="bg-white border border-gray-255 rounded-2xl p-4 shadow-xs space-y-3">
            <label className="text-gray-550 font-sans tracking-wide text-xs font-black block uppercase">
              Physical Cargo Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Enter Container ID (e.g., MSCU6290812)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:bg-white outline-none font-mono"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer text-center"
              >
                Locate Container
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* ACTIVE DISPATCH LIST */}
          <div className="bg-white border border-gray-255 rounded-2xl p-4 shadow-xs flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-550 font-sans tracking-wide text-xs font-black uppercase">
                Active Shipping Manifest ({filteredTracks.length})
              </span>
              <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                India Port Sourced
              </span>
            </div>

            <div className="divide-y divide-gray-100 overflow-y-auto max-h-[360px] pr-1 scrollbar-thin flex-1">
              {filteredTracks.map(t => {
                const isActive = t.id === selectedTrackId;
                const orig = PORT_COORDINATES[t.originPortKey] || PORT_COORDINATES.mundra;
                const dest = PORT_COORDINATES[t.destPortKey] || PORT_COORDINATES.doha;
                
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTrackId(t.id)}
                    className={`w-full text-left py-3 transition-all flex items-start gap-3 border-l-4 px-2 ${
                      isActive 
                        ? 'bg-blue-50/50 border-blue-600' 
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Ship className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black font-mono text-gray-800">{t.containerId}</span>
                        <span className="text-[9px] text-gray-400 font-mono italic">{t.quoteRef}</span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase truncate leading-none mb-1.5">
                        {t.companyName}
                      </p>
                      
                      {/* Port route indicators */}
                      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold text-gray-650 font-mono mb-2">
                        <span className="truncate max-w-[80px]" title={orig.name}>{orig.name.split(' ')[0]}</span>
                        <span className="text-gray-300">➔</span>
                        <span className="truncate max-w-[80px]" title={dest.name}>{dest.name.split(' ')[0]}</span>
                      </div>

                      {/* Micro Progress Track */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono">
                          <span className={`${t.progressPercent > 98 ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                            {t.progressPercent > 98 ? '🎁 Docked & Clearing' : 'Steaming Sea Link'}
                          </span>
                          <span className="font-bold text-gray-900">{t.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              t.progressPercent > 90 ? 'bg-emerald-500' : 'bg-blue-600 shadow-xs'
                            }`}
                            style={{ width: `${t.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredTracks.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-xs">
                  No container matches found. Search generic Container IDs above to generate trackers dynamically.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTAINER LIVE TRACKING RADAR MAP (CENTER FIELD) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* MAP CANVAS PANEL */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-xl flex flex-col relative">
            
            {/* Map selection switcher bar */}
            <div className="bg-slate-900 border-b border-slate-850 px-4 py-2.5 flex items-center justify-between no-print select-none">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-[11px] font-black tracking-wider text-slate-200 uppercase font-sans">
                  Dynamic Physical Location Interface
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMapInterface('vector')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border cursor-pointer ${
                    mapInterface === 'vector'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📡 Sector Vector Radar
                </button>
                <button
                  onClick={() => {
                    setMapInterface('google');
                    if (!hasValidMapsKey) {
                      setCustomKeyWarning(true);
                      setTimeout(() => setCustomKeyWarning(false), 6000);
                    }
                  }}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border cursor-pointer flex items-center gap-1 ${
                    mapInterface === 'google'
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 font-black'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌍 Satellite Map Layer
                </button>
              </div>
            </div>

            {/* Custom Google Maps Key Guidance Popover */}
            {customKeyWarning && !hasValidMapsKey && (
              <div className="absolute top-12 left-4 right-4 z-50 bg-slate-900 border border-amber-920 text-amber-200 text-[10.5px] p-3 rounded-xl shadow-2xl flex items-start gap-2.5 animate-in slide-in-from-top duration-350">
                <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-extrabold text-white">Using Demo Satellite Map Layer Fallback</p>
                  <p className="leading-relaxed">
                    To render genuine Google Map tiles, you can configure your secret key <code>GOOGLE_MAPS_PLATFORM_KEY</code> directly in **Settings** (⚙️ top-right gear icon) → **Secrets** menu.
                  </p>
                </div>
                <button onClick={() => setCustomKeyWarning(false)} className="text-amber-500 hover:text-white font-bold px-1 select-none cursor-pointer">
                  Dismiss
                </button>
              </div>
            )}

            {/* MAIN CHART SCREEN LAYER */}
            <div className="w-full h-[320px] bg-slate-950 relative flex items-center justify-center">
              
              {mapInterface === 'google' && hasValidMapsKey ? (
                <APIProvider apiKey={API_KEY} version="weekly">
                  <GMap
                    defaultCenter={{ lat: 18.0, lng: 68.0 }}
                    defaultZoom={4}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {/* Origin Terminal Advance Marker */}
                    <AdvancedMarker position={{ lat: originPort.lat, lng: originPort.lng }} title={`Origin: ${originPort.name}`}>
                      <Pin background="#3b82f6" borderColor="#1d4ed8" glyphColor="#ffffff" />
                    </AdvancedMarker>

                    {/* Destination Terminal Advance Marker */}
                    <AdvancedMarker position={{ lat: destPort.lat, lng: destPort.lng }} title={`Discharge: ${destPort.name}`}>
                      <Pin background="#10b981" borderColor="#047857" glyphColor="#ffffff" />
                    </AdvancedMarker>

                    {/* Vessel Active Moving GPS coordinates */}
                    <AdvancedMarker position={currentPos} title={activeTrack.vesselName}>
                      <div className="bg-slate-900 border-2 border-emerald-400 text-white p-1.5 px-2.5 rounded-lg shadow-2xl font-sans text-[9px] font-black flex items-center gap-1.5 whitespace-nowrap animate-bounce">
                        <Ship className="w-3 h-3 text-emerald-400 shrink-0" />
                        <div>
                          <div>{activeTrack.vesselName}</div>
                          <div className="text-[7.5px] text-slate-300 font-mono tracking-tight font-normal">
                             Lat: {currentPos.lat} &deg;N, Lng: {currentPos.lng} &deg;E
                          </div>
                        </div>
                      </div>
                    </AdvancedMarker>
                  </GMap>
                </APIProvider>
              ) : (
                /* SOPHISTICATED CUSTOM SECTOR RADAR PANEL */
                <div className="w-full h-full relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-925 via-slate-950 to-black select-none">
                  
                  {/* Glowing Radar concentric grids */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] border border-emerald-500 rounded-full" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-emerald-500 rounded-full animate-pulse" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] border border-emerald-500 rounded-full" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-emerald-500" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-full bg-emerald-500" />
                  </div>

                  {/* Coordinate readouts in corners */}
                  <div className="absolute top-2 left-3 font-mono text-[8px] text-slate-550 space-y-0.5">
                    <div>RADAR SECTOR: ARABIAN SEA / GULF LINK</div>
                    <div>LAT BOUNDS: 10.00° N - 30.00° N</div>
                  </div>
                  <div className="absolute top-2 right-3 font-mono text-[8px] text-slate-550 text-right">
                    <div>GPS TRK INDEX: ACTIVE CARGO LINK</div>
                    <div>FREQ INT: 15.42 GHz</div>
                  </div>

                  {/* Visual SVG schematic map of Sea Lanes from India to Middle East */}
                  <svg className="w-full h-full absolute inset-0" viewBox="0 0 600 300" fill="none">
                    {/* Stylized land mass sketches */}
                    {/* Middle East & Arabian Peninsula */}
                    <path d="M50 40 L120 45 L150 70 L195 90 L240 110 L250 150 L220 180 L180 210 L120 220 L72 205 L60 170 Z" fill="#2d3748" fillOpacity="0.12" stroke="#4a5568" strokeOpacity="0.3" strokeWidth="1" />
                    {/* Indian Landmass Peninsula */}
                    <path d="M420 50 L480 30 L550 50 L570 110 L500 150 L460 210 L440 250 L425 210 L415 150 L410 100 Z" fill="#2d3748" fillOpacity="0.12" stroke="#4a5568" strokeOpacity="0.3" strokeWidth="1" />
                    
                    {/* Specific Sea Lanes curve (Polylines) */}
                    {/* Mundra to Doha Shipping Arch */}
                    <path d="M 440 110 C 370 140, 270 160, 210 130" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.7" />
                    {/* Chennai to Doha Logistics Link */}
                    <path d="M 460 210 C 390 230, 280 200, 210 130" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="2 4" strokeOpacity="0.5" />

                    {/* Port Landmarks circles */}
                    {/* Mundra (Orig) */}
                    <circle cx="440" cy="110" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" className="cursor-pointer" />
                    {/* Chennai */}
                    <circle cx="460" cy="210" r="4" fill="#a78bfa" stroke="#ffffff" strokeWidth="0.5" />
                    {/* Doha Hamad Flag */}
                    <circle cx="210" cy="130" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1" className="cursor-pointer" />

                    {/* Active container simulated vessel position dot */}
                    {(() => {
                      // Interpolate positions in vector SVG coordinate bounds
                      let startX = 440;
                      let startY = 110;
                      let cpX = 370;
                      let cpY = 140;
                      let destX = 210;
                      let destY = 130;

                      if (activeTrack.destPortKey === 'dubai') {
                        destX = 280; destY = 125;
                      } else if (activeTrack.originPortKey === 'chennai') {
                        startX = 460; startY = 210;
                      }

                      // Quadratic bezier interpolation
                      const frac = activeTrack.progressPercent / 100;
                      const x = (1 - frac) * (1 - frac) * startX + 2 * (1 - frac) * frac * cpX + frac * frac * destX;
                      const y = (1 - frac) * (1 - frac) * startY + 2 * (1 - frac) * frac * cpY + frac * frac * destY;

                      return (
                        <g>
                          {/* Radial glowing core under shipping dot */}
                          <circle cx={x} cy={y} r="14" fill="#10b981" fillOpacity="0.15" />
                          <circle cx={x} cy={y} r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" className="animate-ping" />
                          <circle cx={x} cy={y} r="3.5" fill="#10b981" stroke="#064e3b" strokeWidth="1" />
                          
                          {/* Label banner floating beside shipping */}
                          <foreignObject x={x + 10} y={y - 18} width="160" height="40" className="overflow-visible select-none">
                            <div className="bg-slate-900/95 border border-emerald-500/40 text-white rounded-md p-1 px-1.5 shadow-2xl font-mono text-[8px] leading-tight flex flex-col gap-0.5 pointer-events-none scale-95 origin-left">
                              <span className="font-bold flex items-center gap-0.5 text-emerald-400">
                                🚢 {activeTrack.vesselName}
                              </span>
                              <span className="text-slate-400 text-[7px]">
                                SECTOR GPS: {currentPos.lat}&deg;N / {currentPos.lng}&deg;E
                              </span>
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })()}
                  </svg>

                  {/* Tiny Legend block in SVG map */}
                  <div className="absolute bottom-2.5 left-3 bg-slate-950/90 border border-slate-850 p-1.5 rounded-lg flex gap-2.5 items-center font-mono text-[7px] text-slate-400 select-none">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      <span>Origin Load Terminal</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      <span>Discharge Destination</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block animate-ping" />
                      <span>Container Vessel</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK TELEMETRY CHASSIS READOUTS */}
            <div className="bg-slate-900 border-t border-slate-850 p-4.5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono select-none">
              <div className="space-y-1 border-r border-slate-850 pr-2">
                <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 text-slate-400">
                  <Thermometer className="w-3.5 h-3.5 text-rose-400" /> Chambers Temp
                </span>
                <span className={`text-base font-bold block ${
                  activeTrack.temperature > 27 ? 'text-amber-400' : 'text-slate-200'
                }`}>
                  {activeTrack.temperature} &deg;C
                </span>
                <span className="text-[7.5px] text-slate-500 block">Grain Spoilage Limit: 28.5 &deg;C</span>
              </div>

              <div className="space-y-1 sm:border-r border-slate-850 sm:pr-2">
                <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 text-slate-400">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" /> Grains Moisture
                </span>
                <span className={`text-base font-bold block ${
                  activeTrack.humidity > 13 ? 'text-amber-400' : 'text-slate-200'
                }`}>
                  {activeTrack.humidity} %
                </span>
                <span className="text-[7.5px] text-slate-500 block">Wet Decay limit: 14.0% Max</span>
              </div>

              <div className="space-y-1 border-r border-slate-850 pr-2">
                <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 text-slate-400">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" /> Hull Vibration
                </span>
                <span className="text-base font-bold text-slate-200 block">
                  {activeTrack.vibration} g
                </span>
                <span className="text-[7.5px] text-slate-500 block">Seaworthy Safe Threshold: 0.15g</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 text-slate-400">
                  <Navigation className="w-3.5 h-3.5 text-teal-400" /> Est. Sea Transit
                </span>
                <span className="text-base font-bold text-teal-400 block">
                  {activeTrack.etaDays > 0 ? `${activeTrack.etaDays} Days Remaining` : "Quay Arrived"}
                </span>
                <span className="text-[7.5px] text-slate-500 block">Calculated at 15.5 Knots AvgS</span>
              </div>
            </div>
          </div>

          {/* PHYSICAL SHIPPERS SPECIFICATION & CUSTOM DISPATCH NOTES */}
          <div className="bg-white border border-gray-255 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-800 font-sans tracking-wide text-xs font-black block uppercase">
                ⚙️ Physical Containers Specifications & Seals advice
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(`Vessel: ${activeTrack.vesselName} | Container ID: ${activeTrack.containerId} | Seal No: ${activeTrack.sealNo} | Commodity: ${activeTrack.commodity}`, 'all')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer select-none"
              >
                {copiedText === 'all' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied Manifest!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Coordinates Manifest
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Exporters Carrier Container:</span>
                  <strong className="text-gray-900 font-mono flex items-center gap-1">
                    {activeTrack.containerId}
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeTrack.containerId, 'cont')}
                      className="text-blue-500 p-0.5 hover:text-blue-700"
                    >
                      {copiedText === 'cont' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  </strong>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Official High-Security Seal No:</span>
                  <strong className="text-gray-900 font-mono font-bold flex items-center gap-1">
                    {activeTrack.sealNo}
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeTrack.sealNo, 'seal')}
                      className="text-blue-500 p-0.5 hover:text-blue-700"
                    >
                      {copiedText === 'seal' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  </strong>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Authorized Vessel Cargo Loading:</span>
                  <strong className="text-gray-900 font-semibold">{activeTrack.vesselName}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Port of Loading (POL origin):</span>
                  <strong className="text-gray-900">{originPort.name}</strong>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Port of Discharge (POD dest):</span>
                  <strong className="text-gray-900">{destPort.name}</strong>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Commodity Specifications:</span>
                  <strong className="text-blue-800 font-bold uppercase text-[10px]">{activeTrack.commodity}</strong>
                </div>
              </div>
            </div>

            {/* LIVE GPS POSITION ADVISORY FEED */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-gray-150 flex items-start gap-3">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-xl h-fit shrink-0">
                <Compass className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-extrabold text-gray-800">Operational Transit Log Advisory</p>
                <p className="text-gray-600 leading-relaxed">
                  Cargo current coordinate point is <strong className="font-mono text-indigo-700">{currentPos.lat} &deg;N / {currentPos.lng} &deg;E</strong>. Consigned to <span className="font-bold">{activeTrack.companyName}</span>. Vessel has crossed international gulf channels with sealed structural locks active. All temperature levels are locked in stable zones.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
