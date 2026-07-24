import React, { useState } from "react";
import { SavedQuote, PaymentTrackerData } from '../types';
import { DollarSign, Calendar, TrendingUp, TrendingDown, Ship, Save, RefreshCcw, Clock, Mail, MessageCircle, Copy, X, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

interface PaymentTrackerProps {
  savedQuotes: SavedQuote[];
  setSavedQuotes: React.Dispatch<React.SetStateAction<SavedQuote[]>>;
}

export default function PaymentTracker({ savedQuotes = [], setSavedQuotes = () => {} }: PaymentTrackerProps) {
  const [shareConfig, setShareConfig] = useState<{ quote: SavedQuote, pt: PaymentTrackerData } | null>(null);
  const [msgOptions, setMsgOptions] = useState({
    includeCI: true,
    includeBL: false,
    includePL: false,
    includeDraft: false,
    customText: "Please find the attached documents for your reference and kindly process the payment.",
  });

  // We filter to quotes that have paymentTracker enabled or have blNo set
  // This matches "if user has selected to follow up for teh payment ater BL is uploade , or selected shipped"
  const trackedQuotes = (savedQuotes || []).filter(q => (q.paymentTracker && q.paymentTracker.enabled) || q.blNo);

  const handleUpdateTracker = (quoteId: number, field: keyof PaymentTrackerData, value: any) => {
    setSavedQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const initialExrate = q.items && q.items[0]?.exrate ? q.items[0].exrate : 83.50;
        // Init if missing
        const tracker: PaymentTrackerData = q.paymentTracker || {
          enabled: true,
          shippedDate: new Date().toISOString().slice(0, 10),
          paymentTermsDays: 30,
          expectedAmount: q.items.reduce((sum, item) => sum + (item.fobRate || item.rate || 0) * (item.quantity || item.numFCL * item.weightPerContainerKg || 0), 0) || 0,
          usdRateAtShipment: initialExrate,
          status: "on_ship"
        };
        return {
          ...q,
          paymentTracker: {
            ...tracker,
            [field]: value
          }
        };
      }
      return q;
    }));
  };

  const fetchCurrentUsdRate = async (quoteId: number) => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await response.json();
      if (data && data.rates && data.rates.INR) {
        handleUpdateTracker(quoteId, "usdRateAtPayment", parseFloat(data.rates.INR.toFixed(2)));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch live USD rate.");
    }
  };

  const calculateDaysPassed = (dateString: string) => {
    if (!dateString) return 0;
    const past = new Date(dateString).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((now - past) / (1000 * 60 * 60 * 24)));
  };

  const getDynamicMessage = (q: SavedQuote, pt: PaymentTrackerData, opts: typeof msgOptions) => {
    let msg = `Hello ${q.buyer || 'Buyer'},\n\nThis is a gentle reminder regarding our shipment (Ref: ${q.ref}).\n\n- BL Number: ${q.blNo || 'Pending'}\n- Shipped Date: ${pt.shippedDate}\n- Total Due (USD): $${pt.expectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\n`;
    
    if (opts.customText) {
      msg += `${opts.customText}\n\n`;
    }

    const attachments = [];
    if (opts.includeCI) attachments.push("Commercial Invoice (CI)");
    if (opts.includePL) attachments.push("Packing List (PL)");
    if (opts.includeBL) attachments.push("Bill of Lading Copy (BL)");
    if (opts.includeDraft) attachments.push("Draft Docs");
    
    if (attachments.length > 0) {
      msg += `Attached Documents to this message:\n`;
      attachments.forEach(a => {
        msg += `✅ ${a}\n`;
      });
      msg += `\n`;
    }
    
    msg += `Thank you.`;
    return msg;
  };

  const executeWhatsApp = () => {
    if (!shareConfig) return;
    const { quote, pt } = shareConfig;
    const text = getDynamicMessage(quote, pt, msgOptions);
    const phone = quote.buyerPhone ? quote.buyerPhone.replace(/\D/g,'') : '';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const executeEmail = () => {
    if (!shareConfig) return;
    const { quote, pt } = shareConfig;
    const text = getDynamicMessage(quote, pt, msgOptions);
    const email = quote.trackingEmail || '';
    const subject = `Payment Reminder: Shipment ${quote.ref}`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const executeCopy = () => {
    if (!shareConfig) return;
    const { quote, pt } = shareConfig;
    const text = getDynamicMessage(quote, pt, msgOptions);
    navigator.clipboard.writeText(text);
    alert("Follow-up message copied to clipboard! Remember to attach the physical files when sending.");
  };

  const openShareConfig = (quote: SavedQuote, pt: PaymentTrackerData) => {
    setShareConfig({ quote, pt });
  };

  let totalPending = 0;
  let totalReceived = 0;
  let overdueAmount = 0;

  trackedQuotes.forEach(q => {
    const estimatedAmount = q.items?.reduce((sum, item) => {
      const price = item.fobRate || item.rate || 0;
      const qty = item.quantity || ((item.numFCL && item.weightPerContainerKg) ? item.numFCL * item.weightPerContainerKg : 0);
      return sum + price * qty;
    }, 0) || 0;

    const pt = q.paymentTracker || {
      enabled: true,
      shippedDate: q.date,
      paymentTermsDays: 30,
      expectedAmount: estimatedAmount,
      usdRateAtShipment: 83.50,
      status: "on_ship"
    };

    const daysPassed = calculateDaysPassed(pt.shippedDate);

    if (pt.status === "payment_received") {
      totalReceived += pt.expectedAmount || 0;
    } else {
      totalPending += pt.expectedAmount || 0;
      if (daysPassed > (pt.paymentTermsDays || 30)) {
        overdueAmount += pt.expectedAmount || 0;
      }
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-emerald-800 uppercase tracking-tight flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Active Export Payment Follow-up Tracker
          </h2>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Monitor shipments that have BL issued and require payment collection. Track foreign exchange fluctuation differences between shipment date and today. Automatically saves changes to the workspace records.
          </p>
        </div>
      </div>

      {/* DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Pending */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Pending</p>
            <h3 className="text-xl font-black text-amber-600">${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        {/* Total Received */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Received</p>
            <h3 className="text-xl font-black text-emerald-600">${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        {/* Overdue Payments */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Overdue Payments</p>
            <h3 className="text-xl font-black text-rose-600">${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900 text-slate-300 font-bold uppercase text-[10px] tracking-widest border-b border-slate-800">
              <tr>
                <th className="p-4 whitespace-nowrap">Date / Ref</th>
                <th className="p-4 whitespace-nowrap">Days Passed</th>
                <th className="p-4 whitespace-nowrap">Shipment / BL Details</th>
                <th className="p-4 whitespace-nowrap">Customer Contact</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 text-right whitespace-nowrap">Amount (USD)</th>
                <th className="p-4 text-center whitespace-nowrap">USD Rate (Shipment)</th>
                <th className="p-4 text-center whitespace-nowrap">USD Rate (Today)</th>
                <th className="p-4 text-right whitespace-nowrap">Fluctuation Diff</th>
              </tr>
            </thead>
            <tbody>
              {trackedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <Ship className="w-8 h-8 opacity-20 mx-auto mb-2" />
                    No active shipments are currently being tracked for payment. Upload a BL to a quote to automatically track it here.
                  </td>
                </tr>
              ) : (
                trackedQuotes.map((q) => {
                  const initialExrate = q.items && q.items[0]?.exrate ? q.items[0].exrate : 83.50;
                  const estimatedAmount = q.items.reduce((sum, item) => {
                    const price = item.fobRate || item.rate || 0;
                    const qty = item.quantity || (item.numFCL && item.weightPerContainerKg ? item.numFCL * item.weightPerContainerKg : 0);
                    return sum + price * qty;
                  }, 0);
                  
                  const pt = q.paymentTracker || {
                    enabled: true,
                    shippedDate: q.date,
                    paymentTermsDays: 30,
                    expectedAmount: estimatedAmount,
                    usdRateAtShipment: initialExrate,
                    status: "on_ship"
                  };
                  
                  const isGain = pt.usdRateAtPayment ? pt.usdRateAtPayment > pt.usdRateAtShipment : false;
                  const isLoss = pt.usdRateAtPayment ? pt.usdRateAtPayment < pt.usdRateAtShipment : false;
                  const diffVal = pt.usdRateAtPayment ? Math.abs((pt.usdRateAtPayment - pt.usdRateAtShipment) * pt.expectedAmount) : 0;
                  const daysPassed = calculateDaysPassed(pt.shippedDate);
                  const isCriticalOverdue = pt.status !== "payment_received" && daysPassed > (pt.paymentTermsDays || 30) + 30;
                  
                  return (
                    <tr key={q.id} className={`border-b border-gray-100 hover:bg-gray-50 flex-wrap transition ${isCriticalOverdue ? 'bg-red-50/50' : ''}`}>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 block">{q.ref}</span>
                          {isCriticalOverdue && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" title="Payment critically overdue" />}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <input 
                            type="date"
                            value={pt.shippedDate}
                            onChange={(e) => handleUpdateTracker(q.id, "shippedDate", e.target.value)}
                            className="text-[10px] text-slate-600 border border-gray-200 rounded px-1 py-0.5 outline-none font-bold"
                          />
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-black ${isCriticalOverdue ? 'bg-red-100 border-red-200 text-red-700 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                          <Clock className={`w-3 h-3 ${isCriticalOverdue ? 'text-red-500' : 'text-slate-400'}`} />
                          {daysPassed} Days
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block">{q.blNo || "BL Pending"}</span>
                        <span className="text-slate-500 text-[10px]">Port: {q.portOfLoading || q.items[0]?.dest || "N/A"}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block line-clamp-1">{q.company}</span>
                        <span className="text-slate-500 text-[10px] block">{q.buyer} • {q.trackingEmail || q.buyerPhone || "N/A"}</span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <button onClick={() => openShareConfig(q, pt)} className="px-2 py-1 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition flex items-center gap-1.5 text-[9px] uppercase font-bold tracking-wider" title="Configure Follow-up Message">
                            <Mail className="w-3 h-3" /> Config Follow-up Message
                          </button>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <select
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                            pt.status === 'payment_received' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : pt.status === 'reached_dest' 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                          value={pt.status || "on_ship"}
                          onChange={(e) => handleUpdateTracker(q.id, "status", e.target.value)}
                        >
                          <option value="on_ship">On Ship</option>
                          <option value="reached_dest">Reached Dest</option>
                          <option value="payment_pending">Payment Pending</option>
                          <option value="payment_received">Payment Received</option>
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end relative">
                           <DollarSign className="w-3 h-3 absolute -left-2 text-slate-400 mt-0.5" />
                           <input
                             type="number"
                             value={pt.expectedAmount}
                             onChange={(e) => handleUpdateTracker(q.id, "expectedAmount", parseFloat(e.target.value) || 0)}
                             className="w-24 text-right font-black text-slate-900 bg-transparent outline-none hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1"
                           />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1 text-slate-600 font-bold">
                           ₹ <input
                             type="number"
                             step="0.01"
                             value={pt.usdRateAtShipment}
                             onChange={(e) => handleUpdateTracker(q.id, "usdRateAtShipment", parseFloat(e.target.value) || 0)}
                             className="w-16 text-center bg-transparent outline-none hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1"
                           />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                           <span className="font-bold text-slate-800">₹</span>
                           <input
                             type="number"
                             step="0.01"
                             value={pt.usdRateAtPayment || ''}
                             placeholder="Fetch"
                             onChange={(e) => handleUpdateTracker(q.id, "usdRateAtPayment", parseFloat(e.target.value) || undefined)}
                             className="w-16 text-center font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 placeholder-indigo-300 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1"
                           />
                           <button onClick={() => fetchCurrentUsdRate(q.id)} className="ml-1 text-indigo-500 hover:text-indigo-700" title="Fetch Live Standard Rate">
                             <RefreshCcw className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {pt.usdRateAtPayment ? (
                           <div className={`flex flex-col items-end ${isGain ? 'text-emerald-600' : isLoss ? 'text-rose-600' : 'text-slate-500'}`}>
                             <span className="font-black flex items-center gap-1">
                               {isGain && '+'}
                               {isLoss && '-'}
                               ₹{diffVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                               {isGain && <TrendingUp className="w-3.5 h-3.5" />}
                               {isLoss && <TrendingDown className="w-3.5 h-3.5" />}
                             </span>
                             <span className="text-[9px] uppercase font-bold tracking-widest block opacity-70">
                               {isGain ? 'Gain' : isLoss ? 'Loss' : 'Flat'}
                             </span>
                           </div>
                        ) : (
                           <span className="text-slate-400 text-[10px] italic">Awaiting rate</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Share Config Modal */}
      {shareConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-black flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-400" /> Draft Follow-up Message
                </h3>
                <button onClick={() => setShareConfig(null)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="p-6 space-y-6">
               <div className="space-y-3">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Document References</h4>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   <label className={`cursor-pointer rounded-xl border flex flex-col items-center gap-2 p-3 transition ${msgOptions.includeCI ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                     <input type="checkbox" className="hidden" checked={msgOptions.includeCI} onChange={(e) => setMsgOptions(prev => ({...prev, includeCI: e.target.checked}))} />
                     <FileText className="w-5 h-5" />
                     <span className="text-[10px] font-bold text-center">Comm. Invoice</span>
                   </label>
                   <label className={`cursor-pointer rounded-xl border flex flex-col items-center gap-2 p-3 transition ${msgOptions.includePL ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                     <input type="checkbox" className="hidden" checked={msgOptions.includePL} onChange={(e) => setMsgOptions(prev => ({...prev, includePL: e.target.checked}))} />
                     <FileText className="w-5 h-5" />
                     <span className="text-[10px] font-bold text-center">Packing List</span>
                   </label>
                   <label className={`cursor-pointer rounded-xl border flex flex-col items-center gap-2 p-3 transition ${msgOptions.includeBL ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                     <input type="checkbox" className="hidden" checked={msgOptions.includeBL} onChange={(e) => setMsgOptions(prev => ({...prev, includeBL: e.target.checked}))} />
                     <FileText className="w-5 h-5" />
                     <span className="text-[10px] font-bold text-center">Copy BL</span>
                   </label>
                   <label className={`cursor-pointer rounded-xl border flex flex-col items-center gap-2 p-3 transition ${msgOptions.includeDraft ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                     <input type="checkbox" className="hidden" checked={msgOptions.includeDraft} onChange={(e) => setMsgOptions(prev => ({...prev, includeDraft: e.target.checked}))} />
                     <FileText className="w-5 h-5" />
                     <span className="text-[10px] font-bold text-center">Draft Docs</span>
                   </label>
                 </div>
               </div>
               
               <div className="space-y-2">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Custom Body Note</h4>
                 <textarea
                   className="w-full h-16 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 align-top"
                   value={msgOptions.customText}
                   onChange={e => setMsgOptions(prev => ({ ...prev, customText: e.target.value }))}
                   placeholder="Enter any additional text for the message..."
                 />
               </div>
               
               <div className="space-y-2">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                    Live Message Preview
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Auto-updating</span>
                 </h4>
                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto max-h-32 shadow-inner">
                   <pre className="text-[10px] sm:text-xs text-slate-300 whitespace-pre-wrap font-sans">
                     {getDynamicMessage(shareConfig.quote, shareConfig.pt, msgOptions)}
                   </pre>
                 </div>
               </div>
               
               <div className="grid grid-cols-3 gap-3 pt-2">
                 <button onClick={executeWhatsApp} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition border border-[#25D366]/20">
                   <MessageCircle className="w-6 h-6" />
                   <span className="text-[10px] font-bold uppercase tracking-wide">WhatsApp</span>
                 </button>
                 <button onClick={executeEmail} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition">
                   <Mail className="w-6 h-6" />
                   <span className="text-[10px] font-bold uppercase tracking-wide">Email Client</span>
                 </button>
                 <button onClick={executeCopy} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition">
                   <Copy className="w-6 h-6" />
                   <span className="text-[10px] font-bold uppercase tracking-wide">Copy Text</span>
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

