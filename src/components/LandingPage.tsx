import React, { useState } from 'react';
import { 
  Sparkles, ShieldCheck, CheckCircle2, ChevronRight, Globe, 
  ArrowRight, Users, Zap, FileSpreadsheet, Lock, Laptop, Check, Coins, HelpCircle,
  Search, Ship, MapPin, Calendar, Anchor, Truck, CheckCircle, Download, AlertCircle, FileText
} from 'lucide-react';
import { SavedQuote } from '../types';
import { getPublicTracking } from '../services/db';

interface LandingPageProps {
  onGoToAuth: () => void;
  savedQuotes?: SavedQuote[];
}

export default function LandingPage({ onGoToAuth, savedQuotes = [] }: LandingPageProps) {
  const [searchBL, setSearchBL] = useState('');
  const [trackedQuote, setTrackedQuote] = useState<SavedQuote | null>(null);
  const [trackSearched, setTrackSearched] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Built-in Demo shipments for instant user preview
  const DEMO_SHIPMENTS: SavedQuote[] = [
    {
      id: 99101,
      ref: "Q-8820B",
      blNo: "BL-MUNDRA-109",
      company: "Al-Meera Consumer Goods QPSC",
      buyer: "Dr. Khaled Al-Thani (Director of Grain Inbound)",
      buyerLoc: "Doha, Qatar",
      dest: "Hamad Port, Doha, Qatar",
      cond: "CFR",
      terms: "10% Advance, 90% CAD",
      valid: "2026-06-30",
      date: "2026-05-18",
      rateIds: null,
      items: [
        {
          id: 1,
          dest: "Hamad Port, Doha, Qatar",
          commodity: "1121 Basmati Rice (Steam)",
          brand: "Golden Crown Premium",
          packed: "BOPP Laminated Bags",
          size: "20 KG",
          master: "Custom Laminated",
          crop: "NEW",
          year: "2025",
          rate: 1045,
          condition: "CFR",
          paymentTerms: "10% Advance, 90% CAD",
          numFCL: 10,
          weightPerContainerKg: 25000,
          totalWeightKg: 250000,
          totalBags: 12500
        }
      ],
      html: '',
      trackingEmail: "logistics@al-meera.qa",
      trackingEta: "2026-05-28",
      trackingUpdates: [
        {
          id: "log-1",
          date: "2026-05-18 09:30",
          location: "Mundra Port Terminal 1, India",
          status: "Customs Cleared",
          description: "Container seals verified and passed by Mundra Indian Customs. Loaded onto Vessel MV Arabian King.",
          emailSent: true,
          emailRecipient: "logistics@al-meera.qa"
        },
        {
          id: "log-2",
          date: "2026-05-21 14:15",
          location: "Arabian Sea Transit Coordinates",
          status: "In Ocean Transit",
          description: "Vessel positioning normal. Cruising at 14.5 knots under favorable maritime conditions.",
          emailSent: true,
          emailRecipient: "logistics@al-meera.qa"
        },
        {
          id: "log-3",
          date: "2026-05-23 18:00",
          location: "Gulf of Oman Approach Sector",
          status: "In Ocean Transit",
          description: "Ocean crossing 75% completed. Approaching territorial Gulf water passage corridor. Estimated arrival on schedule.",
          emailSent: true,
          emailRecipient: "logistics@al-meera.qa"
        }
      ]
    },
    {
      id: 99102,
      ref: "Q-4450D",
      blNo: "BL-DOHA-402",
      company: "Qatar Logistics Hub QSTP",
      buyer: "Jassim Bin Kamal",
      buyerLoc: "Al Rayyan Zone 2",
      dest: "Hamad Port, Doha, Qatar",
      cond: "CFR",
      terms: "100% LC at Sight",
      valid: "2026-06-15",
      date: "2026-05-10",
      rateIds: null,
      items: [
        {
          id: 1,
          dest: "Hamad Port, Doha, Qatar",
          commodity: "Pusa Basmati (Raw Sella)",
          brand: "Orion Diamond Seal",
          packed: "Non-Woven Jute Bags",
          size: "35 KG",
          master: "Sack Jute Master",
          crop: "OLD",
          year: "2024",
          rate: 980,
          condition: "CFR",
          paymentTerms: "100% LC",
          numFCL: 4,
          weightPerContainerKg: 26000,
          totalWeightKg: 104000,
          totalBags: 2971
        }
      ],
      html: '',
      trackingEmail: "procure@qatarlogistics.qa",
      trackingEta: "2026-05-23",
      trackingUpdates: [
        {
          id: "log-a",
          date: "2026-05-10 10:00",
          location: "Kandla Port Terminal, India",
          status: "Loaded & Manifested",
          description: "Pre-dispatch cargo checks completed. Container loaded to vessel MV Desert Pearl.",
          emailSent: true
        },
        {
          id: "log-b",
          date: "2026-05-14 11:30",
          location: "Deep Ocean Crossing (Arabian Gulf)",
          status: "In Ocean Transit",
          description: "Vessel position monitored. ETA updated.",
          emailSent: true
        },
        {
          id: "log-c",
          date: "2026-05-20 08:45",
          location: "Hamad Port Anchorage Area",
          status: "Customs Hold Processing",
          description: "Anchor secured in Hamad Port. Health inspectors verifying Phytosanitary Certificate clearances.",
          emailSent: true
        },
        {
          id: "log-d",
          date: "2026-05-23 11:00",
          location: "Hamad Port Cargo Berth 4, Doha",
          status: "Delivered & Transferred",
          description: "Consignment completely received by Qatar Logistics Hub agents. Container seals intact. Transfer complete. Customers notified via automail.",
          emailSent: true,
          emailRecipient: "procure@qatarlogistics.qa"
        }
      ]
    }
  ];

  const handleTrackLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    setTrackSearched(true);
    
    const query = searchBL.trim().toUpperCase();
    if (!query) {
      setTrackError('Please specify a Bill of Lading (B/L) ID or Shipment ID.');
      setTrackedQuote(null);
      return;
    }

    setLoadingTracking(true);
    try {
      // 1. Search in local active quotes props buffer
      const liveMatch = savedQuotes.find(q => q.blNo && q.blNo.trim().toUpperCase() === query);
      if (liveMatch) {
        setTrackedQuote(liveMatch);
        return;
      }

      // 2. Search online public_tracking collection on Google Firestore
      const cloudMatch = await getPublicTracking(query);
      if (cloudMatch) {
        setTrackedQuote(cloudMatch);
        return;
      }

      // 3. Fallback to hardcoded trial codes
      const demoMatch = DEMO_SHIPMENTS.find(d => d.blNo && d.blNo.trim().toUpperCase() === query);
      if (demoMatch) {
        setTrackedQuote(demoMatch);
        return;
      }

      setTrackedQuote(null);
      setTrackError(`No active shipment found with Bill of Lading ID "${query}". Ensure the ID matches standard formatting or use one of the interactive trial codes below.`);
    } catch (err) {
      console.error(err);
      setTrackError("We couldn't connect to the live tracking server. Please check your internet connection and try again.");
    } finally {
      setLoadingTracking(false);
    }
  };

  const features = [
    {
      icon: Zap,
      title: "Real-Time Rate Calculator",
      desc: "Instantly convert raw crop bulk prices into final FOB/CFR USD per metric ton with automated milling yield, bag stock, freight, and custom Indian GST adjustments."
    },
    {
      icon: FileSpreadsheet,
      title: "A4 Proforma, CI & PL Workspaces",
      desc: "Instantly draft, customize, and print pixel-perfect, export-compliant Proforma Invoices, Commercial Invoices, and Packing Lists calibrated to standard A4 sheets."
    },
    {
      icon: Lock,
      title: "Secure Mill Licencing",
      desc: "Silo your organization's sensitive rates, private margins, and bag suppliers from other buyers with multi-tenant license key encryption."
    },
    {
      icon: Users,
      title: "Multi-User Live Collaboration",
      desc: "Add your sales executives, mill masters, and shipping assistants. Changes to rates, bag stocks, and clearance documents synchronize across all devices instantly."
    },
    {
      icon: ShieldCheck,
      title: "Customs & Phyto Documentation",
      desc: "Maintain a legally compliant, centralized folder room of all loaded Shipping Bills, official Phytosanitary Health certificates, and cargo invoices."
    },
    {
      icon: Globe,
      title: "Offline-First Resilience",
      desc: "Never halt operations because of poor port connectivity. All calculation workflows operate locally and sync to Cloud Firestore once back online."
    }
  ];

  const pricingPlans = [
    {
      name: "Standard Mill Plan",
      price: "FREE",
      period: "Forever",
      desc: "Perfect for single standalone basmati mills tracking daily broker prices.",
      features: [
        "Interactive Export FOB Rate Calculator",
        "Rate List Board & Bag Stack Inventory",
        "A4 Proforma Invoice PDF Generator",
        "Local Secure browser storage",
        "Single Organization Licence"
      ],
      cta: "Launch Free Workspace",
      popular: false
    },
    {
      name: "Multi-Agent Premium",
      price: "$19",
      period: "per user / month",
      desc: "Optimized for high-volume customs exporters and port dispatch teams.",
      features: [
        "All Standard Mill features",
        "Real-Time Firebase Cloud database sync",
        "Collaborative multi-user team seats",
        "Phyto & Shipping Bill file lockers",
        "Tenant admin role restrictions",
        "Priority Mundra freight updates"
      ],
      cta: "Upgrade My Workspace",
      popular: true
    },
    {
      name: "Global Port Operator",
      price: "Custom",
      period: "Volume pricing",
      desc: "Bespoke bulk deployment for international grain shipping agencies.",
      features: [
        "Dedicated isolated database cluster",
        "Full customs API webhook routing",
        "Custom banking SWIFT templates",
        "Dedicated accounts supervisor",
        "99.9% uptime Service SLA"
      ],
      cta: "Contact Sales Agent",
      popular: false
    }
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-blue-600 selection:text-white" id="public-marketing-site">
      
      {/* 1. STUNNING FIXED NAVIGATION HEADER */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg">
              RICE
            </div>
            <div>
              <div className="text-[9px] text-blue-400 font-mono tracking-widest uppercase font-bold leading-none">Free SaaS Platform</div>
              <span className="text-sm font-black text-white hover:text-blue-400 transition cursor-pointer">
                Free Export Manager
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-blue-400 transition">SaaS Features</a>
            <a href="#workflow" className="hover:text-blue-400 transition">How It Works</a>
            <a href="#pricing" className="hover:text-blue-400 transition">Pricing Plans</a>
            <a href="#faq" className="hover:text-blue-400 transition">System FAQs</a>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onGoToAuth}
              className="px-4 py-2 border border-slate-800 hover:border-slate-600 bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              Sign In
            </button>
            <button 
              onClick={onGoToAuth}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/10 transition flex items-center gap-1"
            >
              Get Customers Space <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* 2. DYNAMIC HERO BRAND BANNER */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24 border-b border-slate-900">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-violet-600/5 rounded-full blur-[90px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10px] font-mono font-bold uppercase tracking-wider mx-auto">
            <Sparkles className="w-3 h-3" /> Fully Integrated Rice Exporter CRM
          </div>
          
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
            Stop Losing Profit on <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Basmati Export Math</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            A premium, multi-user workspace for global grain mills. Calculate complex rate boards with dynamic bag stocks, generate compliance A4 Proformas, and sync with your shipping assistants instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button 
              onClick={onGoToAuth}
              className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-2xl shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
            >
              Get Started Freely <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onGoToAuth}
              className="w-full sm:w-auto px-6 py-3.5 border border-slate-800 hover:border-slate-700 bg-slate-900/60 backdrop-blur-sm text-slate-350 hover:text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
            >
              <Laptop className="w-4 h-4 text-slate-400" /> Demo Client Workspace
            </button>
          </div>

          {/* Trust indicator logos with subtle styling */}
          <div className="pt-12 select-none">
            <p className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
              Trusted by Exporters routing through
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 mt-4 text-[11px] font-black tracking-wider text-slate-400 uppercase">
              <span>● Mundra Port, India</span>
              <span>● Hamad Terminal, Doha</span>
              <span>● Jebel Ali, Dubai</span>
              <span>● Rajkot Rice Mills Guild</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 PUBLIC CLIENT CARGO PORTAL & B/L TRACKER */}
      <section className="py-16 bg-slate-900/50 border-b border-slate-900 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[10px] font-mono font-bold uppercase tracking-wider mx-auto">
              <Ship className="w-3.5 h-3.5" /> Client Portal API
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Interactive B/L Cargo Tracker
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Keep your international direct buyers updated without sending manuals. Give them their Bill of Lading (B/L) ID for live vessel GPS status lookups.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-900 space-y-6 shadow-2xl">
            
            <form onSubmit={handleTrackLookup} className="space-y-4">
              <label className="block text-xs font-mono font-bold uppercase text-slate-400">
                Enter Bill of Lading (B/L) ID or Consignment Ref:
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    value={searchBL}
                    onChange={(e) => setSearchBL(e.target.value)}
                    disabled={loadingTracking}
                    placeholder="e.g. BL-MUNDRA-109"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm rounded-xl focus:outline-hidden text-white placeholder-slate-500 font-mono transition disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loadingTracking}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {loadingTracking ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <span>Track Cargo</span> <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Instant Trials Pill bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <span className="text-slate-500 font-medium">Try Trial Simulation Codes:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchBL('BL-MUNDRA-109');
                    // Simulate submit via helper
                    setTimeout(() => {
                      setTrackSearched(true);
                      setTrackError('');
                      const match = DEMO_SHIPMENTS.find(d => d.blNo === 'BL-MUNDRA-109');
                      if (match) setTrackedQuote(match);
                    }, 50);
                  }}
                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 rounded-md font-mono transition"
                >
                  BL-MUNDRA-109 (In Transit)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchBL('BL-DOHA-402');
                    setTimeout(() => {
                      setTrackSearched(true);
                      setTrackError('');
                      const match = DEMO_SHIPMENTS.find(d => d.blNo === 'BL-DOHA-402');
                      if (match) setTrackedQuote(match);
                    }, 50);
                  }}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 rounded-md font-mono transition"
                >
                  BL-DOHA-402 (Delivered)
                </button>
              </div>
            </form>

            {/* Error Message */}
            {trackError && (
              <div className="p-4 bg-red-950/40 border border-red-900/40 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 leading-relaxed font-sans">{trackError}</p>
              </div>
            )}

            {/* Active Cargo Ticker Display */}
            {trackSearched && trackedQuote && (
              <div className="border border-slate-800/80 rounded-2xl p-5 sm:p-6 bg-slate-900/30 space-y-6 animate-fadeIn">
                
                {/* 1. Header Details */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                      B/L ID: {trackedQuote.blNo}
                    </span>
                    <h3 className="font-extrabold text-sm text-white uppercase tracking-wide pt-1">
                      {trackedQuote.company}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      Buyer Representative: <strong className="text-slate-350 font-bold">{trackedQuote.buyer}</strong>
                    </p>
                  </div>
                  
                  <div className="text-right md:bg-slate-950/60 p-3 rounded-xl border border-slate-900 min-w-[120px]">
                    <span className="text-[10px] font-mono text-slate-500 block">EXPECTED ARRIVAL (ETA)</span>
                    <span className="text-xs font-black text-slate-100 font-mono">
                      {trackedQuote.trackingEta || "TBD"}
                    </span>
                  </div>
                </div>

                {/* 2. Visual Cargo Logistics Roadmap */}
                <div className="space-y-3">
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block tracking-widest">
                    Milestone Path
                  </span>
                  <div className="relative pt-2">
                    {/* Background line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
                    
                    {/* Progress Fill Line */}
                    {(() => {
                      const latest = trackedQuote.trackingUpdates?.[trackedQuote.trackingUpdates.length - 1];
                      let width = "0%";
                      if (latest?.status === "Customs Cleared") width = "33%";
                      else if (latest?.status === "In Ocean Transit") width = "66%";
                      else if (latest?.status === "Delivered & Transferred" || latest?.status === "Delivered" || latest?.status === "Delivered & Received") width = "100%";
                      return (
                        <div className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width }} />
                      );
                    })()}

                    <div className="relative z-10 flex justify-between">
                      {/* Step 1: Loaded */}
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-lg shadow-blue-500/30">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-[9px] font-bold uppercase text-slate-300 mt-1">Loaded</span>
                      </div>

                      {/* Step 2: In Transit */}
                      {(() => {
                        const statusList = trackedQuote.trackingUpdates?.map(u => u.status) || [];
                        const inTransit = statusList.includes("In Ocean Transit") || statusList.includes("Delivered") || statusList.includes("Delivered & Transferred");
                        return (
                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg transition ${
                              inTransit ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-800 text-slate-500'
                            }`}>
                              <Ship className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase mt-1 ${inTransit ? 'text-slate-300' : 'text-slate-500'}`}>Transit</span>
                          </div>
                        );
                      })()}

                      {/* Step 3: Delivered */}
                      {(() => {
                        const statusList = trackedQuote.trackingUpdates?.map(u => u.status) || [];
                        const isDelivered = statusList.includes("Delivered") || statusList.includes("Delivered & Transferred") || statusList.includes("Delivered & received");
                        return (
                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg transition ${
                              isDelivered ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-slate-800 text-slate-500'
                            }`}>
                              <Anchor className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase mt-1 ${isDelivered ? 'text-emerald-400' : 'text-slate-500'}`}>Delivered</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* 3. Status Logs Chronological Stack */}
                <div className="space-y-3 pt-3">
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block tracking-widest">
                    Dispatched Checkpoint Logs
                  </span>
                  <div className="space-y-3">
                    {trackedQuote.trackingUpdates && trackedQuote.trackingUpdates.length > 0 ? (
                      trackedQuote.trackingUpdates.slice().reverse().map((log, index) => (
                        <div 
                          key={log.id || index} 
                          className={`p-3.5 rounded-xl border flex gap-3 text-left transition ${
                            index === 0 
                              ? 'bg-blue-950/15 border-blue-900/50' 
                              : 'bg-slate-950/40 border-slate-900'
                          }`}
                        >
                          <div className="mt-0.5">
                            {index === 0 ? (
                              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-blue-400 opacity-75"></span>
                                <MapPin className="w-3 h-3 relative z-10" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                                <CheckCircle className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-extrabold text-[11px] text-slate-200 uppercase truncate">
                                {log.location}
                              </h4>
                              <span className="text-[9px] text-slate-500 font-mono font-semibold shrink-0">
                                {log.date}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                log.status.includes('Delivered')
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {log.status}
                              </span>
                              {log.emailSent && (
                                <span className="text-[9px] text-slate-500 italic flex items-center gap-1">
                                  ✉ Client Alert Dispatched
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans pt-1">
                              {log.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2 text-center">
                        No shipment tracking logs bound to this B/L ID. Ready to update.
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Compliant Shipping Documents */}
                <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-[10px] font-mono uppercase text-slate-400">
                    Compliant Port Clearance Documents (Exporters Folder)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-[11px] font-bold text-slate-200 uppercase">Phytosanitary Clearance</p>
                          <p className="text-[9px] text-slate-500 font-mono">Status: Verified Official PDF</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5">
                        <Download className="w-3.5 h-3.5" /> View
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                        <div>
                          <p className="text-[11px] font-bold text-slate-200 uppercase">Customs Shipping Bill</p>
                          <p className="text-[9px] text-slate-500 font-mono">Filed on {trackedQuote.date}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5">
                        <Download className="w-3.5 h-3.5" /> View
                      </span>
                    </div>

                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      </section>

      {/* 3. PRODUCT FEATURE GRID SHOWCASE */}
      <section id="features" className="py-20 bg-slate-950/40 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
              Engineered for the Fast-Paced Grain Trade
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Say goodbye to messy formulas and outdated spreadsheets. Our cloud-integrated dashboard tracks every step of your shipment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, index) => {
              const IconComp = feat.icon;
              return (
                <div 
                  key={index} 
                  className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-3 hover:border-slate-800 transition"
                >
                  <div className="w-10 h-10 bg-blue-650/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-xs uppercase text-white tracking-wide">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. SHIPMENT ROADMAP AND WORKFLOWS */}
      <section id="workflow" className="py-20 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider">
              Compliance Pipeline
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-3">
              How Rice Mill Exporters Streamline Shipments
            </h2>
            <p className="text-slate-400 text-xs">
              Go from a broker quotation inquiry to port customs passage in four transparent steps:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center select-none">
            
            {/* Step 1 */}
            <div className="bg-slate-900/25 border border-slate-900 p-6 rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-300 font-bold mx-auto flex items-center justify-center text-xs">
                01
              </div>
              <h4 className="font-bold text-xs uppercase text-white">Inquire & Calculate</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Plug in commodity prices, configure bags with master stock levels, and project container transport costs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/25 border border-slate-900 p-6 rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-300 font-bold mx-auto flex items-center justify-center text-xs">
                02
              </div>
              <h4 className="font-bold text-xs uppercase text-white">Generate A4 Proforma</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Save the rate automatically and generate an export-ready Proforma Invoice to lock in financial terms.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/25 border border-slate-900 p-6 rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-300 font-bold mx-auto flex items-center justify-center text-xs">
                03
              </div>
              <h4 className="font-bold text-xs uppercase text-white">Real-Time Team Work</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your mill master notes packaging completions, and sales files packing lists on our secure dashboard.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-900/25 border border-slate-900 p-6 rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-300 font-bold mx-auto flex items-center justify-center text-xs">
                04
              </div>
              <h4 className="font-bold text-xs uppercase text-white">Customs Dispatch</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upload raw Phytosanitary health documents, file active Shipping Bills, and compile port dispatch logs.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. TRANSPARENT PRICING STRUCTURE */}
      <section id="pricing" className="py-20 bg-slate-950 px-4 focus:outline-hidden border-b border-slate-900 relative">
        <div className="absolute top-1/2 left-1/4 w-[350px] h-[350px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              One Dashboard. Honest Pricing.
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Keep your baseline workspace free forever. Upgrade only when you need real-time multi-agent synchronisation and customs file storage.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`flex flex-col justify-between p-6 sm:p-8 rounded-3xl border transition relative ${
                  plan.popular 
                    ? 'bg-slate-900 border-indigo-650 shadow-2xl shadow-indigo-500/5 Ring-2 ring-indigo-500' 
                    : 'bg-slate-900/40 border-slate-900 hover:border-slate-800'
                }`}
              >
                {plan.popular && (
                  <span className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full">
                    Recommended Exporter Choice
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs uppercase font-mono font-bold text-slate-400">{plan.name}</h3>
                    <div className="flex items-baseline mt-2">
                      <span className="text-2xl sm:text-4xl font-black text-white tracking-tight">{plan.price}</span>
                      {plan.period && <span className="ml-1 text-xs text-slate-400">/ {plan.period}</span>}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-normal">{plan.desc}</p>
                  
                  <div className="border-t border-slate-800/80 pt-4" />

                  <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <button 
                    onClick={onGoToAuth}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                        : 'border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-350 hover:text-white'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SYSTEM FAQS */}
      <section id="faq" className="py-20 border-b border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Frequently Answered Inquiries
            </h2>
            <p className="text-slate-400 text-xs">
              Clear answers regarding data ownership, deployment architecture, and client accounts.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-1">
              <h4 className="font-extrabold text-xs uppercase text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>How can I host this on my own domain?</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed ml-5.5">
                You can easily share the application link with customers. To map a bespoke custom domain (like <em className="italic text-gray-300">freeexportmanager.com</em>), read our export deployment guides or configure custom DNS CNAME mapping via the cloud integration portal.
              </p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-1">
              <h4 className="font-extrabold text-xs uppercase text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Is my private pricing schema secure?</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed ml-5.5">
                Absolutely. Every mill creates a completely separate workspace identified via a unique Mill License. Exporter prices, private bag suppliers, and custom tax percentages are fully encrypted on Firestore. Other clients cannot view your proprietary info.
              </p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-1">
              <h4 className="font-extrabold text-xs uppercase text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Do uploads support live multi-user sync?</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed ml-5.5">
                Yes! When a sales executive updates the Shipping Bill or a mill manager uploads the Phyto clearance certificate, the system automatically replicates the document name and state to Cloud Firestore, updating all screen views live for everyone in your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BOTTOM STUNTING CALL-TO-ACTION */}
      <section className="py-24 relative overflow-hidden text-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[110px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight leading-none">
            Get Started with Free Export Manager Today
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            Eliminate communication gaps between your sales managers, freight handlers, and mill operators. Try the offline-resilient dashboard for free.
          </p>
          <div className="pt-4">
            <button 
              onClick={onGoToAuth}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-2xl shadow-blue-500/20 transition mx-auto flex items-center gap-2"
            >
              Configure Live Workspace <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 text-center text-xs text-slate-500 font-mono">
        <p>© 2026 Free Export Manager SaaS Corporation. Fully Integrated Rice Mills Platform. Protected by offline TLS & Firestore Security.</p>
        <p className="mt-2 text-[10px] text-slate-650">Handcrafted under compliant port clearance protocol calibrations.</p>
      </footer>

    </div>
  );
}
