import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, FileText, CheckCircle2, ShieldCheck, Globe, Zap, ArrowRight, PauseCircle } from 'lucide-react';

const SLIDES = [
  {
    title: "The Future of Rice Exports",
    subtitle: "RICE Export Manager",
    content: "A unified cloud workspace designed exclusively for high-volume Rice Mills and Port Teams.",
    icon: Globe,
    color: "bg-blue-600"
  },
  {
    title: "Current Industry Challenges",
    content: "• Scattered Excel sheets & manual WhatsApp calculations\n• Disconnected Bag Inventory & Mill Stock\n• High risk of freight miscalculations & customs delays",
    icon: ShieldCheck,
    color: "bg-rose-600"
  },
  {
    title: "One Centralized Dashboard",
    content: "Unify your entire operation. From the first broker inquiry to final port dispatch, manage your margins, freight, and documents in one secure workspace.",
    icon: FileText,
    color: "bg-indigo-600"
  },
  {
    title: "Live Freight Intelligence",
    content: "Pull real-time vessel schedules and dynamic FCL rates (Mundra to Global Ports). Instantly calculate Cape Detours, War-Risk, and THCs without picking up the phone.",
    icon: Zap,
    color: "bg-amber-500"
  },
  {
    title: "Instant Proforma Generation",
    content: "Lock in deals faster. Turn a complex freight and bagging calculation into a legally-binding A4 Proforma Invoice in 3 seconds. Download PDF instantly.",
    icon: FileText,
    color: "bg-emerald-600"
  },
  {
    title: "Warehouse & Mill Sync",
    content: "Keep your mill manager and sales team connected. Track raw paddy stock, milling yield ratios, and premium packaging bag inventory in real time.",
    icon: CheckCircle2,
    color: "bg-cyan-600"
  },
  {
    title: "Why Switch? (Value for Money)",
    content: "Stop paying $500/month for generic enterprise ERPs. Get a purpose-built grain shipping tool for a fraction of the cost, with zero onboarding time.",
    icon: Zap,
    color: "bg-blue-500"
  },
  {
    title: "Ready to Scale Your Exports?",
    content: "Join the top-performing Rice Mills today.\n\nSign up for the fully-featured SaaS platform and supercharge your dispatch volume.",
    icon: ArrowRight,
    color: "bg-indigo-700"
  }
];

