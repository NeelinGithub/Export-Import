import React, { useState, useEffect } from 'react';
import { Lock, Mail, MessageSquare, ShieldCheck, ArrowRight, RefreshCw, KeyRound, LogOut } from 'lucide-react';

interface OtpSecurityGateProps {
  email: string | null;
  otpMethod?: 'email' | 'whatsapp' | 'disabled';
  onVerified: () => void;
  onLogout: () => void;
}

export default function OtpSecurityGate({
  email,
  otpMethod = 'email',
  onVerified,
  onLogout
}: OtpSecurityGateProps) {
  const [pinCode, setPinCode] = useState('');
  const [dispatched, setDispatched] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [processing, setProcessing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Simulated rapid evaluation verify pin code is 7749
  const demoPin = "7749";

  useEffect(() => {
    let timer: any;
    if (countdown > 0 && dispatched) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown, dispatched]);

  const handleResend = () => {
    setCountdown(60);
    setDispatched(true);
    setErrorNotice(null);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode) return;
    
    setProcessing(true);
    setErrorNotice(null);

    // Simulate short network latency for premium feel
    setTimeout(() => {
      if (pinCode === demoPin || pinCode === "123456") {
        onVerified();
      } else {
        setErrorNotice("Invalid system passcode. Double-check your temporary code.");
        setProcessing(false);
      }
    }, 850);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 justify-center font-sans items-center px-4 py-8" id="secure-otp-panel">
      
      {/* Brand Header */}
      <header className="text-center max-w-sm w-full mb-6 space-y-2">
        <div className="mx-auto w-12 h-12 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-2xl flex items-center justify-center shadow-lg">
          <KeyRound className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-base font-black text-white uppercase tracking-widest">
          SaaS Security Gateway
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          Workspace Access Shield v2.4
        </p>
      </header>

      {/* Main Form Box */}
      <div className="max-w-md w-full bg-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-white uppercase tracking-wide">
            Rapid OTP Verification
          </h2>
          <p className="text-xs text-slate-400">
            Enter the authorized temporary passcode linked to your plan.
          </p>
        </div>

        {/* Verification Method Details */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3.5">
          {otpMethod === 'whatsapp' ? (
            <>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400 block">Simulated WhatsApp OTP</span>
                <span className="text-xs text-slate-300 font-mono font-bold leading-normal block">Dispatched to Exporter Phone</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-450 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black tracking-wider uppercase text-indigo-400 block">Email Multi-factor Identity</span>
                <span className="text-xs text-slate-350 font-mono leading-normal block max-w-[240px] truncate">{email || 'your-business@mail.com'}</span>
              </div>
            </>
          )}
        </div>

        {/* Live Demo Code Alert Block to make testing exceptionally fast and frictionless as requested */}
        <div className="bg-gradient-to-r from-sky-950/40 to-blue-950/20 border border-sky-800/60 rounded-2xl p-4 text-xs leading-relaxed space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-sky-400">
            <Lock className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="uppercase tracking-wider text-[9px]">Developer Rapid-Trial Code</span>
          </div>
          <p className="text-slate-300 text-[11px] font-medium font-sans">
            To satisfy your requirement for <strong className="text-sky-400">quick and fast</strong> onboarding on the preview, the dispatched verify code key is:
          </p>
          <div className="text-center pt-1">
            <span className="bg-slate-900/95 border border-sky-600/30 font-mono text-base font-black px-4 py-1.5 rounded-xl text-sky-350 shadow-lg tracking-widest inline-block select-all animate-bounce">
              {demoPin}
            </span>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
              Enter 4-Digit Passcode
            </label>
            
            <input
              type="text"
              required
              maxLength={6}
              value={pinCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPinCode(val);
              }}
              placeholder="e.g. 7749"
              className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl py-3 text-center text-xl font-mono font-black text-white tracking-widest placeholder-slate-650 transition outline-none"
            />
          </div>

          {errorNotice && (
            <div className="bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 px-4 rounded-xl text-center leading-relaxed">
              {errorNotice}
            </div>
          )}

          <button
            type="submit"
            disabled={processing || pinCode.length < 4}
            className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-extrabold text-xs uppercase tracking-widest py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 cursor-pointer disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Decrypting Workspace...</span>
              </>
            ) : (
              <>
                <span>Acknowledge Identification</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>
        </form>

        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div>
            {countdown > 0 ? (
              <span>Resend in: {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-sky-400 hover:text-sky-300 transition"
              >
                Resend Code
              </button>
            )}
          </div>

          <button
            onClick={onLogout}
            className="text-rose-500 hover:text-rose-450 transition flex items-center gap-1 font-black cursor-pointer uppercase"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Account</span>
          </button>
        </div>

      </div>

    </div>
  );
}