export default function MarketingMaterials() {
  const [activeTab, setActiveTab] = useState<'slides' | 'video'>('slides');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);

  // Video duration in seconds (2 minutes = 120s)
  const VIDEO_DURATION = 120;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activeTab === 'video') {
      interval = setInterval(() => {
        setVideoTime(prev => {
          if (prev >= VIDEO_DURATION) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeTab]);

  const handleNextSlide = () => {
    if (currentSlide < SLIDES.length - 1) setCurrentSlide(prev => prev + 1);
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const SlideIcon = SLIDES[currentSlide].icon;

  return (
    <div className="flex-1 bg-slate-900 border-l border-slate-800 flex flex-col min-h-screen text-slate-100 overflow-hidden font-sans">
      <div className="p-6 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" /> Marketing Assets
          </h2>
          <p className="text-xs text-slate-400 mt-1">Export pitches, slide decks, and promo reels for your clients.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('slides')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'slides' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            PowerPoint Deck
          </button>
          <button 
            onClick={() => {
              setActiveTab('video');
              setVideoTime(0);
              setIsPlaying(false);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'video' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            Promo Video
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
        
        {activeTab === 'slides' && (
          <div className="w-full max-w-4xl aspect-video bg-white rounded-2xl shadow-2xl overflow-hidden relative flex flex-col">
            {/* Slide Content */}
            <div className="flex-1 flex flex-col relative">
              <div className={`absolute top-0 w-full h-2 ${SLIDES[currentSlide].color}`} />
              
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 shadow-xl ${SLIDES[currentSlide].color} bg-opacity-10 text-opacity-100`}>
                  <SlideIcon className={`w-10 h-10 ${SLIDES[currentSlide].color.replace('bg-', 'text-')}`} />
                </div>
                
                {SLIDES[currentSlide].subtitle && (
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
                    {SLIDES[currentSlide].subtitle}
                  </span>
                )}
                
                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-8">
                  {SLIDES[currentSlide].title}
                </h1>
                
                <div className="max-w-2xl text-lg sm:text-xl text-slate-600 leading-relaxed font-medium whitespace-pre-line text-left border-l-4 border-slate-200 pl-6">
                  {SLIDES[currentSlide].content}
                </div>
              </div>
            </div>

            {/* Slide Controls */}
            <div className="h-16 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Slide {currentSlide + 1} / {SLIDES.length}
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrevSlide}
                  disabled={currentSlide === 0}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleNextSlide}
                  disabled={currentSlide === SLIDES.length - 1}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-900 border border-slate-900 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="w-full max-w-4xl aspect-video bg-black rounded-2xl shadow-[0_0_50px_rgba(37,99,235,0.2)] overflow-hidden relative group">
            
            {/* Animated Video Canvas */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black p-12 text-center overflow-hidden">
              {/* Dynamic Abstract Background Elements */}
              <div className={`absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[100px] transition-all duration-[3000ms] ${isPlaying ? 'bg-indigo-600/30 scale-110' : 'bg-blue-600/10 scale-90'}`} />
              <div className={`absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[100px] transition-all duration-[2000ms] ${isPlaying ? 'bg-cyan-600/30 scale-125' : 'bg-violet-600/10 scale-100'}`} />
              
              {/* Animated Text Engine based on time */}
              <div className="relative z-10 space-y-6 max-w-3xl">
                {videoTime < 10 && (
                  <div className="animate-in fade-in zoom-in duration-1000">
                    <Globe className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                    <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase">RICE Export Manager</h2>
                    <p className="text-xl text-blue-200 mt-4 font-light">The All-in-One Cloud SaaS for Modern Mills</p>
                  </div>
                )}
                {videoTime >= 10 && videoTime < 30 && (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <ShieldCheck className="w-16 h-16 text-rose-500 mx-auto mb-6" />
                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Stop Wasting Margins</h2>
                    <p className="text-lg text-slate-300 mt-4 leading-relaxed">
                      Manual calculations lead to freight blindspots and port delays. 
                      It's time to upgrade your export logic.
                    </p>
                  </div>
                )}
                {videoTime >= 30 && videoTime < 60 && (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                    <Zap className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Live Freight & Proformas</h2>
                    <p className="text-lg text-slate-300 mt-4 leading-relaxed">
                      Calculate container metrics, add your custom margins, and generate PDF Proforma Invoices in exactly 3 seconds.
                    </p>
                  </div>
                )}
                {videoTime >= 60 && videoTime < 90 && (
                  <div className="animate-in fade-in slide-in-from-left-8 duration-700">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Sync Your Mill Teams</h2>
                    <p className="text-lg text-slate-300 mt-4 leading-relaxed">
                      Sales sees the exact inventory the warehouse packs. Zero miscommunications. Endless efficiency.
                    </p>
                  </div>
                )}
                {videoTime >= 90 && (
                  <div className="animate-in fade-in zoom-in duration-1000">
                    <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight">Upgrade Your Exports</h2>
                    <div className="mt-8 inline-block px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                      Start Your Free Workspace Today
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Video Player Controls UI Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 pb-8 pt-20 via-black/40 to-transparent flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer overflow-hidden" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newTime = (clickX / rect.width) * VIDEO_DURATION;
                setVideoTime(Math.floor(newTime));
              }}>
                <div 
                  className="h-full bg-blue-500 relative"
                  style={{ width: `${(videoTime / VIDEO_DURATION) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-white hover:text-blue-400 transition"
                  >
                    {isPlaying ? <PauseCircle className="w-8 h-8" /> : <Play className="w-8 h-8 flex-shrink-0" />}
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-300 tracking-wider">
                    {formatTime(videoTime)} / {formatTime(VIDEO_DURATION)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-700 px-2 py-1 rounded">2:00 Promotional Hook</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
